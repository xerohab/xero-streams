import React,{useState,useEffect} from "react";
import {base44} from "@/api/base44Client";
import {deviceId} from "@/lib/deviceSession";
export default function DevicesSection(){
 const [rows,setRows]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const load=async()=>{try{const r=await base44.functions.invoke("streamingDevices",{action:"list"});if(!Array.isArray(r.data?.devices))throw new Error();setRows(r.data.devices);setError("");}catch{setError("Unable to load devices.");}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 const revoke=async(id)=>{if(!confirm("Sign this browser out of XeroStreams?"))return;try{const r=await base44.functions.invoke("streamingDevices",{action:"revoke",device_id:id});if(!r.data?.ok)throw new Error();await load();}catch{setError("Unable to sign out device.");}};
 return <section className="space-y-3"><h2 className="text-xl font-bold">Devices</h2><p className="text-sm text-muted-foreground">Manage browsers registered to your account. Remote sign-out is checked while the website is open.</p>{error&&<p role="alert">{error}</p>}{loading?<p>Loading devices…</p>:!rows.length?<p>No registered devices.</p>:rows.map(d=><div key={d.device_id} className="border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"><div><strong>{d.label}{d.device_id===deviceId()?" (This browser)":""}</strong><p className="text-sm text-muted-foreground">Last active: {new Date(d.last_seen).toLocaleString()}</p><p className="text-xs">{d.revoked?"Signed-out requested":"Registered"}</p></div>{!d.revoked&&d.device_id!==deviceId()&&<button className="text-primary" onClick={()=>revoke(d.device_id)}>Sign out</button>}</div>)}</section>;
}
