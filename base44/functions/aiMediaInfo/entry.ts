import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, type, seriesName, episodeNumber } = await req.json();

    let prompt;
    if (type === "episode") {
      prompt = `I need information about a TV series episode.
Series: "${seriesName || 'Unknown (extract from title)'}"
Episode Number: ${episodeNumber || 'Unknown (extract from title)'}
Original Filename / Title: "${title || 'unknown'}"

Please figure out the actual series name, the episode number, and the correct episode title based on the filename or title provided. Then write a concise, engaging 2-3 sentence description of this episode's plot.
If you can't determine the exact episode, provide a general description for the series or guess based on the filename.

Respond in JSON with exactly these keys:
{
  "title": "The correct episode title (just the episode title, clean without series name or video quality tags, e.g., 'Pilot', not 'Show - Pilot' or 'Dexter.S02.720p')",
  "description": "A concise 2-3 sentence description of this episode"
}`;
    } else if (type === "movie") {
      prompt = `I need information about a movie. The provided title or filename is: "${title}".

Please figure out the actual correct movie title, removing any extra tags like 1080p, x264, Web-DL, years, etc.
Then write a concise, engaging 2-3 sentence description/synopsis of this movie.

Respond in JSON with exactly these keys:
{
  "title": "The correct, clean movie title",
  "description": "A concise 2-3 sentence synopsis of the movie"
}`;
    } else {
      prompt = `I need information about media. The provided title or filename is: "${title}".

Please figure out the actual correct title, removing any extra tags like 1080p, x264, Web-DL, years, etc.
Then write a concise, engaging 2-3 sentence description/synopsis.

Respond in JSON with exactly these keys:
{
  "title": "The correct, clean title",
  "description": "A concise 2-3 sentence description"
}`;
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_1_pro",
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});