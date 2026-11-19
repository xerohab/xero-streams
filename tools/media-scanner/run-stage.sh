#!/bin/bash
set -euo pipefail
umask 077
cd /var/lib/xero-media-staging
exec 9>stage.lock
flock -n 9 || exit 1
offset="${1:-0}"
[[ "$offset" =~ ^[0-9]+$ ]] || exit 2
if [[ "$offset" == 0 ]]; then
 python3 /opt/xero-media-scan/catalog_sync.py --output remote.json
fi
[ -s remote.json ]
python3 /opt/xero-media-scan/stage_media.py remote.json --root /srv/xero-media-scan --output staged.json --offset "$offset" --max-files 3 --max-bytes 2147483648 --authorized
python3 -c 'import json; assert len(json.load(open("staged.json"))) >= 1, "No staged episodes"'
echo "Staged manifest ready for administrator review and isolated scan"
