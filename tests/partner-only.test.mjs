import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { signedFetch, EXPECTED_KEY_IDS, isYouTubeContent } from '../base44/shared/perkSphereClient.ts';
import confirm from '../base44/functions/partnerLinkConfirm/entry.ts';
import unlink from '../base44/functions/partnerUnlink/entry.ts';
import submit from '../base44/functions/partnerSubmitEvent/entry.ts';
import registration from '../base44/functions/partnerRegistrationEvent/entry.ts';
const post = body => new Request('https://test.invalid/function',{method:'POST',body:JSON.stringify(body)});
const secrets = { PERKSPHERE_PARTNER_KEY_ID: EXPECTED_KEY_IDS['xero-streams'], PERKSPHERE_PARTNER_HMAC_SECRET: 'test-verbatim-secret' };
globalThis.__testSecrets=secrets;
test('partner signature and nonce match the Linux HMAC contract for exact raw bytes',async()=>{
 const original=globalThis.fetch;
 try { globalThis.fetch=async(url,init)=>{
  assert.equal(url,'https://api.perksphere.org/v1/partners/events');
  const h=init.headers;assert.match(h.get('X-PS-Nonce'),/^[A-Za-z0-9_-]{32}$/);
  const canonical=['POST','/v1/partners/events',h.get('X-PS-Timestamp'),h.get('X-PS-Nonce'),createHash('sha256').update(init.body).digest('hex')].join('\n');
  assert.equal(h.get('X-PS-Signature'),createHmac('sha256',secrets.PERKSPHERE_PARTNER_HMAC_SECRET).update(canonical).digest('hex'));
  return Response.json({ok:true});
 }; for(let i=0;i<50;i++)await signedFetch('/v1/partners/events',{method:'POST',body:'{"unicode":"£"}'});
 }finally{globalThis.fetch=original;}
});
test('signed client rejects arbitrary paths, GET and cross-partner credentials',async()=>{
 for(const path of ['https://evil.test','/v1/partners/../events','/partners/activate','/v1/partners/events?x=1'])await assert.rejects(signedFetch(path,{}));
 await assert.rejects(signedFetch('/v1/partners/events',{method:'GET'}));
 globalThis.__testSecrets={...secrets,PERKSPHERE_PARTNER_KEY_ID:EXPECTED_KEY_IDS['dko-wrestling']};await assert.rejects(signedFetch('/v1/partners/events',{}));globalThis.__testSecrets=secrets;
});
test('YouTube detection checks hostname boundaries',()=>{
 for(const url of ['https://youtu.be/a','https://www.youtube.com/watch?v=a','https://www.youtube-nocookie.com/embed/a'])assert.equal(isYouTubeContent(url),true);
 for(const url of ['https://notyoutube.com/a','https://youtube.com.evil.test/a','https://example.test/?url=youtube.com','broken'])assert.equal(isYouTubeContent(url),false);
});
test('link confirmation requires real Linux UUID; no fabricated local association',async()=>{
 const original=globalThis.fetch;let writes=[];
 const entities={PerkSphereChallenge:{get:async()=>({id:'consent',user_id:'member',status:'pending',expires_at:new Date(Date.now()+10000).toISOString(),code_hash:await createHash('sha256').update('challenge').digest('hex')}),update:async()=>{}},PerkSphereConnection:{filter:async()=>[]}};
 globalThis.__testClient={auth:{me:async()=>({id:'member'})},entities,asServiceRole:{entities:{...entities,PerkSphereConnection:{create:async row=>{writes.push(row);return row;}}}}};
 try{
  globalThis.fetch=async()=>Response.json({ok:true});assert.equal((await confirm(post({code:'challenge',consent_token:'consent'}))).status,502);assert.equal(writes.length,0);
  globalThis.fetch=async()=>Response.json({ok:true,link_uuid:'linux-authoritative-id'});assert.equal((await confirm(post({code:'challenge',consent_token:'consent'}))).status,200);assert.equal(writes[0].perksphere_connection_id,'linux-authoritative-id');
 }finally{globalThis.fetch=original;}
});
test('unlink preserves the verified association; ordinary member cannot sign arbitrary activity',async()=>{
 let writes=0;globalThis.__testClient={auth:{me:async()=>({id:'member',role:'user'})},entities:{PerkSphereConnection:{get:async()=>({id:'link',user_id:'member',status:'linked'}),update:async()=>writes++}}};
 assert.equal((await unlink(post({connection_id:'link'}))).status,409);assert.equal(writes,0);
 assert.equal((await submit(post({event_type:'registration_completed'}))).status,403);
 globalThis.__testClient={auth:{me:async()=>null}};assert.equal((await registration(post({user_id:'victim'}))).status,403);
});
test('partner evidence and link schemas permit service writes only',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const name of ['PerkSphereConnection','PerkSphereChallenge','ViewingSession','IntegrationLog']){
  const schema=JSON.parse(await readFile(new URL('../base44/entities/'+name+'.jsonc',import.meta.url),'utf8'));
  for(const action of ['create','update','delete'])assert.deepEqual(schema.rls[action],{user_condition:{role:'service_only'}});
 }
});
