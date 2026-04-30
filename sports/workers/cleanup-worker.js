/**
 * ============================================================
 * WORKER: sportsrip-cleanup
 * PURPOSE: Flushes RSS aggregated data from NEWS_KV and CURATED_KV.
 * SAFETY:  Has NO access to MY_NEWS_KV — your own articles are safe.
 * KV BINDINGS REQUIRED: NEWS_KV, CURATED_KV
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // --- FLUSH: Delete RSS articles for a sport or all sports ---
    if (url.pathname === '/api/flush' && request.method === 'POST') {

      // Admin check
      if (!isAdmin(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
      }

      const body = await request.json();
      const sport = body.sport; // e.g., "ipl" or "all"

      const namespaces = [env.NEWS_KV, env.CURATED_KV];
      let deletedCount = 0;

      for (const kv of namespaces) {
        if (!kv) continue;

        // List all keys (filter by sport prefix if specified)
        const prefix = (sport === 'all') ? '' : `curated:${sport}`;
        const list = await kv.list({ prefix });

        // Delete keys
        for (const key of list.keys) {
          await kv.delete(key.name);
          deletedCount++;
        }

        // Also delete raw prefix keys
        if (sport !== 'all') {
          const rawList = await kv.list({ prefix: `raw:${sport}` });
          for (const k of rawList.keys) {
            await kv.delete(k.name);
            deletedCount++;
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Wiped ${deletedCount} records for ${sport.toUpperCase()}`
      }), { headers: cors });
    }

    return new Response(JSON.stringify({ message: 'Cleanup Worker Active' }), { headers: cors });
  }
};
