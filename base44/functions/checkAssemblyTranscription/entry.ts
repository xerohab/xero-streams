import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { transcriptId } = await req.json();
        if (!transcriptId) return Response.json({ error: 'No transcript ID provided' }, { status: 400 });

        const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
        if (!apiKey) return Response.json({ error: 'AssemblyAI API key not set' }, { status: 500 });

        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { 'authorization': apiKey }
        });
        
        const data = await response.json();
        
        if (data.status === 'completed') {
            const vttRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}/vtt`, {
                headers: { 'authorization': apiKey }
            });
            const vttText = await vttRes.text();
            
            return Response.json({ status: 'completed', vtt: vttText });
        }
        
        return Response.json({ status: data.status }); // queued, processing, error
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});