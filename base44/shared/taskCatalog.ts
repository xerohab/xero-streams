// Public catalog metadata only. Never return playback URLs, credentials or sessions.
const id=value=>typeof value==='string'&&/^[a-f0-9]{24}$/.test(value);
export async function taskCatalogItem(video,policies,{now=Date.now(),series=null,hash}={}){
 if(!id(video?.id)||!['movie','episode'].includes(video.content_type)||video.coming_soon===true||video.is_adult===true||video.is_for_sale===true||!video.video_url)return null;
 if(video.content_type==='episode'&&(!id(video.series_id)||!series||series.is_adult===true||series.coming_soon===true))return null;
 let media;try{media=new URL(video.video_url);}catch{return null;}
 if(media.protocol!=='https:'||media.username||media.password||/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i.test(media.hostname))return null;
 const dates=[video.created_date,video.content_updated_at].map(d=>Date.parse(d)).filter(n=>Number.isFinite(n)&&n<=now);
 if(!dates.length)return null;
 const recent=Math.max(...dates);if(recent<now-14*86400000)return null;
 const matching=(policies||[]).filter(p=>p.video_id===video.id);
 let duration=null;
 if(matching.length===1){const p=matching[0];if(p.enabled===true&&Number.isSafeInteger(p.duration_seconds)&&p.duration_seconds>=1&&p.duration_seconds<=86400&&['operator_media_probe','provider_api'].includes(p.source)&&Number.isFinite(Date.parse(p.verified_at))&&Date.parse(p.verified_at)<=now&&/^[a-f0-9]{64}$/.test(p.media_url_sha256||'')&&p.media_url_sha256===await hash(video.video_url))duration={seconds:p.duration_seconds,source:p.source,verified_at:p.verified_at,media_url_sha256:p.media_url_sha256};}
 const title=String(video.title||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,160);if(!title)return null;
 return {content_id:video.id,title,content_type:video.content_type,content_url:`https://xerostreams.com/Watch?id=${video.id}`,updated_at:new Date(recent).toISOString(),duration};
}
