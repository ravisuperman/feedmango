/**
 * ============================================================
 * CONFIGURATION - API URLs, Constants, Settings
 * ============================================================
 * Change settings here instead of searching through code!
 */

// Worker URL - Primary Heart Aggregator
// We use the Master Merge version of the worker.
const WORKER = 'https://mango-test-v1.ravi-kompel.workers.dev'; 

// IPL Live Score Worker
const IPL_WORKER_URL = 'https://ipl-live-score.ravi-kompel.workers.dev';

// Emoji map for sports
const EMOJI = {
  ipl: '🏏',
  'net-sessions': '🏏', // Net Sessions Icon (Editorial)
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

// Fallback sports list (if dynamic loading fails)
const PRIORITY_SPORTS_FALLBACK = [
  'ipl',
  'net-sessions', // Added to top priority
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

// Fallback labels
const LABEL_FALLBACK = {
  ipl: 'IPL 2026',
  'net-sessions': 'Net Sessions', // Editorial Tab Name
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
// Positioning: IPL | Net Sessions | Others
const PRIORITY_FIRST = window.innerWidth < 768 
  ? ['ipl', 'net-sessions'] 
  : ['ipl', 'net-sessions', 'cricket', 'football', 'f1', 'basketball'];

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
