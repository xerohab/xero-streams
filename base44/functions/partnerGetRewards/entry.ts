import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  signedFetch,
  logIntegration,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// Fetches the authenticated user's verified Perk Sphere reward information
// using a signed request. Perk Sphere is the authoritative rewards platform —
// XeroStreams only displays confirmed rewards and balances. Returns a pending
// state if the partner is not yet active or the endpoint is unavailable.

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

    // The user must have an active connection.
    const connections = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        undefined, 1
      )
    );
    if (connections.length === 0) {
      return Response.json({
        ok: false,
        connected: false,
        rewards: null,
        message: "Your account is not connected to Perk Sphere.",
      });
    }
    const connection = connections[0];

    // Fetch rewards via signed request.
    let result;
    try {
      const res = await signedFetch(
        `/v1/partner-links/rewards?connection_id=${encodeURIComponent(
          connection.perksphere_connection_id
        )}`,
        { method: "GET" }
      );
      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      result = { ok: res.ok, status: res.status, data };
    } catch (e) {
      await logIntegration(base44, {
        event_type: "rewards_fetch",
        status: "error",
        error_code: "PS_UNREACHABLE",
        details: e.message,
        user_id: user.id,
      });
      return Response.json({
        ok: false,
        connected: true,
        rewards: null,
        pending: true,
        message:
          "Unable to reach Perk Sphere. Rewards information is temporarily unavailable.",
      });
    }

    await logIntegration(base44, {
      event_type: "rewards_fetch",
      status: result.ok ? "success" : "error",
      error_code: result.ok ? null : result.data?.error?.code || "unknown",
      http_status: result.status,
      user_id: user.id,
    });

    if (!result.ok) {
      // Partner may be inactive — return pending state.
      return Response.json({
        ok: false,
        connected: true,
        rewards: null,
        pending: true,
        error_code: result.data?.error?.code || "unknown",
        message:
          "Perk Sphere rewards are not yet available. This may require partner activation.",
      });
    }

    return Response.json({
      ok: true,
      connected: true,
      rewards: result.data,
      pending: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
