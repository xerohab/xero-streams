# Final release gates

- Confirm GitHub streaming and partner workflows pass.
- Export Video and ProtectedMediaSource records before migration.
- Run Protected Sources dry run across all pages; resolve every conflict.
- Stage and verify all sources. Compare counts against the export, including the outstanding 3,665 media audit records.
- Validate guest, adult, kids, paid, premium, casting, bulk downloads and admin editing against staged sources.
- Inventory and migrate remaining direct URL consumers before clearing any legacy fields. Do not clear legacy URLs merely because staging passed.
- Verify live PIN recovery delivery and push notifications after publishing.
- Roll back source changes using the verified export if playback regresses.

No production data changes are performed by this GitHub checklist. Publishing is manual; passing CI alone is not evidence of production readiness.
