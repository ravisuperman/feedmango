/**
 * ============================================================
 * CONFIGURATION - API URLs, Constants, Settings
 * ============================================================
 */

// ============================================================
// ⚙️  INSTANCE CONFIG — THE ONLY SECTION YOU NEED TO CHANGE
//     when deploying to a new Cloudflare account / domain.
// ============================================================
const INSTANCE = {
//    workerUrl: 'https://sportsrip-main-worker.sportsrip-admin.workers.dev', // ← Your main worker URL
workerUrl: 'https://sportsrip-backup-worker.sportsrip-admin.workers.dev', // ← Your backup worker URL
  siteName:  'SPORTSrip',                                     // ← Your site display name
};
// ============================================================

// Worker URL (read from INSTANCE — do not change this line)
const WORKER = INSTANCE.workerUrl;

// Emoji map for sports tabs
const EMOJI = {
  ipl:        '🏏',
  'net-sessions': '🏏',
  f1:         '🏎️',
  cricket:    '🏏',
  basketball: '🏀',
  football:   '⚽',
  baseball:   '⚾',
  tennis:     '🎾',
  kabaddi:    '🤼',
  boxing:     '🥊',
  golf:       '⛳',
  athletics:  '🏃',
  rugby:      '🏉',
  olympics:   '🏅',
  nfl:        '🏈',
  badminton:  '🏸',
  videos:     '🎬',
  main:       '🏆'
};

// Fallback sports list (used if dynamic loading fails)
const PRIORITY_SPORTS_FALLBACK = [
  'ipl',
  'net-sessions',
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
  ipl:            'IPL 2026',
  'net-sessions': 'Net Sessions',
  f1:             'Formula 1',
  cricket:        'Cricket',
  basketball:     'NBA',
  football:       'Soccer',
  baseball:       'MLB',
  tennis:         'Tennis',
  kabaddi:        'Kabaddi',
  boxing:         'Boxing',
  golf:           'Golf',
  athletics:      'Athletics',
  rugby:          'Rugby',
  olympics:       'Olympics',
  nfl:            'NFL',
  badminton:      'Badminton',
  main:           'Top Stories'
};

// Priority sports for initial load (mobile loads fewer)
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
