#!/usr/bin/env node
// Enriches a level HTML file with companion kanji data
// Finds all kanji in compounds that aren't in the main KANJI array,
// fetches their readings from kanjiapi.dev + vocab from kakimashou.com
// Usage: node scripts/enrich-companions.js <file.html>

const fs = require('fs');
const https = require('https');

const filePath = process.argv[2];
if (!filePath) { console.error('Usage: node enrich-companions.js <file.html>'); process.exit(1); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh)' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchJSON(res.headers.location).then(resolve).catch(reject);
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh)' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) return fetchPage(res.headers.location).then(resolve).catch(reject);
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
  let html = fs.readFileSync(filePath, 'utf8');

  // Extract KANJI array
  const kanjiMatch = html.match(/const KANJI\s*=\s*\[/);
  if (!kanjiMatch) { console.error('No KANJI array found'); process.exit(1); }
  const si = kanjiMatch.index + kanjiMatch[0].length - 1;
  let depth = 1, ei = si + 1;
  while (depth > 0 && ei < html.length) {
    if (html[ei] === '[') depth++;
    else if (html[ei] === ']') depth--;
    ei++;
  }
  const kanjiArrayStr = html.substring(si, ei);
  const KANJI = eval('(' + kanjiArrayStr + ')');
  const kanjiSet = new Set(KANJI.map(k => k.kanji));

  console.log(`Level has ${KANJI.length} kanji`);

  // Find all kanji in compounds that aren't in our array
  const companionSet = new Set();
  KANJI.forEach(entry => {
    if (!entry.compounds) return;
    entry.compounds.forEach(comp => {
      [...comp.word].forEach(ch => {
        if (ch.charCodeAt(0) >= 0x4e00 && ch.charCodeAt(0) <= 0x9fff && !kanjiSet.has(ch)) {
          companionSet.add(ch);
        }
      });
    });
  });

  const companions = [...companionSet];
  console.log(`Found ${companions.length} companion kanji to fetch`);

  // Step 1: Fetch readings from kanjiapi.dev
  const companionData = {};
  for (let i = 0; i < companions.length; i++) {
    const ch = companions[i];
    try {
      const info = await fetchJSON(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(ch)}`);
      companionData[ch] = {
        on: info.on_readings || [],
        kun: info.kun_readings || [],
        meaning: (info.meanings || []).slice(0, 3).join(', '),
        vocab: []
      };
    } catch (e) {
      companionData[ch] = { on: [], kun: [], meaning: '', vocab: [] };
    }
    if ((i + 1) % 100 === 0) console.log(`  Readings: ${i + 1}/${companions.length}`);
    await sleep(80);
  }
  console.log(`  Readings done: ${companions.length}`);

  // Step 2: Collect vocab from existing level compounds first
  KANJI.forEach(entry => {
    if (!entry.compounds) return;
    entry.compounds.forEach(comp => {
      [...comp.word].forEach(ch => {
        if (companionData[ch] && companionData[ch].vocab.length < 5) {
          if (!companionData[ch].vocab.some(v => v.word === comp.word)) {
            companionData[ch].vocab.push({ word: comp.word, reading: comp.reading, meaning: comp.meaning });
          }
        }
      });
    });
  });

  // Step 3: For companions with < 5 vocab, fetch from kakimashou.com
  const needVocab = companions.filter(ch => companionData[ch].vocab.length < 5);
  console.log(`  ${needVocab.length} companions need vocab from kakimashou`);

  for (let i = 0; i < needVocab.length; i++) {
    const ch = needVocab[i];
    const existing = companionData[ch].vocab;
    const seen = new Set(existing.map(v => v.word));
    try {
      const page = await fetchPage(`https://www.kakimashou.com/dictionary/character/${encodeURIComponent(ch)}`);
      const vocabList = parseVocab(page);
      for (const v of vocabList) {
        if (existing.length >= 5) break;
        if (!seen.has(v.word)) { seen.add(v.word); existing.push(v); }
      }
    } catch (e) {
      // skip silently
    }
    if ((i + 1) % 100 === 0) console.log(`  Vocab: ${i + 1}/${needVocab.length}`);
    await sleep(100);
  }
  console.log(`  Vocab done: ${needVocab.length} fetched`);

  // Insert COMPANION_KANJI into the HTML
  const companionStr = 'const COMPANION_KANJI = ' + JSON.stringify(companionData) + ';';

  const insertPoint = html.indexOf(';', ei - 1) + 1;
  if (html.indexOf('const COMPANION_KANJI') !== -1) {
    const existStart = html.indexOf('const COMPANION_KANJI');
    const objStart = html.indexOf('{', existStart);
    let d = 1, existEnd = objStart + 1;
    while (d > 0 && existEnd < html.length) {
      if (html[existEnd] === '{') d++;
      else if (html[existEnd] === '}') d--;
      existEnd++;
    }
    while (existEnd < html.length && html[existEnd] !== ';') existEnd++;
    existEnd++;
    html = html.substring(0, existStart) + companionStr + html.substring(existEnd);
  } else {
    html = html.substring(0, insertPoint) + '\n' + companionStr + html.substring(insertPoint);
  }

  fs.writeFileSync(filePath, html);
  console.log(`Updated ${filePath}`);
}

main().catch(console.error);
