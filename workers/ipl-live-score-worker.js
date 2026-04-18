/**
 * ============================================================
 * IPL LIVE SCORE + SCHEDULE + PLAYERS WORKER
 * ============================================================
 * Cloudflare Worker that merges three CricAPI endpoints:
 *   1. currentMatches — live/recent worldwide cricket matches
 *   2. series_info    — full IPL 2026 schedule (70 matches)
 *   3. players_info   — top 10 IPL star profiles (cached 24h)
 * 
 * Deploy at: https://ipl-live-score.ravi-kompel.workers.dev
 * ============================================================
 */

const API_KEY = 'bf2a92de-36fc-4939-8f6c-27379c13d9f8';
const IPL_SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f';

const CURRENT_MATCHES_URL = `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`;
const SERIES_INFO_URL = `https://api.cricapi.com/v1/series_info?apikey=${API_KEY}&id=${IPL_SERIES_ID}`;

// Top 10 IPL star player IDs
const PLAYER_IDS = [
  'c61d247d-7f77-452c-b495-2813a9cd0ac4', // Virat Kohli - RCB
  '03bda674-3916-4d64-952e-00a6c19c01e1', // Rohit Sharma - MI
  'b6e7aa41-b0bb-4b0f-8f59-59f729283be5', // MS Dhoni - CSK
  '6602d875-cf56-46a3-866c-de80aaa006bc', // Jasprit Bumrah - MI
  '8c579447-bfbd-4cf6-a283-db4dc1d5ac33', // Suryakumar Yadav - MI
  '81b446e1-bfea-45a7-a15e-062b8157a323', // Ravindra Jadeja - CSK
  'a52b2d20-7c98-4238-9ba4-ec78419a5cc2', // Rishabh Pant - LSG
  'a90b2371-5c53-4c29-a382-9b52d40a7548', // Hardik Pandya - MI
  'f0687183-ad9a-44f7-9cbf-4f7eb0cbfb5a', // Rashid Khan (Afghanistan) - GT
  '13b3d56e-0fba-4d31-a174-d211211404e2', // Pat Cummins - SRH
];

// IPL team mapping for player cards
const PLAYER_TEAMS = {
  'c61d247d-7f77-452c-b495-2813a9cd0ac4': 'RCB',
  '03bda674-3916-4d64-952e-00a6c19c01e1': 'MI',
  'b6e7aa41-b0bb-4b0f-8f59-59f729283be5': 'CSK',
  '6602d875-cf56-46a3-866c-de80aaa006bc': 'MI',
  '8c579447-bfbd-4cf6-a283-db4dc1d5ac33': 'MI',
  '81b446e1-bfea-45a7-a15e-062b8157a323': 'CSK',
  'a52b2d20-7c98-4238-9ba4-ec78419a5cc2': 'LSG',
  'a90b2371-5c53-4c29-a382-9b52d40a7548': 'MI',
  'f0687183-ad9a-44f7-9cbf-4f7eb0cbfb5a': 'GT',
  '13b3d56e-0fba-4d31-a174-d211211404e2': 'SRH',
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300'
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Fetch matches + series in parallel
      const [currentRes, seriesRes] = await Promise.allSettled([
        fetch(CURRENT_MATCHES_URL),
        fetch(SERIES_INFO_URL)
      ]);

      // Parse currentMatches
      let currentMatches = [];
      let apiInfo = {};
      if (currentRes.status === 'fulfilled' && currentRes.value.ok) {
        const currentData = await currentRes.value.json();
        if (currentData.status === 'success' && currentData.data) {
          currentMatches = currentData.data;
          apiInfo = currentData.info || {};
        }
      }

      // Parse series_info (IPL schedule)
      let iplSchedule = [];
      let seriesInfo = {};
      if (seriesRes.status === 'fulfilled' && seriesRes.value.ok) {
        const seriesData = await seriesRes.value.json();
        if (seriesData.status === 'success' && seriesData.data) {
          seriesInfo = seriesData.data.info || {};
          iplSchedule = seriesData.data.matchList || [];
        }
      }

      // Merge & deduplicate matches by ID
      const matchMap = new Map();
      currentMatches.forEach(m => { if (m.id) matchMap.set(m.id, m); });
      iplSchedule.forEach(m => { if (m.id && !matchMap.has(m.id)) matchMap.set(m.id, m); });
      const mergedMatches = Array.from(matchMap.values());

      // Fetch player profiles (all 10 in parallel)
      const playerPromises = PLAYER_IDS.map(id =>
        fetch(`https://api.cricapi.com/v1/players_info?apikey=${API_KEY}&id=${id}`)
          .then(r => r.json())
          .then(data => {
            if (data.status === 'success' && data.data) {
              const p = data.data;
              // Extract IPL batting stats
              const iplStats = {};
              if (p.stats) {
                p.stats.forEach(s => {
                  if (s.matchtype === 'ipl' && s.fn === 'batting') {
                    iplStats[s.stat.trim()] = s.value.toString().trim();
                  }
                });
              }
              return {
                id: p.id,
                name: p.name,
                country: p.country,
                role: p.role || '',
                battingStyle: p.battingStyle || '',
                bowlingStyle: p.bowlingStyle || '',
                dob: p.dateOfBirth || '',
                playerImg: p.playerImg || '',
                team: PLAYER_TEAMS[p.id] || '',
                iplRuns: iplStats['runs'] || '0',
                iplAvg: iplStats['avg'] || '0',
                iplSR: iplStats['sr'] || '0',
                iplMatches: iplStats['m'] || '0',
                ipl100s: iplStats['100s'] || iplStats['100'] || '0',
                ipl50s: iplStats['50s'] || iplStats['50'] || '0',
                iplHS: iplStats['hs'] || '0'
              };
            }
            return null;
          })
          .catch(() => null)
      );

      const playerResults = await Promise.allSettled(playerPromises);
      const players = playerResults
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      // Return combined response
      const response = {
        status: 'success',
        data: mergedMatches,
        players: players,
        seriesInfo: seriesInfo,
        info: {
          ...apiInfo,
          totalMatches: mergedMatches.length,
          currentMatchesCount: currentMatches.length,
          iplScheduleCount: iplSchedule.length,
          playersCount: players.length,
          mergedAt: new Date().toISOString()
        }
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: corsHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: error.message || 'Failed to fetch cricket data',
        data: [],
        players: []
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
