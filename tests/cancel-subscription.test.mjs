import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/cancelSubscription/entry.ts';
const call=(body,method='POST')=>handler(new Request('https://example.test',{method,...(method==='POST'?{body:JSON.stringify(body)}:{})}));
test('subscription cancellation is authenticated, scoped and idempotent',async()=>{
 const rows=[{id:'s',user_id:'u',status:'active'},{id:'other',user_id:'v',status:'active'}];
 let user={id:'u'},writes=0;
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{entities:{UserSubscription:{
 filter:async q=>rows.filter(r=>r.id===q.id&&r.user_id===q.user_id),
 update:async(id,data)=>{writes++;Object.assign(rows.find(r=>r.id===id),data);}
 }}}};
 assert.equal((await call({},'GET')).status,405);
 assert.equal((await call({subscription_id:''})).status,400);
 assert.equal((await call({subscription_id:'other'})).status,404);
 assert.equal((await call({subscription_id:'s'})).status,200);
 assert.equal((await call({subscription_id:'s'})).status,200);
 assert.equal(writes,1);
 assert.equal(rows[1].status,'active');
 user={id:'u',is_banned:true};
 assert.equal((await call({subscription_id:'s'})).status,401);
 user=null;
 assert.equal((await call({subscription_id:'s'})).status,401);
});
