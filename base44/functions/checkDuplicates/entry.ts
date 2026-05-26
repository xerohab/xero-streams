import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const franchises = await base44.asServiceRole.entities.Franchise.list("-created_date", 1000);
        let items = franchises.map(f => ({id: f.id, title: f.title, cover: f.cover_image})).filter(f => f.title.toLowerCase().includes("puss") || f.title.toLowerCase().includes("shrek"));
        return Response.json({ items });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});