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
  const trending = document.getElementById('trendingList');
  const recent = document.getElementById('recentList');
  const mainTitles = window._mainFeedTitles || new Set();

  trending.innerHTML = '';
  recent.innerHTML = '';

  if (!allCache.length) return;

  const sidebarPool = pinnedSort(allCache.filter(function (article) {
    return article.image && !mainTitles.has(article.title);
  }));

  sidebarPool.slice(0, 6).forEach(function (article) {
    trending.appendChild(buildSidebarItem(article, getTabMeta(article.sport).emoji));
  });

  const recentPool = pinnedSort(allCache.filter(function (article) {
    return !mainTitles.has(article.title);
  }));

  recentPool.slice(0, 5).forEach(function (article) {
    recent.appendChild(buildSidebarItem(article, getTabMeta(article.sport).emoji));
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

async function init() {
  const output = document.getElementById('output');
  let hasCachedHomepage = false;

  try {
    renderFeedSkeleton(6);
    renderSidebarSkeleton();

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
