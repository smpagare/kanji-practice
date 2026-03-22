#!/usr/bin/env node
// Generate kentei/level-9.html by copying level-10.html structure and scraping kanji data
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

// All 160 Level 9 (2nd grade) kanji
const LEVEL9_KANJI = [
  '引','羽','雲','園','遠','何','科','夏','家','歌','画','回','会','海','絵','外','角','楽','活','間',
  '丸','岩','顔','汽','記','帰','弓','牛','魚','京','強','教','近','兄','形','計','元','言','原','戸',
  '古','午','後','語','工','公','広','交','光','考',
  '行','高','黄','合','谷','国','黒','今','才','細','作','算','止','市','矢','姉','思','紙','寺','自',
  '時','室','社','弱','首','秋','週','春','書','少','場','色','食','心','新','親','図','数','西','声',
  '星','晴','切','雪','船','線','前','組','走','多',
  '太','体','台','地','池','知','茶','昼','長','鳥','朝','直','通','弟','店','点','電','刀','冬','当',
  '東','答','頭','同','道','読','内','南','肉','馬','売','買','麦','半','番','父','風','分','聞','米',
  '歩','母','方','北','毎','妹','万','明','鳴','毛',
  '門','夜','野','友','用','曜','来','里','理','話'
];

console.log(`Level 9: ${LEVEL9_KANJI.length} kanji to process`);

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

function parseKanjiPage(html) {
  const result = { on: [], kun: [], meaning: '' };

  // Extract meaning from title or header
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    const parts = titleMatch[1].split('-');
    if (parts.length > 1) result.meaning = parts[parts.length - 1].trim().replace(/ \|.*/, '');
  }

  // Extract readings from the character info section
  // On'yomi - usually in katakana
  const onMatch = html.match(/On'yomi[^<]*<[^>]*>([^<]+)/i) || html.match(/音読み[^<]*<[^>]*>([^<]+)/i);
  if (onMatch) {
    result.on = onMatch[1].split(/[,、\s]+/).map(s => s.trim()).filter(Boolean);
  }

  // Kun'yomi - usually in hiragana
  const kunMatch = html.match(/Kun'yomi[^<]*<[^>]*>([^<]+)/i) || html.match(/訓読み[^<]*<[^>]*>([^<]+)/i);
  if (kunMatch) {
    result.kun = kunMatch[1].split(/[,、\s]+/).map(s => s.trim()).filter(Boolean);
  }

  // Try alternate format - look for reading sections
  if (result.on.length === 0) {
    const readingBlocks = html.match(/class="readingMeaning"[\s\S]*?<\/table>/);
    if (readingBlocks) {
      const onRows = readingBlocks[0].match(/On reading[^<]*<td>([^<]+)/i);
      if (onRows) result.on = onRows[1].split(/[,、\s]+/).map(s => s.trim()).filter(Boolean);
      const kunRows = readingBlocks[0].match(/Kun reading[^<]*<td>([^<]+)/i);
      if (kunRows) result.kun = kunRows[1].split(/[,、\s]+/).map(s => s.trim()).filter(Boolean);
      const meaningRows = readingBlocks[0].match(/Meaning[^<]*<td>([^<]+)/i);
      if (meaningRows) result.meaning = meaningRows[1].trim();
    }
  }

  return result;
}

function parseVocab(pageHtml, kanji) {
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
      if (furi && furi !== '\u3000' && furi !== ' ') {
        reading += furi;
      } else {
        reading += base;
      }
    }
    reading = reading.replace(/[\s\u3000]/g, '');

    const meaningMatch = block.match(/class="smallText">\s*([\s\S]*?)\s*<\/div>/);
    if (!meaningMatch) continue;
    let meaning = meaningMatch[1].trim()
      .replace(/<[^>]+>/g, '')
      .replace(/\u2460|\u2461|\u2462|\u2463|\u2464|\u2465|\u2466|\u2467|\u2468|\u2469/g, '; ')
      .replace(/\s+/g, ' ')
      .replace(/^;\s*/, '')
      .trim();
    meaning = meaning.split(/;\s*/)[0].trim();
    if (meaning.length > 50) meaning = meaning.substring(0, 50);

    if (word && reading && meaning && word.length <= 6) {
      results.push({ word, reading, meaning });
    }
  }
  return results;
}

// Known readings database for 2nd grade kanji (fallback)
const KNOWN_READINGS = {
  '引': { on: ['イン'], kun: ['ひ.く','ひ.ける'], meaning: 'pull' },
  '羽': { on: ['ウ'], kun: ['は','はね'], meaning: 'feathers' },
  '雲': { on: ['ウン'], kun: ['くも'], meaning: 'cloud' },
  '園': { on: ['エン'], kun: ['その'], meaning: 'garden' },
  '遠': { on: ['エン','オン'], kun: ['とお.い'], meaning: 'distant' },
  '何': { on: ['カ'], kun: ['なに','なん'], meaning: 'what' },
  '科': { on: ['カ'], kun: [], meaning: 'department' },
  '夏': { on: ['カ','ゲ'], kun: ['なつ'], meaning: 'summer' },
  '家': { on: ['カ','ケ'], kun: ['いえ','や'], meaning: 'house' },
  '歌': { on: ['カ'], kun: ['うた','うた.う'], meaning: 'song' },
  '画': { on: ['ガ','カク'], kun: [], meaning: 'picture' },
  '回': { on: ['カイ'], kun: ['まわ.る','まわ.す'], meaning: 'revolve' },
  '会': { on: ['カイ','エ'], kun: ['あ.う'], meaning: 'meet' },
  '海': { on: ['カイ'], kun: ['うみ'], meaning: 'sea' },
  '絵': { on: ['カイ','エ'], kun: [], meaning: 'picture' },
  '外': { on: ['ガイ','ゲ'], kun: ['そと','ほか','はず.す'], meaning: 'outside' },
  '角': { on: ['カク'], kun: ['かど','つの'], meaning: 'angle' },
  '楽': { on: ['ガク','ラク'], kun: ['たの.しい','たの.しむ'], meaning: 'music, enjoy' },
  '活': { on: ['カツ'], kun: [], meaning: 'lively' },
  '間': { on: ['カン','ケン'], kun: ['あいだ','ま'], meaning: 'interval' },
  '丸': { on: ['ガン'], kun: ['まる','まる.い'], meaning: 'round' },
  '岩': { on: ['ガン'], kun: ['いわ'], meaning: 'boulder' },
  '顔': { on: ['ガン'], kun: ['かお'], meaning: 'face' },
  '汽': { on: ['キ'], kun: [], meaning: 'steam' },
  '記': { on: ['キ'], kun: ['しる.す'], meaning: 'record' },
  '帰': { on: ['キ'], kun: ['かえ.る','かえ.す'], meaning: 'return' },
  '弓': { on: ['キュウ'], kun: ['ゆみ'], meaning: 'bow' },
  '牛': { on: ['ギュウ'], kun: ['うし'], meaning: 'cow' },
  '魚': { on: ['ギョ'], kun: ['うお','さかな'], meaning: 'fish' },
  '京': { on: ['キョウ','ケイ'], kun: ['みやこ'], meaning: 'capital' },
  '強': { on: ['キョウ','ゴウ'], kun: ['つよ.い','つよ.まる'], meaning: 'strong' },
  '教': { on: ['キョウ'], kun: ['おし.える','おそ.わる'], meaning: 'teach' },
  '近': { on: ['キン','コン'], kun: ['ちか.い'], meaning: 'near' },
  '兄': { on: ['ケイ','キョウ'], kun: ['あに'], meaning: 'elder brother' },
  '形': { on: ['ケイ','ギョウ'], kun: ['かたち','かた'], meaning: 'shape' },
  '計': { on: ['ケイ'], kun: ['はか.る','はか.らう'], meaning: 'plan' },
  '元': { on: ['ゲン','ガン'], kun: ['もと'], meaning: 'origin' },
  '言': { on: ['ゲン','ゴン'], kun: ['い.う','こと'], meaning: 'say' },
  '原': { on: ['ゲン'], kun: ['はら'], meaning: 'meadow' },
  '戸': { on: ['コ'], kun: ['と'], meaning: 'door' },
  '古': { on: ['コ'], kun: ['ふる.い','ふる.す'], meaning: 'old' },
  '午': { on: ['ゴ'], kun: ['うま'], meaning: 'noon' },
  '後': { on: ['ゴ','コウ'], kun: ['のち','うし.ろ','あと'], meaning: 'after' },
  '語': { on: ['ゴ'], kun: ['かた.る','かた.らう'], meaning: 'language' },
  '工': { on: ['コウ','ク'], kun: [], meaning: 'craft' },
  '公': { on: ['コウ'], kun: ['おおやけ'], meaning: 'public' },
  '広': { on: ['コウ'], kun: ['ひろ.い','ひろ.まる','ひろ.げる'], meaning: 'wide' },
  '交': { on: ['コウ'], kun: ['まじ.わる','ま.じる','か.う'], meaning: 'mix' },
  '光': { on: ['コウ'], kun: ['ひかり','ひか.る'], meaning: 'light' },
  '考': { on: ['コウ'], kun: ['かんが.える'], meaning: 'consider' },
  '行': { on: ['コウ','ギョウ','アン'], kun: ['い.く','ゆ.く','おこな.う'], meaning: 'go' },
  '高': { on: ['コウ'], kun: ['たか.い','たか.まる'], meaning: 'tall' },
  '黄': { on: ['コウ','オウ'], kun: ['き','こ'], meaning: 'yellow' },
  '合': { on: ['ゴウ','ガッ','カッ'], kun: ['あ.う','あ.わせる'], meaning: 'fit' },
  '谷': { on: ['コク'], kun: ['たに'], meaning: 'valley' },
  '国': { on: ['コク'], kun: ['くに'], meaning: 'country' },
  '黒': { on: ['コク'], kun: ['くろ','くろ.い'], meaning: 'black' },
  '今': { on: ['コン','キン'], kun: ['いま'], meaning: 'now' },
  '才': { on: ['サイ'], kun: [], meaning: 'talent' },
  '細': { on: ['サイ'], kun: ['ほそ.い','こま.かい'], meaning: 'slender' },
  '作': { on: ['サク','サ'], kun: ['つく.る'], meaning: 'make' },
  '算': { on: ['サン'], kun: [], meaning: 'calculate' },
  '止': { on: ['シ'], kun: ['と.まる','と.める'], meaning: 'stop' },
  '市': { on: ['シ'], kun: ['いち'], meaning: 'city' },
  '矢': { on: ['シ'], kun: ['や'], meaning: 'arrow' },
  '姉': { on: ['シ'], kun: ['あね'], meaning: 'elder sister' },
  '思': { on: ['シ'], kun: ['おも.う'], meaning: 'think' },
  '紙': { on: ['シ'], kun: ['かみ'], meaning: 'paper' },
  '寺': { on: ['ジ'], kun: ['てら'], meaning: 'temple' },
  '自': { on: ['ジ','シ'], kun: ['みずか.ら'], meaning: 'self' },
  '時': { on: ['ジ'], kun: ['とき'], meaning: 'time' },
  '室': { on: ['シツ'], kun: ['むろ'], meaning: 'room' },
  '社': { on: ['シャ'], kun: ['やしろ'], meaning: 'company' },
  '弱': { on: ['ジャク'], kun: ['よわ.い','よわ.まる'], meaning: 'weak' },
  '首': { on: ['シュ'], kun: ['くび'], meaning: 'neck' },
  '秋': { on: ['シュウ'], kun: ['あき'], meaning: 'autumn' },
  '週': { on: ['シュウ'], kun: [], meaning: 'week' },
  '春': { on: ['シュン'], kun: ['はる'], meaning: 'spring' },
  '書': { on: ['ショ'], kun: ['か.く'], meaning: 'write' },
  '少': { on: ['ショウ'], kun: ['すく.ない','すこ.し'], meaning: 'few' },
  '場': { on: ['ジョウ'], kun: ['ば'], meaning: 'place' },
  '色': { on: ['ショク','シキ'], kun: ['いろ'], meaning: 'color' },
  '食': { on: ['ショク','ジキ'], kun: ['た.べる','く.う'], meaning: 'eat' },
  '心': { on: ['シン'], kun: ['こころ'], meaning: 'heart' },
  '新': { on: ['シン'], kun: ['あたら.しい','あら.た','にい'], meaning: 'new' },
  '親': { on: ['シン'], kun: ['おや','した.しい'], meaning: 'parent' },
  '図': { on: ['ズ','ト'], kun: ['はか.る'], meaning: 'diagram' },
  '数': { on: ['スウ','ス'], kun: ['かず','かぞ.える'], meaning: 'number' },
  '西': { on: ['セイ','サイ'], kun: ['にし'], meaning: 'west' },
  '声': { on: ['セイ','ショウ'], kun: ['こえ'], meaning: 'voice' },
  '星': { on: ['セイ','ショウ'], kun: ['ほし'], meaning: 'star' },
  '晴': { on: ['セイ'], kun: ['は.れる','は.らす'], meaning: 'clear up' },
  '切': { on: ['セツ','サイ'], kun: ['き.る','き.れる'], meaning: 'cut' },
  '雪': { on: ['セツ'], kun: ['ゆき'], meaning: 'snow' },
  '船': { on: ['セン'], kun: ['ふね','ふな'], meaning: 'ship' },
  '線': { on: ['セン'], kun: [], meaning: 'line' },
  '前': { on: ['ゼン'], kun: ['まえ'], meaning: 'before' },
  '組': { on: ['ソ'], kun: ['く.む','くみ'], meaning: 'group' },
  '走': { on: ['ソウ'], kun: ['はし.る'], meaning: 'run' },
  '多': { on: ['タ'], kun: ['おお.い'], meaning: 'many' },
  '太': { on: ['タイ','タ'], kun: ['ふと.い','ふと.る'], meaning: 'thick' },
  '体': { on: ['タイ','テイ'], kun: ['からだ'], meaning: 'body' },
  '台': { on: ['ダイ','タイ'], kun: [], meaning: 'pedestal' },
  '地': { on: ['チ','ジ'], kun: [], meaning: 'ground' },
  '池': { on: ['チ'], kun: ['いけ'], meaning: 'pond' },
  '知': { on: ['チ'], kun: ['し.る'], meaning: 'know' },
  '茶': { on: ['チャ','サ'], kun: [], meaning: 'tea' },
  '昼': { on: ['チュウ'], kun: ['ひる'], meaning: 'daytime' },
  '長': { on: ['チョウ'], kun: ['なが.い'], meaning: 'long' },
  '鳥': { on: ['チョウ'], kun: ['とり'], meaning: 'bird' },
  '朝': { on: ['チョウ'], kun: ['あさ'], meaning: 'morning' },
  '直': { on: ['チョク','ジキ'], kun: ['ただ.ちに','なお.す','なお.る'], meaning: 'direct' },
  '通': { on: ['ツウ','ツ'], kun: ['とお.る','かよ.う'], meaning: 'pass through' },
  '弟': { on: ['テイ','ダイ','デ'], kun: ['おとうと'], meaning: 'younger brother' },
  '店': { on: ['テン'], kun: ['みせ'], meaning: 'shop' },
  '点': { on: ['テン'], kun: [], meaning: 'point' },
  '電': { on: ['デン'], kun: [], meaning: 'electricity' },
  '刀': { on: ['トウ'], kun: ['かたな'], meaning: 'sword' },
  '冬': { on: ['トウ'], kun: ['ふゆ'], meaning: 'winter' },
  '当': { on: ['トウ'], kun: ['あ.たる','あ.てる'], meaning: 'hit' },
  '東': { on: ['トウ'], kun: ['ひがし'], meaning: 'east' },
  '答': { on: ['トウ'], kun: ['こた.える','こた.え'], meaning: 'answer' },
  '頭': { on: ['トウ','ズ','ト'], kun: ['あたま','かしら'], meaning: 'head' },
  '同': { on: ['ドウ'], kun: ['おな.じ'], meaning: 'same' },
  '道': { on: ['ドウ','トウ'], kun: ['みち'], meaning: 'road' },
  '読': { on: ['ドク','トク','トウ'], kun: ['よ.む'], meaning: 'read' },
  '内': { on: ['ナイ','ダイ'], kun: ['うち'], meaning: 'inside' },
  '南': { on: ['ナン','ナ'], kun: ['みなみ'], meaning: 'south' },
  '肉': { on: ['ニク'], kun: [], meaning: 'meat' },
  '馬': { on: ['バ'], kun: ['うま','ま'], meaning: 'horse' },
  '売': { on: ['バイ'], kun: ['う.る','う.れる'], meaning: 'sell' },
  '買': { on: ['バイ'], kun: ['か.う'], meaning: 'buy' },
  '麦': { on: ['バク'], kun: ['むぎ'], meaning: 'wheat' },
  '半': { on: ['ハン'], kun: ['なか.ば'], meaning: 'half' },
  '番': { on: ['バン'], kun: [], meaning: 'number' },
  '父': { on: ['フ'], kun: ['ちち'], meaning: 'father' },
  '風': { on: ['フウ','フ'], kun: ['かぜ','かざ'], meaning: 'wind' },
  '分': { on: ['ブン','フン','ブ'], kun: ['わ.ける','わ.かる'], meaning: 'part' },
  '聞': { on: ['ブン','モン'], kun: ['き.く','き.こえる'], meaning: 'hear' },
  '米': { on: ['ベイ','マイ'], kun: ['こめ'], meaning: 'rice' },
  '歩': { on: ['ホ','ブ','フ'], kun: ['ある.く','あゆ.む'], meaning: 'walk' },
  '母': { on: ['ボ'], kun: ['はは'], meaning: 'mother' },
  '方': { on: ['ホウ'], kun: ['かた'], meaning: 'direction' },
  '北': { on: ['ホク'], kun: ['きた'], meaning: 'north' },
  '毎': { on: ['マイ'], kun: ['ごと'], meaning: 'every' },
  '妹': { on: ['マイ'], kun: ['いもうと'], meaning: 'younger sister' },
  '万': { on: ['マン','バン'], kun: ['よろず'], meaning: 'ten thousand' },
  '明': { on: ['メイ','ミョウ'], kun: ['あか.るい','あき.らか','あ.ける'], meaning: 'bright' },
  '鳴': { on: ['メイ'], kun: ['な.く','な.る','な.らす'], meaning: 'chirp' },
  '毛': { on: ['モウ'], kun: ['け'], meaning: 'fur' },
  '門': { on: ['モン'], kun: ['かど'], meaning: 'gate' },
  '夜': { on: ['ヤ'], kun: ['よ','よる'], meaning: 'night' },
  '野': { on: ['ヤ'], kun: ['の'], meaning: 'field' },
  '友': { on: ['ユウ'], kun: ['とも'], meaning: 'friend' },
  '用': { on: ['ヨウ'], kun: ['もち.いる'], meaning: 'use' },
  '曜': { on: ['ヨウ'], kun: [], meaning: 'weekday' },
  '来': { on: ['ライ'], kun: ['く.る','きた.る','きた.す'], meaning: 'come' },
  '里': { on: ['リ'], kun: ['さと'], meaning: 'village' },
  '理': { on: ['リ'], kun: [], meaning: 'reason' },
  '話': { on: ['ワ'], kun: ['はな.す','はなし'], meaning: 'talk' },
};

async function main() {
  const kanjiData = [];

  for (let i = 0; i < LEVEL9_KANJI.length; i++) {
    const k = LEVEL9_KANJI[i];
    const known = KNOWN_READINGS[k];
    if (!known) {
      console.error(`Missing readings for ${k}`);
      continue;
    }

    const entry = {
      kanji: k,
      on: known.on,
      kun: known.kun,
      meaning: known.meaning,
      compounds: [],
      grade: 2,
    };

    // Fetch compounds from kakimashou
    const encoded = encodeURIComponent(k);
    const url = `https://www.kakimashou.com/dictionary/character/${encoded}`;
    try {
      const page = await fetchPage(url);
      const vocab = parseVocab(page, k);
      entry.compounds = vocab.slice(0, 5);
      if (entry.compounds.length > 0) {
        console.log(`  ${k} (${known.meaning}): ${entry.compounds.length} compounds`);
      } else {
        console.log(`  ${k} (${known.meaning}): no compounds found`);
      }
    } catch (e) {
      console.error(`  Error fetching ${k}: ${e.message}`);
    }

    kanjiData.push(entry);

    if ((i + 1) % 50 === 0) {
      console.log(`--- Progress: ${i + 1}/${LEVEL9_KANJI.length} ---`);
    }

    await sleep(150);
  }

  console.log(`\nProcessed ${kanjiData.length} kanji`);

  // Now generate level-9.html by reading level-10.html as template
  const template = fs.readFileSync(path.join(ROOT, 'kentei', 'level-10.html'), 'utf8');

  let output = template;

  // Replace title
  output = output.replace(/漢検 10級 Practice/g, '漢検 9級 Practice');

  // Replace logo
  output = output.replace(/漢検<span>10級<\/span>/g, '漢検<span>9級</span>');

  // Replace KANJI array
  const kanjiStr = JSON.stringify(kanjiData);
  output = output.replace(/const KANJI\s*=\s*\[[\s\S]*?\];/, `const KANJI = ${kanjiStr};`);

  // Replace stats bar count
  output = output.replace(/Seen: <span class="num" id="stat-seen">0<\/span>\/80/, `Seen: <span class="num" id="stat-seen">0</span>/${kanjiData.length}`);

  // Replace storage key
  output = output.replace(/kentei10/g, 'kentei9');

  // Replace review filter count
  output = output.replace(/All \(80\)/g, `All (${kanjiData.length})`);

  fs.writeFileSync(path.join(ROOT, 'kentei', 'level-9.html'), output);
  console.log(`\nGenerated kentei/level-9.html with ${kanjiData.length} kanji`);
}

main().catch(console.error);
