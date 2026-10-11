import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  submitPartnerEvent,
  logIntegration,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// registration_completed event handler — called by the signup workflow when a
// genuinely new XeroStreams account is created. Uses the service role for
// entity access (no user session in workflow context).
//
// Linux evidence contract for registration_completed:
//   { "registration_reference": "unique_registration_reference" }
//
// Requirements:
// - Uses the actual account creation event (workflow fires on signup only).
// - Idempotent partner_event_id (ps_reg_<user_id>) prevents duplicate rewards.
// - Only submits if the user has a linked Perk Sphere connection.
// - If registration occurs before linking, preserves pending state WITHOUT
//   claiming a reward has been issued or assuming retrospective reconciliation.
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
    if (!caller || caller.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
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
        activity: "registration_completed",
      });
      return Response.json({
        ok: false,
        submitted: false,
        reason: "NOT_CONFIGURED",
        message: "Perk Sphere is not configured. Registration event logged as pending.",
      });
    }

    // Idempotent partner_event_id — prevents duplicate registration rewards on retry.
    const partnerEventId = `ps_reg_${userId}`;
    const registrationReference = `xero_reg_${userId}`;
    const occurredAt = new Date().toISOString();

    // Check if the user has a linked Perk Sphere connection (service role).
    const connections = pageItems(
      await base44.asServiceRole.entities.PerkSphereConnection.filter(
        { user_id: userId, status: "linked" },
        undefined, 1
      )
    );

    if (connections.length === 0) {
      // Registration occurred before account linking — preserve pending state.
      // Do NOT claim a reward has been issued.
      // Do NOT assume Linux supports retrospective reward reconciliation.
      await logIntegration(base44, {
        event_type: "registration",
        status: "pending",
        error_code: "NOT_LINKED",
        user_id: userId,
        activity: "registration_completed",
        event_id: partnerEventId,
      });
      return Response.json({
        ok: true,
        submitted: false,
        reason: "NOT_LINKED",
        message:
          "User is not yet linked to Perk Sphere. Registration event logged as pending. No reward has been issued. Retrospective reward reconciliation has not been verified and is not assumed.",
      });
    }

    const connection = connections[0];

    // Submit the registration_completed event.
    let result;
    try {
      result = await submitPartnerEvent(connection, {
        event_type: "registration_completed",
        partner_event_id: partnerEventId,
        occurred_at: occurredAt,
        evidence: {
          registration_reference: registrationReference,
        },
      });
    } catch (e) {
      await logIntegration(base44, {
        event_type: "registration",
        status: "error",
        error_code: "PS_UNREACHABLE",
        details: e.message,
        user_id: userId,
        activity: "registration_completed",
        event_id: partnerEventId,
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
      activity: "registration_completed",
      event_id: partnerEventId,
    });

    return Response.json({
      ok: result.ok,
      submitted: result.ok,
      partner_event_id: partnerEventId,
      ps_status: result.status,
      message: result.ok
        ? "Registration event submitted to Perk Sphere."
        : "Perk Sphere rejected the registration event. The partner may not be active yet.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
