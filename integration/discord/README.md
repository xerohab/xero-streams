# Xero Streams Discord release announcements

Development branch only. Not published to Base44.

## Server
Service xero-discord on the Perk Sphere Linux host, localhost:3187.
POST /announce with Authorization: Bearer <ANNOUNCE_TOKEN>.
Payload: {type:"movie"|"series"|"episode",id,title,url,description?,poster_url?,series_title?,season_number?,episode_number?}.
Idempotency key is type + id. GET /health.

## Remaining deployment steps
1. Provision a dedicated HTTPS hostname with TLS, reverse-proxy ONLY /announce to localhost:3187. Add rate limiting. Do not expose /health or other endpoints. Keep token private.
2. Set Base44 secrets XERO_DISCORD_ENDPOINT and XERO_DISCORD_TOKEN. Token must match server /opt/xero-discord/.env ANNOUNCE_TOKEN.
3. Deploy a Base44 backend function with server-side admin authorization and canonical entity lookups. The accompanying example function is a starting point, not a verified publishing trigger.
4. Integrate the actual Video.create, Video.bulkCreate, Series.create and Series.bulkCreate workflows. Also review editing/publishing flows. Trigger only for public/published items. Never place the bearer token in frontend code.
5. Verify canonical watch URLs against the live app's routes, test one movie, one series and one episode, test retry and duplicates.
6. Do not backfill the existing catalogue automatically.

No production Xero Streams code has been modified.
