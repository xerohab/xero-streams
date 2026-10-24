import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {createPremiumPurchaseSource} from '../base44/shared/premiumPurchaseSource.ts';
const now=Date.parse('2026-10-24T20:00:00.000Z'),uuid='630feee8-2649-4c4f-b2a0-c26746a696fd',keyId='key-test',secret='test-source-secret-verbatim',timestamp=String(now/1000),nonce='ab'.repeat(32);
const canonical=(direction,raw,n=nonce)=>['PERKSPHERE-PREMIUM-PURCHASE-SOURCE-V1',direction,uuid,keyId,timestamp,n,createHash('sha256').update(raw).digest('hex')].join('\n');
const sign=value=>createHmac('sha256',secret).update(value).digest('hex');
const input={action:'premium_purchase_lookup',account_reference:'member-owner',transaction_reference:'ORDER123'};
const request=(body=input,change={})=>{const raw=JSON.stringify(body);return new Request('https://test.invalid',{method:'POST',body:raw,headers:{'X-PS-Partner-UUID':uuid,'X-PS-Key-ID':keyId,'X-PS-Timestamp':timestamp,'X-PS-Nonce':nonce,'X-PS-Signature':sign(canonical('REQUEST',raw)),...change}});};
test('signed premium evidence binds independently loaded owner/payment and returns no private data',async()=>{
 let lookups=0;
 const handler=createPremiumPurchaseSource({partnerUuid:uuid,getCredentials:()=>({keyId,hmacSecret:secret}),enabled:()=>true,clock:()=>now,loadProof:async(account,transaction)=>{lookups++;assert.equal(account,'member-owner');assert.equal(transaction,'ORDER123');return {provider:'paypal',partner_account_reference:account,order_reference:transaction,capture_reference:'CAPTURE123',plan_reference:'plan-1',currency:'GBP',amount_minor:499,captured_at:'2026-10-24T19:59:00.000Z',private_token:'MUST NOT RETURN'};}});
 const response=await handler(request());assert.equal(response.status,200);const raw=await response.text();
 assert.equal(response.headers.get('X-PS-Source-Signature'),sign(canonical('RESPONSE',raw)));assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(raw.includes('MUST NOT RETURN'),false);assert.equal(lookups,1);
 const data=JSON.parse(raw).data;assert.equal(data.provider,'paypal');assert.equal(data.purchase_type,'premium');assert.equal(data.account_reference,'member-owner');
});
test('premium source is paused by default and unauthenticated, altered or oversized inputs never reach provider',async()=>{
 let calls=0;
 const handler=createPremiumPurchaseSource({partnerUuid:uuid,getCredentials:()=>({keyId,hmacSecret:secret}),enabled:()=>true,clock:()=>now,loadProof:async()=>{calls++;throw Error('must not load');}});
 for(const req of [request(input,{'X-PS-Signature':'0'.repeat(64)}),request(input,{'X-PS-Nonce':'cd'.repeat(32)}),request(input,{'X-PS-Partner-UUID':'other'}),request({...input,points:100}),request(input,{'content-length':'5000'})]){
  const response=await handler(req);assert.ok([400,401,413].includes(response.status));
 }
 const paused=createPremiumPurchaseSource({partnerUuid:uuid,enabled:()=>false,getCredentials:()=>{throw Error('must not load secrets');},loadProof:async()=>calls++});
 assert.equal((await paused(request())).status,503);assert.equal(calls,0);
});
test('a provider lookup failure never produces signed affirmative evidence',async()=>{
 const handler=createPremiumPurchaseSource({partnerUuid:uuid,getCredentials:()=>({keyId,hmacSecret:secret}),enabled:()=>true,clock:()=>now,loadProof:async()=>{throw Error('private-provider-error');}});
 const r=await handler(request());assert.equal(r.status,503);assert.equal(r.headers.get('X-PS-Source-Signature'),null);assert.equal((await r.text()).includes('private-provider-error'),false);
});
