import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {submitPartnerEvent} from '../base44/shared/perkSphereClient.ts';
import {emitNativeTaskEvents} from '../base44/shared/partnerTaskEvents.ts';
const task='abcdef012345abcdef012345',link='11111111-1111-4111-8111-111111111111';
function enable(){globalThis.__testSecrets={PERKSPHERE_VIDEO_EVENTS_ENABLED:'true',PERKSPHERE_PARTNER_KEY_ID:'test-key',PERKSPHERE_PARTNER_HMAC_SECRET:'synthetic-test-only'};}
const connection={user_id:'member',perksphere_connection_id:link};
const event={event_type:'video_watch_progress',partner_event_id:'event-1',occurred_at:'2026-10-25T12:00:00.000Z',task_reference:task,evidence:{content_id:'video',playback_session_id:'session',eligible_seconds:300}};
test('transport replay succeeds only with a matching accepted payload receipt',async()=>{
 enable();const old=globalThis.fetch;
 try{
  for(const mode of ['exact','hash','accepted','code']){
   globalThis.fetch=async(_url,options)=>Response.json({ok:false,error:{code:mode==='code'?'other':'duplicate_partner_event'},data:{accepted:mode!=='accepted',event_id:'existing',status:'pending_verification',payload_hash:mode==='hash'?'0'.repeat(64):createHash('sha256').update(options.body).digest('hex'),rewards_issued:false}},{status:409});
   const r=await submitPartnerEvent(connection,event);assert.equal(r.ok,mode==='exact');assert.equal(r.duplicate,mode==='exact');
  }
 }finally{globalThis.fetch=old;globalThis.__testSecrets={};}
});
test('lost accepted response retries persisted notification time and completes local submission',async()=>{
 enable();const old=globalThis.fetch,session={id:'stored',session_id:'session',perksphere_link_uuid:link},sent=[];let calls=0;
 const admin={entities:{ViewingSession:{update:async(_id,patch)=>Object.assign(session,patch)}}};
 const args={connection,session,policy:{duration_seconds:600,task_bindings:[{task_reference:task,required_seconds:300,full_content:false}]},videoId:'video',eligibleSeconds:300,fullContent:false,occurredAt:'2026-10-25T12:00:00.000Z'};
 globalThis.fetch=async(_url,options)=>{sent.push(options.body);if(++calls===1)throw Error('lost after server commit');return Response.json({ok:false,error:{code:'duplicate_partner_event'},data:{accepted:true,event_id:'existing',status:'pending_verification',payload_hash:createHash('sha256').update(options.body).digest('hex'),rewards_issued:false}},{status:409});};
 try{
  assert.deepEqual(await emitNativeTaskEvents(admin,args),[]);assert.equal(session.task_notifications.length,1);
  assert.equal((await emitNativeTaskEvents(admin,{...args,occurredAt:'2026-10-25T12:00:30.000Z'})).length,1);
  assert.equal(sent[0],sent[1]);assert.deepEqual(session.task_submissions,[task]);
  assert.deepEqual(await emitNativeTaskEvents(admin,args),[]);assert.equal(calls,2);
 }finally{globalThis.fetch=old;globalThis.__testSecrets={};}
});
test('notification persistence failure prevents a network claim',async()=>{
 enable();const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('must not send');};
 const session={id:'stored',session_id:'session',perksphere_link_uuid:link};
 try{
  const events=await emitNativeTaskEvents({entities:{ViewingSession:{update:async()=>{throw Error('storage unavailable');}}}},{connection,session,policy:{duration_seconds:300,task_bindings:[{task_reference:task,required_seconds:300,full_content:false}]},videoId:'video',eligibleSeconds:300,fullContent:false,occurredAt:'2026-10-25T12:00:00.000Z'});
  assert.deepEqual(events,[]);assert.equal(session.task_notifications,undefined);
 }finally{globalThis.fetch=old;globalThis.__testSecrets={};}
});
