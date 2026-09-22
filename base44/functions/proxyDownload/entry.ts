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

    // Fetch the file from the origin server
    const fileResponse = await fetch(video.video_url, { redirect: 'follow' });
    if (!fileResponse.ok) {
      return Response.json({ error: 'File unavailable on origin server' }, { status: 502 });
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

    // Stream the file back with download headers — origin URL is never exposed to the browser
    const headers = new Headers();
    headers.set('Content-Type', fileResponse.headers.get('Content-Type') || 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    const contentLength = fileResponse.headers.get('Content-Length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new Response(fileResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}