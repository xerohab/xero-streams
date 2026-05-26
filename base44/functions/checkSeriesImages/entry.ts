import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const series = await base44.asServiceRole.entities.Series.list("-created_date", 1000);
        let items = series.map(f => ({title: f.title, cover: f.cover_image})).filter(f => ["Puss In Boots", "Austin Powers", "Shrek", "Army Of Universe", "Robert Langdon Series", "The Pickup", "City Of Angels", "Avatar Fire and Ash"].includes(f.title));
        return Response.json({ items });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});