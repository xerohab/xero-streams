import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {emitNativeTaskEvents} from "../../shared/partnerTaskEvents.ts";
import {accrueNativePlayback} from "../../shared/nativePlayback.ts";
import {
  sha256Hex,
  currentPerkSphereLink,
  isYouTubeContent,
  pageItems,
} from "../../shared/perkSphereClient.ts";

// Client-assisted native playback metering with server time/content bounds.
//
// Bounds unique reported content coverage by server elapsed time; it does not
// prove human attention or make a browser report independently authoritative.
// detects seeking/skipping/pausing/rewinding, and submits video_watch_progress
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

const SEEK_TOLERANCE_SECONDS = 5;
const MAX_ELIGIBLE_SECONDS = 86400;

async function handleRequest(req) {
  if(req.method !== "POST") return Response.json({error:"Method not allowed"},{status:405});
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

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

    // Only an operator/provider-verified native media binding can produce
    // bounded playback evidence. Browser duration is never a reward policy.
    const policies = pageItems(await base44.asServiceRole.entities.PlaybackRewardContent.filter({video_id:videoId}));
    let playbackPolicy = null;
    if(policies.length === 1) {
      const p = policies[0];
      if(p.enabled === true && Number.isSafeInteger(p.duration_seconds) && p.duration_seconds > 0 && p.duration_seconds <= 86400 &&
        ["operator_media_probe","provider_api"].includes(p.source) && Number.isFinite(Date.parse(p.verified_at)) &&
        p.media_url_sha256 === await sha256Hex(video.video_url)) playbackPolicy = p;
    }

    const connection = await currentPerkSphereLink(base44.asServiceRole,user.id);

    // Find or create the viewing session.
    const sessionPage = await base44.entities.ViewingSession.filter(
      { user_id: user.id, video_id: videoId, session_id: sessionId },
      undefined, 2
    );
    const matchingSessions = pageItems(sessionPage);
    if(matchingSessions.length > 1) return Response.json({error:"Viewing session requires reconciliation."},{status:409});
    let session = matchingSessions[0];
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    if (!session) {
      session = await base44.asServiceRole.entities.ViewingSession.create({
        user_id: user.id,
        video_id: videoId,
        session_id: sessionId,
        ...(connection ? {perksphere_link_uuid:connection.perksphere_connection_id} : {}),
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

    let newAccumulated = Math.min(MAX_ELIGIBLE_SECONDS, (session.accumulated_watch_seconds || 0) + delta);
    let playbackEvidence = null;
    if(playbackPolicy) {
      playbackEvidence = accrueNativePlayback(session,{current_time:currentTime,is_paused:isPaused,is_ended:isEnded},{now,duration:playbackPolicy.duration_seconds,mediaHash:playbackPolicy.media_url_sha256});
      newAccumulated = playbackEvidence.accumulated_watch_seconds;
    }


    // Persist metering before notifying the independent consumer. A delivery
    // failure must not discard progress or leave a claim ahead of its evidence.
    await base44.asServiceRole.entities.ViewingSession.update(session.id, {
      last_update: nowIso, accumulated_watch_seconds: newAccumulated,
      last_position: currentTime, duration: playbackPolicy?.duration_seconds || duration || session.duration || 0,
      is_paused: isPaused, status: isEnded ? "ended" : "active", ...(playbackEvidence || {})
    });

    const eventsSubmitted = playbackPolicy ? await emitNativeTaskEvents(base44.asServiceRole,{connection,session,policy:playbackPolicy,videoId,eligibleSeconds:newAccumulated,fullContent:playbackEvidence?.completed_full_content===true,occurredAt:nowIso}) : [];

    return Response.json({
      ok: true,
      accumulated_watch_seconds: newAccumulated,
      events_submitted: eventsSubmitted,
      connected: !!connection,
      verification_mode: playbackPolicy ? "client_assisted_native" : "unverified_telemetry",
      completed_full_content: playbackEvidence?.completed_full_content === true,
      reward_issued: false,
    });
  } catch {
    return Response.json({ error: "Viewing progress is temporarily unavailable." }, { status: 503 });
  }
}
export default handleRequest;
if(typeof Deno !== "undefined") Deno.serve(handleRequest);
