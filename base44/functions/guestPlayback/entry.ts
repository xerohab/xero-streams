import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(u)return Response.json({error:'Use your viewing profile'},{status:403,headers});
 const b=await req.json();
 if(typeof b?.video_id!=='string'||!b.video_id.trim()||b.video_id.length>256)return Response.json({error:'Invalid title'},{status:400,headers});
 const db=base.asServiceRole.entities,rows=await db.Video.filter({id:b.video_id}),v=rows.length===1?rows[0]:null;
 if(!v||v.is_adult||v.is_for_sale||v.coming_soon)return Response.json({error:'Unavailable title'},{status:404,headers});
 if(v.series_id){const parents=await db.Series.filter({id:v.series_id});if(parents.length!==1||parents[0].is_adult)return Response.json({error:'Unavailable title'},{status:404,headers});}
 let media=v;
 if(db.ProtectedMediaSource){const sources=await db.ProtectedMediaSource.filter({video_id:v.id});if(sources.length>1)return Response.json({error:'Conflicting sources'},{status:409,headers});if(sources.length===1)media=sources[0];}
 const source=typeof media.video_url==='string'&&media.video_url.trim()?media.video_url:null;
 const subtitles=source&&Array.isArray(media.subtitles)?media.subtitles.filter(t=>typeof t?.url==='string'&&t.url).map(({url,language,label})=>({url,language,label})):[];
 return Response.json({source,subtitles},{headers});
 }catch{return Response.json({error:'Playback unavailable'},{status:500,headers});}
}
