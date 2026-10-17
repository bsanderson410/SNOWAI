# Auto-import from Yahoo (one-time setup, ~10 minutes)

Once set up, the site pulls teams, schedule and final scores from Yahoo every morning
and redeploys itself. You never edit `teams.json` or `matchups.json` again.

## 1. Find your league ID
Open your league on Yahoo. The URL looks like `https://football.fantasysports.yahoo.com/f1/123456`.
The number at the end (`123456`) is your **league ID**.

## 2. Create a Yahoo app (free)
1. Go to https://developer.yahoo.com/apps/create/ (log in with the Yahoo account that's in the league).
2. Fill in:
   - **Application Name:** SNOWAI
   - **Application Type:** Web Application
   - **Redirect URI(s):** `https://localhost:8080`
   - **API Permissions:** tick **Fantasy Sports → Read**
3. Click **Create App**. Copy the **Client ID** and **Client Secret**.

## 3. Get a refresh token (no install needed, uses GitHub Codespaces in your browser)
1. On the repo page, click **Code → Codespaces → Create codespace on main**. A browser editor opens.
2. In its terminal at the bottom, run (paste your values):
   ```bash
   node scripts/yahoo-auth.mjs YOUR_CLIENT_ID YOUR_CLIENT_SECRET
   ```
3. Open the printed link, log in, click **Agree**. The browser goes to a page that won't load. That's expected.
   Copy everything after `code=` in the address bar.
4. Run:
   ```bash
   node scripts/yahoo-auth.mjs YOUR_CLIENT_ID YOUR_CLIENT_SECRET THE_CODE
   ```
   It prints your **refresh token**. (Do this within a few minutes; the code expires quickly.)
5. Delete the codespace afterwards (github.com/codespaces → ⋯ → Delete) so it doesn't use your free hours.

## 4. Add 4 secrets to GitHub
Repo → **Settings → Secrets and variables → Actions → New repository secret**, add each:

| Name | Value |
|---|---|
| `YAHOO_CLIENT_ID` | from step 2 |
| `YAHOO_CLIENT_SECRET` | from step 2 |
| `YAHOO_REFRESH_TOKEN` | from step 3 |
| `YAHOO_LEAGUE_ID` | from step 1 |

Secrets are encrypted and never shown in logs, even though the repo is public.

## 5. Run it
**Actions → Deploy to GitHub Pages → Run workflow.** After that it runs daily on its own.
