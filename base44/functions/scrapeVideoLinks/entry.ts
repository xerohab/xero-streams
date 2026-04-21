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

    const baseUrl = url.endsWith('/') ? url : url + '/';

    const res = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

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

    // Filter for mp4 and wav files only
    const mediaExtensions = /\.(mp4|wav|mkv|avi|mov|webm|m4v|mp3|ogg|flac)$/i;
    const mediaLinks = links
      .filter(link => mediaExtensions.test(link))
      .map(link => {
        // Resolve relative URLs
        if (link.startsWith('http://') || link.startsWith('https://')) return link;
        if (link.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          return `${urlObj.protocol}//${urlObj.host}${link}`;
        }
        return baseUrl + link;
      })
      // Remove duplicates
      .filter((link, i, arr) => arr.indexOf(link) === i);

    // Parse episode info from filenames
    const episodes = mediaLinks.map((link, index) => {
      const filename = decodeURIComponent(link.split('/').pop());
      const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

      // Try to extract episode number from common patterns
      // e.g. "S01E05", "Episode 5", "Ep5", "5 - Title", "05"
      let episodeNumber = null;
      let title = nameWithoutExt;

      const patterns = [
        /[Ss]\d+[Ee](\d+)/,           // S01E05
        /[Ee]p(?:isode)?[\s._-]?(\d+)/i, // Episode 5, Ep5
        /[\s._-](\d+)[\s._-]/,        // " 5 " or ".5."
        /^(\d+)[\s._-]/,              // Starts with number
        /[\s._-](\d+)$/,              // Ends with number
      ];

      for (const pattern of patterns) {
        const m = nameWithoutExt.match(pattern);
        if (m) {
          episodeNumber = parseInt(m[1], 10);
          break;
        }
      }

      if (episodeNumber === null) episodeNumber = index + 1;

      // Clean up title - replace underscores, dots, dashes with spaces
      title = nameWithoutExt
        .replace(/[._]/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        title,
        video_url: link,
        episode_number: episodeNumber,
        filename,
      };
    });

    // Sort by episode number
    episodes.sort((a, b) => a.episode_number - b.episode_number);

    return Response.json({ episodes, total: episodes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});