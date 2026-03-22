const fs = require('fs');
const path = require('path');
const DATA = require('./data.js');

// Separate: radicals with >=2 kanji get own file
// Group: radicals with 1 kanji go into combined file
const solo = DATA.filter(r => r.k.length >= 2);
const grouped = DATA.filter(r => r.k.length <= 1);

function escHtml(s) { return s.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

function buildPage(title, logoText, rads, storageKey, total) {
  const radStr = rads.map(r =>
    `{num:${r.num},rad:"${r.rad}",v:${JSON.stringify(r.v)},jp:"${r.jp}",m:"${r.m}",k:${JSON.stringify(r.k)}}`
  ).join(',\n');

  // For distractors we need ALL data
  const allKanji = DATA.flatMap(r => r.k);
  const allMeanings = [...new Set(allKanji.map(k => k.m))];
  const allChars = [...new Set(allKanji.map(k => k.c))];
  const allRadMeanings = [...new Set(DATA.map(r => r.m))];
  const allRadChars = [...new Set(DATA.map(r => r.rad))];
  const allJpNames = [...new Set(DATA.map(r => r.jp))];

  const kanjiCount = rads.reduce((sum, r) => sum + r.k.length, 0);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;500;600;700;800&display=swap">
<style>
:root{--bg:#f5f5f7;--surface:#fff;--surface2:#eeeef2;--accent:#5a4ff5;--accent-dim:#7a72f7;--correct:#1a9f55;--wrong:#d93025;--text:#1d1d1f;--text-dim:#6e6e80;--border:#d8d8e0;--gold:#d4a017}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;font-size:18px}
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}
nav .logo{font-size:1.5rem;font-weight:700;letter-spacing:-0.5px}nav .logo span{color:var(--accent)}
nav .nav-links{display:flex;gap:6px}
nav .nav-links button{background:none;border:1px solid transparent;color:var(--text-dim);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:1rem;transition:all .2s}
nav .nav-links button:hover,nav .nav-links button.active{color:var(--text);background:var(--surface2);border-color:var(--border)}
nav .nav-links button.active{border-color:var(--accent);color:var(--accent)}
.stats-bar{display:flex;gap:24px;padding:12px 24px;background:var(--surface);border-bottom:1px solid var(--border);font-size:.95rem;color:var(--text-dim);flex-wrap:wrap}
.stat-item{display:flex;align-items:center;gap:6px}.stat-item .num{color:var(--text);font-weight:600;font-size:1.15rem}
.stat-item .num.green{color:var(--correct)}.stat-item .num.red{color:var(--wrong)}.stat-item .num.gold{color:var(--gold)}
main{max-width:1400px;margin:0 auto;padding:32px 40px}
#quiz-screen{display:block}
.quiz-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;font-size:.8rem;color:var(--text-dim)}
.quiz-mode-label{background:var(--surface2);padding:4px 12px;border-radius:20px;border:1px solid var(--border)}
.quiz-progress-text{font-variant-numeric:tabular-nums}
.progress-bar{width:100%;height:4px;background:var(--surface2);border-radius:2px;margin-bottom:32px;overflow:hidden}
.progress-fill{height:100%;background:var(--accent);border-radius:2px;transition:width .4s ease}
.quiz-body{display:flex;gap:32px;align-items:stretch;margin-bottom:24px;min-height:420px}
.question-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:48px 40px;text-align:center;flex:1.2;display:flex;flex-direction:column;justify-content:center;min-height:380px}
.question-prompt{font-size:1.15rem;color:var(--text-dim);margin-bottom:20px}
.question-kanji{font-size:8rem;font-weight:300;line-height:1.1;margin-bottom:12px;font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif}
.question-context{font-size:3rem;color:var(--text);margin-bottom:12px;font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif}
.question-sub{font-size:1.4rem;color:var(--accent);margin-top:12px;font-weight:600}
.options{display:grid;grid-template-columns:1fr 1fr;gap:14px;flex:0.8;align-content:center}
.option-btn{background:var(--surface);border:2px solid var(--border);color:var(--text);padding:28px 20px;border-radius:14px;font-size:2rem;font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif;cursor:pointer;transition:all .2s;position:relative;min-height:85px;display:flex;align-items:center;justify-content:center}
.option-btn:hover:not(.disabled){border-color:var(--accent);background:var(--surface2);transform:translateY(-1px)}
.option-btn.correct{border-color:var(--correct);background:rgba(26,159,85,.1)}
.option-btn.wrong{border-color:var(--wrong);background:rgba(217,48,37,.1)}
.option-btn.disabled{pointer-events:none}
.option-btn .key-hint{position:absolute;top:6px;left:10px;font-size:.65rem;color:var(--text-dim);opacity:.5}
.feedback-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;display:none}
.feedback-card.show{display:block}.feedback-card.correct-fb{border-left:4px solid var(--correct)}.feedback-card.wrong-fb{border-left:4px solid var(--wrong)}
.feedback-header{font-weight:600;margin-bottom:12px;font-size:1.15rem}
.feedback-header.correct-text{color:var(--correct)}.feedback-header.wrong-text{color:var(--wrong)}
.feedback-detail{font-size:1.05rem;line-height:1.7;color:var(--text-dim)}.feedback-detail strong{color:var(--text)}
.feedback-detail .big{font-size:3rem;display:inline-block;margin:0 8px;vertical-align:middle;font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif}
.next-btn{width:100%;background:var(--accent);border:none;color:#fff;padding:18px;border-radius:12px;font-size:1.15rem;cursor:pointer;transition:all .2s;display:none}
.next-btn:hover{background:#5a52e0}.next-btn.show{display:block}
#review-screen{display:none}.review-header{margin-bottom:24px}.review-header h2{font-size:1.3rem;margin-bottom:4px}.review-header p{color:var(--text-dim);font-size:.85rem}
.review-accuracy-bar{margin:16px 0 20px}.review-accuracy-label{display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px}.review-accuracy-label span:first-child{color:var(--text);font-weight:600}.review-accuracy-label span:last-child{color:var(--text-dim)}.review-accuracy-track{height:10px;background:var(--surface);border-radius:5px;overflow:hidden;border:1px solid var(--border)}.review-accuracy-fill{height:100%;border-radius:5px;transition:width .4s ease}.review-status-counts{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;font-size:.8rem}.review-status-counts span{display:flex;align-items:center;gap:4px}.review-status-counts .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.review-filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.review-filters button{background:var(--surface);border:1px solid var(--border);color:var(--text-dim);padding:6px 14px;border-radius:20px;font-size:.8rem;cursor:pointer;transition:all .2s}
.review-filters button.active{background:var(--accent);border-color:var(--accent);color:#fff}
.kanji-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
.kanji-tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 12px;text-align:center;cursor:pointer;transition:all .2s;position:relative}
.kanji-tile:hover{border-color:var(--accent);transform:translateY(-2px)}
.kanji-tile .tile-kanji{font-size:2.5rem;font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif}
.kanji-tile .tile-reading{font-size:.8rem;color:var(--text-dim);margin-top:4px}
.kanji-tile .tile-kanji.unseen{color:#c0c0cc}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:200;justify-content:center;align-items:center;padding:24px}
.modal-overlay.show{display:flex}
.modal-content{background:var(--surface);border:1px solid var(--border);border-radius:16px;max-width:480px;width:100%;padding:32px;position:relative;max-height:90vh;overflow-y:auto}
.modal-close{position:absolute;top:12px;right:16px;background:none;border:none;color:var(--text-dim);font-size:1.5rem;cursor:pointer}
.modal-kanji{font-size:5rem;text-align:center;font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif;margin-bottom:16px}
.modal-info{font-size:.9rem;line-height:1.8}.modal-info dt{color:var(--text-dim);font-size:.75rem;text-transform:uppercase;letter-spacing:1px;margin-top:12px}.modal-info dd{color:var(--text)}
.modal-stats{margin-top:20px;padding-top:16px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;font-size:.8rem}
.modal-stats .ms-num{font-size:1.3rem;font-weight:700}
#results-screen{display:none;text-align:center;padding-top:40px}
.results-score{font-size:4rem;font-weight:700;margin:16px 0}
.results-score.great{color:var(--correct)}.results-score.ok{color:var(--gold)}.results-score.bad{color:var(--wrong)}
.results-subtitle{color:var(--text-dim);font-size:.95rem;margin-bottom:32px}
.results-mistakes{text-align:left;margin-bottom:32px}
.results-mistakes h3{font-size:.9rem;color:var(--text-dim);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px}
.mistake-item{display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:8px}
.mistake-item .mi-kanji{font-size:2rem;font-family:'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif;min-width:50px;text-align:center}
.mistake-item .mi-info{font-size:.85rem;color:var(--text-dim)}.mistake-item .mi-info strong{color:var(--text)}
.restart-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.restart-btns button{padding:14px 28px;border-radius:12px;font-size:.95rem;cursor:pointer;border:2px solid var(--border);background:var(--surface);color:var(--text);transition:all .2s}
.restart-btns button:hover{border-color:var(--accent)}
.restart-btns button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.restart-btns button.primary:hover{background:#5a52e0}
#settings-screen{display:none}.settings-group{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:16px}
.settings-group h3{font-size:.95rem;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.setting-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0}
.setting-row label{font-size:.9rem}
.setting-row select{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:6px;font-size:.85rem}
.danger-btn{background:rgba(217,48,37,.1);border:1px solid var(--wrong);color:var(--wrong);padding:10px 20px;border-radius:8px;cursor:pointer;font-size:.85rem;margin-top:8px}
.danger-btn:hover{background:rgba(217,48,37,.2)}
.shortcuts-hint{text-align:center;font-size:.7rem;color:var(--text-dim);opacity:.5;margin-top:12px}
@media(max-width:900px){.quiz-body{flex-direction:column;min-height:auto}.question-card{min-height:auto;padding:28px 20px}.question-kanji{font-size:6rem}.question-context{font-size:2.5rem}.options{grid-template-columns:1fr 1fr}.option-btn{font-size:1.4rem;padding:16px 12px;min-height:auto}.kanji-grid{grid-template-columns:repeat(auto-fill,minmax(70px,1fr))}nav{padding:12px 16px}main{padding:20px 16px}}
</style>
</head>
<body>
<nav><div class="logo">${logoText}</div><div class="nav-links"><button class="active" onclick="showScreen('quiz')">Quiz</button><button onclick="showScreen('review')">Review</button><button onclick="window.location.href='../dictionary.html'">Dictionary</button><button onclick="showScreen('settings')">Settings</button><button onclick="window.location.href='../index.html'">Menu</button></div></nav>
<div class="stats-bar"><div class="stat-item">Seen: <span class="num" id="stat-seen">0</span>/${kanjiCount}</div><div class="stat-item">Mastered: <span class="num green" id="stat-mastered">0</span></div><div class="stat-item">Struggling: <span class="num red" id="stat-struggling">0</span></div><div class="stat-item">Streak: <span class="num gold" id="stat-streak">0</span></div><div class="stat-item">Session: <span class="num" id="stat-session-correct">0</span>/<span class="num" id="stat-session-total">0</span></div></div>
<main>
<div id="quiz-screen"><div class="quiz-meta"><span class="quiz-mode-label" id="quiz-mode-label">Quiz</span><span class="quiz-progress-text" id="quiz-progress-text">1/20</span></div><div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div><div class="quiz-body"><div class="question-card"><div class="question-prompt" id="question-prompt"></div><div class="question-kanji" id="question-kanji"></div><div class="question-context" id="question-context"></div><div class="question-sub" id="question-sub"></div></div><div class="options" id="options"></div></div><div class="feedback-card" id="feedback-card"><div class="feedback-header" id="feedback-header"></div><div class="feedback-detail" id="feedback-detail"></div></div><button class="next-btn" id="next-btn" onclick="nextQuestion()">Next →</button><div class="shortcuts-hint">Keys: 1-4 answer · Enter/Space next</div></div>
<div id="review-screen"><div class="review-header"><h2>${title}</h2><p>Click any kanji to see details</p></div><div class="review-accuracy-bar"><div class="review-accuracy-label"><span id="review-mastery-pct">0 / ${kanjiCount} Mastered</span><span id="review-mastery-detail"></span></div><div class="review-accuracy-track"><div class="review-accuracy-fill" id="review-mastery-fill" style="width:0%"></div></div></div><div class="review-accuracy-bar" style="margin-top:8px"><div class="review-accuracy-label"><span id="review-acc-pct">0%</span><span id="review-acc-detail"></span></div><div class="review-accuracy-track"><div class="review-accuracy-fill" id="review-acc-fill" style="width:0%"></div></div></div><div class="review-status-counts" id="review-status-counts"></div><div style="margin-bottom:18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button onclick="startQuiz('verify')" style="background:var(--accent);border:none;color:#fff;padding:10px 24px;border-radius:10px;font-size:.9rem;cursor:pointer">🔄 Verify All Seen Kanji</button><input type="text" id="review-search" placeholder="Search kanji, reading, or meaning..." oninput="searchReview(this.value)" style="flex:1;min-width:200px;padding:10px 16px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:1rem;outline:none"></div><div class="review-filters"><button class="active" onclick="filterReview('all',this)">All (${kanjiCount})</button><button onclick="filterReview('unseen',this)">Unseen</button><button onclick="filterReview('learning',this)">Learning</button><button onclick="filterReview('struggling',this)">Struggling</button><button onclick="filterReview('mastered',this)">Mastered</button></div><div class="kanji-grid" id="kanji-grid"></div></div>
<div id="results-screen"><h2>Session Complete!</h2><div class="results-score" id="results-score">0%</div><div class="results-subtitle" id="results-subtitle"></div><div class="results-mistakes" id="results-mistakes"></div><div id="results-covered" style="text-align:left;margin-top:24px"></div><div class="restart-btns"><button id="retry-mistakes-btn" onclick="startQuiz('mistakes')">Retry Mistakes</button><button onclick="startQuiz('weak')">Practice Weak</button><button class="primary" onclick="startQuiz('mixed')">New Round</button></div></div>
<div id="settings-screen"><div class="settings-group"><h3>Appearance</h3><div class="setting-row"><label>Font Size</label><div style="display:flex;align-items:center;gap:12px"><button onclick="adjustFontSize(-1)" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);width:40px;height:40px;border-radius:8px;font-size:1.1rem;cursor:pointer">A-</button><span id="font-size-label" style="font-size:1.1rem;font-weight:600;min-width:50px;text-align:center">100%</span><button onclick="adjustFontSize(1)" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);width:40px;height:40px;border-radius:8px;font-size:1.1rem;cursor:pointer">A+</button></div></div></div><div class="settings-group"><h3>Quiz Settings</h3><div class="setting-row"><label>Question types</label><select id="setting-mode" onchange="saveSetting('mode',this.value)"><option value="mixed" selected>Mixed</option><option value="rad2meaning">Radical → Meaning</option><option value="kanji2rad">Kanji → Radical</option><option value="meaning2kanji">Meaning → Kanji</option></select></div><div class="setting-row"><label>Prioritize weak</label><select id="setting-priority" onchange="saveSetting('priority',this.value)"><option value="yes" selected>Yes</option><option value="no">No</option></select></div></div><div class="settings-group"><h3>Data</h3><p style="font-size:.85rem;color:var(--text-dim);margin-bottom:12px">Progress saved in localStorage.</p><button class="danger-btn" onclick="if(confirm('Reset all progress?')){localStorage.removeItem('${storageKey}');location.reload();}">Reset All Progress</button></div></div>
</main>
<div class="modal-overlay" id="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal-content"><button class="modal-close" onclick="closeModal()">×</button><div class="modal-kanji" id="modal-kanji"></div><dl class="modal-info" id="modal-info"></dl><div class="modal-stats" id="modal-stats"></div></div></div>
<script>
const RADS=[${radStr}];
const ALL_KANJI=RADS.flatMap(r=>r.k);
const TOTAL=${kanjiCount};
const ALL_MEANINGS=${JSON.stringify(allMeanings)};
const ALL_CHARS=${JSON.stringify(allChars)};
const ALL_RAD_MEANINGS=${JSON.stringify(allRadMeanings)};
const ALL_RAD_CHARS=${JSON.stringify(allRadChars)};
const ALL_JP=${JSON.stringify(allJpNames)};

let state=loadState(),quiz=null;
function defaultState(){return{s:{},settings:{count:${Math.min(kanjiCount,20)},mode:'mixed',priority:'yes'},ts:0}}
function loadState(){try{const s=JSON.parse(localStorage.getItem('${storageKey}'));if(s&&s.s)return s}catch(e){}return defaultState()}
function saveState(){localStorage.setItem('${storageKey}',JSON.stringify(state))}
function getStat(k){if(!state.s[k])state.s[k]={seen:0,correct:0,wrong:0,streak:0};return state.s[k]}
function getStatus(k){const s=getStat(k);if(s.seen===0)return'unseen';if(s.streak>=3&&s.correct/(s.correct+s.wrong)>=0.8)return'mastered';if(s.wrong>s.correct||s.streak<=0)return'struggling';return'learning'}
function getProgressColor(s){const t=s.correct+s.wrong;if(t===0)return'#c0c0cc';const p=s.correct/t;let r,g,b;if(p<=0.5){const x=p/0.5;r=217+(212-217)*x;g=48+(160-48)*x;b=37+(23-37)*x}else{const x=(p-0.5)/0.5;r=212+(26-212)*x;g=160+(159-160)*x;b=23+(85-23)*x}return'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')'}
function saveSetting(k,v){state.settings[k]=k==='count'?parseInt(v):v;saveState()}

function pickRandom(a,n){const u=[...new Set(a)],r=[],c=[...u];while(r.length<n&&c.length>0){const i=Math.floor(Math.random()*c.length);r.push(c.splice(i,1)[0])}return r}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}

function genQ(kanji,rad){
  const types=getQuestionTypes();
  const type=types[Math.floor(Math.random()*types.length)];
  if(type==='rad2meaning'){
    const a=rad.m;
    return{type:'Radical→Meaning',prompt:'What does this radical mean?',display:rad.rad,context:'',sub:'#'+rad.num+' '+rad.jp,answer:a,options:shuffle([a,...pickRandom(ALL_RAD_MEANINGS.filter(x=>x!==a),3)]),kanji:rad.rad,radNum:rad.num,fb_ok:'<span class="big">'+rad.rad+'</span> means <strong>"'+a+'"</strong> ('+rad.jp+')',fb_ng:'<span class="big">'+rad.rad+'</span> (#'+rad.num+') means: <strong>"'+a+'"</strong><br>Name: '+rad.jp}
  }
  if(type==='kanji2rad'){
    const a=rad.rad;
    return{type:'Kanji→Radical',prompt:'Which radical does <strong>'+kanji.c+'</strong> ('+kanji.m+') belong to?',display:kanji.c,context:'',sub:kanji.m,answer:a,options:shuffle([a,...pickRandom(ALL_RAD_CHARS.filter(x=>x!==a),3)]),kanji:kanji.c,radNum:rad.num,fb_ok:kanji.c+' uses radical <span class="big">'+a+'</span> (#'+rad.num+', '+rad.m+')',fb_ng:kanji.c+' belongs to radical <span class="big">'+a+'</span> (#'+rad.num+')<br>'+rad.jp+' = '+rad.m}
  }
  // meaning2kanji
  const a=kanji.c;
  return{type:'Meaning→Kanji',prompt:'Which kanji means "'+kanji.m+'"?',display:'',context:kanji.m,sub:'Radical: '+rad.rad+' (#'+rad.num+')',answer:a,options:shuffle([a,...pickRandom(ALL_CHARS.filter(x=>x!==a),3)]),kanji:kanji.c,radNum:rad.num,fb_ok:'"'+kanji.m+'" → <span class="big">'+a+'</span> (radical: '+rad.rad+')',fb_ng:'"'+kanji.m+'" is <span class="big">'+a+'</span><br>Radical: '+rad.rad+' (#'+rad.num+', '+rad.m+')'}
}
function getQuestionTypes(){const m=state.settings.mode;if(m==='mixed')return['rad2meaning','kanji2rad','meaning2kanji'];return[m]}
function genQForType(type,kanji,rad){
  if(type==='rad2meaning'){const a=rad.m;return{type:'Radical→Meaning',prompt:'What does this radical mean?',display:rad.rad,context:'',sub:'#'+rad.num+' '+rad.jp,answer:a,options:shuffle([a,...pickRandom(ALL_RAD_MEANINGS.filter(x=>x!==a),3)]),kanji:rad.rad,radNum:rad.num,fb_ok:'<span class="big">'+rad.rad+'</span> means <strong>"'+a+'"</strong> ('+rad.jp+')',fb_ng:'<span class="big">'+rad.rad+'</span> (#'+rad.num+') means: <strong>"'+a+'"</strong><br>Name: '+rad.jp}}
  if(type==='kanji2rad'){const a=rad.rad;return{type:'Kanji→Radical',prompt:'Which radical does <strong>'+kanji.c+'</strong> ('+kanji.m+') belong to?',display:kanji.c,context:'',sub:kanji.m,answer:a,options:shuffle([a,...pickRandom(ALL_RAD_CHARS.filter(x=>x!==a),3)]),kanji:kanji.c,radNum:rad.num,fb_ok:kanji.c+' uses radical <span class="big">'+a+'</span> (#'+rad.num+', '+rad.m+')',fb_ng:kanji.c+' belongs to radical <span class="big">'+a+'</span> (#'+rad.num+')<br>'+rad.jp+' = '+rad.m}}
  const a=kanji.c;return{type:'Meaning→Kanji',prompt:'Which kanji means "'+kanji.m+'"?',display:'',context:kanji.m,sub:'Radical: '+rad.rad+' (#'+rad.num+')',answer:a,options:shuffle([a,...pickRandom(ALL_CHARS.filter(x=>x!==a),3)]),kanji:kanji.c,radNum:rad.num,fb_ok:'"'+kanji.m+'" → <span class="big">'+a+'</span> (radical: '+rad.rad+')',fb_ng:'"'+kanji.m+'" is <span class="big">'+a+'</span><br>Radical: '+rad.rad+' (#'+rad.num+', '+rad.m+')'};
}

function _pick2RadTypes(qTypes){
  if(qTypes.length<2)return[qTypes[0],qTypes[0]];
  const s=shuffle([...qTypes]);return[s[0],s[1]];
}
let fontScale=parseInt(localStorage.getItem('fontScale')||'100');
function adjustFontSize(dir){
  fontScale=Math.max(80,Math.min(150,fontScale+dir*10));
  localStorage.setItem('fontScale',fontScale);
  applyFontScale();
}
function applyFontScale(){
  const r=fontScale/100;
  document.getElementById('font-size-label').textContent=fontScale+'%';
  const q=document.getElementById('quiz-screen');
  if(q){
    q.querySelectorAll('.question-kanji').forEach(e=>e.style.fontSize=(6*r)+'rem');
    q.querySelectorAll('.question-context').forEach(e=>e.style.fontSize=(2*r)+'rem');
    q.querySelectorAll('.question-prompt').forEach(e=>e.style.fontSize=(1*r)+'rem');
    q.querySelectorAll('.question-sub').forEach(e=>e.style.fontSize=(1.3*r)+'rem');
    q.querySelectorAll('.option-btn').forEach(e=>e.style.fontSize=(2*r)+'rem');
    q.querySelectorAll('.feedback-header').forEach(e=>e.style.fontSize=(1.4*r)+'rem');
    q.querySelectorAll('.feedback-detail').forEach(e=>e.style.fontSize=(1.25*r)+'rem');
  }
}
applyFontScale();

function startQuiz(mode){
  const KANJI_PER_SESSION=5;
  let pool=[];
  if(mode==='mistakes'&&quiz&&quiz.mistakes.length>0){pool=quiz.mistakes.map(m=>({k:ALL_KANJI.find(x=>x.c===m.kanji),r:RADS.find(r=>r.num===m.radNum)})).filter(x=>x.k)}
  else if(mode==='verify'){ALL_KANJI.forEach(k=>{if(getStatus(k.c)!=='unseen'){const r=RADS.find(x=>x.k.some(y=>y.c===k.c));if(r)pool.push({k,r})}});if(pool.length<3)RADS.forEach(r=>r.k.forEach(k=>pool.push({k,r})))}
  else if(mode==='weak'){ALL_KANJI.forEach(k=>{const st=getStatus(k.c);if(st==='struggling'||st==='learning'){const r=RADS.find(x=>x.k.some(y=>y.c===k.c));if(r)pool.push({k,r})}});if(pool.length<3)RADS.forEach(r=>r.k.forEach(k=>pool.push({k,r})))}
  else{const items=[];RADS.forEach(r=>r.k.forEach(k=>items.push({k,r})));if(state.settings.priority==='yes'){const w=[],l=[],u=[],m=[];items.forEach(x=>{const s=getStatus(x.k.c);if(s==='struggling')w.push(x);else if(s==='learning')l.push(x);else if(s==='unseen')u.push(x);else m.push(x)});const mShuf=shuffle(m),mSample=mShuf.slice(0,Math.max(1,Math.ceil(mShuf.length*0.2)));pool=[...shuffle(w),...shuffle(l),...shuffle(u),...mSample]}else pool=shuffle(items)}
  if(mode!=='verify'&&mode!=='mistakes'){while(pool.length<KANJI_PER_SESSION)pool=[...pool,...shuffle(pool.slice(0,Math.min(pool.length,20)))];pool=pool.slice(0,KANJI_PER_SESSION);}
  pool=shuffle(pool);
  const qTypes=getQuestionTypes();
  const questions=pool.flatMap(x=>{
    const [t1,t2]=_pick2RadTypes(qTypes);
    const q1=genQForType(t1,x.k,x.r);
    const q2=genQForType(t2,x.k,x.r);
    return[q1,q2];
  });
  const shuffled=shuffle(questions);
  const typesUsed={};shuffled.forEach(q=>{const k=q.kanji;if(!typesUsed[k])typesUsed[k]=new Set();typesUsed[k].add(q.type);});
  quiz={questions:shuffled,current:0,correct:0,wrong:0,mistakes:[],answered:false,retryStreaks:{},originalLength:shuffled.length,typesUsed,verifyMode:false,verifyStart:0};
  showScreen('quiz');renderQuestion()
}

function renderQuestion(){
  if(!quiz||quiz.current>=quiz.questions.length){showResults();return}
  const q=quiz.questions[quiz.current];quiz.answered=false;
  if(quiz.verifyMode){
    const vIdx=quiz.current-quiz.verifyStart;
    document.getElementById('quiz-mode-label').textContent='🔄 Verify: '+q.type;
    document.getElementById('quiz-progress-text').textContent='Verify '+(vIdx+1)+' / '+quiz.verifyLength;
    document.getElementById('progress-fill').style.width=Math.min(100,((vIdx+1)/quiz.verifyLength)*100)+'%';
  }else{
    document.getElementById('quiz-mode-label').textContent=q.type;
    document.getElementById('quiz-progress-text').textContent=Math.min(quiz.current+1,quiz.originalLength)+' / '+quiz.originalLength;
    document.getElementById('progress-fill').style.width=Math.min(100,(quiz.current/quiz.originalLength)*100)+'%';
  }
  document.getElementById('question-prompt').innerHTML=q.prompt;
  document.getElementById('question-kanji').textContent=q.display;
  document.getElementById('question-kanji').style.display=q.display?'block':'none';
  document.getElementById('question-context').innerHTML=q.context||'';
  document.getElementById('question-context').style.display=q.context?'block':'none';
  document.getElementById('question-sub').textContent=q.sub||'';
  document.getElementById('options').innerHTML=q.options.map((o,i)=>'<button class="option-btn" onclick="answer('+i+')"><span class="key-hint">'+(i+1)+'</span>'+o+'</button>').join('');
  document.getElementById('feedback-card').className='feedback-card';
  document.getElementById('next-btn').className='next-btn';
  applyFontScale()
}

function _requeueRad(q){
  const kObj=ALL_KANJI.find(x=>x.c===q.kanji)||{c:q.kanji,m:''};
  const rObj=RADS.find(r=>r.num===q.radNum);
  if(!rObj)return;
  const rQ=genQ(kObj,rObj);rQ.isRetry=true;
  if(quiz.verifyMode)rQ.isVerify=true;
  const gap=3+Math.floor(Math.random()*3);
  const insertAt=Math.min(quiz.current+gap,quiz.questions.length);
  quiz.questions.splice(insertAt,0,rQ);
}
function answer(idx){
  if(quiz.answered)return;quiz.answered=true;
  const q=quiz.questions[quiz.current],chosen=q.options[idx],ok=chosen===q.answer;
  const k=q.kanji;
  if(!quiz.typesUsed[k])quiz.typesUsed[k]=new Set();quiz.typesUsed[k].add(q.type);
  const s=getStat(k);s.seen++;
  if(ok){
    s.correct++;s.streak++;
    if(!q.isRetry&&!q.isVerify)quiz.correct++;
    if(k in quiz.retryStreaks){
      quiz.retryStreaks[k]++;
      if(quiz.retryStreaks[k]<3)_requeueRad(q);
    }
  }else{
    s.wrong++;s.streak=0;
    if(!q.isRetry&&!q.isVerify)quiz.wrong++;
    if(!quiz.mistakes.some(m=>m.kanji===k))quiz.mistakes.push(q);
    quiz.retryStreaks[k]=0;
    _requeueRad(q);
  }
  saveState();
  document.querySelectorAll('.option-btn').forEach((b,i)=>{b.classList.add('disabled');if(q.options[i]===q.answer)b.classList.add('correct');if(i===idx&&!ok)b.classList.add('wrong')});
  const fb=document.getElementById('feedback-card'),fh=document.getElementById('feedback-header'),fd=document.getElementById('feedback-detail');
  if(ok){
    fb.className='feedback-card show correct-fb';fh.className='feedback-header correct-text';
    if(k in quiz.retryStreaks&&quiz.retryStreaks[k]>=3){fh.textContent='🎌 Mastered! You got '+k+' right 3 times!';fd.innerHTML=q.fb_ok;}
    else if(k in quiz.retryStreaks){fh.textContent='✓ Correct! ('+quiz.retryStreaks[k]+'/3 streak)';fd.innerHTML=q.fb_ok;}
    else{fh.textContent='✓ Correct!';fd.innerHTML=q.fb_ok;}
  }else{
    fb.className='feedback-card show wrong-fb';fh.className='feedback-header wrong-text';fh.innerHTML='✗ Wrong — you chose "'+chosen+'"';
    fd.innerHTML=q.fb_ng+'<br><small style="color:var(--text-dim)">This will come back until you get it right 3 times.</small>';
  }
  document.getElementById('next-btn').className='next-btn show';updateStatsBar()
}

function nextQuestion(){
  quiz.current++;
  if(quiz.current>=quiz.questions.length){
    if(!quiz.verifyMode){startVerifyRound();}
    else{showResults();}
  }else renderQuestion();
}

function _pickDifferentRadType(kanji){
  const allTypes=['rad2meaning','kanji2rad','meaning2kanji'];
  const displayToInternal={'Radical→Meaning':'rad2meaning','Kanji→Radical':'kanji2rad','Meaning→Kanji':'meaning2kanji'};
  const used=quiz.typesUsed[kanji]||new Set();
  const usedInternal=new Set();used.forEach(t=>{if(displayToInternal[t])usedInternal.add(displayToInternal[t]);else usedInternal.add(t);});
  const unused=allTypes.filter(t=>!usedInternal.has(t));
  if(unused.length>0)return unused[Math.floor(Math.random()*unused.length)];
  return allTypes[Math.floor(Math.random()*allTypes.length)];
}

function startVerifyRound(){
  const seen={};const items=[];
  for(let i=0;i<quiz.originalLength;i++){
    const q=quiz.questions[i];if(!q)continue;
    const k=q.kanji;
    if(!seen[k]){
      seen[k]=true;
      const kObj=ALL_KANJI.find(x=>x.c===k);
      const rObj=RADS.find(r=>r.num===q.radNum);
      if(kObj&&rObj)items.push({k:kObj,r:rObj,kanji:k});
    }
  }
  if(items.length===0){showResults();return;}
  const vQuestions=shuffle(items).map(item=>{
    const type=_pickDifferentRadType(item.kanji);
    const vq=genQForType(type,item.k,item.r);vq.isVerify=true;
    return vq;
  });
  quiz.verifyMode=true;
  quiz.verifyStart=quiz.questions.length;
  quiz.verifyLength=vQuestions.length;
  quiz.questions.push(...vQuestions);
  renderQuestion();
}

function showResults(){
  const t=quiz.correct+quiz.wrong,p=t>0?Math.round(quiz.correct/t*100):0;state.ts++;saveState();
  document.getElementById('results-score').textContent=p+'%';
  document.getElementById('results-score').className='results-score '+(p>=80?'great':p>=50?'ok':'bad');
  let subtitle=quiz.correct+' correct, '+quiz.wrong+' wrong out of '+t;
  if(quiz.verifyMode)subtitle+=' + '+quiz.verifyLength+' verification';
  document.getElementById('results-subtitle').textContent=subtitle;
  const me=document.getElementById('results-mistakes');
  if(quiz.mistakes.length>0)me.innerHTML='<h3>Mistakes ('+quiz.mistakes.length+')</h3>'+quiz.mistakes.map(q=>'<div class="mistake-item"><div class="mi-kanji">'+q.kanji+'</div><div class="mi-info"><strong>'+q.answer+'</strong><br>'+q.type+'</div></div>').join('');
  else me.innerHTML='<p style="color:var(--correct);text-align:center;padding:20px">Perfect!</p>';
  document.getElementById('retry-mistakes-btn').style.display=quiz.mistakes.length>0?'':'none';
  const coveredSet={};const coveredList=[];
  for(let i=0;i<quiz.originalLength;i++){const q=quiz.questions[i];if(q&&!coveredSet[q.kanji]){coveredSet[q.kanji]=true;const kObj=ALL_KANJI.find(x=>x.c===q.kanji);coveredList.push({c:q.kanji,m:kObj?kObj.m:''});}}
  const ce=document.getElementById('results-covered');
  ce.innerHTML='<h3 style="color:var(--text-dim);font-size:.85rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Kanji Covered ('+coveredList.length+')</h3><div style="display:flex;flex-wrap:wrap;gap:8px">'+coveredList.map(e=>{const st=getStatus(e.c);const col=st==='mastered'?'var(--correct)':st==='struggling'?'var(--wrong)':'var(--text)';return'<div onclick="showModal(\\''+e.c+'\\')" style="cursor:pointer;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;text-align:center;min-width:70px"><div style="font-size:2rem;font-family:\\'Shippori Mincho B1\\',serif;color:'+col+'">'+e.c+'</div><div style="font-size:.75rem;color:var(--text-dim)">'+e.m+'</div></div>'}).join('')+'</div>';
  showScreen('results')
}

function renderReviewGrid(f){
  const grid=document.getElementById('kanji-grid');
  let items=[];RADS.forEach(r=>r.k.forEach(k=>items.push({k,r})));
  if(f&&f!=='all')items=items.filter(x=>getStatus(x.k.c)===f);
  grid.innerHTML=items.map(x=>{const s=getStat(x.k.c),st=getStatus(x.k.c),col=getProgressColor(s),cls=st==='unseen'?' unseen':'';return'<div class="kanji-tile" onclick="showModal(\\''+x.k.c+'\\')"><div class="tile-kanji'+cls+'" style="'+(cls?'':'color:'+col)+'">'+x.k.c+'</div><div class="tile-reading">'+x.k.m+'</div></div>'}).join('');
  updateReviewAccuracy();
}
function updateReviewAccuracy(){
  let totalC=0,totalW=0,nU=0,nL=0,nS=0,nM=0;
  ALL_KANJI.forEach(k=>{const s=getStat(k.c);totalC+=s.correct;totalW+=s.wrong;const st=getStatus(k.c);if(st==='unseen')nU++;else if(st==='learning')nL++;else if(st==='struggling')nS++;else nM++});
  const total=totalC+totalW,pct=total>0?Math.round(totalC/total*100):0;
  const T=ALL_KANJI.length,mPct=T>0?Math.round(nM/T*100):0,remaining=T-nM;
  document.getElementById('review-mastery-pct').textContent=nM+' / '+T+' Mastered';
  document.getElementById('review-mastery-detail').textContent=remaining>0?remaining+' remaining':'All mastered!';
  const mFill=document.getElementById('review-mastery-fill');
  mFill.style.width=mPct+'%';
  mFill.style.background=mPct>=100?'var(--correct)':mPct>=50?'#d4a017':'var(--accent)';
  document.getElementById('review-acc-pct').textContent=pct+'% Accuracy';
  document.getElementById('review-acc-detail').textContent=totalC+' correct / '+total+' total answers';
  const fill=document.getElementById('review-acc-fill');
  fill.style.width=pct+'%';
  fill.style.background=pct>=80?'var(--correct)':pct>=50?'#d4a017':'var(--wrong)';
  document.getElementById('review-status-counts').innerHTML='<span><span class="dot" style="background:#c0c0cc"></span>Unseen '+nU+'</span><span><span class="dot" style="background:#d4a017"></span>Learning '+nL+'</span><span><span class="dot" style="background:var(--wrong)"></span>Struggling '+nS+'</span><span><span class="dot" style="background:var(--correct)"></span>Mastered '+nM+'</span>';
}
function filterReview(f,b){document.querySelectorAll('.review-filters button').forEach(x=>x.classList.remove('active'));if(b)b.classList.add('active');document.getElementById('review-search').value='';renderReviewGrid(f)}
function searchReview(query){
  const q=query.trim().toLowerCase();
  if(!q){renderReviewGrid('all');return;}
  document.querySelectorAll('.review-filters button').forEach(x=>x.classList.remove('active'));
  const grid=document.getElementById('kanji-grid');
  const matches=[];
  RADS.forEach(r=>r.k.forEach(k=>{
    if(k.c.includes(q)||k.m.toLowerCase().includes(q)||r.rad.includes(q)||r.m.toLowerCase().includes(q)||r.jp.includes(q))matches.push({k,r});
  }));
  grid.innerHTML=matches.map(x=>{const s=getStat(x.k.c),st=getStatus(x.k.c),col=getProgressColor(s),cls=st==='unseen'?' unseen':'';return'<div class="kanji-tile" onclick="showModal(\\''+x.k.c+'\\')"><div class="tile-kanji'+cls+'" style="'+(cls?'':'color:'+col)+'">'+x.k.c+'</div><div class="tile-reading">'+x.k.m+'</div></div>'}).join('');
  if(matches.length===0)grid.innerHTML='<p style="color:var(--text-dim);padding:20px;text-align:center">No matches found</p>';
}

function showModal(c){
  const item=ALL_KANJI.find(x=>x.c===c);if(!item)return;
  const rad=RADS.find(r=>r.k.some(x=>x.c===c));
  const s=getStat(c),st=getStatus(c);
  document.getElementById('modal-kanji').textContent=c;
  let info='<dt>Meaning</dt><dd>'+item.m+'</dd>';
  if(rad)info+='<dt>Radical</dt><dd>'+rad.rad+' (#'+rad.num+') '+rad.jp+' — '+rad.m+'</dd>';
  info+='<dt>Status</dt><dd style="text-transform:capitalize">'+st+'</dd>';
  document.getElementById('modal-info').innerHTML=info;
  const t=s.correct+s.wrong,a=t>0?Math.round(s.correct/t*100):0;
  document.getElementById('modal-stats').innerHTML='<div><div class="ms-num" style="color:var(--correct)">'+s.correct+'</div>Correct</div><div><div class="ms-num" style="color:var(--wrong)">'+s.wrong+'</div>Wrong</div><div><div class="ms-num">'+a+'%</div>Accuracy</div>';
  document.getElementById('modal-overlay').classList.add('show')
}
function closeModal(){document.getElementById('modal-overlay').classList.remove('show')}

function showScreen(s){
  ['quiz-screen','review-screen','results-screen','settings-screen'].forEach(x=>document.getElementById(x).style.display='none');
  document.querySelectorAll('nav .nav-links button').forEach(b=>b.classList.remove('active'));
  switch(s){case'quiz':document.getElementById('quiz-screen').style.display='block';document.querySelectorAll('nav .nav-links button')[0].classList.add('active');if(!quiz)startQuiz('mixed');break;case'review':document.getElementById('review-screen').style.display='block';document.querySelectorAll('nav .nav-links button')[1].classList.add('active');renderReviewGrid('all');break;case'results':document.getElementById('results-screen').style.display='block';break;case'settings':document.getElementById('settings-screen').style.display='block';document.querySelectorAll('nav .nav-links button')[3].classList.add('active');loadSettings();break}
  updateStatsBar()
}
function loadSettings(){document.getElementById('setting-mode').value=state.settings.mode;document.getElementById('setting-priority').value=state.settings.priority}
function updateStatsBar(){
  document.getElementById('stat-seen').textContent=ALL_KANJI.filter(k=>getStat(k.c).seen>0).length;
  document.getElementById('stat-mastered').textContent=ALL_KANJI.filter(k=>getStatus(k.c)==='mastered').length;
  document.getElementById('stat-struggling').textContent=ALL_KANJI.filter(k=>getStatus(k.c)==='struggling').length;
  if(quiz){document.getElementById('stat-streak').textContent=function(){let s=0;for(let i=quiz.current-1;i>=0;i--){if(!quiz.mistakes.find(m=>m===quiz.questions[i]))s++;else break}return s}();document.getElementById('stat-session-correct').textContent=quiz.correct;document.getElementById('stat-session-total').textContent=quiz.correct+quiz.wrong}
}

document.addEventListener('keydown',e=>{
  if(document.getElementById('modal-overlay').classList.contains('show')){if(e.key==='Escape')closeModal();return}
  if(document.getElementById('quiz-screen').style.display==='none')return;
  if(['1','2','3','4'].includes(e.key)){const i=parseInt(e.key)-1;const b=document.querySelectorAll('.option-btn');if(b[i]&&!quiz.answered)answer(i)}
  if((e.key==='Enter'||e.key===' ')&&quiz&&quiz.answered){e.preventDefault();nextQuestion()}
});
startQuiz('mixed');
</script>
</body>
</html>`;
}

// Generate individual radical files
solo.forEach(r => {
  const safeName = r.num.toString().padStart(3, '0');
  const html = buildPage(
    `${r.rad} (${r.m}) — Radical #${r.num}`,
    `${r.rad} <span>${r.m}</span>`,
    [r],
    `rad_${r.num}`,
    r.k.length
  );
  fs.writeFileSync(path.join(__dirname, `${safeName}-${encodeURIComponent(r.rad)}.html`), html);
  console.log(`Created ${safeName} ${r.rad} (${r.m}) — ${r.k.length} kanji`);
});

// Generate combined file for single-kanji radicals
if (grouped.length > 0) {
  const html = buildPage(
    'Rare Radicals — Combined',
    '稀 <span>Rare Radicals</span>',
    grouped,
    'rad_rare',
    grouped.reduce((s, r) => s + r.k.length, 0)
  );
  fs.writeFileSync(path.join(__dirname, 'rare-combined.html'), html);
  console.log(`Created rare-combined.html — ${grouped.length} radicals, ${grouped.reduce((s,r)=>s+r.k.length,0)} kanji`);
}

// Output index data for main page
console.log('\n=== INDEX DATA ===');
solo.forEach(r => {
  const safeName = r.num.toString().padStart(3, '0');
  console.log(`${r.rad}|${r.m}|${r.k.length}|${safeName}-${encodeURIComponent(r.rad)}.html`);
});
console.log(`RARE|Combined|${grouped.reduce((s,r)=>s+r.k.length,0)}|rare-combined.html`);
