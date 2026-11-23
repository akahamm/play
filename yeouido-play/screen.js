/* 장난감 2판 화면 — 틀은 판 · 탭이 바뀔 때만 그리고, 틱마다는 숫자 · 차트 · 뉴스만 바꾼다. */
'use strict';
const { Game, T, N, ST, SRC, HOUSE, SHOP, CAR, PEOPLE, PLACE, REP, ACH, CAREER, DAYS, eraOf, dow } = Toy2;
const store = () => { try { return window.localStorage; } catch { return { getItem() { return null; }, setItem() { throw Error(); } }; } };
const IMG = window.IMG_BASE || 'res/그림/', art = f => IMG + f, face = id => IMG + '인물/' + id + '.png';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CAST = { yuna: '한유나', dasol: '윤다솔', chaerin: '도채린', garam: '문가람', baek: '백도진', taeo: '강태오', muyeol: '강무열', nuri: '차누리', haram: '오하람', seoyul: '진서율', ideun: '한이든', haeon: '서해온' };
const PERSON = { c_copy: 'dasol', c_clinic: 'chaerin', c_florist: 'garam', c_mall: 'baek', c_gym: 'muyeol', c_snack: 'haeon', c_venture: 'nuri', c_academy: 'haram', c_tower: 'seoyul', c_apt_a: 'ideun' };
const Y_EXP = ['base', 'wink', 'proud', 'worry', 'surprise'], yOut = () => { const w = g?.s?.yuna2?.wear; return w && w !== 'office' ? w : null; }, yExp = e => Y_EXP.includes(e) ? e : 'base';   /* 입은 착장(오피스 밖) · 표정판 다섯 */
const fullArt = (id, expression = 'base') => id === 'yuna' && yOut() ? art('착장/yuna_' + yOut() + '_' + yExp(expression) + '.png') : art(id === 'yuna' && expression !== 'base' ? (expression === 'proud' ? '임시_기본/yuna_proud.png' : '기준/yuna_' + ({ wink: '윙크', surprise: '놀람', worry: '걱정' }[expression] || '원본') + '.png') : ['yuna', 'dasol', 'chaerin', 'garam', 'taeo'].includes(id) ? '기준/' + id + '_원본.png' : '임시_기본/' + id + '.png');
const sceneArt = id => art((['bg_gosiwon', 'in_department_store', 'in_golf_club', 'in_courtroom', 'bg_hospital', 'bg_temple', 'bg_racetrack'].includes(id) ? '장난감2/' : /^bg_/.test(id) ? '개편배경/' : '배경/') + id + '.jpg');   /* 남은 bg_ 이름은 개편배경(개편 차례 8 · 주총장 · 회장실 · 2020 빈 거리) */
// 이 사본에 빠진 임시 그림은 기존 설정집으로 대신한다. 그림 파일은 바꾸지 않는다.
// 사람 카드 작은 그림 — 얼굴 그림(인물/ · 비서/) · 없으면 전신
const smallArt = c => c.who === 'yuna' ? art('비서/sec_base.png') : PEOPLE[c.id] ? face(PEOPLE[c.id].portrait) : fullArt(c.who);
const fallbackArt = src => { const id = src.match(/임시_기본\/([^/]+)\.png$/)?.[1]; return id ? (id === 'yuna_proud' ? fullArt('yuna') : art('설정집/' + id + '.png')) : null; };
document.addEventListener('error', e => { if (e.target.tagName !== 'IMG') return; const fallback = fallbackArt(e.target.getAttribute('src')); if (fallback) e.target.src = fallback; }, true);
let level = 'normal', person = 'yuna';
const oldSave = (() => { try { const v = JSON.parse(localStorage.getItem(N.save_key)); return v && v.version !== N.version ? (v.version || 1) : 0; } catch { return 0; } })();   /* 옛 판(2010 판 · version 1) 저장 — 불러오지 않고 NEW GAME 으로(개편 · 대표님 '깨져도 됨') */
const ERA_KEY = 'yeouido_story_done', eraOpen = () => { try { return localStorage.getItem(ERA_KEY) === '1'; } catch { return false; } };   /* 한 판(이야기 끝)을 마치면 차례 8-0 이 '1' 을 둠 → 새 판 READY 에 ERA 고르기 */
let g = Game.load(store()), sel = 's0', tab = 'home', timer = null, title = true, seen = 0;
const won = n => Math.round(n).toLocaleString('ko-KR'), M = n => Toy2.money(n),   /* 돈 글은 sim.js money 한 곳('1억 · 1.2억 · 20억 · 5,000만' · D-075 ③) */ pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%', sc = x => x > 0 ? 'up' : x < 0 ? 'down' : '', stars = n => n ? '★'.repeat(n) : '☆';
const ic = n => `<i class="ic ic-${n}"></i>`;
const plainTitle = t => String(t ?? '').replace(/\s*\[더함\]/g, '').trim();   /* 장면 제목의 작업 표시(원고 '[더함]')는 화면에서 걷음(검토 11-22) */
const chgTxt = (x, sp = '') => { const r = Math.round(x * 1e4) / 1e4; return { t: r ? (r > 0 ? '▲' : '▼') + sp + pct(r) : '0.00%', c: sc(r) }; };   /* 등락 — 0.00% 는 화살표 · 색 없이(검토 '▲+0.00%') */
const wonOrM = v => Math.abs(v) < 1e8 ? won(Math.round(v)) : M(v);   /* 1억 아래는 원 단위 그대로(원자재 '11만원' 처럼 등락이 안 보이던 것 · 축 눈금도 한 꼴) */
const fadeClose = (el, go) => { if (typeof el === 'string') el = $(el); if (!el || !calMotion()) return go(); if (el.classList.contains('fade-out')) return; if (el.matches('.fa-sheet, .lf-sheet, .pp3-pop')) veilOn(); el.classList.add('fade-out'); setTimeout(go, 180); };   /* 화면을 덮던 작은 창이면 같은 어둠의 막을 깔아 둠(veilOn) — 다음 창이 뜰 때까지 밝은 화면이 안 드러남 */   /* 작은 창 · 펼침은 서서히 사라진 뒤 닫힘(팀 지시 '서서히 닫힘') */
const feedHead = f => { if (f.kind !== 'tip') return f.head; const P = FEEL().tip || {};
 if (!P.line) return P.feed ? String(f.head).split(P.feed[0]).join(P.feed[1]) : f.head;
 const line = Toy2.fmt(P.line, { who: f.who === 'sec' ? SNAME : PEOPLE[f.who]?.name || String(f.head).split(':')[0], name: ST[f.stock]?.name || '', arrow: f.dir > 0 ? '▲' : '▼' });
 const done = g && (f.day < g.s.day || (f.day === g.s.day && g.s.phase !== 'open'));
 return done ? Toy2.fmt(P.result, { line, res: f.real ? P.hit : P.miss }) : line; };   /* 장중 귀띔 줄(11-23 대표님 피드백 23 '추천대로') — 아침 귀띔 창과 같은 말을 되풀이하지 않고 누구 귀띔 · 종목만 · 장 마감 뒤엔 맞았는지(진짜 소식 · 소문만) · 마감 전에 알려 주면 값이 꺼질 것을 미리 아는 셈이라 마감 뒤에 · 글은 feel.json tip */   /* 장중 귀띔 줄은 그날 뜨니 '오늘'(toy2.json headlines.tip_good 은 규칙 쪽 자료라 화면에서 바꿔 보임) */
const coachFace = (e = 'base') => art('비서/face_' + (yOut() ? yOut() + '_' + yExp(e) : e) + '.png');
const SEC = (e = 'base') => art('비서/sec_' + (yOut() ? yOut() + '_' + yExp(e) : e) + '.png'), SNAME = '한유나';
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
 $('#app').innerHTML = `<div class="op"><div class="op-cuts"></div><div class="op-band"></div><div class="op-lb t"></div><div class="op-lb b"></div><span class="op-date"></span><div class="op-line"></div><button class="sm op-skip">건너뛰기 ▶▶</button><div class="op-dots">${C.map(() => '<i></i>').join('')}</div></div>`;
 const onKey = e => { if (e.key === 'Escape') end(); else if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); next(); } };
 const end = () => { if (over) return; over = true; clearTimeout(timer); clearInterval(typing); try { localStorage.setItem(OP_KEY, '1'); } catch { /* 저장을 못 해도 다음에 다시 흐를 뿐 */ } removeEventListener('keydown', onKey); drawOpening.stop = null; done(); };
 drawOpening.stop = () => { if (over) return; over = true; clearTimeout(timer); clearInterval(typing); removeEventListener('keydown', onKey); $$('.op video').forEach(v => v.pause()); drawOpening.stop = null; };   /* 오프닝 중 불러오기(F9 · 슬롯) — 컷 시계만 멈추고 타이틀로 가지 않음(검토 '몇 초 뒤 타이틀이 게임 위를 덮음') */
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
 <div class="t-press">아무 키나 누르세요</div><div class="tbtn t-menu" hidden>${can ? '<button class="big primary" id="resume">이어하기</button>' : ''}<button class="big ${can ? '' : 'primary'}" id="new">새 게임</button><button class="big" id="t-op">오프닝</button>${TITLE_BTNS.map(b => `<button class="big" id="${b.id}">${esc(b.label)}</button>`).join('')}${!can && oldSave ? '<div class="t-old">옛 저장 · 2010 — 새 게임</div>' : ''}</div></div></div>`;
 $('#over').innerHTML = ''; tut();
 const open = e => { if (!title || !$('.t-menu') || !$('.t-menu').hidden) return; if (e && e.type === 'keydown') e.preventDefault(); $('.t-press').hidden = true; $('.t-menu').hidden = false; removeEventListener('keydown', open); sfx('page'); };
 addEventListener('keydown', open); $('.title').addEventListener('click', open);
 $('#new').onclick = () => swapView(() => { if (!can) return drawNew(); $('#over').innerHTML = `<div class="modal dark ask-new" data-k="ask-new"><h1>새 게임</h1><p>지금 판은 지워져요.</p><div class="mb"><button id="an-back">뒤로</button><button class="primary" id="an-ok">확인</button></div></div>`; $('#an-back').onclick = () => swapView(() => { $('#over').innerHTML = ''; }); $('#an-ok').onclick = () => swapView(() => { $('#over').innerHTML = ''; drawNew(); }); });
 if ($('#resume')) $('#resume').onclick = () => swapView(() => { title = false; seen = 0; drawGame(); });
 $('#t-op').onclick = () => swapView(() => drawOpening(() => drawTitle(true)));
 TITLE_BTNS.forEach(b => { if ($('#' + b.id)) $('#' + b.id).onclick = () => b.go(can); });
}

/* ── 틀(STONKS 짜임: 위 띠 · 화면 전체 탭 · 아래 숫자 탭 — 목업 09_목업/장난감2_메인) ── */
const yunaHere = () => !Toy2Story.gone(g);   /* 유나가 떠나면(이야기 표시 '유나=떠남') 비서 탭 · 비서 저녁이 닫힘 */
/* 유나 말칸 한 곳(11-22 · 07_재기/개편_연출.md '유나 떠난 판 고침') — 유나 얼굴 · 이름 · 한마디를 그리는 곳(큰 소식 창 head · 달 보고 · 산사 · 코치 · 장치 탭 처음 한마디)은 모두 이 넷을 거침.
   떠난 판(yunaHere() 거짓)은 얼굴 · 이름 없이 이름 없는 한 줄만(다른 말 상대는 정해진 것이 없어 두지 않음) · 떠나지 않은 판은 앞과 같은 꼴 */
const yunaImg = (face = 'base', cls = '', full = false, alt = SNAME) => yunaHere() ? `<img${cls ? ` class="${cls}"` : ''} src="${full ? fullArt('yuna', face) : coachFace(face)}" alt="${alt}">` : '';
const yunaClip = face => yunaHere() ? `<div class="bn-clip">${yunaImg(face, 'bn-yuna', true)}</div>` : '';   /* 큰 소식 창 왼쪽 반신 */
const yunaSay = (txt, cls = '') => txt ? `<div class="bn-say${cls ? ' ' + cls : ''}">${yunaHere() ? '<b>유나</b>' : ''}<span>${txt}</span></div>` : '';   /* 큰 소식 창 아래 한마디(txt 는 이미 esc 한 글) */
const yunaLine = (face, txt) => `${yunaImg(face)}<span>${yunaHere() ? `<b>${SNAME}</b>` : ''}${txt}</span>`;   /* 장치 탭 처음 한마디 말칸 안(얼굴 + 이름 + 글 · txt 는 이미 esc 한 글) */
const TABS_ALL = [['home', '홈'], ['market', '트레이딩'], ['rep', T.instinct.ui.tab], ['senior', '비서', yunaHere], ['people', '인맥'], ['stake', '회사']];   /* 자산 탭은 홈이 맡음(D-043) */
/* 화면 장치 고리(개편 고리 차례 · 07_재기/개편_고리.md) — 화면 장치 s_<이름>.js 는 screen.js 뒤 · boot.js 앞에 읽혀(screen_mods.js) 여기에 스스로 등록:
   탭 TABS_ALL.push([id, 이름, 열림 조건 함수?]) + PANES[id] = { draw(P), live?(full) } · 창 MSGS[종류] = (m, kit) => html 글 또는 { html, btns, bind } (null 이면 장치가 다 그림) · 효과음 SFX_HOOK.push(name => …)
   · 달 정산 줄 MONTH_ROWS.push(m => ({ in: [[이름, 원]], out: [[이름, 원]] })) — 규칙 장치의 month 고리 줄(m.extra)은 등록 없이 저절로 뜸 · 위 띠 HUD.push(full => …) */
const PANES = {}, MSGS = {}, MONTH_ROWS = [], HUD = [];
const TITLE_BTNS = [], MENU_BTNS = [];   /* 제목 메뉴 · ☰ 메뉴 단추 고리(개편 차례 10 · s_feel.js 가 SETTINGS · SAVE / LOAD 를 등록) — { id, label, go(can) } */
const stakeOpen = () => { const s = g.s; return !!s.firm || g.stocks.some(x => g.stake(x.id) > 0) || g.lvl('wealth') >= 2; };   /* 회사 탭은 첫 지분 · 투자회사 조건에 다가가면 열림(구조 제안 5-2) */
const visTabs = () => TABS_ALL.filter(([id, , open]) => (id !== 'stake' || stakeOpen()) && (!open || open()));
/* 아래 탭 여덟(11-22 대표님 결정 거리 2 '㉮ 여덟 탭') — 묶인 탭은 한 탭 안의 판: 고른 묶음 탭 안에 판 이름이 나란히 뜨고, 같은 숫자 키를 한 번 더 누르면 다음 판.
   TAB_TOP = 아래 줄 차례(머리 탭 id) · TAB_GROUPS = 머리 → 판 차례 · 여기 없는 새 탭은 제 이름으로 맨 뒤에 붙음(늘어날 것을 받음) · 판 하나하나의 열림 조건 · 그리기는 그대로 */
const TAB_TOP = ['home', 'market', 'rep', 'senior', 'people', 'assets2', 'stake', 'play'];
const TAB_GROUPS = { stake: ['stake', 'corp'] };
const TAB_IN_HOME = ['life', 'goals', 'cmd', 'yuna2'];   /* 분석(yuna2)은 비서 태블릿 REPORT · DATA 로(11-22 대표님 비서 안 3) */   /* 판 안에 들어간 탭 — 생활 · 목표는 홈, 원자재는 트레이딩 왼쪽 COMMODITIES 판(11-22 대표님 트레이딩 안 3) */   /* 홈 판 안에 들어간 탭(11-22 대표님 3안 — 생활은 홈 오른쪽 칸 · 목표는 홈 왼쪽 기둥을 누르면 크게) — 아래 줄엔 안 뜸 */
let hmGoal = false;   /* 홈에서 목표를 크게 펼침 */
const grpOf = id => Object.keys(TAB_GROUPS).find(h => TAB_GROUPS[h].includes(id)) || id;
const tabName = id => (TABS_ALL.find(t => t[0] === id) || [, id])[1];
const subLast = {};   /* 묶음마다 마지막에 본 판 */
const visTop = () => { const vis = new Set(visTabs().map(t => t[0]).filter(id => !TAB_IN_HOME.includes(id))), heads = [...TAB_TOP, ...TABS_ALL.map(t => grpOf(t[0])).filter(h => !TAB_TOP.includes(h) && !TAB_IN_HOME.includes(h))];
 return [...new Set(heads)].map(h => ({ head: h, members: (TAB_GROUPS[h] || [h]).filter(id => vis.has(id)) })).filter(x => x.members.length); };
const tabGo = top => { const m = top.members; return m.includes(subLast[top.head]) ? subLast[top.head] : m[0]; };
const tabsHtml = () => visTop().map((t, i) => { const act = t.members.includes(tab), nw = t.members.includes(g.s.uiNewTab) ? 'nw' : '';
 if (act && t.members.length > 1) return `<div class="tab grp on ${nw}" data-tab="${t.head}"><em>${i + 1}</em>${t.members.map(id => `<button class="tsub ${id === tab ? 'on' : ''} ${g.s.uiNewTab === id ? 'nw' : ''}" data-sub="${id}">${tabName(id)}</button>`).join('')}</div>`;
 return `<button class="tab ${nw}${t.head === 'rep' && skDot() ? ' skd' : ''}" data-tab="${t.head}"><em>${i + 1}</em>${tabName(t.head)}</button>`; }).join('');
const SPEEDS = N.speeds.filter(n => n > 0);
let focusAll = false;
let facil = 'top', repSel = 'know', focus = null;
let bankAmt = 5e7;   /* 홈 은행 — 고른 금액 */
/* 주말 칸 날짜(ISO) — 규칙 g.weekendDate(그 주 마지막 거래일 뒤 토 · 일 · 설 연휴 주도 맞음)가 있으면 그것 · 없으면 옛 셈(그날 + 1 + 칸) */
const wkISO = (slot, day) => { if (g?.weekendDate) return g.weekendDate(slot, day); const d = new Date(DAYS[day] + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1 + (slot ? 1 : 0)); return d.toISOString().slice(0, 10); };
const wkDate = s => { const d = new Date(wkISO(s.slot, s.day) + 'T00:00:00Z'); return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${'일월화수목금토'[d.getUTCDay()]}`; };   /* 주말엔 그 토 · 일 날짜(시험관 '금 · 토요일 어긋남') */
const SEASON = m => m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
/* 판이 바뀔 때(불러오기 · NEW GAME · CONTINUE) 앞 판의 화면 상태를 비움(검토 11-22 — 매물 창 · 고른 원자재 · 목록 · 목표 펼침 · 놀이 창 등이 남던 것) · 화면 장치는 PANES[id].reset() */
function uiReset() {
 drawOpening.stop?.(); clearInterval(typing); typing = null; illShown = '';
 sel = g?.stocks?.[0]?.id || 's0'; selC = null; mkList = 'stocks'; mkRange = '1D'; focusAll = false; mkSheet = null; mkLast = '';
 hmGoal = false; facil = 'top'; faSheet = null; faLast = ''; faBank = 'loan';
 skSel = null; skHelp = false; skRep = null; skRespec = false; ysSheet = null; secView = 'chat'; secYear = null; secMode0 = null;
 ksSheet = null; ksWin = null; ksPol = null; ksShown = ['', '']; wkPick = null; monthView = 'sum'; flipLast = '';
 tutShown = null; laterActive = null; HINTS.length = 0; hold.on = false; hold.speed = 0; paneTab = ''; paneKeys = null;
 for (const k in subLast) delete subLast[k];
 for (const p of Object.values(PANES)) try { p.reset?.(); } catch { /* 장치 하나가 못 비워도 판은 그대로 열림 */ }
 document.querySelectorAll('#stage .visit,#stage .calfx,#stage .tcard,#stage .enterfx').forEach(x => x.remove()); $('#over')?.classList.remove('wait');
}
let appClick = false;
function drawGame() {
 uiReset(); apptCheck();
 $('#app').innerHTML = `<div class="room" style="background-image:url('${art(HOUSE[g.s.house].bg)}')"></div><div class="mon">
 <header class="top"><div class="speed"><button class="tpp" id="pp" aria-label="재생 / 멈춤"></button><button class="tspd" id="spd" aria-label="속도"><b></b><small>속도</small></button><button class="todo" id="todo" hidden></button></div>
  <div class="cashbox"><div class="cash-main"><small>현금</small><b id="h-cash"></b></div><div class="cash-summary"><span id="h-worth"></span><span id="h-today"></span></div></div><div class="datebox"><i id="h-fill"></i><b id="h-date"></b><span id="h-clock"></span></div><div class="tmenu"><button class="tmenu-b" id="menu" aria-label="메뉴">☰</button><div class="tmenu-pop" id="menupop" hidden><label><input type="checkbox" id="ap"> 자동 멈춤 · 새 날</label><label><input type="checkbox" id="newspause"> 자동 멈춤 · 뉴스</label>${MENU_BTNS.map(b => `<button class="sm" id="${b.id}">${esc(b.label)}</button>`).join('')}<button class="sm" id="to-title">타이틀</button></div></div></header>
 <button class="newsline" id="newsline"></button>
 <section id="pane"></section>
 <nav class="numtabs">${tabsHtml()}</nav></div>`;
 $('#pp').onclick = () => todoGo();   /* ▶ = 지금 할 일(장중은 흐름 · 저녁 고르기 · 밤 귀띔은 비서 탭으로) · 사람이 속도를 직접 바꾸면 작은 창이 맡아 둔 속도는 버림 */
 $('#todo').onclick = () => todoGo();
 $('#spd').onclick = () => { const i = SPEEDS.indexOf(lastSpeed); lastSpeed = SPEEDS[(i + 1) % SPEEDS.length]; if (g.s.speed) { hold.speed = 0; g.dispatch('speed', lastSpeed); save(); loop(); } hud(true); };   /* 속도는 단추 하나(D-041) — 누를 때마다 ×1 → ×16 */
 bindTabs();
 $('#menu').onclick = e => { e.stopPropagation(); if ($('#menupop').hidden) { $('#menupop').classList.remove('fade-out'); $('#menupop').hidden = false; } else menuClose(); }; $('#menupop').onclick = e => e.stopPropagation(); if (!appClick) { appClick = true; $('#app').addEventListener('click', () => menuClose()); }
 $('#ap').checked = g.s.autopause; $('#ap').onchange = e => { g.dispatch('autopause', e.target.checked); save(); };
 $('#newspause').checked = newsStop() !== 'off'; $('#newspause').onchange = e => setNewsStop(e.target.checked ? g.s.uiNewsOn || 'all' : 'off');
 MENU_BTNS.forEach(b => { $('#' + b.id).onclick = () => { menuClose(true); b.go(); }; });
 $('#to-title').onclick = () => { g.dispatch('speed', 0); save(); title = true; loop(); swapView(() => drawTitle()); };
 $('#newsline').onclick = () => { if (tab !== 'market') { tab = 'market'; pane(); } mkSheet = 'news'; marketLive(true); hud(true); };
 seen = -1; clock = null; paneTab = tab; pane(); hud(true); phase(); loop(); timeCard();
}
function menuClose(now) { const m = $('#menupop'); if (!m || m.hidden) return; clearTimeout(menuClose.t); if (now || !calMotion()) { m.hidden = true; m.classList.remove('fade-out'); return; } m.classList.add('fade-out'); menuClose.t = setTimeout(() => { m.hidden = true; m.classList.remove('fade-out'); }, 160); }   /* ☰ 메뉴도 서서히 닫힘 */
/* 지금 할 일 한 곳(11-23 '1월 29일 멈춤' 근본 — 장 밖에도 위 띠가 Ⅱ 로 남고 ▶ 는 장중에만 들어서, 비서 탭에만 있는 저녁 고르기를 다른 탭에선 찾을 길이 없던 것)
   위 띠 ▶ · Space · 위 띠 아래 칩이 모두 이것을 따름 · 비서 탭에서만 고르는 것(저녁 고르기 · 밤 귀띔)은 tab 이 붙고, 나머지(저녁 창 · 주말 지도 · 입원 · 알림 창)는 #over 가 어느 탭 위에나 뜸 */
function nowTodo() { const s = g.s, m = s.msgs[0];
 if (m?.type === 'senior') return { k: 'night', tab: 'senior', label: T.dev?.feel?.todo?.night || '유나 귀띔 보기 ›' };
 if (m) return { k: 'msg' };
 if (s.phase === 'open') return { k: 'flow' };
 if (s.phase === 'evening' && s.uiEveMore !== s.day && yunaHere()) return { k: 'evening', tab: 'senior', label: T.dev?.feel?.todo?.evening || '저녁 고르기 ›' };
 return { k: s.phase }; }
function todoGo(t = nowTodo()) {
 if (t.k === 'flow') { hold.speed = 0; g.dispatch('speed', g.s.speed ? 0 : (lastSpeed || 1)); save(); loop(); hud(true); return true; }
 if (t.tab && tab !== t.tab) { tabSwap(t.tab); return true; } return false; }
/* 작은 창(3단 · 시간 멈춤) 한 꼴(검토 11-22 — 매물 · BANK LOAN · TRIP · GIFT 가 저마다 멈추고 되돌리던 것) — 판에 작은 창(.fa-win · .lf-sheet · .pc-sheet)이 떠 있으면 멈추고 흐르던 속도를 맡아 둠 ·
   창이 다 닫히면(탭을 옮겨 닫힌 것 포함) 그 속도로 되돌림 · 그사이 사람이 ▶ · Space · 속도 단추로 속도를 바꿨으면 맡긴 속도는 버림(사람이 고른 것을 덮지 않음) · 2단 창(.db-wrap)은 시간을 안 멈춤 */
const hold = { on: false, speed: 0 };
const SHEET_SEL = '#pane .fa-win, #pane .lf-sheet, #pane .pc-sheet, #pane .pp3-pop';
function holdSync() {
 if (title || !g) return; const s = g.s, open = $$(SHEET_SEL).some(e => !e.closest('.fade-out'));
 if (open && !hold.on) { hold.on = true; hold.speed = s.phase === 'open' ? s.speed : 0; if (s.speed) { g.dispatch('speed', 0); save(); loop(); hud(true); } }
 else if (!open && hold.on) { hold.on = false; const sp = hold.speed; hold.speed = 0; if (sp && s.phase === 'open' && !s.msgs.length && !s.speed) { g.dispatch('speed', sp); save(); loop(); hud(true); } }
}
/* 저녁 약속(인맥 · 화면 상태 uiAppointment) — 잡은 그날 저녁 한 번만 · 그 저녁이 장면에 밀리거나 그냥 지나가면 그 사람 휴대폰 대화에 한 줄 남기고 끝(검토 11-22 '말없이 다음 날로 옮겨짐') · 주말에 잡으면 다음 거래일 저녁 */
function apptSet(id) { const s = g.s; s.uiAppointment = id; s.uiApptDay = s.phase === 'weekend' || s.phase === 'away' ? s.day + 1 : s.day; }
function apptMiss(id, day) { if (id && id !== 'yuna' && g.s.contacts[id]) addTalk(id, { d: day, at: '저녁', text: T.dev?.people?.ui?.appt_missed || '…' }); }
function apptCheck() { if (!g) return; const s = g.s, id = s.uiAppointment; if (!id) return; if (s.uiApptDay == null) s.uiApptDay = s.day;   /* 옛 저장(날 없음)은 오늘 약속으로 */
 const past = s.day > s.uiApptDay || (s.day === s.uiApptDay && (s.phase === 'weekend' || s.phase === 'away'));   /* 그날이 지났거나 · 그날 저녁 없이 주말 · 입원으로 넘어감 */
 if (!past) return; const day = s.uiApptDay; delete s.uiAppointment; delete s.uiApptDay; apptMiss(id, day); save(); }
function tabTo(id) { tab = id; subLast[grpOf(id)] = id; if (g.s.uiNewTab === tab) delete g.s.uiNewTab; if (tab === 'home') facil = 'top'; if (tab === 'people') PANES.people?.reset?.(); pane(); hud(true); }   /* 앞 탭의 판 상태(펼침 · 2단 · 작은 창)는 pane() 이 탭이 바뀐 것을 보고 비움(paneLeave) */
function bindTabs() { on('.numtabs [data-tab]', d => { const top = visTop().find(x => x.head === d.tab); if (top && !top.members.includes(tab)) tabSwap(tabGo(top)); }); on('.numtabs [data-sub]', d => { if (d.sub !== tab) tabSwap(d.sub); }); }   /* 사람이 탭을 옮기는 길은 전환 층을 거침(swapView) · tabTo 는 바로 바꿈(장치가 옮긴 뒤 상태를 적는 길 — s_assets2) */
function syncTabs() { const nav = $('.numtabs'); if (!nav) return; const ids = visTabs().map(t => t[0]).join(), had = nav.dataset.ids;
 if (had && ids.includes('stake') && !had.split(',').includes('stake')) { floatUp('회사 탭', '', '새', 'kN'); g.s.uiNewTab = 'stake'; }
 nav.dataset.ids = ids; const sig = ids + '|' + grpOf(tab) + ':' + tab + '|' + (g.s.uiNewTab || '') + '|' + (skDot() ? 'sk' : '');   /* 스킬 탭 점(D-085) */ if (nav.dataset.sig === sig) return;   /* 탭 · 고른 판 · 새 표시가 바뀔 때만 다시 그림 */
 nav.dataset.sig = sig; nav.innerHTML = tabsHtml(); bindTabs(); secBadge(); }
function refresh() { if (title) return; apptCheck(); syncTabs(); if (g.s.uiRankDay?.day !== g.s.day) g.s.uiRankDay = { day: g.s.day, rank: g.rank() }; $('.room').style.backgroundImage = `url('${art(HOUSE[g.s.house].bg)}')`; pane(); hud(true); phase(); loop(); tut(); timeCard(); secBadge(); }

/* ── 숫자(틱마다) ── */
function hud(full) {
 if (title || !$('#h-date')) return; const s = g.s, nw = g.netWorth(), today = nw - s.dayStart;
 $('.mon').className = 'mon ' + SEASON(+DAYS[s.day].slice(5, 7)); homeRoom();
 $('#h-date').textContent = (s.phase === 'weekend' ? wkDate(s) : g.date()) + ' · ' + ({ spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' })[SEASON(+DAYS[s.day].slice(5, 7))]; $('#h-clock').textContent = s.phase === 'open' ? '' : s.phase === 'evening' ? '저녁' : s.phase === 'weekend' ? (s.slot ? '일요일' : '토요일') : s.phase === 'away' ? (s.away && s.away.kind === 'jail' ? '구치소' : '병원') : '끝';
 if (s.msgs[0]?.type === 'senior' && s.msgs[0].day != null) { $('#h-date').textContent = g.date(s.msgs[0].day); $('#h-clock').textContent = '저녁'; }   /* 저녁을 같이 한 뒤 귀띔 대화(E4) — 날은 아직 그날 밤 */
 rollNum($('#h-cash'), s.cash, n => M(n) + ' 원'); const td = $('#h-today'); $('#h-worth').textContent = `순자산 ${M(nw)}`; td.textContent = `오늘 ${today >= 0 ? '+' : ''}${M(today)}`; td.className = sc(today);
 const open = s.phase === 'open' && !s.msgs.length, pp = $('#pp'), spd = $('#spd'), todo = nowTodo(), away = todo.tab && tab !== todo.tab, run = open && !!s.speed; pp.textContent = run ? 'Ⅱ' : '▶'; pp.classList.toggle('on', run); pp.classList.toggle('off', !open && !away);   /* Ⅱ 는 장중에 흐를 때만(장 밖에 속도가 남아 있어도 ▶) */
 const tdb = $('#todo'); if (tdb) { tdb.hidden = !away; if (away && tdb.textContent !== todo.label) tdb.textContent = todo.label; } spd.querySelector('b').textContent = '×' + (lastSpeed || 1); spd.classList.toggle('off', !open || !s.speed);   /* 멈춘 동안은 흐리게(STONKS 아이콘 꼴) */
 $('#h-fill').style.width = (open ? Math.min(100, s.minute / g.M() * 100) : s.phase === 'evening' || s.phase === 'weekend' ? 100 : 0) + '%';   /* 하루 진행 = 날짜 칸 바탕 채움(D-041) */
 $$('.numtabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === grpOf(tab)));
 const feed = s.shown.filter(f => f.day === s.day), nl = $('#newsline');
 if (feed.length !== seen) { const last = feed.at(-1);
  if (last) { nl.innerHTML = `${srcLabel(last)}<b class="${last.dir > 0 ? 'up' : 'down'}">${esc(feedHead(last))}</b><em>오늘 뉴스 ${feed.length}건</em>`; if (seen >= 0) { nl.classList.remove('flash'); void nl.offsetWidth; nl.classList.add('flash'); } }
  else nl.innerHTML = '<em>아직 뉴스 없음</em>';
  seen = feed.length; if (tab === 'market') newsList(); }
 if (tab === 'market') marketLive(full); else if (tab === 'home') homeLive(); else if (PANES[tab]?.live) PANES[tab].live(full);
 for (const f of HUD) f(full);
 tut();
}
const FEEL = () => (T.dev && T.dev.feel) || {};   /* 연출 · 손맛 숫자(03_자료/장치/feel.json · 개편 차례 10) */
/* 돈 숫자 굴림(TICKER88 Glide 꼴 · 개편 차례 10) — 값이 바뀌면 보이던 값에서 새 값까지 짧게 굴러가고 늘면 빨강 · 줄면 파랑으로 잠깐 · 움직임 줄이기 · 연출 끄기면 바로 */
function rollNum(el, to, fmt) {
 if (!el) return; to = Math.round(to); if (el._to === to) return; const from = el._shown, R = FEEL().roll || {}, ms = R.ms || 420; el._to = to; cancelAnimationFrame(el._raf);
 if (from == null || !calMotion()) { el._shown = to; el.textContent = fmt(to); return; }
 el.classList.remove('roll-up', 'roll-dn'); void el.offsetWidth; el.classList.add(to > from ? 'roll-up' : 'roll-dn'); clearTimeout(el._fl); el._fl = setTimeout(() => el.classList.remove('roll-up', 'roll-dn'), R.flash_ms || 600);
 const t0 = performance.now(), step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3; el._shown = k < 1 ? from + (to - from) * e : to; el.textContent = fmt(el._shown); if (k < 1) el._raf = requestAnimationFrame(step); };
 el._raf = requestAnimationFrame(step); setTimeout(() => { if (el._to === to) { el._shown = to; el.textContent = fmt(to); } }, ms + 150);   /* 그림 틀이 멈춰도(창이 숨음) 끝 값은 꼭 보임 */
}
function srcLabel(f) { const src = f.src ? SRC[f.src] : null; return src ? `<span class="src s${src.stars}">${esc(src.name)} ${stars(src.stars)}${g.lvl('know') >= 1 ? ' · ' + Math.round(src.accuracy * 100) + '%' : ''}</span>` : f.kind === 'tip' ? `<span class="src tipb">${emo('✉')} 귀띔${f.insider ? ' · 내부' : ''}${g.lvl('know') >= 1 ? ' · ' + Math.round(f.acc * 100) + '%' : ''}</span>` : `<span class="src sys">${{ surprise: '속보', stake: '공시', era: '시대', cb: '거래 정지', sidecar: '사이드카', corp: '공시', weather: '날씨', confirm: '후속', denial: '후속', brief: emo('☕') + ' 브리핑' }[f.kind] || '알림'}</span>`; }
const smellTag = f => f.kind === 'news' && f.real === false && g.has('i_smell') && [...String(f.id)].reduce((n, c) => n + c.charCodeAt(0), 0) % 2 === 0 ? '<span class="src smell">?</span>' : '';

/* ── 탭 ── */
/* 판 그리기 겉(검토 11-22 '하루 바뀔 때마다 판 전체를 다시 그려 나타남 움직임이 되풀이' · 휴대폰 스크롤 튐 · 탭을 옮겨도 남는 판 상태 · 작은 창 시간 멈춤 한 꼴)
   ① 탭이 바뀌면 앞 탭의 펼침 · 2단 · 작은 창을 비우고 ☰ 를 닫음(paneLeave) ② 같은 탭을 다시 그리면, 앞 그림에도 있던 자리(태그 · 꾸밈 이름 · 차례가 같은 것)는 나타남 움직임을 안 돌리고(vstill)
   스크롤 자리를 그대로 둠(끝에 있었으면 끝으로) — 새로 생긴 것(새 말칸 · 새 창)만 움직임 ③ 작은 창 시간 멈춤 · 되돌림(holdSync) */
const tabOf = t => t === 'yuna2' ? 'senior' : t === 'cmd' ? 'market' : t === 'facil' || TAB_IN_HOME.includes(t) ? 'home' : t;
const VK_SKIP = new Set(['on', 'sel', 'vstill', 'swap-in', 'fade-out', 'out', 'still', 'nope', 'hot', 'off', 'own', 'short', 'dead', 'up', 'down', 'dn', 'ok', 'no', 'flash', 'fresh', 'roll-up', 'roll-dn', 'fa-step', 'mine', 'nw', 'lock', 'done', 'nx', 'got', 'open', 'shut', 'wait', 'empty', 'nostake']);   /* 상태로 바뀌는 꾸밈 이름은 자리 열쇠에서 뺌 */
let paneDepth = 0, paneKeys = null;
function paneLeave(prev) {
 menuClose();
 if (prev === 'home') { hmGoal = false; facil = 'top'; faSheet = null; PANES.life?.leave?.(); PANES.assets2?.leave?.(); }   /* 홈 안 생활 TRIP · 은행 정기예금 창도 */
 if (prev === 'market') mkSheet = null;
 if (prev === 'senior') ysSheet = null;
 if (prev === 'stake') { ksSheet = null; ksWin = null; }
 try { PANES[prev]?.leave?.(); } catch { /* 장치 하나가 못 비워도 탭은 옮겨짐 */ }
}
function paneScroll(P) { const out = new Map(); for (const e of P.querySelectorAll('*')) if (e._vk && e.scrollHeight > e.clientHeight + 1) out.set(e._vk, { top: e.scrollTop, end: e.scrollTop + e.clientHeight >= e.scrollHeight - 4 }); return out; }
function paneStill(P, keep) {
 const old = paneKeys, now = new Set();
 const walk = (el, pk) => { const cnt = {}; for (const c of el.children) { const base = c.tagName + '.' + [...c.classList].filter(x => !VK_SKIP.has(x)).sort().join('.'), n = cnt[base] = (cnt[base] || 0) + 1, k = pk + '/' + base + '#' + n;
  c._vk = k; now.add(k); c.classList.toggle('vstill', swapNow || !!old?.has(k)); walk(c, k); } };   /* 전환 층 안에서 그린 판은 '서서히 나타남' 없이(전환 층이 겹쳐 흐림) */
 walk(P, P.className.split(' ')[0]); paneKeys = now;
 if (keep?.size) for (const e of P.querySelectorAll('*')) { const v = e._vk && keep.get(e._vk); if (v) e.scrollTop = v.end ? e.scrollHeight : v.top; }
}
function pane() {
 if (paneDepth) return paneDraw();   /* 판 안에서 다시 부르면(옛 길 · 홈 칸 넘김) 그리기만 — 겉 일은 맨 바깥 한 번 */
 const P = $('#pane'); if (!P) return; const same = !!paneTab && tabOf(tab) === paneTab;
 if (paneTab && !same) paneLeave(paneTab);
 const keep = same ? paneScroll(P) : null; if (!same) paneKeys = null;
 paneDepth++; try { paneDraw(); } finally { paneDepth--; }
 if ($('#pane') === P) paneStill(P, keep); holdSync();
}
function paneDraw() {
 const P = $('#pane'); if (!P) return; const s = g.s; if (TAB_IN_HOME.includes(tab)) { if (tab === 'yuna2') { secView = 'report'; tab = 'senior'; } else if (tab === 'cmd') { mkList = 'cmd'; tab = 'market'; } else { if (tab === 'goals') hmGoal = true; tab = 'home'; facil = 'top'; } }   /* 옛 길(생활 · 목표 탭)로 오면 홈으로 */
 subLast[grpOf(tab)] = tab; syncTabs(); HINTS.length = 0; queueMicrotask(tut);   /* 판을 다 그린 뒤 안내(처음 한마디 포함)를 한 번 봄 — 멈춘 동안 판만 다시 그려도 뜸 */   /* 묶음 탭 안 판 이름 · 고른 판을 아래 줄에 맞춤 · 처음 한마디는 이 판 것만 다시 올라옴 */   /* 화면이 바뀌면 ☰ 메뉴는 닫힘 */ P.className = 'tab-' + tab; paneTab = tab; homeRoom(); if (tab !== 'senior') ysSheet = null; if (tab !== 'stake') { ksSheet = null; ksWin = null; }
 const nl0 = $('#newsline'); if (nl0) nl0.hidden = tab !== 'market';   /* 뉴스 띠는 트레이딩에서만(11-20 대표님 '딴 화면에선 빼자') — 다른 탭은 그만큼 판이 넓어짐 */
 const lv = id => g.lvl(id), nw = g.netWorth();
 if (tab === 'home') {
  /* 홈 — 내 장부(D-042 · D-043 · 목업 09_목업/홈장부_1120): 첫 화면엔 내 집 · 차 · 상가 · 빚 넷만 · 누르면 그 칸의 장(2단) → 작은 창(3단) · 유나는 얼굴 하나(누르면 비서 탭) */
  if (facil !== 'top') { drawFacil(P); return; }
  /* 11-22 장부 하나(대표님 승인 · 목업 09_목업/자산통일_1122 H3) — 칸 값은 매물 장부에서 읽음(보기만) · 표 '매물 · ○ ›'를 누르면 매물 그 칸 2단 · MY DEBT 는 홈 은행(BANK 1안) */
  const A2x = globalThis.Toy2Assets2, a2s = s.assets2, owe = s.debt + (s.baek.state === 'owe' ? s.baek.principal : 0), m2 = A2x?.monthOf(g);
  const car = A2x && a2s ? A2x.topCar(g) : null, nCar = a2s?.my.cars.length || 0;
  const shops = A2x && a2s ? a2s.my.est.filter(A2x.isShop).sort((p, q) => A2x.estValue(g, q, m2) - A2x.estValue(g, p, m2)) : [], shopTop = shops[0];
  const shopPic = p => !p ? shopArt() : shopArt(p.kind === 'building' ? 's_floor' : A2x.estValue(g, p, m2) >= 5e8 ? 's_mid' : 's_small');
  const tiles = [['house', '내 집', HOUSE[s.house].bg, esc(HOUSE[s.house].name), '집'], ['car', '내 차', carArt(s.car), car ? `${esc(car.name.replace('년식', ''))}${nCar > 1 ? ' 외' : ''}` : '없음', '차'],
   ['shop', '내 상가', shopPic(shopTop), shopTop ? `${esc(shopTop.name)}${shops.length > 1 ? ' 외' : ''}` : '없음', '부동산'], ['bank', '내 빚', '배경/in_client_office.jpg', `<span class="${owe ? 'hb-debt' : ''}">${owe ? M(owe) : '0'}</span>`, '']];
  /* 11-22 대표님 3안(목업 09_목업/홈생활_1122 M3) — 왼쪽 GOALS 기둥(순위 + 다음 목표 셋 · 누르면 크게) · 가운데 장부 2 × 2 · 오른쪽 생활(MOOD · SPEND · Lv. · TRIP) */
  const G = PANES.goals, nx = G?.next ? G.next(3) : [], canG = !!(G && visTabs().some(t => t[0] === 'goals'));
  const gbar = p => `<i class="hb-bar"><i style="width:${Math.round(p * 100)}%"></i></i>`;
  P.innerHTML = `<div class="hm3">
   <button class="hm3-goal" id="hm3-goal" ${canG ? '' : 'disabled'}><h3>목표</h3><small>상위 100</small><b id="hm-rank"></b><i class="hb-bar"><i id="hm-bar"></i></i><span id="hm-rk-to"></span>
    ${nx.length ? `<hr>${nx.map(x => `<span class="hm3-nx"><small>다음</small><b>${esc(x.name)}</b>${x.once ? '' : gbar(x.p) + `<em>${esc(x.val)}</em>`}</span>`).join('')}` : ''}</button>
   <div class="hm3-mid">${lawChip(s)}<div class="hb-book">${tiles.map(([k, n, img, v, to]) => `<button class="hb-tile" data-fa2="${k}"><span class="hb-pic" style="background-image:url('${art(img)}')"></span>${to && PANES.assets2?.go ? `<i class="hb-to">매물 · ${to} ›</i>` : ''}<span class="hb-cap"><small>${n}</small><b>${v}</b></span></button>`).join('')}</div></div>
   <div class="hm3-life">${PANES.life?.cards ? PANES.life.cards() : ''}</div></div>
   ${hmGoal && canG ? `<div class="hm3-gs"><div class="hm3-gs-hd"><button class="sm" data-hmg-back>◀</button><h2>목표</h2><span class="hm3-gs-rk"><small>상위 100</small><b>${g.rank()}위</b></span></div><div class="hm3-gs-bd" id="hm3-gs-bd"></div></div>` : ''}
   <button class="hb-face" id="hb-face" aria-label="${SNAME}"><img src="${coachFace(s.phase === 'evening' ? 'wink' : 'base')}" alt="${SNAME}"><i id="hb-dot" hidden></i></button>`;
  PANES.life?.bind?.();
  if (hmGoal && canG) G.draw($('#hm3-gs-bd'));
  if ($('#hm3-goal')) $('#hm3-goal').onclick = () => { hmGoal = true; pane(); };
  on('[data-hmg-back]', () => fadeClose('.hm3-gs', () => { hmGoal = false; pane(); }));
  on('[data-fa2]', d => { if (d.fa2 !== 'bank' && PANES.assets2?.go) return PANES.assets2.go({ house: 'house', car: 'car', shop: 'estate' }[d.fa2]); facil = d.fa2; faSheet = null; faBank = 'loan'; pane(); });
  $('#hb-face').hidden = !yunaHere(); $('#hb-face').onclick = () => { tab = 'senior'; pane(); hud(true); secBadge(); };
  on('[data-lawyer]', () => act('corp', ['lawyer'])); homeLive(); return; }
 if (tab === 'market') {
  /* 11-22 대표님 트레이딩 안 3 · 뉴스 안 2 + 차트 번호 — 왼쪽 STOCKS | COMMODITIES(한 번에 한 목록) · 오른쪽 그 종목 오늘 뉴스 → 보유 → 사고팖 */
  const cmds = mkCmd() ? T.commodities : [];
  if (!cmds.length) mkList = 'stocks';
  const list = mkList === 'cmd' ? cmds.map(c => `<button class="mrow crow" data-crow="${c.id}"><span class="nm"><img src="${art('아이콘/원자재/' + c.icon + '.png')}" alt=""><b>${esc(c.name)}</b><i class="own-tag"></i></span><span class="ch"></span><small class="cpr"></small></button>`).join('')
   : `<button class="allbtn ${focusAll ? 'on' : ''}" data-all><span>전체 종목</span><i>›</i></button>${g.stocks.map(x => `<button class="mrow" data-row="${x.id}"><span class="nm">${secIc(x.id)}<b>${esc(x.name)}</b><i class="own-dot"></i><i class="own-tag"></i><i class="ud" hidden></i></span><span class="pr" hidden></span><span class="ch"></span><span class="hq" hidden></span></button>`).join('')}`;
  P.innerHTML = `<div class="mk-left">${cmds.length ? `<div class="mk-seg"><button data-mkl="stocks" class="${mkList === 'stocks' ? 'on' : ''}">종목<i class="ud" id="mk-uds" hidden></i></button><button data-mkl="cmd" class="${mkList === 'cmd' ? 'on' : ''}">원자재</button></div>` : ''}${list}</div>
  <div class="mk-mid"><div class="mk-bar"><b id="mk-clock"></b></div>
   <div class="mk-title"><button class="mk-name" data-mksheet="stock"><h2 id="c-name"></h2><i>›</i></button><span class="mk-rg"><button data-rg="1D">1D</button><button data-rg="3M">3M</button></span><small id="c-sub" hidden></small><b id="c-price"></b><span id="c-ch"></span></div><canvas id="chart" width="1040" height="600"></canvas><small class="muted" id="o-hint" hidden></small></div>
  <div class="mk-right"><div class="box mk-box"><div class="mk-oh"><b class="mk-onm" id="o-name"></b><span id="o-ch"></span></div>
   <div class="mk-nh"><span>오늘 뉴스</span><span id="mk-nn"></span></div><div class="mk-news" id="mk-news"></div>
   <div class="pos"><div><small>보유</small><b id="o-q"></b></div><div><small>평균 단가</small><b id="o-avg"></b></div><div><small>손익</small><b id="o-pnl"></b></div><div hidden><small>지분</small><b id="o-stake"></b></div></div>
   <div class="btns"><div class="buyrow"><span>매수</span>${[0.1, 0.25, 0.5, 1].map(f => `<button class="buy" data-buyf="${f}">${f === 1 ? '전체' : f * 100 + '%'}</button>`).join('')}</div><div class="sellrow"><span id="sell-lab">매도</span>${[0.1, 0.25, 0.5, 1].map(f => `<button class="sell" data-sellf="${f}">${f === 1 ? '전체' : f * 100 + '%'}</button>`).join('')}</div></div></div></div>`;
  $$('[data-row]').forEach(r => r.onclick = () => { sel = r.dataset.row; selC = null; focusAll = false; $('[data-all]')?.classList.remove('on'); marketLive(true); });
  $$('[data-crow]').forEach(r => r.onclick = () => { selC = r.dataset.crow; focusAll = false; marketLive(true); });
  if ($('[data-all]')) $('[data-all]').onclick = () => { focusAll = !focusAll; selC = null; $('[data-all]').classList.toggle('on', focusAll); marketLive(true); };
  on('[data-mkl]', d => { if (mkList !== d.mkl) { mkList = d.mkl; mkSheet = null; if (mkList === 'stocks') selC = null; else { selC = selC || cmds[0]?.id || null; focusAll = false; } swapView(() => pane()); } });   /* 목록을 바꾸면 고른 것도 그 목록 것으로(검토 1-2 — 주식 목록인데 원자재를 사고팔던 것) */
  on('[data-rg]', d => { mkRange = d.rg; marketLive(true); });
  on('[data-buyf]', d => focusAll ? null : selC ? cmdTradeMk('buy', +d.buyf) : trade('buy', +d.buyf)); on('[data-sellf]', d => focusAll ? null : selC ? cmdTradeMk('sell', +d.sellf) : trade('sell', +d.sellf));   /* 전 종목 차트에선 사고팔지 않음(검토 1-1) */ on('[data-mksheet]', d => { if (!selC) { mkSheet = d.mksheet; marketLive(true); } }); newsList(); marketLive(true); return; }
 if (tab === 'facil') { tab = 'home'; pane(); return; }
 if (tab === 'senior') { if (!yunaHere()) { tab = 'home'; pane(); return; } drawSec(P); return; }
 if (tab === 'people') { drawPeople(P); return; }
 if (tab === 'stake') { drawStake(P); return; }
 if (tab === 'ach') { P.innerHTML = `<h2>업적 ${Object.keys(s.ach).length} / ${T.achievements.length}</h2><div class="achs">${T.achievements.map(a => g.achView(a)).map(a => `<div class="ach ${s.ach[a.id] ? 'got' : ''}"><b>${emo(s.ach[a.id] ? '🏆' : '🔒')} ${esc(a.name)}</b><small>${esc(a.text)}</small></div>`).join('')}</div>`; return; }
 if (PANES[tab]) { PANES[tab].draw(P); return; }   /* 화면 장치 탭 */
}
/* 홈 변호사 칩 — 감독 길 하나(D-071): 고발된 사건이 있고 변호사를 더 쓸 수 있을 때만 · 값은 회사 장치 lawyerFee */
function lawChip(s) { const k = s.corp?.kase, C = globalThis.Toy2Corp, L = C?.load(); if (!k || !L || k.lawyer >= L.law.lawyer_max) return ''; const fee = C.lawyerFee(k.lawyer + 1);
 return `<div class="home-chips"><button class="sm" data-lawyer ${s.cash < fee ? 'disabled' : ''}>${esc(L.ui.hire_lawyer)} ${M(fee)}</button></div>`; }
function homeLive() {
 const s = g.s; if (!$('#hm-rank')) return;
 const rk = g.rank(), top = N.rich_count + 1; $('#hm-rank').textContent = rk + '위'; const idxv = g.index() / s.market.idx0, r100 = [...s.rich].sort((a, b) => b - a)[99] * (0.5 + 0.5 * idxv);
 $('#hm-rk-to').textContent = rk <= 100 ? '진입' : `+${M(Math.max(0, r100 - g.netWorth()))}`;   /* 100위까지 모자란 돈(시험관 '101위면 싱거움') */ $('#hm-bar').style.width = Math.max(4, Math.min(100, (top + 50 - rk) / 50 * 100)) + '%';
 PANES.life?.live?.();   /* 홈 오른쪽 생활 칸 막대(스트레스 · 의심 포함) */
 secBadge();
}
function homeRoom() {
 const room = $('.room'); if (!room) return;
 room.classList.toggle('home-room', tab === 'home');
 room.classList.toggle('home-night', tab === 'home' && g.s.phase !== 'open' && g.s.minute >= g.M());
 room.style.backgroundImage = `url('${art(HOUSE[g.s.house].bg)}')`;
 $('.mon').classList.toggle('at-home', tab === 'home');
}
let lastSpeed = 1;
/* 트레이딩 판 상태(11-22) — 왼쪽 목록 · 고른 원자재(null 이면 주식 sel) · 차트 기간 */
let mkList = 'stocks', selC = null, mkRange = '1D';
/* 섹터 아이콘(11-22 대표님 '종목 이름 시작에 붙여줘 · 무슨 섹터인지 한눈에') — 그림 아이콘/섹터/<sec>.png · 없으면 자리째 빠짐 */
const secIc = id => ST[id]?.sec ? `<img class="sec-ic" src="${art('아이콘/섹터/' + ST[id].sec + '.png')}" alt="" onerror="this.remove()">` : '';
/* 이모지 대신 그림 아이콘(11-23 대표님 '이모지 쓰는 곳 전수 · 다 바꿔' · 전수 한 장 07_재기/이모지_전수_1123.md) — 그림 04_리소스/그림/아이콘/<갈래>/<이름>.png
   emo(v): v 가 '갈래/이름' 이면 그 그림 · 이모지 글자면 EMO_ART 로 바꿔 그림 · 모르면 글자 그대로(esc) · emoText(s): 글(옛 저장 대화 등)에 남은 이모지를 그림으로 */
const EMO_ART = { '🔒': '표시/lock', '🔍': '표시/magnifier', '♥': '표시/heart', '♡': '표시/heart', '✉': '표시/letter', '📨': '표시/letter', '☕': '표시/coffee', '📅': '화면/calendar', '🍶': '사람/toast', '🥂': '사람/toast', '🎂': '생활/cake', '☎': '사람/call', '💬': '사람/message', '🎁': '생활/gift', '🏢': '회사/office', '🏆': '놀이/trophy', '🎲': '놀이/dice', '🙂': '생활/happy', '🍺': '표시/beer', '🛋': '생활/comfort', '📚': '표시/books' };
const EMO_RE = new RegExp('(?:' + Object.keys(EMO_ART).join('|') + ')\uFE0F?', 'gu');
const emo = (v, cls = '') => { const p = !v ? '' : v.includes('/') ? v : EMO_ART[v.replace('\uFE0F', '')]; return p ? `<img class="emo-ic ${cls}" src="${art('아이콘/' + p + '.png')}" alt="">` : esc(v || ''); };
const emoText = s => esc(s || '').replace(EMO_RE, m => emo(m));
const mkCmd = () => (globalThis.Toy2Mods || []).find(m => m.name === 'commodity');
/* 안 본 뉴스(11-22 대표님 '장중에 뜬 뉴스가 있는 종목은 미확인 표시 · 한 번이라도 선택하면 사라짐') — 그 종목을 마지막으로 본 때(날 · 분) 뒤에 뜬 오늘 뉴스가 있으면 노란 점 */
const nKey = (d, m) => d * 10000 + m;
const newsOf = id => g.s.shown.filter(f => f.day === g.s.day && f.stock === id);
/* 판 시작 전 지난 값(11-22 대표님 '같은 규칙 무작위') — 그 종목 하루 변동(vol)로 첫 값에서 거꾸로 걸어 채움 · 판마다 같음(씨앗) · 저장 안 함 */
const preDate = k => { const d = new Date(DAYS[0] + 'T00:00:00Z'); for (let i = 0; i < -k;) { d.setUTCDate(d.getUTCDate() - 1); const w = d.getUTCDay(), md2 = d.toISOString().slice(5, 10); if (w && w < 6 && md2 !== '12-31' && md2 !== '12-25') i++; } return d.toISOString().slice(0, 10); };
const dayStr = d => d >= 0 ? DAYS[d] : preDate(d);
const mdShort = d => { const x = dayStr(d); return `${+x.slice(5, 7)}.${x.slice(8, 10)}`; };
let mkSheet = null, mkLast = '';
const LINE = ['#ff5a5f', '#7dffb0', '#4b8dff', '#ffd23c', '#ff7ae0', '#3ce0ff', '#ff9a3c', '#b48cff', '#a8ff3c', '#ffffff'];
function floatUp(html, cls, ic = '+', icls = '', key = '') {   /* 한 줄 알림(D-048 · 목업 09_목업/한줄알림_1120) — 오른쪽 아래 · 장을 멈추지 않음 · 그림 칸 + 짧은 글
   개편 차례 10(1판 C14 'TICKER88 토스트 쌓임'): 새 것이 아래에 들고 앞 것은 위로 밀려 쌓임 · 넷째부터 맨 위 것이 사라짐 · 저마다 2.6초 뒤 서서히 사라짐(feel.json toast) */
 const fx = $('#fx'); if (!fx) return; const D = FEEL().toast || {}, max = D.max || 3, gap = D.gap || 68, out = D.out_ms || 220;
 const gone = el => { if (el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => { el.remove(); lay(); }, out); };
 const lay = () => { const L = [...fx.querySelectorAll('.toast:not(.out)')]; L.forEach((el, i) => { const up = L.length - 1 - i; el.style.translate = `0 ${-up * gap}px`; el.classList.toggle('old', up > 0); }); L.slice(0, Math.max(0, L.length - max)).forEach(gone); };
 if (key) fx.querySelectorAll('.toast:not(.out)').forEach(x => { if (x.dataset.key === key) gone(x); });   /* 같은 열쇠(뉴스로 멈춤 등)는 새 것 하나만 — 셋까지 쌓여 단추를 가리던 것(검토 11-22) */
 const el = document.createElement('div'); el.className = 'toast ' + (cls === 'sys' ? 'sys' : '') + (tab === 'home' ? ' by-face' : tab === 'market' ? ' at-mk' : tab === 'senior' ? ' at-sec' : ''); if (key) el.dataset.key = key; el.innerHTML = `<span class="ic ${icls}">${ic}</span><span>${html}</span>`; fx.appendChild(el); lay();   /* 트레이딩은 차트 아래 · 비서는 태블릿 왼쪽(BUY · SELL 줄 · NEXT DAY 를 안 가림) */
 setTimeout(() => gone(el), D.life_ms || 2600); }

/* ── 흐름 · 판 ── */
function loop() { clearInterval(timer); timer = null; if (title || g.s.msgs.length) return;
 if (g.s.phase === 'away') { timer = setTimeout(() => { g.dispatch('away'); save(); refresh(); }, 350); return; }
 if (g.s.phase !== 'open' || !g.s.speed) return;
 /* 하루를 빨리 흘림(D-050 · 피드백 13) — ×1 하루 N.day_ms · 한 번에 여러 분을 넘기되 한 분씩 tick(값 · 뉴스 · 귀띔 규칙 그대로) · 뉴스가 뜨면 그 분에서 멈춤 */
 let acc = 0;
 timer = setInterval(() => { const ph = g.s.phase; acc += g.M() * N.frame_ms * g.s.speed / N.day_ms;   /* 장 분 수가 날마다 달라도 ×1 하루 5초 */
  while (acc >= 1 && g.s.phase === 'open' && !g.s.msgs.length) { acc--; const n0 = g.s.shown.length; g.tick();
   const fs = g.s.phase === 'open' ? g.s.shown.slice(n0).find(stopsOn) : null; if (fs) { const f = fs; g.dispatch('speed', 0);   /* 뉴스 종목으로 저절로 바꾸지 않음 — 안 본 뉴스는 목록의 노란 점으로(11-22 대표님 '바꾸지 마') */ save(); clearInterval(timer); timer = null; hud(true); floatUp(`${f.stock ? esc(ST[f.stock].name) + ' ' : ''}뉴스로 멈춤`, 'sys', 'Ⅱ', 'sys', 'pause'); return; } }
  hud(); if (g.s.phase !== ph || g.s.msgs.length || g.s.day !== loop.day) { loop.day = g.s.day; save(); refresh(); } }, N.frame_ms); }
/* 장중 뉴스 멈춤 고르기(결정 D-073 · 설정 NEWS STOP · 저장 칸 s.newsStop) — all 지금처럼 · star2 별 둘 이상 뉴스(귀띔 · 속보 · 지분 공시는 별 없이 멈춤) · mine 내 종목(보유 · 공매도) 소식 · off 안 멈춤
   시대 · 서킷브레이커(always)는 off 밖에선 늘 멈춤 · 갈래와 기본값은 feel.json news_stop · 옛 저장의 끄기(newsPause false)는 off 로 읽음 */
const newsStop = () => g.s.newsStop || (g.s.newsPause === false ? 'off' : FEEL().news_stop?.default || 'all');
function stopsOn(f) { const NS = FEEL().news_stop || {}, mode = newsStop();
 { const c = typeof coachState === 'function' ? coachState(g.s) : null; if (c && !c.off && c.first < T.coach.first.length) return f.kind === 'tip' && f.who === 'sec'; }   /* 첫 안내 동안은 유나 귀띔에서만 멈춤(11-23 대표님 '튜토리얼에선 뉴스 멈춤이 빠지고 가이드가 이어지게') */ if (mode === 'off' || !(NS.kinds || ['news', 'tip', 'surprise', 'era', 'stake', 'cb']).includes(f.kind)) return false;
 if (mode === 'all' || (NS.always || []).includes(f.kind)) return true; if (mode === 'star2') return f.kind !== 'news' || (SRC[f.src]?.stars ?? 0) >= (NS.star_min ?? 2);
 if (mode === 'mine') return !!f.stock && (g.s.hold[f.stock] || 0) !== 0; return true; }
function setNewsStop(v) { g.s.newsStop = v; if (v !== 'off') g.s.uiNewsOn = v; delete g.s.newsPause; const cb = $('#newspause'); if (cb) cb.checked = v !== 'off'; save(); }   /* ☰ 체크(켬 = 앞에 고른 것 · 끔 = off) · 설정 창이 함께 씀 */
/* 창(브라우저 탭)이 숨으면 장중 흐름을 멈춤(검토 11-22 '창 둘이면 숨은 창도 장이 흐름') — 돌아와도 저절로 다시 흐르지 않음(▶ 로) · bgm 은 s_bgm.js 가 멈추고 이어 틂 */
document.addEventListener('visibilitychange', () => { if (!document.hidden || title || !g || g.s.phase !== 'open' || !g.s.speed) return; hold.speed = 0; g.dispatch('speed', 0); save(); loop(); hud(true); });
function phase() {
 const s = g.s, O = $('#over'); if (title) return; setTimeout(tut, 0);
 if (s.msgs.length) return msgBox(s.msgs[0]);
 if (s.phase === 'evening' && s.uiEveMore !== s.day && yunaHere()) { O.innerHTML = ''; if (s.uiEveTab !== s.day) { s.uiEveTab = s.day; tab = 'senior'; pane(); hud(true); } return; }   /* 장 마감 뒤엔 비서 탭 대화에서 고름(E1 · E2) — 그날 한 번 비서 탭으로 */
 if (s.phase === 'evening') { const known = T.contacts.filter(p => s.contacts[p.id].known);
  O.innerHTML = `<div class="modal dark wide"><small>${esc(g.date())} · 저녁</small><h1>오늘 저녁은?</h1>
  <div class="opts">${yunaHere() ? `<button data-ev="senior"><img src="${SEC()}"><b>저녁 · ${SNAME}</b><small>관계 + · 내일 귀띔(${g.seniorLvl()}단계)</small></button>` : ''}${yunaHere() && g.seniorLvl() >= N.senior_paid_level ? `<button data-ev="paid" ${s.cash < g.paidCost() ? 'disabled' : ''}><img src="${SEC()}"><b>유료 리포트</b><small>${M(g.paidCost())} · 추천 종목</small></button>` : ''}
  <button data-ev="pub"><span class="emo">${emo('🍺')}</span><b>호프집</b><small>소문 · 새 사람</small></button><button data-ev="rest"><span class="emo">${emo('🛋')}</span><b>휴식</b><small>스트레스 −</small></button><button data-ev="study"><span class="emo">${emo('📚')}</span><b>공부</b><small>시장 지식 +</small></button></div>
  <h3>만나기</h3><div class="opts">${known.map(p => `<button data-ev="meet" data-who="${p.id}"><img src="${face(p.portrait)}"><b>${esc(p.name)}</b><small>${esc(T.roles[p.role].name)} · 관계 ${Math.round(s.contacts[p.id].rel)}${s.gift ? ' · 선물 있음' : ''}</small></button>`).join('')}</div></div>`;
  on('[data-ev]', d => meetEvening(d.ev, d.who));
  if (s.uiAppointment) { const b = s.uiAppointment === 'yuna' ? $('[data-ev=senior]') : $(`[data-who="${s.uiAppointment}"]`); if (b) { b.classList.add('on'); b.insertAdjacentHTML('beforeend', '<small>예약한 약속</small>'); } } return; }
 if (s.phase === 'weekend') {   /* 주말 — 지도에는 이름만 · 누르면 장소 카드(11-20 대표님 '단계로 쪼개' · STONKS 도시 지도 ss10) */
  const canGo = p => p.play ? globalThis.Toy2Play.avail(g, p.id).ok : CAR[s.car].reach >= p.reach || (p.id === 'golf' && g.has('f_golf'));
  const PL = wkPlaces(), P0 = wkPick && PL.find(x => x.id === wkPick);
  O.innerHTML = `<div class="modal dark map" data-k="weekend-${s.day}-${s.slot}"><small>${s.slot ? '일요일' : '토요일'}</small><h1>어디로 갈까?</h1><div class="wmap" style="background-image:url('${art('지도/map_yeouido.jpg')}')">
  ${PL.map(p => `<button class="wpin ${p.play ? 'play' : ''} ${canGo(p) ? '' : 'lock'} ${p.id === wkPick ? 'on' : ''}" style="left:${p.pin[0]}%;top:${p.pin[1]}%" data-pl="${p.id}"><b>${canGo(p) ? '' : emo('🔒') + ' '}${esc(p.name)}</b></button>`).join('')}
  ${P0 ? `<div class="wcard ${P0.pin[0] > 55 ? 'left' : ''}" ${P0.bg ? `style="background-image:url('${art(P0.bg)}')"` : ''}><div class="wc-in"><b>${esc(P0.name)}</b><span>${esc(canGo(P0) ? P0.text || '' : P0.play ? '' : Toy2.fmt(FEEL().place_need_car || '{car}', { car: T.cars.find(c => c.id !== 'none' && c.reach >= P0.reach)?.name || '' }))}</span><div class="wc-chips">${P0.cost ? `<i>−${P0.cost < 1e4 ? won(P0.cost) + '원' : M(P0.cost)}</i>` : ''}<i class="calm">스트레스 ${P0.stress}</i></div><div class="wc-bts"><button data-wk-back>뒤로</button><button class="primary" data-wk-go ${canGo(P0) ? '' : 'disabled'}>진행 ▶</button></div></div></div>` : ''}</div></div>`;
  on('[data-pl]', d => { wkPick = d.pl; phase(); });
  on('[data-wk-back]', () => { wkPick = null; phase(); });
  on('[data-wk-go]', () => { const id = wkPick; wkPick = null; place(id); }); return; }
 if (s.phase === 'away') { const a = s.away, trip = a.kind === 'trip' ? T.dev?.life?.trips?.find(x => x.id === a.trip) : null; O.innerHTML = `<div class="modal dark"><img class="hero" src="${art(trip ? trip.bg : a.kind === 'jail' ? '장난감2/in_courtroom.jpg' : '장난감2/bg_hospital.jpg')}"><h1>${trip ? esc(trip.place) : a.kind === 'jail' ? '구치소' : '병원'} — ${a.total - a.left} / ${a.total}일</h1><p>${esc(g.date())} · 장 열림 · 거래 잠김</p><p>순자산 ${M(g.netWorth())}</p></div>`; return; }
 if (s.phase === 'end') return drawEnding();
 O.innerHTML = '';
}
/* 주말 지도 핀 — 기본 장소(toy2.json places · pin) + 놀이 장소(play.json venues 가운데 주말에 열고 pin 이 있는 것 · 경마공원처럼 기본 장소와 같은 곳은 place 로 이음) */
function wkPlaces() { const card = FEEL().place_card || {}, out = T.places.map(p => ({ ...p, pin: p.pin || [50, 50], text: card[p.id] ? Toy2.fmt(card[p.id], { house: HOUSE[g.s.house].name }) : p.text })), PV = globalThis.Toy2Play, D = PV?.D?.();   /* 카드 글은 이름 · 짧은 상태(feel.json place_card · 검토 11-22 설명 글 줄이기) — 없으면 toy2.json 그대로 */
 if (D && g.s.play) for (const v of D.venues) if (v.pin && !v.place && v.when.some(w => w.startsWith('weekend')) && (v.unlock !== 'house' || g.s.play.house.known)) out.push({ id: v.id, name: v.name, bg: v.bg, pin: v.pin, cost: (v.fee || 0) + (v.travel || 0), stress: v.stress, text: D.lines.card?.[v.id] || '', play: true });   /* 카드 본문은 짧은 상태 글(lines.card) · 유나 한마디(lines.first)는 처음 들어갈 때만(새 눈 11-22) */
 return out; }
function place(id) { if (id === 'home') return placeGo(id); if (window.PLAY_BOX?.[id] && !PLACE[id]) return placeGo(id); enterFx(PLACE[id].name, g.s.slot ? '일요일' : '토요일', () => placeGo(id)); }
function placeGo(id) { const s = g.s;
 if (window.PLAY_BOX?.[id]) return PLAY_BOX[id]();   /* 놀이 장소(경마 · 경륜 · 노래방 …) — 놀이 장치 창(s_play.js) */
 if (id === 'temple') return templeBox(); if (id === 'golf') { const gk = T.contacts.filter(p => p.golf && s.contacts[p.id].known); if (gk.length > 1) return golfBox(gk); }
 visitGo(id); }
function templeBox() { const s = g.s; $('#over').innerHTML = `<div class="modal dark"><img class="hero" src="${art('장난감2/bg_temple.jpg')}"><h1>산사</h1><div class="wc-chips"><i class="calm">스트레스 ${PLACE.temple.stress}</i></div>${yunaSay(esc(FEEL().say?.temple || ''))}<div class="bankrow"><span>시주</span><button data-don="0">건너뛰기</button>${[1e6, 1e7, 1e8].map(a => `<button data-don="${a}" ${s.cash < a ? 'disabled' : ''}>${M(a)}</button>`).join('')}</div></div>`; on('[data-don]', d => visitGo('temple', +d.don)); }
function golfBox(list) { $('#over').innerHTML = `<div class="modal dark"><img class="hero" src="${art('장난감2/in_golf_club.jpg')}"><h1>골프장 — 누구와?</h1><div class="opts">${list.map(p => `<button data-gp="${p.id}"><img src="${face(p.portrait)}"><b>${esc(p.name)}</b><small>${esc(T.roles[p.role].name)}</small></button>`).join('')}</div></div>`; on('[data-gp]', d => visitGo('golf', d.gp)); }
/* 장소 장면(TICKER88 방문 장면 꼴 · 개편 차례 10) — 들어선 뒤 그 장소 그림 위로 글이 한 줄씩 일어남(맛 글 · 결과 줄) · 효과는 바로 셈 · 화면 다시 그리기는 장면이 걷힌 뒤 · 누르거나 키로 넘김 · 움직임 줄이기면 한 번에 */
function visitGo(id, arg) {
 const s = g.s, V = FEEL().visit, P = PLACE[id], b = { stress: s.stress, cash: s.cash, gift: s.gift, n: s.msgs.length, day: s.day, slot: s.slot };
 const ok = g.dispatch('weekend', arg === undefined ? [id] : [id, arg]); save();
 if (!ok || s.day === b.day && s.slot === b.slot) return refresh();   /* 못 감 · 이야기 장면이 맡음 — 장면 없이 */
 if (!V) { refresh(); return floatUp(`${esc(P.name)} · 스트레스 ${Math.round(s.stress - b.stress)}`, 'sell'); }
 const R = V.result || {}, f = (t, v) => String(t || '').replace('{v}', v), sd = Math.round(s.stress - b.stress), don = id === 'temple' && arg > 0 ? arg : 0;
 const spent = s.day === b.day ? b.cash - s.cash - don : P.cost;   /* 일요일이면 다음 날(달 정산)이 같이 지나가니 장소 값만 */
 const lines = [...(V.lines?.[id] || []).map(t => [t, '']), [f(R.stress, (sd > 0 ? '+' : sd < 0 ? '−' : '±') + Math.abs(sd)), 'calm'], ...(spent > 0 ? [[f(R.cost, M(spent)), 'dn']] : []), ...(don ? [[f(R.donate, M(don)), 'gold']] : []),
  ...(s.gift && !b.gift ? [[R.gift, 'pk']] : []), ...(s.msgs.slice(b.n).some(x => ['tip', 'intro', 'talk'].includes(x.type)) ? [[R.someone, 'gold']] : [])].filter(x => x[0]);
 const bg = id === 'home' ? HOUSE[s.house].bg : P.bg, el = document.createElement('div'); el.className = 'visit';
 el.innerHTML = `<div class="vs-bg" ${bg ? `style="background-image:url('${art(bg)}')"` : ''}></div><div class="vs-name"><b>${esc(P.name)}</b><small>${b.slot ? '일요일' : '토요일'}</small></div><div class="vs-log"></div>`;
 $('#stage').querySelectorAll('.visit').forEach(x => x.remove()); $('#stage').appendChild(el);
 const log = el.querySelector('.vs-log'), mv = calMotion(); let i = 0, tm = 0, fin = false;
 const put = () => { const [t, c] = lines[i++]; const d = document.createElement('div'); d.className = 'vs-ln ' + c; d.textContent = t; log.appendChild(d); };
 const end = () => { if (fin) return; fin = true; clearTimeout(tm); removeEventListener('keydown', key, true); el.classList.add('out'); setTimeout(() => el.remove(), 260); refresh(); };
 const next = () => { if (i < lines.length) { put(); tm = setTimeout(next, i < lines.length ? V.line_ms || 520 : V.hold_ms || 1300); } else end(); };
 const skip = () => { if (i >= lines.length) return end(); clearTimeout(tm); while (i < lines.length) put(); tm = setTimeout(end, V.hold_ms || 1300); };
 const key = e => { e.stopImmediatePropagation(); e.preventDefault(); if (!e.repeat) skip(); };   /* 장면이 떠 있는 동안 키는 아래 화면에 닿지 않음 */
 el.addEventListener('pointerdown', e => { e.stopPropagation(); skip(); }); addEventListener('keydown', key, true);
 if (mv) tm = setTimeout(next, 260); else { while (i < lines.length) put(); tm = setTimeout(end, V.calm_hold_ms || 1600); }
}
/* 큰 사건 카드 — 날아와 뒤집힘(TICKER88 카드 꼴 · 개편 차례 10) · feel.json flip.types 의 창이 처음 뜰 때 한 번 · 다시 그릴 땐 그대로 */
let flipLast = '';
const flipOf = (m, k) => { const F = FEEL().flip; if (!F || !calMotion() || !(F.types || []).includes(m.type) || flipLast === k) return ''; flipLast = k; return ' flip'; };
function msgBox(m) {
 if (m.type === 'scene' || m.type === 'closet') return drawScene(m);
 logTalk(m);
 if (m.type === 'month') return drawMonth(m);
 if (m.type === 'senior') { $('#over').innerHTML = ''; if (tab !== 'senior' && g.s.uiNightAway !== g.s.day) { tab = 'senior'; pane(); hud(true); } return; }   /* 종목 칩으로 트레이딩에 간 그날(mkGo · uiNightAway)은 되돌리지 않음 */   /* 되돌린 뒤 위 띠 '유나 귀띔 보기 ›'도 다시 셈(11-23 화면 전수 누르기 — 종목 칩 뒤 남아 눌러도 아무 일 없던 것) */
 if (m.type === 'ach' && !(m.first && MSGS.ach)) { $('#over').innerHTML = ''; floatUp(`업적 · ${esc(ACH[m.id].name)}`, '', '★', 'kA'); return act('msgdone'); }   /* 업적은 큰 창 대신 한 줄(D-048 · 구조 제안 5-4 작은 보상) */   /* 저녁을 같이 한 뒤 귀띔은 비서 탭 대화로(E4) */
 const O = $('#over'), s = g.s, P = m.who ? PEOPLE[m.who] : null, done = () => act('msgdone'); let h = '', btns = `<button class="primary" id="ok">확인</button>`, modBind = null;
 /* 큰 소식 창(11-20 대표님 '이대로 넣어' · '유나 그대로' · D-047 · 목업 09_목업/큰소식_1120) — 지금 화면 위를 어둡게 · 왼쪽 유나 반신 · 오른쪽 창 하나(꼬리표 · 제목 · 값 · 유나 한 마디) · 설명 문장은 유나 대사로(D-020) */
 const pic = P ? fullArt(PERSON[P.portrait] || 'hero') : '';
 const who = (sub, txt) => P ? `<div class="bn-who"><i style="background-image:url('${pic}')"></i><div><b>${esc(P.name)}</b><small>${sub}</small></div></div>${txt ? `<div class="bn-q">${txt}</div>` : ''}` : '';
 const kv = (k, v, c = '') => `<div class="bn-kv"><span>${k}</span><b class="${c}">${v}</b></div>`;
 const head = (tag, face, body, say) => `<div class="bn-wrap${flipOf(m, `${m.type}-${m.who || ''}-${s.msgs.length}-${s.day}`)}" data-k="${m.type}-${m.who || ''}-${s.msgs.length}-${s.day}">${yunaClip(face)}<div class="bn msg"><div class="bn-tag">${tag}</div><div class="bn-bd">${body}${yunaSay(say)}<div class="mb bn-mb" id="mb"></div></div></div></div>`;
 const rel = P ? `${esc(T.roles[P.role].name)} · 관계 ${Math.round(s.contacts[P.id]?.rel || 0)}` : '';
 switch (m.type) {
  case 'hello': h = head('안녕하세요', 'wink', `<h2>${SNAME} 비서</h2>`, esc(T.coach.first[0].say)); break;
  case 'call': h = callPhone(m, P, rel); btns = ''; break;   /* 전화 창 = 가운데 휴대폰 + 유나 작은 아이콘(11-23 대표님 목업 C1b · s_call.js) · 단추 y · n 은 휴대폰 안에 */
  case 'tip': { const say = m.insider ? '이건 내부 정보예요. 이걸로 크게 벌면 감독원이 봐요.' : emoText(Toy2.fmt(FEEL().tip?.say || '', { when: tipWhen() }));
   if (P) { h = tipPhone(m, P, rel, say); btns = ''; break; }   /* 사람 귀띔은 전화 창 꼴(11-23 대표님 피드백 22 '전화꼴' · s_call.js tipPhone) · 단추 ok */
   h = head('귀띔', m.insider ? 'worry' : 'base', `<h2>옆자리 손님</h2><div class="bn-q">"${esc(ST[m.stock].name)}, ${esc(tipLine(m.dir))}"</div>`, say); break; }   /* 보이는 날 기준(검토 11-22 — 다음 날 아침에 뜨는데 '내일') */
  case 'talk': h = head('메시지', 'base', who(rel, esc(m.text)), ''); break;
  case 'intro': h = head('새 연락처', 'base', who(`${esc(T.roles[P.role].name)}${P.stock ? ' · ' + esc(ST[P.stock].name) : ''}`, ''), `${m.by ? esc(PEOPLE[m.by].name) + ' 님이 소개해 줬어요. ' : ''}인맥 탭에 있어요.`); break;
  case 'stake': h = head('지분', m.gate >= 3 ? 'wink' : 'surprise', `<h2>${esc(ST[m.stock].name)} 지분 ${Math.round(N.stake_gates[m.gate] * 100)}%</h2><div class="ks2-lad">${GATES.map(([i, n]) => `<div class="${i < m.gate ? 'on' : i === m.gate ? 'on bn-now' : ''}">${Math.round(N.stake_gates[i] * 100)}%<small>${n}</small></div>`).join('')}</div>`,
   ['공시 나갔어요. 이제 따라 사는 사람들이 붙어요.', '이제 분기마다 주총 초대장이 와요.', '이사 자리예요. 달마다 급여가 나와요.', '경영권이에요! 회사 탭에서 방침을 정하시면 돼요.'][m.gate]); break;
  case 'agm': { const cur = s.policy[m.stock]; h = head('주총', 'base', `<h2>${esc(ST[m.stock].name)} 주주총회</h2>`, m.ceo ? '경영권이 있으니 사장님이 정하시면 돼요.' : '안건은 배당이에요. 사장님 표도 힘이 돼요.');
   btns = Object.entries(POL).map(([k, n]) => `<button data-pol="${k}">${n}${m.ceo && cur === k ? ' ✓' : ''}</button>`).join(''); break; }
  case 'sick': h = head('이벤트', 'worry', `<h2>쓰러졌다</h2>${kv('병원', m.days + '일')}${kv('병원비', M(N.hospital_cost), 'dn')}`, '사장님… 이번엔 꼭 쉬세요.'); break;
  case 'delist': h = head('상장 폐지', 'worry', `<h2>${esc(ST[m.stock].name)} 상장 폐지</h2>${m.lost ? kv('사라진 주식', won(m.lost) + '주', 'dn') : ''}`, m.lost ? '가지고 계셨던 게 휴지가 됐어요…' : '작은 종목 하나가 시장에서 사라졌어요.'); break;
  case 'scam': h = head('전화', 'base', '<h2>모르는 번호</h2><div class="bn-q">"사장님, 내일 확실히 오르는 종목 있습니다. 회비만 보내 주시면…"</div>', ''); btns = `<button id="y">믿어 본다</button><button class="primary" id="n">끊는다</button>`; break;
  case 'event': h = head('이벤트', 'surprise', `<div class="bn-q">${esc(m.text)}</div>`, ''); break;
  case 'week': h = head('이번 주', m.pnl >= 0 ? 'wink' : 'worry', `<small class="wk-d">${esc(md(m.from))} ~ ${esc(md(s.day))}</small><b class="wk-big ${m.pnl >= 0 ? 'up' : 'dn'}">${m.pnl ? (m.pnl > 0 ? '+' : '−') + M(Math.abs(m.pnl)) : '±0'}</b><div class="wk-ln">${g.rank()}위 · 거래 ${m.trades}회${m.tips ? ` · 귀띔 적중 ${m.tips}` : ''}</div>`, m.pnl >= 0 ? '한 주 고생하셨어요, 사장님.' : '이번 주는 쉽지 않았네요. 다음 주엔 같이 만회해요.'); btns = `<button class="primary" id="ok">다음 ▶</button>`; break;   /* 금요일 장 마감 — 이번 주(D-050 · 큰 소식 창 꼴 D-047) */
  case 'year': case 'inst': h = skillPlus(m); btns = ''; break;   /* 스킬 포인트 +1 = 유나 말칸(D-085 · 목업 09_목업/직감창_1123 K3 · s_skill.js) · 고르기는 스킬 탭에서(D-084) */
  default: if (MSGS[m.type]) { const r = MSGS[m.type](m, { head, kv, who, rel, P, done }); if (r == null) return; if (typeof r === 'string') h = r; else { h = r.html; if (r.btns) btns = r.btns; modBind = r.bind; } break; }   /* 화면 장치 창 — head(꼬리표, 유나 표정, 몸, 유나 말)를 쓰면 단추 칸 #mb 가 생김 */
   h = head('공지', 'base', `<h2>${esc(m.type)}</h2>`, '');
 }
 O.innerHTML = h; if ($('#mb')) $('#mb').innerHTML = btns;
 if ($('#ok')) $('#ok').onclick = done;
 if (m.type === 'call') { $('#y').onclick = () => { talkReply(m.who, 'call_yes'); act('call', [true, m.who]); }; $('#n').onclick = () => { talkReply(m.who, 'call_no'); act('call', [false, m.who]); }; }
 if (m.type === 'scam') { $('#y').onclick = () => act('scam', true); $('#n').onclick = () => act('scam', false); }
 if (m.type === 'agm') on('[data-pol]', d => act('agm', [m.stock, d.pol]));
 if (modBind) modBind();
 if (m.type === 'year' || m.type === 'inst') { syncTabs(); $('#sk-later').onclick = done; $('#sk-go').onclick = () => { tab = 'rep'; skSel = null; done(); }; }
}

/* ── 비서가 이끄는 첫걸음 — 「상한가」 코치 꼴(화면을 어둡게 · 짚는 칸만 밝힘 · 번호 · 다음 ▶) ── */
const goodToday = s => s.shown.filter(f => f.day === s.day && (f.kind === 'news' || f.kind === 'tip') && f.dir > 0);
/* 안내 상태는 화면에서만 더하며 그대로 판 저장에 들어간다. */
addEventListener('keydown', e => { if (title || !g || overHold || /INPUT|TEXTAREA/.test(e.target.tagName)) return;   /* 창이 전환 층을 기다리는 한 장면엔 옛 창에 키가 안 닿음 */ if (g.s.msgs[0]?.type === 'scene' || g.s.msgs[0]?.type === 'closet') { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) sceneNext(); } const k = +(e.code.match(/^(?:Digit|Numpad)(\d)$/) || [])[1]; const cb = k && document.querySelectorAll('[data-choice]')[k - 1]; if (cb) pickChoice(g.s.msgs[0], +cb.dataset.choice); return; }   /* 숫자 키 = 보이는 차례(잠긴 고르기는 숨김) */ if (e.code === 'Space') { e.preventDefault(); const t = nowTodo(); if (t.tab && tab !== t.tab) { todoGo(t); return; }   /* 비서 탭에서 고를 것이 있으면 그 탭으로(▶ 와 같은 '지금 할 일') */ if (g.s.msgs.length) { const m = g.s.msgs[0], mb = $$('#mb button'); if (['call', 'scam', 'agm'].includes(m.type) || mb.length > 1) return; if (mb.length === 1) mb[0].click(); else act('msgdone'); return; }   /* 스페이스는 단추 하나짜리 창만 넘김 — 고르기 창(단추 둘 이상)은 직접 고름(검토 1-6) */ todoGo(t); }   /* 스페이스도 ▶ 와 같은 '지금 할 일'(장중 = 흐름 · 설정 DEFAULT SPEED) */
 const n = +(e.code.match(/^(?:Digit|Numpad)(\d)$/) || [])[1]; const top = visTop()[n - 1]; if (top && !g.s.msgs.length) { const m = top.members, at = m.indexOf(tab); tabSwap(at >= 0 ? m[(at + 1) % m.length] : tabGo(top)); } });   /* 같은 숫자를 또 누르면 그 묶음의 다음 판 */
/* 이야기 화면의 진행 위치와 예약만 저장한다. 규칙은 이야기 엔진에 맡긴다. */
/* ── 새 판 — 다섯 단계(11-20 대표님 '단계 쪼개 · 주인공 고르는 맛' · 목업 09_목업/새판_1120 · 결정 D-037)
   LOOK(뒷모습 네 벌) → TEAM(증권사 시절 팀) → NAME(주사위) → DEAL(백 여사 차용증 = 난이도) → READY ── */
const NEW_STEPS = ['외모', '팀', '이름', '난이도', '준비'];
let newStep = 0, newPick = null, wkPick = null;
const heroArt = look => art('인물/hero_' + (look || 'navy') + '.png');
function drawNew(step) {
 if (step == null) { newStep = 0; newPick = { look: T.looks[0].id, team: T.teams[0].id, name: T.names[0], level, skip: (() => { try { return localStorage.getItem('ydo_skip_intro') === '1'; } catch { return false; } })() }; } else newStep = step;   /* 건너뛰기는 이 기기에 기억(시험할 때마다 다시 안 켜게) */
 const P = newPick, tm = T.teams.find(x => x.id === P.team), lk = T.looks.find(x => x.id === P.look), lv = T.levels.find(x => x.id === P.level);
 const bar = `<div class="ng-steps">${NEW_STEPS.map((n, i) => `<div class="${i === newStep ? 'on' : i < newStep ? 'done' : ''}"><i></i>${n}</div>`).join('')}</div>`;
 let body = '';
 if (newStep === 0) body = `<div class="ng-looks">${T.looks.map(x => `<button class="ng-lk ${x.id === P.look ? 'on' : ''}" data-look="${x.id}"><img src="${heroArt(x.id)}" alt=""><b>${esc(x.name)}</b></button>`).join('')}</div>`;
 if (newStep === 1) body = `<div class="ng-opts">${T.teams.map(x => { const nd = g0node(x.node); return `<button class="ng-op ${x.id === P.team ? 'on' : ''}" data-team="${x.id}"><span class="ng-ic" style="background:${x.color}">${emo(x.icon)}</span><span class="ng-tx"><b>${esc(x.name)}</b><small>${esc(x.line)}</small></span><span class="ng-chip">${esc(x.chip)} · ${nd ? emo(nd.icon) + ' ' + esc(nd.name) : ''}</span></button>`; }).join('')}</div>`;
 if (newStep === 2) body = `<div class="ng-name"><input id="player-name" maxlength="20" value="${esc(P.name)}" spellcheck="false" autocomplete="off"><button id="ng-dice" aria-label="아무 이름">${emo('🎲')}</button></div><div class="ng-say">${SNAME} — “사장님 성함이 어떻게 되세요?”</div>`;
 if (newStep === 3) body = `<div class="ng-deals">${T.levels.map(l => `<button class="ng-dl ${l.id === P.level ? 'on' : ''}" data-level="${l.id}"><h3>차 용 증</h3><b>${esc({ easy: '쉬움', normal: '보통', hard: '어려움' }[l.id] || l.name)}</b><span class="ng-kv"><span>퇴직금</span><span>${M(l.severance)}</span></span><span class="ng-kv"><span>백 여사</span><span>${M(l.principal)}</span></span><span class="ng-kv"><span>이자</span><span>은행 × ${l.rateMul}</span></span><span class="ng-seal">白</span></button>`).join('')}</div>`;
 if (newStep === 4) body = `<div class="ng-ready"><small>${DAYS[0].replaceAll('-', ' · ')}</small><h1>여의도</h1><div class="ng-nm">${esc(P.name)}</div><div class="ng-cards"><div><small>외모</small><b>${esc(lk.name)}</b></div><div><small>팀</small><b>${esc(tm.name)}</b></div><div><small>난이도</small><b>${esc({ easy: '쉬움', normal: '보통', hard: '어려움' }[lv.id] || lv.name)}</b></div></div>${eraOpen() ? `<div class="ng-era"><small>시대</small>${[['real', '실제'], ['random', '무작위']].map(([id, n]) => `<button class="${(P.era || 'real') === id ? 'on' : ''}" data-era="${id}">${n}</button>`).join('')}</div>` : ''}</div>`;
 const head = newStep === 4 ? '' : `<div class="ng-ttl">${NEW_STEPS[newStep]}</div>`;
 const same = $('#app .ng-wrap');
 const skipBtn = newStep === 4 ? `<button id="ng-skip" class="ng-skip ${P.skip ? 'on' : ''}" aria-pressed="${P.skip ? 'true' : 'false'}"><i></i>${esc(FEEL().newgame_skip || '')}</button>` : '';   /* 첫날 오프닝 장면 건너뛰기(11-23 대표님 '처음부터 시험할 때 빨리') — 켜면 유나 첫 안내부터 */
 const html = `${bar}${head}<div class="ng-body">${body}</div><div class="ng-foot"><button id="ng-back">◀ 뒤로</button><span class="ng-go">${skipBtn}<button class="primary" id="ng-next">${newStep === 4 ? '시작 ▶' : '다음 ▶'}</button></span></div>`;
 if (same) { $('.ng-hero').src = heroArt(P.look); $('.ng-side').innerHTML = html; } else
  $('#app').innerHTML = `<div class="story-screen new-game ng-wrap"><div class="story-bg" style="background-image:url('${sceneArt('in_han_river')}')"></div><div class="ng-vig"></div><img class="ng-hero" src="${heroArt(P.look)}" alt="주인공 뒷모습"><section class="ng-side">${html}</section></div>`;
 on('[data-look]', d => { P.look = d.look; drawNew(0); });
 on('[data-team]', d => { P.team = d.team; drawNew(1); });
 on('[data-level]', d => { P.level = level = d.level; drawNew(3); });
 on('[data-era]', d => { P.era = d.era; drawNew(4); });
 if ($('#ng-skip')) $('#ng-skip').onclick = () => { P.skip = !P.skip; try { localStorage.setItem('ydo_skip_intro', P.skip ? '1' : '0'); } catch { /* 못 써도 이번 판엔 먹음 */ } drawNew(4); };
 const nm = $('#player-name'); if (nm) { nm.oninput = () => { P.name = nm.value; }; nm.onkeydown = e => { if (e.key === 'Enter') $('#ng-next').click(); }; setTimeout(() => { nm.focus(); nm.select(); }, 30); }
 if ($('#ng-dice')) $('#ng-dice').onclick = () => { const pool = T.names.filter(n => n !== P.name); P.name = pool[Math.floor(Math.random() * pool.length)]; nm.value = P.name; nm.classList.remove('roll'); void nm.offsetWidth; nm.classList.add('roll'); };
 $('#ng-back').onclick = () => swapView(() => newStep ? drawNew(newStep - 1) : drawTitle());
 $('#ng-next').onclick = () => {
  if (newStep === 2) P.name = ($('#player-name').value.trim() || T.names[0]).slice(0, 20);
  if (newStep < 4) return swapView(() => drawNew(newStep + 1));
  g = new Game({ level: P.level, name: P.name, look: P.look, team: P.team, eraMode: eraOpen() ? P.era : 'real', seed: (Date.now() ^ 0x5bd1e995) >>> 0 });
  g.s.msgs = g.s.msgs.filter(m => m.type !== 'hello'); g.s.tut = 0;
  g.s.tips = [{ stock: 's4', dir: 1, t: 50, acc: 0.97, who: 'sec', whoName: SNAME, insider: false, head: `${SNAME} 비서: "사장님, 꽃온화장품에 오늘 좋은 소식이 나올 거래요"` }];
  g.build();
  if (P.skip) { let n = 0; while (g.s.msgs[0]?.type === 'scene' && g.s.msgs[0].time === '장 전' && g.s.msgs[0].date === DAYS[0] && n++ < 20) g.dispatch('msgdone'); }   /* 첫날 장 전 오프닝 장면(story.js INTRO)을 넘김 — 규칙의 넘김 길(장면 효과는 남김) · 그다음은 유나 첫 안내 */
  tab = 'home'; person = 'yuna'; title = false; seen = 0; save(); swapView(() => drawGame());
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
const bustArt = (id, f = 'base') => art('장면/' + id + '_' + (id === 'yuna' ? (yOut() ? yOut() + '_' + yExp(f) : f || 'base') : 'base') + '.png');
const SIZES = [['big', '확대'], ['up', '축소']];
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
 const w = relWord(id); return role ? (w && w !== role ? role + ' · ' + w : role) : '';   /* 역할 이름과 관계 말이 같으면 한 번만(검토 '강무열 동기 · 동기') */
}
function fxChips(fx) {   /* 고르기에서 바뀌는 숫자만 칩으로 — 표시 · 예약 · 단계 · 연락처는 숨김(「상한가」 '숨은 숫자는 말로도 안 보임') */
 const sg = n => (n > 0 ? '+' : '−') + Math.abs(n).toLocaleString('ko-KR');
 return fx.map(e => e.k === 'rel' ? `<span class="cchip ${e.n > 0 ? 'love' : 'dn'}">${emo('♥')} ${esc(CAST[e.who] || '')} ${sg(e.n)}</span>`
  : e.k === 'cash' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">${ic('money')}${M(Math.abs(e.n)).replace(/^/, e.n > 0 ? '+' : '−')}</span>`
  : e.k === 'debt' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">빚 ${e.n > 0 ? '+' : '−'}${M(Math.abs(e.n))}</span>`
  : e.k === 'debt_half' ? '<span class="cchip dn">빚 절반</span>'
  : e.k === 'susp' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">의심 ${sg(e.n)}</span>`
  : e.k === 'stress' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">스트레스 ${sg(e.n)}</span>`
  : e.k === 'rep' ? `<span class="cchip ${e.n > 0 ? 'up' : 'dn'}">${esc(REP[e.id]?.name || '')} ${sg(e.n)}</span>` : '').join('');
}
function sceneOf(m) {   /* 이야기 장면 · 아니면 착장 고맙다 장면(msg closet · 자료 yuna2.json closet.thanks) */
 if (m.type !== 'closet') return T.story.scenes.find(x => x.id === m.id);
 const C = window.Toy2Yuna2?.data?.()?.closet, it = C?.items.find(x => x.id === m.id);
 return { id: 'closet-' + m.id, title: '새 옷 · ' + (it?.name || ''), chip: '옷장', bg: C?.bg || 'in_ceo_office', cast: { y: { id: 'yuna', face: 'base' } }, choices: [],
  lines: (C?.thanks?.[m.id] || [['yuna', '고마워요, 사장님.']]).map(([say, text], i, L) => say === 'yuna' ? { say, text, face: i === L.length - 1 ? 'wink' : 'base' } : { say, text }) };
}
/* 통화 화면 — 건 사람 얼굴(명함 얼굴 · 없으면 전신 위쪽) · 이름 · CALL · 통화 시간(대사 줄마다 몇 초) */
const callFace = id => { const p = T.contacts.find(c => PERSON[c.portrait] === id); return p ? face(p.portrait) : fullArt(id); };
const callBox = (id, n, still) => { const t = 4 + n * 6; return `<div class="scene-call ${still ? 'still' : ''}"><div class="sc-ph"><span class="sc-av" style="background-image:url('${callFace(id)}')"></span><b>${esc(speaker(id))}</b><small>전화</small><em>${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}</em></div></div>`; };
function drawScene(m) {
 clearInterval(timer); timer = null; clearInterval(typing); typing = null;
 const scene = sceneOf(m), ui = sceneState(m), lines = sceneLines(scene, ui), line = lines[Math.min(ui.line, lines.length - 1)];
 const choosing = ui.choice == null && ui.line >= scene.lines.length - 1 && scene.choices.length && ui.shown === ui.line;
 const cast = Object.values(scene.cast || {}), face = {};
 let stand = null;   /* 서 있는 한 사람 — 말하는 사람 · 아니면 바로 앞에 말한 사람 · 아니면 첫 인물 */
 for (const l of lines.slice(0, ui.line + 1)) { if (l.face) face[l.say] = l.face; if (cast.some(c => c.id === l.say)) stand = l.say; }
 stand = stand || cast[0]?.id; const sc = cast.find(c => c.id === stand), mood = face[stand] || sc?.face || 'base';
 const nm = line.say ? `<div class="sname ${line.say === 'me' ? 'me' : ''}">${esc(speaker(line.say))}${whoNote(line.say) ? `<small>${esc(whoNote(line.say))}</small>` : ''}</div>` : '';
 const call = !!stand && (T.dev?.story2?.phone || []).includes(m.id);   /* 전화 장면 — 방에 서 있는 대신 휴대폰 통화 꼴(결정 D-075 ⑤ · 목록 story2.json phone) */
 const ill = stand && !call ? bustArt(stand, mood) : '', sameScene = $('#over .scene-screen')?.dataset.k === 'scene-' + m.id, swap = !!ill && sameScene && !!illShown && illShown !== ill;
 const days = m.date ? `${+m.date.slice(0, 4)}년 ${+m.date.slice(5, 7)}월 ${+m.date.slice(8, 10)}일` : '';
 $('#over').innerHTML = `<div class="story-screen scene-screen vs-${viewSize}" data-k="scene-${m.id}"><div class="story-bg" style="background-image:url('${sceneArt(scene.bg)}')"></div><div class="scene-dots"></div>
  ${ill ? `<img class="scene-ill ${ill === illShown && sameScene ? 'still' : swap ? 'sw-wait' : ''}" src="${ill}" alt="${esc(speaker(stand))}">${swap ? `<img class="scene-ill sw-old" src="${illShown}" alt="">` : ''}` : ''}${call ? callBox(stand, ui.line, sameScene) : ''}
  <div class="scene-title"><span class="chip">${esc(scene.chip || T.scene_flash?.[m.id] || days + ' · ' + m.time)}</span><h2 class="${ui.line ? 'gone' : ''}">${esc(plainTitle(scene.title))}</h2></div>
  <section class="scene-dlg" aria-live="polite">${nm}
   <div class="tools">${stand ? `<button id="scene-size" class="sm">${SIZES.find(x => x[0] === viewSize)[1]}</button>` : ''}<button id="scene-log" class="sm log">${ui.log ? '기록 닫기' : '기록'}</button><button id="scene-back" class="sm" ${ui.line && !(ui.choice != null && ui.line <= scene.lines.length) ? '' : 'disabled'}>◀ 뒤로</button><button id="scene-fast" class="sm" ${choosing ? 'disabled' : ''}>건너뛰기 ▶▶</button></div>
   <p id="scene-line" class="text ${line.say ? '' : 'nar'}"></p>${choosing ? '' : `<i class="more blink" ${ui.shown === ui.line ? '' : 'hidden'}>▼</i>`}
   ${choosing ? `<div class="scene-ch">${Toy2Story.visible(g, scene).map((i, k) => `<button data-choice="${i}"><b>${k + 1}</b><span>${esc(g.storyText(scene.choices[i].text))}</span></button>`).join('')}</div>` : ''}
  </section>
  ${ui.log ? `<section class="story-panel scene-history"><h2>${esc(plainTitle(scene.title))}</h2>${lines.slice(0, Math.min(ui.line + 1, lines.length)).map(l => `<p><b>${esc(l.say ? speaker(l.say) : '')}</b> ${esc(g.storyText(l.text))}</p>`).join('')}${ui.choice != null ? `<p class="muted">고른 것: ${esc(g.storyText(scene.choices[ui.choice].text))} — ${esc(g.storyText(scene.choices[ui.choice].hint))}</p>` : ''}</section>` : ''}</div>`;
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
function finishScene(m, ui) { clearInterval(typing); typing = null; if (m.type === 'closet') { delete g.s.uiScene; return act('msgdone'); } const choice = ui.choice ?? -1; delete g.s.uiScene; act('scene', [m.id, choice]); }
function sceneNext() {
 const m = g.s.msgs[0]; if (m?.type !== 'scene' && m?.type !== 'closet') return;
 const ui = sceneState(m), scene = sceneOf(m);
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
/* ── 스킬 탭(3번 · 결정 D-083 ~ D-086) — 그리기는 s_skill.js(PANES.rep) · 상태만 여기 ── */
let skSel = null, skHelp = false, skRep = null, skRespec = false;   /* 고른 칸 · ? 도움말 · 누른 평판 · 다시 고르기 확인 */
const amtTxt = a => a === 'all' ? '전체' : M(a);
/* ── 홈 은행(MY DEBT) — 단계 나눔(11-20 대표님 '뎁스를 두고 정보량을 줄여' · 목업 09_목업/자산회사탭_1120)
   11-22 장부 하나 · BANK 1안: 은행은 여기 한 곳 — LOAN(백 여사 · 대출 · 보통예금) · DEPOSIT(정기예금) · BOARD(투자 게시판) · MY(내 정기예금 · 투자)는 매물 장치 a2Bank* 가 그림.
   집 · 차 · 상가 사기 화면은 매물 탭으로 옮김(홈 칸은 보기만) ── */
const BANK_MODES = { borrow: '대출', repay: '상환', save: '저장', withdraw: '출금' };   /* 단추 · 창 머리는 영어(D-063) */
let faSheet = null, faLast = '', faBank = 'loan';
function bankAll(mode) { const s = g.s, lim = g.loanLimit(); return { borrow: lim - s.debt, repay: Math.min(s.debt, s.cash), save: s.cash, withdraw: s.deposit }[mode]; }
const carArt = id => '자산/car_' + (id && id !== 'none' ? id : 'none') + '.jpg', shopArt = id => '자산/shop_' + ({ s_small: 'small', s_mid: 'mid', s_floor: 'floor' }[id] || 'none') + '.jpg';
function closeFaSheet(go) {   /* 작은 창은 서서히 사라진 뒤 닫힘(움직임 줄이기면 바로) */
 const el = $('.fa-sheet'); const done = () => { faSheet = null; if (go) go(); else pane(); };
 if (!el || !calMotion()) return done(); el.classList.add('out'); setTimeout(done, 180);
}
function drawFacil(P) {
 if (facil !== 'bank') { facil = 'top'; return pane(); }   /* 옛 길(집 · 차 · 상가 칸)은 홈으로 */
 const s = g.s, B = PANES.assets2?.bankSegs ? PANES.assets2 : null; if (!B) faBank = 'loan';
 const view = facil + ':' + faBank + (faSheet ? ':' + faSheet.kind : ''), moved = faLast.split(':')[0] !== facil; faLast = view;
 const segs = B ? `<div class="a2-segs db-segs">${[['loan', '대출'], ...B.bankSegs()].map(([id, n]) => `<button class="sm ${faBank === id ? 'on' : ''}" data-fbank="${id}">${n}</button>`).join('')}</div>` : '';
 let body = `<div class="fa-crumb"><button class="sm" data-fa2="top">◀ 홈</button><b>은행</b></div>` + segs, sheet = '';
 if (faBank !== 'loan') { body += B.bankBody(faBank); sheet = B.bankSheet(); }
 else {
  const lim = g.loanLimit(), b = s.baek, owe = s.baek.state === 'owe' ? b.principal : 0, canBaek = owe > 0 && DAYS[s.day] >= N.baek_repay_from && s.cash >= 1;
  const row = (name, cells, bts, off) => `<div class="db-row ${off ? 'off' : ''}"><b class="db-n">${name}</b>${cells.map(([k, v, c]) => `<span class="db-c"><small>${k}</small><em class="${c || ''}">${v}</em></span>`).join('')}<span class="db-b">${bts}</span></div>`;
  const bt = (m, label, off, main) => `<button class="${main && !off ? 'primary' : ''}" data-bsheet="${m}" ${off ? 'disabled' : ''}>${label}</button>`;
  body += `<div class="db-wrap">
   ${row('백 여사', [['남은 돈', owe ? M(owe) : '유료', owe ? 'dn' : ''], ['달 이자', M(g.baekInterest())], ['갚을 날', N.baek_repay_from.slice(0, 7)]], bt('baek', '상환', !canBaek, true), !owe)}
   ${row('은행 대출', [['남은 돈', M(s.debt), s.debt ? 'dn' : ''], ['한도', M(lim)], ['달 이자', (g.loanRate() * 100).toFixed(2) + '%']], bt('borrow', '대출', lim - s.debt <= 0, true) + bt('repay', '상환', !s.debt || s.cash < 1), !lim && !s.debt)}
   <div class="db-sum"><span>빚 합계 · 달 이자 ${M(g.baekInterest() + s.debt * g.loanRate())}</span><b class="${owe + s.debt ? 'dn' : ''}">${M(owe + s.debt)}</b></div>
   <div class="db-gap"></div>
   ${row('예금', [['맡긴 돈', M(s.deposit)], ['달 이자', (N.deposit_rate * 100).toFixed(2) + '%'], ['다음', esc(nextInterest().slice(5).replace('-', '/'))]], bt('save', '저장', s.cash < 1) + bt('withdraw', '출금', !s.deposit))}</div>`;
  if (faSheet?.kind === 'bank') {
   const m = faSheet.mode, all = m === 'baek' ? Math.min(owe, s.cash) : bankAll(m), a = bankAmt === 'all' ? all : bankAmt;
   const ok = a > 0 && { baek: canBaek, borrow: s.debt + a <= g.loanLimit(), repay: s.debt > 0 && s.cash >= 1, save: s.cash >= a, withdraw: s.deposit > 0 }[m];
   const after = s.cash + { baek: -Math.min(a, owe, s.cash), borrow: a, repay: -Math.min(a, s.debt, s.cash), save: -a, withdraw: Math.min(a, s.deposit) }[m];
   sheet = `<div class="fa-sheet"><div class="fa-dim" data-fa-back></div><div class="fa-win"><h2>${m === 'baek' ? '상환 · 백 여사' : BANK_MODES[m]}</h2><div class="fa-chips">${[1e7, 5e7, 1e8, 5e8, 'all'].map(v => `<button class="${bankAmt === v ? 'on' : ''}" data-ba="${v}">${amtTxt(v)}</button>`).join('')}</div>
    <div class="fa-chg"><span>현금</span><b>${M(s.cash)} → ${M(Math.max(0, after))}</b></div><div class="fa-ft"><button data-fa-back>뒤로</button><button class="primary" id="fa-do" ${ok ? '' : 'disabled'}>확인</button></div></div></div>`;
  }
 }
 P.innerHTML = `<div class="fa-bg" style="background-image:url('${art(HOUSE[s.house].bg)}')"></div><div class="fa-view ${moved ? 'fa-step' : ''}">${body}</div>${sheet}`;
 on('[data-fa2]', d => { facil = d.fa2; faSheet = null; pane(); });
 on('[data-fbank]', d => { faBank = d.fbank; faSheet = null; swapView(() => pane()); });
 if (faBank !== 'loan') return B.bankBind();
 on('[data-bsheet]', d => { faSheet = { kind: 'bank', mode: d.bsheet }; bankAmt = d.bsheet === 'repay' || d.bsheet === 'withdraw' || d.bsheet === 'baek' ? 'all' : bankAmt === 'all' ? 5e7 : bankAmt; pane(); });
 on('[data-ba]', d => { bankAmt = d.ba === 'all' ? 'all' : +d.ba; pane(); });
 on('[data-fa-back]', () => closeFaSheet());
 if ($('#fa-do')) $('#fa-do').onclick = () => { const m = faSheet.mode, a = bankAmt === 'all' ? (m === 'baek' ? Math.min(s.baek.principal, s.cash) : bankAll(m)) : bankAmt; closeFaSheet(() => m === 'baek' ? act('baekRepay', a) : act('bank', [m, a])); };
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
 const cell = (k, v, c = '') => `<div><small>${k}</small><b class="${c}">${v}</b></div>`, back = '<button class="sm mk-x" data-ks-back>닫기 ✕</button>';
 if (ksSheet === 'firm' && s.firm) { const F = s.firm, pay = F.mgr.reduce((n, m) => n + T.firm_tiers[m.tier].pay, 0);
  return `<div class="mk-hd"><b>투자회사</b><button class="ks2-hb" data-ksw="money">펀드 <i>›</i></button>${back}</div>
   <div class="mk-cells">${cell('운용 자금', M(F.capital))}${cell('지난달', `${F.last >= 0 ? '+' : '−'}${M(Math.abs(F.last))}`, sg2(F.last))}${cell('매니저 보수 · 달', M(pay))}</div>
   <div class="ks2-mrows">${Object.entries(T.firm_tiers).map(([k, t]) => { const i = F.mgr.findIndex(m => m.tier === k); return `<div class="ks2-mr ${i >= 0 ? '' : 'off'}"><b>${esc(t.name)}</b><span>달 기대 +${(t.mean * 100).toFixed(1)}%</span><span>보수 ${M(t.pay)}</span>${i >= 0 ? `<button data-fire="${i}">해고</button>` : `<button data-hire="${k}" ${F.mgr.length >= 3 ? 'disabled' : ''}>고용</button>`}</div>`; }).join('')}</div>`; }
 const x = ksSheet && ST[ksSheet]; if (!x) return '';
 const gt = s.gate[x.id] ?? -1, st = g.stake(x.id), val = (s.hold[x.id] || 0) * g.price(x.id);
 const third = gt >= 2 ? cell('이사 보수 · 달', M(g.price(x.id) * x.shares * N.director_pay)) : gt >= 1 ? cell('다음 주총', agmNext(s) + '월') : '';
 return `<div class="mk-hd"><b>${esc(x.name)}</b><small>${esc(x.sector)}</small><button class="ks2-hb" data-kstrade="${x.id}">트레이딩 <i>›</i></button>${back}</div>
  <div class="mk-cells" style="grid-template-columns:repeat(${third ? 3 : 2},1fr)">${cell('내 지분', stPct(st))}${cell('지분 가치', M(val))}${third}</div>
  ${gt >= 3 ? `<div class="ks2-pol"><small>방침</small><b>${POL[s.policy[x.id]] || '—'}</b><small>다음 주총 · ${agmNext(s)}월</small><button class="ks2-hb" data-ksw="pol">바꾸기 <i>›</i></button></div>` : ''}
  <div class="ks2-lad">${GATES.map(([i, n]) => `<div class="${gt >= i ? 'on' : i === gt + 1 ? 'nx' : ''}">${Math.round(N.stake_gates[i] * 100)}%<small>${n}${gt >= i ? ' ✓' : i === gt + 1 ? ' · 다음' : ''}</small></div>`).join('')}</div>`;
}
function ksWinHtml(s) {
 if (ksWin === 'pol' && ST[ksSheet]) { const cur = ksPol || s.policy[ksSheet] || 'invest', SUB = { invest: '회사 성장 +', div: '분기 배당 ×2', buyback: '주가 덜 흔들림' };
  return `<h2>${esc(ST[ksSheet].name)} · 방침</h2><div class="ks2-pick">${Object.entries(POL).map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-kspol="${k}"><span>${n}${cur === k ? ' ✓' : ''}</span><small>${SUB[k]}</small></button>`).join('')}</div><div class="fa-ft"><button data-ksw-back>뒤로</button><button class="primary" id="ks-pol-ok">확인</button></div>`; }
 if (ksWin === 'money' && s.firm) { const F = s.firm;
  return `<div class="mk-hd"><h2>펀드 · 투자회사</h2><button class="sm mk-x" data-ksw-back>닫기 ✕</button></div><div class="fa-chips" style="grid-template-columns:repeat(3,1fr)">${[1e8, 5e8, 1e9].map(v => `<button class="${ksAmt === v ? 'on' : ''}" data-ksamt="${v}">${M(v)}</button>`).join('')}</div>
   <div class="fa-chg"><span>운용 자금</span><b>${M(F.capital)}</b></div><div class="fa-chg"><span>현금</span><b>${M(s.cash)}</b></div>
   <div class="fa-ft"><button data-ksfa="take" ${F.capital < ksAmt ? 'disabled' : ''}>출금</button><button class="primary" data-ksfa="add" ${s.cash < ksAmt ? 'disabled' : ''}>추가</button></div>`; }
 return '';
}
function drawStake(P) {
 const s = g.s, mine = g.stocks.filter(x => g.stake(x.id) > 0).sort((a, b) => g.stake(b.id) - g.stake(a.id));
 if (ksSheet && ksSheet !== 'firm' && !mine.some(x => x.id === ksSheet)) ksSheet = null;
 const row = x => { const gt = s.gate[x.id] ?? -1, ch = dayChg(x.id);
  return `<button class="ks2-row" data-ks="${x.id}"><span class="ks2-lg">${esc(x.name.slice(0, 1))}</span><span class="ks2-nm"><b>${esc(x.name)}</b><small>${esc(x.sector)} · 오늘 <span class="${sg2(ch)}">${pct1(ch)}</span></small></span><span class="ks2-pc">${stPct(g.stake(x.id))}</span><span class="ks2-gt ${gt >= 3 ? 'top' : ''}">${gt >= 0 ? GATES[gt][1] : ''}</span><i class="ks2-go">›</i></button>`; };
 const left = `<div class="ks2-pnl ks2-st"><h3>내 지분</h3><div class="ks2-rows">${mine.map(row).join('')}</div><button class="ks2-more" data-tomarket>+ 트레이딩</button></div>`;
 let right;
 if (!s.firm) { const okW = g.lvl('wealth') >= 3, okC = s.cash >= N.firm_cost;
  right = `<div class="ks2-pnl ks2-firm"><h3>투자회사</h3><div class="ks2-fb"><span class="ks2-pic lk" style="background-image:url('${art('배경/in_ceo_office.jpg')}')"></span>
   <div class="ks2-cond"><div><span>재력 3단계</span><b class="${okW ? 'ok' : 'no'}">${okW ? '✓' : '✗'}</b></div><div><span>현금 ${M(N.firm_cost)}</span><b class="${okC ? 'ok' : 'no'}">${okC ? '✓' : '✗'}</b></div></div>
   <button class="primary ks2-found" data-found ${okW && okC ? '' : 'disabled'}>창업</button></div></div>`;
 } else { const F = s.firm;
  right = `<button class="ks2-pnl ks2-firm open" data-ks="firm"><h3>투자회사<i class="ks2-go">›</i></h3><div class="ks2-fb"><span class="ks2-pic" style="background-image:url('${art('배경/in_ceo_office.jpg')}')"></span>
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
 on('[data-kstrade]', d => { ksSheet = null; mkGo(d.kstrade); });
 on('[data-hire]', d => act('firm', ['hire', d.hire])); on('[data-fire]', d => act('firm', ['fire', +d.fire])); on('[data-found]', () => act('firm', ['found']));
 on('[data-tomarket]', () => mkGo());
}
/* ── 인맥 — 이야기 인물 대화 기록(판 상태 uiTalk) · 안 읽은 수 · 다음 단계 — 화면은 s_people.js(D-052) ── */
const ROLE_SAY = { ceo: '요즘 회사 일로 정신없어요.', reporter: '재밌는 얘기 생기면 저도 좀 끼워 줘요.', analyst: '보고서 마감이라 바빠요. 그래도 연락 줘서 고마워요.', tipster: '사장님, 요즘 시장에 말이 많아요.', loan: '이자 날짜만 잊지 마세요.', official: '말씀 조심하세요. 그래도 반가워요.', banker: '언제 한번 지점에 들르세요.', friend: '야, 이번 주 한잔하자.' };
function talkOf(id) { const s = g.s; s.uiTalk ||= {}; const L = (s.uiTalk[id] ||= []); if (!L.length && s.contacts[id]?.known) L.push({ d: 0, at: '', sys: true, text: '명함을 주고받음', read: true }); return L; }
function addTalk(id, x) { talkOf(id).push({ d: g.s.day, at: x.at || nowHM(g.s) || '저녁', ...x }); }
function talkReply(id, k) {   /* 받은 전화 · 귀띔에 내 답(+ 상대 대답)을 대화에 남김 — 대사는 people.json ui.reply(11-23 피드백 18 '일방적') */
 if (!id || !g.s.contacts?.[id]) return; const [me, them] = T.dev?.people?.ui?.reply?.[k] || []; if (me) addTalk(id, { me: true, text: me, read: true }); if (them) addTalk(id, { text: them, read: true });
}
/* 귀띔 말 — 보이는 때 기준: 장중(다음 날 아침에 뜸) = '오늘' · 주말 = 다음 거래일 요일(글은 feel.json tip) */
const tipWhen = () => { const P = FEEL().tip || {}; return g.s.phase === 'open' ? P.today || '' : Toy2.fmt(P.next || '{dow}', { dow: WEEK_KO[dow(g.s.day + 1)] }); };
const tipLine = dir => { const P = FEEL().tip || {}; return dir > 0 ? Toy2.fmt(P.good || '', { when: tipWhen() }) : P.bad || ''; };
function logTalk(m) {   /* 사람에게서 온 알림(전화 · 귀띔 · 이야기)을 그 사람 대화에도 남김 — 알림 창은 그대로 */
 if (m.logged || !m.who || !g.s.contacts[m.who]) return; m.logged = true;
 if (m.type === 'call') addTalk(m.who, { text: '오늘 저녁 한잔 어때?' });
 if (m.type === 'tip') addTalk(m.who, { text: `${ST[m.stock].name}, ${tipLine(m.dir)}.`, tip: true }), talkReply(m.who, 'tip');   /* 귀띔 창과 같은 말(보이는 날 기준) · 뒤에 내 짧은 답 */
 if (m.type === 'talk') addTalk(m.who, { sys: true, text: m.text });
}
const unreadOf = id => (g.s.uiTalk?.[id] || []).filter(x => !x.me && !x.sys && !x.read).length;
function peopleNext(p) { const who = p.who, st = g.s.story.stage[who] || 0; if (CANDIDATES.includes(who)) return nextStage(who, st); const nx = [30, 60, 85].find(x => p.rel < x); return nx ? '관계 ' + nx : '—'; }
function drawPeople(P) { PANES.people?.draw(P); }   /* 인맥 탭 화면은 s_people.js(D-052 · TODAY · CONTACTS · NETWORK · 사람 한 명) */
/* ── 비서 탭 — 유나와 휴대폰 대화(11-20 대표님 'E 넷 다 넣어' · 목업 09_목업/비서탭_1120 E1 ~ E4)
   장중 · 주말 = 대화 안 뉴스 카드 · 빠른 답 · 장 마감 뒤 = 대화 안 결산 카드 · 대화 안에서 저녁 고름(왼쪽 칸 · 아래 관계 넷은 D-045 로 2단 '한유나' · '오늘 결산'으로 옮김)
   저녁을 같이 한 뒤 = E4(귀띔 알림이 창 대신 대화로 옴 · 내일 TIP · TRUST) — 화면만 바꾸고 규칙은 sim.js 그대로 */
const Y_FACE = { open: 'base', weekend: 'base', evening: 'wink', night: 'proud' };
const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const nowHM = s => s.phase === 'open' ? hm(g.openMin() + s.minute) : s.phase === 'evening' ? hm(g.closeMin() + 2) : '';   /* 그날 개장 · 마감 시각(시대 규칙 · 새해 · 수능)대로 */
const dayChg = id => g.price(id) / g.s.open[id] - 1, pct1 = x => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`, sg2 = x => x >= 0 ? 'up' : 'dn';
const chatSeen = s => s.uiSecSeen?.day === s.day && s.uiSecSeen.mode === secMode(s) ? s.uiSecSeen.n : 0;   /* 대화에서 읽은 유나 말 수(그날 · 그때) */
/* 비서 탭 깊이(11-20 대표님 '이대로 넣어' · '셋으로 줄여' · D-045 · 목업 09_목업/비서깊이_1120 B1 ~ B6)
   첫 화면 = 유나 + 휴대폰 대화만(왼쪽 칸 · 아래 사다리 없음) · 휴대폰 머리 › = 2단 한유나 · 대화 안 결산 카드 › = 2단 오늘 결산 · REPORT › = 2단 올해 · 다른 저녁 › = 3단 작은 창 */
let ysSheet = null;
const yRate = s => { const y = s.yunaTip, k = y ? y.n - y.pend.length : 0; return k ? { hit: y.hit, k, p: Math.round(y.hit / k * 100) } : null; };
const md = d => `${+DAYS[d].slice(5, 7)}월 ${+DAYS[d].slice(8, 10)}일`;
/* 비서 태블릿(11-22 대표님 비서 안 3 · 목업 09_목업/비서탐색_1122 E3) — 화면 절반 안 세로 태블릿 · CHAT 만 폰 크기 · 유나는 왼쪽 빈 곳 가운데 */
let secView = 'chat', secMode0 = null, secYear = null;   /* HOME 없앰 · 처음 판 CHAT(11-23 대표님 목업 ㉮) · secYear = ANNUAL 에서 연 해 */
/* 비서 태블릿 겉 — 배경 · 유나(가까이 / 전신) · 세로 띠 · 본문 칸 · CHAT 도 같은 태블릿(11-22 대표님 'CHAT 도 기본 태블릿 크기 유지') */
let yunaView = (() => { try { return localStorage.getItem('ydo_yuna_view') === 'full' ? 'full' : 'close'; } catch { return 'close'; } })();
/* ── 달 정산 — 첫 장은 이번 달 합계 · 백 여사 몫만 → DETAIL 은 0 이 아닌 줄만 → REPAY 는 금액 칩 작은 창(11-20 대표님 '쉽고 단계별로') ── */
let monthView = 'sum', repayAmt = 1e7;
function drawMonth(m) {
 const s = g.s, b = s.baek, locked = DAYS[s.day] < N.baek_repay_from, can = !locked && b.state === 'owe' && b.principal > 0 && s.cash > 0;
 const ins = [['예금 이자', m.dep], ['배당', m.div], ['월세 · 급여', (m.rent || 0) + (m.director || 0)], ['펀드', s.firm ? m.fund : 0]].filter(x => x[1]);
 const outs = [['집 · 차 · 생활', m.living], ['세금', m.tax], ['은행 대출 이자', m.interest], ['공매도 · 임금', (m.shortFee || 0) + (m.wages || 0)], ['백 여사 이자', m.baekInterest]].filter(x => x[1]);
 for (const r of [m.extra, ...MONTH_ROWS.map(f => f(m))]) if (r) { ins.push(...(r.in || []).filter(x => x[1])); outs.push(...(r.out || []).filter(x => x[1])); }   /* 장치 달 정산 줄 */
 const tin = ins.reduce((n, x) => n + x[1], 0), tout = outs.reduce((n, x) => n + x[1], 0), net = tin - tout, mon = +DAYS[Math.max(0, s.day - 1)].slice(5, 7);
 const row = (x, sg) => `<div class="mr-row"><span>${x[0]}</span><b class="${sg > 0 ? 'up' : 'dn'}">${sg > 0 ? '+' : '−'}${M(Math.abs(x[1]))}</b></div>`;
 let body = '';
 if (monthView === 'detail') body = `<div class="mr-cols"><div><small>수입</small>${ins.length ? ins.map(x => row(x, 1)).join('') : '<div class="mr-row"><span>—</span></div>'}</div><div><small>지출</small>${outs.map(x => row(x, -1)).join('')}</div></div>`;
 else if (monthView === 'repay') { const all = Math.min(b.principal, s.cash), a0 = repayAmt === 'all' ? all : Math.min(repayAmt, all);
  body = `<div class="mr-repay"><h2>상환</h2><div class="fa-chips">${[1e7, 3e7, 5e7, 'all'].map(v => `<button class="${repayAmt === v ? 'on' : ''}" data-ra="${v}">${v === 'all' ? '전체' : M(v)}</button>`).join('')}</div><div class="fa-chg"><span>남은 원금</span><b>${M(b.principal)} → ${M(Math.max(0, b.principal - a0))}</b></div><div class="fa-chg"><span>현금</span><b>${M(s.cash)} → ${M(s.cash - a0)}</b></div></div>`; }
 else body = `<div class="mr-big ${net >= 0 ? 'up' : 'dn'}">${net >= 0 ? '+' : '−'}${M(Math.abs(net))}</div><div class="mr-chips"><span>수입 <b class="up">+${M(tin)}</b></span><span>지출 <b class="dn">−${M(tout)}</b></span></div>
  <div class="bn-kv"><span>백 여사 이자</span><b class="dn">${b.state === 'frozen' ? '채권 동결' : !b.principal ? '다 갚음' : '−' + M(m.baekInterest || 0)}</b>${!locked && b.principal ? `<button id="mr-repay" ${can ? '' : 'disabled'}>상환</button>` : ''}</div>`;
 const foot = monthView === 'repay' ? `<button id="mr-back">뒤로</button><button class="primary" id="mr-pay" ${can ? '' : 'disabled'}>확인</button>`
  : `<button id="mr-detail">${monthView === 'detail' ? '요약' : '자세히'}</button><button id="month-next" class="primary">다음 달 ▶</button>`;
 const say = monthView !== 'sum' ? '' : net >= 0 ? '이번 달은 남았어요. 잘하셨어요.' : b.principal && locked ? `이자는 매달 나가요. 갚는 건 ${N.baek_repay_from.slice(0, 4)}년부터예요.` : '이번 달은 나간 게 더 많아요.';   /* 큰 소식 창 꼴(D-047) — 설명 대신 유나 한 마디 */
 $('#over').innerHTML = `<div class="bn-wrap mr2" data-k="month-${s.day}">${yunaClip(net >= 0 ? 'base' : 'worry')}<div class="bn msg"><div class="bn-tag">${monthView === 'repay' ? '상환 · 백 여사' : `월간 리포트 · ${mon}월`}</div><div class="bn-bd"><div class="mr-body">${body}</div>${yunaSay(say)}<footer class="bn-mb">${foot}</footer></div></div></div>`;
 const redo = v => swapView(() => { monthView = v; drawMonth(m); });
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
 $('#over').innerHTML = `<div class="story-screen ending-screen"><div class="story-bg" style="background-image:url('${sceneArt('in_han_river')}')"></div>${companion ? `<img class="ending-person" src="${fullArt(companion.who)}" alt="${esc(companion.name)}">` : ''}<section class="story-panel ending-panel"><small>${esc(g.date())} · 마지막 장</small><h1>${esc(e.name)}</h1><p>순위 ${e.rank}위 · 순자산 ${M(e.nw)}</p><div class="story-panel"><small>마지막 길</small><p>${path}</p></div><div class="story-panel"><small>백 여사 빚 · 남은 원금 ${M(b.principal)}</small><p>${debt}</p></div><div class="story-panel"><small>곁에 있는 사람</small><p>${companion ? esc(companion.name) + ' · ' + STAGES[g.s.story.stage[companion.who]] : '혼자'}</p></div><details><summary>플레이 기록</summary><div class="ending-history">${g.s.story.history.map(h=>`<p>${esc(h.date)} · ${esc(plainTitle(T.story.scenes.find(x=>x.id===h.id)?.title))}</p>`).join('')}</div></details><footer><button id="again" class="primary">새 게임 ▶</button></footer></section></div>`;
 $('#again').onclick = () => swapView(() => { title = true; drawTitle(); drawNew(); });
}


/* ── 전환(11-20 대표님 '화면이 바뀔 때 · 새 내용이 뜰 때 · 시간이 흐를 때 자연스럽게 — 게임이니 그런 디테일이 매우 중요') ──
   ① 겹침 칸(#over): 새 창 · 장면은 서서히 나타나고, 닫히거나 다른 것으로 바뀌면 옛 것이 서서히 사라짐 — 같은 것(같은 장면의 다음 줄 등)은 다시 움직이지 않음
   ② 탭: 바뀔 때만 판이 살짝 밀려 들어옴  ③ 시간: 장 마감 · 다음 날 아침 · 토요일 · 일요일 · 새 달에 가운데 띠 카드(누르면 넘어감) */
const overKey = el => { const c = el && el.firstElementChild; return c ? (c.dataset.k || c.className) : ''; };
let overLast = '', overKids = [], overHold = null;
/* 놀이 흐름이 창을 바꿀 때(창 → 창 · 창 → 없음 · 없음 → 창 · 장면 → 장면)도 전환 층 하나로(11-23 피드백 25): 바뀐 그 순간(그리기 전 작은 일)에 옛 창을 한 장면 되돌려 두고
   브라우저 전환이 옛 그림을 뜬 뒤 새 창을 다시 넣음 — 새 창의 단추 · 글은 그린 코드가 묶은 그대로 · 기다리는 동안(한 장면) 또 바뀌면 마지막 것으로 · 되돌린 옛 창은 움직임 없이(sw-hold)
   전환을 못 하면(옛 브라우저 · 움직임 줄이기) 앞 꼴(옛 창 사본이 위에서 흐려짐 · ghost) */
const overObs = new MutationObserver(recs => {
 const O = $('#over'), kids = () => [...O.childNodes];
 const back = () => { O.classList.add('sw-hold'); O.inert = true; O.replaceChildren(...overHold.old); overObs.takeRecords(); };
 if (overHold) { overHold.now = kids(); back(); return; }
 const key = overKey(O);
 if (key === overLast) { overKids = kids(); return; }
 const gone = recs.flatMap(r => [...r.removedNodes]).filter(n => n.nodeType === 1);
 const c = O.firstElementChild; if (swapNow) { if (c) { c.classList.remove('ov-in', 'ov-swap'); c.classList.add('sw-still'); } overLast = key; overKids = kids(); return; }   /* 전환 층 안 — 전환 층이 겹쳐 흐림 */
 if (document.startViewTransition && calMotion()) {
  overHold = { old: overKids, now: kids() }; back();
  swapView(() => { const h = overHold; overHold = null; O.replaceChildren(...h.now); O.classList.remove('sw-hold'); O.inert = false; setTimeout(tut, 0); });   /* 기다리는 동안 안내가 옛 창을 보고 숨었을 수 있어 다시 봄 */
  return; }
 if (overLast && gone.length) ghost(gone);
 const swap = !!(overLast && gone.length && c); if (c) { c.classList.remove('ov-in', 'ov-swap'); void c.offsetWidth; c.classList.add(swap ? 'ov-swap' : 'ov-in'); }   /* 창 → 창은 새 창이 처음부터 진함(옛 것만 위에서 사라짐 — 둘이 엇갈리면 한 번 밝아짐) */
 overLast = key; overKids = kids();
});
overObs.observe(document.getElementById('over'), { childList: true });
new MutationObserver(() => veilOverSync()).observe(document.getElementById('over'), { childList: true, attributes: true, attributeFilter: ['class'] });   /* 창이 바뀌거나 시간 카드 뒤에 기다릴 때(.wait) 어둠을 다시 청함 */
{ let qd = false; new MutationObserver(() => { if (qd) return; qd = true; queueMicrotask(() => { qd = false; veilSheetSync(); }); }).observe(document.getElementById('stage'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); }   /* 작은 창이 열리고 닫힐 때(판 다시 그림 · 서서히 닫힘) */
/* ── 전환 층 하나(11-23 피드백 25 · 대표님 '깜빡임을 하나씩 잡는 것 말고 방법이 없나' → '둘 다 해') ──
   원인(확정 · 전환시험 밝기 재기 22 갈래 중 11 갈림): 큰 화면(타이틀 · 새 판 · 게임) · 탭 · 판 안 칸이 바뀔 때 옛 것은 바로 사라지거나(사본 ghost 는 첫 화면에 그림이 안 그려짐) 위 띠 어둠을 잃고,
   새 것은 투명에서 나타나(ovfade · panein · swap-in) — 둘 사이 한 순간 어두워졌다 밝아짐. 꼴마다 따로 어둡게 · 흐리게 하던 것이 저마다 어긋난 것.
   이제 사람이 화면을 바꾸는 길은 swapView(바꿈) 하나: 브라우저가 옛 화면을 실제 그림으로 떠 두고(View Transitions) 새 화면은 들어오는 움직임 없이 바로 다 그린 뒤
   둘을 겹쳐 흐림(더해 섞기 — 화소마다 옛 → 새로 한 방향) · 브라우저가 못 하면(옛 사파리) · 움직임 줄이기면 바로 바뀜.
   그사이 겹침 칸 창 · 어두운 층이 바뀌어도 사본 · 늦춤 없이 바로(전환 층이 함께 흐림) · 판 안 '서서히 나타남'도 안 돎(paneStill).
   겹침 칸(#over)의 창 · 장면은 놀이 흐름이 바꾸므로 아래 ghost · veil 이 맡음(전환시험 어둠 갈래). fx 는 31 탭 전환 효과 자리(html[data-fx] · 기본 겹쳐 흐림). */
let swapNow = false;
function swapView(fn, fx = 'fade') {
 if (swapNow || !document.startViewTransition || !calMotion()) return fn();   /* 전환 안에서 또 부르면 그 바꿈에 얹힘 */
 const d = document.documentElement, P = fx !== 'fade' ? $('#pane') : null; let vt;   /* 판 효과(31)는 판만 따로 떠서 움직임 · 위 띠 · 아래 탭은 겹쳐 흐림 */
 const run = () => { swapNow = true; try { fn(); } finally { setTimeout(() => { swapNow = false; }, 0); } };   /* 창 · 판 지킴이(MutationObserver · 작은 일)가 다 돈 뒤 풂 */
 if (P) { P.style.viewTransitionName = 'pane'; dotMasks(); }
 try { d.dataset.fx = fx; vt = document.startViewTransition(run); } catch { delete d.dataset.fx; if (P) P.style.viewTransitionName = ''; return run(); }
 vt.finished.catch(() => {}).finally(() => { if (d.dataset.fx === fx) delete d.dataset.fx; if (P) P.style.viewTransitionName = ''; });
 vt.ready.catch(() => {});   /* 다음 전환이 앞 것을 건너뛰거나(빨리 누름) 창이 숨으면 움직임만 빠지고 바꿈은 그대로 — 오류 아님 */
 vt.updateCallbackDone.catch(e => console.error(e));
 return vt;
}
/* 탭 전환 효과(31 · 대표님 고르기 전 시연 — 09_목업/탭전환_1123) — fade 겹쳐 흐림(기본) · slide 탭 차례 방향으로 옆으로 밀기 · rise 아래에서 살짝 떠오름 · dots 도트 흩어짐 ·
   주소 끝 ?tabfx=<이름> 이면 그 효과로(시연 · 대표님 해 보기) · 꾸밈은 style.css 전환 층 절 */
const TAB_FX = (location.search.match(/[?&]tabfx=(\w+)/) || [])[1] || 'fade';   /* 11-23 대표님 '겹쳐 흐림으로 해' — 기본 fade 확정 · 나머지는 시연용 */
const tabFx = (to, fx = TAB_FX) => { if (fx !== 'slide') return fx; const L = visTop().map(t => t.head), a = L.indexOf(grpOf(tab)), b = L.indexOf(grpOf(to)); return b < a ? 'slide-r' : 'slide-l'; };   /* 오른쪽 탭으로 가면 판이 왼쪽으로 밀려남 */
const tabSwap = (to, fx) => swapView(() => tabTo(to), tabFx(to, fx));
/* 도트 흩어짐 가리개 — 24px 칸 8 × 8 을 섞은 차례로 16 걸음에 걸쳐 지움(픽셀 게임 느낌 · 한 번만 만들어 꾸밈 @keyframes 로 붙임) */
function dotMasks() { if (dotMasks.done) return; dotMasks.done = true; const N = 8, B = 24, ord = [...Array(N * N).keys()];
 for (let i = ord.length - 1; i > 0; i--) { const j = (i * 7919 + 13) % (i + 1); [ord[i], ord[j]] = [ord[j], ord[i]]; }   /* 늘 같은 섞음(시험이 같은 그림을 봄) */
 const frames = [];
 for (let k = 0; k <= 16; k++) { const c = document.createElement('canvas'); c.width = c.height = N * B; const x = c.getContext('2d'); x.fillStyle = '#000';
  ord.forEach((v, i) => { if (v >= k * 4) x.fillRect((i % N) * B, Math.floor(i / N) * B, B, B); }); frames.push(c.toDataURL()); }
 const st = document.createElement('style'); st.textContent = `@keyframes vtdots{${frames.map((u, k) => `${(k / 16 * 100).toFixed(2)}%{-webkit-mask-image:url(${u});mask-image:url(${u})}`).join('')}}`; document.head.appendChild(st); }
/* 어두운 층 하나(11-23 깜빡임 근본 · 대표님 '반복되는 문제는 원인을 제대로 잡아서') — 원인(확정 · 어둠 재기): 창(.modal 큰 그림자 · .bn-wrap::before) · 안내 덮개(#tut .cdim) · 작은 창(.fa-dim · .lf-sheet · .pp3-dim)이
   저마다 어둠을 깔아, 창 → 안내에서 어둠이 0.9 → 0.5(안내 덮개 바로) → 0.72(창 사본이 다시 진해짐) → 0.5(0.32초에 끊김)로 갈렸음 · 11-23 veilOn 은 작은 창 → 다음 것만 덮었음.
   이제 어둠은 #stage 의 .veil 하나가 맡고, 창 · 안내 · 작은 창은 진하기(a) · 높이(z) · 밝힐 구멍(hole)만 청함(veilReq) · 층은 남아 진하기만 넘어가고 · 다 내려가도 VEIL_GRACE 만큼 기다렸다 걷힘(다음 것이 곧 오면 갈림 없음).
   구멍은 0 크기 상자 + 넓은 그림자(그림자 밖이 어둠 · 상자 안이 밝음) — 안내가 짚는 칸 · 큰 소식 창의 위 띠 */
const VEIL = { reqs: {}, cur: null, t: 0, bt: 0, bridge: 0, bridgeSpec: null }, VEIL_GRACE = 150, VEIL_RGB = '5,7,20';
const VEIL_SHEETS = [['#pane .fa-dim', 0.72], ['#pane .lf-sheet', 0.6], ['#pane .pp3-dim', 0.72]];
function veilEl() { const st = $('#stage'); if (!st) return null; let v = st.querySelector(':scope > .veil'); if (!v) { v = document.createElement('div'); v.className = 'veil'; st.appendChild(v); } return v; }
function veilReq(name, spec) { const was = VEIL.reqs[name]; if (!spec && !was) return; if (spec && was && spec.a === was.a && spec.z === was.z && JSON.stringify(spec.hole) === JSON.stringify(was.hole)) return; if (spec) VEIL.reqs[name] = { ...spec, name }; else delete VEIL.reqs[name]; veilApply(); }
function veilTop() { const L = Object.values(VEIL.reqs); if (VEIL.bridgeSpec && VEIL.bridge > performance.now()) L.push(VEIL.bridgeSpec); return L.sort((x, y) => y.z - x.z)[0] || null; }
function veilApply() { const v = veilEl(); if (!v) return; clearTimeout(VEIL.t); const top = veilTop();
 if (top) return veilSet(v, top);
 if (VEIL.cur) { if (swapNow) return veilSet(v, null); VEIL.t = setTimeout(() => { if (!veilTop()) veilSet(v, null); }, VEIL_GRACE); } }   /* 전환 층 안은 기다림 없이 */
function veilSet(v, sp) { const was = VEIL.cur, motion = calMotion(); VEIL.cur = sp;
 v.classList.toggle('geo', !!(motion && sp?.hole && was?.hole && sp.name === was.name)); v.classList.toggle('still', !motion || swapNow);   /* 같은 것(안내 걸음 → 걸음)의 구멍 → 구멍만 자리를 옮겨 감 · 다른 것끼리는 바로(옮겨 가는 구멍이 사이 칸을 한 순간 밝히던 것 — 전환 시험 0.9 → 0 → 0.5) */
 if (sp) v.style.zIndex = sp.z;
 const h = sp ? sp.hole || { x: 960, y: 540, w: 0, h: 0 } : was?.hole || { x: 960, y: 540, w: 0, h: 0 };   /* 걷힐 땐 구멍 그대로 */
 v.style.left = h.x + 'px'; v.style.top = h.y + 'px'; v.style.width = h.w + 'px'; v.style.height = h.h + 'px';
 v.style.boxShadow = `0 0 0 3000px rgba(${VEIL_RGB},${sp ? sp.a : 0})`; }
/* 작은 창이 닫힐 때(fadeClose) 그 어둠을 다음 것이 뜰 때까지 잡아 둠 · veilOff(ms) 는 잡아 둔 것을 ms 뒤에 놓음 */
function veilOn() { VEIL.bridgeSpec = VEIL.cur || { a: 0.62, z: 19 }; VEIL.bridge = performance.now() + 180 + VEIL_GRACE; veilApply(); clearTimeout(VEIL.bt); VEIL.bt = setTimeout(veilApply, 180 + VEIL_GRACE + 5); }
function veilOff(after = 0) { VEIL.bridge = Math.min(VEIL.bridge, performance.now() + after); clearTimeout(VEIL.bt); VEIL.bt = setTimeout(veilApply, after + 5); }
/* 겹침 칸(#over)의 창 — 창 꼴마다 진하기 · 시간 카드 뒤에 기다리는 동안(.wait)은 청하지 않음 · 위 띠 아래를 가득 채운 주말 지도(.modal.map)는 어둠 없음(11-23) */
function veilOverSync() { const O = $('#over'), c = O?.firstElementChild;
 veilReq('over', !c || O.classList.contains('wait') ? null : c.matches('.bn-wrap') ? { a: 0.9, z: 39, hole: { x: 0, y: 0, w: 1920, h: 86 } } : c.matches('.call-wrap') ? { a: 0.78, z: 39 } : c.matches('.skp-wrap.solo') ? { a: 0.72, z: 39 } : c.matches('.skp-wrap') ? { a: 0.35, z: 39 } : c.matches('.modal.map') ? null : c.matches('.modal') ? { a: 0.6, z: 39 } : null); }
/* 판 안 작은 창 — 서서히 닫히는 중(.fade-out)은 빼고 · 판이 바뀔 때마다(MutationObserver) 봄 */
function veilSheetSync() { let sp = null; for (const [sel, a] of VEIL_SHEETS) { const e = $$(sel).find(x => !x.closest('.fade-out')); if (e) { sp = { a, z: 19 }; break; } } veilReq('sheet', sp); }
function ghost(nodes) {   /* 사라지는 옛 창을 잠깐 위에 겹쳐 두고 흐리게 */
 const g0 = document.createElement('div'); g0.className = 'ghost'; nodes.forEach(n => { n.classList?.remove('ov-in', 'ov-swap', 'fade-out'); n.classList?.add('sw-still'); g0.appendChild(n); });   /* 사본(cloneNode)이 아닌 떨어져 나간 그 노드 — 사본은 그림을 다시 풀어 첫 화면에 비어 보였음 · 들어오는 움직임은 다시 안 돎 */   /* 사본이 '서서히 나타남'을 다시 돌면 사라지는 동안 도로 진해짐(어둠 재기 0 → 0.33 → 끊김) */
 $('#stage').appendChild(g0); setTimeout(() => g0.remove(), 320);
}
let paneTab = '';
/* 효과음 — 「상한가」 ui/sound.js 의 같은 두 소리(장소에 들어감 · 일력 넘김 · 소리 파일과 크기 그대로) · 못 틀면 조용히 넘어감 */
const SND = 'res/소리/', SFX = { door: ['sfx_door.wav', 0.45], page: ['sfx_page.wav', 0.8] }, sfxCache = {}, SFX_HOOK = [];   /* 효과음 고리 — 화면 장치가 SFX_HOOK.push(name => …)(예: s_bgm 이 bgm 을 잠깐 낮춤) */
function sfx(name) { const d = SFX[name]; if (!d) return; for (const f of SFX_HOOK) try { f(name); } catch { /* 장치 탓으로 소리가 멈추지 않음 */ } try { const a = (sfxCache[name] ||= new Audio(SND + d[0])).cloneNode(); a.volume = d[1]; a.play().catch(() => {}); } catch { /* 소리를 못 틀어도 게임은 그대로 */ } }
const calMotion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('calm');   /* 기기의 움직임 줄이기 · 설정 창 MOTION OFF(html.calm · s_feel.js) 둘 다 따름 */
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
 $('#stage').querySelectorAll('.calfx,.tcard').forEach(x => x.remove()); $('#stage').appendChild(el); veilOff(60);
 const cur = el.querySelector('.cur'), old = el.querySelector('.old'), t0 = performance.now(), early = () => performance.now() - t0 < (calMotion() ? 650 : 300); let tm = 0, fin = false;   /* 뜬 직후의 누름 · 눌러 둔 키(반복)는 안 받음 — 장면을 넘기던 Space · 클릭이 바로 걷어 '카드 없이 바뀜'(검토 11-22 · 추정) */
 const end = () => { if (fin) return; fin = true; clearTimeout(tm); removeEventListener('keydown', key, true); cur.innerHTML = page(d1); old.remove(); el.classList.add('out'); setTimeout(() => el.remove(), 480); done(); };   /* 걷힘 = 0.26초 기다림 + 0.2초(style.css .calfx.out) */
 const key = e => { e.stopImmediatePropagation(); e.preventDefault(); if (e.repeat || early()) return; end(); };   /* 일력이 떠 있는 동안 키는 아래 화면에 닿지 않음 */
 const tear = () => { if (fin) return; old.innerHTML = cur.innerHTML; cur.innerHTML = page(d1); old.classList.add('tear'); sfx('page'); tm = setTimeout(end, calMotion() ? 1300 : 600); };
 el.addEventListener('pointerdown', e => { e.stopPropagation(); if (!early()) end(); }); addEventListener('keydown', key, true);
 tm = setTimeout(tear, calMotion() ? 500 : 150);
}
(new Image()).src = art('화면/cal_pad.png');   /* 처음 넘길 때 일력이 늦게 뜨지 않게 미리 받음 */
/* 시간 카드 — 판 상태가 바뀐 것을 화면이 보고 띄움(규칙은 건드리지 않음) */
let clock = null;
function timeCard() {
 if (title || !g || g.s.msgs[0]?.type === 'senior') return; const s = g.s, now = { day: s.day, phase: s.phase, slot: s.slot, month: DAYS[s.day].slice(0, 7) };
 const was = clock; clock = now; if (!was) return;
 const dateOf = x => x.phase === 'weekend' ? wkISO(x.slot, x.day) : DAYS[x.day];   /* 일력 날짜 — 주말은 그 토 · 일(위 띠 · 저장 칸과 같은 셈) */
 const d = DAYS[s.day], md = `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일`, wk = ['일', '월', '화', '수', '목', '금', '토'][dow(s.day)];
 let big = '', small = '', tone = '';
 if (was.phase === 'open' && now.phase === 'evening') { const today = g.netWorth() - s.dayStart; big = `${hm(g.closeMin(was.day))} · 닫기`; small = `오늘 ${today >= 0 ? '+' : '−'}${M(Math.abs(today))}`; tone = today >= 0 ? 'up' : 'down'; }
 else if (now.phase === 'weekend' && (was.phase !== 'weekend' || was.slot !== now.slot)) { big = now.slot ? '일요일' : '토요일'; small = '장이 쉬는 날'; tone = 'wk'; }
 else if (now.day !== was.day && now.phase === 'open' && (now.month !== was.month || was.phase !== 'open' || g.era(now.day).from === DAYS[now.day])) {   /* 평일 → 평일은 날짜 칸만(D-050 · 하루가 5초) · 새 달 · 주말 뒤 · 저녁 뒤에만 일력 */ big = `${md} ${wk}요일`; const er = g.era(s.day), wasEr = g.era(was.day), op = hm(g.openMin(s.day) - 10); small = er.random && !wasEr.random ? `무작위 시대 · ${er.name}` : now.month !== was.month ? (d.slice(5, 7) === '01' ? `${d.slice(0, 4)} 새해 · ${er.name}` : `${+d.slice(5, 7)}월 시작 · ${er.name || ''}`) : er.from === d ? `새 시대 · ${er.name}` : `${op} · 장 열기 전`; tone = 'am'; }   /* 새 해 · 새 달 · 시대가 바뀌는 날(실제 → 무작위 넘어감 포함)은 일력 카드에 그 이름 */
 if (!big) return;
 if (tone !== 'up' && tone !== 'down') { const O = $('#over'); O.classList.add('wait'); calCard(dateOf(was), dateOf(now), small, tone, () => { O.classList.remove('wait'); tut(); }); tut(); return; }   /* 날이 바뀌는 마디 = 일력 넘김 · 장 마감은 아래 띠 카드 그대로 */
 const fx = $('#stage'), el = document.createElement('div'); el.className = 'tcard ' + tone; el.innerHTML = `<div><b>${esc(big)}</b><small class="${tone === 'up' ? 'up' : tone === 'down' ? 'down' : ''}">${esc(small)}</small></div>`;
 const O = $('#over'), done = () => { el.remove(); O.classList.remove('wait'); clearTimeout(t1); clearTimeout(t2); tut(); };   /* 카드가 먼저 · 창은 카드가 걷힐 때 */
 O.classList.add('wait'); el.onclick = done; fx.querySelectorAll('.tcard').forEach(x => x.remove()); fx.appendChild(el); tut();
 const t1 = setTimeout(() => O.classList.remove('wait'), 1150), t2 = setTimeout(done, 1500);
}
/* 첫 화면 그리기는 boot.js(마지막에 읽힘) — 그 사이에 화면 장치(screen_mods.js)가 등록함 */

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
