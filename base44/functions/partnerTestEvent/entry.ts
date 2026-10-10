import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  submitPartnerEvent,
  logIntegration,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// Admin-only test event submission. Submits a non-reward TEST_EVENT to verify
// signed event delivery to the Perk Sphere Linux API. Does not generate real
// rewards. The admin must have their own linked Perk Sphere connection.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const creds = getCredentials();
    if (!creds) {
      return Response.json(
        { error: "Perk Sphere is not configured.", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    // Admin must have a linked connection to test event delivery.
    const connections = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        { limit: 1 }
      )
    );
    if (connections.length === 0) {
      return Response.json(
        {
          error:
            "Connect your own Perk Sphere account first to test event delivery.",
          code: "NOT_LINKED",
        },
        { status: 409 }
      );
    }
    const connection = connections[0];

    const eventId = `ps_test_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    const result = await submitPartnerEvent(connection, {
      event_id: eventId,
      activity: "TEST_EVENT",
      timestamp: new Date().toISOString(),
      evidence: { test: true, initiated_by: user.id },
    });

    await logIntegration(base44, {
      event_type: "test_event",
      status: result.ok ? "success" : "error",
      error_code: result.ok ? null : result.data?.error?.code || "unknown",
      http_status: result.status,
      user_id: user.id,
      activity: "TEST_EVENT",
      event_id: eventId,
    });

    return Response.json({
      ok: result.ok,
      event_id: eventId,
      ps_status: result.status,
      ps_response: result.data,
      message: result.ok
        ? "Test event accepted by Perk Sphere. No rewards are generated."
        : "Perk Sphere rejected the test event. The partner may not be active yet.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}