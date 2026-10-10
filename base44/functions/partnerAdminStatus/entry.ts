import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  validateKeyForPartner,
  performProofOfPossession,
  logIntegration,
  pageItems,
  PERKSPHERE_API_BASE,
  PARTNER_ID,
  PARTNER_NAME,
} from "../../shared/perkSphereClient.ts";

// Admin-only Perk Sphere integration status. Reports credential configuration,
// proof-of-possession status, partner activation, account-linking stats, recent
// integration errors, and signed event delivery status. Does not expose secrets
// or PII.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const report = {
      timestamp: new Date().toISOString(),
      project: PARTNER_NAME,
      partner_id: PARTNER_ID,
      api_base: PERKSPHERE_API_BASE,
      credentials: {
        configured: false,
        key_id: null,
        key_id_valid: false,
        key_id_mismatch: null,
      },
      proof_of_possession: {
        status: "not_attempted",
        challenge_status: null,
        confirm_status: null,
        possession_verified: false,
        activated: false,
        error_code: null,
      },
      account_linking: { total_linked: 0, total_unlinked: 0 },
      event_delivery: {
        recent_success: 0,
        recent_errors: 0,
        last_error: null,
      },
      recent_errors: [],
    };

    // Credentials.
    const creds = getCredentials();
    if (!creds) {
      report.credentials.configured = false;
      return Response.json(report);
    }
    report.credentials.configured = true;
    report.credentials.key_id = creds.keyId;

    const validation = validateKeyForPartner(PARTNER_ID);
    report.credentials.key_id_valid = validation.valid;
    if (!validation.valid && validation.reason === "KEY_MISMATCH") {
      report.credentials.key_id_mismatch = {
        configured: validation.configured,
        expected: validation.expected,
      };
    }

    // Proof of possession (live test — only if key ID is valid).
    if (validation.valid) {
      const proof = await performProofOfPossession(
        creds.keyId,
        creds.hmacSecret
      );
      report.proof_of_possession = {
        status: proof.ok ? "verified" : "failed",
        challenge_status: proof.challenge_status,
        confirm_status: proof.confirm_status,
        possession_verified: !!proof.possession_verified,
        activated: !!proof.activated,
        error_code: proof.error_code || null,
      };
    }

    // Account linking stats.
    const linkedCount = await base44.entities.PerkSphereConnection.count({
      status: "linked",
    });
    const unlinkedCount = await base44.entities.PerkSphereConnection.count({
      status: "unlinked",
    });
    report.account_linking.total_linked = linkedCount;
    report.account_linking.total_unlinked = unlinkedCount;

    // Recent integration logs.
    const logPage = await base44.entities.IntegrationLog.filter(
      {},
      { sort: "-created_date", limit: 20 }
    );
    const logs = pageItems(logPage);
    report.event_delivery.recent_success = logs.filter(
      (l) => l.status === "success"
    ).length;
    report.event_delivery.recent_errors = logs.filter(
      (l) => l.status === "error"
    ).length;
    const lastError = logs.find((l) => l.status === "error");
    if (lastError) {
      report.event_delivery.last_error = {
        event_type: lastError.event_type,
        error_code: lastError.error_code,
        http_status: lastError.http_status,
        timestamp: lastError.created_date,
      };
    }
    report.recent_errors = logs
      .filter((l) => l.status === "error")
      .slice(0, 10)
      .map((l) => ({
        event_type: l.event_type,
        activity: l.activity,
        error_code: l.error_code,
        http_status: l.http_status,
        timestamp: l.created_date,
      }));

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}