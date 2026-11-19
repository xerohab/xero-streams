#!/usr/bin/env python3
import argparse,json,os,tempfile
from pathlib import Path
from scanner import local_source
def publish(source,directory,root):
    rows=json.loads(Path(source).read_text())
    if not isinstance(rows,list) or not rows or any(not isinstance(r,dict) or not all(isinstance(r.get(k),str) and r[k] for k in ("id","series_id","revision","url")) for r in rows):raise ValueError("Invalid staged manifest")
    if len({r["id"] for r in rows})!=len(rows):raise ValueError("Duplicate episode")
    for r in rows:
        r["url"]=str(local_source(r["url"],root))
    fd,tmp=tempfile.mkstemp(dir=directory)
    try:
        with os.fdopen(fd,"w") as f:json.dump(rows,f)
        os.chmod(tmp,0o644);os.replace(tmp,directory/"episodes.json")
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    return len(rows)
def main():
    p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--reviewed",action="store_true");a=p.parse_args()
    if not a.reviewed:p.error("Review staged manifest first")
    print("Published episodes:",publish(a.manifest,Path("/var/lib/xero-media-input"),Path("/srv/xero-media-scan").resolve(strict=True)))
if __name__=="__main__":main()
