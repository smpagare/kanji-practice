#!/usr/bin/env node
// Scrape full kanji list from kakimashou.com for a given kentei level
// Usage: node scripts/scrape-kanji-list.js <level-slug>
// e.g.: node scripts/scrape-kanji-list.js level-pre-1

const https = require('https');
const slug = process.argv[2];
if (!slug) { console.error('Usage: node scrape-kanji-list.js <level-slug>'); process.exit(1); }

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

function extractKanji(html) {
  // Extract kanji from character links: /dictionary/character/X
  const matches = [...html.matchAll(/\/dictionary\/character\/([^"]+)"/g)];
  const kanji = [];
  for (const m of matches) {
    const decoded = decodeURIComponent(m[1]);
    if (decoded.length === 1 && decoded.charCodeAt(0) > 0x4e00) {
      if (!kanji.includes(decoded)) kanji.push(decoded);
    }
  }
  return kanji;
}

function extractTotal(html) {
  const m = html.match(/(\d+)\s+of\s+([\d,]+)\s+Kanji/i);
  if (m) return parseInt(m[2].replace(/,/g, ''));
  return null;
}

async function main() {
  const baseUrl = `https://www.kakimashou.com/curricula/kentei/${slug}`;
  console.error(`Fetching page 1...`);
  const page1 = await fetchPage(baseUrl);
  const total = extractTotal(page1);
  console.error(`Total kanji: ${total}`);
  const totalPages = Math.ceil(total / 50);
  console.error(`Total pages: ${totalPages}`);

  let allKanji = extractKanji(page1);
  console.error(`Page 1: ${allKanji.length} kanji`);

  for (let p = 2; p <= totalPages; p++) {
    await new Promise(r => setTimeout(r, 100));
    const url = `${baseUrl}?page=${p}`;
    try {
      const html = await fetchPage(url);
      const k = extractKanji(html);
      allKanji = allKanji.concat(k);
      console.error(`Page ${p}: ${k.length} kanji (total: ${allKanji.length})`);
    } catch (e) {
      console.error(`Page ${p} error: ${e.message}`);
    }
  }

  console.error(`\nFinal count: ${allKanji.length} kanji`);
  // Output as a single string to stdout
  console.log(allKanji.join(''));
}

main().catch(e => { console.error(e); process.exit(1); });
