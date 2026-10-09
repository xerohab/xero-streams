const normalise = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function lookupEpisode(seriesName, season, number) {
  const names = [...new Set([seriesName.trim(), seriesName.split(':')[0].trim()])];
  let show;
  for (const name of names) {
    const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('The episode guide is unavailable. Please try again shortly.');
    const matches = await response.json();
    show = matches.find(item => normalise(item.show.name) === normalise(name))?.show;
    if (show) break;
  }
  if (!show) return null;
  const response = await fetch(`https://api.tvmaze.com/shows/${show.id}/episodebynumber?season=${season}&number=${number}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('The episode guide is unavailable. Please try again shortly.');
  const episode = await response.json();
  const description = (episode.summary || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
  if (!episode.name || !description || /^(?:tba|tbd|episode\s*\d+|\d+)$/i.test(episode.name.trim())) return null;
  return { title: episode.name, description, genres: show.genres || [] };
}