import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  signedFetch,
  PARTNER_ID,
  PERKSPHERE_API_BASE,
} from "../../shared/perkSphereClient.ts";

// Diagnostic: verifies first-party partner credentials against the live Perk
// Sphere Linux API WITHOUT exposing secret values. Read-only — does not call
// revoke, rotate, reissue, or activate, and submits no reward-bearing events.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const report = {
      timestamp: new Date().toISOString(),
      partner_id: PARTNER_ID,
      api_base: PERKSPHERE_API_BASE,

      // 1 — Credential accessibility (values never exposed)
      credentials_accessible: false,
      hmac_secret_present: false,
      key_id_prefix_shown: null, // only first 4 chars
      key_id_prefix_valid: false,

      // 2 — Signing contract under test
      signing_contract: {
        algorithm: "HMAC-SHA256",
        canonical_string: "METHOD\\nPATH\\nTIMESTAMP\\nBODY",
        headers: [
          "X-PerkSphere-Key-Id",
          "X-PerkSphere-Partner-Id",
          "X-PerkSphere-Timestamp",
          "X-PerkSphere-Signature",
        ],
        status: "conventional — pending Perk Sphere spec confirmation",
      },

      // 3 — Live Linux API checks
      dns_resolved: null,
      api_reachable: null,
      verify_endpoint: "/v1/partner/verify",
      proof_of_possession: "not_attempted",
      http_status: null,
      response_snippet: null,
      partner_active: null,

      errors: [],
    };

    // --- Step 1: credential accessibility ---
    const creds = getCredentials();
    if (!creds || !creds.keyId || !creds.hmacSecret) {
      report.errors.push(
        "PERKSPHERE_PARTNER_KEY_ID or PERKSPHERE_PARTNER_HMAC_SECRET is missing or empty."
      );
      return Response.json(report, { status: 503 });
    }
    report.credentials_accessible = true;
    report.hmac_secret_present = true;
    report.key_id_prefix_shown = creds.keyId.substring(0, 4);
    report.key_id_prefix_valid = creds.keyId.startsWith("psp_");

    if (!report.key_id_prefix_valid) {
      report.errors.push(
        "Partner key ID does not begin with 'psp_' — credential format may be incorrect."
      );
    }

    // --- Step 2: basic connectivity (unsigned, read-only) ---
    try {
      await fetch(PERKSPHERE_API_BASE + "/", {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      report.dns_resolved = true;
      report.api_reachable = true;
    } catch (e) {
      const msg = e.message || String(e);
      report.dns_resolved = !(
        msg.includes("ENOTFOUND") ||
        msg.includes("getaddrinfo") ||
        msg.includes("EAI") ||
        msg.includes("resolve")
      );
      report.api_reachable = false;
      if (!report.dns_resolved) {
        report.proof_of_possession = "dns_failed";
        report.errors.push(
          "DNS resolution failed for " +
            PERKSPHERE_API_BASE +
            " — hostname may not be active yet."
        );
        return Response.json(report);
      }
      report.errors.push("Connectivity check failed: " + msg);
    }

    // --- Step 3: proof-of-possession — probe candidate verify endpoints ---
    const candidates = [
      // Integration endpoints (verify these exist + test signing contract)
      { method: "POST", path: "/v1/partner-links/confirm", body: "{}" },
      { method: "POST", path: "/events", body: "{}" },
      { method: "GET", path: "/v1/partner-links" },
      { method: "DELETE", path: "/v1/partner-links", body: "{}" },
      // Alternative verification paths
      { method: "POST", path: "/v1/partner/verify", body: "{}" },
      { method: "POST", path: "/v1/partner-links/verify", body: "{}" },
      { method: "GET", path: "/v1/partners/verify" },
      { method: "POST", path: "/v1/partner/challenge", body: "{}" },
      { method: "GET", path: "/v1/health" },
    ];
    report.endpoint_probe = [];

    for (const cand of candidates) {
      const entry = { method: cand.method, path: cand.path, http_status: null, response_snippet: null, ok: false };
      try {
        const res = await signedFetch(cand.path, { method: cand.method, body: cand.body });
        entry.http_status = res.status;
        let body = null;
        try {
          body = await res.json();
          entry.response_snippet = JSON.stringify(body).substring(0, 200);
        } catch {
          // non-JSON body
        }
        if (res.ok) {
          entry.ok = true;
          report.proof_of_possession = "passed";
          report.verify_endpoint = cand.path;
          report.http_status = res.status;
          report.response_snippet = entry.response_snippet;
          if (body) {
            const s = JSON.stringify(body).toLowerCase();
            if (body.active !== undefined) report.partner_active = body.active;
            else if (body.data && body.data.active !== undefined) report.partner_active = body.data.active;
            else if (s.includes("inactive")) report.partner_active = false;
            else if (s.includes('"active"')) report.partner_active = true;
          }
        } else if (res.status === 401 || res.status === 403) {
          if (report.proof_of_possession !== "passed") {
            report.proof_of_possession = "rejected";
            report.verify_endpoint = cand.path;
            report.http_status = res.status;
            report.response_snippet = entry.response_snippet;
          }
          const s = body ? JSON.stringify(body).toLowerCase() : "";
          if (s.includes("inactive") || s.includes("not active")) report.partner_active = false;
        }
      } catch (e) {
        entry.response_snippet = (e.message || String(e)).substring(0, 200);
      }
      report.endpoint_probe.push(entry);
      if (entry.ok) break;
    }

    if (report.proof_of_possession === "not_attempted") {
      report.proof_of_possession = "all_endpoints_404";
      report.errors.push("No verification endpoint found among probed paths. The exact endpoint needs Perk Sphere confirmation.");
    } else if (report.proof_of_possession === "rejected") {
      report.errors.push(
        "An endpoint responded but rejected the HMAC signature (HTTP " +
          report.http_status +
          "). The signing contract may not match the Perk Sphere spec, or the partner is inactive."
      );
    }

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}