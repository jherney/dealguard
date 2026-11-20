# 🛡️ DealGuard

Find the best deals online — and only from retailers you can trust. Every deal card
carries its retailer's safety grade, so a cheap price never costs you your card details.

**Zero dependencies.** Plain HTML/CSS/JS — no build step, works offline.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure: hero, stats, deals, retailer directory, safety checker |
| `styles.css` | Dark theme, responsive grid, score rings, grade badges |
| `data.js` | Sample retailers + deals (replace with live data) |
| `app.js` | Scoring model, filtering/sorting, domain checker, manual checklist |

## Run locally

```bash
cd dealguard
python3 -m http.server 8000
# open http://localhost:8000
```

Or just double-click `index.html` — everything runs client-side.

## Deploy

- **GitHub Pages:** push these files to a repo → Settings → Pages → deploy from branch root.
- **Render:** New → Static Site → connect repo → publish directory `.` (no build command).
- **Netlify:** drag the folder onto Netlify Drop.

## How the safety score works (100 pts)

| Signal | Points |
|---|---|
| Clear return policy | 20 |
| Review rating (scaled from /5) | 20 |
| HTTPS | 15 |
| Real contact info | 15 |
| Secure payment options | 15 |
| Domain age (maxes at 10 yrs) | 15 |

Grades: A ≥ 90 · B ≥ 75 · C ≥ 60 · D ≥ 45 · F below that.

## Wiring in real data

- **Prices/deals:** Keepa or CamelCamelCamel (Amazon), SerpApi (Google Shopping),
  affiliate networks (Impact, CJ, Rakuten) for partner links.
- **Safety/reputation:** Google Safe Browsing Lookup API, Scamadviser API,
  Trustpilot Business API, WHOIS lookup for domain age.
- Swap the sample arrays in `data.js` for `fetch()` calls to a small backend —
  everything else (scoring, rendering) stays as-is.

## Note

All retailers and deals in `data.js` are fictional samples. Do real verification
before publishing ratings about real businesses.
