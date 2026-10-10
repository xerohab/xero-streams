import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { getCredentials, pageItems } from "../../shared/perkSphereClient.ts";

// Admin-only test event submission.
//
// The Linux partner configuration permits exactly three event types:
// registration_completed, stream_watch_progress, stream_ended.
// There is no test_event type in the Linux contract. This function reports
// that test events are not supported and directs the admin to the proof-of-
// possession verification and admin status dashboard for integration verification.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    return Response.json({
      ok: false,
      supported: false,
      code: "TEST_EVENT_NOT_SUPPORTED",
      message:
        "The Linux partner contract does not include a test event type. Permitted types: registration_completed, stream_watch_progress, stream_ended. Use the proof-of-possession verification and admin status dashboard to verify integration health.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}