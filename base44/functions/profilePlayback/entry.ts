import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
try{
const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
if(!u)return Response.json({error:'Unauthorized'},{status:401});
const b=await req.json(),db=base.asServiceRole.entities;
if(typeof b.profile_id!=='string'||!(await db.ViewingProfile.filter({id:b.profile_id,user_id:u.id}))[0])return Response.json({error:'Invalid profile'},{status:403});
const scope={user_id:u.id,profile_id:b.profile_id};
if(b.action==='list'){
const rows=await db.ProfilePlayback.filter(scope,'-changed_at',200);
const output=[];
for(const r of rows){const v=(await base.entities.Video.filter({id:r.video_id}))[0];if(!v)continue;output.push({id:r.video_id,title:v.title,thumbnail_url:v.thumbnail_url,is_adult:!!v.is_adult,position:r.position,duration:r.duration,state:r.state,changed_at:r.changed_at});}
return Response.json({rows:output});
}
if(b.action!=='save'||typeof b.video_id!=='string'||!['progress','completed','removed'].includes(b.state))return Response.json({error:'Invalid operation'},{status:400});
if(!(await base.entities.Video.filter({id:b.video_id}))[0])return Response.json({error:'Unavailable title'},{status:404});
const position=Number(b.position)||0,duration=Number(b.duration)||0;
if(!Number.isFinite(position)||!Number.isFinite(duration)||position<0||duration<0||position>duration)return Response.json({error:'Invalid progress'},{status:400});
const key={...scope,video_id:b.video_id};
const row=(await db.ProfilePlayback.filter(key))[0];
const data={position,duration,state:b.state,changed_at:Date.now()};
if(row)await db.ProfilePlayback.update(row.id,data);else await db.ProfilePlayback.create({...key,...data});
return Response.json({ok:true});
}catch{return Response.json({error:'Sync unavailable'},{status:500});}
}