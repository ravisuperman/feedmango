import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

// Top RSS sources for each sport
const SPORTS_FEEDS = {
  cricket: [
    'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    'https://feeds.bbci.co.uk/sport/cricket/rss.xml',
    'https://timesofindia.indiatimes.com/rss/sports/cricket.cms'
  ],
  basketball: [
    'https://feeds.bbci.co.uk/sport/basketball/rss.xml',
    'https://www.espn.com/espn/rss/nba/news',
    'https://bleacherreport.com/nba.rss'
  ],
  football: [
    'https://feeds.bbci.co.uk/sport/football/rss.xml',
    'https://www.skysports.com/rss/12040',
    'https://www.espn.com/espn/rss/soccer/news'
  ],
  tennis: [
    'https://feeds.bbci.co.uk/sport/tennis/rss.xml',
    'https://www.espn.com/espn/rss/tennis/news',
    'https://www.tennis.com/rss/news/'
  ],
  athletics: [
    'https://feeds.bbci.co.uk/sport/athletics/rss.xml',
    'https://www.espn.com/espn/rss/athletics/news',
    'https://feeds.reuters.com/reuters/sportsNews'
  ],
  baseball: [
    'https://www.espn.com/espn/rss/mlb/news',
    'https://feeds.cbssports.com/rss/sports-news/MLB/topic/everything/',
    'https://bleacherreport.com/mlb.rss'
  ]
};

async function parseFeed(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'FeedMango/1.0' } });
    const text = await res.text();
    const items = [];
    const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const block = match[1];
      const title = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() || '';
      const link = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ||
                   block.match(/href="(https?:\/\/[^"]+)"/)?.[1] || '';
      const date = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || new Date().toUTCString();
      const desc = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]
                         ?.replace(/<[^>]+>/g, '').trim().slice(0, 200) || '';
      if (title && link) items.push({ title, link, date, description: desc, source: url });
    }
    return items;
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  const results = {};

  for (const [sport, feeds] of Object.entries(SPORTS_FEEDS)) {
    const allArticles = [];
    for (const feedUrl of feeds) {
      const articles = await parseFeed(feedUrl);
      allArticles.push(...articles);
    }
    // Remove duplicates by title, keep max 30 per sport
    const seen = new Set();
    const unique = allArticles.filter(a => {
      if (seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    }).slice(0, 30);

    await kv.set('curated:' + sport, JSON.stringify(unique));
    results[sport] = unique.length + ' articles stored';
  }

  return res.status(200).json({ success: true, results, timestamp: new Date().toISOString() });
}
