import test from 'node:test';
import assert from 'node:assert/strict';
import {accrueNativePlayback,mergePlaybackRanges} from '../base44/shared/nativePlayback.ts';
import track from '../base44/functions/partnerTrackViewing/entry.ts';
const epoch=Date.parse('2026-10-24T20:00:00.000Z'),hash='a'.repeat(64),policy={duration:60,mediaHash:hash};
function initial(){return {started_at:new Date(epoch).toISOString(),last_update:new Date(epoch).toISOString(),last_position:0,is_paused:false,evidence_version:'native-playback-v1',media_url_sha256:hash,content_duration_seconds:60,credited_ranges:[]};}
function step(session,time,position,paused=false,ended=false){
 const update=accrueNativePlayback(session,{current_time:position,is_paused:paused,is_ended:ended},{...policy,now:epoch+time*1000});
 return {...session,...update,last_update:new Date(epoch+time*1000).toISOString(),last_position:position,is_paused:paused};
}
test('normal native playback covers content once, and full completion survives later reports',()=>{
 let s=step(initial(),30,30);assert.equal(s.accumulated_watch_seconds,30);
 s=step(s,60,59.7,false,true);assert.equal(s.completed_full_content,true);assert.equal(s.accumulated_watch_seconds,60);
 s=step(s,65,59.7,true);assert.equal(s.accumulated_watch_seconds,60);assert.equal(s.completed_full_content,true);
});
test('seeking to end, paused intervals, long gaps and fast playback cannot create full coverage',()=>{
 for(const [time,position,paused] of [[1,60,false],[60,60,false],[30,60,false]]){
  const s=step(initial(),time,position,paused,true);assert.equal(s.accumulated_watch_seconds,0);assert.equal(s.completed_full_content,false);
 }
 let s=step(initial(),15,15,true);assert.equal(s.accumulated_watch_seconds,15);
 s=step(s,30,15,false);assert.equal(s.accumulated_watch_seconds,15);
 s=step(s,45,30);assert.equal(s.accumulated_watch_seconds,30);
});
test('rewatching ranges and overlapping reports cannot multiply elapsed or unique coverage',()=>{
 let s=step(initial(),30,30);s=step(s,31,0);s=step(s,61,30);
 assert.equal(s.accumulated_watch_seconds,30);assert.deepEqual(s.credited_ranges,[[0,30]]);
 assert.deepEqual(mergePlaybackRanges([[0,30],[20,40],[0,30]],60),[[0,40]]);
 const rapid=step(s,61,60,false,true);assert.equal(rapid.accumulated_watch_seconds,30);assert.equal(rapid.completed_full_content,false);
});
test('legacy or changed-media telemetry starts without inherited reward evidence',()=>{
 const old={...initial(),evidence_version:undefined,accumulated_watch_seconds:10000,credited_ranges:[[0,60]]};
 assert.equal(step(old,30,30).accumulated_watch_seconds,0);
 const changed={...initial(),media_url_sha256:'b'.repeat(64),credited_ranges:[[0,60]]};assert.equal(step(changed,30,30).completed_full_content,false);
 assert.throws(()=>mergePlaybackRanges([[0,Infinity]],60));
 assert.throws(()=>accrueNativePlayback(initial(),{current_time:30,is_paused:false,is_ended:false},{...policy,now:epoch-1}));
});
test('authenticated native metering preserves evidence before optional VOD transport and ignores browser duration',async()=>{
 const original=globalThis.fetch,stored=initial(),updates=[];
 globalThis.__testSecrets={}; // Emission remains paused regardless of metering.
 const video={id:'video-1',video_url:'https://media.test/video.mp4'};
 const {createHash}=await import('node:crypto');const actualHash=createHash('sha256').update(video.video_url).digest('hex');
 Object.assign(stored,{user_id:'member',video_id:'video-1',session_id:'session-1',media_url_sha256:actualHash,last_update:new Date(Date.now()-30000).toISOString(),started_at:new Date(Date.now()-60000).toISOString()});
 const entities={Video:{filter:async()=>[video]},ViewingSession:{filter:async()=>[{...stored}],update:async(id,data)=>updates.push(data)},PlaybackRewardContent:{filter:async()=>[{enabled:true,source:'operator_media_probe',verified_at:new Date().toISOString(),duration_seconds:60,media_url_sha256:actualHash}]},PerkSphereConnection:{filter:async()=>[{user_id:'member',status:'linked'}]}};
 globalThis.__testClient={auth:{me:async()=>({id:'member'})},entities,asServiceRole:{entities}};
 try{
  globalThis.fetch=()=>{throw Error('must not submit events while paused');};
  const r=await track(new Request('https://test.invalid',{method:'POST',body:JSON.stringify({video_id:'video-1',session_id:'session-1',current_time:30,duration:99999,is_paused:false,is_ended:false,user_id:'forged'})}));
  assert.equal(r.status,200);const body=await r.json();assert.equal(body.verification_mode,'client_assisted_native');assert.equal(body.reward_issued,false);assert.equal(updates[0].duration,60);assert.equal(updates[0].accumulated_watch_seconds,30);
 }finally{globalThis.fetch=original;}
});
