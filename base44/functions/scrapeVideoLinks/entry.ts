import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'No URL provided' }, { status: 400 });

    let baseUrl = url.endsWith('/') ? url : url + '/';

    const doFetch = (u) => fetch(u, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });

    let res;
    try {
      res = await doFetch(baseUrl);
    } catch (fetchErr) {
      // If HTTPS fails (e.g. bad SSL cert), retry with HTTP
      if (baseUrl.startsWith('https://')) {
        const httpUrl = baseUrl.replace('https://', 'http://');
        res = await doFetch(httpUrl);
        baseUrl = httpUrl;
      } else {
        throw fetchErr;
      }
    }

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch page: ${res.status} ${res.statusText}` }, { status: 400 });
    }

    const html = await res.text();

    // Extract all href links from the page
    const hrefRegex = /href="([^"]+)"/gi;
    const links = [];
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      links.push(match[1]);
    }

    // Helper to resolve relative URLs
    const resolveUrl = (link) => {
      if (link.startsWith('http://') || link.startsWith('https://')) return link;
      if (link.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        return `${urlObj.protocol}//${urlObj.host}${link}`;
      }
      return baseUrl + link;
    };

    // 1. Try direct media file links first
    const mediaExtensions = /\.(mp4|wav|mkv|avi|mov|webm|m4v|mp3|ogg|flac)(\?.*)?$/i;
    const directMediaLinks = links
      .filter(link => mediaExtensions.test(link))
      .map(resolveUrl)
      .filter((link, i, arr) => arr.indexOf(link) === i);

    if (directMediaLinks.length > 0) {
      const episodes = parseEpisodes(directMediaLinks);
      return Response.json({ episodes, total: episodes.length, mode: 'direct' });
    }

    // 2. Fallback: look for episode/download page links
    // Match links with patterns like "episode-1", "ep-1", "download-*-episode-1", "season-*-episode-*"
    const episodePagePattern = /(?:episode|ep)[-_\s]?(\d+)/i;
    const downloadPagePattern = /\/(?:sdm_downloads|download|dl|episode)s?\/[^"]+/i;

    const episodeLinks = links
      .filter(link => {
        // Skip same-page anchors, javascript, mailto, images, css, etc.
        if (link.startsWith('#') || link.startsWith('javascript:') || link.startsWith('mailto:')) return false;
        if (/\.(jpg|jpeg|png|gif|webp|svg|css|js|xml|zip)(\?.*)?$/i.test(link)) return false;
        // Must match episode pattern or download pattern
        return episodePagePattern.test(link) || downloadPagePattern.test(link);
      })
      .map(resolveUrl)
      .filter((link, i, arr) => arr.indexOf(link) === i);

    if (episodeLinks.length > 0) {
      const episodes = parseEpisodes(episodeLinks);
      return Response.json({ episodes, total: episodes.length, mode: 'page_links' });
    }

    return Response.json({ error: 'No media files or episode links found at that URL. Try a direct file directory URL.' }, { status: 404 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseEpisodes(links) {
  const episodes = links.map((link, index) => {
    const filename = decodeURIComponent(link.split('/').pop().split('?')[0]);
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

    let episodeNumber = null;
    let title = nameWithoutExt;

    const patterns = [
      /[Ss]\d+[Ee](\d+)/,              // S01E05
      /[Ee]p(?:isode)?[-_\s]?(\d+)/i,  // Episode 5, Ep5, episode-5
      /[-_](\d+)[-_]?$/,               // ends with -5 or _5
      /[\s._-](\d+)[\s._-]/,           // " 5 " or ".5."
      /^(\d+)[\s._-]/,                 // Starts with number
      /(\d+)$/,                        // Ends with number
    ];

    for (const pattern of patterns) {
      const m = (nameWithoutExt + ' ' + link).match(pattern);
      if (m) {
        episodeNumber = parseInt(m[1], 10);
        break;
      }
    }

    if (episodeNumber === null) episodeNumber = index + 1;

    // Try to build a clean title from the URL path
    const pathParts = link.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || nameWithoutExt;
    title = lastPart
      .replace(/\.[^.]+$/, '')       // remove extension
      .replace(/[-_]/g, ' ')         // dashes/underscores to spaces
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalise first letter of each word
    title = title.replace(/\b\w/g, c => c.toUpperCase());

    return {
      title,
      video_url: link,
      episode_number: episodeNumber,
      filename,
    };
  });

  episodes.sort((a, b) => a.episode_number - b.episode_number);
  return episodes;
}