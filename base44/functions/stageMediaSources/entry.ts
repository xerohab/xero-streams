import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
 const c=createClientFromRequest(req),u=await c.auth.me().catch(()=>null);
 if(!u?.id||u.is_banned||u.role!=='admin')return Response.json({error:'Forbidden'},{status:403,headers});
 const b=await req.json(),db=c.asServiceRole.entities;
 if(!b||!Number.isSafeInteger(b.offset)||b.offset<0||b.offset>500000||typeof b.dry_run!=='boolean')return Response.json({error:'Invalid request'},{status:400,headers});
 const rows=await db.Video.list('id',100,b.offset);
 if(!Array.isArray(rows)||rows.length>100||rows.some(v=>!v?.id)||new Set(rows.map(v=>v.id)).size!==rows.length)throw Error();
 const counts={missing:0,unchanged:0,conflicts:0,staged:0,empty:0,verified:0};
 for(const v of rows){
 const data={video_id:v.id,video_url:v.video_url||'',download_url:v.download_url||'',subtitles:Array.isArray(v.subtitles)?v.subtitles:[]};
 if(!data.video_url&&!data.download_url&&!data.subtitles.length){counts.empty++;continue;}
 if(typeof data.video_url!=='string'||typeof data.download_url!=='string'||data.subtitles.some(t=>!t||typeof t.url!=='string')){counts.conflicts++;continue;}
 const matches=await db.ProtectedMediaSource.filter({video_id:v.id});
 if(matches.length>1){counts.conflicts++;continue;}
 if(matches.length===1){
 const existing=matches[0];
 if(existing.video_url===data.video_url&&existing.download_url===data.download_url&&JSON.stringify(existing.subtitles||[])===JSON.stringify(data.subtitles)){counts.unchanged++;counts.verified++;if(!b.dry_run)await db.Video.update(v.id,{has_playback:Boolean(data.video_url.trim())&&!v.coming_soon});}else counts.conflicts++;
 continue;
 }
 counts.missing++;
 if(!b.dry_run){await db.ProtectedMediaSource.create({...data,source_updated_at:new Date().toISOString()});counts.staged++;
 const check=await db.ProtectedMediaSource.filter({video_id:v.id});
 if(check.length===1&&check[0].video_url===data.video_url&&check[0].download_url===data.download_url&&JSON.stringify(check[0].subtitles||[])===JSON.stringify(data.subtitles)){counts.verified++;await db.Video.update(v.id,{has_playback:Boolean(data.video_url.trim())&&!v.coming_soon});}else counts.conflicts++;}
 }
 return Response.json({counts,next:rows.length===100?b.offset+100:null},{headers});
 }catch{return Response.json({error:'Source staging failed'},{status:409,headers});}
}
