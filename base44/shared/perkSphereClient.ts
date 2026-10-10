import { secrets } from "base44:runtime";

// ---------------------------------------------------------------------------
// Perk Sphere partner integration — shared client + HMAC signing
// ---------------------------------------------------------------------------
// Verified Linux API contract (recovered from live source code).
// This app is Xero Streams (https://xerostreams.com).
// ---------------------------------------------------------------------------

export const PERKSPHERE_API_BASE = "https://api.perksphere.org";
export const PARTNER_ID = "xero-streams";
export const PARTNER_NAME = "Xero Streams";
export const PARTNER_URL = "https://xerostreams.com";

// Expected key IDs per project — used to validate configuration.
export const EXPECTED_KEY_IDS = {
  "xero-streams": "psp_lg9D0rXbH__AJaPdKv4kxd_x",
  "dko-wrestling": "psp_ujlMGJtS1IV4U2llbKgWtaR-",
};

// Local consent-session expiry (defense-in-depth). 10 minutes.
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// HMAC signing contract (VERIFIED — from live Linux API source code)
// ---------------------------------------------------------------------------
// Algorithm : HMAC-SHA256
// Secret    : PERKSPHERE_PARTNER_HMAC_SECRET
// Canonical : METHOD\nPATH_WITH_QUERY\nTIMESTAMP\nNONCE\nSHA256_HEX_BODY
//             (each line separated by exactly one newline, no trailing newline)
// Headers   : X-PS-Key-ID, X-PS-Timestamp, X-PS-Nonce, X-PS-Signature
// Timestamp : 10-digit Unix seconds string
// Nonce     : cryptographically random base64url, 16-128 characters
// Body hash  : SHA-256 hex of exact raw body bytes transmitted
// Tolerance : 5-minute timestamp window + nonce replay protection
// ---------------------------------------------------------------------------

export function getCredentials() {
  const keyId = secrets.get("PERKSPHERE_PARTNER_KEY_ID");
  const hmacSecret = secrets.get("PERKSPHERE_PARTNER_HMAC_SECRET");
  if (!keyId || !hmacSecret) return null;
  return { keyId, hmacSecret };
}

// Validate that the configured key ID matches this project's expected key ID.
export function validateKeyForPartner(partnerId) {
  const creds = getCredentials();
  if (!creds) return { valid: false, reason: "NOT_CONFIGURED" };
  const expected = EXPECTED_KEY_IDS[partnerId];
  if (!expected) return { valid: false, reason: "UNKNOWN_PARTNER" };
  if (creds.keyId !== expected) {
    return {
      valid: false,
      reason: "KEY_MISMATCH",
      configured: creds.keyId,
      expected,
    };
  }
  return { valid: true, keyId: creds.keyId };
}

// SHA-256 hex of a UTF-8 string (used for code hashing in consent flow).
export async function sha256Hex(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// SHA-256 hex of raw bytes — for exact body byte hashing.
async function sha256HexBytes(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// HMAC-SHA256 → 64 lowercase hex characters.
async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cryptographically random base64url nonce (24 bytes → 32 chars, within 16-128).
function generateNonce() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Signed fetch using the verified HMAC contract.
// path: path WITH optional query string (e.g. "/v1/foo?bar=1") — must match
//       the actual path and query sent to Linux, not the full domain URL.
// init: { method, body (string), headers }
// The body bytes hashed are exactly the bytes transmitted.
export async function signedFetch(path, init) {
  const creds = getCredentials();
  if (!creds) throw new Error("PERKSPHERE_NOT_CONFIGURED");

  const method = ((init && init.method) || "POST").toUpperCase();
  const rawBody = init && init.body;
  const bodyStr = rawBody
    ? typeof rawBody === "string"
      ? rawBody
      : JSON.stringify(rawBody)
    : "";

  // SHA-256 hex of the exact raw body bytes.
  const enc = new TextEncoder();
  const bodyHash = await sha256HexBytes(enc.encode(bodyStr));

  // Timestamp: 10-digit Unix seconds string.
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Nonce: fresh per request.
  const nonce = generateNonce();

  // Canonical string: METHOD\nPATH_WITH_QUERY\nTIMESTAMP\nNONCE\nBODY_HASH
  const canonical = [method, path, timestamp, nonce, bodyHash].join("\n");

  // Signature: HMAC-SHA256 lowercase hex.
  const signature = await hmacSha256Hex(creds.hmacSecret, canonical);

  const headers = new Headers(init && init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-PS-Key-ID", creds.keyId);
  headers.set("X-PS-Timestamp", timestamp);
  headers.set("X-PS-Nonce", nonce);
  headers.set("X-PS-Signature", signature);

  return fetch(PERKSPHERE_API_BASE + path, {
    method,
    body: bodyStr || undefined,
    headers,
    signal: AbortSignal.timeout(15000),
  });
}

// ---------------------------------------------------------------------------
// Proof-of-possession (credential verification — allowed during setup_required)
// ---------------------------------------------------------------------------
// Step A: POST /v1/partner-credentials/challenge  { key_id }
//         → 201 { ok, challenge_id, challenge, expires_in: 600 }
// Step B: canonical = "PS-POSSESSION\n<key_id>\n<challenge_id>\n<challenge>"
//         signature = HMAC-SHA256(secret, canonical) → 64 lowercase hex
// Step C: POST /v1/partner-credentials/confirm
//         Header: X-PS-Possession-Challenge: <original challenge>
//         Body: { key_id, challenge_id, signature }
//         → { ok, status: "possession_verified", activated: false }
// ---------------------------------------------------------------------------

export async function requestChallenge(keyId) {
  const body = JSON.stringify({ key_id: keyId });
  const res = await fetch(
    PERKSPHERE_API_BASE + "/v1/partner-credentials/challenge",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(15000),
    }
  );
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

export async function confirmPossession(keyId, challengeId, challenge, signature) {
  const body = JSON.stringify({
    key_id: keyId,
    challenge_id: challengeId,
    signature,
  });
  const res = await fetch(
    PERKSPHERE_API_BASE + "/v1/partner-credentials/confirm",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PS-Possession-Challenge": challenge,
      },
      body,
      signal: AbortSignal.timeout(15000),
    }
  );
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

// Full proof-of-possession flow: challenge → generate proof → confirm.
// Returns a safe report (no secret, no challenge, no signature exposed).
export async function performProofOfPossession(keyId, hmacSecret) {
  // Step A: request challenge
  const ch = await requestChallenge(keyId);
  if (ch.status !== 201 || !ch.data || !ch.data.ok) {
    return {
      step: "challenge",
      challenge_status: ch.status,
      ok: false,
      error_code: (ch.data && ch.data.error && ch.data.error.code) || null,
    };
  }

  const challengeId = ch.data.challenge_id;
  const challenge = ch.data.challenge;
  const expiresIn = ch.data.expires_in;

  // Step B: generate proof
  const canonical = ["PS-POSSESSION", keyId, challengeId, challenge].join("\n");
  const signature = await hmacSha256Hex(hmacSecret, canonical);

  // Step C: confirm proof
  const conf = await confirmPossession(keyId, challengeId, challenge, signature);

  return {
    step: "confirm",
    challenge_status: 201,
    confirm_status: conf.status,
    ok: conf.data && conf.data.ok === true,
    possession_verified: conf.data && conf.data.status === "possession_verified",
    activated: conf.data && conf.data.activated === true,
    expires_in: expiresIn,
    error_code: (conf.data && conf.data.error && conf.data.error.code) || null,
  };
}

// Submit a partner event to the Linux API using the verified signing contract.
// Linux validator allows ONLY these top-level fields:
//   event_type, partner_event_id, partner_account_reference, occurred_at,
//   task_reference, resource_reference, evidence
// Perk Sphere is the authoritative rewards platform — XeroStreams never sets
// reward_eligible, points, or xp. All signing is server-side.
export async function submitPartnerEvent(connection, event) {
  const payload = {
    event_type: event.event_type,
    partner_event_id: event.partner_event_id,
    partner_account_reference: connection.user_id,
    occurred_at: event.occurred_at,
    evidence: event.evidence || {},
  };
  if (event.task_reference) payload.task_reference = event.task_reference;
  if (event.resource_reference) payload.resource_reference = event.resource_reference;

  const res = await signedFetch("/v1/partners/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

// Check if a video URL is YouTube content (ineligible for rewards).
// YouTube content is suppressed from event submission entirely — no points:0
// or reward_eligible:false is sent to Linux.
export function isYouTubeContent(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes("youtube.com") || lower.includes("youtu.be");
}

// Best-effort integration logging for admin diagnostics. Never throws.
export async function logIntegration(base44, entry) {
  try {
    await base44.entities.IntegrationLog.create({
      event_type: entry.event_type,
      status: entry.status || "success",
      error_code: entry.error_code || null,
      http_status: entry.http_status || null,
      details: entry.details || null,
      user_id: entry.user_id || null,
      activity: entry.activity || null,
      event_id: entry.event_id || null,
    });
  } catch (e) {
    // Logging is best-effort — never fail the request
  }
}

// Normalise a filter() result to an items array (array or page-object form).
export function pageItems(res) {
  if (!res) return [];
  return Array.isArray(res) ? res : res.items || [];
}