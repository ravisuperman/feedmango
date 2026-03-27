/*
 * ============================================================
 * Mango Sports Worker — DEV Instance
 * Created  : 27-Mar-2026
 * Purpose  : Cloudflare Worker for DEV testing environment.
 *            Mirrors PROD worker exactly.
 *            Test all changes here before moving to PROD.
 *
 * Change log:
 * 27-Mar-2026 — Initial clean DEV worker created
 * 27-Mar-2026 — Added Google sitemap + robots.txt routes
 * 27-Mar-2026 — Added /api/news merge: own articles always on top
 * 27-Mar-2026 — Added /api/publish-own, /api/own-articles, /api/delete-own
 * 27-Mar-2026 — Added admin password helper (isAdmin)
 * ============================================================
 */

var SPORTS = {
  ipl: {
    label: 'IPL',
    feeds: [
      {name:'ESPN Cricinfo', url:'https://www.espncricinfo.com/rss/content/story/feeds/0.xml'},
      {name:'Hindustan Times', url:'https://www.hindustantimes.com/feeds/rss/cricket/ipl/rssfeed.xml'},
      {name:'Times of India', url:'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms'},
      {name:'NDTV Sports', url:'https://sports.ndtv.com/cricket/rss'}
    ]
  },
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
    if(encTag&&encTag[0].toLowerCase().includes("image")){
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
  }catch(e){console.error('Feed failed:'+feed.name+' '+e.message);return[];}
}

async function fetchRawSport(sportKey,env,overrideLimit){
  var sportObj=SPORTS[sportKey]; if(!sportObj)return;
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

// x-admin-pass added to CORS so admin panel calls are not blocked (27-Mar-2026)
var cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,x-admin-pass',
  'Content-Type':'application/json'
};

// ============================================================
// BLOCK START: Admin Password Helper
// Added  : 27-Mar-2026
// Purpose: Protects all admin routes with a password check.
//          Change ADMIN_PASS to your own private password.
//          Must match the password in admin.html exactly.
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
    // Purpose: Serves sitemap.xml and robots.txt for Google indexing.
    //          Update <lastmod> date when major content changes.
    // WARNING: DO NOT REMOVE — removing will de-index the site.
    // ============================================================
    if(url.pathname==='/sitemap.xml'){
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.sportsrip.com/</loc>
    <lastmod>2026-03-27</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,{headers:{'Content-Type':'application/xml'}});
    }
    if(url.pathname==='/robots.txt'){
      return new Response(`User-agent: *\nAllow: /\nSitemap: https://www.sportsrip.com/sitemap.xml`,{headers:{'Content-Type':'text/plain'}});
    }
    // BLOCK END: Google SEO — Sitemap + Robots (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/news — Your Articles Always On Top
    // Added  : 27-Mar-2026
    // Purpose: Merges YOUR articles from MY_NEWS_KV (with isOwn:true)
    //          above RSS articles from CURATED_KV.
    //          Your articles always appear first on every sport tab.
    // ============================================================
    if(url.pathname==='/api/news'){
      var sport=url.searchParams.get('sport');
      if(!sport||!SPORTS[sport])return new Response(JSON.stringify({error:'Invalid sport'}),{status:400,headers:cors});
      var myRaw=await env.MY_NEWS_KV.get('my:'+sport);
      var myArticles=myRaw?JSON.parse(myRaw):[];
      myArticles.forEach(function(a){a.isOwn=true;a.sport=sport;});
      var rssRaw=await env.CURATED_KV.get('curated:'+sport);
      var rssArticles=rssRaw?JSON.parse(rssRaw):[];
      var articles=myArticles.concat(rssArticles);
      return new Response(JSON.stringify({sport,articles,count:articles.length}),{headers:cors});
    }
    // BLOCK END: /api/news — Your Articles Always On Top (27-Mar-2026)
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
      var keys=(targetedSport==='all')?Object.keys(SPORTS):[targetedSport];
      for(var i=0;i<keys.length;i++){
        if(SPORTS[keys[i]]){
          if(type==='curate')await curateSport(keys[i],env);
          else await fetchRawSport(keys[i],env,customLimit);
        }
      }
      return new Response(JSON.stringify({triggered:type,done:true,updated:keys.length}),{headers:cors});
    }

    // ============================================================
    // BLOCK START: /api/publish-own — Save Your Own Article
    // Added  : 27-Mar-2026
    // Purpose: Called by admin.html Publish button.
    //          Prepends article to top of MY_NEWS_KV for the sport.
    //          Max 50 own articles per sport stored at any time.
    //          Protected by isAdmin() password check.
    // ============================================================
    if(url.pathname==='/api/publish-own'&&request.method==='POST'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var body=await request.json();
      var sport=body.sport,article=body.article;
      if(!sport||!article)return new Response(JSON.stringify({error:'Missing sport or article'}),{status:400,headers:cors});
      var existing=await env.MY_NEWS_KV.get('my:'+sport);
      var articles=existing?JSON.parse(existing):[];
      articles.unshift(article);
      articles=articles.slice(0,50);
      await env.MY_NEWS_KV.put('my:'+sport,JSON.stringify(articles));
      return new Response(JSON.stringify({success:true,total:articles.length}),{headers:cors});
    }
    // BLOCK END: /api/publish-own — Save Your Own Article (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/own-articles — List All Your Articles
    // Added  : 27-Mar-2026
    // Purpose: Called by admin.html on load.
    //          Returns all own articles across all sports merged
    //          and sorted newest first.
    //          Protected by isAdmin() password check.
    // ============================================================
    if(url.pathname==='/api/own-articles'){
      if(!isAdmin(request))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
      var allOwn=[];
      for(var sk of Object.keys(SPORTS)){
        var raw=await env.MY_NEWS_KV.get('my:'+sk);
        if(raw)allOwn=allOwn.concat(JSON.parse(raw));
      }
      allOwn.sort(function(a,b){return new Date(b.pubDate)-new Date(a.pubDate);});
      return new Response(JSON.stringify({articles:allOwn}),{headers:cors});
    }
    // BLOCK END: /api/own-articles — List All Your Articles (27-Mar-2026)
    // ============================================================

    // ============================================================
    // BLOCK START: /api/delete-own — Delete One Of Your Articles
    // Added  : 27-Mar-2026
    // Purpose: Called by admin.html Delete button.
    //          Removes article by link URL from MY_NEWS_KV.
    //          Protected by isAdmin() password check.
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
    // BLOCK END: /api/delete-own — Delete One Of Your Articles (27-Mar-2026)
    // ============================================================

    return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors});
  },

  async scheduled(event,env,ctx){
    if(event.cron==='5/10 * * * *'){
      ctx.waitUntil(Promise.allSettled(Object.keys(SPORTS).map(function(k){return curateSport(k,env);})));
    } else {
      ctx.waitUntil(Promise.allSettled(Object.keys(SPORTS).map(function(k){return fetchRawSport(k,env);})));
    }
  }
};
