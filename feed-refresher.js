/*
 * SPORTSrip Feed Refresher
 * ========================
 * Standalone module that can be incorporated into the worker
 * or called independently to flush + fetch + curate all sports.
 *
 * Usage in worker.js scheduled handler:
 *   import { runFullRefresh } from './feed-refresher.js';
 *   ctx.waitUntil(runFullRefresh(env));
 *
 * Or call individual functions as needed.
 *
 * Verified working feeds as of 28-Mar-2026.
 */

// ── All verified working RSS feeds ──────────────────────────
const VERIFIED_FEEDS = {
  ipl: [
    { name: 'ESPN Cricinfo',       url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml' },
    { name: 'CricTracker',         url: 'https://crictracker.com/feed' },
    { name: 'Hindustan Times IPL', url: 'https://www.hindustantimes.com/feeds/rss/cricket/ipl/rssfeed.xml' }
  ],
  cricket: [
    { name: 'ESPN Cricinfo',       url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml' },
    { name: 'BBC Cricket',         url: 'https://feeds.bbci.co.uk/sport/cricket/rss.xml' },
    { name: 'Sky Sports Cricket',  url: 'https://www.skysports.com/rss/12040' },
    { name: 'CricTracker',         url: 'https://crictracker.com/feed' }
  ],
  football: [
    { name: 'BBC Football',        url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
    { name: 'ESPN Soccer',         url: 'https://www.espn.com/espn/rss/soccer/news' },
    { name: 'Sky Sports Football', url: 'https://www.skysports.com/rss/12040' }
  ],
  f1: [
    { name: 'BBC F1',              url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml' },
    { name: 'ESPN F1',             url: 'https://www.espn.com/espn/rss/rpm/news' },
    { name: 'Autosport',           url: 'https://www.autosport.com/rss/feed/all' },
    { name: 'RaceFans',            url: 'https://www.racefans.net/feed/' }
  ],
  basketball: [
    { name: 'ESPN NBA',            url: 'https://www.espn.com/espn/rss/nba/news' },
    { name: 'BBC Basketball',      url: 'https://feeds.bbci.co.uk/sport/basketball/rss.xml' }
  ],
  tennis: [
    { name: 'BBC Tennis',          url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml' },
    { name: 'ESPN Tennis',         url: 'https://www.espn.com/espn/rss/tennis/news' }
  ],
  nfl: [
    { name: 'ESPN NFL',            url: 'https://www.espn.com/espn/rss/nfl/news' },
    { name: 'BBC NFL',             url: 'https://feeds.bbci.co.uk/sport/american-football/rss.xml' }
  ],
  golf: [
    { name: 'BBC Golf',            url: 'https://feeds.bbci.co.uk/sport/golf/rss.xml' },
    { name: 'ESPN Golf',           url: 'https://www.espn.com/espn/rss/golf/news' }
  ],
  boxing: [
    { name: 'BBC Boxing',          url: 'https://feeds.bbci.co.uk/sport/boxing/rss.xml' },
    { name: 'ESPN Boxing',         url: 'https://www.espn.com/espn/rss/boxing/news' }
  ],
  kabaddi: [
    { name: 'ESPN Kabaddi',        url: 'https://www.espn.in/espn/rss/kabaddi/news' }
  ],
  badminton: [
    { name: 'ESPN Badminton',      url: 'https://www.espn.in/espn/rss/badminton/news' }
  ],
  baseball: [
    { name: 'ESPN MLB',            url: 'https://www.espn.com/espn/rss/mlb/news' },
    { name: 'MLB.com',             url: 'https://www.mlb.com/feeds/news/rss.xml' }
  ],
  athletics: [
    { name: 'BBC Athletics',       url: 'https://feeds.bbci.co.uk/sport/athletics/rss.xml' }
  ],
  rugby: [
    { name: 'BBC Rugby',           url: 'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml' }
  ],
  olympics: [
    { name: 'ESPN Olympics',       url: 'https://www.espn.com/espn/rss/oly/news' }
  ]
};

// ── RSS Parsing helpers ──────────────────────────────────────
function extractTag(xml, tag) {
  const cr = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const pl = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(cr) || xml.match(pl);
  return m ? m[1].trim() : null;
}
function stripHtml(s) { return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function cleanText(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();
}

function parseRSS(xml, sourceName, sport) {
  const articles = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const it = m[1];
    const title = extractTag(it, 'title');
    const link  = extractTag(it, 'link');
    const pub   = extractTag(it, 'pubDate');
    const desc  = extractTag(it, 'description');
    // Image extraction — media:content, media:thumbnail, enclosure, inline img
    let img = null;
    const mm    = it.match(/media:content[^>]+url=["']([^"']+)["']/i);
    const thumb = it.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i);
    const iid   = desc && desc.match(/<img[^>]+src=["']([^"']+)["']/i);
    const encTag = it.match(/<enclosure[^>]*>/i);
    let enc = null;
    if (encTag && encTag[0].toLowerCase().includes('image')) {
      const em = encTag[0].match(/url=["']([^"']+)["']/i);
      if (em) enc = em[1];
    }
    if (mm) img = mm[1];
    else if (thumb) img = thumb[1];
    else if (enc) img = enc;
    else if (iid) img = iid[1];

    if (!title || !link) continue;
    const published = pub ? new Date(pub) : new Date();
    // Skip articles older than 72 hours
    if ((Date.now() - published.getTime()) / 3600000 > 72) continue;
    // Sky Sports: skip non-cricket articles on cricket feeds
    if (sourceName === 'Sky Sports Cricket' && !link.toLowerCase().includes('cricket')) continue;

    articles.push({
      title: cleanText(title),
      link: link.trim(),
      pubDate: published.toISOString(),
      description: cleanText(stripHtml(desc || '')),
      image: img,
      source: sourceName,
      sport
    });
  }
  return articles;
}

// ── Fetch a single RSS feed ──────────────────────────────────
async function fetchFeed(feed, sport) {
  try {
    const r = await fetch(feed.url, {
      headers: { 'User-Agent': 'MangoSports/1.0' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return parseRSS(await r.text(), feed.name, sport);
  } catch (e) {
    console.error(`Feed failed [${feed.name}]: ${e.message}`);
    return [];
  }
}

// ── Fetch all feeds for one sport ───────────────────────────
async function fetchSport(sport, env, limit = 50) {
  const feeds = VERIFIED_FEEDS[sport];
  if (!feeds || !feeds.length) return;

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(feeds.map(f => fetchFeed(f, sport)));

  // Fair-share: take top 5 from each feed first, then fill remaining
  let fairShare = [];
  let overflow  = [];
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value.length) {
      const sorted = r.value.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      fairShare = fairShare.concat(sorted.slice(0, 5));
      overflow  = overflow.concat(sorted.slice(5));
    }
  });

  // Fill up to limit
  const cap = Math.min(limit, 50);
  if (fairShare.length > cap) fairShare = fairShare.slice(0, cap);
  const missing = cap - fairShare.length;
  if (missing > 0) {
    overflow.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    fairShare = fairShare.concat(overflow.slice(0, missing));
  }

  // Sort final list newest first, deduplicate by link
  fairShare.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const seen = new Set();
  const unique = fairShare.filter(a => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  // Save to NEWS_KV (raw) — expires in 2 hours
  await env.NEWS_KV.put('raw:' + sport, JSON.stringify(unique), { expirationTtl: 7200 });
  return unique.length;
}

// ── Curate one sport (raw → curated, NO stale merging) ──────
async function curateSport(sport, env) {
  const raw = await env.NEWS_KV.get('raw:' + sport);
  if (!raw) return 0;

  let articles = JSON.parse(raw);
  articles.forEach(a => a.sport = sport);

  // Prefer articles with images but include all
  const withImg = articles.filter(a => !!a.image);
  const noImg   = articles.filter(a => !a.image);
  const combined = withImg.concat(noImg);

  // Deduplicate by link
  const seen   = new Set();
  const unique = combined.filter(a => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const cap = unique.slice(0, 150);

  // Save to CURATED_KV — expires in 2 hours
  if (cap.length > 0) {
    await env.CURATED_KV.put('curated:' + sport, JSON.stringify(cap), { expirationTtl: 7200 });
  }
  return cap.length;
}

// ── Flush stale KV for one sport ────────────────────────────
async function flushSport(sport, env) {
  await env.NEWS_KV.delete('raw:' + sport);
  await env.CURATED_KV.delete('curated:' + sport);
}

// ── Full refresh — flush + fetch + curate all sports ─────────
export async function runFullRefresh(env, sports = null) {
  const targets = sports || Object.keys(VERIFIED_FEEDS);
  const results = {};

  for (const sport of targets) {
    try {
      await flushSport(sport, env);
      const fetched  = await fetchSport(sport, env);
      const curated  = await curateSport(sport, env);
      results[sport] = { fetched, curated, ok: true };
    } catch (e) {
      results[sport] = { ok: false, error: e.message };
    }
  }
  return results;
}

// ── Export individual functions for flexible use ─────────────
export { fetchSport, curateSport, flushSport, VERIFIED_FEEDS };
