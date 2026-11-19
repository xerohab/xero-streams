import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
const catalogueFields=[
 'id','title','description','thumbnail_url','cover_image','backdrop_url','series_id','franchise_id',
 'category','category_id','genres','episode_number','season_number','duration','quality','quality_notes',
 'is_featured','is_adult','content_type','sort_order','coming_soon','release_date','release_year',
 'cast','main_cast','guest_stars','director_or_creator','age_rating','runtime_or_episodes','views',
 'created_date','updated_date','content_updated_at','intro_start','intro_end','recap_start','recap_end',
 'credits_start','credits_end'
];
export default async function(req:Request){
try{
const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
if(!u||u.is_banned)return Response.json({error:'Unauthorized'},{status:401});
const b=await req.json(),db=base.asServiceRole.entities;
const profile=typeof b.profile_id==='string'?(await db.ViewingProfile.filter({id:b.profile_id,user_id:u.id}))[0]:null;
if(!profile)return Response.json({error:'Invalid profile'},{status:403});
const scope={user_id:u.id,profile_id:b.profile_id};
const allowed=(v:any)=>!!v&&(!profile.is_kids||(!v.is_adult&&['U','G','PG','TV-Y','TV-Y7','TV-Y7-FV','TV-G','TV-PG','BBFC U','BBFC PG'].includes(String(v.age_rating||'').trim().toUpperCase())));
const seriesAccess=new Map<string,Promise<boolean>>();
const allowedVideo=async(v:any)=>{
 if(!allowed(v))return false;
 if(!profile.is_kids||!v.series_id)return true;
 if(!seriesAccess.has(v.series_id)){
  seriesAccess.set(v.series_id,base.entities.Series.filter({id:v.series_id}).then(rows=>allowed(rows[0])));
 }
 return seriesAccess.get(v.series_id);
};
if(b.action==='catalogue'){
 if(!profile.is_kids)return Response.json({error:'Invalid profile'},{status:403});
 if(!['videos','series'].includes(b.kind)||!Number.isSafeInteger(b.offset)||b.offset<0||b.offset>500000)return Response.json({error:'Invalid catalogue page'},{status:400});
 const entity=b.kind==='videos'?base.entities.Video:base.entities.Series;
 const rows=await entity.list('id',500,b.offset);
 const visible=[];
 if(b.kind==='series')visible.push(...rows.filter(allowed));
 else {
  const rated=rows.filter(allowed);
  const parentIds=[...new Set(rated.map(video=>video.series_id).filter(Boolean))];
  const approvedParents=new Set<string>();
  for(let i=0;i<parentIds.length;i+=100){
   const ids=parentIds.slice(i,i+100);
   const parents=await base.entities.Series.filter({id:{$in:ids}},'id',ids.length);
   for(const parent of parents.filter(allowed))approvedParents.add(parent.id);
  }
  visible.push(...rated.filter(video=>!video.series_id||approvedParents.has(video.series_id)));
 }
 const rowsWithoutSources=visible.map(row=>({
  ...Object.fromEntries(catalogueFields.filter(field=>Object.hasOwn(row,field)).map(field=>[field,row[field]])),
  has_playback:typeof row.video_url==='string'&&Boolean(row.video_url.trim())
 }));
 return Response.json({rows:rowsWithoutSources,next:rows.length===500?b.offset+500:null});
}
if(b.action==='source'){
 if(!profile.is_kids)return Response.json({error:'Invalid profile'},{status:403});
 if(typeof b.video_id!=='string'||!b.video_id||b.video_id.length>256)return Response.json({error:'Invalid title'},{status:400});
 const v=(await base.entities.Video.filter({id:b.video_id}))[0];
 if(!(await allowedVideo(v)))return Response.json({error:'Unavailable title'},{status:404});
 const source=!v.coming_soon&&typeof v.video_url==='string'?v.video_url:null;
 const subtitles=source&&Array.isArray(v.subtitles)
  ? v.subtitles.filter(track=>typeof track?.url==='string'&&track.url)
      .map(({url,language,label})=>({url,language,label}))
  : [];
 return Response.json({source,subtitles});
}
if(b.action==='list'){
const rows=await db.ProfilePlayback.filter(scope,'-changed_at',200);
const output=[];
for(let i=0;i<rows.length;i+=8){const batch=await Promise.all(rows.slice(i,i+8).map(async r=>{const v=(await base.entities.Video.filter({id:r.video_id}))[0];return await allowedVideo(v)?{id:r.video_id,title:v.title,thumbnail_url:v.thumbnail_url,is_adult:!!v.is_adult,position:r.position,duration:r.duration,state:r.state,changed_at:r.changed_at}:null;}));output.push(...batch.filter(Boolean));}
return Response.json({rows:output});
}
if(b.action!=='save'||typeof b.video_id!=='string'||!b.video_id.trim()||b.video_id.length>256||!['progress','completed','removed'].includes(b.state))return Response.json({error:'Invalid operation'},{status:400});
if(b.state!=='removed'&&!(await allowedVideo((await base.entities.Video.filter({id:b.video_id}))[0])))return Response.json({error:'Unavailable title'},{status:404});
const position=b.position??0,duration=b.duration??0;
if(!Number.isFinite(position)||!Number.isFinite(duration)||position<0||duration<0||position>duration||duration>604800||(b.state==='progress'&&duration<=0))return Response.json({error:'Invalid progress'},{status:400});
const key={...scope,video_id:b.video_id};
const row=(await db.ProfilePlayback.filter(key))[0];
if(b.state==='removed'&&!row)return Response.json({ok:true});
const data={position:b.state==='progress'?position:0,duration:b.state==='progress'?duration:0,state:b.state,changed_at:Date.now()};
if(row)await db.ProfilePlayback.update(row.id,data);else await db.ProfilePlayback.create({...key,...data});
return Response.json({ok:true});
}catch{return Response.json({error:'Sync unavailable'},{status:500});}
}