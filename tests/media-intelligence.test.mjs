import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/mediaIntelligence/entry.ts';
function setup({user={role:'admin'},video={content_type:'episode'}}={}){
 const updates=[];globalThis.Deno={env:{get:()=>undefined}};
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{Video:{filter:async()=>video?[video]:[],update:async(...args)=>updates.push(args)}}}};
 return updates;
}
const call=(extra={})=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'approve',id:'v',intro_start:10,intro_end:45,...extra})}));
test('intro approval rejects unauthorized and banned users',async()=>{for(const user of [null,{role:'user'},{role:'admin',is_banned:true}]){setup({user});assert.equal((await call()).status,403);}});
test('intro approval rejects ineligible titles and invalid timestamps',async()=>{for(const video of [null,{content_type:'movie'},{content_type:'episode',is_adult:true},{content_type:'episode',coming_soon:true}]){setup({video});assert.equal((await call()).status,404);}const updates=setup();for(const extra of [{intro_start:null},{intro_start:'10'},{intro_end:241},{intro_end:5}])assert.equal((await call(extra)).status,400);assert.equal(updates.length,0);});
test('valid approval updates only intro timestamps',async()=>{const updates=setup();assert.equal((await call()).status,200);assert.deepEqual(updates,[['v',{intro_start:10,intro_end:45}]]);});
