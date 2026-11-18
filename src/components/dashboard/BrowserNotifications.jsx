import React,{useEffect,useState} from "react";
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
 await reg.showNotification("XeroStreams",{body:n.title,tag:"xero-"+n.id,data:{link:n.link?.startsWith("/watch?id=")?n.link:"/dashboard"},icon:"/icon.svg"});
 seen.add(n.id);
 localStorage.setItem(key(userId)+"_seen",JSON.stringify([...seen].slice(-500)));
 }
 }catch{}finally{busy=false;}
 };
 poll();const timer=setInterval(poll,60000);
 return()=>{active=false;clearInterval(timer);};
 },[userId]);
 return null;
}
export default function BrowserNotifications({userId}){
 const [enabled,setEnabled]=useState(()=>localStorage.getItem(key(userId))==="1"),[status,setStatus]=useState("");
 useEffect(()=>{setEnabled(localStorage.getItem(key(userId))==="1");},[userId]);
 const supported="Notification" in window&&"serviceWorker" in navigator;
 const toggle=async()=>{
 if(enabled){localStorage.removeItem(key(userId));setEnabled(false);return;}
 try{
 if(await Notification.requestPermission()!=="granted"){setStatus("Notification permission was not granted.");return;}
 if(!await navigator.serviceWorker.getRegistration()){setStatus("Notification service is not ready. Reload and try again.");return;}
 localStorage.setItem(key(userId),"1");setEnabled(true);setStatus("");
 }catch{setStatus("Unable to enable notifications.");}
 };
 return <section className="space-y-2"><h2 className="text-xl font-bold">Browser notifications</h2><p className="text-sm text-muted-foreground">Receive release alerts while XeroStreams is open in this browser. Closed-browser push is not yet available.</p>{supported?<button className="border rounded px-4 py-2" onClick={toggle}>{enabled?"Disable":"Enable"} browser notifications</button>:<p>This browser does not support notifications.</p>}{status&&<p role="status">{status}</p>}</section>;
}
