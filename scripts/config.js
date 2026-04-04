/**
 * ============================================================
 * CONFIGURATION - API URLs, Labels, Shared UI State
 * ============================================================
 */

const INSTANCE = {
  workerUrl: 'https://sportsrip-main-worker.ravi-kompel.workers.dev',
  // workerUrl: 'https://sportsrip-backup-worker.ravi-kompel.workers.dev',
  siteName: 'SPORTSrip',
  topStoriesLabel: 'Top Stories',
  defaultTheme: 'sportsrip'
};

const WORKER = INSTANCE.workerUrl;
const THEME_QUERY = new URLSearchParams(window.location.search).get('theme');
const THEME_STORED = localStorage.getItem('sportsrip-template');
const THEME = (THEME_QUERY || THEME_STORED || INSTANCE.defaultTheme).toLowerCase();

document.documentElement.setAttribute('data-template', THEME);
localStorage.setItem('sportsrip-template', THEME);

const STATIC_TAB_META = {
  main: { label: INSTANCE.topStoriesLabel, emoji: '🏆' }
};

const DEFAULT_TAB_EMOJI = '✨';
const SPECIAL_TAB_EMOJI = {
  'net-sessions': '🏏',
  videos: '🎬',
  main: '🏆'
};

let CATEGORY_ORDER = [];
let CATEGORY_META = Object.assign({}, STATIC_TAB_META);
let currentSport = 'main';
let allCache = [];
let sportCache = {};
