import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { videoUrl } = await req.json();
        if (!videoUrl) return Response.json({ error: 'No video URL provided' }, { status: 400 });

        const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
        if (!apiKey) return Response.json({ error: 'AssemblyAI API key not set' }, { status: 500 });

        const response = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'authorization': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({ audio_url: videoUrl })
        });
        
        const data = await response.json();
        
        if (data.error) {
            return Response.json({ error: data.error }, { status: 500 });
        }
        
        return Response.json(data); // returns { id: "transcript_id", status: "queued", ... }
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});