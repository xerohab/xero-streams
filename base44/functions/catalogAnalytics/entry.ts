import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
try{
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(u?.role!=='admin')return Response.json({error:'Forbidden'},{status:403});
 const body=await req.json().catch(()=>({})),days=[7,30,90].includes(body.days)?body.days:30;
 const cutoff=Date.now()-days*86400000,db=base.asServiceRole.entities;
 const users=new Set<string>(),titles=new Map<string,{id:string,seconds:number,sessions:number,completed:number}>(),daily=new Map<string,number>(),seen=new Set<string>();
 let seconds=0,completed=0,sessions=0,truncated=false,offset=0;
 for(let page=0;page<20;page++){
 const rows=await db.ViewingSession.list('-started_at',500,offset);
 if(!Array.isArray(rows))throw new Error('Unexpected result');
 let stop=false;
 for(const r of rows){
 const t=Date.parse(r.started_at);
 if(!Number.isFinite(t))continue;
 if(t<cutoff){stop=true;continue;}
 if(seen.has(r.id))continue;seen.add(r.id);
 const n=Math.max(0,Number(r.accumulated_watch_seconds)||0);
 sessions++;seconds+=n;if(r.user_id)users.add(r.user_id);
 if(r.completed_full_content)completed++;
 const day=new Date(t).toISOString().slice(0,10);daily.set(day,(daily.get(day)||0)+n);
 if(r.video_id){const v=titles.get(r.video_id)||{id:r.video_id,seconds:0,sessions:0,completed:0};v.seconds+=n;v.sessions++;if(r.completed_full_content)v.completed++;titles.set(r.video_id,v);}
 }
 offset+=rows.length;
 if(stop||rows.length<500)break;
 if(page===19)truncated=true;
 }
 const top=await Promise.all([...titles.values()].sort((a,b)=>b.seconds-a.seconds).slice(0,20).map(async v=>{const record=(await db.Video.filter({id:v.id}))[0];return {...v,title:record?.title||'Unavailable title'};}));
 return Response.json({days,seconds,sessions,completed,viewers:users.size,titles:titles.size,top,daily:[...daily].sort().map(([date,seconds])=>({date,seconds})),truncated});
}catch{return Response.json({error:'Analytics unavailable'},{status:500});}
}