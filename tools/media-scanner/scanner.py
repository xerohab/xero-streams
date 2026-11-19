#!/usr/bin/env python3
import argparse, array, json, math, subprocess, sqlite3, statistics, os, time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
FORMATS={'.mp4':'mov','.m4v':'mov','.mov':'mov','.mkv':'matroska','.webm':'matroska'}
def local_source(url,media_root):
    source=Path(url).resolve(strict=True)
    if not source.is_relative_to(media_root) or not source.is_file() or source.suffix.lower() not in FORMATS:raise ValueError('Unsupported local media')
    return source

def fingerprint(url, media_root, tail=False):
    # Only pre-staged local media. Remote ingestion needs a separately isolated fetcher.
    source=local_source(url,media_root)
    raw=subprocess.run(['ffmpeg','-nostdin','-v','error','-threads','1','-protocol_whitelist','file','-f',FORMATS[source.suffix.lower()],*(['-sseof','-240'] if tail else []),'-i',str(source),'-t','240','-vn','-ac','1','-ar','1000','-f','s16le','-'],capture_output=True,timeout=180,check=True).stdout
    a=array.array('h',raw)
    if len(a)<15000:raise ValueError('Insufficient audio')
    return [math.log1p(sum(abs(x) for x in a[i:i+100])/100) for i in range(0,len(a)-99,100)]
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
def credits_candidate(a, peers, duration):
    # Repeated end-of-episode audio is a review hint, never an automatic skip.
    hits=[m for peer in peers if (m:=match(a,peer)) and m[1]>=len(a)/10-15]
    groups=[[v for v in hits if abs(v[0]-h[0])<=5] for h in hits]
    group=max(groups,key=len,default=[])
    if len(group)<2:return None
    start=max(0,duration-len(a)/10+statistics.median(v[0] for v in group))
    return {'kind':'credits','status':'review','matches':len(group),'credits_start':start,'credits_end':duration} if duration-start>=15 else None

def recap_candidate(a, previous, intro_start):
    # Compare the opening to the previous episode's ending, not recurring theme music.
    if not math.isfinite(intro_start) or intro_start<15:return None
    opening=a[:min(900,int(intro_start*10))]
    # Align against overlapping 90-second windows of the preceding episode.
    hits=[]
    for pos in range(0,len(previous),600):
        hit=match(opening,previous[pos:pos+1200])
        if hit and hit[0]<=5 and hit[1]<=intro_start:hits.append(hit)
    if not hits:return None
    start,end,_=max(hits,key=lambda v:v[1]-v[0])
    return {'kind':'recap','status':'review','matches':1,'recap_start':start,'recap_end':end}

def main():
    p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('--db',default=str(ROOT/'scan.sqlite'));p.add_argument('--media-root',required=True);p.add_argument('--credits',action='store_true');p.add_argument('--recaps',action='store_true');args=p.parse_args()
    media_root=Path(args.media_root).resolve(strict=True)
    if not media_root.is_dir():raise ValueError('Invalid media directory')
    db=sqlite3.connect(args.db);db.execute('create table if not exists fingerprints(id text primary key, revision text, series text, data text)');db.execute('create table if not exists results(id text primary key, data text)')
    rows=json.loads(Path(args.manifest).read_text())
    if not isinstance(rows,list) or any(not isinstance(r,dict) or not all(isinstance(r.get(k),str) and r[k] for k in ('id','series_id','url','revision')) for r in rows):raise ValueError('Invalid manifest')
    if len({r['id'] for r in rows})!=len(rows):raise ValueError('Duplicate episode IDs')
    current={r['id']:r for r in rows}
    db.execute('create table if not exists source_cache(id text primary key, signature text)')
    os.nice(15)
    for r in rows:
        if (ROOT/'pause').exists():return
        try:
            source=local_source(r['url'],media_root)
            st=source.stat();signature=json.dumps([str(source),st.st_size,st.st_mtime_ns,r['series_id'],'v2'])
            cached=db.execute('select signature from source_cache where id=?',(r['id'],)).fetchone()
            old=db.execute('select data from fingerprints where id=? and revision=?',(r['id'],r.get('revision',''))).fetchone()
            if not old or not cached or cached[0]!=signature:
                fp=fingerprint(r['url'],media_root);db.execute('insert or replace into fingerprints values(?,?,?,?)',(r['id'],r.get('revision',''),r['series_id'],json.dumps(fp)));db.execute('insert or replace into source_cache values(?,?)',(r['id'],signature));db.commit()
        except Exception as e:
            db.execute('delete from fingerprints where id=?',(r['id'],))
            db.execute('insert or replace into results values(?,?)',(r['id'],json.dumps({'status':'failed','error':type(e).__name__})));db.commit()
    for r in rows:
        if (ROOT/'pause').exists():return
        cur=db.execute('select data from fingerprints where id=? and revision=?',(r['id'],r['revision'])).fetchone()
        if not cur:continue
        a=json.loads(cur[0]);peers=[]
        for peer_id,revision,data in db.execute('select id,revision,data from fingerprints where series=? and id!=? order by id',(r['series_id'],r['id'])):
            if peer_id in current and current[peer_id]['revision']==revision and current[peer_id]['series_id']==r['series_id']:
                peers.append((data,))
                if len(peers)>=8:break
        hits=[m for peer in peers if (m:=match(a,json.loads(peer[0])))]
        groups=[ [v for v in hits if abs(v[0]-h[0])<=3 and abs(v[1]-h[1])<=5] for h in hits]
        group=max(groups,key=len,default=[])
        result={'status':'review' if len(group)>=2 else 'no_match','matches':len(group)}
        if len(group)>=2:result.update(intro_start=statistics.median(v[0] for v in group),intro_end=statistics.median(v[1] for v in group))
        db.execute('insert or replace into results values(?,?)',(r['id'],json.dumps(result)));db.commit()
    credits=[]
    if args.credits or args.recaps:
        tails={}
        for r in rows:
            if (ROOT/'pause').exists():return
            try:
                source=local_source(r['url'],media_root)
                duration=float(subprocess.run(['ffprobe','-v','error','-protocol_whitelist','file','-f',FORMATS[source.suffix.lower()],'-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(source)],capture_output=True,text=True,timeout=30,check=True).stdout)
                if math.isfinite(duration) and duration>=240:tails[r['id']]=(fingerprint(r['url'],media_root,True),duration)
            except (ValueError,OSError,subprocess.SubprocessError):continue
        for r in rows:
            if (ROOT/'pause').exists():return
            if r['id'] not in tails:continue
            a,duration=tails[r['id']];peers=[tails[v['id']][0] for v in rows if v['id']!=r['id'] and v['series_id']==r['series_id'] and v['id'] in tails][:8]
            candidate=credits_candidate(a,peers,duration) if args.credits else None
            if args.credits and candidate:credits.append({'id':r['id'],'revision':r['revision'],**candidate})
    recaps=[]
    if args.recaps:
        for r in rows:
            if (ROOT/'pause').exists():return
            season,episode=r.get('season_number'),r.get('episode_number')
            if type(season) is not int or type(episode) is not int or episode<2:continue
            prev=[v for v in rows if v['series_id']==r['series_id'] and v.get('season_number')==season and v.get('episode_number')==episode-1]
            if len(prev)!=1 or prev[0]['id'] not in tails:continue
            cur=db.execute('select data from fingerprints where id=? and revision=?',(r['id'],r['revision'])).fetchone()
            result=db.execute('select data from results where id=?',(r['id'],)).fetchone()
            if not cur or not result:continue
            intro=json.loads(result[0]).get('intro_start')
            if intro is None:continue
            candidate=recap_candidate(json.loads(cur[0]),tails[prev[0]['id']][0],intro)
            if candidate:recaps.append({'id':r['id'],'revision':r['revision'],**candidate})
    print(json.dumps([{'id':r['id'],'revision':r['revision'],**json.loads(row[0])} for r in rows if (row:=db.execute('select data from results where id=?',(r['id'],)).fetchone())]+credits+recaps))
if __name__=='__main__':main()
