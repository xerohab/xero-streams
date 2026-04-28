import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, type, seriesName, episodeNumber } = await req.json();

    let prompt;
    if (type === "episode" && seriesName && episodeNumber) {
      prompt = `I need information about a TV series episode.
Series: "${seriesName}"
Episode Number: ${episodeNumber}
Episode Title (if known): "${title || 'unknown'}"

Please find the correct episode title and write a concise, engaging 2-3 sentence description of this episode's plot/content. If you know the exact episode, use real information. If the title is unknown, find the episode by number.

Respond in JSON with:
{
  "title": "The correct episode title",
  "description": "A concise 2-3 sentence description of this episode"
}`;
    } else if (type === "movie") {
      prompt = `I need information about a movie titled "${title}".

Please provide the correct movie title and write a concise, engaging 2-3 sentence description/synopsis of this movie.

Respond in JSON with:
{
  "title": "The correct movie title",
  "description": "A concise 2-3 sentence synopsis of the movie"
}`;
    } else {
      prompt = `I need information about media titled "${title}".
Write a concise, engaging 2-3 sentence description.
Respond in JSON with:
{
  "title": "${title}",
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