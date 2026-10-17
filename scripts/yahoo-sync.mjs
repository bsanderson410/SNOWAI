// Pulls teams, schedule and final scores from Yahoo Fantasy and writes src/data/*.json.
// Runs in the deploy workflow when the YAHOO_* secrets are set. See docs/YAHOO.md.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const league = JSON.parse(await readFile('src/data/league.json', 'utf8'));
const YAHOO_CLIENT_ID = league.yahoo?.clientId;
const YAHOO_LEAGUE_ID = league.yahoo?.leagueId;
const { YAHOO_CLIENT_SECRET, YAHOO_AUTH_CODE } = process.env;
if (!YAHOO_CLIENT_ID || !YAHOO_LEAGUE_ID || !YAHOO_CLIENT_SECRET) {
  console.log('Yahoo not configured (needs league.json "yahoo" + YAHOO_CLIENT_SECRET secret); skipping sync.');
  process.exit(0);
}

// The refresh token is stored in the repo, encrypted with the client secret.
// It is useless without the client secret anyway, which only lives in GitHub secrets.
const TOKEN_FILE = '.yahoo/token.enc';
const key = createHash('sha256').update(YAHOO_CLIENT_SECRET).digest();

function encrypt(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}

function decrypt(b64) {
  const buf = Buffer.from(b64.trim(), 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

const savedToken = await readFile(TOKEN_FILE, 'utf8').then(decrypt).catch(() => null);
if (!YAHOO_AUTH_CODE && !savedToken) {
  console.log('No Yahoo login yet (run the workflow with a yahoo_code); skipping sync.');
  process.exit(0);
}

const API = 'https://fantasysports.yahooapis.com/fantasy/v2';

async function getAccessToken() {
  const grant = YAHOO_AUTH_CODE
    ? { grant_type: 'authorization_code', code: YAHOO_AUTH_CODE.trim() }
    : { grant_type: 'refresh_token', refresh_token: savedToken };
  const res = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ ...grant, redirect_uri: 'https://localhost:8080' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Yahoo token request failed: ${JSON.stringify(data)}`);
  const { access_token, refresh_token, id_token, ...info } = data;
  console.log('Yahoo token info:', JSON.stringify(info));
  if (data.refresh_token && data.refresh_token !== savedToken) {
    await mkdir('.yahoo', { recursive: true });
    await writeFile(TOKEN_FILE, encrypt(data.refresh_token) + '\n');
    console.log('Saved Yahoo login.');
  }
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
  const num = (v) => (v != null ? Number(v) : null);
  return {
    id: `t${info.team_id}`,
    key: info.team_key,
    name: info.name,
    owner: manager.nickname && manager.nickname !== '--hidden--' ? manager.nickname : info.name,
    points: num(extra.team_points?.total),
    projected: num(extra.team_projected_points?.total),
  };
}

// Find the full league key (e.g. "461.l.899128") among the logged-in user's NFL leagues.
const userGames = await api('/users;use_login=1/games;game_codes=nfl/leagues');
const myLeagues = list(userGames.users?.['0']?.user?.[1]?.games)
  .flatMap((g) => list(g.game?.[1]?.leagues))
  .map((l) => merge(l.league));
console.log('Leagues on this Yahoo account:', myLeagues.map((l) => `${l.league_key} (${l.name}, ${l.season})`).join(', ') || 'none');
const leagueKey = myLeagues
  .filter((l) => l.league_id === String(YAHOO_LEAGUE_ID))
  .sort((a, b) => Number(b.season) - Number(a.season))[0]?.league_key ?? `nfl.l.${YAHOO_LEAGUE_ID}`;
console.log(`Using league ${leagueKey}`);

// League metadata + teams
const leagueRes = await api(`/league/${leagueKey}/teams`);
const meta = leagueRes.league[0];
const teams = list(leagueRes.league[1].teams).map((t) => parseTeam(t.team));

// Every regular-season and playoff week on the schedule
const matchups = [];
const finalWeeks = new Set();
for (let week = Number(meta.start_week); week <= Number(meta.end_week); week++) {
  const sb = await api(`/league/${leagueKey}/scoreboard;week=${week}`);
  for (const { matchup } of list(sb.league[1].scoreboard['0'].matchups)) {
    if (matchup.is_playoffs === '1' || matchup.is_consolation === '1') continue;
    const [home, away] = list(matchup['0'].teams).map((t) => parseTeam(t.team));
    const final = matchup.status === 'postevent';
    if (final) finalWeeks.add(week);
    matchups.push({
      week,
      home: home.id,
      away: away.id,
      ...(home.projected != null && { homeProjected: home.projected, awayProjected: away.projected }),
      ...(final && { homeScore: home.points, awayScore: away.points }),
    });
  }
}

// Bench data for finished weeks (fetched once per week, then kept): bench points + best benched player.
// Optional extra: if Yahoo rejects it, the rest of the sync still lands.
const lineups = JSON.parse(await readFile('src/data/lineups.json', 'utf8').catch(() => '{}'));
try {
  for (const week of finalWeeks) {
    if (lineups[week]) continue;
    const byTeam = {};
    for (const team of teams) {
      const res = await api(`/team/${team.key}/roster;week=${week}/players/stats;type=week;week=${week}`);
      const players = list(res.team?.[1]?.roster?.['0']?.players).map(({ player }) => {
        const p = merge(player);
        return { name: p.name?.full, pos: p.display_position, slot: merge(p.selected_position).position, points: Number(p.player_points?.total ?? 0) };
      });
      if (!players.length) throw new Error(`no roster returned for ${team.key} week ${week}`);
      const bench = players.filter((p) => p.slot === 'BN');
      byTeam[team.id] = {
        benchPoints: Math.round(bench.reduce((sum, p) => sum + p.points, 0) * 100) / 100,
        topBench: bench.sort((a, b) => b.points - a.points)[0] ?? null,
      };
    }
    lineups[week] = byTeam;
  }
} catch (err) {
  console.log(`Skipping bench data: ${err.message.split('\n')[0]}`);
}

async function writeJson(file, data) {
  const next = JSON.stringify(data, null, 2) + '\n';
  const prev = await readFile(file, 'utf8').catch(() => '');
  if (prev !== next) {
    await writeFile(file, next);
    console.log(`Updated ${file}`);
  }
}

await writeJson('src/data/league.json', { ...league, season: Number(meta.season), platform: 'Yahoo' });
await writeJson('src/data/teams.json', teams.map(({ id, name, owner }) => ({ id, name, owner })));
await writeJson('src/data/matchups.json', matchups);
await writeJson('src/data/lineups.json', lineups);
console.log(`Synced ${teams.length} teams and ${matchups.length} matchups from Yahoo league ${YAHOO_LEAGUE_ID}.`);
