import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/profilePin/entry.ts';
function setup({kids=false,user={id:'u'},owns=true}={}){
 const profiles=[{id:'p',is_kids:false},...(kids?[{id:'k',is_kids:true}]:[])],rows=[],emails=[];
 globalThis.__testClient={auth:{me:async()=>user},asServiceRole:{integrations:{Core:{SendEmail:async message=>emails.push(message)}},entities:{
 ViewingProfile:{filter:async q=>owns?profiles.filter(p=>!q.id||p.id===q.id):[]},
 ProfilePin:{filter:async()=>rows,create:async data=>rows.push({...data,id:'r'}),update:async(id,data)=>Object.assign(rows[0],data),delete:async()=>rows.pop()}
 }}};
 return {rows,profiles,emails};
}
const call=b=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({profile_id:'p',...b})}));
test('PIN operations require eligible account and owned profile',async()=>{for(const user of [null,{id:'u',is_banned:true}]){setup({user});assert.equal((await call({action:'status'})).status,401);}setup({owns:false});assert.equal((await call({action:'status'})).status,403);});
test('missing adult PIN in Kids account requires recovery',async()=>{const {rows}=setup({kids:true});assert.deepEqual(await (await call({action:'status'})).json(),{enabled:false,requires_setup:true});for(const action of ['set','verify','remove'])assert.equal((await call({action,new_pin:'1234'})).status,403);assert.equal(rows.length,0);});
test('PIN is salted, verified, and protected against removal in Kids accounts',async()=>{const {rows,profiles}=setup();assert.equal((await call({action:'set',new_pin:'1234'})).status,200);assert.match(rows[0].digest,/^[a-f0-9]{64}$/);assert.match(rows[0].salt,/^[a-f0-9]{64}$/);assert.equal((await call({action:'verify',pin:'1234'})).status,200);profiles.push({id:'k',is_kids:true});assert.equal((await call({action:'remove',pin:'1234'})).status,403);});
test('five incorrect attempts lock PIN and invalid replacement does not increment failures',async()=>{const {rows}=setup();await call({action:'set',new_pin:'1234'});assert.equal((await call({action:'set',new_pin:'bad'})).status,400);assert.equal(rows[0].failures,0);for(let i=0;i<5;i++)assert.equal((await call({action:'verify',pin:'0000'})).status,403);assert.ok(rows[0].locked_until>Date.now());assert.equal((await call({action:'verify',pin:'1234'})).status,429);});

test('email recovery sets a missing adult PIN and consumes the code',async()=>{
 const {rows,emails}=setup({kids:true,user:{id:'u',email:'owner@example.test',email_verified:true}});
 assert.equal((await call({action:'request_recovery',new_pin:'7654',email:'someone-else@example.test'})).status,200);
 assert.equal(emails[0].to,'owner@example.test');
 const [code]=emails[0].body.match(/[a-f0-9]{32}/);
 assert.notEqual(rows[0].recovery_digest,code);
 assert.deepEqual(await (await call({action:'status'})).json(),{enabled:false,requires_setup:true});
 assert.equal((await call({action:'request_recovery',new_pin:'7654'})).status,429);
 assert.equal((await call({action:'recover',code:'0'.repeat(32),new_pin:'7654'})).status,403);
 assert.equal((await call({action:'recover',code,new_pin:'0000'})).status,200);
 assert.equal((await call({action:'recover',code,new_pin:'1234'})).status,403);
 assert.equal((await call({action:'verify',pin:'7654'})).status,200);
});

test('recovery rejects expired codes and explicitly unverified email',async()=>{
 const {rows,emails}=setup({user:{id:'u',email:'owner@example.test'}});
 await call({action:'request_recovery',new_pin:'7654'});
 const [code]=emails[0].body.match(/[a-f0-9]{32}/);
 rows[0].recovery_expires_at=Date.now()-1;
 assert.equal((await call({action:'recover',code,new_pin:'7654'})).status,403);
 setup({user:{id:'u',email:'owner@example.test',email_verified:false}});
 assert.equal((await call({action:'request_recovery',new_pin:'7654'})).status,403);
});
