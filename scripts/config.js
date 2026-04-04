/**
 * ============================================================
 * CONFIGURATION - API URLs, Labels, Shared UI State
 * ============================================================
 */

const INSTANCE = {
  workerUrl: 'https://sportsrip-main-worker.ravi-kompel.workers.dev',
  siteName: 'SPORTSrip',
  topStoriesLabel: 'Top Stories'
};

const WORKER = INSTANCE.workerUrl;

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
