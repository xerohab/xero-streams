import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
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
 if(b.action==='catalog'){
 const offset=b.offset??0;
 if(!Number.isSafeInteger(offset)||offset<0||offset>500000)return Response.json({error:'Invalid offset'},{status:400});
 const rows=await db.Video.filter({content_type:'episode'},'id',500,offset);
 return Response.json({rows:rows.filter(v=>v.series_id&&!v.coming_soon&&v.video_url&&!v.is_adult).map(v=>({id:v.id,series_id:v.series_id,season_number:v.season_number,episode_number:v.episode_number,url:v.video_url,revision:v.updated_date})),next:rows.length===500?offset+500:null});
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
 const v=(await db.Video.filter({id:b.id}))[0];
 if(!v||v.content_type!=='episode'||v.is_adult||v.coming_soon)return Response.json({error:'Unavailable episode'},{status:404});
 if(typeof b.revision!=='string'||!b.revision||b.revision!==v.updated_date)return Response.json({error:'Episode changed; rescan before approving'},{status:409});
 await db.Video.update(b.id,fields);return Response.json({ok:true});
 }
 return Response.json({error:'Unknown action'},{status:400});
}