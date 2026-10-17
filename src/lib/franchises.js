import { getStandings } from './standings.js';
import { getAllTime, getSeasons } from './history.js';

// Owner-editable profiles live in src/profiles/<slug>.md; stats are computed.
export const REPO_EDIT_URL = 'https://github.com/bsanderson410/SNOWAI/edit/main/src/profiles';
const DEFAULT_BIO = 'Write your franchise bio here. Trash talk is encouraged.';

export const ownerSlug = (owner) => owner.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function getFranchises() {
  const standings = getStandings();
  const allTime = Object.fromEntries(getAllTime().map((o) => [o.owner, o]));
  const seasons = getSeasons();

  return Object.entries(import.meta.glob('../profiles/*.md', { eager: true }))
    .map(([path, mod]) => {
      const slug = path.split('/').pop().replace(/\.md$/, '');
      const p = mod.frontmatter;
      const current = standings.find((t) => t.owner === p.owner);
      const rank = current ? standings.indexOf(current) + 1 : null;
      const history = seasons
        .map(({ season, standings: s }) => ({ season, ...s.find((t) => t.owner === p.owner) }))
        .filter((h) => h.team);
      return {
        ...p,
        slug,
        Content: mod.Content,
        hasBio: mod.rawContent().trim() !== DEFAULT_BIO,
        editUrl: `${REPO_EDIT_URL}/${slug}.md`,
        current, rank,
        career: allTime[p.owner] ?? null,
        history,
        titles: history.filter((h) => h.rank === 1).map((h) => h.season),
      };
    })
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}
