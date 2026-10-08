import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

/**
 * Fetches detailed metadata (cast, guest stars, release year, plot, rating, director)
 * for a movie or TV show directly from the Google Gemini API.
 * Uses the GEMINI_API_KEY secret — does NOT consume Base44 AI integration credits.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, content_type, seriesName, episodeNumber } = await req.json();
    if (!title) return Response.json({ error: 'Title is required' }, { status: 400 });

    const apiKey = secrets.get("GEMINI_API_KEY");
    if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

    const isTv = content_type === "tv" || content_type === "episode";

    let prompt;
    if (isTv && seriesName && episodeNumber) {
      prompt = `Provide detailed metadata for the TV series episode "${title}" from the series "${seriesName}", episode ${episodeNumber}. Include the main cast of the series, any notable guest stars appearing in this specific episode, the release year of the series, a short 2-3 sentence plot overview of this episode, the content rating (e.g. TV-MA, TV-14, TV-PG), the creator or showrunner, and the runtime.`;
    } else if (isTv && seriesName) {
      prompt = `Provide detailed metadata for the TV series episode "${title}" from the series "${seriesName}". Include the main cast of the series, any notable guest stars for this episode, the release year of the series, a short 2-3 sentence plot overview, the content rating (e.g. TV-MA, TV-14), the creator or showrunner, and the runtime.`;
    } else if (isTv) {
      prompt = `Provide detailed metadata for the TV series "${title}". Include the main cast (lead actors), notable guest stars, the release year, a short 2-3 sentence plot overview, the content rating (e.g. TV-MA, TV-14, TV-PG), the creator or showrunner, and the total episode count or average runtime.`;
    } else {
      prompt = `Provide detailed metadata for the movie "${title}". Include the main cast (lead actors), any notable guest stars or cameos, the release year, a short 2-3 sentence plot overview, the content rating (e.g. PG-13, R, PG, G, NC-17), the director, and the runtime in minutes.`;
    }

    const responseSchema = {
      type: "OBJECT",
      properties: {
        main_cast: { type: "ARRAY", items: { type: "STRING" } },
        guest_stars: { type: "ARRAY", items: { type: "STRING" } },
        release_year: { type: "NUMBER" },
        description: { type: "STRING" },
        age_rating: { type: "STRING" },
        director_or_creator: { type: "STRING" },
        runtime_or_episodes: { type: "STRING" }
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema
      }
    });

    let apiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(20000)
    });

    // Retry once on temporary overload (503)
    if (apiRes.status === 503) {
      await new Promise((r) => setTimeout(r, 2000));
      apiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(20000)
      });
    }

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return Response.json(
        { error: `Gemini API error: ${apiRes.status}`, details: errText },
        { status: 502 }
      );
    }

    const data = await apiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return Response.json({ error: 'Empty response from Gemini' }, { status: 502 });

    const metadata = JSON.parse(text);
    return Response.json(metadata);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}