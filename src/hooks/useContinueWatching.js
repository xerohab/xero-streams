import {base44} from "@/api/base44Client";
const BASE_KEY = "xero_continue_watching";
const WATCHED_BASE = "xero_watched";
const MAX = 20;
let queue=Promise.resolve();
const last=new Map();
let verifiedProfile=null;
export function setPlaybackProfile(id){verifiedProfile=id;}
function push(videoId,state,position=0,duration=0){
 const id=localStorage.getItem("xero_active_profile");
 if(!id||id!==verifiedProfile)return;
 const key=id+":"+videoId,now=Date.now();
 if(state==="progress"&&now-(last.get(key)||0)<10000)return;
 last.set(key,now);
 queue=queue.catch(()=>{}).then(()=>base44.functions.invoke("profilePlayback",{action:"save",profile_id:id,video_id:videoId,state,position,duration})).catch(()=>{last.delete(key);});
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
 if(row.state==="progress"&&row.duration>0)local.set(row.id,{...old,id:row.id,currentTime:row.position,duration:row.duration,progress:Math.floor(row.position/row.duration*100),savedAt:row.changed_at});
 else {local.delete(row.id);if(row.state==="completed")watched.add(row.id);}
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
  if (!video?.id || !duration || duration < 60) return;
  const progress = Math.floor((currentTime / duration) * 100);
  if (progress < 2 || progress > 95) {
    if (progress > 95) {
      removeProgress(video.id);
      addWatched(video.id);
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
  push(video.id,"progress",currentTime,duration);
  notify();
}

export function removeProgress(videoId) {
  push(videoId,"removed");
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