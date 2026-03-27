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
  ipl:        { label:'IPL',        feeds:[{name:'ESPN Cricinfo',   url:'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'},{name:'Hindustan Times',url:'https://www.hindustantimes.com/feeds/rss/cricket/ipl/rssfeed.xml'},{name:'Times of India',url:'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms'},{name:'NDTV Sports',url:'https://sports.ndtv.com/cricket/rss'}]},
  f1:         { label:'Formula 1',  feeds:[{name:'BBC F1',url:'https://feeds.bbci.co.uk/sport/formula1/rss.xml'},{name:'ESPN Autos',url:'https://www.espn.com/espn/rss/rpm/news'}]},
  cricket:    { label:'Cricket',    feeds:[{name:'BBC Cricket',url:'https://feeds.bbci.co.uk/sport/cricket/rss.xml'},{name:'Sky Sports Cricket',url:'https://www.skysports.com/rss/12040'},{name:'CricTracker',url:'https://crictracker.com/feed'}]},
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
  badminton:  { label:'Badminton',  feeds:[{name:'ESPN Badminton',url:'https://www.espn.in/espn/rss/badminton/news'},{name:'SportsAdda',url:'https://www.sportsadda.com/rss/badminton/news'}]}
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
  {sport:'ipl',       label:'IPL',        priority:1, name:'ESPN Cricinfo',    url:'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'},
  {sport:'ipl',       label:'IPL',        priority:2, name:'Hindustan Times',  url:'https://www.hindustantimes.com/feeds/rss/cricket/ipl/rssfeed.xml'},
  {sport:'ipl',       label:'IPL',        priority:3, name:'Times of India',   url:'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms'},
  {sport:'ipl',       label:'IPL',        priority:4, name:'NDTV Sports',      url:'https://sports.ndtv.com/cricket/rss'},
  {sport:'cricket',   label:'Cricket',    priority:1, name:'BBC Cricket',      url:'https://feeds.bbci.co.uk/sport/cricket/rss.xml'},
  {sport:'cricket',   label:'Cricket',    priority:2, name:'Sky Sports Cricket',url:'https://www.skysports.com/rss/12040'},
  {sport:'cricket',   label:'Cricket',    priority:3, name:'CricTracker',      url:'https://crictracker.com/feed'},
  {sport:'f1',        label:'Formula 1',  priority:1, name:'BBC F1',           url:'https://feeds.bbci.co.uk/sport/formula1/rss.xml'},
  {sport:'f1',        label:'Formula 1',  priority:2, name:'ESPN Autos',       url:'https://www.espn.com/espn/rss/rpm/news'},
  {sport:'basketball',label:'Basketball', priority:1, name:'ESPN NBA',         url:'https://www.espn.com/espn/rss/nba/news'},
  {sport:'basketball',label:'Basketball', priority:2, name:'BBC Basketball',   url:'https://feeds.bbci.co.uk/sport/basketball/rss.xml'},
  {sport:'baseball',  label:'Baseball',   priority:1, name:'ESPN Baseball',    url:'https://www.espn.com/espn/rss/mlb/news'},
  {sport:'football',  label:'Football',   priority:1, name:'BBC Football',     url:'https://feeds.bbci.co.uk/sport/football/rss.xml'},
  {sport:'football',  label:'Football',   priority:2, name:'ESPN Soccer',      url:'https://www.espn.com/espn/rss/soccer/news'},
  {sport:'tennis',    label:'Tennis',     priority:1, name:'BBC Tennis',       url:'https://feeds.bbci.co.uk/sport/tennis/rss.xml'},
  {sport:'tennis',    label:'Tennis',     priority:2, name:'ESPN Tennis',      url:'https://www.espn.com/espn/rss/tennis/news'},
  {sport:'kabaddi',   label:'Kabaddi',    priority:1, name:'ESPN Kabaddi',     url:'https://www.espn.in/espn/rss/kabaddi/news'},
  {sport:'kabaddi',   label:'Kabaddi',    priority:2, name:'HT Sports',        url:'https://www.hindustantimes.com/feeds/rss/sports'},
  {sport:'boxing',    label:'Boxing',     priority:1, name:'ESPN Boxing',      url:'https://www.espn.com/espn/rss/boxing/news'},
  {sport:'boxing',    label:'Boxing',     priority:2, name:'BBC Boxing',       url:'https://feeds.bbci.co.uk/sport/boxing/rss.xml'},
  {sport:'golf',      label:'Golf',       priority:1, name:'ESPN Golf',        url:'https://www.espn.com/espn/rss/golf/news'},
  {sport:'golf',      label:'Golf',       priority:2, name:'BBC Golf',         url:'https://feeds.bbci.co.uk/sport/golf/rss.xml'},
  {sport:'athletics', label:'Athletics',  priority:1, name:'BBC Athletics',    url:'https://feeds.bbci.co.uk/sport/athletics/rss.xml'},
  {sport:'rugby',     label:'Rugby',      priority:1, name:'BBC Rugby',        url:'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml'},
  {sport:'olympics',  label:'Olympics',   priority:1, name:'ESPN Olympics',    url:'https://www.espn.com/espn/rss/oly/news'},
  {sport:'nfl',       label:'NFL',        priority:1, name:'ESPN NFL',         url:'https://www.espn.com/espn/rss/nfl/news'},
  {sport:'badminton', label:'Badminton',  priority:1, name:'ESPN Badminton',   url:'https://www.espn.in/espn/rss/badminton/news'},
  {sport:'badminton', label:'Badminton',  priority:2, name:'SportsAdda',       url:'https://www.sportsadda.com/rss/badminton/news'}
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
    if(mm)img=mm[1]; else if(enc)img=enc[1]; else if(iid)img=iid[1];
    if(!title||!link)continue;
    var published=pub?new Date(pub):new Date();
    if((Date.now()-published.getTime())/3600000>48)continue;
    if(sourceName==='Sky Sports Cricket'&&!link.toLowerCase().includes('cricket'))continue;
    articles.push({title:cleanText(title),link:link.trim(),pubDate:published.toISOString(),description:cleanText(stripHtml(desc||'')),image:img,source:sourceName});
  }
  return articles;
}

async function fetchFeed(feed){
  try{
    var r=await fetch(feed.url,{headers:{'User-Agent':'MangoSports/1.0'},signal:AbortSignal.timeout(6000)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return parseRSS(await r.text(),feed.name);
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
  var existingStr=await env.CURATED_KV.get('curated:'+sportKey);
  var existingArticles=existingStr?JSON.parse(existingStr):[];
  var raw=await env.NEWS_KV.get('raw:'+sportKey); if(!raw)return;
  var articles=JSON.parse(raw);
  articles.forEach(function(a){a.sport=sportKey;});
  var merged=articles.filter(function(a){return !!a.image;}).concat(existingArticles);
  var unique=[],seen=new Set();
  merged.forEach(function(a){if(!seen.has(a.link)){seen.add(a.link);unique.push(a);}});
  unique.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});
  var cap=unique.slice(0,150);
  if(cap.length>0)await env.CURATED_KV.put('curated:'+sportKey,JSON.stringify(cap),{expirationTtl:604800});
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

export default {
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

    if(url.pathname==='/api/mode')return new Response(JSON.stringify({mode:'auto'}),{headers:cors});

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
