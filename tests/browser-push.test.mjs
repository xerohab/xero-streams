import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/browserPush/entry.ts';
const device_id='12345678-1234-1234-1234-123456789abc';
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
function setup({user={id:'u1'},revoked=false,configured=true,initial=[]}={}){
 const rows=structuredClone(initial);
 globalThis.Deno={env:{get:key=>configured?'test-'+key:undefined}};
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{
 StreamingDevice:{filter:async()=>[{revoked}]},
 BrowserPushSubscription:{filter:async q=>rows.filter(r=>Object.entries(q).every(([k,v])=>r[k]===v)),create:async r=>rows.push({...r,id:'new'}),update:async(id,r)=>Object.assign(rows.find(x=>x.id===id),r),delete:async id=>rows.splice(rows.findIndex(x=>x.id===id),1)}
 }}};
 return rows;
}
const call=body=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}));
const register=overrides=>call({action:'register',device_id,subscription,...overrides});
test('anonymous and banned users rejected',async()=>{for(const user of [null,{id:'u1',is_banned:true}]){setup({user});assert.equal((await register()).status,401);}});
test('configuration never returns private keys',async()=>{setup();const b=await (await call({action:'config'})).json();assert.deepEqual(b,{enabled:true,public_key:'test-XERO_VAPID_PUBLIC_KEY'});});
test('unconfigured registration is disabled',async()=>{setup({configured:false});assert.equal((await register()).status,503);});
test('revoked device cannot register',async()=>{setup({revoked:true});assert.equal((await register()).status,403);});
test('invalid endpoints and keys rejected without persistence',async()=>{const rows=setup();for(const endpoint of ['bad','http://fcm.googleapis.com/a','https://localhost/a','https://fcm.googleapis.com.evil.test/a'])assert.equal((await register({subscription:{...subscription,endpoint}})).status,400);assert.equal((await register({subscription:{...subscription,keys:{}}})).status,400);assert.equal(rows.length,0);});
test('registration upserts and removal stays scoped',async()=>{const rows=setup();assert.equal((await register()).status,200);assert.equal((await register()).status,200);assert.equal(rows.length,1);await call({action:'remove',device_id});assert.equal(rows.length,0);});
test('cross-account endpoint conflicts preserve original owner',async()=>{const rows=setup({initial:[{id:'other',user_id:'u2',device_id,endpoint:subscription.endpoint}]});assert.equal((await register()).status,409);assert.equal(rows.length,1);assert.equal(rows[0].user_id,'u2');});
