import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { lookupEpisode } from './episodeGuide.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const input = await req.json();
    const source = decodeURIComponent(String(input.videoUrl || input.title || '').split(/[?#]/)[0]);
    const filename = source.split('/').pop() || '';
    const episodePattern = /s(\d{1,3})[.\s_-]*e(\d{1,3})/i;
    const identifyingName = episodePattern.test(filename) ? filename : String(input.title || '');
    const episodeCode = identifyingName.match(episodePattern);
    const seasonFolder = source.match(/\/season[ ._-]*(\d+)/i);
    const showFolder = source.match(/\/(?:tvshows|tv|series|shows)\/([^/]+)/i);
    const showFromFilename = episodeCode ? identifyingName.slice(0, episodeCode.index).replace(/[._-]+/g, ' ').trim() : '';
    const title = String(input.title || filename).trim();
    const type = episodeCode ? 'episode' : input.type;
    const seriesName = showFolder?.[1] || showFromFilename || input.seriesName || '';
    const seasonNumber = episodeCode ? Number(episodeCode[1]) : Number(seasonFolder?.[1] || input.seasonNumber) || null;
    const episodeNumber = episodeCode ? Number(episodeCode[2]) : Number(input.episodeNumber) || null;
    if (!title && !seriesName) return Response.json({ error: 'Add a video link or title first.' }, { status: 400 });

    const genreList = "Action, Action Comedy, Action Thriller, Adventure, Animation, Anime, Anthology, Art House, Biopic, Black Comedy, Body Horror, Business & Entrepreneurship, Children & Family, Combat Sports, Comedy, Cooking & Food, Cosmic Horror, Costume Drama, Courtroom Drama, Crime, Crime Thriller, Cyberpunk, Cyber Thriller, Dark Fantasy, Disaster, Documentary, Docudrama, Drama, Dystopian, Educational, Erotic Thriller, Esports, Extreme Sports, Fairy Tale, Fantasy, Film Noir, Game Show, Governance & Politics, Heist, Historical, Historical Drama, Horror, Horror Comedy, House & Garden, Human Interest, Industrial & Manufacturing, Isekai, Kaiju, Late Night, Life Extension & Wellness, Live Performance, Lucha Libre, Martial Arts, Mecha, Medical Drama, Military, Mockumentary, Monster, Motor Sports, Music & Dance, Musical, Mystery, Nature & Wildlife, Neo-Noir, News & Current Affairs, Paranormal, Period Piece, Political Thriller, Post-Apocalyptic, Psychological Horror, Psychological Thriller, Public Access, Reality TV, Religion & Spirituality, Romance, Romantic Comedy, Satire, Science & Technology, Science Fiction, Sci-Fi Fantasy, Slasher, Slice of Life, Soap Opera, Space Opera, Sports, Sports Documentary, Sports Drama, Spy Thriller, Stand-Up Comedy, Superhero, Supernatural, Survival, Talk Show, Teen Drama, Travel & Tourism, True Crime, Urban Fantasy, Variety Show, War, Western, Wrestling, Wrestling Documentary, Wrestling Drama, Zombie";
    const genreInstruction = `Also identify the best-fit genres for this content. Choose between 1 and 3 genres from this list: ${genreList}. Put them as an array of exact matching strings in the "genres" field (most relevant first).`;

    if (type === 'episode' && seriesName && seasonNumber && episodeNumber) {
      const episode = await lookupEpisode(seriesName, seasonNumber, episodeNumber);
      if (!episode) {
        return Response.json({ error: `Couldn't verify ${seriesName} Season ${seasonNumber} Episode ${episodeNumber}. Check the season and episode numbers in the link.` });
      }
      return Response.json({
        ...episode,
        genres: episode.genres.filter(genre => genreList.split(', ').includes(genre)).slice(0, 3),
        content_type: 'episode',
        season_number: seasonNumber,
        episode_number: episodeNumber,
      });
    }

    let prompt;
    if (type === "episode") {
      prompt = `Use web search to find the actual episode name and a concise 2-3 sentence description for this exact TV episode.
Series identified from the video link or filename: ${JSON.stringify(seriesName || 'Identify from the filename')}
Season: ${seasonNumber || 'Identify from the supplied title or series subtitle'}
Episode: ${episodeNumber || 'Identify from the supplied title'}
Original filename: ${JSON.stringify(filename)}
Current title (may be incorrect): ${JSON.stringify(title)}
Selected series (a hint only if the filename has no show name): ${JSON.stringify(input.seriesName || '')}

A filename such as Show.Name.S02E07.720p.English.mp4 contains the show, season and episode numbers, NOT the episode name. Look up the episode name using an episode guide; do not just strip tags and return the show name.
When an SxxExx code exists, use those exact numbers even if the current title or selected series conflicts. For an anthology, the season number is the show's overall season, not season 1 of its subtitle. Do not substitute another season, another show, or a similarly named episode.
Confirm the episode name and synopsis together from reliable online episode listings. If only a clean title is supplied, identify that named episode in the specified series. Keep a clean title when it matches the verified episode, otherwise correct it.
If the episode has not aired or cannot be verified, set matched to false and return empty title, description and genres. Never invent an episode name or use a general series synopsis as the episode's description.
${genreInstruction} Use the genres of the parent series.
Return matched (boolean), title (episode name only), description (specific episode synopsis), and genres.`;
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
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          genres: { type: "array", items: { type: "string" } },
          ...(type === 'episode' ? { matched: { type: 'boolean' } } : {}),
        },
        required: type === 'episode' ? ['matched', 'title', 'description', 'genres'] : ['title', 'description', 'genres'],
      },
    });

    if (type === 'episode' && (!result.matched || !result.title?.trim() || /^(?:tba|tbd|episode\s*\d+|\d+)$/i.test(result.title.trim()) || !result.description?.trim())) {
      return Response.json({ error: `Couldn't verify ${seriesName || 'this series'}${seasonNumber ? ` Season ${seasonNumber}` : ''}${episodeNumber ? ` Episode ${episodeNumber}` : ''}. Check the season and episode numbers in the link.` });
    }
    return Response.json({
      title: result.title,
      description: result.description,
      genres: result.genres,
      ...(type === 'episode' ? { content_type: 'episode', season_number: seasonNumber, episode_number: episodeNumber } : {}),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}