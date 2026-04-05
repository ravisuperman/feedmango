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

async function init() {
  const output = document.getElementById('output');

  try {
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

    const results = await Promise.allSettled(categoryKeys.map(fetchSport));

    results.forEach(function (result, index) {
      const categoryKey = categoryKeys[index];
      if (result.status !== 'fulfilled') {
        sportCache[categoryKey] = [];
        return;
      }

      sportCache[categoryKey] = pinnedSort(result.value || []);
    });

    CATEGORY_ORDER = categoryKeys;
    allCache = buildMainFeed(categoryKeys);

    generateTabs(categoryKeys);
    renderSidebar();
    setActive('main');
  } catch (e) {
    console.error('Initialization failed:', e);
    output.innerHTML = '<div style="grid-column:1/-1; padding:60px; text-align:center;">Unable to load categories right now.</div>';
    document.getElementById('sectionLabel').innerHTML = STATIC_TAB_META.main.emoji + ' ' + STATIC_TAB_META.main.label;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
