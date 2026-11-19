import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/mediaCheckout/entry.ts';
test('media checkout grants only the bound item after verified capture and supports retries',async()=>{
 const binding={id:'binding',user_id:'u',item_id:'video',kind:'video',format:'default',amount:'4.99',status:'created',request_reference:'request',order_id:'order'};
 const purchases=[];let user={id:'u'},amount='4.99',custom='XEROMEDIA:binding',calls=0;
 globalThis.__testSecrets={PAYPAL_CLIENT_ID:'test',PAYPAL_CLIENT_SECRET:'test',PAYPAL_ENVIRONMENT:'sandbox'};
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{
 MediaPayment:{filter:async()=>[binding],update:async(id,data)=>Object.assign(binding,data)},
 VideoPurchase:{filter:async()=>purchases,create:async data=>purchases.push(data)}
 }}};
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{calls++;return Response.json(url.endsWith('/token')?{access_token:'test'}:{id:'order',status:'COMPLETED',purchase_units:[{custom_id:custom,amount:{currency_code:'GBP',value:'4.99'},payments:{captures:[{id:'capture',status:'COMPLETED',amount:{currency_code:'GBP',value:amount}}]}}]});};
 const call=()=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'capture',orderId:'order'})}));
 try{
 user={id:'other'};assert.equal((await call()).status,409);assert.equal(calls,0);
 user={id:'u'};amount='0.01';assert.equal((await call()).status,409);assert.equal(purchases.length,0);
 amount='4.99';custom='wrong';assert.equal((await call()).status,409);assert.equal(purchases.length,0);
 custom='XEROMEDIA:binding';assert.equal((await call()).status,200);assert.equal((await call()).status,200);
 assert.equal(purchases.length,1);assert.equal(purchases[0].video_id,'video');assert.equal(purchases[0].user_id,'u');
 }finally{globalThis.fetch=original;}
});
