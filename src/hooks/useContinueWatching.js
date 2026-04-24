const KEY = "xero_continue_watching";
const MAX = 20;

export function saveProgress(video, currentTime, duration) {
  if (!video?.id || !duration || duration < 60 || video.is_adult) return;
  const progress = Math.floor((currentTime / duration) * 100);
  if (progress < 2 || progress > 95) {
    // Remove if almost done or just started
    if (progress > 95) removeProgress(video.id);
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
    savedAt: Date.now(),
  };
  const updated = [entry, ...filtered].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function removeProgress(videoId) {
  const list = getAll().filter((v) => v.id !== videoId);
  localStorage.setItem(KEY, JSON.stringify(list));
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