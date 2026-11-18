import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 try{
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(!u)return Response.json({error:'Sign in required'},{status:401});
 const b=await req.json(),db=base.asServiceRole.entities;
 const outgoing=await db.FriendRequest.filter({sender_id:u.id},'-created_date',200);
 const incoming=await db.FriendRequest.filter({recipient_id:u.id},'-created_date',200);
 const rows=[...outgoing,...incoming];
 if(b.action==='list')return Response.json({code:u.id,rows:rows.map(r=>({id:r.id,incoming:r.recipient_id===u.id,name:r.recipient_id===u.id?r.sender_name:r.recipient_name,status:r.status}))});
 if(b.action==='request'){
 const id=String(b.code||'').trim();
 if(!id||id===u.id||id.length>128||rows.some(r=>r.sender_id===id||r.recipient_id===id)||outgoing.length>=100)return Response.json({error:'Invalid or existing friend request'},{status:400});
 const target=(await db.User.filter({id}))[0];
 if(!target)return Response.json({error:'Invalid friend code'},{status:404});
 await db.FriendRequest.create({sender_id:u.id,recipient_id:id,sender_name:String(u.full_name||'Viewer').slice(0,80),recipient_name:String(target.full_name||'Viewer').slice(0,80),status:'pending'});
 return Response.json({ok:true});
 }
 const row=rows.find(r=>r.id===b.id);
 if(!row)return Response.json({error:'Not found'},{status:404});
 if(b.action==='accept'&&row.recipient_id===u.id&&row.status==='pending')await db.FriendRequest.update(row.id,{status:'accepted'});
 else if(b.action==='remove')await db.FriendRequest.delete(row.id);
 else return Response.json({error:'Not permitted'},{status:403});
 return Response.json({ok:true});
 }catch{return Response.json({error:'Friends unavailable'},{status:500});}
}