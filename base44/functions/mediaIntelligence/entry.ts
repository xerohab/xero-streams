import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const base=createClientFromRequest(req);
 const u=await base.auth.me().catch(()=>null);
 const presented=req.headers.get('x-scanner-token');
 const worker=['XERO_SCANNER_TOKEN','XERO_LINUX_SCANNER_TOKEN'].some(name=>{
  const token=Deno.env.get(name);
  return !!token&&presented===token;
 });
 if(u?.is_banned||(!worker&&u?.role!=='admin'))return Response.json({error:'Forbidden'},{status:403});
 const db=base.asServiceRole.entities;
 const b=await req.json().catch(()=>({}));
 const admin=u?.role==='admin'&&!u.is_banned;
 if(['status','control','heartbeat','report','results'].includes(b.action)){
 const controls=await db.MediaScanControl.filter({key:'main'});
 if(controls.length>1)return Response.json({error:'Duplicate scanner control'},{status:409});
 const c=controls[0];
 if(b.action==='status'&&(admin||worker))return Response.json({control:c??{paused:false,automatic:false,state:'offline'}},{headers:{'Cache-Control':'no-store'}});
 if(b.action==='control'&&admin){
 const patch:Record<string,unknown>={};
 if(b.mode==='full'||b.mode==='new'){patch.request_id=crypto.randomUUID();patch.mode=b.mode;patch.paused=false;}
 if(typeof b.paused==='boolean')patch.paused=b.paused;
 if(typeof b.automatic==='boolean')patch.automatic=b.automatic;
 if(!Object.keys(patch).length)return Response.json({error:'Invalid control'},{status:400});
 const control=c?await db.MediaScanControl.update(c.id,patch):await db.MediaScanControl.create({key:'main',...patch});return Response.json({control});
 }
 if(b.action==='heartbeat'&&worker){
 if(!['idle','scanning','paused','failed','complete'].includes(b.state)||!Number.isSafeInteger(b.total)||!Number.isSafeInteger(b.processed)||b.total<0||b.processed<0||b.processed>b.total||b.total>500000)return Response.json({error:'Invalid heartbeat'},{status:400});
 const patch={heartbeat:new Date().toISOString(),state:b.state,total:b.total,processed:b.processed,...(b.state==='complete'&&c?.request_id===b.request_id?{completed_request:b.request_id}:{})};
 const control=c?await db.MediaScanControl.update(c.id,patch):await db.MediaScanControl.create({key:'main',...patch});return Response.json({control});
 }
 if(b.action==='results'&&admin){
 const offset=b.offset??0;if(!Number.isSafeInteger(offset)||offset<0||offset>500000)return Response.json({error:'Invalid offset'},{status:400});
 const rows=await db.MediaScanResult.list('id',100,offset);return Response.json({rows:rows.map(r=>({id:r.video_id,revision:r.revision,kind:r.kind,status:r.status,[r.kind+'_start']:r.start,[r.kind+'_end']:r.end,matches:r.matches})),next:rows.length===100?offset+100:null});
 }
 if(b.action==='report'&&worker){
 if(!Array.isArray(b.rows)||b.rows.length>50)return Response.json({error:'Invalid batch'},{status:400});
 let accepted=0;
 for(const r of b.rows){
 const kind=r?.kind??'intro',start=r?.[kind+'_start'],end=r?.[kind+'_end'];
 if(typeof r?.id!=='string'||typeof r.revision!=='string'||!['intro','recap','credits'].includes(kind)||!['review','failed','no_match'].includes(r.status))continue;
 if(r.status==='review'&&(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>(kind==='credits'?604800:240)))continue;
 const videos=await db.Video.filter({id:r.id});const v=videos.length===1?videos[0]:null;
 if(!v||v.updated_date!==r.revision||v.content_type!=='episode'||v.is_adult||v.coming_soon||v.is_for_sale)continue;
 const old=await db.MediaScanResult.filter({video_id:r.id,kind});if(old.length>1)continue;
 const data={video_id:r.id,revision:r.revision,kind,status:r.status,matches:Number.isSafeInteger(r.matches)&&r.matches>=0?r.matches:0,...(r.status==='review'?{start,end}:{start:0,end:0})};
 if(old[0]?.status==='approved'&&old[0].revision===r.revision){accepted++;continue;}
 if(old.length)await db.MediaScanResult.update(old[0].id,data);else await db.MediaScanResult.create(data);accepted++;
 }return Response.json({accepted});
 }
 return Response.json({error:'Forbidden'},{status:403});
 }
 if(b.action==='catalog'){
 const offset=b.offset??0;
 if(!Number.isSafeInteger(offset)||offset<0||offset>500000)return Response.json({error:'Invalid offset'},{status:400});
 const rows=await db.Video.filter({content_type:'episode'},'id',500,offset);
 const eligible=rows.filter(v=>v.series_id&&!v.coming_soon&&!v.is_adult&&!v.is_for_sale);
 const output=[];
 for(let i=0;i<eligible.length;i+=50){const batch=eligible.slice(i,i+50);const sources=await db.ProtectedMediaSource.filter({video_id:{$in:batch.map(v=>v.id)}},'id',100);for(const v of batch){const matches=sources.filter(s=>s.video_id===v.id);if(matches.length>1)continue;const url=matches.length===1?matches[0].video_url:v.video_url;if(url)output.push({id:v.id,series_id:v.series_id,season_number:v.season_number,episode_number:v.episode_number,url,revision:v.updated_date});}}
 return Response.json({rows:output,next:rows.length===500?offset+500:null},{headers:{'Cache-Control':'no-store'}});
 }
 if(b.action==='approve'&&u?.role==='admin'&&!u.is_banned){
 const segments=b.segments===undefined?[{kind:b.kind??'intro',start:b[(b.kind??'intro')+'_start'],end:b[(b.kind??'intro')+'_end']}]:b.segments;
 if(!Array.isArray(segments)||segments.length<1||segments.length>3)return Response.json({error:'Invalid segments'},{status:400});
 const fields:Record<string,number>={},seen=new Set();
 for(const segment of segments){const {kind,start,end}=segment??{};
 if(!['intro','recap','credits'].includes(kind)||seen.has(kind))return Response.json({error:'Invalid segment'},{status:400});
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>(kind==='credits'?604800:240))return Response.json({error:'Invalid timestamps'},{status:400});
 seen.add(kind);fields[kind+'_start']=start;fields[kind+'_end']=end;
 }
 if(typeof b.id!=='string'||!b.id)return Response.json({error:'Invalid title'},{status:400});
 const matches=await db.Video.filter({id:b.id});const v=matches.length===1?matches[0]:null;
 if(!v||v.content_type!=='episode'||v.is_adult||v.coming_soon)return Response.json({error:'Unavailable episode'},{status:404});
 if(typeof b.revision!=='string'||!b.revision||b.revision!==v.updated_date)return Response.json({error:'Episode changed; rescan before approving'},{status:409});
 await db.Video.update(b.id,fields);for(const kind of seen){const records=await db.MediaScanResult.filter({video_id:b.id,kind});if(records.length===1&&records[0].revision===b.revision)await db.MediaScanResult.update(records[0].id,{status:'approved'}).catch(()=>null);}return Response.json({ok:true});
 }
 return Response.json({error:'Unknown action'},{status:400});
}