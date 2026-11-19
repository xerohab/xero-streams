import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/streamingDevices/entry.ts';
const device_id='12345678-1234-1234-1234-123456789abc';
function setup({user={id:'u'},fail=false}={}){
 const rows=[{id:'other',user_id:'v',device_id,revoked:false}],subs=[{id:'s',user_id:'u',device_id},{id:'t',user_id:'v',device_id}];
 const filter=(arr,q)=>arr.filter(r=>Object.entries(q).every(([k,v])=>r[k]===v));
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{
 StreamingDevice:{filter:async q=>filter(rows,q),create:async d=>rows.push({...d,id:'new'}),update:async(id,d)=>Object.assign(rows.find(r=>r.id===id),d)},
 BrowserPushSubscription:{filter:async q=>filter(subs,q),delete:async id=>{if(fail)throw Error('offline');subs.splice(subs.findIndex(r=>r.id===id),1);}}
 }}};
 return {rows,subs};
}
const call=(action,extra={})=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({action,device_id,...extra})}));
test('device access requires eligible user',async()=>{for(const user of [null,{id:'u',is_banned:true}]){setup({user});assert.equal((await call('list')).status,401);}});
test('heartbeat registers scoped device, revoke removes only own subscription',async()=>{const {rows,subs}=setup();assert.equal((await call('revoke')).status,404);assert.equal((await (await call('heartbeat')).json()).revoked,false);assert.equal((await (await call('list')).json()).devices.length,1);assert.equal((await (await call('revoke')).json()).ok,true);assert.equal((await (await call('heartbeat')).json()).revoked,true);assert.equal(rows[0].revoked,false);assert.equal(subs[0].id,'t');});
test('cleanup failure does not undo revocation',async()=>{setup({fail:true});await call('heartbeat');assert.deepEqual(await (await call('revoke')).json(),{ok:true,cleanup_pending:true});assert.equal((await (await call('heartbeat')).json()).revoked,true);});
