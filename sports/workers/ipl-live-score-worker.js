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
async function handlePointsTable(env, ctx) {
  try {
    const CACHE_KEY = 'ipl_points_table_v1';

    // Serve from KV cache if fresh (30 min TTL — standings don't change often)
    if (env.IPL_KV) {
      const cached = await env.IPL_KV.get(CACHE_KEY);
      if (cached) {
        return new Response(cached, { status: 200, headers: corsHeaders });
      }
    }

    const apiKey = env.CRICKET_API_KEY;
    if (!apiKey) throw new Error('Missing CRICKET_API_KEY secret binding.');

    const res = await fetch(
      `https://api.cricapi.com/v1/series_points?apikey=${apiKey}&id=${IPL_SERIES_ID}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) throw new Error('series_points API returned ' + res.status);

    const data = await res.json();

    if (data.status !== 'success' || !Array.isArray(data.data)) {
      throw new Error('Unexpected response from series_points API');
    }

    // Normalise fields so frontend doesn't need to know cricapi's exact shape
    const standings = data.data.map((t, idx) => ({
      rank:            idx + 1,
      teamId:          t.teamId          || '',
      teamName:        t.teamName        || 'Unknown',
      teamShort:       t.teamSName       || (t.teamName || '').substring(0, 4).toUpperCase(),
      logo:            t.img             || '',
      played:          t.matchesPlayed   || 0,
      won:             t.matchesWon      || 0,
      lost:            t.matchesLost     || 0,
      tied:            t.matchesTied     || 0,
      noResult:        t.matchesNoResult || 0,
      points:          t.pts             || 0,
      nrr:             typeof t.nrr === 'number' ? t.nrr.toFixed(3) : (t.nrr || '0.000'),
      runsFor:         t.for             || '',
      runsAgainst:     t.against         || ''
    }));

    const payload = JSON.stringify({
      status:       'success',
      last_updated: new Date().toISOString(),
      standings
    });

    // Cache for 30 minutes
    if (env.IPL_KV) {
      ctx.waitUntil(env.IPL_KV.put(CACHE_KEY, payload, { expirationTtl: 1800 }));
    }

    return new Response(payload, { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({
      status:  'error',
      message: error.message || 'Points table fetch failed'
    }), { status: 500, headers: corsHeaders });
  }
}

