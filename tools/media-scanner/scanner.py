#!/usr/bin/env python3
import argparse, array, json, math, subprocess, sqlite3, statistics, os, time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def fingerprint(url):
    if not url.startswith(('https://','http://')): raise ValueError('HTTP media required')
    raw=subprocess.run(['ffmpeg','-nostdin','-v','error','-threads','1','-protocol_whitelist','http,https,tcp,tls,crypto','-i',url,'-t','240','-vn','-ac','1','-ar','1000','-f','s16le','-'],capture_output=True,timeout=180,check=True).stdout
    a=array.array('h',raw)
    return [math.log1p(sum(abs(x) for x in a[i:i+100])/100) for i in range(0,len(a)-100,100)]
def match(a,b):
    best=(0,None)
    for offset in range(-900,901,2):
        start=max(0,-offset); end=min(len(a),len(b)-offset)
        run=0; first=0
        for i in range(start,end-20,10):
            x=a[i:i+20]; y=b[i+offset:i+offset+20]
            mx=statistics.mean(x); my=statistics.mean(y)
            dx=[v-mx for v in x]; dy=[v-my for v in y]
            den=math.sqrt(sum(v*v for v in dx)*sum(v*v for v in dy))
            c=sum(v*w for v,w in zip(dx,dy))/den if den>0.05 else 0
            if c>0.92:
                if not run:first=i
                run+=10
                if run>best[0]:best=(run,(first/10,(i+20)/10,offset/10))
            else:run=0
    return best[1] if best[0]>=150 else None
def main():
    p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('--db',default=str(ROOT/'scan.sqlite'));args=p.parse_args()
    db=sqlite3.connect(args.db);db.execute('create table if not exists fingerprints(id text primary key, revision text, series text, data text)');db.execute('create table if not exists results(id text primary key, data text)')
    rows=json.loads(Path(args.manifest).read_text())
    os.nice(15)
    for r in rows:
        if (ROOT/'pause').exists():return
        try:
            old=db.execute('select data from fingerprints where id=? and revision=?',(r['id'],r.get('revision',''))).fetchone()
            if not old:
                fp=fingerprint(r['url']);db.execute('insert or replace into fingerprints values(?,?,?,?)',(r['id'],r.get('revision',''),r['series_id'],json.dumps(fp)));db.commit()
        except Exception as e:
            db.execute('insert or replace into results values(?,?)',(r['id'],json.dumps({'status':'failed','error':type(e).__name__})));db.commit()
    for r in rows:
        if (ROOT/'pause').exists():return
        cur=db.execute('select data from fingerprints where id=?',(r['id'],)).fetchone()
        if not cur:continue
        a=json.loads(cur[0]);peers=db.execute('select data from fingerprints where series=? and id!=? limit 8',(r['series_id'],r['id'])).fetchall()
        hits=[m for peer in peers if (m:=match(a,json.loads(peer[0])))]
        groups=[ [v for v in hits if abs(v[0]-h[0])<=3 and abs(v[1]-h[1])<=5] for h in hits]
        group=max(groups,key=len,default=[])
        result={'status':'review' if group else 'no_match','matches':len(group)}
        if group:result.update(intro_start=statistics.median(v[0] for v in group),intro_end=statistics.median(v[1] for v in group))
        db.execute('insert or replace into results values(?,?)',(r['id'],json.dumps(result)));db.commit()
    print(json.dumps([{'id':i,**json.loads(d)} for i,d in db.execute('select id,data from results')]))
if __name__=='__main__':main()
