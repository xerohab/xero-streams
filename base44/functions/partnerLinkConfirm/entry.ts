import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  signedFetch,
  sha256Hex,
  pageItems,
  PARTNER_ID,
} from "../../shared/perkSphereClient.ts";

// Step 2 of the account-link flow: confirm the link with the Perk Sphere Linux
// bridge. Enforces local-user auth, explicit consent, challenge expiry,
// single-use confirmation, cross-account protection and replay rejection
// before the signed request is sent to Perk Sphere.

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
    const code = String(body.code || "").trim();
    const consentToken = String(body.consent_token || "").trim();
    if (!code || !consentToken) {
      return Response.json(
        { error: "Connection code and consent token are required.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    // Look up the pending consent session (RLS restricts reads to this user).
    const challenge = await base44.entities.PerkSphereChallenge
      .get(consentToken)
      .catch(() => null);
    if (!challenge || challenge.user_id !== user.id) {
      return Response.json(
        { error: "Consent session not found for your account.", code: "CONSENT_NOT_FOUND" },
        { status: 404 }
      );
    }
    if (challenge.status !== "pending") {
      return Response.json(
        { error: "This connection code has already been used.", code: "CHALLENGE_USED" },
        { status: 409 }
      );
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      await base44.entities.PerkSphereChallenge.update(challenge.id, {
        status: "expired",
      });
      return Response.json(
        {
          error: "This connection code has expired. Please generate a new one at perksphere.org.",
          code: "CHALLENGE_EXPIRED",
        },
        { status: 410 }
      );
    }

    // Replay rejection: the entered code must match the consented code.
    const codeHash = await sha256Hex(code);
    if (codeHash !== challenge.code_hash) {
      return Response.json(
        { error: "Connection code does not match the consent session.", code: "CODE_MISMATCH" },
        { status: 400 }
      );
    }

    // Reject if already linked (defensive).
    const existing = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        { limit: 1 }
      )
    );
    if (existing.length > 0) {
      return Response.json(
        { error: "Your account is already connected to Perk Sphere.", code: "ALREADY_LINKED" },
        { status: 409 }
      );
    }

    // Confirm with the Perk Sphere Linux bridge using the verified contract.
    // POST /v1/partner-links/confirm (partner HMAC auth)
    // Body: { "challenge": "...", "partner_account_reference": "..." }
    const confirmPayload = {
      challenge: code,
      partner_account_reference: user.id,
    };

    let psRes;
    try {
      psRes = await signedFetch("/v1/partner-links/confirm", {
        method: "POST",
        body: JSON.stringify(confirmPayload),
      });
    } catch (e) {
      return Response.json(
        {
          error: "Unable to reach Perk Sphere. Please try again later.",
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
          error: "Perk Sphere rejected the connection.",
          code: "PS_REJECTED",
          detail: psData,
          ps_status: psRes.status,
        },
        { status: 502 }
      );
    }

    // Perk Sphere confirmed — persist the connection locally.
    const connectionId =
      (psData && psData.data && psData.data.connection_id) ||
      (psData && psData.connection_id) ||
      crypto.randomUUID();
    const psUserId =
      (psData && psData.data && psData.data.perksphere_user_id) ||
      (psData && psData.perksphere_user_id) ||
      "";

    const connection = await base44.entities.PerkSphereConnection.create({
      user_id: user.id,
      partner_id: PARTNER_ID,
      perksphere_connection_id: connectionId,
      perksphere_user_id: psUserId,
      status: "linked",
      linked_at: new Date().toISOString(),
    });

    // Mark the consent session as consumed (single-use).
    await base44.entities.PerkSphereChallenge.update(challenge.id, {
      status: "confirmed",
    });

    return Response.json({ ok: true, connection });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}