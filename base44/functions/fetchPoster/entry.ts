import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, type = "movie", videoId } = await req.json();
    if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

    const mediaType = (type === "episode" || type === "tv") ? "tv" : "movie";
    let posterUrl = null;

    // --- Strategy 1: TMDB (if key set) ---
    const tmdbKey = Deno.env.get("TMDB_API_KEY");
    if (tmdbKey && !posterUrl) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${tmdbKey}&query=${encodeURIComponent(title)}&page=1`);
        const data = await res.json();
        const result = data.results?.[0];
        if (result?.poster_path) {
          posterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
        } else if (result?.backdrop_path) {
          posterUrl = `https://image.tmdb.org/t/p/w780${result.backdrop_path}`;
        }
      } catch (_) {}
    }

    // --- Strategy 2: OMDB (if key set) ---
    const omdbKey = Deno.env.get("OMDB_API_KEY");
    if (omdbKey && !posterUrl) {
      try {
        const omdbType = mediaType === "tv" ? "series" : "movie";
        const res = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}&type=${omdbType}`);
        const data = await res.json();
        if (data.Poster && data.Poster !== "N/A") {
          posterUrl = data.Poster;
        }
      } catch (_) {}
    }

    // --- Strategy 3: LLM with internet search (primary fallback) ---
    if (!posterUrl) {
      try {
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `I need a direct image URL for the official poster of the ${mediaType === "tv" ? "TV show" : "movie"} titled "${title}".

Search for this on multiple sources including:
- TMDB (themoviedb.org)
- IMDB (imdb.com)  
- Wikipedia
- Fanart.tv
- Any official streaming site

Return a direct working image URL (ending in .jpg, .jpeg, .png, or .webp). It must be a real, publicly accessible URL. Do not return placeholder URLs or example URLs.`,
          add_context_from_internet: true,
          model: "gemini_3_flash",
          response_json_schema: {
            type: "object",
            properties: {
              image_url: { type: "string", description: "Direct URL to the poster image" },
              source: { type: "string", description: "Where the image was found" }
            }
          }
        });
        const candidate = llmResult?.image_url;
        if (candidate && (candidate.startsWith("http://") || candidate.startsWith("https://"))) {
          // Verify the URL actually returns an image
          try {
            const check = await fetch(candidate, { method: "HEAD" });
            const ct = check.headers.get("content-type") || "";
            if (check.ok && (ct.includes("image") || candidate.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i))) {
              posterUrl = candidate;
            }
          } catch (_) {
            // Accept without verification if HEAD fails
            posterUrl = candidate;
          }
        }
      } catch (_) {}
    }

    // --- Strategy 4: LLM without internet (last resort, generates a known poster URL) ---
    if (!posterUrl) {
      try {
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Based on your training data, what is a well-known direct image URL for the poster of "${title}" (${mediaType === "tv" ? "TV show" : "movie"})? 
Common sources include TMDB image CDN (image.tmdb.org), wikimedia, or other CDNs.
Return only a likely valid direct image URL or null if you don't know.`,
          response_json_schema: {
            type: "object",
            properties: {
              image_url: { type: "string" }
            }
          }
        });
        const candidate = llmResult?.image_url;
        if (candidate && candidate.startsWith("https://")) {
          posterUrl = candidate;
        }
      } catch (_) {}
    }

    if (posterUrl && videoId) {
      await base44.asServiceRole.entities.Video.update(videoId, { thumbnail_url: posterUrl });
    }

    return Response.json({ poster_url: posterUrl, found: !!posterUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});