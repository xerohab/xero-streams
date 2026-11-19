#!/usr/bin/env python3
import argparse,json,re,time
from pathlib import Path
def candidates(root,protected,now):
    return [p for p in root.iterdir() if not p.is_symlink() and p.is_file() and re.fullmatch(r"[0-9a-f]{64}\.(mp4|m4v|mov|mkv|webm)",p.name) and str(p) not in protected and now-p.stat().st_mtime>=86400]
def main():
    p=argparse.ArgumentParser();p.add_argument("--apply",action="store_true");a=p.parse_args()
    root=Path("/srv/xero-media-scan").resolve(strict=True)
    protected=set()
    for name in ("/var/lib/xero-media-staging/accumulated.json","/var/lib/xero-media-staging/staged.json","/var/lib/xero-media-input/episodes.json"):
        f=Path(name)
        if f.exists():
            rows=json.loads(f.read_text())
            if not isinstance(rows,list):raise ValueError("Invalid manifest")
            protected.update(str(Path(r["url"]).resolve()) for r in rows)
    files=candidates(root,protected,time.time())
    print("Eligible obsolete files:",len(files),"bytes:",sum(f.stat().st_size for f in files))
    if a.apply:
        for f in files:f.unlink()
if __name__=="__main__":main()
