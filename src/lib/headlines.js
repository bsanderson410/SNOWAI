import headlines from '../data/headlines.json';
import { getWeeks, getStandings, teamById, isPlayed } from './standings.js';

// Made-up tabloid stories generated from each week's real results.
// Hand-written ones live in src/data/headlines.json.

const TEMPLATES = {
  highScore: [
    ['{w} Drops {ws} Points; League Office Opens Investigation', 'Sources say {wo} "just set the lineup and went to brunch."'],
    ['{w} Goes Nuclear With {ws}, Neighbors Report Shaking', 'Experts call it the most points scored since whoever did it last time.'],
    ['{wo} Unbearable After {ws}-Point Week, Group Chat Muted', 'Three members have already left. Two have rejoined to complain.'],
  ],
  blowout: [
    ['{l} Found Face-Down After {ws}-{ls} Thrashing', '{lo} reportedly blamed "the algorithm" and a "rigged bye week."'],
    ['{w} Beats {l} by {m}; Mercy Rule Proposal Gains Steam', 'A vote is expected never, because the commissioner is lazy.'],
    ['Report: {lo} Started a Player Who Retired in 2019', '{l} lost by {m}. Police say no foul play, just incompetence.'],
  ],
  nailbiter: [
    ['{w} Edges {l} by {m} in Monday Night Heart Attack', '{lo} has been staring at the scoreboard for 36 hours straight.'],
    ['{m}-Point Loss Sends {lo} Into Spiral of Bench Regret', 'The benched player scored 24. Nobody is talking about it. Everyone is talking about it.'],
  ],
  lowScore: [
    ['{l} Posts {ls}; Scientists Baffled', '"We did not think it was possible," said a team of researchers.'],
    ['{lo} Announces Rebuild After {ls}-Point Disaster', 'The rebuild is reportedly the same roster, but sadder.'],
  ],
  leader: [
    ['{w} Sits Atop Standings, Already Ordering Championship Ring', 'Historians note this has never once backfired on anyone.'],
    ['Power Rankings Shocker: {w} Is Actually Good?', '{wo} told reporters "I always knew," which nobody believes.'],
  ],
};

// Stable pick so a week's headline doesn't change on every rebuild.
function pick(list, seed) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return list[Math.abs(h) % list.length];
}

function fill([headline, blurb], v) {
  const sub = (s) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  return { headline: sub(headline), blurb: sub(blurb) };
}

function gameVars(m) {
  const homeWon = m.homeScore >= m.awayScore;
  const [wId, lId, ws, ls] = homeWon ? [m.home, m.away, m.homeScore, m.awayScore] : [m.away, m.home, m.awayScore, m.homeScore];
  return {
    w: teamById[wId]?.name ?? wId, wo: teamById[wId]?.owner ?? wId,
    l: teamById[lId]?.name ?? lId, lo: teamById[lId]?.owner ?? lId,
    ws: ws.toFixed(1), ls: ls.toFixed(1), m: (ws - ls).toFixed(1), margin: ws - ls,
  };
}

export function getHeadlines() {
  const auto = [];
  const playedWeeks = getWeeks().filter(({ games }) => games.some(isPlayed));

  for (const { week, games } of playedWeeks) {
    const played = games.filter(isPlayed).map(gameVars);
    const byWinScore = [...played].sort((a, b) => b.ws - a.ws);
    const byMargin = [...played].sort((a, b) => b.margin - a.margin);
    const add = (type, v) => auto.push({ week, ...fill(pick(TEMPLATES[type], `${type}${week}${v.w}${v.l}`), v) });

    add('highScore', byWinScore[0]);
    if (byMargin[0].margin >= 30) add('blowout', byMargin[0]);
    const close = byMargin.at(-1);
    if (close.margin < 5) add('nailbiter', close);
    const low = [...played].sort((a, b) => a.ls - b.ls)[0];
    if (low.ls < 85) add('lowScore', low);
  }

  if (playedWeeks.length) {
    const top = getStandings()[0];
    auto.push({
      week: playedWeeks.at(-1).week,
      ...fill(pick(TEMPLATES.leader, `leader${playedWeeks.length}${top.name}`), { w: top.name, wo: top.owner }),
    });
  }

  const manual = headlines.map((h) => ({ ...h, pinned: true }));
  return [...manual.sort((a, b) => new Date(b.date) - new Date(a.date)), ...auto.reverse()];
}
