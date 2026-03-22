// Check vocab coverage in a level file
const fs = require('fs');
const f = process.argv[2];
const h = fs.readFileSync(f, 'utf8');

// Extract KANJI array using bracket counting
const m = h.match(/const KANJI\s*=\s*\[/);
const si = m.index;
const bi = si + m[0].length - 1;
let depth = 1, ei = bi + 1;
while (depth > 0 && ei < h.length) {
  if (h[ei] === '[') depth++;
  else if (h[ei] === ']') depth--;
  ei++;
}
const arrStr = h.substring(bi, ei);
const K = eval(arrStr);
const total = K.length;
const counts = {0:0,1:0,2:0,3:0,4:0,5:0};
const under5list = [];
K.forEach(k => {
  const n = (k.compounds || []).length;
  counts[Math.min(n, 5)] = (counts[Math.min(n, 5)] || 0) + 1;
  if (n < 5) under5list.push({ kanji: k.kanji, meaning: k.meaning, count: n });
});
console.log(`${f}: ${total} kanji | 5:${counts[5]} 4:${counts[4]} 3:${counts[3]} 2:${counts[2]} 1:${counts[1]} 0:${counts[0]} | under5:${under5list.length}`);
if (under5list.length > 0 && under5list.length <= 20) {
  under5list.forEach(x => console.log(`  ${x.kanji} (${x.meaning}): ${x.count} vocab`));
}
