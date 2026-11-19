#!/usr/bin/env python3
"""Run periodically as a privileged local service with the existing scanner environment."""
import json, os, subprocess, sqlite3, urllib.request, urllib.parse, pathlib, time
from catalog_sync import NoRedirect, pull
ROOT=pathlib.Path('/var/lib/xero-media-scan')
STATE=pathlib.Path('/var/lib/xero-media-staging/bridge-state.json')
endpoint=os.environ['XERO_MEDIA_ENDPOINT']
token=os.environ['XERO_SCANNER_TOKEN']
u=urllib.parse.urlsplit(endpoint)
if u.scheme!='https' or not u.hostname or u.username or u.password or u.port not in (None,443): raise ValueError('Invalid endpoint')
opener=urllib.request.build_opener(NoRedirect())
def api(action,**kw):
 req=urllib.request.Request(endpoint,data=json.dumps(dict(action=action,**kw)).encode(),headers={'Content-Type':'application/json','x-scanner-token':token},method='POST')
 with opener.open(req,timeout=90) as r:return json.loads(r.read(8388608))
def system(*args):
 return subprocess.run(['systemctl',*args],check=True,capture_output=True,text=True).stdout.strip()
def save(s):
 p=STATE.with_suffix('.tmp');p.write_text(json.dumps(s));os.chmod(p,0o600);p.replace(STATE)
def main():
 s=json.loads(STATE.read_text()) if STATE.exists() else {}
 c=api('status')['control']
 active=system('show','xero-media-scan.service','-p','ActiveState','--value') in ('active','activating')
 manifest=pathlib.Path('/var/lib/xero-media-input/local-episodes.json')
 total=len(json.loads(manifest.read_text())) if manifest.exists() else 0
 processed=0
 if (ROOT/'scan.sqlite').exists():
  with sqlite3.connect('file:'+str(ROOT/'scan.sqlite')+'?mode=ro',uri=True,timeout=5) as db:
   processed=min(total,db.execute('select count(*) from fingerprints').fetchone()[0])
 if c.get('paused'):
  if active:system('stop','xero-media-scan.service')
  api('heartbeat',state='paused',total=total,processed=processed);return
 if active:
  api('heartbeat',state='scanning',total=total,processed=processed);return
 output=ROOT/'results.json'
 if output.exists() and output.stat().st_mtime_ns!=s.get('uploaded'):
  rows=json.loads(output.read_text())
  if not isinstance(rows,list):raise ValueError('Invalid results')
  for i in range(0,len(rows),25):
   api('report',rows=rows[i:i+25])
  s['uploaded']=output.stat().st_mtime_ns;save(s)
  api('heartbeat',state='complete',total=total,processed=total,request_id=s.get('request_id'))
 request=c.get('request_id')
 manual=bool(request and request!=s.get('request_id'))
 automatic=bool(c.get('automatic') and time.time()-s.get('last_check',0)>3600)
 if manual or automatic:
  rows=pull(endpoint,token)
  p=pathlib.Path('/var/lib/xero-media-staging/remote.json');tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(rows));os.chmod(tmp,0o600);tmp.replace(p)
  old=manifest.read_bytes() if manifest.exists() else b''
  subprocess.run(['/usr/bin/python3','/opt/xero-media-scan/local_manifest.py'],check=True)
  s['last_check']=time.time()
  if manual or old!=manifest.read_bytes():
   if manual and c.get('mode')=='full' and (ROOT/'scan.sqlite').exists():
    with sqlite3.connect(ROOT/'scan.sqlite') as db:db.execute('delete from source_cache')
   system('start','--no-block','xero-media-scan.service')
   s['request_id']=request;save(s);return
  save(s)
 api('heartbeat',state='idle',total=total,processed=processed)
if __name__=='__main__':main()
