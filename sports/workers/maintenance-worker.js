/**
 * ============================================================
 * WORKER: sportsrip-maintenance
 * PURPOSE: Backup and restore CURATED_KV data.
 *          Use when you need to recover articles after a flush.
 * KV BINDINGS REQUIRED: CURATED_KV, CURATED_KV_BK
 * ============================================================
 */

// ============================================================
// ⚙️  INSTANCE CONFIG — Change this to match your admin password
// ============================================================
const CONFIG = {
  adminPass: 'sportsrip2026', // ← Must match x-admin-pass in your main worker
};
// ============================================================

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-pass',
  'Content-Type': 'application/json'
};

function isAdmin(req) {
  return req.headers.get('x-admin-pass') === CONFIG.adminPass;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const sport = url.searchParams.get('sport');
    const type  = url.searchParams.get('type') || 'live'; // 'live' or 'backup'

    // Helper: get article count from a KV key
    async function getArticleCount(kv, sport) {
      const data = await kv.get(`curated:${sport}`);
      if (!data) return 0;
      try {
        const arr = JSON.parse(data);
        return Array.isArray(arr) ? arr.length : 0;
      } catch(e) { return 0; }
    }

    // --- 1. STATUS (no auth required — read-only) ---
    if (url.pathname === '/api/status') {
      const kv = (type === 'backup') ? env.CURATED_KV_BK : env.CURATED_KV;
      const count = await getArticleCount(kv, sport);
      return new Response(JSON.stringify({ sport, count, type }), { headers: cors });
    }

    // --- 2. BACKUP (admin only) ---
    if (url.pathname === '/api/backup' && request.method === 'POST') {
      if (!isAdmin(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
      const count = await getArticleCount(env.CURATED_KV, sport);
      const curated = await env.CURATED_KV.get(`curated:${sport}`);
      if (curated) await env.CURATED_KV_BK.put(`curated:${sport}`, curated);
      return new Response(JSON.stringify({ success: true, sport, count, message: `Backed up ${count} articles` }), { headers: cors });
    }

    // --- 3. RESTORE (admin only) ---
    if (url.pathname === '/api/restore' && request.method === 'POST') {
      if (!isAdmin(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
      const count = await getArticleCount(env.CURATED_KV_BK, sport);
      const backup = await env.CURATED_KV_BK.get(`curated:${sport}`);
      if (backup) await env.CURATED_KV.put(`curated:${sport}`, backup);
      return new Response(JSON.stringify({ success: true, sport, count, message: `Restored ${count} articles` }), { headers: cors });
    }

    // --- 4. FLUSH (admin only) ---
    if (url.pathname === '/api/flush' && request.method === 'POST') {
      if (!isAdmin(request)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
      const kv = (type === 'backup') ? env.CURATED_KV_BK : env.CURATED_KV;
      const count = await getArticleCount(kv, sport);
      if (sport === 'all') {
        const list = await kv.list({ prefix: 'curated:' });
        for (const k of list.keys) { await kv.delete(k.name); }
      } else {
        await kv.delete(`curated:${sport}`);
      }
      return new Response(JSON.stringify({ success: true, sport, count, message: `Flushed ${count} articles` }), { headers: cors });
    }

    return new Response(JSON.stringify({ message: 'Maintenance Worker Active' }), { headers: cors });
  }
};
