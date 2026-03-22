#!/usr/bin/env node
// Generate dictionary.html by combining KANJI arrays from all level files
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const sources = [
  { file: 'jlpt/n5.html', level: 'N5', group: 'JLPT' },
  { file: 'jlpt/n4.html', level: 'N4', group: 'JLPT' },
  { file: 'jlpt/n3.html', level: 'N3', group: 'JLPT' },
  { file: 'jlpt/n2.html', level: 'N2', group: 'JLPT' },
  { file: 'jlpt/n1.html', level: 'N1', group: 'JLPT' },
  { file: 'kentei/level-10.html', level: '10級', group: 'Kentei' },
  { file: 'kentei/level-9.html', level: '9級', group: 'Kentei' },
  { file: 'kentei/level-8.html', level: '8級', group: 'Kentei' },
  { file: 'kentei/level-7.html', level: '7級', group: 'Kentei' },
  { file: 'kentei/level-6.html', level: '6級', group: 'Kentei' },
  { file: 'kentei/level-5.html', level: '5級', group: 'Kentei' },
  { file: 'kentei/level-4.html', level: '4級', group: 'Kentei' },
  { file: 'kentei/level-3.html', level: '3級', group: 'Kentei' },
  { file: 'kentei/level-2.html', level: '2級', group: 'Kentei' },
  { file: 'kentei/level-pre-1.html', level: '準1級', group: 'Kentei' },
  { file: 'kentei/level-1.html', level: '1級', group: 'Kentei' },
];

let allKanji = [];

for (const src of sources) {
  const html = fs.readFileSync(path.join(ROOT, src.file), 'utf8');
  const startMatch = html.match(/const KANJI\s*=\s*\[/);
  if (!startMatch) { console.error(`No KANJI array found in ${src.file}`); continue; }
  const startIdx = startMatch.index + startMatch[0].length - 1;
  let depth = 1, i = startIdx + 1;
  while (depth > 0 && i < html.length) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']') depth--;
    i++;
  }
  const m = [null, html.substring(startIdx, i)];
  if (!m) { console.error(`No KANJI array found in ${src.file}`); continue; }
  const entries = eval(m[1]);
  for (const e of entries) {
    allKanji.push({
      kanji: e.kanji,
      on: e.on || [],
      kun: e.kun || [],
      meaning: e.meaning || '',
      compounds: (e.compounds || []).slice(0, 5),
      level: src.level,
      group: src.group,
    });
  }
  console.log(`  ${src.level}: ${entries.length} kanji`);
}

// Deduplicate - keep the first occurrence (lower JLPT levels first)
const seen = new Set();
const unique = [];
for (const k of allKanji) {
  if (seen.has(k.kanji)) {
    // Add level tag to existing entry
    const existing = unique.find(u => u.kanji === k.kanji);
    if (existing && !existing.levels.includes(k.level)) {
      existing.levels.push(k.level);
    }
    continue;
  }
  seen.add(k.kanji);
  unique.push({ ...k, levels: [k.level] });
}

console.log(`\nTotal unique kanji: ${unique.length}`);

const DATA_JSON = JSON.stringify(unique);

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kanji Dictionary</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;500;600;700;800&family=Noto+Serif+JP:wght@400;500;600;700&display=swap">
<style>
  :root {
    --bg: #08080f;
    --surface: #111119;
    --surface2: #1a1a28;
    --accent: #8b7ff5;
    --accent-dim: #a89dff;
    --correct: #3de88a;
    --wrong: #ff5252;
    --text: #e4e4f0;
    --text-dim: #8888a8;
    --border: #2a2a40;
    --gold: #ffd54f;
    --glow: rgba(139, 127, 245, 0.5);
    --glow-text: rgba(228, 228, 240, 0.25);
  }

  [data-theme="light"] {
    --bg: #f5f5f7;
    --surface: #ffffff;
    --surface2: #eeeef2;
    --accent: #5a4ff5;
    --accent-dim: #7a72f7;
    --correct: #1a9f55;
    --wrong: #d93025;
    --text: #1d1d1f;
    --text-dim: #6e6e80;
    --border: #d8d8e0;
    --gold: #d4a017;
    --glow: transparent;
    --glow-text: transparent;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Shippori Mincho B1', 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    font-size: 18px;
  }

  /* ── NAV ── */
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  nav .logo {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  nav .logo span { color: var(--accent); }
  nav .logo a {
    color: var(--text);
    text-decoration: none;
    transition: color 0.2s;
  }
  nav .logo a:hover { color: var(--accent); }
  nav .nav-links { display: flex; gap: 6px; }
  nav .nav-links button {
    background: none;
    border: 1px solid transparent;
    color: var(--text-dim);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  nav .nav-links button:hover,
  nav .nav-links button.active {
    color: var(--text);
    background: var(--surface2);
    border-color: var(--border);
  }
  nav .nav-links button.active { border-color: var(--accent); color: var(--accent); }

  /* ── MAIN ── */
  main {
    max-width: 100%;
    margin: 0;
    padding: 32px 48px;
  }

  /* ── SEARCH ── */
  .search-container {
    max-width: 700px;
    margin: 0 auto 32px;
    text-align: center;
  }
  .search-container h2 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .search-container h2 span { color: var(--accent); }
  .search-container p {
    color: var(--text-dim);
    margin-bottom: 20px;
    font-size: 1rem;
  }
  .search-box {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .search-input {
    flex: 1;
    padding: 14px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text);
    font-size: 1.2rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--text-dim); }
  .search-count {
    color: var(--text-dim);
    font-size: 0.9rem;
    margin-top: 12px;
  }

  /* ── LEVEL FILTERS ── */
  .level-filters {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .level-filters button {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
    transition: all 0.2s;
  }
  .level-filters button:hover { border-color: var(--accent); color: var(--text); }
  .level-filters button.active { border-color: var(--accent); color: var(--accent); background: var(--surface2); }

  /* ── RESULTS GRID ── */
  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
    margin-top: 20px;
  }
  .kanji-tile {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .kanji-tile:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139,127,245,0.15);
  }
  .tile-kanji {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .tile-reading {
    font-size: 0.85rem;
    color: var(--text-dim);
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile-level {
    font-size: 0.7rem;
    color: var(--accent);
    margin-top: 4px;
    font-weight: 600;
  }

  /* ── KANJI DETAIL MODAL ── */
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    z-index: 200;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }
  .modal-overlay.show { display: flex; }
  .modal-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 36px;
    position: relative;
  }
  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 1.5rem;
    cursor: pointer;
  }
  .modal-close:hover { color: var(--text); }
  .modal-header {
    display: flex;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 24px;
  }
  .modal-kanji-big {
    font-size: 6rem;
    font-weight: 800;
    line-height: 1;
    color: var(--accent);
  }
  .modal-meta { flex: 1; padding-top: 8px; }
  .modal-meaning {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .modal-levels {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .modal-level-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    border: 1px solid var(--accent);
    color: var(--accent);
  }

  .modal-readings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .modal-reading-box {
    background: var(--surface2);
    border-radius: 12px;
    padding: 14px 18px;
  }
  .modal-reading-box .label {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .modal-reading-box .value {
    font-size: 1.5rem;
    font-weight: 500;
  }

  .modal-vocab {
    background: var(--surface2);
    border-radius: 12px;
    padding: 16px 20px;
    border: 1px solid var(--border);
  }
  .modal-vocab .label {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #d4a846;
    margin-bottom: 10px;
  }
  .modal-vocab-item {
    padding: 6px 0;
    line-height: 1.8;
  }
  .modal-vocab-item .word {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--text);
  }
  .modal-vocab-item .reading {
    font-size: 1.1rem;
    color: var(--text-dim);
  }
  .modal-vocab-item .meaning {
    font-size: 1.1rem;
    color: var(--accent);
  }

  /* ── THEME TOGGLE ── */
  .theme-toggle {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  .theme-toggle:hover { border-color: var(--accent); }

  /* ── GLOW ── */
  body { text-shadow: 0 0 8px var(--glow-text); }
  .search-container h2 { text-shadow: 0 0 12px var(--glow), 0 0 24px var(--glow); }

  /* ── RESPONSIVE ── */
  @media (max-width: 800px) {
    main { padding: 20px 16px; }
    .results-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
    .modal-header { flex-direction: column; align-items: center; text-align: center; }
    .modal-kanji-big { font-size: 4rem; }
    .modal-readings { grid-template-columns: 1fr; }
  }
</style>
<script>(function(){var t=localStorage.getItem('kentei_theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>

<nav>
  <div class="logo"><a href="index.html">漢字<span>辞書</span></a></div>
  <div class="nav-links">
    <button class="theme-toggle" onclick="toggleTheme()" id="theme-btn">☀️ Light</button>
    <button onclick="window.location.href='index.html'" style="background:none;border:1px solid transparent;color:var(--text-dim);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:1rem;transition:all 0.2s">Menu</button>
  </div>
</nav>

<main>
  <div class="search-container">
    <h2>漢字<span>Dictionary</span></h2>
    <p>Search across all ${unique.length} kanji from JLPT & Kentei levels</p>
    <div class="search-box">
      <input type="text" class="search-input" id="search-input" placeholder="Search kanji, reading, or meaning..." oninput="doSearch()" autofocus>
    </div>
    <div class="level-filters" id="level-filters">
      <button class="active" onclick="setFilter('all')">All</button>
      <button onclick="setFilter('N5')">N5</button>
      <button onclick="setFilter('N4')">N4</button>
      <button onclick="setFilter('N3')">N3</button>
      <button onclick="setFilter('N2')">N2</button>
      <button onclick="setFilter('N1')">N1</button>
      <button onclick="setFilter('10級')">10級</button>
      <button onclick="setFilter('9級')">9級</button>
      <button onclick="setFilter('8級')">8級</button>
      <button onclick="setFilter('2級')">2級</button>
    </div>
    <div class="search-count" id="search-count"></div>
  </div>

  <div class="results-grid" id="results-grid"></div>
</main>

<!-- MODAL -->
<div class="modal-overlay" id="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal-content">
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <div class="modal-header">
      <div class="modal-kanji-big" id="modal-kanji"></div>
      <div class="modal-meta">
        <div class="modal-meaning" id="modal-meaning"></div>
        <div class="modal-levels" id="modal-levels"></div>
      </div>
    </div>
    <div class="modal-readings" id="modal-readings"></div>
    <div class="modal-vocab" id="modal-vocab"></div>
  </div>
</div>

<script>
const ALL_KANJI = ${DATA_JSON};

let currentFilter = 'all';

function toHiragana(s) {
  return s.replace(/[\\u30A1-\\u30F6]/g, c => String.fromCharCode(c.charCodeAt(0) - 96));
}

function doSearch() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  let results = ALL_KANJI;

  // Apply level filter
  if (currentFilter !== 'all') {
    results = results.filter(k => k.levels.includes(currentFilter));
  }

  // Apply text search
  if (q) {
    const hira = toHiragana(q);
    results = results.filter(k => {
      if (k.kanji.includes(q)) return true;
      if (k.meaning.toLowerCase().includes(q)) return true;
      if (k.on.some(r => r.toLowerCase().includes(q))) return true;
      if (k.kun.some(r => r.toLowerCase().includes(q))) return true;
      // Search compounds too
      if (k.compounds && k.compounds.some(c =>
        c.word.includes(q) || c.reading.includes(q) || c.meaning.toLowerCase().includes(q)
      )) return true;
      if (hira !== q) {
        if (k.on.some(r => toHiragana(r).includes(hira))) return true;
        if (k.kun.some(r => r.replace(/\\..*/,'').includes(hira))) return true;
      }
      return false;
    });
  }

  renderGrid(results);
  document.getElementById('search-count').textContent =
    results.length === ALL_KANJI.length ? ALL_KANJI.length + ' kanji total' :
    results.length + ' of ' + ALL_KANJI.length + ' kanji';
}

function renderGrid(entries) {
  const grid = document.getElementById('results-grid');
  if (entries.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-dim);padding:40px;text-align:center;grid-column:1/-1;font-size:1.2rem">No matches found</p>';
    return;
  }
  // Limit to 200 for performance
  const show = entries.slice(0, 200);
  grid.innerHTML = show.map(k => {
    const reading = k.kun.length > 0 ? k.kun[0].replace(/\\..*/,'') : (k.on[0] || '');
    return '<div class="kanji-tile" onclick="showModal(\\'' + k.kanji.replace(/'/g,"\\\\'") + '\\')">' +
      '<div class="tile-kanji">' + k.kanji + '</div>' +
      '<div class="tile-reading">' + reading + '</div>' +
      '<div class="tile-level">' + k.levels.join(' ') + '</div>' +
      '</div>';
  }).join('');
  if (entries.length > 200) {
    grid.innerHTML += '<p style="color:var(--text-dim);padding:20px;text-align:center;grid-column:1/-1">Showing 200 of ' + entries.length + '. Type more to narrow results.</p>';
  }
}

function setFilter(level) {
  currentFilter = level;
  document.querySelectorAll('.level-filters button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  doSearch();
}

function showModal(kanji) {
  const entry = ALL_KANJI.find(k => k.kanji === kanji);
  if (!entry) return;

  document.getElementById('modal-kanji').textContent = kanji;
  document.getElementById('modal-meaning').textContent = entry.meaning;
  document.getElementById('modal-levels').innerHTML = entry.levels.map(l =>
    '<span class="modal-level-tag">' + l + '</span>'
  ).join('');

  let readings = '<div class="modal-reading-box"><div class="label" style="color:#7c6fe0">On\\'yomi</div><div class="value">' + (entry.on.join('\\u3001') || '\\u2014') + '</div></div>';
  readings += '<div class="modal-reading-box"><div class="label" style="color:#e07c6f">Kun\\'yomi</div><div class="value">' + (entry.kun.join('\\u3001') || '\\u2014') + '</div></div>';
  document.getElementById('modal-readings').innerHTML = readings;

  const vocabEl = document.getElementById('modal-vocab');
  if (entry.compounds && entry.compounds.length > 0) {
    vocabEl.style.display = '';
    vocabEl.innerHTML = '<div class="label">Vocabulary</div>' +
      entry.compounds.map(c =>
        '<div class="modal-vocab-item"><span class="word">' + c.word + '</span> <span class="reading">\\uff08' + c.reading + '\\uff09</span> <span class="meaning">' + c.meaning + '</span></div>'
      ).join('');
  } else {
    vocabEl.style.display = 'none';
  }

  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

// Theme
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kentei_theme', next);
  updateThemeBtn();
}
function updateThemeBtn() {
  var btn = document.getElementById('theme-btn');
  var cur = document.documentElement.getAttribute('data-theme');
  btn.textContent = cur === 'light' ? '🌙 Dark' : '☀️ Light';
}
updateThemeBtn();

// Keyboard
document.addEventListener('keydown', e => {
  if (document.getElementById('modal-overlay').classList.contains('show') && e.key === 'Escape') closeModal();
});

// Initial render
doSearch();
</script>

</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'dictionary.html'), html);
console.log(`\nGenerated dictionary.html with ${unique.length} unique kanji`);
