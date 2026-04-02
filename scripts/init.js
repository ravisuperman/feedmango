/**
 * ============================================================
 * INIT - Initialization & Startup Logic
 * ============================================================
 */

/**
 * Main initialization function
 * Phase 1: Load priority sports immediately
 * Phase 2: Lazy-load remaining sports in background (100ms delay)
 */
async function init() {
  // Load dynamic sports list from control panel first
  // Falls back to PRIORITY_SPORTS_FALLBACK automatically if it fails
  const [_, priorityResults] = await Promise.all([
    loadDynamicSports(),                              // ← Re-enabled (was commented out during testing)
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

  // Build allCache using round-robin interleaving across sports
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

  // Show IPL tab by default
  setActive('ipl');

  // Lazy load remaining sports in background (100ms — after first render)
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
  }, 100);
}

/**
 * Start the app when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
