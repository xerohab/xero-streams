import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readNativePlaybackProof} from '../base44/shared/nativePlaybackProof.ts';
const now=Date.parse('2026-10-24T20:10:00.000Z'),link='11111111-1111-4111-8111-111111111111',url='https://media.test/video.mp4',hash=createHash('sha256').update(url).digest('hex');
function fixture(){
 const session={id:'stored',user_id:'member',video_id:'video',session_id:'session',evidence_version:'native-playback-v1',media_url_sha256:hash,content_duration_seconds:60,perksphere_link_uuid:link,status:'ended',started_at:new Date(now-60000).toISOString(),last_update:new Date(now).toISOString(),credited_ranges:[[0,59.7]],accumulated_watch_seconds:60,completed_full_content:true};
 const catalog={enabled:true,source:'operator_media_probe',duration_seconds:60,media_url_sha256:hash,verified_at:new Date(now-60000).toISOString()};
 const connection={user_id:'member',status:'linked',perksphere_connection_id:link};let duplicates=false;
 const admin={entities:{Video:{get:async()=>({id:'video',video_url:url})},PlaybackRewardContent:{filter:async()=>[catalog]},ViewingSession:{filter:async()=>duplicates?[session,{...session}]:[session]},PerkSphereConnection:{filter:async()=>[connection]}}};
 return {admin,session,catalog,connection,setDuplicates:()=>duplicates=true};
}
const args={account:'member',content:'video',sessionReference:'session',now};
test('native source recomputes coverage and time from protected records and returns no raw media or ranges',async()=>{
 const f=fixture(),proof=await readNativePlaybackProof(f.admin,args);assert.equal(proof.eligible_seconds,60);assert.equal(proof.full_content,true);assert.equal(proof.link_reference,link);assert.equal(proof.verification_mode,'client_assisted_native');assert.equal(proof.credited_ranges,undefined);assert.equal(JSON.stringify(proof).includes(url),false);
});
test('native source refuses transferred links, duplicate sessions, stale/legacy or forged coverage',async()=>{
 for(const change of ['link','duplicates','version','ranges','counter','media','clock']){
  const f=fixture();
  if(change==='link')f.connection.perksphere_connection_id='22222222-2222-4222-8222-222222222222';
  if(change==='duplicates')f.setDuplicates();
  if(change==='version')f.session.evidence_version='legacy';
  if(change==='ranges')f.session.credited_ranges=[[50,60]];
  if(change==='counter')f.session.accumulated_watch_seconds=600;
  if(change==='media')f.catalog.media_url_sha256='a'.repeat(64);
  if(change==='clock')f.session.started_at=new Date(now+1000).toISOString();
  await assert.rejects(readNativePlaybackProof(f.admin,args),undefined,change);
 }
});
test('seeking to the end never establishes a full-video source proof',async()=>{
 const f=fixture();Object.assign(f.session,{credited_ranges:[],accumulated_watch_seconds:0,completed_full_content:false});
 const proof=await readNativePlaybackProof(f.admin,args);assert.equal(proof.eligible_seconds,0);assert.equal(proof.full_content,false);
});
