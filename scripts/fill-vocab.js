#!/usr/bin/env node
// Fill vocab for main KANJI entries that have < 5 compounds
// Fetches from kakimashou.com
// Usage: node scripts/fill-vocab.js <file.html>

const fs = require('fs');
const https = require('https');
const path = process.argv[2];
if (!path) { console.error('Usage: node scripts/fill-vocab.js <file.html>'); process.exit(1); }

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh)' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseVocab(pageHtml) {
  const results = [];
  const blocks = pageHtml.split('class="wordBrief"');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const hrefMatch = block.match(/href="\/dictionary\/word\/([^"]+)"/);
    if (!hrefMatch) continue;
    const word = decodeURIComponent(hrefMatch[1]);
    const furiMatches = [...block.matchAll(/<th[^>]*>([^<]*)<\/th>/g)];
    const tdMatches = [...block.matchAll(/<td>([^<]*)<\/td>/g)];
    let reading = '';
    for (let j = 0; j < Math.max(furiMatches.length, tdMatches.length); j++) {
      const furi = furiMatches[j] ? furiMatches[j][1].trim() : '';
      const base = tdMatches[j] ? tdMatches[j][1].trim() : '';
      if (furi && furi !== '\u3000' && furi !== ' ') reading += furi;
      else reading += base;
    }
    reading = reading.replace(/[\s\u3000]/g, '');
    const meaningMatch = block.match(/class="smallText">\s*([\s\S]*?)\s*<\/div>/);
    if (!meaningMatch) continue;
    let meaning = meaningMatch[1].trim()
      .replace(/<[^>]+>/g, '')
      .replace(/[\u2460-\u2469]/g, '; ')
      .replace(/\s+/g, ' ').replace(/^;\s*/, '').trim();
    meaning = meaning.split(/;\s*/)[0].trim();
    if (meaning.length > 50) meaning = meaning.substring(0, 50);
    if (word && reading && meaning && word.length <= 6) results.push({ word, reading, meaning });
  }
  return results;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let html = fs.readFileSync(path, 'utf8');

  // Extract KANJI array
  const m = html.match(/const KANJI\s*=\s*\[/);
  const si = m.index;
  const bi = si + m[0].length - 1;
  let depth = 1, ei = bi + 1;
  while (depth > 0 && ei < html.length) {
    if (html[ei] === '[') depth++;
    else if (html[ei] === ']') depth--;
    ei++;
  }
  const arrStr = html.substring(bi, ei);
  const K = eval(arrStr);

  // Find kanji needing more vocab
  const needMore = K.filter(k => (k.compounds || []).length < 5);
  console.log(`${path}: ${K.length} total, ${needMore.length} need more vocab`);

  if (needMore.length === 0) {
    console.log('All kanji have 5+ vocab. Nothing to do.');
    return;
  }

  let fetched = 0;
  for (const k of needMore) {
    const existing = k.compounds || [];
    const existingWords = new Set(existing.map(c => c.word));

    try {
      const page = await fetchPage(`https://www.kakimashou.com/dictionary/character/${encodeURIComponent(k.kanji)}`);
      const vocab = parseVocab(page);
      // Add new vocab that doesn't duplicate existing
      for (const v of vocab) {
        if (existing.length >= 5) break;
        if (!existingWords.has(v.word)) {
          existing.push(v);
          existingWords.add(v.word);
        }
      }
      k.compounds = existing;
      fetched++;
      if (fetched % 50 === 0) console.log(`  Fetched: ${fetched}/${needMore.length}`);
    } catch (e) {
      console.error(`  Error fetching ${k.kanji}: ${e.message}`);
    }
    await sleep(100);
  }
  console.log(`  Fetched: ${fetched}/${needMore.length} done`);

  // Rebuild the KANJI array string
  const lines = K.map(k => {
    const on = k.on.map(r => `"${r}"`).join(',');
    const kun = k.kun.map(r => `"${r}"`).join(',');
    const comps = (k.compounds || []).map(c => {
      const w = c.word.replace(/"/g, '\\"');
      const r = c.reading.replace(/"/g, '\\"');
      const m = c.meaning.replace(/"/g, '\\"');
      return `{word:"${w}",reading:"${r}",meaning:"${m}"}`;
    }).join(',');
    const meaning = (k.meaning || '').replace(/"/g, '\\"');
    // Preserve antonym if it exists
    const ant = k.antonym ? `"${k.antonym}"` : 'null';
    // Preserve grade if it exists
    const grade = k.grade !== undefined ? `, grade:${k.grade}` : '';
    return `  { kanji:"${k.kanji}", on:[${on}], kun:[${kun}], meaning:"${meaning}", compounds:[${comps}], antonym:${ant}${grade} }`;
  });
  const newArr = '[\n' + lines.join(',\n') + '\n]';

  // Replace in file
  while (ei < html.length && html[ei] !== ';') ei++;
  html = html.substring(0, si) + 'const KANJI = ' + newArr + html.substring(ei);

  fs.writeFileSync(path, html);
  console.log(`Updated ${path}`);

  // Validate
  const scripts = html.split('<script>');
  const mainScript = scripts[2].split('</script>')[0];
  try { new Function(mainScript); console.log('JS validation: OK'); } catch(e) { console.log('JS validation: ERROR - ' + e.message); }
}

main().catch(console.error);
