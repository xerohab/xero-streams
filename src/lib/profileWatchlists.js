export async function loadProfileWatchlists(entity, userId, profile) {
  if (!userId || !profile?.id) return [];
  const includeLegacy = profile.is_default && !profile.is_kids;
  const rows = await entity.filter(includeLegacy
    ? { user_id: userId }
    : { user_id: userId, profile_id: profile.id });
  return rows.filter(row => row.profile_id === profile.id || (includeLegacy && !row.profile_id));
}
