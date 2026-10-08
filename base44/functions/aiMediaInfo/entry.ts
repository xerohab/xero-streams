import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, type, seriesName, episodeNumber } = await req.json();

    const genreList = "Action, Action Comedy, Action Thriller, Adventure, Animation, Anime, Anthology, Art House, Biopic, Black Comedy, Body Horror, Business & Entrepreneurship, Children & Family, Combat Sports, Comedy, Cooking & Food, Cosmic Horror, Costume Drama, Courtroom Drama, Crime, Crime Thriller, Cyberpunk, Cyber Thriller, Dark Fantasy, Disaster, Documentary, Docudrama, Drama, Dystopian, Educational, Erotic Thriller, Esports, Extreme Sports, Fairy Tale, Fantasy, Film Noir, Game Show, Governance & Politics, Heist, Historical, Historical Drama, Horror, Horror Comedy, House & Garden, Human Interest, Industrial & Manufacturing, Isekai, Kaiju, Late Night, Life Extension & Wellness, Live Performance, Lucha Libre, Martial Arts, Mecha, Medical Drama, Military, Mockumentary, Monster, Motor Sports, Music & Dance, Musical, Mystery, Nature & Wildlife, Neo-Noir, News & Current Affairs, Paranormal, Period Piece, Political Thriller, Post-Apocalyptic, Psychological Horror, Psychological Thriller, Public Access, Reality TV, Religion & Spirituality, Romance, Romantic Comedy, Satire, Science & Technology, Science Fiction, Sci-Fi Fantasy, Slasher, Slice of Life, Soap Opera, Space Opera, Sports, Sports Documentary, Sports Drama, Spy Thriller, Stand-Up Comedy, Superhero, Supernatural, Survival, Talk Show, Teen Drama, Travel & Tourism, True Crime, Urban Fantasy, Variety Show, War, Western, Wrestling, Wrestling Documentary, Wrestling Drama, Zombie";
    const genreInstruction = `Also identify the best-fit genres for this content. Choose between 1 and 3 genres from this list: ${genreList}. Put them as an array of exact matching strings in the "genres" field (most relevant first).`;

    let prompt;
    if (type === "episode") {
      prompt = `I need information about a TV series episode.
Series: "${seriesName || 'Unknown (extract from title)'}"
Episode Number: ${episodeNumber || 'Unknown (extract from title)'}"
Original Filename / Title: "${title || 'unknown'}"

Please figure out the actual series name, the episode number, and the correct episode title based on the filename or title provided. Then write a concise, engaging 2-3 sentence description of this episode's plot.
If you can't determine the exact episode, provide a general description for the series or guess based on the filename.
${genreInstruction} Use the genres of the parent series.

Respond in JSON with exactly these keys:
{
  "title": "The correct episode title (just the episode title, clean without series name or video quality tags, e.g., 'Pilot', not 'Show - Pilot' or 'Dexter.S02.720p')",
  "description": "A concise 2-3 sentence description of this episode",
  "genres": ["One value from the genre list above", "Optional second", "Optional third"]
}`;
    } else if (type === "movie") {
      prompt = `I need information about a movie. The provided title or filename is: "${title}".

Please figure out the actual correct movie title, removing any extra tags like 1080p, x264, Web-DL, years, etc.
Then write a concise, engaging 2-3 sentence description/synopsis of this movie.
${genreInstruction}

Respond in JSON with exactly these keys:
{
  "title": "The correct, clean movie title",
  "description": "A concise 2-3 sentence synopsis of the movie",
  "genres": ["One value from the genre list above", "Optional second", "Optional third"]
}`;
    } else {
      prompt = `I need information about media. The provided title or filename is: "${title}".

Please figure out the actual correct title, removing any extra tags like 1080p, x264, Web-DL, years, etc.
Then write a concise, engaging 2-3 sentence description/synopsis.
${genreInstruction}

Respond in JSON with exactly these keys:
{
  "title": "The correct, clean title",
  "description": "A concise 2-3 sentence description",
  "genres": ["One value from the genre list above", "Optional second", "Optional third"]
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
          genres: { type: "array", items: { type: "string" } },
        },
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});