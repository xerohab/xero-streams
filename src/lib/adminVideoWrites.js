import {base44} from "@/api/base44Client";
const fields=['video_url','download_url','subtitles'];
const hasSource=p=>fields.some(k=>Object.prototype.hasOwnProperty.call(p,k));
const metadata=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!fields.includes(k)));
export async function loadAdminVideoSource(id){const r=await base44.functions.invoke('adminMediaSource',{action:'get',video_id:id});if(!r.data?.source)throw Error('Unable to load protected source');return r.data.source;}
async function sync(id,p){
 if(!hasSource(p))return;
 const r=await base44.functions.invoke('adminMediaSource',{action:'get',video_id:id});
 if(!r.data?.source)throw Error('Unable to load protected source');
 const source={...r.data.source};
 for(const k of fields)if(Object.prototype.hasOwnProperty.call(p,k))source[k]=p[k]??(k==='subtitles'?[]:'');
 const saved=await base44.functions.invoke('adminMediaSource',{action:'save',video_id:id,...source});
 if(!saved.data?.ok)throw Error('Protected source synchronization failed');
}
export async function createAdminVideo(p){
 const result=await base44.entities.Video.create({...metadata(p),has_playback:false});
 const id=result?.id||result?.data?.id||result?.record?.id;
 if(hasSource(p)){if(!id)throw Error('Created video ID unavailable for source synchronization');await sync(id,p);}
 return result;
}
export async function updateAdminVideo(id,p){
 const result=await base44.entities.Video.update(id,metadata(p));
 await sync(id,p);return result;
}
export async function bulkCreateAdminVideos(rows){
 const out=[];for(const row of rows)out.push(await createAdminVideo(row));return out;
}
