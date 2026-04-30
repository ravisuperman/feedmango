# SPORTSrip Portal Summary

Work completed across April 4-5, 2026.

## 1. FEEDS_KV became the real source of truth

### Problem
The site looked inconsistent because we needed to confirm whether the main worker was actually reading categories and feeds from `FEEDS_KV`, or silently falling back to older sources.

### What we found
- `FEEDS_KV` binding on the main worker was correct.
- `/api/mode` confirmed `activeSource: FEEDS_KV`.

### Fix
- Kept runtime pointed at `FEEDS_KV`.
- Disabled runtime fallback behavior in the main worker for testing clarity:
  - commented out `CONTROL_PANEL_KV` fallback reads
  - commented out `SPORTS_FALLBACK` runtime return
  - commented out legacy mirror writes to `CONTROL_PANEL_KV`

### Why
This made failures visible instead of hidden behind fallback data.

## 2. Missing categories in the top navigation

### Problem
Only some sports were appearing in the menu. At first it was just `IPL` and `Cricket`, and other sports disappeared.

### Root cause
There were 2 filters hiding categories:
- Worker-side: `/api/categories` was originally suppressing categories with zero article count.
- Frontend-side: `init.js` was shrinking the tab list down to only categories whose `/api/news` call returned articles at startup.

### Fixes
#### Worker
- Changed category visibility so enabled FEEDS_KV categories stay visible even when current counts are zero.

#### Frontend
- Patched `scripts/init.js` so it keeps all categories returned by `/api/categories`.
- No longer collapses the nav to only currently-populated sports.

### Result
- All sports now stay visible in the nav as configured in `FEEDS_KV`.

## 3. Frontend broke because `ui.js` was missing

### Problem
The site showed:
- `Unable to load categories right now`
- console errors like `setActive is not defined`
- `ui.js` MIME type error

### Root cause
`index.html` referenced `scripts/ui.js`, but that file was missing in the deployed bundle, so the browser loaded an HTML 404 page instead of JS.

### Fix
- Restored `scripts/ui.js`.

### Result
- Frontend initialization resumed normally.

## 4. Categories were visible, but many tabs showed `No stories found`

### Problem
Even after tabs came back, many sports opened to empty content.

### Root cause
The admin preview showed live feed health, but the portal reads from `CURATED_KV`.
So a sport could have healthy feeds but still show empty if:
- `CURATED_KV` had expired
- cron had not refreshed that sport yet
- curated cache was temporarily empty

### Fixes in the main worker
- Increased RSS freshness window from `72 hours` to `7 days`.
- Added on-demand self-healing in `/api/news`:
  - if `CURATED_KV` is empty for a sport:
    - run `fetchRawSport(...)`
    - run `curateSport(...)`
    - re-check `CURATED_KV`
    - if still empty, fall back to `NEWS_KV raw`

### Result
- Sports with healthy feeds can now repopulate on demand instead of waiting for cron.

## 5. Theme experiment and rollback

### Problem
We briefly mixed an editorial/DailyWire-style experiment into shared frontend files, which started affecting the SPORTSrip theme.

### Fix
- Rolled back the shared frontend files to SPORTSrip-only versions.
- Restored:
  - `index.html`
  - `scripts/config.js`
  - `scripts/ui.js`
  - `scripts/render.js`
  - `styles/cards.css`
  - `styles/layout.css`

### Architectural decision
- Future multi-theme work should use separate theme folders instead of shared mixed files.

## 6. Performance improvement prototype

### Problem
Even on fast internet, the homepage took 5-10 seconds before users saw useful content, creating the impression the site was broken.

### Approach
Instead of changing the whole live site first, performance work was isolated to:
- `C:\Users\ravik\Documents\Playground\one\feedmango-performance`

### Fixes implemented there
- Immediate shell rendering
- Skeleton placeholders for:
  - top nav
  - main cards
  - sidebar blocks
- Staged loading:
  - load categories first
  - load only the initial batch of sports for first paint
  - background-load the rest
- Local cache for last good homepage payload
- Cached content remains visible if refresh fails

### Files updated there
- `index.html`
- `scripts/config.js`
- `scripts/init.js`
- `scripts/render.js`
- `styles/layout.css`
- `styles/cards.css`

### Result
- Perceived load is much better.
- Users see structure immediately instead of a blank page.
