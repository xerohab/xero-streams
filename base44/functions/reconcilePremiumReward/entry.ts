import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {secrets} from 'base44:runtime';
import {verifyPremiumReversal} from '../../shared/premiumPayments.ts';
import {submitPartnerEvent,logIntegration} from '../../shared/perkSphereClient.ts';
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
async function handler(req){
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
  const client=createClientFromRequest(req),user=await client.auth.me().catch(()=>null);
  if(!user?.id)return Response.json({error:'Unauthorized'},{status:401,headers});
  if(user.role!=='admin')return Response.json({error:'Forbidden'},{status:403,headers});
  if(secrets.get('PERKSPHERE_REVERSAL_EVENTS_ENABLED')!=='true')return Response.json({error:'Reconciliation notifications are paused.'},{status:503,headers});
  const body=await req.json();
  if(!body||Object.keys(body).sort().join(',')!=='event_type,orderId,reference'||!['purchase_refunded','chargeback_issued'].includes(body.event_type)||!id(body.orderId)||!id(body.reference))return Response.json({error:'Invalid request'},{status:400,headers});
  const admin=client.asServiceRole,rows=await admin.entities.PremiumPayment.filter({order_id:body.orderId});
  if(rows.length!==1||!id(rows[0].user_id))throw Error('PAYMENT_NOT_BOUND');
  const proof=await verifyPremiumReversal(admin,rows[0].user_id,body.orderId,body.event_type,body.reference);
  if(proof.environment!=='live')return Response.json({error:'Sandbox payments cannot reverse live rewards.'},{status:409,headers});
  const evidence={transaction_reference:proof.order_reference,currency:proof.currency,amount_minor:proof.amount_minor,[proof.event_type==='purchase_refunded'?'refund_reference':'chargeback_reference']:proof.reversal_reference};
  const eventId='ps_rev_'+proof.reversal_reference+'_'+proof.reversed_amount_minor;
  const result=await submitPartnerEvent({user_id:proof.partner_account_reference},{event_type:proof.event_type,partner_event_id:eventId,task_reference:'6add18607277b6ca86efab42',resource_reference:proof.capture_reference,occurred_at:proof.occurred_at,evidence});
  await logIntegration(client,{event_type:proof.event_type,status:result.ok?'submitted':'failed',user_id:proof.partner_account_reference,event_id:eventId,details:{operator_reference:user.id,provider_verified:true,reward_reversal_applied:false}});
  return Response.json({provider_verified:true,event_submitted:result.ok,reward_reversal_applied:false,payment_refund_initiated:false},{status:result.ok?200:503,headers});
 }catch{return Response.json({error:'Payment reversal could not be independently verified; review the provider record. No refund was initiated.'},{status:409,headers});}
}
export default handler;
if(typeof Deno!=='undefined')Deno.serve(handler);
