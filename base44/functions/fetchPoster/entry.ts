import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Searches TMDB (The Movie Database) for a poster image for a given title.
// Falls back to a Google image search scrape if TMDB key isn't set.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, type = "movie", videoId } = await req.json();
    if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

    const tmdbKey = Deno.env.get("TMDB_API_KEY");
    let posterUrl = null;

    if (tmdbKey) {
      // Use TMDB API
      const mediaType = type === "episode" || type === "tv" ? "tv" : "movie";
      const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${tmdbKey}&query=${encodeURIComponent(title)}&page=1`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.poster_path) {
        posterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
      } else if (result?.backdrop_path) {
        posterUrl = `https://image.tmdb.org/t/p/w780${result.backdrop_path}`;
      }
    } else {
      // Fallback: use LLM with internet context to find an image URL
      const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Find a high quality official poster or thumbnail image URL for the ${type === "tv" || type === "episode" ? "TV show" : "movie"} titled "${title}". Return ONLY a direct image URL (jpg or png), nothing else. If unsure, return null.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: { image_url: { type: "string" } }
        }
      });
      const candidate = llmResult?.image_url;
      if (candidate && (candidate.startsWith("http://") || candidate.startsWith("https://"))) {
        posterUrl = candidate;
      }
    }

    if (posterUrl && videoId) {
      // Auto-update the video record
      await base44.asServiceRole.entities.Video.update(videoId, { thumbnail_url: posterUrl });
    }

    return Response.json({ poster_url: posterUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});