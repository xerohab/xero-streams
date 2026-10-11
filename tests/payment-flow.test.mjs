import test from 'node:test';
import assert from 'node:assert/strict';
import create from '../base44/functions/createPaypalOrder/entry.ts';
import capture from '../base44/functions/capturePaypalOrder/entry.ts';
import { tokenHash } from '../base44/shared/paypal.ts';
const post = body => new Request('https://test.invalid/function', {method:'POST', body:JSON.stringify(body)});
const orderId = 'ORDER12345678';
const token = 'a'.repeat(72);

async function fixture(run) {
 const originalFetch = globalThis.fetch;
 const originalClient = globalThis.__testClient;
 const originalSecrets = globalThis.__testSecrets;
 const state = {calls:[], purchases:[], writes:[], user:'buyer', failFulfil:false};
 state.receipt = {id:'receipt', receipt_reference:'reference', order_id:orderId, capture_token_hash:await tokenHash(token), amount_value:'4.25', currency:'GBP', product_type:'book', product_id:'book', user_id:'buyer', format:'ebook', status:'created', expires_at:new Date(Date.now()+60000).toISOString()};
 state.order = {id:orderId,status:'APPROVED',purchase_units:[{custom_id:'reference',amount:{currency_code:'GBP',value:'4.25'}}]};
 const entities = {
  PaymentOrder:{get:async()=>({...state.receipt}),create:async row=>{state.receipt={id:'receipt',...row};return state.receipt;},update:async(id,row)=>{state.writes.push(row);Object.assign(state.receipt,row);}},
  Book:{get:async()=>({id:'book',is_active:true,price:12.50,price_ebook:4.25})},
  BookPurchase:{filter:async()=>state.purchases,create:async row=>{if(state.failFulfil)throw new Error('Storage unavailable');state.purchases.push(row);return row;}}
 };
 globalThis.__testSecrets={PAYPAL_CLIENT_ID:'fake-id',PAYPAL_CLIENT_SECRET:'fake-secret',PAYPAL_ENVIRONMENT:'sandbox',PAYPAL_SITE_ORIGIN:'https://checkout-preview.base44.app'};
 globalThis.__testClient={auth:{me:async()=>state.user?{id:state.user}:null},asServiceRole:{entities}};
 globalThis.fetch=async(url,init)=>{
  assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'), 'Never contact live PayPal');
  state.calls.push({url,method:init.method,body:init.body,headers:init.headers});
  if(url.endsWith('/v1/oauth2/token'))return Response.json({access_token:'fake-token'});
  if(url.endsWith('/capture')){
   state.order.status='COMPLETED';
   state.order.purchase_units[0].payments={captures:[{id:'CAPTURE123',status:'COMPLETED',amount:{currency_code:'GBP',value:'4.25'}}]};
  }else if(url.endsWith('/v2/checkout/orders')&&init.method==='POST'){
   const body=JSON.parse(init.body);
   state.order={id:orderId,status:'CREATED',purchase_units:body.purchase_units,links:[{rel:'approve',href:'https://www.sandbox.paypal.com/checkoutnow?token='+orderId}]};
  }
  return Response.json(state.order);
 };
 try{await run(state);}finally{globalThis.fetch=originalFetch;globalThis.__testClient=originalClient;globalThis.__testSecrets=originalSecrets;}
}
const request = () => post({orderId,receiptId:'receipt',captureToken:token});
test('checkout persists server price and buyer before returning a capture capability',async()=>fixture(async state=>{
 const response=await create(post({product_type:'book',product_id:'book',format:'ebook',amount:'0.01',user_id:'victim'}));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.orderId,orderId);assert.equal(data.captureToken.length,72);
 assert.equal(state.receipt.capture_token_hash,await tokenHash(data.captureToken));
 assert.equal(state.receipt.user_id,'buyer');assert.equal(state.receipt.amount_value,'4.25');
 assert.equal(state.purchases.length,0);
 const call=state.calls.find(call=>call.url.endsWith('/v2/checkout/orders'));
 assert.equal(JSON.parse(call.body).application_context.return_url,'https://checkout-preview.base44.app/callback?success=true');
}));
test('approved payment grants one purchase and repeat confirmation never charges again',async()=>fixture(async state=>{
 assert.equal((await capture(request())).status,200);
 assert.equal((await capture(request())).status,200);
 assert.equal(state.calls.filter(call=>call.url.endsWith('/capture')).length,1);
 assert.equal(state.purchases.length,1);assert.equal(state.purchases[0].user_id,'buyer');assert.equal(state.receipt.capture_id,'CAPTURE123');
}));
test('confirmed payment with failed fulfilment can recover without a second charge',async()=>fixture(async state=>{
 state.failFulfil=true;assert.equal((await capture(request())).status,502);
 assert.equal(state.receipt.status,'completed');assert.equal(state.purchases.length,0);
 state.failFulfil=false;assert.equal((await capture(request())).status,200);
 assert.equal(state.calls.filter(call=>call.url.endsWith('/capture')).length,1);assert.equal(state.purchases.length,1);
}));
test('wrong purchaser and locally reversed receipts fail before provider access',async()=>fixture(async state=>{
 state.user='other';assert.equal((await capture(request())).status,403);assert.equal(state.calls.length,0);
 state.user='buyer';state.receipt.status='reversed';assert.equal((await capture(request())).status,409);assert.equal(state.calls.length,0);assert.equal(state.purchases.length,0);
}));
test('expired or mismatched approved payment cannot be charged or grant access',async()=>fixture(async state=>{
 state.receipt.expires_at='2000-01-01T00:00:00Z';assert.equal((await capture(request())).status,410);
 state.receipt.expires_at=new Date(Date.now()+60000).toISOString();state.order.purchase_units[0].amount.value='0.01';
 assert.equal((await capture(request())).status,409);
 assert.equal(state.calls.filter(call=>call.url.endsWith('/capture')).length,0);assert.equal(state.purchases.length,0);
}));
