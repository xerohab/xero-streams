import {verifyProfileAccess} from '../../shared/profileAccess.ts';
import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
const catalogueFields=[
 'id','title','description','thumbnail_url','cover_image','backdrop_url','series_id','franchise_id',
 'category','category_id','genres','episode_number','season_number','duration','quality','quality_notes',
 'is_featured','is_adult','content_type','sort_order','coming_soon','release_date','release_year',
 'cast','main_cast','guest_stars','director_or_creator','age_rating','runtime_or_episodes','views',
 'created_date','updated_date','content_updated_at','is_for_sale','price','intro_start','intro_end','recap_start','recap_end',
 'credits_start','credits_end'
];
export default async function(req:Request){
try{
if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
if(!u?.id||u.is_banned)return Response.json({error:'Unauthorized'},{status:401});
const b=await req.json(),db=base.asServiceRole.entities;
if(!b||typeof b!=='object'||Array.isArray(b))return Response.json({error:'Invalid operation'},{status:400});
const profiles=typeof b?.profile_id==='string'&&b.profile_id.trim()&&b.profile_id.length<=256?await db.ViewingProfile.filter({id:b.profile_id,user_id:u.id}):[];
const profile=profiles.length===1?profiles[0]:null;
if(!profile)return Response.json({error:'Invalid profile'},{status:403});
const scope={user_id:u.id,profile_id:b.profile_id};
const findVideo=async(id:string)=>{const rows=await base.entities.Video.filter({id});return rows.length===1?rows[0]:null;};
const allowed=(v:any)=>!!v&&(!profile.is_kids||(!v.is_adult&&['U','G','PG','TV-Y','TV-Y7','TV-Y7-FV','TV-G','TV-PG','BBFC U','BBFC PG'].includes(String(v.age_rating||'').trim().toUpperCase())));
const seriesAccess=new Map<string,Promise<boolean>>();
const allowedVideo=async(v:any)=>{
 if(!allowed(v))return false;
 if(!v.series_id)return true;
 if(!profile.is_kids){const parents=await base.entities.Series.filter({id:v.series_id});return parents.length===1&&(!parents[0].is_adult||u.age_verified===true||u.role==='admin');}
 if(!seriesAccess.has(v.series_id)){
  seriesAccess.set(v.series_id,base.entities.Series.filter({id:v.series_id}).then(rows=>rows.length===1&&allowed(rows[0])));
 }
 return seriesAccess.get(v.series_id);
};
if(b.action==='catalogue'){
 if(!profile.is_kids)return Response.json({error:'Invalid profile'},{status:403});
 if(!['videos','series'].includes(b.kind)||!Number.isSafeInteger(b.offset)||b.offset<0||b.offset>500000)return Response.json({error:'Invalid catalogue page'},{status:400});
 const entity=b.kind==='videos'?base.entities.Video:base.entities.Series;
 const rows=await entity.list('id',500,b.offset);
 if(!Array.isArray(rows)||rows.length>500||rows.some(row=>!row?.id)||new Set(rows.map(row=>row.id)).size!==rows.length)return Response.json({error:'Conflicting catalogue records'},{status:409});
 const visible=[];
 if(b.kind==='series')visible.push(...rows.filter(allowed));
 else {
  const rated=rows.filter(allowed);
  const parentIds=[...new Set(rated.map(video=>video.series_id).filter(Boolean))];
  const approvedParents=new Set<string>();
  for(let i=0;i<parentIds.length;i+=100){
   const ids=parentIds.slice(i,i+100);
   const parents=await base.entities.Series.filter({id:{$in:ids}},'id',ids.length);
   for(const id of ids){const matches=parents.filter(parent=>parent.id===id);if(matches.length===1&&allowed(matches[0]))approvedParents.add(id);}
  }
  visible.push(...rated.filter(video=>!video.series_id||approvedParents.has(video.series_id)));
 }
 const rowsWithoutSources=visible.map(row=>({
  ...Object.fromEntries(catalogueFields.filter(field=>Object.hasOwn(row,field)).map(field=>[field,row[field]])),
  has_playback:!row.coming_soon&&(row.has_playback===true||(typeof row.video_url==='string'&&Boolean(row.video_url.trim())))
 }));
 return Response.json({rows:rowsWithoutSources,next:rows.length===500?b.offset+500:null});
}
if(b.action==='source'){
 if(!profile.is_kids&&!(await verifyProfileAccess(db,u.id,b.profile_id,b.access_token)))return Response.json({error:'Profile unlock required'},{status:403});
 if(typeof b.video_id!=='string'||!b.video_id||b.video_id.length>256)return Response.json({error:'Invalid title'},{status:400});
 const v=await findVideo(b.video_id);
 if(!(await allowedVideo(v)))return Response.json({error:'Unavailable title'},{status:404});
 if(!profile.is_kids&&v.is_adult&&u.role!=='admin'&&u.age_verified!==true)return Response.json({error:'Age verification required'},{status:403});
 // Paid titles must not bypass entitlement checks through the Kids endpoint.
 if(v.is_for_sale){
  const purchases=await db.VideoPurchase.filter({user_id:u.id,video_id:v.id,status:'completed'});
  if(!purchases.length&&u.role!=='admin')return Response.json({error:'Purchase required'},{status:403});
 }
 // Prefer the verified private source; legacy fields are a migration fallback.
 let media=v;
 if(!v.coming_soon&&db.ProtectedMediaSource){
  const matches=await db.ProtectedMediaSource.filter({video_id:v.id});
  if(matches.length>1)return Response.json({error:'Conflicting media sources'},{status:409});
  if(matches.length===1)media=matches[0];
 }
 const source=!v.coming_soon&&typeof media.video_url==='string'&&media.video_url.trim()?media.video_url:null;
 const subtitles=source&&Array.isArray(media.subtitles)
  ? media.subtitles.filter(track=>typeof track?.url==='string'&&track.url)
      .map(({url,language,label})=>({url,language,label}))
  : [];
 return Response.json({source,subtitles},{headers:{'Cache-Control':'no-store'}});
}
if(b.action==='list'){
const rows=await db.ProfilePlayback.filter(scope,'-changed_at',200);
const output=[];
for(let i=0;i<rows.length;i+=8){const batch=await Promise.all(rows.slice(i,i+8).map(async r=>{const v=await findVideo(r.video_id);return await allowedVideo(v)?{id:r.video_id,title:v.title,thumbnail_url:v.thumbnail_url,is_adult:!!v.is_adult,position:r.position,duration:r.duration,state:r.state,changed_at:r.changed_at}:null;}));output.push(...batch.filter(Boolean));}
return Response.json({rows:output});
}
if(b.action!=='save'||typeof b.video_id!=='string'||!b.video_id.trim()||b.video_id.length>256||!['progress','completed','removed'].includes(b.state))return Response.json({error:'Invalid operation'},{status:400});
if(b.state!=='removed'&&!(await allowedVideo(await findVideo(b.video_id))))return Response.json({error:'Unavailable title'},{status:404});
const position=b.position??0,duration=b.duration??0;
if(!Number.isFinite(position)||!Number.isFinite(duration)||position<0||duration<0||position>duration||duration>604800||(b.state==='progress'&&duration<=0))return Response.json({error:'Invalid progress'},{status:400});
const key={...scope,video_id:b.video_id};
const matches=await db.ProfilePlayback.filter(key);
if(matches.length>1)return Response.json({error:'Conflicting playback records'},{status:409});
const row=matches[0];
if(b.state==='removed'&&!row)return Response.json({ok:true});
const data={position:b.state==='progress'?position:0,duration:b.state==='progress'?duration:0,state:b.state,changed_at:Date.now()};
if(row)await db.ProfilePlayback.update(row.id,data);else await db.ProfilePlayback.create({...key,...data});
return Response.json({ok:true});
}catch{return Response.json({error:'Sync unavailable'},{status:500});}
}