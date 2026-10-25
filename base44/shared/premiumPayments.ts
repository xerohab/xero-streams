import {premiumReversalProof} from './premiumReversals.ts';
import {secrets} from 'base44:runtime';
import {currentPerkSphereLink} from './perkSphereClient.ts';
import {emitPremiumTaskEvent} from './partnerTaskEvents.ts';
const API=()=>secrets.get('PAYPAL_ENVIRONMENT')==='sandbox'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
function fail(){throw Error('PREMIUM_PAYMENT_NOT_VERIFIED');}
export function planPrice(value){
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>100000)fail();
 const minor=Math.round(value*100);if(minor<1||Math.abs(value*100-minor)>0.000001)fail();
 return (minor/100).toFixed(2);
}
async function provider(path,{token,method='GET',body,requestId}={}){
 const headers={'Content-Type':'application/json',Authorization:token?'Bearer '+token:''};
 if(requestId)headers['PayPal-Request-Id']=requestId;
 const response=await fetch(API()+path,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok)fail();return response.json();
}
async function accessToken(){
 const id=secrets.get('PAYPAL_CLIENT_ID'),secret=secrets.get('PAYPAL_CLIENT_SECRET');if(!id||!secret)fail();
 const r=await fetch(API()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(id+':'+secret),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok)fail();const data=await r.json();if(typeof data.access_token!=='string'||!data.access_token)fail();return data.access_token;
}
function validateOrder(order,binding){
 if(order?.id!==binding.order_id||!Array.isArray(order.purchase_units)||order.purchase_units.length!==1)fail();
 const unit=order.purchase_units[0];
 if(unit.custom_id!=='PSPREMIUM:'+binding.id||unit.amount?.currency_code!==binding.currency||unit.amount?.value!==binding.expected_amount)fail();
 return unit;
}
export function premiumProof(order,binding){
 const unit=validateOrder(order,binding),captures=unit.payments?.captures;
 if(order.status!=='COMPLETED'||!Array.isArray(captures)||captures.length!==1)fail();
 const capture=captures[0];
 if(capture.status!=='COMPLETED'||!validId(capture.id)||capture.amount?.currency_code!==binding.currency||capture.amount?.value!==binding.expected_amount||
  !Number.isFinite(Date.parse(capture.create_time))||Date.parse(capture.create_time)>Date.now()+300000)fail();
 return {provider:'paypal',order_reference:binding.order_id,capture_reference:capture.id,partner_account_reference:binding.user_id,plan_reference:binding.plan_id,currency:binding.currency,amount_minor:Math.round(Number(binding.expected_amount)*100),captured_at:capture.create_time,link_reference:binding.perksphere_link_uuid||null};
}
async function bindingFor(admin,userId,orderId){
 if(!validId(orderId))fail();
 const rows=await admin.entities.PremiumPayment.filter({order_id:orderId});
 if(rows.length!==1||rows[0].user_id!==userId||!validId(rows[0].id)||!validId(rows[0].plan_id)||rows[0].currency!=='GBP'||!/^[0-9]+\.[0-9]{2}$/.test(rows[0].expected_amount)||!validId(rows[0].request_reference))fail();
 return rows[0];
}
export async function createPremiumOrder(admin,userId,planId){
 if(!validId(userId)||!validId(planId))fail();
 const plan=await admin.entities.SubscriptionPlan.get(planId);if(plan?.id!==planId||plan.is_active!==true)fail();
 const amount=planPrice(plan.price),request=crypto.randomUUID();
 const link=await currentPerkSphereLink(admin,userId).catch(()=>null);
 const binding=await admin.entities.PremiumPayment.create({user_id:userId,plan_id:planId,expected_amount:amount,currency:'GBP',request_reference:request,status:'pending',...(link?{perksphere_link_uuid:link.perksphere_connection_id}:{})});
 if(!validId(binding.id))fail();
 const token=await accessToken();
 const order=await provider('/v2/checkout/orders',{method:'POST',token,requestId:request,body:{intent:'CAPTURE',purchase_units:[{custom_id:'PSPREMIUM:'+binding.id,amount:{currency_code:'GBP',value:amount},description:'Xero Streams Premium'}],application_context:{brand_name:'Xero Streams',user_action:'PAY_NOW',return_url:'https://xerostreams.com/callback?success=true&premium=true',cancel_url:'https://xerostreams.com/callback?cancelled=true&premium=true'}}});
 if(!validId(order.id))fail();
 const approval=order.links?.find(x=>x.rel==='approve')?.href;
 const target=new URL(approval);if(target.protocol!=='https:'||!['www.paypal.com','www.sandbox.paypal.com'].includes(target.hostname)||target.username||target.password)fail();
 await admin.entities.PremiumPayment.update(binding.id,{order_id:order.id,status:'created'});
 return {orderId:order.id,approvalUrl:approval,currency:'GBP',amount,perksphere_reward_link_bound:!!link};
}
export async function capturePremiumOrder(admin,userId,orderId){
 const binding=await bindingFor(admin,userId,orderId),token=await accessToken();
 let order=await provider('/v2/checkout/orders/'+orderId,{token});validateOrder(order,binding);
 if(order.status!=='COMPLETED'){
  if(order.status!=='APPROVED')fail();
  await provider('/v2/checkout/orders/'+orderId+'/capture',{method:'POST',token,body:{},requestId:'capture-'+binding.request_reference});
  order=await provider('/v2/checkout/orders/'+orderId,{token});
 }
 const proof=premiumProof(order,binding);
 await admin.entities.PremiumPayment.update(binding.id,{status:'completed',capture_id:proof.capture_reference,captured_at:proof.captured_at});
 const existing=await admin.entities.UserSubscription.filter({user_id:userId,paypal_order_id:orderId});
 if(existing.length>1)fail();
 if(existing.length===1&&existing[0].plan_id!==binding.plan_id)fail();
 // A retry reuses the same entitlement; a captured payment is never captured again.
 let subscription=existing[0];
 if(!subscription)subscription=await admin.entities.UserSubscription.create({user_id:userId,plan_id:binding.plan_id,status:'active',paypal_order_id:orderId});
 if(subscription.status!=='active')fail();
 const active=await admin.entities.UserSubscription.filter({user_id:userId,status:'active'});
 for(const row of active)if(row.id!==subscription.id&&row.paypal_order_id!==orderId)await admin.entities.UserSubscription.update(row.id,{status:'cancelled'});
 let notification={submitted:false};try{notification=await emitPremiumTaskEvent(admin,proof);}catch{/* Retry notification without undoing a captured purchase. */}
 return {success:true,premium_activated:true,status:'COMPLETED',reward_issued:false,reward_event_submitted:notification.submitted};
}
export async function verifyPremiumPayment(admin,userId,orderId){
 const binding=await bindingFor(admin,userId,orderId);if(binding.status!=='completed')fail();
 const subscriptions=await admin.entities.UserSubscription.filter({user_id:userId,paypal_order_id:orderId});
 if(subscriptions.length!==1||subscriptions[0].status!=='active'||subscriptions[0].plan_id!==binding.plan_id)fail();
 const proof=premiumProof(await provider('/v2/checkout/orders/'+orderId,{token:await accessToken()}),binding);
 if(binding.capture_id!==proof.capture_reference||binding.captured_at!==proof.captured_at)fail();
 return proof;
}

export async function verifyPremiumReversal(admin,userId,orderId,eventType,reference){
 const binding=await bindingFor(admin,userId,orderId);
 if(binding.status!=='completed'||!validId(binding.capture_id)||!validId(reference)||!['purchase_refunded','chargeback_issued'].includes(eventType))fail();
 const token=await accessToken(),read=path=>provider(path,{token});
 return premiumReversalProof({binding,order:await read('/v2/checkout/orders/'+orderId),read,eventType,reference,environment:secrets.get('PAYPAL_ENVIRONMENT')==='sandbox'?'sandbox':'live'});
}
