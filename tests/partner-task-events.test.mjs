import test from 'node:test';
import assert from 'node:assert/strict';
import {emitNativeTaskEvents,emitPremiumTaskEvent,playbackTaskBindings} from '../base44/shared/partnerTaskEvents.ts';
const task='abcdef012345abcdef012345',link='11111111-1111-4111-8111-111111111111';
function fixture(){
 const writes=[],connection={user_id:'member',status:'linked',perksphere_connection_id:link};
 const session={id:'stored',session_id:'session',perksphere_link_uuid:link,task_submissions:[]};
 const admin={entities:{ViewingSession:{update:async(id,value)=>{writes.push(value);Object.assign(session,value);}},PerkSphereConnection:{filter:async()=>[connection]}}};
 return {writes,connection,session,admin,policy:{duration_seconds:60,task_bindings:[{enabled:true,task_reference:task,required_seconds:60,full_content:true}]},videoId:'video',eligibleSeconds:60,fullContent:true,occurredAt:'2026-10-25T12:00:00.000Z'};
}
function enable(){globalThis.__testSecrets={PERKSPHERE_VIDEO_EVENTS_ENABLED:'true',PERKSPHERE_PREMIUM_EVENTS_ENABLED:'true',PERKSPHERE_PARTNER_KEY_ID:'psp_lg9D0rXbH__AJaPdKv4kxd_x',PERKSPHERE_PARTNER_HMAC_SECRET:'synthetic-test-only'};}
test('native task notification retries the same identity after transport failure and never supplies reward amounts',async()=>{
 enable();const f=fixture(),sent=[],old=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,init)=>{sent.push(JSON.parse(init.body));calls++;return Response.json({ok:calls>1},{status:calls>1?200:503});};
 try{
  assert.deepEqual(await emitNativeTaskEvents(f.admin,f),[]);assert.equal(f.writes.length,1);assert.ok(f.writes[0].task_notifications);f.occurredAt='2026-10-25T12:00:30.000Z';
  assert.equal((await emitNativeTaskEvents(f.admin,f)).length,1);
  assert.deepEqual(sent[0],sent[1]);assert.equal(sent[0].points,undefined);assert.equal(sent[0].xp,undefined);
  assert.equal(sent[0].task_reference,task);assert.equal(sent[0].evidence.eligible_seconds,60);
  assert.deepEqual(await emitNativeTaskEvents(f.admin,f),[]);assert.equal(calls,2);
 }finally{globalThis.fetch=old;globalThis.__testSecrets={};}
});
test('paused, transferred, partial and incomplete-full playback never emits',async()=>{
 enable();const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('must not send');};
 try{
  for(const change of ['paused','link','seconds','full']){
   enable();const f=fixture();
   if(change==='paused')globalThis.__testSecrets.PERKSPHERE_VIDEO_EVENTS_ENABLED='false';
   if(change==='link')f.session.perksphere_link_uuid='other';
   if(change==='seconds')f.eligibleSeconds=59;
   if(change==='full')f.fullContent=false;
   assert.deepEqual(await emitNativeTaskEvents(f.admin,f),[]);
  }
  assert.throws(()=>playbackTaskBindings({duration_seconds:60,task_bindings:[{enabled:true,task_reference:task,required_seconds:61,full_content:true}]}));
 }finally{globalThis.fetch=old;globalThis.__testSecrets={};}
});
test('premium notification preserves capture identity, requires original link and never claims a reward was issued',async()=>{
 enable();const f=fixture(),old=globalThis.fetch,sent=[];
 globalThis.fetch=async(url,init)=>{sent.push(JSON.parse(init.body));return Response.json({ok:true});};
 const proof={environment:'live',partner_account_reference:'member',link_reference:link,capture_reference:'capture',plan_reference:'plan',captured_at:'2026-10-25T12:00:00.000Z',order_reference:'order',currency:'GBP',amount_minor:499};
 try{
  assert.deepEqual(await emitPremiumTaskEvent(f.admin,proof),{submitted:true,reward_issued:false});
  assert.equal(sent[0].partner_event_id,'ps_premium_capture');assert.equal(sent[0].evidence.amount_minor,499);
  assert.equal((await emitPremiumTaskEvent(f.admin,{...proof,link_reference:'other'})).submitted,false);assert.equal(sent.length,1);
  assert.equal((await emitPremiumTaskEvent(f.admin,{...proof,environment:'sandbox'})).reason,'live_provider_payment_required');assert.equal(sent.length,1);
 }finally{globalThis.fetch=old;globalThis.__testSecrets={};}
});
