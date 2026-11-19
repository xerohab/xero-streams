import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
export default async function(req: Request) {
 try {
  const base = createClientFromRequest(req);
  const db = base.asServiceRole.entities;
  const body = await req.json().catch(()=>({}));
  const action = body.action;
  const user = await base.auth.me().catch(()=>null);
  if(action !== 'rankings' && !user) return Response.json({error:'Sign in required'},{status:401});
  if(action === 'rankings'){
   const cutoff = new Date(Date.now()-7*86400000).toISOString();
   const sessions = await db.ViewingSession.filter({started_at:{$gte:cutoff}},'-started_at',5000);
   const scores = new Map<string,number>();
   for(const s of sessions) if(s.video_id && s.accumulated_watch_seconds>0) scores.set(s.video_id,(scores.get(s.video_id)||0)+s.accumulated_watch_seconds);
   const ids = [...scores.keys()];
   const videos = ids.length ? await db.Video.filter({id:{$in:ids}},'-created_date',5000):[];
   const totals = new Map<string,number>();
   for(const v of videos) if(!v.is_adult && !v.coming_soon && (v.has_playback||v.video_url) && v.content_type!=='book'){
    const key = v.series_id?'series:'+v.series_id:'video:'+v.id;
    totals.set(key,(totals.get(key)||0)+(scores.get(v.id)||0));
   }
   return Response.json({rankings:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,100).map(([key])=>({key}))});
  }
  if(action==='votes'){
   const requests=await db.ContentRequest.filter({status:'pending'},'-created_date',100);
   const ids=requests.map(r=>r.id);
   const votes=ids.length?await db.RequestVote.filter({request_id:{$in:ids}},'-created_date',5000):[];
   return Response.json({requests:requests.map(r=>({id:r.id,title:r.title,count:new Set(votes.filter(v=>v.request_id===r.id).map(v=>v.user_id)).size})).sort((a,b)=>b.count-a.count)});
  }
  return Response.json({error:'Unknown action'},{status:400});
 } catch(e){return Response.json({error:'Community data unavailable'},{status:500});}
}
