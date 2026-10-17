import teams from '../data/teams.json';
import matchups from '../data/matchups.json';

export const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));

export const isPlayed = (m) => m.homeScore != null && m.awayScore != null;

// Standings are computed from matchups.json — just enter scores each week.
export function getStandings() {
  // `baseline` holds a team's record from weeks before game-by-game results were tracked.
  // Points against isn't known for those weeks, so it's left blank when a baseline exists.
  const rows = Object.fromEntries(
    teams.map((t) => {
      const b = t.baseline ?? {};
      return [t.id, {
        ...t,
        wins: b.wins ?? 0, losses: b.losses ?? 0, ties: b.ties ?? 0,
        pointsFor: b.pointsFor ?? 0,
        pointsAgainst: b.pointsAgainst ?? (t.baseline ? null : 0),
      }];
    })
  );

  for (const m of matchups.filter(isPlayed)) {
    const home = rows[m.home];
    const away = rows[m.away];
    home.pointsFor += m.homeScore;
    if (home.pointsAgainst != null) home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore;
    if (away.pointsAgainst != null) away.pointsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) { home.wins++; away.losses++; }
    else if (m.homeScore < m.awayScore) { away.wins++; home.losses++; }
    else { home.ties++; away.ties++; }
  }

  const pct = (r) => {
    const games = r.wins + r.losses + r.ties;
    return games ? (r.wins + r.ties / 2) / games : 0;
  };

  return Object.values(rows).sort((a, b) => pct(b) - pct(a) || b.pointsFor - a.pointsFor);
}

export function getWeeks() {
  const weeks = {};
  for (const m of matchups) (weeks[m.week] ??= []).push(m);
  return Object.entries(weeks)
    .map(([week, games]) => ({ week: Number(week), games }))
    .sort((a, b) => a.week - b.week);
}

export function getNews() {
  const posts = Object.values(import.meta.glob('../news/*.md', { eager: true }));
  return posts
    .map((p) => ({ ...p.frontmatter, slug: p.file.split('/').pop().replace(/\.md$/, ''), Content: p.Content }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Prefix internal links with the base path (e.g. /SNOWAI on github.io; empty on a custom domain).
export const url = (path) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
