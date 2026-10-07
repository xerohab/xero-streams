export function toActivityTimestamp(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function getEntityActivity(entity) {
  const timestamps = [
    toActivityTimestamp(entity.created_date),
    toActivityTimestamp(entity.content_updated_at)
  ].filter(Boolean);
  return timestamps.length > 0 ? Math.max(...timestamps) : 0;
}

export function getTopLevelMedia(franchises = [], series = [], videos = []) {
  const topLevelMap = new Map();
  
  // Add all top-level franchises
  const rootFranchises = franchises.filter(f => !f.parent_id && !f.is_adult);
  rootFranchises.forEach(f => {
     topLevelMap.set(f.id, { 
       type: 'franchise', 
       data: f, 
       latestActivityAt: getEntityActivity(f), 
       totalViews: f.views || 0, 
       items: 0 
     });
  });

  series.forEach(s => {
     let rootFId = null;
     if (s.franchise_id) {
        let fNode = franchises.find(f => f.id === s.franchise_id);
        if (fNode) {
           rootFId = fNode.id;
           while (fNode && fNode.parent_id) {
              const parent = franchises.find(p => p.id === fNode.parent_id);
              if (parent) { fNode = parent; rootFId = fNode.id; }
              else break;
           }
        }
     }
     
     const activity = getEntityActivity(s);
     if (rootFId && topLevelMap.has(rootFId)) {
        const group = topLevelMap.get(rootFId);
        group.latestActivityAt = Math.max(group.latestActivityAt, activity);
        group.totalViews += (s.views || 0);
        group.items += 1;
     } else if (!rootFId) {
        topLevelMap.set(s.id, { 
          type: 'series', 
          data: s, 
          latestActivityAt: activity, 
          totalViews: s.views || 0, 
          items: 1 
        });
     }
  });

  videos.forEach(v => {
     let targetGroup = null;
     
     if (v.franchise_id) {
        let rootFId = null;
        let fNode = franchises.find(f => f.id === v.franchise_id);
        if (fNode) {
           rootFId = fNode.id;
           while (fNode && fNode.parent_id) {
              const parent = franchises.find(p => p.id === fNode.parent_id);
              if (parent) { fNode = parent; rootFId = fNode.id; }
              else break;
           }
        }
        if (rootFId && topLevelMap.has(rootFId)) targetGroup = topLevelMap.get(rootFId);
     } else if (v.series_id) {
        const s = series.find(s => s.id === v.series_id);
        if (s && s.franchise_id) {
           let rootFId = null;
           let fNode = franchises.find(f => f.id === s.franchise_id);
           if (fNode) {
              rootFId = fNode.id;
              while (fNode && fNode.parent_id) {
                 const parent = franchises.find(p => p.id === fNode.parent_id);
                 if (parent) { fNode = parent; rootFId = fNode.id; }
                 else break;
              }
           }
           if (rootFId && topLevelMap.has(rootFId)) targetGroup = topLevelMap.get(rootFId);
        } else if (s && topLevelMap.has(s.id)) {
           targetGroup = topLevelMap.get(s.id);
        }
     }
     
     const activity = getEntityActivity(v);
     if (targetGroup) {
        targetGroup.latestActivityAt = Math.max(targetGroup.latestActivityAt, activity);
        targetGroup.totalViews += (v.views || 0);
        if (!v.series_id) targetGroup.items += 1;
     } else if (!v.series_id && !v.franchise_id) {
        topLevelMap.set(v.id, { 
          type: 'video', 
          data: v, 
          latestActivityAt: activity, 
          totalViews: v.views || 0 
        });
     }
  });

  // Include inherited sub-collection and episode activity without changing title counts.
  topLevelMap.forEach((group) => {
    group.latestActivityAt = Math.max(group.latestActivityAt, getItemActivityAt(group.data, franchises, series, videos));
  });
  return Array.from(topLevelMap.values());
}

export function getItemActivityAt(item, franchises = [], series = [], videos = [], seen = new Set()) {
  if (!item || seen.has(item.id)) return 0;
  seen.add(item.id);
  let latest = getEntityActivity(item);
  // Identify membership by the actual hierarchy, never by optional cast/artwork fields.
  if (franchises.some((f) => f.id === item.id)) {
    const members = series.filter((s) => s.franchise_id === item.id);
    const memberIds = new Set(members.map((s) => s.id));
    const children = [
      ...members,
      ...videos.filter((v) => v.franchise_id === item.id || memberIds.has(v.series_id)),
      ...franchises.filter((f) => f.parent_id === item.id),
    ];
    children.forEach((child) => { latest = Math.max(latest, getItemActivityAt(child, franchises, series, videos, seen)); });
  } else if (series.some((s) => s.id === item.id)) {
    videos.filter((v) => v.series_id === item.id).forEach((child) => { latest = Math.max(latest, getEntityActivity(child)); });
  }
  return latest;
}

// Same complete hierarchy is used for Home, Movies and TV discovery.
export function getCatalogMedia(franchises, series, videos, type) {
  const groups = getTopLevelMedia(franchises, series, videos);
  if (!type) return groups.filter((g) => g.type !== "franchise" || g.items > 0);
  const members = type === "series" ? series : videos.filter((v) => !v.series_id);
  const collectionIds = new Set();
  members.forEach((member) => {
    let node = franchises.find((f) => f.id === member.franchise_id);
    const seen = new Set();
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      collectionIds.add(node.id);
      node = franchises.find((f) => f.id === node.parent_id);
    }
  });
  return groups.filter((g) => g.type === type || (g.type === "franchise" && collectionIds.has(g.data.id)));
}

export function isRecentlyUpdated(activityTimestamp) {
  if (!activityTimestamp) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return activityTimestamp >= sevenDaysAgo.getTime();
}