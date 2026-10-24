const DOMAIN='PERKSPHERE-PREMIUM-PURCHASE-SOURCE-V1';
const enc=new TextEncoder(),hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export function createPremiumPurchaseSource({partnerUuid,getCredentials,enabled,loadProof,clock=Date.now}){
 return async req=>{
  const fail=status=>Response.json({ok:false,error:'premium_purchase_source_unavailable'},{status,headers:{'Cache-Control':'no-store'}});
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
   if(!body||Object.keys(body).sort().join(',')!=='account_reference,action,transaction_reference'||body.action!=='premium_purchase_lookup'||! /^[A-Za-z0-9_-]{1,100}$/.test(body.account_reference||'')||! /^[A-Za-z0-9_-]{1,100}$/.test(body.transaction_reference||''))return fail(400);
   const proof=await loadProof(body.account_reference,body.transaction_reference,req);
   if(proof?.partner_account_reference!==body.account_reference||proof.order_reference!==body.transaction_reference||proof.provider!=='paypal')return fail(409);
   const response=JSON.stringify({ok:true,data:{partner_uuid:partnerUuid,account_reference:body.account_reference,transaction_reference:body.transaction_reference,purchase_type:'premium',provider:'paypal',capture_reference:proof.capture_reference,plan_reference:proof.plan_reference,currency:proof.currency,amount_minor:proof.amount_minor,captured_at:proof.captured_at,verified_at:new Date(clock()).toISOString()}});
   const signed=hex(await crypto.subtle.sign('HMAC',key,enc.encode(await canonical('RESPONSE',response))));
   return new Response(response,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-PS-Source-Signature':signed}});
  }catch{return fail(503);}
 };
}
