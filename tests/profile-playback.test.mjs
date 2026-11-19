import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/profilePlayback/entry.ts';
function setup({user={id:'u'},kids=true,owns=true}={}){
 const rows=[{id:'r',video_id:'adult',state:'progress',position:10,duration:100}];
 const videos=[{id:'adult',age_rating:'18',title:'Adult'},{id:'safe',age_rating:'PG',title:'Safe',video_url:'https://media.example.test/safe'}];
 globalThis.__testClient={auth:{me:async()=>user},entities:{Video:{filter:async q=>videos.filter(v=>v.id===q.id),list:async (_sort,limit,offset)=>videos.slice(offset,offset+limit)}},asServiceRole:{entities:{
 ViewingProfile:{filter:async()=>owns?[{is_kids:kids}]:[]},
 ProfilePlayback:{filter:async q=>rows.filter(r=>!q.video_id||r.video_id===q.video_id),update:async(id,data)=>Object.assign(rows.find(r=>r.id===id),data),create:async data=>rows.push(data)}
 }}};
 return rows;
}
const call=b=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({profile_id:'p',...b})}));
test('reject unauthorized and banned playback requests',async()=>{for(const user of [null,{id:'u',is_banned:true}]){setup({user});assert.equal((await call({action:'list'})).status,401);}setup({owns:false});assert.equal((await call({action:'list'})).status,403);});
test('Kids playback list and saves exclude adult titles',async()=>{setup();assert.deepEqual((await (await call({action:'list'})).json()).rows,[]);assert.equal((await call({action:'save',video_id:'adult',state:'progress',position:10,duration:100})).status,404);});
test('invalid numeric progress is rejected',async()=>{setup();for(const position of ['10',-1,101])assert.equal((await call({action:'save',video_id:'safe',state:'progress',position,duration:100})).status,400);});
test('scoped removal can clear unavailable titles without creating rows',async()=>{const rows=setup();assert.equal((await call({action:'save',video_id:'adult',state:'removed'})).status,200);assert.equal(rows[0].state,'removed');assert.equal((await call({action:'save',video_id:'missing',state:'removed'})).status,200);assert.equal(rows.length,1);});

test('reject empty identifiers and zero duration progress',async()=>{const rows=setup();for(const b of [{video_id:'',state:'removed'},{video_id:' ',state:'removed'},{video_id:'safe',state:'progress',position:0,duration:0}])assert.equal((await call({action:'save',...b})).status,400);assert.equal(rows.length,1);});

test('Kids Watch source uses the authoritative rating and profile ownership',async()=>{
 setup();
 assert.equal((await call({action:'source',video_id:'adult',age_rating:'PG'})).status,404);
 assert.deepEqual(await (await call({action:'source',video_id:'safe'})).json(),{source:'https://media.example.test/safe'});
 setup({owns:false});
 assert.equal((await call({action:'source',video_id:'safe'})).status,403);
});

test('Kids catalogue omits age-restricted records and enforces a Kids profile',async()=>{
 setup();
 const result=await call({action:'catalogue',kind:'videos',offset:0});
 assert.equal(result.status,200);
 const data=await result.json();
 assert.deepEqual(data.rows.map(row=>row.id),['safe']);
 assert.equal(data.next,null);
 assert.equal((await call({action:'catalogue',kind:'videos',offset:-1})).status,400);
 setup({kids:false});
 assert.equal((await call({action:'catalogue',kind:'videos',offset:0})).status,403);
});
