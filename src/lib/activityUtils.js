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

  return Array.from(topLevelMap.values());
}

export function getItemActivityAt(item, franchises = [], series = [], videos = []) {
  let latest = getEntityActivity(item);
  
  if (item.cover_image && !item.cast) {
     // Franchise
     const mySeries = series.filter(s => s.franchise_id === item.id);
     const myVideos = videos.filter(v => v.franchise_id === item.id || (v.series_id && mySeries.some(s => s.id === v.series_id)));
     [...mySeries, ...myVideos].forEach(child => {
       const childAct = getEntityActivity(child);
       if (childAct > latest) latest = childAct;
     });
     // Also check child franchises
     const childFranchises = franchises.filter(f => f.parent_id === item.id);
     childFranchises.forEach(child => {
        const childAct = getItemActivityAt(child, franchises, series, videos);
        if (childAct > latest) latest = childAct;
     });
  } else if (item.cover_image && item.cast) {
     // Series
     const myVideos = videos.filter(v => v.series_id === item.id);
     myVideos.forEach(child => {
       const childAct = getEntityActivity(child);
       if (childAct > latest) latest = childAct;
     });
  }
  
  return latest;
}

export function isRecentlyUpdated(activityTimestamp) {
  if (!activityTimestamp) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return activityTimestamp >= sevenDaysAgo.getTime();
}