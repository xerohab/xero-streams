import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
 const client=createClientFromRequest(req),user=await client.auth.me().catch(()=>null);
 if(!user?.id||user.is_banned)return Response.json({error:'Unauthorized'},{status:401,headers});
 const body=await req.json();
 if(typeof body?.subscription_id!=='string'||!body.subscription_id||body.subscription_id.length>256)return Response.json({error:'Invalid subscription'},{status:400,headers});
 const db=client.asServiceRole.entities;
 const rows=await db.UserSubscription.filter({id:body.subscription_id,user_id:user.id});
 if(rows.length!==1)return Response.json({error:'Subscription not found'},{status:404,headers});
 if(rows[0].status==='active')await db.UserSubscription.update(rows[0].id,{status:'cancelled'});
 return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Cancellation unavailable'},{status:503,headers});}
}
