import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
try{
const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
if(!u||u.is_banned)return Response.json({error:'Unauthorized'},{status:401});
const b=await req.json(),db=base.asServiceRole.entities;
if(b.action==='config'){const key=Deno.env.get('XERO_VAPID_PUBLIC_KEY');const enabled=!!(key&&Deno.env.get('XERO_VAPID_PRIVATE_KEY')&&Deno.env.get('XERO_VAPID_SUBJECT'));return Response.json({enabled,public_key:enabled?key:null});}
if(typeof b.device_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(b.device_id))return Response.json({error:'Invalid device'},{status:400});
const scope={user_id:u.id,device_id:b.device_id};
const rows=await db.BrowserPushSubscription.filter(scope);
if(b.action==='remove'){for(const row of rows)await db.BrowserPushSubscription.delete(row.id);return Response.json({ok:true});}
if(b.action!=='register')return Response.json({error:'Invalid action'},{status:400});
const device=(await db.StreamingDevice.filter(scope))[0];
if(!device||device.revoked)return Response.json({error:'Device unavailable'},{status:403});
if(!Deno.env.get('XERO_VAPID_PUBLIC_KEY')||!Deno.env.get('XERO_VAPID_PRIVATE_KEY')||!Deno.env.get('XERO_VAPID_SUBJECT'))return Response.json({error:'Push not configured'},{status:503});
const s=b.subscription;
if(typeof s?.endpoint!=='string'||s.endpoint.length>2048||!/^[-_A-Za-z0-9]{87}$/.test(s.keys?.p256dh||'')||!/^[-_A-Za-z0-9]{22}$/.test(s.keys?.auth||''))return Response.json({error:'Invalid subscription'},{status:400});
let url:URL;try{url=new URL(s.endpoint);}catch{return Response.json({error:'Invalid endpoint'},{status:400});}
if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname))return Response.json({error:'Unsupported push provider'},{status:400});
const data={endpoint:s.endpoint,p256dh:s.keys.p256dh,auth:s.keys.auth};
for(const other of await db.BrowserPushSubscription.filter({endpoint:s.endpoint})){if(other.user_id!==u.id||other.device_id!==b.device_id)return Response.json({error:'Subscription already registered; remove it from the previous account first'},{status:409});}
if(rows.length){await db.BrowserPushSubscription.update(rows[0].id,data);for(const row of rows.slice(1))await db.BrowserPushSubscription.delete(row.id);}else await db.BrowserPushSubscription.create({...scope,...data});
return Response.json({ok:true});
}catch{return Response.json({error:'Push registration unavailable'},{status:500});}
}
