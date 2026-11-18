import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(!u)return Response.json({error:'Sign in required'},{status:401});
 const b=await req.json().catch(()=>({})),year=Number(b.year);
 if(!Number.isInteger(year)||year<2020||year>new Date().getUTCFullYear())return Response.json({error:'Invalid year'},{status:400});
 const start=new Date(Date.UTC(year,0,1)).toISOString(),end=new Date(Date.UTC(year+1,0,1)).toISOString();
 const db=base.asServiceRole.entities, totals=new Map<string,number>(),completed=new Set<string>();
 let seconds=0,count=0,offset=0;
 while(true){
 const result=await db.ViewingSession.filter({user_id:u.id,started_at:{$gte:start,$lt:end}}, {sort:'id',limit:500,skip:offset});
 const rows=Array.isArray(result)?result:result.items;
 if(!Array.isArray(rows))return Response.json({error:'Session data unavailable'},{status:502});
 for(const s of rows){const n=Math.max(0,Number(s.accumulated_watch_seconds)||0);seconds+=n;count++;totals.set(s.video_id,(totals.get(s.video_id)||0)+n);if(s.completed_full_content)completed.add(s.video_id);}
 offset+=rows.length;if(rows.length<500||offset>=10000)break;
 }
 return Response.json({year,seconds,count,titles:totals.size,completed:completed.size,partial:offset>=10000});
}