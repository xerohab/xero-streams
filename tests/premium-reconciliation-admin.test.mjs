import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/reconcilePremiumReward/entry.ts';
const request=body=>new Request('https://test.invalid',{method:'POST',body:JSON.stringify(body)});
test('reconciliation requires a real administrator and a separately enabled notification gate',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=()=>{throw Error('must not access provider');};
 try{
  globalThis.__testSecrets={PERKSPHERE_REVERSAL_EVENTS_ENABLED:'true'};
  globalThis.__testClient={auth:{me:async()=>null}};assert.equal((await handler(request({}))).status,401);
  globalThis.__testClient.auth.me=async()=>({id:'member',role:'user'});assert.equal((await handler(request({}))).status,403);
  globalThis.__testClient.auth.me=async()=>({id:'admin',role:'admin'});globalThis.__testSecrets={};assert.equal((await handler(request({}))).status,503);
  globalThis.__testSecrets={PERKSPHERE_REVERSAL_EVENTS_ENABLED:'true'};
  for(const body of [{event_type:'purchase_completed',orderId:'ORDER',reference:'REFUND'},{event_type:'purchase_refunded',orderId:'ORDER',reference:'REFUND',user_id:'other'},{event_type:'purchase_refunded',orderId:'../ORDER',reference:'REFUND'}])assert.equal((await handler(request(body))).status,400);
 }finally{globalThis.fetch=previous;globalThis.__testSecrets={};}
});
test('reconciliation derives owner from the private receipt and submits no browser reward amounts',async()=>{
 const previous=globalThis.fetch,sent=[];
 const binding={id:'receipt',user_id:'owner',plan_id:'plan',order_id:'ORDER',capture_id:'CAPTURE',captured_at:'2026-10-24T12:00:00Z',expected_amount:'4.99',currency:'GBP',status:'completed',request_reference:'request'};
 globalThis.__testSecrets={PERKSPHERE_REVERSAL_EVENTS_ENABLED:'true',PAYPAL_ENVIRONMENT:'live',PAYPAL_CLIENT_ID:'test-client',PAYPAL_CLIENT_SECRET:'synthetic-paypal-secret',PERKSPHERE_PARTNER_KEY_ID:'psp_lg9D0rXbH__AJaPdKv4kxd_x',PERKSPHERE_PARTNER_HMAC_SECRET:'synthetic-partner-secret-only'};
 globalThis.__testClient={auth:{me:async()=>({id:'admin',role:'admin'})},asServiceRole:{entities:{PremiumPayment:{filter:async()=>[binding]},IntegrationLog:{create:async()=>{}}}}};
 globalThis.fetch=async(url,init)=>{
  if(url.endsWith('/token'))return Response.json({access_token:'test-token'});
  if(url==='https://api.perksphere.org/v1/partners/events'){sent.push(JSON.parse(init.body));return Response.json({ok:true});}
  assert.equal(init.method,'GET');
  if(url.endsWith('/v2/checkout/orders/ORDER'))return Response.json({id:'ORDER',status:'COMPLETED',purchase_units:[{custom_id:'PSPREMIUM:receipt',amount:{currency_code:'GBP',value:'4.99'},payments:{captures:[{id:'CAPTURE',amount:{currency_code:'GBP',value:'4.99'},create_time:binding.captured_at}]}}]});
  if(url.endsWith('/v2/payments/captures/CAPTURE'))return Response.json({id:'CAPTURE',status:'REFUNDED',amount:{currency_code:'GBP',value:'4.99'}});
  if(url.endsWith('/v2/payments/refunds/REFUND'))return Response.json({id:'REFUND',status:'COMPLETED',amount:{currency_code:'GBP',value:'4.99'},update_time:'2026-10-24T13:00:00Z',links:[{rel:'up',method:'GET',href:'https://api-m.paypal.com/v2/payments/captures/CAPTURE'}]});
  throw Error('unexpected network request');
 };
 try{
  const r=await handler(request({event_type:'purchase_refunded',orderId:'ORDER',reference:'REFUND'})),body=await r.json();assert.equal(r.status,200);assert.equal(body.event_submitted,true);assert.equal(body.reward_reversal_applied,false);assert.equal(body.payment_refund_initiated,false);
  assert.equal(sent.length,1);assert.equal(sent[0].partner_account_reference,'owner');assert.equal(sent[0].evidence.amount_minor,499);assert.equal(sent[0].points,undefined);assert.equal(sent[0].xp,undefined);
 }finally{globalThis.fetch=previous;globalThis.__testSecrets={};}
});
