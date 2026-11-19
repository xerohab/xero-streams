import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/mediaIntelligence/entry.ts';
function setup({user={role:'admin'},video={content_type:'episode',updated_date:'rev1'}}={}){
 const updates=[];globalThis.Deno={env:{get:()=>undefined}};
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{Video:{filter:async()=>video?[video]:[],update:async(...args)=>updates.push(args)}}}};
 return updates;
}
const call=(extra={})=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'approve',id:'v',revision:'rev1',intro_start:10,intro_end:45,...extra})}));
test('intro approval rejects unauthorized and banned users',async()=>{for(const user of [null,{role:'user'},{role:'admin',is_banned:true}]){setup({user});assert.equal((await call()).status,403);}});
test('intro approval rejects ineligible titles and invalid timestamps',async()=>{for(const video of [null,{content_type:'movie'},{content_type:'episode',is_adult:true},{content_type:'episode',coming_soon:true}]){setup({video});assert.equal((await call()).status,404);}const updates=setup();for(const extra of [{intro_start:null},{intro_start:'10'},{intro_end:241},{intro_end:5}])assert.equal((await call(extra)).status,400);assert.equal(updates.length,0);});
test('valid approval updates only intro timestamps',async()=>{const updates=setup();assert.equal((await call()).status,200);assert.deepEqual(updates,[['v',{intro_start:10,intro_end:45}]]);});

test('stale scanner results cannot overwrite current metadata',async()=>{const updates=setup();assert.equal((await call({revision:'old'})).status,409);assert.equal(updates.length,0);});

test('reviewed recap and credits update only their own segment',async()=>{const updates=setup();assert.equal((await call({kind:'recap',recap_start:0,recap_end:30})).status,200);assert.equal((await call({kind:'credits',credits_start:1800,credits_end:1900})).status,200);assert.equal((await call({kind:'unknown'})).status,400);assert.deepEqual(updates,[['v',{recap_start:0,recap_end:30}],['v',{credits_start:1800,credits_end:1900}]]);});

test('grouped approval writes all segments once and rejects invalid batches',async()=>{const updates=setup();const segments=[{kind:'intro',start:10,end:45},{kind:'recap',start:0,end:10},{kind:'credits',start:1800,end:1900}];assert.equal((await call({segments})).status,200);assert.deepEqual(updates,[['v',{intro_start:10,intro_end:45,recap_start:0,recap_end:10,credits_start:1800,credits_end:1900}]]);for(const bad of [[],[segments[0],segments[0]],[segments[0],{kind:'credits',start:20,end:null}]])assert.equal((await call({segments:bad})).status,400);assert.equal((await call({segments,revision:'old'})).status,409);assert.equal(updates.length,1);});
