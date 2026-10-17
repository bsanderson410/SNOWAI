// Pulls teams, schedule and final scores from Yahoo Fantasy and writes src/data/*.json.
// Runs in the deploy workflow when the YAHOO_* secrets are set. See docs/YAHOO.md.
import { readFile, writeFile } from 'node:fs/promises';

const { YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, YAHOO_REFRESH_TOKEN, YAHOO_LEAGUE_ID } = process.env;
if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET || !YAHOO_REFRESH_TOKEN || !YAHOO_LEAGUE_ID) {
  console.log('Yahoo secrets not set; skipping sync.');
  process.exit(0);
}

const API = 'https://fantasysports.yahooapis.com/fantasy/v2';
const leagueKey = `nfl.l.${YAHOO_LEAGUE_ID}`;

async function getAccessToken() {
  const res = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: YAHOO_REFRESH_TOKEN, redirect_uri: 'https://localhost:8080' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Yahoo token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

const token = await getAccessToken();

async function api(path) {
  const res = await fetch(`${API}${path}?format=json`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Yahoo API ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()).fantasy_content;
}

// Yahoo JSON quirks: lists are objects keyed "0","1",... plus "count",
// and records are arrays of single-key objects.
const list = (obj) => Object.keys(obj ?? {}).filter((k) => k !== 'count').map((k) => obj[k]);
const merge = (arr) => Object.assign({}, ...(arr ?? []).flat().filter((x) => x && typeof x === 'object'));

function parseTeam(team) {
  const info = merge(team[0]);
  const extra = merge(team.slice(1));
  const manager = info.managers?.[0]?.manager ?? {};
  return {
    id: `t${info.team_id}`,
    name: info.name,
    owner: manager.nickname && manager.nickname !== '--hidden--' ? manager.nickname : info.name,
    points: extra.team_points?.total != null ? Number(extra.team_points.total) : null,
  };
}

// League metadata + teams
const leagueRes = await api(`/league/${leagueKey}/teams`);
const meta = leagueRes.league[0];
const teams = list(leagueRes.league[1].teams).map((t) => parseTeam(t.team));

// Every regular-season and playoff week on the schedule
const matchups = [];
for (let week = Number(meta.start_week); week <= Number(meta.end_week); week++) {
  const sb = await api(`/league/${leagueKey}/scoreboard;week=${week}`);
  for (const { matchup } of list(sb.league[1].scoreboard['0'].matchups)) {
    if (matchup.is_playoffs === '1' || matchup.is_consolation === '1') continue;
    const [home, away] = list(matchup['0'].teams).map((t) => parseTeam(t.team));
    const final = matchup.status === 'postevent';
    matchups.push({
      week,
      home: home.id,
      away: away.id,
      ...(final && { homeScore: home.points, awayScore: away.points }),
    });
  }
}

async function writeJson(file, data) {
  const next = JSON.stringify(data, null, 2) + '\n';
  const prev = await readFile(file, 'utf8').catch(() => '');
  if (prev !== next) {
    await writeFile(file, next);
    console.log(`Updated ${file}`);
  }
}

const league = JSON.parse(await readFile('src/data/league.json', 'utf8'));
await writeJson('src/data/league.json', { ...league, season: Number(meta.season), platform: 'Yahoo' });
await writeJson('src/data/teams.json', teams.map(({ id, name, owner }) => ({ id, name, owner })));
await writeJson('src/data/matchups.json', matchups);
console.log(`Synced ${teams.length} teams and ${matchups.length} matchups from Yahoo league ${YAHOO_LEAGUE_ID}.`);
