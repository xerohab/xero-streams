import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
try{
 const base=createClientFromRequest(req),secret=Deno.env.get('XERO_SCANNER_TOKEN'),worker=!!secret&&req.headers.get('x-scanner-token')===secret;
 const u=await base.auth.me().catch(()=>null);
 if(u?.is_banned||(!worker&&u?.role!=='admin'))return Response.json({error:'Forbidden'},{status:403});
 const b=await req.json(),db=base.asServiceRole.entities;
 const offset=b.offset??0;
 if(!Number.isSafeInteger(offset)||offset<0||offset>500000)return Response.json({error:'Invalid offset'},{status:400});
 if(b.action==='catalog'){
 const rows=await db.Video.list('id',500,offset);
 return Response.json({rows:rows.filter(v=>!v.is_adult&&!v.coming_soon&&typeof v.video_url==='string'&&v.video_url.startsWith('https://')).map(v=>({id:v.id,url:v.video_url,revision:v.updated_date||''})),next:rows.length===500?offset+500:null});
 }
 if(b.action==='results'&&Array.isArray(b.rows)&&b.rows.length<=100){
 let saved=0,skipped=0;const seen=new Set<string>();
 for(const r of b.rows){
 if(!r||typeof r.id!=='string'||!['reachable','review','missing','skipped','error'].includes(r.status)||(!Number.isFinite(Date.parse(r.checked_at))||Date.parse(r.checked_at)>Date.now()+300000)){skipped++;continue;}
 if(seen.has(r.id)||!r.id||r.id.length>256){skipped++;continue;}seen.add(r.id);
 const v=(await db.Video.filter({id:r.id}))[0];
 if(!v||v.is_adult||v.coming_soon||(v.updated_date||'')!==r.revision){skipped++;continue;}
 const old=(await db.StreamHealthResult.filter({video_id:r.id}))[0];
 if(old&&Date.parse(old.checked_at)>Date.parse(r.checked_at)){skipped++;continue;}
 const data={video_id:r.id,revision:r.revision,status:r.status,checked_at:r.checked_at,http_status:Number.isInteger(r.http_status)&&r.http_status>=100&&r.http_status<=599?r.http_status:0};
 if(old)await db.StreamHealthResult.update(old.id,data);else await db.StreamHealthResult.create(data);saved++;
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