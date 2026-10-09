import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  validateKeyForPartner,
  performProofOfPossession,
  PARTNER_ID,
  PARTNER_NAME,
  PERKSPHERE_API_BASE,
} from "../../shared/perkSphereClient.ts";

// Credential proof-of-possession verification against the live Perk Sphere
// Linux API using the verified challenge/confirm contract.
//
// Safe: does not expose secret values, challenge strings, or signatures.
// Does not activate the partner, submit reward events, or change credentials.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const report = {
      timestamp: new Date().toISOString(),
      project: PARTNER_NAME,
      partner_id: PARTNER_ID,
      api_base: PERKSPHERE_API_BASE,
      key_id: null, // safe to display
      key_id_valid: false,
      key_id_mismatch: null,
      credentials_accessible: false,
      proof_of_possession: null,
      challenge_status: null,
      confirm_status: null,
      possession_verified: false,
      activated: false,
      expires_in: null,
      error_code: null,
    };

    // Step 1: credential accessibility
    const creds = getCredentials();
    if (!creds) {
      report.credentials_accessible = false;
      report.error_code = "NOT_CONFIGURED";
      return Response.json(report, { status: 503 });
    }
    report.credentials_accessible = true;
    report.key_id = creds.keyId; // safe to display

    // Step 2: validate key ID matches this project's expected key ID
    const validation = validateKeyForPartner(PARTNER_ID);
    if (!validation.valid) {
      report.key_id_valid = false;
      if (validation.reason === "KEY_MISMATCH") {
        report.key_id_mismatch = {
          configured: validation.configured,
          expected: validation.expected,
        };
        report.error_code = "KEY_MISMATCH";
      } else {
        report.error_code = validation.reason;
      }
      // Stop — do not attempt proof with mismatched credentials.
      return Response.json(report, { status: 400 });
    }
    report.key_id_valid = true;

    // Step 3: proof-of-possession (challenge → generate proof → confirm)
    const proof = await performProofOfPossession(creds.keyId, creds.hmacSecret);
    report.proof_of_possession = proof.ok ? "verified" : "failed";
    report.challenge_status = proof.challenge_status || null;
    report.confirm_status = proof.confirm_status || null;
    report.possession_verified = !!proof.possession_verified;
    report.activated = !!proof.activated;
    report.expires_in = proof.expires_in || null;
    report.error_code = proof.error_code || null;

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}