import teams from '../data/teams.json';
import matchups from '../data/matchups.json';

export const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));

export const isPlayed = (m) => m.homeScore != null && m.awayScore != null;

// Standings are computed from matchups.json — just enter scores each week.
export function getStandings() {
  const rows = Object.fromEntries(
    teams.map((t) => [t.id, { ...t, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }])
  );

  for (const m of matchups.filter(isPlayed)) {
    const home = rows[m.home];
    const away = rows[m.away];
    home.pointsFor += m.homeScore;
    home.pointsAgainst += m.awayScore;
    away.pointsFor += m.awayScore;
    away.pointsAgainst += m.homeScore;
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

// Prefix internal links with the base path (e.g. /snowai on github.io; empty on a custom domain).
export const url = (path) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
