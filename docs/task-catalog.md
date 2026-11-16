# PerkSphere daily task catalog

`GET /api/apps/69e793d6b51b4ec30a25aa0b/functions/perkSphereTaskCatalog` returns up to 30 recently created/updated native videos from the last 14 days. It exposes sanitized titles, public Watch page links and optionally verified duration evidence. It never returns media URLs, playback sessions, account data or secrets.

Coming-soon, adult, paid, YouTube and non-HTTPS playback items are excluded. Episodes also require a non-adult, available parent series. Duplicate, disabled or media-hash-mismatched PlaybackRewardContent records do not supply a verified duration. Content display-runtime strings are never trusted.

The endpoint does not create tasks, enable task bindings or award rewards. PerkSphere consumes it to create private, zero-reward drafts requiring review.

Validation 16 November 2026: 52 tests pass; 80 backend source/resource files parse; production build succeeds. Existing frontend lint (54 errors) and typecheck issues remain in the unchanged frontend baseline; this additive backend change does not modify those files.
