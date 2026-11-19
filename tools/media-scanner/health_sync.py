#!/usr/bin/env python3
import json, os, sys, urllib.request
from pathlib import Path
from urllib.parse import urlsplit
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
def invoke(body):
    endpoint=os.environ["XERO_HEALTH_ENDPOINT"]
    token=os.environ["XERO_SCANNER_TOKEN"]
    u=urlsplit(endpoint)
    if u.scheme!="https" or u.username or u.password or not u.hostname or u.port not in (None,443) or u.fragment: raise ValueError("HTTPS endpoint required")
    req=urllib.request.Request(endpoint,data=json.dumps(body).encode(),headers={"Content-Type":"application/json","x-scanner-token":token},method="POST")
    with urllib.request.build_opener(NoRedirect()).open(req,timeout=45) as response:
        raw=response.read(8*1024*1024+1)
        if len(raw)>8*1024*1024:raise ValueError("Response too large")
        return json.loads(raw)
def main():
    mode=sys.argv[1]
    if mode=="pull":
        rows=[];offset=0;seen=set()
        for _ in range(1000):
            data=invoke({"action":"catalog","offset":offset})
            batch=data["rows"]
            if not isinstance(batch,list) or len(batch)>500 or any(not isinstance(r,dict) or not isinstance(r.get("id"),str) or not isinstance(r.get("url"),str) for r in batch):raise ValueError("Invalid catalog response")
            for row in batch:
                if not row['id'] or row['id'] in seen:raise ValueError("Duplicate or empty catalog ID")
                seen.add(row['id'])
            rows.extend(batch)
            new=data["next"]
            if new is None:break
            if not isinstance(new,int) or new!=offset+500:raise ValueError("Invalid pagination")
            offset=new
        else:raise ValueError("Catalog limit reached")
        path=Path("health-manifest.json.tmp");path.write_text(json.dumps(rows));path.replace("health-manifest.json")
        print("Catalog records:",len(rows))
    elif mode=="push":
        rows=json.loads(Path("health-results.json").read_text());saved=skipped=0
        for i in range(0,len(rows),100):
            r=invoke({"action":"results","rows":rows[i:i+100]});saved+=r["saved"];skipped+=r["skipped"]
        print("Saved:",saved,"Skipped:",skipped)
    else:raise ValueError("Unknown mode")
if __name__=="__main__":main()
