/**
 * ============================================================
 * INIT - App Start
 * ============================================================
 */

(async function() {
  // Show loading in output
  const o = document.getElementById('output');
  if (o) o.innerHTML = '<div class="dark-loading" style="color:#666; grid-column:1/-1;">Initializing feed...</div>';
  
  // Parallel fetch all priority sports
  const res = await Promise.allSettled(PRIORITY_SPORTS.map(fetchSport));
  
  res.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.length) {
      sportCache[PRIORITY_SPORTS[i]] = r.value.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    }
  });
  
  // Create allCache (main) by interleaving top 2 from each sport
  const mainItems = [];
  const activeSports = [];
  
  PRIORITY_SPORTS.forEach(s => {
    if (sportCache[s] && sportCache[s].length) {
      mainItems.push(...sportCache[s].slice(0, 5));
      if (activeSports.length < 12) activeSports.push(s);
    }
  });
  
  allCache = mainItems.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
  
  // Create tabs
  generateTabs(activeSports);
  
  // Set default view (IPL)
  setActive('ipl');
  
  // Sidebar trending
  const tr = document.getElementById('trendingList');
  if (tr && allCache.length) {
    tr.innerHTML = '';
    allCache.filter(x => x.image).slice(0, 6).forEach(a => {
      tr.appendChild(buildSidebarItem(a, EMOJI[a.sport] || '🏆'));
    });
  }
  
  // Sidebar recent
  const rc = document.getElementById('recentList');
  if (rc && allCache.length) {
    rc.innerHTML = '';
    allCache.slice(6, 11).forEach(a => {
      rc.appendChild(buildSidebarItem(a, EMOJI[a.sport] || '🏆'));
    });
  }
  
})();
