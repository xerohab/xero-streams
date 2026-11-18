import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
if(!u)return Response.json({error:'Sign in required'},{status:401});
const b=await req.json(),db=base.asServiceRole.entities;
if(b.action==='list'&&u.role==='admin')return Response.json({rows:await db.PlaybackReport.filter({status:'open'},'-created_date',100)});
if(b.action==='resolve'&&u.role==='admin'){await db.PlaybackReport.update(b.id,{status:'resolved'});return Response.json({ok:true});}
if(b.action!=='report'||!['Not playing','Wrong video','Audio problem','Subtitle problem'].includes(b.reason))return Response.json({error:'Invalid report'},{status:400});
const v=(await base.entities.Video.filter({id:b.video_id}))[0];if(!v)return Response.json({error:'Unavailable'},{status:404});
const old=await db.PlaybackReport.filter({user_id:u.id,video_id:v.id,status:'open'});if(!old.length)await db.PlaybackReport.create({user_id:u.id,video_id:v.id,reason:b.reason,status:'open'});
return Response.json({ok:true});
}