import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  submitPartnerEvent,
  isYouTubeContent,
  logIntegration,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// Server-side viewing evidence tracking and signed event submission.
//
// Tracks actual accumulated watch time (not browser-reported position alone),
// detects seeking/skipping/pausing/rewinding, and submits stream_watch_progress
// at 5-minute milestones. Only submits when the user has a linked Perk Sphere
// connection and the content is not YouTube (YouTube content is suppressed
// entirely — no points:0 or reward_eligible:false is sent to Linux).
//
// stream_ended is NOT submitted here — that Linux event represents the end of
// the stream itself (content going offline), not an individual viewer finishing
// playback. XeroStreams is a VOD platform; stream_ended would only apply to an
// admin content-removal action, which is not part of this tracking flow.
//
// Anti-abuse measures:
// - Position jumps (seek/skip) are not counted as watch time.
// - Paused periods are not counted.
// - Rewinds do not accumulate watch time.
// - Milestone events use deterministic idempotent partner_event_id for dedup.
// - Multiple tabs are isolated by client-generated session_id.
// - eligible_seconds is a safe integer between 0 and 86400.

const PROGRESS_INTERVAL_SECONDS = 300; // 5-minute milestones
const SEEK_TOLERANCE_SECONDS = 5;
const MAX_ELIGIBLE_SECONDS = 86400;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const videoId = String(body.video_id || "").trim();
    const sessionId = String(body.session_id || "").trim();
    const currentTime = Number(body.current_time);
    const duration = Number(body.duration || 0);
    const isPaused = !!body.is_paused;
    const isEnded = !!body.is_ended;

    if (!videoId || !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId) || !Number.isFinite(currentTime) || currentTime < 0 || !Number.isFinite(duration) || duration < 0) {
      return Response.json(
        { error: "video_id and session_id are required.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    // Look up the video server-side for reliable evidence.
    const videoPage = await base44.entities.Video.filter(
      { id: videoId },
      undefined, 1
    );
    const video = pageItems(videoPage)[0];
    if (!video) {
      return Response.json(
        { error: "Video not found.", code: "VIDEO_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Suppress YouTube content entirely — do not submit any event to Linux.
    if (isYouTubeContent(video.video_url)) {
      return Response.json({
        ok: true,
        suppressed: true,
        reason: "YOUTUBE_CONTENT",
        message: "YouTube content is not eligible for Perk Sphere rewards. No event submitted.",
      });
    }

    // Find or create the viewing session.
    const sessionPage = await base44.entities.ViewingSession.filter(
      { user_id: user.id, video_id: videoId, session_id: sessionId },
      undefined, 1
    );
    let session = pageItems(sessionPage)[0];
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    if (!session) {
      session = await base44.asServiceRole.entities.ViewingSession.create({
        user_id: user.id,
        video_id: videoId,
        session_id: sessionId,
        started_at: nowIso,
        last_update: nowIso,
        accumulated_watch_seconds: 0,
        last_position: currentTime,
        duration: duration || 0,
        is_paused: isPaused,
        progress_milestones: [],
        ended_submitted: false,
        status: "active",
      });
    }

    // Calculate actual watch delta from real elapsed time vs position change.
    let delta = 0;
    if (!isPaused && !session.is_paused && session.last_update) {
      const elapsedReal =
        (now - new Date(session.last_update).getTime()) / 1000;
      const positionDelta = currentTime - (session.last_position || 0);

      if (positionDelta < 0) {
        delta = 0;
      } else if (positionDelta > elapsedReal + SEEK_TOLERANCE_SECONDS) {
        delta = 0;
      } else {
        delta = Math.min(positionDelta, elapsedReal, 30);
        if (delta < 0) delta = 0;
      }
    }

    const newAccumulated = Math.min(MAX_ELIGIBLE_SECONDS, (session.accumulated_watch_seconds || 0) + delta);
    const newMilestones = [...(session.progress_milestones || [])];
    const eventsSubmitted = [];

    // Check if user has a Perk Sphere connection.
    const connections = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        undefined, 1
      )
    );
    const connection = connections[0] || null;

    // Submit stream_watch_progress at milestones (only if connected).
    if (connection && !isPaused) {
      const currentMilestone = Math.floor(
        newAccumulated / PROGRESS_INTERVAL_SECONDS
      );

      let deliveryAttempts = 0;
      for (let m = 1; m <= currentMilestone; m++) {
        const milestoneSeconds = m * PROGRESS_INTERVAL_SECONDS;
        if (!newMilestones.includes(milestoneSeconds)) {
          if (deliveryAttempts++ >= 3) break; // Bound retry work; later heartbeats resume pending milestones.
          const partnerEventId = `ps_evt_${user.id}_${videoId}_${sessionId}_${milestoneSeconds}`;
          // eligible_seconds: safe integer between 0 and 86400.
          const eligibleSeconds = Math.min(
            PROGRESS_INTERVAL_SECONDS,
            MAX_ELIGIBLE_SECONDS
          );
          try {
            const result = await submitPartnerEvent(connection, {
              event_type: "stream_watch_progress",
              partner_event_id: partnerEventId,
              occurred_at: nowIso,
              evidence: {
                stream_id: videoId,
                viewer_session_id: sessionId,
                eligible_seconds: eligibleSeconds,
              },
            });
            await logIntegration(base44, {
              event_type: "event_submit",
              status: result.ok ? "success" : "error",
              error_code: result.ok
                ? null
                : result.data?.error?.code || "unknown",
              http_status: result.status,
              user_id: user.id,
              activity: "stream_watch_progress",
              event_id: partnerEventId,
            });
            if (result.ok) {
              newMilestones.push(milestoneSeconds);
              eventsSubmitted.push({
                event_type: "stream_watch_progress",
                milestone: milestoneSeconds,
              });
            }
          } catch (e) {
            await logIntegration(base44, {
              event_type: "event_submit",
              status: "error",
              error_code: "PS_UNREACHABLE",
              details: e.message,
              user_id: user.id,
              activity: "stream_watch_progress",
              event_id: partnerEventId,
            });
          }
        }
      }
    }

    // stream_ended is NOT submitted here — it represents the end of the stream
    // itself (content going offline), not an individual viewer finishing playback.
    // XeroStreams is a VOD platform; stream_ended is an admin content-removal action.

    // Update the session.
    await base44.asServiceRole.entities.ViewingSession.update(session.id, {
      last_update: nowIso,
      accumulated_watch_seconds: newAccumulated,
      last_position: currentTime,
      duration: duration || session.duration || 0,
      is_paused: isPaused,
      progress_milestones: newMilestones,
      status: isEnded ? "ended" : "active",
    });

    return Response.json({
      ok: true,
      accumulated_watch_seconds: newAccumulated,
      events_submitted: eventsSubmitted,
      connected: !!connection,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
