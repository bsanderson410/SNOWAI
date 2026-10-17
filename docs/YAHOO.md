# Auto-import from Yahoo

Once connected, the site pulls teams, schedule and final scores from Yahoo every morning
and redeploys itself. Everything can be done from a phone.

Already configured in `src/data/league.json` → `yahoo`: league ID and app Client ID (both non-secret).

## 1. Add the Client Secret to GitHub (once)
Repo → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `YAHOO_CLIENT_SECRET`
- Value: the Client Secret from your Yahoo app (developer.yahoo.com/apps)

## 2. Log in to Yahoo (once)
1. Open:
   `https://api.login.yahoo.com/oauth2/request_auth?client_id=<CLIENT_ID>&redirect_uri=https%3A%2F%2Flocalhost%3A8080&response_type=code&scope=fspt-r`
   (`<CLIENT_ID>` = `yahoo.clientId` in `league.json`)
2. Log in and tap **Agree**. The page then fails to load. That's expected.
3. Copy the value after `code=` from the address bar.

## 3. Run the deploy with that code (within ~10 minutes)
**Actions → Deploy to GitHub Pages → Run workflow** → paste the code into **yahoo_code** → Run.

The workflow saves the login (encrypted with the client secret) to `.yahoo/token.enc`,
so it keeps working every day after that. If the login ever expires, repeat steps 2–3.
