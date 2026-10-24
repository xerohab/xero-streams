// Native-player telemetry is client assisted. These server bounds do not prove
// a human's attention and must never turn an untrusted ended flag into a reward.
export function mergePlaybackRanges(ranges,duration){
 if(!Array.isArray(ranges)||ranges.length>512)throw Error('INVALID_PLAYBACK_RANGES');
 const sorted=ranges.map(pair=>{
  if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isFinite)||pair[0]<0||pair[1]<pair[0]||pair[1]>duration+1)throw Error('INVALID_PLAYBACK_RANGES');
  return [pair[0],Math.min(pair[1],duration)];
 }).sort((a,b)=>a[0]-b[0]);
 const merged=[];
 for(const range of sorted){
  const last=merged[merged.length-1];
  if(last&&range[0]<=last[1]+0.001)last[1]=Math.max(last[1],range[1]);
  else merged.push([...range]);
 }
 if(merged.length>512)throw Error('PLAYBACK_RANGE_LIMIT');
 return merged;
}
export function accrueNativePlayback(session,report,{now,duration,mediaHash}){
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(duration)||duration<1||duration>86400||! /^[a-f0-9]{64}$/.test(mediaHash||''))throw Error('INVALID_PLAYBACK_POLICY');
 if(typeof report.current_time!=='number'||!Number.isFinite(report.current_time)||report.current_time<0||report.current_time>duration+1||typeof report.is_paused!=='boolean'||typeof report.is_ended!=='boolean')throw Error('INVALID_PLAYBACK_REPORT');
 const current=Math.min(report.current_time,duration),start=Date.parse(session.started_at),last=Date.parse(session.last_update);
 if(!Number.isFinite(start)||!Number.isFinite(last)||start>last||last>now)throw Error('INVALID_PLAYBACK_CLOCK');
 const sameEvidence=session.evidence_version==='native-playback-v1'&&session.media_url_sha256===mediaHash&&session.content_duration_seconds===duration;
 let ranges=sameEvidence?mergePlaybackRanges(session.credited_ranges||[],duration):[];
 const elapsed=(now-last)/1000,delta=current-session.last_position;
 // An upgrade from old telemetry starts fresh. A gap over 45 seconds, seek,
 // excessive speed or a previously paused interval adds no content coverage.
 if(sameEvidence&&session.is_paused===false&&elapsed>0&&elapsed<=45&&Number.isFinite(delta)&&delta>0&&delta<=elapsed+0.75&&delta<=45){
  ranges=mergePlaybackRanges([...ranges,[session.last_position,current]],duration);
 }
 const covered=ranges.reduce((total,[a,b])=>total+b-a,0),realElapsed=Math.max(0,(now-start)/1000);
 let eligible=Math.floor(Math.min(covered,realElapsed));
 // Runtime metadata is rounded up to seconds. At most one second of rounding
 // is accepted only after continuous start-to-end coverage and matching time.
 const full=ranges.length===1&&ranges[0][0]<=0.25&&ranges[0][1]>=duration-1&&realElapsed>=duration-1&&report.is_ended===true;
 if(full)eligible=duration;
 return {credited_ranges:ranges,accumulated_watch_seconds:Math.min(duration,eligible),evidence_version:'native-playback-v1',media_url_sha256:mediaHash,content_duration_seconds:duration,completed_full_content:full||sameEvidence&&session.completed_full_content===true};
}
