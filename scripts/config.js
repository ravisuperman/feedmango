/**
 * ============================================================
 * CONFIG - Global Constants & Settings
 * ============================================================
 */

const WORKER = 'https://mango-sports-worker.ravi-kompel.workers.dev';
const IPL_WORKER_URL = 'https://mango-ipl-worker.ravi-kompel.workers.dev';

const PRIORITY_SPORTS = ['ipl','f1','cricket','basketball','baseball','football','tennis','kabaddi','boxing','golf','athletics','rugby','olympics','nfl','badminton'];

const EMOJI = {
  ipl:'🏏', f1:'🏎️', cricket:'🏏', basketball:'🏀', football:'⚽', 
  baseball:'⚾', tennis:'🎾', kabaddi:'🤼', boxing:'🥊', golf:'⛳', 
  athletics:'🏃', rugby:'🏉', olympics:'🏅', nfl:'🏈', badminton:'🏸', main:'🏆'
};

const LABEL = {
  ipl:'IPL 2026', f1:'Formula 1', cricket:'Cricket', basketball:'NBA', 
  football:'Soccer', baseball:'MLB', tennis:'Tennis', kabaddi:'Kabaddi', 
  boxing:'Boxing', golf:'Golf', athletics:'Athletics', rugby:'Rugby', 
  olympics:'Olympics', nfl:'NFL', badminton:'Badminton', main:'Top Stories'
};

// Tabs where the Cricket Schedule and IPL Stars widgets should be visible
const WIDGET_TABS = ['main', 'ipl', 'cricket'];

// Global State
let currentSport = 'ipl';
let allCache = [];
let sportCache = {};
