import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/stageMediaSources/entry.ts';
test('staging preserves public records, supports dry runs and reports conflicts',async()=>{
 let user={id:'admin',role:'admin'},writes=0;
 const video={id:'v',video_url:'https://example.test/video',download_url:'',subtitles:[]};
 const sources=[];
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{
 Video:{list:async()=>[video],update:async(id,data)=>{assert.equal(id,video.id);Object.assign(video,data);}},
 ProtectedMediaSource:{filter:async q=>sources.filter(r=>r.video_id===q.video_id),create:async data=>{writes++;sources.push(data);}}
 }}};
 const call=(dry_run,offset=0)=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({dry_run,offset})}));
 user={id:'other',role:'user'};assert.equal((await call(false)).status,403);
 user={id:'admin',role:'admin'};assert.equal((await call(false,-1)).status,400);
 assert.equal((await (await call(true)).json()).counts.missing,1);assert.equal(writes,0);
 const staged=(await (await call(false)).json()).counts;assert.equal(staged.staged,1);assert.equal(staged.verified,1);assert.equal(writes,1);
 assert.equal((await (await call(false)).json()).counts.unchanged,1);assert.equal(writes,1);
 assert.equal(video.has_playback,true);
 assert.equal(video.video_url,'https://example.test/video');
 sources[0].video_url='different';assert.equal((await (await call(false)).json()).counts.conflicts,1);assert.equal(writes,1);
 sources.push({...sources[0]});assert.equal((await (await call(false)).json()).counts.conflicts,1);assert.equal(writes,1);
});
