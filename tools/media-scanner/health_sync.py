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
    if u.scheme!="https" or u.username or u.password or not u.hostname: raise ValueError("HTTPS endpoint required")
    req=urllib.request.Request(endpoint,data=json.dumps(body).encode(),headers={"Content-Type":"application/json","x-scanner-token":token},method="POST")
    with urllib.request.build_opener(NoRedirect()).open(req,timeout=45) as response:
        return json.load(response)
def main():
    mode=sys.argv[1]
    if mode=="pull":
        rows=[];offset=0
        for _ in range(1000):
            data=invoke({"action":"catalog","offset":offset})
            rows.extend(data["rows"])
            new=data["next"]
            if new is None:break
            if not isinstance(new,int) or new<=offset:raise ValueError("Invalid pagination")
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
