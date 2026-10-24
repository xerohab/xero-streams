// Base44 backend function: functions/announceDiscordRelease.js
// Requires secrets: XERO_DISCORD_ENDPOINT (public HTTPS URL to the relay)
// and XERO_DISCORD_TOKEN (same as server ANNOUNCE_TOKEN).
// Call only from trusted server-side publishing workflows, never from a browser.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.57';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const admin = await base44.asServiceRole.functions.invoke('checkAdminStatus', {}).catch(() => null);
  // IMPORTANT: checkAdminStatus must validate the calling user's identity;
  // do not use a service-role check as a substitute for caller authorization.
  if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  if (!['movie', 'series', 'episode'].includes(data.type) || !data.id) {
    return Response.json({ error: 'invalid_release' }, { status: 400 });
  }
  const endpoint = Deno.env.get('XERO_DISCORD_ENDPOINT');
  const token = Deno.env.get('XERO_DISCORD_TOKEN');
  if (!endpoint || !token) return Response.json({ error: 'not_configured' }, { status: 503 });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify(data),
  });
  return Response.json(await response.json(), { status: response.status });
});
