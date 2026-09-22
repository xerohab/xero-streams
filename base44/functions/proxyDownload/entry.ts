import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check subscription
    const subscriptions = await base44.entities.UserSubscription.filter({
      user_id: user.id,
      status: 'active',
    });
    const isSubscribed = user.role === 'admin' || subscriptions.length > 0;
    if (!isSubscribed) {
      return Response.json({ error: 'Premium subscription required for downloads.' }, { status: 403 });
    }

    // Get video_id from query string (GET) or request body (POST)
    let videoId;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      videoId = url.searchParams.get('video_id');
    } else {
      let body;
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: 'Invalid request body' }, { status: 400 });
      }
      videoId = body.video_id;
    }
    if (!videoId) return Response.json({ error: 'Missing video_id' }, { status: 400 });

    // Get video
    const [video] = await base44.entities.Video.filter({ id: videoId });
    if (!video || !video.video_url) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    // Build a safe filename
    const safeTitle = (video.title || 'download').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const filename = `${safeTitle}.mp4`;

    // Log the download (non-blocking, best-effort)
    waitUntil(base44.asServiceRole.entities.DownloadLog.create({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      content_type: video.content_type === 'episode' ? 'episode' : 'movie',
      content_id: videoId,
      content_title: video.title,
      download_type: 'single',
      item_count: 1,
    }).catch(() => {}));

    // Return the direct download URL — the browser downloads directly from
    // the origin, avoiding serverless function timeouts on large files.
    // The browser's native download manager shows a progress bar.
    return Response.json({
      download_url: video.video_url,
      filename,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}