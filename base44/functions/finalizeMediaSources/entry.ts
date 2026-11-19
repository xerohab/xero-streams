import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
const headers={'Cache-Control':'no-store'};
const canonical=(a)=>JSON.stringify((a||[]).map(t=>[t.url,t.language??'',t.label??'']));
export default async function(req:Request){
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
 const c=createClientFromRequest(req),u=await c.auth.me().catch(()=>null);
 if(!u?.id||u.is_banned||u.role!=='admin')return Response.json({error:'Forbidden'},{status:403,headers});
 const b=await req.json(),db=c.asServiceRole.entities;
 if(!['audit','clear','restore'].includes(b.action)||!Number.isSafeInteger(b.offset)||b.offset<0||b.offset>500000)return Response.json({error:'Invalid request'},{status:400,headers});
 const pageSize=b.action==='audit'?25:5;
 const rows=await db.Video.list('id',pageSize,b.offset);
 const allSources=rows.length?await db.ProtectedMediaSource.filter({video_id:{$in:rows.map(v=>v.id)}},'id',100):[];
 const counts={verified:0,empty:0,conflict:0,changed:0};
 for(const v of rows){
 const sources=allSources.filter(s=>s.video_id===v.id);
 const raw=Boolean(v.video_url||v.download_url||v.subtitles?.length);
 if(!raw&&!sources.length){counts.empty++;continue;}
 if(sources.length!==1){counts.conflict++;continue;}
 const s=sources[0];
 const same=(v.video_url||'')===(s.video_url||'')&&(v.download_url||'')===(s.download_url||'')&&canonical(v.subtitles)===canonical(s.subtitles);
 if(raw&&!same){counts.conflict++;continue;}
 counts.verified++;
 if(b.action==='clear'&&raw){await db.Video.update(v.id,{video_url:'',download_url:'',subtitles:[],has_playback:Boolean(s.video_url)&&!v.coming_soon});counts.changed++;}
 if(b.action==='restore'&&!raw){await db.Video.update(v.id,{video_url:s.video_url||'',download_url:s.download_url||'',subtitles:s.subtitles||[],has_playback:Boolean(s.video_url)&&!v.coming_soon});counts.changed++;}
 }
 return Response.json({counts,next:rows.length===pageSize?b.offset+pageSize:null},{headers});
 }catch(e){console.error('Protected source migration:',e?.name);return Response.json({error:'Migration interrupted; retry same page'},{status:409,headers});}
}
