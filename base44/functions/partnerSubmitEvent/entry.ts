import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  signedFetch,
  pageItems,
  PARTNER_ID,
} from "../../shared/perkSphereClient.ts";

// Signed activity-event submission. Uses the authenticated local user and a
// server-generated event identifier. Only non-rewarded verification events are
// submitted here — points/xp are always 0 unless Perk Sphere's trusted reward
// rules explicitly mark an activity eligible. YouTube activity always awards
// 0 Points and 0 XP.

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
    const metadata = body.metadata || {};
    if (!activity) {
      return Response.json(
        { error: "Activity type is required.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

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

    // Server-generated event identifier (never trust a client-supplied id).
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const isYouTube =
      activity === "youtube" || String(metadata.platform || "").toLowerCase() === "youtube";

    const eventPayload = {
      event_id: eventId,
      partner_id: PARTNER_ID,
      partner_user_id: user.id,
      perksphere_connection_id: connection.perksphere_connection_id,
      activity,
      reward_eligible: false,
      points: 0,
      xp: 0,
      youtube: !!isYouTube,
      timestamp,
      metadata,
    };

    let psRes;
    try {
      psRes = await signedFetch("/events", {
        method: "POST",
        body: JSON.stringify(eventPayload),
      });
    } catch (e) {
      return Response.json(
        {
          error: "Unable to reach Perk Sphere.",
          code: "PS_UNREACHABLE",
          detail: e.message,
        },
        { status: 502 }
      );
    }

    let psData;
    try {
      psData = await psRes.json();
    } catch {
      psData = {};
    }

    if (!psRes.ok) {
      return Response.json(
        {
          error: "Perk Sphere rejected the event.",
          code: "PS_REJECTED",
          detail: psData,
          ps_status: psRes.status,
        },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, event_id: eventId, submitted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}