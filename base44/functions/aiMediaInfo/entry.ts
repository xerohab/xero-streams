import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, type, seriesName, episodeNumber, seasonNumber } = await req.json();

    const genreList = "Action, Action Comedy, Action Thriller, Adventure, Animation, Anime, Anthology, Art House, Biopic, Black Comedy, Body Horror, Business & Entrepreneurship, Children & Family, Combat Sports, Comedy, Cooking & Food, Cosmic Horror, Costume Drama, Courtroom Drama, Crime, Crime Thriller, Cyberpunk, Cyber Thriller, Dark Fantasy, Disaster, Documentary, Docudrama, Drama, Dystopian, Educational, Erotic Thriller, Esports, Extreme Sports, Fairy Tale, Fantasy, Film Noir, Game Show, Governance & Politics, Heist, Historical, Historical Drama, Horror, Horror Comedy, House & Garden, Human Interest, Industrial & Manufacturing, Isekai, Kaiju, Late Night, Life Extension & Wellness, Live Performance, Lucha Libre, Martial Arts, Mecha, Medical Drama, Military, Mockumentary, Monster, Motor Sports, Music & Dance, Musical, Mystery, Nature & Wildlife, Neo-Noir, News & Current Affairs, Paranormal, Period Piece, Political Thriller, Post-Apocalyptic, Psychological Horror, Psychological Thriller, Public Access, Reality TV, Religion & Spirituality, Romance, Romantic Comedy, Satire, Science & Technology, Science Fiction, Sci-Fi Fantasy, Slasher, Slice of Life, Soap Opera, Space Opera, Sports, Sports Documentary, Sports Drama, Spy Thriller, Stand-Up Comedy, Superhero, Supernatural, Survival, Talk Show, Teen Drama, Travel & Tourism, True Crime, Urban Fantasy, Variety Show, War, Western, Wrestling, Wrestling Documentary, Wrestling Drama, Zombie";
    const genreInstruction = `Also identify the best-fit genres for this content. Choose between 1 and 3 genres from this list: ${genreList}. Put them as an array of exact matching strings in the "genres" field (most relevant first).`;

    let prompt;
    if (type === "episode") {
      const seasonStr = seasonNumber ? `Season: ${seasonNumber}` : 'Season: Unknown (extract from title if possible)';
      const isLikelyFilename = /\.(mp4|mkv|avi|webm|mov)$|[Ss]\d{1,2}[Ee]\d{1,2}|1080p|720p|480p|2160p|x264|x265|web-dl|webrip|bluray|hdrip/i.test(title || '');
      prompt = `I need information about a specific TV series episode.
Series: "${seriesName || 'Unknown (extract from title)'}"
${seasonStr}
Episode Number: ${episodeNumber || 'Unknown (extract from title)'}
Provided Title: "${title || 'unknown'}"

${isLikelyFilename
  ? `The provided title appears to be a filename. Extract the actual episode title from it, removing all quality tags, season/episode codes, file extensions, and series names. Then look up that episode to write its description.`
  : `The provided title "${title}" already appears to be a clean episode title. USE IT AS-IS — do NOT change it to a different episode title. Simply write a description for THIS episode and assign genres.`}

Write a concise, engaging 2-3 sentence description of THIS SPECIFIC episode's plot based on the series "${seriesName || 'the title'}"${seasonNumber ? `, Season ${seasonNumber}` : ''}${episodeNumber ? `, Episode ${episodeNumber}` : ''}.
${genreInstruction} Use the genres of the parent series.

Respond in JSON with exactly these keys:
{
  "title": ${isLikelyFilename ? '"The extracted clean episode title (just the episode name, no series name or quality tags)"' : `"${title || 'unknown'}"`},
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