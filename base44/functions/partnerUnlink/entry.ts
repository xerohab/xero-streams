import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { getCredentials, signedFetch, PARTNER_ID } from "../../shared/perkSphereClient.ts";

// Account disconnection: notifies the Perk Sphere Linux bridge (trusted unlink)
// and updates the local connection record so the UI reflects the result.

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

    // Notify Perk Sphere of the unlink (best-effort; local state is authoritative
    // for the UI). Endpoint assumed pending confirmation — see shared client.
    const creds = getCredentials();
    if (creds) {
      try {
        await signedFetch("/v1/partner-links", {
          method: "DELETE",
          body: JSON.stringify({
            connection_id: connection.perksphere_connection_id,
            partner_id: PARTNER_ID,
            partner_user_id: user.id,
          }),
        });
      } catch (e) {
        // Proceed with the local unlink so the UI reflects the user's intent.
        console.warn("Perk Sphere unlink notification failed:", e.message);
      }
    }

    await base44.entities.PerkSphereConnection.update(connection.id, {
      status: "unlinked",
      unlinked_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, status: "unlinked" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}