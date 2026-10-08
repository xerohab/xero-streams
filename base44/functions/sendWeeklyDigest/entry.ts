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

function buildDigestVariables(movies, series, episodes) {
  const entries = [
    { label: 'New Movies', items: movies, type: 'movie' },
    { label: 'New Series', items: series, type: 'series' },
    { label: 'New Episodes', items: episodes, type: 'episode' }
  ].flatMap(group => group.items.slice(0, 10).map((item, index) => ({
    item, type: group.type, heading: index === 0 ? group.label : ''
  })));
  const variables = { empty_message: entries.length ? '' : 'No new content this week. Check back next week!' };
  for (let index = 0; index < 30; index++) {
    const entry = entries[index];
    const item = entry?.item;
    const type = entry?.type;
    const prefix = `item_${index + 1}`;
    const image = type === 'series' ? item?.cover_image : item?.thumbnail_url;
    let link = 'https://xerostreams.com';
    if (item && type === 'series') link += `/series?id=${encodeURIComponent(item.id)}`;
    if (item && type === 'movie') link += `/movie?id=${encodeURIComponent(item.id)}`;
    if (item && type === 'episode' && item.series_id) link += `/series?id=${encodeURIComponent(item.series_id)}`;
    const meta = [item?.release_year, item?.age_rating, item?.runtime_or_episodes,
      item?.quality !== 'Unknown' ? item?.quality : ''].filter(Boolean).join(' · ');
    const episodeLabel = type === 'episode' && item?.episode_number ? ` · Ep ${item.episode_number}` : '';
    Object.assign(variables, {
      [`${prefix}_display`]: item ? 'table-row' : 'none',
      [`${prefix}_heading_display`]: entry?.heading ? 'table-row' : 'none',
      [`${prefix}_heading`]: entry?.heading || '',
      [`${prefix}_title`]: item ? escapeHtml((item.title || 'Untitled') + episodeLabel) : '',
      [`${prefix}_description`]: escapeHtml(truncate(item?.description, 120)),
      [`${prefix}_meta`]: escapeHtml(meta),
      [`${prefix}_link`]: escapeHtml(link),
      [`${prefix}_image`]: escapeHtml(image || 'https://media.base44.com/images/public/69e793d6b51b4ec30a25aa0b/dc685f361_logo.png'),
      [`${prefix}_image_display`]: image ? 'block' : 'none'
    });
  }
  return variables;
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