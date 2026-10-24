import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {createPremiumOrder,capturePremiumOrder,verifyPremiumPayment} from '../../shared/premiumPayments.ts';
async function handleRequest(req){
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
  const client=createClientFromRequest(req),user=await client.auth.me().catch(()=>null);
  if(!user?.id)return Response.json({error:'Unauthorized'},{status:401,headers});
  const body=await req.json();
  if(!body||typeof body!=='object'||Array.isArray(body)||!['create','capture','evidence'].includes(body.action))return Response.json({error:'Invalid request'},{status:400,headers});
  const expected=body.action==='create'?'action,plan_id':'action,orderId';
  if(Object.keys(body).sort().join(',')!==expected)return Response.json({error:'Invalid request'},{status:400,headers});
  const admin=client.asServiceRole;
  if(body.action==='create')return Response.json(await createPremiumOrder(admin,user.id,body.plan_id),{headers});
  if(body.action==='capture')return Response.json(await capturePremiumOrder(admin,user.id,body.orderId),{headers});
  return Response.json({provider_verified:true,reward_issued:false,evidence:await verifyPremiumPayment(admin,user.id,body.orderId)},{headers});
 }catch{return Response.json({error:'Premium payment could not be verified. A payment already captured will not be charged again; retry or contact support.'},{status:409,headers});}
}
export default handleRequest;
if(typeof Deno!=='undefined')Deno.serve(handleRequest);
