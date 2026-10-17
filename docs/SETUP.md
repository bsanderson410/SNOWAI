# Setup: from repo to live site at your domain

## 1. Customize your league data (5 min)
Edit these on github.com (pencil icon) or locally:
- `src/data/league.json` – league name, season, commissioner
- `src/data/teams.json` – one entry per team. `id` is a short, permanent key (e.g. `"brian"`); `name` can change anytime.
- `src/data/matchups.json` – the season schedule. Leave scores off for unplayed games.
- `src/data/history.json` – past champions
- `src/pages/rules.md` – your league rules

## 2. Turn on GitHub Pages (2 min)
1. Repo → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab → "Deploy to GitHub Pages" → **Run workflow** (or just push to `main`).
4. The site appears at `https://bsanderson410.github.io/snowai/` temporarily.
   *(Links will only work properly once the custom domain in step 4 is attached, since the site is built for a root domain.)*

> **Private repo?** GitHub Pages on private repos requires GitHub Pro ($4/mo). Either make the repo
> public (it only contains league data) or use Cloudflare Pages / Netlify instead (see bottom).

## 3. Buy the domain (5 min, ~$10–15/yr)
Buy `snowai.com` (or `.net`, `.football`, `.league`, whatever is available) from a registrar such as
**Cloudflare Registrar** (at-cost pricing), Porkbun, or Namecheap.

## 4. Point the domain at GitHub Pages (10 min + DNS propagation)
At your registrar's DNS settings add:

| Type  | Name / Host | Value                    |
|-------|-------------|--------------------------|
| A     | `@`         | `185.199.108.153`        |
| A     | `@`         | `185.199.109.153`        |
| A     | `@`         | `185.199.110.153`        |
| A     | `@`         | `185.199.111.153`        |
| CNAME | `www`       | `bsanderson410.github.io`|

(On Cloudflare, set these records to **DNS only** / grey cloud.)

Then in GitHub: **Settings → Pages → Custom domain** → enter `snowai.com` → Save.
Once the DNS check passes, tick **Enforce HTTPS**.

Finally, update `site` in `astro.config.mjs` if your domain isn't `snowai.com`.

Recommended: verify the domain under your GitHub account **Settings → Pages → Add a domain**
so nobody else can claim it.

## Alternative hosts (if repo stays private)
**Cloudflare Pages** or **Netlify**: "Import from GitHub" → pick `snowai` → build command `npm run build`,
output dir `dist`. Then add your custom domain in their dashboard. Both are free and redeploy on every push
(you can delete `.github/workflows/deploy.yml` in that case).
