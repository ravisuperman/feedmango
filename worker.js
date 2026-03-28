/*
 * Mango Sports Worker — Production Server
 * Cron 1: Fetch raw RSS → NEWS_KV
 * Cron 2: Add OG images → CURATED_KV
 * Admin: Discover RSS → Process & Save → MY_NEWS_KV
 *
 * Change log:
 * 27-Mar-2026 — Added Google sitemap + robots.txt routes
 * 27-Mar-2026 — Added /api/news merge: own articles always on top
 * 27-Mar-2026 — Added /api/publish-own, /api/own-articles, /api/delete-own
 * 27-Mar-2026 — Added admin password helper (isAdmin)
 * 27-Mar-2026 — Added x-admin-pass to CORS headers
 * 27-Mar-2026 — Added dynamic feeds from CONTROL_PANEL_KV
 * 27-Mar-2026 — Added /api/feeds GET, POST, DELETE routes
 * 27-Mar-2026 — Added /api/preload-feeds to seed KV from hardcoded list
 * 27-Mar-2026 — Added /api/test-feed to validate RSS URLs
 * 27-Mar-2026 — Added secret key protection for /admin page
 */

// ============================================================
// BLOCK START: Hardcoded SPORTS — Fallback Only
// Added  : 27-Mar-2026
// Purpose: This object is ONLY used as a fallback when
//          CONTROL_PANEL_KV has no feeds saved yet.
//          Once feeds are saved to KV via admin panel,
//          this object is ignored completely.
//          DO NOT remove — keeps site working if KV is empty.
// ============================================================
var SPORTS_FALLBACK = {
  ipl:        { label:'IPL',        feeds:[{name:'ESPN Cricinfo',url:'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'},{name:'CricTracker',url:'https://crictracker.com/feed'},{name:'Hindustan Times',url:'https://www.hindustantimes.com/feeds/rss/cricket/ipl/rssfeed.xml'},{name:'Times of India',url:'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms'}]},
  f1:         { label:'Formula 1',  feeds:[{name:'BBC F1',url:'https://feeds.bbci.co.uk/sport/formula1/rss.xml'},{name:'ESPN Autos',url:'https://www.espn.com/espn/rss/rpm/news'}]},
  cricket:    { label:'Cricket',    feeds:[{name:'ESPN Cricinfo',url:'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'},{name:'CricTracker',url:'https://crictracker.com/feed'},{name:'BBC Cricket',url:'https://feeds.bbci.co.uk/sport/cricket/rss.xml'}]},
  basketball: { label:'Basketball', feeds:[{name:'ESPN NBA',url:'https://www.espn.com/espn/rss/nba/news'},{name:'BBC Basketball',url:'https://feeds.bbci.co.uk/sport/basketball/rss.xml'}]},
  baseball:   { label:'Baseball',   feeds:[{name:'ESPN Baseball',url:'https://www.espn.com/espn/rss/mlb/news'}]},
  football:   { label:'Football',   feeds:[{name:'BBC Football',url:'https://feeds.bbci.co.uk/sport/football/rss.xml'},{name:'ESPN Soccer',url:'https://www.espn.com/espn/rss/soccer/news'}]},
  tennis:     { label:'Tennis',     feeds:[{name:'BBC Tennis',url:'https://feeds.bbci.co.uk/sport/tennis/rss.xml'},{name:'ESPN Tennis',url:'https://www.espn.com/espn/rss/tennis/news'}]},
  kabaddi:    { label:'Kabaddi',    feeds:[{name:'ESPN Kabaddi',url:'https://www.espn.in/espn/rss/kabaddi/news'},{name:'HT Sports',url:'https://www.hindustantimes.com/feeds/rss/sports'}]},
  boxing:     { label:'Boxing',     feeds:[{name:'ESPN Boxing',url:'https://www.espn.com/espn/rss/boxing/news'},{name:'BBC Boxing',url:'https://feeds.bbci.co.uk/sport/boxing/rss.xml'}]},
  golf:       { label:'Golf',       feeds:[{name:'ESPN Golf',url:'https://www.espn.com/espn/rss/golf/news'},{name:'BBC Golf',url:'https://feeds.bbci.co.uk/sport/golf/rss.xml'}]},
  athletics:  { label:'Athletics',  feeds:[{name:'BBC Athletics',url:'https://feeds.bbci.co.uk/sport/athletics/rss.xml'}]},
  rugby:      { label:'Rugby',      feeds:[{name:'BBC Rugby',url:'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml'}]},
  olympics:   { label:'Olympics',   feeds:[{name:'ESPN Olympics',url:'https://www.espn.com/espn/rss/oly/news'}]},
  nfl:        { label:'NFL',        feeds:[{name:'ESPN NFL',url:'https://www.espn.com/espn/rss/nfl/news'}]},
  badminton:  { label:'Badminton',  feeds:[{name:'ESPN Badminton',url:'https://www.espn.in/espn/rss/badminton/news'},{name:'SportsAdda',url:'https://www.sportsadda.com/rss/badminton/news'}]},
  videos:     { label:'Videos',     feeds:[{name:'ESPNcricinfo',url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCujuVKmt_utAQZJghxlRMIQ'}]}
};
// BLOCK END: Hardcoded SPORTS — Fallback Only (27-Mar-2026)
// ============================================================

// ============================================================
// BLOCK START: Preloaded Feeds Data
// Added  : 27-Mar-2026
// Purpose: All 28 feeds extracted from SPORTS_FALLBACK with
//          priorities assigned in order of appearance.
//          Used by /api/preload-feeds to seed CONTROL_PANEL_KV.
//          Run once from admin panel — never needs to run again.
// ============================================================
var PRELOADED_FEEDS = [
  {sport:'ipl',       label:'IPL',        priority:1, name:'ESPN Cricinfo',       url:'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'},
  {sport:'ipl',       label:'IPL',        priority:2, name:'CricTracker',          url:'https://crictracker.com/feed'},
  {sport:'ipl',       label:'IPL',        priority:3, name:'Hindustan Times IPL',  url:'https://www.hindustantimes.com/feeds/rss/cricket/ipl/rssfeed.xml'},
  {sport:'cricket',   label:'Cricket',    priority:1, name:'ESPN Cricinfo',        url:'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'},
  {sport:'cricket',   label:'Cricket',    priority:2, name:'BBC Cricket',          url:'https://feeds.bbci.co.uk/sport/cricket/rss.xml'},
  {sport:'cricket',   label:'Cricket',    priority:3, name:'Sky Sports Cricket',   url:'https://www.skysports.com/rss/12040'},
  {sport:'cricket',   label:'Cricket',    priority:4, name:'CricTracker',          url:'https://crictracker.com/feed'},
  {sport:'football',  label:'Football',   priority:1, name:'BBC Football',         url:'https://feeds.bbci.co.uk/sport/football/rss.xml'},
  {sport:'football',  label:'Football',   priority:2, name:'ESPN Soccer',          url:'https://www.espn.com/espn/rss/soccer/news'},
  {sport:'football',  label:'Football',   priority:3, name:'Sky Sports Football',  url:'https://www.skysports.com/rss/12040'},
  {sport:'f1',        label:'Formula 1',  priority:1, name:'BBC F1',               url:'https://feeds.bbci.co.uk/sport/formula1/rss.xml'},
  {sport:'f1',        label:'Formula 1',  priority:2, name:'ESPN F1',              url:'https://www.espn.com/espn/rss/rpm/news'},
  {sport:'f1',        label:'Formula 1',  priority:3, name:'Autosport',            url:'https://www.autosport.com/rss/feed/all'},
  {sport:'f1',        label:'Formula 1',  priority:4, name:'RaceFans',             url:'https://www.racefans.net/feed/'},
  {sport:'basketball',label:'Basketball', priority:1, name:'ESPN NBA',             url:'https://www.espn.com/espn/rss/nba/news'},
  {sport:'basketball',label:'Basketball', priority:2, name:'BBC Basketball',       url:'https://feeds.bbci.co.uk/sport/basketball/rss.xml'},
  {sport:'tennis',    label:'Tennis',     priority:1, name:'BBC Tennis',           url:'https://feeds.bbci.co.uk/sport/tennis/rss.xml'},
  {sport:'tennis',    label:'Tennis',     priority:2, name:'ESPN Tennis',          url:'https://www.espn.com/espn/rss/tennis/news'},
  {sport:'nfl',       label:'NFL',        priority:1, name:'ESPN NFL',             url:'https://www.espn.com/espn/rss/nfl/news'},
  {sport:'nfl',       label:'NFL',        priority:2, name:'BBC NFL',              url:'https://feeds.bbci.co.uk/sport/american-football/rss.xml'},
  {sport:'golf',      label:'Golf',       priority:1, name:'BBC Golf',             url:'https://feeds.bbci.co.uk/sport/golf/rss.xml'},
  {sport:'golf',      label:'Golf',       priority:2, name:'ESPN Golf',            url:'https://www.espn.com/espn/rss/golf/news'},
  {sport:'boxing',    label:'Boxing',     priority:1, name:'BBC Boxing',           url:'https://feeds.bbci.co.uk/sport/boxing/rss.xml'},
  {sport:'boxing',    label:'Boxing',     priority:2, name:'ESPN Boxing',          url:'https://www.espn.com/espn/rss/boxing/news'},
  {sport:'kabaddi',   label:'Kabaddi',    priority:1, name:'ESPN Kabaddi',         url:'https://www.espn.in/espn/rss/kabaddi/news'},
  {sport:'badminton', label:'Badminton',  priority:1, name:'ESPN Badminton',       url:'https://www.espn.in/espn/rss/badminton/news'},
  {sport:'baseball',  label:'Baseball',   priority:1, name:'ESPN MLB',             url:'https://www.espn.com/espn/rss/mlb/news'},
  {sport:'baseball',  label:'Baseball',   priority:2, name:'MLB.com',              url:'https://www.mlb.com/feeds/news/rss.xml'},
  {sport:'athletics', label:'Athletics',  priority:1, name:'BBC Athletics',        url:'https://feeds.bbci.co.uk/sport/athletics/rss.xml'},
  {sport:'rugby',     label:'Rugby',      priority:1, name:'BBC Rugby',            url:'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml'},
  {sport:'olympics',  label:'Olympics',   priority:1, name:'ESPN Olympics',        url:'https://www.espn.com/espn/rss/oly/news'}
];
// BLOCK END: Preloaded Feeds Data (27-Mar-2026)
// ============================================================

// ============================================================
// BLOCK START: buildSportsFromKV — Dynamic SPORTS builder
// Added  : 27-Mar-2026
// Purpose: Reads feeds from CONTROL_PANEL_KV and builds a SPORTS
//          object identical in structure to SPORTS_FALLBACK.
//          Feeds sorted by priority (1=highest) within each sport.
//          Falls back to SPORTS_FALLBACK if KV is empty.
// ============================================================
async function buildSportsFromKV(env) {
  try {
    var raw = await env.CONTROL_PANEL_KV.get('feeds_config');
    if (!raw) return SPORTS_FALLBACK;
    var feeds = JSON.parse(raw);
    if (!feeds || feeds.length === 0) return SPORTS_FALLBACK;

    var sports = {};
    // Sort all feeds by priority first
    feeds.sort(function(a, b) { return a.priority - b.priority; });
    feeds.forEach(function(f) {
      if (!sports[f.sport]) {
        sports[f.sport] = { label: f.label, feeds: [] };
      }
      sports[f.sport].feeds.push({ name: f.name, url: f.url });
    });
    return sports;
  } catch(e) {
    console.error('buildSportsFromKV failed, using fallback:', e.message);
    return SPORTS_FALLBACK;
  }
}
// BLOCK END: buildSportsFromKV (27-Mar-2026)
// ============================================================

function extractTag(xml, tag) {
  var cr = new RegExp('<'+tag+'[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/'+tag+'>','i');
  var pl = new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)<\\/'+tag+'>','i');
  var m = xml.match(cr)||xml.match(pl); return m?m[1].trim():null;
}
function stripHtml(s){return s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function cleanText(s){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();}

function parseRSS(xml, sourceName) {
  var articles=[], re=/<item>([\s\S]*?)<\/item>/g, m;
  while((m=re.exec(xml))!==null){
    var it=m[1];
    var title=extractTag(it,'title'), link=extractTag(it,'link'), pub=extractTag(it,'pubDate'), desc=extractTag(it,'description');
    var img=null;
    var mm=it.match(/media:content[^>]+url=["']([^"']+)["']/i);
    var iid=desc&&desc.match(/<img[^>]+src=["']([^"']+)["']/i);
    var enc=null, encTag=it.match(/<enclosure[^>]*>/i);
    if(encTag&&encTag[0].toLowerCase().includes('image')){
      var encMatch=encTag[0].match(/url=["']([^"']+)["']/i);
      if(encMatch)enc=encMatch;
    }
    // Also check media:thumbnail and og:image
    var thumb=it.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i);
    if(mm)img=mm[1]; else if(thumb)img=thumb[1]; else if(enc)img=enc[1]; else if(iid)img=iid[1];
    if(!title||!link)continue;
    var published=pub?new Date(pub):new Date();
    if((Date.now()-published.getTime())/3600000>72)continue;
    if(sourceName==='Sky Sports Cricket'&&!link.toLowerCase().includes('cricket'))continue;
    articles.push({title:cleanText(title),link:link.trim(),pubDate:published.toISOString(),description:cleanText(stripHtml(desc||'')),image:img,source:sourceName});
  }
  return articles;
}


// ============================================================
// BLOCK START: parseYouTubeRSS — YouTube Atom feed parser
// Added  : 27-Mar-2026
// Purpose: YouTube feeds use Atom format with <entry> tags
//          instead of <item>. Extracts video ID for embedding.
//          Thumbnail from YouTube's image CDN.
// ============================================================
function parseYouTubeRSS(xml, sourceName) {
  var articles = [], re = /<entry>([\s\S]*?)<\/entry>/g, m;
  while((m = re.exec(xml)) !== null) {
    var it = m[1];
    var title = extractTag(it, 'title');
    var videoId = null;
    var vidMatch = it.match(/video_id>([^<]+)/i) || it.match(/yt:videoId>([^<]+)/i) || it.match(/watch\?v=([a-zA-Z0-9_-]+)/);
    if(vidMatch) videoId = vidMatch[1].trim();
    var link = videoId ? 'https://www.youtube.com/watch?v=' + videoId : null;
    var pub = extractTag(it, 'published') || extractTag(it, 'updated');
    var img = videoId ? 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg' : null;
    if(!title || !link || !videoId) continue;
    var published = pub ? new Date(pub) : new Date();
    if((Date.now() - published.getTime()) / 3600000 > 168) continue; // 7 days for videos
    articles.push({
      title: cleanText(title),
      link: link,
      pubDate: published.toISOString(),
      description: '',
      image: img,
      source: sourceName,
      isVideo: true,
      videoId: videoId
    });
  }
  return articles;
}
// BLOCK END: parseYouTubeRSS (27-Mar-2026)
// ============================================================

async function fetchFeed(feed){
  try{
    var r=await fetch(feed.url,{headers:{'User-Agent':'MangoSports/1.0'},signal:AbortSignal.timeout(6000)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    var text=await r.text();
    // Use YouTube parser for YouTube feeds
    if(feed.url.includes('youtube.com/feeds')) return parseYouTubeRSS(text,feed.name);
    return parseRSS(text,feed.name);
  }catch(e){console.error('Feed failed:'+feed.name+':'+e.message);return[];}
}

async function fetchRawSport(sportKey,sportObj,env,overrideLimit){
  if(!sportObj)return;
  var limit=parseInt(overrideLimit);
  if(isNaN(limit)||limit<=0)limit=50;
  if(limit>50)limit=50;
  var results=await Promise.allSettled(sportObj.feeds.map(function(f){return fetchFeed(f);}));
  var all=[],fairShare=[];
  results.forEach(function(r){
    if(r.status==='fulfilled'){
      var src=r.value.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});
      fairShare=fairShare.concat(src.slice(0,5));
      all=all.concat(src.slice(5));
    }
  });
  if(fairShare.length>limit)fairShare=fairShare.slice(0,limit);
  var missing=limit-fairShare.length;
  if(missing>0){all.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});fairShare=fairShare.concat(all.slice(0,missing));}
  fairShare.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});
  fairShare.forEach(function(a){a.sport=sportKey;});
  await env.NEWS_KV.put('raw:'+sportKey,JSON.stringify(fairShare),{expirationTtl:3600});
}

async function curateSport(sportKey,env){
  var raw=await env.NEWS_KV.get('raw:'+sportKey); if(!raw)return;
  var articles=JSON.parse(raw);
  articles.forEach(function(a){a.sport=sportKey;});
  // FIXED: Use only fresh raw articles — no merging with old KV
  // This ensures newest articles always appear, not buried under stale ones
  var withImg=articles.filter(function(a){return !!a.image;});
  var noImg=articles.filter(function(a){return !a.image;});
  // Prefer articles with images, pad with no-image ones
  var combined=withImg.concat(noImg);
  var unique=[],seen=new Set();
  combined.forEach(function(a){if(!seen.has(a.link)){seen.add(a.link);unique.push(a);}});
  unique.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});
  var cap=unique.slice(0,150);
  if(cap.length>0)await env.CURATED_KV.put('curated:'+sportKey,JSON.stringify(cap),{expirationTtl:7200});
}

var cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,x-admin-pass',
  'Content-Type':'application/json'
};

// ============================================================
// BLOCK START: Admin Password Helper
// Added  : 27-Mar-2026
// Purpose: Checks x-admin-pass header on all admin routes.
//          Change ADMIN_PASS to your own private password.
// ============================================================
var ADMIN_PASS = 'sportsrip2026';
function isAdmin(req){return req.headers.get('x-admin-pass')===ADMIN_PASS;}
// BLOCK END: Admin Password Helper (27-Mar-2026)
// ============================================================

// ============================================================
// SEO AGENT — SPORTSrip
// Added  : 28-Mar-2026
// Purpose: Runs every 30 minutes via Cloudflare Cron.
//          1. Fetches Google Trends RSS for IPL + cricket
//          2. Scans our KV articles for keyword matches
//          3. Boosts matching articles to top
//          4. Updates SEO sitemap priority
//          5. Sends email report via EmailJS
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
const SEO_AGENT_CONFIG = {
  // Sports to watch for trends
  watchSports: ['ipl', 'cricket', 'football', 'f1'],

  // Google Trends RSS — these are real public RSS feeds
  trendFeeds: [
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN', // India trending
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=GB', // UK trending
  ],

  // Keywords to always watch (even if not trending)
  watchKeywords: [
    'ipl', 'ipl 2026', 'rcb', 'csk', 'mi', 'kkr', 'srh', 'pbks', 'dc', 'rr', 'lsg', 'gt',
    'kohli', 'rohit', 'dhoni', 'bumrah', 'hardik', 'warner', 'dhruv',
    'cricket', 'wicket', 'century', 'six', 'four', 'boundary',
  ],

  // EmailJS config — fill these in after signup at emailjs.com
  emailjs: {
    serviceId:  'YOUR_EMAILJS_SERVICE_ID',   // e.g. 'service_abc123'
    templateId: 'YOUR_EMAILJS_TEMPLATE_ID',  // e.g. 'template_xyz456'
    publicKey:  'YOUR_EMAILJS_PUBLIC_KEY',   // e.g. 'abc123xyz'
    toEmail:    'ravi.kompel@gmail.com',
  },

  // How many articles to boost per trending term
  boostLimit: 3,
};

// ── MAIN AGENT FUNCTION ──────────────────────────────────────
async function runSEOAgent(env) {
  console.log('[SEO Agent] Starting run at', new Date().toISOString());
  const report = {
    runAt: new Date().toISOString(),
    trends: [],
    matches: [],
    boosted: [],
    seoActions: [],
    errors: [],
  };

  try {
    // STEP 1: Fetch trending searches
    report.trends = await fetchTrends();
    console.log('[SEO Agent] Found trends:', report.trends.slice(0,5));

    // STEP 2: Scan our articles for keyword matches
    report.matches = await findMatchingArticles(env, report.trends);
    console.log('[SEO Agent] Found matches:', report.matches.length);

    // STEP 3: Boost matched articles to top
    if (report.matches.length > 0) {
      report.boosted = await boostArticles(env, report.matches);
      console.log('[SEO Agent] Boosted:', report.boosted.length);
    }

    // STEP 4: Update SEO sitemap priority
    report.seoActions = await updateSEOPriority(env, report.boosted);
    console.log('[SEO Agent] SEO updated:', report.seoActions.length);

    // STEP 5: Send email report
    await sendAgentEmail(report);
    console.log('[SEO Agent] Email sent!');

  } catch (e) {
    report.errors.push(e.message);
    console.error('[SEO Agent] Error:', e.message);
  }

  // Save last run report to KV
  try {
    await env.CONTROL_PANEL_KV.put('seo_agent:last_run', JSON.stringify(report));
  } catch(e) {}

  return report;
}

// ── STEP 1: FETCH TRENDING SEARCHES ─────────────────────────
async function fetchTrends() {
  const trends = new Set();

  // Always include our base watch keywords
  SEO_AGENT_CONFIG.watchKeywords.forEach(k => trends.add(k.toLowerCase()));

  // Fetch Google Trends RSS feeds
  for (const feedUrl of SEO_AGENT_CONFIG.trendFeeds) {
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'SPORTSrip-SEOAgent/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const xml = await res.text();

      // Extract trending topics from RSS
      const items = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
      items.forEach(item => {
        const match = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        if (match) {
          const term = match[1].toLowerCase().trim();
          // Only keep sports-relevant terms
          const sportsTerms = ['ipl','cricket','football','f1','formula','sports','match','wicket',
            'century','score','vs','final','semi','league','tournament','cup','trophy',
            'kohli','rohit','dhoni','bumrah','hardik','rcb','csk','mi','kkr'];
          if (sportsTerms.some(t => term.includes(t))) {
            trends.add(term);
          }
        }
      });
    } catch (e) {
      console.log('[SEO Agent] Trend feed failed:', feedUrl, e.message);
    }
  }

  return [...trends];
}

// ── STEP 2: FIND MATCHING ARTICLES ──────────────────────────
async function findMatchingArticles(env, trends) {
  const matches = [];
  const sports = ['ipl', 'cricket', 'football', 'f1', 'basketball', 'tennis', 'kabaddi'];

  for (const sport of sports) {
    try {
      const raw = await env.CURATED_KV.get('curated:' + sport);
      const myRaw = await env.MY_NEWS_KV.get('my:' + sport);
      const articles = [
        ...(myRaw ? JSON.parse(myRaw).map(a => ({...a, isOwn: true})) : []),
        ...(raw ? JSON.parse(raw) : []),
      ];

      for (const article of articles) {
        const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
        const matchedTerms = trends.filter(term => text.includes(term));

        if (matchedTerms.length > 0) {
          matches.push({
            sport,
            title: article.title,
            link: article.link,
            isOwn: article.isOwn || false,
            score: matchedTerms.length,
            matchedTerms: matchedTerms.slice(0, 5),
            article,
          });
        }
      }
    } catch (e) {
      console.log('[SEO Agent] Error scanning sport:', sport, e.message);
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 20); // top 20 matches
}

// ── STEP 3: BOOST MATCHED ARTICLES ──────────────────────────
async function boostArticles(env, matches) {
  const boosted = [];
  const sportGroups = {};

  // Group matches by sport
  matches.forEach(m => {
    if (!sportGroups[m.sport]) sportGroups[m.sport] = [];
    if (sportGroups[m.sport].length < SEO_AGENT_CONFIG.boostLimit) {
      sportGroups[m.sport].push(m);
    }
  });

  // For each sport, move matched articles to top of CURATED_KV
  for (const [sport, sportMatches] of Object.entries(sportGroups)) {
    try {
      const raw = await env.CURATED_KV.get('curated:' + sport);
      if (!raw) continue;
      let articles = JSON.parse(raw);

      const matchLinks = new Set(sportMatches.map(m => m.link));

      // Separate matched and non-matched
      const topArticles = articles.filter(a => matchLinks.has(a.link));
      const restArticles = articles.filter(a => !matchLinks.has(a.link));

      // Put matched articles at top, mark as boosted
      topArticles.forEach(a => {
        a._boosted = true;
        a._boostedAt = new Date().toISOString();
        a._boostedFor = sportMatches.find(m => m.link === a.link)?.matchedTerms || [];
      });

      const newOrder = [...topArticles, ...restArticles];
      await env.CURATED_KV.put('curated:' + sport, JSON.stringify(newOrder));

      sportMatches.forEach(m => boosted.push({
        sport,
        title: m.title.slice(0, 60),
        terms: m.matchedTerms,
      }));
    } catch (e) {
      console.log('[SEO Agent] Boost failed for:', sport, e.message);
    }
  }

  return boosted;
}

// ── STEP 4: UPDATE SEO PRIORITY ─────────────────────────────
async function updateSEOPriority(env, boosted) {
  const actions = [];

  if (boosted.length === 0) return actions;

  try {
    // Store SEO boost info in KV — SEO engine reads this
    const seoData = {
      updatedAt: new Date().toISOString(),
      boostedArticles: boosted,
      sitemapPriority: boosted.map(b => ({
        sport: b.sport,
        title: b.title,
        priority: '1.0', // highest priority for Google
        changefreq: 'hourly',
      })),
    };

    await env.CONTROL_PANEL_KV.put('seo:boost_data', JSON.stringify(seoData));

    // Ping Google to recrawl sitemap
    try {
      await fetch('https://www.google.com/ping?sitemap=https://www.sportsrip.com/sitemap.xml', {
        signal: AbortSignal.timeout(3000),
      });
      actions.push('Pinged Google sitemap');
    } catch(e) {
      actions.push('Google ping skipped: ' + e.message);
    }

    actions.push('Updated SEO boost data in KV');
    actions.push('Set priority 1.0 for ' + boosted.length + ' articles');
  } catch (e) {
    actions.push('SEO update failed: ' + e.message);
  }

  return actions;
}

// ── STEP 5: SEND EMAIL REPORT ────────────────────────────────
async function sendAgentEmail(report) {
  const { emailjs } = SEO_AGENT_CONFIG;

  // Skip if EmailJS not configured yet
  if (emailjs.serviceId.includes('YOUR_')) {
    console.log('[SEO Agent] EmailJS not configured — skipping email');
    return;
  }

  const trendsList = report.trends.slice(0, 10).join(', ');
  const matchesList = report.matches.slice(0, 5)
    .map(m => '• "'+m.title.slice(0,50)+'" (matched: '+m.matchedTerms.slice(0,3).join(', ')+')')
    .join('\n');
  const boostedList = report.boosted.slice(0, 5)
    .map(b => '• ['+b.sport.toUpperCase()+'] '+b.title)
    .join('\n');

  const emailBody = [
    '🤖 SPORTSrip SEO Agent Report',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '🕐 Run time: ' + report.runAt,
    '',
    '📈 TRENDING SEARCHES FOUND:',
    trendsList || 'None detected',
    '',
    '🎯 MATCHING ARTICLES (' + report.matches.length + ' found):',
    matchesList || 'No matches',
    '',
    '🚀 ARTICLES BOOSTED TO TOP (' + report.boosted.length + '):',
    boostedList || 'None boosted',
    '',
    '🔍 SEO ACTIONS:',
    report.seoActions.join('\n') || 'None',
    '',
    report.errors.length ? '⚠️ ERRORS:\n' + report.errors.join('\n') : '✅ No errors',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'SPORTSrip SEO Agent — sportsrip.com',
  ].join('\n');

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: emailjs.serviceId,
        template_id: emailjs.templateId,
        user_id: emailjs.publicKey,
        template_params: {
          to_email: emailjs.toEmail,
          subject: '🤖 SPORTSrip SEO Agent — ' + report.boosted.length + ' articles boosted',
          message: emailBody,
          run_time: report.runAt,
          trends_count: report.trends.length,
          matches_count: report.matches.length,
          boosted_count: report.boosted.length,
        },
      }),
    });

    if (!res.ok) throw new Error('EmailJS returned ' + res.status);
    console.log('[SEO Agent] Email sent to', emailjs.toEmail);
  } catch (e) {
    console.error('[SEO Agent] Email failed:', e.message);
  }
}




export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSEOAgent(env));
  },
  async fetch(request,env){
    var url=new URL(request.url);
    if(request.method==='OPTIONS')return new Response(null,{headers:cors});

    // ============================================================
    // BLOCK START: Google SEO — Sitemap + Robots
    // Added  : 27-Mar-2026
    // Purpose: Google indexing. DO NOT REMOVE.
    // ============================================================
    if(url.pathname==='/sitemap.xml'){
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://www.sportsrip.com/</loc>\n    <lastmod>2026-03-27</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`,{headers:{'Content-Type':'application/xml'}});
    }
    if(url.pathname==='/robots.txt'){
      return new Response(`User-agent: *\nAllow: /\nSitemap: https://www.sportsrip.com/sitemap.xml`,{headers:{'Content-Type':'text/plain'}});
    }
    // BLOCK END: Google SEO (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /admin — Secret Key Protection
    // Added  : 27-Mar-2026
    // Purpose: Admin panel is only accessible with the correct
    //          secret key in the URL: /admin?key=YOUR_SECRET_KEY
    //          Without the key → plain 404, page appears to not exist.
    //          To reset the key: change ADMIN_URL_KEY below in
    //          GitHub and Cloudflare auto-deploys in 30 seconds.
    //          Bookmark: https://www.sportsrip.com/admin?key=spr-x9k2-2026
    // ============================================================
    if(url.pathname==='/admin'||url.pathname==='/admin.html'){
      var ADMIN_URL_KEY = 'spr-x9k2-2026'; // Change this to reset access
      var providedKey = url.searchParams.get('key');
      if(providedKey !== ADMIN_URL_KEY){
        // Wrong or missing key — return plain 404, looks like page doesn't exist
        return new Response('Not Found', {status:404, headers:{'Content-Type':'text/plain'}});
      }
      // Correct key — fetch and serve the actual admin.html
      var adminUrl = new URL(request.url);
      adminUrl.pathname = '/admin.html';
      return fetch(adminUrl.toString());
    }
    // BLOCK END: /admin — Secret Key Protection (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/news — Your Articles Always On Top
    // Added  : 27-Mar-2026
    // Purpose: Merges MY_NEWS_KV (isOwn:true) above CURATED_KV.
    //          Validates sport against dynamic KV config.
    // ============================================================
    if(url.pathname==='/api/news'){
      var sport=url.searchParams.get('sport');
      var SPORTS=await buildSportsFromKV(env);
      if(!sport||!SPORTS[sport])return new Response(JSON.stringify({error:'Invalid sport'}),{status:400,headers:cors});
      var myRaw=await env.MY_NEWS_KV.get('my:'+sport);
      var myArticles=myRaw?JSON.parse(myRaw):[];
      myArticles.forEach(function(a){a.isOwn=true;a.sport=sport;});
      var rssRaw=await env.CURATED_KV.get('curated:'+sport);
      var rssArticles=rssRaw?JSON.parse(rssRaw):[];
      var articles=myArticles.concat(rssArticles);
      return new Response(JSON.stringify({sport,articles,count:articles.length}),{headers:cors});
    }
    // BLOCK END: /api/news (27-Mar-2026)
    // ============================================================

    if(url.pathname==='/api/mode')return new Response(JSON.stringify({mode:'auto',version:'v2.0-sports-array',deployed:'27-Mar-2026'}),{headers:cors});

    if(url.pathname==='/api/flush'&&request.method==='POST'){
      var body=await request.json();var target=body.sport;
      if(target){
        await env.NEWS_KV.delete('raw:'+target);
        await env.CURATED_KV.delete('curated:'+target);
        return new Response(JSON.stringify({flushed:true,sport:target}),{headers:cors});
      }
      return new Response(JSON.stringify({error:'No sport provided'}),{status:400,headers:cors});
    }

    if(url.pathname==='/api/trigger-fetch'&&request.method==='POST'){
      var body=await request.json(),type=body.type||'raw';
      var targetedSport=body.sport||'all';
      var customLimit=parseInt(body.limit)||50;
      var SPORTS=await buildSportsFromKV(env);
      var keys=(targetedSport==='all')?Object.keys(SPORTS):[targetedSport];
      for(var i=0;i<keys.length;i++){
        if(SPORTS[keys[i]]){
          if(type==='curate')await curateSport(keys[i],env);
          else await fetchRawSport(keys[i],SPORTS[keys[i]],env,customLimit);
        }
      }
      return new Response(JSON.stringify({triggered:type,done:true,updated:keys.length}),{headers:cors});
    }

    // ============================================================
    // BLOCK START: /api/feeds — Manage Feed Sources
    // Added  : 27-Mar-2026
    // Purpose: GET returns all saved feeds from CONTROL_PANEL_KV.
    //          POST adds a new feed (admin only).
    //          DELETE removes a feed by URL (admin only).
    // ============================================================
    if(url.pathname==='/api/feeds'){
      if(request.method==='GET'){
        var raw=await env.CONTROL_PANEL_KV.get('feeds_config');
        var feeds=raw?JSON.parse(raw):[];
        feeds.sort(function(a,b){return a.priority-b.priority;});
        return new Response(JSON.stringify({feeds,count:feeds.length}),{headers:cors});
      }
      if(request.method==='POST'){
        if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
        var body=await request.json();
        if(!body.sport||!body.url||!body.priority)return new Response(JSON.stringify({error:'Missing sport, url or priority'}),{status:400,headers:cors});
        var raw=await env.CONTROL_PANEL_KV.get('feeds_config');
        var feeds=raw?JSON.parse(raw):[];
        // Prevent duplicate URLs
        if(feeds.some(function(f){return f.url===body.url;}))return new Response(JSON.stringify({error:'Feed URL already exists'}),{status:409,headers:cors});
        feeds.push({sport:body.sport,label:body.label||body.sport,priority:parseInt(body.priority),name:body.name||'Unknown Feed',url:body.url,addedAt:new Date().toISOString()});
        feeds.sort(function(a,b){return a.priority-b.priority;});
        await env.CONTROL_PANEL_KV.put('feeds_config',JSON.stringify(feeds));
        return new Response(JSON.stringify({success:true,total:feeds.length}),{headers:cors});
      }
      if(request.method==='DELETE'){
        if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
        var body=await request.json();
        var raw=await env.CONTROL_PANEL_KV.get('feeds_config');
        var feeds=raw?JSON.parse(raw):[];
        feeds=feeds.filter(function(f){return f.url!==body.url;});
        await env.CONTROL_PANEL_KV.put('feeds_config',JSON.stringify(feeds));
        return new Response(JSON.stringify({success:true,remaining:feeds.length}),{headers:cors});
      }
    }
    // BLOCK END: /api/feeds (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/preload-feeds — Seed KV with all 28 feeds
    // Added  : 27-Mar-2026
    // Purpose: One-time setup. Called from admin panel "Preload"
    //          button. Saves all 28 hardcoded feeds to
    //          CONTROL_PANEL_KV with correct priorities.
    //          Safe to run again — only adds missing feeds,
    //          never overwrites existing ones.
    //          Protected by isAdmin() password check.
    // ============================================================
    if(url.pathname==='/api/preload-feeds'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var raw=await env.CONTROL_PANEL_KV.get('feeds_config');
      var existing=raw?JSON.parse(raw):[];
      var existingUrls=new Set(existing.map(function(f){return f.url;}));
      var added=0;
      PRELOADED_FEEDS.forEach(function(f){
        if(!existingUrls.has(f.url)){
          existing.push({...f, addedAt:new Date().toISOString()});
          added++;
        }
      });
      existing.sort(function(a,b){return a.priority-b.priority;});
      await env.CONTROL_PANEL_KV.put('feeds_config',JSON.stringify(existing));
      return new Response(JSON.stringify({success:true,added,total:existing.length}),{headers:cors});
    }
    // BLOCK END: /api/preload-feeds (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/test-feed — Validate RSS URL
    // Added  : 27-Mar-2026
    // Purpose: Called by admin panel "Test Feed" button.
    //          Fetches the RSS URL, checks it's valid XML,
    //          auto-extracts the channel title and item count.
    //          Returns result so user knows before saving.
    //          No auth required — read-only operation.
    // ============================================================
    if(url.pathname==='/api/test-feed'&&request.method==='POST'){
      var body=await request.json();
      var feedUrl=body.url;
      if(!feedUrl)return new Response(JSON.stringify({error:'Missing url'}),{status:400,headers:cors});
      try{
        var r=await fetch(feedUrl,{headers:{'User-Agent':'MangoSports/1.0'},signal:AbortSignal.timeout(8000)});
        if(!r.ok)throw new Error('HTTP '+r.status);
        var xml=await r.text();
        if(!xml.includes('<rss')&&!xml.includes('<feed')&&!xml.includes('<channel'))throw new Error('Not a valid RSS/Atom feed');
        // Extract channel title
        var titleMatch=xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        var feedTitle=titleMatch?titleMatch[1].trim().slice(0,60):'Unknown Feed';
        // Count items
        var itemCount=(xml.match(/<item>/g)||[]).length+(xml.match(/<entry>/g)||[]).length;
        return new Response(JSON.stringify({valid:true,name:feedTitle,itemCount,message:'Valid feed — '+itemCount+' items found'}),{headers:cors});
      }catch(e){
        return new Response(JSON.stringify({valid:false,message:'Invalid feed: '+e.message}),{headers:cors});
      }
    }
    // BLOCK END: /api/test-feed (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/publish-own — Save Your Own Article
    // Added  : 27-Mar-2026
    // Updated: 27-Mar-2026 — accepts 'sports' array so one article
    //          can appear on multiple sport tabs simultaneously.
    //          Falls back to single 'sport' for backward compat.
    //          Max 50 own articles per sport at any time.
    //          Protected by isAdmin() password check.
    // ============================================================
    if(url.pathname==='/api/publish-own'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var body=await request.json();
      var article=body.article;
      // Support both single sport (old) and sports array (new)
      var sports=body.sports||(body.sport?[body.sport]:[]);
      if(!sports.length||!article)return new Response(JSON.stringify({error:'Missing sports or article'}),{status:400,headers:cors});
      var savedTo=[];
      for(var sp of sports){
        var existing=await env.MY_NEWS_KV.get('my:'+sp);
        var articles=existing?JSON.parse(existing):[];
        var articleCopy=Object.assign({},article,{sport:sp});
        articles.unshift(articleCopy);
        articles=articles.slice(0,50);
        await env.MY_NEWS_KV.put('my:'+sp,JSON.stringify(articles));
        savedTo.push(sp);
      }
      return new Response(JSON.stringify({success:true,savedTo,total:savedTo.length}),{headers:cors});
    }
    // BLOCK END: /api/publish-own (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/own-articles — List Your Articles
    // Added  : 27-Mar-2026
    // ============================================================
    if(url.pathname==='/api/own-articles'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var SPORTS=await buildSportsFromKV(env);
      var allOwn=[];
      for(var sk of Object.keys(SPORTS)){
        var raw=await env.MY_NEWS_KV.get('my:'+sk);
        if(raw)allOwn=allOwn.concat(JSON.parse(raw));
      }
      allOwn.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});
      return new Response(JSON.stringify({articles:allOwn}),{headers:cors});
    }
    // BLOCK END: /api/own-articles (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/delete-own — Delete Your Article
    // Added  : 27-Mar-2026
    // ============================================================
    if(url.pathname==='/api/delete-own'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var body=await request.json();
      var sport=body.sport,link=body.link;
      var raw=await env.MY_NEWS_KV.get('my:'+sport);
      if(!raw)return new Response(JSON.stringify({error:'No articles found'}),{status:404,headers:cors});
      var articles=JSON.parse(raw).filter(function(a){return a.link!==link;});
      await env.MY_NEWS_KV.put('my:'+sport,JSON.stringify(articles));
      return new Response(JSON.stringify({success:true,remaining:articles.length}),{headers:cors});
    }
    // BLOCK END: /api/delete-own (27-Mar-2026)
    // ============================================================

    return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors});
  },

  async scheduled(event,env,ctx){
    var SPORTS=await buildSportsFromKV(env);
    if(event.cron==='5/10 * * * *'){
      ctx.waitUntil(Promise.allSettled(Object.keys(SPORTS).map(function(k){return curateSport(k,env);})));
    } else {
      ctx.waitUntil(Promise.allSettled(Object.keys(SPORTS).map(function(k){return fetchRawSport(k,SPORTS[k],env);})));
    }
  }
};
