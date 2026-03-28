<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bible — MILTHA</title>
<link rel="stylesheet" href="css/miltha.css">
<style>
.bible-layout{display:grid;grid-template-columns:230px 1fr 260px;height:calc(100vh - 58px);margin-top:58px;overflow:hidden}
.bible-left{background:var(--parchment);border-right:1px solid var(--ash);display:flex;flex-direction:column;overflow:hidden}
.bible-center{display:flex;flex-direction:column;overflow:hidden;background:var(--black)}
.bible-right{background:var(--stone);border-left:1px solid var(--ash);display:flex;flex-direction:column;overflow:hidden}
.bl-header{padding:11px;border-bottom:1px solid var(--ash);flex-shrink:0}
.bl-search{width:100%;background:var(--stone);border:1px solid var(--ash);padding:8px 11px;font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--white);outline:none}
.bl-search::placeholder{color:var(--cream);opacity:.28;font-style:italic}
.bl-search:focus{border-color:var(--gold)}
.bl-label{font-family:'Cinzel',serif;font-size:7px;letter-spacing:.32em;color:var(--flame);opacity:.5;padding:9px 11px 5px}
.bl-list{flex:1;overflow-y:auto}
.bl-list::-webkit-scrollbar{width:3px}
.bl-list::-webkit-scrollbar-thumb{background:var(--ash)}
.bl-book{display:flex;align-items:center;justify-content:space-between;padding:7px 11px;cursor:pointer;transition:all .15s;border-left:2px solid transparent}
.bl-book:hover{background:rgba(201,169,110,.035);border-left-color:var(--ash2)}
.bl-book.active{background:rgba(201,169,110,.06);border-left-color:var(--gold)}
.bl-book-name{font-family:'Cinzel',serif;font-size:9px;letter-spacing:.07em;color:var(--white);opacity:.68}
.bl-book.active .bl-book-name{opacity:1;color:var(--gold)}
.bl-book-ara{font-family:serif;font-size:11px;color:var(--gold);opacity:.26}
.bc-topbar{display:flex;align-items:center;gap:7px;padding:8px 13px;border-bottom:1px solid var(--ash);background:var(--parchment);flex-shrink:0;flex-wrap:wrap}
.bc-title{font-family:'Cinzel',serif;font-size:11px;letter-spacing:.13em;color:var(--gold)}
.ch-nav{display:flex;align-items:center;gap:3px}
.ch-btn{font-family:'Cinzel',serif;font-size:9px;padding:5px 10px;background:none;border:1px solid var(--ash);color:var(--cream);opacity:.38;cursor:pointer;transition:all .15s}
.ch-btn:hover:not(:disabled){opacity:.75}
.ch-btn:disabled{opacity:.18;cursor:not-allowed}
.ch-select{font-family:'Cinzel',serif;font-size:9px;padding:5px 8px;background:var(--stone);border:1px solid var(--ash);color:var(--gold);outline:none;cursor:pointer}
.ch-select option{background:var(--stone)}
.trans-bar{display:flex;align-items:center;gap:4px;padding:6px 13px;border-bottom:1px solid var(--ash);background:var(--black);flex-shrink:0}
.trans-label{font-family:'Cinzel',serif;font-size:7px;letter-spacing:.2em;color:var(--gold);opacity:.32;margin-right:4px}
.trans-btn{font-family:'Cinzel',serif;font-size:8px;letter-spacing:.08em;padding:4px 10px;background:none;border:1px solid var(--ash);color:var(--cream);opacity:.32;cursor:pointer;transition:all .15s}
.trans-btn.active{color:var(--gold);opacity:1;border-color:rgba(201,169,110,.38);background:var(--golddim)}
.bc-scroll{flex:1;overflow-y:auto;padding:22px 26px 80px}
.bc-scroll::-webkit-scrollbar{width:3px}
.bc-scroll::-webkit-scrollbar-thumb{background:var(--ash)}
.book-intro{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--ash)}
.book-intro-name{font-family:'Cinzel',serif;font-size:clamp(18px,3vw,32px);letter-spacing:.14em;color:var(--pure);margin-bottom:5px}
.book-intro-ara{font-family:serif;font-size:18px;color:var(--gold);opacity:.32;margin-bottom:9px}
.book-intro-meta{display:flex;gap:14px;flex-wrap:wrap}
.bim{font-family:'Cinzel',serif;font-size:7px;letter-spacing:.16em;color:var(--cream);opacity:.28}
.bim strong{color:var(--gold);opacity:.5}
.ch-heading{font-family:'Cinzel',serif;font-size:10px;letter-spacing:.26em;color:var(--gold);opacity:.35;margin-bottom:16px}
.verse-block{display:flex;gap:9px;padding:6px 9px;cursor:pointer;transition:all .15s;border-left:2px solid transparent;margin-bottom:2px;position:relative}
.verse-block:hover{background:rgba(201,169,110,.03);border-left-color:rgba(201,169,110,.18)}
.verse-block.active{background:rgba(201,169,110,.06);border-left-color:var(--gold)}
.verse-block.has-loc::after{content:'⊕';position:absolute;right:8px;top:9px;font-size:9px;color:var(--flame);opacity:.38}
.verse-num{font-family:'Cinzel',serif;font-size:8px;color:var(--gold);opacity:.32;min-width:18px;margin-top:4px;flex-shrink:0}
.verse-text{font-size:17px;color:var(--white);line-height:1.84}
.verse-text.ylt{font-style:italic;opacity:.84}
.verse-text.ara{font-family:serif;font-size:16px;opacity:.88}
.verse-text.gk{font-family:serif;font-size:16px;opacity:.88}
.no-data{padding:40px 16px;text-align:center}
.no-data-ara{font-family:serif;font-size:32px;color:var(--gold);opacity:.11;margin-bottom:13px}
.no-data-text{font-family:'Cinzel',serif;font-size:8px;letter-spacing:.2em;color:var(--cream);opacity:.18;line-height:1.8}
.br-header{padding:11px 13px;border-bottom:1px solid var(--ash);flex-shrink:0}
.br-ref{font-family:'Cinzel',serif;font-size:9px;letter-spacing:.16em;color:var(--gold);margin-bottom:3px}
.br-hint{font-family:'Cinzel',serif;font-size:7px;letter-spacing:.1em;color:var(--cream);opacity:.2}
.br-scroll{flex:1;overflow-y:auto;padding:13px}
.br-section{margin-bottom:13px;padding-bottom:13px;border-bottom:1px solid var(--ash)}
.br-section:last-child{border-bottom:none}
.br-section-label{font-family:'Cinzel',serif;font-size:7px;letter-spacing:.26em;color:var(--gold);opacity:.35;margin-bottom:8px}
.br-text{font-size:13px;font-style:italic;color:var(--white);line-height:1.75;opacity:.76}
.br-text.rtl{direction:rtl;font-family:serif}
.br-source{font-family:'Cinzel',serif;font-size:6px;letter-spacing:.1em;color:var(--blue);opacity:.42;margin-top:4px}
.br-empty{text-align:center;padding:36px 13px}
.br-empty-ara{font-family:serif;font-size:24px;color:var(--gold);opacity:.12;margin-bottom:10px}
.br-empty-text{font-family:'Cinzel',serif;font-size:7px;letter-spacing:.16em;color:var(--cream);opacity:.18;line-height:1.8}
.father-mini{background:var(--parchment);border-left:2px solid var(--blue);padding:9px 11px}
.fm-name{font-family:'Cinzel',serif;font-size:7px;letter-spacing:.1em;color:var(--blue);opacity:.72;margin-bottom:4px}
.fm-quote{font-size:12px;font-style:italic;color:var(--cream);opacity:.62;line-height:1.65}
.map-mini-br{width:100%;height:120px;background:#0D1A14;border:1px solid var(--ash);overflow:hidden;margin-bottom:6px}
.map-mini-br svg{width:100%;height:100%}
.map-loc-name{font-family:'Cinzel',serif;font-size:8px;letter-spacing:.1em;color:var(--flame);margin-bottom:3px}
.map-loc-note{font-size:11px;font-style:italic;color:var(--cream);opacity:.48;line-height:1.5}
@media(max-width:900px){.bible-layout{grid-template-columns:200px 1fr}.bible-right{display:none}}
@media(max-width:640px){.bible-layout{grid-template-columns:1fr}.bible-left{height:160px;border-right:none;border-bottom:1px solid var(--ash)}}
</style>
</head>
<body>

<nav class="miltha-nav" id="miltha-nav">
  <a href="index.html" class="nav-brand">MILTHA <span>ܡܸܠܬ݂ܵܐ · THE WORD</span></a>
  <ul class="nav-links">
    <li><a href="daily.html">DAILY WORD</a></li>
    <li><a href="knowledge.html">KNOWLEDGE ENGINE</a></li>
    <li><a href="bible.html">BIBLE</a></li>
    <li><a href="study.html">WORD BY WORD</a></li>
    <li><a href="history.html">HISTORY</a></li>
    <li><a href="library.html">LIBRARY</a></li>
    <li><a href="community.html">COMMUNITY</a></li>
  </ul>
  <div class="nav-right">
    <button class="nav-btn nav-signin" onclick="showToast('ACCOUNTS COMING SOON')">SIGN IN</button>
    <button class="nav-btn nav-join" onclick="location.href='index.html'">JOIN FREE</button>
  </div>
</nav>

<div class="bible-layout">
  <div class="bible-left">
    <div class="bl-header">
      <input class="bl-search" type="text" placeholder="Search books..." oninput="filterBooks(this.value)">
    </div>
    <div class="bl-label">NEW TESTAMENT · 27 BOOKS</div>
    <div class="bl-list" id="bl-list"></div>
  </div>
  <div class="bible-center">
    <div class="bc-topbar">
      <span class="bc-title" id="bc-title">SELECT A BOOK</span>
      <div class="ch-nav" id="ch-nav" style="display:none">
        <button class="ch-btn" onclick="changeChapter(-1)">←</button>
        <select class="ch-select" id="ch-select" onchange="loadChapter(parseInt(this.value))"></select>
        <button class="ch-btn" onclick="changeChapter(1)">→</button>
      </div>
    </div>
    <div class="trans-bar">
      <span class="trans-label">TEXT</span>
      <button class="trans-btn active" onclick="setTrans('kjv',this)">KJV 1611</button>
      <button class="trans-btn" onclick="setTrans('ylt',this)">YLT 1862</button>
      <button class="trans-btn" onclick="setTrans('ara',this)">ܐ ARAMAIC</button>
      <button class="trans-btn" onclick="setTrans('gk',this)">Α GREEK</button>
    </div>
    <div class="bc-scroll" id="bc-scroll">
      <div class="no-data"><div class="no-data-ara">ܡܸܠܬ݂ܵܐ</div><div class="no-data-text">SELECT A BOOK TO BEGIN READING</div></div>
    </div>
  </div>
  <div class="bible-right">
    <div class="br-header">
      <div class="br-ref" id="br-ref">TAP A VERSE</div>
      <div class="br-hint">ORIGINAL LANGUAGES · MAP · CHURCH FATHER</div>
    </div>
    <div class="br-scroll" id="br-scroll">
      <div class="br-empty"><div class="br-empty-ara">ܡܸܠܺܬ݂ܵܐ</div><div class="br-empty-text">TAP ANY VERSE<br>TO SEE ITS ORIGINAL<br>LANGUAGES AND CONTEXT</div></div>
    </div>
  </div>
</div>

<script src="js/miltha.js"></script>
<script src="js/bible-data.js"></script>
<script src="js/nt-complete.js"></script>
<script>
let currentBook=null,currentChapter=1,currentTrans='kjv',filteredBooks=[...BIBLE_BOOKS];

function renderBookList(){
  document.getElementById('bl-list').innerHTML=filteredBooks.map(b=>`
    <div class="bl-book ${currentBook?.id===b.id?'active':''}" onclick="selectBook('${b.id}')">
      <span class="bl-book-name">${b.name}</span>
      <span class="bl-book-ara">${b.peshitta}</span>
    </div>`).join('');
}
function filterBooks(q){filteredBooks=BIBLE_BOOKS.filter(b=>b.name.toLowerCase().includes(q.toLowerCase()));renderBookList();}
function selectBook(id){currentBook=BIBLE_BOOKS.find(b=>b.id===id);currentChapter=1;renderBookList();updateChapterNav();loadChapter(1);clearDetail();}
function updateChapterNav(){
  if(!currentBook)return;
  document.getElementById('bc-title').textContent=currentBook.name;
  document.getElementById('ch-nav').style.display='flex';
  document.getElementById('ch-select').innerHTML=Array.from({length:currentBook.ch},(_,i)=>`<option value="${i+1}" ${i+1===currentChapter?'selected':''}>CHAPTER ${i+1}</option>`).join('');
}
function changeChapter(dir){if(!currentBook)return;const n=currentChapter+dir;if(n<1||n>currentBook.ch)return;loadChapter(n);}
function loadChapter(ch){
  if(!currentBook)return;
  currentChapter=ch;
  clearDetail();
  document.getElementById('ch-select').value=ch;
  const chData=VERSES[currentBook.id]?.[ch];
  const verses=chData?(chData[currentTrans]||chData.kjv||[]):[];
  const kp=KEY_PASSAGES[currentBook.id];
  let html=`<div class="book-intro">
    <div class="book-intro-name">${currentBook.name}</div>
    <div class="book-intro-ara">${currentBook.peshitta}</div>
    <div class="book-intro-meta">
      <span class="bim"><strong>AUTHOR</strong> ${currentBook.author}</span>
      <span class="bim"><strong>WRITTEN</strong> ${currentBook.written}</span>
      <span class="bim"><strong>THEME</strong> ${currentBook.theme}</span>
    </div></div>
    <div class="ch-heading">CHAPTER ${ch}</div>`;
  if(verses.length>0){
    verses.forEach((text,i)=>{
      const vn=i+1,locKey=`${currentBook.id}-${ch}-${vn}`,hasLoc=!!VERSE_LOCATIONS[locKey];
      const msNote=MS_NOTES[`${currentBook.id}-${ch}-${vn}`];
      const tc=currentTrans==='ylt'?'verse-text ylt':currentTrans==='ara'?'verse-text ara':currentTrans==='gk'?'verse-text gk':'verse-text';
      html+=`<div class="verse-block ${hasLoc?'has-loc':''}" id="vb-${vn}" onclick="selectVerse(${vn},'${locKey}')"><span class="verse-num">${vn}</span><span class="${tc}">${text}</span></div>`;
      if(msNote)html+=`<div class="ms-note"><div class="ms-note-label">MANUSCRIPT NOTE</div>${msNote}</div>`;
    });
  } else {
    html+=`<div class="no-data"><div class="no-data-ara">${currentBook.peshitta}</div><div class="no-data-text">${currentBook.name} ${ch}${kp?`<br><br>KEY PASSAGE: ${currentBook.name} ${kp.ch} — ${kp.label}`:''}<br><br>FULL TEXT COMING SOON<br><br><a href="knowledge.html" style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:.16em;color:var(--gold);opacity:.5;text-decoration:none;border:1px solid rgba(201,169,110,.2);padding:8px 16px">⊕ ASK THE KNOWLEDGE ENGINE</a></div></div>`;
  }
  document.getElementById('bc-scroll').innerHTML=html;
  document.getElementById('bc-scroll').scrollTop=0;
}
function setTrans(t,btn){currentTrans=t;document.querySelectorAll('.trans-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');if(currentBook)loadChapter(currentChapter);}
function selectVerse(vn,key){
  document.querySelectorAll('.verse-block').forEach(v=>v.classList.remove('active'));
  document.getElementById('vb-'+vn)?.classList.add('active');
  const parts=key.split('-');
  document.getElementById('br-ref').textContent=`${currentBook?.name||''} ${parts[1]}:${parts[2]}`;
  renderDetail(key,vn);
}
function renderDetail(key,vn){
  const chData=VERSES[currentBook?.id]?.[currentChapter];
  let html='';
  if(chData){
    const trans=[
      {id:'kjv',label:'KJV 1611',data:chData.kjv?.[vn-1]},
      {id:'ylt',label:"YOUNG'S LITERAL 1862",data:chData.ylt?.[vn-1]},
      {id:'ara',label:'PESHITTA · ARAMAIC',data:chData.ara?.[vn-1],rtl:true,source:'EASTERN SYRIAC · c. 2ND CENTURY AD'},
      {id:'gk',label:'TEXTUS RECEPTUS · GREEK',data:chData.gk?.[vn-1],source:'ERASMUS · 1516 AD'}
    ].filter(t=>t.data&&t.id!==currentTrans);
    if(trans.length>0){
      html+='<div class="br-section"><div class="br-section-label">TRANSLATIONS</div>';
      trans.forEach(t=>{html+=`<div style="margin-bottom:10px"><div style="font-family:'Cinzel',serif;font-size:6px;letter-spacing:.2em;color:var(--gold);opacity:.32;margin-bottom:4px">${t.label}</div><div class="br-text ${t.rtl?'rtl':''}">${t.data}</div>${t.source?`<div class="br-source">${t.source}</div>`:''}</div>`;});
      html+='</div>';
    }
  }
  const loc=VERSE_LOCATIONS[key];
  if(loc){
    const x=Math.min(Math.max(Math.round(((loc.lng-34.5)/3)*130+10),8),142);
    const y=Math.min(Math.max(Math.round(((35-loc.lat)/8)*100+10),8),112);
    html+=`<div class="br-section"><div class="br-section-label">LOCATION</div>
      <div class="map-mini-br"><svg viewBox="0 0 155 125" xmlns="http://www.w3.org/2000/svg"><rect width="155" height="125" fill="#0D1A14"/><ellipse cx="92" cy="40" rx="7" ry="11" fill="#0D2535" stroke="#1A4A6A" stroke-width=".5" opacity=".8"/><ellipse cx="97" cy="93" rx="5" ry="14" fill="#0D2535" stroke="#1A4A6A" stroke-width=".5" opacity=".8"/><path d="M90,51 Q88,67 90,80 Q92,88 94,80" stroke="#1A4A6A" stroke-width="1" fill="none" opacity=".5"/><circle cx="${x}" cy="${y}" r="5" fill="#E8813A" opacity=".9"/><circle cx="${x}" cy="${y}" r="9" fill="#E8813A" opacity=".1"/><text x="12" y="117" fill="#C9A96E" font-size="6" font-family="serif" opacity=".13">N↑</text></svg></div>
      <div class="map-loc-name">${loc.name}</div>
      <div class="map-loc-note">${loc.note}</div>
      <a href="history.html" style="font-family:'Cinzel',serif;font-size:7px;letter-spacing:.16em;color:var(--gold);opacity:.45;text-decoration:none;display:inline-flex;margin-top:8px">→ FULL HISTORY LAYER</a>
    </div>`;
  }
  const f=PASSAGE_FATHERS[`${currentBook?.id}-${currentChapter}`];
  if(f){html+=`<div class="br-section"><div class="br-section-label">CHURCH FATHER</div><div class="father-mini"><div class="fm-name">${f.father} · ${f.source}</div><div class="fm-quote">"${f.text}"</div></div></div>`;}
  if(!html)html=`<div class="br-empty"><div class="br-empty-ara">${currentBook?.peshitta||'ܡܸܠܺܬ݂ܵܐ'}</div><div class="br-empty-text">FULL ANNOTATIONS<br>COMING SOON</div></div>`;
  document.getElementById('br-scroll').innerHTML=html;
}
function clearDetail(){
  document.getElementById('br-ref').textContent='TAP A VERSE';
  document.getElementById('br-scroll').innerHTML='<div class="br-empty"><div class="br-empty-ara">ܡܸܠܺܬ݂ܵܐ</div><div class="br-empty-text">TAP ANY VERSE<br>TO SEE ITS ORIGINAL<br>LANGUAGES AND CONTEXT</div></div>';
}
renderBookList();
setTimeout(()=>selectBook('john'),100);
</script>
</body>
</html>
