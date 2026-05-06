import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { title, episode_number, season_number } = await req.json();
        if (!title) return Response.json({ error: 'No title provided' }, { status: 400 });

        const apiKey = Deno.env.get("OPENSUBTITLES_API_KEY");
        if (!apiKey) return Response.json({ error: 'OpenSubtitles API key not set' }, { status: 500 });

        let url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(title)}&languages=en`;
        if (episode_number) url += `&episode_number=${episode_number}`;
        if (season_number) url += `&season_number=${season_number}`;
        
        const searchRes = await fetch(url, {
            headers: { 
                'Api-Key': apiKey, 
                'Content-Type': 'application/json',
                'User-Agent': 'Base44 v1.0'
            }
        });
        const searchData = await searchRes.json();
        
        if (!searchData.data || searchData.data.length === 0) {
            return Response.json({ error: 'No subtitles found on OpenSubtitles' }, { status: 404 });
        }
        
        const fileId = searchData.data[0].attributes.files[0].file_id;
        
        const dlRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
            method: 'POST',
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Base44 v1.0'
            },
            body: JSON.stringify({ file_id: fileId })
        });
        const dlData = await dlRes.json();
        
        if (!dlData.link) {
            return Response.json({ error: 'Failed to get download link from OpenSubtitles' }, { status: 500 });
        }
        
        const subFileRes = await fetch(dlData.link);
        const subText = await subFileRes.text();
        
        // convert SRT to VTT just in case it's SRT
        let vttText = subText;
        if (!subText.startsWith('WEBVTT')) {
            vttText = 'WEBVTT\n\n' + subText
                .replace(/\{\\([ibu])\}/g, '<$1>')
                .replace(/\{\\([ibu])0\}/g, '</$1>')
                .replace(/\{\\[^}]+\}/g, '')
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        }
        
        return Response.json({ status: 'completed', vtt: vttText });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});