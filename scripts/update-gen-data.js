#!/usr/bin/env node
// Updates the DATA arrays in gen-n2.js and gen-n1.js from the current filled HTML files
// Run this after fill-vocab to bake the 5-vocab data into the generators

const fs = require('fs');
const path = require('path');

function extractKanjiData(htmlFile) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const m = html.match(/const KANJI\s*=\s*\[/);
  if (!m) throw new Error('No KANJI found in ' + htmlFile);
  const si = m.index + m[0].length - 1;
  let depth = 1, ei = si + 1;
  while (depth > 0 && ei < html.length) {
    if (html[ei] === '[') depth++;
    if (html[ei] === ']') depth--;
    ei++;
  }
  const arrStr = html.substring(si, ei);
  const K = eval(arrStr);
  return K;
}

function toCompactData(kanji) {
  return kanji.map(k => {
    const on = (k.on || []).join(',');
    const kun = (k.kun || []).join(',');
    const compounds = (k.compounds || []).map(c => [c.word, c.reading, c.meaning]);
    const antonym = k.antonym || '';
    return JSON.stringify([k.kanji, on, kun, k.meaning, compounds, antonym]);
  });
}

function updateGenFile(genFile, htmlFile) {
  const kanji = extractKanjiData(htmlFile);
  const compact = toCompactData(kanji);

  let gen = fs.readFileSync(genFile, 'utf8');
  const dataStart = gen.indexOf('const DATA = [');
  const dataLineEnd = gen.indexOf('];\n', dataStart);
  // Find the end of DATA array - bracket counting
  let depth = 0, ei = dataStart;
  while (ei < gen.length) {
    if (gen[ei] === '[') depth++;
    if (gen[ei] === ']') { depth--; if (depth === 0) { ei++; break; } }
    ei++;
  }
  // Skip the semicolon
  while (ei < gen.length && gen[ei] !== ';') ei++;
  ei++;

  const newData = 'const DATA = [\n' + compact.join(',\n') + '\n];';
  gen = gen.substring(0, dataStart) + newData + gen.substring(ei);

  fs.writeFileSync(genFile, gen);
  console.log(`Updated ${genFile}: ${kanji.length} kanji with vocab baked in`);
}

updateGenFile('jlpt/gen-n2.js', 'jlpt/n2.html');
updateGenFile('jlpt/gen-n1.js', 'jlpt/n1.html');
