import React,{useEffect,useState} from "react";
import {base44} from "@/api/base44Client";
import loadMediaRecords from "@/components/browse/loadMediaRecords";
const statuses=["reachable","review","missing","skipped","error","stale","unchecked"];
export default function SyncedStreamHealth(){
 const [rows,setRows]=useState(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[filter,setFilter]=useState("all"),[search,setSearch]=useState(""),[page,setPage]=useState(0);
 const load=async()=>{setBusy(true);setError("");try{
 const records=[];let offset=0;
 for(let i=0;i<1000;i++){const r=await base44.functions.invoke("streamHealth",{action:"list",offset});if(!Array.isArray(r.data?.rows))throw new Error();records.push(...r.data.rows);if(r.data.next===null)break;if(!Number.isInteger(r.data.next)||r.data.next<=offset||i===999)throw new Error();offset=r.data.next;}
 const catalog=await loadMediaRecords(base44.entities.Video);
 const map=new Map();for(const r of records){const old=map.get(r.video_id);if(!old||Date.parse(r.checked_at)>Date.parse(old.checked_at))map.set(r.video_id,r);}
 setRows(catalog.filter(v=>!v.is_adult&&!v.coming_soon&&(v.has_playback||v.video_url?.startsWith("https://"))).map(v=>{const r=map.get(v.id);return {id:v.id,title:v.title,status:!r?"unchecked":r.revision!==(v.updated_date||"")?"stale":r.status,checked_at:r?.checked_at,http_status:r?.http_status};}));setPage(0);
 }catch{setError("Unable to load synchronized health results.");}finally{setBusy(false);}};
 useEffect(()=>{load();},[]);
 const shown=(rows||[]).filter(r=>(filter==="all"||r.status===filter)&&String(r.title||"").toLowerCase().includes(search.toLowerCase()));
 const exportRows=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(shown,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="xero-stream-health.json";a.click();URL.revokeObjectURL(url);};
 return <section className="border rounded-lg p-4 space-y-4"><h3 className="font-bold">Scheduled stream health</h3><p className="text-sm text-muted-foreground">Latest server checks for eligible HTTPS titles. Reachable does not guarantee uninterrupted playback.</p><div className="flex gap-3"><button disabled={busy} onClick={load} className="border rounded px-3 py-2">{busy?"Loading…":"Refresh results"}</button>{rows&&<button onClick={exportRows}>Export filtered results</button>}</div>{error&&<p role="alert">{error}</p>}{rows&&<><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{statuses.map(k=><button key={k} className={"border rounded p-3 text-left "+(filter===k?"border-primary":"")} onClick={()=>{setFilter(filter===k?"all":k);setPage(0);}}><strong className="text-xl block">{rows.filter(r=>r.status===k).length}</strong>{k}</button>)}</div><input className="bg-background border rounded p-2 w-full" placeholder="Search titles" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/><p className="text-sm">{shown.length} matching titles · {filter}</p>{shown.slice(page*50,page*50+50).map(r=><div key={r.id} className="border-b py-2"><a href={"/watch?id="+encodeURIComponent(r.id)} className="font-semibold text-primary">{r.title}</a><p className="text-sm">{r.status}{r.http_status?" · HTTP "+r.http_status:""}{r.checked_at?" · "+new Date(r.checked_at).toLocaleString():""}</p></div>)}<div className="flex gap-4"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1}</span><button disabled={(page+1)*50>=shown.length} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}</section>;
}
