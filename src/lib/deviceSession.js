import {base44} from "@/api/base44Client";
export function deviceId(){
 let id=localStorage.getItem("xero_device_id");
 if(!id){id=crypto.randomUUID();localStorage.setItem("xero_device_id",id);}
 return id;
}
export async function heartbeatDevice(){
 const label=(navigator.userAgentData?.platform||navigator.platform||"Browser")+" · "+(navigator.userAgent.includes("Firefox")?"Firefox":navigator.userAgent.includes("Edg/")?"Edge":navigator.userAgent.includes("Chrome")?"Chrome":navigator.userAgent.includes("Safari")?"Safari":"Browser");
 const r=await base44.functions.invoke("streamingDevices",{action:"heartbeat",device_id:deviceId(),label});
 return r.data?.revoked===true;
}
