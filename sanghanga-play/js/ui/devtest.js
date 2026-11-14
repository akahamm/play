/* =====================================================================
   ui/devtest.js — 시험 손(개발용) · 게임 중엔 안 돎
   - ?shot=… 사진 모드(runShot · autoPlay · workHand) · ?selftest=판수 누르기 시험 · ?clicktest · ?dragtest · ?savetest · &mockn · &mockfloat 화면 예시
   - 11-14 밤 정리(E3): main.js 에서 떼어 냄 — 게임 코드와 시험 손을 나눔. 이 파일을 빼도 게임은 돎(시작 갈래 boot 가 부를 때만 씀)
   - main.js 보다 먼저 실음: boot 의 자료 읽기가 곧바로 끝나 다음 스크립트보다 먼저 runShot/selfTest 를 부르기 때문
   ===================================================================== */

// 화면 예시용(11-14 대표님 '선택지 1 ~ 5개를 가정해 목업 · 눌렀을 때 스탯이 바뀌는 장면도'): &mockn=N 이면 지금 화면의 선택지를 N개로 맞춤 · &mockfloat=1 이면 고른 직후(바뀐 값이 뜬 순간)를 세워 둠 — 글은 가짜
if (/mockn|mockfloat/.test(location.search)) addEventListener('load', () => {   // statFloat 은 main.js 에 있음 — 이 파일이 먼저 실리므로 다 실린 뒤(load)에 붙임
  statFloat.mock = function () {
    const q = new URLSearchParams(location.search), n = +q.get('mockn'), ch = document.getElementById('ch'), sc = document.getElementById('screen'); if (!sc || (!ch && q.get('mockfloat') !== 'map')) return;
    const CARD = ['“감사합니다. 다음엔 제 표부터 보여 드리겠습니다.”', '“선배님은요? 서류만 보시다 밥 놓치시겠어요.”', '표를 받아 두고 말없이 밥을 다 먹는다', '“이 숫자는 어디서 구하셨습니까?”', '식판을 들고 옆자리로 옮겨 앉는다'];
    if (n) { while (ch.children.length > n) ch.lastElementChild.remove(); while (ch.children.length < n) ch.appendChild(ch.lastElementChild.cloneNode(true));
      [...ch.children].forEach((d, k) => { const b = d.querySelector('b'), sp = d.querySelector('span'); if (b) b.textContent = k + 1; if (sp && !sc.classList.contains('k-inside')) sp.textContent = CARD[k]; }); ch.classList.add('show'); }
    if (q.get('mockfloat')) { if (ch && q.get('mockfloat') !== 'map') { ch.innerHTML = '<div class="hot"><b>▶</b>계속</div>'; ch.classList.add('show'); const tx = document.getElementById('tx'); if (tx) tx.textContent = '표부터요. 그럼 내일 아침 여덟 시까지 가져와요.'; }
      statFloat.force = true; statFloat({ s: { analysis: 46, stress: 35, hp: 65, money: 327000 }, r: { analyst: 9 } }, { s: { analysis: 48, stress: 33, hp: 57, money: 322000 }, r: { analyst: 12 } }, new URLSearchParams(location.search).get('mockfloat') === 'map' ? 'map' : 'mock'); }
  };
  setTimeout(() => statFloat.mock(), 1500); setTimeout(() => { if (!document.querySelector('.statfloat.mock')) statFloat.mock(); }, 5000); });   // 좁은 판은 화면을 한 번 다시 그려서 두 번 맞춤

/* ── 사진용 자동 진행 ── 정해진 손(가장 앞의 고를 수 있는 것 · 장면별 조금 다르게) */
function autoPlay(st, until, hand) {
  for (let n = 0; n < 6000; n++) {
    const P = SH.next(st);
    if (until(P, st) || P.t === 'end') return P;
    let a = {};
    if (P.t === 'event') { const ok = P.choices.filter(c => c.ok); const pick = hand.event ? hand.event(P, ok) : null; a = { choice: pick != null ? pick : (ok[0] || {}).i }; }
    else if (P.t === 'slot') { const pick = hand.slot ? hand.slot(P, st) : null; a = { opt: pick != null ? pick : P.options.findIndex(o => o.ok !== false) }; }
    else if (P.t === 'lmap') a = { picks: G.LOOP.autoPicks(st) };
    else if (P.t === 'lmarket' && hand.market) hand.market(P, st);
    SH.answer(st, a); SH.takeToasts(st);
  }
  return SH.next(st);
}
const workHand = {
  slot: (P, st) => {
    const f = (fn) => { const i = P.options.findIndex(o => o.ok !== false && fn(o)); return i >= 0 ? i : null; };
    if (P.slot.kind === 'work') return f(o => o.variant === 'hint') ?? f(o => o.action === 'work_sales');
    if (P.slot.kind === 'lunch') return f(o => o.place === (st.week % 2 ? 'cafeteria' : 'cafe_press'));
    if (P.slot.kind === 'evening') return st.s.hp < 45 ? f(o => o.action === 'rest') : (P.slot.day === '금' ? f(o => o.place === 'bar_yujin' && o.action === 'eve_drinks') : f(o => o.action === 'eve_overtime'));
    if (P.slot.kind === 'weekend') return P.slot.day === '토' ? (f(o => o.action === 'eve_shop') ?? f(o => o.action === 'wk_study')) : f(o => o.action === 'rest');
    return null;
  },
  event: (P, ok) => (P.id === 'a1_first_suit' ? (ok.find(c => c.i === 1) || ok[0] || {}).i : null),
  market: (P, st) => { const L = st.L; SH.loopOpen(st); Object.keys(L.pos).forEach(i => { if ((L.px[i] / L.cost[i] - 1) > 0.12 || !L.src[i]) SH.loopSell(st, +i, 1); });
    L.mon.heard.map(e => L.known.find(k => k.eid === e)).filter(k => k && k.says !== false && k.kind !== 'inside').slice(0, 2).forEach(k => SH.loopBuy(st, k.id, SH.loopRoom(st, false) * 0.5, false)); }
};
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
  if (kind === 'stress' || kind === 'setting' || kind === 'person') tries(st => autoPlay(st, (P, st) => P.t === 'slot' && st.week === 3 && st.s.stress >= 30, workHand));   // 사진용: 스트레스 쪽지(피드백 45)
  if (kind === 'mapnight') tries(st => autoPlay(st, (P, st) => P.t === 'slot' && st.week === 2 && P.slot.kind === 'evening', workHand));   // 사진용: 주중 밤 지도(&lit=1 이면 밤 불빛)
  if (kind === 'land') tries(st => autoPlay(st, (P, st) => P.t === 'lmap' && SH.landOpen(st), workHand));   // 사진용: 땅이 열린 첫 달 지도 + 땅 창(&op=intro|list|buy|loan|mine)
  if (kind === 'map' || kind === 'inside') tries(st => autoPlay(st, (P, st) => P.t === 'slot' && st.week === 2 && P.slot.k === (new URLSearchParams(location.search).get('slot') || 'lunch'), workHand));   // &slot=eve 면 평일 밤 칸
  if (kind === 'event') tries(st => autoPlay(st, (P) => P.t === 'event' && P.id === (new URLSearchParams(location.search).get('ev') || 'a1_meet_analyst'), { slot: (P) => { const i = P.options.findIndex(o => o.place === 'cafeteria'); return i >= 0 ? i : null; } }));
  if (kind === 'settle') tries(st => autoPlay(st, (P, st) => P.t === 'settle' && st.week === 2, workHand));
  if (kind === 'shop') { tries(st => autoPlay(st, (P, st) => P.t === 'shop' && st.seen.a1_first_suit != null, workHand)); SHOPV.sel = 'suit_custom'; }
  if (kind === 'album') tries(st => autoPlay(st, (P) => P.t === 'album', workHand));
  const at = new URLSearchParams(location.search).get('at') || '1995-09';   // 사진용: &at=1997-11 처럼 그 달부터
  if (kind === 'lmap') tries(st => autoPlay(st, (P, st) => P.t === 'lmap' && st.date >= at, workHand));   // 사진용: 월초 지도
  if (kind === 'market') tries(st => autoPlay(st, (P, st) => P.t === 'lmarket' && st.date >= at, workHand));   // 사진용: 주식 본 화면
  if (kind === 'meet') tries(st => autoPlay(st, (P, st) => P.t === 'lmeet' && P.rumor && st.date >= at, workHand));   // 사진용: 만남 장면(소문 들음)
  if (kind === 'gate') tries(st => autoPlay(st, (P, st) => P.t === 'lmeet' && P.gate && st.date >= at, workHand));   // 사진용: 문턱 장면(결산 앞)
  if (kind === 'meet3') tries(st => autoPlay(st, (P, st) => P.t === 'lmeet' && P.who && (P.lines || []).length >= 3 && st.date >= at, workHand));   // 사진용: 앞뒤 줄이 붙은 만남
  if (kind === 'lsettle') tries(st => autoPlay(st, (P, st) => P.t === 'settle' && P.rep.loop && st.date >= at, workHand));   // 사진용: 달 결산
  if (kind === 'end') { st = SH.newGame(seedOf(7)); P = autoPlay(st, () => false, workHand); }
  if (kind === 'fall') { st = SH.newGame(seedOf(7)); P = autoPlay(st, () => false, { slot: (P) => { const i = P.options.findIndex(o => o.ok !== false && /rest|shop|lunch/.test(o.action || '')); return i >= 0 ? i : null; } }); }
  G.st = st; G.P = P; G.group = null;
  if (kind === 'shop') { G.P = P; const sq = new URLSearchParams(location.search);
    /* ?shot=shop&shop=car_dealer&sel=car_2 — 다른 가게(달 마디의 '상점' 꼴)를 그 물건을 고른 채로: 시험 손이라 직급 · 돈을 사진용으로 맞춤(11-14 자동차 매장의 '달 유지비' 칸 배치를 시험이 못 보던 것) */
    if (sq.get('shop')) { const it = SH.item(sq.get('sel')); G.st.rank = 'director'; G.st.s.money = 500000000; SHOPV.shop = sq.get('shop'); SHOPV.tab = (it && it.slot) || SHOPV.tab; SHOPV.sel = sq.get('sel'); shopScreen('menu'); return; }
    shopScreen('flow'); return; }
  if (P.t === 'event') { eventScreen(P); while (dialogAdvance()); return; }
  if (kind === 'market') { if (new URLSearchParams(location.search).get('wk')) { SH.loopOpen(st); SH.loopWeek(st); } G.LOOP.market(P); return; }
  if (kind === 'meet') { G.LOOP.map(P); G.LOOP.meet(P); return; }
  // 시험 손(A3): 사진을 찍으려고 땅 상태(S.intro · S.acted · S.recall)와 돈을 직접 고침 — 게임 중엔 안 돎 · 엔진 문을 거치지 않는 유일한 곳
  if (kind === 'land') { const op = new URLSearchParams(location.search).get('op') || 'list', S = SH.landState(st); if (op !== 'intro') S.intro = true;
    if (op === 'mine') { st.s.money = Math.max(st.s.money, 60000000); SH.landBuy(st, 'yeouido.lot04', 0.5); S.acted = -99; SH.landBuild(st, 'yeouido.lot04', 'house3', 0.5); S.acted = -99; }
    if (op === 'recall') { st.s.money = Math.max(st.s.money, 40000000); SH.landBuy(st, 'yeouido.lot04', 0.7); S.recall = { need: Math.round(SH.landLoan(st) / 2), paid: 0, until: st.tick + 3 }; }
    G.LOOP.map(P); if (op === 'list' || op === 'recall') G.LAND.list(); if (op === 'buy' || op === 'mine') G.LAND.open('yeouido.lot04'); if (op === 'loan') { G.LAND.open('yeouido.lot04'); G.LAND.act({ dataset: { op: 'loan' }, classList: { contains: () => false } }); } return; }
  if (kind === 'inside') { const ps = new URLSearchParams(location.search).get('place'); const okp = P.options.filter(o => o.ok !== false).map(o => o.place); const sl = SH.SLOTS[P.si], quiet = okp.find(pl => !SH.pickCard(st, 'enter', { phase: 'slot', slot: sl.slot, day: sl.day, place: pl })); SH.answer(st, { enter: ps && ps !== 'auto' ? ps : (quiet || okp[0]) }); P = G.P = SH.next(st); if (P.t === 'event' && !new URLSearchParams(location.search).has('after')) { eventScreen(P); while (dialogAdvance()); return; } for (let g = 0; g < 9 && (P.t === 'event' || P.t === 'reply'); g++) { SH.answer(st, P.t === 'event' && P.choices.length ? { choice: (P.choices.find(c => c.ok) || P.choices[0]).i } : {}); P = G.P = SH.next(st); } mapScreen(P); return; }   // 사진용: 장소 안(피드백 48)
  if (kind === 'stress') { mapScreen(P); stressOverlay(); return; }
  if (kind === 'setting') { mapScreen(P); notebookOverlay(); return; }   // 사진용: 설정 창
  if (kind === 'person') { mapScreen(P); midPeople.card(new URLSearchParams(location.search).get('who') || 'analyst'); return; }   // 사진용: 사람 카드
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
  if (wk && P.t === 'slot') setTimeout(() => { if (wms) G.instant = false; walkTo(wk); if (wms) setTimeout(() => { const z = G.world; if (z && z.path) { z.path = null; z.frame = 1; G.walkT = null; G.walkSkip = null; } }, wms); }, 300);
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
    for (let k = 0; k < 3000; k++) {
      const P = G.P; R.steps++; R.screens[P.t] = (R.screens[P.t] || 0) + 1;
      try {
        { const sr = document.getElementById('stage').getBoundingClientRect();   // 57: 고르기 단추가 무대 밖으로 나가면 실패
          document.querySelectorAll('#ch.show > div').forEach(d => { const b = d.getBoundingClientRect(); if (b.height && (b.top < sr.top - 1 || b.bottom > sr.bottom + 1 || b.left < sr.left - 1 || b.right > sr.right + 1)) errs.push(`고르기 넘침 ${P.t} ${P.id || ''} ${document.querySelectorAll('#ch.show > div').length}개`); }); }
        if (document.querySelector('#ovl [data-act="yes"]')) { press(document.querySelector('#ovl [data-act="yes"]')); continue; }
        if (P.t === 'end') { R.ends[P.ending] = (R.ends[P.ending] || 0) + 1; break; }
        const before = G.P;
        if (P.t === 'event' || P.t === 'reply') { press(document.querySelector('[data-act="talk-skip"]')); if (!press(any('#ch [data-pick]:not([data-pick=""])'))) press(document.querySelector('#ch [data-next]') || document.getElementById('screen')); }
        else if (P.t === 'slot' && document.querySelector('#screen.k-inside')) { if (!press(any('.k-inside #ch [data-opt]:not([data-opt=""])'))) errs.push('장소 안에 고를 것이 없음 ' + SH.dateLabel(G.st)); }
        else if (P.t === 'slot' && document.getElementById('mono')) { press(any('#pins .pin.go[data-walk], #zone .zgo [data-walk], #zone .zarrow[data-walk]')); if (!press(any('#mono [data-act="enter"]'))) errs.push('혼잣말 창에 들어갈 곳이 없음 ' + SH.dateLabel(G.st)); }
        else if (P.t === 'lmap') {
          if (SH.landOpen(G.st) && rnd() < 0.25) { const ids = (SH.D.lands.first_lots || []).map(l => l.lot); press(document.querySelector('[data-act="land"][data-op="list"]')); G.LAND.open(ids[Math.floor(rnd() * ids.length)]);   // 땅 창 눌러 보기
            for (let k = 0; k < 2; k++) press(any('#ovl .landbox [data-op]:not(.dis):not([data-op="close"])')); overlay(''); }
          if (rnd() < 0.1) { press(document.querySelector('[data-act="shop"]')); press(any('[data-item-id]:not([data-item-id=""])')); press(document.querySelector('[data-act="shop-buy"]:not(.dis)')); press(document.querySelector('#ovl [data-act="yes"]')); press(document.querySelector('[data-act="shop-exit"]')); }
          for (let r = 0; r < 3; r++) press(any(rnd() < 0.5 ? '.lp-side [data-lp^="pick"]' : '.lp-mks [data-lp^="pick"]'));
          press(document.querySelector('[data-lp="go"]')); if (G.P === before) press(document.querySelector('[data-lp="go"]'));
        }
        else if (P.t === 'lmarket') {
          for (let r = 0; r < 5; r++) { const b = any('.lp-mkt [data-lp]:not(.dis):not([data-lp="month"])'); press(b); if (document.querySelector('#ovl [data-act="ovl-close"]')) press(document.querySelector('#ovl [data-act="ovl-close"]')); }
          if (!document.querySelector('.lp-mkt #lpchart')) errs.push('장 화면에 값 그림이 없음');
          press(document.querySelector('[data-lp="month"]'));
        }
        else if (P.t === 'shop') { press(any('[data-tab]')); press(any('[data-item-id]:not([data-item-id=""])')); press(document.querySelector('[data-act="shop-buy"]:not(.dis)')); press(document.querySelector('#ovl [data-act="yes"]')); press(document.querySelector('[data-act="shop-exit"]')); }
        else { if (P.t === 'settle' && rnd() < 0.3 && !P.rep.loop && !document.querySelector('.m5-money .ln')) errs.push('결산에 돈 내역 칸이 없음');   // 주 결산 새 배치는 돈 까닭을 늘 펼침(여닫기 없음) · rnd() 는 옛 시험과 같은 차례로 부름(누르기 차례가 바뀌지 않게)
          if (P.t === 'settle' && P.rep.loop) { const sh = document.querySelector('.lp-settle .lp-sheet'); if (!sh || !sh.querySelector('.lp-tbl tr') || !sh.querySelector('[data-next]')) errs.push('달 결산에 돈 내역 · 다음 단추가 없음 ' + SH.dateLabel(G.st)); else if (/NaN|undefined|\[object/.test(sh.textContent)) errs.push('달 결산 글에 NaN · undefined ' + SH.dateLabel(G.st)); }   // 달 결산(돈 고리)도 봄 · rnd() 안 부름(누르기 차례 그대로)
          press(document.querySelector('#ovl [data-next]') || document.querySelector('[data-next]')); }
        if (G.P === before && !document.querySelector('#ovl [data-act="yes"]')) { errs.push(`안 넘어감: ${P.t} ${P.id || ''} ${SH.dateLabel(G.st)}`); break; }
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
