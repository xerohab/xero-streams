import { ensurePushSubscription } from "@/lib/browserPushSubscription";
import {deviceId,heartbeatDevice} from "@/lib/deviceSession";
import React,{useEffect,useState,useRef} from "react";
import {base44} from "@/api/base44Client";
const key=id=>"xero_browser_alerts_"+id;
export function BrowserNotificationMonitor({userId}){
 useEffect(()=>{
 if(!userId||!("Notification" in window)||!("serviceWorker" in navigator))return;
 let active=true,busy=false;
 const poll=async()=>{
 if(!active||busy||localStorage.getItem(key(userId))!=="1"||Notification.permission!=="granted")return;
 busy=true;
 try{
 const rows=await base44.entities.StreamingNotification.filter({user_id:userId,read:false},"-created_date",50);
 const reg=await navigator.serviceWorker.getRegistration();
 if(!active||!reg||!Array.isArray(rows))return;
 const seen=new Set(JSON.parse(localStorage.getItem(key(userId)+"_seen")||"[]"));
 for(const n of [...rows].reverse()){
 if(!active||seen.has(n.id)||localStorage.getItem(key(userId))!=="1")continue;
 await reg.showNotification("XeroStreams",{body:n.title,tag:"xero-"+n.id,data:{link:n.link?.startsWith("/watch?id=")?n.link:"/dashboard"},icon:"/xero-icon.svg"});
 seen.add(n.id);
 localStorage.setItem(key(userId)+"_seen",JSON.stringify([...seen].slice(-500)));
 }
 }catch{}finally{busy=false;}
 };
 poll();const timer=setInterval(poll,60000);window.addEventListener("focus",poll);window.addEventListener("xero-notifications-changed",poll);
 return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",poll);window.removeEventListener("xero-notifications-changed",poll);};
 },[userId]);
 return null;
}
export default function BrowserNotifications({userId}){
 const [enabled,setEnabled]=useState(()=>localStorage.getItem(key(userId))==="1"),[status,setStatus]=useState("");
 useEffect(()=>{setEnabled(localStorage.getItem(key(userId))==="1");},[userId]);
 const supported="Notification" in window&&"serviceWorker" in navigator;
 const generation=useRef(0);
 const [background,setBackground]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;const version=++generation.current;setBackground(false);setStatus("");if(userId&&supported&&"PushManager" in window){(async()=>{try{const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager?.getSubscription();const r=await base44.functions.invoke("browserPush",{action:"status",device_id:deviceId(),endpoint:sub?.endpoint});if(active&&version===generation.current)setBackground(!!sub&&r.data?.registered===true);}catch{}})();}return()=>{active=false;};},[userId,supported]);
 const enableBackground=async()=>{if(busy)return;++generation.current;setBusy(true);try{if(await Notification.requestPermission()!=="granted"){setStatus("Notification permission was not granted.");return;}const config=await base44.functions.invoke("browserPush",{action:"config"});if(!config.data?.enabled){setStatus("Background push is not configured yet.");return;}const reg=await navigator.serviceWorker.getRegistration();if(!reg?.active||!reg.pushManager){setStatus("Notification service is not ready. Reload and try again.");return;}if(await heartbeatDevice())throw Error("Revoked");const key=config.data.public_key.replace(/-/g,"+").replace(/_/g,"/");const bytes=Uint8Array.from(atob(key.padEnd(Math.ceil(key.length/4)*4,"=")),c=>c.charCodeAt(0));const sub=await ensurePushSubscription(reg.pushManager,bytes);const result=await base44.functions.invoke("browserPush",{action:"register",device_id:deviceId(),subscription:sub.toJSON()});if(result.data?.ok!==true)throw Error("Registration failed");setBackground(true);setStatus("Background subscription registered; delivery depends on server configuration.");}catch{setStatus("Background notification registration failed.");}finally{setBusy(false);}};
 const disableBackground=async()=>{if(busy)return;++generation.current;setBusy(true);try{const result=await base44.functions.invoke("browserPush",{action:"remove",device_id:deviceId()});if(result.data?.ok!==true)throw Error("Removal failed");const reg=await navigator.serviceWorker.getRegistration();await (await reg?.pushManager?.getSubscription())?.unsubscribe();setBackground(false);setStatus("Background notifications disabled.");}catch{setStatus("Unable to remove background notifications.");}finally{setBusy(false);}};
 const toggle=async()=>{
 if(enabled){localStorage.removeItem(key(userId));setEnabled(false);return;}
 try{
 if(await Notification.requestPermission()!=="granted"){setStatus("Notification permission was not granted.");return;}
 if(!await navigator.serviceWorker.getRegistration()){setStatus("Notification service is not ready. Reload and try again.");return;}
 localStorage.setItem(key(userId),"1");setEnabled(true);setStatus("");window.dispatchEvent(new Event("xero-notifications-changed"));
 }catch{setStatus("Unable to enable notifications.");}
 };
 return <section className="space-y-2"><h2 className="text-xl font-bold">Browser notifications</h2><p className="text-sm text-muted-foreground">Receive release alerts while XeroStreams is open in this browser. Background alerts require browser support and server configuration.</p>{supported?<button className="border rounded px-4 py-2" onClick={toggle}>{enabled?"Disable":"Enable"} browser notifications</button>:<p>This browser does not support notifications.</p>}{supported&&"PushManager" in window&&<div className="flex gap-2"><button className="border rounded px-4 py-2" disabled={busy} onClick={enableBackground}>{background?"Refresh":"Register"} background notifications</button><button className="border rounded px-4 py-2" disabled={busy} onClick={disableBackground}>Remove background notifications</button></div>}{status&&<p role="status">{status}</p>}</section>;
}
