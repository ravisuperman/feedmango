/**
 * ============================================================
 * INIT - Initialization & Startup Logic
 * ============================================================
 */

/**
 * Main initialization function
 * Optimized: Load priority sports first, lazy load rest
 */
async function init() {
// Modified for Testing:
const [_, priorityResults] = await Promise.all([
    // loadDynamicSports(), // We are skipping the dynamic load for this test
    Promise.resolve(),      // This is a placeholder so the code doesn't break
    Promise.allSettled(PRIORITY_FIRST.map(fetchSport)) 
]);

  // Render priority sports immediately
  const sa = {};
  priorityResults.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.length) {
      sportCache[PRIORITY_FIRST[i]] = pinnedSort(r.value);
      sa[PRIORITY_FIRST[i]] = sportCache[PRIORITY_FIRST[i]].slice();
    }
  });

  const active = [];
  for (const s of PRIORITY_SPORTS) {
    if (sportCache[s] && sportCache[s].length && active.length < 10) {
      active.push(s);
    }
  }

  // Build allCache from priority sports first
  const all = [];
  const seen = new Set();
  let keep = true;
  
  while (keep) {
    keep = false;
    active.forEach(sk => {
      if (sa[sk] && sa[sk].length) {
        keep = true;
        const a = sa[sk].shift();
        if (!seen.has(a.link)) {
          seen.add(a.link);
          all.push(a);
        }
      }
    });
  }

  allCache = pinnedSort(all);
  generateTabs(active);

  // Show sidebar immediately
  if (allCache.length) {
    const tr = document.getElementById('trendingList');
    tr.innerHTML = '';
    const mainTitles = window._mainFeedTitles || new Set();
    const sidebarPool = pinnedSort(allCache.filter(x => x.image && !mainTitles.has(x.title)));
    sidebarPool.slice(0, 6).forEach(a => {
      tr.appendChild(buildSidebarItem(a, EMOJI[a.sport] || '🏆'));
    });
    
    const rc = document.getElementById('recentList');
    rc.innerHTML = '';
    const recentPool = pinnedSort(allCache.filter(x => !mainTitles.has(x.title)));
    recentPool.slice(6, 11).forEach(a => {
      rc.appendChild(buildSidebarItem(a, EMOJI[a.sport] || '🏆'));
    });
  }

  // Show IPL immediately
  setActive('ipl');

  // Lazy load remaining sports in background
  setTimeout(async function() {
    const restSports = PRIORITY_REST.filter(s => !sportCache[s]);
    if (restSports.length === 0) return;
    
    const restResults = await Promise.allSettled(restSports.map(fetchSport));
    restResults.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.length) {
        sportCache[restSports[i]] = pinnedSort(r.value);
      }
    });
    
    // Regenerate tabs with all sports now loaded
    const allActive = [];
    for (const s of PRIORITY_SPORTS) {
      if (sportCache[s] && sportCache[s].length && allActive.length < 10) {
        allActive.push(s);
      }
    }
    generateTabs(allActive);
  }, 100); // 100ms delay - after first render
}

/**
 * Start the app when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
