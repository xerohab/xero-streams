const DOMAIN='PERKSPHERE-NATIVE-PLAYBACK-SOURCE-V1';
const enc=new TextEncoder(),hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export function createNativePlaybackSource({partnerUuid,getCredentials,enabled,loadProof,clock=Date.now}){
 return async req=>{
  const fail=status=>Response.json({ok:false,error:'native_playback_source_unavailable'},{status,headers:{'Cache-Control':'no-store'}});
  try{
   if(req.method!=='POST')return fail(405);
   if(!enabled())return fail(503);
   const credentials=getCredentials();if(!credentials||credentials.hmacSecret.length<16)return fail(503);
   const {keyId,hmacSecret}=credentials,timestamp=req.headers.get('X-PS-Timestamp'),nonce=req.headers.get('X-PS-Nonce'),signature=req.headers.get('X-PS-Signature');
   if(req.headers.get('X-PS-Partner-UUID')!==partnerUuid||req.headers.get('X-PS-Key-ID')!==keyId||!/^\d{10}$/.test(timestamp||'')||Math.abs(clock()/1000-Number(timestamp))>300||! /^[a-f0-9]{64}$/.test(nonce||'')||! /^[a-f0-9]{64}$/.test(signature||''))return fail(401);
   if(Number(req.headers.get('content-length'))>4096)return fail(413);
   const reader=req.body?.getReader();if(!reader)return fail(400);
   const chunks=[];let length=0;
   try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>4096)return fail(413);chunks.push(part.value);}}finally{await reader.cancel().catch(()=>{});}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   const key=await crypto.subtle.importKey('raw',enc.encode(hmacSecret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
   const canonical=async(direction,body)=>[DOMAIN,direction,partnerUuid,keyId,timestamp,nonce,hex(await crypto.subtle.digest('SHA-256',enc.encode(body)))].join('\n');
   if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),enc.encode(await canonical('REQUEST',raw))))return fail(401);
   const body=JSON.parse(raw);
   if(!body||Object.keys(body).sort().join(',')!=='account_reference,action,content_reference,transaction_reference'||body.action!=='native_playback_lookup'||! /^[A-Za-z0-9_-]{1,100}$/.test(body.account_reference||'')||! /^[A-Za-z0-9_-]{1,100}$/.test(body.transaction_reference||''))return fail(400);
   if(!/^[a-f0-9]{24}$/.test(body.content_reference||''))return fail(400);
   const proof=await loadProof(body.account_reference,body.transaction_reference,req,body.content_reference);
   if(proof?.partner_account_reference!==body.account_reference||proof.session_reference!==body.transaction_reference||proof.content_reference!==body.content_reference||proof.provider!=='xero_native_player')return fail(409);
   const response=JSON.stringify({ok:true,data:{partner_uuid:partnerUuid,account_reference:body.account_reference,content_reference:body.content_reference,session_reference:body.transaction_reference,provider:'xero_native_player',verification_mode:'client_assisted_native',link_reference:proof.link_reference,eligible_seconds:proof.eligible_seconds,full_content:proof.full_content,content_duration_seconds:proof.content_duration_seconds,media_url_sha256:proof.media_url_sha256,started_at:proof.started_at,last_update:proof.last_update,verified_at:new Date(clock()).toISOString()}});
   const signed=hex(await crypto.subtle.sign('HMAC',key,enc.encode(await canonical('RESPONSE',response))));
   return new Response(response,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-PS-Source-Signature':signed}});
  }catch{return fail(503);}
 };
}