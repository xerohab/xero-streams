import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import JSZip from 'npm:jszip@3.10.1';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify premium subscription
    const subs = await base44.entities.UserSubscription.filter({ user_id: user.id, status: 'active' });
    if (user.role !== 'admin' && subs.length === 0) {
      return Response.json({ error: 'Premium subscription required to download.' }, { status: 403 });
    }

    const body = await req.json();
    const { type, id, title } = body; // type = "series" | "franchise"

    if (!id || !type) {
      return Response.json({ error: 'Missing type or id' }, { status: 400 });
    }

    // Fetch all videos in the series or franchise
    const query = type === 'series' ? { series_id: id } : { franchise_id: id };
    const videos = await base44.asServiceRole.entities.Video.filter(query, 'sort_order');

    if (videos.length === 0) {
      return Response.json({ error: 'No episodes found for this content.' }, { status: 404 });
    }

    const zip = new JSZip();
    let count = 0;
    let totalBytes = 0;

    for (const video of videos) {
      if (!video.video_url) continue;
      // Skip HLS streams — can't be bundled into a zip
      if (video.video_url.includes('.m3u8')) continue;
      try {
        const resp = await fetch(video.video_url);
        if (!resp.ok) continue;
        const buffer = await resp.arrayBuffer();
        const urlPath = video.video_url.split('?')[0];
        const ext = (urlPath.split('.').pop() || 'mp4').toLowerCase();
        const safeTitle = (video.title || 'untitled').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'untitled';
        const filename = video.episode_number
          ? `E${String(video.episode_number).padStart(2, '0')} - ${safeTitle}.${ext}`
          : `${safeTitle}.${ext}`;
        zip.file(filename, buffer);
        totalBytes += buffer.byteLength;
        count++;
      } catch {
        // skip individual failures
      }
    }

    if (count === 0) {
      return Response.json({ error: 'No downloadable video files found.' }, { status: 404 });
    }

    const zipBuffer = await zip.generateAsync({
      type: 'arraybuffer',
      compression: 'STORE', // no compression — videos are already compressed
    });

    const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
    const safeFileName = (title || type).replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'download';

    // Upload to private storage and create a signed URL
    const uploadRes = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: zipBlob });
    const signedRes = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: uploadRes.file_uri,
      expires_in: 3600,
    });

    // Log the download
    await base44.asServiceRole.entities.DownloadLog.create({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      content_type: type,
      content_id: id,
      content_title: title || `${type} download`,
      download_type: 'zip',
      item_count: count,
      file_size_bytes: zipBuffer.byteLength,
    });

    return Response.json({
      signed_url: signedRes.signed_url,
      filename: `${safeFileName}.zip`,
      item_count: count,
      file_size: zipBuffer.byteLength,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}