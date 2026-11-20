/* =====================================================================
   ui/devtest.js — 시험 손(개발용) · 게임 중엔 안 돎
   - ?shot=… 사진 모드(runShot · autoPlay · workHand) · ?selftest=판수 누르기 시험 · ?clicktest · ?dragtest · ?savetest · &mockn · &mockfloat 화면 예시
   - 11-14 밤 정리(E3): main.js 에서 떼어 냄 — 게임 코드와 시험 손을 나눔. 이 파일을 빼도 게임은 돎(시작 갈래 boot 가 부를 때만 씀)
   - main.js 보다 먼저 실음: boot 의 자료 읽기가 곧바로 끝나 다음 스크립트보다 먼저 runShot/selfTest 를 부르기 때문
   ===================================================================== */

// 화면 예시용(11-14 대표님 '선택지 1 ~ 5개를 가정해 목업 · 눌렀을 때 스탯이 바뀌는 장면도'): &mockn=N 이면 지금 화면의 선택지를 N개로 맞춤 · &mockfloat=1 이면 고른 직후(바뀐 값이 뜬 순간)를 세워 둠 — 글은 가짜
if (/mockn|mockfloat/.test(location.search)) addEventListener('load', () => {   // statFloat 은 main.js 에 있음 — 이 파일이 먼저 실리므로 다 실린 뒤(load)에 붙임
  statFloat.mock = function () {
    const q = new URLSearchParams(location.search), n = +q.get('mockn'), ch = document.getElementById('ch'), sc = document.getElementById('screen'); if (!sc || !ch) return;
    const CARD = ['“감사합니다. 다음엔 제 표부터 보여 드리겠습니다.”', '“선배님은요? 서류만 보시다 밥 놓치시겠어요.”', '표를 받아 두고 말없이 밥을 다 먹는다', '“이 숫자는 어디서 구하셨습니까?”', '식판을 들고 옆자리로 옮겨 앉는다'];
    if (n) { while (ch.children.length > n) ch.lastElementChild.remove(); while (ch.children.length < n) ch.appendChild(ch.lastElementChild.cloneNode(true));
      [...ch.children].forEach((d, k) => { const b = d.querySelector('b'), sp = d.querySelector('span'); if (b) b.textContent = k + 1; if (sp && !sc.classList.contains('k-inside')) sp.textContent = CARD[k]; }); ch.classList.add('show'); }
    if (q.get('mockfloat')) { if (ch) { ch.innerHTML = '<div class="hot"><b>▶</b>계속</div>'; ch.classList.add('show'); const tx = document.getElementById('tx'); if (tx) tx.textContent = '표부터요. 그럼 내일 아침 여덟 시까지 가져와요.'; }
      statFloat.force = true; statFloat({ s: { analysis: 46, stress: 35, hp: 65, money: 327000 }, r: { analyst: 9 } }, { s: { analysis: 48, stress: 33, hp: 57, money: 322000 }, r: { analyst: 12 } }, 'mock', statFloat.workLine({ name: SH.statKo('analysis'), ok: false, prog: 1 }), false); }   /* 제목 줄도 세움 — 제목 줄이 값 줄과 겹치던 것을 사진이 못 봤음(11-15) */
  };
  setTimeout(() => statFloat.mock(), 1500); setTimeout(() => { if (!document.querySelector('.statfloat.mock')) statFloat.mock(); }, 5000); });   // 좁은 판은 화면을 한 번 다시 그려서 두 번 맞춤

/* 보여 주기용(11-15 대표님 '표정 그림 부드럽게 넘어가는 거 나한테도 보여주고'): ?shot=event&swdemo=1 이면 그 장면 인물의 표정 그림을 1.8초마다 차례로 바꿈 — 게임 중엔 안 돎 */
if (/swdemo/.test(location.search)) addEventListener('load', () => setTimeout(() => {
  const el = document.getElementById('shotstill'); if (el) el.remove(); G.instant = false;
  const im = () => document.querySelector('#screen img.ill:not(.sw-old)'), m = im() && /ill_([a-z_]+?)_[a-z]+\.\w+$/.exec(im().src); if (!m) return;
  const ex = [...SH.ART].filter(k => k.indexOf(`ill_${m[1]}_`) === 0).map(k => k.slice(m[1].length + 5)); let i = 0;
  setInterval(() => { i = (i + 1) % ex.length; setArt(im(), m[1], ex[i]); }, 1800); }, 2500));
/* 임시(11-16 대표님 '일러스트가 바뀔 때 부드럽게 넘어가는 게 빠진 것 같다 · 여기에만 임시로 적용해봐' — 바로 보기 주소 ?shot=event&ev=<보기 바꾸기 시험 장면>):
   사진용 주소는 움직임을 꺼 두는데(#shotstill · G.instant), 장면을 따로 짚은 바로 보기에선 그 장면이 선 뒤 움직임을 되살림 — 시험 사진(주소에 ev 없음)은 그대로 · 보기 바꾸기 시험을 걷을 때 같이 걷음 */
if (/[?&]shot=event/.test(location.search) && /[?&]ev=/.test(location.search)) addEventListener('load', () => { let n = 0; const t = setInterval(() => {
  if (++n > 40) return clearInterval(t); if (!D.P || !D.view.on(D.P.id) || !D.view.main()) return;
  clearInterval(t); const el = document.getElementById('shotstill'); if (el) el.remove(); G.instant = false; }, 500); });

/* ── 사진용 자동 진행 ── 정해진 손(가장 앞의 고를 수 있는 것 · 장면별 조금 다르게) */
function autoPlay(st, until, hand) {
  for (let n = 0; n < 6000; n++) {
    const P = SH.next(st);
    if (until(P, st) || P.t === 'end') return P;
    let a = {};
    if (P.t === 'event') { const ok = P.choices.filter(c => c.ok); const pick = hand.event ? hand.event(P, ok) : null; a = { choice: pick != null ? pick : (ok[0] || {}).i }; }
    else if (P.t === 'slot') { const pick = hand.slot ? hand.slot(P, st) : null; a = { opt: pick != null ? pick : P.options.findIndex(o => o.ok !== false) }; }
    else if (P.t === 'lmap') { a = G.LOOP.autoPick(st); if (a.end && hand.market && !P.closed) hand.market(P, st); }   // 사원 뒤 한 주: 하나를 하고 → 장을 보고 주를 마침
    SH.answer(st, a); SH.takeToasts(st);
  }
  return SH.next(st);
}
const workHand = {   /* 인턴 손은 규칙의 SH.INTERN_HAND 하나(사원부터 시작과 같은 손 — 11-18 구조 검토 지적 6) · 장 보기만 시험 손 몫 */
  slot: (P, st) => SH.INTERN_HAND.slot(P, st),
  event: (P, ok) => SH.INTERN_HAND.event(P, ok),
  market: (P, st) => { const L = st.L; SH.loopOpen(st); Object.keys(L.pos).forEach(i => { if ((L.px[i] / L.cost[i] - 1) > 0.12 || !L.src[i]) SH.loopSell(st, +i, 1); });
    L.mon.heard.map(e => L.known.find(k => k.eid === e)).filter(k => k && k.says !== false && k.kind !== 'inside').slice(0, 2).forEach(k => SH.loopBuy(st, k.id, SH.loopRoom(st, false) * 0.5, false)); }
};
/* 177(11-16 대표님 '테스트를 빨리 하기 위한 간단한 장치 · 과하게 개발할 필요는 없고' → 질문 카드 '이번 주 건너뛰기 · 시점으로 바로 가기'):
   주소 끝에 lab=1 을 붙였을 때만 왼쪽 아래에 작은 단추가 뜸(보통 주소엔 없음) · 글은 자료(대사/화면_글.json LAB) · 꾸밈 game.css '#labbtn'
   건너뛰기 = 이번 주(달)를 사진용 손(workHand)이 알아서 골라 다음 주(달) 첫 물음까지 · 바로 가기 = 새 판을 그 손으로 그 시점까지 돌려 놓고 시작(지금 판은 덮임) */
if (/[?&]lab=1/.test(location.search)) addEventListener('load', () => {
  const LAB_TO = {   /* 바로 갈 시점 — 이름은 자료 LAB.to 의 키와 한 벌 */
    intern_last: (st) => st.mode === 'week' && st.week === SH.internWeeks(),
    staff: (st) => st.rank === 'staff', asst_manager: (st) => st.rank === 'asst_manager', manager: (st) => st.rank === 'manager',
  };
  const T = SH.D.ui_lines.LAB, b = document.createElement('div'); b.id = 'labbtn'; b.className = 'btn sm'; b.textContent = T.btn; stage.appendChild(b);
  const fast = (fn) => { const i0 = G.instant; G.instant = true; let ok = false; try { ok = fn(); } finally { G.instant = i0; } overlay(''); if (ok && G.st) { SH.takeToasts(G.st); G.group = null; render(); } else toast([T.fail]); };
  const skip = () => fast(() => { const st = G.st; if (!st || st.ending) return false; const t0 = st.tick; autoPlay(st, (P, s) => s.tick !== t0, workHand); return true; });
  const jump = (k) => fast(() => { for (let s = 7; s < 47; s++) { const st = SH.newGame(s); SH.applyFirst(st, null); const P = autoPlay(st, (P, x) => LAB_TO[k](x), workHand); if (P && P.t !== 'end' && LAB_TO[k](st)) { G.st = st; return true; } } return false; });
  const menu = () => { overlay(`<div class="box px lab"><h2>${esc(T.title)}</h2><div class="btn" data-lab="skip">${esc(T.skip)}</div><p class="mute">${esc(T.jump)}</p>${Object.keys(LAB_TO).map(k => `<div class="btn" data-lab="${k}">${esc(T.to[k])}</div>`).join('')}<div class="btn" data-act="ovl-close">${esc(T.close)}</div></div>`);
    document.querySelectorAll('#ovl [data-lab]').forEach(e => e.addEventListener('click', (ev) => { ev.stopPropagation(); const k = e.dataset.lab; if (k === 'skip') skip(); else jump(k); })); };
  b.addEventListener('click', (ev) => { ev.stopPropagation(); if (!busy) menu(); });
});
function runShot(kind) {
  G.instant = true;
  /* 사진 모드는 끝없이 도는 꾸밈 움직임(시세 띠 · 깜박임 · 까딱임)을 세움 — 찍는 때마다 화소가 달라져 사진 기준에 못 넣던 것(11-14 안전망 넓히기) · 꾸밈 장에서 infinite 인 규칙을 찾아 그 선택자만 */
  try { const sel = []; [...document.styleSheets].forEach(sh => [...sh.cssRules].forEach(r => { if (r.style && /infinite/.test(r.style.animation || r.style.animationIterationCount || '')) sel.push(r.selectorText); }));
    /* 한 번 돌고 끝나는 움직임(장소 제목이 3초 뒤 사라짐 · 수치 쪽지가 떴다 사라짐)은 곧바로 끝난 모습으로 — 찍는 순간에 끝났을 때와 덜 끝났을 때로 갈려 화소가 둘 중 하나로 나왔음(11-15 · 장소 안 · 사건 화면 여덟 번에 5:3) */
    const el = document.createElement('style'); el.id = 'shotstill'; el.textContent = (sel.length ? sel.join(',') + '{animation:none!important}' : '') + '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important}'; document.head.appendChild(el); } catch (e) { console.error('사진 모드: 꾸밈 움직임을 못 세움', e); }
  const seedOf = (s) => +(new URLSearchParams(location.search).get('seed') || s);
  let st, P;
  const tries = (fn) => { for (let s = seedOf(7); s < seedOf(7) + 40; s++) { st = SH.newGame(s); P = fn(st); if (P && P.t !== 'end') return; } };
  if (kind === 'title') { const dx = new URLSearchParams(location.search).get('dex'); if (dx) dx.split(',').forEach(SH.dexAdd); titleScreen(); return; }   // 사진용: &dex=end_ceo,end_debt 면 본 끝으로 넣고 찍음
  if (kind === 'stress' || kind === 'setting' || kind === 'person' || kind === 'rank' || kind === 'bag') tries(st => autoPlay(st, (P, st) => P.t === 'slot' && st.week === 3 && st.s.stress >= 30, workHand));   // 사진용: 스트레스 쪽지(피드백 45)
  if (kind === 'mapnight') tries(st => autoPlay(st, (P, st) => P.t === 'slot' && st.week === 2 && P.slot.kind === 'evening', workHand));   // 사진용: 주중 밤 지도(&lit=1 이면 밤 불빛)
  if (kind === 'land') tries(st => autoPlay(st, (P, st) => P.t === 'lmap' && SH.landOpen(st), workHand));   // 사진용: 땅이 열린 첫 달 지도 + 땅 창(&op=intro|list|buy|loan|mine)
  if (kind === 'map' || kind === 'inside') tries(st => autoPlay(st, (P, st) => P.t === 'slot' && st.week === 2 && P.slot.k === (new URLSearchParams(location.search).get('slot') || 'lunch'), workHand));   // &slot=eve 면 평일 밤 칸
  if (kind === 'event') tries(st => autoPlay(st, (P) => P.t === 'event' && P.id === (new URLSearchParams(location.search).get('ev') || 'a1_meet_analyst'), { slot: (P) => { const i = P.options.findIndex(o => o.place === 'cafeteria'); return i >= 0 ? i : null; } }));
  if (kind === 'settle') tries(st => autoPlay(st, (P, st) => P.t === 'settle' && st.week === 2, workHand));
  if (kind === 'shop') { tries(st => autoPlay(st, (P, st) => P.t === 'shop' && st.seen.a1_first_suit != null, workHand)); SHOPV.sel = 'suit_custom'; }
  if (kind === 'album') tries(st => autoPlay(st, (P) => P.t === 'album', workHand));
  const at = new URLSearchParams(location.search).get('at') || '1995-09';   // 사진용: &at=1997-11 처럼 그 달부터
  const sq = new URLSearchParams(location.search);
  if (kind === 'lmap' || kind === 'linside') tries(st => autoPlay(st, (P, st) => P.t === 'lmap' && st.date >= at && (!sq.has('news') || !!P.news), workHand));   // 사진용: 사원 뒤 지도(달 첫 주 · &news=1 이면 주를 마친 뒤 주간 소식 띠) · linside = 장소 안(&place=…)
  if (kind === 'market') tries(st => autoPlay(st, (P, st) => P.t === 'lmap' && st.date >= at, workHand));   // 사진용: 지도에서 연 주식 본 화면
  if (kind === 'meet') tries(st => autoPlay(st, (P, st) => P.t === 'lmeet' && P.rumor && st.date >= at, workHand));   // 사진용: 만남 장면(소문 들음)
  if (kind === 'gate') tries(st => autoPlay(st, (P, st) => P.t === 'lmeet' && P.gate && st.date >= at, workHand));   // 사진용: 문턱 장면(결산 앞)
  if (kind === 'meet3') tries(st => autoPlay(st, (P, st) => P.t === 'lmeet' && P.who && (P.lines || []).length >= 3 && st.date >= at, workHand));   // 사진용: 앞뒤 줄이 붙은 만남
  if (kind === 'lsettle') tries(st => autoPlay(st, (P, st) => P.t === 'settle' && P.rep.loop && st.date >= at, workHand));   // 사진용: 달 결산
  if (kind === 'end') { st = SH.newGame(seedOf(7)); P = autoPlay(st, () => false, workHand); }
  if (kind === 'fall') { st = SH.newGame(seedOf(7)); P = autoPlay(st, () => false, { slot: (P) => { const i = P.options.findIndex(o => o.ok !== false && /rest|shop|lunch/.test(o.action || '')); return i >= 0 ? i : null; } }); }
  G.st = st; G.P = P; G.group = null;
  if (sq.get('car')) st.equip.car = sq.get('car');   // 리허설(11-15 지역): &car=car_1 이면 차를 가진 채로
  if (kind === 'shop') { G.P = P; const sq = new URLSearchParams(location.search);
    /* ?shot=shop&shop=car_dealer&sel=car_2 — 다른 가게(달 마디의 '상점' 꼴)를 그 물건을 고른 채로: 시험 손이라 직급 · 돈을 사진용으로 맞춤(11-14 자동차 매장의 '달 유지비' 칸 배치를 시험이 못 보던 것) */
    if (sq.get('shop')) { const it = SH.item(sq.get('sel')); G.st.rank = 'director'; G.st.s.money = 500000000; SHOPV.shop = sq.get('shop'); SHOPV.tab = (it && it.slot) || SHOPV.tab; SHOPV.sel = sq.get('sel'); shopScreen('walk'); return; }   /* 217: 실제처럼 그 가게 하나만(걸어 들어간 꼴) */
    shopScreen('flow'); return; }
  if (P.t === 'event') { eventScreen(P); while (dialogAdvance()); return; }
  if (kind === 'market') { if (sq.get('wk')) { SH.answer(st, { end: true }); P = G.P = SH.next(st); } G.LOOP.market(P); return; }   // &wk=1 = 한 주를 마친 뒤
  if (kind === 'linside') { const L = st.L, cnt = {}; L.pool.forEach(o => { const p = G.LOOP.placeOf(o); cnt[p] = (cnt[p] || 0) + 1; }); const pid = sq.get('place') || Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 'office_sales'; G.LOOP.map(P); G.LOOP.inside(pid); return; }
  if (P.t === 'lmeet') { G.LOOP.meet(P); while (dialogAdvance()); return; }
  // 시험 손(A3): 사진을 찍으려고 땅 상태(S.intro · S.acted · S.recall)와 돈을 직접 고침 — 게임 중엔 안 돎 · 엔진 문을 거치지 않는 유일한 곳
  if (kind === 'land') { const op = new URLSearchParams(location.search).get('op') || 'list', S = SH.landState(st); if (op !== 'intro') S.intro = true;
    if (op === 'mine') { st.s.money = Math.max(st.s.money, 60000000); SH.landBuy(st, 'yeouido.lot04', 0.5); S.acted = -99; SH.landBuild(st, 'yeouido.lot04', 'house3', 0.5); S.acted = -99; }
    if (op === 'recall') { st.s.money = Math.max(st.s.money, 40000000); SH.landBuy(st, 'yeouido.lot04', 0.7); S.recall = { need: Math.round(SH.landLoan(st) / 2), paid: 0, until: st.tick + 3 }; }
    G.LOOP.map(P); if (op === 'list' || op === 'recall') G.LAND.list(); if (op === 'buy' || op === 'mine') G.LAND.open('yeouido.lot04'); if (op === 'loan') { G.LAND.open('yeouido.lot04'); G.LAND.act({ dataset: { op: 'loan' }, classList: { contains: () => false } }); } return; }
  if (kind === 'inside') { const ps = new URLSearchParams(location.search).get('place'); const okp = P.options.filter(o => o.ok !== false).map(o => o.place); const sl = SH.SLOTS[P.si], quiet = okp.find(pl => !SH.pickCard(st, 'enter', { phase: 'slot', slot: sl.slot, day: sl.day, place: pl })); SH.answer(st, { enter: ps && ps !== 'auto' ? ps : (quiet || okp[0]) }); P = G.P = SH.next(st); if (P.t === 'event' && !new URLSearchParams(location.search).has('after')) { eventScreen(P); while (dialogAdvance()); return; } for (let g = 0; g < 9 && (P.t === 'event' || P.t === 'reply'); g++) { SH.answer(st, P.t === 'event' && P.choices.length ? { choice: (P.choices.find(c => c.ok) || P.choices[0]).i } : {}); P = G.P = SH.next(st); } mapScreen(P); if (new URLSearchParams(location.search).has('res')) { const i = P.options.findIndex(o => o.ok !== false && o.place === G.st.wk.pre.place); if (i >= 0) { SH.takeWorkRes(G.st); const gi = G.instant; G.instant = false; answer({ opt: i }); G.instant = gi; } } return; }   // 사진용: 장소 안(피드백 48) · &res=1 = 첫 일을 고른 뒤 결과(204)
  if (kind === 'stress') { mapScreen(P); stressOverlay(); return; }
  if (kind === 'setting') { mapScreen(P); notebookOverlay(); return; }   // 사진용: 설정 창
  if (kind === 'person') { mapScreen(P); midPeople.card(new URLSearchParams(location.search).get('who') || 'analyst'); return; }   // 사진용: 사람 카드
  if (kind === 'rank' || kind === 'bag') { mapScreen(P); stampBoard[kind === 'rank' ? 'open' : 'bag'](); return; }   // 사진용: 인턴 지도 옆 칸의 순위표 · 소지품 창(11-17)
  ({ slot: mapScreen, settle: (P) => (P.rep.loop ? G.LOOP.settle(P) : settleMid(P)), album: albumScreen, lmap: G.LOOP.map, end: endScreen }[P.t] || (() => render()))(P);
  if (new URLSearchParams(location.search).has('over')) setTimeout(() => worldOverview(true), 300);
  if (new URLSearchParams(location.search).has('savetest')) { SH.save(G.st); }   // 시험: 이 화면 상태를 저장(다음에 이어 하기 시험)   // 사진용: 전체 지도(다리 끝 표지판 보기)
  if (new URLSearchParams(location.search).has('dragtest')) setTimeout(() => {   // 시험(54 · 56): 지도 가운데를 끌고, 건물 위에 마우스를 올려 결과를 찍음
    const z = G.world, cv = document.getElementById('w2cv'), rc = cv.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2, ev = (t, x, y, b) => cv.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, buttons: b, pointerType: 'mouse' }));
    const cam0 = z.cam.slice(); ev('pointerdown', cx, cy, 1);  ev('pointermove', cx - 40, cy, 1); ev('pointermove', cx - 200, cy - 60, 1); ev('pointerup', cx - 200, cy - 60, 0); ev('pointerdown', cx, cy, 1); ev('pointermove', cx + 900, cy + 400, 1); ev('pointerup', cx + 900, cy + 400, 0); w2Cam(z, true); w2Draw(z);
    const moved = Math.round(Math.hypot(z.cam[0] - cam0[0], z.cam[1] - cam0[1]));
    const b = z.r.blds.find(b => !b.area && M2.R2.ready(b.sprite)), f = b && M2.R2.bFit(z.r, b), mid = f && [f.x0 + f.w / 2, f.bot[1] - f.h * 0.4], sp = mid && w2s(z, mid), sc = rc.width / z.F.aw;
    if (sp) ev('pointermove', rc.left + sp[0] * sc, rc.top + sp[1] * sc, 0);
    const corner = f && w2s(z, [f.x0 + 2, f.y0 + 2]), hit = corner && M2.R2.bldAt(z.r, [f.x0 + 2, f.y0 + 2]);
    const pre = document.createElement('pre'); pre.id = 'result'; const tip = document.getElementById('zhov'); pre.textContent = `DRAGTEST 끌기 화면 이동 ${moved} · 가장자리 이름표 ${document.querySelectorAll('#pins .pin.edge').length} · 띄운 이름 ${tip && tip.style.display !== 'none' ? tip.textContent : '없음'} · 마우스 올린 건물 ${z.hover ? z.hover.id : '없음'}(기대 ${b && b.id}) · 그림 모서리 투명 칸 누름 ${hit ? hit.id : '없음'}`; document.body.prepend(pre);
  }, 3000);
  const wk = new URLSearchParams(location.search).get('walk');   // 사진용: 지도에서 그 장소를 누른 뒤(걸어가 혼잣말 창)
  const wms = +(new URLSearchParams(location.search).get('walkms') || 0);   // 사진용: 걷기 시작하고 wms 뒤에 멈춘 모습
  if (wk && (P.t === 'slot' || P.t === 'lmap')) setTimeout(() => { const fr = sq.get('from'), z0 = G.world; if (fr && z0 && w2R()[fr]) { const R = w2R()[fr], e = R.entrances[0]; z0.r = R; z0.pos = M2.toScreen(R, e.at[0], e.at[1]); w2Pins(z0); w2Cam(z0, true); w2Draw(z0); }   /* 리허설(11-15 지역): &from=<지역 id> 면 그 지역 첫 도착 자리에서 걷기 시작 */
    if (wms) G.instant = false; walkTo(wk); if (wms) setTimeout(() => { const z = G.world; if (z && z.path) { z.path = null; z.frame = 1; G.walkT = null; G.walkSkip = null; } }, wms); }, 300);
}

/* ── 화면 누르기 시험 (?selftest=판수) — 진짜 단추를 눌러 끝까지 감 · 결과는 화면 맨 위 글자로 ── */
function selfTest(n) {
  G.instant = true;
  const errs = [], R = { games: 0, steps: 0, ends: {}, screens: {} };
  addEventListener('error', e => errs.push(String(e.message)));
  let rs = 12345; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  const press = (el) => { if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return !!el; };
  const any = (sel) => { const l = [...document.querySelectorAll(sel)]; return l.length ? l[Math.floor(rnd() * l.length)] : null; };
  for (let g = 0; g < n; g++) {
    newGame(1000 + g); R.games++;
    /* 인턴 과제는 종류에 맞춰 해야 붙음(11-16) — 아무 데나 누르면 세 판 다 인턴에서 끝나 사원 뒤 화면을 못 누름 → 첫 판은 인턴을 아무렇게나 누르고, 둘째 판부터는 사진용 손으로 인턴을 지나 사원 첫 달부터 누름 */
    if (g > 0) for (let s = 0; s < 40; s++) { const st = SH.newGame(1000 + g + s * 97); SH.applyFirst(st, null); const P0 = autoPlay(st, (P, x) => x.rank !== 'intern', workHand); if (P0 && P0.t !== 'end' && st.rank !== 'intern') { G.st = st; render(); break; } }
    for (let k = 0; k < 3000; k++) {
      const P = G.P; R.steps++; R.screens[P.t] = (R.screens[P.t] || 0) + 1;
      try {
        { const sr = document.getElementById('stage').getBoundingClientRect();   // 57: 고르기 단추가 무대 밖으로 나가면 실패
          document.querySelectorAll('#ch.show > div').forEach(d => { const b = d.getBoundingClientRect(); if (b.height && (b.top < sr.top - 1 || b.bottom > sr.bottom + 1 || b.left < sr.left - 1 || b.right > sr.right + 1)) errs.push(`고르기 넘침 ${P.t} ${P.id || ''} ${document.querySelectorAll('#ch.show > div').length}개`); }); }
        if (toast.bad) { errs.push(`toast overlap ${P.t} ${P.id || ''} ${document.getElementById('screen').className}`); toast.bad = false; }   // 알림 쪽지가 글 · 단추와 안 겹치는 자리를 못 찾음(11-15 대표님 '토스트가 다른 내용들과 겹쳐')
        if (document.querySelector('#ovl [data-act="yes"]')) { press(document.querySelector('#ovl [data-act="yes"]')); continue; }
        if (P.t === 'end') { R.ends[P.ending] = (R.ends[P.ending] || 0) + 1; break; }
        const before = G.P;
        if (G.world && document.getElementById('pins')) nearDoor();
        { const bp = document.querySelector('.k-map .top > .bp.new, .k-map .tray > .bp.new'); if (bp) { press(bp); if (!document.querySelector('#ovl .pgr .ln')) errs.push('pager: no window ' + SH.dateLabel(G.st)); press(document.querySelector('#ovl .pgr [data-act="pager-next"]:not(.dis)')); press(document.querySelector('#ovl .pgr [data-act="ovl-close"]')); if (document.querySelector('#ovl .pgr') || SH.inboxUnread(G.st)) errs.push('pager: not closed or still unread ' + SH.dateLabel(G.st)); } }   /* 삐삐에 새 소식이 있으면 열어 넘겨 보고 닫음(난수 안 씀) */   /* 키보드 엔터가 부르는 '가까운 문 찾기' — 누르기 시험은 키를 안 눌러 여기 오류를 못 봤음(11-15 검토 1) */
        if (document.querySelector('#screen.k-res')) { if (!press(document.querySelector('#ch [data-act="res-go"]'))) errs.push('장소 안 결과에 계속이 없음 ' + SH.dateLabel(G.st)); continue; }   // 204: 고른 뒤 장소 안 결과 → 계속
        if (D.talk(P)) { press(document.querySelector('[data-act="talk-skip"]'));
          { const im = document.querySelector('#screen.k-event img.ill.png:not(.sw-old)'); if (im && !errs.some(e => e.indexOf('sw-wait') === 0)) { getComputedStyle(im).opacity; im.classList.add('sw-wait'); const o = getComputedStyle(im).opacity; im.classList.remove('sw-wait'); if (o !== '0') errs.push('sw-wait: incoming art not hidden at once (opacity ' + o + ') ' + SH.dateLabel(G.st)); } }   /* 166 차례를 기다리는 새 그림은 곧바로 안 보여야 함(서서히 사라지면 옛 그림 뒤로 비침) */
          if (D.lines.length > 1) { const li = D.li; press(document.querySelector('#screen [data-act="talk-back"]')); if (D.li !== li - 1 || document.querySelector('#ch.show')) errs.push('talk-back: did not step back ' + SH.dateLabel(G.st)); press(document.querySelector('[data-act="talk-skip"]')); if (D.li !== li) errs.push('talk-back: skip did not return ' + SH.dateLabel(G.st)); }   /* '뒤로'를 눌러 한 줄 되돌아갔다가 다시 끝 줄로(난수 안 씀) */
          { const la = document.querySelector('#ch.show [data-act="land"]'); if (la) { press(la); if (!document.querySelector('#ovl .landbox')) errs.push('lmeet land: no window ' + SH.dateLabel(G.st)); press(document.querySelector('#ovl [data-op="close"]')); if (!document.querySelector('#ch.show [data-next]')) errs.push('lmeet land: scene lost ' + SH.dateLabel(G.st)); } }   /* 급매 장면의 '땅 보러 가기'를 늘 눌러 봄(11-16 구조 검토 3) — 난수를 쓰지 않음(쓰면 뒤 판들의 고르기가 통째로 바뀜) */ if (!press(any('#ch [data-pick]:not([data-pick=""])'))) press(document.querySelector('#ch [data-next]') || document.getElementById('screen')); }
        else if (P.t === 'slot' && document.querySelector('#screen.k-inside')) { if (!press(any('.k-inside #ch [data-opt]:not([data-opt=""])'))) errs.push('장소 안에 고를 것이 없음 ' + SH.dateLabel(G.st)); }
        else if (P.t === 'slot' && document.getElementById('mono')) { press(any('#pins .pin.go[data-walk], #zone .zgo [data-walk], #zone .zarrow[data-walk]')); if (!press(any('#mono [data-act="enter"]'))) errs.push('혼잣말 창에 들어갈 곳이 없음 ' + SH.dateLabel(G.st)); }
        else if (P.t === 'lmap') {   // 사원 뒤 한 주: 땅 창 · 장(사고팔기 → 지도로) · 가게 · 표시를 눌러 걸어가 들어가서 고르기 · 이번 주 마침 · 가끔 이 달 끝까지 — 한 걸음에 답 하나(go · end · skip)
          const st = G.st, $ = (s) => document.querySelector(s), onWorld = () => !!document.getElementById('zone');
          if (!onWorld()) errs.push('사원 뒤 지도가 안 그려짐 ' + SH.dateLabel(st));
          if (SH.landOpen(st) && rnd() < 0.25) { const ids = (SH.D.lands.first_lots || []).map(l => l.lot); G.LAND.open(ids[Math.floor(rnd() * ids.length)]);   // 땅 창 눌러 보기
            for (let k = 0; k < 2; k++) press(any('#ovl .landbox [data-op]:not(.dis):not([data-op="close"])')); overlay(''); if (!onWorld()) G.LOOP.map(G.P); }
          if (rnd() < 0.2) { press($('.lms [data-lp="mkt"]')); if (!$('.lp-mkt #lpchart')) errs.push('장 화면에 값 그림이 없음');
            for (let r = 0; r < 4; r++) { press(any('.lp-mkt [data-lp]:not(.dis):not([data-lp="map"])'));
              if ($('#ovl [data-lp="order"]') && rnd() < 0.5) { press($('#ovl [data-lp="order"]')); if (!$('#ovl .sk-dlg.done') && !$('#toast.on')) errs.push('체결 뒤 확인 창이 없음'); }      /* 243: 체결할까요? → 체결되었습니다 */
              if ($('#ovl [data-act="ovl-close"]')) press($('#ovl [data-act="ovl-close"]')); }
            press($('.lp-mkt [data-lp="map"]')); if (!onWorld()) errs.push('장에서 지도로 못 돌아옴'); }
          if (rnd() < 0.1) { const sh = SH.shopsOpen(st).map(x => x.id).filter(id => SH.PL[id] && SH.isOpen(st, id)); if (sh.length) { walkTo(sh[Math.floor(rnd() * sh.length)]); press($('#mono [data-lp^="in:"]')); press($('.k-inside [data-lp^="shop:"]'));
            press(any('[data-item-id]:not([data-item-id=""])')); press($('[data-act="shop-buy"]:not(.dis)')); press($('#ovl [data-act="yes"]')); press($('[data-act="shop-exit"]')); if (!onWorld()) errs.push('가게에서 지도로 못 돌아옴'); } }
          if (rnd() < 0.15) { press(any('#pins [data-lp^="lotgo:"]')); press(any('#pins [data-lp^="go:"], #pins [data-lp^="lot:"]')); if (G.P === before) overlay(''); }   // 급매 '?' → 걸어가서 딱지 · 내 땅 이름표
          if (G.P === before) {
            if (rnd() < 0.06) { press($('.lms [data-lp="skip"]')); press($('.lms [data-lp="skip"]')); }
            else if (SH.loopSlots(st) >= 1 && rnd() < 0.85) { press(any('#pins .pin.mk[data-walk], #zone .zgo [data-walk]'));
              if (!press($('#mono [data-lp^="go:"]')) && press($('#mono [data-lp^="in:"]'))) { if (!press(any('.k-inside #ch [data-lp^="go:"]:not(.dis)'))) press($('[data-lp="out"]'));      /* 223: 장소 안 '장 보기'는 걷음 */ }
              press($('[data-act="mono-close"]')); }
            if (G.P === before && onWorld()) { press($('.lms [data-lp="skip"]')); if (G.P === before) press($('.lms [data-lp="skip"]')); }      /* 11-17 턴제: 주 마침이 없어지고 달 넘기기 하나 */
          }
        }
        else if (P.t === 'shop') { press(any('[data-tab]')); press(any('[data-item-id]:not([data-item-id=""])')); press(document.querySelector('[data-act="shop-buy"]:not(.dis)')); press(document.querySelector('#ovl [data-act="yes"]')); press(document.querySelector('[data-act="shop-exit"]')); }
        else { if (P.t === 'settle' && rnd() < 0.3 && !P.rep.loop && !document.querySelector('.m5-money .ln')) errs.push('결산에 돈 내역 칸이 없음');   // 주 결산 새 배치는 돈 까닭을 늘 펼침(여닫기 없음) · rnd() 는 옛 시험과 같은 차례로 부름(누르기 차례가 바뀌지 않게)
          if (P.t === 'settle' && P.rep.loop) { const sh = document.querySelector('.k-settle .m5w'); if (!sh || !sh.querySelector('.m5-money') || !sh.querySelector('[data-next]')) errs.push('달 결산에 돈 내역 · 다음 단추가 없음 ' + SH.dateLabel(G.st)); else if (/NaN|undefined|\[object/.test(sh.textContent)) errs.push('달 결산 글에 NaN · undefined ' + SH.dateLabel(G.st)); }   // 달 결산(돈 고리)도 봄 · rnd() 안 부름(누르기 차례 그대로)
          press(document.querySelector('#ovl [data-next]') || document.querySelector('[data-next]')); }
        if (G.P === before && !G.res && !document.querySelector('#ovl [data-act="yes"]')) {   /* 204: 고른 뒤 결과 화면('계속' 기다림)은 넘어간 것으로 봄 — 다음 걸음이 '계속'을 누름 */
         errs.push(`안 넘어감: ${P.t} ${P.id || ''} ${SH.dateLabel(G.st)}`); break; }
      } catch (e) { errs.push(`${P.t}: ${e.message}`); break; }
    }
    errs.push(...G.st.errors);
  }
  const out = `SELFTEST games=${R.games} steps=${R.steps} errors=${errs.length} ends=${JSON.stringify(R.ends)} screens=${JSON.stringify(R.screens)} ${errs.slice(0, 5).join(' | ')}`;
  document.title = out;
  const pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = out; document.body.prepend(pre);
}

/* ?clicktest — 시험: 이어 하기 → 지도 가운데 누름 → 걷기 시작했나(boot 가 0.8초 뒤 부름) */
selfTest.click = function () {
  const out = [], say = (t) => out.push(t), btn = document.querySelector('[data-act="continue"]'); say('이어하기 단추 ' + !!btn); if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  setTimeout(() => { const z = G.world, cv = document.getElementById('w2cv'); say('지도 ' + !!z + ' · 화면 ' + (G.P && G.P.t)); if (!z || !cv) return fin();
    const rc = cv.getBoundingClientRect(), x = rc.left + rc.width * 0.3, y = rc.top + rc.height * 0.6, p0 = z.pos.slice(), o = { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse' };
    const top = document.elementFromPoint(x, y); say('누른 자리 맨 위 ' + (top ? top.tagName + '#' + top.id + '.' + top.className : '없음'));
    top.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ buttons: 1 }, o))); top.dispatchEvent(new PointerEvent('pointerup', o)); top.dispatchEvent(new MouseEvent('click', o));
    setTimeout(() => { say('걷기 ' + !!z.path + ' · 움직임 ' + Math.round(Math.hypot(z.pos[0] - p0[0], z.pos[1] - p0[1])) + ' · drag ' + JSON.stringify(G.drag) + ' · 겹침창 ' + !!document.querySelector('#ovl .ovl')); fin(); }, 600); }, 1500);
  function fin() { const pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = 'CLICKTEST ' + out.join(' | '); document.body.prepend(pre); }
};
