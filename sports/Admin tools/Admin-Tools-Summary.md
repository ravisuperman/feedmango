# Admin Tools Summary

Work completed across April 4-5, 2026.

## A. FEEDS_KV Admin Tool

## 1. FEEDS admin worker was separated and cleaned up

### Purpose
This worker manages feed configuration only, independent from the main worker.

### Worker file
- `C:\Users\ravik\Documents\Playground\feeds-admin-worker.js`

### What it does
- manages `FEEDS_KV`
- validates RSS/Atom URLs
- discovers possible feed URLs from publisher sites
- previews feed articles

### Routes confirmed or added
- `/api/mode`
- `/api/feeds-config`
- `/api/test-feed`
- `/api/discover-feeds`
- `/api/feed-preview`

### Enhancements added
- smarter discovery candidates
- HTML feed link parsing from both `<link>` and `<a href>`
- feed preview parsing for RSS, Atom, and YouTube
- article preview extraction

## 2. FEEDS admin HTML was redesigned

### Main file
- `C:\Users\ravik\Documents\Playground\one\feedmango-main\sportsrip-feeds-kv-admin.html`

### Problem
The original page was more like a raw utility and had several controls that no longer matched the real workflow.

### UI changes
- redesigned into a dashboard-style control panel
- added hero stats and cleaner layout
- kept:
  - `Check Worker`
  - `Validate All Feeds`
- removed old workflow buttons:
  - `Push Current Catalog To FEEDS_KV`
  - `Reset To Seed Data`
  - old seed-upload workflow
- added:
  - `Upload All Valid Feeds To KV`

## 3. `Find RSS` was not working

### Problem
Discovery was too simplistic and often only checked the site root, so many feeds returned no candidates.

### Fixes
#### Admin worker
- improved `/api/discover-feeds`
- expanded candidate generation
- deeper HTML scanning

#### Admin HTML
- `Find RSS` now probes smarter target combinations
- merges and deduplicates discovery results

### Result
- discovery behavior is much more useful

## 4. `Retrieve FEEDS_KV` was completely reworked

### Problem
Originally it only read config back and dumped it into a textarea or log-style view.
You wanted a real review experience:
- category
- feed
- related articles
- article cards

### Fix
- `Retrieve FEEDS_KV` now opens a dedicated preview window
- it reads FEEDS_KV config
- then previews feed articles via `/api/feed-preview`
- renders grouped content:
  - category
  - feed
  - article cards

### Additional fix
- The popup initially opened blank because of popup window flags.
- Removed `noopener,noreferrer` from the retrieval popup so the script can write into the new window correctly.

## 5. Valid-only upload behavior

### Problem
You wanted only currently validated feeds to be uploaded into `FEEDS_KV`, not every row in the editor.

### Fix
- `buildSavePayload(..., validOnly)` was introduced.
- `Upload All Valid Feeds To KV` now:
  - includes only feeds with `_status === 'valid'`
  - excludes invalid and unchecked feeds
  - excludes categories that end up with zero valid feeds

### Result
- FEEDS_KV upload now matches the reviewed and validated state of the dashboard.

## B. Backup Worker and Backup Admin Tool

## 1. Backup worker architecture review

### Worker file
- `C:\Users\ravik\Documents\Playground\backup-worker.js`

### Your design
- main worker does the heavy lifting
- backup worker only stores reviewed snapshot data
- backup worker serves stable snapshot data to the live site
- no feed fetching, no OG logic, no live RSS operations

### Review result
- that architecture is sound
- the backup worker code already matched the intended role well

## 2. Backup worker refinement

### Problem
You wanted import confirmation to show exactly how much data was stored, not just “success”.

### Fix
Added row summary reporting:
- categories stored
- feeds stored
- curated rows stored
- own rows stored
- total rows stored

### Backup worker changes
- import now returns `rowSummary`
- `/api/backup/status` now includes `lastRows`
- stored in:
  - `backup:last_rows`

## 3. Dedicated backup admin tool created

### File
- `C:\Users\ravik\Documents\Playground\backup-admin-tool.html`

### Purpose
A standalone operational console for the reviewed snapshot flow:
- inspect main worker
- import reviewed snapshot into backup worker
- verify stored counts
- review backed-up items visually

### Tool capabilities
- `Check Main Worker`
- `Check Backup Worker`
- `Load Main Snapshot`
- `Load Snapshot Into Backup`
- `Review Main Items`
- `Review Backup Items`

### Review windows show
- category
- feed
- articles

### Important implementation detail
- it first tries main worker `/api/snapshot/export`
- if unavailable, it can build the snapshot from:
  - `/api/categories`
  - `/api/feeds`
  - `/api/news?sport=...`

### Result
- you now have a dedicated operational console for your morning and evening manual backup flow.
