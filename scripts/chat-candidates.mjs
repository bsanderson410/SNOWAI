// Finds the funniest messages in an exported group chat so you can pick
// quotes / Hall of Shame material. Raw chats never leave your computer:
// output goes to chat-exports/ (git-ignored).
//
// Usage: node scripts/chat-candidates.mjs <export.txt> [howMany=40]
// Works with imessage-exporter's txt output, and with plain "Name: message" lines.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const [file, howMany = '40'] = process.argv.slice(2);
if (!file) {
  console.error('Usage: node scripts/chat-candidates.mjs <export.txt> [howMany]');
  process.exit(1);
}

const DATE_LINE = /^[A-Z][a-z]{2} \d{1,2}, \d{4}\s+\d{1,2}:\d{2}(:\d{2})? ?[AP]M/;
const TAPBACK = /^\s*(Loved|Liked|Laughed at|Emphasized|Questioned|Disliked|Reacted .+?) by /i;
const LEGACY_TAPBACK = /^(Loved|Liked|Laughed at|Emphasized|Questioned|Disliked) [“"](.+)[”"]$/i;
const LAUGH = /\b(lol+|lmf?ao+|hah(a|ah)+|dead|crying|i'?m done)\b|😂|🤣|💀|😭/i;
const WEIGHT = { 'laughed at': 3, emphasized: 2, loved: 2, liked: 1 };

function parse(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  let cur = null;
  const push = () => cur && cur.body.length && messages.push(cur);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (DATE_LINE.test(line)) {
      push();
      cur = { date: line.match(DATE_LINE)[0], sender: (lines[++i] ?? '').trim(), body: [], reactions: [] };
      continue;
    }
    const simple = !cur?.date && line.match(/^(?:\[[^\]]+\]\s*)?([^:]{1,40}): (.+)$/);
    if (simple) {
      push();
      cur = { date: '', sender: simple[1].trim(), body: [simple[2]], reactions: [] };
      continue;
    }
    if (!cur || /^\s*Tapbacks:\s*$/i.test(line)) continue;
    const tap = line.match(TAPBACK);
    if (tap) cur.reactions.push(tap[1].toLowerCase());
    else if (line.trim()) cur.body.push(line.trim());
  }
  push();
  return messages.map((m) => ({ ...m, text: m.body.join(' ') }));
}

const messages = parse(await readFile(file, 'utf8'));

// Old-style reactions arrive as their own messages ("Laughed at “...”"): credit the original.
const byText = new Map(messages.map((m) => [m.text, m]));
for (const m of messages) {
  const legacy = m.text.match(LEGACY_TAPBACK);
  if (legacy) {
    byText.get(legacy[2])?.reactions.push(legacy[1].toLowerCase());
    m.isReaction = true;
  }
}

const real = messages.filter((m) => !m.isReaction && m.text.length >= 8 && !/^https?:\/\//.test(m.text));
real.forEach((m, i) => {
  const tapScore = m.reactions.reduce((sum, r) => sum + (WEIGHT[r] ?? 1), 0);
  const laughReplies = real.slice(i + 1, i + 4).filter((n) => n.sender !== m.sender && LAUGH.test(n.text)).length;
  m.score = tapScore + laughReplies * 2;
});

const top = real.filter((m) => m.score > 0).sort((a, b) => b.score - a.score).slice(0, Number(howMany));

const isoDate = (d) => {
  const parsed = new Date(d.replace(/\s+/, ' '));
  return isNaN(parsed) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};

const out = [
  `# Chat candidates from ${file}`,
  '',
  `${messages.length} messages scanned. Top ${top.length} by reactions and laughing replies.`,
  'Copy the ones you like into src/data/quotes.json (or shame.json).',
  '',
  ...top.flatMap((m, i) => [
    `## ${i + 1}. ${m.sender} (score ${m.score}${m.date ? `, ${m.date}` : ''})`,
    '',
    `> ${m.text}`,
    '',
    '```json',
    JSON.stringify({ date: isoDate(m.date), text: m.text, by: m.sender }, null, 2) + ',',
    '```',
    '',
  ]),
].join('\n');

await mkdir('chat-exports', { recursive: true });
await writeFile('chat-exports/candidates.md', out);
console.log(`Scanned ${messages.length} messages. Wrote top ${top.length} to chat-exports/candidates.md`);
