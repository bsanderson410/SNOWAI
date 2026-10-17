# Quotes, Hall of Shame & Awards

## Weekly awards (automatic)
Generated from scores once every game in a week is final. Shown on the home page and `/awards`.
- Always: Top Dog, Basement Dweller, Biggest Blowout, Nail-Biter, Luckiest Win, Unluckiest Loss
- Once Yahoo is connected: Biggest Choke (vs. projection), Bench Points Left on the Table, Benched and Went Off

## Quote of the Week — `src/data/quotes.json`
The newest entry (by `date`) is the Quote of the Week; older ones go to `/quotes`.
```json
{ "date": "2026-10-20", "text": "the line", "by": "Who said it", "context": "optional backstory" }
```

## Hall of Shame — `src/data/shame.json`
Last-place finishes come from league history automatically. Everything else is hand-added:
```json
{
  "lineups":     [{ "season": 2025, "week": 7, "owner": "Ben", "title": "Started a kicker at FLEX", "story": "optional" }],
  "trades":      [{ "season": 2024, "winner": "Sam", "loser": "Zak", "gave": "Bijan Robinson", "got": "two backup TEs", "story": "optional" }],
  "benched":     [{ "season": 2023, "week": 3, "owner": "Tripp", "player": "Puka Nacua", "points": 38.2, "story": "optional" }],
  "punishments": [{ "season": 2025, "punishment": "Took the SAT at 28" }]
}
```
Once Yahoo is connected, "Benched and went off" also fills in automatically every week.

## Adding from your phone
On github.com open the file → pencil icon → add an entry (mind the commas) → Commit.
The site updates about a minute later. Or just send the quote/story to Claude.

## Mining the iMessage group chat (Mac, ~5 minutes)
1. Install the exporter: `brew install imessage-exporter`
2. Export as text: `imessage-exporter -f txt -o ~/snowa-export`
3. Find the group chat's file in `~/snowa-export` (named after the participants or group name).
4. Either:
   - **Easiest:** send that file to Claude and ask for the best quotes and shame stories, or
   - **Yourself:** in this repo run `npm run chat -- ~/snowa-export/<file>.txt`, then open
     `chat-exports/candidates.md`. It ranks messages by tapbacks (😂 counts most) and laughing replies,
     with a ready-to-paste JSON block for each.

`chat-exports/` is git-ignored, so the raw chat never gets published. Only what you copy into
`quotes.json` / `shame.json` goes on the (public) site.
