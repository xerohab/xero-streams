import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));
        const { video_id, series_id, franchise_id } = body;

        if (video_id) {
            const video = await base44.asServiceRole.entities.Video.get(video_id);
            if (video) {
                await base44.asServiceRole.entities.Video.update(video_id, { views: (video.views || 0) + 1 });
            }
        }
        
        if (series_id) {
            const series = await base44.asServiceRole.entities.Series.get(series_id);
            if (series) {
                await base44.asServiceRole.entities.Series.update(series_id, { views: (series.views || 0) + 1 });
            }
        }

        if (franchise_id) {
            const franchise = await base44.asServiceRole.entities.Franchise.get(franchise_id);
            if (franchise) {
                await base44.asServiceRole.entities.Franchise.update(franchise_id, { views: (franchise.views || 0) + 1 });
            }
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});