#!/usr/bin/env python3
"""Read an admin-exported manifest; never follow redirects or download whole streams."""
import argparse, concurrent.futures, http.client, ipaddress, json, socket, ssl
from urllib.parse import urlsplit
from pathlib import Path
from datetime import datetime, timezone

def check(row, allowed):
    result = {"id": row["id"], "revision": row.get("revision",""), "checked_at": datetime.now(timezone.utc).isoformat()}
    conn = None
    try:
        u = urlsplit(row["url"])
        if u.scheme != "https" or u.username or u.password or u.port not in (None,443) or u.hostname not in allowed:
            return {**result, "status":"skipped", "reason":"Host not approved"}
        addresses = socket.getaddrinfo(u.hostname,443,type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
            return {**result,"status":"skipped","reason":"Non-public address"}
        address = addresses[0][4][0]
        # Pin the validated DNS result while retaining TLS hostname verification.
        conn = http.client.HTTPSConnection(u.hostname,443,timeout=8,context=ssl.create_default_context())
        conn._create_connection = lambda *a, **kw: socket.create_connection((address,443),timeout=8)
        conn.request("GET",(u.path or "/")+("?" + u.query if u.query else ""),headers={"Range":"bytes=0-1023","User-Agent":"XeroStreams-Health/1.0","Accept-Encoding":"identity"})
        response=conn.getresponse()
        code=response.status
        if code in (200,206):
            mime=response.getheader("Content-Type","").lower()
            data=response.read(1024)
            status="reachable" if data and (mime.startswith(("video/","audio/")) or "mpegurl" in mime or "dash+xml" in mime or data.startswith(b"#EXTM3U")) else "review"
        elif code in (404,410): status="missing"
        elif code in (401,403,429) or 300<=code<400: status="review"
        else: status="error"
        return {**result,"status":status,"http_status":code}
    except Exception as e:
        return {**result,"status":"error","reason":type(e).__name__}
    finally:
        if conn: conn.close()

def main():
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--allow-host",action="append",required=True);p.add_argument("--output",required=True)
    a=p.parse_args();rows=json.loads(Path(a.manifest).read_text());
    if not isinstance(rows,list) or any(not isinstance(r,dict) or not isinstance(r.get("id"),str) or not isinstance(r.get("url"),str) for r in rows): p.error("Invalid manifest")
    allowed={h.lower() for h in a.allow_host}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(lambda r:check(r,allowed),rows))
    target=Path(a.output);tmp=target.with_suffix(".tmp");tmp.write_text(json.dumps(results,indent=2));tmp.replace(target)
if __name__=="__main__":main()
