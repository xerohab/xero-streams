import { secrets } from "base44:runtime";

// ---------------------------------------------------------------------------
// Perk Sphere partner integration — shared client + HMAC signing
// ---------------------------------------------------------------------------
// Partner identity is detected from this app's configured domain.
// This app is Xero Streams (https://xerostreams.com).
// ---------------------------------------------------------------------------

export const PERKSPHERE_API_BASE = "https://api.perksphere.org";
export const PARTNER_ID = "xero-streams";
export const PARTNER_NAME = "Xero Streams";
export const PARTNER_URL = "https://xerostreams.com";

// Local consent-session expiry (defense-in-depth; Perk Sphere enforces its own
// challenge expiry on the Linux bridge). 10 minutes.
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// HMAC signing contract (CONVENTIONAL — pending Perk Sphere confirmation)
// ---------------------------------------------------------------------------
// Algorithm : HMAC-SHA256
// Secret    : PERKSPHERE_PARTNER_HMAC_SECRET
// Canonical : `${METHOD}\n${PATH}\n${TIMESTAMP}\n${BODY}`
// Headers   : X-PerkSphere-Key-Id, X-PerkSphere-Partner-Id,
//             X-PerkSphere-Timestamp, X-PerkSphere-Signature (hex)
// Adjust here once the confirmed Perk Sphere spec is provided.
// ---------------------------------------------------------------------------

export function getCredentials() {
  const keyId = secrets.get("PERKSPHERE_PARTNER_KEY_ID");
  const hmacSecret = secrets.get("PERKSPHERE_PARTNER_HMAC_SECRET");
  if (!keyId || !hmacSecret) return null;
  return { keyId, hmacSecret };
}

export async function sha256Hex(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

export async function signedFetch(path, init) {
  const creds = getCredentials();
  if (!creds) throw new Error("PERKSPHERE_NOT_CONFIGURED");
  const method = ((init && init.method) || "POST").toUpperCase();
  const rawBody = init && init.body;
  const body = rawBody ? (typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody)) : "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const canonical = method + "\n" + path + "\n" + timestamp + "\n" + body;
  const signature = await hmacSha256Hex(creds.hmacSecret, canonical);
  const headers = new Headers(init && init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-PerkSphere-Key-Id", creds.keyId);
  headers.set("X-PerkSphere-Partner-Id", PARTNER_ID);
  headers.set("X-PerkSphere-Timestamp", timestamp);
  headers.set("X-PerkSphere-Signature", signature);
  return fetch(PERKSPHERE_API_BASE + path, {
    method,
    body: body || undefined,
    headers,
    signal: AbortSignal.timeout(15000),
  });
}

// Normalise a filter() result to an items array (array or page-object form).
export function pageItems(res) {
  if (!res) return [];
  return Array.isArray(res) ? res : res.items || [];
}