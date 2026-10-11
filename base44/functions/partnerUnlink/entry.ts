import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Account disconnection: updates the local connection record. Server-side
// revocation requires a Perk Sphere service-side unlink function (dependency).

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const connectionId = String(body.connection_id || "").trim();
    if (!connectionId) {
      return Response.json(
        { error: "Connection ID is required.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    // RLS restricts reads to this user's connections.
    const connection = await base44.entities.PerkSphereConnection
      .get(connectionId)
      .catch(() => null);
    if (!connection || connection.user_id !== user.id) {
      return Response.json(
        { error: "Connection not found for your account.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (connection.status !== "linked") {
      return Response.json(
        { error: "This account is not currently connected.", code: "NOT_LINKED" },
        { status: 409 }
      );
    }

    // Linux unlink endpoint: POST /partners/account-link/unlink (service auth)
    // Body: { "partner_uuid": "...", "user_reference": "..." }
    // This requires Perk Sphere service authentication, which XeroStreams does
    // not hold. Server-side revocation must be routed through an authenticated
    // Perk Sphere service function — this is a dependency (see completion report).
    // Never forge Perk Sphere service authentication.
    // Local state is updated so the UI reflects the user's intent; the local
    // disconnect is NOT treated as complete server-side revocation.

    return Response.json({
      ok: false,
      code: "REVOCATION_REQUIRED",
      serverConfirmed: false,
      message: "Disconnect this partner from your Perk Sphere account at https://perksphere.org. The existing connection remains linked until Perk Sphere confirms revocation."
    }, { status: 409 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
