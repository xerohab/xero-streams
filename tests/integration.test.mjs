import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { signedFetch, EXPECTED_KEY_IDS, isYouTubeContent } from '../base44/shared/perkSphereClient.ts';
import confirm from '../base44/functions/partnerLinkConfirm/entry.ts';
import unlink from '../base44/functions/partnerUnlink/entry.ts';
import submit from '../base44/functions/partnerSubmitEvent/entry.ts';
import registration from '../base44/functions/partnerRegistrationEvent/entry.ts';
import capture from '../base44/functions/capturePaypalOrder/entry.ts';
import { donationAmount, verifyCapturedOrder, tokenHash, checkoutOrigin } from '../base44/shared/paypal.ts';
const post = body => new Request('https://test.invalid/function',{method:'POST',body:JSON.stringify(body)});
const secrets = { PERKSPHERE_PARTNER_KEY_ID: EXPECTED_KEY_IDS['xero-streams'], PERKSPHERE_PARTNER_HMAC_SECRET: 'test-verbatim-secret' };
globalThis.__testSecrets=secrets;
test('partner signature and nonce match the Linux HMAC contract for exact raw bytes',async()=>{
 const original=globalThis.fetch;
 try { globalThis.fetch=async(url,init)=>{
  assert.equal(url,'https://api.perksphere.org/v1/partners/events');
  const h=init.headers;assert.match(h.get('X-PS-Nonce'),/^[A-Za-z0-9_-]{32}$/);
  const canonical=['POST','/v1/partners/events',h.get('X-PS-Timestamp'),h.get('X-PS-Nonce'),createHash('sha256').update(init.body).digest('hex')].join('\n');
  assert.equal(h.get('X-PS-Signature'),createHmac('sha256',secrets.PERKSPHERE_PARTNER_HMAC_SECRET).update(canonical).digest('hex'));
  return Response.json({ok:true});
 }; for(let i=0;i<50;i++)await signedFetch('/v1/partners/events',{method:'POST',body:'{"unicode":"£"}'});
 }finally{globalThis.fetch=original;}
});
test('signed client rejects arbitrary paths, GET and cross-partner credentials',async()=>{
 for(const path of ['https://evil.test','/v1/partners/../events','/partners/activate','/v1/partners/events?x=1'])await assert.rejects(signedFetch(path,{}));
 await assert.rejects(signedFetch('/v1/partners/events',{method:'GET'}));
 globalThis.__testSecrets={...secrets,PERKSPHERE_PARTNER_KEY_ID:EXPECTED_KEY_IDS['dko-wrestling']};await assert.rejects(signedFetch('/v1/partners/events',{}));globalThis.__testSecrets=secrets;
});
test('YouTube detection checks hostname boundaries',()=>{
 for(const url of ['https://youtu.be/a','https://www.youtube.com/watch?v=a','https://www.youtube-nocookie.com/embed/a'])assert.equal(isYouTubeContent(url),true);
 for(const url of ['https://notyoutube.com/a','https://youtube.com.evil.test/a','https://example.test/?url=youtube.com','broken'])assert.equal(isYouTubeContent(url),false);
});
test('link confirmation requires real Linux UUID; no fabricated local association',async()=>{
 const original=globalThis.fetch;let writes=[];
 const entities={PerkSphereChallenge:{get:async()=>({id:'consent',user_id:'member',status:'pending',expires_at:new Date(Date.now()+10000).toISOString(),code_hash:await createHash('sha256').update('challenge').digest('hex')}),update:async()=>{}},PerkSphereConnection:{filter:async()=>[]}};
 globalThis.__testClient={auth:{me:async()=>({id:'member'})},entities,asServiceRole:{entities:{...entities,PerkSphereConnection:{create:async row=>{writes.push(row);return row;}}}}};
 try{
  globalThis.fetch=async()=>Response.json({ok:true});assert.equal((await confirm(post({code:'challenge',consent_token:'consent'}))).status,502);assert.equal(writes.length,0);
  globalThis.fetch=async()=>Response.json({ok:true,link_uuid:'linux-authoritative-id'});assert.equal((await confirm(post({code:'challenge',consent_token:'consent'}))).status,200);assert.equal(writes[0].perksphere_connection_id,'linux-authoritative-id');
 }finally{globalThis.fetch=original;}
});
test('unlink preserves the verified association; ordinary member cannot sign arbitrary activity',async()=>{
 let writes=0;globalThis.__testClient={auth:{me:async()=>({id:'member',role:'user'})},entities:{PerkSphereConnection:{get:async()=>({id:'link',user_id:'member',status:'linked'}),update:async()=>writes++}}};
 assert.equal((await unlink(post({connection_id:'link'}))).status,409);assert.equal(writes,0);
 assert.equal((await submit(post({event_type:'registration_completed'}))).status,403);
 globalThis.__testClient={auth:{me:async()=>null}};assert.equal((await registration(post({user_id:'victim'}))).status,403);
});
test('donation money parsing rejects fractions, overflow and unsupported currency',()=>{
 assert.deepEqual(donationAmount('3.20'),{cents:320,value:'3.20',currency:'GBP'});
 for(const value of ['0','0.99','1.001','Infinity','1e3',-3,10001,'3x'])assert.throws(()=>donationAmount(value));
 assert.throws(()=>donationAmount('3','USD'));
 assert.equal(checkoutOrigin(),'https://xerostreams.com');
 globalThis.__testSecrets={...secrets,PAYPAL_ENVIRONMENT:'sandbox',PAYPAL_SITE_ORIGIN:'https://checkout-preview.base44.app'};
 assert.equal(checkoutOrigin(),'https://checkout-preview.base44.app');
 globalThis.__testSecrets={...secrets,PAYPAL_SITE_ORIGIN:'https://evil.test'};assert.throws(()=>checkoutOrigin());
 globalThis.__testSecrets=secrets;
});
test('captured payment requires receipt identity, matching amount and completed capture',()=>{
 const receipt={order_id:'ORDER12345678',receipt_reference:'receipt',currency:'GBP',amount_value:'3.00'};
 const order={id:receipt.order_id,status:'COMPLETED',purchase_units:[{custom_id:'receipt',payments:{captures:[{id:'CAPTURE',status:'COMPLETED',amount:{currency_code:'GBP',value:'3.00'}}]}}]};
 assert.equal(verifyCapturedOrder(order,receipt),'CAPTURE');
 for(const edit of [o=>o.id='OTHER',o=>o.status='APPROVED',o=>o.purchase_units[0].custom_id='other',o=>o.purchase_units[0].payments.captures[0].amount.value='0.01',o=>o.purchase_units[0].payments.captures[0].status='PENDING']){const invalid=structuredClone(order);edit(invalid);assert.throws(()=>verifyCapturedOrder(invalid,receipt));}
});
test('capture validates capability and order ID before calling PayPal',async()=>{
 const original=globalThis.fetch;let calls=0;
 try {globalThis.fetch=async()=>{calls++;throw new Error('Unexpected network')};globalThis.__testClient={asServiceRole:{entities:{PaymentOrder:{get:async()=>({order_id:'ORDER12345678',capture_token_hash:await tokenHash('a'.repeat(72))})}}}};
 assert.equal((await capture(post({orderId:'../other',receiptId:'receipt',captureToken:'a'.repeat(72)}))).status,400);
 assert.equal((await capture(post({orderId:'ORDER12345678',receiptId:'receipt',captureToken:'b'.repeat(72)}))).status,404);assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});

test('product checkout uses server price and purchasing identity, and rejects unconfigured recurring billing',async()=>{
 const { checkoutProduct, fulfilPurchase } = await import('../base44/shared/paypal.ts');
 let rows=[],writes=[];
 const base44={auth:{me:async()=>({id:'buyer'})},asServiceRole:{entities:{Book:{get:async()=>({id:'book',is_active:true,price:12.50,price_ebook:4.25})},SubscriptionPlan:{get:async()=>({id:'plan',is_active:true,price:3,interval:'monthly'})},BookPurchase:{filter:async()=>rows,create:async row=>{writes.push(row);rows.push(row);}}}}};
 const checkout=await checkoutProduct(base44,{product_type:'book',product_id:'book',format:'ebook',amount:0.01,user_id:'victim'});
 assert.equal(checkout.value,'4.25');assert.equal(checkout.user_id,'buyer');
 await assert.rejects(checkoutProduct(base44,{product_type:'subscription',product_id:'plan'}),/Recurring/);
 await assert.rejects(checkoutProduct({...base44,auth:{me:async()=>null}},{product_type:'book',product_id:'book'}),/Sign in/);
 const receipt={product_type:'book',product_id:'book',user_id:'buyer',format:'ebook'};
 await fulfilPurchase(base44,receipt,'ORDER');await fulfilPurchase(base44,receipt,'ORDER');assert.equal(writes.length,1);assert.equal(writes[0].book_id,'book');assert.equal(writes[0].user_id,'buyer');
});
test('authoritative integration and payment entities cannot be written by members',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const name of ['PerkSphereConnection','PerkSphereChallenge','ViewingSession','PaymentOrder']){
  const schema=JSON.parse(await readFile(new URL('../base44/entities/'+name+'.jsonc',import.meta.url),'utf8'));
  for(const action of ['create','update','delete'])assert.deepEqual(schema.rls[action],{user_condition:{role:'service_only'}});
 }
 for(const name of ['BookPurchase','VideoPurchase','UserSubscription']){
  const schema=JSON.parse(await readFile(new URL('../base44/entities/'+name+'.jsonc',import.meta.url),'utf8'));
  for(const action of ['create','update','delete'])assert.deepEqual(schema.rls[action],{user_condition:{role:'admin'}});
 }
});
