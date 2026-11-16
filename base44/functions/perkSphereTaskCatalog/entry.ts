import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {taskCatalogItem} from '../../shared/taskCatalog.ts';
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
async function handler(req){
 if(req.method!=='GET')return Response.json({ok:false},{status:405});
 try{
  const admin=createClientFromRequest(req).asServiceRole;
  const pages=await Promise.all([admin.entities.Video.list('-created_date',30),admin.entities.Video.list('-content_updated_at',30)]);
  const videos=[...new Map(pages.flat().map(v=>[v.id,v])).values()].slice(0,60),items=[];
  // Bound both catalog size and concurrent database work.
  for(let offset=0;offset<videos.length;offset+=5){
   const batch=await Promise.all(videos.slice(offset,offset+5).map(async video=>{
    const policies=await admin.entities.PlaybackRewardContent.filter({video_id:video.id},'-created_date',2);
    const series=video.content_type==='episode'&&video.series_id?await admin.entities.Series.get(video.series_id).catch(()=>null):null;
    return taskCatalogItem(video,policies,{series,hash});
   }));items.push(...batch.filter(Boolean));
  }
  return Response.json({ok:true,source:'xerostreams',revision:'task-catalog-v1',items:items.sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,30)},{headers:{'Cache-Control':'public, max-age=300'}});
 }catch{return Response.json({ok:false,error:'catalog_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export default handler;
if(typeof Deno!=='undefined')Deno.serve(handler);
