# SNOWAI

Website for the SNOWA Fantasy Football League — built with [Astro](https://astro.build),
hosted free on GitHub Pages, served at your own domain (e.g. `snowai.com`).

## How it works

- **No database, no server.** All league data lives in JSON/Markdown files in this repo.
- Every push to `main` automatically rebuilds and redeploys the site (`.github/workflows/deploy.yml`).
- Standings are **calculated automatically** from the scores in `src/data/matchups.json`.

```
src/
  data/
    league.json     ← league name, season, commissioner, tagline
    teams.json      ← teams + owners
    matchups.json   ← weekly schedule + scores (standings computed from this)
    history.json    ← past champions / last place
  news/*.md         ← weekly recaps & trash talk (one file per post)
  pages/            ← one file per page (rules.md is the league constitution)
  layouts/Base.astro← header, nav, footer, site-wide styles
  lib/standings.js  ← standings / schedule / news helpers
```

## Weekly workflow

With Yahoo auto-import set up ([`docs/YAHOO.md`](docs/YAHOO.md)), there is nothing to do: data syncs every morning.
Without it:

1. On github.com, open `src/data/matchups.json` → pencil icon → add `homeScore` / `awayScore` for the week.
2. Commit. ~1 minute later the site is live with new standings.
3. Optional: add a recap in `src/news/` (copy an existing post, change the header).

## One-time setup

See [`docs/SETUP.md`](docs/SETUP.md).

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # production build into dist/
```

## Roadmap ideas

See [`docs/ROADMAP.md`](docs/ROADMAP.md).
