import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  submitPartnerEvent,
  logIntegration,
  pageItems,
  PARTNER_ID,
} from "../../shared/perkSphereClient.ts";

// Signed partner event submission using the verified Linux signing contract.
// Supports ACCOUNT_REGISTERED, STREAM_VIEW_PROGRESS, STREAM_ENDED, and admin
// TEST_EVENT. All signing is server-side. Perk Sphere is the authoritative
// rewards platform — XeroStreams never sets reward_eligible, points, or xp.
// Event IDs are idempotent for safe retries. A successful HTTP response does
// NOT confirm Points/XP have been awarded.

const SUPPORTED_ACTIVITIES = [
  "ACCOUNT_REGISTERED",
  "STREAM_VIEW_PROGRESS",
  "STREAM_ENDED",
  "TEST_EVENT",
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const creds = getCredentials();
    if (!creds) {
      return Response.json(
        { error: "Perk Sphere is not configured.", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const activity = String(body.activity || "").trim();
    if (!SUPPORTED_ACTIVITIES.includes(activity)) {
      return Response.json(
        {
          error: "Unsupported activity type.",
          code: "INVALID_ACTIVITY",
          supported: SUPPORTED_ACTIVITIES,
        },
        { status: 400 }
      );
    }

    const evidence = body.evidence || {};
    const eventId = String(body.event_id || "").trim() || crypto.randomUUID();
    const timestamp = body.timestamp || new Date().toISOString();

    // The user must have an active Perk Sphere connection.
    const connections = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        { limit: 1 }
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
        event_id: eventId,
        activity,
        evidence,
        timestamp,
      });
    } catch (e) {
      await logIntegration(base44, {
        event_type: "event_submit",
        status: "error",
        error_code: "PS_UNREACHABLE",
        details: e.message,
        user_id: user.id,
        activity,
        event_id: eventId,
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
      activity,
      event_id: eventId,
    });

    if (!result.ok) {
      return Response.json(
        {
          error: "Perk Sphere rejected the event.",
          code: "PS_REJECTED",
          detail: result.data,
          ps_status: result.status,
          event_id: eventId,
        },
        { status: 502 }
      );
    }

    // A successful HTTP response does NOT confirm Points/XP have been awarded.
    return Response.json({
      ok: true,
      event_id: eventId,
      submitted: true,
      rewards_pending: true,
      message:
        "Event accepted by Perk Sphere. Rewards, if any, are determined by Perk Sphere's reward rules.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}