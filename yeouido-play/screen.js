/* 장난감 2판 화면 — 틀은 판 · 탭이 바뀔 때만 그리고, 틱마다는 숫자 · 차트 · 뉴스만 바꾼다. */
'use strict';
const { Game, T, N, ST, SRC, HOUSE, SHOP, CAR, PEOPLE, PLACE, REP, ACH, CAREER, DAYS, eraOf, dow } = Toy2;
const store = () => { try { return window.localStorage; } catch { return { getItem() { return null; }, setItem() { throw Error(); } }; } };
const IMG = window.IMG_BASE || 'res/그림/', art = f => IMG + f, face = id => IMG + '인물/' + id + '.png';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CAST = { yuna: '한유나', dasol: '윤다솔', chaerin: '도채린', garam: '문가람', baek: '백도진', taeo: '강태오', muyeol: '강무열', nuri: '차누리', haram: '오하람', seoyul: '진서율', ideun: '한이든', haeon: '서해온' };
const PERSON = { c_copy: 'dasol', c_clinic: 'chaerin', c_florist: 'garam', c_mall: 'baek', c_gym: 'muyeol', c_snack: 'haeon', c_venture: 'nuri', c_academy: 'haram', c_tower: 'seoyul', c_apt_a: 'ideun' };
const fullArt = (id, expression = 'base') => art(id === 'yuna' && expression !== 'base' ? (expression === 'proud' ? '임시_기본/yuna_proud.png' : '기준/yuna_' + ({ wink: '윙크', surprise: '놀람', worry: '걱정' }[expression] || '원본') + '.png') : ['yuna', 'dasol', 'chaerin', 'garam', 'taeo'].includes(id) ? '기준/' + id + '_원본.png' : '임시_기본/' + id + '.png');
const sceneArt = id => art((['bg_gosiwon', 'in_department_store', 'in_golf_club', 'in_courtroom', 'bg_hospital', 'bg_temple', 'bg_racetrack'].includes(id) ? '장난감2/' : '배경/') + id + '.jpg');
// 이 사본에 빠진 임시 그림은 기존 설정집으로 대신한다. 그림 파일은 바꾸지 않는다.
// 사람 카드 작은 그림 — 얼굴 그림(인물/ · 비서/) · 없으면 전신
const smallArt = c => c.who === 'yuna' ? art('비서/sec_base.png') : PEOPLE[c.id] ? face(PEOPLE[c.id].portrait) : fullArt(c.who);
const fallbackArt = src => { const id = src.match(/임시_기본\/([^/]+)\.png$/)?.[1]; return id ? (id === 'yuna_proud' ? fullArt('yuna') : art('설정집/' + id + '.png')) : null; };
document.addEventListener('error', e => { if (e.target.tagName !== 'IMG') return; const fallback = fallbackArt(e.target.getAttribute('src')); if (fallback) e.target.src = fallback; }, true);
let level = 'normal', person = 'yuna';
let g = Game.load(store()), sel = 's0', tab = 'home', timer = null, title = true, seen = 0;
const won = n => Math.round(n).toLocaleString('ko-KR'), M = n => { const a = Math.abs(n), sg = n < 0 ? '-' : ''; return a >= 1e12 ? sg + (a / 1e12).toFixed(2) + '조' : a >= 1e8 ? sg + (a / 1e8).toFixed(2) + '억' : sg + Math.round(a / 1e4).toLocaleString('ko-KR') + '만'; }, pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%', sc = x => x > 0 ? 'up' : x < 0 ? 'down' : '', stars = n => n ? '★'.repeat(n) : '☆';
const ic = n => `<i class="ic ic-${n}"></i>`;
const coachFace = (e = 'base') => art('비서/face_' + e + '.png');
const SEC = (e = 'base') => art('비서/sec_' + e + '.png'), SNAME = '한유나';
document.documentElement.style.setProperty('--icons', `url("${art('화면/icons.png')}")`);
function fit() { const w = innerWidth, h = innerHeight, k = Math.min(w / 1920, h / 1080); $('#stage').style.transform = `translate(${(w - 1920 * k) / 2}px,${(h - 1080 * k) / 2}px) scale(${k})`; }
addEventListener('resize', fit);
const save = () => g && g.save(store());
function on(sel2, fn) { $$(sel2).forEach(b => b.onclick = e => { e.stopPropagation(); fn(b.dataset, b); }); }
function act(a, p) { const ok = g.dispatch(a, p); save(); refresh(); return ok; }

/* ── 제목 ── */
/* 오프닝(타이틀 앞 · D-051 · 기획 02_설계/인트로_타이틀_1120.md) — 그림 한 장 + 한 줄 글 · 처음 켤 때 한 번 · 누르면 다음 컷 · SKIP · Esc 는 바로 타이틀 */
const OP_KEY = 'yeouido_opening_seen', opSeen = () => { try { return localStorage.getItem(OP_KEY) === '1'; } catch { return false; } };
function drawOpening(done) {
 const C = T.opening, mv = calMotion(); let i = -1, timer = null, typing = null, over = false;
 $('#over').innerHTML = '';
 $('#app').innerHTML = `<div class="op"><div class="op-cuts"></div><div class="op-band"></div><div class="op-lb t"></div><div class="op-lb b"></div><span class="op-date"></span><div class="op-line"></div><button class="sm op-skip">SKIP ▶▶</button><div class="op-dots">${C.map(() => '<i></i>').join('')}</div></div>`;
 const onKey = e => { if (e.key === 'Escape') end(); else if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); next(); } };
 const end = () => { if (over) return; over = true; clearTimeout(timer); clearInterval(typing); try { localStorage.setItem(OP_KEY, '1'); } catch { /* 저장을 못 해도 다음에 다시 흐를 뿐 */ } removeEventListener('keydown', onKey); done(); };
 const next = () => { if (over) return; clearTimeout(timer); clearInterval(typing); i++; if (i >= C.length) return end();
  const c = C[i], box = $('.op-cuts'), el = document.createElement('div'), old = [...box.children];
  const vid = !!(c.video && mv), me = i;   /* 영상 컷은 코드 움직임(mv-*)을 끔 — 영상이 움직임을 맡음 */
  el.className = 'op-cut' + (mv && !vid ? ' mv-' + c.move : ''); el.style.backgroundImage = `url('${art(c.img)}')`; el.style.setProperty('--sec', (c.sec + 1) + 's'); box.appendChild(el);
  if (vid) { const v = document.createElement('video'); v.muted = true; v.autoplay = true; v.playsInline = true; v.preload = 'auto'; v.src = art(c.video);
   const back = () => { v.remove(); if (i === me && !over) el.classList.add('mv-' + c.move); };   /* 못 불러오면 바탕 그림 + 코드 움직임으로 */
   v.onerror = back; v.onloadedmetadata = () => { if (i !== me || over || !(v.duration > 0)) return; clearTimeout(timer); timer = setTimeout(next, Math.max(c.sec, v.duration + 0.6) * 1000); };   /* 컷 길이 = 영상 길이 + 끝 장면에 잠깐 멈춤 */
   el.appendChild(v); v.play?.().catch(back); }   /* 컷 영상 — 소리 없음 · 한 번 재생 뒤 끝 장면에 멈춤(반복 안 함) · 움직임 줄이기면 그림만 */
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on'))); old.forEach(x => { x.classList.remove('on'); setTimeout(() => x.parentNode && x.parentNode.removeChild(x), 900); });
  $$('.op-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  $('.op-date').textContent = c.date || ''; const L = $('.op-line'), t = c.text || ''; let n = 0; L.textContent = '';
  if (t) typing = setInterval(() => { L.textContent = t.slice(0, ++n); if (n >= t.length) clearInterval(typing); }, 28);
  $('.op').classList.toggle('last', c.move === 'logo'); timer = setTimeout(c.move === 'logo' ? end : next, c.sec * 1000); };
 addEventListener('keydown', onKey);
 $('.op-skip').onclick = e => { e.stopPropagation(); end(); };
 $('.op').onclick = () => next();
 next();
}
function drawTitle(fromOp) {
 if (!fromOp && !drawTitle.shown && (!opSeen() || /[?&]opening\b/.test(location.search))) {   /* 주소 끝 ?opening 이면 언제든 오프닝부터 */ drawTitle.shown = true; return drawOpening(() => drawTitle(true)); }
 drawTitle.shown = true;
 const can = g && g.s.phase !== 'end';
 /* 새 타이틀(D-051) — 그림 + 로고 + PRESS ANY KEY → 누르면 메뉴(CONTINUE · NEW GAME · OPENING) · 오프닝 끝에서 로고가 내려앉으며 이어짐 */
 $('#app').innerHTML = `<div class="title ${fromOp ? 'from-op' : ''}" style="background-image:url('${art('화면/title_keyart.jpg')}')"><div class="shade"></div><div class="logo"><small>${esc(T.lines.sub)}</small><h1>${esc(T.lines.title)}</h1>
 <div class="t-press">PRESS ANY KEY</div><div class="tbtn t-menu" hidden>${can ? '<button class="big primary" id="resume">CONTINUE</button>' : ''}<button class="big ${can ? '' : 'primary'}" id="new">NEW GAME</button><button class="big" id="t-op">OPENING</button></div></div></div>`;
 $('#over').innerHTML = ''; tut();
 const open = e => { if (!title || !$('.t-menu') || !$('.t-menu').hidden) return; if (e && e.type === 'keydown') e.preventDefault(); $('.t-press').hidden = true; $('.t-menu').hidden = false; removeEventListener('keydown', open); sfx('page'); };
 addEventListener('keydown', open); $('.title').addEventListener('click', open);
 $('#new').onclick = () => { if (!can) return drawNew(); $('#over').innerHTML = `<div class="modal dark ask-new" data-k="ask-new"><h1>NEW GAME</h1><p>지금 판은 지워져요.</p><div class="mb"><button id="an-back">BACK</button><button class="primary" id="an-ok">OK</button></div></div>`; $('#an-back').onclick = () => { $('#over').innerHTML = ''; }; $('#an-ok').onclick = () => { $('#over').innerHTML = ''; drawNew(); }; };
 if ($('#resume')) $('#resume').onclick = () => { title = false; seen = 0; drawGame(); };
 $('#t-op').onclick = () => drawOpening(() => drawTitle(true));
}

/* ── 틀(STONKS 짜임: 위 띠 · 화면 전체 탭 · 아래 숫자 탭 — 목업 09_목업/장난감2_메인) ── */
const TABS_ALL = [['home', '홈'], ['market', '트레이딩'], ['rep', '평판'], ['senior', '비서'], ['people', '인맥'], ['stake', '회사']];   /* 자산 탭은 홈이 맡음(D-043) */
const stakeOpen = () => { const s = g.s; return !!s.firm || T.stocks.some(x => g.stake(x.id) > 0) || g.lvl('wealth') >= 2; };   /* 회사 탭은 첫 지분 · 투자회사 조건에 다가가면 열림(구조 제안 5-2) */
const visTabs = () => TABS_ALL.filter(([id]) => id !== 'stake' || stakeOpen());
const tabsHtml = () => visTabs().map(([id, n], i) => `<button class="tab ${g.s.uiNewTab === id ? 'nw' : ''}" data-tab="${id}"><em>${i + 1}</em>${n}</button>`).join('');
const SPEEDS = N.speeds.filter(n => n > 0);
let focusAll = false;
let facil = 'top', repSel = 'know', focus = null;
let bankAmt = 5e7, facilSel = {};   /* 자산 탭(단계 나눔) — 고른 금액 · 집 · 차 · 상가 */
const wkDate = s => { const d = new Date(DAYS[s.day] + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1 + (s.slot ? 1 : 0)); return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${'일월화수목금토'[d.getUTCDay()]}`; };   /* 주말엔 그 토 · 일 날짜(시험관 '금 · 토요일 어긋남') */
const SEASON = m => m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
function drawGame() {
 $('#app').innerHTML = `<div class="room" style="background-image:url('${art(HOUSE[g.s.house].bg)}')"></div><div class="mon">
 <header class="top"><div class="speed"><button class="tpp" id="pp" aria-label="PLAY / PAUSE"></button><button class="tspd" id="spd" aria-label="SPEED"><b></b><small>SPEED</small></button></div>
  <div class="cashbox"><div class="cash-main"><small>현금</small><b id="h-cash"></b></div><div class="cash-summary"><span id="h-worth"></span><span id="h-today"></span></div></div><div class="datebox"><i id="h-fill"></i><b id="h-date"></b><span id="h-clock"></span></div><div class="tmenu"><button class="tmenu-b" id="menu" aria-label="MENU">☰</button><div class="tmenu-pop" id="menupop" hidden><label><input type="checkbox" id="ap"> AUTO PAUSE · NEW DAY</label><label><input type="checkbox" id="newspause"> AUTO PAUSE · NEWS</label><button class="sm" id="to-title">TITLE</button></div></div></header>
 <button class="newsline" id="newsline"></button>
 <section id="pane"></section>
 <nav class="numtabs">${tabsHtml()}</nav></div>`;
 $('#pp').onclick = () => { if (g.s.phase !== 'open') return; g.dispatch('speed', g.s.speed ? 0 : (lastSpeed || 1)); save(); loop(); hud(true); };
 $('#spd').onclick = () => { const i = SPEEDS.indexOf(lastSpeed); lastSpeed = SPEEDS[(i + 1) % SPEEDS.length]; if (g.s.speed) { g.dispatch('speed', lastSpeed); save(); loop(); } hud(true); };   /* 속도는 단추 하나(D-041) — 누를 때마다 ×1 → ×16 */
 bindTabs();
 $('#menu').onclick = e => { e.stopPropagation(); $('#menupop').hidden = !$('#menupop').hidden; }; $('#menupop').onclick = e => e.stopPropagation(); $('#app').addEventListener('click', () => { if ($('#menupop')) $('#menupop').hidden = true; });
 $('#ap').checked = g.s.autopause; $('#ap').onchange = e => { g.dispatch('autopause', e.target.checked); save(); };
 $('#newspause').checked = g.s.newsPause !== false; $('#newspause').onchange = e => { g.s.newsPause = e.target.checked; save(); };
 $('#to-title').onclick = () => { g.dispatch('speed', 0); save(); title = true; loop(); drawTitle(); };
 $('#newsline').onclick = () => { if (tab !== 'market') { tab = 'market'; pane(); } mkSheet = 'news'; marketLive(true); hud(true); };
 seen = -1; clock = null; paneTab = tab; pane(); hud(true); phase(); loop(); timeCard();
}
function bindTabs() { on('[data-tab]', d => { tab = d.tab; mkSheet = null; if (g.s.uiNewTab === tab) { delete g.s.uiNewTab; $(`.numtabs [data-tab=${tab}]`)?.classList.remove('nw'); } if (tab === 'home') facil = 'top'; pane(); hud(true); }); }
function syncTabs() { const nav = $('.numtabs'); if (!nav) return; const ids = visTabs().map(t => t[0]).join(); if (nav.dataset.ids === ids) return; const fresh = !!nav.dataset.ids; nav.dataset.ids = ids; nav.innerHTML = tabsHtml(); bindTabs(); secBadge(); if (fresh && ids.includes('stake')) { floatUp('회사 탭', '', 'NEW', 'kN'); g.s.uiNewTab = 'stake'; } }
function refresh() { if (title) return; syncTabs(); if (g.s.uiRankDay?.day !== g.s.day) g.s.uiRankDay = { day: g.s.day, rank: g.rank() }; $('.room').style.backgroundImage = `url('${art(HOUSE[g.s.house].bg)}')`; pane(); hud(true); phase(); loop(); tut(); timeCard(); secBadge(); }

/* ── 숫자(틱마다) ── */
function hud(full) {
 if (title || !$('#h-date')) return; const s = g.s, nw = g.netWorth(), today = nw - s.dayStart;
 $('.mon').className = 'mon ' + SEASON(+DAYS[s.day].slice(5, 7)); homeRoom();
 $('#h-date').textContent = (s.phase === 'weekend' ? wkDate(s) : g.date()) + ' · ' + ({ spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' })[SEASON(+DAYS[s.day].slice(5, 7))]; $('#h-clock').textContent = s.phase === 'open' ? '' : s.phase === 'evening' ? '저녁' : s.phase === 'weekend' ? (s.slot ? '일요일' : '토요일') : s.phase === 'away' ? (s.away && s.away.kind === 'jail' ? '구치소' : '병원') : '끝';
 if (s.msgs[0]?.type === 'senior' && s.msgs[0].day != null) { $('#h-date').textContent = g.date(s.msgs[0].day); $('#h-clock').textContent = '저녁'; }   /* 저녁을 같이 한 뒤 귀띔 대화(E4) — 날은 아직 그날 밤 */
 $('#h-cash').textContent = M(s.cash) + ' 원'; const td = $('#h-today'); $('#h-worth').textContent = `순자산 ${M(nw)}`; td.textContent = `오늘 ${today >= 0 ? '+' : ''}${M(today)}`; td.className = sc(today);
 const open = s.phase === 'open', pp = $('#pp'), spd = $('#spd'); pp.textContent = s.speed ? 'Ⅱ' : '▶'; pp.classList.toggle('on', !!s.speed); pp.classList.toggle('off', !open); spd.querySelector('b').textContent = '×' + (lastSpeed || 1); spd.classList.toggle('off', !open || !s.speed);   /* 멈춘 동안은 흐리게(STONKS 아이콘 꼴) */
 $('#h-fill').style.width = (open ? Math.min(100, s.minute / N.minutes * 100) : s.phase === 'evening' || s.phase === 'weekend' ? 100 : 0) + '%';   /* 하루 진행 = 날짜 칸 바탕 채움(D-041) */
 $$('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
 const feed = s.shown.filter(f => f.day === s.day), nl = $('#newsline');
 if (feed.length !== seen) { const last = feed.at(-1);
  if (last) { nl.innerHTML = `${srcLabel(last)}<b class="${last.dir > 0 ? 'up' : 'down'}">${esc(last.head)}</b><em>오늘 뉴스 ${feed.length}건</em>`; if (seen >= 0) { nl.classList.remove('flash'); void nl.offsetWidth; nl.classList.add('flash'); } }
  else nl.innerHTML = '<em>아직 뉴스 없음</em>';
  seen = feed.length; if (tab === 'market') newsList(); }
 if (tab === 'market') marketLive(full); else if (tab === 'home') homeLive();
 tut();
}
function srcLabel(f) { const src = f.src ? SRC[f.src] : null; return src ? `<span class="src s${src.stars}">${esc(src.name)} ${stars(src.stars)}${g.lvl('know') >= 1 ? ' · ' + Math.round(src.accuracy * 100) + '%' : ''}</span>` : f.kind === 'tip' ? `<span class="src tipb">✉ 귀띔${f.insider ? ' · 내부' : ''}${g.lvl('know') >= 1 ? ' · ' + Math.round(f.acc * 100) + '%' : ''}</span>` : `<span class="src sys">${{ surprise: '속보', stake: '공시', era: '시대', confirm: '후속', denial: '후속', brief: '☕ 브리핑' }[f.kind] || '알림'}</span>`; }
const smellTag = f => f.kind === 'news' && f.real === false && g.has('i_smell') && [...String(f.id)].reduce((n, c) => n + c.charCodeAt(0), 0) % 2 === 0 ? '<span class="src smell">?</span>' : '';

/* ── 탭 ── */
function pane() {
 const P = $('#pane'); if (!P) return; const s = g.s; if ($('#menupop')) $('#menupop').hidden = true;   /* 화면이 바뀌면 ☰ 메뉴는 닫힘 */ P.className = 'tab-' + tab + (paneTab === tab ? '' : ' pane-in'); paneTab = tab; homeRoom(); if (tab !== 'senior') ysSheet = null; if (tab !== 'stake') { ksSheet = null; ksWin = null; }
 const nl0 = $('#newsline'); if (nl0) nl0.hidden = tab !== 'market';   /* 뉴스 띠는 트레이딩에서만(11-20 대표님 '딴 화면에선 빼자') — 다른 탭은 그만큼 판이 넓어짐 */
 const lv = id => g.lvl(id), nw = g.netWorth();
 if (tab === 'home') {
  /* 홈 — 내 장부(D-042 · D-043 · 목업 09_목업/홈장부_1120): 첫 화면엔 내 집 · 차 · 상가 · 빚 넷만 · 누르면 그 칸의 장(2단) → 작은 창(3단) · 유나는 얼굴 하나(누르면 비서 탭) */
  if (facil !== 'top') { drawFacil(P); return; }
  const shopTop = T.shops.filter(x => s.shops[x.id]).at(-1), shopN = T.shops.reduce((n, x) => n + (s.shops[x.id] || 0), 0), owe = s.debt + (s.baek.state === 'owe' ? s.baek.principal : 0);
  const tiles = [['house', 'MY HOME', HOUSE[s.house].bg, esc(HOUSE[s.house].name)], ['car', 'MY CAR', carArt(s.car), s.car !== 'none' ? esc(CAR[s.car].name) : '없음'],
   ['shop', 'MY SHOP', shopArt(shopTop?.id), shopN ? `${esc(shopTop.name)}${shopN > 1 ? ' 외' : ''}` : '없음'], ['bank', 'MY DEBT', '배경/in_client_office.jpg', `<span class="${owe ? 'hb-debt' : ''}">${owe ? M(owe) : '0'}</span>`]];
  P.innerHTML = `<div class="hb-goal"><span>TOP 100</span><b id="hm-rank"></b><i class="hb-bar"><i id="hm-bar"></i></i><span id="hm-rk-to"></span></div>
   <div class="home-chips"><span id="hm-stress"></span><span id="hm-susp"></span>${s.probe ? `<button class="sm" data-lawyer>변호사 선임 ${M(N.lawyer_cost)}</button>` : ''}</div>
   <div class="hb-book">${tiles.map(([k, n, img, v]) => `<button class="hb-tile" data-fa2="${k}"><span class="hb-pic" style="background-image:url('${art(img)}')"></span><span class="hb-cap"><small>${n}</small><b>${v}</b></span></button>`).join('')}</div>
   <button class="hb-face" id="hb-face" aria-label="5 비서"><img src="${coachFace(s.phase === 'evening' ? 'wink' : 'base')}" alt="${SNAME}"><i id="hb-dot" hidden></i></button>`;
  on('[data-fa2]', d => { facil = d.fa2; faSheet = null; pane(); });
  $('#hb-face').onclick = () => { tab = 'senior'; pane(); hud(true); secBadge(); };
  on('[data-lawyer]', () => act('lawyer')); homeLive(); return; }
 if (tab === 'market') {
  P.innerHTML = `<div class="mk-left"><button class="allbtn ${focusAll ? 'on' : ''}" data-all><span>전 종목 차트</span><i>›</i></button>${T.stocks.map(x => `<button class="mrow" data-row="${x.id}"><span class="nm"><b>${esc(x.name)}</b><i class="own-dot"></i></span><span class="pr" hidden></span><span class="ch"></span><span class="hq" hidden></span></button>`).join('')}</div>
  <div class="mk-mid"><div class="mk-bar"><b id="mk-clock"></b></div>
   <div class="mk-title"><button class="mk-name" data-mksheet="stock"><h2 id="c-name"></h2><i>›</i></button><small id="c-sub" hidden></small><b id="c-price"></b><span id="c-ch"></span></div><canvas id="chart" width="1040" height="600"></canvas><small class="muted" id="o-hint" hidden></small></div>
  <div class="mk-right"><div class="box"><b class="mk-onm" id="o-name"></b><div class="pos"><div><small>보유</small><b id="o-q"></b></div><div hidden><small>평균 단가</small><b id="o-avg"></b></div><div><small>손익</small><b id="o-pnl"></b></div><div hidden><small>지분</small><b id="o-stake"></b></div></div>
   <div class="btns"><div class="buyrow"><span>사기</span>${[0.1, 0.25, 0.5, 1].map(f => `<button class="buy" data-buyf="${f}">${f === 1 ? '전부' : f * 100 + '%'}</button>`).join('')}</div><div class="sellrow"><span id="sell-lab">팔기</span>${[0.1, 0.25, 0.5, 1].map(f => `<button class="sell" data-sellf="${f}">${f === 1 ? '전부' : f * 100 + '%'}</button>`).join('')}</div></div></div></div>`;
  $$('[data-row]').forEach(r => r.onclick = () => { sel = r.dataset.row; focusAll = false; $('[data-all]').classList.remove('on'); marketLive(true); });
  $('[data-all]').onclick = () => { focusAll = !focusAll; $('[data-all]').classList.toggle('on', focusAll); marketLive(true); };
  on('[data-buyf]', d => trade('buy', +d.buyf)); on('[data-sellf]', d => trade('sell', +d.sellf)); on('[data-mksheet]', d => { mkSheet = d.mksheet; marketLive(true); }); newsList(); marketLive(true); return; }
 if (tab === 'rep') { drawRep(P); return; }
 if (tab === 'facil') { tab = 'home'; pane(); return; }
 if (tab === 'senior') { drawSec(P); return; }
 if (tab === 'people') { drawPeople(P); return; }
 if (tab === 'stake') { drawStake(P); return; }
 if (tab === 'ach') { P.innerHTML = `<h2>업적 ${Object.keys(s.ach).length} / ${T.achievements.length}</h2><div class="achs">${T.achievements.map(a => `<div class="ach ${s.ach[a.id] ? 'got' : ''}"><b>${s.ach[a.id] ? '🏆' : '🔒'} ${esc(a.name)}</b><small>${esc(a.text)}</small></div>`).join('')}</div>`; return; }
}
function homeLive() {
 const s = g.s; if (!$('#hm-rank')) return;
 const rk = g.rank(), top = N.rich_count + 1; $('#hm-rank').textContent = rk + '위'; const idxv = T.stocks.reduce((n, x) => n + (s.delisted[x.id] ? 0.3 : g.price(x.id) / x.price), 0) / T.stocks.length, r100 = [...s.rich].sort((a, b) => b - a)[99] * (0.5 + 0.5 * idxv);
 $('#hm-rk-to').textContent = rk <= 100 ? 'IN' : `+${M(Math.max(0, r100 - g.netWorth()))}`;   /* 100위까지 모자란 돈(시험관 '101위면 싱거움') */ $('#hm-bar').style.width = Math.max(4, Math.min(100, (top + 50 - rk) / 50 * 100)) + '%';
 $('#hm-stress').textContent = '스트레스 ' + Math.round(s.stress);
 $('#hm-susp').textContent = '의심 ' + Math.round(s.susp);
 secBadge();
}
function homeRoom() {
 const room = $('.room'); if (!room) return;
 room.classList.toggle('home-room', tab === 'home');
 room.classList.toggle('home-night', tab === 'home' && g.s.phase !== 'open' && g.s.minute >= N.minutes);
 room.style.backgroundImage = `url('${art(HOUSE[g.s.house].bg)}')`;
 $('.mon').classList.toggle('at-home', tab === 'home');
}
function newsList() { const F = $('#feed'); if (!F) return; F.innerHTML = g.s.shown.filter(f => f.day === g.s.day).slice().reverse().map(f => `<button class="item ${f.kind} ${f.dir > 0 ? 'good' : 'bad'}" data-nf="${f.stock || ''}"><span class="t">${g.clock(f.t)}</span>${srcLabel(f)}${smellTag(f)}<b>${esc(f.head)}</b></button>`).join('') || '<p class="muted">아직 없음</p>'; on('[data-nf]', d => { if (d.nf) { sel = d.nf; focusAll = false; marketLive(true); } }); }
let lastSpeed = 1;
function marketLive(full) { const s = g.s; if (!$('#chart')) return;
 for (const x of T.stocks) { const r = $(`[data-row="${x.id}"]`), dl = s.delisted[x.id], p = g.price(x.id), ch = dl ? 0 : p / g.m.path[x.id][0] - 1, q = s.hold[x.id];
  r.classList.toggle('sel', x.id === sel && !focusAll); r.classList.toggle('dead', !!dl); r.classList.toggle('own', q > 0); r.classList.toggle('short', q < 0);
  r.querySelector('.pr').textContent = dl ? '상장폐지' : won(p); const c = r.querySelector('.ch'); c.textContent = dl ? '' : (ch >= 0 ? '▲' : '▼') + pct(ch); c.className = 'ch ' + sc(ch); r.querySelector('.hq').textContent = q ? (q < 0 ? '공매도 ' : '보유 ') + won(Math.abs(q)) + '주' : ''; }
 $('#mk-clock').textContent = '';   /* 장중 시계 뺌(D-050) */ mkSheetLive();
 const st = ST[sel], p = g.price(sel), dl = s.delisted[sel], ch = dl ? 0 : p / g.m.path[sel][0] - 1, q = s.hold[sel], pl = q > 0 ? q * (p - s.avg[sel]) : q < 0 ? -q * (s.avg[sel] - p) : 0;
 $('#c-name').textContent = focusAll ? '전 종목 — 오늘 등락' : st.name; $('#o-name').textContent = focusAll ? '' : st.name; $('.mk-name').disabled = focusAll; $('#c-sub').textContent = focusAll ? '선을 보다가 종목을 누르면 그 종목으로' : `${st.sector} · 하루 거래 ${won(st.turnover / 1e8)}억`; $('#c-price').textContent = focusAll ? '' : dl ? '상장폐지' : won(p) + '원'; const cc = $('#c-ch'); cc.textContent = focusAll || dl ? '' : (ch >= 0 ? '▲ ' : '▼ ') + pct(ch); cc.className = sc(ch);
 $('#o-q').textContent = q ? (q < 0 ? '공매도 ' : '') + won(Math.abs(q)) + '주' : '없음'; $('#o-avg').textContent = q ? won(s.avg[sel]) + '원' : '-'; const op = $('#o-pnl'); op.textContent = q ? (pl >= 0 ? '+' : '') + M(pl) : '-'; op.className = sc(pl); $('#o-stake').textContent = (g.stake(sel) * 100).toFixed(2) + '%'; { const pos = $('.mk-right .pos'); if (pos) { pos.classList.toggle('empty', !q); pos.classList.toggle('nostake', g.stake(sel) < 0.01); } }   /* 보유 없으면 '없음' 한 칸만 · 지분 1% 아래면 지분 칸 숨김(11-20 쉽게) */
 const shortable = q <= 0 && g.canShort(); $('#sell-lab').textContent = q > 0 ? '팔기' : shortable ? '공매도' : '팔기';
 $$('[data-buyf]').forEach(b => b.disabled = s.phase !== 'open' || dl || (q >= 0 && s.cash * +b.dataset.buyf < p)); $$('[data-sellf]').forEach(b => b.disabled = s.phase !== 'open' || dl || !(q > 0 || shortable));
 $('#o-hint').textContent = s.phase !== 'open' ? '장이 닫혀 있습니다' : `${st.name} · 절반 사면 밀림 ${pct(N.impact_k * s.cash * 0.5 / st.turnover)} · 팔 때 ${N.sell_cost * 100}%`;
 const cv = $('#chart'), c = cv.getContext('2d'), w = cv.width, h = cv.height; c.clearRect(0, 0, w, h); c.font = '15px sans-serif';
 /* 하루 한 점 선 · 지난 거래일(N.px_show) + 오늘 지금 값(D-050 · STONKS 차트 판) */
 const series = id => [...(s.px?.[id] || []).slice(-N.px_show), [s.day, g.price(id)]], K = Math.max(20, Math.min(N.px_show, (s.px?.[sel] || []).length) + 1),   /* 초반엔 칸을 점 수에 맞춰 늘려 감 */ X = i => 64 + (i + 0.5) / K * (w - 72);
 const grid = (lo, hi, y, fmtv, days) => { c.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, Y = y(v); c.strokeStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(64, Y); c.lineTo(w, Y); c.stroke(); c.fillText(fmtv(v), 2, Y + 5); }
  const off = K - days.length; [0, Math.floor(days.length / 3), Math.floor(days.length * 2 / 3)].forEach(k => { if (days[k] != null && k < days.length - 3) c.fillText(md(days[k]), X(off + k) - 20, h - 4); }); c.fillStyle = '#ffcf5a'; c.fillText('TODAY', X(K - 1) - 50, h - 4); };
 if (focusAll) { const all0 = T.stocks.map((x, k) => ({ x, k, d: s.delisted[x.id] ? [] : series(x.id) })), len = Math.max(...all0.map(z => z.d.length));
  const sr = all0.map(z => ({ ...z, v: z.d.map(p => p[1] / z.d[0][1] - 1) })), all = sr.flatMap(z => z.v), lo = Math.min(-0.02, ...all), hi = Math.max(0.02, ...all), y = r => h - 26 - (r - lo) / (hi - lo) * (h - 44);
  grid(lo, hi, y, pct, (sr.find(z => z.d.length === len)?.d || []).map(p => p[0]));
  c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(64, y(0)); c.lineTo(w, y(0)); c.stroke(); c.setLineDash([]);
  for (const z of sr) { if (z.v.length < 2) continue; const off = K - z.v.length; c.beginPath(); z.v.forEach((r, i) => i ? c.lineTo(X(off + i), y(r)) : c.moveTo(X(off + i), y(r))); c.strokeStyle = LINE[z.k]; c.lineWidth = 2.5; c.stroke(); c.fillStyle = LINE[z.k]; c.fillText(z.x.name, Math.min(w - 90, X(K - 1) + 6), y(z.v.at(-1)) + 5); } return; }
 if (dl) return;
 const d = series(sel), v = d.map(x => x[1]), o = g.m.path[sel][0] * s.extra[sel], lo = Math.min(...v, o) * 0.99, hi = Math.max(...v, o) * 1.01, y = x => h - 26 - (x - lo) / (hi - lo) * (h - 44), off = K - d.length;
 grid(lo, hi, y, won, d.map(x => x[0]));
 for (const f of s.shown.filter(f => f.day === s.day && f.stock === sel)) { c.fillStyle = '#ffcf5a'; c.fillText({ news: '📰', tip: '✉', denial: '✋', confirm: '✔', stake: '★' }[f.kind] || '⚡', X(K - 1) - 8, 15); }
 const up = v.at(-1) >= (v.length > 1 ? v.at(-2) : o), col = up ? '#ff5a5f' : '#4b8dff', gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, up ? 'rgba(255,90,95,.22)' : 'rgba(75,141,255,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
 if (v.length > 1) { c.beginPath(); v.forEach((x, i) => i ? c.lineTo(X(off + i), y(x)) : c.moveTo(X(off + i), y(x))); c.lineTo(X(K - 1), h - 26); c.lineTo(X(off), h - 26); c.closePath(); c.fillStyle = gr; c.fill();
  c.beginPath(); v.forEach((x, i) => i ? c.lineTo(X(off + i), y(x)) : c.moveTo(X(off + i), y(x))); c.strokeStyle = col; c.lineWidth = 3.5; c.stroke(); }
 c.beginPath(); c.arc(X(K - 1), y(v.at(-1)), 8, 0, 7); c.fillStyle = col; c.fill();
 if (s.minute < 1 && !s.speed) { c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '26px sans-serif'; c.fillText('▶ PLAY  ·  SPACE', w / 2 - 110, h / 2); c.font = '15px sans-serif'; }
 if (s.avg[sel] && q) { c.setLineDash([3, 5]); c.strokeStyle = '#ffcf5a'; c.beginPath(); c.moveTo(64, y(s.avg[sel])); c.lineTo(w, y(s.avg[sel])); c.stroke(); c.setLineDash([]); c.fillStyle = '#ffcf5a'; c.fillText('내 평균 단가', w - 110, y(s.avg[sel]) - 6); }
}
let mkSheet = null, mkLast = '';
function mkSheetHtml() { const s = g.s, today = s.shown.filter(f => f.day === s.day);
 const row = f => `<button class="mk-ni" data-mkgo="${f.stock || ''}" ${f.stock ? '' : 'disabled'}>${srcLabel(f)}<b class="${f.dir > 0 ? 'up' : f.dir < 0 ? 'down' : ''}">${esc(f.head)}</b><small>${f.stock ? esc(ST[f.stock].name) : ''}</small></button>`;
 if (mkSheet === 'news') return `<div class="mk-hd"><b>오늘 뉴스</b><small>${today.length}</small><button class="sm mk-x" data-mk-back>CLOSE ✕</button></div><div class="mk-list">${today.slice().reverse().map(row).join('') || '<p class="muted">없음</p>'}</div>`;
 const st = ST[sel], q = s.hold[sel], p = g.price(sel), pl = q > 0 ? q * (p - s.avg[sel]) : q < 0 ? -q * (s.avg[sel] - p) : 0, gt = s.gate[sel] ?? -1, mine = today.filter(f => f.stock === sel);
 return `<div class="mk-hd"><b>${esc(st.name)}</b><small>${esc(st.sector)}${st.small ? ' · 작은 종목' : ''}</small><button class="sm mk-x" data-mk-back>CLOSE ✕</button></div>
  <div class="mk-cells"><div><small>보유</small><b>${q ? (q < 0 ? '공매도 ' : '') + won(Math.abs(q)) + '주' : '없음'}</b></div><div><small>평균 단가</small><b>${q ? won(s.avg[sel]) : '-'}</b></div><div><small>평가 손익</small><b class="${sc(pl)}">${q ? (pl >= 0 ? '+' : '') + M(pl) : '-'}</b></div></div>
  <div class="mk-lad"><b>지분<em>${(g.stake(sel) * 100).toFixed(2)}%</em></b><div>${GATES.map(([i, n]) => `<span class="${gt >= i ? 'on' : ''}">${Math.round(N.stake_gates[i] * 100)}%<small>${n}</small></span>`).join('')}</div></div>
  <div class="mk-list">${mine.slice().reverse().map(row).join('') || '<p class="muted">오늘 소식 없음</p>'}</div>`; }
function mkSheetLive() { const P = $('#pane'); if (!P || tab !== 'market') return; let el = $('#mksheet');
 if (!mkSheet) { if (el) el.remove(); mkLast = ''; return; }
 if (!el) { el = document.createElement('div'); el.id = 'mksheet'; el.className = 'fa-sheet'; el.innerHTML = '<div class="fa-dim" data-mk-back></div><div class="db-wrap mk-win"></div>'; P.appendChild(el); mkLast = ''; }
 const h = mkSheetHtml(); if (h === mkLast) return; mkLast = h; el.querySelector('.mk-win').innerHTML = h;
 on('[data-mk-back]', () => { mkSheet = null; mkSheetLive(); });
 on('[data-mkgo]', d => { if (!d.mkgo) return; sel = d.mkgo; focusAll = false; mkSheet = null; marketLive(true); }); }
const LINE = ['#ff5a5f', '#7dffb0', '#4b8dff', '#ffd23c', '#ff7ae0', '#3ce0ff', '#ff9a3c', '#b48cff', '#a8ff3c', '#ffffff'];
function nwChart() { const cv = $('#nwchart'); if (!cv) return; const c = cv.getContext('2d'), w = cv.width, h = cv.height, d = g.s.hist; c.clearRect(0, 0, w, h); if (d.length < 2) return; const v = d.map(x => x.nw), lo = Math.min(...v), hi = Math.max(...v), y = x => h - 20 - (x - lo) / (hi - lo || 1) * (h - 40);
 c.beginPath(); v.forEach((x, i) => { const X = 60 + i / (v.length - 1) * (w - 70); i ? c.lineTo(X, y(x)) : c.moveTo(X, y(x)); }); c.strokeStyle = '#ffcf5a'; c.lineWidth = 3; c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '15px sans-serif'; c.fillText(M(hi), 2, 22); c.fillText(M(lo), 2, h - 16); }
function trade(side, f, id) { if (id) sel = id; const s = g.s, p0 = g.price(sel), q0 = s.hold[sel] || 0; if (!g.dispatch(side, [sel, f])) return; const t = s.lastTrade, moved = g.price(sel) / p0 - 1;
 if (s.uiTrades?.day !== s.day) s.uiTrades = { day: s.day, items: [] }; s.uiTrades.items.push({ at: hm(N.open + s.minute), id: sel, side, v: Math.round(Math.abs((s.hold[sel] || 0) - q0) * p0) });   /* 비서 탭 2단 '오늘 결산'의 TRADES — 그날만(D-045) */
 const coach = coachState(s); if (side === 'buy') coach.bought ||= sel; else if (coach.bought === sel) coach.sold = true;
 floatUp(t.pnl ? `${esc(ST[sel].name)} 팔기 · <b class="${sc(t.pnl)}">${t.pnl >= 0 ? '+' : ''}${M(t.pnl)}</b>` : `${esc(ST[sel].name)} ${side === 'buy' ? '사기' : s.hold[sel] < 0 ? '공매도' : '팔기'} · 밀림 ${pct(moved)}`, side, '₩'); save(); hud(true); phase(); }
function floatUp(html, cls, ic = '+', icls = '') {   /* 한 줄 알림(11-20 대표님 '이대로 넣어' · D-048 · 목업 09_목업/한줄알림_1120) — 오른쪽 아래 한 자리에 하나 · 새 것이 오면 앞 것은 밀려 사라짐 · 장을 멈추지 않음 · 그림 칸 + 짧은 글 */
 const fx = $('#fx'); if (!fx) return; fx.querySelectorAll('.toast').forEach(o => { o.classList.add('out'); setTimeout(() => o.remove(), 220); });
 const el = document.createElement('div'); el.className = 'toast ' + (cls === 'sys' ? 'sys' : '') + (tab === 'home' ? ' by-face' : ''); el.innerHTML = `<span class="ic ${icls}">${ic}</span><span>${html}</span>`; fx.appendChild(el);
 setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, 2600); }

/* ── 흐름 · 판 ── */
function loop() { clearInterval(timer); timer = null; if (title || g.s.msgs.length) return;
 if (g.s.phase === 'away') { timer = setTimeout(() => { g.dispatch('away'); save(); refresh(); }, 350); return; }
 if (g.s.phase !== 'open' || !g.s.speed) return;
 /* 하루를 빨리 흘림(D-050 · 피드백 13) — ×1 하루 N.day_ms · 한 번에 여러 분을 넘기되 한 분씩 tick(값 · 뉴스 · 귀띔 규칙 그대로) · 뉴스가 뜨면 그 분에서 멈춤 */
 let acc = 0;
 timer = setInterval(() => { const ph = g.s.phase; acc += N.minutes * N.frame_ms * g.s.speed / N.day_ms;
  while (acc >= 1 && g.s.phase === 'open' && !g.s.msgs.length) { acc--; const n0 = g.s.shown.length; g.tick();
   if (g.s.newsPause !== false && g.s.phase === 'open' && g.s.shown.slice(n0).some(f => ['news', 'tip', 'surprise', 'era', 'stake'].includes(f.kind))) { const f = g.s.shown.at(-1); if (f.stock && tab === 'market' && !focusAll && !g.s.hold[sel]) sel = f.stock; g.dispatch('speed', 0); save(); clearInterval(timer); timer = null; hud(true); floatUp(`${f.stock ? esc(ST[f.stock].name) + ' ' : ''}뉴스로 멈춤`, 'sys', 'Ⅱ', 'sys'); return; } }
  hud(); if (g.s.phase !== ph || g.s.msgs.length || g.s.day !== loop.day) { loop.day = g.s.day; save(); refresh(); } }, N.frame_ms); }
function phase() {
 const s = g.s, O = $('#over'); if (title) return; setTimeout(tut, 0);
 if (s.msgs.length) return msgBox(s.msgs[0]);
 if (s.phase === 'evening' && s.uiEveMore !== s.day) { O.innerHTML = ''; if (s.uiEveTab !== s.day) { s.uiEveTab = s.day; tab = 'senior'; pane(); hud(true); } return; }   /* 장 마감 뒤엔 비서 탭 대화에서 고름(E1 · E2) — 그날 한 번 비서 탭으로 */
 if (s.phase === 'evening') { const known = T.contacts.filter(p => s.contacts[p.id].known);
  O.innerHTML = `<div class="modal dark wide"><small>${esc(g.date())} · 저녁</small><h1>오늘 저녁은?</h1>
  <div class="opts"><button data-ev="senior"><img src="${SEC()}"><b>${SNAME} 비서와 저녁</b><small>관계 + · 내일 귀띔(${g.seniorLvl()}단계)</small></button>${g.seniorLvl() >= N.senior_paid_level ? `<button data-ev="paid"><img src="${SEC()}"><b>비서의 유료 분석</b><small>${M(N.senior_paid_cost)} · 내일 가장 크게 움직일 종목</small></button>` : ''}
  <button data-ev="pub"><span class="emo">🍺</span><b>호프집</b><small>소문 · 새 사람</small></button><button data-ev="rest"><span class="emo">🛋</span><b>집에서 쉬기</b><small>스트레스 −</small></button><button data-ev="study"><span class="emo">📚</span><b>공부</b><small>시장 지식 +</small></button></div>
  <h3>만날 사람</h3><div class="opts">${known.map(p => `<button data-ev="meet" data-who="${p.id}"><img src="${face(p.portrait)}"><b>${esc(p.name)}</b><small>${esc(T.roles[p.role].name)} · 관계 ${Math.round(s.contacts[p.id].rel)}${s.gift ? ' · 선물 있음' : ''}</small></button>`).join('')}</div></div>`;
  on('[data-ev]', d => meetEvening(d.ev, d.who));
  if (s.uiAppointment) { const b = s.uiAppointment === 'yuna' ? $('[data-ev=senior]') : $(`[data-who="${s.uiAppointment}"]`); if (b) { b.classList.add('on'); b.insertAdjacentHTML('beforeend', '<small>예약한 약속</small>'); } } return; }
 if (s.phase === 'weekend') {   /* 주말 — 지도에는 이름만 · 누르면 장소 카드(11-20 대표님 '단계로 쪼개' · STONKS 도시 지도 ss10) */
  const canGo = p => CAR[s.car].reach >= p.reach || (p.id === 'golf' && g.has('f_golf'));
  const P0 = wkPick && PLACE[wkPick];
  O.innerHTML = `<div class="modal dark map" data-k="weekend-${s.day}-${s.slot}"><small>${s.slot ? 'SUNDAY' : 'SATURDAY'}</small><h1>어디로 갈까?</h1><div class="wmap" style="background-image:url('${art('지도/map_yeouido.jpg')}')">
  ${T.places.map((p, i) => `<button class="wpin ${canGo(p) ? '' : 'lock'} ${p.id === wkPick ? 'on' : ''}" style="left:${[18, 50, 80, 26, 62, 86, 40][i]}%;top:${[30, 62, 22, 74, 36, 66, 48][i]}%" data-pl="${p.id}"><b>${canGo(p) ? '' : '🔒 '}${esc(p.name)}</b></button>`).join('')}
  ${P0 ? `<div class="wcard ${[18, 50, 80, 26, 62, 86, 40][T.places.findIndex(x => x.id === wkPick)] > 55 ? 'left' : ''}" ${P0.bg ? `style="background-image:url('${art(P0.bg)}')"` : ''}><div class="wc-in"><b>${esc(P0.name)}</b><span>${esc(canGo(P0) ? P0.text : '차가 있어야 ' + '●'.repeat(P0.reach))}</span><div class="wc-chips">${P0.cost ? `<i>−${M(P0.cost)}</i>` : ''}<i class="calm">스트레스 ${P0.stress}</i></div><div class="wc-bts"><button data-wk-back>BACK</button><button class="primary" data-wk-go ${canGo(P0) ? '' : 'disabled'}>GO ▶</button></div></div></div>` : ''}</div></div>`;
  on('[data-pl]', d => { wkPick = d.pl; phase(); });
  on('[data-wk-back]', () => { wkPick = null; phase(); });
  on('[data-wk-go]', () => { const id = wkPick; wkPick = null; place(id); }); return; }
 if (s.phase === 'away') { const a = s.away; O.innerHTML = `<div class="modal dark"><img class="hero" src="${art(a.kind === 'jail' ? '장난감2/in_courtroom.jpg' : '장난감2/bg_hospital.jpg')}"><h1>${a.kind === 'jail' ? '구치소' : '입원'} — ${a.total - a.left} / ${a.total}일</h1><p>${esc(g.date())} · 장은 계속 열립니다. 주식은 손댈 수 없습니다.</p><p>순자산 ${M(g.netWorth())}</p></div>`; return; }
 if (s.phase === 'end') return drawEnding();
 O.innerHTML = '';
}
function place(id) { if (id === 'home') return placeGo(id); enterFx(PLACE[id].name, g.s.slot ? '일요일' : '토요일', () => placeGo(id)); }
function placeGo(id) { const s = g.s;
 if (id === 'race') return raceBox(); if (id === 'temple') return templeBox(); if (id === 'golf') { const gk = T.contacts.filter(p => p.golf && s.contacts[p.id].known); if (gk.length > 1) return golfBox(gk); }
 const before = s.stress; act('weekend', [id]); floatUp(`${esc(PLACE[id].name)} · 스트레스 ${Math.round(s.stress - before)}`, 'sell'); }
function raceBox() { const s = g.s; $('#over').innerHTML = `<div class="modal dark"><img class="hero" src="${art('장난감2/bg_racetrack.jpg')}"><h1>경마공원</h1><p>말 하나에 겁니다. 현금 ${M(s.cash)}</p><div class="opts">${T.horses.map((h, i) => `<button data-h="${i}"><b>${esc(h.name)}</b><small>배당 ${h.odds}배</small></button>`).join('')}</div>
 <div class="bankrow"><span>건 돈</span>${[1e6, 1e7, 5e7, 1e8].map(a => `<button class="sm" data-amt="${a}" ${s.cash < a ? 'disabled' : ''}>${M(a)}</button>`).join('')}</div><p id="race-pick" class="muted">말을 고르고 건 돈을 누르세요</p><button class="ghost" id="skip">구경만 하기</button></div>`;
 let horse = null; on('[data-h]', (d, b) => { horse = +d.h; $$('[data-h]').forEach(x => x.classList.toggle('on', x === b)); $('#race-pick').textContent = T.horses[horse].name + ' — 얼마?'; });
 on('[data-amt]', d => { if (horse == null) return; const r = g.bet(horse, +d.amt); if (!r) return; g.dispatch('weekend', ['race']); save(); $('#over').innerHTML = `<div class="modal dark"><img class="hero" src="${art('장난감2/bg_racetrack.jpg')}"><h1>${r.win === horse ? '🎉 맞혔다!' : '아깝다'}</h1><p>1등 ${esc(T.horses[r.win].name)} · ${r.got ? '+' + M(r.got) + ' 원' : '−' + M(+d.amt) + ' 원'}</p><button class="primary" id="ok">계속</button></div>`; $('#ok').onclick = () => refresh(); });
 $('#skip').onclick = () => act('weekend', ['race']); }
function templeBox() { const s = g.s; $('#over').innerHTML = `<div class="modal dark"><img class="hero" src="${art('장난감2/bg_temple.jpg')}"><h1>산사</h1><p>마음을 비운다 · 스트레스 크게 −. 시주하면 자선 · 윤리가 오릅니다.</p><div class="bankrow"><span>시주</span><button data-don="0">안 함</button>${[1e6, 1e7, 1e8].map(a => `<button data-don="${a}" ${s.cash < a ? 'disabled' : ''}>${M(a)}</button>`).join('')}</div></div>`; on('[data-don]', d => act('weekend', ['temple', +d.don])); }
function golfBox(list) { $('#over').innerHTML = `<div class="modal dark"><img class="hero" src="${art('장난감2/in_golf_club.jpg')}"><h1>골프장 — 누구와?</h1><div class="opts">${list.map(p => `<button data-gp="${p.id}"><img src="${face(p.portrait)}"><b>${esc(p.name)}</b><small>${esc(T.roles[p.role].name)}</small></button>`).join('')}</div></div>`; on('[data-gp]', d => act('weekend', ['golf', d.gp])); }
function msgBox(m) {
 if (m.type === 'scene') return drawScene(m);
 logTalk(m);
 if (m.type === 'month') return drawMonth(m);
 if (m.type === 'senior') { $('#over').innerHTML = ''; if (tab !== 'senior') { tab = 'senior'; pane(); } return; }
 if (m.type === 'ach') { $('#over').innerHTML = ''; floatUp(`업적 · ${esc(ACH[m.id].name)}`, '', '★', 'kA'); return act('msgdone'); }   /* 업적은 큰 창 대신 한 줄(D-048 · 구조 제안 5-4 작은 보상) */   /* 저녁을 같이 한 뒤 귀띔은 비서 탭 대화로(E4) */
 const O = $('#over'), s = g.s, P = m.who ? PEOPLE[m.who] : null, done = () => act('msgdone'); let h = '', btns = `<button class="primary" id="ok">OK</button>`;
 /* 큰 소식 창(11-20 대표님 '이대로 넣어' · '유나 그대로' · D-047 · 목업 09_목업/큰소식_1120) — 지금 화면 위를 어둡게 · 왼쪽 유나 반신 · 오른쪽 창 하나(꼬리표 · 제목 · 값 · 유나 한 마디) · 설명 문장은 유나 대사로(D-020) */
 const pic = P ? fullArt(PERSON[P.portrait] || 'hero') : '';
 const who = (sub, txt) => P ? `<div class="bn-who"><i style="background-image:url('${pic}')"></i><div><b>${esc(P.name)}</b><small>${sub}</small></div></div>${txt ? `<div class="bn-q">${txt}</div>` : ''}` : '';
 const kv = (k, v, c = '') => `<div class="bn-kv"><span>${k}</span><b class="${c}">${v}</b></div>`;
 const head = (tag, face, body, say) => `<div class="bn-wrap" data-k="${m.type}-${m.who || ''}-${s.msgs.length}-${s.day}"><div class="bn-clip"><img class="bn-yuna" src="${fullArt('yuna', face)}" alt="${SNAME}"></div><div class="bn msg"><div class="bn-tag">${tag}</div><div class="bn-bd">${body}${say ? `<div class="bn-say"><b>유나</b><span>${say}</span></div>` : ''}<div class="mb bn-mb" id="mb"></div></div></div></div>`;
 const rel = P ? `${esc(T.roles[P.role].name)} · 관계 ${Math.round(s.contacts[P.id]?.rel || 0)}` : '';
 switch (m.type) {
  case 'hello': h = head('HELLO', 'wink', `<h2>${SNAME} 비서</h2>`, esc(T.coach.first[0].say)); break;
  case 'call': h = head('CALL', 'base', who(rel, '"오늘 저녁 한잔 어때?"'), `${esc(P.name)} 님이 오늘 한잔하자시네요.`); btns = `<button class="primary" id="y">좋지</button><button id="n">오늘은 안 돼</button>`; break;
  case 'tip': h = head('TIP', m.insider ? 'worry' : 'base', (P ? who(rel, '') : `<h2>옆자리 손님</h2>`) + `<div class="bn-q">"${esc(ST[m.stock].name)}, ${m.dir > 0 ? '내일 좋은 소식 있을 거야' : '조만간 안 좋은 게 터져'}"</div>`, m.insider ? '이건 내부 정보예요. 이걸로 크게 벌면 감독원이 봐요.' : '내일 장중 뉴스에 ✉ 로 떠요.'); break;
  case 'talk': h = head('MESSAGE', 'base', who(rel, esc(m.text)), ''); break;
  case 'intro': h = head('NEW CONTACT', 'base', who(`${esc(T.roles[P.role].name)}${P.stock ? ' · ' + esc(ST[P.stock].name) : ''}`, ''), `${m.by ? esc(PEOPLE[m.by].name) + ' 님이 소개해 줬어요. ' : ''}인맥 탭에 있어요.`); break;
  case 'stake': h = head('STAKE', m.gate >= 3 ? 'wink' : 'surprise', `<h2>${esc(ST[m.stock].name)} 지분 ${Math.round(N.stake_gates[m.gate] * 100)}%</h2><div class="ks2-lad">${GATES.map(([i, n]) => `<div class="${i < m.gate ? 'on' : i === m.gate ? 'on bn-now' : ''}">${Math.round(N.stake_gates[i] * 100)}%<small>${n}</small></div>`).join('')}</div>`,
   ['공시 나갔어요. 이제 따라 사는 사람들이 붙어요.', '이제 분기마다 주총 초대장이 와요.', '이사 자리예요. 달마다 급여가 나와요.', '경영권이에요! 회사 탭에서 방침을 정하시면 돼요.'][m.gate]); break;
  case 'agm': { const cur = s.policy[m.stock]; h = head('AGM', 'base', `<h2>${esc(ST[m.stock].name)} 주주총회</h2>`, m.ceo ? '경영권이 있으니 사장님이 정하시면 돼요.' : '안건은 배당이에요. 사장님 표도 힘이 돼요.');
   btns = Object.entries(POL).map(([k, n]) => `<button data-pol="${k}">${n}${m.ceo && cur === k ? ' ✓' : ''}</button>`).join(''); break; }
  case 'warn': h = head('NOTICE', 'worry', '<h2>금융감독원 편지</h2>', '최근 거래를 보고 있대요. 당분간 조심하세요.'); break;
  case 'probe': h = head('NOTICE', 'worry', '<h2>조사 시작</h2>', '감독원이 조사를 시작했어요. 홈에서 변호사를 선임하면 가벼워져요.'); break;
  case 'verdict': h = head('VERDICT', 'worry', `<h2>${m.kind === 'jail' ? '구속' : '벌금'}</h2>${m.kind === 'jail' ? kv('구치소', m.days + '일') : kv('벌금', M(m.fine), 'dn')}`, m.kind === 'jail' ? '그동안 장은 계속 열려요. 기다릴게요.' : '이번엔 벌금으로 끝났어요.'); break;
  case 'sick': h = head('EVENT', 'worry', `<h2>쓰러졌다</h2>${kv('입원', m.days + '일')}${kv('병원비', M(N.hospital_cost), 'dn')}`, '사장님… 이번엔 꼭 쉬세요.'); break;
  case 'delist': h = head('DELIST', 'worry', `<h2>${esc(ST[m.stock].name)} 상장 폐지</h2>${m.lost ? kv('사라진 주식', won(m.lost) + '주', 'dn') : ''}`, m.lost ? '가지고 계셨던 게 휴지가 됐어요…' : '작은 종목 하나가 시장에서 사라졌어요.'); break;
  case 'scam': h = head('CALL', 'base', '<h2>모르는 번호</h2><div class="bn-q">"사장님, 내일 확실히 오르는 종목 있습니다. 회비만 보내 주시면…"</div>', ''); btns = `<button id="y">믿어 본다</button><button class="primary" id="n">끊는다</button>`; break;
  case 'event': h = head('EVENT', 'surprise', `<div class="bn-q">${esc(m.text)}</div>`, ''); break;
  case 'week': h = head('THIS WEEK', m.pnl >= 0 ? 'wink' : 'worry', `<small class="wk-d">${esc(md(m.from))} ~ ${esc(md(s.day))}</small><b class="wk-big ${m.pnl >= 0 ? 'up' : 'dn'}">${m.pnl ? (m.pnl > 0 ? '+' : '−') + M(Math.abs(m.pnl)) : '±0'}</b><div class="wk-ln">${g.rank()}위 · 거래 ${m.trades}회${m.tips ? ` · 유나 귀띔 ${m.tips}번 맞음` : ''}</div>`, m.pnl >= 0 ? '한 주 고생하셨어요, 사장님.' : '이번 주는 쉽지 않았네요. 다음 주엔 같이 만회해요.'); btns = `<button class="primary" id="ok">NEXT ▶</button>`; break;   /* 금요일 장 마감 — 이번 주(D-050 · 큰 소식 창 꼴 D-047) */
  case 'year': case 'inst': { const ch = g.instChoices(), title = m.type === 'year' ? `<small>${m.year} REPORT</small><b class="yr-big">INSTINCT +1</b><div class="yr-sum">순자산 <em>${M(m.nw)}</em> · RANK <em>${m.rank}위</em></div>` : `<small>${m.why === 'rank' ? 'RANK ' + m.th : 'ACHIEVEMENT'}</small><b class="yr-big">INSTINCT +1</b>`;
   h = `<div class="modal dark msg yr" data-k="${m.type}-${s.day}-${s.msgs.length}">${title}${ch.length ? `<div class="yr-picks">${ch.map(n => { const b = g.instNode(n.id).b; return `<button class="yr-pc" data-pick="${n.id}" style="--bc:${b.color}"><span class="yr-bh"><span class="it-bi" style="background:${b.color}">${b.icon}</span><small>${esc(b.name)}</small></span><b>${esc(n.name)}</b><span>${esc(n.line)}</span></button>`; }).join('')}</div>` : ''}<div class="mb" id="mb"></div></div>`;
   btns = `<button id="yr-later">LATER</button><button id="yr-tree">TREE</button>`; break; }
  default: h = head('NOTICE', 'base', `<h2>${esc(m.type)}</h2>`, '');
 }
 O.innerHTML = h; $('#mb').innerHTML = btns;
 if ($('#ok')) $('#ok').onclick = done;
 if (m.type === 'call') { $('#y').onclick = () => act('call', [true, m.who]); $('#n').onclick = () => act('call', [false, m.who]); }
 if (m.type === 'scam') { $('#y').onclick = () => act('scam', true); $('#n').onclick = () => act('scam', false); }
 if (m.type === 'agm') on('[data-pol]', d => act('agm', [m.stock, d.pol]));
 if (m.type === 'year' || m.type === 'inst') { on('[data-pick]', d => { g.dispatch('learn', d.pick); sfx('page'); done(); }); $('#yr-later').onclick = done; $('#yr-tree').onclick = () => { tab = 'rep'; done(); }; }
}

/* ── 비서가 이끄는 첫걸음 — 「상한가」 코치 꼴(화면을 어둡게 · 짚는 칸만 밝힘 · 번호 · 다음 ▶) ── */
const goodToday = s => s.shown.filter(f => f.day === s.day && (f.kind === 'news' || f.kind === 'tip') && f.dir > 0);
/* 안내 상태는 화면에서만 더하며 그대로 판 저장에 들어간다. */
function coachState(s) {
 if (!s.uiCoach) s.uiCoach = { first: s.tut === 99 || s.day > 0 ? T.coach.first.length : 0, seen: {}, off: false };
 s.uiCoach.seen ||= {};
 return s.uiCoach;
}
function takeCoach(s, id) {
 const c = coachState(s);
 if (c.off || c.seen[id]) return false;
 c.seen[id] = true;
 return true;
}
function laterReady(id, s, currentTab, choosing) {
 const m = s.msgs[0]?.type, clear = !s.msgs.length;
 if (id === 'choice') return choosing;
 if (id === 'month') return m === 'month';
 if (id === 'year') return m === 'year';
 if (id === 'susp') return m === 'warn' || (clear && s.susp >= N.susp_warn);
 if (!clear) return false;
 if (id === 'evening') return s.phase === 'evening';
 if (id === 'weekend') return s.phase === 'weekend';
 if (id === 'tip') return currentTab === 'market' && s.shown.some(f => f.day === s.day && f.kind === 'tip');   /* 짚는 뉴스 띠가 트레이딩에만 있음 */
 if (id === 'speed') return s.day === 1 && s.phase === 'open';
 return id.startsWith('tab_') && s.phase === 'open' && currentTab === id.slice(4);
}
function coachHole(r, sr, k, W, H) {
 const x = Math.max(6, Math.min(W - 6, (r.left - sr.left) / k - 8));
 const y = Math.max(6, Math.min(H - 6, (r.top - sr.top) / k - 8));
 return { x, y, w: Math.max(0, Math.min(W - 6, (r.right - sr.left) / k + 8) - x), h: Math.max(0, Math.min(H - 6, (r.bottom - sr.top) / k + 8) - y) };
}
let tutShown = null, laterActive = null;
function tut() {
 let el = $('#tut'); if (!el) { el = document.createElement('div'); el.id = 'tut'; $('#stage').appendChild(el); }
 const hide = () => { el.innerHTML = ''; el.className = ''; tutShown = null; };
 if (title || !g) { laterActive = null; hide(); return; }
 const s = g.s, c = coachState(s), choosing = !!$('.scene-ch');
 if (c.off || $('.tcard, .calfx:not(.out)')) { hide(); return; }   /* 시간 카드 · 일력이 떠 있는 동안 안내는 숨음 */
 if (laterActive && !laterReady(laterActive.id, s, tab, choosing)) laterActive = null;
 let st = null, first = false;
 // 거래를 마치지 못했어도 장 마감 뒤에는 저녁 안내로 이어진다.
 if (s.phase !== 'open' && c.first < T.coach.first.length) c.first = T.coach.first.length - 1;
 // 장면의 첫 선택은 첫 거래 안내보다 먼저 만날 수도 있다.
 if (!s.msgs.length && c.first < T.coach.first.length && (s.phase === 'open' || c.first === T.coach.first.length - 1)) {
  const done = { market: () => tab === 'market', play: () => s.speed > 0 || goodToday(s).length > 0,
   buy: () => !!c.bought, sell: () => !!c.sold };
  while (T.coach.first[c.first] && done[T.coach.first[c.first].id]?.()) c.first++;
  st = T.coach.first[c.first]; first = !!st;
  if (st?.tab && tab !== st.tab) { tab = st.tab; pane(); hud(true); }   /* 탭 둘러보기(11-20 대표님 '이 게임이 뭔지 · 각 탭이 뭔지부터') — 그 탭을 직접 열어 보여 줌 */
  if (st?.id === 'buy' && (!goodToday(s).length || s.speed || tab !== 'market')) st = null;
  if (st?.id === 'buy') c.seen.tip = true;   /* 첫 거래가 귀띔 안내를 겸함 — 튜토리얼 뒤에 또 안 뜸 */
  if (st?.id === 'sell' && tab === 'market' && c.bought && g.price(c.bought) <= s.avg[c.bought] * (1 + N.sell_cost + 0.03)) st = { id: 'sell_wait', target: '#pp', face: st.face, title: '조금만 더 지켜봐요', say: '값이 더 오르면 팔아 볼게요. 위 ▶ 로 흐름을 보세요.', act: true };   /* NEXT 없음 — 누르면 팔기 걸음을 건너뜀(11-20 끝까지 점검) · 장이 닫히면 마지막 걸음으로 */   /* 기다리는 동안 끊긴 것처럼 보이지 않게(11-20 대표님 '그 뒤로 튜토리얼이 더 뜨지 않음') */
  else if (st?.id === 'sell' && (tab !== 'market' || !c.bought)) st = null;   /* 귀띔 소식이 값에 실린 뒤에(시험관 '+0.8% 에서 팔라 해 귀띔 뜻이 무너짐') */   /* 안내대로 팔면 이익이 나게(시험관 '팔았는데 −4만') */
  if (st && ['buy', 'sell'].includes(st.id)) {
   sel = st.id === 'buy' ? (goodToday(s).find(f => f.kind === 'tip') || goodToday(s).at(-1)).stock : c.bought; focusAll = false;
   if (s.speed) { g.dispatch('speed', 0); loop(); }
   marketLive(true);
  }
 }
 if (!st) {
  first = false;
  if (['s0100', 's0101', 's0102'].includes(g.s.msgs[0]?.id)) { hide(); return; }   /* 유나를 만나기 전(회상 · 백 여사 · 고시원 장면)엔 코치 창을 안 띄움 */
  st = laterActive || T.coach.later.find(x => !c.seen[x.id] && laterReady(x.id, s, tab, choosing) &&
   (x.id === 'choice' || c.first >= T.coach.first.length) && $$(x.id === 'susp' && !s.msgs.length ? '#hm-susp' : x.target).some(e => e.offsetParent));
  if (st && !laterActive && takeCoach(s, st.id)) { laterActive = st; save(); }
 }
 if (!st || (g.storyPending() && st.id !== 'choice')) { hide(); return; }
 const target = st.id === 'susp' && !s.msgs.length ? '#hm-susp' : first && st.tab ? '#pane' : st.target;
 const tgt = target ? $$(target).find(x => x.offsetParent) : null;
 if (target && !tgt) { hide(); return; }
 const key = (first ? 'first_' : 'later_') + st.id;
 const stage = $('#stage'), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth;
 const W = stage.offsetWidth, H = stage.offsetHeight;
 const hole = tgt ? coachHole(tgt.getBoundingClientRect(), sr, k, W, H) : null;
 if (tutShown !== key) {
  tutShown = key; save();
  const total = first ? `<span class="tn">${c.first + 1} / ${T.coach.first.length}</span>` : '';   /* 제목 앞 번호 · 튜토리얼 끄기는 뺌(11-20 대표님) */
  const inner = `<div class="chead"><b>${esc(st.title)}</b>${total}</div><p>${esc(st.say)}</p><div class="cbtns">${st.act ? '' : '<button class="btnp" id="tutok">NEXT</button>'}</div>`;
  const keep = [...el.querySelectorAll('.cdim, .chole, .cbox')].map(x => x.style?.cssText || '');   /* 앞 걸음의 덮개 · 짚는 칸 · 창 자리 */
  el.innerHTML = `<div class="cdim"></div><div class="cdim"></div><div class="cdim"></div><div class="cdim"></div><div class="chole"></div><div class="cbox"><img class="cface" src="${coachFace(st.face)}" alt=""><div class="cin swap">${inner}</div></div>`;
  if (keep.some(Boolean)) { [...el.querySelectorAll('.cdim, .chole, .cbox')].forEach((x, i) => { if (keep[i] && x.style) x.style.cssText = keep[i]; }); void el.offsetWidth; }   /* 앞 자리에서 새 자리로 옮겨 가고 글은 서서히(11-20 대표님 '딱딱 넘어감') */
  if ($('#tutok')) $('#tutok').onclick = () => { if (first) { const cur = T.coach.first[c.first]; if (cur?.tab) c.seen['tab_' + cur.tab] = true; c.first++; } else laterActive = null; save(); tutShown = null; tut(); };
 }
 el.className = 'on' + (st.act ? ' act' : '');
 const d = [...el.querySelectorAll('.cdim')], ho = el.querySelector('.chole'), box = el.querySelector('.cbox');
 const bw = box.offsetWidth, bh = box.offsetHeight;
 if (hole) {
  d[0].style.cssText = `left:0;top:0;width:${W}px;height:${hole.y}px`;
  d[1].style.cssText = `left:0;top:${hole.y + hole.h}px;width:${W}px;height:${H - hole.y - hole.h}px`;
  d[2].style.cssText = `left:0;top:${hole.y}px;width:${hole.x}px;height:${hole.h}px`;
  d[3].style.cssText = `left:${hole.x + hole.w}px;top:${hole.y}px;width:${W - hole.x - hole.w}px;height:${hole.h}px`;
  ho.style.cssText = `display:block;left:${hole.x}px;top:${hole.y}px;width:${hole.w}px;height:${hole.h}px`;
  const bx = Math.max(6, Math.min(W - bw - 6, hole.x + hole.w / 2 - bw / 2));
  const by = Math.max(6, Math.min(H - bh - 6, hole.y + hole.h + bh + 16 <= H - 6 ? hole.y + hole.h + 16 : hole.y - bh - 16));
  box.style.cssText = `left:${bx}px;top:${by}px`;
 } else {
  d[0].style.cssText = `left:0;top:0;width:${W}px;height:${H}px`;
  d.slice(1).forEach(x => x.style.cssText = 'display:none'); ho.style.cssText = 'display:none';
  box.style.cssText = `left:${Math.max(6, (W - bw) / 2)}px;top:${Math.max(6, (H - bh) / 2)}px`;
 }
}
addEventListener('keydown', e => { if (title || !g || /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (g.s.msgs[0]?.type === 'scene') { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) sceneNext(); } const k = +(e.code.match(/^(?:Digit|Numpad)(\d)$/) || [])[1]; if (k && document.querySelector(`[data-choice="${k - 1}"]`)) pickChoice(g.s.msgs[0], k - 1); return; } if (e.code === 'Space') { e.preventDefault(); if (g.s.msgs.length) { const m = g.s.msgs[0]; if (!['call', 'scam', 'agm'].includes(m.type)) act('msgdone'); return; } if (g.s.phase !== 'open') return; g.dispatch('speed', g.s.speed ? 0 : 1); save(); loop(); hud(); }
 const n = +(e.code.match(/^(?:Digit|Numpad)(\d)$/) || [])[1]; if (n >= 1 && n <= TABS.length && !g.s.msgs.length) { tab = TABS[n - 1][0]; pane(); hud(true); } });
/* 이야기 화면의 진행 위치와 예약만 저장한다. 규칙은 이야기 엔진에 맡긴다. */
/* ── 새 판 — 다섯 단계(11-20 대표님 '단계 쪼개 · 주인공 고르는 맛' · 목업 09_목업/새판_1120 · 결정 D-037)
   LOOK(뒷모습 네 벌) → TEAM(증권사 시절 팀) → NAME(주사위) → DEAL(백 여사 차용증 = 난이도) → READY ── */
const NEW_STEPS = ['LOOK', 'TEAM', 'NAME', 'DEAL', 'READY'];
let newStep = 0, newPick = null, ngShown = -1, wkPick = null;
const heroArt = look => art('인물/hero_' + (look || 'navy') + '.png');
function drawNew(step) {
 if (step == null) { ngShown = -1; newStep = 0; newPick = { look: T.looks[0].id, team: T.teams[0].id, name: T.names[0], level }; } else newStep = step;
 const P = newPick, tm = T.teams.find(x => x.id === P.team), lk = T.looks.find(x => x.id === P.look), lv = T.levels.find(x => x.id === P.level);
 const bar = `<div class="ng-steps">${NEW_STEPS.map((n, i) => `<div class="${i === newStep ? 'on' : i < newStep ? 'done' : ''}"><i></i>${n}</div>`).join('')}</div>`;
 let body = '';
 if (newStep === 0) body = `<div class="ng-looks">${T.looks.map(x => `<button class="ng-lk ${x.id === P.look ? 'on' : ''}" data-look="${x.id}"><img src="${heroArt(x.id)}" alt=""><b>${esc(x.name)}</b></button>`).join('')}</div>`;
 if (newStep === 1) body = `<div class="ng-opts">${T.teams.map(x => { const nd = g0node(x.node); return `<button class="ng-op ${x.id === P.team ? 'on' : ''}" data-team="${x.id}"><span class="ng-ic" style="background:${x.color}">${x.icon}</span><span class="ng-tx"><b>${esc(x.name)}</b><small>${esc(x.line)}</small></span><span class="ng-chip">${esc(x.chip)} · ${nd ? nd.icon + ' ' + esc(nd.name) : ''}</span></button>`; }).join('')}</div>`;
 if (newStep === 2) body = `<div class="ng-name"><input id="player-name" maxlength="20" value="${esc(P.name)}" spellcheck="false" autocomplete="off"><button id="ng-dice" aria-label="아무 이름">🎲</button></div><div class="ng-say">${SNAME} — “사장님 성함이 어떻게 되세요?”</div>`;
 if (newStep === 3) body = `<div class="ng-deals">${T.levels.map(l => `<button class="ng-dl ${l.id === P.level ? 'on' : ''}" data-level="${l.id}"><h3>차 용 증</h3><b>${esc({ easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }[l.id] || l.name)}</b><span class="ng-kv"><span>퇴직금</span><span>${M(l.severance)}</span></span><span class="ng-kv"><span>백 여사</span><span>${M(l.principal)}</span></span><span class="ng-kv"><span>이자</span><span>은행 × ${l.rateMul}</span></span><span class="ng-seal">白</span></button>`).join('')}</div>`;
 if (newStep === 4) body = `<div class="ng-ready"><small>2010 · 01 · 04</small><h1>여의도</h1><div class="ng-nm">${esc(P.name)}</div><div class="ng-cards"><div><small>LOOK</small><b>${esc(lk.name)}</b></div><div><small>TEAM</small><b>${esc(tm.name)}</b></div><div><small>DEAL</small><b>${esc({ easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }[lv.id] || lv.name)}</b></div></div></div>`;
 const head = newStep === 4 ? '' : `<div class="ng-ttl">${NEW_STEPS[newStep]}</div>`;
 const same = $('#app .ng-wrap');
 const html = `${bar}${head}<div class="ng-body">${body}</div><div class="ng-foot"><button id="ng-back">◀ BACK</button><button class="primary" id="ng-next">${newStep === 4 ? 'START ▶' : 'NEXT ▶'}</button></div>`;
 if (same) { $('.ng-hero').src = heroArt(P.look); $('.ng-side').innerHTML = html; } else
  $('#app').innerHTML = `<div class="story-screen new-game ng-wrap"><div class="story-bg" style="background-image:url('${sceneArt('in_han_river')}')"></div><div class="ng-vig"></div><img class="ng-hero" src="${heroArt(P.look)}" alt="주인공 뒷모습"><section class="ng-side">${html}</section></div>`;
 if (ngShown !== newStep || !same) swapIn('.ng-body'); ngShown = newStep;
 on('[data-look]', d => { P.look = d.look; drawNew(0); });
 on('[data-team]', d => { P.team = d.team; drawNew(1); });
 on('[data-level]', d => { P.level = level = d.level; drawNew(3); });
 const nm = $('#player-name'); if (nm) { nm.oninput = () => { P.name = nm.value; }; nm.onkeydown = e => { if (e.key === 'Enter') $('#ng-next').click(); }; setTimeout(() => { nm.focus(); nm.select(); }, 30); }
 if ($('#ng-dice')) $('#ng-dice').onclick = () => { const pool = T.names.filter(n => n !== P.name); P.name = pool[Math.floor(Math.random() * pool.length)]; nm.value = P.name; nm.classList.remove('roll'); void nm.offsetWidth; nm.classList.add('roll'); };
 $('#ng-back').onclick = () => newStep ? drawNew(newStep - 1) : drawTitle();
 $('#ng-next').onclick = () => {
  if (newStep === 2) P.name = ($('#player-name').value.trim() || T.names[0]).slice(0, 20);
  if (newStep < 4) return drawNew(newStep + 1);
  g = new Game({ level: P.level, name: P.name, look: P.look, team: P.team, seed: (Date.now() ^ 0x5bd1e995) >>> 0 });
  g.s.msgs = g.s.msgs.filter(m => m.type !== 'hello'); g.s.tut = 0;
  g.s.tips = [{ stock: 's4', dir: 1, t: 50, acc: 0.97, who: 'sec', whoName: SNAME, insider: false, head: `${SNAME} 비서: "사장님, 꽃온화장품에 오늘 좋은 소식이 나올 거래요"` }];
  g.build(); tab = 'home'; person = 'yuna'; title = false; seen = 0; save(); drawGame();
 };
}
function g0node(id) { for (const b of T.instinct.branches) for (const t of b.tiers) for (const n of t) if (n.id === id) return n; return null; }
function sceneState(m) {
 if (g.s.uiScene?.id !== m.id) g.s.uiScene = { id: m.id, line: 0, choice: null, log: false };
 return g.s.uiScene;
}
function sceneLines(scene, ui) { return [...scene.lines, ...(ui.choice == null ? [] : scene.choices[ui.choice].after || [])]; }
function speaker(id) { return id === 'me' ? g.s.name : CAST[id] || ''; }
/* 장면 상자 — 「상한가」 배포판(공개_1118-1908) 이벤트 화면 꼴(11-20 대표님 '이벤트 기본 UI 는 상한가 참고 · 주인공 보여지는 것만 빼고 · 크기 단추는 유지')
   왼 위 표지 + 제목 · 상대 한 명 반신(말하는 사람 · 지문 · 내 줄은 바로 앞 사람) · 대화창(금색 이름표 · 한 글자씩 · ▼) · 창 위 단추(크기 · 지난 대사 · 한 줄 뒤로 · 빨리) · 고르기는 창 안 오른쪽 번호 목록 + 바뀌는 숫자 칩 */
const bustArt = (id, f = 'base') => art('장면/' + id + '_' + (id === 'yuna' ? f || 'base' : 'base') + '.png');
const SIZES = [['big', 'IN'], ['up', 'OUT']];
let viewSize = (() => { try { return localStorage.getItem('ydo_view_size') || 'big'; } catch { return 'big'; } })();
let typing = null, illShown = '';   /* 다 떠서 보이는 그림 — 표정 · 사람이 바뀌면 이 그림을 겹쳐 두고 흐리며 새 그림을 띄움(「상한가」 setArt 와 같은 움직임) */
const TYPE_MS = 28;   /* 한 자 찍는 간격(ms · 「상한가」 typeInto.MS 와 같음 · 화면 짜임 수) */
const voiceHTML = s => esc(s).replace(/\(([^)]*)(\)|$)/g, '<span class="inner">($1$2</span>');   /* 괄호 속말 꼴(「상한가」와 같음) — 찍는 중에도 */
function relWord(id) {
 const words = T.rel_words[id]; if (!words) return '';
 const p = T.contacts.find(x => PERSON[x.portrait] === id);
 const score = id === 'taeo' ? g.s.story.rel.taeo || 0 : p ? g.s.contacts[p.id]?.rel || 0 : g.s.senior;
 const n = CANDIDATES.includes(id) ? Math.max(0, (g.s.story.stage[id] || 1) - 1) : [30, 60, 85].filter(x => score >= x).length;
 return words[Math.min(3, n)];
}
function whoNote(id) {
 if (id === 'me') return '';
 const p = T.contacts.find(x => PERSON[x.portrait] === id);
 const role = id === 'yuna' ? '비서' : id === 'taeo' ? '큰손' : T.roles[p?.role]?.name;
 return role ? role + ' · ' + relWord(id) : '';
}
function fxChips(fx) {   /* 고르기에서 바뀌는 숫자만 칩으로 — 표시 · 예약 · 단계 · 연락처는 숨김(「상한가」 '숨은 숫자는 말로도 안 보임') */
 const sg = n => (n > 0 ? '+' : '−') + Math.abs(n).toLocaleString('ko-KR');
 return fx.map(e => e.k === 'rel' ? `<span class="cchip ${e.n > 0 ? 'love' : 'dn'}">♥ ${esc(CAST[e.who] || '')} ${sg(e.n)}</span>`
  : e.k === 'cash' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">${ic('money')}${M(Math.abs(e.n)).replace(/^/, e.n > 0 ? '+' : '−')}</span>`
  : e.k === 'debt' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">빚 ${e.n > 0 ? '+' : '−'}${M(Math.abs(e.n))}</span>`
  : e.k === 'debt_half' ? '<span class="cchip dn">빚 절반</span>'
  : e.k === 'susp' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">의심 ${sg(e.n)}</span>`
  : e.k === 'stress' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">스트레스 ${sg(e.n)}</span>`
  : e.k === 'rep' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">${esc(REP[e.id]?.name || '')} ${sg(e.n)}</span>` : '').join('');
}
function drawScene(m) {
 clearInterval(timer); timer = null; clearInterval(typing); typing = null;
 const scene = T.story.scenes.find(x => x.id === m.id), ui = sceneState(m), lines = sceneLines(scene, ui), line = lines[Math.min(ui.line, lines.length - 1)];
 const choosing = ui.choice == null && ui.line >= scene.lines.length - 1 && scene.choices.length && ui.shown === ui.line;
 const cast = Object.values(scene.cast || {}), face = {};
 let stand = null;   /* 서 있는 한 사람 — 말하는 사람 · 아니면 바로 앞에 말한 사람 · 아니면 첫 인물 */
 for (const l of lines.slice(0, ui.line + 1)) { if (l.face) face[l.say] = l.face; if (cast.some(c => c.id === l.say)) stand = l.say; }
 stand = stand || cast[0]?.id; const sc = cast.find(c => c.id === stand), mood = face[stand] || sc?.face || 'base';
 const nm = line.say ? `<div class="sname ${line.say === 'me' ? 'me' : ''}">${esc(speaker(line.say))}${whoNote(line.say) ? `<small>${esc(whoNote(line.say))}</small>` : ''}</div>` : '';
 const ill = stand ? bustArt(stand, mood) : '', sameScene = $('#over .scene-screen')?.dataset.k === 'scene-' + m.id, swap = !!ill && sameScene && !!illShown && illShown !== ill;
 const days = m.date ? `${+m.date.slice(0, 4)}년 ${+m.date.slice(5, 7)}월 ${+m.date.slice(8, 10)}일` : '';
 $('#over').innerHTML = `<div class="story-screen scene-screen vs-${viewSize}" data-k="scene-${m.id}"><div class="story-bg" style="background-image:url('${sceneArt(scene.bg)}')"></div><div class="scene-dots"></div>
  ${ill ? `<img class="scene-ill ${ill === illShown && sameScene ? 'still' : swap ? 'sw-wait' : ''}" src="${ill}" alt="${esc(speaker(stand))}">${swap ? `<img class="scene-ill sw-old" src="${illShown}" alt="">` : ''}` : ''}
  <div class="scene-title"><span class="chip">${esc(T.scene_flash?.[m.id] || days + ' · ' + m.time)}</span><h2 class="${ui.line ? 'gone' : ''}">${esc(scene.title)}</h2></div>
  <section class="scene-dlg" aria-live="polite">${nm}
   <div class="tools">${stand ? `<button id="scene-size" class="sm">ZOOM ${SIZES.find(x => x[0] === viewSize)[1]}</button>` : ''}<button id="scene-log" class="sm log">${ui.log ? 'LOG 닫기' : 'LOG'}</button><button id="scene-back" class="sm" ${ui.line ? '' : 'disabled'}>◀ BACK</button><button id="scene-fast" class="sm" ${choosing ? 'disabled' : ''}>SKIP ▶▶</button></div>
   <p id="scene-line" class="text ${line.say ? '' : 'nar'}"></p>${choosing ? '' : `<i class="more blink" ${ui.shown === ui.line ? '' : 'hidden'}>▼</i>`}
   ${choosing ? `<div class="scene-ch">${scene.choices.map((c, i) => `<button data-choice="${i}"><b>${i + 1}</b><span>${esc(g.storyText(c.text))}</span></button>`).join('')}</div>` : ''}
  </section>
  ${ui.log ? `<section class="story-panel scene-history"><h2>${esc(scene.title)}</h2>${lines.slice(0, Math.min(ui.line + 1, lines.length)).map(l => `<p><b>${esc(l.say ? speaker(l.say) : '')}</b> ${esc(g.storyText(l.text))}</p>`).join('')}${ui.choice != null ? `<p class="muted">고른 것: ${esc(g.storyText(scene.choices[ui.choice].text))} — ${esc(g.storyText(scene.choices[ui.choice].hint))}</p>` : ''}</section>` : ''}</div>`;
 if (swap) swapIll(ill); else illShown = ill;
 const full = g.storyText(line.text), el = $('#scene-line');
 const putText = s => { if (/[(（]/.test(s)) el.innerHTML = voiceHTML(s); else el.textContent = s; };
 if (ui.shown === ui.line) putText(full);
 else { const chars = [...full]; let k = 0; el.textContent = ''; typing = setInterval(() => { k++; putText(chars.slice(0, k).join('')); if (k >= chars.length) { clearInterval(typing); typing = null; ui.shown = ui.line; $('#over .scene-dlg .more')?.removeAttribute('hidden'); if (ui.choice == null && ui.line >= scene.lines.length - 1 && scene.choices.length) drawScene(m); } }, TYPE_MS); }
 $('.scene-dlg').onclick = e => { if (!e.target.closest('button')) sceneNext(); };   /* 대사 글자 위를 눌러도 이 한 곳만 받음 — 글자 칸에도 따로 걸면 한 번 누름에 두 번 불려 한 글자씩 찍기가 바로 끝남(11-20 대표님 '타이핑 되는 대사 · 안 되는 대사') */
 $('#scene-log').onclick = () => { ui.log = !ui.log; save(); drawScene(m); };
 $('#scene-back').onclick = () => { if (ui.line > 0) { if (ui.choice != null && ui.line <= scene.lines.length) return; ui.line--; ui.shown = ui.line; save(); drawScene(m); } };
 $('#scene-fast').onclick = () => { const end = ui.choice == null && scene.choices.length ? scene.lines.length - 1 : sceneLines(scene, ui).length - 1; if (ui.line >= end && ui.shown === ui.line) return sceneNext(); ui.line = end; ui.shown = end; save(); drawScene(m); };
 const sz = $('#scene-size'); if (sz) sz.onclick = () => { viewSize = SIZES[(SIZES.findIndex(x => x[0] === viewSize) + 1) % SIZES.length][0]; try { localStorage.setItem('ydo_view_size', viewSize); } catch { /* 못 써도 이번 화면에선 바뀜 */ } drawScene(m); };
 on('[data-choice]', d => pickChoice(m, +d.choice));
 tut();
}
function pickChoice(m, i) {
 const ui = sceneState(m), scene = T.story.scenes.find(x => x.id === m.id); if (!scene.choices[i]) return;
 ui.choice = i; ui.line = scene.lines.length; ui.log = false; save();
 const chips = fxChips(scene.choices[i].fx); if (chips) floatUp(chips, 'buy');   /* 숫자는 고른 뒤에 짧게(시험관 '고르기 전에 숫자가 보여 큰 쪽만 고름') */
 if (!scene.choices[i].after?.length) finishScene(m, ui); else drawScene(m);
}
/* 표정 · 사람이 바뀔 때 — 옛 그림(sw-old)은 위에 두고, 새 그림이 다 불러와지면 옛 것은 흐려지고 새 것은 또렷해짐(「상한가」 common.js setArt)
   그사이 줄을 또 넘기면 화면을 다시 그리며 아직 보이는 옛 그림을 그대로 붙듦(illShown 은 다 뜬 뒤에만 바뀜) · 3초 안에 안 오면 그냥 바꿈 */
function swapIll(ill) {
 const im = $('#over .scene-ill.sw-wait'), old = $('#over .scene-ill.sw-old'); if (!im) { illShown = ill; return; }
 let done = false;
 const go = () => { if (done || !im.isConnected) return; done = true; illShown = ill; im.classList.replace('sw-wait', 'sw-in'); if (old) { old.classList.add('sw-out'); old.addEventListener('animationend', () => old.remove(), { once: true }); }
  setTimeout(() => { old?.remove(); if (im.classList.contains('sw-in')) im.classList.replace('sw-in', 'still'); }, 900); };   /* 끝난 모습으로 맞춤 — 움직임이 안 도는 때(가려진 탭)에도 새 그림이 또렷하게 남음(「상한가」 end 와 같음) */
 if (im.complete && im.naturalWidth) go(); else { im.addEventListener('load', go, { once: true }); im.addEventListener('error', go, { once: true }); setTimeout(go, 3000); }
}
function finishScene(m, ui) { clearInterval(typing); typing = null; const choice = ui.choice ?? -1; delete g.s.uiScene; act('scene', [m.id, choice]); }
function sceneNext() {
 const m = g.s.msgs[0]; if (m?.type !== 'scene') return;
 const ui = sceneState(m), scene = T.story.scenes.find(x => x.id === m.id);
 if (ui.log) return;
 if (ui.shown !== ui.line) { ui.shown = ui.line; save(); return drawScene(m); }   /* 한 글자씩 나오는 중이면 한 번에 */
 if (ui.choice == null && ui.line >= scene.lines.length - 1 && scene.choices.length) return;   /* 고르기 차례 */
 ui.line++;
 if (ui.line >= sceneLines(scene, ui).length && (ui.choice != null || !scene.choices.length)) finishScene(m, ui);
 else { save(); drawScene(m); }
}
const STAGES = ['아직 모르는 사이', '① 아는 사이', '② 마음이 쓰임', '③ 둘만의 약속', '④ 고백'];
const CANDIDATES = ['yuna', 'dasol', 'chaerin', 'garam'];
const stageBars = n => `<div class="relationship-stages" aria-label="관계 ${n}단계">${[1,2,3,4].map(i => `<span class="${i <= n ? 'on' : ''}">${['①','②','③','④'][i-1]}</span>`).join('')}</div>`;
function peopleData() { return [{ id: 'yuna', name: SNAME, who: 'yuna', known: true, rel: g.s.senior, last: g.s.uiYunaLast ?? (g.s.story.history.some(h => h.id === 's0115') ? 0 : null), roleName: '개인 비서 · 조언자' }, ...T.contacts.map(p => ({ ...p, ...g.s.contacts[p.id], who: PERSON[p.portrait], roleName: T.roles[p.role].name }))]; }
function nextInterest() { const month = DAYS[g.s.day].slice(0,7); return DAYS.find(d => d.slice(0,7) > month) || '마지막 정산'; }
function nextStage(who, stage) {
 if (stage < 2) return '관계 30 · ' + ({ yuna: '평판 하나', dasol: '대중 이미지', chaerin: '윤리', garam: '자선' }[who]) + ' ' + N.stage2_rep_level + '단계';   /* 다음 이야기(날짜 · 사건)는 미리 알리지 않음 */
 if (stage === 2) return '관계 60';
 return stage === 3 ? '관계 85' : '—';
}
/* ── 자산 탭 — 왼쪽 내 재산 한 장 · 오른쪽 BANK(S1) · 집 · 차 · 상가는 쇼룸(S2) · 11-20 대표님 'S1 · K1 추천대로' · 목업 09_목업/자산회사탭_1120 ── */
/* ── 평판 탭 — 왼쪽 여섯 평판 육각 · 오른쪽 '큰손 감각' 나무(갈래 하나씩 · 고른 노드만 아래 띠 · 결정 D-032 · 목업 09_목업/평판탭_1120 U3) ── */
const INST = T.instinct, REP_ICON = { know: '📈', wealth: '💰', ethics: '⚖️', net: '🤝', charity: '🕯️', image: '📺' }, REP_COL = { know: '#5c9bff', wealth: '#f2c14e', ethics: '#62cc7e', net: '#ff86b0', charity: '#b39bff', image: '#ff8a3c' };
const REP_SHORT = { know: '지식', wealth: '재력', ethics: '윤리', net: '인맥', charity: '자선', image: '이미지' };
let instBr = 'info', instSel = null, repSheet = false, repView = null;   /* repView: 2단 { k: 'rep' | 'br', id } */
function repPts(id) { return id === 'wealth' ? g.netWorth() : Math.round(id === 'net' ? g.netPts() : g.s.rep[id]); }
function repSteps(id) { return id === 'wealth' ? N.wealth_tiers : N.rep_levels; }
function repFrac(id) { const l = g.lvl(id), st = repSteps(id), a = st[l], b = st[l + 1]; return b == null ? l : l + Math.max(0, Math.min(1, (repPts(id) - a) / (b - a))); }
function nodeState(n) { const I = g.inst(); if (I.got.includes(n.id)) return 'got'; const f = g.instNode(n.id); if (f.t.some(x => x.id !== n.id && I.got.includes(x.id))) return 'shut'; if (g.instOpen(n.id)) return I.pt >= 1 && I.lock !== g.s.day ? 'open' : 'ready'; return g.lvl(n.cond[0]) < n.cond[1] ? 'lock' : 'wait'; }
function drawRep(P) {
 /* 평판 탭 — 정보 깊이(D-049 · 목업 09_목업/평판깊이_1120): 첫 화면은 평판 육각 + 큰손 감각 갈래 카드 셋 · 꼭짓점 › 2단 평판 하나 · 갈래 › 2단 나무 · 노드 › 3단 배우기 */
 const s = g.s, I = g.inst(), cx = 380, cy = 400, R0 = 250, pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
 const grid = [1, 2, 3, 4, 5].map(k => `<polygon points="${[0, 1, 2, 3, 4, 5].map(i => pt(i, R0 * k / 5).map(v => v.toFixed(0)).join(',')).join(' ')}" fill="none" stroke="#2b3566" stroke-width="2"/>`).join('');
 const poly = T.reps.map((r, i) => pt(i, R0 * Math.max(0.4, repFrac(r.id)) / 5).map(v => v.toFixed(0)).join(',')).join(' ');
 const labs = T.reps.map((r, i) => { const [x, y] = pt(i, R0 + 80); return `<button class="rp-lab" data-rep="${r.id}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px"><span class="rp-ic" style="background:${REP_COL[r.id]}">${REP_ICON[r.id]}</span><b>${esc(r.name)}</b><small>Lv.${g.lvl(r.id)}</small></button>`; }).join('');
 const dot = n => { const ns = nodeState(n); return `<i class="${ns === 'got' ? 'got' : ns === 'open' ? 'open' : ns === 'shut' ? 'shut' : ''}"></i>`; };
 const cards = INST.branches.map(b => `<button class="rp2-br" data-br="${b.id}" style="--bc:${b.color}"><span class="go">›</span><span class="bi">${b.icon}</span><b>${esc(b.name)}</b><span class="dots">${b.tiers.map(t => `<span>${t.map(dot).join('')}</span>`).join('')}</span></button>`).join('');
 let sheet = '';
 if (repView?.k === 'rep') {
  const id = repView.id, r = REP[id], L = g.lvl(id), st = repSteps(id), nxt = st[L + 1];
  const rows = r.perks.map((pk, i) => `<div class="rp2-perk ${i < L ? 'got' : i === L ? 'nx' : 'lock'}"><span class="t">Lv.${i + 1}</span><span>${esc(pk)}</span><span class="r">${i < L ? '✓' : i === L ? 'NEXT' : '🔒'}</span></div>`).join('');
  const bar = nxt == null ? '' : `<div class="rp2-lv">Lv.${L + 1}<span class="m"><i style="width:${(repFrac(id) % 1) * 100}%;background:${REP_COL[id]}"></i></span><b>${id === 'wealth' ? M(repPts(id)) + ' / ' + M(nxt) : repPts(id) + ' / ' + nxt}</b></div>`;
  sheet = `<div class="fa-sheet rp2-sheet"><div class="fa-dim" data-rv-back></div><div class="db-wrap rp2-win"><div class="mk-hd"><span class="rp2-ic" style="background:${REP_COL[id]}">${REP_ICON[id]}</span><b>${esc(r.name)}</b><em class="rp2-l">Lv.${L}</em><button class="sm mk-x" data-rv-back>CLOSE ✕</button></div>${bar}<div class="rp2-perks">${rows}</div></div></div>`;
 } else if (repView?.k === 'br') {
  const B = INST.branches.find(b => b.id === repView.id);
  const tiers = B.tiers.map(t => `<div class="rp2-tier ${t.length > 1 ? 'pair' : ''}">${t.map(n => { const ns = nodeState(n); return `<button class="rp2-nd ${ns}" data-node="${n.id}"><span class="ni">${n.icon}</span>${esc(n.name)}<em>${ns === 'got' ? '✓' : ns === 'open' ? '1' : ns === 'lock' ? '🔒' : ''}</em></button>`; }).join('')}</div>`).join('');
  sheet = `<div class="fa-sheet rp2-sheet"><div class="fa-dim" data-rv-back></div><div class="db-wrap rp2-win"><div class="mk-hd"><span class="rp2-ic" style="background:${B.color}">${B.icon}</span><b>${esc(B.name)}</b><span class="rp2-pts">POINT <b>${I.pt}</b></span><button class="sm rp2-rs" id="it-respec" ${I.got.length ? '' : 'disabled'}>RESPEC</button><button class="sm mk-x" data-rv-back>CLOSE ✕</button></div><div class="rp2-tree" style="--bc:${B.color}">${tiers}</div></div></div>`;
  const sn = instSel && B.tiers.flat().find(n => n.id === instSel);
  if (sn) { const ns = nodeState(sn), ok = g.lvl(sn.cond[0]) >= sn.cond[1];
   sheet += `<div class="fa-sheet rp2-w3"><div class="fa-dim" data-nd-back></div><div class="fa-win"><div class="rp2-wh"><span class="rp2-ic big" style="background:${B.color}">${sn.icon}</span><h2>${esc(sn.name)}</h2></div><div class="rp2-ln">${esc(sn.line)}</div><div><div class="fa-chg"><span>조건</span><b class="${ok ? 'ok' : 'no'}">${esc(REP[sn.cond[0]].name)} Lv.${sn.cond[1]}${ok ? ' ✓' : ''}</b></div>${ns === 'got' ? '' : `<div class="fa-chg"><span>POINT</span><b class="${I.pt >= 1 ? '' : 'no'}">${I.pt >= 1 ? `${I.pt} → ${I.pt - 1}` : 0}</b></div>`}</div><div class="fa-ft"><button data-nd-back>BACK</button><button class="primary" id="it-learn" ${ns === 'open' ? '' : 'disabled'}>${ns === 'got' ? '✓ LEARNED' : 'LEARN'}</button></div></div></div>`; }
 }
 if (repSheet) sheet += `<div class="fa-sheet rp2-w3"><div class="fa-dim" data-rs-back></div><div class="fa-win"><h2>RESPEC</h2><div class="fa-chg"><span>상담료</span><b>${M(INST.respec_cost)}</b></div><div class="fa-chg"><span>POINT</span><b>${I.pt} → ${I.pt + I.got.length}</b></div><div class="fa-ft"><button data-rs-back>BACK</button><button class="primary" id="rs-do" ${s.cash >= INST.respec_cost ? '' : 'disabled'}>OK</button></div></div></div>`;
 P.innerHTML = `<div class="fa-bg" style="background-image:url('${art('배경/in_office_sales.jpg')}')"></div><div class="rep-left rp2-hex"><svg width="760" height="800">${grid}<polygon points="${poly}" fill="rgba(242,193,78,.25)" stroke="#f2c14e" stroke-width="3"/></svg>${labs}</div>
  <div class="rp2-ins"><div class="rp2-hd"><b>큰손 감각</b><span class="rp2-pts">POINT <b>${I.pt}</b></span></div><div class="rp2-brs">${cards}</div></div>${sheet}`;
 const fade = (sel, go) => { const el = $(sel); if (!el || !calMotion()) return go(); el.classList.add('out'); setTimeout(go, 180); };
 on('[data-rep]', d => { repView = { k: 'rep', id: d.rep }; pane(); });
 on('[data-br]', d => { repView = { k: 'br', id: d.br }; instSel = null; pane(); });
 on('[data-rv-back]', () => fade('.rp2-sheet', () => { repView = null; instSel = null; pane(); }));
 on('[data-node]', d => { instSel = d.node; pane(); });
 on('[data-nd-back]', () => fade('.rp2-w3', () => { instSel = null; pane(); }));
 if ($('#it-learn')) $('#it-learn').onclick = () => { const id = instSel, nm = INST.branches.flatMap(b => b.tiers.flat()).find(n => n.id === id)?.name; fade('.rp2-w3', () => { instSel = null; if (act('learn', id)) { sfx('page'); floatUp(esc(nm), 'buy', '★', 'kA'); } else pane(); }); };
 if ($('#it-respec')) $('#it-respec').onclick = () => { repSheet = true; pane(); };
 on('[data-rs-back]', () => fade('.rp2-w3:last-child', () => { repSheet = false; pane(); })); if ($('#rs-do')) $('#rs-do').onclick = () => fade('.rp2-w3:last-child', () => { repSheet = false; act('respec'); });
}
function swapIn(sel) { const el = $(sel); if (el && calMotion()) { el.classList.remove('swap-in'); void el.offsetWidth; el.classList.add('swap-in'); } }
const amtTxt = a => a === 'all' ? 'ALL' : M(a);
/* ── 자산 탭 — 단계 나눔(11-20 대표님 '한 화면에서 처리하지 말고 뎁스를 두고 정보량을 줄여' · 목업 09_목업/자산회사탭_1120 D1 ~ D4)
   첫 화면(순자산 + 칸 넷) → 칸 안(BANK 카드 둘 · 집 · 차 · 상가 줄) → 작은 창(금액 고르기 · 사고팔기 확인) ── */
const FA_TILES = [['bank', 'BANK', '배경/in_client_office.jpg'], ['house', 'HOME', ''], ['car', 'CAR', ''], ['shop', 'SHOP', '배경/in_ydp_shop.jpg']];
const BANK_MODES = { borrow: '빌리기', repay: '갚기', save: '예금', withdraw: '꺼내기' };
let faSheet = null, faLast = '';
function bankAll(mode) { const s = g.s, lim = g.loanLimit(); return { borrow: lim - s.debt, repay: Math.min(s.debt, s.cash), save: s.cash, withdraw: s.deposit }[mode]; }
function faItems(k) { return k === 'house' ? T.houses : k === 'car' ? T.cars.filter(c => c.id !== 'none') : T.shops; }
function faMine(k, x) { const s = g.s; return k === 'house' ? x.id === s.house : k === 'car' ? x.id === s.car : (s.shops[x.id] || 0) > 0; }
function faNeed(k, x) { return k === 'house' ? (g.lvl('wealth') < x.need ? `재력 Lv.${x.need}` : g.lvl('image') < (x.image || 0) ? `이미지 Lv.${x.image}` : '') : ''; }
function faCost(k, x) { const s = g.s; return k === 'house' ? x.price - HOUSE[s.house].price * 0.9 : k === 'car' ? x.price - CAR[s.car].price * 0.6 : x.price; }
const carArt = id => '자산/car_' + (id && id !== 'none' ? id : 'none') + '.jpg', shopArt = id => '자산/shop_' + ({ s_small: 'small', s_mid: 'mid', s_floor: 'floor' }[id] || 'none') + '.jpg';
const faPic = (k, x) => { const im = k === 'house' ? x?.bg : k === 'car' ? carArt(x?.id) : k === 'shop' ? shopArt(x?.id) : ''; return im ? `style="background-image:url('${art(im)}')"` : ''; };
const faEmo = (k, x) => k === 'car' ? (x?.id === 'import' ? '🏎' : '🚗') : k === 'shop' ? '🏬' : '';
function closeFaSheet(go) {   /* 작은 창은 서서히 사라진 뒤 닫힘(움직임 줄이기면 바로) */
 const el = $('.fa-sheet'); const done = () => { faSheet = null; if (go) go(); else pane(); };
 if (!el || !calMotion()) return done(); el.classList.add('out'); setTimeout(done, 180);
}
function drawFacil(P) {
 const s = g.s, nw = g.netWorth(), owe = s.debt + (s.baek.state === 'owe' ? s.baek.principal : 0);
 const view = facil + (faSheet ? ':' + faSheet.kind : ''), moved = faLast.split(':')[0] !== facil; faLast = view;
 const crumb = name => `<div class="fa-crumb"><button class="sm" data-fa2="top">◀ HOME</button><b>${name}</b></div>`;
 let body = '', sheet = '';
 if (facil === 'top') {
  const shopN = T.shops.reduce((n, x) => n + (s.shops[x.id] || 0), 0);
  const val = { bank: s.deposit > 0 ? '예금 ' + M(s.deposit) : s.debt > 0 ? '대출 ' + M(s.debt) : '예금 0', house: HOUSE[s.house].name, car: s.car !== 'none' ? CAR[s.car].name : '', shop: shopN ? shopN + '칸' : '' };
  const bg = { house: HOUSE[s.house].bg };
  body = `<div class="fa-top"><small>NET WORTH</small><b class="fa-nw">${M(nw)}</b>${owe ? `<span class="fa-owe">빚 −${M(owe)}</span>` : ''}</div>
   <div class="fa-tiles">${FA_TILES.map(([k, n, img]) => { const im = bg[k] || img, v = val[k]; return `<button class="fa-tile ${v ? '' : 'empty'}" data-fa2="${k}" ${im ? `style="background-image:url('${art(im)}')"` : ''}>${!im ? `<span class="fa-te">${faEmo(k)}</span>` : ''}<b>${n}</b><small>${v ? esc(v) : '없음'}</small><em>▶</em></button>`; }).join('')}</div>`;
 } else if (facil === 'bank') {
  const lim = g.loanLimit(), b = s.baek, owe = s.baek.state === 'owe' ? b.principal : 0, canBaek = owe > 0 && DAYS[s.day] >= '2012-01-02' && s.cash >= 1;
  const row = (name, cells, bts, off) => `<div class="db-row ${off ? 'off' : ''}"><b class="db-n">${name}</b>${cells.map(([k, v, c]) => `<span class="db-c"><small>${k}</small><em class="${c || ''}">${v}</em></span>`).join('')}<span class="db-b">${bts}</span></div>`;
  const bt = (m, label, off, main) => `<button class="${main && !off ? 'primary' : ''}" data-bsheet="${m}" ${off ? 'disabled' : ''}>${label}</button>`;
  body = crumb('빚 · 예금') + `<div class="db-wrap">
   ${row('백 여사', [['남은 돈', owe ? M(owe) : 'PAID', owe ? 'dn' : ''], ['달 이자', M(g.baekInterest())], ['갚을 날', '2012-01']], bt('baek', '갚기', !canBaek, true), !owe)}
   ${row('은행 대출', [['남은 돈', M(s.debt), s.debt ? 'dn' : ''], ['한도', M(lim)], ['달 이자', (g.loanRate() * 100).toFixed(2) + '%']], bt('borrow', '빌리기', lim - s.debt <= 0, true) + bt('repay', '갚기', !s.debt || s.cash < 1), !lim && !s.debt)}
   <div class="db-sum"><span>빚 합계 · 달 이자 ${M(g.baekInterest() + s.debt * g.loanRate())}</span><b class="${owe + s.debt ? 'dn' : ''}">${M(owe + s.debt)}</b></div>
   <div class="db-gap"></div>
   ${row('예금', [['맡긴 돈', M(s.deposit)], ['달 이자', (N.deposit_rate * 100).toFixed(2) + '%'], ['NEXT', esc(nextInterest().slice(5).replace('-', '/'))]], bt('save', '맡기기', s.cash < 1) + bt('withdraw', '꺼내기', !s.deposit))}</div>`;
  if (faSheet?.kind === 'bank') {
   const m = faSheet.mode, all = m === 'baek' ? Math.min(owe, s.cash) : bankAll(m), a = bankAmt === 'all' ? all : bankAmt;
   const ok = a > 0 && { baek: canBaek, borrow: s.debt + a <= g.loanLimit(), repay: s.debt > 0 && s.cash >= 1, save: s.cash >= a, withdraw: s.deposit > 0 }[m];
   const after = s.cash + { baek: -Math.min(a, owe, s.cash), borrow: a, repay: -Math.min(a, s.debt, s.cash), save: -a, withdraw: Math.min(a, s.deposit) }[m];
   sheet = `<h2>${m === 'baek' ? '백 여사에게 갚기' : BANK_MODES[m]}</h2><div class="fa-chips">${[1e7, 5e7, 1e8, 5e8, 'all'].map(v => `<button class="${bankAmt === v ? 'on' : ''}" data-ba="${v}">${amtTxt(v)}</button>`).join('')}</div>
    <div class="fa-chg"><span>현금</span><b>${M(s.cash)} → ${M(Math.max(0, after))}</b></div><div class="fa-ft"><button data-fa-back>BACK</button><button class="primary" id="fa-do" ${ok ? '' : 'disabled'}>OK</button></div>`;
  }
 } else {
  const k = facil, items = faItems(k), mineIt = items.find(x => faMine(k, x)), cur = items.find(x => x.id === facilSel[k]) || mineIt || items[0];
  const curMine = faMine(k, cur), need = faNeed(k, cur), cost = Math.max(0, faCost(k, cur));
  const label = k === 'house' ? '이사하기' : '사기';
  const act1 = k === 'shop' ? `<button class="primary" data-fsheet="buy" ${s.cash < cur.price ? 'disabled' : ''}>사기 ${M(cur.price)}</button>${s.shops[cur.id] ? `<button data-fsheet="sell">팔기</button>` : ''}`
   : curMine ? '' : need ? `<button disabled>🔒 ${need}</button>` : `<button class="primary" data-fsheet="buy" ${s.cash < cost ? 'disabled' : ''}>${label} ${M(cost)}</button>`;
  const tag = curMine ? (k === 'shop' ? `${s.shops[cur.id]}칸` : 'NOW') : cur.price ? M(cur.price) : '';
  body = crumb({ house: 'HOME', car: 'CAR', shop: 'SHOP' }[k]) + `<div class="fa-hero2" ${faPic(k, cur)}>${faPic(k, cur) ? '' : `<span class="fa-emo">${faEmo(k, cur)}</span>`}<div class="fa-in2"><small>${esc(tag)}</small><b>${esc(cur.name)}</b><div class="fa-bts">${act1}</div></div></div>
   <div class="fa-row2">${items.map(x => { const nd = faNeed(k, x); return `<button class="fa-c ${x.id === cur.id ? 'on' : ''} ${faMine(k, x) ? 'mine' : ''} ${nd ? 'lock' : ''}" data-fsel="${x.id}" ${faPic(k, x)}>${faPic(k, x) ? '' : `<span>${faEmo(k, x)}</span>`}<b>${esc(x.name)}</b><small>${faMine(k, x) ? (k === 'shop' ? `${s.shops[x.id]}칸` : 'NOW') : x.price ? M(x.price) : ''}</small>${nd ? '<em>🔒</em>' : ''}</button>`; }).join('')}</div>`;
  if (faSheet?.kind === 'item') {
   const H0 = HOUSE[s.house], sell = faSheet.mode === 'sell';
   const rows = k === 'house' ? [['쾌적', `${H0.comfort} → ${cur.comfort}`], ['달 유지비', M(cur.upkeep)], ['드는 돈', M(cost)]]
    : k === 'car' ? [['쾌적', '+' + cur.comfort], ['주말', '●'.repeat(cur.reach)], ['달 유지비', M(cur.upkeep)], ['드는 돈', M(cost)]]
    : sell ? [['받는 돈', M(cur.price * 0.9)], ['달 월세', '−' + M(cur.rent)]] : [['달 월세', '+' + M(cur.rent)], ['드는 돈', M(cur.price)]];
   sheet = `<h2>${esc(cur.name)}</h2>${rows.map(r => `<div class="fa-chg"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}<div class="fa-ft"><button data-fa-back>BACK</button><button class="primary" id="fa-do">${sell ? '팔기' : k === 'house' ? '이사하기' : '사기'}</button></div>`;
  }
 }
 P.innerHTML = `<div class="fa-bg" style="background-image:url('${art(HOUSE[s.house].bg)}')"></div><div class="fa-view ${moved ? 'fa-step' : ''}">${body}</div>${sheet ? `<div class="fa-sheet"><div class="fa-dim" data-fa-back></div><div class="fa-win">${sheet}</div></div>` : ''}`;
 on('[data-fa2]', d => { facil = d.fa2; faSheet = null; pane(); });
 on('[data-bsheet]', d => { faSheet = { kind: 'bank', mode: d.bsheet }; bankAmt = d.bsheet === 'repay' || d.bsheet === 'withdraw' || d.bsheet === 'baek' ? 'all' : bankAmt === 'all' ? 5e7 : bankAmt; pane(); });
 on('[data-ba]', d => { bankAmt = d.ba === 'all' ? 'all' : +d.ba; pane(); });
 on('[data-fsel]', d => { facilSel[facil] = d.fsel; pane(); });
 on('[data-fsheet]', d => { faSheet = { kind: 'item', mode: d.fsheet }; pane(); });
 on('[data-fa-back]', () => closeFaSheet());
 if ($('#fa-do')) $('#fa-do').onclick = () => {
  if (faSheet.kind === 'bank') { const m = faSheet.mode, a = bankAmt === 'all' ? (m === 'baek' ? Math.min(s.baek.principal, s.cash) : bankAll(m)) : bankAmt; return closeFaSheet(() => m === 'baek' ? act('baekRepay', a) : act('bank', [m, a])); }
  const k = facil, items = faItems(k), id = facilSel[k] || items.find(x => faMine(k, x))?.id || items[0].id, buy = faSheet.mode !== 'sell';
  closeFaSheet(() => k === 'house' ? act('house', id) : k === 'car' ? act('car', id) : act('shop', [id, buy]));
 };
}
/* ── 회사 탭 — 지분 카드(K1 · 5 · 10 · 20 · 30% 사다리 · 경영권이면 방침) · 투자회사는 잠금 카드 → 차리면 운용 자금 · 매니저(K3) ── */
const GATES = [[0, '공시'], [1, '주총'], [2, '이사'], [3, '경영권']], POL = { invest: '투자', div: '배당', buyback: '자사주' };
/* 회사 탭 깊이(11-20 대표님 '이대로 넣어' · D-046 · 목업 09_목업/회사깊이_1120 K1 ~ K6)
   첫 화면 = 왼쪽 가진 회사 줄(이름 · 오늘 · 내 지분 · 지금 단계 · ›) + 오른쪽 투자회사(차리기 전 = 조건 둘 · 차린 뒤 = 운용 자금 · 지난달 · 매니저 수 ›)
   회사 줄 › = 2단 그 회사(지분 · 가치 · 이사 보수 · 방침 · 사다리 · TRADING) · 방침 바꾸기 › = 3단 · 투자회사 › = 2단(매니저 줄) · 자금 넣기 · 빼기 › = 3단 */
let ksSheet = null, ksWin = null, ksPol = null, ksAmt = 1e8, ksShown = ['', ''];   /* 이미 열린 판 · 창은 다시 그려도 서서히 나타나기를 되풀이하지 않음 */
const stPct = v => (v * 100).toFixed(v < 0.01 ? 2 : 1) + '%';   /* 1% 아래 지분은 0.0% 로 안 보이게 */
const agmNext = s => { const m = +DAYS[s.day].slice(5, 7); return [1, 4, 7, 10].find(x => x > m) || 1; };
function ksSheetHtml(s) {
 const cell = (k, v, c = '') => `<div><small>${k}</small><b class="${c}">${v}</b></div>`, back = '<button class="sm mk-x" data-ks-back>CLOSE ✕</button>';
 if (ksSheet === 'firm' && s.firm) { const F = s.firm, pay = F.mgr.reduce((n, m) => n + T.firm_tiers[m.tier].pay, 0);
  return `<div class="mk-hd"><b>투자회사</b><button class="ks2-hb" data-ksw="money">자금 넣기 · 빼기 <i>›</i></button>${back}</div>
   <div class="mk-cells">${cell('운용 자금', M(F.capital))}${cell('지난달', `${F.last >= 0 ? '+' : '−'}${M(Math.abs(F.last))}`, sg2(F.last))}${cell('매니저 보수 · 달', M(pay))}</div>
   <div class="ks2-mrows">${Object.entries(T.firm_tiers).map(([k, t]) => { const i = F.mgr.findIndex(m => m.tier === k); return `<div class="ks2-mr ${i >= 0 ? '' : 'off'}"><b>${esc(t.name)}</b><span>달 기대 +${(t.mean * 100).toFixed(1)}%</span><span>보수 ${M(t.pay)}</span>${i >= 0 ? `<button data-fire="${i}">내보내기</button>` : `<button data-hire="${k}" ${F.mgr.length >= 3 ? 'disabled' : ''}>고용</button>`}</div>`; }).join('')}</div>`; }
 const x = ksSheet && ST[ksSheet]; if (!x) return '';
 const gt = s.gate[x.id] ?? -1, st = g.stake(x.id), val = (s.hold[x.id] || 0) * g.price(x.id);
 const third = gt >= 2 ? cell('이사 보수 · 달', M(g.price(x.id) * x.shares * N.director_pay)) : gt >= 1 ? cell('다음 주총', agmNext(s) + '월') : '';
 return `<div class="mk-hd"><b>${esc(x.name)}</b><small>${esc(x.sector)}</small><button class="ks2-hb" data-kstrade="${x.id}">TRADING <i>›</i></button>${back}</div>
  <div class="mk-cells" style="grid-template-columns:repeat(${third ? 3 : 2},1fr)">${cell('내 지분', stPct(st))}${cell('지분 가치', M(val))}${third}</div>
  ${gt >= 3 ? `<div class="ks2-pol"><small>방침</small><b>${POL[s.policy[x.id]] || '—'}</b><small>다음 주총 · ${agmNext(s)}월</small><button class="ks2-hb" data-ksw="pol">바꾸기 <i>›</i></button></div>` : ''}
  <div class="ks2-lad">${GATES.map(([i, n]) => `<div class="${gt >= i ? 'on' : i === gt + 1 ? 'nx' : ''}">${Math.round(N.stake_gates[i] * 100)}%<small>${n}${gt >= i ? ' ✓' : i === gt + 1 ? ' · NEXT' : ''}</small></div>`).join('')}</div>`;
}
function ksWinHtml(s) {
 if (ksWin === 'pol' && ST[ksSheet]) { const cur = ksPol || s.policy[ksSheet] || 'invest', SUB = { invest: '회사 성장 +', div: '분기 배당 ×2', buyback: '주가 덜 흔들림' };
  return `<h2>${esc(ST[ksSheet].name)} · 방침</h2><div class="ks2-pick">${Object.entries(POL).map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-kspol="${k}"><span>${n}${cur === k ? ' ✓' : ''}</span><small>${SUB[k]}</small></button>`).join('')}</div><div class="fa-ft"><button data-ksw-back>BACK</button><button class="primary" id="ks-pol-ok">OK</button></div>`; }
 if (ksWin === 'money' && s.firm) { const F = s.firm;
  return `<div class="mk-hd"><h2>투자회사 · 자금</h2><button class="sm mk-x" data-ksw-back>CLOSE ✕</button></div><div class="fa-chips" style="grid-template-columns:repeat(3,1fr)">${[1e8, 5e8, 1e9].map(v => `<button class="${ksAmt === v ? 'on' : ''}" data-ksamt="${v}">${M(v)}</button>`).join('')}</div>
   <div class="fa-chg"><span>운용 자금</span><b>${M(F.capital)}</b></div><div class="fa-chg"><span>현금</span><b>${M(s.cash)}</b></div>
   <div class="fa-ft"><button data-ksfa="take" ${F.capital < ksAmt ? 'disabled' : ''}>빼기</button><button class="primary" data-ksfa="add" ${s.cash < ksAmt ? 'disabled' : ''}>넣기</button></div>`; }
 return '';
}
function drawStake(P) {
 const s = g.s, mine = T.stocks.filter(x => g.stake(x.id) > 0).sort((a, b) => g.stake(b.id) - g.stake(a.id));
 if (ksSheet && ksSheet !== 'firm' && !mine.some(x => x.id === ksSheet)) ksSheet = null;
 const row = x => { const gt = s.gate[x.id] ?? -1, ch = dayChg(x.id);
  return `<button class="ks2-row" data-ks="${x.id}"><span class="ks2-lg">${esc(x.name.slice(0, 1))}</span><span class="ks2-nm"><b>${esc(x.name)}</b><small>${esc(x.sector)} · 오늘 <span class="${sg2(ch)}">${pct1(ch)}</span></small></span><span class="ks2-pc">${stPct(g.stake(x.id))}</span><span class="ks2-gt ${gt >= 3 ? 'top' : ''}">${gt >= 0 ? GATES[gt][1] : ''}</span><i class="ks2-go">›</i></button>`; };
 const left = `<div class="ks2-pnl ks2-st"><h3>MY STAKES</h3><div class="ks2-rows">${mine.map(row).join('')}</div><button class="ks2-more" data-tomarket>+ TRADING</button></div>`;
 let right;
 if (!s.firm) { const okW = g.lvl('wealth') >= 3, okC = s.cash >= N.firm_cost;
  right = `<div class="ks2-pnl ks2-firm"><h3>INVESTMENT FIRM</h3><div class="ks2-fb"><span class="ks2-pic lk" style="background-image:url('${art('배경/in_ceo_office.jpg')}')"></span>
   <div class="ks2-cond"><div><span>재력 3단계</span><b class="${okW ? 'ok' : 'no'}">${okW ? '✓' : '✗'}</b></div><div><span>현금 ${M(N.firm_cost)}</span><b class="${okC ? 'ok' : 'no'}">${okC ? '✓' : '✗'}</b></div></div>
   <button class="primary ks2-found" data-found ${okW && okC ? '' : 'disabled'}>차리기</button></div></div>`;
 } else { const F = s.firm;
  right = `<button class="ks2-pnl ks2-firm open" data-ks="firm"><h3>INVESTMENT FIRM<i class="ks2-go">›</i></h3><div class="ks2-fb"><span class="ks2-pic" style="background-image:url('${art('배경/in_ceo_office.jpg')}')"></span>
   <b class="ks2-fv">${M(F.capital)}</b><small class="ks2-fs">운용 자금 · 지난달 <span class="${sg2(F.last)}">${F.last >= 0 ? '+' : '−'}${M(Math.abs(F.last))}</span></small><span class="ks2-fs">매니저 ${F.mgr.length} / 3</span></div></button>`; }
 const sh = ksSheetHtml(s), win = sh ? ksWinHtml(s) : '';
 P.innerHTML = `<div class="fa-bg" style="background-image:url('${art('배경/in_ceo_office.jpg')}')"></div>${left}${right}
  ${sh ? `<div class="fa-sheet ks-sheet ${ksShown[0] === ksSheet ? 'still' : ''}"><div class="fa-dim" data-ks-back></div><div class="db-wrap ks2-win">${sh}</div></div>` : ''}${win ? `<div class="fa-sheet ks-win ${ksShown[1] === ksWin ? 'still' : ''}"><div class="fa-dim" data-ksw-back></div><div class="fa-win">${win}</div></div>` : ''}`;
 ksShown = [sh ? ksSheet : '', win ? ksWin : ''];
 const close = (sel, go) => { const el = $(sel); if (!el || !calMotion()) return go(); el.classList.add('out'); setTimeout(go, 180); };
 on('[data-ks]', d => { ksSheet = d.ks; ksWin = null; pane(); });
 on('[data-ks-back]', () => close('.ks-sheet', () => { ksSheet = null; ksWin = null; pane(); }));
 on('[data-ksw]', d => { ksWin = d.ksw; ksPol = null; pane(); });
 on('[data-ksw-back]', () => close('.ks-win', () => { ksWin = null; pane(); }));
 on('[data-kspol]', d => { ksPol = d.kspol; pane(); });
 on('[data-ksamt]', d => { ksAmt = +d.ksamt; pane(); });
 if ($('#ks-pol-ok')) $('#ks-pol-ok').onclick = () => { const id = ksSheet, p = ksPol || s.policy[id] || 'invest'; ksWin = null; ksPol = null; act('agm', [id, p]); };
 on('[data-ksfa]', d => { act('firm', [d.ksfa, ksAmt]); });
 on('[data-kstrade]', d => { sel = d.kstrade; focusAll = false; ksSheet = null; tab = 'market'; refresh(); });
 on('[data-hire]', d => act('firm', ['hire', d.hire])); on('[data-fire]', d => act('firm', ['fire', +d.fire])); on('[data-found]', () => act('firm', ['found']));
 on('[data-tomarket]', () => { tab = 'market'; refresh(); });
}
/* ── 인맥 탭 — 가운데 휴대폰(11-20 대표님 'R1 → R2 · R3 · R4 다' · 목업 09_목업/인맥탭_1120 R1 ~ R4)
   목록(R1) → 그 사람과 대화(R2 · 그 사람이 왼쪽에 섬 · 오른쪽 관계 넷 · 받은 것) → 얼굴을 누르면 프로필(R3) · 안 읽은 메시지가 있으면 잠금 화면(R4)부터
   비서와 다른 점: 청록 휴대폰 · 사람을 고름 · 할 일 = 저녁 약속 · 안부(하루 한 번 관계 +) · 선물 · 귀띔 부탁(관계 30부터 → 저녁 약속) — 대화 기록은 판 상태 uiTalk */
let peopleView = 'list';
const ROLE_SAY = { ceo: '요즘 회사 일로 정신없어요.', reporter: '재밌는 얘기 생기면 저도 좀 끼워 줘요.', analyst: '보고서 마감이라 바빠요. 그래도 연락 줘서 고마워요.', tipster: '사장님, 요즘 시장에 말이 많아요.', loan: '이자 날짜만 잊지 마세요.', official: '말씀 조심하세요. 그래도 반가워요.', banker: '언제 한번 지점에 들르세요.', friend: '야, 이번 주 한잔하자.' };
function talkOf(id) { const s = g.s; s.uiTalk ||= {}; const L = (s.uiTalk[id] ||= []); if (!L.length && s.contacts[id]?.known) L.push({ d: 0, at: '', sys: true, text: '명함을 주고받음', read: true }); return L; }
function addTalk(id, x) { talkOf(id).push({ d: g.s.day, at: x.at || nowHM(g.s) || '저녁', ...x }); }
function logTalk(m) {   /* 사람에게서 온 알림(전화 · 귀띔 · 이야기)을 그 사람 대화에도 남김 — 알림 창은 그대로 */
 if (m.logged || !m.who || !g.s.contacts[m.who]) return; m.logged = true;
 if (m.type === 'call') addTalk(m.who, { text: '오늘 저녁 한잔 어때?' });
 if (m.type === 'tip') addTalk(m.who, { text: `${ST[m.stock].name}, ${m.dir > 0 ? '내일 좋은 소식 있을 거야' : '조만간 안 좋은 게 터져'}.`, tip: true });
 if (m.type === 'talk') addTalk(m.who, { sys: true, text: m.text });
}
const unreadOf = id => (g.s.uiTalk?.[id] || []).filter(x => !x.me && !x.sys && !x.read).length;
function peopleNext(p) { const who = p.who, st = g.s.story.stage[who] || 0; if (CANDIDATES.includes(who)) return nextStage(who, st); const nx = [30, 60, 85].find(x => p.rel < x); return nx ? '관계 ' + nx : '—'; }
function drawPeople(P) {
 const s = g.s, list = peopleData().sort((a, b) => (b.id === 'yuna') - (a.id === 'yuna') || b.known - a.known), known = list.filter(c => c.known && c.id !== 'yuna');
 const unread = known.reduce((n, c) => n + unreadOf(c.id), 0), lockKey = known.reduce((n, c) => n + talkOf(c.id).filter(x => !x.me && !x.sys).length, 0);   /* 지금까지 온 메시지 수 — 마지막으로 본 뒤 새로 왔을 때만 잠금 화면 */
 if (unread && (s.uiLockSeen ?? 0) < lockKey) peopleView = 'lock';   /* 안 읽은 메시지가 새로 왔으면 잠금 화면부터(R4) */
 const p = list.find(x => x.id === person && x.known && x.id !== 'yuna') || known[0];
 const sb = `<div class="pp-sb"><span>${nowHM(s) || (s.phase === 'weekend' ? (s.slot ? '일요일' : '토요일') : '')}</span><span>3G ▮▮▮</span></div>`;
 const words = w => T.rel_words[w] || [], ladder = c => { const W = words(c.who), cur = W.indexOf(relWord(c.who)); return `<div class="pp-lad">${W.map((w, i) => `<div class="${i === cur ? 'on' : ''}">${i <= cur + 1 ? esc(w) : '?'}</div>`).join('')}</div>`; };
 const got = c => { const scenes = s.story.history.filter(h => T.story.scenes.find(x => x.id === h.id)?.choices.some(ch => ch.fx.some(f => f.k === 'stage' && f.who === c.who))).map(h => T.story.scenes.find(x => x.id === h.id).title.replace(' [더함]', '')); const tips = talkOf(c.id).filter(x => x.tip).length; return [...scenes, ...(tips ? [`귀띔 ${tips}번`] : [])]; };
 const days = c => c.last == null ? '없음' : c.last === s.day ? '오늘' : `${s.day - c.last}거래일 전`;
 let phone = '', side = '', ill = '';
 if (peopleView === 'lock') {
  const items = known.flatMap(c => talkOf(c.id).filter(x => !x.me && !x.sys && !x.read).slice(-1).map(x => ({ c, x }))).reverse();
  phone = `${sb}<div class="pp-lk"><div class="pp-tm">${nowHM(s) || (s.phase === 'evening' ? '저녁' : '')}</div><div class="pp-dt">${esc(g.date())}</div>${items.map(({ c, x }) => `<button class="pp-nt" data-open="${c.id}"><img src="${smallArt(c)}" alt=""><div><b>${esc(c.name)}</b><small>${esc(x.text)}</small></div><span>${esc(x.at)}</span></button>`).join('')}<button class="pp-unlock" id="pp-unlock">▲ 메시지 ${unread}</button></div>`;
 } else if (peopleView === 'list' || !p) {
  const unk = list.filter(c => !c.known).length;   /* 모르는 사람은 한 줄로 묶음(11-20 '목록을 채움') */
  const rows = list.filter(c => c.known).map(c => {
   const L = c.id === 'yuna' ? [] : talkOf(c.id), last = L.at(-1), n = c.id === 'yuna' ? 0 : unreadOf(c.id);
   return `<button class="pp-ct" data-open="${c.id}"><img src="${smallArt(c)}" alt=""><div><b>${esc(c.name)}</b> <i>${esc(relWord(c.who))}</i><small>${esc(c.id === 'yuna' ? '비서 탭에서 이야기' : last ? (last.me ? '나: ' : '') + last.text : '')}</small></div><span class="pp-t">${esc(last?.at || '')}${n ? `<em>${n}</em>` : ''}${s.uiAppointment === c.id ? '<em class="ap">약속</em>' : ''}</span></button>`; }).join('');
  phone = `${sb}<div class="pp-hd"><b>메시지</b><small>${list.filter(c => c.known).length} / ${list.length}${unread ? ' · 안 읽은 ' + unread : ''}</small></div><div class="pp-ls list">${rows}${unk ? `<div class="pp-ct off"><span class="pp-unk">?</span><div><b>??? × ${unk}</b><small>소개로 만남</small></div></div>` : ''}</div>`;
 } else {
  const L = talkOf(p.id); L.forEach(x => { x.read = true; });
  const c = s.contacts[p.id], role = T.roles[p.role], ap = s.uiAppointment === p.id, greeted = c.greet === s.day, ask = p.rel >= 30;
  const head = `<div class="pp-hd"><button class="pp-bk" id="pp-back">◀</button><img src="${smallArt(p)}" id="pp-face" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.roleName)} · ${esc(relWord(p.who))}</small></div></div>`;
  if (peopleView === 'profile') {
   phone = `${sb}<div class="pp-pf" style="background-image:url('${bustArt(p.who)}')"><button class="pp-bk" id="pp-back">◀</button><div><b>${esc(p.name)}</b><small>${esc(p.roleName)} · ${esc(relWord(p.who))}</small></div></div>
    <div class="pp-pb">${ladder(p)}<div class="pp-kv"><span>관계</span><b>${Math.round(p.rel)} · NEXT ${esc(peopleNext(p))}</b></div>${p.stock ? `<div class="pp-kv"><span>회사</span><b>${esc(ST[p.stock].name)}</b></div>` : ''}${p.who === 'baek' ? `<div class="pp-kv"><span>남은 원금</span><b>${M(s.baek.principal)}</b></div><div class="pp-kv"><span>다음 이자</span><b>${esc(nextInterest())}</b></div>` : ''}<div class="pp-kv"><span>받은 것</span><b>${esc(got(p).join(' · ') || '아직 없음')}</b></div><div class="pp-kv"><span>마지막 만남</span><b>${days(p)}</b></div></div>
    <div class="pp-acts"><button class="hot" id="pp-msg">메시지</button><button data-pa="date">${ap ? '약속 취소' : '저녁 약속'}</button><button data-pa="gift" ${s.gift ? '' : 'disabled'}>${s.gift ? '선물 있음' : '선물'}</button></div>`;
  } else {
   const lines = L.slice(-14).map((x, i, A) => (i === 0 || A[i - 1].d !== x.d ? `<div class="pp-day">${esc(g.date(x.d))}</div>` : '') + (x.sys ? `<div class="pp-b sys">${esc(x.text)}</div>` : `<div class="pp-b ${x.me ? 'me' : ''}">${esc(x.text)}${x.at ? `<small>${esc(x.at)}</small>` : ''}</div>`)).join('');
   phone = `${sb}${head}<div class="pp-ls">${lines}</div><div class="pp-q"><button class="${ap ? '' : 'hot'}" data-pa="date">${ap ? '약속 취소' : '저녁 약속'}<small>${ap ? '오늘' : '장 마감 뒤'}</small></button><button data-pa="greet" ${greeted ? 'disabled' : ''}>안부 묻기<small>${greeted ? '내일' : '관계 +' + N.rel_greet}</small></button><button data-pa="gift" ${s.gift ? '' : 'disabled'}>선물<small>${s.gift ? '있음 · 다음 만남' : '백화점'}</small></button><button data-pa="ask" ${ask ? '' : 'disabled'}>귀띔 부탁<small>${ask ? (role.acc >= 0.8 ? '믿을 만함' : '반반') : '관계 30'}</small></button></div>`;
  }
  ill = `<img class="pp-ill" src="${fullArt(p.who)}" alt="${esc(p.name)}">`;
  side = `<div class="pp-side"><div class="pp-card"><h3>RELATION</h3>${ladder(p)}<div class="pp-kv"><span>관계</span><b>${Math.round(p.rel)}</b></div><div class="pp-kv"><span>NEXT</span><b>${esc(peopleNext(p))}</b></div><div class="pp-kv"><span>마지막 만남</span><b>${days(p)}</b></div></div><div class="pp-card"><h3>받은 것</h3>${got(p).map(x => `<div class="pp-kv"><span>${esc(x)}</span></div>`).join('') || '<div class="pp-kv"><span class="mute">아직 없음</span></div>'}</div></div>`;
 }
 P.innerHTML = `<div class="pp-bg" style="background-image:url('${art(HOUSE[s.house].bg)}')"></div>${ill}<div class="pp-ph">${phone}</div>${side}`;
 const ls = $('.pp-ls:not(.list)'); if (ls) ls.scrollTop = ls.scrollHeight;
 on('[data-open]', d => { if (d.open === 'yuna') { tab = 'senior'; return refresh(); } s.uiLockSeen = lockKey; person = d.open; peopleView = 'chat'; save(); pane(); secBadge(); });
 if ($('#pp-unlock')) $('#pp-unlock').onclick = () => { s.uiLockSeen = lockKey; peopleView = 'list'; save(); pane(); };
 if ($('#pp-back')) $('#pp-back').onclick = () => { peopleView = peopleView === 'profile' ? 'chat' : 'list'; pane(); };
 if ($('#pp-face')) $('#pp-face').onclick = () => { peopleView = 'profile'; pane(); };
 if ($('#pp-msg')) $('#pp-msg').onclick = () => { peopleView = 'chat'; pane(); };
 on('[data-pa]', d => { const c = s.contacts[p.id], role = T.roles[p.role];
  if (d.pa === 'date') { if (s.uiAppointment === p.id) { delete s.uiAppointment; addTalk(p.id, { sys: true, text: '오늘 저녁 약속 취소', read: true }); } else { s.uiAppointment = p.id; addTalk(p.id, { me: true, text: '오늘 저녁 시간 돼?' }); addTalk(p.id, { text: '좋아요! 장 끝나고 봬요.', read: true }); addTalk(p.id, { sys: true, text: '📅 오늘 저녁 약속', read: true }); } }
  if (d.pa === 'greet' && g.dispatch('greet', [p.id])) { addTalk(p.id, { me: true, text: '잘 지내?' }); addTalk(p.id, { text: ROLE_SAY[p.role] || '네, 잘 지내요.', read: true }); }
  if (d.pa === 'ask' && p.rel >= 30) { addTalk(p.id, { me: true, text: '요즘 들은 거 있어?' }); addTalk(p.id, { text: '여기선 좀 그렇고… 오늘 저녁에 봬요.', read: true }); s.uiAppointment = p.id; addTalk(p.id, { sys: true, text: '📅 오늘 저녁 약속', read: true }); }
  save(); pane(); });
}
/* ── 비서 탭 — 유나와 휴대폰 대화(11-20 대표님 'E 넷 다 넣어' · 목업 09_목업/비서탭_1120 E1 ~ E4)
   장중 · 주말 = 대화 안 뉴스 카드 · 빠른 답 · 장 마감 뒤 = 대화 안 결산 카드 · 대화 안에서 저녁 고름(왼쪽 칸 · 아래 관계 넷은 D-045 로 2단 '한유나' · '오늘 결산'으로 옮김)
   저녁을 같이 한 뒤 = E4(귀띔 알림이 창 대신 대화로 옴 · 내일 TIP · TRUST) — 화면만 바꾸고 규칙은 sim.js 그대로 */
const Y_FACE = { open: 'base', weekend: 'base', evening: 'wink', night: 'proud' };
const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const nowHM = s => s.phase === 'open' ? hm(N.open + s.minute) : s.phase === 'evening' ? '15:32' : '';
const dayChg = id => g.price(id) / g.s.open[id] - 1, pct1 = x => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`, sg2 = x => x >= 0 ? 'up' : 'dn';
function secChat(s) {   /* 오늘 대화 — 플레이어가 빠른 답으로 한 말은 판 상태 uiChat(그날만) */
 if (s.uiChat?.day !== s.day) s.uiChat = { day: s.day, items: [] };
 return s.uiChat;
}
function secMode(s) { const m = s.msgs[0]; return m?.type === 'senior' ? 'night' : s.phase === 'evening' ? 'evening' : s.phase === 'weekend' ? 'weekend' : 'open'; }
function yunaBubbles(s) {   /* 유나가 오늘 보낸 말(안 읽은 수 셈에도 씀) */
 const mode = secMode(s), out = [];
 if (mode === 'open') { out.push({ t: 0, at: '09:00', text: '좋은 아침이에요, 사장님. 오늘 뉴스부터 봐요.' });
  for (const f of s.shown.filter(f => f.day === s.day && f.kind === 'news' && f.stock).slice(-2)) { const src = SRC[f.src], n = src?.stars ?? 0;
   out.push({ t: f.t, at: hm(N.open + f.t), text: `이거 ${src ? src.name + '발' : '소문'}이에요. ${n ? '별 ' + ['', '하나', '둘', '셋'][n] : '별 없음'}.`, news: f }); }
  if (s.minute >= 120) out.push({ t: s.minute, at: hm(N.open + s.minute), text: s.stress >= N.sick_from ? '사장님, 오늘은 좀 쉬세요. 얼굴이 안 좋아요.' : '장중엔 서두르지 마세요. 별을 보세요.' }); }
 if (mode === 'weekend') out.push({ t: 0, at: '10:00', text: '쉬는 날엔 쉬셔야 오래 가요.' });
 if (mode === 'evening') { const pnl = g.netWorth() - s.dayStart;
  out.push({ t: 0, at: '15:31', text: pnl >= 0 ? (s.day ? '잘하셨어요, 사장님.' : '첫날치곤 괜찮았어요.') : '내일 만회해요.' });   /* 오늘 손익은 위 띠가 원본 — 결산은 이 말에 붙는 카드(D-045) */
  out.push({ t: 1, at: '15:32', text: s.uiAppointment && s.uiAppointment !== 'yuna' ? `오늘은 ${PEOPLE[s.uiAppointment]?.name || ''}님 만나기로 하셨죠?` : '수고하셨어요, 사장님. 저녁은 어떻게 하실래요?' }); }
 return out;
}
function secBadge() { const s = g.s, b = $('.numtabs [data-tab=senior]'); if (!b || title) return; const n = yunaBubbles(s).length;
 if (tab === 'senior') s.uiSecSeen = { day: s.day, mode: secMode(s), n }; const seen = s.uiSecSeen?.day === s.day && s.uiSecSeen.mode === secMode(s) ? s.uiSecSeen.n : 0;
 const dot = $('#hb-dot'); if (dot) dot.hidden = !(n > seen);
 if (n > seen && tab !== 'senior' && tab !== 'home') b.dataset.badge = n - seen; else delete b.dataset.badge;
 const pb = $('.numtabs [data-tab=people]'), un = T.contacts.reduce((k, c) => k + unreadOf(c.id), 0); if (pb) { if (un && tab !== 'people') pb.dataset.badge = un; else delete pb.dataset.badge; } }
/* 비서 탭 깊이(11-20 대표님 '이대로 넣어' · '셋으로 줄여' · D-045 · 목업 09_목업/비서깊이_1120 B1 ~ B6)
   첫 화면 = 유나 + 휴대폰 대화만(왼쪽 칸 · 아래 사다리 없음) · 휴대폰 머리 › = 2단 한유나 · 대화 안 결산 카드 › = 2단 오늘 결산 · REPORT › = 2단 올해 · 다른 저녁 › = 3단 작은 창 */
let ysSheet = null;
const yRate = s => { const y = s.yunaTip, k = y ? y.n - y.pend.length : 0; return k ? { hit: y.hit, k, p: Math.round(y.hit / k * 100) } : null; };
const md = d => `${+DAYS[d].slice(5, 7)}월 ${+DAYS[d].slice(8, 10)}일`;
function ysSheetHtml(s) {
 const lv = g.seniorLvl(), cell = (k, v, c = '') => `<div><small>${k}</small><b class="${c}">${v}</b></div>`, back = '<button class="sm mk-x" data-ys-back>CLOSE ✕</button>';
 const li = (a, b, c, d, cls = '') => `<div class="ysl"><span class="t">${a}</span><span>${b}</span><span>${c}</span><span class="r ${cls}">${d}</span></div>`;
 if (ysSheet === 'me') {
  const words = T.rel_words.yuna, cur = words.indexOf(relWord('yuna')), r = yRate(s), last = s.uiYunaLast, nx = lv < 5 ? (lv + 1) * 20 : null, log = (s.yunaTip?.log || []).slice(-3).reverse();
  return `<div class="mk-hd"><b>${SNAME}</b>${back}</div>
   <div class="ysm-lad">${words.map((w, i) => `<span class="${i === cur ? 'on' : ''}">${i <= cur + 1 ? esc(w) : '?'}</span>`).join('')}</div>
   <div class="ysm-trust">TRUST<span class="ys-meter pink"><i style="width:${nx ? Math.min(100, s.senior / nx * 100) : 100}%"></i></span><b>${Math.round(s.senior)}${nx ? ' / ' + nx : ''}</b></div>
   <div class="mk-cells">${cell('귀띔 맞힘', r ? `${r.hit} / ${r.k} · ${r.p}%` : '—')}${cell('받은 귀띔', (s.yunaTip?.n || 0) + '번')}${cell('마지막 저녁', last == null ? '없음' : last === s.day || secMode(s) === 'night' && last === s.day - 1 ? '오늘' : `${s.day - last}거래일 전`)}</div>
   ${log.length ? `<h3 class="ysm-h">TIP LOG</h3><div class="ysm-list">${log.map(x => li(md(x.day), esc(ST[x.stock].name), `<span class="${x.dir > 0 ? 'up' : 'dn'}">${x.dir > 0 ? '▲' : '▼'}</span>`, x.hit ? '맞음' : '틀림', x.hit ? 'ok' : 'no')).join('')}</div>` : ''}`; }
 if (ysSheet === 'report') {
  const y0 = DAYS[s.day].slice(0, 4), h = s.hist.filter(x => DAYS[x.d]?.startsWith(y0)), base = h.length ? h[0].nw - h[0].pnl : s.start, now = g.netWorth(), got = T.achievements.filter(a => s.ach[a.id]).sort((a, b) => s.ach[b.id] - s.ach[a.id]), nx = T.achievements.find(a => !s.ach[a.id]);
  return `<div class="mk-hd"><b>${y0} REPORT</b>${back}</div>
   <div class="mk-cells">${cell(`올해 · 시작 ${M(base)}에서`, `${now >= base ? '+' : '−'}${M(Math.abs(now - base))}`, now >= base ? 'up' : 'dn')}${cell('랭킹', g.rank() + '위')}${cell('업적', `${got.length} / ${T.achievements.length}`)}</div>
   <div class="ysm-chart"><canvas id="ys-nw" width="1100" height="200"></canvas><span style="left:14px;bottom:6px">${h.length ? md(h[0].d) : ''}</span><span style="right:14px;bottom:6px">${md(s.day)}</span></div>
   <h3 class="ysm-h">ACHIEVEMENTS</h3><div class="ysm-list">${got.slice(0, 2).map(a => li(md(Math.max(0, s.ach[a.id] - 1)), esc(a.name), '', 'GET', 'ok')).join('')}${nx ? li('NEXT', esc(nx.name), esc(nx.text), '').replace('class="ysl"', 'class="ysl off"') : ''}</div>`; }
 if (ysSheet === 'close') {
  const live = T.stocks.filter(x => !s.delisted[x.id]).map(x => [x, dayChg(x.id)]).sort((a, b) => b[1] - a[1]), rk = g.rank(), prev = s.uiRankDay?.rank, tip = (s.yunaTip?.log || []).find(x => x.at === s.day), tr = s.uiTrades?.day === s.day ? s.uiTrades.items : [];
  return `<div class="mk-hd"><b>MARKET CLOSE · ${md(s.day)}</b>${back}</div>
   <div class="mk-cells">${cell('거래', s.tradesToday + '회')}${cell('랭킹', `${rk}위${prev && prev !== rk ? ` <span class="${prev > rk ? 'up' : 'dn'}">${prev > rk ? '▲' : '▼'}${Math.abs(prev - rk)}</span>` : ''}`)}${cell('오늘 귀띔', tip ? (tip.hit ? '맞음' : '틀림') : '—', tip ? (tip.hit ? 'ok' : 'no') : '')}</div>
   <div class="mk-cells" style="grid-template-columns:1fr 1fr">${cell('BEST', `${esc(live[0][0].name)} <span class="up">${pct1(live[0][1])}</span>`)}${cell('WORST', `${esc(live.at(-1)[0].name)} <span class="dn">${pct1(live.at(-1)[1])}</span>`)}</div>
   ${tr.length ? `<h3 class="ysm-h">TRADES</h3><div class="ysm-list">${tr.slice(-4).map(x => li(x.at, esc(ST[x.id].name), x.side === 'buy' ? '사기' : '팔기', M(x.v))).join('')}</div>` : ''}`; }
 if (ysSheet === 'eve') {
  const b = (ev, name, sub, off) => `<button data-ev="${ev}" ${off ? 'disabled' : ''}><span>${name}</span><small>${sub}</small></button>`;
  return `<div class="mk-hd"><h2>다른 저녁</h2><button class="sm mk-x" data-ys-back>CLOSE ✕</button></div><div class="ysm-eve">${b('pub', '호프집 갈래', '소문 · 새 사람')}${b('study', '공부할래', '시장 지식 +')}${lv >= N.senior_paid_level ? b('paid', '유료 분석 부탁해', M(N.senior_paid_cost) + ' · 가장 크게 움직일 종목', s.cash < N.senior_paid_cost) : ''}<button data-yq="more"><span>다른 사람 만나기</span><small>›</small></button></div>`; }
 return '';
}
function ysNwChart() { const cv = $('#ys-nw'); if (!cv) return; const s = g.s, y0 = DAYS[s.day].slice(0, 4), d = s.hist.filter(x => DAYS[x.d]?.startsWith(y0)), c = cv.getContext('2d'), w = cv.width, h = cv.height; c.clearRect(0, 0, w, h); if (d.length < 2) return;
 const v = d.map(x => x.nw), base = d[0].nw - d[0].pnl, lo = Math.min(base, ...v), hi = Math.max(base, ...v), y = x => h - 30 - (x - lo) / (hi - lo || 1) * (h - 50), X = i => 10 + i / (v.length - 1) * (w - 20);
 c.setLineDash([8, 8]); c.strokeStyle = '#2c3870'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y(base)); c.lineTo(w, y(base)); c.stroke(); c.setLineDash([]);
 c.beginPath(); v.forEach((x, i) => i ? c.lineTo(X(i), y(x)) : c.moveTo(X(i), y(x))); c.strokeStyle = '#f2c14e'; c.lineWidth = 4; c.stroke(); }
function drawSec(P) {
 const s = g.s, mode = secMode(s), m = s.msgs[0], lv = g.seniorLvl();
 if (ysSheet === 'eve' && mode !== 'evening' || ysSheet === 'close' && mode !== 'evening') ysSheet = null;
 const bg = mode === 'weekend' ? art(HOUSE[s.house].bg) : art(mode === 'open' ? '배경/in_office_sales.jpg' : '배경/in_ceo_office.jpg');
 const ill = fullArt('yuna', mode === 'open' && s.stress >= N.sick_from ? 'worry' : Y_FACE[mode]);
 const head = `<button class="ys-hd" data-ys="me"><img src="${coachFace(Y_FACE[mode])}" alt=""><div><b>${SNAME}</b><small>${esc(relWord('yuna'))}</small></div><i class="ys-go">›</i></button>`;
 const chat = secChat(s), bub = yunaBubbles(s);
 const stockCard = (id, top, sub) => `<span class="ys-stk" data-stk="${id}"><b>${esc(ST[id].name)}</b><span class="${top.c}">${top.t}<i class="ys-go">›</i></span><small>${esc(sub)}</small></span>`;
 const yb = x => `<div class="ys-b">${esc(x.text)}${x.news ? stockCard(x.news.stock, { t: `${Math.round(g.price(x.news.stock)).toLocaleString()} ${pct1(dayChg(x.news.stock))}`, c: sg2(dayChg(x.news.stock)) }, `${x.news.head} · ${SRC[x.news.src]?.name || ''} ${'★'.repeat(SRC[x.news.src]?.stars || 0)}`) : ''}${x.html || ''}<small>${x.at}</small></div>`;
 const mine = x => x.me ? `<div class="ys-b me">${esc(x.text)}<small>${x.at}</small></div>` : yb(x);
 let lines = '', foot = '', day = `${md(s.day)} ${WEEK_KO[dow(s.day)]}요일`, sbt = nowHM(s) || (s.slot ? '일요일' : '토요일');
 if (mode === 'open' || mode === 'weekend') {
  lines = [...bub.map(x => ({ ...x })), ...chat.items].sort((a, b) => a.t - b.t).map(mine).join('');
  const news = s.shown.filter(f => f.day === s.day && f.stock).at(-1);
  foot = `<div class="ys-q">${mode === 'open' && news ? `<button class="hot" data-yq="trade">TRADING<small>${esc(ST[news.stock].name)}</small></button>` : ''}<button data-yq="hint">귀띔 부탁해</button><button data-ys="report">REPORT<i class="ys-go">›</i></button></div>`;
 } else if (mode === 'evening') {
  const rk = g.rank(), prev = s.uiRankDay?.rank, tip = (s.yunaTip?.log || []).find(x => x.at === s.day);
  const card = `<span class="ys-stk" data-ys="close"><b>MARKET CLOSE · ${md(s.day)}</b><span><i class="ys-go">›</i></span><small>거래 ${s.tradesToday}회 · 랭킹 ${rk}위${prev && prev !== rk ? ` ${prev > rk ? '▲' : '▼'}${Math.abs(prev - rk)}` : ''}${tip ? ' · 귀띔 ' + (tip.hit ? '맞음' : '틀림') : ''}</small></span>`;
  day += ' · 장 마감'; sbt = '15:32';
  const ap = s.uiAppointment, apP = ap && ap !== 'yuna' ? T.contacts.find(p => p.id === ap) : null;
  const pick = [apP ? `<button class="hot" data-ev="meet" data-who="${apP.id}">${esc(apP.name)} 만나기<small>예약한 약속</small></button>` : '',
   `<button class="${apP ? '' : 'hot'}" data-ev="senior">같이 먹자<small>내일 TIP · TRUST +8</small></button>`,
   '<button data-ev="rest">오늘은 혼자 쉴게<small>스트레스 −</small></button>', '<button data-ys="eve">다른 저녁<i class="ys-go">›</i></button>'].join('');
  lines = bub.map((x, i) => i === 0 ? { ...x, html: card } : x).map(mine).join('') + `<div class="ys-pick">${pick}</div>`;
 } else {   /* night — 저녁을 같이 한 뒤 · 귀띔 알림(msg senior)이 창 대신 여기로 */
  const r = yRate(s), rate = r ? r.p + '%' : '—';
  day = `${md(m.day ?? s.day)} ${WEEK_KO[dow(m.day ?? s.day)]}요일 · 저녁`; sbt = '21:10';
  lines = `<div class="ys-b me">${m.paid ? '분석 부탁해' : '같이 먹자'}<small>15:33</small></div><div class="ys-b">오늘 고마웠어요, 사장님.<small>21:05</small></div>${m.paid ? '' : '<div class="ys-day pink">TRUST +8</div>'}`
   + (m.none ? '<div class="ys-b">오늘은 딱히 보이는 게 없네요. 푹 쉬세요.<small>21:06</small></div>'
    : `<div class="ys-b">하나만 짚어 드릴게요. 장 열리면 바로요.${stockCard(m.stock, { t: m.dir > 0 ? '▲' : '▼', c: m.dir > 0 ? 'up' : 'dn' }, `TOMORROW TIP · ${m.sure ? '이건 꽤 확실해요' : '유나 맞힘 ' + rate}`)}<small>21:06</small></div>`)
   + '<div class="ys-b">내일 봬요.<small>21:06</small></div>';
  foot = `<div class="ys-q"><button class="hot" id="ys-next">내일 장 보기</button></div>`;
 }
 const sh = ysSheetHtml(s);
 P.innerHTML = `<div class="ys-bg" style="background-image:url('${bg}')"></div><img class="ys-ill" src="${ill}" alt="${SNAME}">
  <div class="ys-ph"><div class="ys-sb"><span>${sbt}</span><span>3G ▮▮▮</span></div>${head}<div class="ys-ls"><div class="ys-day">${esc(day)}</div>${lines}</div>${foot}</div>
  ${sh ? `<div class="fa-sheet ys-sheet"><div class="fa-dim" data-ys-back></div><div class="${ysSheet === 'eve' ? 'fa-win ysm-win3' : 'db-wrap ysm-win'}">${sh}</div></div>` : ''}`;
 const ls = $('.ys-ls'); if (ls) ls.scrollTop = ls.scrollHeight;
 if (ysSheet === 'report') ysNwChart();
 on('[data-ev]', d => { ysSheet = null; meetEvening(d.ev, d.who); });
 on('[data-stk]', d => { sel = d.stk; focusAll = false; tab = 'market'; refresh(); });
 on('[data-ys]', d => { ysSheet = d.ys; pane(); });
 on('[data-ys-back]', () => { const el = $('.ys-sheet'), done = () => { ysSheet = null; pane(); }; if (!el || !calMotion()) return done(); el.classList.add('out'); setTimeout(done, 180); });
 if ($('#ys-next')) $('#ys-next').onclick = () => act('msgdone');
 on('[data-yq]', d => { const c = secChat(s), at = nowHM(s) || '10:00', t = s.minute + 0.5, say = (me, yu, html) => { c.items.push({ me: true, text: me, at, t }, { text: yu, at, t: t + 0.1, html }); save(); pane(); };
  if (d.yq === 'trade') { const f = s.shown.filter(x => x.day === s.day && x.stock).at(-1); if (f) { sel = f.stock; focusAll = false; tab = 'market'; refresh(); } return; }
  if (d.yq === 'more') { ysSheet = null; s.uiEveMore = s.day; save(); return refresh(); }
  if (d.yq === 'hint') return say('귀띔 부탁해', lv >= N.senior_free_level ? '장중엔 별 둘 넘는 뉴스만 보세요. 저녁에 저랑 식사하시면 내일 하나 짚어 드릴게요.' : '아직은 저도 잘 몰라요. 저녁에 저랑 식사하면서 얘기해요.');
 });
}
function meetEvening(kind, who) {
 const day = g.s.day, st0 = g.s.stress, kn0 = g.s.rep.know, tr0 = g.s.senior, ok = g.dispatch('evening', [kind, who]);
 if (ok) { if (kind === 'senior') g.s.uiYunaLast = day; delete g.s.uiAppointment; }
 save(); refresh();
 if (ok) { const ds = Math.round(g.s.stress - st0), dk = Math.round(g.s.rep.know - kn0), dt = Math.round(g.s.senior - tr0), bits = [dt ? `유나 <b class="pk">+${dt}</b>` : '', ds ? `스트레스 ${ds > 0 ? '+' : ''}${ds}` : '', dk ? `시장 지식 <b class="up">+${dk}</b>` : ''].filter(Boolean);   /* 고른 보람이 보이게(시험관 '혼자 쉴게는 아무 반응 없음') */
  if (bits.length) setTimeout(() => floatUp(bits.join(' · '), '', dt ? '♡' : '+', dt ? 'kH' : ''), 600); }
}
/* ── 달 정산 — 첫 장은 이번 달 합계 · 백 여사 몫만 → DETAIL 은 0 이 아닌 줄만 → REPAY 는 금액 칩 작은 창(11-20 대표님 '쉽고 단계별로') ── */
let monthView = 'sum', repayAmt = 1e7;
function drawMonth(m) {
 const s = g.s, b = s.baek, locked = DAYS[s.day] < '2012-01-02', can = !locked && b.state === 'owe' && b.principal > 0 && s.cash > 0;
 const ins = [['예금 이자', m.dep], ['배당', m.div], ['월세 · 급여', (m.rent || 0) + (m.director || 0)], ['펀드', s.firm ? m.fund : 0]].filter(x => x[1]);
 const outs = [['집 · 차 · 생활', m.living], ['세금', m.tax], ['은행 대출 이자', m.interest], ['공매도 · 임금', (m.shortFee || 0) + (m.wages || 0)], ['백 여사 이자', m.baekInterest]].filter(x => x[1]);
 const tin = ins.reduce((n, x) => n + x[1], 0), tout = outs.reduce((n, x) => n + x[1], 0), net = tin - tout, mon = +DAYS[Math.max(0, s.day - 1)].slice(5, 7);
 const row = (x, sg) => `<div class="mr-row"><span>${x[0]}</span><b class="${sg > 0 ? 'up' : 'dn'}">${sg > 0 ? '+' : '−'}${M(Math.abs(x[1]))}</b></div>`;
 let body = '';
 if (monthView === 'detail') body = `<div class="mr-cols"><div><small>IN</small>${ins.length ? ins.map(x => row(x, 1)).join('') : '<div class="mr-row"><span>—</span></div>'}</div><div><small>OUT</small>${outs.map(x => row(x, -1)).join('')}</div></div>`;
 else if (monthView === 'repay') { const all = Math.min(b.principal, s.cash), a0 = repayAmt === 'all' ? all : Math.min(repayAmt, all);
  body = `<div class="mr-repay"><h2>REPAY</h2><div class="fa-chips">${[1e7, 3e7, 5e7, 'all'].map(v => `<button class="${repayAmt === v ? 'on' : ''}" data-ra="${v}">${v === 'all' ? 'ALL' : M(v)}</button>`).join('')}</div><div class="fa-chg"><span>남은 원금</span><b>${M(b.principal)} → ${M(Math.max(0, b.principal - a0))}</b></div><div class="fa-chg"><span>현금</span><b>${M(s.cash)} → ${M(s.cash - a0)}</b></div></div>`; }
 else body = `<div class="mr-big ${net >= 0 ? 'up' : 'dn'}">${net >= 0 ? '+' : '−'}${M(Math.abs(net))}</div><div class="mr-chips"><span>IN <b class="up">+${M(tin)}</b></span><span>OUT <b class="dn">−${M(tout)}</b></span></div>
  <div class="bn-kv"><span>백 여사 이자</span><b class="dn">${b.state === 'frozen' ? '채권 동결' : !b.principal ? '다 갚음' : '−' + M(m.baekInterest || 0)}</b>${!locked && b.principal ? `<button id="mr-repay" ${can ? '' : 'disabled'}>REPAY</button>` : ''}</div>`;
 const foot = monthView === 'repay' ? `<button id="mr-back">BACK</button><button class="primary" id="mr-pay" ${can ? '' : 'disabled'}>OK</button>`
  : `<button id="mr-detail">${monthView === 'detail' ? 'SUMMARY' : 'DETAIL'}</button><button id="month-next" class="primary">NEXT MONTH ▶</button>`;
 const say = monthView !== 'sum' ? '' : net >= 0 ? '이번 달은 남았어요. 잘하셨어요.' : b.principal && locked ? '이자는 매달 나가요. 갚는 건 2012년부터예요.' : '이번 달은 나간 게 더 많아요.';   /* 큰 소식 창 꼴(D-047) — 설명 대신 유나 한 마디 */
 $('#over').innerHTML = `<div class="bn-wrap mr2" data-k="month-${s.day}"><div class="bn-clip"><img class="bn-yuna" src="${fullArt('yuna', net >= 0 ? 'base' : 'worry')}" alt="${SNAME}"></div><div class="bn msg"><div class="bn-tag">${monthView === 'repay' ? '백 여사에게 갚기' : `MONTHLY REPORT · ${mon}월`}</div><div class="bn-bd"><div class="mr-body">${body}</div>${say ? `<div class="bn-say"><b>유나</b><span>${say}</span></div>` : ''}<footer class="bn-mb">${foot}</footer></div></div></div>`;
 swapIn('.mr-body');
 const redo = v => { monthView = v; drawMonth(m); };
 if ($('#month-next')) $('#month-next').onclick = () => { monthView = 'sum'; act('msgdone'); };
 if ($('#mr-detail')) $('#mr-detail').onclick = () => redo(monthView === 'detail' ? 'sum' : 'detail');
 if ($('#mr-repay')) $('#mr-repay').onclick = () => redo('repay');
 if ($('#mr-back')) $('#mr-back').onclick = () => redo('sum');
 on('[data-ra]', d => { repayAmt = d.ra === 'all' ? 'all' : +d.ra; drawMonth(m); });
 if ($('#mr-pay')) $('#mr-pay').onclick = () => { const amt = repayAmt === 'all' ? Math.min(b.principal, s.cash) : repayAmt; monthView = 'sum'; act('baekRepay', amt); };
}
function drawEnding() {
 const e = g.ending(), b = g.s.baek;
 const companion = peopleData().filter(p=>p.known && CANDIDATES.includes(p.who) && g.s.story.stage[p.who] > 0).sort((a,b)=>(g.s.story.stage[b.who]-g.s.story.stage[a.who]) || b.rel-a.rel)[0];
 // 갈림 3이 들어오면 이야기 5판 8절의 끝 꼬리 표로 바꾼다.
 const path = { in: '청림의 제안을 받았다', no: '청림의 제안을 거절했다', warn: '차누리에게 알렸다' }[g.s.story.flag.path1] || '아직 청림의 제안에 닿지 않았다';
 const debt = ['paid','forgiven'].includes(b.state) ? '백 여사의 장부에서 내 이름이 지워졌다' : b.state === 'frozen' ? '그 빚은 청림과 함께 묶였다' : '그 빚은 아직 백 여사의 장부에 있다';
 $('#over').innerHTML = `<div class="story-screen ending-screen"><div class="story-bg" style="background-image:url('${sceneArt('in_han_river')}')"></div>${companion ? `<img class="ending-person" src="${fullArt(companion.who)}" alt="${esc(companion.name)}">` : ''}<section class="story-panel ending-panel"><small>${esc(g.date())} · 마지막 장</small><h1>${esc(e.name)}</h1><p>순위 ${e.rank}위 · 순자산 ${M(e.nw)}</p><div class="story-panel"><small>마지막 길</small><p>${path}</p></div><div class="story-panel"><small>백 여사 빚 · 남은 원금 ${M(b.principal)}</small><p>${debt}</p></div><div class="story-panel"><small>곁에 있는 사람</small><p>${companion ? esc(companion.name) + ' · ' + STAGES[g.s.story.stage[companion.who]] : '혼자'}</p></div><details><summary>플레이 기록</summary><div class="ending-history">${g.s.story.history.map(h=>`<p>${esc(h.date)} · ${esc(T.story.scenes.find(x=>x.id===h.id)?.title)}</p>`).join('')}</div></details><footer><button id="again" class="primary">NEW GAME ▶</button></footer></section></div>`;
 $('#again').onclick = () => { title = true; drawTitle(); drawNew(); };
}


/* ── 전환(11-20 대표님 '화면이 바뀔 때 · 새 내용이 뜰 때 · 시간이 흐를 때 자연스럽게 — 게임이니 그런 디테일이 매우 중요') ──
   ① 겹침 칸(#over): 새 창 · 장면은 서서히 나타나고, 닫히거나 다른 것으로 바뀌면 옛 것이 서서히 사라짐 — 같은 것(같은 장면의 다음 줄 등)은 다시 움직이지 않음
   ② 탭: 바뀔 때만 판이 살짝 밀려 들어옴  ③ 시간: 장 마감 · 다음 날 아침 · 토요일 · 일요일 · 새 달에 가운데 띠 카드(누르면 넘어감) */
const overKey = el => { const c = el && el.firstElementChild; return c ? (c.dataset.k || c.className) : ''; };
let overLast = '';
new MutationObserver(recs => {
 const O = $('#over'), key = overKey(O);
 if (key === overLast) return;
 const gone = recs.flatMap(r => [...r.removedNodes]).filter(n => n.nodeType === 1);
 if (overLast && gone.length) ghost(gone);
 const c = O.firstElementChild; if (c) { c.classList.remove('ov-in'); void c.offsetWidth; c.classList.add('ov-in'); }
 overLast = key;
}).observe(document.getElementById('over'), { childList: true });
let appLast = '';   /* 큰 화면(타이틀 · 새 판 · 게임 · 끝)이 바뀔 때도 옛 화면은 서서히 사라짐(11-20 대표님 '모든 화면 전환이 게임처럼') */
new MutationObserver(recs => {
 const c = $('#app').firstElementChild, key = c ? c.className.split(' ')[0] : '';
 if (key === appLast) return; const gone = recs.flatMap(r => [...r.removedNodes]).filter(n => n.nodeType === 1);
 if (appLast && gone.length && calMotion()) ghost(gone); appLast = key;
}).observe(document.getElementById('app'), { childList: true });
function ghost(nodes) {   /* 사라지는 옛 창을 잠깐 위에 겹쳐 두고 흐리게 */
 const g0 = document.createElement('div'); g0.className = 'ghost'; nodes.forEach(n => g0.appendChild(n.cloneNode(true)));
 $('#stage').appendChild(g0); setTimeout(() => g0.remove(), 320);
}
let paneTab = '';
/* 효과음 — 「상한가」 ui/sound.js 의 같은 두 소리(장소에 들어감 · 일력 넘김 · 소리 파일과 크기 그대로) · 못 틀면 조용히 넘어감 */
const SND = 'res/소리/', SFX = { door: ['sfx_door.wav', 0.45], page: ['sfx_page.wav', 0.8] }, sfxCache = {};
function sfx(name) { const d = SFX[name]; if (!d) return; try { const a = (sfxCache[name] ||= new Audio(SND + d[0])).cloneNode(); a.volume = d[1]; a.play().catch(() => {}); } catch { /* 소리를 못 틀어도 게임은 그대로 */ } }
const calMotion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ── 자주 쓰는 그림 미리 받기(데이터 절약 모드면 안 함) — 화면 전환이 빨라짐 ── */
(function preload() {
 /* 그림 미리 받기(11-20 대표님 피드백 5 '이미지가 약간씩 늦게 뜸') — 화면에 띄울 때 처음 받으면 늦게 뜸 →
    곧 쓸 것(첫 화면 · 집 · 유나)을 바로, 나머지(장면 배경 · 등장 인물 · 탭 그림 · 차 · 상가)를 넷씩 나란히 받아 풀어(decode) 둠 · 받은 그림은 붙잡아 두어 다시 받지 않음 */
 const keep = [], seen = new Set(), queue = [];
 const want = f => { if (f && !seen.has(f)) { seen.add(f); queue.push(f); } };
 const take = () => { const f = queue.shift(); if (!f) return; const im = new Image(); keep.push(im); im.decoding = 'async';
  im.onload = () => { im.decode?.().catch(() => {}); take(); }; im.onerror = take; im.src = f; };   /* 풀기(decode)는 기다리지 않음 — 창이 숨으면 안 끝나 줄이 멈춤 */
 const run = n => { for (let i = 0; i < n; i++) take(); };
 const s0 = g?.s, ids = Object.keys(CAST);
 [...T.opening.map(c => art(c.img)), art(HOUSE[s0?.house || T.houses[0].id]?.bg || ''), sceneArt(T.story.scenes[0].bg), bustArt(Object.values(T.story.scenes[0].cast || {})[0]?.id || 'yuna'), coachFace('wink'), coachFace('base')].forEach(want); run(4);
 const later = () => { if (navigator.connection?.saveData) return;
  for (const sc of T.story.scenes) { if (sc.bg) want(sceneArt(sc.bg)); for (const c of Object.values(sc.cast || {})) if (c?.id) want(bustArt(c.id, c.face)); for (const l of sc.lines) if (l.face) want(bustArt(l.say, l.face)); }
  ['base', 'wink', 'surprise', 'worry', 'proud'].forEach(e => { want(coachFace(e)); want(bustArt('yuna', e)); }); want(smallArt({ who: 'yuna' })); ids.forEach(id => want(bustArt(id)));
  T.contacts.forEach(c => want(face(c.portrait))); T.houses.forEach(h => want(art(h.bg))); T.places.filter(x => x.bg).forEach(x => want(art(x.bg))); want(art('지도/map_yeouido.jpg'));
  ['none', ...T.cars.map(x => x.id)].forEach(id => want(art(carArt(id)))); ['none', ...T.shops.map(x => x.id)].forEach(id => want(art(shopArt(id))));
  if (!s0) T.looks.forEach(x => want(art('인물/hero_' + x.id + '.png')));   /* 새 판 옷 고르기에만 */
  ['base', 'worry', 'wink', 'surprise', 'proud'].forEach(e => want(fullArt('yuna', e))); ids.forEach(id => want(fullArt(id)));   /* 전신(비서 · 인맥 탭 · 한 장 1MB 넘음)은 맨 뒤 — 앞 그림을 막지 않음 */ ['in_office_sales', 'in_client_office', 'in_ydp_shop'].forEach(b => want(art('배경/' + b + '.jpg')));
  run(4); };
 (window.requestIdleCallback || (f => setTimeout(f, 800)))(later, { timeout: 1500 });
})();
/* ── 게임 느낌 바탕(11-20 대표님 '웹 느낌이 아니라 모든 화면 전환 · 버튼 누름 등이 게임처럼') — 오른쪽 단추 메뉴 · 그림 끌기 · 글자 고르기 · 확대(Ctrl + 휠 · Ctrl +/-) 막음 · 누를 때 짧은 소리 ── */
(function gameFeel() {
 const typing = e => e.target?.closest?.('input,textarea');
 addEventListener('contextmenu', e => { if (!typing(e)) e.preventDefault(); });
 addEventListener('dragstart', e => e.preventDefault());
 addEventListener('selectstart', e => { if (!typing(e)) e.preventDefault(); });
 addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
 addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault(); });
 addEventListener('gesturestart', e => e.preventDefault());
 let ac = null;
 const blip = (f0, f1, dur, vol) => { try { ac ||= new AudioContext(); const t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02); } catch { /* 소리 못 내도 게임은 그대로 */ } };
 addEventListener('pointerdown', e => { const b = e.target?.closest?.('button'); if (!b) return; if (b.disabled) return blip(220, 160, 0.09, 0.05);   /* 못 누르는 단추 — 낮은 '툭' */
  b.classList.contains('primary') ? blip(990, 1480, 0.07, 0.06) : blip(740, 880, 0.05, 0.045); }, true);
 addEventListener('pointerdown', e => { const b = e.target?.closest?.('button:disabled'); if (b && calMotion()) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); } }, true);
})();
/* 장소에 들어갈 때 — 어두워지고 장소 이름이 잠깐 뜬 뒤 밝아짐 · 문 소리 · 누르면 바로(「상한가」 common.js enterFx 와 같은 0.42초) */
function enterFx(name, sub, go) {
 sfx('door'); const d = document.createElement('div'); d.className = 'enterfx'; d.innerHTML = `<b>${esc(name)}</b><small>${esc(sub)}</small>`;
 $('#stage').appendChild(d); let gone = false;
 const fire = () => { if (gone) return; gone = true; go(); setTimeout(() => d.classList.add('out'), 250); setTimeout(() => d.remove(), 650); };
 d.addEventListener('pointerdown', fire); setTimeout(fire, 420);
}
/* 일력 넘김 — 앞 날 한 장을 겹쳐 띄우고 천천히 뜯어 새 날에서 멈춤 · 종이 소리 · 누르거나 키를 누르면 바로 걷힘(「상한가」 transit.cal 과 같은 0.5초 + 1.3초 · 뜯기는 길이는 꾸밈 caltear 와 한 벌)
   여의도는 하루 단위라 한 장 = '연 · 월'(작게) + '일'(크게) + '요일' · 그 아래 짧은 상태 한 줄 */
const WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'];
function calCard(d0, d1, note, tone, done) {
 const page = s => { const d = new Date(s + 'T00:00:00Z'); return `<small>${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월</small><b>${d.getUTCDate()}</b><span class="${d.getUTCDay() % 6 ? '' : 'wk'}">${WEEK_KO[d.getUTCDay()]}요일</span>`; };
 const el = document.createElement('div'); el.className = 'calfx ' + tone; el.innerHTML = `<div class="pad"><div class="pg cur">${page(d0)}</div><div class="pg old"></div></div><small class="calnote">${esc(note)}</small>`;
 $('#stage').querySelectorAll('.calfx,.tcard').forEach(x => x.remove()); $('#stage').appendChild(el);
 const cur = el.querySelector('.cur'), old = el.querySelector('.old'); let tm = 0, fin = false;
 const end = () => { if (fin) return; fin = true; clearTimeout(tm); removeEventListener('keydown', key, true); cur.innerHTML = page(d1); old.remove(); el.classList.add('out'); setTimeout(() => el.remove(), 220); done(); };
 const key = e => { e.stopImmediatePropagation(); e.preventDefault(); end(); };   /* 일력이 떠 있는 동안 키는 아래 화면에 닿지 않음 */
 const tear = () => { if (fin) return; old.innerHTML = cur.innerHTML; cur.innerHTML = page(d1); old.classList.add('tear'); sfx('page'); tm = setTimeout(end, calMotion() ? 1300 : 600); };
 el.addEventListener('pointerdown', e => { e.stopPropagation(); end(); }); addEventListener('keydown', key, true);
 tm = setTimeout(tear, calMotion() ? 500 : 150);
}
(new Image()).src = art('화면/cal_pad.png');   /* 처음 넘길 때 일력이 늦게 뜨지 않게 미리 받음 */
/* 시간 카드 — 판 상태가 바뀐 것을 화면이 보고 띄움(규칙은 건드리지 않음) */
let clock = null;
function timeCard() {
 if (title || !g || g.s.msgs[0]?.type === 'senior') return; const s = g.s, now = { day: s.day, phase: s.phase, slot: s.slot, month: DAYS[s.day].slice(0, 7) };
 const was = clock; clock = now; if (!was) return;
 const dateOf = x => { const t0 = new Date(DAYS[x.day] + 'T00:00:00Z'); if (x.phase === 'weekend') t0.setUTCDate(t0.getUTCDate() + (x.slot ? 2 : 1)); return t0.toISOString().slice(0, 10); };
 const d = DAYS[s.day], md = `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일`, wk = ['일', '월', '화', '수', '목', '금', '토'][dow(s.day)];
 let big = '', small = '', tone = '';
 if (was.phase === 'open' && now.phase === 'evening') { const today = g.netWorth() - s.dayStart; big = '15:30 · 장 마감'; small = `오늘 ${today >= 0 ? '+' : '−'}${M(Math.abs(today))}`; tone = today >= 0 ? 'up' : 'down'; }
 else if (now.phase === 'weekend' && (was.phase !== 'weekend' || was.slot !== now.slot)) { big = now.slot ? '일요일' : '토요일'; small = '장이 쉬는 날'; tone = 'wk'; }
 else if (now.day !== was.day && now.phase === 'open' && (now.month !== was.month || was.phase !== 'open')) {   /* 평일 → 평일은 날짜 칸만(D-050 · 하루가 5초) · 새 달 · 주말 뒤 · 저녁 뒤에만 일력 */ big = `${md} ${wk}요일`; small = now.month !== was.month ? `${+d.slice(5, 7)}월 시작 · ${eraOf(s.day).name || ''}` : '08:50 · 장 열기 전'; tone = 'am'; }
 if (!big) return;
 if (tone !== 'up' && tone !== 'down') { const O = $('#over'); O.classList.add('wait'); calCard(dateOf(was), dateOf(now), small, tone, () => { O.classList.remove('wait'); tut(); }); tut(); return; }   /* 날이 바뀌는 마디 = 일력 넘김 · 장 마감은 아래 띠 카드 그대로 */
 const fx = $('#stage'), el = document.createElement('div'); el.className = 'tcard ' + tone; el.innerHTML = `<div><b>${esc(big)}</b><small class="${tone === 'up' ? 'up' : tone === 'down' ? 'down' : ''}">${esc(small)}</small></div>`;
 const O = $('#over'), done = () => { el.remove(); O.classList.remove('wait'); clearTimeout(t1); clearTimeout(t2); tut(); };   /* 카드가 먼저 · 창은 카드가 걷힐 때 */
 O.classList.add('wait'); el.onclick = done; fx.querySelectorAll('.tcard').forEach(x => x.remove()); fx.appendChild(el); tut();
 const t1 = setTimeout(() => O.classList.remove('wait'), 1150), t2 = setTimeout(done, 1500);
}
fit(); title ? drawTitle() : drawGame();

/* 개발용: 현재 보이는 화면의 잘림·글 넘침·형제 글 칸 겹침을 콘솔에서 점검한다. */
window.uiAudit = function () {
 const stage = $('#stage'), bounds = stage.getBoundingClientRect(), result = [];
 const visible = e => {
  const r = e.getBoundingClientRect(), s = getComputedStyle(e);
  if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false;
  for (let p = e.parentElement; p && p !== stage; p = p.parentElement) {
   const style = getComputedStyle(p); if (style.visibility === 'hidden' || +style.opacity === 0) return false;
   if (/(auto|scroll|hidden|clip)/.test(style.overflow + style.overflowX + style.overflowY)) {
    const b = p.getBoundingClientRect(); if (r.bottom <= b.top || r.top >= b.bottom || r.right <= b.left || r.left >= b.right) return false;
   }
  }
  return true;
 };
 const label = e => e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].join('.') : '');
 const hasText = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
 const elements = [...stage.querySelectorAll('*')].filter(visible), text = elements.filter(hasText);
 for (const e of elements) {
  const r = e.getBoundingClientRect();
  if (r.left < bounds.left - 1 || r.top < bounds.top - 1 || r.right > bounds.right + 1 || r.bottom > bounds.bottom + 1) result.push({ kind: '무대 밖', element: label(e), node: e });
  if (e.textContent.trim() && e.clientWidth && e.scrollWidth > e.clientWidth + 1) result.push({ kind: '글 넘침', element: label(e), node: e });
 }
 const groups = new Map();
 for (const e of text) { const group = groups.get(e.parentElement) || []; group.push(e); groups.set(e.parentElement, group); }
 for (const group of groups.values()) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
  const a = group[i].getBoundingClientRect(), b = group[j].getBoundingClientRect();
  if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) result.push({ kind: '형제 글 겹침', elements: [label(group[i]), label(group[j])], nodes: [group[i], group[j]] });
 }
 return result;
};
