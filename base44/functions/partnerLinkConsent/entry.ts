import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  sha256Hex,
  pageItems,
  PARTNER_ID,
  PARTNER_NAME,
  PARTNER_URL,
  CHALLENGE_TTL_MS,
} from "../../shared/perkSphereClient.ts";

// Step 1 of the account-link flow: validate the Perk Sphere connection code and
// create a consent session bound to the authenticated local user.
// Does NOT create a connection — confirmation is a separate explicit step.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Partner credentials must be configured before any link can proceed.
    if (!getCredentials()) {
      return Response.json(
        {
          error:
            "Perk Sphere is not configured. An administrator must set PERKSPHERE_PARTNER_KEY_ID and PERKSPHERE_PARTNER_HMAC_SECRET in app secrets.",
          code: "NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    if (!code || code.length < 6 || code.length > 128) {
      return Response.json(
        { error: "Please enter a valid Perk Sphere challenge code.", code: "INVALID_CODE" },
        { status: 400 }
      );
    }

    // Reject if this account is already linked.
    const existing = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        undefined, 1
      )
    );
    if (existing.length > 0) {
      return Response.json(
        { error: "Your account is already connected to Perk Sphere.", code: "ALREADY_LINKED" },
        { status: 409 }
      );
    }

    // Create a pending consent session bound to this user.
    // The raw code is never stored — only its SHA-256 hash.
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    const challenge = await base44.asServiceRole.entities.PerkSphereChallenge.create({
      user_id: user.id,
      code_hash: codeHash,
      status: "pending",
      expires_at: expiresAt,
    });

    return Response.json({
      consent_token: challenge.id,
      partner: { id: PARTNER_ID, name: PARTNER_NAME, url: PARTNER_URL },
      local_user: { id: user.id, name: user.full_name, email: user.email },
      expires_at: expiresAt,
      message:
        "By confirming, your " +
        PARTNER_NAME +
        " account (" +
        user.email +
        ") will be linked to your Perk Sphere account. Eligible activity may be shared with Perk Sphere. You can disconnect at any time.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
