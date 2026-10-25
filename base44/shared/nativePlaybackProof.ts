import {mergePlaybackRanges} from './nativePlayback.ts';
import {sha256Hex,isYouTubeContent,currentPerkSphereLink,pageItems} from './perkSphereClient.ts';
export async function readNativePlaybackProof(admin,{account,content,sessionReference,now=Date.now()}){
 const fail=()=>{throw Error('NATIVE_PLAYBACK_NOT_VERIFIED');};
 if(!Number.isSafeInteger(now)||![account,content,sessionReference].every(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x)))fail();
 const [video,policies,sessions,connection]=await Promise.all([
  admin.entities.Video.get(content),
  admin.entities.PlaybackRewardContent.filter({video_id:content}),
  admin.entities.ViewingSession.filter({user_id:account,video_id:content,session_id:sessionReference},undefined,2),
  currentPerkSphereLink(admin,account)
 ]);
 const catalog=pageItems(policies),records=pageItems(sessions);
 if(video?.id!==content||isYouTubeContent(video.video_url)||catalog.length!==1||records.length!==1||!connection)fail();
 const p=catalog[0],s=records[0],duration=p.duration_seconds;
 if(!Number.isFinite(Date.parse(p.verified_at))||Date.parse(p.verified_at)>now+5000||p.enabled!==true||!['operator_media_probe','provider_api'].includes(p.source)||!Number.isSafeInteger(duration)||duration<1||duration>86400||
  p.media_url_sha256!==await sha256Hex(video.video_url)||s.user_id!==account||s.video_id!==content||s.session_id!==sessionReference||
  s.evidence_version!=='native-playback-v1'||s.media_url_sha256!==p.media_url_sha256||s.content_duration_seconds!==duration||
  s.perksphere_link_uuid!==connection.perksphere_connection_id||!['active','ended'].includes(s.status))fail();
 const start=Date.parse(s.started_at),last=Date.parse(s.last_update);
 if(!Number.isFinite(start)||!Number.isFinite(last)||start>last||last>now+5000||last<now-86400000)fail();
 const ranges=mergePlaybackRanges(s.credited_ranges,duration),covered=ranges.reduce((n,[a,b])=>n+b-a,0),elapsed=(last-start)/1000;
 const full=s.completed_full_content===true&&ranges.length===1&&ranges[0][0]<=0.25&&ranges[0][1]>=duration-1&&elapsed>=duration-1;
 const eligible=full?duration:Math.floor(Math.min(covered,elapsed));
 if(!Number.isSafeInteger(s.accumulated_watch_seconds)||s.accumulated_watch_seconds<0||s.accumulated_watch_seconds>eligible)fail();
 return {provider:'xero_native_player',verification_mode:'client_assisted_native',partner_account_reference:account,content_reference:content,session_reference:sessionReference,link_reference:s.perksphere_link_uuid,eligible_seconds:Math.min(eligible,s.accumulated_watch_seconds),full_content:full,content_duration_seconds:duration,media_url_sha256:p.media_url_sha256,started_at:s.started_at,last_update:s.last_update};
}
