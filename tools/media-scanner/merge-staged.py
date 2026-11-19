#!/usr/bin/env python3
import argparse,json,os,tempfile
from pathlib import Path
from scanner import local_source
def merge(catalog,previous,batch,root):
    current={r["id"]:r for r in catalog}
    result={}
    for r in previous+batch:
        c=current.get(r["id"])
        if not c or any(c.get(k)!=r.get(k) for k in ("revision","series_id","season_number","episode_number")):continue
        try:source=local_source(r["url"],root)
        except (ValueError,OSError):continue
        result[r["id"]]={**c,"url":str(source)}
    return sorted(result.values(),key=lambda r:r["id"])
def main():
    p=argparse.ArgumentParser();p.add_argument("catalog");p.add_argument("batch");p.add_argument("output");p.add_argument("--root",required=True);a=p.parse_args()
    out=Path(a.output);root=Path(a.root).resolve(strict=True)
    rows=merge(json.loads(Path(a.catalog).read_text()),json.loads(out.read_text()) if out.exists() else [],json.loads(Path(a.batch).read_text()),root)
    fd,tmp=tempfile.mkstemp(dir=out.parent)
    try:
        with os.fdopen(fd,"w") as f:json.dump(rows,f)
        os.replace(tmp,out)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    print("Available staged episodes:",len(rows))
if __name__=="__main__":main()
