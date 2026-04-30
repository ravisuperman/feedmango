/**
 * ============================================================
 * IPL SCHEDULE & LIVE SCORE WORKER
 * ============================================================
 * Fetches the COMPLETE IPL schedule by merging two endpoints:
 *   1. currentMatches  — live scores & recent match data
 *   2. series_info     — full 70-match IPL season schedule
 *
 * This is required because currentMatches only returns 
 * ongoing/recent matches, not the full future schedule.
 *
 * Deploy at: https://ipl-live-score.ravi-kompel.workers.dev
 * ============================================================
 */

// IPL 2026 Series ID from cricapi.com
const IPL_SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=120'
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url  = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';

    // ── Route: /points ── IPL Points Table ────────────────────
    if (path === '/points') {
      return handlePointsTable(env, ctx);
    }

    // ── Route: /debug-points ── Raw API response (for debugging) ─
    if (path === '/debug-points') {
      const apiKey = env.CRICKET_API_KEY;
      if (!apiKey) return new Response(JSON.stringify({ error: 'no api key' }), { headers: corsHeaders });
      const raw = await fetch(`https://api.cricapi.com/v1/series_standings?apikey=${apiKey}&id=${IPL_SERIES_ID}`);
      const txt = await raw.text();
      return new Response(txt, { status: raw.status, headers: corsHeaders });
    }
    // ── Route: / (default) ── Schedule & Live Scores ──────────
    try {
      // 1. Serve from KV cache if fresh
      const CACHE_KEY = 'ipl_full_schedule_v2';
      if (env.IPL_KV) {
        const cached = await env.IPL_KV.get(CACHE_KEY);
        if (cached) {
          return new Response(cached, { status: 200, headers: corsHeaders });
        }
      }

      // 2. Get API key from secret
      const apiKey = env.CRICKET_API_KEY;
      if (!apiKey) throw new Error('Missing CRICKET_API_KEY secret binding.');

      // 3. Fetch BOTH endpoints in parallel
      const [currentRes, seriesRes] = await Promise.allSettled([
        fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`),
        fetch(`https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=${IPL_SERIES_ID}`)
      ]);

      // 4. Parse currentMatches (gives live scores)
      const liveMap = new Map(); // id -> match with score data
      if (currentRes.status === 'fulfilled' && currentRes.value.ok) {
        const data = await currentRes.value.json();
        if (data.status === 'success' && data.data) {
          data.data.forEach(m => {
            const title = (m.name || '').toLowerCase();
            if (title.includes('ipl') || title.includes('indian premier league')) {
              liveMap.set(m.id, m);
            }
          });
        }
      }

      // 5. Parse series_info (gives complete match schedule list)
      let scheduleList = [];
      if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
        const data = await seriesRes.value.json();
        if (data.status === 'success' && data.data && data.data.matchList) {
          scheduleList = data.data.matchList;
        }
      }

      // 6. Merge: use liveMap data as priority (has scores),
      //    fill remaining from scheduleList
      const matchMap = new Map();

      // First add all live/recent with rich data
      liveMap.forEach((m, id) => matchMap.set(id, m));

      // Then add schedule entries not already present
      scheduleList.forEach(m => {
        if (m.id && !matchMap.has(m.id)) {
          matchMap.set(m.id, m);
        }
      });

      // 7. Build clean payload
      const allMatches = Array.from(matchMap.values()).map(m => ({
        id:          m.id,
        name:        m.name,
        matchType:   m.matchType,
        status:      m.status,
        date:        m.date,
        dateTimeGMT: m.dateTimeGMT,
        venue:       m.venue,
        teamInfo:    m.teamInfo || [],
        score:       m.score    || []
      }));

      // 8. Build response
      const payload = {
        status:       'success',
        source:       'merged',
        last_updated: new Date().toISOString(),
        total:        allMatches.length,
        data:         allMatches
      };

      const payloadStr = JSON.stringify(payload);

      // 9. Cache for 5 minutes
      if (env.IPL_KV) {
        ctx.waitUntil(env.IPL_KV.put(CACHE_KEY, payloadStr, { expirationTtl: 300 }));
      }

      return new Response(payloadStr, { status: 200, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({
        status:  'error',
        message: error.message || 'Worker execution failed'
      }), { status: 500, headers: corsHeaders });
    }
  }
};

// ── Handler: IPL Points Table ────────────────────────────────
// Strategy:
//  1. Fetch series_points (match stats per team)
//  2. Use the exact fields provided by CricAPI: teamname, shortname, img, matches, wins, loss, ties, nr
//  3. Calculate points using IPL formula (won×2 + tied + noResult) since pts is missing
//  4. Sort standings by points DESC
async function handlePointsTable(env, ctx) {
  try {
    // v4 — fresh key busts all previous cached data
    const CACHE_KEY = 'ipl_points_table_v4';

    if (env.IPL_KV) {
      const cached = await env.IPL_KV.get(CACHE_KEY);
      if (cached) return new Response(cached, { status: 200, headers: corsHeaders });
    }

    const apiKey = env.CRICKET_API_KEY;
    if (!apiKey) throw new Error('Missing CRICKET_API_KEY secret binding.');

    // Fetch series_points
    const pointsRes = await fetch(`https://api.cricapi.com/v1/series_points?apikey=${apiKey}&id=${IPL_SERIES_ID}`,
          { signal: AbortSignal.timeout(8000) });

    if (!pointsRes.ok) throw new Error('series_points API call failed');
    
    const pd = await pointsRes.json();
    if (pd.status !== 'success' || !Array.isArray(pd.data)) {
      throw new Error('Unexpected series_points response');
    }

    // ── Normalise + enrich each row ───────────────────────────
    const standings = pd.data.map(t => {
      const teamName  = t.teamname  || t.teamName || 'Unknown';
      const teamShort = t.shortname || t.teamSName || teamName.substring(0, 4).toUpperCase();
      const logo      = t.img       || t.logo || '';

      // Match stats (using exact fields from debug response)
      const played   = +(t.matches || 0);
      const won      = +(t.wins    || 0);
      const lost     = +(t.loss    || 0);
      const tied     = +(t.ties    || 0);
      const noResult = +(t.nr      || 0);

      // Calculate IPL points (won×2 + tied×1 + noResult×1)
      const apiPts = +(t.pts || t.points || 0);
      const points  = apiPts > 0 ? apiPts : (won * 2) + tied + noResult;

      // NRR — use API value if available, else 0 (cricapi doesn't seem to provide it here)
      const nrr  = parseFloat(t.nrr) || 0;

      return { id: '', teamName, teamShort, logo, played, won, lost, tied, noResult, points, nrr };
    });

    // ── Sort by points DESC, then NRR DESC ──────────────────
    standings.sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.nrr - a.nrr
    );

    // ── Add rank + format NRR for display ──────────────────
    const final = standings.map((t, i) => ({
      rank:      i + 1,
      teamId:    t.id,
      teamName:  t.teamName,
      teamShort: t.teamShort,
      logo:      t.logo,
      played:    t.played,
      won:       t.won,
      lost:      t.lost,
      tied:      t.tied,
      noResult:  t.noResult,
      points:    t.points,
      // Only prefix '+' if NRR > 0, otherwise it's just '0.000' or '-0.500'
      nrr:       (t.nrr > 0 ? '+' : '') + t.nrr.toFixed(3)
    }));

    const payload = JSON.stringify({
      status:       'success',
      last_updated: new Date().toISOString(),
      standings:    final
    });

    // Cache 15 minutes
    if (env.IPL_KV) {
      ctx.waitUntil(env.IPL_KV.put(CACHE_KEY, payload, { expirationTtl: 900 }));
    }

    return new Response(payload, { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      status:  'error',
      message: error.message || 'Points table fetch failed'
    }), { status: 500, headers: corsHeaders });
  }
}

