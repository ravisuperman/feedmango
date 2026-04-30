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
      const raw = await fetch(`https://api.cricapi.com/v1/series_points?apikey=${apiKey}&id=${IPL_SERIES_ID}`);
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
//  1. Fetch series_points (match stats per team) + series_info (team names)
//  2. Build teamId → name map from series_info.data.teamList
//  3. Calculate losses (played - won - tied - noResult)
//  4. Calculate points using IPL formula (won×2 + tied + noResult)
//     because cricapi often returns pts=0 and nrr=0
//  5. Sort standings by points DESC, then NRR DESC
async function handlePointsTable(env, ctx) {
  try {
    // v3 — fresh key busts all previous cached data
    const CACHE_KEY = 'ipl_points_table_v3';

    if (env.IPL_KV) {
      const cached = await env.IPL_KV.get(CACHE_KEY);
      if (cached) return new Response(cached, { status: 200, headers: corsHeaders });
    }

    const apiKey = env.CRICKET_API_KEY;
    if (!apiKey) throw new Error('Missing CRICKET_API_KEY secret binding.');

    // Fetch both endpoints in parallel
    const [pointsRes, seriesRes] = await Promise.allSettled([
      fetch(`https://api.cricapi.com/v1/series_points?apikey=${apiKey}&id=${IPL_SERIES_ID}`,
            { signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=${IPL_SERIES_ID}`,
            { signal: AbortSignal.timeout(8000) })
    ]);

    // ── 1. Build teamId → name/short map from series_info ──────────
    const nameMap = {}; // { teamId: { name, short, logo } }
    if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
      const sd = await seriesRes.value.json();
      if (sd.status === 'success' && sd.data) {
        // series_info may expose teams in teamList or teams array
        const teamArr = sd.data.teamList || sd.data.teams || [];
        teamArr.forEach(t => {
          if (!t) return;
          const id = t.teamId || t.id;
          if (id) nameMap[id] = {
            name:  t.teamName  || t.name      || '',
            short: t.teamSName || t.shortname || '',
            logo:  t.img       || t.logo      || ''
          };
        });
      }
    }

    // ── 2. Parse series_points ──────────────────────────────────
    if (pointsRes.status !== 'fulfilled' || !pointsRes.value.ok) {
      throw new Error('series_points API call failed');
    }
    const pd = await pointsRes.value.json();
    if (pd.status !== 'success' || !Array.isArray(pd.data)) {
      throw new Error('Unexpected series_points response');
    }

    // ── 3. Normalise + enrich each row ───────────────────────────
    const standings = pd.data.map(t => {
      const id       = t.teamId || t.id || '';
      const mapEntry = nameMap[id] || {};

      // Team name: prefer series_info map, fall back to series_points fields
      const teamName  = mapEntry.name  || t.teamName  || t.name      || t.team_name  || 'Unknown';
      const teamShort = mapEntry.short || t.teamSName || t.shortname || t.team_sname ||
                        teamName.substring(0, 4).toUpperCase();
      const logo      = t.img   || mapEntry.logo || t.logo || '';

      // Match stats (try all known field name variants)
      const played   = +(t.matchesPlayed   || t.matches || t.played   || t.mp  || 0);
      const won      = +(t.matchesWon      || t.won     || t.wins     || t.w   || 0);
      const tied     = +(t.matchesTied     || t.tied    || t.t        || 0);
      const noResult = +(t.matchesNoResult || t.nr      || t.no_result|| 0);

      // Calculate losses since the API often returns 0
      const lost = Math.max(0, played - won - tied - noResult);

      // Calculate IPL points (won×2 + tied×1 + noResult×1)
      // Use API value if > 0, otherwise calculate
      const apiPts = +(t.pts || t.points || t.pt || 0);
      const points  = apiPts > 0 ? apiPts : (won * 2) + tied + noResult;

      // NRR — use API value if available, else 0
      let nrrNum = parseFloat(t.nrr) || 0;
      const nrr  = nrrNum; // keep as number for sorting

      return { id, teamName, teamShort, logo, played, won, lost, tied, noResult, points, nrr };
    });

    // ── 4. Sort by points DESC, then NRR DESC ──────────────────
    standings.sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.nrr - a.nrr
    );

    // ── 5. Add rank + format NRR for display ──────────────────
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
      nrr:       (t.nrr >= 0 ? '+' : '') + t.nrr.toFixed(3)
    }));

    const payload = JSON.stringify({
      status:       'success',
      last_updated: new Date().toISOString(),
      standings:    final
    });

    // Cache 15 minutes (updates more often mid-tournament)
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

