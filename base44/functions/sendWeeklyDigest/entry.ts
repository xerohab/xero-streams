import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len).trim() + '...' : str;
}

function buildMeta(item) {
  const parts = [];
  if (item.release_year) parts.push(item.release_year);
  if (item.age_rating) parts.push(item.age_rating);
  if (item.runtime_or_episodes) parts.push(item.runtime_or_episodes);
  if (item.quality && item.quality !== 'Unknown') parts.push(item.quality);
  if (!parts.length) return '';
  return `<p style="margin:0 0 4px;font-size:11px;color:#9da3af;font-family:Inter,Arial,sans-serif;">${escapeHtml(parts.join(' · '))}</p>`;
}

function buildItemHtml(item, type) {
  const image = type === 'series' ? (item.cover_image || '') : (item.thumbnail_url || '');
  const title = item.title || 'Untitled';
  const description = truncate(item.description, 120);

  let link = 'https://xerostreams.com';
  if (type === 'series') {
    link = `https://xerostreams.com/series?id=${item.id}`;
  } else if (type === 'movie') {
    link = `https://xerostreams.com/movie?id=${item.id}`;
  } else if (type === 'episode') {
    link = item.series_id ? `https://xerostreams.com/series?id=${item.series_id}` : 'https://xerostreams.com';
  }

  const episodeLabel = (type === 'episode' && item.episode_number)
    ? ` <span style="font-size:12px;color:#9da3af;font-weight:400;">· Ep ${item.episode_number}</span>`
    : '';

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
    <tr>
      <td width="86" valign="top" style="padding-right:12px;">
        <a href="${escapeHtml(link)}" style="text-decoration:none;">
          <img src="${escapeHtml(image)}" width="76" height="114" style="border-radius:6px;display:block;width:76px;height:114px;object-fit:cover;background:#1a1a1a;" alt="${escapeHtml(title)}" />
        </a>
      </td>
      <td valign="top" style="padding-top:2px;">
        <a href="${escapeHtml(link)}" style="text-decoration:none;color:#f2f2f2;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#f2f2f2;font-family:Inter,Arial,sans-serif;">${escapeHtml(title)}${episodeLabel}</p>
        </a>
        ${buildMeta(item)}
        ${description ? `<p style="margin:0;font-size:12px;color:#9da3af;font-family:Inter,Arial,sans-serif;line-height:1.5;">${escapeHtml(description)}</p>` : ''}
      </td>
    </tr>
  </table>`;
}

function buildSectionHtml(label, items, type) {
  if (!items || items.length === 0) return '';
  let html = `<p style="font-size:16px;font-weight:800;color:#e7b008;font-family:Inter,Arial,sans-serif;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #333333;">${escapeHtml(label)}</p>`;
  for (const item of items.slice(0, 10)) {
    html += buildItemHtml(item, type);
  }
  return html;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const testEmail = body.test_email;
    const testMode = body.test_mode === true;

    // Allow direct admin testing; workflow calls have no user context
    let caller = null;
    try { caller = await base44.auth.me(); } catch (e) { /* workflow call */ }
    if (caller && caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch recent content via service role
    const [allMovies, allEpisodes, allSeries] = await Promise.all([
      base44.asServiceRole.entities.Video.filter({ content_type: 'movie' }, '-created_date', 50),
      base44.asServiceRole.entities.Video.filter({ content_type: 'episode' }, '-created_date', 50),
      base44.asServiceRole.entities.Series.list('-created_date', 50)
    ]);

    let movies, episodes, series;
    if (testMode) {
      movies = allMovies.slice(0, 5);
      episodes = allEpisodes.slice(0, 5);
      series = allSeries.slice(0, 5);
    } else {
      movies = allMovies.filter(v => v.created_date && new Date(v.created_date) >= sevenDaysAgo);
      episodes = allEpisodes.filter(v => v.created_date && new Date(v.created_date) >= sevenDaysAgo);
      series = allSeries.filter(s => s.created_date && new Date(s.created_date) >= sevenDaysAgo);
    }

    const totalCount = movies.length + episodes.length + series.length;

    const dateRange = `${sevenDaysAgo.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`;

    const emailVariables = {
      ...buildDigestVariables(movies, series, episodes),
      date_range: dateRange,
      total_count: String(totalCount)
    };

    if (testMode && testEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: testEmail,
        template_name: 'WeeklyDigest',
        from_name: 'Xero Streams',
        variables: emailVariables
      });
      return Response.json({
        status: 'test_sent',
        to: testEmail,
        counts: { movies: movies.length, series: series.length, episodes: episodes.length }
      });
    }

    if (totalCount === 0) {
      return Response.json({ status: 'skipped', reason: 'no_new_content' });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const eligibleUsers = users.filter(u => !u.weekly_digest_opt_out && u.email);

    let sent = 0;
    let failed = 0;
    for (const user of eligibleUsers) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          template_name: 'WeeklyDigest',
          from_name: 'Xero Streams',
          variables: { ...emailVariables, first_name: user.full_name || user.username || 'there' }
        });
        sent++;
      } catch (e) {
        failed++;
      }
    }

    return Response.json({
      status: 'sent',
      sent,
      failed,
      total_users: users.length,
      eligible: eligibleUsers.length,
      counts: { movies: movies.length, series: series.length, episodes: episodes.length }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}