#!/usr/bin/env python3
"""Stage authorized direct media files only; never follow redirects."""
import argparse, hashlib, http.client, ipaddress, json, os, socket, ssl, time, shutil
from pathlib import Path
from urllib.parse import urlsplit
HOST="vids2.hab-lounge.com"
SUFFIXES={".mp4",".m4v",".mov",".mkv",".webm"}
def validate(url):
    u=urlsplit(url)
    if u.scheme!="https" or u.hostname!=HOST or u.username or u.password or u.port not in (None,443) or u.fragment or Path(u.path).suffix.lower() not in SUFFIXES:
        raise ValueError("Unapproved direct media URL")
    return u
def stage(row,root,limit):
    u=validate(row["url"])
    addresses=socket.getaddrinfo(HOST,443,type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):raise ValueError("Nonpublic DNS")
    target=root/(hashlib.sha256(json.dumps([row["id"],row["revision"],row["url"]]).encode()).hexdigest()+Path(u.path).suffix.lower())
    conn=http.client.HTTPSConnection(HOST,443,timeout=20,context=ssl.create_default_context())
    conn._create_connection=lambda *a,**kw:socket.create_connection((addresses[0][4][0],443),timeout=20)
    tmp=None
    try:
        conn.request("GET",u.path+("?" + u.query if u.query else ""),headers={"Accept-Encoding":"identity","User-Agent":"XeroStreams-Staging/1.0"})
        res=conn.getresponse()
        if res.status!=200 or res.getheader("Content-Encoding","identity").lower()!="identity":raise ValueError("Unexpected response")
        size=int(res.getheader("Content-Length","0"))
        used=sum(f.stat().st_size for f in root.iterdir() if f.is_file() and not f.is_symlink())
        if size<=0 or size>limit or used+size>100*1024**3 or shutil.disk_usage(root).free-size<10*1024**3:raise ValueError("Media exceeds size budget")
        import tempfile
        fd,tmp=tempfile.mkstemp(dir=root)
        count=0;deadline=time.monotonic()+1800
        with os.fdopen(fd,"wb") as f:
            while chunk:=res.read(1024*1024):
                count+=len(chunk)
                if count>size or time.monotonic()>deadline:raise ValueError("Transfer budget exceeded")
                f.write(chunk)
        if count!=size:raise ValueError("Incomplete transfer")
        os.chmod(tmp,0o644);os.replace(tmp,target);tmp=None
        return {**row,"url":str(target)},count
    finally:
        conn.close()
        if tmp:os.unlink(tmp)
def main():
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--root",required=True);p.add_argument("--output",required=True);p.add_argument("--max-files",type=int,default=3);p.add_argument("--max-bytes",type=int,default=2147483648);p.add_argument("--offset",type=int,default=0);p.add_argument("--authorized",action="store_true");a=p.parse_args()
    if not a.authorized or a.offset<0 or not 1<=a.max_files<=100 or not 1<=a.max_bytes<=107374182400:p.error("Explicit authorization and bounded budget required")
    rows=json.loads(Path(a.manifest).read_text())
    if not isinstance(rows,list) or any(not isinstance(r,dict) or not all(isinstance(r.get(k),str) and r[k] for k in ("id","series_id","revision","url")) for r in rows):p.error("Invalid manifest")
    if len({r["id"] for r in rows})!=len(rows):p.error("Duplicate identifiers")
    root=Path(a.root).resolve(strict=True);out=[];remaining=a.max_bytes
    batch=rows[a.offset:a.offset+a.max_files]
    failures=[]
    for r in batch:
        try:
            if remaining<=0:raise ValueError('Batch budget exhausted')
            for attempt in range(3):
                try:
                    staged,size=stage(r,root,remaining);break
                except (OSError,http.client.HTTPException):
                    if attempt==2:raise
                    time.sleep(2**attempt)
            out.append(staged);remaining-=size
        except Exception as e:
            failures.append({"id":r["id"],"revision":r["revision"],"reason":type(e).__name__})
            print("Skipped:",type(e).__name__,file=__import__("sys").stderr)
    target=Path(a.output);tmp=target.with_suffix(".tmp");tmp.write_text(json.dumps(out));tmp.replace(target)
    failed=target.with_suffix(".failures.json");tmp=failed.with_suffix(".tmp");tmp.write_text(json.dumps(failures));tmp.replace(failed)
    print("Staged",len(out),"of",len(batch),"files; next offset:",min(len(rows),a.offset+len(batch)))
if __name__=="__main__":main()
