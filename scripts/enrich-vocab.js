#!/usr/bin/env node
// Enrich kanji compound data from kakimashou.com
// Usage: node scripts/enrich-vocab.js jlpt/n1.html

const fs = require('fs');
const https = require('https');

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/enrich-vocab.js <file>'); process.exit(1); }

const html = fs.readFileSync(file, 'utf8');
const m = html.match(/const KANJI\s*=\s*(\[[\s\S]*?\]);/);
if (!m) { console.error('No KANJI array found'); process.exit(1); }

const KANJI = eval(m[1]);
console.log(`Loaded ${KANJI.length} kanji from ${file}`);

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseVocab(pageHtml, kanji) {
  const results = [];
  // Find all wordBrief blocks
  const blocks = pageHtml.split('class="wordBrief"');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Extract the word from the href: /dictionary/word/ENCODED_WORD
    const hrefMatch = block.match(/href="\/dictionary\/word\/([^"]+)"/);
    if (!hrefMatch) continue;
    const word = decodeURIComponent(hrefMatch[1]);

    // Extract reading from ruby furigana
    // The structure uses <th> tags for furigana and <td> for kanji/kana
    // We need to reconstruct the full reading
    const furiMatches = [...block.matchAll(/<th[^>]*>([^<]*)<\/th>/g)];
    const tdMatches = [...block.matchAll(/<td>([^<]*)<\/td>/g)];

    let reading = '';
    for (let j = 0; j < Math.max(furiMatches.length, tdMatches.length); j++) {
      const furi = furiMatches[j] ? furiMatches[j][1].trim() : '';
      const base = tdMatches[j] ? tdMatches[j][1].trim() : '';
      // If furigana exists and isn't whitespace, use it; otherwise use the base character
      if (furi && furi !== '\u3000' && furi !== ' ') {
        reading += furi;
      } else {
        reading += base;
      }
    }

    // Clean reading - remove whitespace
    reading = reading.replace(/[\s\u3000]/g, '');

    // Extract meaning from smallText div
    const meaningMatch = block.match(/class="smallText">\s*([\s\S]*?)\s*<\/div>/);
    if (!meaningMatch) continue;
    let meaning = meaningMatch[1].trim()
      .replace(/<[^>]+>/g, '')
      .replace(/①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩/g, '; ')
      .replace(/\s+/g, ' ')
      .replace(/^;\s*/, '')
      .trim();

    // Take first meaning only
    meaning = meaning.split(/;\s*/)[0].trim();
    if (meaning.length > 50) meaning = meaning.substring(0, 50);

    if (word && reading && meaning && word.length <= 6) {
      results.push({ word, reading, meaning });
    }
  }

  return results;
}

async function enrichKanji(entry) {
  const encoded = encodeURIComponent(entry.kanji);
  const url = `https://www.kakimashou.com/dictionary/character/${encoded}`;

  try {
    const page = await fetchPage(url);
    const vocab = parseVocab(page, entry.kanji);

    if (vocab.length === 0) return 0;

    const existing = new Set((entry.compounds || []).map(c => c.word));
    let added = 0;

    for (const v of vocab) {
      if (existing.has(v.word)) continue;
      if (!entry.compounds) entry.compounds = [];
      if (entry.compounds.length >= 5) break;
      entry.compounds.push(v);
      existing.add(v.word);
      added++;
    }

    return added;
  } catch (e) {
    console.error(`  Error fetching ${entry.kanji}: ${e.message}`);
    return 0;
  }
}

async function main() {
  const needsEnrich = KANJI.filter(k => !k.compounds || k.compounds.length < 5);
  console.log(`${needsEnrich.length} kanji need enrichment (< 5 compounds)\n`);

  let totalAdded = 0;
  let enriched = 0;
  const batchSize = 10;

  for (let i = 0; i < needsEnrich.length; i++) {
    const entry = needsEnrich[i];
    const before = (entry.compounds || []).length;
    const added = await enrichKanji(entry);

    if (added > 0) {
      enriched++;
      totalAdded += added;
      console.log(`  ${entry.kanji} (${entry.meaning}): ${before} -> ${entry.compounds.length} (+${added})`);
    }

    if ((i + 1) % 50 === 0) {
      console.log(`--- Progress: ${i + 1}/${needsEnrich.length} checked, ${enriched} enriched, ${totalAdded} added ---`);
    }

    // Rate limit: 150ms between requests
    await sleep(150);
  }

  console.log(`\n=== Done! Enriched ${enriched}/${needsEnrich.length} kanji, added ${totalAdded} new compounds ===`);

  // Write back
  const kanjiStr = JSON.stringify(KANJI);
  const newHtml = html.replace(/const KANJI\s*=\s*\[[\s\S]*?\];/, `const KANJI = ${kanjiStr};`);
  fs.writeFileSync(file, newHtml);
  console.log(`Updated ${file}`);
}

main().catch(console.error);
