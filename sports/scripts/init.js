/**
 * ============================================================
 * INIT - Initialization & Startup Logic
 * ============================================================
 */

function buildMainFeed(categoryKeys) {
  const queues = {};
  const seen = new Set();
  const all = [];
  let keepGoing = true;

  categoryKeys.forEach(function (categoryKey) {
    queues[categoryKey] = (sportCache[categoryKey] || []).slice();
  });

  while (keepGoing) {
    keepGoing = false;

    categoryKeys.forEach(function (categoryKey) {
      const queue = queues[categoryKey];
      if (!queue || !queue.length) return;

      keepGoing = true;
      const article = queue.shift();
      const dedupeKey = article.link || (article.title + '|' + article.pubDate);

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        all.push(article);
      }
    });
  }

  return pinnedSort(all);
}

function renderSidebar() {
  const videosContainer = document.getElementById('videosList');
  const specialsContainer = document.getElementById('specialsList');
  const mainTitles = window._mainFeedTitles || new Set();

  if (videosContainer) videosContainer.innerHTML = '';
  if (specialsContainer) specialsContainer.innerHTML = '';

  if (!allCache.length) return;

  // Extract Videos
  const videoArticles = allCache.filter(function(a) {
     return a.isVideo || (a.link && a.link.includes('youtube.com/watch')) || a.videoId;
  });
  
  let videoCount = 0;
  videoArticles.slice(0, 2).forEach(function(article) {
     if (videosContainer) videosContainer.appendChild(buildSidebarStackedCard(article, getTabMeta(article.sport).emoji, true));
     videoCount++;
     mainTitles.add(article.title);
  });
  
  const vidSection = document.getElementById('videoSection');
  if (vidSection) vidSection.style.display = videoCount > 0 ? 'block' : 'none';

  // Extract Specials (image-heavy articles not already shown)
  const specialsPool = pinnedSort(allCache.filter(function (article) {
    return article.image && !mainTitles.has(article.title);
  }));

  specialsPool.slice(0, 7).forEach(function (article) {
    if (specialsContainer) specialsContainer.appendChild(buildSidebarStackedCard(article, getTabMeta(article.sport).emoji, false));
    mainTitles.add(article.title);
  });
}

function hydrateSportCacheFromArticles(articles) {
  sportCache = {};
  (articles || []).forEach(function (article) {
    if (!article || !article.sport) return;
    if (!sportCache[article.sport]) sportCache[article.sport] = [];
    sportCache[article.sport].push(article);
  });

  Object.keys(sportCache).forEach(function (sportKey) {
    sportCache[sportKey] = pinnedSort(sportCache[sportKey]);
  });
}

function readHomepageCache() {
  try {
    const raw = localStorage.getItem(PERFORMANCE.cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.savedAt || !Array.isArray(parsed.categories) || !Array.isArray(parsed.allCache)) return null;
    if ((Date.now() - parsed.savedAt) > PERFORMANCE.cacheMaxAgeMs) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeHomepageCache(categories) {
  try {
    localStorage.setItem(PERFORMANCE.cacheKey, JSON.stringify({
      savedAt: Date.now(),
      categories: categories || [],
      allCache: allCache || []
    }));
  } catch (e) {}
}

function applyCategoryMetadata(categories) {
  CATEGORY_ORDER = (categories || []).map(function (category) {
    return category.sport;
  });

  CATEGORY_META = Object.assign({}, STATIC_TAB_META);
  (categories || []).forEach(function (category) {
    CATEGORY_META[category.sport] = {
      label: category.label || category.sport,
      priority: category.priority || 9999,
      emoji: category.emoji || SPECIAL_TAB_EMOJI[category.sport] || DEFAULT_TAB_EMOJI,
      totalCount: category.totalCount || 0,
      curatedCount: category.curatedCount || 0,
      ownCount: category.ownCount || 0
    };
  });
}

function renderCachedHomepage(cache) {
  if (!cache) return false;

  applyCategoryMetadata(cache.categories);
  allCache = pinnedSort(cache.allCache || []);
  hydrateSportCacheFromArticles(allCache);
  generateTabs(CATEGORY_ORDER);
  renderSidebar();
  setActive('main');
  return true;
}

async function loadCategoryBatch(categoryKeys) {
  const keys = (categoryKeys || []).filter(Boolean);
  if (!keys.length) return;

  const results = await Promise.allSettled(keys.map(fetchSport));
  results.forEach(function (result, index) {
    const categoryKey = keys[index];
    sportCache[categoryKey] = result.status === 'fulfilled'
      ? pinnedSort(result.value || [])
      : [];
  });
}

async function warmRemainingCategories(allCategoryKeys, loadedKeys) {
  const remainingKeys = (allCategoryKeys || []).filter(function (key) {
    return loadedKeys.indexOf(key) === -1;
  });
  if (!remainingKeys.length) return;

  await loadCategoryBatch(remainingKeys);
  allCache = buildMainFeed(allCategoryKeys);
  writeHomepageCache(CATEGORY_ORDER.map(function (key) {
    return {
      sport: key,
      label: getTabMeta(key).label,
      emoji: getTabMeta(key).emoji,
      priority: (CATEGORY_META[key] && CATEGORY_META[key].priority) || 9999
    };
  }).filter(function (category) { return category.sport !== 'main'; }));

  if (currentSport === 'main') {
    renderSidebar();
    renderNews();
  }
}

/**
 * Fetch and Render Live Scoreboard
 */
async function fetchLiveScoreboard() {
  try {
    const res = await fetch('https://ipl-live-score.ravi-kompel.workers.dev/');
    if (!res.ok) return;
    const json = await res.json();
    if (json.status === 'success' && json.data) {
       if (typeof renderScoreboardTicker === 'function') {
          renderScoreboardTicker(json.data);
       }
    }
  } catch (e) {
    console.error('Scoreboard fetch failed:', e);
  }
}

async function init() {
  const output = document.getElementById('output');
  let hasCachedHomepage = false;

  try {
    renderFeedSkeleton(6);
    renderSidebarSkeleton();
    
    // Fire off Scoreboard fetch independently
    fetchLiveScoreboard();

    const cached = readHomepageCache();
    hasCachedHomepage = renderCachedHomepage(cached);

    const categories = await loadDynamicCategories();

    if (!categories.length) {
      generateTabs([]);
      output.innerHTML = '<div style="grid-column:1/-1; padding:60px; text-align:center;">No categories available yet.</div>';
      document.getElementById('sectionLabel').innerHTML = STATIC_TAB_META.main.emoji + ' ' + STATIC_TAB_META.main.label;
      return;
    }

    const categoryKeys = categories.map(function (category) {
      return category.sport;
    });

    generateTabs(categoryKeys);

    const initialKeys = categoryKeys
      .filter(function (key) { return key !== 'net-sessions'; })
      .slice(0, PERFORMANCE.initialCategoryBatch);
    const firstBatch = initialKeys.length ? initialKeys : categoryKeys.slice(0, PERFORMANCE.initialCategoryBatch);

    await loadCategoryBatch(firstBatch);
    CATEGORY_ORDER = categoryKeys;
    allCache = buildMainFeed(firstBatch);
    writeHomepageCache(categories);
    renderSidebar();

    if (!hasCachedHomepage || currentSport === 'main') {
      currentSport = 'main';
      setActive('main');
    }

    warmRemainingCategories(categoryKeys, firstBatch).catch(function (e) {
      console.error('Background category warm-up failed:', e);
    });
  } catch (e) {
    console.error('Initialization failed:', e);
    if (!hasCachedHomepage) {
      output.innerHTML = '<div style="grid-column:1/-1; padding:60px; text-align:center;">Unable to load categories right now.</div>';
      document.getElementById('sectionLabel').innerHTML = STATIC_TAB_META.main.emoji + ' ' + STATIC_TAB_META.main.label;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
