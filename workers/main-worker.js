// SPORTSrip - Main Worker (Production)
// Cron 1 (every 10 min): Fetch raw RSS to NEWS_KV
// Cron 2 (every 5+10 min): Add OG images, save to CURATED_KV
// API: Serves frontend with merged own + RSS articles
//
// Change log:
// 01-Apr-2026 - STANDARDIZE: Added CONFIG block for portability
//                             All instance values in one place
// 01-Apr-2026 - FIX: OG image filter removed - articles without
//                    images no longer discarded (frontend handles gracefully)
// 28-Mar-2026 - MAJOR: Added OG image fetching in curateSport
// 28-Mar-2026 - CRITICAL: Added Cache-Control headers (no-cache)
// 27-Mar-2026 - Added SEO agent, sitemap, robots, admin routes

// ============================================================
// ⚙️  INSTANCE CONFIG — THE ONLY BLOCK YOU NEED TO CHANGE
//     when deploying to a new Cloudflare account or domain.
// ============================================================
var CONFIG = {
  siteName:    'SPORTSrip',
  siteUrl:     'https://www.sportsrip.com',   // ← Your domain
  workerName:  'sportsrip-main-worker',        // ← Your worker name
  adminPass:   'sportsrip2026',                // ← Admin API password (x-admin-pass header)
  adminUrlKey: 'spr-x9k2-2026',               // ← Secret key for /admin?key= URL
  adminEmail:  'ravi.kompel@gmail.com',        // ← Email for SEO agent reports
};
// ============================================================

// ============================================================
// BLOCK START: Hardcoded SPORTS — Fallback Only
// Purpose: Used ONLY when CONTROL_PANEL_KV has no feeds saved.
//          Once feeds are saved via admin panel, this is ignored.
//          DO NOT REMOVE — keeps site working if KV is empty.
// ============================================================
// TESTING NOTE:
// This historical fallback map is retained only as a manual reference.
// Runtime fallback is intentionally disabled further below in
// loadFeedsConfig(), so this block is not used during FEEDS_KV-only testing.
var SPORTS_FALLBACK = {
  'net-sessions': { label:'Net Sessions', feeds:[] },
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
// BLOCK END: Hardcoded SPORTS — Fallback Only
// ============================================================

// ============================================================
// BLOCK START: Preloaded Feeds Data
// Purpose: Seeds CONTROL_PANEL_KV via /api/preload-feeds.
//          Run once from admin panel. Safe to run again.
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
// BLOCK END: Preloaded Feeds Data
// ============================================================

// Feed source — always use hardcoded verified feeds
function getDefaultFeedsConfig() {
  return {
    updatedAt: new Date().toISOString(),
    categories: []
  };
}

function normalizeFeedsConfig(config) {
  var normalized = {
    updatedAt: new Date().toISOString(),
    categories: []
  };

  if (!config || !Array.isArray(config.categories)) return normalized;

  normalized.updatedAt = config.updatedAt || new Date().toISOString();
  normalized.categories = config.categories
    .filter(function (category) {
      return category && category.sport;
    })
    .map(function (category, categoryIndex) {
      var feeds = Array.isArray(category.feeds) ? category.feeds : [];

      feeds = feeds
        .filter(function (feed) {
          return feed && feed.url;
        })
        .map(function (feed, feedIndex) {
          return {
            name: feed.name || 'Unknown Feed',
            url: String(feed.url).trim(),
            priority: Number(feed.priority || (feedIndex + 1)),
            enabled: feed.enabled !== false,
            type: feed.type || (String(feed.url).includes('youtube.com/feeds') ? 'youtube' : 'rss'),
            notes: feed.notes || '',
            source: feed.source || ''
          };
        })
        .sort(function (a, b) {
          return a.priority - b.priority;
        })
        .map(function (feed, feedIndex) {
          feed.priority = feedIndex + 1;
          return feed;
        });

      return {
        sport: String(category.sport).trim(),
        label: category.label || String(category.sport).trim(),
        priority: Number(category.priority || (categoryIndex + 1)),
        enabled: category.enabled !== false,
        notes: category.notes || '',
        feeds: feeds
      };
    })
    .sort(function (a, b) {
      return a.priority - b.priority;
    })
    .map(function (category, categoryIndex) {
      category.priority = categoryIndex + 1;
      return category;
    });

  return normalized;
}

function convertFeedsConfigToSports(config) {
  var sports = {};

  if (!config || !Array.isArray(config.categories)) return sports;

  config.categories.forEach(function (category) {
    if (category.enabled === false) return;

    var enabledFeeds = (category.feeds || [])
      .filter(function (feed) {
        return feed && feed.enabled !== false && feed.url;
      })
      .sort(function (a, b) {
        return a.priority - b.priority;
      })
      .map(function (feed) {
        return {
          name: feed.name || 'Unknown Feed',
          url: String(feed.url).trim(),
          type: feed.type || 'rss',
          notes: feed.notes || '',
          source: feed.source || ''
        };
      });

    if (!enabledFeeds.length) return;

    sports[category.sport] = {
      label: category.label || category.sport,
      feeds: enabledFeeds
    };
  });

  return sports;
}

function flattenFeedsConfig(config) {
  var rows = [];

  if (!config || !Array.isArray(config.categories)) return rows;

  config.categories.forEach(function (category) {
    (category.feeds || []).forEach(function (feed) {
      rows.push({
        sport: category.sport,
        key: category.sport,
        label: category.label || category.sport,
        priority: category.priority,
        enabled: category.enabled !== false,
        name: feed.name || 'Unknown Feed',
        url: feed.url,
        type: feed.type || 'rss',
        notes: feed.notes || '',
        source: feed.source || ''
      });
    });
  });

  rows.sort(function (a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

function convertFlatFeedsToConfig(feeds) {
  var grouped = {};

  (feeds || []).forEach(function (feed, index) {
    if (!feed || !feed.sport || !feed.url) return;

    if (!grouped[feed.sport]) {
      grouped[feed.sport] = {
        sport: feed.sport,
        label: feed.label || feed.sport,
        priority: Number(feed.priority || (index + 1)),
        enabled: true,
        notes: '',
        feeds: []
      };
    }

    grouped[feed.sport].feeds.push({
      name: feed.name || 'Unknown Feed',
      url: String(feed.url).trim(),
      priority: grouped[feed.sport].feeds.length + 1,
      enabled: true,
      type: feed.type || (String(feed.url).includes('youtube.com/feeds') ? 'youtube' : 'rss'),
      notes: feed.notes || '',
      source: feed.source || ''
    });
  });

  return normalizeFeedsConfig({
    updatedAt: new Date().toISOString(),
    categories: Object.keys(grouped).map(function (sportKey) {
      return grouped[sportKey];
    })
  });
}

function convertSportsFallbackToConfig() {
  return normalizeFeedsConfig({
    updatedAt: new Date().toISOString(),
    categories: Object.keys(SPORTS_FALLBACK).map(function (sportKey, index) {
      var sport = SPORTS_FALLBACK[sportKey] || { label: sportKey, feeds: [] };
      return {
        sport: sportKey,
        label: sport.label || sportKey,
        priority: index + 1,
        enabled: true,
        notes: 'Derived from SPORTS_FALLBACK',
        feeds: (sport.feeds || []).map(function (feed, feedIndex) {
          return {
            name: feed.name || 'Unknown Feed',
            url: String(feed.url).trim(),
            priority: feedIndex + 1,
            enabled: true,
            type: feed.type || (String(feed.url).includes('youtube.com/feeds') ? 'youtube' : 'rss'),
            notes: '',
            source: feed.source || ''
          };
        })
      };
    })
  });
}

async function loadFeedsConfig(env) {
  if (env.FEEDS_KV) {
    try {
      var rawFeedsConfig = await env.FEEDS_KV.get('feeds_config_v1');
      if (rawFeedsConfig) {
        return {
          source: 'FEEDS_KV',
          config: normalizeFeedsConfig(JSON.parse(rawFeedsConfig))
        };
      }
    } catch (e) {
      console.error('FEEDS_KV load failed:', e.message);
    }
  }

  // FALLBACK DISABLED FOR TESTING
  // We are intentionally not reading feed config from CONTROL_PANEL_KV here.
  // Reason:
  // - FEEDS_KV is the single source of truth we are validating.
  // - If FEEDS_KV is missing or malformed, we want that failure to be
  //   visible immediately instead of being hidden by legacy data.
  //
  // try {
  //   var rawLegacyConfig = await env.CONTROL_PANEL_KV.get('feeds_config');
  //   if (rawLegacyConfig) {
  //     return {
  //       source: 'CONTROL_PANEL_KV',
  //       config: convertFlatFeedsToConfig(JSON.parse(rawLegacyConfig))
  //     };
  //   }
  // } catch (e) {
  //   console.error('CONTROL_PANEL_KV feeds_config load failed:', e.message);
  // }

  // FALLBACK DISABLED FOR TESTING
  // We are also intentionally not falling back to SPORTS_FALLBACK.
  // Reason:
  // - During FEEDS_KV-only testing, silent fallback makes root-cause
  //   analysis harder.
  // - If FEEDS_KV is unavailable, we prefer a clear failure and can
  //   recover operationally from backup snapshots when needed.
  //
  // return {
  //   source: 'SPORTS_FALLBACK',
  //   config: convertSportsFallbackToConfig()
  // };

  throw new Error('FEEDS_KV feeds_config_v1 is required. Runtime fallback is intentionally disabled for testing.');
}

async function saveFeedsConfig(env, config) {
  var normalizedConfig = normalizeFeedsConfig(config || getDefaultFeedsConfig());
  var flattenedFeeds = flattenFeedsConfig(normalizedConfig);

  if (env.FEEDS_KV) {
    await env.FEEDS_KV.put('feeds_config_v1', JSON.stringify(normalizedConfig));
  }

  // LEGACY MIRROR WRITE DISABLED FOR TESTING
  // We are intentionally not mirroring feed config into CONTROL_PANEL_KV.
  // Reason:
  // - We want FEEDS_KV to be the only active source during this test.
  // - Mirroring old feed data would make it harder to detect whether
  //   runtime behavior is truly coming from FEEDS_KV.
  //
  // await env.CONTROL_PANEL_KV.put('feeds_config', JSON.stringify(flattenedFeeds));

  return {
    source: 'FEEDS_KV',
    config: normalizedConfig,
    feeds: flattenedFeeds
  };
}

async function getRuntimeSportsPackage(env) {
  var feedsPackage = await loadFeedsConfig(env);

  return {
    source: feedsPackage.source,
    config: feedsPackage.config,
    feeds: flattenFeedsConfig(feedsPackage.config),
    sports: convertFeedsConfigToSports(feedsPackage.config)
  };
}

async function getVisibleCategories(env) {
  var runtimePackage = await getRuntimeSportsPackage(env);
  var visibleCategories = [];

  for (var i = 0; i < runtimePackage.config.categories.length; i++) {
    var category = runtimePackage.config.categories[i];
    var sport = category.sport;
    var curatedCount = 0;
    var ownCount = 0;

    if (category.enabled === false) continue;

    try {
      var curatedRaw = await env.CURATED_KV.get('curated:' + sport);
      curatedCount = curatedRaw ? JSON.parse(curatedRaw).length : 0;
    } catch (e) {}

    try {
      var ownRaw = await env.MY_NEWS_KV.get('my:' + sport);
      ownCount = ownRaw ? JSON.parse(ownRaw).length : 0;
    } catch (e) {}

    // CATEGORY VISIBILITY RULE
    // We intentionally keep enabled categories visible even when they
    // currently have zero articles.
    // Reason:
    // - FEEDS_KV is the source of truth for menu structure.
    // - A category should not disappear from the frontend just because
    //   its current curated/own article count is temporarily zero.
    // - This keeps the frontend stable and aligned with the configured
    //   category list in FEEDS_KV.
    //
    // if (curatedCount + ownCount === 0) continue;

    visibleCategories.push({
      sport: sport,
      key: sport,
      label: category.label || sport,
      priority: category.priority,
      feedCount: (category.feeds || []).filter(function (feed) {
        return feed.enabled !== false;
      }).length,
      curatedCount: curatedCount,
      ownCount: ownCount,
      totalCount: curatedCount + ownCount
    });
  }

  visibleCategories.sort(function (a, b) {
    return a.priority - b.priority;
  });

  return {
    activeSource: runtimePackage.source,
    categories: visibleCategories
  };
}

async function buildSportsFromKV(env) {
  var runtimePackage = await getRuntimeSportsPackage(env);
  return runtimePackage.sports;
}

// ── XML / Text Helpers ──────────────────────────────────────
function extractTag(xml, tag) {
  var cr = new RegExp('<'+tag+'[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/'+tag+'>','i');
  var pl = new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)<\\/'+tag+'>','i');
  var m = xml.match(cr)||xml.match(pl); return m?m[1].trim():null;
}
function stripHtml(s){return s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function cleanText(s){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();}

// ── RSS Parser ──────────────────────────────────────────────
function parseRSS(xml, sourceName) {
  var articles=[], re=/<item>([\s\S]*?)<\/item>/g, m;
  while((m=re.exec(xml))!==null){
    var it=m[1];
    var title=extractTag(it,'title'), link=extractTag(it,'link'), pub=extractTag(it,'pubDate'), desc=extractTag(it,'description');
    var img=null;
    var mm=it.match(/media:content[^>]+url=["']([^"']+)["']/i);
    var thumb=it.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i);
    var iid=desc&&desc.match(/<img[^>]+src=["']([^"']+)["']/i);
    var enc=null,encTag=it.match(/<enclosure[^>]*>/i);
    if(encTag&&encTag[0].toLowerCase().includes('image')){
      var encMatch=encTag[0].match(/url=["']([^"']+)["']/i);
      if(encMatch)enc=encMatch[1];
    }
    if(mm)img=mm[1]; else if(thumb)img=thumb[1]; else if(enc)img=enc; else if(iid)img=iid[1];
    if(!title||!link)continue;
    var published=pub?new Date(pub):new Date();
    if((Date.now()-published.getTime())/3600000>168)continue; // Skip articles older than 7 days
    if(sourceName==='Sky Sports Cricket'&&!link.toLowerCase().includes('cricket'))continue;
    articles.push({title:cleanText(title),link:link.trim(),pubDate:published.toISOString(),description:cleanText(stripHtml(desc||'')),image:img,source:sourceName});
  }
  return articles;
}

// ── YouTube Atom Feed Parser ────────────────────────────────
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
    if((Date.now() - published.getTime()) / 3600000 > 168) continue; // 7-day window for videos
    articles.push({
      title: cleanText(title), link: link, pubDate: published.toISOString(),
      description: '', image: img, source: sourceName, isVideo: true, videoId: videoId
    });
  }
  return articles;
}

// ── Feed Fetcher ────────────────────────────────────────────
async function fetchFeed(feed){
  try{
    var r=await fetch(feed.url,{headers:{'User-Agent':'MangoSports/1.0'},signal:AbortSignal.timeout(6000)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    var text=await r.text();
    if(feed.url.includes('youtube.com/feeds')) return parseYouTubeRSS(text,feed.name);
    return parseRSS(text,feed.name);
  }catch(e){console.error('Feed failed:'+feed.name+':'+e.message);return[];}
}

// ── Fetch Raw Sport & Save to NEWS_KV ───────────────────────
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
      fairShare=fairShare.concat(src.slice(0,5)); // Fair share: top 5 per source
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

// ── OG Image Fetcher ────────────────────────────────────────
async function fetchOGImage(url) {
  try {
    var response = await fetch(url, {
      headers: { 'User-Agent': 'MangoSports/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return null;
    var html = await response.text();
    var ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImage) return ogImage[1];
    var twitterImage = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (twitterImage) return twitterImage[1];
    var ogImageRev = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageRev) return ogImageRev[1];
    return null;
  } catch (e) {
    console.error('OG image fetch failed for ' + url + ':', e.message);
    return null;
  }
}

// ── Curate Sport & Save to CURATED_KV ───────────────────────
// FIX (01-Apr-2026): Removed hard image filter.
// Articles without images are now kept — frontend handles them with gradient placeholders.
async function curateSport(sportKey,env){
  var raw=await env.NEWS_KV.get('raw:'+sportKey);
  if(!raw)return;

  var articles=JSON.parse(raw);
  articles.forEach(function(a){a.sport=sportKey;});

  // Try to fetch OG images for articles without images (first 15 only to avoid timeout)
  var enriched = [];
  for (var i = 0; i < Math.min(articles.length, 15); i++) {
    var article = articles[i];
    if (!article.image && article.link) {
      var ogImg = await fetchOGImage(article.link);
      if (ogImg) {
        article.image = ogImg;
        article._ogEnriched = true;
      }
    }
    enriched.push(article);
  }
  // Add remaining articles (no OG processing — would timeout)
  if (articles.length > 15) {
    enriched = enriched.concat(articles.slice(15));
  }

  // Deduplicate by link
  var unique=[],seen=new Set();
  enriched.forEach(function(a){if(!seen.has(a.link)){seen.add(a.link);unique.push(a);}});

  // Sort newest first
  unique.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});

  // Cap at 150 articles
  var cap=unique.slice(0,150);

  if(cap.length>0){
    await env.CURATED_KV.put('curated:'+sportKey,JSON.stringify(cap),{expirationTtl:7200});
  }
}

// ── CORS Headers ────────────────────────────────────────────
var cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,x-admin-pass',
  'Content-Type':'application/json',
  'Cache-Control':'no-cache, no-store, must-revalidate',
  'Pragma':'no-cache',
  'Expires':'0'
};

// ── Admin Auth ──────────────────────────────────────────────
var ADMIN_PASS = CONFIG.adminPass; // ← Reads from CONFIG block at top
function isAdmin(req){return req.headers.get('x-admin-pass')===ADMIN_PASS;}

// ============================================================
// SEO AGENT
// Runs every 30 minutes via Cloudflare Cron.
// Status: DESIGNED — on back burner, not fully configured yet.
// EmailJS keys are placeholders — fill in when ready to activate.
// ============================================================
const SEO_AGENT_CONFIG = {
  watchSports: ['ipl', 'cricket', 'football', 'f1'],
  trendFeeds: [
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN',
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=GB',
  ],
  watchKeywords: [
    'ipl', 'ipl 2026', 'rcb', 'csk', 'mi', 'kkr', 'srh', 'pbks', 'dc', 'rr', 'lsg', 'gt',
    'kohli', 'rohit', 'dhoni', 'bumrah', 'hardik', 'warner',
    'cricket', 'wicket', 'century', 'six', 'four', 'boundary',
  ],
  // ── Fill these in at emailjs.com when ready ──
  emailjs: {
    serviceId:  'YOUR_EMAILJS_SERVICE_ID',
    templateId: 'YOUR_EMAILJS_TEMPLATE_ID',
    publicKey:  'YOUR_EMAILJS_PUBLIC_KEY',
    toEmail:    CONFIG.adminEmail,   // ← Reads from CONFIG block at top
  },
  boostLimit: 3,
};

async function runSEOAgent(env) {
  console.log('[SEO Agent] Starting run at', new Date().toISOString());
  const report = { runAt: new Date().toISOString(), trends: [], matches: [], boosted: [], seoActions: [], errors: [] };
  try {
    report.trends  = await fetchTrends();
    report.matches = await findMatchingArticles(env, report.trends);
    if (report.matches.length > 0) report.boosted = await boostArticles(env, report.matches);
    report.seoActions = await updateSEOPriority(env, report.boosted);
    await sendAgentEmail(report);
  } catch (e) {
    report.errors.push(e.message);
    console.error('[SEO Agent] Error:', e.message);
  }
  try { await env.CONTROL_PANEL_KV.put('seo_agent:last_run', JSON.stringify(report)); } catch(e) {}
  return report;
}

async function fetchTrends() {
  const trends = new Set();
  SEO_AGENT_CONFIG.watchKeywords.forEach(k => trends.add(k.toLowerCase()));
  for (const feedUrl of SEO_AGENT_CONFIG.trendFeeds) {
    try {
      const res = await fetch(feedUrl, { headers: { 'User-Agent': 'SPORTSrip-SEOAgent/1.0' }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
      items.forEach(item => {
        const match = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        if (match) {
          const term = match[1].toLowerCase().trim();
          const sportsTerms = ['ipl','cricket','football','f1','formula','sports','match','wicket','century','score','vs','final','semi','league','tournament','cup','trophy','kohli','rohit','dhoni','bumrah','hardik','rcb','csk','mi','kkr'];
          if (sportsTerms.some(t => term.includes(t))) trends.add(term);
        }
      });
    } catch (e) { console.log('[SEO Agent] Trend feed failed:', feedUrl, e.message); }
  }
  return [...trends];
}

async function findMatchingArticles(env, trends) {
  const matches = [];
  const sports = ['ipl', 'cricket', 'football', 'f1', 'basketball', 'tennis', 'kabaddi'];
  for (const sport of sports) {
    try {
      const raw   = await env.CURATED_KV.get('curated:' + sport);
      const myRaw = await env.MY_NEWS_KV.get('my:' + sport);
      const articles = [
        ...(myRaw ? JSON.parse(myRaw).map(a => ({...a, isOwn: true})) : []),
        ...(raw   ? JSON.parse(raw) : []),
      ];
      for (const article of articles) {
        const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
        const matchedTerms = trends.filter(term => text.includes(term));
        if (matchedTerms.length > 0) {
          matches.push({ sport, title: article.title, link: article.link, isOwn: article.isOwn || false, score: matchedTerms.length, matchedTerms: matchedTerms.slice(0, 5), article });
        }
      }
    } catch (e) { console.log('[SEO Agent] Error scanning sport:', sport, e.message); }
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 20);
}

async function boostArticles(env, matches) {
  const boosted = [];
  const sportGroups = {};
  matches.forEach(m => {
    if (!sportGroups[m.sport]) sportGroups[m.sport] = [];
    if (sportGroups[m.sport].length < SEO_AGENT_CONFIG.boostLimit) sportGroups[m.sport].push(m);
  });
  for (const [sport, sportMatches] of Object.entries(sportGroups)) {
    try {
      const raw = await env.CURATED_KV.get('curated:' + sport);
      if (!raw) continue;
      let articles = JSON.parse(raw);
      const matchLinks = new Set(sportMatches.map(m => m.link));
      const topArticles  = articles.filter(a =>  matchLinks.has(a.link));
      const restArticles = articles.filter(a => !matchLinks.has(a.link));
      topArticles.forEach(a => { a._boosted = true; a._boostedAt = new Date().toISOString(); a._boostedFor = sportMatches.find(m => m.link === a.link)?.matchedTerms || []; });
      await env.CURATED_KV.put('curated:' + sport, JSON.stringify([...topArticles, ...restArticles]));
      sportMatches.forEach(m => boosted.push({ sport, title: m.title.slice(0, 60), terms: m.matchedTerms }));
    } catch (e) { console.log('[SEO Agent] Boost failed for:', sport, e.message); }
  }
  return boosted;
}

async function updateSEOPriority(env, boosted) {
  const actions = [];
  if (boosted.length === 0) return actions;
  try {
    const seoData = {
      updatedAt: new Date().toISOString(),
      boostedArticles: boosted,
      sitemapPriority: boosted.map(b => ({ sport: b.sport, title: b.title, priority: '1.0', changefreq: 'hourly' })),
    };
    await env.CONTROL_PANEL_KV.put('seo:boost_data', JSON.stringify(seoData));
    try {
      await fetch(CONFIG.siteUrl.replace('https://','https://www.google.com/ping?sitemap=') + '/sitemap.xml', { signal: AbortSignal.timeout(3000) });
      actions.push('Pinged Google sitemap');
    } catch(e) { actions.push('Google ping skipped: ' + e.message); }
    actions.push('Updated SEO boost data in KV');
    actions.push('Set priority 1.0 for ' + boosted.length + ' articles');
  } catch (e) { actions.push('SEO update failed: ' + e.message); }
  return actions;
}

async function sendAgentEmail(report) {
  const { emailjs } = SEO_AGENT_CONFIG;
  if (emailjs.serviceId.includes('YOUR_')) {
    console.log('[SEO Agent] EmailJS not configured — skipping email');
    return;
  }
  const emailBody = [
    '🤖 SPORTSrip SEO Agent Report',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '🕐 Run time: ' + report.runAt,
    '', '📈 TRENDING SEARCHES:', report.trends.slice(0,10).join(', ') || 'None',
    '', '🎯 MATCHING ARTICLES (' + report.matches.length + '):',
    report.matches.slice(0,5).map(m => '• "' + m.title.slice(0,50) + '" (' + m.matchedTerms.slice(0,3).join(', ') + ')').join('\n') || 'No matches',
    '', '🚀 ARTICLES BOOSTED (' + report.boosted.length + '):',
    report.boosted.slice(0,5).map(b => '• [' + b.sport.toUpperCase() + '] ' + b.title).join('\n') || 'None',
    '', report.errors.length ? '⚠️ ERRORS:\n' + report.errors.join('\n') : '✅ No errors',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━', CONFIG.siteName + ' SEO Agent — ' + CONFIG.siteUrl,
  ].join('\n');
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: emailjs.serviceId, template_id: emailjs.templateId, user_id: emailjs.publicKey,
        template_params: { to_email: emailjs.toEmail, subject: '🤖 ' + CONFIG.siteName + ' SEO Agent — ' + report.boosted.length + ' articles boosted',
          message: emailBody, run_time: report.runAt, trends_count: report.trends.length, matches_count: report.matches.length, boosted_count: report.boosted.length } }),
    });
    if (!res.ok) throw new Error('EmailJS returned ' + res.status);
  } catch (e) { console.error('[SEO Agent] Email failed:', e.message); }
}

// ============================================================
// MAIN FETCH HANDLER
// ============================================================
export default {
  async fetch(request,env){
    var url=new URL(request.url);
    if(request.method==='OPTIONS')return new Response(null,{headers:cors});

    // ── Sitemap & Robots (Google SEO) ──
    if(url.pathname==='/sitemap.xml'){
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${CONFIG.siteUrl}/</loc>\n    <lastmod>${new Date().toISOString().slice(0,10)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`,{headers:{'Content-Type':'application/xml'}});
    }
    if(url.pathname==='/robots.txt'){
      return new Response(`User-agent: *\nAllow: /\nSitemap: ${CONFIG.siteUrl}/sitemap.xml`,{headers:{'Content-Type':'text/plain'}});
    }

    // ── Admin Page (secret key protection) ──
    if(url.pathname==='/admin'||url.pathname==='/admin.html'){
      var ADMIN_URL_KEY = CONFIG.adminUrlKey; // ← Reads from CONFIG block at top
      var providedKey = url.searchParams.get('key');
      if(providedKey !== ADMIN_URL_KEY){
        return new Response('Not Found', {status:404, headers:{'Content-Type':'text/plain'}});
      }
      var adminUrl = new URL(request.url);
      adminUrl.pathname = '/admin.html';
      return fetch(adminUrl.toString());
    }

    // ── /api/news — Serve articles (own articles always on top) ──
    if(url.pathname==='/api/news'){
      var sport=url.searchParams.get('sport');
      var SPORTS=await buildSportsFromKV(env);
      if(!sport||!SPORTS[sport])return new Response(JSON.stringify({error:'Invalid sport'}),{status:400,headers:cors});
      var myRaw=await env.MY_NEWS_KV.get('my:'+sport);
      var myArticles=myRaw?JSON.parse(myRaw):[];
      myArticles.forEach(function(a){a.isOwn=true;a.sport=sport;});
      var rssRaw=await env.CURATED_KV.get('curated:'+sport);
      var rssArticles=rssRaw?JSON.parse(rssRaw):[];
      if(!rssArticles.length){
        try{
          await fetchRawSport(sport,SPORTS[sport],env,20);
          await curateSport(sport,env);
          rssRaw=await env.CURATED_KV.get('curated:'+sport);
          rssArticles=rssRaw?JSON.parse(rssRaw):[];
          if(!rssArticles.length){
            var rawFallback=await env.NEWS_KV.get('raw:'+sport);
            rssArticles=rawFallback?JSON.parse(rawFallback):[];
          }
        }catch(e){
          console.error('On-demand refresh failed for '+sport+':'+e.message);
        }
      }
      var articles=myArticles.concat(rssArticles);
      return new Response(JSON.stringify({sport,articles,count:articles.length}),{headers:cors});
    }

    // ── /api/mode — Version ping ──
    if(url.pathname==='/api/mode'){
      var visiblePackageMode = await getVisibleCategories(env);
      return new Response(JSON.stringify({
        mode:'auto',
        version:'v4.0-dynamic-categories',
        deployed:'03-Apr-2026',
        worker:CONFIG.workerName,
        activeSource:visiblePackageMode.activeSource,
        visibleCategories:visiblePackageMode.categories.length
      }),{headers:cors});
    }

    if(url.pathname==='/api/categories'){
      var visiblePackage = await getVisibleCategories(env);
      return new Response(JSON.stringify({
        categories: visiblePackage.categories,
        count: visiblePackage.categories.length,
        activeSource: visiblePackage.activeSource
      }),{headers:cors});
    }

    // ── /api/flush — Clear raw/curated for a sport ──
    if(url.pathname==='/api/flush'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var body=await request.json();var target=body.sport;
      if(target){
        await env.NEWS_KV.delete('raw:'+target);
        await env.CURATED_KV.delete('curated:'+target);
        return new Response(JSON.stringify({flushed:true,sport:target}),{headers:cors});
      }
      return new Response(JSON.stringify({error:'No sport provided'}),{status:400,headers:cors});
    }

    // ── /api/trigger-fetch — Manual refresh ──
    if(url.pathname==='/api/trigger-fetch'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
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

    // ── /api/feeds — Manage feed sources ──
    if(url.pathname==='/api/feeds'){
      if(request.method==='GET'){
        var runtimeFeeds = await getRuntimeSportsPackage(env);
        return new Response(JSON.stringify({
          feeds: runtimeFeeds.feeds,
          count: runtimeFeeds.feeds.length,
          activeSource: runtimeFeeds.source
        }),{headers:cors});
      }
      if(request.method==='POST'){
        if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
        var body=await request.json();
        if(!body.sport||!body.url||!body.priority)return new Response(JSON.stringify({error:'Missing sport, url or priority'}),{status:400,headers:cors});
        var runtimePackagePost = await getRuntimeSportsPackage(env);
        var configPost = runtimePackagePost.config;
        var existingUrlsPost = new Set(runtimePackagePost.feeds.map(function (feed) { return feed.url; }));

        if(existingUrlsPost.has(body.url))return new Response(JSON.stringify({error:'Feed URL already exists'}),{status:409,headers:cors});

        var categoryPost = configPost.categories.find(function (category) {
          return category.sport === body.sport;
        });

        if(!categoryPost){
          categoryPost = {
            sport: body.sport,
            label: body.label || body.sport,
            priority: parseInt(body.priority),
            enabled: true,
            notes: '',
            feeds: []
          };
          configPost.categories.push(categoryPost);
        } else {
          categoryPost.label = body.label || categoryPost.label || body.sport;
          categoryPost.priority = parseInt(body.priority || categoryPost.priority || 1);
        }

        categoryPost.feeds.push({
          name: body.name || 'Unknown Feed',
          url: body.url,
          priority: categoryPost.feeds.length + 1,
          enabled: true,
          type: body.type || 'rss',
          notes: body.notes || '',
          source: body.source || ''
        });

        var savedPost = await saveFeedsConfig(env, configPost);
        return new Response(JSON.stringify({success:true,total:savedPost.feeds.length,categories:savedPost.config.categories.length}),{headers:cors});
      }
      if(request.method==='DELETE'){
        if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
        var body=await request.json();
        var runtimePackageDelete = await getRuntimeSportsPackage(env);
        runtimePackageDelete.config.categories = runtimePackageDelete.config.categories
          .map(function (category) {
            category.feeds = (category.feeds || []).filter(function (feed) {
              return feed.url !== body.url;
            });
            return category;
          })
          .filter(function (category) {
            return (category.feeds || []).length > 0;
          });

        var savedDelete = await saveFeedsConfig(env, runtimePackageDelete.config);
        return new Response(JSON.stringify({success:true,remaining:savedDelete.feeds.length}),{headers:cors});
      }
    }

    // ── /api/preload-feeds — One-time seed of all feeds to KV ──
    if(url.pathname==='/api/preload-feeds'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var runtimePackagePreload = await getRuntimeSportsPackage(env);
      var configPreload = runtimePackagePreload.config;
      var existingUrlsPreload = new Set(runtimePackagePreload.feeds.map(function (feed) { return feed.url; }));
      var added = 0;

      PRELOADED_FEEDS.forEach(function (feed) {
        if (existingUrlsPreload.has(feed.url)) return;

        var categoryPreload = configPreload.categories.find(function (category) {
          return category.sport === feed.sport;
        });

        if (!categoryPreload) {
          categoryPreload = {
            sport: feed.sport,
            label: feed.label || feed.sport,
            priority: parseInt(feed.priority || 1),
            enabled: true,
            notes: '',
            feeds: []
          };
          configPreload.categories.push(categoryPreload);
        }

        categoryPreload.feeds.push({
          name: feed.name || 'Unknown Feed',
          url: feed.url,
          priority: categoryPreload.feeds.length + 1,
          enabled: true,
          type: feed.type || (String(feed.url).includes('youtube.com/feeds') ? 'youtube' : 'rss'),
          notes: '',
          source: feed.source || ''
        });
        added++;
      });

      var savedPreload = await saveFeedsConfig(env, configPreload);
      return new Response(JSON.stringify({success:true,added:added,total:savedPreload.feeds.length}),{headers:cors});
    }

    // ── /api/test-feed — Validate an RSS URL ──
    if(url.pathname==='/api/test-feed'&&request.method==='POST'){
      var body=await request.json();
      var feedUrl=body.url;
      if(!feedUrl)return new Response(JSON.stringify({error:'Missing url'}),{status:400,headers:cors});
      try{
        var r=await fetch(feedUrl,{headers:{'User-Agent':'MangoSports/1.0'},signal:AbortSignal.timeout(8000)});
        if(!r.ok)throw new Error('HTTP '+r.status);
        var xml=await r.text();
        if(!xml.includes('<rss')&&!xml.includes('<feed')&&!xml.includes('<channel'))throw new Error('Not a valid RSS/Atom feed');
        var titleMatch=xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        var feedTitle=titleMatch?titleMatch[1].trim().slice(0,60):'Unknown Feed';
        var itemCount=(xml.match(/<item>/g)||[]).length+(xml.match(/<entry>/g)||[]).length;
        return new Response(JSON.stringify({valid:true,name:feedTitle,itemCount,message:'Valid feed — '+itemCount+' items found'}),{headers:cors});
      }catch(e){
        return new Response(JSON.stringify({valid:false,message:'Invalid feed: '+e.message}),{headers:cors});
      }
    }

    // ── /api/publish-own — Publish original article (admin only) ──
    if(url.pathname==='/api/publish-own'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var body=await request.json();
      var article=body.article;
      var sports=body.sports||(body.sport?[body.sport]:[]);
      if(!sports.length||!article)return new Response(JSON.stringify({error:'Missing sports or article'}),{status:400,headers:cors});
      var savedTo=[];
      for(var sp of sports){
        var existing=await env.MY_NEWS_KV.get('my:'+sp);
        var articles=existing?JSON.parse(existing):[];
        var articleCopy=Object.assign({},article,{sport:sp});
        articles.unshift(articleCopy);
        articles=articles.slice(0,50); // Max 50 own articles per sport
        await env.MY_NEWS_KV.put('my:'+sp,JSON.stringify(articles));
        savedTo.push(sp);
      }
      return new Response(JSON.stringify({success:true,savedTo,total:savedTo.length}),{headers:cors});
    }

    // ── /api/own-articles — List own articles (admin only) ──
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

    // ── /api/delete-own — Delete own article (admin only) ──
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

    // ── /api/save-curated — Push pre-parsed articles to CURATED_KV ──
    if(url.pathname==='/api/save-curated'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var body=await request.json();
      var sport=body.sport;
      var articles=body.articles||[];
      if(!sport||!articles.length)return new Response(JSON.stringify({error:'Missing sport or articles'}),{status:400,headers:cors});
      var seen=new Set(),unique=[];
      articles.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});
      articles.forEach(function(a){if(!seen.has(a.link)){seen.add(a.link);unique.push(a);}});
      unique=unique.slice(0,150);
      await env.CURATED_KV.put('curated:'+sport,JSON.stringify(unique),{expirationTtl:86400});
      return new Response(JSON.stringify({success:true,sport:sport,saved:unique.length}),{headers:cors});
    }

    return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors});
  },

  // ── Cron Handler ──
  // FIX (23-Apr-2026): Duplicate scheduled() removed.
  // JS object literals silently overwrite duplicate keys — the second
  // handler was killing the raw-fetch branch entirely. Merged into one.
  async scheduled(event, env, ctx) {
    var SPORTS = await buildSportsFromKV(env);
    if (event.cron === '30 23 * * *' || event.cron === '30 11 * * *') {
      // Offset cron: fetch raw → curate with OG images → run SEO agent
      ctx.waitUntil((async function () {
        await Promise.allSettled(Object.keys(SPORTS).map(function(k) { return fetchRawSport(k, SPORTS[k], env); }));
        await Promise.allSettled(Object.keys(SPORTS).map(function(k) { return curateSport(k, env); }));
        await runSEOAgent(env);
      })());
    } else {
      // Main cron (every 10 min): fetch raw RSS → NEWS_KV
      ctx.waitUntil(Promise.allSettled(Object.keys(SPORTS).map(function(k) { return fetchRawSport(k, SPORTS[k], env); })));
    }
  }
};
