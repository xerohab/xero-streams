import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  getCredentials,
  submitPartnerEvent,
  logIntegration,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// Server-side viewing evidence tracking and signed event submission.
//
// Tracks actual accumulated watch time (not browser-reported position alone),
// detects seeking/skipping/pausing/rewinding, and submits STREAM_VIEW_PROGRESS
// at 5-minute milestones and STREAM_ENDED on completion. Only submits when the
// user has a linked Perk Sphere connection. All signing is server-side.
//
// Anti-abuse measures:
// - Position jumps (seek/skip) are not counted as watch time.
// - Paused periods are not counted.
// - Rewinds do not accumulate watch time.
// - Milestone events use deterministic idempotent IDs for deduplication.
// - Multiple tabs are isolated by client-generated session_id.

const PROGRESS_INTERVAL_SECONDS = 300; // 5-minute milestones
const SEEK_TOLERANCE_SECONDS = 5; // buffer for seeking detection

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const videoId = String(body.video_id || "").trim();
    const sessionId = String(body.session_id || "").trim();
    const currentTime = Number(body.current_time) || 0;
    const duration = Number(body.duration) || 0;
    const isPaused = !!body.is_paused;
    const isEnded = !!body.is_ended;

    if (!videoId || !sessionId) {
      return Response.json(
        { error: "video_id and session_id are required.", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    // Look up the video server-side for reliable evidence.
    const videoPage = await base44.entities.Video.filter(
      { id: videoId },
      { limit: 1 }
    );
    const video = pageItems(videoPage)[0];
    if (!video) {
      return Response.json(
        { error: "Video not found.", code: "VIDEO_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Find or create the viewing session.
    const sessionPage = await base44.entities.ViewingSession.filter(
      { user_id: user.id, video_id: videoId, session_id: sessionId },
      { limit: 1 }
    );
    let session = pageItems(sessionPage)[0];
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    if (!session) {
      session = await base44.entities.ViewingSession.create({
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
    if (!isPaused && session.last_update) {
      const elapsedReal =
        (now - new Date(session.last_update).getTime()) / 1000;
      const positionDelta = currentTime - (session.last_position || 0);

      if (positionDelta < 0) {
        // Rewound — don't count.
        delta = 0;
      } else if (positionDelta > elapsedReal + SEEK_TOLERANCE_SECONDS) {
        // Seeked/skipped forward — don't count the jump.
        delta = 0;
      } else {
        // Normal playback — count actual time elapsed (capped to real time).
        delta = Math.min(positionDelta, elapsedReal);
        if (delta < 0) delta = 0;
      }
    }

    const newAccumulated = (session.accumulated_watch_seconds || 0) + delta;
    const newMilestones = [...(session.progress_milestones || [])];
    const eventsSubmitted = [];

    // Check if user has a Perk Sphere connection.
    const connections = pageItems(
      await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        { limit: 1 }
      )
    );
    const connection = connections[0] || null;

    // Submit STREAM_VIEW_PROGRESS at milestones (only if connected).
    if (connection && !isPaused) {
      const lastMilestone = Math.floor(
        (session.accumulated_watch_seconds || 0) / PROGRESS_INTERVAL_SECONDS
      );
      const currentMilestone = Math.floor(
        newAccumulated / PROGRESS_INTERVAL_SECONDS
      );

      for (let m = lastMilestone + 1; m <= currentMilestone; m++) {
        const milestoneSeconds = m * PROGRESS_INTERVAL_SECONDS;
        if (!newMilestones.includes(milestoneSeconds)) {
          const eventId = `ps_evt_${sessionId}_${milestoneSeconds}`;
          try {
            const result = await submitPartnerEvent(connection, {
              event_id: eventId,
              activity: "STREAM_VIEW_PROGRESS",
              timestamp: nowIso,
              evidence: {
                video_id: videoId,
                video_title: video.title,
                content_type: video.content_type,
                series_id: video.series_id || null,
                accumulated_watch_seconds: milestoneSeconds,
                video_duration_seconds: duration || 0,
                progress_percent:
                  duration > 0
                    ? Math.round((milestoneSeconds / duration) * 1000) / 10
                    : 0,
                session_id: sessionId,
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
              activity: "STREAM_VIEW_PROGRESS",
              event_id: eventId,
            });
            if (result.ok) {
              newMilestones.push(milestoneSeconds);
              eventsSubmitted.push({
                activity: "STREAM_VIEW_PROGRESS",
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
              activity: "STREAM_VIEW_PROGRESS",
              event_id: eventId,
            });
          }
        }
      }
    }

    // Submit STREAM_ENDED on completion (only if connected).
    let endedSubmitted = session.ended_submitted || false;
    if (connection && isEnded && !endedSubmitted) {
      const eventId = `ps_evt_${sessionId}_ended`;
      try {
        const result = await submitPartnerEvent(connection, {
          event_id: eventId,
          activity: "STREAM_ENDED",
          timestamp: nowIso,
          evidence: {
            video_id: videoId,
            video_title: video.title,
            content_type: video.content_type,
            series_id: video.series_id || null,
            accumulated_watch_seconds: newAccumulated,
            video_duration_seconds: duration || 0,
            completion_percent:
              duration > 0
                ? Math.round((newAccumulated / duration) * 1000) / 10
                : 0,
            session_id: sessionId,
          },
        });
        await logIntegration(base44, {
          event_type: "event_submit",
          status: result.ok ? "success" : "error",
          error_code: result.ok ? null : result.data?.error?.code || "unknown",
          http_status: result.status,
          user_id: user.id,
          activity: "STREAM_ENDED",
          event_id: eventId,
        });
        if (result.ok) {
          endedSubmitted = true;
          eventsSubmitted.push({ activity: "STREAM_ENDED" });
        }
      } catch (e) {
        await logIntegration(base44, {
          event_type: "event_submit",
          status: "error",
          error_code: "PS_UNREACHABLE",
          details: e.message,
          user_id: user.id,
          activity: "STREAM_ENDED",
          event_id: eventId,
        });
      }
    }

    // Update the session.
    await base44.entities.ViewingSession.update(session.id, {
      last_update: nowIso,
      accumulated_watch_seconds: newAccumulated,
      last_position: currentTime,
      duration: duration || session.duration || 0,
      is_paused: isPaused,
      progress_milestones: newMilestones,
      ended_submitted: endedSubmitted,
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