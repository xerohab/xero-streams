import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 try{
 const base=createClientFromRequest(req),db=base.asServiceRole.entities;
 const user=await base.auth.me().catch(()=>null);
 if(!user)return Response.json({error:'Sign in required'},{status:401});
 const b=await req.json();
 const video=(await base.entities.Video.filter({id:b.video_id}))[0];
 if(!video||video.is_adult||video.coming_soon||!video.video_url)return Response.json({error:'Unavailable'},{status:403});
 if(b.action==='create'){
 const token=crypto.randomUUID()+crypto.randomUUID();
 const row=await db.WatchParty.create({host_id:user.id,video_id:video.id,token,expires_at:new Date(Date.now()+6*3600000).toISOString(),position:0,paused:true,synced_at:new Date().toISOString()});
 return Response.json({token,host:true});
 }
 const room=(await db.WatchParty.filter({token:b.token,video_id:video.id}))[0];
 if(!room||Date.parse(room.expires_at)<Date.now())return Response.json({error:'Party expired'},{status:404});
 const host=room.host_id===user.id;
 if(b.action==='chat'){const message=String(b.message||'').trim().slice(0,500);if(!message)return Response.json({error:'Empty message'},{status:400});await db.PartyMessage.create({party_id:room.id,sender:String(user.full_name||'Viewer').slice(0,80),message});return Response.json({ok:true});}
 if(b.action==='messages'){const rows=await db.PartyMessage.filter({party_id:room.id},'-created_date',50);return Response.json({messages:rows.reverse().map(m=>({id:m.id,sender:m.sender,message:m.message}))});}
 if(b.action==='sync'){
 if(!host||!Number.isFinite(b.position)||b.position<0||typeof b.paused!=='boolean')return Response.json({error:'Forbidden'},{status:403});
 await db.WatchParty.update(room.id,{position:b.position,paused:b.paused,synced_at:new Date().toISOString()});
 return Response.json({ok:true});
 }
 if(b.action==='close'&&host){await db.WatchParty.delete(room.id);return Response.json({ok:true});}
 if(b.action==='state')return Response.json({host,position:room.position,paused:room.paused,synced_at:room.synced_at});
 return Response.json({error:'Unknown action'},{status:400});
 }catch{return Response.json({error:'Party unavailable'},{status:500});}
}