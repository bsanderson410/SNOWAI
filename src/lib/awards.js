import lineups from '../data/lineups.json';
import { getWeeks, teamById, isPlayed } from './standings.js';

// Weekly awards for every week where all games are final.
// Projection and bench awards only appear once Yahoo provides that data.

const side = (m, s) => {
  const opp = s === 'home' ? 'away' : 'home';
  const score = m[`${s}Score`];
  const oppScore = m[`${opp}Score`];
  return {
    id: m[s], team: teamById[m[s]]?.name ?? m[s], owner: teamById[m[s]]?.owner ?? m[s],
    score, oppScore, won: score > oppScore, margin: score - oppScore,
    projected: m[`${s}Projected`] ?? null,
    opponent: teamById[m[opp]]?.name ?? m[opp],
  };
};

const pts = (n) => n.toFixed(1);
const maxBy = (arr, fn) => arr.reduce((best, x) => (fn(x) > fn(best) ? x : best));

export function getWeeklyAwards() {
  return getWeeks()
    .filter(({ games }) => games.length && games.every(isPlayed))
    .map(({ week, games }) => {
      const sides = games.flatMap((m) => [side(m, 'home'), side(m, 'away')]);
      const winners = sides.filter((s) => s.won);
      const losers = sides.filter((s) => !s.won);
      const awards = [];
      const add = (emoji, title, who, detail) => awards.push({ emoji, title, team: who.team, owner: who.owner, detail });

      const top = maxBy(sides, (s) => s.score);
      add('🔥', 'Top Dog', top, `${pts(top.score)} points, the week's high score`);
      const low = maxBy(sides, (s) => -s.score);
      add('🧊', 'Basement Dweller', low, `${pts(low.score)} points. Yikes.`);

      if (winners.length) {
        const blowout = maxBy(winners, (s) => s.margin);
        add('💥', 'Biggest Blowout', blowout, `Beat ${blowout.opponent} by ${pts(blowout.margin)}`);
        const close = maxBy(winners, (s) => -s.margin);
        add('😱', 'Nail-Biter', close, `Survived ${close.opponent} by ${pts(close.margin)}`);
        const lucky = maxBy(winners, (s) => -s.score);
        add('🍀', 'Luckiest Win', lucky, `Won with just ${pts(lucky.score)}`);
      }
      if (losers.length) {
        const unlucky = maxBy(losers, (s) => s.score);
        add('😭', 'Unluckiest Loss', unlucky, `Lost despite scoring ${pts(unlucky.score)}`);
        const projectedLosers = losers.filter((s) => s.projected != null);
        if (projectedLosers.length) {
          const choke = maxBy(projectedLosers, (s) => s.projected - s.score);
          if (choke.projected > choke.score) {
            add('📉', 'Biggest Choke', choke, `Projected ${pts(choke.projected)}, scored ${pts(choke.score)}, and lost`);
          }
        }
      }

      const bench = Object.entries(lineups[week] ?? {}).map(([id, l]) => ({ ...l, team: teamById[id]?.name ?? id, owner: teamById[id]?.owner ?? id }));
      if (bench.length) {
        const pine = maxBy(bench, (b) => b.benchPoints);
        add('🪑', 'Bench Points Left on the Table', pine, `${pts(pine.benchPoints)} points sat on the bench`);
        const withTop = bench.filter((b) => b.topBench);
        if (withTop.length) {
          const wasted = maxBy(withTop, (b) => b.topBench.points);
          add('🚨', 'Benched and Went Off', wasted, `${wasted.topBench.name} (${wasted.topBench.pos}) scored ${pts(wasted.topBench.points)} on the bench`);
        }
      }

      return { week, awards };
    })
    .reverse();
}

// Every week's best benched player, for the Hall of Shame.
export function getBenchedBlowups(minPoints = 20) {
  return Object.entries(lineups)
    .flatMap(([week, teams]) => Object.entries(teams).map(([id, l]) => ({ week: Number(week), id, ...l.topBench })))
    .filter((b) => b.points >= minPoints)
    .map((b) => ({ ...b, team: teamById[b.id]?.name ?? b.id, owner: teamById[b.id]?.owner ?? b.id }))
    .sort((a, b) => b.points - a.points);
}
