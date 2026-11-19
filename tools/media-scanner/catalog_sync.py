#!/usr/bin/env python3
"""Pull authorized episode catalogue into a local manifest, without downloading media."""
import argparse,json,os,urllib.request,tempfile
from pathlib import Path
from urllib.parse import urlsplit
from stage_media import validate
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
def pull(endpoint,token):
    u=urlsplit(endpoint)
    if u.scheme!="https" or not u.hostname or u.username or u.password or u.port not in (None,443) or u.fragment:raise ValueError("Invalid API endpoint")
    opener=urllib.request.build_opener(NoRedirect());offset=0;rows=[];seen=set()
    for _ in range(1000):
        req=urllib.request.Request(endpoint,data=json.dumps({"action":"catalog","offset":offset}).encode(),headers={"Content-Type":"application/json","x-scanner-token":token},method="POST")
        with opener.open(req,timeout=45) as res:
            raw=res.read(8*1024*1024+1)
            if len(raw)>8*1024*1024:raise ValueError("Oversized response")
            data=json.loads(raw)
        batch=data["rows"]
        if not isinstance(batch,list) or len(batch)>500:raise ValueError("Invalid page")
        for r in batch:
            if not isinstance(r,dict) or not all(isinstance(r.get(k),str) and r[k] for k in ("id","series_id","revision","url")):raise ValueError("Invalid episode")
            if r["id"] in seen:raise ValueError("Duplicate episode")
            seen.add(r["id"])
            try:validate(r["url"])
            except ValueError:continue
            rows.append(r)
        n=data["next"]
        if n is None:return rows
        if type(n) is not int or n!=offset+500:raise ValueError("Invalid pagination")
        offset=n
    raise ValueError("Catalogue limit exceeded")
def main():
    p=argparse.ArgumentParser();p.add_argument("--output",required=True);a=p.parse_args()
    rows=pull(os.environ["XERO_MEDIA_ENDPOINT"],os.environ["XERO_SCANNER_TOKEN"])
    target=Path(a.output);fd,tmp=tempfile.mkstemp(dir=target.parent)
    try:
        with os.fdopen(fd,"w") as f:json.dump(rows,f)
        os.replace(tmp,target)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    print("Approved direct-media episodes:",len(rows))
if __name__=="__main__":main()
