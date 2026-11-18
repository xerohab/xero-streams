import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
try{
const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
if(!u||u.is_banned)return Response.json({error:'Unauthorized'},{status:401});
const b=await req.json(),db=base.asServiceRole.entities;
const profile=typeof b.profile_id==='string'?(await db.ViewingProfile.filter({id:b.profile_id,user_id:u.id}))[0]:null;
if(!profile)return Response.json({error:'Invalid profile'},{status:403});
const scope={user_id:u.id,profile_id:b.profile_id};
const allowed=(v:any)=>!!v&&(!profile.is_kids||(!v.is_adult&&['U','G','PG','TV-Y','TV-Y7','TV-Y7-FV','TV-G','TV-PG','BBFC U','BBFC PG'].includes(String(v.age_rating||'').trim().toUpperCase())));
if(b.action==='list'){
const rows=await db.ProfilePlayback.filter(scope,'-changed_at',200);
const output=[];
for(let i=0;i<rows.length;i+=8){const batch=await Promise.all(rows.slice(i,i+8).map(async r=>{const v=(await base.entities.Video.filter({id:r.video_id}))[0];return allowed(v)?{id:r.video_id,title:v.title,thumbnail_url:v.thumbnail_url,is_adult:!!v.is_adult,position:r.position,duration:r.duration,state:r.state,changed_at:r.changed_at}:null;}));output.push(...batch.filter(Boolean));}
return Response.json({rows:output});
}
if(b.action!=='save'||typeof b.video_id!=='string'||!['progress','completed','removed'].includes(b.state))return Response.json({error:'Invalid operation'},{status:400});
if(b.state!=='removed'&&!allowed((await base.entities.Video.filter({id:b.video_id}))[0]))return Response.json({error:'Unavailable title'},{status:404});
const position=b.position??0,duration=b.duration??0;
if(!Number.isFinite(position)||!Number.isFinite(duration)||position<0||duration<0||position>duration||duration>604800)return Response.json({error:'Invalid progress'},{status:400});
const key={...scope,video_id:b.video_id};
const row=(await db.ProfilePlayback.filter(key))[0];
if(b.state==='removed'&&!row)return Response.json({ok:true});
const data={position:b.state==='progress'?position:0,duration:b.state==='progress'?duration:0,state:b.state,changed_at:Date.now()};
if(row)await db.ProfilePlayback.update(row.id,data);else await db.ProfilePlayback.create({...key,...data});
return Response.json({ok:true});
}catch{return Response.json({error:'Sync unavailable'},{status:500});}
}