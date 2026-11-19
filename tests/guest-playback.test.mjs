import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/guestPlayback/entry.ts';
test('guest playback only resolves public free available titles',async()=>{
 let user=null;const video={id:'v'},source={video_url:'https://example.test/media'};
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{Video:{filter:async()=>[video]},ProtectedMediaSource:{filter:async()=>[source]},Series:{filter:async()=>[{is_adult:true}]}}}};
 const call=()=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({video_id:'v'})}));
 assert.equal((await (await call()).json()).source,source.video_url);
 for(const flag of ['is_adult','is_for_sale','coming_soon']){video[flag]=true;assert.equal((await call()).status,404);delete video[flag];}
 video.series_id='parent';assert.equal((await call()).status,404);delete video.series_id;
 user={id:'u'};assert.equal((await call()).status,403);
});
