import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const base=createClientFromRequest(req), db=base.asServiceRole.entities;
 const body=await req.json().catch(()=>({}));
 const user=await base.auth.me().catch(()=>null);
 if(body.action==='read'){
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const rows=await db.StreamingNotification.filter({id:body.id,user_id:user.id});
  if(!rows.length)return Response.json({error:'Not found'},{status:404});
  await db.StreamingNotification.update(rows[0].id,{read:true});return Response.json({ok:true});
 }
 if(body.action!=='deliver'||user?.role!=='admin')return Response.json({error:'Forbidden'},{status:403});
 try{
 const [follows,reminders]=await Promise.all([db.SeriesFollow.list('-created_date',5000),db.ReleaseReminder.list('-created_date',5000)]);
 let sent=0,failed=0;
 const deliver=async(row:any,v:any,email:boolean)=>{
  if(!v||v.coming_soon||!v.video_url||v.is_adult)return;
  const key='release:'+v.id;
  let n=(await db.StreamingNotification.filter({user_id:row.user_id,event_key:key}))[0];
  if(!n)n=await db.StreamingNotification.create({user_id:row.user_id,event_key:key,title:'Available now: '+v.title,message:'Your requested release is ready to watch.',link:'/watch?id='+encodeURIComponent(v.id),read:false,email_sent:false});
  if(email&&!n.email_sent){
   const u=(await db.User.filter({id:row.user_id}))[0];
   if(u?.email){await base.asServiceRole.integrations.Core.SendEmail({to:u.email,subject:n.title,body:n.message+' https://xerostreams.com'+n.link,from_name:'Xero Streams'});await db.StreamingNotification.update(n.id,{email_sent:true});sent++;}
  }
 };
 for(const r of reminders)try{await deliver(r,(await db.Video.filter({id:r.video_id}))[0],true);}catch{failed++;}
 for(const f of follows)try{const videos=await db.Video.filter({series_id:f.series_id},'-updated_date',100);for(const v of videos)if(Date.parse(v.created_date)>=Date.parse(f.created_date)||Date.parse(v.content_updated_at)>=Date.parse(f.created_date))await deliver(f,v,f.email_enabled!==false);}catch{failed++;}
 return Response.json({sent,failed});
 }catch{return Response.json({error:'Delivery failed'},{status:500});}
}