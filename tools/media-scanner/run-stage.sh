#!/bin/bash
set -euo pipefail
umask 077
cd /var/lib/xero-media-staging
exec 9>stage.lock
flock -n 9 || exit 1
offset="${1:-0}"
[[ "$offset" == auto || "$offset" == retry || "$offset" =~ ^[0-9]+$ ]] || exit 2
if [[ "$offset" == 0 || "$offset" == auto ]]; then
 python3 /opt/xero-media-scan/catalog_sync.py --output remote.json
fi
[ -s remote.json ]
input=remote.json
if [[ "$offset" == retry || "$offset" == auto ]]; then
 python3 /opt/xero-media-scan/retry-manifest.py remote.json accumulated.json outstanding.json --root /srv/xero-media-scan
 input=outstanding.json
 offset=0
 if [[ "${1:-}" == auto ]]; then
  offset=$(python3 -c 'import json,pathlib; n=len(json.load(open("outstanding.json"))); p=pathlib.Path("auto-offset"); print(int(p.read_text()) % n if n and p.exists() else 0)')
 fi
fi
python3 /opt/xero-media-scan/stage_media.py "$input" --root /srv/xero-media-scan --output staged.json --offset "$offset" --max-files 3 --max-bytes 2147483648 --authorized
python3 /opt/xero-media-scan/merge-staged.py remote.json staged.json accumulated.json --root /srv/xero-media-scan
python3 /opt/xero-media-scan/retry-manifest.py remote.json accumulated.json outstanding.json --root /srv/xero-media-scan
if [[ "${1:-}" == auto ]]; then
 printf "%s\\n" "$((offset+3))" > auto-offset.tmp
 mv auto-offset.tmp auto-offset
fi
echo "Accumulated manifest ready for administrator review and isolated scan"
