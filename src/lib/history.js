import seasons from '../data/history.json';

// seasons: newest first; each has standings sorted by final rank (1 = champion).

// Unmanaged placeholder teams stay in season tables but don't count for awards or records.
const isGhost = (t) => /manager.?less/i.test(t.owner);
const real = (standings) => standings.filter((t) => !isGhost(t));
export function getSeasons() {
  return [...seasons].sort((a, b) => b.season - a.season);
}

export function getChampions() {
  return getSeasons().map(({ season, standings }) => ({
    season,
    champion: standings[0],
    runnerUp: standings[1],
    lastPlace: real(standings).at(-1),
  }));
}

export function getAllTime() {
  const owners = {};
  for (const { standings } of seasons) {
    real(standings).forEach((t, i, list) => {
      const o = (owners[t.owner] ??= {
        owner: t.owner, seasons: 0, titles: 0, finals: 0, playoffs: 0, lastPlace: 0,
        wins: 0, losses: 0, pointsFor: 0, bestFinish: Infinity,
      });
      o.seasons++;
      o.wins += t.wins;
      o.losses += t.losses;
      o.pointsFor += t.pointsFor;
      if (t.rank === 1) o.titles++;
      if (t.rank <= 2) o.finals++;
      if (t.playoffs) o.playoffs++;
      if (i === list.length - 1) o.lastPlace++;
      o.bestFinish = Math.min(o.bestFinish, t.rank);
    });
  }
  return Object.values(owners)
    .map((o) => ({ ...o, winPct: o.wins / (o.wins + o.losses), avgPoints: o.pointsFor / o.seasons }))
    .sort((a, b) => b.titles - a.titles || b.finals - a.finals || b.winPct - a.winPct);
}

export function getRecords() {
  const rows = seasons.flatMap(({ season, standings }) => real(standings).map((t) => ({ season, ...t })));
  const by = (fn) => [...rows].sort(fn)[0];
  return [
    ['Most points in a season', by((a, b) => b.pointsFor - a.pointsFor), (r) => `${r.pointsFor.toFixed(1)} pts`],
    ['Fewest points in a season', by((a, b) => a.pointsFor - b.pointsFor), (r) => `${r.pointsFor.toFixed(1)} pts`],
    ['Best regular-season record', by((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor), (r) => `${r.wins}-${r.losses}`],
    ['Worst regular-season record', by((a, b) => a.wins - b.wins || a.pointsFor - b.pointsFor), (r) => `${r.wins}-${r.losses}`],
    ['Most points against', by((a, b) => b.pointsAgainst - a.pointsAgainst), (r) => `${r.pointsAgainst.toFixed(1)} pts`],
  ].map(([label, r, fmt]) => ({ label, value: fmt(r), owner: r.owner, team: r.team, season: r.season }));
}
