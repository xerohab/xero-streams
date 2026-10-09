import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  PARTNER_ID,
  PERKSPHERE_API_BASE,
} from "../../shared/perkSphereClient.ts";

// Probe 2: tests different header name patterns and auth mechanisms to
// determine whether the server recognises the credential headers at all.
// Read-only — empty bodies, no state changes.

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const creds = getCredentials();
    if (!creds) return Response.json({ error: "NOT_CONFIGURED" }, { status: 503 });

    const path = "/v1/partner-links/confirm";
    const body = "{}";
    const url = PERKSPHERE_API_BASE + path;
    const ts = Math.floor(Date.now() / 1000).toString();
    const canonical = `POST\n${path}\n${ts}\n${body}`;
    const sig = await hmacHex(creds.hmacSecret, canonical);
    const basic = btoa(creds.keyId + ":" + creds.hmacSecret);

    const tests = [
      { label: "no_auth_at_all", headers: { "Content-Type": "application/json" } },
      { label: "keyid_only_no_sig", headers: { "Content-Type": "application/json", "X-PerkSphere-Key-Id": creds.keyId, "X-PerkSphere-Partner-Id": PARTNER_ID } },
      { label: "ps_prefix_headers", headers: { "Content-Type": "application/json", "X-PS-Key-Id": creds.keyId, "X-PS-Partner-Id": PARTNER_ID, "X-PS-Timestamp": ts, "X-PS-Signature": sig } },
      { label: "partner_prefix_headers", headers: { "Content-Type": "application/json", "X-Partner-Key-Id": creds.keyId, "X-Partner-Id": PARTNER_ID, "X-Partner-Timestamp": ts, "X-Partner-Signature": sig } },
      { label: "basic_auth", headers: { "Content-Type": "application/json", "Authorization": "Basic " + basic } },
      { label: "raw_secret_header", headers: { "Content-Type": "application/json", "X-PerkSphere-Key-Id": creds.keyId, "X-PerkSphere-Secret": creds.hmacSecret, "X-PerkSphere-Partner-Id": PARTNER_ID } },
      { label: "bearer_keyid", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + creds.keyId } },
      { label: "apikey_header", headers: { "Content-Type": "application/json", "X-API-Key": creds.keyId, "X-API-Secret": creds.hmacSecret } },
    ];

    const results = [];
    for (const t of tests) {
      const entry = { label: t.label, http_status: null, response: null };
      try {
        const res = await fetch(url, {
          method: "POST",
          body,
          headers: new Headers(t.headers),
          signal: AbortSignal.timeout(10000),
        });
        entry.http_status = res.status;
        try {
          entry.response = JSON.stringify(await res.json()).substring(0, 250);
        } catch {
          entry.response = "(non-JSON)";
        }
      } catch (e) {
        entry.response = (e.message || String(e)).substring(0, 200);
      }
      results.push(entry);
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      target: path,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}