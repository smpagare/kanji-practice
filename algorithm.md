# Quiz Algorithm Rules

## Quiz Flow
- Fixed progress counter: you pick 20, progress shows `X / 20` and never changes
- Progress bar fills steadily to 100% based on original count
- Wrong answers trigger retries (inserted into queue) but progress counter stays fixed

## Wrong Answer Retry System
- When you get a kanji **wrong**, it gets re-inserted 3-5 questions later
- You must get it **right 3 consecutive times** before it stops coming back
- If you get it wrong again during retries, the streak resets to 0
- Retry questions don't affect your score (only original questions count)
- Feedback shows streak: `"✓ Correct! (1/3 streak)"`, `"✓ Correct! (2/3 streak)"`, then `"🎌 Mastered!"`

## Retry Mistakes Button
- Only shown on results screen when there are actual mistakes
- Hidden when you get a perfect score (no point showing it)

## Question Types (All Directions)
| Type | Direction | Prompt |
|------|-----------|--------|
| `reading` | Kanji → Kana | この漢字の読みは？ |
| `meaning` | Kanji → English | この漢字の意味は？ |
| `kanji` | Kana + Meaning → Kanji | 「reading」（meaning）の漢字は？ |
| `eng_to_kanji` | English → Kanji | Which kanji means "X"? |
| `compound` | Compound Word → Reading | この言葉の読みは？ |

## Priority System (Pool Ordering)
- Order: **struggling → learning → unseen → mastered (20% sample)**
- Mastered kanji: only ~20% randomly included each round (cooldown)
- Enable/disable via settings (`priority: yes | no`)

## Verify Mode (from Review Screen)
- "Verify All Seen Kanji" button on the review screen
- Tests ALL non-unseen kanji (no count limit)
- Uses mixed question types + verification round afterward
- Full retry-until-3-correct system applies

## Mastery Thresholds
- **Mastered**: `wrong === 0 && correct >= 3`
- **Struggling**: `streak === 0 || accuracy < 50%`
- **Learning**: everything in between
- **Unseen**: `seen === 0`

## Teach Card Rules
- Show for **unseen** kanji before first quiz question
- After teach dismiss: real quiz question appears 3-5 questions later
- Teach card shows: On'yomi, Kun'yomi, Meaning, Compounds

## Quiz Settings (User-configurable)
| Setting | Options | Default |
|---------|---------|---------|
| Questions per round | 10, 20, 40, All | 20 |
| Question types | Mixed, Reading, Meaning, Kanji, Eng→Kanji, Compound | Mixed |
| Prioritize weak kanji | Yes, No | Yes |

## Number of Options
- **6** answer options per question (1 correct + 5 distractors)

## Feedback Card (After Every Answer)
- Both **correct** and **wrong** answers show full kanji info card
- No duplicate kanji display in the card
- Card shows: ON reading, KUN reading, Meaning, Vocabulary (min 5 words)
- Vocabulary: shows entry's own compounds first, then pulls additional words from other kanji in the same level that contain this character (up to 5 total)
- Bigger fonts: 1.3rem for readings/meaning/vocab, 0.85rem for labels

## Review Screen
- **Mastery progress bar**: shows `X / Y Mastered` with remaining count
- **Accuracy bar**: overall percentage across all kanji in the level
- **Status counts**: Unseen, Learning, Struggling, Mastered dot indicators
- **Verify All Seen Kanji** button to start a full verification quiz

## Verification Round (Multi-Direction Testing)
- After main quiz ends, ALL kanji from the session are retested in a **different direction**
- System tracks which question types were used per kanji during the main round
- Verification picks an unused type (e.g., if tested as `reading`, verify as `meaning` or `eng_to_kanji`)
- If all types were already used, picks a random type
- Verification questions don't affect the main score
- Wrong answers in verification still trigger retry-until-3-correct
- Progress shows `Verify X / Y` with separate counter
- Label shows `🔄 Verify: [type]` to distinguish from main round
- Results subtitle shows main score + verification count

## Radical Quiz (Different Engine)
- Uses 3 question types: `rad2meaning`, `kanji2rad`, `meaning2kanji`
- Same retry-until-3-correct system
- Same fixed progress counter
- Same verification round system (retests in different direction after main quiz)
