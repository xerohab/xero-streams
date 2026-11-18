import React,{useState} from "react";
import {base44} from "@/api/base44Client";
import loadMediaRecords from "@/components/browse/loadMediaRecords";
function validLink(value){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}}
function issues(v){
 const a=[];
 if(!v.coming_soon&&!v.video_url)a.push("Missing playback link");
 else if(v.video_url&&!validLink(v.video_url))a.push("Invalid or insecure playback URL");
 if(!v.thumbnail_url)a.push("Missing poster");
 if(!v.description?.trim())a.push("Missing description");
 if(!v.age_rating?.trim())a.push("Missing age rating");
 if(!v.release_year&&!v.release_date)a.push("Missing release date");
 if(!v.genres?.length&&!v.category_id)a.push("Missing genre");
 if(v.content_type==="episode"&&(!v.series_id||!Number.isInteger(v.episode_number)||!Number.isInteger(v.season_number)))a.push("Incomplete episode details");
 return a;
}
export default function CatalogHealth(){
 const [rows,setRows]=useState([]),[count,setCount]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[filter,setFilter]=useState("all"),[page,setPage]=useState(0);
 const scan=async()=>{setBusy(true);setError("");try{const me=await base44.auth.me();if(me.role!=="admin")throw new Error();const videos=await loadMediaRecords(base44.entities.Video);setRows(videos.map(v=>({id:v.id,title:v.title,issues:issues(v)})).filter(v=>v.issues.length));setCount(videos.length);setPage(0);}catch{setError("Catalog audit failed.");}finally{setBusy(false);}};
 const shown=rows.filter(r=>filter==="all"||r.issues.includes(filter));
 const exportReport=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({scanned:count,issues:shown},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="xero-catalog-audit.json";a.click();URL.revokeObjectURL(url);};
 return <section className="space-y-4"><h2 className="text-xl font-bold">Catalog health</h2><p className="text-sm text-muted-foreground">Audit metadata and playback URL formats across the catalog. This does not contact stream hosts or verify actual playback.</p><div className="flex gap-3 flex-wrap"><button disabled={busy} className="border rounded px-4 py-2" onClick={scan}>{busy?"Scanning…":"Run full catalog audit"}</button>{count!==null&&<button onClick={exportReport} className="border rounded px-4 py-2">Export report</button>}</div>{error&&<p role="alert">{error}</p>}{count!==null&&<><div className="grid grid-cols-3 gap-3">{[["Scanned",count],["Needs review",rows.length],["No flagged issues",count-rows.length]].map(([label,n])=><div key={label} className="border rounded p-3"><strong className="text-2xl text-primary">{n}</strong><p>{label}</p></div>)}</div><select className="bg-background border rounded p-2" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">All issues</option>{[...new Set(rows.flatMap(r=>r.issues))].sort().map(i=><option key={i}>{i}</option>)}</select>{shown.slice(page*50,page*50+50).map(r=><div key={r.id} className="border-b py-2"><strong>{r.title}</strong><p className="text-sm text-muted-foreground">{r.issues.join(" · ")}</p><a className="text-primary text-xs" href={"/watch?id="+encodeURIComponent(r.id)}>View title</a></div>)}<div className="flex gap-3"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous</button><span>{shown.length} titles · Page {page+1}</span><button disabled={(page+1)*50>=shown.length} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}</section>;
}
