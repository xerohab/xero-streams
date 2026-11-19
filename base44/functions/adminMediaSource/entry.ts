import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
 const c=createClientFromRequest(req),u=await c.auth.me().catch(()=>null);
 if(!u?.id||u.is_banned||u.role!=='admin')return Response.json({error:'Forbidden'},{status:403,headers});
 const b=await req.json(),db=c.asServiceRole.entities;
 if(!['get','save'].includes(b?.action)||typeof b.video_id!=='string'||!b.video_id.trim()||b.video_id.length>256)return Response.json({error:'Invalid request'},{status:400,headers});
 const videos=await db.Video.filter({id:b.video_id}),sources=await db.ProtectedMediaSource.filter({video_id:b.video_id});
 if(videos.length!==1||sources.length>1)return Response.json({error:'Conflicting records'},{status:409,headers});
 const v=videos[0],old=sources[0];
 const fields=['video_url','download_url','subtitles'];
 if(b.action==='get')return Response.json({source:Object.fromEntries(fields.map(k=>[k,(old||v)[k]??(k==='subtitles'?[]:'')]))},{headers});
 const validUrl=(s:unknown)=>{if(s==='')return true;if(typeof s!=='string'||s.length>8192)return false;try{const url=new URL(s);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}};
 if(!validUrl(b.video_url)||!validUrl(b.download_url)||!Array.isArray(b.subtitles)||b.subtitles.length>100||b.subtitles.some(t=>!t||!t.url||!validUrl(t.url)||typeof t.language!=='string'||typeof t.label!=='string'))return Response.json({error:'Invalid source links'},{status:400,headers});
 const data={video_id:v.id,video_url:b.video_url,download_url:b.download_url,subtitles:b.subtitles.map(({url,language,label})=>({url,language,label})),source_updated_at:new Date().toISOString()};
 if(old)await db.ProtectedMediaSource.update(old.id,data);else await db.ProtectedMediaSource.create(data);
 await db.Video.update(v.id,{has_playback:Boolean(data.video_url)&&!v.coming_soon});
 return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Source management unavailable'},{status:500,headers});}
}
