import React,{useEffect,useState,useId} from "react";
import {base44} from "@/api/base44Client";
const mountedPanels=new Map();
export default function WatchPartyControls({videoId,videoRef}){
 const instance=useId();
 const [primary,setPrimary]=useState(false);
 useEffect(()=>{
   let group=mountedPanels.get(videoId);
   if(!group){group=new Map();mountedPanels.set(videoId,group);}
   group.set(instance,setPrimary);
   const refresh=()=>{let first=true;for(const notify of group.values()){notify(first);first=false;}};
   refresh();
   return()=>{group.delete(instance);refresh();if(!group.size)mountedPanels.delete(videoId);};
 },[videoId,instance]);
 const [token,setToken]=useState(()=>new URLSearchParams(window.location.search).get("party")||"");
 const [start,setStart]=useState("");
 const [host,setHost]=useState(false),[error,setError]=useState("");
 const call=async(action,extra={})=>{const r=await base44.functions.invoke("watchParty",{action,video_id:videoId,token,...extra});if(r.data?.error)throw Error(r.data.error);return r.data;};
 useEffect(()=>{if(!primary||!token)return;let live=true,busy=false;const tick=async()=>{if(busy)return;busy=true;try{const state=await call("state");if(!live)return;setHost(state.host);if(state.scheduled){if(!state.host)videoRef.current?.pause();setError("Scheduled for "+new Date(state.start_at).toLocaleString());return;}setError(old=>old.startsWith("Scheduled for ")?"":old);const player=videoRef.current;if(!player||!Number.isFinite(player.duration))return;if(state.host){await call("sync",{position:player.currentTime,paused:player.paused});}else{const target=Math.min(player.duration,Math.max(0,state.position+(state.paused?0:Math.max(0,(Date.now()-Date.parse(state.synced_at))/1000))));if(Math.abs(player.currentTime-target)>2)player.currentTime=target;if(state.paused)player.pause();else if(player.paused)await player.play().catch(()=>setError("Press play to join playback"));} }catch(e){if(live)setError(e.message||"Party unavailable");}finally{busy=false;}};tick();const timer=setInterval(tick,2000);return()=>{live=false;clearInterval(timer);};},[token,videoId,primary]);
 const [messages,setMessages]=useState([]),[draft,setDraft]=useState("");
 useEffect(()=>{setMessages([]);setDraft("");if(!primary||!token)return;let live=true;let busy=false;const load=()=>{if(busy)return;busy=true;call("messages").then(r=>{if(live)setMessages(r.messages||[]);}).catch(()=>{}).finally(()=>{busy=false;});};load();const t=setInterval(load,4000);return()=>{live=false;clearInterval(t);};},[token,videoId,primary]);
 const create=async()=>{try{const r=await call("create",start?{start_at:new Date(start).toISOString()}:{});setToken(r.token);setHost(true);setError("");}catch(e){setError(e.message);}};
 const invite=()=>{const url=new URL(window.location.href);url.searchParams.set("party",token);navigator.clipboard.writeText(url.href).then(()=>setError("Invite link copied")).catch(()=>setError("Could not copy invitation"));};
 if(!primary)return null;
 return <details className="my-3 rounded-lg border border-border/60 bg-card p-3" data-watch-party-panel open={!!token}><summary className="cursor-pointer font-semibold text-sm">Watch Party</summary><div className="flex flex-wrap items-center gap-3 pt-3 text-sm">{!token?<><button className="xero-action px-3 py-2" onClick={()=>{setStart("");call("create").then(r=>{setToken(r.token);setHost(true);setError("");}).catch(e=>setError(e.message));}}>Start Watch Party</button><label>Schedule <input aria-label="Watch party start time" type="datetime-local" className="bg-secondary p-2" value={start} onChange={e=>setStart(e.target.value)}/></label><button disabled={!start} className="xero-action p-2" onClick={create}>Schedule Party</button></>:<><span>{host?"Hosting Watch Party":"Joined Watch Party"}</span><button className="text-primary" onClick={invite}>Copy invite</button><button className="text-primary" onClick={async()=>{try{if(host)await call("close");}catch(e){setError(e.message);return;}setToken("");setMessages([]);setDraft("");setError("");const url=new URL(window.location.href);url.searchParams.delete("party");window.history.replaceState(null,"",url);}}> {host?"End party":"Leave party"}</button></>}{token&&<details className="basis-full"><summary>Party Chat</summary><div className="max-h-48 overflow-auto">{messages.map(m=><p key={m.id}><strong>{m.sender}: </strong>{m.message}</p>)}</div><form className="flex gap-2" onSubmit={async e=>{e.preventDefault();try{await call("chat",{message:draft});setDraft("");const r=await call("messages");setMessages(r.messages||[]);}catch(e){setError(e.message);}}}><input maxLength={500} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Message the party" className="bg-secondary rounded p-2 flex-1"/><button disabled={!draft.trim()} className="xero-action">Send</button></form></details>}{error&&<span role="status">{error}</span>}</div></details>;
}