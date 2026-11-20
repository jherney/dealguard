# 🛡️ DealGuard

Find the best deals online — and only from retailers you can trust. Every deal card
carries its retailer's safety grade, so a cheap price never costs you your card details.

**Zero dependencies.** Plain HTML/CSS/JS frontend + a dependency-free Node feed
fetcher that runs on a schedule in GitHub Actions.

## How it works

```
Slickdeals RSS ──┐
                  ├─▶ scripts/fetch-deals.mjs ─▶ deals.json ─▶ static site
RedFlagDeals RSS ┘        (GitHub Actions,      retailers.json   (GitHub Pages)
                           every 3 hours)
```

- The **frontend** fetches `deals.json` / `retailers.json` (same origin, no CORS,
  no API keys in the browser). If they don't exist yet or are empty, it falls back
  to the built-in sample data in `data.js`.
- The **fetcher** parses each feed, extracts prices/coupons/categories from the
  text, dedupes by title, and keeps deals for 7 days.
- Retailers are **auto-discovered** from outbound merchant links. Domain age is
  enriched via the free [RDAP](https://rdap.org) service — no key required.
  Signals that can't be verified automatically (returns, contact, reviews) stay
  `null` and show as *unverified*, with the score marked `~partial`.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure: hero, stats, deals, retailer directory, safety checker |
| `styles.css` | Dark theme, responsive grid, score rings, grade badges |
| `data.js` | Sample fallback data (used until the first feed run) |
| `app.js` | Scoring model, async data loading, filtering/sorting, checker |
| `scripts/fetch-deals.mjs` | Feed fetcher/normalizer (Node 20+, no deps) |
| `.github/workflows/update-deals.yml` | Runs the fetcher every 3 h and commits the JSON |

## Run locally

```bash
python3 -m http.server 8000   # open http://localhost:8000
node scripts/fetch-deals.mjs  # optional: pull real deals right now
```

## Enable the live pipeline

Nothing to configure — the workflow is on `main` with `contents: write`
permission. Kick off the first run manually: **Actions → Update deals → Run
workflow**. After that it refreshes every 3 hours (GitHub cron can lag a few
minutes, and pauses after 60 days of repo inactivity).

## Add more feeds

Append to `SOURCES` in `scripts/fetch-deals.mjs`:

```js
{ name: "MySource", url: "https://example.com/deals.rss" }
```

Sources that 403 (some sit behind Cloudflare bot rules) are skipped with a
warning — existing data is kept, so one dead feed never breaks the build.

## Safety scoring (100 pts, partial-aware)

| Signal | Points |
|---|---|
| Clear return policy | 20 |
| Review rating (scaled from /5) | 20 |
| HTTPS | 15 |
| Real contact info | 15 |
| Secure payment options | 15 |
| Domain age (maxes at 10 yrs, via RDAP) | 15 |

Unknown signals are excluded and the score is scaled over what's verified —
those scores show with a `~` prefix. Grades: A ≥ 90 · B ≥ 75 · C ≥ 60 · D ≥ 45.

## Upgrading the data quality

- **Better prices:** Keepa (Amazon), SerpApi (Google Shopping), or affiliate
  networks (Impact, CJ, Rakuten) — all need keys, so call them from the Action,
  never from the browser.
- **Richer trust signals:** Google Safe Browsing Lookup API, Scamadviser,
  Trustpilot Business API.
- **Legal note:** automated trust scores about real businesses are sensitive.
  Keep the partial/unverified labelling, link to your sources, and don't
  present heuristic scores as definitive judgments.
