// SPORTSrip - Feeds Admin Worker
// Purpose:
// - Manage FEEDS_KV only
// - Validate RSS/Atom feed URLs
// - Discover possible RSS feeds from publisher websites
// - Keep main worker isolated from admin feed tooling

var CONFIG = {
  siteName: 'SPORTSrip',
  siteUrl: 'https://sportsrip-feeds-admin-worker.ravi-kompel.workers.dev',
  workerName: 'sportsrip-feeds-admin-worker',
  adminPass: 'sportsrip2026'
};

var cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-admin-pass',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: cors
  });
}

function isAdmin(req) {
  return req.headers.get('x-admin-pass') === CONFIG.adminPass;
}

async function parseRequestJson(request) {
  try {
    return await request.json();
  } catch (e) {
    throw new Error('Invalid JSON body');
  }
}

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

  if (!config || !Array.isArray(config.categories)) {
    return normalized;
  }

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
            type: feed.type || (String(feed.url).indexOf('youtube.com/feeds') !== -1 ? 'youtube' : 'rss'),
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

async function loadFeedsConfig(env) {
  var rawConfig = await env.FEEDS_KV.get('feeds_config_v1');
  if (!rawConfig) return getDefaultFeedsConfig();

  try {
    return normalizeFeedsConfig(JSON.parse(rawConfig));
  } catch (e) {
    throw new Error('FEEDS_KV contains invalid JSON for feeds_config_v1');
  }
}

async function saveFeedsConfig(env, config) {
  var normalized = normalizeFeedsConfig(config || getDefaultFeedsConfig());
  await env.FEEDS_KV.put('feeds_config_v1', JSON.stringify(normalized));

  if (env.CONTROL_PANEL_KV) {
    try {
      await env.CONTROL_PANEL_KV.put('feeds_admin:last_save', JSON.stringify({
        at: new Date().toISOString(),
        categories: normalized.categories.length,
        worker: CONFIG.workerName
      }));
    } catch (e) {}
  }

  return normalized;
}

function buildDiscoveryCandidates(inputUrl) {
  var candidates = [];
  var seen = {};
  var parsed;

  try {
    parsed = new URL(inputUrl);
  } catch (e) {
    return candidates;
  }

  var root = parsed.origin;
  var commonPaths = [
    '/feed',
    '/rss',
    '/rss.xml',
    '/feed.xml',
    '/feeds/posts/default',
    '/index.xml',
    '/atom.xml'
  ];

  commonPaths.forEach(function (path) {
    var candidate = root + path;
    if (!seen[candidate]) {
      seen[candidate] = true;
      candidates.push(candidate);
    }
  });

  return candidates;
}

function buildExpandedDiscoveryCandidates(inputUrl) {
  var candidates = [];
  var seen = {};

  function add(url) {
    if (!url || seen[url]) return;
    seen[url] = true;
    candidates.push(url);
  }

  try {
    var parsed = new URL(inputUrl);
    var cleanPath = parsed.pathname.replace(/\/+$/, '');
    var parentPath = cleanPath.replace(/\/[^\/]*$/, '') || '/';

    add(parsed.toString());
    add(parsed.origin + '/');
    add(parsed.origin + parentPath);

    buildDiscoveryCandidates(parsed.origin + '/').forEach(add);
    buildDiscoveryCandidates(parsed.origin + parentPath).forEach(add);
  } catch (e) {
    buildDiscoveryCandidates(inputUrl).forEach(add);
  }

  return candidates;
}

function discoverFeedLinksFromHtml(html, baseUrl) {
  var matches = [];
  var seen = {};
  var linkTags = html.match(/<link\b[^>]*>/gi) || [];
  var anchorTags = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [];

  function addCandidate(rawHref) {
    try {
      var absolute = new URL(rawHref, baseUrl).toString();
      if (!seen[absolute]) {
        seen[absolute] = true;
        matches.push(absolute);
      }
    } catch (e) {}
  }

  linkTags.forEach(function (tag) {
    var lower = tag.toLowerCase();
    var isAlternate = lower.indexOf('alternate') !== -1;
    var isFeedType = /application\/rss\+xml|application\/atom\+xml|application\/xml|text\/xml/.test(lower);
    var hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (isAlternate && isFeedType && hrefMatch) addCandidate(hrefMatch[1]);
  });

  anchorTags.forEach(function (tag) {
    var hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return;
    if (/feed|rss|atom|xml/i.test(hrefMatch[1])) addCandidate(hrefMatch[1]);
  });

  return matches;
}

function extractTag(xml, tag) {
  var cr = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/' + tag + '>', 'i');
  var pl = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  var match = xml.match(cr) || xml.match(pl);
  return match ? match[1].trim() : null;
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanText(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseFeedPreviewArticles(xml, sourceName, limit) {
  var articles = [];
  var itemLimit = Math.max(1, Math.min(Number(limit || 6), 12));
  var itemRe = /<item>([\s\S]*?)<\/item>/gi;
  var entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  var match;

  while ((match = itemRe.exec(xml)) !== null && articles.length < itemLimit) {
    var item = match[1];
    var title = extractTag(item, 'title');
    var link = extractTag(item, 'link');
    var pubDate = extractTag(item, 'pubDate');
    var desc = extractTag(item, 'description');
    var media = item.match(/media:content[^>]+url=["']([^"']+)["']/i) || item.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i);
    var img = media ? media[1] : null;
    if (!title || !link) continue;
    articles.push({
      title: cleanText(title),
      link: link.trim(),
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      description: cleanText(stripHtml(desc || '')),
      image: img,
      source: sourceName || 'Feed'
    });
  }

  while ((match = entryRe.exec(xml)) !== null && articles.length < itemLimit) {
    var entry = match[1];
    var entryTitle = extractTag(entry, 'title');
    var hrefMatch = entry.match(/<link[^>]+href=["']([^"']+)["']/i);
    var entryLink = hrefMatch ? hrefMatch[1] : null;
    var entryPub = extractTag(entry, 'published') || extractTag(entry, 'updated');
    var entryDesc = extractTag(entry, 'summary') || extractTag(entry, 'content');
    var videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) || entry.match(/<video_id>([^<]+)<\/video_id>/i);
    var image = null;

    if (videoIdMatch) {
      entryLink = 'https://www.youtube.com/watch?v=' + videoIdMatch[1].trim();
      image = 'https://img.youtube.com/vi/' + videoIdMatch[1].trim() + '/hqdefault.jpg';
    }

    if (!entryTitle || !entryLink) continue;
    articles.push({
      title: cleanText(entryTitle),
      link: entryLink.trim(),
      pubDate: entryPub ? new Date(entryPub).toISOString() : null,
      description: cleanText(stripHtml(entryDesc || '')),
      image: image,
      source: sourceName || 'Feed'
    });
  }

  return articles;
}

async function fetchFeedPreview(feedUrl, sourceName, limit) {
  var response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'MangoSports/1.0' },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }

  var text = await response.text();
  var isFeed = text.indexOf('<rss') !== -1 || text.indexOf('<feed') !== -1 || text.indexOf('<channel') !== -1;
  if (!isFeed) throw new Error('Not a valid RSS/Atom feed');

  return {
    articles: parseFeedPreviewArticles(text, sourceName, limit),
    raw: text
  };
}

async function probeFeedUrl(feedUrl) {
  try {
    var response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'MangoSports/1.0' },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return {
        valid: false,
        url: feedUrl,
        status: response.status,
        reason: 'HTTP ' + response.status
      };
    }

    var text = await response.text();
    var isFeed = text.indexOf('<rss') !== -1 || text.indexOf('<feed') !== -1 || text.indexOf('<channel') !== -1;

    if (!isFeed) {
      return {
        valid: false,
        url: feedUrl,
        status: response.status,
        reason: 'Not a valid RSS/Atom feed'
      };
    }

    var itemCount = (text.match(/<item\b/gi) || []).length + (text.match(/<entry\b/gi) || []).length;
    var titleMatch = text.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) ||
      text.match(/<feed[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
    var feedTitle = titleMatch ? String(titleMatch[1]).replace(/<[^>]*>/g, '').trim().slice(0, 120) : 'Unknown Feed';

    return {
      valid: true,
      url: feedUrl,
      status: response.status,
      itemCount: itemCount,
      name: feedTitle
    };
  } catch (e) {
    return {
      valid: false,
      url: feedUrl,
      reason: e.message || 'Fetch failed'
    };
  }
}

export default {
  async fetch(request, env) {
    try {
      var url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: cors });
      }

      if (url.pathname === '/api/mode') {
        return jsonResponse({
          mode: 'feeds-admin',
          version: 'v1.0-feeds-admin',
          deployed: '03-Apr-2026',
          worker: CONFIG.workerName
        });
      }

      if (url.pathname === '/api/feeds-config') {
        if (!isAdmin(request)) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        if (request.method === 'GET') {
          var config = await loadFeedsConfig(env);
          return jsonResponse({
            success: true,
            source: 'FEEDS_KV',
            key: 'feeds_config_v1',
            config: config
          });
        }

        if (request.method === 'POST') {
          var body = await parseRequestJson(request);
          var saved = await saveFeedsConfig(env, body.config || getDefaultFeedsConfig());
          return jsonResponse({
            success: true,
            source: 'FEEDS_KV',
            key: 'feeds_config_v1',
            categories: saved.categories.length,
            updatedAt: saved.updatedAt
          });
        }

        return jsonResponse({ error: 'Method not allowed' }, 405);
      }

      if (url.pathname === '/api/test-feed' && request.method === 'POST') {
        if (!isAdmin(request)) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        var bodyTest = await parseRequestJson(request);
        var feedUrl = bodyTest.url;

        if (!feedUrl) {
          return jsonResponse({ error: 'Missing url' }, 400);
        }

        var tested = await probeFeedUrl(feedUrl);

        if (!tested.valid) {
          return jsonResponse({
            valid: false,
            url: feedUrl,
            message: 'Invalid feed: ' + (tested.reason || 'Unknown error'),
            status: tested.status || null
          });
        }

        return jsonResponse({
          valid: true,
          url: tested.url,
          name: tested.name,
          itemCount: tested.itemCount,
          message: 'Valid feed - ' + tested.itemCount + ' items found'
        });
      }

      if (url.pathname === '/api/feed-preview' && request.method === 'POST') {
        if (!isAdmin(request)) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        var bodyPreview = await parseRequestJson(request);
        var previewUrl = bodyPreview.url;
        var previewName = bodyPreview.name || 'Feed';
        var previewLimit = Number(bodyPreview.limit || 6);

        if (!previewUrl) {
          return jsonResponse({ error: 'Missing url' }, 400);
        }

        try {
          var preview = await fetchFeedPreview(previewUrl, previewName, previewLimit);
          return jsonResponse({
            success: true,
            url: previewUrl,
            name: previewName,
            articles: preview.articles,
            count: preview.articles.length
          });
        } catch (e) {
          return jsonResponse({
            success: false,
            url: previewUrl,
            name: previewName,
            articles: [],
            count: 0,
            message: e.message || 'Preview failed'
          });
        }
      }

      if (url.pathname === '/api/discover-feeds' && request.method === 'POST') {
        if (!isAdmin(request)) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        var bodyDiscover = await parseRequestJson(request);
        var targetUrl = bodyDiscover.url;

        if (!targetUrl) {
          return jsonResponse({ error: 'Missing url' }, 400);
        }

        var pageResponse;
        try {
          pageResponse = await fetch(targetUrl, {
            headers: { 'User-Agent': 'MangoSports/1.0' },
            signal: AbortSignal.timeout(8000)
          });
        } catch (e) {
          return jsonResponse({
            success: false,
            url: targetUrl,
            discovered: [],
            message: 'Could not load website: ' + e.message
          });
        }

        if (!pageResponse.ok) {
          return jsonResponse({
            success: false,
            url: targetUrl,
            discovered: [],
            message: 'Could not load website: HTTP ' + pageResponse.status
          });
        }

        var html = await pageResponse.text();
        var discovered = discoverFeedLinksFromHtml(html, targetUrl).concat(buildExpandedDiscoveryCandidates(targetUrl));
        var deduped = [];
        var seen = {};

        discovered.forEach(function (candidate) {
          if (!seen[candidate]) {
            seen[candidate] = true;
            deduped.push(candidate);
          }
        });

        var verified = [];
        for (var i = 0; i < deduped.length; i++) {
          var result = await probeFeedUrl(deduped[i]);
          if (result.valid) {
            verified.push({
              url: result.url,
              name: result.name,
              itemCount: result.itemCount
            });
          }
          if (verified.length >= 10) break;
        }

        if (env.CONTROL_PANEL_KV) {
          try {
            await env.CONTROL_PANEL_KV.put('feeds_admin:last_discovery', JSON.stringify({
              at: new Date().toISOString(),
              url: targetUrl,
              found: verified.length
            }));
          } catch (e) {}
        }

        return jsonResponse({
          success: true,
          url: targetUrl,
          discovered: verified,
          count: verified.length
        });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (e) {
      return jsonResponse({ error: e.message || 'Unknown error' }, 500);
    }
  }
};
