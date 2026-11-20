import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
try{
 const base=createClientFromRequest(req);
 const presented=req.headers.get('x-scanner-token');
 const worker=['XERO_SCANNER_TOKEN','XERO_LINUX_SCANNER_TOKEN'].some(name=>{
  const token=Deno.env.get(name);
  return !!token&&presented===token;
 });
 const u=await base.auth.me().catch(()=>null);
 if(u?.is_banned||(!worker&&u?.role!=='admin'))return Response.json({error:'Forbidden'},{status:403});
 const b=await req.json(),db=base.asServiceRole.entities;
 const offset=b.offset??0;
 if(!Number.isSafeInteger(offset)||offset<0||offset>500000)return Response.json({error:'Invalid offset'},{status:400});
 if(b.action==='catalog'){
 const rows=await db.Video.list('id',500,offset);
 const eligible=rows.filter(v=>!v.is_adult&&!v.coming_soon),out=[];
 for(let i=0;i<eligible.length;i+=50){const batch=eligible.slice(i,i+50);const missing=batch;const sources=missing.length&&db.ProtectedMediaSource?await db.ProtectedMediaSource.filter({video_id:{$in:missing.map(v=>v.id)}},'id',100):[];for(const v of batch){const matches=sources.filter(s=>s.video_id===v.id);const url=matches.length===1?matches[0].video_url:matches.length===0?v.video_url:null;if(typeof url==='string'&&url.startsWith('https://'))out.push({id:v.id,url,revision:v.updated_date||''});}}
 return Response.json({rows:out,next:rows.length===500?offset+500:null},{headers:{'Cache-Control':'no-store'}});
 }
 if(b.action==='results'&&Array.isArray(b.rows)&&b.rows.length<=100){
 let saved=0,skipped=0;
 const seen=new Set<string>();
 const candidates=[];
 const latestCheckTime=Date.now()+300000;
 for(const row of b.rows){
  const checkedAt=Date.parse(row?.checked_at);
  if(typeof row?.id!=='string'||!row.id||row.id.length>256||seen.has(row.id)||
     !['reachable','review','missing','skipped','error'].includes(row.status)||
     !Number.isFinite(checkedAt)||checkedAt>latestCheckTime){
   skipped++;
   continue;
  }
  seen.add(row.id);
  candidates.push(row);
 }
 const videos=new Map();
 if(seen.size){
  const batch=await db.Video.filter({id:{$in:[...seen]}},'id',seen.size);
  for(const video of batch)videos.set(video.id,video);
 }
 for(const row of candidates){
  const video=videos.get(row.id);
  if(!video||video.is_adult||video.coming_soon||(video.updated_date||'')!==row.revision){
   skipped++;
   continue;
  }
  const old=(await db.StreamHealthResult.filter({video_id:row.id}))[0];
  const data={
   video_id:row.id,revision:row.revision,status:row.status,checked_at:row.checked_at,
   http_status:Number.isInteger(row.http_status)&&row.http_status>=100&&row.http_status<=599?row.http_status:0
  };
  if(old&&(Date.parse(old.checked_at)>Date.parse(row.checked_at)||
     (old.checked_at===data.checked_at&&old.revision===data.revision&&old.status===data.status&&old.http_status===data.http_status))){
   skipped++;
   continue;
  }
  if(old)await db.StreamHealthResult.update(old.id,data);
  else await db.StreamHealthResult.create(data);
  saved++;
 }
 return Response.json({saved,skipped});
 }
 if(b.action==='list'&&u?.role==='admin'){
 const rows=await db.StreamHealthResult.list('-checked_at',500,offset);
 return Response.json({rows,next:rows.length===500?offset+500:null});
 }
 return Response.json({error:'Invalid action'},{status:400});
}catch{return Response.json({error:'Health exchange failed'},{status:500});}
}