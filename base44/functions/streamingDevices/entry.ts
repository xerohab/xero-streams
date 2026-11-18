import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
try{
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(!u)return Response.json({error:'Unauthorized'},{status:401});
 const b=await req.json(),db=base.asServiceRole.entities.StreamingDevice;
 if(b.action==='list'){
 const rows=await db.filter({user_id:u.id},'-last_seen',100);
 return Response.json({devices:rows.map(r=>({device_id:r.device_id,label:r.label,last_seen:r.last_seen,revoked:r.revoked}))});
 }
 if(typeof b.device_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(b.device_id))return Response.json({error:'Invalid device'},{status:400});
 const scope={user_id:u.id,device_id:b.device_id},row=(await db.filter(scope))[0];
 if(b.action==='revoke'){if(!row)return Response.json({error:'Device not found'},{status:404});if(row)await db.update(row.id,{revoked:true});return Response.json({ok:true});}
 if(b.action!=='heartbeat')return Response.json({error:'Invalid action'},{status:400});
 if(row?.revoked)return Response.json({revoked:true});
 const data={label:String(b.label||'Browser').slice(0,100),last_seen:Date.now()};
 if(row)await db.update(row.id,data);else await db.create({...scope,...data,revoked:false});
 return Response.json({revoked:false});
}catch{return Response.json({error:'Device service unavailable'},{status:500});}
}