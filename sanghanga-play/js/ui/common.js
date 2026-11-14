/* =====================================================================
   ui/common.js — 화면 공통: 픽셀 그리기 · 얼굴 · 위 띠 · 알림 · 전환 · 글자 치기 · 창 맞춤
   - 픽셀 도우미 · 밤 풍경 · 이벤트 배경 · 바둑판 전환은 그림책(04_시범/그림책/index.html)에서 그대로 가져옴
   - 그림 경로는 엔진의 SH.artChain(오린 반신 → 기본 → 옛 SVG)을 씀
   ===================================================================== */
// 저장소 꽂기(11-14 검토 2): 엔진(save.js)은 브라우저를 모름 → 이 기기 브라우저 저장소를 여기서 꽂음(SH.loadSave · sound.js 보다 먼저 실림)
// localStorage 는 부를 때 잡음 — 사생활 창 · 막힌 저장소에서 던지면 save.js · sound.js 의 try 가 조용히 받음(저장 없이 돎)
SH.store = { get: (k) => window.localStorage.getItem(k), set: (k, v) => window.localStorage.setItem(k, v), remove: (k) => window.localStorage.removeItem(k) };
const G = { st: null, P: null, instant: false, group: null, resume: null, W: 1280, redraw: null };   // 화면 쪽 상태 한 곳
/* 화면 판은 하나(중간 판 — 글 대신 그림 · 아이콘 · 칸 그림) · 11-13 대표님 '레거시 확실히 정리' — 예전 판(?ui=old) · 쉬운 판(?ui=simple)을 걷어냄
   html.mid 표지는 CSS 가 읽음(G.mid · G.simple 은 읽는 곳이 없어 11-13 걷어냄) */
document.documentElement.classList.add('mid');
// 사진 시험(?shot= · ?perf=1 은 빼고)에서는 무작위를 고정 씨앗으로 — 같은 화면은 늘 같은 짜임(같은 결과 시험 · tools/verify.sh) · 게임 동작은 그대로
if (/[?&]shot=/.test(location.search) && !/[?&]perf=1/.test(location.search)) { const sd = { s: 12345 }; Math.random = () => SH.mul32(sd, 's'); }
const HERO = SH.HERO;
function artChain(id, mood) { return SH.artChain(id, mood); }
const isSvg = s => /\.svg(\?|$)/.test(s || '');
function artImg(id, mood, cls, style) {
  const c = artChain(id, mood); if (!c.length) return '';
  return `<img class="${cls || ''} ${isSvg(c[0]) ? '' : 'png'}" src="${c[0]}" data-alt="${c.slice(1).join('|')}" data-mood="${mood || 'base'}" onerror="artNext(this)" alt="" ${style ? `style="${style}"` : ''}>`;
}
function artNext(im) {
  const r = (im.dataset.alt || '').split('|').filter(Boolean);
  if (!r.length) { im.onerror = null; im.style.visibility = 'hidden'; return; }
  im.dataset.alt = r.slice(1).join('|'); if (isSvg(r[0])) im.classList.remove('png'); im.src = r[0];
}
// 그림을 못 읽을 때 한 곳(11-14 · 기준 6): 문서에 잡기 단계로 걸어 <img> 마다 onerror 속성을 안 붙임(정상일 땐 화면 짜임이 한 글자도 안 바뀜)
//   장소 배경 → 그림 없는 배경(bg-… + 소품) · 장면 그림(CG) → 그 장소 배경 · 그 밖 → 숨김 · 인물 그림처럼 제 onerror 가 있으면 건너뜀(artNext 가 다음 후보로)
document.addEventListener('error', (e) => {
  const im = e.target; if (!im || im.tagName !== 'IMG' || im.onerror || im.dataset.off) return;
  im.dataset.off = '1';
  try {
    const pidOf = (src) => { const k = (/in_([^/.]+)\.jpg/.exec(src) || [])[1]; const PB = PLACE_BG(), BG = BG_OF(); return Object.keys(PB).find(p => PB[p] === k && BG[p]) || ''; };
    const ev = G.P && SH.EV && SH.EV[G.P.id], pid = im.classList.contains('bgimg') ? pidOf(im.getAttribute('src')) : im.classList.contains('cg') && ev && ev.when ? ev.when.place : null;
    if (pid != null) { const bg = BG_OF()[pid] || 'office'; im.insertAdjacentHTML('afterend', im.classList.contains('cg') ? placeBg(pid, bg) : `<div class="bg bg-${bg}"></div>${BGPROPS[bg] || ''}`); im.remove(); return; }
  } catch (err) { /* 대신 그리기도 못 하면 숨김만 */ }
  im.style.visibility = 'hidden';
}, true);
function setArt(im, id, mood) {
  if (!im || (im.dataset.mood === mood && im.dataset.id === id)) return; const c = artChain(id, mood); if (!c.length) { im.style.visibility = 'hidden'; return; }
  im.dataset.mood = mood; im.dataset.id = id; im.dataset.alt = c.slice(1).join('|'); im.classList.toggle('png', !isSvg(c[0])); im.style.visibility = ''; im.onerror = () => artNext(im); im.src = c[0];
}
/* ── 픽셀 그리기 도우미 (목업 01~06 과 같은 것을 한 벌로) ── */
function pxCanvas(el,w,h,scale){el.width=w;el.height=h;el.style.width=(w*scale)+'px';el.style.height=(h*scale)+'px';
  const c=el.getContext('2d');c.imageSmoothingEnabled=false;return c;}
function R(c,col,x,y,w,h){c.fillStyle=col;c.fillRect(x,y,w,h);}
function drawMap(c,rows,pal,x,y,flip){const w=rows[0].length;
  for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const k=rows[j][i];const col=pal[k];if(!col)continue;
    c.fillStyle=col;c.fillRect(x+(flip?w-1-i:i),y+j,1,1);}}
// 사람 16×32 — 남자 틀 / 여자 틀
const MAN=[
"................","................",".....OOOOOO.....","....OHHHHHHO....","...OHHhhHHHHO...","...OHHHHHHHHO...",
"...OHSSSSSSHO...","...OSSSSSSSSO...","...OSESSSSESO...","...OSSSSSSSSO...","...OsSSSSSSsO...","....OsSSSSsO....",
".....OOssOO.....","....OCCWWCCO....","...OCCWTTWCCO...","..OCCCCTTCCCCO..","..OCcCCTTCCcCO..","..OCcCCTTCCcCO..",
"..OCcCCCCCCcCO..","..OCcCCCCCCcCO..","..OCcCCCCCCcCO..","..OSOCCCCCCOSO..","...OOPPPPPPOO...","....OPPPPPPO....",
"....OPPPPPPO....","....OPPOOPPO....","....OPPOOPPO....","....OPPOOPPO....","....OPPOOPPO....","....OPPOOPPO....",
"...OBBBOOBBBO...","...OOOO..OOOO..."];
const WOMAN=[
"................","................",".....OOOOOO.....","....OHHHHHHO....","...OHHhhHHHHO...","...OHHHHHHHHO...",
"...OHHSSSSHHO...","..OHHSSSSSSHHO..","..OHSESSSSESHO..","..OHSSSSSSSSHO..","..OHsSSSSSSsHO..","..OHHsSSSSsHHO..",
"..OHHOOssOOHHO..","..OHOCCWWCCOHO..","..OHCCCWWCCCHO..","..OCCCCWWCCCCO..","..OCcCCCCCCcCO..","..OCcCCCCCCcCO..",
"..OCcCCCCCCcCO..","..OCcCCCCCCcCO..","..OCcCCCCCCcCO..","..OSOCCCCCCOSO..","...OOPPPPPPOO...","...OPPPPPPPPO...",
"...OPPPPPPPPO...","...OPPPPPPPPO...","....OOOOOOOO....",".....OSSOSSO....",".....OSSOSSO....",".....OSSOSSO....",
".....OBBOBBO....",".....OOOOOOO...."];
const SKIN={S:'#f2c9a0',s:'#d9a57c',E:'#1b1820',W:'#f4f4f4',B:'#26232c',O:'#2a2234'};
const PAL={
  hero:   Object.assign({},SKIN,{H:'#1c1f2e',h:'#3a4262',T:'#1f2d6b',C:'#8c919b',c:'#6c7079',P:'#5f636b'}),
  hero_navy:Object.assign({},SKIN,{H:'#1c1f2e',h:'#3a4262',T:'#a3263a',C:'#27367a',c:'#1a2658',P:'#1f2a5c',W:'#f4f4f4'}),
  analyst:Object.assign({},SKIN,{H:'#121828',h:'#2e3858',C:'#20306a',c:'#16224d',P:'#20306a',G:'#d6dde8'}),
  reporter:Object.assign({},SKIN,{H:'#4a2c1c',h:'#6e4630',C:'#cdb88c',c:'#a8936a',T:'#d42c36',P:'#3c3c48',W:'#fff'}),
  barowner:Object.assign({},SKIN,{H:'#5a1f2a',h:'#83303e',C:'#1f2a24',c:'#14201a',W:'#f4f4f4',P:'#24563a'}),
  heiress:Object.assign({},SKIN,{H:'#7a3a1c',h:'#a45a2c',C:'#c41e34',c:'#931424',W:'#c41e34',P:'#931424'}),
  boss:   Object.assign({},SKIN,{H:'#8d8f96',h:'#b6b8c0',T:'#8a1c26',C:'#6b4428',c:'#523218',P:'#4e3220',G:'#d8b040'}),
  rival:  Object.assign({},SKIN,{H:'#8a5a32',h:'#b98552',T:'#7a32b8',C:'#c6cad2',c:'#a3a8b2',P:'#a3a8b2'}),
  client: Object.assign({},SKIN,{H:'#7c7e84',h:'#a2a4aa',T:'#cfd8e6',W:'#cfd8e6',C:'#7d7a48',c:'#5f5c34',P:'#4a4a3a'}),
  npc1:   Object.assign({},SKIN,{H:'#22222a',h:'#3b3b46',T:'#5a2a2a',C:'#4b5468',c:'#3a4254',P:'#3a4254'}),
  npc2:   Object.assign({},SKIN,{H:'#2a2018',h:'#4a3a2a',T:'#2a4a7a',C:'#6a6f7a',c:'#555a64',P:'#4a4e58'}),
  npc3:   Object.assign({},SKIN,{H:'#2a1a1a',h:'#4a2e2e',C:'#e8e2d4',c:'#c8c0ae',W:'#fff',P:'#6a5a7a'}),
  tailor: Object.assign({},SKIN,{H:'#d8d8dc',h:'#f2f2f4',T:'#c8a040',C:'#6a5038',c:'#4e3a26',W:'#efe8d8',P:'#3a3a40'})
};
const WOMEN={analyst:1,reporter:1,barowner:1,heiress:1,npc3:1};
function personRows(id){const rows=(WOMEN[id]?WOMAN:MAN).slice();
  if(id==='analyst')rows[8]="..OHGEGSSGEGHO..";
  if(id==='boss')rows[8]="...OGEGSSGEGO...";
  return rows;}
function person(c,id,x,y,flip){drawMap(c,personRows(id),PAL[id],x,y,flip);}
function personK(c,id,x,y,flip,k){const t=document.createElement('canvas');const tc=pxCanvas(t,16,32,1);person(tc,id,0,0,flip);
  c.imageSmoothingEnabled=false;c.drawImage(t,x,y,16*k,32*k);}
// 그림자 사람(끝 장): 겉에 1칸 빛 테를 두른 검은 몸
function silPal(col){const p={};'OHhSsEWTCcPBG'.split('').forEach(k=>p[k]=col);return p;}
function silhouette(c,rows,x,y,rim){drawMap(c,rows,silPal(rim),x-1,y);drawMap(c,rows,silPal(rim),x,y-1);drawMap(c,rows,silPal('#06070c'),x,y);}
// 아이콘 8×8
const ICON={
 coin:{r:["..yyyy..",".yYYYYy.","yYwYYYYy","yYwYyYYy","yYYYyYYy","yYYYYYYy",".yYYYYy.","..yyyy.."],p:{Y:'#f2c14e',y:'#b07c1e',w:'#fff3b0'}},
 heart:{r:[".rr..rr.","rRRrrRRr","rRwRRRRr","rRRRRRRr",".rRRRRr.","..rRRr..","...rr...","........"],p:{R:'#ff5a6e',r:'#a8263b',w:'#ffd0d8'}},
 star:{r:["...yy...","...YY...","yyYYYYyy",".yYYYYy.","..YYYY..",".YY..YY.",".Y....Y.","........"],p:{Y:'#ffe27a',y:'#c8922a'}},
 lock:{r:["..oooo..",".o....o.",".o....o.","oooooooo","oGGGGGGo","oGGooGGo","oGGGGGGo","oooooooo"],p:{o:'#2a2234',G:'#9aa0b8'}},
 gear:{r:[".g.gg.g.","gggggggg",".gg..gg.","gg....gg","gg....gg",".gg..gg.","gggggggg",".g.gg.g."],p:{g:'#c9d2e6'}},   // 설정 = 톱니바퀴(11-14 대표님 '설정은 톱니바퀴 아이콘 같은 걸로 대체해서 공간을 확보')
 bolt:{r:["....yy..","...yy...","..yy....",".yyyyy..","....yy..","...yy...","..yy....","........"],p:{y:'#7fe0ff'}},
 stress:{r:["....o...","...oo...","..ooo.o.",".oooooo.",".oOOooo.",".oOYOoo.","..OYYO..","...OO..."],p:{o:'#ff7a3c',O:'#ffb04c',Y:'#fff0a0'}},   // 스트레스 = 불꽃(11-14 대표님 '스트레스도 아이콘으로')
 up:{r:["...gg...","..gggg..",".gggggg.","gggggggg","...gg...","...gg...","...gg...","........"],p:{g:'#62cc7e'}}
};
const ic=(k,s)=>`<canvas data-icon="${k}" data-s="${s||2}"></canvas>`;
// 큰 도트 아이콘(11-12 할 일 C — 칸마다 맞는 그림) · 크기 px
const ICON16 = { work: 0, lunch: 1, overtime: 2, drinks: 3, home: 4, gym: 5, study: 6, shop: 7, heart: 8, coin: 9, star: 10, lock: 11, up: 12, news: 13, phone: 14, suit: 15 };
const ic16 = (k, px) => { const i = ICON16[k] == null ? 10 : ICON16[k], w = px || 40, h = Math.round(w * 106 / 120);
  return `<span class="ic16" style="width:${w}px;height:${h}px;background-size:${w * 4}px ${h * 4}px;background-position:${-w * (i % 4)}px ${-h * ((i / 4) | 0)}px"></span>`; };
const fc=(id,s,extra,mood)=>`<canvas class="face" data-face="${id}" data-s="${s||1}" ${mood?`data-mood="${mood}"`:''} ${extra||''}></canvas>`;
// 윗옷 16×16 (물건 그림 · 색만 바꿈)
const JK=["....OOOOOOOO....","...OCCCWWCCCO...","..OCCCWTTWCCCO..",".OCCCCWTTWCCCCO.","OCCCCCCTTCCCCCCO","OCcCCCCTTCCCCcCO","OCcCCCCTTCCCCcCO","OCcCCCCCCCCCCcCO",
"OCcCCCCYCCCCCcCO","OCcCCCCCCCCCCcCO","OCcCCCCYCCCCCcCO","OCcCCCCCCCCCCcCO","OOcCCCCCCCCCCcOO",".OOCCCCCCCCCCOO.","..OOOOOOOOOOOO..","................"];
const IP={custom:{C:'#27367a',c:'#1a2658',W:'#f4f4f4',T:'#a3263a',Y:'#c8a040',O:'#0f1430'},
 ready:{C:'#8c919b',c:'#6c7079',W:'#f4f4f4',T:'#1f2d6b',Y:'#444',O:'#2a2234'},
 shirt:{C:'#eef2f8',c:'#c8d0dc',W:'#ffffff',T:'#2f7a4a',Y:'#c8d0dc',O:'#2a2234'},
 dept:{C:'#4a5a6a',c:'#36444f',W:'#f4f4f4',T:'#7a2a2a',Y:'#999',O:'#1a2030'},
 italy:{C:'#3a3f4a',c:'#272b33',W:'#f4f4f4',T:'#c8a040',Y:'#c8a040',O:'#14161c'},
 coat:{C:'#c49a6a',c:'#9a7448',W:'#3a3f4a',T:'#3a3f4a',Y:'#7a5a3a',O:'#3a2a1a'}};
// 픽셀 얼굴: 일러스트를 32×32로 줄임 (그림_방향 1-5)
const FACEBG={hero:'#9aa6c0',analyst:'#3a4a86',reporter:'#d8c49a',barowner:'#2f5a44',heiress:'#d8a24a',boss:'#a8865a',rival:'#b9a8d8',client:'#a8ac78'};
const FACECROP={hero:[200,110,200],analyst:[200,125,200],reporter:[200,125,200],barowner:[200,120,200],heiress:[200,130,200],boss:[200,140,200],rival:[200,130,200],client:[200,140,200]};
FACEBG.npc_tailor='#7a5a3e';FACEBG.exec_oh='#5a5a6a';FACEBG.chairman_yoon='#8a9a6a';FACEBG.rival_father='#4a4a5a';
const HEAD={analyst_base:[536,20],analyst_cold:[519,28],analyst_flustered:[519,44],barowner_base:[438,44],barowner_sulk:[425,16],barowner_surprise:[429,8],
 boss_base:[501,36],boss_sneer:[486,32],boss_surprise:[484,48],chairman_yoon_base:[490,32],client_base:[541,56],client_laugh:[498,56],client_moved:[508,24],
 exec_oh_base:[481,4],heiress_base:[492,16],heiress_pout:[535,32],heiress_surprise:[508,40],hero_base:[500,16],hero_ceo:[493,40],hero_determined:[480,68],
 hero_exec:[419,44],hero_founder:[502,20],hero_manager:[446,64],hero_smile:[564,52],npc_tailor_base:[443,24],reporter_angry:[556,16],reporter_base:[522,24],
 reporter_surprise:[481,32],rival_base:[464,32],rival_calm:[497,24],rival_father_base:[495,8],rival_flustered:[461,20]};
const IMG={};
// 얼굴용 Image — 같은 순서로 내려감
function illImg(id,mood){const key=id+'|'+(mood||'base');if(!IMG[key]){const c=artChain(id,mood);const im=new Image();let i=0;
  im.onerror=()=>{i++;if(i<c.length)im.src=c[i];};if(c.length)im.src=c[0];IMG[key]=im;}return IMG[key];}
function faceCrop(im,id){const m=/ill_([a-z_]+)\.png/.exec(im.currentSrc||im.src||'');
  /* 106(11-14 대표님 '얼굴 반 정도가 잘림'): 머리 자리 표(HEAD)는 원본 1024폭 기준인데 공개용은 900폭으로 줄여 올림(올리기/build_web.py sips -Z 900) → 그림 폭에 맞춰 줄여 씀 */
  if(m&&HEAD[m[1]]){const [cx,top]=HEAD[m[1]],s=470,k=(im.naturalWidth||1024)/1024;return [Math.max(0,Math.min(1024-s,cx-s/2))*k,Math.max(0,top-6)*k,s*k];}
  return FACECROP[id]||[200,130,200];}
function faceDraw(cv){const id=cv.dataset.face;const n=+cv.dataset.n||64;const c=pxCanvas(cv,n,n,(+cv.dataset.s||1.5)*32/n);c.imageSmoothingEnabled=true;   /* 106 '도트 해상도를 높이고': 32 → 64칸(보이는 크기는 그대로) */
  const im=illImg(id,cv.dataset.mood);
  const draw=()=>{R(c,FACEBG[id]||'#888',0,0,n,n);const f=faceCrop(im,id);c.drawImage(im,f[0],f[1],f[2],f[2],0,0,n,n);};
  R(c,FACEBG[id]||'#888',0,0,n,n);
  if(im.complete&&im.naturalWidth)draw();else im.addEventListener('load',draw,{once:true});}
function paint(root){
  root.querySelectorAll('canvas[data-icon]').forEach(cv=>{const k=ICON[cv.dataset.icon];const c=pxCanvas(cv,8,8,+cv.dataset.s||2);drawMap(c,k.r,k.p,0,0);});
  root.querySelectorAll('canvas[data-person]').forEach(cv=>{const c=pxCanvas(cv,16,32,+cv.dataset.s||3);person(c,cv.dataset.person,0,0,cv.dataset.flip==='1');});
  root.querySelectorAll('canvas[data-item]').forEach(cv=>{const k=cv.dataset.item;const n=cv.dataset.bare?16:18;const c=pxCanvas(cv,n,n,+cv.dataset.s||3);
    if(!cv.dataset.bare)R(c,'#121834',0,0,18,18);drawMap(c,JK,IP[k],cv.dataset.bare?0:1,cv.dataset.bare?0:2);});
  root.querySelectorAll('canvas[data-face]').forEach(faceDraw);
}
/* ── 제목 밤 풍경 (컷 1 · 640×360 을 2배) ── */
function drawNight(cv){
  const c=pxCanvas(cv,640,360,2);
  const sky=['#070a1c','#0a0e26','#0e1230','#141638','#1c1a42','#28204a','#3a2550'];
  for(let i=0;i<sky.length;i++){R(c,sky[i],0,i*34,640,34);if(i)for(let x=(i%2);x<640;x+=2)R(c,sky[i],x,i*34-1,1,1);}
  for(let i=0;i<90;i++){const x=(i*131)%640,y=(i*53)%150;R(c,i%7?'rgba(230,230,255,.55)':'#fff',x,y,1,1);}
  R(c,'#f4ecc8',96,40,10,10);R(c,'#f4ecc8',94,42,14,6);R(c,'#fffbe8',97,41,4,3); // 달
  // 먼 빌딩 줄
  for(let i=0;i<30;i++){const w=14+(i*7)%20,h=26+(i*37)%70,x=i*22-8;R(c,'#121838',x,236-h,w,h);
    for(let y=236-h+5;y<232;y+=6)for(let xx=x+3;xx<x+w-3;xx+=5)if(((xx*3+y*7+i)%13)<3)R(c,'#c8a85a',xx,y,2,2);}
  // 가까운 빌딩 줄
  function tower(x,w,h,face,lit){R(c,'#0b0e1a',x-1,236-h-1,w+2,h+1);R(c,face,x,236-h,w,h);
    for(let y=236-h+6;y<230;y+=7)for(let xx=x+3;xx<x+w-4;xx+=6)R(c,((xx*5+y*3)%11<lit)?'#ffe08a':'#22284a',xx,y,3,4);}
  tower(150,40,96,'#1a2048',4);tower(196,30,70,'#1c2450',3);tower(232,46,120,'#182046',5);tower(286,28,82,'#1e2652',3);
  tower(330,36,104,'#1a2048',4);tower(520,40,92,'#1c2450',4);tower(566,30,66,'#182046',3);tower(600,40,110,'#1a2048',5);
  // 금빛 큰 빌딩
  R(c,'rgba(255,200,90,.10)',418,20,96,220);R(c,'rgba(255,200,90,.08)',404,40,124,200);
  R(c,'#0b0e1a',435,39,62,198);for(let y=40;y<236;y+=2)R(c,y%4?'#c8902e':'#f0c460',436,y,60,2);R(c,'#8a6020',480,40,16,196);
  for(let y=46;y<230;y+=8)for(let x=440;x<476;x+=6)if(((x+y*3)%7)<2)R(c,'#fff3c4',x,y,3,2);
  R(c,'#e8e0c8',465,26,2,14);R(c,'#ef5350',464,24,4,3);
  // 네온
  R(c,'#ff6ad5',238,168,22,3);R(c,'rgba(255,106,213,.3)',234,164,30,11);R(c,'#5ae0ff',336,150,16,3);R(c,'rgba(90,224,255,.3)',332,146,24,11);
  // 강
  R(c,'#0a0f2a',0,236,640,96);
  for(let y=238;y<330;y+=3)for(let x=(y*7)%9;x<640;x+=11){R(c,(x*y)%5?'#121a3e':'#18224a',x,y,5,1);}
  [[466,'#f0c460',30],[250,'#ff8ae0',14],[344,'#7ae8ff',10],[170,'#ffe08a',12],[612,'#ffe08a',12]].forEach(r=>{for(let y=240;y<328;y+=4){const w=r[2]-((y-240)/6|0);if(w<2)continue;const off=((y*13)%5)-2;R(c,r[1],r[0]-w/2+off,y,w,1);}});
  // 다리
  R(c,'#0b0e1a',0,226,140,6);R(c,'#2a3060',0,226,140,2);
  for(let x=4;x<140;x+=16){R(c,'#0b0e1a',x,212,2,14);R(c,'#ffe9a8',x-1,210,4,2);}
  for(let x=10;x<136;x+=22){R(c,'#ff5050',x,229,3,1);R(c,'#fff6c8',x+11,229,3,1);}
  for(let x=0;x<140;x+=4)R(c,'#0b0e1a',x,232,2,4);
  // 강가 앞
  R(c,'#0d1222',0,330,640,30);R(c,'#1a2238',0,330,640,2);
  for(let x=0;x<640;x+=20){R(c,'#2a3150',x,318,2,12);}R(c,'#2a3150',0,318,640,2);
  personK(c,'hero',120,296,false,1);R(c,'rgba(0,0,0,.4)',122,327,12,2);
}

/* ── 끝 장 회청색 밤 (거품 터짐 색) ── */
function drawGrey(cv){
  const c=pxCanvas(cv,640,360,2);
  const b=['#1a1f2a','#1f2531','#252c39','#2c3442','#343d4c','#3b4555'];
  for(let i=0;i<b.length;i++){R(c,b[i],0,i*42,640,42);if(i)for(let x=(i%2);x<640;x+=2)R(c,b[i],x,i*42-1,1,1);}
  for(let i=0;i<34;i++){const w=14+(i*7)%22,h=40+(i*37)%120,x=i*20-8;R(c,'#141924',x,270-h,w,h);
    for(let y=270-h+6;y<266;y+=7)for(let xx=x+3;xx<x+w-3;xx+=5)if(((xx*3+y*7+i)%19)<2)R(c,'#6a7284',xx,y,2,3);}
  R(c,'#0f131c',0,270,640,90);
  // 꺼진 금빛 빌딩 — 운명 카드 셋(가운데 약 162~478) 오른쪽 바깥에 · 카드 뒤에 있으면 '몰락' 글자를 가림
  R(c,'#0b0e14',548,60,46,210);for(let y=62;y<270;y+=2)R(c,y%4?'#4a4e58':'#565a64',549,y,44,2);
  for(let i=0;i<200;i++)R(c,i%5?'rgba(220,228,240,.45)':'#e8eef6',(i*89)%640,(i*47)%360,1,1);
}
function drawFate(cv,kind){
  const c=pxCanvas(cv,72,88,2.5);
  if(kind==='ceo'){
    R(c,'#141924',0,0,72,88);R(c,'#0b0e14',20,4,32,84);for(let y=8;y<30;y+=5)for(let x=24;x<50;x+=5)R(c,'#f2c14e',x,y,3,3);
    R(c,'rgba(242,193,78,.18)',8,40,56,48);R(c,'#0b0e14',0,74,72,14);R(c,'#06070c',14,66,44,10);R(c,'#f2c14e',14,66,44,1);
    silhouette(c,MAN,28,40,'#f2c14e');R(c,'#06070c',14,67,44,9);R(c,'#f2c14e',14,66,44,1);
  }else if(kind==='own'){
    R(c,'#141a1c',0,0,72,88);R(c,'#0b0e14',0,74,72,14);
    R(c,'#1e2a26',8,18,40,56);R(c,'#62cc7e',8,18,40,1);R(c,'#0b0e14',14,30,16,44);R(c,'rgba(255,220,140,.75)',15,31,14,42);
    R(c,'#06070c',10,8,36,8);R(c,'#62cc7e',10,8,36,1);R(c,'#62cc7e',10,15,36,1);
    silhouette(c,MAN,44,42,'#62cc7e');R(c,'#06070c',56,58,9,8);R(c,'#62cc7e',56,57,9,1);
  }else{
    R(c,'#1a1416',0,0,72,88);R(c,'#0b0e14',0,74,72,14);
    R(c,'#06070c',56,10,2,64);R(c,'#06070c',46,10,12,2);R(c,'#ef5350',46,12,6,2);R(c,'rgba(239,83,80,.16)',30,14,40,60);
    R(c,'#06070c',6,62,40,3);R(c,'#06070c',8,65,2,9);R(c,'#06070c',42,65,2,9);R(c,'#ef5350',6,62,40,1);
    const up=MAN.slice(0,22);silhouette(c,up,14,40,'#ef5350');R(c,'#06070c',18,62,14,4);R(c,'#06070c',28,62,4,12);R(c,'#06070c',26,73,8,2);
    for(let i=0;i<24;i++)R(c,'rgba(230,236,246,.6)',(i*29)%72,(i*17)%74,1,1);
  }
}
/* ── 이벤트 배경(흐린 물건) ── */
const BGPROPS={
  office:'<div class="bl" style="left:120px;top:26px;width:260px;height:10px;background:#fbfff4;opacity:.8;filter:blur(3px)"></div><div class="bl" style="left:780px;top:26px;width:260px;height:10px;background:#fbfff4;opacity:.8;filter:blur(3px)"></div><div class="bl" style="left:40px;top:396px;width:360px;height:90px;background:#16161c;opacity:.45"></div><div class="bl" style="left:60px;top:412px;width:320px;height:8px;background:repeating-linear-gradient(90deg,#ef5350 0 30px,#4c86ff 30px 60px);opacity:.6"></div><div class="bl" style="left:-40px;right:-40px;top:440px;height:120px;background:linear-gradient(#9aa2ac,#6a727c);opacity:.7"></div><div class="bl" style="left:1060px;top:70px;width:180px;height:200px;background:linear-gradient(#bfe2f6,#e8f4fa);opacity:.5"></div>',
  cafeteria:'<div class="bl" style="left:120px;top:26px;width:260px;height:10px;background:#fffef0;opacity:.8;filter:blur(3px)"></div><div class="bl" style="left:760px;top:26px;width:260px;height:10px;background:#fffef0;opacity:.8;filter:blur(3px)"></div><div class="bl" style="left:60px;top:70px;width:150px;height:190px;background:linear-gradient(#bfe2f6,#e8f4fa);opacity:.55"></div><div class="bl" style="left:250px;top:70px;width:150px;height:190px;background:linear-gradient(#bfe2f6,#e8f4fa);opacity:.55"></div><div class="bl" style="left:1080px;top:70px;width:150px;height:190px;background:linear-gradient(#bfe2f6,#e8f4fa);opacity:.55"></div><div class="bl" style="left:-40px;right:-40px;top:470px;height:90px;background:linear-gradient(#efe6d2,#c7b48e);filter:blur(4px);opacity:.9"></div>',
  bar:'<div class="bl" style="left:70px;top:60px;width:300px;height:26px;background:#ff6ad5;opacity:.7;filter:blur(8px)"></div><div class="bl" style="left:40px;top:120px;width:380px;height:160px;background:repeating-linear-gradient(90deg,rgba(255,190,90,.55) 0 14px,transparent 14px 34px);opacity:.6"></div><div class="bl" style="left:-40px;right:-40px;top:430px;height:140px;background:linear-gradient(#5a3a22,#2a1a10);opacity:.9"></div><div class="bl" style="left:1060px;top:40px;width:40px;height:40px;border-radius:50%;background:#ffcf80;opacity:.8;filter:blur(10px)"></div><div class="bl" style="left:220px;top:30px;width:40px;height:40px;border-radius:50%;background:#ffcf80;opacity:.7;filter:blur(10px)"></div>',
  cafe:'<div class="bl" style="left:40px;top:50px;width:380px;height:240px;background:linear-gradient(#f6f2e6,#d8e8f0);opacity:.7"></div><div class="bl" style="left:220px;top:50px;width:10px;height:240px;background:#6a4a2a;opacity:.6"></div><div class="bl" style="left:40px;top:40px;width:380px;height:22px;background:repeating-linear-gradient(90deg,#d84a3a 0 30px,#f6eedb 30px 60px);opacity:.7"></div><div class="bl" style="left:1080px;top:90px;width:120px;height:220px;background:#6a6a72;opacity:.45"></div><div class="bl" style="left:-40px;right:-40px;top:460px;height:110px;background:linear-gradient(#a8764a,#6a4428);opacity:.85"></div>',
  hotel:'<div class="bl" style="left:520px;top:-20px;width:420px;height:80px;border-radius:50%;background:#fff6cc;opacity:.75;filter:blur(14px)"></div><div class="bl" style="left:60px;top:40px;width:40px;height:520px;background:#c8a050;opacity:.6"></div><div class="bl" style="left:330px;top:40px;width:40px;height:520px;background:#c8a050;opacity:.6"></div><div class="bl" style="left:120px;top:110px;width:190px;height:360px;background:linear-gradient(90deg,rgba(220,240,255,.5),rgba(255,255,255,.15),rgba(220,240,255,.5));opacity:.8"></div><div class="bl" style="left:-40px;right:-40px;top:470px;height:100px;background:linear-gradient(#8a2a2a,#5a1a1a);opacity:.7"></div>'
};
/* 전환: 같은 겹이면 짧게 어두워졌다 밝아짐 · 픽셀↔일러스트는 바둑판 번짐(그림_방향 1-6) */
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function fxDraw(p,checker,cover){fxc.clearRect(0,0,32,18);
  if(!checker){fxc.globalAlpha=cover?p:1-p;R(fxc,'#0b0e1a',0,0,32,18);fxc.globalAlpha=1;return;}
  for(let y=0;y<18;y++)for(let x=0;x<32;x++){const t=(BAYER[y%4][x%4]+.5)/16;if(cover?t<p:t>=p)R(fxc,'#0b0e1a',x,y,1,1);}}
function tween(ms,fn,done){const t0=performance.now();const f=()=>{const p=Math.min(1,(performance.now()-t0)/ms);fn(p);if(p<1)setTimeout(f,16);else done();};f();}
/* ── 입은 옷에 따라 주인공 픽셀 색 (상점에서 산 옷이 지도·결산·앨범에 보임) ── */
const SUIT_PAL = [
  { T: '#1f2d6b', C: '#8c919b', c: '#6c7079', P: '#5f636b' },         // 0 기성 회색
  { T: '#a3263a', C: '#27367a', c: '#1a2658', P: '#1f2a5c' },         // 1 맞춤 남색
  { T: '#7a2a2a', C: '#4a5a6a', c: '#36444f', P: '#36444f' },         // 2 백화점 국산(진회)
  { T: '#c8a040', C: '#3a3f4a', c: '#272b33', P: '#272b33' },         // 3 이태리 수입(숯)
  { T: '#c8a040', C: '#c49a6a', c: '#9a7448', P: '#3a3f4a' }          // 4 명품 + 코트
];
function heroPal(tier) { PAL.hero_now = Object.assign({}, PAL.hero, SUIT_PAL[Math.max(0, Math.min(4, tier | 0))]); return 'hero_now'; }
function heroNow() { return heroPal(SH.suitTier(G.st)); }

/* ── 위 줄: 날짜 · 지금 칸(중간 판) 또는 한 주 그림(예전 판: 평일 세 칸 + 토·일) · 돈 · 체력 ── */
function slotChips(st, curSi) {
  // 11-13 대표님 '띠 없음' — 날짜 옆에 지금 칸 한 줄만(평일 · 점심)
  const s = SH.SLOTS[curSi] || SH.SLOTS[0]; return `<div class="nowline">${s.day === '평일' ? '평일' : '주말'} · ${s.k === 'eve' ? '밤' : s.k === 'sat' ? '토요일' : s.k === 'sun' ? '일요일' : s.ko}</div>`;
}
// 스트레스(피드백 45 · 11-13 대표님 '첫번째'): 체력 옆 막대 열 칸 · 70 · 80 · 100 금 · 누르면 쪽지
function stressLevel(v) { const R = SH.R; return v >= R.burnout_stress ? 'burn' : v >= R.stress_high ? 'high' : v >= R.rush_stress_min ? 'rush' : v <= R.ease_stress_max ? 'ease' : ''; }
function stressStat(st) {
  const v = st.s.stress, lv = stressLevel(v);
  const cells = Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(v / 10) ? 'on' : ''}${i === 7 || i === 8 || (i === 6 && st.mode === 'week' && SH.R.stress_mid != null) ? ' mk' : ''}"></i>`).join('');
  return `<div class="stat sx ${lv}" data-act="stress-info" title="스트레스 — 누르면 설명" style="margin-left:6px">${ic('stress')}<span class="sbar">${cells}</span><span class="val" style="font-size:max(15px,var(--fl))">${v}</span>${statFloat.d('s', 'stress', 'tdl')}</div>`;
}
const STRESS_NOW = () => { const T = SH.D.ui_lines.STRESS_NOW, o = { rush: SH.R.rush_stress_min, high: SH.R.stress_high, burn: SH.R.burnout_stress, burn_rep: -SH.R.burnout_rep };   /* 글 원본 = 04_시범/대사/화면_글.json */
  return Object.fromEntries(Object.keys(T).map(k => [k, SH.fillKeys(T[k], o)])); };
/* 111(11-14 대표님 '아주 약간 글이 넘쳐서 줄바꿈 되는 게 보기 싫음'): 설명 창은 이름 칸 · 글 칸 두 줄기 · 낱말 묶음(' · ' 사이)은 통째로만 넘어가고 · 두 줄이면 길이를 고르게(text-wrap: balance) */
function stressOverlay() {
  const st = G.st, lv = stressLevel(st.s.stress), R = SH.R, tk = SH.tickName(st);
  overlay(`<div class="box px setting stressnote"><h2>스트레스 ${st.s.stress}</h2><div class="sn">${stressOverlay.rows([
    ['지금', esc(STRESS_NOW()[lv])]].concat(st.wk && st.wk.hangover ? [['숙취', '어젯밤 술자리 — 오늘 업무 성공률 −10%']] : [], [
    ['쌓이면', (st.mode === 'week' && R.stress_mid != null ? [`${R.stress_mid} 업무 성공률 −${R.stress_mid_penalty}%`] : []).concat([`${R.rush_stress_min} 조급함`, `${R.stress_high} 업무 성공률 −15%`, '호감 오름 절반', `${R.burnout_stress} 번아웃`, `번아웃이면 다음 ${tk} 강제로 쉼`, `평판 −${-R.burnout_rep}`])],
    ['막대의 노란 줄', `${st.mode === 'week' && R.stress_mid != null ? R.stress_mid + ' · ' : ''}${R.rush_stress_min} · ${R.stress_high} 자리 — 여기를 넘으면 위 일이 생깁니다.`],
    ['올리는 것', ['영업', '리서치', '야근', '접대', '공부', '과제 실패']],
    ['내리는 것', ['쉼', '데이트', '술자리', '쇼핑', '운동', '골프', '점심 만남', `${tk}마다 조금`]]]))}</div>
    <div class="btn" data-act="ovl-close">닫기</div></div>`);
}
stressOverlay.rows = (rows) => rows.map(([k, v]) => `<b>${k}</b><p>${Array.isArray(v) ? v.map(t => `<span class="nb">${t}</span>`).join(' · ') : v}</p>`).join('');
// 체력 설명(11-14 대표님 '이건 기력이라고 하나? 스트레스 눌렀을 때처럼 설명이 필요')
stressOverlay.hp = function () {
  const st = G.st, R = SH.R, v = st.s.hp, tk = SH.tickName(st);
  overlay(`<div class="box px setting stressnote"><h2>체력 ${v}</h2><div class="sn">${stressOverlay.rows([
    ['지금', SH.D.ui_lines.HP_NOW[v <= 20 ? 'floor' : v <= 45 ? 'low' : 'ok']]].concat(st.mode === 'week' && R.hp_low != null ? [['낮으면', [`${R.hp_low} 아래 업무 성공률 −${R.hp_low_penalty}%`, `${R.hp_floor} 아래 −${R.hp_floor_penalty}%`, `${tk}마다 저절로 +${R.week_recover_hp}뿐`]]] : [], [
    ['0이 되면', ['쓰러짐', `병원비 ${SH.won(R.collapse_hospital)}`, `다음 ${tk}는 칸 절반을 쉼으로`, `${R.collapse_ruin_at}번 쓰러지면 거기서 끝`]],
    ['깎는 것', ['영업', '리서치', '야근', '술자리', '공부', '접대']],
    ['채우는 것', ['쉼(+15)', '운동', '점심']]]))}</div>
    <div class="btn" data-act="ovl-close">닫기</div></div>`);
};
function topBar(st, o) {
  o = o || {};
  const hp = Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(st.s.hp / 10) ? 'on' : ''}"></i>`).join('');
  const extra = '';
  return `<div class="top">
    <div class="date"><b>${o.date || SH.dateLabel(st)}</b><span>${o.sub || SH.subLabel(st)}${st.rank !== 'intern' ? ` · 평판 ${st.s.rep} · 멋 ${st.s.style}` : ''}</span></div>
    ${st.mode === 'week' ? slotChips(st, o.si == null ? st.si : o.si) : `<div class="slots"><div class="slot now">이번 ${SH.tickName(st)}</div><div class="slot">${(SH.RK[st.rank] || {}).name_ko || ''}</div></div>`}
    <div class="sp"></div>
    <div class="stat" title="돈">${ic('coin')}<span class="val">${SH.won(st.s.money)}</span>${statFloat.d('s', 'money', 'tdl')}</div>
    <div class="stat hx" data-act="hp-info" title="체력 — 누르면 설명" style="margin-left:6px;cursor:pointer">${ic('bolt')}<span class="hp">${hp}</span><span class="val" style="font-size:max(15px,var(--fl))">${st.s.hp}</span>${statFloat.d('s', 'hp', 'tdl')}</div>
    ${stressStat(st)}
    ${extra}
    <div class="btn sm" data-act="${o.rightAct || 'notebook'}" style="margin-left:6px" title="${o.right || '설정'}">${o.right || ic('gear', 3) + '<span class="tx">설정</span>'}</div></div>`;
}

/* ── 알림(토스트) ── */
let toastT = null;
function toast(list) {
  if (!list || !list.length) return;
  const el = document.getElementById('toast');
  const rows = list.filter(t => /^새 장소/.test(String(t))).length >= 2;   /* 143: 새 장소 알림이 둘 이상이면 한 줄에 하나씩(가운뎃점 없이) */
  el.classList.toggle('rows', rows);
  el.innerHTML = list.slice(0, 4).map(t => `<span>${String(t).replace(/♥/g, ic('heart', 2))}</span>`).join(rows ? '' : '<span class="mute">·</span>');
  paint(el); el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), list.some(t => /^새 장소/.test(String(t))) ? 6000 : 3000);   /* 112: 새 장소 알림은 길게 */
}

/* ── 글자 한 자씩 ── */
let typing = null;
const voiceHTML = (s) => esc(s).replace(/\(([^)]*)(\)|$)/g, '<span class="inner">($1$2</span>');   // 닫는 괄호 전(찍는 중)에도 속말 꼴
const innerVoice = (el) => { if (!/[(（]/.test(el.textContent)) return; el.innerHTML = esc(el.textContent).replace(/\(([^)]*)\)/g, '<span class="inner">($1)</span>'); };
function typeInto(el, text, done) {
  if (typing) clearInterval(typing.timer);
  const chars = [...text]; let i = 0; el.textContent = '';
  if (G.instant) { el.textContent = text; innerVoice(el); typing = null; done && done(); return; }
  typing = { el, text, done, timer: setInterval(() => { if (!el.isConnected) { clearInterval(typing.timer); typing = null; return; }   // 치는 중에 화면이 바뀌면(불러오기 등) 떨어진 칸에 계속 치지 않고 멈춤
    i++; const s = chars.slice(0, i).join(''); if (/[(（]/.test(s)) el.innerHTML = voiceHTML(s); else el.textContent = s; if (i >= chars.length) finishType(); }, 28) };
}
function finishType() { if (!typing) return false; clearInterval(typing.timer); const t = typing; typing = null; t.el.textContent = t.text; innerVoice(t.el); t.done && t.done(); return true; }

/* ── 화면 전환: 같은 겹은 짧게 어두워짐 · 픽셀↔일러스트는 바둑판 번짐 ── */
const fx = document.getElementById('fx'), fxc = pxCanvas(fx, 32, 18, 40);
let busy = false;
// 장소에 들어갈 때(피드백 48 · 목업 ㉠): 어두워졌다가 장소 이름이 잠깐 뜨고 밝아짐 · 누르면 바로 넘어감
function enterFx(name, sub, go) {
  if (G.instant) return go();
  sfx('door');   /* 131: 장소에 들어가는 문 소리 */
  const d = document.createElement('div'); d.className = 'enterfx'; d.innerHTML = `<b>${esc(name)}</b><small>${esc(sub)}</small>`;
  document.body.appendChild(d); let gone = false;
  const fire = () => { if (gone) return; gone = true; go(); setTimeout(() => d.classList.add('out'), 250); setTimeout(() => d.remove(), 650); };
  d.addEventListener('pointerdown', fire); setTimeout(fire, 420);
}
function transit(group, build) {
  if (G.instant || !G.group) { G.group = group; build(); return; }
  const checker = G.group !== group, ms = checker ? 220 : 110; busy = true;
  tween(ms, p => fxDraw(p, checker, true), () => { G.group = group; build(); tween(ms, p => fxDraw(p, checker, false), () => { fxc.clearRect(0, 0, 32, 18); busy = false; }); });
}

/* ── 겹침 판 (알림 · 수첩 · 계좌) ── */
function overlay(html, cls) {
  const o = document.getElementById('ovl');
  o.innerHTML = html ? `<div class="ovl ${cls || ''}">${html}</div>` : '';
  if (html) paint(o);
}

/* ── 창에 맞춤: 1280×720 무대를 비율 그대로 · 휴대폰에선 단추·글자를 44pt 이상으로 ── */
const stage = document.getElementById('stage'), wrapEl = document.getElementById('wrap');
/* 휴대폰을 세로로 든 채면 화면을 통째로 90° 돌려 가로로 띄움(돌려 달라는 안내 대신 · 화면 회전 잠금이어도 됨)
   — 손가락 기기(pointer:coarse)에서만 · 데스크톱 창은 그대로 · 누르기 좌표는 브라우저가 돌린 대로 맞춰 줌 */
// 폭 600 아래 세로 창도 휴대폰으로 봄(마우스로 잡히는 휴대폰 · 좁은 창 · 시험 사진) — 안 돌리면 글자 바닥값이 3배로 커져 화면이 넘침
const isRot = () => innerHeight > innerWidth && (innerWidth < 600 || matchMedia('(pointer:coarse)').matches);
function fit() {
  const rot = isRot(), de = document.documentElement;
  de.classList.toggle('rot', rot);
  if (rot) { de.style.setProperty('--rw', innerHeight + 'px'); de.style.setProperty('--rh', innerWidth + 'px'); }
  const cs = getComputedStyle(wrapEl), px = v => parseFloat(v) || 0;
  const W = (rot ? innerHeight : innerWidth) - px(cs.paddingLeft) - px(cs.paddingRight), H = (rot ? innerWidth : innerHeight) - px(cs.paddingTop) - px(cs.paddingBottom);
  // 높이 720 을 기준으로 논리 폭을 화면 비율에 맞춰 늘림(1280~1720) — 넓은 휴대폰 가로에서 양옆 검은 띠 없이 꽉 참
  const LW = Math.round(Math.min(1720, Math.max(1280, 720 * W / Math.max(1, H))));
  const k = Math.max(.1, Math.min(W / LW, H / 720)); stage.style.transform = `scale(${k})`;
  stage.style.width = LW + 'px';
  document.documentElement.style.setProperty('--W', LW + 'px');
  document.documentElement.style.setProperty('--dx', ((LW - 1280) / 2) + 'px');
  // 크기 변수 · 휴대폰 표시를 먼저 넣고 다시 그림(다시 그리는 화면이 tight 를 읽음 — 지도 기둥 폭 등)
  document.documentElement.style.setProperty('--u', (1 / Math.min(k, 1)).toFixed(3));
  const tight = k < .8, tightChanged = de.classList.contains('tight') !== tight;
  de.classList.toggle('tight', tight);
  const changed = (G.W && G.W !== LW) || (G.W && tightChanged); G.W = LW;
  // 지도에 있으면 주인공 자리를 지킴(map.js worldScreen 이 G.world.keep 을 읽음 — 전엔 켜는 곳이 없어 창 크기만 바꿔도 처음 자리로 돌아감)
  if (changed && G.world && document.getElementById('screen').className === 'k-map') G.world.keep = true;
  if (changed && G.redraw) G.redraw();
}
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 120)); fit();
/* 돌린 화면에서 옆으로 미는 줄(계획표 칸): 손가락은 화면 위아래로 움직이므로 그만큼 옆으로 밀어 줌 */
(() => {
  let box = null, y0 = 0, s0 = 0;
  addEventListener('touchstart', e => { box = isRot() && e.target.closest ? e.target.closest('.opts') : null; if (box) { y0 = e.touches[0].clientY; s0 = box.scrollLeft; } }, { passive: true });
  addEventListener('touchmove', e => { if (!box) return; const dy = e.touches[0].clientY - y0; if (Math.abs(dy) > 6) { e.preventDefault(); box.scrollLeft = s0 - dy; } }, { passive: false });
  addEventListener('touchend', () => { box = null; }, { passive: true });
})();
addEventListener('contextmenu', e => e.preventDefault());

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
