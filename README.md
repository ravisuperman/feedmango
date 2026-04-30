# SPORTSrip 🏏

Live sports news aggregator for IPL, Cricket, F1, Football and more.

## Repository Structure

```
sports/          ← Static frontend (served by Cloudflare Pages)
├── index.html
├── sw.js        ← Service worker (PWA / push notifications)
├── manifest.json
├── scripts/     ← Modular JS (config → api → render → ui → init → pwa)
└── styles/      ← Modular CSS (variables, layout, cards, widgets)

workers/         ← Cloudflare Worker source files
├── main-worker.js           ← RSS aggregator + API + OG image enricher
├── ipl-live-score-worker.js ← IPL schedule, live scores & points table
├── backup-worker.js         ← Backup replica of main worker
├── feeds-admin-worker.js    ← Feed management API
├── cleanup-worker.js        ← KV garbage collection
└── maintenance-worker.js    ← Maintenance utilities

Admin tools/     ← Standalone HTML admin panels (not public)

wrangler.toml    ← Cloudflare Worker deployment config (main worker)
```

## Deployment

### Frontend — Cloudflare Pages
- Connect this GitHub repo in the Cloudflare Pages dashboard
- Set **Root directory** → `sports`
- No build command required (pure static site)
- Deploys automatically on every push to `main`

### Workers — Cloudflare Workers
Each worker is deployed independently via Wrangler CLI:

```bash
# Deploy the main worker
cd workers
wrangler deploy main-worker.js --name sportsrip-main-worker

# Deploy the IPL live score worker
wrangler deploy ipl-live-score-worker.js --name ipl-live-score
```

> **Note:** Secrets (API keys, VAPID private key) are stored in Cloudflare's
> secret store via `wrangler secret put` — never committed to this repo.

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Backend:** Cloudflare Workers (Edge runtime)
- **Storage:** Cloudflare KV (news cache, feeds config, push subscriptions)
- **Data:** cricapi.com (IPL scores & points table), RSS feeds (news)
- **PWA:** Web Push notifications via VAPID

## Live Site
🌐 [www.sportsrip.com](https://www.sportsrip.com)
