const BASE_KEY = "xero_continue_watching";
const WATCHED_BASE = "xero_watched";
const MAX = 20;

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
  notify();
}

export function removeProgress(videoId) {
  const list = getAll().filter((v) => v.id !== videoId);
  localStorage.setItem(getCurrentKey(), JSON.stringify(list));
  notify();
}

export function addWatched(videoId) {
  if (!videoId) return;
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