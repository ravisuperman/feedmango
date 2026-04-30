// SPORTSrip - Backup Worker (Dynamic Snapshot Backup)
var CONFIG = {
  siteName: 'SPORTSrip',
  siteUrl: 'https://sportsrip-backup-worker.ravi-kompel.workers.dev',
  workerName: 'sportsrip-backup-worker',
  adminPass: 'sportsrip2026'
};

var cors = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,x-admin-pass',
  'Content-Type':'application/json',
  'Cache-Control':'no-cache, no-store, must-revalidate',
  'Pragma':'no-cache',
  'Expires':'0'
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: cors
  });
}

function isAdmin(req) {
  return req.headers.get('x-admin-pass') === CONFIG.adminPass;
}

function safeJsonParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
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

  if (!config || !Array.isArray(config.categories)) return normalized;

  normalized.updatedAt = config.updatedAt || new Date().toISOString();
  normalized.categories = config.categories
    .filter(function (category) { return category && category.sport; })
    .map(function (category, categoryIndex) {
      var feeds = Array.isArray(category.feeds) ? category.feeds : [];
      return {
        sport: String(category.sport).trim(),
        key: String(category.sport).trim(),
        label: category.label || String(category.sport).trim(),
        priority: Number(category.priority || (categoryIndex + 1)),
        enabled: category.enabled !== false,
        notes: category.notes || '',
        feeds: feeds
          .filter(function (feed) { return feed && feed.url; })
          .map(function (feed, feedIndex) {
            return {
              name: feed.name || 'Unknown Feed',
              url: String(feed.url).trim(),
              priority: Number(feed.priority || (feedIndex + 1)),
              enabled: feed.enabled !== false,
              type: feed.type || 'rss',
              notes: feed.notes || '',
              source: feed.source || ''
            };
          })
          .sort(function (a, b) { return a.priority - b.priority; })
      };
    })
    .sort(function (a, b) { return a.priority - b.priority; });

  return normalized;
}

function collectCategoryKeys(config) {
  if (!config || !Array.isArray(config.categories)) return [];
  return config.categories
    .map(function (category) { return category && category.sport; })
    .filter(function (sport) { return !!sport; });
}

async function loadBackupConfig(env) {
  var raw = await env.FEEDS_KV_BK.get('feeds_config_v1');
  return normalizeFeedsConfig(safeJsonParse(raw, getDefaultFeedsConfig()));
}

async function saveBackupConfig(env, config) {
  var normalized = normalizeFeedsConfig(config);
  await env.FEEDS_KV_BK.put('feeds_config_v1', JSON.stringify(normalized));
  return normalized;
}

async function buildVisibleCategories(env) {
  var config = await loadBackupConfig(env);
  var categories = [];

  for (var i = 0; i < config.categories.length; i++) {
    var category = config.categories[i];
    if (category.enabled === false) continue;

    var curatedRaw = await env.CURATED_KV_BK.get('curated:' + category.sport);
    var ownRaw = await env.MY_NEWS_KV_BK.get('my:' + category.sport);
    var curated = safeJsonParse(curatedRaw, []);
    var own = safeJsonParse(ownRaw, []);
    var total = curated.length + own.length;

    if (!total) continue;

    categories.push({
      sport: category.sport,
      key: category.sport,
      label: category.label || category.sport,
      priority: category.priority,
      feedCount: (category.feeds || []).filter(function (feed) {
        return feed.enabled !== false;
      }).length,
      curatedCount: curated.length,
      ownCount: own.length,
      totalCount: total
    });
  }

  categories.sort(function (a, b) { return a.priority - b.priority; });
  return categories;
}

async function exportBackupSnapshot(env) {
  var config = await loadBackupConfig(env);
  var categoryKeys = collectCategoryKeys(config);
  var curated = {};
  var own = {};
  var counts = {};

  for (var i = 0; i < categoryKeys.length; i++) {
    var sport = categoryKeys[i];
    curated[sport] = safeJsonParse(await env.CURATED_KV_BK.get('curated:' + sport), []);
    own[sport] = safeJsonParse(await env.MY_NEWS_KV_BK.get('my:' + sport), []);
    counts[sport] = {
      curated: curated[sport].length,
      own: own[sport].length,
      total: curated[sport].length + own[sport].length
    };
  }

  return {
    source: 'backup',
    config: config,
    categories: config.categories || [],
    curated: curated,
    own: own,
    counts: counts,
    exportedAt: new Date().toISOString()
  };
}

async function flushBackupData(env, config) {
  var categoryKeys = collectCategoryKeys(config);
  for (var i = 0; i < categoryKeys.length; i++) {
    var sport = categoryKeys[i];
    await env.CURATED_KV_BK.delete('curated:' + sport);
    await env.MY_NEWS_KV_BK.delete('my:' + sport);
  }
}

function summarizeSnapshotRows(config, curated, own) {
  var categoryKeys = collectCategoryKeys(config);
  var summary = {
    categories: categoryKeys.length,
    feeds: 0,
    curatedRows: 0,
    ownRows: 0,
    totalRows: 0
  };

  (config.categories || []).forEach(function (category) {
    summary.feeds += (category.feeds || []).length;
  });

  categoryKeys.forEach(function (sport) {
    var curatedItems = Array.isArray(curated[sport]) ? curated[sport] : [];
    var ownItems = Array.isArray(own[sport]) ? own[sport] : [];
    summary.curatedRows += curatedItems.length;
    summary.ownRows += ownItems.length;
  });

  summary.totalRows = summary.curatedRows + summary.ownRows;
  return summary;
}

async function importBackupSnapshot(env, payload) {
  var config = normalizeFeedsConfig(payload && payload.config ? payload.config : getDefaultFeedsConfig());
  var existingConfig = await loadBackupConfig(env);
  var curated = payload && payload.curated ? payload.curated : {};
  var own = payload && payload.own ? payload.own : {};
  var importedKeys = collectCategoryKeys(config);
  var rowSummary = summarizeSnapshotRows(config, curated, own);

  await flushBackupData(env, existingConfig);
  await saveBackupConfig(env, config);

  for (var i = 0; i < importedKeys.length; i++) {
    var sport = importedKeys[i];
    var curatedItems = Array.isArray(curated[sport]) ? curated[sport] : [];
    var ownItems = Array.isArray(own[sport]) ? own[sport] : [];

    if (curatedItems.length) {
      await env.CURATED_KV_BK.put('curated:' + sport, JSON.stringify(curatedItems));
    }
    if (ownItems.length) {
      await env.MY_NEWS_KV_BK.put('my:' + sport, JSON.stringify(ownItems));
    }
  }

  var snapshot = await exportBackupSnapshot(env);
  var now = new Date().toISOString();

  await env.CONTROL_PANEL_KV_BK.put('backup:last_run', JSON.stringify({
    at: now,
    status: 'completed',
    importedCategories: importedKeys
  }));

  await env.CONTROL_PANEL_KV_BK.put('backup:last_success', JSON.stringify({
    at: now,
    importedCategories: importedKeys,
    rowSummary: rowSummary
  }));

  await env.CONTROL_PANEL_KV_BK.put('backup:last_counts', JSON.stringify(snapshot.counts));
  await env.CONTROL_PANEL_KV_BK.put('backup:last_rows', JSON.stringify(rowSummary));

  return {
    success: true,
    importedCategories: importedKeys,
    counts: snapshot.counts,
    rowSummary: rowSummary,
    importedAt: now
  };
}

export default {
  async fetch(request, env) {
    try {
      var url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: cors });
      }

      if (url.pathname === '/sitemap.xml') {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${CONFIG.siteUrl}/</loc>\n    <lastmod>${new Date().toISOString().slice(0,10)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`,
          { headers: { 'Content-Type': 'application/xml' } }
        );
      }

      if (url.pathname === '/robots.txt') {
        return new Response(
          `User-agent: *\nAllow: /\nSitemap: ${CONFIG.siteUrl}/sitemap.xml`,
          { headers: { 'Content-Type': 'text/plain' } }
        );
      }

      if (url.pathname === '/api/categories') {
        var categories = await buildVisibleCategories(env);
        return json({ categories: categories, count: categories.length, activeSource: 'backup' });
      }

      if (url.pathname === '/api/news') {
        var sport = url.searchParams.get('sport');
        var config = await loadBackupConfig(env);
        var validSports = new Set(collectCategoryKeys(config));

        if (!sport || !validSports.has(sport)) {
          return json({ error:'Invalid sport' }, 400);
        }

        var myArticles = safeJsonParse(await env.MY_NEWS_KV_BK.get('my:' + sport), []);
        myArticles = myArticles.map(function(a) {
          return Object.assign({}, a, { isOwn: true, sport: sport });
        });

        var rssArticles = safeJsonParse(await env.CURATED_KV_BK.get('curated:' + sport), []);
        var articles = myArticles.concat(rssArticles);

        return json({
          sport: sport,
          articles: articles,
          count: articles.length,
          source: 'backup'
        });
      }

      if (url.pathname === '/api/mode') {
        var visible = await buildVisibleCategories(env);
        return json({
          mode: 'backup',
          version: 'v2.0-dynamic-backup',
          deployed: '03-Apr-2026',
          worker: CONFIG.workerName,
          visibleCategories: visible.length
        });
      }

      if (url.pathname === '/api/snapshot/export') {
        if (!isAdmin(request)) return json({ error:'Unauthorized' }, 401);
        return json(await exportBackupSnapshot(env));
      }

      if (url.pathname === '/api/backup/status') {
        if (!isAdmin(request)) return json({ error:'Unauthorized' }, 401);

        return json({
          worker: CONFIG.workerName,
          lastRun: safeJsonParse(await env.CONTROL_PANEL_KV_BK.get('backup:last_run'), null),
          lastSuccess: safeJsonParse(await env.CONTROL_PANEL_KV_BK.get('backup:last_success'), null),
          lastCounts: safeJsonParse(await env.CONTROL_PANEL_KV_BK.get('backup:last_counts'), null),
          lastRows: safeJsonParse(await env.CONTROL_PANEL_KV_BK.get('backup:last_rows'), null)
        });
      }

      if (url.pathname === '/api/backup/import' && request.method === 'POST') {
        if (!isAdmin(request)) return json({ error:'Unauthorized' }, 401);
        var body = await parseRequestJson(request);
        if (!body.payload || !body.payload.config) {
          return json({ error:'Missing payload or config' }, 400);
        }
        return json(await importBackupSnapshot(env, body.payload));
      }

      if (url.pathname === '/api/backup/flush' && request.method === 'POST') {
        if (!isAdmin(request)) return json({ error:'Unauthorized' }, 401);
        var currentConfig = await loadBackupConfig(env);
        await flushBackupData(env, currentConfig);
        await saveBackupConfig(env, getDefaultFeedsConfig());
        return json({ success: true, flushedCategories: collectCategoryKeys(currentConfig) });
      }

      return json({ error:'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }
};
