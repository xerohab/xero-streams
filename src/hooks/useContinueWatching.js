import {base44} from "@/api/base44Client";
const BASE_KEY = "xero_continue_watching";
const WATCHED_BASE = "xero_watched";
const MAX = 20;
let queue=Promise.resolve();
const last=new Map();
let verifiedProfile=null;
export function setPlaybackProfile(id){if(verifiedProfile!==id)last.clear();verifiedProfile=id;}
function push(videoId,state,position=0,duration=0){
 const id=localStorage.getItem("xero_active_profile");
 if(!id||id!==verifiedProfile)return;
 const key=id+":"+videoId,now=Date.now();
 const previous=last.get(key);
 if(previous?.state===state&&(state!=="progress"||now-previous.time<10000))return;
 const marker={state,time:now};last.set(key,marker);
 if(last.size>1000)last.delete(last.keys().next().value);
 queue=queue.catch(()=>{}).then(async()=>{if(verifiedProfile!==id)return;const result=await base44.functions.invoke("profilePlayback",{action:"save",profile_id:id,video_id:videoId,state,position,duration});if(result.data?.ok!==true)throw Error("Sync rejected");}).catch(()=>{if(last.get(key)===marker)last.delete(key);});
}
export async function syncPlayback(profileId=verifiedProfile){
 if(!profileId||profileId!==verifiedProfile)return;
 try{
 await queue;
 const r=await base44.functions.invoke("profilePlayback",{action:"list",profile_id:profileId});
 if(profileId!==verifiedProfile||localStorage.getItem("xero_active_profile")!==profileId||!Array.isArray(r.data?.rows))return;
 const local=new Map(getAll().map(v=>[v.id,v])),watched=new Set(getWatched());
 for(const row of r.data.rows){
 const old=local.get(row.id);
 if(old&&old.savedAt>row.changed_at)continue;
 if(row.state==="progress"&&row.duration>0){watched.delete(row.id);local.set(row.id,{...old,title:row.title||old?.title,thumbnail_url:row.thumbnail_url||old?.thumbnail_url,is_adult:row.is_adult,id:row.id,currentTime:row.position,duration:row.duration,progress:Math.floor(row.position/row.duration*100),savedAt:row.changed_at});}
 else {local.delete(row.id);if(row.state==="completed")watched.add(row.id);else watched.delete(row.id);}
 }
 localStorage.setItem(getCurrentKey(),JSON.stringify([...local.values()].sort((a,b)=>b.savedAt-a.savedAt).slice(0,MAX)));
 localStorage.setItem(getCurrentWatchedKey(),JSON.stringify([...watched].slice(0,100)));
 notify();
 }catch{}
}

function notify() {
  window.dispatchEvent(new Event("xero-progress-updated"));
}

function getKey(profile) {
  return profile ? `${BASE_KEY}_${profile.id}` : BASE_KEY;
}
function getWatchedKey(profile) {
  return profile ? `${WATCHED_BASE}_${profile.id}` : WATCHED_BASE;
}

export function saveProgress(video, currentTime, duration) {
  if (!video?.id || !Number.isFinite(currentTime)||!Number.isFinite(duration)||currentTime<0||currentTime>duration||duration < 60) return;
  const progress = Math.floor((currentTime / duration) * 100);
  if (progress < 2 || progress > 95) {
    if (progress > 95) {
      localStorage.setItem(getCurrentKey(),JSON.stringify(getAll().filter(v=>v.id!==video.id)));
      addWatched(video.id);
      notify();
    }
    return;
  }
  const list = getAll();
  const filtered = list.filter((v) => v.id !== video.id);
  const entry = {
    id: video.id,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    currentTime,
    duration,
    progress,
    is_adult: video.is_adult || false,
    savedAt: Date.now(),
  };
  const updated = [entry, ...filtered].slice(0, MAX);
  localStorage.setItem(getCurrentKey(), JSON.stringify(updated));
  const watched=getWatched();if(watched.includes(video.id))localStorage.setItem(getCurrentWatchedKey(),JSON.stringify(watched.filter(id=>id!==video.id)));
  push(video.id,"progress",currentTime,duration);
  notify();
}

export function removeProgress(videoId) {
  push(videoId,"removed");
  localStorage.setItem(getCurrentWatchedKey(),JSON.stringify(getWatched().filter(id=>id!==videoId)));
  const list = getAll().filter((v) => v.id !== videoId);
  localStorage.setItem(getCurrentKey(), JSON.stringify(list));
  notify();
}

export function addWatched(videoId) {
  if (!videoId) return;
  push(videoId,"completed");
  const list = getWatched();
  if (!list.includes(videoId)) {
    localStorage.setItem(getCurrentWatchedKey(), JSON.stringify([videoId, ...list].slice(0, 100)));
    notify();
  }
}

export function getWatched() {
  try {
    return JSON.parse(localStorage.getItem(getCurrentWatchedKey())) || [];
  } catch {
    return [];
  }
}

export function getAll() {
  try {
    return JSON.parse(localStorage.getItem(getCurrentKey())) || [];
  } catch {
    return [];
  }
}

export function getProgress(videoId) {
  return getAll().find((v) => v.id === videoId) || null;
}

// --- Profile-aware key resolution (module-level, reads from localStorage) ---
function getCurrentKey() {
  const id = localStorage.getItem("xero_active_profile");
  return id ? `${BASE_KEY}_${id}` : BASE_KEY;
}
function getCurrentWatchedKey() {
  const id = localStorage.getItem("xero_active_profile");
  return id ? `${WATCHED_BASE}_${id}` : WATCHED_BASE;
}