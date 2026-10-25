import test from 'node:test';
import assert from 'node:assert/strict';
import {createPremiumOrder,capturePremiumOrder,verifyPremiumPayment,premiumProof,planPrice} from '../base44/shared/premiumPayments.ts';
import handler from '../base44/functions/premiumCheckout/entry.ts';
const binding={id:'payment-record',user_id:'member-owner',plan_id:'plan-stored',order_id:'ORDER123',expected_amount:'4.99',currency:'GBP',request_reference:'request-fixed',status:'created'};
function order(status='COMPLETED'){
 return {id:'ORDER123',status,purchase_units:[{custom_id:'PSPREMIUM:payment-record',amount:{currency_code:'GBP',value:'4.99'},payments:{captures:[{id:'CAPTURE123',status:'COMPLETED',amount:{currency_code:'GBP',value:'4.99'},create_time:'2026-10-24T10:00:00.000Z'}]}}]};
}
function fixture(){
 const receipt={...binding},subscriptions=[],writes=[],calls=[];
 globalThis.__testSecrets={PAYPAL_CLIENT_ID:'test-client',PAYPAL_CLIENT_SECRET:'test-private',PAYPAL_ENVIRONMENT:'sandbox'};
 const admin={entities:{
  SubscriptionPlan:{get:async id=>({id,is_active:true,price:4.99})},
  PremiumPayment:{create:async data=>{writes.push(['receipt-create',data]);Object.assign(receipt,data);return {...receipt};},filter:async()=>[{...receipt}],update:async(id,data)=>{assert.equal(id,receipt.id);writes.push(['receipt-update',data]);Object.assign(receipt,data);}},
  UserSubscription:{filter:async query=>subscriptions.filter(s=>Object.entries(query).every(([k,v])=>s[k]===v)),create:async data=>{const row={...data,id:'sub-'+subscriptions.length};subscriptions.push(row);writes.push(['subscription-create',data]);return row;},update:async(id,data)=>Object.assign(subscriptions.find(s=>s.id===id),data)}
 }};
 globalThis.__testClient={auth:{me:async()=>({id:receipt.user_id})},asServiceRole:admin};
 return {admin,receipt,subscriptions,writes,calls};
}
test('premium prices reject free, fractional, nonfinite and browser-derived amounts',()=>{
 for(const v of [0,-1,1.001,NaN,Infinity,'4.99'])assert.throws(()=>planPrice(v));
 assert.equal(planPrice(4.99),'4.99');assert.equal(planPrice(0.29),'0.29');
});
test('premium order uses authenticated owner and stored plan price with private provider binding',async()=>{
 const original=globalThis.fetch,f=fixture();
 try{
  globalThis.fetch=async(url,init)=>{
   assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'));
   if(url.endsWith('/token'))return Response.json({access_token:'test-token'});
   assert.ok(url.endsWith('/v2/checkout/orders'));const body=JSON.parse(init.body);
   assert.equal(body.purchase_units[0].amount.value,'4.99');assert.equal(body.purchase_units[0].amount.currency_code,'GBP');assert.equal(body.purchase_units[0].custom_id,'PSPREMIUM:payment-record');assert.equal(body.application_context.return_url,'https://xerostreams.com/callback?success=true&premium=true');
   return Response.json({id:'ORDER123',links:[{rel:'approve',href:'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123'}]});
  };
  assert.equal((await createPremiumOrder(f.admin,'member-owner','plan-stored')).orderId,'ORDER123');assert.equal(f.receipt.user_id,'member-owner');assert.equal(f.receipt.status,'created');
 }finally{globalThis.fetch=original;}
});
test('premium capture replays reuse entitlement and never capture an already completed order',async()=>{
 const original=globalThis.fetch,f=fixture();let captures=0;
 try{
  globalThis.fetch=async(url,init)=>{
   if(url.endsWith('/token'))return Response.json({access_token:'test-token'});
   if(url.endsWith('/capture')){captures++;return Response.json({status:'COMPLETED'});}
   return Response.json(order());
  };
  assert.equal((await capturePremiumOrder(f.admin,'member-owner','ORDER123')).premium_activated,true);
  assert.equal((await capturePremiumOrder(f.admin,'member-owner','ORDER123')).premium_activated,true);
  assert.equal(captures,0);assert.equal(f.subscriptions.length,1);assert.equal(f.receipt.capture_id,'CAPTURE123');
  assert.equal((await verifyPremiumPayment(f.admin,'member-owner','ORDER123')).amount_minor,499);
 }finally{globalThis.fetch=original;}
});
test('approved premium order is captured with stable provider idempotency key then independently read',async()=>{
 const original=globalThis.fetch,f=fixture();let reads=0,captures=0;
 try{
  globalThis.fetch=async(url,init)=>{
   if(url.endsWith('/token'))return Response.json({access_token:'test-token'});
   if(url.endsWith('/capture')){captures++;assert.equal(init.headers['PayPal-Request-Id'],'capture-request-fixed');return Response.json({status:'COMPLETED'});}
   reads++;return Response.json(order(reads===1?'APPROVED':'COMPLETED'));
  };
  await capturePremiumOrder(f.admin,'member-owner','ORDER123');assert.equal(captures,1);assert.equal(reads,2);assert.equal(f.subscriptions.length,1);
 }finally{globalThis.fetch=original;}
});
test('foreign owners and malformed requests cause no provider or entitlement activity',async()=>{
 const original=globalThis.fetch,f=fixture();
 try{
  globalThis.fetch=()=>{throw Error('must not call provider');};
  await assert.rejects(capturePremiumOrder(f.admin,'foreign-member','ORDER123'));assert.equal(f.writes.length,0);
  for(const body of [{action:'create',plan_id:'plan-stored',amount:0.01},{action:'capture',orderId:'ORDER123',user_id:'foreign'},{action:'evidence',orderId:'ORDER123',verified:true}])assert.equal((await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify(body)}))).status,400);
  globalThis.__testClient.auth.me=async()=>null;assert.equal((await handler(new Request('https://test.invalid',{method:'POST',body:'{}'}))).status,401);
 }finally{globalThis.fetch=original;}
});
test('premium proof rejects wrong binding, amount, currency, pending and refunded payments',()=>{
 for(const mutate of [
  o=>o.purchase_units[0].custom_id='PSPREMIUM:other',
  o=>o.purchase_units[0].amount.value='0.01',
  o=>o.purchase_units[0].payments.captures[0].amount.currency_code='USD',
  o=>o.purchase_units[0].payments.captures[0].status='REFUNDED',
  o=>o.purchase_units[0].payments.captures[0].status='PARTIALLY_REFUNDED',
  o=>o.status='APPROVED',
  o=>o.purchase_units[0].payments.captures.push({...o.purchase_units[0].payments.captures[0]})
 ]){const value=order();mutate(value);assert.throws(()=>premiumProof(value,binding));}
});
test('evidence rejects cancelled or duplicate entitlements without provider access',async()=>{
 const original=globalThis.fetch;
 try{
  for(const count of [0,2]){
   const f=fixture();f.receipt.status='completed';
   for(let i=0;i<count;i++)f.subscriptions.push({user_id:binding.user_id,paypal_order_id:binding.order_id,plan_id:binding.plan_id,status:'active'});
   globalThis.fetch=()=>{throw Error('must not call provider');};
   await assert.rejects(verifyPremiumPayment(f.admin,binding.user_id,binding.order_id));
  }
 }finally{globalThis.fetch=original;}
});
test('premium payment records never permit browser writes or reads',async()=>{
 const {readFile}=await import('node:fs/promises');const schema=JSON.parse(await readFile(new URL('../base44/entities/PremiumPayment.jsonc',import.meta.url),'utf8'));
 for(const action of ['create','update','delete','read'])assert.deepEqual(schema.rls[action],{user_condition:{role:'service_only'}});
});
test('payment evidence pins provider environment across token and order reads',async()=>{
 const original=globalThis.fetch,f=fixture();f.receipt.status='completed';f.receipt.capture_id='CAPTURE123';f.receipt.captured_at='2026-10-24T10:00:00.000Z';f.subscriptions.push({user_id:binding.user_id,paypal_order_id:binding.order_id,plan_id:binding.plan_id,status:'active'});
 try{
  globalThis.fetch=async url=>{assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'));if(url.endsWith('/token')){globalThis.__testSecrets.PAYPAL_ENVIRONMENT='live';return Response.json({access_token:'test-token'});}return Response.json(order());};
  const proof=await verifyPremiumPayment(f.admin,binding.user_id,binding.order_id);assert.equal(proof.environment,'sandbox');
 }finally{globalThis.fetch=original;}
});

test('captured premium payment recovers entitlement write failure without another charge',async()=>{
 const original=globalThis.fetch,f=fixture();let captures=0,created=false,failEntitlement=true;
 const create=f.admin.entities.UserSubscription.create;
 f.admin.entities.UserSubscription.create=async data=>{if(failEntitlement){failEntitlement=false;throw Error('INJECTED_ENTITLEMENT_WRITE_FAILURE');}return create(data);};
 try{
  globalThis.fetch=async(url,init)=>{
   if(url.endsWith('/token'))return Response.json({access_token:'test-token'});
   if(url.endsWith('/capture')){captures++;created=true;assert.equal(init.headers['PayPal-Request-Id'],'capture-request-fixed');return Response.json({status:'COMPLETED'});}
   return Response.json(order(created?'COMPLETED':'APPROVED'));
  };
  await assert.rejects(capturePremiumOrder(f.admin,binding.user_id,binding.order_id),/INJECTED_ENTITLEMENT_WRITE_FAILURE/);
  assert.equal(captures,1);assert.equal(f.receipt.status,'completed');assert.equal(f.subscriptions.length,0);
  await assert.rejects(verifyPremiumPayment(f.admin,binding.user_id,binding.order_id));
  assert.equal((await capturePremiumOrder(f.admin,binding.user_id,binding.order_id)).premium_activated,true);
  assert.equal(captures,1);assert.equal(f.subscriptions.length,1);
  assert.equal((await verifyPremiumPayment(f.admin,binding.user_id,binding.order_id)).capture_reference,'CAPTURE123');
 }finally{globalThis.fetch=original;}
});
test('capture network ambiguity is resolved by reading the completed order before retrying capture',async()=>{
 const original=globalThis.fetch,f=fixture();let captured=false,captures=0;
 try{
  globalThis.fetch=async(url,init)=>{
   if(url.endsWith('/token'))return Response.json({access_token:'test-token'});
   if(url.endsWith('/capture')){captures++;captured=true;throw Error('INJECTED_RESPONSE_LOST_AFTER_CAPTURE');}
   return Response.json(order(captured?'COMPLETED':'APPROVED'));
  };
  await assert.rejects(capturePremiumOrder(f.admin,binding.user_id,binding.order_id),/INJECTED_RESPONSE_LOST_AFTER_CAPTURE/);
  assert.equal(captures,1);assert.equal(f.subscriptions.length,0);
  assert.equal((await capturePremiumOrder(f.admin,binding.user_id,binding.order_id)).premium_activated,true);
  assert.equal(captures,1);assert.equal(f.subscriptions.length,1);
 }finally{globalThis.fetch=original;}
});
