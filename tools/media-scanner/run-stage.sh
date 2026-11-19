#!/bin/bash
set -euo pipefail
umask 077
cd /var/lib/xero-media-staging
exec 9>stage.lock
flock -n 9 || exit 1
offset="${1:-0}"
[[ "$offset" == retry || "$offset" =~ ^[0-9]+$ ]] || exit 2
if [[ "$offset" == 0 ]]; then
 python3 /opt/xero-media-scan/catalog_sync.py --output remote.json
fi
[ -s remote.json ]
input=remote.json
if [[ "$offset" == retry ]]; then
 python3 /opt/xero-media-scan/retry-manifest.py remote.json accumulated.json outstanding.json --root /srv/xero-media-scan
 input=outstanding.json
 offset=0
fi
python3 /opt/xero-media-scan/stage_media.py "$input" --root /srv/xero-media-scan --output staged.json --offset "$offset" --max-files 3 --max-bytes 2147483648 --authorized
python3 /opt/xero-media-scan/merge-staged.py remote.json staged.json accumulated.json --root /srv/xero-media-scan
python3 /opt/xero-media-scan/retry-manifest.py remote.json accumulated.json outstanding.json --root /srv/xero-media-scan
echo "Accumulated manifest ready for administrator review and isolated scan"
