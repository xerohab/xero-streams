import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  submitPartnerEvent,
  logIntegration,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// ACCOUNT_REGISTERED event handler — called by the signup workflow when a
// genuinely new XeroStreams account is created. Uses the service role for
// entity access (no user session in workflow context).
//
// Requirements:
// - Uses the actual account creation event (workflow fires on signup only).
// - Idempotent event ID (ps_reg_<user_id>) prevents duplicate registration rewards.
// - Only submits if the user has a linked Perk Sphere connection.
// - If registration occurs before linking, the event is logged as pending —
//   the Linux backend's reconciliation rules handle retrospective rewards.
// - Never awards registration rewards for existing accounts.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Allow direct admin testing; workflow calls have no user context.
    let caller = null;
    try {
      caller = await base44.auth.me();
    } catch (e) {
      /* workflow call */
    }
    if (caller && caller.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
    const email = String(body.email || "").trim();
    const authMethod = String(body.auth_method || "").trim();

    if (!userId) {
      return Response.json(
        { error: "user_id is required.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const creds = getCredentials();
    if (!creds) {
      await logIntegration(base44, {
        event_type: "registration",
        status: "pending",
        error_code: "NOT_CONFIGURED",
        user_id: userId,
        activity: "ACCOUNT_REGISTERED",
      });
      return Response.json({
        ok: false,
        submitted: false,
        reason: "NOT_CONFIGURED",
        message: "Perk Sphere is not configured. Registration event logged as pending.",
      });
    }

    // Idempotent event ID — prevents duplicate registration rewards on retry.
    const eventId = `ps_reg_${userId}`;

    // Check if the user has a linked Perk Sphere connection (service role).
    const connections = pageItems(
      await base44.asServiceRole.entities.PerkSphereConnection.filter(
        { user_id: userId, status: "linked" },
        { limit: 1 }
      )
    );

    if (connections.length === 0) {
      // Registration occurred before account linking — log as pending.
      // The Linux backend's reconciliation rules handle this when the user
      // later links their account.
      await logIntegration(base44, {
        event_type: "registration",
        status: "pending",
        error_code: "NOT_LINKED",
        user_id: userId,
        activity: "ACCOUNT_REGISTERED",
        event_id: eventId,
      });
      return Response.json({
        ok: true,
        submitted: false,
        reason: "NOT_LINKED",
        message:
          "User is not yet linked to Perk Sphere. Registration event logged as pending — Linux reconciliation will handle it when the user links their account.",
      });
    }

    const connection = connections[0];

    // Submit the ACCOUNT_REGISTERED event.
    let result;
    try {
      result = await submitPartnerEvent(connection, {
        event_id: eventId,
        activity: "ACCOUNT_REGISTERED",
        timestamp: new Date().toISOString(),
        evidence: {
          auth_method: authMethod,
          registered_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      await logIntegration(base44, {
        event_type: "registration",
        status: "error",
        error_code: "PS_UNREACHABLE",
        details: e.message,
        user_id: userId,
        activity: "ACCOUNT_REGISTERED",
        event_id: eventId,
      });
      return Response.json(
        { error: "Unable to reach Perk Sphere.", code: "PS_UNREACHABLE" },
        { status: 502 }
      );
    }

    await logIntegration(base44, {
      event_type: "registration",
      status: result.ok ? "success" : "error",
      error_code: result.ok ? null : result.data?.error?.code || "unknown",
      http_status: result.status,
      user_id: userId,
      activity: "ACCOUNT_REGISTERED",
      event_id: eventId,
    });

    return Response.json({
      ok: result.ok,
      submitted: result.ok,
      event_id: eventId,
      ps_status: result.status,
      message: result.ok
        ? "Registration event submitted to Perk Sphere."
        : "Perk Sphere rejected the registration event. The partner may not be active yet.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}