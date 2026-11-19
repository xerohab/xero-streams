import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const base=createClientFromRequest(req);
 const u=await base.auth.me().catch(()=>null);
 const secret=Deno.env.get('XERO_SCANNER_TOKEN');
 const worker=!!secret&&req.headers.get('x-scanner-token')===secret;
 if(!worker&&(u?.role!=='admin'||u.is_banned))return Response.json({error:'Forbidden'},{status:403});
 const db=base.asServiceRole.entities;
 const b=await req.json().catch(()=>({}));
 if(b.action==='catalog'){
 const rows=await db.Video.filter({content_type:'episode'},'id',500,Math.max(0,Number(b.offset)||0));
 return Response.json({rows:rows.filter(v=>v.series_id&&!v.coming_soon&&v.video_url&&!v.is_adult).map(v=>({id:v.id,series_id:v.series_id,url:v.video_url,revision:v.updated_date})),next:rows.length===500?(Number(b.offset)||0)+500:null});
 }
 if(b.action==='approve'&&u?.role==='admin'&&!u.is_banned){
 const kind=b.kind??'intro';
 if(!['intro','recap','credits'].includes(kind))return Response.json({error:'Invalid segment'},{status:400});
 const start=b[kind+'_start'],end=b[kind+'_end'];
 if(typeof b.id!=='string'||!b.id)return Response.json({error:'Invalid title'},{status:400});
 const v=(await db.Video.filter({id:b.id}))[0];
 if(!v||v.content_type!=='episode'||v.is_adult||v.coming_soon)return Response.json({error:'Unavailable episode'},{status:404});
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>(kind==='credits'?604800:240))return Response.json({error:'Invalid timestamps'},{status:400});
 if(typeof b.revision!=='string'||!b.revision||b.revision!==v.updated_date)return Response.json({error:'Episode changed; rescan before approving'},{status:409});
 await db.Video.update(b.id,{[kind+'_start']:start,[kind+'_end']:end});return Response.json({ok:true});
 }
 return Response.json({error:'Unknown action'},{status:400});
}