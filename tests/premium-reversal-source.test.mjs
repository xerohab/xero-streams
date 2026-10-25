import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {createPremiumReversalSource} from '../base44/shared/premiumReversalSource.ts';
const now=Date.parse('2026-10-25T13:00:00Z'),uuid='630feee8-2649-4c4f-b2a0-c26746a696fd',keyId='test-key',hmacSecret='synthetic-source-secret-only',timestamp=String(now/1000),nonce='ab'.repeat(32);
const input={action:'premium_reversal_lookup',account_reference:'member',transaction_reference:'ORDER',event_type:'purchase_refunded',reference:'REFUND'};
const canonical=(direction,raw)=>['PERKSPHERE-PREMIUM-REVERSAL-SOURCE-V1',direction,uuid,keyId,timestamp,nonce,createHash('sha256').update(raw).digest('hex')].join('\n');
const sign=value=>createHmac('sha256',hmacSecret).update(value).digest('hex');
function request(body=input,signature){const raw=JSON.stringify(body);return new Request('https://test.invalid',{method:'POST',body:raw,headers:{'X-PS-Partner-UUID':uuid,'X-PS-Key-ID':keyId,'X-PS-Timestamp':timestamp,'X-PS-Nonce':nonce,'X-PS-Signature':signature||sign(canonical('REQUEST',raw))}});}
const proof={provider:'paypal',partner_account_reference:'member',order_reference:'ORDER',capture_reference:'CAPTURE',event_type:'purchase_refunded',reversal_reference:'REFUND',currency:'GBP',original_amount_minor:499,amount_minor:100,reversed_amount_minor:200,occurred_at:'2026-10-25T12:00:00.000Z',private_token:'DO NOT RETURN'};
test('reversal source signs independently loaded evidence and returns only minimal payment fields',async()=>{
 const handler=createPremiumReversalSource({partnerUuid:uuid,clock:()=>now,getCredentials:()=>({keyId,hmacSecret}),enabled:()=>true,loadProof:async(account,order,type,reference)=>{assert.deepEqual([account,order,type,reference],['member','ORDER','purchase_refunded','REFUND']);return proof;}});
 const r=await handler(request()),raw=await r.text();assert.equal(r.status,200);assert.equal(r.headers.get('X-PS-Source-Signature'),sign(canonical('RESPONSE',raw)));assert.equal(raw.includes('DO NOT RETURN'),false);assert.equal(JSON.parse(raw).data.reversed_amount_minor,200);
});
test('unsigned, reward-injected and wrong-event requests never reach provider lookup',async()=>{
 let calls=0;const handler=createPremiumReversalSource({partnerUuid:uuid,clock:()=>now,getCredentials:()=>({keyId,hmacSecret}),enabled:()=>true,loadProof:async()=>{calls++;return proof;}});
 for(const req of [request(input,'0'.repeat(64)),request({...input,points:100}),request({...input,event_type:'purchase_completed'})])assert.ok([400,401].includes((await handler(req)).status));
 assert.equal(calls,0);
});
test('paused or failing reversal sources never sign affirmative evidence',async()=>{
 for(const enabled of [false,true]){
  const handler=createPremiumReversalSource({partnerUuid:uuid,clock:()=>now,getCredentials:()=>({keyId,hmacSecret}),enabled:()=>enabled,loadProof:async()=>{throw Error('private provider error');}});
  const r=await handler(request());assert.equal(r.status,503);assert.equal(r.headers.get('X-PS-Source-Signature'),null);assert.equal((await r.text()).includes('private provider error'),false);
 }
});
