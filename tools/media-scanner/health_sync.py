#!/usr/bin/env python3
import hashlib, json, os, sys, time, urllib.error, urllib.request
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
def push_results(path=Path("health-results.json"), cursor=Path("health-upload.json")):
    raw=path.read_bytes()
    digest=hashlib.sha256(raw).hexdigest()
    rows=json.loads(raw)
    if not isinstance(rows,list):
        raise ValueError("Invalid health results")
    try:
        previous=json.loads(cursor.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        previous={}
    offset=previous.get("next",0) if isinstance(previous,dict) and previous.get("digest")==digest else 0
    if type(offset) is not int or not 0<=offset<=len(rows):
        raise ValueError("Invalid health upload cursor")
    while offset<len(rows):
        batch=rows[offset:offset+10]
        for attempt in range(3):
            try:
                result=invoke({"action":"results","rows":batch})
                break
            except (TimeoutError, urllib.error.URLError) as error:
                retryable=error.code in (408,429,500,502,503,504) if isinstance(error,urllib.error.HTTPError) else True
                if not retryable or attempt==2:
                    raise
                time.sleep(2**attempt)
        counts=[result.get(key) for key in ("saved","skipped")]
        if any(type(count) is not int or count<0 for count in counts) or sum(counts)!=len(batch):
            raise ValueError("Invalid health upload acknowledgement")
        offset+=len(batch)
        temp=cursor.with_suffix(".tmp")
        temp.write_text(json.dumps({"digest":digest,"next":offset}))
        temp.replace(cursor)
        if offset%250==0 or offset==len(rows):
            print(f"Acknowledged {offset} of {len(rows)} health results",flush=True)

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
        push_results()
    else:raise ValueError("Unknown mode")
if __name__=="__main__":main()
