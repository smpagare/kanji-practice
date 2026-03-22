#!/usr/bin/env node
// Unified generator for kentei levels
// Usage: node scripts/gen-kentei.js <level>
// Fetches readings from kanjiapi.dev, compounds from kakimashou.com
// Generates HTML from kentei/level-10.html template

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const levelArg = process.argv[2];

const VALID_LEVELS = ['7','6','5','4','3','pre-1','1'];
if (!levelArg || !VALID_LEVELS.includes(levelArg)) {
  console.error('Usage: node scripts/gen-kentei.js <7|6|5|4|3|pre-1|1>');
  process.exit(1);
}

// Grade mapping for the KANJI data entries
const LEVEL_GRADES = { '7': 4, '6': 5, '5': 6, '4': 7, '3': 8, 'pre-1': 9, '1': 10 };
// Display names for titles
const LEVEL_DISPLAY = { '7': '7級', '6': '6級', '5': '5級', '4': '4級', '3': '3級', 'pre-1': '準1級', '1': '1級' };
// Storage keys
const LEVEL_KEYS = { '7': 'kentei7', '6': 'kentei6', '5': 'kentei5', '4': 'kentei4', '3': 'kentei3', 'pre-1': 'kenteipre1', '1': 'kentei1' };
// Output filenames
const LEVEL_FILES = { '7': 'level-7', '6': 'level-6', '5': 'level-5', '4': 'level-4', '3': 'level-3', 'pre-1': 'level-pre-1', '1': 'level-1' };

// Kanji lists scraped from kakimashou.com/curricula/kentei/level-N
const KANJI_LISTS = {
  7: '愛案以衣位囲胃印英栄塩億加果貨課芽改械害街各覚完官管関観願希季紀喜旗器機議求泣救給挙漁共協鏡競極訓軍郡径型景芸欠結建健験固功好候航康告差菜最材昨札刷殺察参産散残士氏史司試児治辞失借種周祝順初松笑唱焼象照賞臣信成省清静席積折節説浅戦選然争倉巣束側続卒孫帯隊達単置仲貯兆腸低底停的典伝徒努灯堂働特得毒熱念敗梅博飯飛費必票標不夫付府副粉兵別辺変便包法望牧末満未脈民無約勇要養浴利陸良料量輪類令冷例歴連老労録',
  6: '圧移因永営衛易益液演応往桜恩可仮価河過賀快解格確額刊幹慣眼基寄規技義逆久旧居許境均禁句群経潔件券険検限現減故個護効厚耕鉱構興講混査再災妻採際在財罪雑酸賛支志枝師資飼示似識質舎謝授修述術準序招承証条状常情織職制性政勢精製税責績接設舌絶銭祖素総造像増則測属率損退貸態団断築張提程適敵統銅導徳独任燃能破犯判版比肥非備俵評貧布婦富武復複仏編弁保墓報豊防貿暴務夢迷綿輸余預容略留領',
  5: '異遺域宇映延沿我灰拡革閣割株干巻看簡危机揮貴疑吸供胸郷勤筋系敬警劇激穴絹権憲源厳己呼誤后孝皇紅降鋼刻穀骨困砂座済裁策冊蚕至私姿視詞誌磁射捨尺若樹収宗就衆従縦縮熟純処署諸除将傷障城蒸針仁垂推寸盛聖誠宣専泉洗染善奏窓創装層操蔵臓存尊宅担探誕段暖値宙忠著庁頂潮賃痛展討党糖届難乳認納脳派拝背肺俳班晩否批秘腹奮並陛閉片補暮宝訪亡忘棒枚幕密盟模訳郵優幼欲翌乱卵覧裏律臨朗論',
  4: '握扱依威為偉違維緯壱芋陰隠影鋭越援煙鉛縁汚押奥憶菓暇箇雅介戒皆壊較獲刈甘汗乾勧歓監環鑑含奇祈鬼幾輝儀戯詰却脚及丘朽巨拠距御凶叫狂況狭恐響驚仰駆屈掘繰恵傾継迎撃肩兼剣軒圏堅遣玄枯誇鼓互抗攻更恒荒香項稿豪込婚鎖彩歳載剤咲惨旨伺刺脂紫雌執芝斜煮釈寂朱狩趣需舟秀襲柔獣瞬旬巡盾召床沼称紹詳丈畳殖飾触侵振浸寝慎震薪尽陣尋吹是井姓征跡占扇鮮訴僧燥騒贈即俗耐替沢拓濁脱丹淡嘆端弾恥致遅蓄沖跳徴澄沈珍抵堤摘滴添殿吐途渡奴怒到逃倒唐桃透盗塔稲踏闘胴峠突鈍曇弐悩濃杯輩拍泊迫薄爆髪抜罰般販搬範繁盤彼疲被避尾微匹描浜敏怖浮普腐敷膚賦舞幅払噴柄壁捕舗抱峰砲忙坊肪冒傍帽凡盆慢漫妙眠矛霧娘茂猛網黙紋躍雄与誉溶腰踊謡翼雷頼絡欄離粒慮療隣涙隷齢麗暦劣烈恋露郎惑腕',
  3: '哀慰詠悦閲炎宴欧殴乙卸穏佳架華嫁餓怪悔塊慨該概郭隔穫岳掛滑肝冠勘貫喚換敢緩企岐忌軌既棋棄騎欺犠菊吉喫虐虚峡脅凝斤緊愚偶遇刑契啓掲携憩鶏鯨倹賢幻孤弧雇顧娯悟孔巧甲坑拘郊控慌硬絞綱酵克獄恨紺魂墾債催削搾錯撮擦暫祉施諮侍慈軸疾湿赦邪殊寿潤遵如徐匠昇掌晶焦衝鐘冗嬢錠譲嘱辱伸辛審炊粋衰酔遂穂随髄瀬牲婿請斥隻惜籍摂潜繕阻措粗礎双桑掃葬遭憎促賊怠胎袋逮滞滝択卓託諾奪胆鍛壇稚畜窒抽鋳駐彫超聴陳鎮墜帝訂締哲斗塗凍陶痘匿篤豚尿粘婆排陪縛伐帆伴畔藩蛮卑碑泌姫漂苗赴符封伏覆紛墳癖募慕簿芳邦奉胞倣崩飽縫乏妨房某膨謀墨没翻魔埋膜又魅滅免幽誘憂揚揺擁抑裸濫吏隆了猟陵糧厘励零霊裂廉錬炉浪廊楼漏湾',
  'pre-1': '丑丞乃之乍乎也云亘亙些亥亦亨亮什仇仔伊伍伶伽佃佑佼侃侠俄俣倖倦倭倶偲傭僑僻儘儲允兇兔兜其冴凋凌凧凪凰凱函剃劃劉劫勿匙匝匡匪卜卦卯卿厭叉叛叡叢叩只叶吃吊吋吠吻吾呆呑咳哉哨哩唖啄喋喧喬喰嘉嘗嘘嘩噂噌噛噸噺嚢圃圭坐坤坦垢埜埠埴堰堵堺塘塙塵壕壬壺夙夷奄套妓妾姐姑姥姦姪姶娃娩娼婁嬉嬬嬰孜孟宋宍宏宕宥寅寓寵尖尤尭屍屑屡岨岱峨峯峻嵩嵯嶋嶺巌巳巴巷巽帖幌幡庄庇庖庚庵廏廓廚廟廠廻廿弗弘弛弼彊彦彪彬徽忽怜怯恕恢恰悉悌悶惇惚惟惣惹愈慧慾憐戊戎或戟托扮按挺挽捌捧捲捷捺掠掩掬掴掻揃揖摸摺撒撚撞撫播撰擢擾攪敦斌斐斡斧斯於旭昂昌昏晃晋晒晦智暢曙曝曳朋朔李杏杓杖杜杢杭杵杷枇柁柊柏柑柘柚柴柾栂栖栗栴桂桐桓桔桝桶梁梓梢梧梯梱梶棉棲椀椋椙椛椴椿楊楓楚楠楢楯楳榊榎榛槌槍槙槻樋樗樟樫樵樺樽橘橡橢橿檀檎檜檮櫓櫛欣欽歎此歪殆毅毘汀汐汝汲沌沓沫洛洩洲浩浬涌涜淀淋淘淳淵渚渠渥湊湘湛溌溜溢溯漉漑漕漣澗澱濠濡濤瀕瀞瀦瀧灌灘灸灼烏烹焔焚煉煤煽燈燐燕燦燭爺爾牌牒牝牟牡牢牽犀狐狗狛狸狼狽猪猷獅玖玲珂珊珪琉琢琳琵琶瑚瑛瑞瑳瓜瓢甑甜甥甫畠畢畦畷疋疏疹痔癌皐盃盈瞥矧矩砥砦砧硯硲碇碍碓碧碩磐磯礦礪祁祇祐祷禄禎禦禰禽禾禿秤秦稀稔稗稜穆穎穣穿窄窪窺竈竣竺竿笈笠笥笹筈筏筑箔箕箪箭篇篠篦簸簾籾粁粂粍粕粟粥糊糎糞糟糠紐紗紘紬絃絢綜綬綴綾緋緬縞繋繍纂纏罫翠翫翰耀而耶耽聡聯聾肇肋肱肴胡胤脆腔腿膏膿臥舘舛舜舵艮芙芥芭芹苅苑苒苓苔苧苫茄茅茜茸荊荏荻莞莫莱菅菖菟菩菰菱萄萌萩萱葎葡董葦葱葵葺蒋蒐蒔蒙蒜蒲蒼蓉蓑蓬蓮蔀蓼蔓蔚蔦蔭蕃蕉蕊蕎蕗蕨蕩蕪薗薙薩薯藁藪藷蘇蘭虻蚤蛋蛙蛛蛤蛭蛸蛾蜘蝉蝋蝕蝦蝶螺蟹蟻蠅蠣衿袈袴袷裟裡裳襖覗訊訣註詑詫誹誼諏諒諜諫諺謂謬讚豎豹貰賑賤贋赫趨跨蹄蹟躯輔輯輿轍轟轡辰辻辿迂迄迦迺逗這逢逼遁遥遼邇邑郁鄭酉酋醇醍醐醗醤釘釦釧鈷鉤鉦鉾銚鋒鋤鋪鋲鋸錆錐錨錫鍍鍔鍬鍾鎔鎗鎚鎧鏑鐙鐸鑓閃閏閤阿陀隈隼雀雁雛雫霞靖靭鞄鞍鞘鞠鞭韃韭頁頗頸顛飴餐餠饗馨馳馴駁駈駕駿騨髭魁魯鮎鮒鮪鮫鮭鯉鯖鯛鰍鰐鰭鰯鰹鰺鰻鱈鱒鱗鳩鳳鳶鴇鴎鴛鴦鴨鴫鴻鵜鵠鵡鵬鶯鷲鷹鷺鸚鹸麒麟麹麿黍黛鼎鼠龍龝',
  // Level 1 kanji loaded from file at runtime
};

// For level 1, load kanji from file (too large to inline)
if (levelArg === '1' && !KANJI_LISTS['1']) {
  const l1path = path.join(__dirname, 'kentei-data', 'level-1-kanji.txt');
  if (!fs.existsSync(l1path)) {
    console.error(`Level 1 kanji file not found: ${l1path}`);
    console.error('Run: node scripts/scrape-kanji-list.js level-1 > scripts/kentei-data/level-1-kanji.txt');
    process.exit(1);
  }
  KANJI_LISTS['1'] = fs.readFileSync(l1path, 'utf8').trim();
}

const kanjiList = [...KANJI_LISTS[levelArg]];
const grade = LEVEL_GRADES[levelArg];
const displayName = LEVEL_DISPLAY[levelArg];
const storageKey = LEVEL_KEYS[levelArg];
const outFile = LEVEL_FILES[levelArg];

console.log(`Kentei ${displayName}: ${kanjiList.length} kanji (grade ${grade})`);

// --- HTTP helpers ---

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh)' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

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

// --- Parsing ---

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

// --- Main ---

async function main() {
  const kanjiData = [];
  let readingFailures = 0;

  for (let i = 0; i < kanjiList.length; i++) {
    const k = kanjiList[i];
    const entry = { kanji: k, on: [], kun: [], meaning: '', compounds: [], grade };

    // Fetch readings from kanjiapi.dev
    const encoded = encodeURIComponent(k);
    try {
      const info = await fetchJSON(`https://kanjiapi.dev/v1/kanji/${encoded}`);
      entry.on = info.on_readings || [];
      entry.kun = info.kun_readings || [];
      entry.meaning = (info.meanings || []).slice(0, 3).join(', ');
    } catch (e) {
      readingFailures++;
      console.error(`  [WARN] readings failed for ${k}: ${e.message}`);
    }

    // Fetch compounds from kakimashou.com
    try {
      const page = await fetchPage(`https://www.kakimashou.com/dictionary/character/${encoded}`);
      const vocab = parseVocab(page);
      entry.compounds = vocab.slice(0, 5);
    } catch (e) {
      console.error(`  [WARN] compounds failed for ${k}: ${e.message}`);
    }

    kanjiData.push(entry);
    const cCount = entry.compounds.length;
    console.log(`  ${k} (${entry.meaning || '?'}): ${cCount} compounds`);

    if ((i + 1) % 50 === 0) console.log(`--- Progress: ${i + 1}/${kanjiList.length} ---`);
    await sleep(100);
  }

  console.log(`\nProcessed ${kanjiData.length} kanji (${readingFailures} reading failures)`);

  // Generate HTML from level-10.html template
  const template = fs.readFileSync(path.join(ROOT, 'kentei', 'level-10.html'), 'utf8');
  let output = template;

  // Replace title
  output = output.replace(/漢検 10級 Practice/g, `漢検 ${displayName} Practice`);

  // Replace logo
  output = output.replace(/漢検<span>10級<\/span>/g, `漢検<span>${displayName}</span>`);

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

  // Replace stats bar count
  output = output.replace(
    /Seen: <span class="num" id="stat-seen">0<\/span>\/\d+/,
    `Seen: <span class="num" id="stat-seen">0</span>/${kanjiData.length}`
  );

  // Replace storage key
  output = output.replace(/kentei10/g, storageKey);

  // Replace review filter count
  output = output.replace(/All \(\d+\)/g, `All (${kanjiData.length})`);

  const outPath = path.join(ROOT, 'kentei', `${outFile}.html`);
  fs.writeFileSync(outPath, output);
  console.log(`\nGenerated ${outPath} with ${kanjiData.length} kanji`);
}

main().catch(console.error);
