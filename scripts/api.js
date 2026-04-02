/**
 * ============================================================
 * API - All Data Fetching Functions
 * ============================================================
 */

/**
 * Load dynamic sports list from control panel
 * Called on startup — falls back to PRIORITY_SPORTS_FALLBACK if it fails
 */
async function loadDynamicSports() {
  try {
    const res = await fetch(WORKER + '/api/feeds');
    if (!res.ok) throw new Error('feeds API returned ' + res.status);
    const data = await res.json();
    const feeds = data.feeds || [];
    if (feeds.length === 0) return;

    // Build unique sport list in priority order
    const seen = new Set();
    const sports = [];
    const labels = { main: 'Top Stories' };

    feeds.forEach(f => {
      if (!seen.has(f.sport)) {
        seen.add(f.sport);
        sports.push(f.sport);
        labels[f.sport] = f.label || f.sport;
      }
    });

    PRIORITY_SPORTS = sports;
    LABEL = labels;
  } catch (e) {
    console.warn('Dynamic sports load failed, using fallback:', e.message);
  }
}

/**
 * Fetch articles for a specific sport
 */
async function fetchSport(s) {
  try {
    const r = await fetch(WORKER + '/api/news?sport=' + s);
    const d = await r.json();
    let a = d.articles || [];

    // IPL keyword filtering — keeps only IPL-relevant articles
    if (s === 'ipl') {
      const re = /\b(ipl|csk|rcb|mi|kkr|srh|pbks|dc|rr|lsg|gt|dhoni|kohli|rohit|chennai|mumbai|tata|league|cricket|duckett)\b/i;
      a = a.filter(x => re.test((x.title + " " + (x.description || "")).toLowerCase()));
    }

    a.forEach(x => { if (!x.sport) x.sport = s; });
    return a;
  } catch (e) {
    console.error('fetchSport failed:', s, e);
    return [];
  }
}

/**
 * Sort articles — own articles < 24hrs always pinned to top
 */
function pinnedSort(articles) {
  const now = Date.now();
  const hrs24 = 24 * 60 * 60 * 1000;
  const pinned = [];
  const rest = [];

  articles.forEach(a => {
    const age = now - new Date(a.pubDate).getTime();
    if (a.isOwn && age < hrs24) {
      pinned.push(a);
    } else {
      rest.push(a);
    }
  });

  pinned.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  rest.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  return pinned.concat(rest);
}

/**
 * Clean HTML text (DOM-based, safe)
 */
function cleanText(h) {
  if (!h) return "";
  const d = document.createElement('div');
  d.innerHTML = h;
  return d.textContent || d.innerText || "";
}
