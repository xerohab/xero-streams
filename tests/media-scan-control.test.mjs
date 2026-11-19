import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/mediaIntelligence/entry.ts';
let control;
function setup(role,worker=false){
 control=null;
 globalThis.Deno={env:{get:()=> 'test-token'}};
 globalThis.__testClient={auth:{me:async()=>role?{role}:null},asServiceRole:{entities:{MediaScanControl:{filter:async()=>control?[control]:[],create:async p=>(control={id:'c',...p}),update:async(id,p)=>(control={...control,...p})}}}};
 return async(action,p={})=>handler(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...(worker?{'x-scanner-token':'test-token'}:{})},body:JSON.stringify({action,...p})}));
}
test('ordinary user cannot access scanner',async()=>{let call=setup('user');assert.equal((await call('status')).status,403);});
test('admin creates scan request and pause',async()=>{let call=setup('admin');let r=await call('control',{mode:'full'});assert.equal(r.status,200);assert.ok(control.request_id);assert.equal(control.mode,'full');await call('control',{paused:true});assert.equal(control.paused,true);});
test('worker cannot issue admin commands',async()=>{let call=setup(null,true);assert.equal((await call('control',{mode:'full'})).status,403);});
test('worker heartbeat accepts valid counts, rejects invalid counts',async()=>{let call=setup(null,true);assert.equal((await call('heartbeat',{state:'scanning',total:10,processed:4})).status,200);assert.equal(control.processed,4);assert.equal((await call('heartbeat',{state:'scanning',total:10,processed:11})).status,400);});
test('admin cannot forge worker heartbeat',async()=>{let call=setup('admin');assert.equal((await call('heartbeat',{state:'complete',total:10,processed:10})).status,403);});
