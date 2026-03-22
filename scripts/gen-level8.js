#!/usr/bin/env node
// Generate kentei/level-8.html from level-10.html template + scraped data
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

// All 200 Level 8 (3rd grade) kanji
const LEVEL8_KANJI = [
  '悪','安','暗','医','委','意','育','員','院','飲','運','泳','駅','央','横',
  '屋','温','化','荷','界','開','階','寒','感','漢','館','岸','起','期','客',
  '究','急','級','宮','球','去','橋','業','曲','局','銀','区','苦','具','君',
  '係','軽','血','決','研',
  '県','庫','湖','向','幸','港','号','根','祭','皿','仕','死','使','始','指',
  '歯','詩','次','事','持','式','実','写','者','主','守','取','酒','受','州',
  '拾','終','習','集','住','重','宿','所','暑','助','昭','消','商','章','勝',
  '乗','植','申','身','神',
  '真','深','進','世','整','昔','全','相','送','想','息','速','族','他','打',
  '対','待','代','第','題','炭','短','談','着','注','柱','丁','帳','調','追',
  '定','庭','笛','鉄','転','都','度','投','豆','島','湯','登','等','動','童',
  '農','波','配','倍','箱',
  '畑','発','反','坂','板','皮','悲','美','鼻','筆','氷','表','秒','病','品',
  '負','部','服','福','物','平','返','勉','放','味','命','面','問','役','薬',
  '由','油','有','遊','予','羊','洋','葉','陽','様','落','流','旅','両','緑',
  '礼','列','練','路','和'
];

console.log(`Level 8: ${LEVEL8_KANJI.length} kanji to process`);

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
      .replace(/\u2460|\u2461|\u2462|\u2463|\u2464|\u2465|\u2466|\u2467|\u2468|\u2469/g, '; ')
      .replace(/\s+/g, ' ').replace(/^;\s*/, '').trim();
    meaning = meaning.split(/;\s*/)[0].trim();
    if (meaning.length > 50) meaning = meaning.substring(0, 50);
    if (word && reading && meaning && word.length <= 6) results.push({ word, reading, meaning });
  }
  return results;
}

const KNOWN_READINGS = {
  '悪': { on: ['アク','オ'], kun: ['わる.い'], meaning: 'bad' },
  '安': { on: ['アン'], kun: ['やす.い','やす.まる'], meaning: 'cheap, peaceful' },
  '暗': { on: ['アン'], kun: ['くら.い'], meaning: 'dark' },
  '医': { on: ['イ'], kun: [], meaning: 'doctor' },
  '委': { on: ['イ'], kun: ['ゆだ.ねる'], meaning: 'committee' },
  '意': { on: ['イ'], kun: [], meaning: 'idea' },
  '育': { on: ['イク'], kun: ['そだ.つ','そだ.てる'], meaning: 'raise' },
  '員': { on: ['イン'], kun: [], meaning: 'member' },
  '院': { on: ['イン'], kun: [], meaning: 'institution' },
  '飲': { on: ['イン'], kun: ['の.む'], meaning: 'drink' },
  '運': { on: ['ウン'], kun: ['はこ.ぶ'], meaning: 'carry, luck' },
  '泳': { on: ['エイ'], kun: ['およ.ぐ'], meaning: 'swim' },
  '駅': { on: ['エキ'], kun: [], meaning: 'station' },
  '央': { on: ['オウ'], kun: [], meaning: 'center' },
  '横': { on: ['オウ'], kun: ['よこ'], meaning: 'sideways' },
  '屋': { on: ['オク'], kun: ['や'], meaning: 'roof, shop' },
  '温': { on: ['オン'], kun: ['あたた.かい','あたた.める'], meaning: 'warm' },
  '化': { on: ['カ','ケ'], kun: ['ば.ける','ば.かす'], meaning: 'change' },
  '荷': { on: ['カ'], kun: ['に'], meaning: 'luggage' },
  '界': { on: ['カイ'], kun: [], meaning: 'world' },
  '開': { on: ['カイ'], kun: ['ひら.く','あ.く','あ.ける'], meaning: 'open' },
  '階': { on: ['カイ'], kun: [], meaning: 'floor, story' },
  '寒': { on: ['カン'], kun: ['さむ.い'], meaning: 'cold' },
  '感': { on: ['カン'], kun: [], meaning: 'feeling' },
  '漢': { on: ['カン'], kun: [], meaning: 'China, kanji' },
  '館': { on: ['カン'], kun: ['やかた'], meaning: 'building' },
  '岸': { on: ['ガン'], kun: ['きし'], meaning: 'shore' },
  '起': { on: ['キ'], kun: ['お.きる','お.こる','お.こす'], meaning: 'wake up' },
  '期': { on: ['キ','ゴ'], kun: [], meaning: 'period' },
  '客': { on: ['キャク','カク'], kun: [], meaning: 'guest' },
  '究': { on: ['キュウ'], kun: ['きわ.める'], meaning: 'research' },
  '急': { on: ['キュウ'], kun: ['いそ.ぐ'], meaning: 'hurry' },
  '級': { on: ['キュウ'], kun: [], meaning: 'class, rank' },
  '宮': { on: ['キュウ','グウ','ク'], kun: ['みや'], meaning: 'palace' },
  '球': { on: ['キュウ'], kun: ['たま'], meaning: 'ball' },
  '去': { on: ['キョ','コ'], kun: ['さ.る'], meaning: 'leave, past' },
  '橋': { on: ['キョウ'], kun: ['はし'], meaning: 'bridge' },
  '業': { on: ['ギョウ','ゴウ'], kun: ['わざ'], meaning: 'business' },
  '曲': { on: ['キョク'], kun: ['ま.がる','ま.げる'], meaning: 'bend, music' },
  '局': { on: ['キョク'], kun: [], meaning: 'bureau' },
  '銀': { on: ['ギン'], kun: [], meaning: 'silver' },
  '区': { on: ['ク'], kun: [], meaning: 'ward' },
  '苦': { on: ['ク'], kun: ['くる.しい','にが.い'], meaning: 'suffering' },
  '具': { on: ['グ'], kun: [], meaning: 'tool' },
  '君': { on: ['クン'], kun: ['きみ'], meaning: 'you, lord' },
  '係': { on: ['ケイ'], kun: ['かか.る','かかり'], meaning: 'person in charge' },
  '軽': { on: ['ケイ'], kun: ['かる.い'], meaning: 'light' },
  '血': { on: ['ケツ'], kun: ['ち'], meaning: 'blood' },
  '決': { on: ['ケツ'], kun: ['き.める','き.まる'], meaning: 'decide' },
  '研': { on: ['ケン'], kun: ['と.ぐ'], meaning: 'sharpen, study' },
  '県': { on: ['ケン'], kun: [], meaning: 'prefecture' },
  '庫': { on: ['コ','ク'], kun: ['くら'], meaning: 'storehouse' },
  '湖': { on: ['コ'], kun: ['みずうみ'], meaning: 'lake' },
  '向': { on: ['コウ'], kun: ['む.く','む.ける','む.かう'], meaning: 'face, turn toward' },
  '幸': { on: ['コウ'], kun: ['さいわ.い','しあわ.せ'], meaning: 'happiness' },
  '港': { on: ['コウ'], kun: ['みなと'], meaning: 'harbor' },
  '号': { on: ['ゴウ'], kun: [], meaning: 'number' },
  '根': { on: ['コン'], kun: ['ね'], meaning: 'root' },
  '祭': { on: ['サイ'], kun: ['まつ.り','まつ.る'], meaning: 'festival' },
  '皿': { on: [], kun: ['さら'], meaning: 'dish' },
  '仕': { on: ['シ','ジ'], kun: ['つか.える'], meaning: 'serve' },
  '死': { on: ['シ'], kun: ['し.ぬ'], meaning: 'death' },
  '使': { on: ['シ'], kun: ['つか.う'], meaning: 'use' },
  '始': { on: ['シ'], kun: ['はじ.める','はじ.まる'], meaning: 'begin' },
  '指': { on: ['シ'], kun: ['ゆび','さ.す'], meaning: 'finger, point' },
  '歯': { on: ['シ'], kun: ['は'], meaning: 'tooth' },
  '詩': { on: ['シ'], kun: [], meaning: 'poem' },
  '次': { on: ['ジ','シ'], kun: ['つ.ぐ','つぎ'], meaning: 'next' },
  '事': { on: ['ジ','ズ'], kun: ['こと'], meaning: 'thing, matter' },
  '持': { on: ['ジ'], kun: ['も.つ'], meaning: 'hold' },
  '式': { on: ['シキ'], kun: [], meaning: 'ceremony, formula' },
  '実': { on: ['ジツ'], kun: ['み','みの.る'], meaning: 'truth, fruit' },
  '写': { on: ['シャ'], kun: ['うつ.す','うつ.る'], meaning: 'copy, photograph' },
  '者': { on: ['シャ'], kun: ['もの'], meaning: 'person' },
  '主': { on: ['シュ','ス'], kun: ['ぬし','おも'], meaning: 'master, main' },
  '守': { on: ['シュ','ス'], kun: ['まも.る','もり'], meaning: 'protect' },
  '取': { on: ['シュ'], kun: ['と.る'], meaning: 'take' },
  '酒': { on: ['シュ'], kun: ['さけ','さか'], meaning: 'alcohol' },
  '受': { on: ['ジュ'], kun: ['う.ける','う.かる'], meaning: 'receive' },
  '州': { on: ['シュウ'], kun: ['す'], meaning: 'state' },
  '拾': { on: ['シュウ','ジュウ'], kun: ['ひろ.う'], meaning: 'pick up' },
  '終': { on: ['シュウ'], kun: ['お.わる','お.える'], meaning: 'end' },
  '習': { on: ['シュウ'], kun: ['なら.う'], meaning: 'learn' },
  '集': { on: ['シュウ'], kun: ['あつ.まる','あつ.める'], meaning: 'gather' },
  '住': { on: ['ジュウ'], kun: ['す.む','す.まう'], meaning: 'live, dwell' },
  '重': { on: ['ジュウ','チョウ'], kun: ['おも.い','かさ.ねる','え'], meaning: 'heavy' },
  '宿': { on: ['シュク'], kun: ['やど','やど.る'], meaning: 'inn' },
  '所': { on: ['ショ'], kun: ['ところ'], meaning: 'place' },
  '暑': { on: ['ショ'], kun: ['あつ.い'], meaning: 'hot' },
  '助': { on: ['ジョ'], kun: ['たす.ける','たす.かる','すけ'], meaning: 'help' },
  '昭': { on: ['ショウ'], kun: [], meaning: 'shining' },
  '消': { on: ['ショウ'], kun: ['き.える','け.す'], meaning: 'extinguish' },
  '商': { on: ['ショウ'], kun: ['あきな.う'], meaning: 'commerce' },
  '章': { on: ['ショウ'], kun: [], meaning: 'chapter' },
  '勝': { on: ['ショウ'], kun: ['か.つ','まさ.る'], meaning: 'win' },
  '乗': { on: ['ジョウ'], kun: ['の.る','の.せる'], meaning: 'ride' },
  '植': { on: ['ショク'], kun: ['う.える'], meaning: 'plant' },
  '申': { on: ['シン'], kun: ['もう.す'], meaning: 'say, apply' },
  '身': { on: ['シン'], kun: ['み'], meaning: 'body' },
  '神': { on: ['シン','ジン'], kun: ['かみ','かん'], meaning: 'god' },
  '真': { on: ['シン'], kun: ['ま','まこと'], meaning: 'true' },
  '深': { on: ['シン'], kun: ['ふか.い','ふか.まる'], meaning: 'deep' },
  '進': { on: ['シン'], kun: ['すす.む','すす.める'], meaning: 'advance' },
  '世': { on: ['セイ','セ'], kun: ['よ'], meaning: 'world, generation' },
  '整': { on: ['セイ'], kun: ['ととの.える','ととの.う'], meaning: 'organize' },
  '昔': { on: ['セキ','シャク'], kun: ['むかし'], meaning: 'long ago' },
  '全': { on: ['ゼン'], kun: ['まった.く','すべ.て'], meaning: 'all' },
  '相': { on: ['ソウ','ショウ'], kun: ['あい'], meaning: 'mutual' },
  '送': { on: ['ソウ'], kun: ['おく.る'], meaning: 'send' },
  '想': { on: ['ソウ','ソ'], kun: [], meaning: 'concept' },
  '息': { on: ['ソク'], kun: ['いき'], meaning: 'breath, son' },
  '速': { on: ['ソク'], kun: ['はや.い','はや.める','すみ.やか'], meaning: 'fast' },
  '族': { on: ['ゾク'], kun: [], meaning: 'tribe, family' },
  '他': { on: ['タ'], kun: ['ほか'], meaning: 'other' },
  '打': { on: ['ダ'], kun: ['う.つ'], meaning: 'hit' },
  '対': { on: ['タイ','ツイ'], kun: [], meaning: 'opposite' },
  '待': { on: ['タイ'], kun: ['ま.つ'], meaning: 'wait' },
  '代': { on: ['ダイ','タイ'], kun: ['か.わる','か.える','よ','しろ'], meaning: 'substitute, age' },
  '第': { on: ['ダイ'], kun: [], meaning: 'ordinal prefix' },
  '題': { on: ['ダイ'], kun: [], meaning: 'topic' },
  '炭': { on: ['タン'], kun: ['すみ'], meaning: 'charcoal' },
  '短': { on: ['タン'], kun: ['みじか.い'], meaning: 'short' },
  '談': { on: ['ダン'], kun: [], meaning: 'talk' },
  '着': { on: ['チャク','ジャク'], kun: ['き.る','つ.く','つ.ける'], meaning: 'wear, arrive' },
  '注': { on: ['チュウ'], kun: ['そそ.ぐ'], meaning: 'pour, note' },
  '柱': { on: ['チュウ'], kun: ['はしら'], meaning: 'pillar' },
  '丁': { on: ['チョウ','テイ'], kun: [], meaning: 'counter, block' },
  '帳': { on: ['チョウ'], kun: [], meaning: 'notebook' },
  '調': { on: ['チョウ'], kun: ['しら.べる','ととの.う','ととの.える'], meaning: 'investigate, tune' },
  '追': { on: ['ツイ'], kun: ['お.う'], meaning: 'chase' },
  '定': { on: ['テイ','ジョウ'], kun: ['さだ.める','さだ.まる'], meaning: 'fix, establish' },
  '庭': { on: ['テイ'], kun: ['にわ'], meaning: 'garden' },
  '笛': { on: ['テキ'], kun: ['ふえ'], meaning: 'flute' },
  '鉄': { on: ['テツ'], kun: [], meaning: 'iron' },
  '転': { on: ['テン'], kun: ['ころ.がる','ころ.げる','ころ.ぶ'], meaning: 'revolve, turn' },
  '都': { on: ['ト','ツ'], kun: ['みやこ'], meaning: 'capital' },
  '度': { on: ['ド','タク'], kun: ['たび'], meaning: 'degree, times' },
  '投': { on: ['トウ'], kun: ['な.げる'], meaning: 'throw' },
  '豆': { on: ['トウ','ズ'], kun: ['まめ'], meaning: 'bean' },
  '島': { on: ['トウ'], kun: ['しま'], meaning: 'island' },
  '湯': { on: ['トウ'], kun: ['ゆ'], meaning: 'hot water' },
  '登': { on: ['トウ','ト'], kun: ['のぼ.る'], meaning: 'climb' },
  '等': { on: ['トウ'], kun: ['ひと.しい'], meaning: 'equal, class' },
  '動': { on: ['ドウ'], kun: ['うご.く','うご.かす'], meaning: 'move' },
  '童': { on: ['ドウ'], kun: ['わらべ'], meaning: 'child' },
  '農': { on: ['ノウ'], kun: [], meaning: 'agriculture' },
  '波': { on: ['ハ'], kun: ['なみ'], meaning: 'wave' },
  '配': { on: ['ハイ'], kun: ['くば.る'], meaning: 'distribute' },
  '倍': { on: ['バイ'], kun: [], meaning: 'double' },
  '箱': { on: ['ソウ'], kun: ['はこ'], meaning: 'box' },
  '畑': { on: [], kun: ['はたけ','はた'], meaning: 'field' },
  '発': { on: ['ハツ','ホツ'], kun: [], meaning: 'depart, emit' },
  '反': { on: ['ハン','ホン','タン'], kun: ['そ.る','そ.らす'], meaning: 'anti-, reverse' },
  '坂': { on: ['ハン'], kun: ['さか'], meaning: 'slope' },
  '板': { on: ['ハン','バン'], kun: ['いた'], meaning: 'board' },
  '皮': { on: ['ヒ'], kun: ['かわ'], meaning: 'skin' },
  '悲': { on: ['ヒ'], kun: ['かな.しい','かな.しむ'], meaning: 'sad' },
  '美': { on: ['ビ'], kun: ['うつく.しい'], meaning: 'beautiful' },
  '鼻': { on: ['ビ'], kun: ['はな'], meaning: 'nose' },
  '筆': { on: ['ヒツ'], kun: ['ふで'], meaning: 'brush' },
  '氷': { on: ['ヒョウ'], kun: ['こおり','ひ'], meaning: 'ice' },
  '表': { on: ['ヒョウ'], kun: ['おもて','あらわ.す','あらわ.れる'], meaning: 'surface, express' },
  '秒': { on: ['ビョウ'], kun: [], meaning: 'second' },
  '病': { on: ['ビョウ','ヘイ'], kun: ['や.む','やまい'], meaning: 'illness' },
  '品': { on: ['ヒン'], kun: ['しな'], meaning: 'goods' },
  '負': { on: ['フ'], kun: ['ま.ける','ま.かす','お.う'], meaning: 'lose, bear' },
  '部': { on: ['ブ'], kun: [], meaning: 'part, section' },
  '服': { on: ['フク'], kun: [], meaning: 'clothes' },
  '福': { on: ['フク'], kun: [], meaning: 'fortune' },
  '物': { on: ['ブツ','モツ'], kun: ['もの'], meaning: 'thing' },
  '平': { on: ['ヘイ','ビョウ'], kun: ['たい.ら','ひら'], meaning: 'flat, peace' },
  '返': { on: ['ヘン'], kun: ['かえ.す','かえ.る'], meaning: 'return' },
  '勉': { on: ['ベン'], kun: [], meaning: 'effort' },
  '放': { on: ['ホウ'], kun: ['はな.す','はな.つ','はな.れる'], meaning: 'release' },
  '味': { on: ['ミ'], kun: ['あじ','あじ.わう'], meaning: 'taste' },
  '命': { on: ['メイ','ミョウ'], kun: ['いのち'], meaning: 'life, command' },
  '面': { on: ['メン'], kun: ['おもて','おも','つら'], meaning: 'face, surface' },
  '問': { on: ['モン'], kun: ['と.う','と.い','とん'], meaning: 'question' },
  '役': { on: ['ヤク','エキ'], kun: [], meaning: 'role, duty' },
  '薬': { on: ['ヤク'], kun: ['くすり'], meaning: 'medicine' },
  '由': { on: ['ユ','ユウ','ユイ'], kun: ['よし'], meaning: 'reason' },
  '油': { on: ['ユ'], kun: ['あぶら'], meaning: 'oil' },
  '有': { on: ['ユウ','ウ'], kun: ['あ.る'], meaning: 'have, exist' },
  '遊': { on: ['ユウ','ユ'], kun: ['あそ.ぶ'], meaning: 'play' },
  '予': { on: ['ヨ'], kun: ['あらかじ.め'], meaning: 'beforehand' },
  '羊': { on: ['ヨウ'], kun: ['ひつじ'], meaning: 'sheep' },
  '洋': { on: ['ヨウ'], kun: [], meaning: 'ocean, Western' },
  '葉': { on: ['ヨウ'], kun: ['は'], meaning: 'leaf' },
  '陽': { on: ['ヨウ'], kun: ['ひ'], meaning: 'sun, positive' },
  '様': { on: ['ヨウ'], kun: ['さま'], meaning: 'manner, Mr./Ms.' },
  '落': { on: ['ラク'], kun: ['お.ちる','お.とす'], meaning: 'fall' },
  '流': { on: ['リュウ','ル'], kun: ['なが.れる','なが.す'], meaning: 'flow' },
  '旅': { on: ['リョ'], kun: ['たび'], meaning: 'travel' },
  '両': { on: ['リョウ'], kun: [], meaning: 'both' },
  '緑': { on: ['リョク','ロク'], kun: ['みどり'], meaning: 'green' },
  '礼': { on: ['レイ','ライ'], kun: [], meaning: 'manners, bow' },
  '列': { on: ['レツ'], kun: [], meaning: 'row, line' },
  '練': { on: ['レン'], kun: ['ね.る'], meaning: 'practice' },
  '路': { on: ['ロ'], kun: ['じ','みち'], meaning: 'road' },
  '和': { on: ['ワ','オ'], kun: ['やわ.らぐ','なご.む'], meaning: 'harmony, Japan' },
};

async function main() {
  const kanjiData = [];

  for (let i = 0; i < LEVEL8_KANJI.length; i++) {
    const k = LEVEL8_KANJI[i];
    const known = KNOWN_READINGS[k];
    if (!known) { console.error(`Missing readings for ${k}`); continue; }

    const entry = {
      kanji: k, on: known.on, kun: known.kun,
      meaning: known.meaning, compounds: [], grade: 3,
    };

    const encoded = encodeURIComponent(k);
    const url = `https://www.kakimashou.com/dictionary/character/${encoded}`;
    try {
      const page = await fetchPage(url);
      const vocab = parseVocab(page);
      entry.compounds = vocab.slice(0, 5);
      console.log(`  ${k} (${known.meaning}): ${entry.compounds.length} compounds`);
    } catch (e) {
      console.error(`  Error fetching ${k}: ${e.message}`);
    }

    kanjiData.push(entry);
    if ((i + 1) % 50 === 0) console.log(`--- Progress: ${i + 1}/${LEVEL8_KANJI.length} ---`);
    await sleep(150);
  }

  console.log(`\nProcessed ${kanjiData.length} kanji`);

  // Generate level-8.html from level-10.html template
  const template = fs.readFileSync(path.join(ROOT, 'kentei', 'level-10.html'), 'utf8');
  let output = template;

  output = output.replace(/漢検 10級 Practice/g, '漢検 8級 Practice');
  output = output.replace(/漢検<span>10級<\/span>/g, '漢検<span>8級</span>');

  // Replace KANJI array using bracket counting
  const kanjiStr = JSON.stringify(kanjiData);
  const sm = output.match(/const KANJI\s*=\s*\[/);
  if (sm) {
    const si = sm.index;
    const bi = si + sm[0].length - 1;
    let depth = 1, ei = bi + 1;
    while (depth > 0 && ei < output.length) {
      if (output[ei] === '[') depth++;
      else if (output[ei] === ']') depth--;
      ei++;
    }
    while (ei < output.length && output[ei] !== ';') ei++;
    output = output.substring(0, si) + `const KANJI = ${kanjiStr};` + output.substring(ei + 1);
  }

  output = output.replace(/Seen: <span class="num" id="stat-seen">0<\/span>\/80/,
    `Seen: <span class="num" id="stat-seen">0</span>/${kanjiData.length}`);
  output = output.replace(/kentei10/g, 'kentei8');
  output = output.replace(/All \(80\)/g, `All (${kanjiData.length})`);

  fs.writeFileSync(path.join(ROOT, 'kentei', 'level-8.html'), output);
  console.log(`\nGenerated kentei/level-8.html with ${kanjiData.length} kanji`);
}

main().catch(console.error);
