/**
 * ============================================================
 * API - All Data Fetching Functions
 * ============================================================
 */

async function loadDynamicCategories() {
  const res = await fetch(WORKER + '/api/categories');
  if (!res.ok) {
    throw new Error('categories API returned ' + res.status);
  }

  const data = await res.json();
  const categories = (data.categories || []).slice().sort(function (a, b) {
    return (a.priority || 9999) - (b.priority || 9999);
  });

  CATEGORY_ORDER = categories.map(function (category) {
    return category.sport;
  });

  CATEGORY_META = Object.assign({}, STATIC_TAB_META);
  categories.forEach(function (category) {
    CATEGORY_META[category.sport] = {
      label: category.label || category.sport,
      priority: category.priority || 9999,
      emoji: category.emoji || SPECIAL_TAB_EMOJI[category.sport] || DEFAULT_TAB_EMOJI,
      totalCount: category.totalCount || 0,
      curatedCount: category.curatedCount || 0,
      ownCount: category.ownCount || 0
    };
  });

  return categories;
}

async function fetchSport(sportKey) {
  try {
    const response = await fetch(WORKER + '/api/news?sport=' + encodeURIComponent(sportKey));
    const data = await response.json();
    let articles = (data.articles || []).map(function (article) {
      if (!article.sport) article.sport = sportKey;
      return article;
    });

    // ── IPL KEYWORD FILTER ───────────────────────────────────────────────────
    // IPL and Cricket tabs share the same RSS feeds (ESPN Cricinfo, CricTracker
    // etc.), so without this filter the IPL tab shows all cricket news.
    // This filter keeps only articles whose title or description contains an
    // IPL-specific keyword: team names, key players, or tournament terms.
    if (sportKey === 'ipl') {
      const iplRegex = /\b(ipl|csk|rcb|mi\b|kkr|srh|pbks|dc\b|rr\b|lsg|gt\b|dhoni|kohli|rohit|bumrah|hardik|chennai super kings|mumbai indians|kolkata|sunrisers|rajasthan royals|lucknow|gujarat titans|delhi capitals|punjab kings|tata ipl|indian premier league|ipl 2026|super kings)\b/i;
      articles = articles.filter(function (article) {
        const text = (article.title || '') + ' ' + (article.description || '');
        return iplRegex.test(text);
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    return articles;
  } catch (e) {
    console.error('fetchSport failed:', sportKey, e);
    return [];
  }
}

function pinnedSort(articles) {
  const now = Date.now();
  const hrs24 = 24 * 60 * 60 * 1000;
  const pinned = [];
  const rest = [];

  articles.forEach(function (article) {
    const age = now - new Date(article.pubDate).getTime();
    if (article.isOwn && age < hrs24) pinned.push(article);
    else rest.push(article);
  });

  pinned.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
  rest.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

  return pinned.concat(rest);
}

function cleanText(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
