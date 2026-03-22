#!/usr/bin/env node
// Extracts COMPANION_KANJI from a filled HTML file and bakes it into the generator
// Usage: node scripts/bake-companions.js <html-file> <gen-file>

const fs = require('fs');
const htmlFile = process.argv[2];
const genFile = process.argv[3];

if (!htmlFile || !genFile) {
  console.error('Usage: node bake-companions.js <html-file> <gen-file>');
  process.exit(1);
}

const html = fs.readFileSync(htmlFile, 'utf8');
const m = html.match(/const COMPANION_KANJI\s*=\s*({[\s\S]*?});/);
if (!m) { console.log('No COMPANION_KANJI in ' + htmlFile); process.exit(0); }

const companionStr = m[1];
let gen = fs.readFileSync(genFile, 'utf8');

// Check if gen already has a COMPANION_DATA section
if (gen.includes('const COMPANION_DATA =')) {
  gen = gen.replace(/const COMPANION_DATA = [\s\S]*?;\n/, `const COMPANION_DATA = ${companionStr};\n`);
} else {
  // Add before the template read line
  const insertPoint = gen.indexOf("// Read n4.html") || gen.indexOf("const template");
  if (insertPoint > 0) {
    gen = gen.substring(0, insertPoint) + `const COMPANION_DATA = ${companionStr};\n\n` + gen.substring(insertPoint);
  }
}

// Also add code to replace COMPANION_KANJI in the output if not already there
if (!gen.includes('COMPANION_KANJI replacement')) {
  const writePoint = gen.indexOf('fs.writeFileSync');
  if (writePoint > 0) {
    const companionReplace = `
// COMPANION_KANJI replacement - bake companion data into output
const compMatch = output.match(/const COMPANION_KANJI\\s*=\\s*\\{/);
if (compMatch) {
  const csi = compMatch.index;
  let cd = 1, cei = csi + compMatch[0].length;
  while (cd > 0 && cei < output.length) { if (output[cei]==='{') cd++; if (output[cei]==='}') cd--; cei++; }
  while (cei < output.length && output[cei] !== ';') cei++;
  output = output.substring(0, csi) + 'const COMPANION_KANJI = ' + JSON.stringify(COMPANION_DATA) + ';' + output.substring(cei + 1);
}

`;
    gen = gen.substring(0, writePoint) + companionReplace + gen.substring(writePoint);
  }
}

fs.writeFileSync(genFile, gen);
console.log(`Baked companion data into ${genFile}`);
