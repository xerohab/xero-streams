#!/bin/bash
set -euo pipefail
umask 077
cd "${XERO_HEALTH_DIR:-/home/xerostreams-scanner}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
exec 9>health.lock
flock -n 9 || exit 0
[ -s health-hosts.txt ] || { echo "Awaiting approved hosts and manifest"; exit 0; }
args=()
while IFS= read -r host || [ -n "$host" ]; do
 [[ "$host" =~ ^[a-zA-Z0-9.-]+$ ]] || continue
 args+=(--allow-host "$host")
done < health-hosts.txt
[ "${#args[@]}" -gt 0 ] || exit 0
if [[ -n "${XERO_HEALTH_ENDPOINT:-}" && -n "${XERO_SCANNER_TOKEN:-}" ]]; then
 if [[ -s health-results.json ]]; then
  python3 "$script_dir/health_sync.py" push
 fi
 python3 "$script_dir/health_sync.py" pull
fi
[ -s health-manifest.json ] || exit 0
timeout 5h nice -n 15 python3 "$script_dir/link_health.py" health-manifest.json "${args[@]}" --output health-results.json

if [[ -n "${XERO_HEALTH_ENDPOINT:-}" && -n "${XERO_SCANNER_TOKEN:-}" ]]; then
 python3 "$script_dir/health_sync.py" push
fi
