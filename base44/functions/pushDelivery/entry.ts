import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import webpush from 'npm:web-push@3.6.7';
export default async function(req:Request){
try{
const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
if(u?.role!=='admin'||u.is_banned)return Response.json({error:'Forbidden'},{status:403});
const publicKey=Deno.env.get('XERO_VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('XERO_VAPID_PRIVATE_KEY'),subject=Deno.env.get('XERO_VAPID_SUBJECT');
if(!publicKey||!privateKey||!subject)return Response.json({error:'Push not configured'},{status:503});
const db=base.asServiceRole.entities,b=await req.json();
if(typeof b.notification_id!=='string')return Response.json({error:'Invalid notification'},{status:400});
const n=(await db.StreamingNotification.filter({id:b.notification_id}))[0];
if(!n||n.read||!n.event_key?.startsWith('release:'))return Response.json({error:'Unavailable notification'},{status:404});
const owner=(await db.User.filter({id:n.user_id}))[0];
if(!owner||owner.is_banned)return Response.json({error:'Unavailable account'},{status:403});
const rows=await db.BrowserPushSubscription.filter({user_id:n.user_id},'-created_date',100);
let sent=0,failed=0,skipped=0;
for(const s of rows){
const device=(await db.StreamingDevice.filter({user_id:n.user_id,device_id:s.device_id}))[0];
if(!device||device.revoked){skipped++;continue;}
const receipt={notification_id:n.id,subscription_id:s.id};
if((await db.BrowserPushReceipt.filter(receipt))[0]){skipped++;continue;}
try{
const url=new URL(s.endpoint);
if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname)){skipped++;continue;}
await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({type:'release',id:n.id,title:'A release is available',link:'/dashboard'}),{vapidDetails:{subject,publicKey,privateKey},TTL:3600,timeout:10000});
await db.BrowserPushReceipt.create({...receipt,sent_at:Date.now()});sent++;
}catch(e){if(e.statusCode===404||e.statusCode===410){try{await db.BrowserPushSubscription.delete(s.id);}catch{}}failed++;}
}
return Response.json({sent,failed,skipped});
}catch{return Response.json({error:'Push delivery unavailable'},{status:500});}
}
