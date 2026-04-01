# Kanji Practice PWA — Complete Project Reference

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [File Structure](#2-file-structure)
3. [Design System](#3-design-system)
4. [Typography & Fonts](#4-typography--fonts)
5. [Index Page Layout](#5-index-page-layout)
6. [SRS Algorithm](#6-srs-algorithm)
7. [Quiz System](#7-quiz-system)
8. [Review Page](#8-review-page)
9. [Custom Quiz](#9-custom-quiz)
10. [Blink Mode](#10-blink-mode)
11. [Dictionary](#11-dictionary)
12. [Settings](#12-settings)
13. [Navigation & Screens](#13-navigation--screens)
14. [Data Formats](#14-data-formats)
15. [PWA Features](#15-pwa-features)
16. [Keyboard Shortcuts](#16-keyboard-shortcuts)
17. [Achievement System](#17-achievement-system)
18. [Session History (Git Log)](#18-session-history-git-log)

---

## 1. Project Overview

A Progressive Web App (PWA) for studying Japanese kanji using Spaced Repetition System (SRS). Covers:

| System | Levels | Kanji Count |
|--------|--------|-------------|
| JLPT | N5 → N1 | 79 / 166 / 367 / 367 / 1232 |
| 漢検 Kentei | 10級 → 1級 (+ 準1級) | 80 / 160 / 200 / 200 / 185 / 181 / 316 / 285 / 196 / 849 / 4103 |
| Radicals | 214 Kangxi | 193 quizzable |

**Total kanji across both systems: 3,028+ unique characters**

Each level is a self-contained HTML file — no server required. All progress stored in `localStorage`.

---

## 2. File Structure

```
/Users/sid/Desktop/Kentei/
│
├── index.html                    Main home page / level picker
├── dictionary.html               Full kanji dictionary with paste search
├── algorithm.md                  This file
├── manifest.json                 PWA manifest
├── sw.js                         Service worker (cache strategy)
│
├── icons/
│   ├── icon.svg                  Source SVG icon
│   ├── icon-192.png              PWA icon (192×192)
│   ├── icon-512.png              PWA icon (512×512)
│   └── icon-maskable-512.png     Android maskable icon
│
├── kentei/
│   ├── level-10.html             10級 — 80 kanji  (1st Grade)
│   ├── level-9.html              9級  — 160 kanji (2nd Grade)
│   ├── level-8.html              8級  — 200 kanji (3rd Grade)
│   ├── level-7.html              7級  — 200 kanji (4th Grade)
│   ├── level-6.html              6級  — 185 kanji (5th Grade)
│   ├── level-5.html              5級  — 181 kanji (6th Grade)
│   ├── level-4.html              4級  — 316 kanji (Middle School)
│   ├── level-3.html              3級  — 285 kanji (High School)
│   ├── level-2.html              2級  — 196 kanji (High School Grad)
│   ├── level-pre-1.html          準1級 — 849 kanji (University)
│   └── level-1.html              1級  — 4103 kanji (Expert)
│
├── jlpt/
│   ├── n5.html                   N5 —  79 kanji (Beginner)
│   ├── n4.html                   N4 — 166 kanji (Elementary)
│   ├── n3.html                   N3 — 367 kanji (Intermediate)
│   ├── n2.html                   N2 — 367 kanji (Upper Intermediate)
│   ├── n1.html                   N1 — 1232 kanji (Advanced)
│   ├── gen-n1.js                 Embedded N1 data (compact array format)
│   └── gen-n2.js                 Embedded N2 data (compact array format)
│
├── radicals/
│   ├── all.html                  Full radical index / quiz picker
│   ├── [001–212].html            Individual radical quiz pages
│   └── rare-combined.html        Rare radicals combined quiz
│
└── scripts/                      Build/data generation tools (not runtime)
    ├── gen-kentei.js
    ├── gen-level8.js / gen-level9.js
    ├── scrape-kanji-list.js
    ├── gen-dictionary.js
    ├── bake-companions.js
    ├── enrich-vocab.js
    └── kentei-data/              Source data directory
```

---

## 3. Design System

### CSS Custom Properties

All colors are defined as CSS variables on `:root`. Theme toggled via `data-theme="light"` on `<html>`.

#### Dark Mode (Default)
```css
--bg:         #08080f       /* very dark blue-black background */
--surface:    #111119       /* card / panel background */
--surface2:   #1a1a28       /* deeper nested panels */
--accent:     #8b7ff5       /* primary purple — buttons, highlights */
--accent-dim: #6b5fd5       /* darker purple — hover states */
--correct:    #3de88a       /* bright green — correct answers */
--wrong:      #ff5252       /* red — wrong answers */
--gold:       #ffd54f       /* yellow — stats numbers */
--text:       #e4e4f0       /* near-white body text */
--text-dim:   #8888a8       /* muted gray — captions, labels */
--border:     #2a2a40       /* subtle 1px borders */
--glow:       rgba(139,127,245,0.5)   /* purple glow on cards */
--glow-text:  rgba(228,228,240,0.25)  /* subtle text glow */

/* SRS level colors */
--srs1: #e05545   /* Apprentice  — red-orange  (4 hr)  */
--srs2: #e08a3a   /* Familiar    — orange      (1 day)  */
--srs3: #d4a017   /* Practiced   — gold        (3 days) */
--srs4: #7ab648   /* Strong      — green       (1 week) */
--srs5: #1a9f55   /* Mastered    — dark green  (2 weeks)*/
```

#### Light Mode
```css
--bg:         #f5f5f7
--surface:    #ffffff
--surface2:   #eeeef2
--accent:     #5a4ff5
--accent-dim: #4a3fd5
--correct:    #1a9f55
--wrong:      #d93025
--gold:       #d4a017
--text:       #1d1d1f
--text-dim:   #6e6e80
--border:     #d8d8e0
--glow:       transparent
--glow-text:  transparent
/* srs colors same as dark */
```

### Component Patterns

| Element | Style |
|---------|-------|
| Cards | `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 16–18px` |
| Hover | `transform: translateY(-3px)`, accent border, `box-shadow: 0 12px 32px rgba(139,127,245,0.15)` |
| Buttons | `border-radius: 8–12px`, `padding: 8px 14px`, `font-size: 0.85rem` |
| Transitions | `all 0.25s ease` (cards), `0.2s ease` (buttons/inputs) |
| Focus | `border-color: var(--accent)` |
| Disabled | `pointer-events: none` + opacity reduction |
| Overlays | `rgba(0,0,0,0.45)` backdrop + `backdrop-filter: blur(4px)` |

### Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| `≤ 700px` | Single column grids, reduced padding, hero shrinks |
| `≤ 900px` | 2-column guide grid → 1 column |

---

## 4. Typography & Fonts

### Google Fonts
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?
  family=Shippori+Mincho+B1:wght@400;500;600;700;800&
  family=Noto+Serif+JP:wght@400;500;600;700&
  display=swap">
```

### Font Stack
```css
font-family: 'Shippori Mincho B1', 'Noto Serif JP',
             'Hiragino Mincho ProN', 'Yu Mincho', serif;
```

**Shippori Mincho B1** — primary display font, used for all UI and kanji display
**Noto Serif JP** — fallback, broad Unicode coverage
**Hiragino Mincho ProN / Yu Mincho** — system fallbacks on macOS/Windows

### Type Scale

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Hero H1 | 3.8rem → 2.6rem mobile | 800 | letter-spacing: 4px |
| Hero background kanji | 22rem → 14rem mobile | 800 | opacity: 0.04 |
| Level name (cards) | 2.2rem | 800 | letter-spacing: 0.5px |
| Quiz question kanji | 10rem | 300 | large focal display |
| Answer option buttons | 4.2rem | 400 | hiragana/kanji choices |
| Feedback/modal kanji | 3rem inline, 8rem modal | — | colored accent |
| Vocab section heading | 1.5rem | 600 | |
| Section labels | 0.85rem | 600 | uppercase, letter-spacing: 2.5px |
| Body / default | 18px (index), 20px (level pages) | 400 | |
| Badge / small text | 0.7–0.75rem | 600 | |
| Footer | 0.75rem | 400 | opacity: 0.6 |

---

## 5. Index Page Layout

### Meta / PWA Config
- `lang="ja"`, `manifest.json` linked
- Theme color: `#8b7ff5`
- Apple mobile: capable + `black-translucent` status bar

### Section Order

#### 1. Header Bar
- Logo: `漢字Practice` (fixed top, blurred backdrop)
- Theme toggle button (fixed top-right): "☀️ Light" / "🌙 Dark"
  - Persists to `localStorage` key: `kentei_theme`

#### 2. Hero Section
- Background ghost kanji `漢` (22rem, 0.04 opacity, no-repeat center)
- H1: "漢字Practice" with text-shadow glow
- Subtitle: "Kanji Kentei & JLPT Prep" (1.2rem, 1.5px letter-spacing)

#### 3. Overall Stats Bar
- 4 stat boxes in a flex row:
  - Total Kanji (accent color)
  - Mastered (green `--correct`)
  - Seen (gold `--gold`)
  - Due Today (orange `--srs2`)
- Number: 2.4rem, 800 weight
- Label: 0.8rem, uppercase, 1.5px letter-spacing

#### 4. SRS Legend
- 5 colored dots + labels: Apprentice · Familiar · Practiced · Strong · Mastered
- Colors: `--srs1` through `--srs5`
- Centered flexbox, wraps on mobile

#### 5. Level Sections (JLPT + Kentei)
Each section has:
- Section label (e.g. "JLPT") with animated right-extending line
- Auto-fill grid: `repeat(auto-fill, minmax(300px, 1fr))`, gap 16px

**Level Card (`a.level-link`):**
- Padding: 24px 28px 20px
- Border-radius: 18px
- Top border gradient bar (accent → accent-dim, 3px, animates on hover)
- `.level-top`: level name (2.2rem) + badge (count + 漢字)
- `.level-desc`: short description (0.9rem, text-dim)
- `.srs-bar`: 8px multi-segment progress bar (one segment per SRS level)
- `.level-stats`: "X mastered / Y%" + optional "N Due" orange badge

#### 6. Tools Grid
- Smaller cards: `minmax(260px, 1fr)`
- Random Flashcard tool, Dictionary link

#### 7. How to Use Guide
```
.guide-section (max-width: 900px, centered)
├── .quote-card
│   ├── decorative " mark (4rem, accent, 0.3 opacity, absolute top-left)
│   ├── blockquote (1.3rem italic, 1.8 line-height)
│   └── .quote-author (0.9rem, text-dim)
└── .guide-card
    ├── h2 "How to Use" (1.5rem, accent)
    └── .guide-steps (2-col grid → 1-col mobile, gap 20px)
        └── .guide-step × 6
            ├── .step-num (32px circle, accent bg, white text, 0.85rem bold)
            └── .step-text (0.95rem, 1.6 line-height, text-dim)
```

**6 Steps:**
1. Pick a level (N5 or 10級 for beginners)
2. Quiz mode — multiple choice questions
3. Watch the card colors change as you learn
4. Come back when items are due
5. Blink mode for rapid review
6. Post-mastery challenges unlock at 100%

**SRS Color Legend** (inside guide card):
- 6 colored dots: New (gray) + 5 SRS levels

#### 8. Footer
```
漢字 Practice — Built for learners who refuse to forget.
```
- Centered, 0.75rem, letter-spacing 1px, opacity 0.6

---

## 6. SRS Algorithm

### Intervals

| Level | Name | Interval | Color |
|-------|------|----------|-------|
| 0 | New | — (always due) | `#c0c0cc` gray |
| 1 | Apprentice | 4 hours | `#e05545` red-orange |
| 2 | Familiar | 1 day | `#e08a3a` orange |
| 3 | Practiced | 3 days | `#d4a017` gold |
| 4 | Strong | 1 week | `#7ab648` green |
| 5 | Mastered | 2 weeks | `#1a9f55` dark green |

### localStorage Keys

| Key | Content |
|-----|---------|
| `kentei_theme` | `"dark"` or `"light"` |
| `kentei10` | Level 10 progress JSON |
| `kentei9` … `kentei2` | Per-level progress |
| `kenteipre1` | 準1級 progress |
| `kentei1` | 1級 progress |
| `jlpt_n5` … `jlpt_n1` | JLPT level progress |
| `rad_1` … `rad_193` | Individual radical progress |

### State Object Structure
```javascript
{
  kanjiStats: {
    "漢": {
      seen: 5,            // total encounters (study cards + quizzes)
      correct: 4,         // correct quiz answers
      wrong: 1,           // wrong quiz answers
      streak: 3,          // consecutive correct answers
      lastSeen: 171100..  // Date.now() of last encounter
      srsLevel: 3,        // 0–5
      lastPromoted: 17..  // Date.now() of last srsLevel change
    }
  },
  settings: {
    count: 20,            // questions per session (10 | 20 | 40 | 'all')
    mode: 'mixed',        // question type
    priority: 'yes'       // 'yes' | 'no' | 'sequential'
  },
  customSelection: [],    // array of kanji chars selected for custom quiz
  totalSessions: 12,      // completed quiz count
  achievements: {
    unlocked: { "first_quiz": true, "all_mastered": false, ... }
  },
  graduatedAt: null       // timestamp when 100% mastered
}
```

### Due Calculation
```javascript
isDue(stat) {
  if (!stat || stat.srsLevel === 0) return true;   // New = always due
  const interval = SRS_LEVELS[stat.srsLevel].interval;
  return Date.now() - stat.lastPromoted >= interval;
}
```

### SRS Advancement (Correct Answer)
```javascript
if (stat.srsLevel === 0 || isDue(stat)) {
  stat.srsLevel = Math.min(stat.srsLevel + 1, 5);
  stat.lastPromoted = Date.now();
}
stat.correct++;
stat.streak++;
stat.seen++;
```

### SRS Retreat (Wrong Answer)
```javascript
if (stat.srsLevel > 1) {
  stat.srsLevel--;
  stat.lastPromoted = Date.now();
}
stat.streak = 0;
stat.wrong++;
```

### Kanji Status Labels
| Status | Condition |
|--------|-----------|
| Unseen | `seen === 0` |
| Struggling | `streak === 0` OR `accuracy < 50%` |
| Learning | srsLevel 1–4, not struggling |
| Mastered | `wrong === 0 && correct >= 3 && srsLevel === 5` |

### Legacy Migration (Old Data → SRS)
When loading data without `srsLevel`:
```javascript
if (st.seen === 0)                     st.srsLevel = 0;
else if (st.wrong===0 && st.correct>=3) st.srsLevel = 5;
else if (st.correct >= 5)              st.srsLevel = 4;
else if (st.correct >= 3)              st.srsLevel = 3;
else if (st.correct >= 1)              st.srsLevel = 2;
else                                   st.srsLevel = 1;
st.lastPromoted = st.lastSeen || Date.now();
```

---

## 7. Quiz System

### Question Types

| Type | Direction | Japanese Prompt |
|------|-----------|-----------------|
| `reading` | Kanji → Kana | この漢字の読みは？ |
| `meaning` | Kanji → English | この漢字の意味は？ |
| `kanji` | Kana + Meaning → Kanji | 「reading」（meaning）の漢字は？ |
| `eng_to_kanji` | English → Kanji | Which kanji means "X"? |
| `compound` | Compound Word → Reading | この言葉の読みは？ |
| `antonym` | Antonym pairs | Special pairs mode |
| `sentence` | Sentence fill-in | Context quiz (post-mastery) |
| `compound_mastery` | Compound deep dive | Post-mastery mode |
| `confusion` | Look-alike pairs | Distinguish similar kanji |

**Answer options:** always **6** (1 correct + 5 distractors)

### Distractor Selection
```javascript
getDistractorReadings(entry, n=5)
  // Pool: on'yomi + kun'yomi from all other KANJI
  // Excludes entry's own readings

getDistractorMeanings(entry, n=5)
  // Pool: meanings from all other KANJI

getDistractorKanji(entry, n=5)
  // Pool: all other kanji characters

getDistractorCompoundReadings(comp, entry, n=5)
  // Pool: compound readings from other KANJI
  // Fallback: mutated readings if pool too small
```

### Pool Priority (when `priority: 'yes'`)
```
Order: struggling → due (by lastPromoted ASC) → unseen → mastered (20% random sample)
Pool sliced to session count (default 20)
```

### Wrong Answer Retry System
- Wrong kanji re-inserted 3–5 questions later
- Must answer correctly **3 consecutive times** to clear
- Streak tracked per session (resets to 0 on wrong)
- Retry feedback: `"✓ Correct! (1/3 streak)"` → `"✓ Correct! (2/3 streak)"` → `"🎌 Mastered!"`
- Retries do NOT count toward progress counter or score

### Progress Counter
- Fixed at session start: e.g. `0 / 20`
- Counter only advances on original questions (not retries)
- Progress bar fills to 100% based on original count only

### Teach Card (Unseen Kanji)
Shown before first quiz of any unseen kanji:
- Large kanji display
- ON reading, KUN reading, Meaning
- Up to 5 compound vocabulary words
- Dismiss: "I know this — Quiz me →" button, or Enter/Space
- Real quiz appears 3–5 questions after teach dismissal

### Feedback Card (Every Answer)
Shown after every answer (correct or wrong):

```
.feedback-card
├── left border:  green (#3de88a) if correct | red (#ff5252) if wrong
├── header: "✓ Correct!" or "✗ Wrong"  +  correct answer shown
├── Kanji breakdown (2-column for compounds):
│   ├── kanji glyph (3rem inline)
│   ├── meaning (0.9rem, accent color)
│   ├── ON: readings
│   └── KUN: readings
├── VOCABULARY section
│   ├── entry's own compounds first
│   └── other kanji in level containing this char (up to 5 total)
│       format: 漢字 （reading） meaning
└── stats box: X correct · Y wrong · Z streak
```

Font sizes in feedback: 1.3rem readings/meanings, 0.85rem labels

### Verification Round
After main quiz ends, ALL session kanji retested in a different direction:
- Tracks which types were used per kanji in main round
- Picks an unused type (e.g. main=`reading` → verify=`meaning`)
- All types used → random type
- Progress shows: `🔄 Verify X / Y`
- Wrong answers still trigger retry-until-3-correct
- Verification score shown separately in results

### Results Screen
- Main score: `X / Y correct`
- Verification count
- "Retry Mistakes" button (hidden on perfect score)
- SRS level changes summary

---

## 8. Review Page

### Stats Bar (Top)
```
Seen: X/Y   Mastered: X   Struggling: X   Streak: X   Session: X/X
```

### Review Header
- H2: "All N Kanji — LEVEL" (dynamically set per level from `KANJI.length` + logo span)
- Subtitle: "Click any kanji to see details and your stats"

### Mastery Progress
- `X / Y Mastered` text + remaining count (right-aligned)
- Full-width progress bar (accent color fill)

### Accuracy Bar
- "X% Accuracy" + `X correct / Y total answers`
- Full-width green bar

### Status Dots
```
● Unseen N  ● Learning N  ● Struggling N  ● Mastered N
```

### Achievements Strip
- 9 achievement badges displayed in a row
- Locked: shimmer effect + lock icon + hover tooltip
- Unlocked: full color + date earned

### Control Bar
```
[✓ Verify All Seen Kanji]  [🃏 Random Flashcard]  [⚡ Blink Mode]
[Search: reading, meaning, kanji...]
```

### Filter Buttons
```
All (N) | Unseen (N) | Learning (N) | Struggling (N) | Mastered (N)
```
- Active: accent background + white text, rounded pill
- Count in parentheses updates dynamically

### Kanji Grid
- `grid-template-columns: repeat(auto-fill, minmax(110px, 1fr))`, gap: 10px
- **Tile:**
  - Kanji glyph: `3.8rem`, colored by SRS level
  - Reading: `1rem` below (kun or on reading, dot-notation stripped)
  - Border: 1px colored by SRS level
  - Due glow: `box-shadow: 0 0 8px 2px [srs-color]` when due
  - Unseen: kanji color = `#c0c0cc` (gray)
  - Click → opens kanji detail modal

### Kanji Detail Modal
```
.modal-overlay (backdrop blur 0.45 opacity)
└── .modal-content (max-width: 680px, max-height: 90vh, scrollable)
    ├── × close button (top-right)
    ├── hero section:
    │   ├── large kanji (8rem, accent color)
    │   ├── meaning (1.3rem)
    │   └── status badge (Unseen/Learning/Struggling/Mastered + SRS level name)
    ├── readings (2-column grid):
    │   ├── ON box: label + readings
    │   └── KUN box: label + readings
    ├── vocabulary section:
    │   └── up to 5 words: 漢字 （reading） meaning
    └── stats box (3 columns):
        ├── X correct
        ├── Y wrong
        └── SRS Level N
```

### Verify All Seen Kanji
- Starts quiz with all non-unseen kanji in the level
- No count limit
- Full retry-until-3-correct + verification round
- Progress: `Verify X / Y`

---

## 9. Custom Quiz

### Layout
```
.custom-header
├── h2 + description
└── toolbar:
    ├── Select All / Clear buttons
    ├── Filter: All | Unseen | Learning | Struggling | Mastered
    └── "X selected / Y total" counter
```

### Kanji Grid
- Same dimensions as review grid (110px tiles)
- Selected tile: accent border + accent background tint
- Click to toggle individual tile
- Row/column batch-select (+) buttons

### Starting Custom Quiz
```javascript
startCustomQuiz() {
  const pool = KANJI.filter(k => state.customSelection.includes(k.kanji));
  // Generates questions from pool
  // Uses same quiz engine as main quiz
  // All settings (mode, priority) apply
}
```
- Start button disabled if 0 kanji selected

---

## 10. Blink Mode

Full-screen rapid flashcard overlay.

### Layout
```
.blink-overlay (fixed, full screen, --bg background)
├── header bar:
│   ├── "⚡ Blink Mode" title
│   ├── filter select: All / Seen / Unseen / Due
│   ├── speed select: 2s / 3s (default) / 5s
│   ├── ⏸ pause button
│   ├── X/Y counter
│   └── × close button
├── main content (flex row):
│   ├── left column (60%):
│   │   ├── kanji glyph (very large, accent color)
│   │   └── meaning (1.3rem, text-dim)
│   └── right column (40%):
│       ├── ON: readings
│       ├── KUN: readings
│       └── vocabulary (5 words)
└── progress dots (bottom)
```

### Controls
- Auto-advance every N seconds (2 / 3 / 5)
- Manual: ← → arrow keys or prev/next buttons
- Pause: ⏸ button or Space
- Close: × or Escape
- Filter applies at open time (builds shuffled pool)

---

## 11. Dictionary

`dictionary.html` — searchable database of all kanji across JLPT and Kentei.

### Features

1. **Search Bar** — real-time filter by:
   - Kanji character (e.g. `漢`)
   - On'yomi / Kun'yomi reading
   - English meaning

2. **Level Filters** — buttons for N5/N4/N3/N2/N1 + each Kentei level (multi-select)

3. **Paste Text Extractor**
   - Paste any Japanese text (e.g. `再撮影`)
   - Extracts all kanji characters from the text
   - Displays results in grid with readings/meanings

4. **Kanji Grid** — same visual design as review grid
   - SRS color coding (if that kanji has progress in localStorage)
   - Click tile → full detail modal

5. **Stats** — "3028 total kanji across JLPT & Kentei"

---

## 12. Settings

### Appearance
- **Theme** — Dark (Glow) / Light toggle
  - Writes `kentei_theme` to localStorage
  - Applies `data-theme` attribute to `<html>`
- **Font size** — A− / A+ buttons
  - Adjusts `--base-font-size` CSS variable
  - Shows percentage (80% / 90% / 100% / 110% / 120%)

### Quiz Settings
| Setting | Options | Default |
|---------|---------|---------|
| Questions per round | 10, 20, 40, All | 20 |
| Question type | Mixed, Reading, Meaning, Kanji, Eng→Kanji, Compound | Mixed |
| Prioritize weak kanji | Yes (smart), No (random), Sequential (in order) | Yes |

### Data Management
- Info label: "Progress saved in browser (localStorage)"
- **Reset All Progress** (danger button, red)
  - `confirm()` dialog first
  - `localStorage.removeItem(KEY)` then `location.reload()`

---

## 13. Navigation & Screens

### Sticky Nav Bar
```
[Logo: 漢検4級]    [Quiz] [Custom] [Review] [Dictionary] [Settings] [Menu]
```
- Active tab: accent background + white text
- Nav collapses on mobile (hamburger menu)

### Screen Management
```javascript
showTab(name) {
  // Hides all screens
  // Shows: `${name}-screen`
  // Updates active nav button
  // Triggers screen-specific init (e.g. renderReviewGrid on 'review')
}
```

### Screens

| Screen | ID | Trigger |
|--------|----|---------|
| Quiz | `quiz-screen` | Default on load, Quiz tab |
| Custom | `custom-screen` | Custom tab |
| Review | `review-screen` | Review tab |
| Mastery | `mastery-screen` | Auto when 100% mastered |
| Results | `results-screen` | After quiz completes |
| Settings | `settings-screen` | Settings tab |
| Dictionary | `dictionary-screen` | Dictionary tab |

### Quiz Screen Layout
```
┌─────────────────────────────────────┐
│  progress bar  [X / 20]             │
│  🔄 Verify: reading (if verify mode)│
├─────────────────┬───────────────────┤
│  Question card  │  Options grid     │
│  (large kanji + │  2 cols × 3 rows  │
│   prompt text)  │  4.2rem options   │
├─────────────────┴───────────────────┤
│  Feedback card (shown after answer) │
│  [Next →] button                    │
└─────────────────────────────────────┘
Keys: 1-6 answer · Enter/Space next
```

---

## 14. Data Formats

### KANJI Array (kentei HTML files — double-quoted JSON)
```javascript
const KANJI = [
  {
    "kanji": "映",
    "on": ["エイ"],
    "kun": ["-ば.え", "うつ.す", "うつ.る", "は.える"],
    "meaning": "projection, reflect, reflection",
    "compounds": [
      {"word": "映画",    "reading": "えいが",    "meaning": "movie"},
      {"word": "映る",    "reading": "うつる",    "meaning": "to be reflected"},
      {"word": "映像",    "reading": "えいぞう",  "meaning": "image (on a screen)"},
      {"word": "映す",    "reading": "うつす",    "meaning": "to project"},
      {"word": "映し出す","reading": "うつしだす","meaning": "to project"}
    ],
    "grade": 6
  }
]
```
- `kun` uses dot notation: `うつ.す` means root `うつ` + okurigana `す`
- Up to 5 compounds per entry
- `grade` = Japanese school grade (1–6, or 中 for middle school etc.)

### KANJI Array (JLPT N1/N2 HTML files — unquoted JS)
```javascript
const KANJI = [
  { kanji:"映", on:["エイ"], kun:["-ば.え","うつ.す","うつ.る","は.える"],
    meaning:"projection, reflect, reflection",
    compounds:[
      {word:"映画",reading:"えいが",meaning:"movie"},
      ...
    ], antonym:null },
]
```

### gen-n1.js / gen-n2.js — Compact Array Format
```javascript
// [kanji, on_csv, kun_csv, meaning, [[word,reading,meaning],...], antonym]
["映","エイ","-ば.え,うつ.す,うつ.る,は.える","projection, reflect, reflection",[
  ["映画","えいが","movie"],
  ["映る","うつる","to be reflected"],
  ["映し出す","うつしだす","to project"]
],""],
```

Plus a `COMPANION_DATA` object at the bottom:
```javascript
const COMPANION_DATA = {
  "漢": {
    "on": ["カン"],
    "kun": ["おとこ"],
    "meaning": "Chinese, Han",
    "vocab": [
      {"word":"漢字","reading":"かんじ","meaning":"kanji"},
      ...
    ]
  }
}
```

### Look-alike Groups (embedded in each level)
```javascript
{group: ["特","持","待"], hint: "special vs hold vs wait"},
```
Used by the Confusion quiz type to distinguish visually similar kanji.

---

## 15. PWA Features

### manifest.json
```json
{
  "name": "Kanji Practice",
  "short_name": "漢字",
  "description": "JLPT & Kentei Kanji Practice with SRS",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#08080f",
  "theme_color": "#8b7ff5",
  "orientation": "any",
  "icons": [
    {"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},
    {"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},
    {"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}
  ]
}
```

### Service Worker (sw.js)
- Cache name: `kanji-practice-v1`
- **Install:** pre-caches `/`, `/index.html`, `/dictionary.html`, `/manifest.json`, icons
- **Activate:** deletes old cache versions
- **Fetch strategy:**
  - HTML files: cache-first, background network update
  - Fonts/icons: network-first, cache fallback

### Mobile Meta
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#8b7ff5">
<link rel="apple-touch-icon" href="icons/icon-192.png">
```

---

## 16. Keyboard Shortcuts

### Quiz Screen
| Key | Action |
|-----|--------|
| `1` – `6` | Select answer option |
| `Enter` / `Space` | Dismiss teach card OR advance to next question |
| `Escape` | Close detail modal |

### Blink Mode
| Key | Action |
|-----|--------|
| `←` | Previous card |
| `→` | Next card |
| `Space` | Pause / Resume |
| `Escape` | Close blink overlay |

### Status bar hint (shown at bottom of quiz)
```
Keys: 1-6 answer · Enter/Space next
```

---

## 17. Achievement System

Tracked in `state.achievements.unlocked[id] = true`. Displayed as badge cards on the Review screen.

| ID | Name | Icon | Unlock Condition |
|----|------|------|-----------------|
| `first_quiz` | First Steps | 🏁 | Complete any quiz |
| `five_sessions` | Getting Started | ✏️ | 5 total sessions |
| `ten_sessions` | Dedicated | 📚 | 10 total sessions |
| `twenty_sessions` | Scholar | 🎓 | 20 total sessions |
| `all_seen` | Explorer | 🔭 | View every kanji in level |
| `half_mastered` | Halfway There | ⛰️ | Master 50% of kanji |
| `all_mastered` | Level Master | 🏯 | Master 100% (unlocks post-mastery) |
| `perfect_session` | Flawless | 💎 | Zero mistakes in one session |
| `streak_fire` | On Fire | 🔥 | 10 consecutive correct answers |
| `speed_demon` | Speed Demon | ⚡ | 3 sessions in one day |

**Locked state:** shimmer CSS animation + lock icon + hover tooltip revealing condition
**Unlocked state:** full color + date earned (DD/MM/YYYY)

---

## 18. Session History (Git Log)

```
926fe59  Fix corrupted readings with replacement characters
         - 7 words had garbled bytes (まっ◆◆ → まったく, etc.)
         - 33 occurrences fixed across 17 files

f47c987  Fix hardcoded 'All 80 Kanji — Level 10' title in all kentei review pages
         - All 10 affected levels now show correct count and 級

9704c0b  Fix compound readings in kentei and JLPT files (JSON format)
         - 2938 readings fixed in double-quoted JSON format files
         - Covered N3–N5 and all Kentei levels

466eea3  Fix compound word readings missing trailing okurigana
         - Kanji embedded in readings removed (うつ出だ → うつしだす)
         - Applied to N1/N2 + gen-n1/n2 (unquoted JS format)

2cae743  Fix compound word readings missing trailing okurigana
         - ~1320 readings corrected: じひび→じひびき, さば→さばき, etc.
         - Affected JLPT N1/N2/N4, Kentei 1級/2級/準1級, gen files

48df184  Increase level name font size from 1.8rem to 2.2rem

e56f3e0  Add how-to guide and motivational quote to index page

b7c39c8  Add Due filter button to custom quiz grid

61b1b5a  Add due glow border to custom quiz grid tiles

24c2e5b  Increase quiz option font to 4.2rem for better readability

f310abb  Increase quiz option button font from 2.8rem to 3.5rem

9c4fdbc  Dictionary: extract kanji from pasted text

18907b2  Fix 6 remaining garbled Unicode chars in readings (n1, n2, pre-1)

e907095  Locked achievements: shimmer effect, lock icon, hover hint

58b149c  Enlarge quiz option buttons: 2rem → 2.8rem font, 100px min-height

2535081  Fix 監視カメラ reading: かんしメラ → かんしカメラ

9c66b63  Full project sync: all 16 level files verified ALL OK

383f05d  Show counts on review filter buttons: Unseen (145), Learning (11), etc.

9b7083c  Enlarge teach/study card: bigger kanji (14rem), larger reading/vocab fonts

2eb6dfe  Add blink mode button to all level review screens

a66ff59  Add blink mode JS to all 10 level files

617acb3  Restore templates and add blink mode safely

13e46ab  Fix blink mode: clean rebuild across all templates

ca847b3  Fix garbled replacement characters in level-1 kanji readings

4bce6e9  Fix companion data persistence, dictionary paste search, vocab alignment

af747c9  Sync all features, fix vocab, enrich companions, add PWA

e4dfaf4  Initial commit — JLPT N5–N1, Kentei 10–1, 214 Kangxi Radicals
```

---

*Last updated: 2026-04-01*
