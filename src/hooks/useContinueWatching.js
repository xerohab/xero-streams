const KEY = "xero_continue_watching";
const WATCHED_KEY = "xero_watched";
const MAX = 20;

function notify() {
  window.dispatchEvent(new Event("xero-progress-updated"));
}

export function saveProgress(video, currentTime, duration) {
  if (!video?.id || !duration || duration < 60) return;
  const progress = Math.floor((currentTime / duration) * 100);
  if (progress < 2 || progress > 95) {
    // Remove if almost done or just started
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
  localStorage.setItem(KEY, JSON.stringify(updated));
  notify();
}

export function removeProgress(videoId) {
  const list = getAll().filter((v) => v.id !== videoId);
  localStorage.setItem(KEY, JSON.stringify(list));
  notify();
}

export function addWatched(videoId) {
  if (!videoId) return;
  const list = getWatched();
  if (!list.includes(videoId)) {
    localStorage.setItem(WATCHED_KEY, JSON.stringify([videoId, ...list].slice(0, 100)));
    notify();
  }
}

export function getWatched() {
  try {
    return JSON.parse(localStorage.getItem(WATCHED_KEY)) || [];
  } catch {
    return [];
  }
}

export function getAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function getProgress(videoId) {
  return getAll().find((v) => v.id === videoId) || null;
}