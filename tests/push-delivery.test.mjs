import test from 'node:test';
import assert from 'node:assert/strict';
import deliver from '../base44/functions/pushDelivery/entry.ts';
function setup({role='admin',configured=true,revoked=false,banned=false,receipt=false,endpoint='https://fcm.googleapis.com/test',failure=0,adminBanned=false,cleanupFails=false}={}){
 const sent=[],deleted=[],receipts=receipt?[{notification_id:'n',subscription_id:'s'}]:[];
 globalThis.Deno={env:{get:()=>configured?'test':undefined}};
 globalThis.__testPush=async(...args)=>{sent.push(args);if(failure)throw Object.assign(Error('mock failure'),{statusCode:failure});};
 globalThis.__testClient={auth:{me:async()=>({role,is_banned:adminBanned})},asServiceRole:{entities:{
 StreamingNotification:{filter:async()=>[{id:'n',user_id:'u',event_key:'release:v',title:'Release',link:'/watch?id=v'}]},
 User:{filter:async()=>[{is_banned:banned}]},
 StreamingDevice:{filter:async()=>[{revoked}]},
 BrowserPushSubscription:{filter:async()=>[{id:'s',device_id:'d',endpoint,p256dh:'key',auth:'auth'}],delete:async id=>{if(cleanupFails)throw Error('cleanup');deleted.push(id);}},
 BrowserPushReceipt:{filter:async()=>receipts,create:async row=>receipts.push(row)}
 }}};
 return {sent,deleted,receipts};
}
const call=()=>deliver(new Request('https://example.test',{method:'POST',body:JSON.stringify({notification_id:'n'})}));
test('delivery requires admin and complete configuration',async()=>{let s=setup({role:'user'});assert.equal((await call()).status,403);assert.equal(s.sent.length,0);s=setup({configured:false});assert.equal((await call()).status,503);assert.equal(s.sent.length,0);});
test('revoked devices and existing receipts are skipped',async()=>{for(const options of [{revoked:true},{receipt:true},{endpoint:'https://localhost/test'}]){const s=setup(options);assert.equal((await (await call()).json()).skipped,1);assert.equal(s.sent.length,0);}});
test('banned owners do not receive notifications',async()=>{const s=setup({banned:true});assert.equal((await call()).status,403);assert.equal(s.sent.length,0);});
test('successful send creates receipt and subsequent retry skips',async()=>{const s=setup();assert.equal((await (await call()).json()).sent,1);assert.equal(s.receipts.length,1);assert.equal(JSON.parse(s.sent[0][1]).type,'release');assert.equal((await (await call()).json()).skipped,1);assert.equal(s.sent.length,1);});
test('expired subscriptions removed but transient errors retained',async()=>{for(const failure of [404,410,503]){const s=setup({failure});assert.equal((await (await call()).json()).failed,1);assert.equal(s.receipts.length,0);assert.equal(s.deleted.length,failure===503?0:1);}});

test('push payload contains no release title or watch link',async()=>{const s=setup();await call();assert.deepEqual(JSON.parse(s.sent[0][1]),{type:'release',id:'n',title:'A release is available',link:'/dashboard'});});
test('banned admin cannot deliver and failed cleanup remains isolated',async()=>{let s=setup({adminBanned:true});assert.equal((await call()).status,403);assert.equal(s.sent.length,0);s=setup({failure:410,cleanupFails:true});assert.equal((await (await call()).json()).failed,1);});
