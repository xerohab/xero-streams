import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  submitPartnerEvent,
  logIntegration,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// Signed partner event submission using the verified Linux signing contract.
// Linux permits exactly: registration_completed, stream_watch_progress, stream_ended.
// Payload fields: event_type, partner_event_id, partner_account_reference,
// occurred_at, task_reference (optional), resource_reference (optional), evidence.
// Perk Sphere is the authoritative rewards platform — XeroStreams never sets
// reward_eligible, points, or xp. partner_event_id is idempotent for safe retries.

const SUPPORTED_EVENT_TYPES = [
  "registration_completed",
  "stream_watch_progress",
  "stream_ended",
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Arbitrary browser evidence must never be signed as trusted partner activity.
    if (user.role !== "admin") return Response.json({ ok: false, code: "VERIFIED_WORKFLOW_REQUIRED", error: "Activity must be submitted by a verified server workflow." }, { status: 403 });
    const creds = getCredentials();
    if (!creds) {
      return Response.json(
        { error: "Perk Sphere is not configured.", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const eventType = String(body.event_type || "").trim();
    if (!SUPPORTED_EVENT_TYPES.includes(eventType)) {
      return Response.json(
        {
          error: "Unsupported event type.",
          code: "INVALID_EVENT_TYPE",
          supported: SUPPORTED_EVENT_TYPES,
        },
        { status: 400 }
      );
    }

    const evidence = body.evidence || {};
    const partnerEventId = String(body.partner_event_id || "").trim() || crypto.randomUUID();
    const occurredAt = body.occurred_at || new Date().toISOString();

    // The user must have an active Perk Sphere connection.
    const connections = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        undefined, 1
      )
    );
    if (connections.length === 0) {
      return Response.json(
        { error: "Your account is not connected to Perk Sphere.", code: "NOT_LINKED" },
        { status: 409 }
      );
    }
    const connection = connections[0];

    // Submit the event via the verified signed contract.
    let result;
    try {
      result = await submitPartnerEvent(connection, {
        event_type: eventType,
        partner_event_id: partnerEventId,
        occurred_at: occurredAt,
        evidence,
        task_reference: body.task_reference || null,
        resource_reference: body.resource_reference || null,
      });
    } catch (e) {
      await logIntegration(base44, {
        event_type: "event_submit",
        status: "error",
        error_code: "PS_UNREACHABLE",
        details: e.message,
        user_id: user.id,
        activity: eventType,
        event_id: partnerEventId,
      });
      return Response.json(
        { error: "Unable to reach Perk Sphere.", code: "PS_UNREACHABLE", detail: e.message },
        { status: 502 }
      );
    }

    await logIntegration(base44, {
      event_type: "event_submit",
      status: result.ok ? "success" : "error",
      error_code: result.ok ? null : result.data?.error?.code || "unknown",
      http_status: result.status,
      details: result.ok ? "Event accepted" : JSON.stringify(result.data).substring(0, 200),
      user_id: user.id,
      activity: eventType,
      event_id: partnerEventId,
    });

    if (!result.ok) {
      return Response.json(
        {
          error: "Perk Sphere rejected the event.",
          code: "PS_REJECTED",
          detail: result.data,
          ps_status: result.status,
          partner_event_id: partnerEventId,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      partner_event_id: partnerEventId,
      submitted: true,
      message:
        "Event accepted by Perk Sphere. Rewards, if any, are determined by Perk Sphere's reward rules.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
