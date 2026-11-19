#!/usr/bin/env python3
import argparse,json,os,tempfile
from pathlib import Path
from scanner import local_source
def outstanding(catalog,staged,root):
    done=set()
    for r in staged:
        try:local_source(r["url"],root)
        except (ValueError,OSError):continue
        done.add((r["id"],r["revision"],r["series_id"]))
    return [r for r in catalog if (r["id"],r["revision"],r["series_id"]) not in done]
def main():
    p=argparse.ArgumentParser();p.add_argument("catalog");p.add_argument("staged");p.add_argument("output");p.add_argument("--root",required=True);a=p.parse_args()
    staged=Path(a.staged);target=Path(a.output)
    rows=outstanding(json.loads(Path(a.catalog).read_text()),json.loads(staged.read_text()) if staged.exists() else [],Path(a.root).resolve(strict=True))
    fd,tmp=tempfile.mkstemp(dir=target.parent)
    try:
        with os.fdopen(fd,"w") as f:json.dump(rows,f)
        os.replace(tmp,target)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    print("Outstanding episodes:",len(rows))
if __name__=="__main__":main()
