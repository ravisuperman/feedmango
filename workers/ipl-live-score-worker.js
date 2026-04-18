/**
 * ============================================================
 * CRICKET SCHEDULE & LIVE SCORE WORKER
 * ============================================================
 * Cloudflare Worker that:
 *   1. Uses env.CRICKET_API_KEY to fetch cricapi.com currentMatches
 *   2. Filters for premium tournaments (IPL, PSL, WPL, Internationals)
 *   3. Caches the heavy JSON payload in env.IPL_KV for 5 minutes
 * 
 * Deploy at: https://ipl-live-score.ravi-kompel.workers.dev
 * ============================================================
 */

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

    try {
      // 1. Check KV Cache Custom Key
      const CACHE_KEY = "curated_matches_feed";
      if (env.IPL_KV) {
        const cachedData = await env.IPL_KV.get(CACHE_KEY);
        if (cachedData) {
          // Serve from KV if available
          return new Response(cachedData, { status: 200, headers: corsHeaders });
        }
      }

      // 2. We need the API_KEY from secrets
      const apiKey = env.CRICKET_API_KEY;
      if (!apiKey) {
        throw new Error("Missing CRICKET_API_KEY environment variable. Secret not bound properly.");
      }

      // 3. Fetch from CricAPI
      const CURRENT_MATCHES_URL = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`;
      const response = await fetch(CURRENT_MATCHES_URL);
      const rawData = await response.json();

      let matches = [];
      if (rawData.status === 'success' && rawData.data) {
        matches = rawData.data;
      }

      // 4. White-List Filtering Logic
      // Strict IPL ONLY mode as requested.
      const isPremiumMatch = (m) => {
        const title = (m.name || '').toLowerCase();
        
        // Only accept IPL
        return title.includes('ipl') || title.includes('indian premier league');
      };

      const curatedMatches = matches.filter(isPremiumMatch).map(m => {
        return {
          id: m.id,
          name: m.name,
          matchType: m.matchType,
          status: m.status,
          date: m.date,
          dateTimeGMT: m.dateTimeGMT,
          venue: m.venue,
          teamInfo: m.teamInfo || [],  // Has name, shortname, img
          score: m.score || []         // Has r, w, o, inning
        };
      });

      // 5. Construct Final Output JSON
      const finalPayload = {
        status: 'success',
        source: 'api', // just for debugging
        last_updated: new Date().toISOString(),
        total_filtered: curatedMatches.length,
        data: curatedMatches
      };
      
      const payloadString = JSON.stringify(finalPayload);

      // 6. Cache into KV for 300 seconds (5 minutes)
      if (env.IPL_KV) {
        ctx.waitUntil(env.IPL_KV.put(CACHE_KEY, payloadString, { expirationTtl: 300 }));
      }

      // 7. Respond
      return new Response(payloadString, { status: 200, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message || 'Worker execution failed'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
