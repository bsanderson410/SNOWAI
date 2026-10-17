# Roadmap

Rough order: easy wins first, bigger features later.

## Phase 1 – Static site (done)
- [x] Home, standings, schedule/results, teams, news, history, rules
- [x] Auto-calculated standings from matchup scores
- [x] Auto-deploy on push

## Phase 2 – Less manual entry
- [ ] Auto-import scores from your platform's API (Sleeper's API is public & free; ESPN/Yahoo need auth)
      via a scheduled GitHub Action that commits updated `matchups.json` every Tuesday
- [ ] Team pages (`/teams/[id]`) with game log, logo, bio
- [ ] Power rankings page, weekly awards (high score, biggest blowout, "unluckiest loss")
- [ ] All-time records / head-to-head matrix across seasons

## Phase 3 – Interactive
- [ ] Trash-talk board / comments (Giscus — free, uses GitHub Discussions)
- [ ] Polls & predictions
- [ ] Login for owners (would add a backend such as Supabase/Firebase)

## Phase 4 – "AI" in SNOWAI
- [ ] AI-written weekly recaps generated from the box scores (Claude API in a GitHub Action)
- [ ] Trade analyzer / start-sit assistant
