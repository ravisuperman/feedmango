/**
 * ============================================================
 * CONFIGURATION - API URLs, Constants, Settings
 * ============================================================
 * Change settings here instead of searching through code!
 */

// Worker URL - Switch between DEV and PROD
// const WORKER = 'https://mango-sports-worker-dev.ravi-kompel.workers.dev'; // DEV
const WORKER = 'https://mango-sports-worker.ravi-kompel.workers.dev'; // PROD

// IPL Live Score Worker
const IPL_WORKER_URL = 'https://ipl-live-score.ravi-kompel.workers.dev';

// Emoji map for sports
const EMOJI = {
  ipl: '🏏',
  f1: '🏎️',
  cricket: '🏏',
  basketball: '🏀',
  football: '⚽',
  baseball: '⚾',
  tennis: '🎾',
  kabaddi: '🤼',
  boxing: '🥊',
  golf: '⛳',
  athletics: '🏃',
  rugby: '🏉',
  olympics: '🏅',
  nfl: '🏈',
  badminton: '🏸',
  videos: '🎬',
  main: '🏆'
};

// Fallback sports list (if API fails)
const PRIORITY_SPORTS_FALLBACK = [
  'ipl',
  'f1',
  'cricket',
  'basketball',
  'baseball',
  'football',
  'tennis',
  'kabaddi',
  'boxing',
  'golf',
  'athletics',
  'rugby',
  'olympics',
  'nfl',
  'badminton',
  'videos'
];

// Fallback labels (if API fails)
const LABEL_FALLBACK = {
  ipl: 'IPL 2026',
  f1: 'Formula 1',
  cricket: 'Cricket',
  basketball: 'NBA',
  football: 'Soccer',
  baseball: 'MLB',
  tennis: 'Tennis',
  kabaddi: 'Kabaddi',
  boxing: 'Boxing',
  golf: 'Golf',
  athletics: 'Athletics',
  rugby: 'Rugby',
  olympics: 'Olympics',
  nfl: 'NFL',
  badminton: 'Badminton',
  main: 'Top Stories'
};

// Priority sports for initial load
const PRIORITY_FIRST = window.innerWidth < 768 
  ? ['ipl'] 
  : ['ipl', 'cricket', 'football', 'f1', 'basketball'];

const PRIORITY_REST = [
  'cricket',
  'football',
  'f1',
  'basketball',
  'tennis',
  'kabaddi',
  'boxing',
  'golf',
  'athletics',
  'rugby',
  'olympics',
  'nfl',
  'badminton',
  'baseball'
];

// Global state
let PRIORITY_SPORTS = PRIORITY_SPORTS_FALLBACK.slice();
let LABEL = Object.assign({}, LABEL_FALLBACK);
let currentSport = 'ipl';
let allCache = [];
let sportCache = {};
