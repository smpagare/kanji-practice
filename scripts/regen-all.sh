#!/bin/bash
# Regenerate all derived files, fill vocab, enrich companions, and rebuild dictionary
# Run this after any template change to keep everything in sync

set -e
cd "$(dirname "$0")/.."

echo "=== Regenerating derived files ==="
node jlpt/gen-n2.js
node jlpt/gen-n1.js
node scripts/gen-level9.js 2>&1 | tail -1
node scripts/gen-level8.js 2>&1 | tail -1

echo ""
echo "=== Adding scrollIntoView to levels 7-3 ==="
for f in kentei/level-7.html kentei/level-6.html kentei/level-5.html kentei/level-4.html kentei/level-3.html; do
  if ! grep -q "scrollIntoView" "$f"; then
    sed -i '' "s|document.getElementById('next-btn').className='next-btn show'; updateStatsBar();|document.getElementById('next-btn').className='next-btn show'; updateStatsBar();\n  setTimeout(()=>fb.scrollIntoView({behavior:'smooth',block:'start'}),100);|" "$f"
  fi
done

echo ""
echo "=== Filling vocab (n2) ==="
node scripts/fill-vocab.js jlpt/n2.html 2>&1 | tail -2

echo ""
echo "=== Filling vocab (n1) ==="
node scripts/fill-vocab.js jlpt/n1.html 2>&1 | tail -2

echo ""
echo "=== Enriching companions ==="
node scripts/enrich-companions.js jlpt/n2.html 2>&1 | grep -E "Found|Updated"
node scripts/enrich-companions.js jlpt/n1.html 2>&1 | grep -E "Found|Updated"
node scripts/enrich-companions.js kentei/level-9.html 2>&1 | grep -E "Found|Updated"
node scripts/enrich-companions.js kentei/level-8.html 2>&1 | grep -E "Found|Updated"

echo ""
echo "=== Regenerating dictionary ==="
node scripts/gen-dictionary.js 2>&1 | tail -1

echo ""
echo "=== Done! ==="
