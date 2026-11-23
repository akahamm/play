/* =====================================================================
   loop.js — 돈 고리: 사원부터의 한 달(설계 04_시범/07_재기/정리전_보관/재설계_돈고리_1113.md 2~7절 · 시제품의 셈을 엔진에 옮김 — 시제품은 11-14 은퇴)
   한 달 = loopMonthStart(그 달 것) → 네 주 × [ loopAsk(주 첫머리 loopWeekStart · 지도 물음) → loopAnswer: go = loopDo(자유 시간 한 칸) · end = loopWeek(한 주 지남) · skip = 남은 주 모두 · 사이에 loopBuy · loopSell · loopOrder ] → loopSettle(결산)
   (11-15 사원 뒤 지도 중심 — 그 앞은 '지도에서 두 칸 → 장 4주 → 결산' · 기획 04_시범/07_재기/정리전_보관/사원뒤_지도중심_기획_1115.html)
   - 숫자는 자료 data/loop_numbers.json 의 N 한 곳(원본 04_시범/게임_숫자.json 의 loop — 11-15 전엔 js/rules/numbers.js) · 종목은 data/stocks.json
   - 상태는 st.L 한 덩어리(순수한 자료 — 저장됨) · 현금은 st.s.money · 능력치 · 호감 · 직급은 엔진 것을 그대로 씀
   - 시장 사건은 플레이어와 무관하게 생김(시장 씨앗 L.mr) · 사람 · 소견 · 감사는 따로(L.pr)
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const N = SH.LOOP_N = root.GAME_DATA.loop_numbers.N, PN = N.proto;   /* 자료 묶음(data/bundle.js)이 엔진보다 먼저 실리므로 실릴 때 한 번 잡음 · 화면(ui/loop.js) · 시험 도구는 SH.LOOP_N */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = SH.mul32;   // (L, k) — 씨앗 L[k]
  const gauss = (L) => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(L, 'mr'); return (u - 3) / 0.7071; };
  const between = (L, k, a) => a[0] + rnd(L, k) * (a[1] - a[0]);
  const eraAt = (m) => { let e = N.eras[0]; for (const x of N.eras) if (m >= x[0]) e = x; return e; };
  const mIdx = (date) => { const p = String(date).split('-'); return (+p[0] - 1995) * 12 + (+p[1] - 6); };
  SH.loopM = (st) => mIdx(st.date);

  /* ── 종목 표: 자료의 종목 표 한 곳(data/stocks.json · 원본 04_시범/게임_숫자.json 의 stocks) — 종목 하나 = 한 줄(id · 업종 · 이름 · 시작 값 · 흔들림 · 상장 달 · 사건 · 코스닥) · 차례가 곧 번호 i ── */
  SH.loopStocks = function () {
    if (SH._stk) return SH._stk;
    return (SH._stk = SH.D.stocks.items.map((d, i) => Object.assign({ id: d.id, i, ko: d.name_ko, sec: d.sector_ko, vol: d.vol, tech: d.tech }, d.kosdaq ? { kq: 1 } : {},
      { base: d.start_price, from: d.event ? 'event' : d.listed ? mIdx(d.listed) : 0 })));      /* 코스닥(kq) — 크게 뛰고 상장폐지 위험 */
  };
  const liveAt = (L, s, m) => !(L.dead && L.dead[s.id]) && (s.from === 'event' ? !!L.open[s.id] : m >= s.from);
  const ymOf = (m) => `${1995 + Math.floor((5 + m) / 12)}-${String((5 + m) % 12 + 1).padStart(2, '0')}`;
  const capOf = (L, s) => (s.kq || s.id === 'deoksan' || s.id === 'cheongwoon_net' ? PN.era.cap_small : PN.era.cap) * L.px[s.i] / s.base;      /* 어림 시가총액 */
  SH.loopLive = (st) => { const L = st.L, m = Math.max(0, SH.loopM(st)); return SH.loopStocks().filter(s => liveAt(L, s, m)).map(s => s.i); };
  SH.loopName = (i) => SH.loopStocks()[i].ko;
  SH.loopUnlock = function (st, id) { const L = SH.loopInit(st), s = SH.loopStocks().find(x => x.id === id); if (!s || L.open[id]) return; L.open[id] = true; L.px[s.i] = s.base; L.pxh[s.i] = [s.base]; SH.toast(st, `새 종목 — ${s.ko}`); };

  /* ── 사람 넷: 무슨 얘기를 들고 오나 · 어디서 만나나 ── */
  /* 윤세라는 청운그룹 종목 얘기만 들고 옴(설계 8절 '양날' — 그 얘기로 사면 내부자 거래) */
  const PPL = () => TX().PEOPLE;   /* 원본 = 04_시범/대사/만남_줄.json 의 PEOPLE(사람 · 들고 오는 얘기 종류 · 만나는 곳 · only = 그 종목 id 꼴만) */
  Object.defineProperty(SH, 'LOOP_PPL', { get: () => PPL(), configurable: true });
  const KIND = new Proxy({}, { get: (_, k) => TX().KIND[k] });   /* 소문 종류 이름 · 신문 · 결과 글 — 원본 04_시범/대사/만남_줄.json 의 KIND */
  Object.defineProperty(SH, 'LOOP_KIND', { get: () => TX().KIND, configurable: true });

  /* ── 돈 · 직급 ── */
  const cash = (st, d, why) => { d = Math.round(d); if (!d) return; st.s.money += d; SH.whyAdd(st, d, why); };   /* 주식 사고팔기는 '번 돈'(income)으로 세지 않음 */
  const scash = (st, d, why) => { cash(st, d, why); if (st.L && st.L.mon) st.L.mon.flow = (st.L.mon.flow || 0) + Math.round(d); };      /* 주식 · 신용으로 오간 돈 — 달 중간에 가게 · 땅 · 약속에 쓴 돈과 갈라 셈(내 수익률) */
  const ri = (st) => SH.RANK_ORDER.indexOf(st.rank) - 1;
  SH.loopDeleg = (st) => SH.RANK_ORDER.indexOf(st.rank) - 1 >= 3;      /* 차장부터 부하에게 돌보기를 맡김 */                 /* 사원 0 … 대표 6 · 인턴 −1 · 독립 · 무직 −2 */
  const rankRow = (rid) => N.ranks.find(r => r.id === rid) || null;   /* 숫자 표의 직급 줄은 id 로(차례 번호로 짚지 않음) */
  SH.loopRank = (st) => rankRow(st.rank);
  SH.loopAum = (st) => { if (st.rank === 'founder') return Math.max(0, Math.round(st.funds.aum || 0)); const R = SH.loopRank(st); return R && st.L ? Math.round(R.aum * st.L.aumK) : 0; };      /* 독립하면 내 운용사의 운용 자산이 따라 삼 */
  const stockV = SH.loopStockV = (st) => { const L = st.L; return L ? Object.keys(L.pos).reduce((t, i) => t + L.pos[i] * L.px[i], 0) : 0; };
  const equity = SH.loopEquity = (st) => st.s.money + stockV(st) - (st.L ? st.L.debt : 0);
  const landNet = (st) => { if (!st.land || !SH.landSellValue) return 0; return Object.keys(st.land.lots).reduce((t, id) => t + SH.landSellValue(st, id), 0) - SH.landLoan(st); };
  const worth = SH.loopWorth = (st) => equity(st) + landNet(st) + (st.rank === 'founder' ? Math.max(0, st.funds.firm_cash || 0) : 0);      /* 독립하면 회사에 넣은 돈도 내 재산 */
  SH.loopCan = function (st, what) {
    const L = st.L; if (!L) return false;
    if (what === 'order') return L.n >= PN.unlock.order;
    if (what === 'opinion') return L.n >= PN.unlock.opinion;
    if (what === 'credit') return (ri(st) >= 1 || st.rank === 'founder') && !(L.noLev > SH.loopM(st));
    if (what === 'client') return SH.loopAum(st) > 0;
    return true;
  };
  SH.loopRoom = (st, credit) => Math.max(0, st.s.money) + (credit && SH.loopCan(st, 'credit') ? Math.max(0, equity(st) * (N.leverage - 1) - st.L.debt) : 0);
  SH.loopMargin = (st) => { const pv = stockV(st), L = st.L; return L && L.debt > 0 && pv > 0 ? (pv - L.debt) / pv : null; };
  SH.loopLover = (st) => (st.love && st.rel[st.love.who] && !st.rel[st.love.who].q) ? st.love.who : null;      /* 연인 효과는 다툼 중엔 꺼짐 */
  const LOVE_LV = () => TX().LOVE_LV;   /* 연인 단계 이름 — 원본 만남_줄.json 의 LOVE_LV(0 = 연인 아님 · 빈 칸) */
  SH.loopLoveKo = (st) => st.love ? LOVE_LV()[st.love.lv] : '';
  SH.loopAcc = function (st, kind) {
    const fog = st.s.stress >= N.stress.fog;
    return Math.min(PN.acc_cap, Math.max(0.5, N.opinion[0] + (N.opinion[1] - N.opinion[0]) * st.s.analysis / 100 - (fog ? N.fog_pen : 0)) + (kind === 'earn' && SH.loopLover(st) === 'analyst' ? PN.lover.analyst.acc * (st.love.lv >= 2 ? PN.love.deep_mult : 1) : 0));
  };
  SH.loopCalm = (st) => Math.round(clamp(st.s.talk / SH.R.loop_calm_talk_div, 0, 1) * 100);
  SH.loopStar = (p) => '★'.repeat(Math.round(p * 5)) + '☆'.repeat(5 - Math.round(p * 5));
  const scene = (st) => { st.L.lastScene = SH.loopM(st); };
  const evOf = (L, eid) => L.events.find(e => e.eid === eid);

  /* ── 시장: 사건 생김 · 한 주 움직임(모의 실험과 같은 식 · 작전 종목은 r2.js 의 흐름이 덮어씀) ── */
  function spawn(L, m, k, bw) {      /* k = 확률에 곱하는 몫(주마다 부르면 달 확률의 한 주 몫) · bw = 태어난 주(그 주에만 사람들이 들고 옴) */
    const live = SH.loopStocks().filter(s => liveAt(L, s, Math.max(0, m)));
    Object.keys(N.ev).forEach(kind => { const E = N.ev[kind]; if (rnd(L, 'mr') >= E.q * (k == null ? 1 : k)) return; const h = Math.round(between(L, 'mr', E.h));
      L.events.push({ eid: ++L.eseq, kind, id: live[(rnd(L, 'mr') * live.length) | 0].i, real: rnd(L, 'mr') < E.real, mag: between(L, 'mr', E.m), h, age: 0, lag: (rnd(L, 'mr') * 3) | 0, crash: E.crash || 0, born: m, bw: bw == null ? -1 : bw, gap: (rnd(L, 'mr') * h) | 0, state: null }); });
  }
  /* 소문 한 달 치가 한 종목 값에 더하는 몫의 어림(% · 주간 더하기를 그냥 합친 값 — 실제 값은 주마다 곱해져서 이것과 꼭 같지 않음). 얼마나 뺄지는 숫자 파일의 ev_neutral 로 맞춤(로봇 IDX=1 로 잰 '끝 값 ÷ 처음 값'이 시대 표와 비슷해지게) */
  const EV_BIAS = Object.keys(N.ev).reduce((a, k) => { const E = N.ev[k], mag = (E.m[0] + E.m[1]) / 2; return a + E.q * (E.real * mag * (1 - (E.crash || 0)) + (1 - E.real) * mag * N.fake_move); }, 0);
  function h01(a, b) { let x = (a ^ Math.imul(b + 1, 0x9E3779B1)) >>> 0; x = Math.imul(x ^ (x >>> 15), 0x85EBCA6B) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
  function marketWeek(L, m) {
    const era = eraAt(Math.max(0, m)), mm = Math.max(0, m), ym = `${1995 + Math.floor((5 + mm) / 12)}-${String((5 + mm) % 12 + 1).padStart(2, '0')}`;
    const nLive = Math.max(1, SH.loopStocks().filter(s => liveAt(L, s, mm)).length), evBias = EV_BIAS * (N.ev_neutral || 0);
    SH.loopStocks().forEach(s => { const i = s.i; if (!liveAt(L, s, mm)) return;
      let sp = SH.SPECIAL_DRIFT ? SH.SPECIAL_DRIFT(s.id, ym) : null;
      if (sp != null && L.sp0 != null) { const u = h01(L.sp0, mm * 7 + i), u2 = h01(L.sp0 ^ 0x5bd1e995, mm * 7 + i);      /* 달력에 박힌 흐름을 외워서 타지 못하게: 달마다 세기가 다르고(판마다 다름) · 크게 오르는 구간엔 다섯 달에 한 번 털림 · 꺾이는 첫 달은 셋에 한 번 한 달 늦음 */
        if (sp >= SH.R.loop_sp_big) sp = u2 < SH.R.loop_sp_big_drop_p ? SH.R.loop_sp_big_drop : sp * (SH.R.loop_sp_big_keep + u); else if (sp > 0) sp = sp * (SH.R.loop_sp_up_keep + u); else sp = (ym === SH.R.loop_sp_bounce_ym && u2 < SH.R.loop_sp_bounce_p) ? SH.R.loop_sp_bounce : sp * (SH.R.loop_sp_down_keep + SH.R.loop_sp_down_span * u); }
      let r = ((sp != null ? sp : (s.tech && era[2] != null ? era[2] : era[1])) - evBias / nLive) / 4 + gauss(L) * s.vol;
      L.events.forEach(e => { if (e.id !== i) return; const dil = 1 / (1 + (L.pos[i] || 0) * L.px[i] / N.liquidity);
        if (e.real) { if (e.age < e.h) r += e.mag / e.h * dil; else if (e.crash && e.age === e.h + e.lag) r -= e.mag * e.crash; }
        else if (e.age < e.gap) r += e.mag * 0.1; else if (e.age === e.gap) r += e.mag * (N.fake_move - 0.1 * e.gap); });
      L.px[i] = Math.max(1, Math.round(L.px[i] * (1 + r / 100))); });
    L.events.forEach(e => { e.age++;
      if (e.real) { if (e.age === e.h) e.state = 'real'; if (e.crash && e.age === e.h + e.lag + 1) e.state = 'dump'; }
      else if (e.age === e.gap + 1) e.state = 'fake'; });
    L.pxh.forEach((h, i) => { if (!h.length && !liveAt(L, SH.loopStocks()[i], mm)) return; h.push(L.px[i]); if (h.length > 13) h.shift(); });
  }

  /* ── 처음 한 번(정규직이 되어 내 돈 계좌가 열릴 때) ── */
  SH.loopInit = function (st) {
    if (st.L) return st.L;
    const T = SH.loopStocks(), m = SH.loopM(st);
    const L = st.L = { v: 1, sp0: (st.seed ^ 0x3C6EF372) | 0, mr: (st.seed ^ 0x51ED270B) | 0, pr: (st.seed ^ 0x2545F491) | 0, n: 0, week: 0, px: T.map(s => s.base), pxh: T.map(() => []), pos: {}, cost: {}, ord: {}, clEx: {}, src: {}, open: {},
      debt: 0, events: [], known: [], eseq: 0, aumK: 1, noCare: 0, hist: [], rankSeen: st.rank, noLev: 0, wiped: 0, forced: 0, caught: 0, peak: 0, lastScene: m,
      heard: 0, hit: 0, miss: 0, track: [], pool: null, mon: null, b0: null, down: false, usedInside: false, clCap: null, told: {} };
    [m - 3, m - 2, m - 1].forEach(x => { spawn(L, x); for (let w = 0; w < 4; w++) marketWeek(L, x); L.events = L.events.filter(e => e.age < e.h + 5); });
    L.peak = worth(st); L.track.push([m - 1, worth(st)]);
    return L;
  };
  SH.stocksOpen = SH.loopInit;      /* 옛 이름(진급 · 카드가 부름) — 이제 돈 고리 계좌를 엶 */
  SH.cashRatio = function (st, acct) { const sv = stockV(st), c = Math.max(0, st.s.money); return sv + c ? c / (sv + c) : 1; };
  SH.setCashRatio = function (st, acct, r) {   /* 카드가 시킴: 현금 비중을 r 까지 — 가진 주식을 고르게 팖 */
    const L = st.L; if (!L) return;
    if (acct === 'co') { L.clCap = { max: clamp(1 - r, 0, 1), until: SH.loopM(st) + 3 }; return; }      /* 회사(고객) 돈: 석 달 동안 주식에 들어가는 몫의 천장 — 내 주식은 안 건드림 */
    const sv = stockV(st), c = Math.max(0, st.s.money), total = sv + c; if (!total || c / total >= r) return;
    const f = clamp((r * total - c) / sv, 0, 1); Object.keys(L.pos).forEach(i => SH.loopSell(st, +i, f, '윗선 지시'));
  };

  /* ── 달 첫머리 · 주 첫머리: 지도에 뜨는 것 ── */
  // 지금 나올 수 있는 '찾아가면 나오는 장면' 카드 모두(달 고리엔 칸 · 요일이 없으므로 카드에 적힌 칸 · 요일 · 장소를 그대로 대 봄) → 누구 것인지로 지도에 얹음
  const DAYCTX = (d) => d == null ? '평일' : (d === '토' || d === '일') ? d : d === '주말' ? '토' : d === '금' ? '금' : '평일';
  SH.loopCards = function (st) {
    return SH.EVENTS.filter(ev => { const w = ev.when || {}; return ev.trigger === 'enter' && !SH.CODE_CALLED.has(ev.id) && SH.cardFree(st, ev)
      && SH.whenOk(st, ev, { phase: 'slot', slot: w.slot, day: DAYCTX(w.day), place: w.place }) && SH.reqOk(st, ev.requires); }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  };
  const cardTarget = (ev) => { const who = PPL().map(p => p.cid).concat('client'); return (ev.who || []).find(c => who.includes(c)) || null; };   /* 지도에 사람 칸이 있는 이들 + 고객 */
  /* 달 첫머리: 그 달 안에 한 번 하는 것(고객 · 공부 · 급매 · 약속 · 장면 · 연인 일 · 표결)을 뽑아 둠 — 주가 바뀌어도 할 때까지 지도에 남음 · 사람 얘기는 주마다(loopWeekStart) */
  SH.loopMonthStart = function (st) {
    const L = SH.loopInit(st), m = SH.loopM(st);
    if (L.monTick === st.tick) return L;      /* 같은 달에 두 번 부르면 그대로(물음을 다시 낼 때) */
    L.monTick = st.tick;
    { const T = SH.loopStocks(); while (L.px.length < T.length) { L.px.push(T[L.px.length].base); L.pxh.push([]); } L.dead = L.dead || {}; L.own = L.own || {}; if (L.sp0 == null) L.sp0 = (st.seed ^ 0x3C6EF372) | 0; Object.keys(L.clEx || {}).forEach(i => { if (L.clEx[i] === true) L.clEx[i] = L.pos[i] || 0; }); }      /* 종목이 늘어난 판(코스닥) — 옛 상태에 칸을 채움 */
    if (L.rankSeen !== st.rank) { L.rankSeen = st.rank; L.hist = []; }
    const P = () => rnd(L, 'pr'), T = SH.loopStocks(), mp = [];
    L.loveNote = loveStart(st, m);
    const people = peopleNow(st);
    if (SH.loopCan(st, 'client') && P() < SH.R.loop_client_show_p) mp.push({ t: 'client' });
    if (P() < SH.R.loop_study_show_p) mp.push({ t: 'study', k: ['analysis', 'network', 'talk'][(P() * 3) | 0] });
    SH.R.loop_month_acts.forEach(x => { if (SH.PL[x.place] && SH.isOpen(st, x.place)) mp.push({ t: 'act', a: x.a, place: x.place }); });      /* 인턴의 '내가 하는 일'(운동 · 술자리 · 점심) — 달마다 늘(11-18 대표님 '가') */
    if (SH.landOpen && SH.landOpen(st) && ((SH.D.lands || {}).first_lots || []).some(d => !SH.landState(st).lots[d.lot]) && P() < SH.R.loop_landdeal_p) mp.push({ t: 'landdeal' });      /* 급매 땅 — 그 달만 싸게 */
    /* 약속(데이트 사다리)과 장면이 기다리는 사람 · 곳 — 그 달에만 나오는 장면을 지도에서 놓치지 않게 */
    SH.romanceIds().forEach(c => { const nd = SH.nextDate(st, c); if (nd && nd.ready) mp.push({ t: 'date', who: c, ev: nd.ev.id }); });
    const used = {}; SH.loopCards(st).forEach(ev => { const c = cardTarget(ev), key = c || (ev.when || {}).place; if (used[key]) return; used[key] = 1;
      if (c === 'client') { const o = mp.find(x => x.t === 'client'); if (o) o.card = ev.id; else mp.push({ t: 'client', card: ev.id }); }
      else if (c) { const o = mp.find(x => x.t === 'person' && x.who === c); if (o) o.card = ev.id; else mp.push({ t: 'person', who: c, eid: null, card: ev.id }); }
      else mp.push({ t: 'place', place: (ev.when || {}).place, ev: ev.id }); });
    /* 연인: 약속(기한 = 이 달) · 다툼이면 달래기 · 헤어진 뒤 한 번 다시 찾아가기 */
    const V = st.love, LV = PN.love;
    if (V && st.rel[V.who].q) mp.push({ t: 'makeup', who: V.who });
    else if (V && m >= V.nextAsk && !mp.some(o => o.t === 'date' && o.who === V.who)) mp.push({ t: 'date', who: V.who, lover: 1, ev: null });
    else if (V) mp.forEach(o => { if (o.t === 'date' && o.who === V.who) o.lover = 1; });
    if (!V && st.ex && !st.ex.used && m - st.ex.m <= LV.reunite_within && st.rel[st.ex.who].aff >= LV.reunite_aff) mp.push({ t: 'reunite', who: st.ex.who });
    if (V && V.trial === m) mp.push({ t: 'trial', who: V.who });      /* 연인의 고비(8절) — 그 달에만 */
    if (SH.ym(st.date).m === PN.era.vote.month && ymOf(m) >= PN.era.own_from) { const s = T.find(s => !L.dead[s.id] && L.own[s.id] && (L.pos[s.i] || 0) * L.px[s.i] >= capOf(L, s) * PN.era.own_pct);      /* 공시된 5% 주주만(막 사서 표결하고 바로 파는 틈을 막음 — 공시된 몫은 팔 때 값이 먼저 빠짐) */ if (s) mp.push({ t: 'vote', id: s.i, side: 'for' }, { t: 'vote', id: s.i, side: 'against' }); }      /* 3월 주주총회 — 5% 넘게 든 종목이 있으면 */
    L.mpool = mp; L.week = 0; L.usedInside = false; L.wkOf = null; L.used = 0; L.news = null; L.restDone = 0;
    L.mon = { flow: 0, pnl: {}, src: {}, heard: [], done: [], forced: 0, lines: [], news: [] };
    const hd = TX().HEAD.find(h => h[0] === m); if (hd) L.mon.news.push({ k: 'head', s: hd[1] });
    L.down = st.s.stress >= N.stress.down || !!(st.wk && st.wk.rest);
    if (L.down && st.s.stress >= N.stress.down) { st.s.stress = SH.R.loop_down_stress_after; scene(st); }
    L.lost = Math.min(2, (st.wk && st.wk.lost) || 0) + (st.wk && st.wk.rest ? 2 : 0);      /* 쓰러진 다음 달 · 번아웃: 행동력을 쉼에 뺏김 */
    apFill(st);      /* 행동력: 달 첫머리에 가득 참 · 남으면 그 달로 끝(11-17 턴제) */
    SH.loopWeekStart(st);
    return L;
  };
  /* 주 첫머리: 이번 주에 생긴 소문을 사람들이 들고 옴 → 지도에 뜨는 것(L.pool) = 그 달 것 가운데 아직 안 한 것 + 이번 주 사람 + 쉼 */
  SH.loopWeekStart = function (st) {
    const L = st.L, m = SH.loopM(st), key = st.tick * 4 + L.week;
    if (L.wkOf === key) return L;
    L.wkOf = key; L.used = 0;
    if (L.week === 0) spawn(L, m, 1, key);      /* 한 달 치 소문을 달 첫머리에 — 행동은 달 첫머리에만 함(11-17 턴제 · 전엔 주마다 한 달 치의 네 몫) */
    const fresh = L.events.filter(e => e.bw === key), P = () => rnd(L, 'pr'), mp = L.mpool, left = mp.filter(o => !o.done);
    const nOpp = Math.round(N.opp_n[0] + (N.opp_n[1] - N.opp_n[0]) * clamp(st.s.network, 0, 100) / 100); let pool = [];
    const people = peopleNow(st);
    const T = SH.loopStocks(), told = {};      /* 한 사건은 한 사람만 들고 옴 */
    people.forEach(p => { const r = st.rel[p.cid], close = SH.CH[p.cid].group === 'romance' && r.st >= 3 && !r.q;      /* 썸부터는 달마다 시간을 내 줌(지도에서 안 빠짐) */
      if (P() < SH.R.loop_person_show_p || close) { const e = fresh.find(x => x.kind === p.kind && !told[x.eid] && (!p.only || new RegExp(p.only).test(T[x.id].id))), q = (N.story[0] + (N.story[1] - N.story[0]) * r.aff / 100) * (r.met === st.tick - 1 || r.met === st.tick ? N.repeat_pen : 1); const eid = e && P() < q ? e.eid : null; if (eid) told[eid] = 1; pool.push({ t: 'person', who: p.cid, eid, keep: close ? 1 : 0 }); } });
    if (m - L.lastScene >= SH.R.loop_pity_after && !pool.some(o => o.eid)) { const pp = people[(P() * Math.min(SH.R.loop_pity_pick_n, people.length)) | 0], e = fresh.find(x => x.kind === pp.kind); pool = pool.filter(o => o.who !== pp.cid); pool.unshift({ t: 'person', who: pp.cid, eid: e ? e.eid : null, pity: 1, keep: 1 }); }      /* 먼저 찾아온 사람은 지도에서 안 빠짐(새 눈 검토 19) */
    const ppl = left.filter(o => !SELF_T[o.t]).length;      /* 칸 수 상한(인맥으로 3 ~ 5)은 사람 · 장면 칸만 셈 — 내가 하는 일 · 쉼 · 공부 · 급매 땅은 안 셈(11-18: 함께 세어 사람 칸이 다 잘려 윤세라 등이 거의 안 떴음) */
    for (let g = 0; g < 20 && pool.length + ppl > nOpp; g++) { const i = (P() * pool.length) | 0; if (!pool.length) break; if (!pool[i].keep) pool.splice(i, 1); }
    while (pool.length + left.length < SH.R.loop_pool_min) { const absent = people.filter(p => !pool.some(o => o.who === p.cid)), noStudy = !mp.some(o => o.t === 'study');
      if (noStudy && (!absent.length || P() < SH.R.loop_pool_fill_study_p)) { const o = { t: 'study', k: ['analysis', 'network', 'talk'][(P() * 3) | 0] }; mp.push(o); left.push(o); }
      else if (absent.length) pool.push({ t: 'person', who: absent[(P() * absent.length) | 0].cid, eid: null });
      else break; }
    /* 그 달 것 가운데 사람 장면은 이번 주에 뜬 그 사람 줄에 얹음(같은 사람이 두 줄로 안 뜨게) */
    left.forEach(o => { const w = o.t === 'person' ? pool.find(x => x.who === o.who) : null; if (w) { w.card = o.card; w.keep = 1; w.mi = mp.indexOf(o); } else { o.mi = mp.indexOf(o); pool.push(o); } });
    if (SH.loopLover(st) === 'reporter') { const e = fresh.find(x => x.kind === 'news'); if (e && !pool.some(o => o.eid === e.eid)) { note(st, e, 'reporter'); L.mon.lines.push(SH.fillKeys(SX().LEDGER.reporter, { nm: SH.name('reporter'), stock: SH.loopName(e.id) })); } }
    if (!L.restDone) pool.push({ t: 'rest' });
    L.pool = pool;
    return L;
  };
  /* 만남 · 연인 · 시대 대사 표(LOVE_TXT · TRIAL · VOTE_TXT · MEET_TELL · MEET_NONE · NARR · ERA_TELL · ERA_NONE · MEET_OPEN · MEET_END · REP_LOVE_T · REP_LOVE_N · SEASON)
     원본 = 04_시범/대사/만남_줄.json → build_data.py → 묶음 loop_lines · 쓰는 때 SH.D 에서 읽음(fetch 로 읽는 판에서도 늦게 채워지니까) */
  /* 주인공 이름 자리표({hero} · {name} · {family})는 표를 처음 읽을 때 한 번 채움(SH.fillHero) — {s} · {rk} 와 알림 자리표는 쓰는 자리에서 */
  const heroAll = (v) => typeof v === 'string' ? SH.fillHero(v) : Array.isArray(v) ? v.map(heroAll) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, heroAll(x)])) : v;
  const heroCache = new Map(), heroed = (d) => { if (!heroCache.has(d)) heroCache.set(d, heroAll(d)); return heroCache.get(d); };
  const TX = () => heroed(SH.D.loop_lines);
  const fillS = (t, s) => SH.fillWord(t, 's', s);   /* {s} = 종목 이름 · 뒤에 붙은 '이/가' 같은 조사 꼴은 받침에 맞춰(받는 꼴은 data.js SH.JOSA) */
  const LT = (c, k) => (TX().LOVE_TXT[c] || {})[k] || '';
  /* 연인의 고비(8절 '단계마다 같이 가는 목표 하나 — 그 사람 일의 고비') — 세라의 고비는 세라 루트 카드가 맡음 */
  Object.defineProperty(SH, 'LOOP_TRIAL', { get: () => TX().TRIAL, configurable: true });   /* 화면(ui/loop.js)이 장소 · 이름을 읽음 */
  /* ── 연인 단계(설계 8절): 사귀는 중 → 깊어짐 → 함께 · 약속 기한 · 다툼 · 헤어짐 · 되돌림 ── 월초에 한 번 굴리고 알릴 것을 돌려줌 */
  function loveStart(st, m) {
    const LV = PN.love, out = [], top = (c) => SH.stages(c).length - 1, now = SH.romanceIds().filter(c => st.rel[c].st >= top(c));
    const say = (title, text, kind) => out.push({ t: 'notice', title, text, kind: kind || 'love' });
    let V = st.love;
    if (V && st.rel[V.who].st < top(V.who)) V = st.love = null;                       /* 카드가 단계를 내렸으면 따라감 */
    const other = now.find(c => !V || c !== V.who);
    if (!V && now.length) V = st.love = { who: now[0], lv: 1, since: m, dates: 0, miss: 0, nextAsk: m + 1, cold: 0, asked: -1 };
    else if (V && other) {                                                          /* 연인은 한 명 — 다른 사람과 연인이 되면 먼저 사람과는 끝 */
      const old = V.who; breakUp(st, old, m); say(SH.fillKeys(TX().LOVE_NOTE.switch[0], { old: SH.name(old) }), SH.fillKeys(TX().LOVE_NOTE.switch[1], { other: SH.name(other), old: SH.name(old) }), 'warn'); SH.addStat(st, 'rep', SH.R.loop_love_switch_rep);
      V = st.love = { who: other, lv: 1, since: m, dates: 0, miss: 0, nextAsk: m + 1, cold: 0, asked: -1 };
    }
    if (!V) return out;
    const r = st.rel[V.who], nm = SH.name(V.who);
    if (V.asked === m - 1 && !V.kept) {                                             /* 지난달 약속을 놓침 */
      V.miss++; SH.addAff(st, V.who, LV.miss_aff);
      if (V.miss >= LV.miss_quarrel && !r.q) { r.q = true; V.cold = 0; say(SH.fillKeys(TX().LOVE_NOTE.quarrel[0], { nm: nm }), SH.fillKeys(TX().LOVE_NOTE.quarrel[1], { nm: nm }), 'warn'); }
      else say(SH.fillKeys(TX().LOVE_NOTE.miss[0], { nm: nm }), SH.fillKeys(TX().LOVE_NOTE.miss[1], { line: LT(V.who, 'miss'), aff: LV.miss_aff }), 'warn');
    }
    V.kept = false;
    { const tr = V.lv === 1 && TX().TRIAL[V.who] && !st.flags['trial_' + V.who];      /* 고비를 놓친 셈은 호감과 상관없이(새 눈 검토 20 B-6) */
      if (tr && V.trial === m - 1) { SH.addAff(st, V.who, SH.R.loop_trial_miss_aff); V.trialNext = m + SH.R.loop_trial_retry_after; V.trialMissed = 1; say(SH.fillKeys(TX().LOVE_NOTE.alone[0], { nm: nm }), SH.fillKeys(TX().LOVE_NOTE.alone[1], { nm: nm, aff: -SH.R.loop_trial_miss_aff }), 'warn'); } }
    if (r.q) { V.cold++; SH.addAff(st, V.who, LV.cold_aff);
      if (V.cold > LV.cold_break) { const bye = LT(V.who, 'bye'); breakUp(st, V.who, m); say(SH.fillKeys(TX().LOVE_NOTE.bye[0], { nm: nm }), SH.fillKeys(TX().LOVE_NOTE.bye[1], { line: bye }), 'warn'); return out; } }
    else if (V.lv === 1 && TX().TRIAL[V.who] && !st.flags['trial_' + V.who]) {      /* 깊어지기 전에 그 사람 일의 고비 하나 — 지도에 그 달만 뜸 · 안 가면 석 달 뒤에 다시(한 번 놓친 뒤엔 호감 문턱을 15 낮춰 꼭 다시 물음) */
      if (m - V.since >= LV.deep.months && V.dates >= LV.deep.dates && r.aff >= LV.deep.aff - (V.trialMissed ? SH.R.loop_trial_retry_aff_drop : 0) && !(V.trialNext > m) && V.trial !== m - 1) { V.trial = m; say(SH.fillKeys(TX().LOVE_NOTE.trial[0], { nm: nm, trial: TX().TRIAL[V.who].ko }), SH.fillKeys(TX().LOVE_NOTE.trial[1], { ask: TX().TRIAL[V.who].ask, nm: nm, trial: TX().TRIAL[V.who].ko })); } }
    else if (V.lv === 1 && m - V.since >= LV.deep.months && V.dates >= LV.deep.dates && r.aff >= LV.deep.aff) { V.lv = 2; scene(st); SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.love_deep, { nm: nm }); say(SH.fillKeys(TX().LOVE_NOTE.deep[0], { nm: nm }), SH.fillKeys(TX().LOVE_NOTE.deep[1], { line: LT(V.who, 'deep'), months: m - V.since, dates: V.dates, nm: nm })); }
    else if (V.lv === 2 && m - V.since >= LV.home.months && V.dates >= LV.home.dates && hasHome(st)) { V.lv = 3; scene(st); SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.love_home, { nm: nm }); say(SH.fillKeys(TX().LOVE_NOTE.home[0], { nm: nm }), SH.fillKeys(TX().LOVE_NOTE.home[1], { line: LT(V.who, 'home'), nm: nm })); }
    if (m >= V.nextAsk && !r.q) V.asked = m;
    return out;
  }
  /* 쉼은 내 집에서(11-18 대표님 '사원부터는 선택지에 자취방이 안 뜸' — 전엔 한강 둔치) · 집을 샀으면 아파트 */
  SH.loopRestPlace = (st) => hasHome(st) && SH.PL.apartment ? 'apartment' : 'home_studio';
  const hasHome = (st) => { const h = SH.item(st.equip.home); return !!((h && h.slot === 'home' && h.tier > 0) || (st.land && Object.keys(st.land.lots).length)); };
  function breakUp(st, c, m) { const r = st.rel[c], top = SH.stages(c).length - 1; r.st = Math.max(1, top - 1); r.aff = Math.min(r.aff, SH.R.loop_breakup_aff_cap); r.q = false; delete st.flags['confessed_' + c]; st.flags['broke_' + c] = st.tick + 1; if (!st.ex || st.ex.who !== c) st.ex = { who: c, m, used: false }; else st.ex.m = m; if (st.love && st.love.who === c) st.love = null; }
  /* 한 판에 한 번만 보이는 것(첫 지도 손가락 안내 등)을 처음 볼 때 참 — 본 표시는 L.told(저장에 남음) */
  SH.loopFirst = (st, k) => { const L = st.L; if (!L || L.told[k]) return false; L.told[k] = 1; return true; };
  /* 달이 바뀔 때 새로 열리는 것 알림(한 번씩) */
  SH.loopIntro = function (st) {
    const L = st.L, out = [], tell = (k, title, text) => { if (L.told[k]) return; L.told[k] = 1; out.push({ t: 'notice', title, text, kind: 'unlock' }); };   /* 'act' 는 막 제목(화면 전체) — 새로 열린 것 알림은 'unlock'(11-18) · 내 돈 계좌 알림은 사원 명함 장면이 대신함 */
    if (L.n >= PN.unlock.order) tell('order', SX().NOTICE.order[0], SX().NOTICE.order[1]);
    if (L.n >= PN.unlock.opinion) tell('opinion', SX().NOTICE.opinion[0], SH.fillKeys(SX().NOTICE.opinion[1], { acc: Math.round(SH.loopAcc(st) * 100), fog: N.stress.fog }));
    if (ri(st) >= 3) tell('deleg', SX().NOTICE.deleg[0], SX().NOTICE.deleg[1]);
    if (L.down) out.push({ t: 'notice', title: SX().NOTICE.down[0], text: SX().NOTICE.down[1], kind: 'warn' });
    return (L.loveNote || []).concat(out);
  };
  /* 소문을 수첩에 적음 — 별 = 출처 종류의 믿음도 · 소견은 따로(맞을 확률 acc) */
  function note(st, e, who) {
    const L = st.L, acc = SH.loopAcc(st, e.kind), EH = N.ev[e.kind].h, loMin = Math.max(1, EH[0], e.h - SH.R.loop_note_window), loMax = Math.max(loMin, Math.min(e.h, EH[1] - SH.R.loop_note_window)), lo = loMin + ((rnd(L, 'pr') * (loMax - loMin + 1)) | 0);      /* 범위(lo ~ lo+2주) 안 어디서 끝나는지는 모름 — 창은 그 종류의 기간(예: 실적 2~5주) 안에서만 잡음(새 눈 검토 20 B-9: '5~7주'면 5주로 드러나던 것) */
    const k = { eid: e.eid, id: e.id, kind: e.kind, who, star: N.ev[e.kind].real, says: SH.loopCan(st, 'opinion') ? (rnd(L, 'pr') < acc ? e.real : !e.real) : null, acc, lo, hi: lo + SH.R.loop_note_window,
      mag: Math.max(SH.R.loop_note_mag_min, Math.round(e.mag * (SH.R.loop_note_mag_lo + SH.R.loop_note_mag_span * rnd(L, 'pr')) / SH.R.loop_note_mag_step) * SH.R.loop_note_mag_step), got: SH.loopM(st), gw: SH.loopM(st) * 4 + L.week, state: null, bought: false };
    L.known.push(k); L.mon.heard.push(k.eid); L.heard++; return k;
  }
  /* 카드가 주는 귀띔(effects.hint)은 수첩의 실적 얘기 한 줄로 */
  SH.loopHint = function (st, v, src) {
    const L = SH.loopInit(st), s = SH.loopStocks().find(x => x.id === v.stock); if (!s || !L.mon) return;
    const m = SH.loopM(st), h = SH.R.loop_hint_weeks, e = { eid: ++L.eseq, kind: 'earn', id: s.i, real: v.dir === 'up' && rnd(L, 'pr') < PN.hint_real, mag: SH.R.loop_hint_mag, h, age: 0, lag: 0, crash: 0, born: m, gap: 1, state: null };
    L.events.push(e); note(st, e, (src && src.who && src.who[0]) || 'analyst'); SH.toast(st, `귀띔 — ${s.ko} · 수첩에 적음`);
  };

  /* ── 자유 시간 한 칸(지도에서 하나를 함) → 장면(카드 또는 틀)을 차례로 돌려줌 ── */
  function meetTier(st, c) { const r = st.rel[c], top = SH.stages(c).length - 1; return st.love && st.love.who === c && r.st >= top ? 2 : r.st >= (c === 'exec_oh' ? SH.R.loop_meet_tier_stage_exec_oh : SH.R.loop_meet_tier_stage) ? 1 : 0; }
  function meetOpen(st, c) { const T = TX().MEET_OPEN[c]; if (!T) return null; const t = Math.min(meetTier(st, c), T.length - 1), mo = SH.ym(st.date).m; if (st.L.seasonM !== mo && rnd(st.L, 'pr') < SH.R.loop_season_line_p) { st.L.seasonM = mo; return TX().SEASON[mo][SH.ym(st.date).y % TX().SEASON[mo].length]; }   /* 철 줄은 해마다 돌려 씀(난수를 더 안 씀 — 로봇 숫자 그대로) */ return line(st.L, 'mo' + c + t, T[t]); }
  function meetEnd(st, c, told) { const T = TX().MEET_END[c]; if (!T) return null; const P = T[told ? 0 : 1], t = meetTier(st, c) === 2 && P[1] ? 1 : 0; return line(st.L, 'me' + c + (told ? 't' : 'n') + t, P[t]); }
  const eraKey = (m) => m >= SH.R.loop_era_after_m ? 'after' : m >= SH.R.loop_era_bubble_m ? 'bubble' : m >= SH.R.loop_era_crisis_m ? 'crisis' : null;
  function meetLine(st, kind, c, sid) { if (c === 'reporter' && meetTier(st, c) === 2) return line(st.L, kind + 'rl', kind === 't' ? TX().REP_LOVE_T : TX().REP_LOVE_N);
    const L = st.L, k0 = eraKey(SH.loopM(st)), k = k0 === 'bubble' && kind === 't' && sid != null && !SH.loopStocks()[sid].tech ? null : k0,      /* 닷컴 때 줄(인터넷 사업 · 가입자 수)은 기술주 얘기에만 */ T = kind === 't' ? TX().ERA_TELL : TX().ERA_NONE, base = kind === 't' ? TX().MEET_TELL : TX().MEET_NONE;
    const era = k && T[k][c] && rnd(L, 'pr') < SH.R.loop_era_line_p ? T[k][c] : null; return era ? line(L, kind + k + c, era) : line(L, kind + c, base[c] || TX().MEET_LINE.none); }
  /* 진급 장면 글(PROMO_TXT · 열쇠 = 직급 id) · 고객 항의(CLIENT_ANGRY) · 깡통(WIPED_TXT) · 문턱 장면(GATE · 처음 겪는 달엔 결산 앞에 한 장면 · 두 번째는 '키2')
     원본 = 04_시범/대사/장면_글.json → 묶음 loop_scenes · 줄 꼴과 {rk} · {s} 는 대사/README.md */
  const SX = () => heroed(SH.D.loop_scenes);
  /* 결산 장면의 제목 한 곳 — 장면을 만드는 쪽과 문턱 장면을 고르는 쪽(gateOf)이 같은 표를 읽음
     (11-15: 전엔 제목 글자를 두 곳에 따로 적어, 한쪽 글자만 고치면 문턱 장면이 조용히 안 떴음 · 열쇠 = L.told 의 g_열쇠) */
  const SCENE_T = new Proxy({}, { get: (_, k) => SX().SCENE_T[k], ownKeys: () => Reflect.ownKeys(SX().SCENE_T), getOwnPropertyDescriptor: (_, k) => Object.getOwnPropertyDescriptor(SX().SCENE_T, k) });   /* 열쇠 → 제목 — 원본 장면_글.json 의 SCENE_T(열쇠는 그대로 · 제목만 고침) */
  const tplRe = (t) => new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[a-z_]+\\\}/g, '.*') + '$');   /* 자료 글 꼴 → 그 꼴로 만든 줄을 가리는 정규식(장부 줄을 다시 읽을 때 · 글을 고쳐도 같이 따라감) */
  const SCENE_K = (t) => Object.keys(SCENE_T).find(k => SCENE_T[k] === t) || null;
  Object.defineProperty(SH, 'LOOP_SCENE_T', { get: () => SX().SCENE_T, configurable: true });   // 값 시험이 제목을 바꿔 보며 문턱 장면이 그대로 붙는지 봄 · 글을 자료로 옮길 때의 자리
  const OWN_PRE = () => SCENE_T.own + ' — ';   // 지분 공시 장부 줄의 머리 — 줄을 쓰는 쪽과 결산이 다시 읽는 쪽이 같은 값을 씀
  /* 결산 장면 하나(e)에 붙일 문턱 장면을 고름 — 본 횟수는 L.told 에(g_열쇠 = 1 · 2) */
  function gateOf(st, e, rep) {
    const L = st.L, T = L.told, rk = SH.fillHero('{family} ') + ((SH.RK[st.rank] || {}).name_ko || '선생'), t = e.title;
    const key = SCENE_K(t) || (/^재산 .* 돌파$/.test(t) ? (e.w === 1e8 ? 'w1' : e.w === 1e9 ? 'w10' : 'w100') : null);
    if (!key) return null;
    const n = (T['g_' + key] || 0) + 1;      /* 본 횟수는 여기서 안 올림 — 결산이 숨겨지면 장면도 안 나가므로 flow 가 내보낼 때 올림(새 눈 검토 20 B-3) */
    const g = n === 1 ? SX().GATE[key] : n === 2 ? SX().GATE[key + '2'] : null; if (!g) return null;
    let lines = g.lines.slice();
    if (key === 'wiped') { const c = st.love && !st.rel[st.love.who].q ? st.love.who : null; lines.push(c && g.lover[c] ? g.lover[c] : g.alone); lines = lines.concat(g.tail); }
    if (key === 'angry') lines.push(e.ok ? g.ok : g.fail);
    if (key === 'own') { const r = st.rel.reporter; if (st.love && st.love.who === 'reporter' && !r.q) lines.push(g.rep_lover); else if (r && r.st >= 1) lines.push(g.rep_met); }
    lines = lines.map(s => fillS(s.replace('{rk}', rk), e.stock || '그 종목'));
    return { who: key === 'wiped' && st.love && !st.rel[st.love.who].q ? st.love.who : null, place: key === 'wiped' && hasHome(st) && SH.PL.apartment ? 'apartment' : g.place, lines, cg: g.cg || null, key };
  }
  /* 같은 줄이 연달아 안 나오게 하나 고름 */
  function line(L, key, arr) { L.last = L.last || {}; let i = (rnd(L, 'pr') * arr.length) | 0; if (arr.length > 1 && i === L.last[key]) i = (i + 1) % arr.length; L.last[key] = i; return arr[i]; }
  /* 자유 시간 고르기를 칸 종류별로 나눈 조각들(11-14 밤 정리 E4) — 주사위(rnd · line · scene · SH.meet …) 부르는 차례와 상태 바꾸는 차례는 원래 한 화살표 안의 차례 그대로
     cx = 고르기 한 번의 공용 값 { L · out(장면 줄) · W(이 주 고른 것) · cared(고객을 돌봤나) } */
  /* 처음 만나면 첫 단계를 세움 — 단계가 '모름'(0)이면 호감이 쌓여도 단계가 안 오름(SH.autoStage) · 사람 만남과 고객 돌보기가 같이 씀(11-18 진행 점검: 고객 길에 이것이 없어 김만복 호감 100 · 단계 '모름'으로 뒤 일곱 해 김만복 장면이 안 뜸) */
  function firstHello(st, c) { const r = st.rel[c]; if (!r || r.st >= 1) return false; SH.setStage(st, c, SH.stages(c)[1].name_ko); return true; }
  /* 사람 만남(카드 장면 · 앞뒤 줄 · 소문 한 줄 · 달 상한 만남) */
  function choosePerson(st, o, cx) {
    const { L, out, W } = cx;
    const c = o.who, card = o.card && SH.EV[o.card] && SH.cardFree(st, SH.EV[o.card]) ? SH.EV[o.card] : null, p = PPL().find(x => x.cid === c) || { cid: c, place: ((card || {}).when || {}).place || 'hotel_bar' }, r = st.rel[c], e = o.eid ? evOf(L, o.eid) : null, gain = [];
    if (firstHello(st, c)) gain.push('처음 인사를 나눴다');
    if (card) out.push({ t: 'event', id: card.id, si: -1 });
    if (!card || !(card.who || []).includes(c)) SH.meet(st, c, Math.max(SH.R.loop_meet_gain_min, SH.meetGain(st, c) + SH.R.loop_meet_gain_add));      /* 한 달에 한 번 고르는 만남 = 여러 번 본 셈(달 상한 12) · 오른 호감은 수치 창이 보여 줌(11-18 대표님 '호감 +10 중복' — 딱지로 되풀이하지 않음) */ else r.met = st.tick;
    const sc = { t: 'lmeet', who: c, place: p.place, title: `${SH.name(c)} · ${SH.job ? SH.job(c) : ''}`, bare: true, lines: [], gain };      /* bare = 제목이 이름 · 직함뿐(화면이 사람 칸과 겹쳐 보이지 않게 뺌) */
    const cold = !!r.q, frame = !card && !cold;      /* 앞뒤 줄은 틀 장면에만(카드 장면이 있으면 카드가 장면) · 다툰 사이면 일 얘기만 */
    if (o.pity) sc.lines.push(SH.fillKeys(TX().MEET_LINE.pity, { nm: SH.name(c) })); else if (frame) { const op = meetOpen(st, c); if (op) sc.lines.push(op); } else if (cold && !card) sc.lines.push(SH.fillKeys(TX().MEET_LINE.cold, { nm: SH.name(c) }));
    if (e) { const k = note(st, e, c); scene(st); sc.lines.push(fillS(meetLine(st, 't', c, k.id), SH.loopName(k.id))); sc.rumor = k.eid; }
    else if (!card) { sc.lines.push(meetLine(st, 'n', c)); if (o.pity) scene(st); gain.push('새 얘기는 없었음 — 호감이 오르면 얘기가 잦아짐'); }
    if (frame && rnd(L, 'pr') < SH.R.loop_meet_end_p) { const en = meetEnd(st, c, !!e); if (en) sc.lines.push(en); }
    if (card) scene(st);
    if (sc.lines.length) out.push(sc); W.picks.push({ slot: '', place: p.place, action: 'meet', label: `${SH.name(c)} 만남` });
  }
  /* 다툰 연인 달래기 */
  function chooseMakeup(st, o, cx) {
    const { L, out, W } = cx;
    const c = o.who, V = st.love, pr = clamp(PN.love.makeup_base + PN.love.makeup_talk * st.s.talk, SH.R.loop_makeup_min, SH.R.loop_makeup_max), ok = rnd(L, 'pr') < pr; scene(st);
    if (ok) { st.rel[c].q = false; if (V) { V.cold = 0; V.miss = 0; V.nextAsk = SH.loopM(st) + 1; } }
    else SH.addAff(st, c, SH.R.loop_makeup_fail_aff);
    out.push({ t: 'lmeet', who: c, place: (PPL().find(p => p.cid === c) || {}).place || 'han_river', title: `${SH.name(c)} — 달래기`, lines: [TX().MEET_LINE.makeup[ok ? 0 : 1], LT(c, ok ? 'ok' : 'fail')].filter(Boolean), gain: [ok ? '다툼이 풀렸다' : `못 풀었다(호감 −${-SH.R.loop_makeup_fail_aff}) — 다음 달에 다시`, `성공률 ${Math.round(pr * 100)}%(말솜씨 ${st.s.talk})`] });
    W.picks.push({ slot: '', place: 'han_river', action: 'makeup', label: `달래기 — ${SH.name(c)}` });
  }
  /* 헤어진 사람 다시 찾아가기(한 번뿐) */
  function chooseReunite(st, o, cx) {
    const { L, out, W } = cx;
    const c = o.who; st.ex.used = true; scene(st); const ok = rnd(L, 'pr') < clamp(SH.R.loop_reunite_base + st.s.talk / SH.R.loop_reunite_talk_div + (st.rel[c].aff - SH.R.loop_reunite_aff_at) / SH.R.loop_reunite_aff_div, SH.R.loop_reunite_min, SH.R.loop_reunite_max);
    if (ok) { st.flags['confessed_' + c] = st.tick + 1; st.rel[c].aff = Math.max(st.rel[c].aff, SH.R.loop_reunite_aff); SH.autoStage(st, c); const m0 = SH.loopM(st); st.love = { who: c, lv: 1, since: m0, dates: 0, miss: 0, nextAsk: m0 + SH.R.loop_reunite_next_ask, cold: 0, asked: -1 }; }
    out.push({ t: 'lmeet', who: c, place: (PPL().find(p => p.cid === c) || {}).place || 'han_river', title: `${SH.name(c)} — 다시 찾아가기`, lines: [SH.fillKeys(TX().MEET_LINE.reunite[ok ? 0 : 1], { nm: SH.name(c) })], gain: [ok ? '다시 연인이 됐다' : '되돌리지 못했다 — 이 길은 한 번뿐'] });
    W.picks.push({ slot: '', place: 'han_river', action: 'reunite', label: `다시 찾아가기 — ${SH.name(c)}` });
  }
  /* 약속(데이트) · 장소 카드 */
  function chooseDatePlace(st, o, cx) {
    const { L, out, W } = cx;
    const card = SH.EV[o.ev]; if (o.t === 'date') cash(st, -SH.R.date_cost, '데이트');
    if (o.t === 'date') { const V = st.love, LV = PN.love;
      if (V && V.who === o.who) { V.kept = true; V.dates++; V.miss = 0; V.nextAsk = SH.loopM(st) + LV.ask_every[V.lv - 1]; SH.addStat(st, 'stress', LV.keep_stress);
        if (!card || !SH.cardFree(st, card)) { const d = SH.meet(st, o.who, LV.keep_aff); scene(st); out.push({ t: 'lmeet', who: o.who, place: 'han_river', title: `${SH.name(o.who)} — 약속`, lines: [TX().LOVE_TXT[o.who] ? line(L, 'ld' + o.who, TX().LOVE_TXT[o.who].date) : TX().MEET_LINE.date_none], gain: [ `지킨 약속 ${V.dates}번 · ${LOVE_LV()[V.lv]}`].filter(Boolean) }); } }
      else if (V && !st.rel[V.who].q && rnd(L, 'pr') < LV.cheat_caught) { st.rel[V.who].q = true; V.cold = 0; SH.addAff(st, V.who, SH.R.loop_cheat_aff); L.mon.lines.push(SH.fillKeys(SX().LEDGER.cheat, { nm: SH.name(o.who), who: SH.name(V.who) })); } }
    if (card && SH.cardFree(st, card)) { out.push({ t: 'event', id: card.id, si: -1 }); scene(st); }
    W.picks.push({ slot: '', place: o.t === 'date' ? ((card || {}).when || {}).place : o.place, action: o.t, label: o.t === 'date' ? `약속 — ${SH.name(o.who)}` : (SH.PL[o.place] || {}).name_ko });
  }
  /* 김만복 '평생 고객' — 이 단계를 세우는 카드가 없어(연인처럼 고백 장면이 없음) 뼈대의 '마지막 단계는 카드로만'(lover_needs_event)에 막혀 영영 못 닿았음(11-18 진행 점검 · 구조 검토 1118b 지적 1: 예외를 뼈대에 두지 않고 여기서) — 돌볼 때 호감이 단계 표 문턱(min_affection)을 넘었으면 세움 */
  function lifeClient(st) { const L = SH.stages('client'), top = L[L.length - 1], r = st.rel.client; if (r && r.st === L.length - 2 && top.min_affection != null && r.aff >= top.min_affection) SH.setStage(st, 'client', top.name_ko); }
  /* 고객 돌보기 · 김만복 찾아가기 */
  function chooseClient(st, o, cx) {
    const { L, out, W } = cx;
    const card = o.card && SH.EV[o.card] && SH.cardFree(st, SH.EV[o.card]) ? SH.EV[o.card] : null, has = SH.loopCan(st, 'client');
    firstHello(st, 'client');
    if (card) { out.push({ t: 'event', id: card.id, si: -1 }); scene(st); }
    if (has) { cx.cared = true; L.aumK = Math.max(L.aumK, Math.min(N.client.cap, L.aumK + N.client.care)); }      /* 펀드 시대에 천장(1.5)보다 커진 맡은 돈을 돌보기가 깎지 않게 */
    SH.addStat(st, 'talk', SH.R.loop_client_talk); if (!card || !(card.who || []).includes('client')) SH.meet(st, 'client', SH.R.loop_client_meet);      /* 돌보러 다니면 첫 고객 김만복과의 사이도 쌓임(뒤 일곱 해 김만복 장면의 문턱 '믿음') */
    if (has || !card) out.push({ t: 'lmeet', who: 'client', place: 'client_office', title: has ? '고객 돌보기' : '김만복 사장 찾아가기', lines: [has ? line(L, 'client', TX().NARR.client) : TX().MEET_LINE.client_first], gain: [has ? `맡은 돈 +${SH.loopPc(N.client.care)}%(지금 ${SH.loopWon(SH.loopAum(st))})` : '아직 맡은 돈은 없음(대리부터)'].filter(Boolean) });      /* 말솜씨 · 김만복 호감은 수치 창이 보여 줌(11-18 대표님 '호감 +10 중복') */
    lifeClient(st);
    W.picks.push({ slot: '', place: 'client_office', action: 'client', label: '고객 돌보기' });
  }
  /* 공부 */
  function chooseStudy(st, o, cx) {
    const { L, out, W } = cx;
    st.s[o.k] = Math.min(100, st.s[o.k] + SH.R.loop_study_gain);      /* 자유 시간 한 칸을 통째로 쓴 공부는 높아져도 +3 그대로(카드로 오르는 몫만 50 · 80 에서 느려짐) */
    out.push({ t: 'lmeet', who: null, place: SH.R.loop_study_place.study, title: `공부 — ${SH.statKo(o.k)}`, lines: [line(L, o.k, TX().NARR[o.k])],
      gain: [o.k === 'analysis' ? `소견 적중 ${Math.round(SH.loopAcc(st) * 100)}%` : o.k === 'network' ? `지도에 뜨는 것 ${Math.round(N.opp_n[0] + (N.opp_n[1] - N.opp_n[0]) * st.s.network / 100)}곳` : `고객 달래기 ${SH.loopCalm(st)}%`] });
    W.picks.push({ slot: '', place: SH.R.loop_study_place.study, action: 'study', label: `공부 — ${SH.statKo(o.k)}` });
  }
  /* 급매 땅 */
  function chooseLandDeal(st, o, cx) {
    const { out, W } = cx;
    SH.landState(st).deal = st.tick; const lots = ((SH.D.lands || {}).first_lots || []).filter(d => !SH.landState(st).lots[d.lot]), d0 = lots.slice().sort((a, b) => a.base - b.base)[0];
    out.push({ t: 'lmeet', who: null, place: 'market', title: '급매 땅', land: true, lines: [TX().MEET_LINE.land_deal], gain: [`이 달만 땅값 ${Math.round((1 - ((SH.D.lands || {}).deal_mult || 1)) * 100)}% 쌈`, d0 ? `${d0.name} ${SH.loopWon(SH.landPrice(st, d0.lot))}` : ''].filter(Boolean) });
    W.picks.push({ slot: '', place: 'market', action: 'landdeal', label: '급매 땅' });
  }
  /* 연인과 넘는 고비 */
  function chooseTrial(st, o, cx) {
    const { out, W } = cx;
    const V = st.love, c = o.who, T0 = TX().TRIAL[c]; if (!V || V.who !== c || st.flags['trial_' + c]) return;
    if (st.rel[c].q) { out.push({ t: 'lmeet', who: c, place: T0.place, title: `${SH.name(c)} — ${T0.ko}`, lines: [SH.fillKeys(TX().MEET_LINE.trial_cold, { nm: SH.name(c) })], gain: ['다툼 중 — 먼저 달래야 함'] }); return; }
    st.flags['trial_' + c] = true; V.trialDone = 1; V.lv = 2; V.kept = true; V.dates++; V.miss = 0; V.nextAsk = SH.loopM(st) + PN.love.ask_every[1]; scene(st); SH.meet(st, c, SH.R.loop_trial_meet);      /* 같이 넘긴 고비 = 지킨 약속 한 번 · 다음 약속은 깊어진 사이의 간격으로 */
    SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.trial, { nm: SH.name(c), trial: T0.ko });
    out.push({ t: 'lmeet', who: c, place: T0.place, title: `${SH.name(c)} — ${T0.ko}`, lines: T0.lines.slice(), gain: ['사이가 깊어졌다 — 연인의 도움이 더 커지고, 약속은 석 달에 한 번이면 됨'].filter(Boolean) });
    W.picks.push({ slot: '', place: T0.place, action: 'trial', label: `${SH.name(c)} — ${T0.ko}` });
  }
  /* 주주총회 표결 */
  function chooseVote(st, o, cx) {
    const { L, out, W } = cx;
    if (L.votedM === SH.loopM(st)) return; L.votedM = SH.loopM(st); const VT = PN.era.vote, i = o.id, s = SH.loopStocks()[i], lines = TX().VOTE_TXT.head.map(t => fillS(t, s.ko)), gain = []; scene(st);
    if (o.side === 'for') { lines.push(...TX().VOTE_TXT.forr); SH.addStat(st, 'network', VT.net); SH.addStat(st, 'stress', SH.R.loop_vote_for_stress); gain.push(`인맥 +${VT.net}`, `스트레스 −${-SH.R.loop_vote_for_stress}`); }
    else { lines.push(...TX().VOTE_TXT.against); L.vote = { id: i, win: rnd(L, 'pr') < VT.win, m: SH.loopM(st) };      /* 결과는 이 달 첫 주에 값으로 나옴(주간 처리 안에서 — 손익 · 고객 성적 · 값 그림에 같이 잡힘) */
      gain.push(`개표 결과는 이번 달 첫 주에 — 통과하면 값 +${VT.up}% · 평판 +${VT.rep} / 안 되면 값 −${VT.down}%(반반)`); }
    out.push({ t: 'lmeet', who: null, place: 'banquet_hall', title: `주주총회 — ${s.ko}`, lines, gain }); W.picks.push({ slot: '', place: 'banquet_hall', action: 'vote', label: `주주총회 — ${s.ko}` });
  }
  /* 내가 하는 일(운동 · 술자리 · 점심 — 11-18 대표님 '가'): 인턴 행동 처리(SH.doAction)를 그 칸 셈으로 그대로 — 효과 · 돈 · 그곳 사람과의 만남이 인턴과 한 벌 */
  function chooseAct(st, o, cx) {
    const { L, out } = cx, a = SH.AC[o.a], slot = SH.SLOTS.find(s => s.k === SH.R.loop_act_slot[o.a]); if (!a || !slot) return;
    SH.doAction(st, { action: o.a, place: o.place, label: a.name_ko }, slot);
    const who = SH.peopleAt(st, o.place, slot).find(c => c !== 'boss') || null;
    out.push({ t: 'lmeet', who, place: o.place, title: a.name_ko, lines: [line(L, o.a, TX().NARR[o.a])], gain: [] });
  }
  /* 쉼 */
  function chooseRest(st, o, cx) {
    const { L, out, W } = cx;
    SH.addStat(st, 'stress', -N.stress.rest); SH.addStat(st, 'hp', SH.R.loop_rest_hp);
    out.push({ t: 'lmeet', who: null, place: SH.loopRestPlace(st), title: '쉼', lines: [line(L, 'rest', TX().NARR.rest)], gain: [] });
    W.picks.push({ slot: '', place: SH.loopRestPlace(st), action: 'rest', label: '쉼' });
  }
  const CHOOSE = Object.assign(Object.create(null), { person: choosePerson, makeup: chooseMakeup, reunite: chooseReunite, date: chooseDatePlace, place: chooseDatePlace, client: chooseClient, study: chooseStudy, landdeal: chooseLandDeal, trial: chooseTrial, vote: chooseVote, rest: chooseRest, act: chooseAct });
  /* 행동력(11-17 턴제 확정): 한 달 크기 = 바탕 + 직급 + 달 첫머리 체력 계단 · 일마다 값 · 걷기는 공짜 */
  /* 행동력 채우기 한 규칙(달 첫머리 · 옛 저장 이어 하기 — 11-18 구조 검토 지적 4): 크기 = loopApMax · 쓰러진 다음 달 · 번아웃 몫을 깎음 · 이 달 이미 한 일(L.used)은 얘기 값으로 셈 */
  function apFill(st) { const L = st.L; L.apMax = SH.loopApMax(st); L.ap = Math.max(0, Math.round(L.apMax * Math.max(0, 1 - SH.R.loop_ap_lost_cut * (L.lost || 0))) - (L.used || 0) * SH.R.loop_ap_talk); }
  /* 지도에 사람 칸이 뜨는 사람 — 오 상무 · 윤세라는 한 번 만난 뒤부터(11-18 대표님 '윤세라는 이벤트 자체가 안 뜸': 전엔 세라를 호텔 바가 열린 뒤(대리)에만 넣어
     평가액 진급으로 대리가 1997년 가을에야 되자 사원 내내 만날 길이 없었음) · 달 첫머리 · 주 첫머리 한 규칙 */
  const SELF_T = { act: 1, rest: 1, study: 1, landdeal: 1 };      /* 지도 칸 가운데 '내가 하는 일' 꼴 — 사람 칸 상한에 안 셈 */
  const peopleNow = (st) => PPL().filter(p => (p.cid !== 'exec_oh' && p.cid !== 'heiress') || (st.rel[p.cid] && st.rel[p.cid].st >= 1));
  SH.loopApMax = (st) => SH.R.loop_ap_base + SH.R.loop_ap_rank_step * Math.max(0, ri(st)) + SH.R.loop_ap_hp.reduce((t, [at, add]) => st.s.hp >= at ? add : t, 0);
  const AP_DATE = { date: 1, makeup: 1, reunite: 1, trial: 1 };
  SH.loopApCost = (o) => !o ? 0 : o.t === 'rest' ? SH.R.loop_ap_rest : AP_DATE[o.t] ? SH.R.loop_ap_date : SH.R.loop_ap_talk;
  /* 남은 행동력 — 달 첫머리(첫 주)에만 쓸 수 있음 · 지도에 할 수 있는 것이 하나도 없으면 0(손 · 로봇이 넘기기로 감) */
  SH.loopSlots = (st) => { const L = st.L; if (L.week > 0 || !(L.ap > 0)) return 0; return L.pool.some(o => SH.loopApCost(o) <= L.ap) ? L.ap : 0; };
  /* 지도에서 하나를 함(자유 시간 한 칸) → 장면(카드 또는 틀)을 차례로 돌려줌 · 한 것은 지도에서 빠지고, 그 달 것은 그 달에 다시 안 뜸 */
  SH.loopDo = function (st, i) {
    const L = st.L, o = L.pool[i], f = o && CHOOSE[o.t], cost = SH.loopApCost(o); if (!f || L.week > 0 || !(L.ap >= cost)) return [];
    const cx = { L, out: [], W: st.wk, cared: false }; f(st, o, cx);
    o.done = 1; L.used = (L.used || 0) + 1; L.ap -= cost; if (cx.cared) L.mon.cared = 1;
    if (o.mi != null && L.mpool[o.mi]) L.mpool[o.mi].done = 1;
    if (o.t === 'vote') L.mpool.forEach(x => { if (x.t === 'vote') x.done = 1; });      /* 표는 한 쪽에만 */
    if (o.t === 'rest') L.restDone = 1;
    L.pool = L.pool.filter(x => !x.done && !(x.mi != null && L.mpool[x.mi] && L.mpool[x.mi].done));
    return cx.out;
  };
  /* 쓰러진 다음 달: 뺏긴 칸만큼 쉼(달에 한 번) */
  function lostRest(st) { const L = st.L, W = st.wk; if (L.lostPaid === st.tick) return; L.lostPaid = st.tick;
    for (let k = 0; k < Math.min(2, L.lost || 0); k++) { SH.addStat(st, 'stress', -N.stress.rest); SH.addStat(st, 'hp', SH.R.loop_rest_hp); W.picks.push({ slot: '', place: 'home_studio', action: 'rest', label: '쓰러져 쉼' }); } }
  /* 달 끝: 이 달에 고객을 돌봤나(달에 한 번 셈) */
  SH.loopCareEnd = function (st) { const L = st.L; if (L.careTick === st.tick) return; L.careTick = st.tick;
    if (SH.loopCan(st, 'client')) { L.noCare = L.mon.cared || ri(st) >= 3 ? 0 : L.noCare + 1;      /* 차장부터: 부하가 안부를 챙겨서 안 찾아가도 줄지 않음 */ if (L.noCare >= N.client.decay_after) { L.aumK = Math.max(N.client.floor, L.aumK * (1 - N.client.decay)); L.mon.lines.push(SH.fillKeys(SX().LEDGER.no_care, { n: L.noCare, pct: SH.loopPc(N.client.decay) })); } }
  };
  /* 지도 물음 한 번: 주 첫머리를 돌고(같은 주면 그대로) 물음을 돌려줌 — 네 주를 다 보냈으면 null(결산으로) */
  SH.loopAsk = function (st) { const L = st.L; if (L.week >= 4) return null; if (L.ap == null) { if (L.week === 0) apFill(st); else { L.apMax = SH.loopApMax(st); L.ap = 0; } }      /* 행동력이 없던 옛 저장(11-17 턴제 전) — 달 첫머리면 새 달과 같은 규칙으로 채움 · 달 중간이면 0(쓰러짐 쉼보다 먼저 — 새 달과 같은 차례) */
    lostRest(st); SH.loopWeekStart(st); SH.loopOpen(st); return { t: 'lmap', closed: !!L.down, week: L.week, news: L.news || null }; };
  /* 지도 답 한 번: go = 지도에서 하나를 함 · end = 이번 주 마침 · skip = 이 달 끝까지 → 이어질 장면들 */
  SH.loopAnswer = function (st, a) { const L = st.L; a = a || {};
    if (a.go != null) return SH.loopDo(st, a.go);
    if (a.end || a.skip) { let W = null; SH.loopOpen(st); do { SH.loopWeekStart(st); W = SH.loopWeek(st); } while (L.week < 4);      /* 달 넘기기 하나(11-17 턴제 — 주 마침은 없어짐) */      /* 건너뛴 주에도 그 주의 소문은 생김 */ L.news = W ? { week: L.week, lines: W.lines, news: W.news, forced: !!W.forced } : null; }
    return [];
  };
  SH.loopWon = (v) => { const a = Math.abs(Math.round(v)), s = v < 0 ? '−' : ''; if (a >= 1e8) return s + (a / 1e8).toFixed(a >= 1e9 ? 1 : 2) + '억'; if (a >= 1e4) return s + Math.round(a / 1e4).toLocaleString('ko-KR') + '만'; return s + a.toLocaleString('ko-KR') + '원'; };
  SH.loopPct = (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d == null ? 1 : d) + '%';
  /* 규칙 값(비율)을 글로: 할(0.3 → '3' · 0.35 → '3.5') · %(0.15 → '15' · 0.125 → '12.5') — 반올림해 다른 값을 말하지 않게(11-14 리허설: 0.35 가 '4할'로 나왔음) */
  SH.loopHal = (v) => String(Math.round(v * 1000) / 100);
  SH.loopPc = (v) => String(Math.round(v * 1000) / 10);
  const won = SH.loopWon, pct = SH.loopPct;

  /* ── 장 ── */
  SH.loopOpen = function (st) { const L = st.L; if (L.b0 && L.b0.tick === st.tick) return; L.wpx = L.px.slice(); L.b0 = { tick: st.tick, worth: worth(st), eq: Math.max(1, equity(st)), eqRaw: equity(st), sv: stockV(st) - L.debt, px: L.px.slice(), clK: 1, bnK: 1, stress: st.s.stress }; };
  SH.loopLiveRumor = (st, id) => st.L.known.filter(k => k.id === id && !k.state);
  SH.loopBuy = function (st, id, money, credit) {
    const L = st.L; if (L.down) return { ok: false, msg: '쓰러져서 이 달은 장을 못 봐요' };
    const px = L.px[id], eq0 = Math.max(1, equity(st)); money = Math.min(money, SH.loopRoom(st, credit));
    const n = Math.floor(money / px); if (n <= 0) return { ok: false, msg: '살 돈이 모자라요' };
    const v = n * px, c = Math.min(Math.max(0, st.s.money), v), had = L.pos[id] || 0;
    scash(st, -c, '주식 삼'); L.debt += v - c; L.cost[id] = ((L.cost[id] || 0) * had + v) / (had + n); L.pos[id] = had + n;
    L.at = L.at || {}; if (!had) L.at[id] = SH.loopM(st) * 4 + L.week;
    { const ymB = st.date.slice(0, 7); if (ymB >= PN.era.crash_from && ymB <= PN.era.crash_to) { const B = L.bottom = L.bottom || {}, b = B[id] = B[id] || { n: 0, px: 0 }; b.px = (b.px * b.n + px * n) / (b.n + n); b.n += n; } }      /* 바닥에서 산 것 — 반등 때 큰 장면 */
    const rs = SH.loopLiveRumor(st, id); rs.forEach(k => { k.bought = true; }); if (rs.length) L.src[id] = rs[rs.length - 1].eid;
    const risky = rs.some(k => k.kind === 'whale' || k.kind === 'inside'); if (risky) L.clEx[id] = (L.clEx[id] === true ? had : L.clEx[id] || 0) + n; else if (!had) delete L.clEx[id];      /* 고객 돈이 안 따라가는 몫을 주식 수로(큰손 · 내부자 얘기로 산 만큼만 — 새 눈 검토 19 B-4) */
    const ins = rs.some(k => k.kind === 'inside'); if (ins) L.usedInside = true;
    let msg = `${SH.loopName(id)} ${n.toLocaleString('ko-KR')}주 삼 · 한 주 ${px.toLocaleString('ko-KR')}원 · ${won(v)}` + (v - c > 0 ? ` (그중 빚 ${won(v - c)})` : '');
    if (SH.loopCan(st, 'client')) msg += risky ? ' · 고객 돈은 안 따라감(큰손 · 내부자 얘기 종목)' : ` · 고객 돈도 같은 비율로(${won(SH.loopAum(st) * Math.min(1, v / eq0))})`;
    return { ok: true, msg, n, v, inside: ins };
  };
  /* 팔면 얼마(상태를 안 바꿈) — 확인 창과 실제 팔기가 같은 셈을 씀(구조 검토 1117b 지적 1: 공시 종목을 5% 아래로 팔 때 값이 먼저 빠지는 것을 화면 셈이 놓쳤음) */
  SH.loopSellQuote = function (st, id, frac, cnt) {
    const L = st.L, had = L.pos[id] || 0; if (!had) return null;
    const n = cnt ? Math.min(had, cnt) : frac >= 1 ? had : Math.max(1, Math.floor(had * frac)), s0 = SH.loopStocks()[id];
    /* 5% 넘게 든 종목(공시됨)을 5% 아래로 팔면: 따라 붙었던 돈이 먼저 빠져서 그 값에 팖 */
    const drop = !!(L.own && L.own[s0.id] && (had - n) * L.px[id] < capOf(L, s0) * PN.era.own_pct), px = drop ? Math.max(1, Math.round(L.px[id] * (1 - PN.era.own_follow / 100))) : L.px[id], v = n * px, pay = Math.min(L.debt, v);
    return { had, n, px, v, pay, drop, real: (px - L.cost[id]) * n, after: st.s.money + v - pay };
  };
  SH.loopSell = function (st, id, frac, why, cnt) {      /* cnt = 판 주식 수(화면 주문표 · 225) — 없으면 frac(가진 것의 몫) */
    const L = st.L, q = SH.loopSellQuote(st, id, frac, cnt); if (!q) return { ok: false, msg: '가진 게 없어요' };
    const { had, n, px, v, pay } = q, s0 = SH.loopStocks()[id];
    if (q.drop) { delete L.own[s0.id]; L.px[id] = px; why = (why ? why + ' · ' : '') + `대량 매도 공시로 값이 ${PN.era.own_follow}% 빠진 뒤`; }
    const g = (px / L.cost[id] - 1) * 100;
    L.debt -= pay; scash(st, v - pay, '주식 팖');
    if (n >= had) { if (L.src[id]) L.mon.src[id] = L.src[id]; delete L.src[id]; delete L.pos[id]; delete L.cost[id]; delete L.ord[id]; delete L.clEx[id]; if (L.at) delete L.at[id]; } else { L.pos[id] = had - n; if (L.clEx[id]) L.clEx[id] = (L.clEx[id] === true ? had : L.clEx[id]) * (had - n) / had; }
    return { ok: true, n, v, g, msg: `${why ? why + ' — ' : ''}${SH.loopName(id)} ${n.toLocaleString('ko-KR')}주 팖 · ${won(v)} · 산 값보다 ${pct(g)}` + (pay > 0 ? ` · 빚 ${won(pay)} 갚음` : '') };
  };
  /* 걸어 두는 주문: 산 값보다 take% 오르면 / stop% 내리면 전부 팖(주말 값으로 봄) */
  SH.loopOrder = function (st, id, o) { const L = st.L; if (!L.pos[id]) return; const nx = Object.assign({}, L.ord[id] || {}, o); if (!nx.take && !nx.stop && !nx.hold) delete L.ord[id]; else L.ord[id] = nx; };
  SH.loopHeldWeeks = (st, id) => { const L = st.L; return L.at && L.at[id] != null ? SH.loopM(st) * 4 + L.week - L.at[id] : 0; };
  /* 고객 돈이 이 종목을 따라 사나(사기 전에 보임): 큰손 · 내부자 얘기가 살아 있으면 안 따라감 · 한 종목 천장 */
  SH.loopClientNote = (st, id) => !SH.loopCan(st, 'client') ? '' : SH.loopLiveRumor(st, id).some(k => k.kind === 'whale' || k.kind === 'inside') ? '고객 돈은 안 따라감(큰손 · 내부자 얘기 종목)' : `고객 돈도 같은 비율로 따라 삼(한 종목에 ${SH.loopPc(PN.cl_stock_cap)}%까지)`;
  /* 2001 부터: 5% 공시까지 남은 주식 수(없으면 null) */
  SH.loopOwnLeft = (st, id) => { const L = st.L, s = SH.loopStocks()[id]; if (ymOf(SH.loopM(st)) < PN.era.own_from) return null; return Math.max(0, Math.ceil(capOf(L, s) * PN.era.own_pct / L.px[id]) - (L.pos[id] || 0)); };

  SH.loopWeek = function (st) {
    const L = st.L; if (L.week >= 4) return null;
    const W = { lines: [], news: [], forced: false }, old = L.wpx && L.wpx.length === L.px.length ? L.wpx.slice() : L.px.slice(), sv = stockV(st), den = Math.max(1, equity(st), sv), wt = {}, m = SH.loopM(st);
    const cap = L.clCap && L.clCap.until >= m ? L.clCap.max : 1;
    const hasCl = SH.loopCan(st, 'client');      /* 고객 돈이 없을 땐(사원) 내 돈의 비중으로 같은 셈 — 화면의 '내 고르기 성적' */
    Object.keys(L.pos).forEach(i => { const fol = L.clEx[i] === true ? 0 : Math.max(0, L.pos[i] - (L.clEx[i] || 0)); if (!hasCl) wt[i] = L.pos[i] * L.px[i] / den; else if (fol > 0) wt[i] = Math.min(PN.cl_stock_cap, fol * L.px[i] / den); });
    if (hasCl && cap < 1) { const sum = Object.keys(wt).reduce((a, k) => a + wt[k], 0); if (sum > cap) Object.keys(wt).forEach(k => { wt[k] *= cap / sum; }); }   /* 카드의 현금 비중 = 고객 돈 주식 몫의 천장(곱하기가 아님 — 11-18 구조 검토 지적 1) */
    const live0 = SH.loopLive(st);
    marketWeek(L, m); L.week++;
    /* 2001 부터: 한 종목을 시가총액의 5% 넘게 들면 공시 — 따라 붙는 돈으로 그 주 값이 더 뜀(손익 · 고객 성적 · 값 그림에 같이 잡히게 여기서) */
    if (ymOf(m) >= PN.era.own_from) SH.loopStocks().forEach(s => { const i = s.i, big = (L.pos[i] || 0) * L.px[i] >= capOf(L, s) * PN.era.own_pct;
      if (big && !L.own[s.id]) { L.own[s.id] = 1; L.px[i] = Math.round(L.px[i] * (1 + PN.era.own_follow / 100)); if (L.pxh[i].length) L.pxh[i][L.pxh[i].length - 1] = L.px[i]; L.ownRep = L.ownRep || {}; if (!L.ownRep[s.id]) { L.ownRep[s.id] = 1; SH.addStat(st, 'rep', SH.R.loop_own_rep); } scene(st); W.lines.push({ k: 'up', s: OWN_PRE() + SH.fillKeys(SX().LEDGER.own, { stock: s.ko, pct: PN.era.own_follow }) }); }
      else if (!big && L.own[s.id]) delete L.own[s.id]; });
    /* 주주총회 표결 결과(배당 안건) — 표를 던진 달 첫 주에 값으로 */
    if (L.vote && L.week === 1) { const v = L.vote, sv0 = SH.loopStocks()[v.id], VT = PN.era.vote; L.vote = null;
      if (sv0 && !L.dead[sv0.id]) { L.px[v.id] = Math.max(1, Math.round(L.px[v.id] * (v.win ? 1 + VT.up / 100 : 1 - VT.down / 100))); if (L.pxh[v.id].length) L.pxh[v.id][L.pxh[v.id].length - 1] = L.px[v.id]; SH.addStat(st, 'rep', v.win ? VT.rep : SH.R.loop_vote_lose_rep); scene(st);
        W.news.push({ k: v.win ? 'ok' : 'bad', id: v.id, s: SH.fillKeys(SX().LEDGER.vote_news, { stock: sv0.ko, res: SX().LEDGER.vote_res[v.win ? 0 : 1] }) }); W.lines.push({ k: v.win ? 'up' : 'down', s: v.win ? SH.fillKeys(SX().LEDGER.vote_win, { stock: sv0.ko, up: VT.up, rep: VT.rep }) : SH.fillKeys(SX().LEDGER.vote_lose, { stock: sv0.ko, down: VT.down, rep: SH.R.loop_vote_lose_rep }) }); } }
    /* 코스닥 상장폐지(2000-04 ~ 2001-12): 주마다 굴림 — 그 주의 값 움직임으로 셈(가진 주식은 0 · 고객 돈도 같이 잃음) */
    if (ymOf(m) >= PN.era.delist_from && ymOf(m) <= PN.era.delist_to) SH.loopStocks().filter(s => s.kq && liveAt(L, s, m)).forEach(s => { if (rnd(L, 'mr') >= PN.era.delist / 4) return; const lost = (L.pos[s.i] || 0) * old[s.i];
      L.px[s.i] = 1; L.dead[s.id] = 1; L.events = L.events.filter(e => e.id !== s.i); W.news.push({ k: 'bad', id: s.i, s: SH.fillKeys(SX().LEDGER.delist_news, { stock: s.ko }) });
      if (lost > 0) { scene(st); W.delist = (W.delist || []).concat([[s.i, lost]]); W.lines.push({ k: 'bad', s: SH.fillKeys(SX().LEDGER.delist, { stock: s.ko, lost: won(lost) }) }); } });
    const mw = live0.reduce((t, i) => t + (L.px[i] / old[i] - 1), 0) / Math.max(1, live0.length);
    let clr = 0, bn = 0; Object.keys(wt).forEach(i => { bn += wt[i] * mw; });
    Object.keys(L.pos).forEach(i => { const r = (L.px[i] / old[i] - 1) * 100, d = L.pos[i] * (L.px[i] - old[i]); L.mon.pnl[i] = (L.mon.pnl[i] || 0) + d; if (wt[i]) clr += wt[i] * r / 100;
      if (Math.abs(r) >= SH.R.loop_big_move_pct) { scene(st); W.lines.push({ k: r > 0 ? 'up' : 'down', s: SH.fillKeys(SX().LEDGER.big, { stock: SH.loopName(i), pct: pct(r), how: SX().LEDGER.big_how[r > 0 ? 0 : 1], won: won(d) }) }); } });
    L.b0.clK *= 1 + clr; L.b0.bnK *= 1 + bn;
    /* 신문(한 주 늦음) · 사건의 끝 */
    L.events.forEach(e => { const K = KIND[e.kind], nm = SH.loopName(e.id), k = L.known.find(x => x.eid === e.eid);
      if (e.state && e.told !== e.state) { e.told = e.state; const s = e.state === 'real' ? K.real : e.state === 'dump' ? K.dump : K.fake;
        W.news.push({ k: e.state === 'real' ? 'ok' : 'bad', id: e.id, s: `${nm} — ${s}` });
        if (k) { if (e.state !== 'dump') { k.state = e.state; L.mon.done.push(k.eid); if (k.says != null) { if (k.says === e.real) L.hit++; else L.miss++; } } else { k.dumped = m; } } }
      else if (e.age === 1 && !e.state && !e.pub) { e.pub = 1; W.news.push({ k: 'paper', id: e.id, s: `신문: ${nm}, ${K.paper}` }); } });
    (W.delist || []).forEach(d => { const i = d[0]; delete L.pos[i]; delete L.cost[i]; delete L.ord[i]; delete L.src[i]; delete L.clEx[i]; });      /* 상장폐지된 주식은 손익을 센 뒤 지움 */
    /* 신용 이자는 주마다(달 이자의 1/4) — 주중에 빌렸다가 월말 전에 갚아도 그동안의 이자는 냄 */
    if (L.debt > 0) { const it = Math.round(L.debt * N.margin_interest / 400); scash(st, -it, '신용 이자'); L.mon.int = (L.mon.int || 0) + it; }
    /* 걸어 둔 주문 */
    Object.keys(L.pos).forEach(i => { const o = L.ord[i]; if (!o) return; const g = (L.px[i] / L.cost[i] - 1) * 100;
      if (o.hold && SH.loopHeldWeeks(st, +i) >= o.hold) W.lines.push({ k: g >= 0 ? 'up' : 'down', s: SH.loopSell(st, +i, 1, `걸어 둔 주문(${o.hold}주 지남)`).msg });
      else if (o.take && g >= o.take) W.lines.push({ k: 'up', s: SH.loopSell(st, +i, 1, `걸어 둔 주문(+${o.take}%)`).msg });
      else if (o.stop && g <= -o.stop) W.lines.push({ k: 'down', s: SH.loopSell(st, +i, 1, g <= -(o.stop + 6) ? `걸어 둔 주문(−${o.stop}%) — 한꺼번에 꺼져 그 값에 못 팖` : `걸어 둔 주문(−${o.stop}%)`).msg }); });
    /* 신용: 내 몫이 건 돈의 3할 아래면 강제로 팔림 */
    const pv = stockV(st);
    if (L.debt > 0 && pv > 0 && (pv - L.debt) / pv < N.margin_call) { const left = pv - L.debt; Object.keys(L.pos).forEach(i => SH.loopSell(st, +i, 1)); SH.addStat(st, 'stress', SH.R.loop_forced_stress); L.mon.forced++; L.forced++; scene(st); W.forced = true;
      W.lines.push({ k: 'bad', s: SH.fillKeys(SX().LEDGER.forced, { call: SH.loopPc(N.margin_call), left: won(Math.max(0, left)), tail: L.debt > 0 ? SH.fillKeys(SX().LEDGER.forced_tail, { debt: won(L.debt) }) : '' }) }); }
    L.wpx = L.px.slice();      /* 다음 주 성적의 기준 = 이번 주말 값(주 사이에 팔아서 값이 빠진 것도 다음 주 성적에 잡힘) */
    L.mon.lines = L.mon.lines.concat(W.lines.map(l => l.s)); L.mon.news = L.mon.news.concat(W.news);
    /* 243(장 화면 다시 짜기): 종목마다 마지막 소식(id 가 있는 소식만 · 달이 바뀌어도 남음) · 이 달 주마다 나 대 시장(%) */
    W.news.forEach(n => { if (n.id != null) (L.lastNews = L.lastNews || {})[n.id] = { k: n.k, s: n.s, m, w: L.week }; });
    (L.mon.curve = L.mon.curve || []).push([+(SH.loopGain(st) / L.b0.eq * 100).toFixed(1), +SH.loopMkt(st).toFixed(1)]);
    return W;
  };
  SH.loopGain = (st) => { const L = st.L; if (L.b0.sv == null) return equity(st) - L.b0.eqRaw;      /* 한 달을 통째로 돌던 때의 저장(장 화면에서 저장됨) — 그땐 장 중에 다른 지출이 없었음 */
    return stockV(st) - L.debt - L.b0.sv + ((L.mon && L.mon.flow) || 0); };      /* 이 달 주식으로 번 돈 = 주식 값(빚 뺌)이 달라진 만큼 + 주식 · 신용으로 오간 돈 */
  SH.loopMkt = (st) => { const L = st.L, live = SH.loopLive(st).filter(i => L.b0.px[i]); return live.reduce((t, i) => t + (L.px[i] / L.b0.px[i] - 1), 0) / Math.max(1, live.length) * 100; };

  /* ── 월말 결산 ── 보고서 한 장(화면이 그림) */
  /* 달 결산을 차례대로 나눈 조각들(11-14 밤 정리 E4) — 부르는 차례 · 난수(P) 부르는 차례는 SH.loopSettle 안의 원래 차례 그대로
     c = 결산 한 번의 공용 값 { L · m · P(사람 난수) · rep(보고서) · row(돈 줄 넣기) · mkt · R · mo · ymNow · E } */
  // ① 감사: 내부자 정보로 산 게 걸렸나
  function settleInside(st, c) {
    const { L, P, rep, row } = c;
    if (L.usedInside && P() < N.inside.caught) { L.caught++; c.caught = true; scene(st); const fine = Math.round(Math.max(0, worth(st)) * N.inside.fine), i0 = ri(st);
      row('내부자 거래 추징', -fine);
      if (i0 >= 1) { SH.setRank(st, SH.RANK_ORDER[Math.max(1, i0 + 1 - N.inside.demote)]); }
      SH.addStat(st, 'rep', SH.R.loop_inside_caught_rep);
      rep.scenes.push({ k: 'bad', title: SCENE_T.caught, s: SH.fillKeys(SX().SETTLE.caught[0], { fine: SH.loopHal(N.inside.fine), tail: ri(st) !== i0 ? SH.fillKeys(SX().SETTLE.caught[1], { rank: SH.RK[st.rank].name_ko }) : SX().SETTLE.caught[2] }) }); }
  }
  // ② 시대 장면(폭락 · 바닥에서 산 것 · 상장폐지 · 펀드의 시대) · 연인이 내부자 거래를 알아챔
  function settleEraScenes(st, c) {
    const { L, P, rep, mkt, ymNow, E } = c;
    if (ymNow >= E.crash_from && ymNow <= E.crash_to && !L.crashSeen && mkt <= SH.R.loop_crash_scene_mkt) { L.crashSeen = 1; scene(st); rep.scenes.push({ k: 'bad', title: SCENE_T.crash, s: SH.fillKeys(SX().SETTLE.crash, { mkt: pct(mkt) }) }); }
    if (ymNow >= E.payoff_from && L.bottom && !L.payoffSeen) { let cost = 0, val = 0; Object.keys(L.bottom).forEach(i => { const have = Math.min(L.bottom[i].n, L.pos[i] || 0); cost += have * L.bottom[i].px; val += have * L.px[i]; });
      if (cost > 0 && val >= cost * E.payoff_mult) { L.payoffSeen = 1; scene(st); SH.addStat(st, 'rep', SH.R.loop_payoff_rep); SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.payoff, { cost: won(cost), val: won(val) }); rep.scenes.push({ k: 'ok', title: SCENE_T.payoff, s: SH.fillKeys(SX().SETTLE.payoff, { cost: won(cost), val: won(val), rep: SH.R.loop_payoff_rep }) }); } }
    L.mon.lines.filter(t => tplRe(SX().LEDGER.delist).test(t)).forEach(t => rep.scenes.push({ k: 'bad', title: SCENE_T.delist, s: t }));
    if (ymNow === E.fund_from && SH.loopAum(st) > 0 && !L.told.fund) { L.told.fund = 1; rep.scenes.push({ k: 'ok', title: SCENE_T.fund, s: SX().SETTLE.fund }); }
    { const V = st.love; if (V && L.usedInside && (V.who === 'reporter' || V.who === 'analyst') && !st.rel[V.who].q) { const caughtNow = rep.scenes.some(x => x.title === SCENE_T.caught);
      if (caughtNow) { st.rel[V.who].q = true; V.cold = 0; SH.addAff(st, V.who, SH.R.loop_inside_lover_aff); rep.scenes.push({ k: 'bad', title: `${SH.name(V.who)} — 다툼`, s: SH.fillKeys(SX().SETTLE.lover_fight[0], { job: SX().SETTLE.lover_fight[1][V.who === 'reporter' ? 'reporter' : 'analyst'], who: SH.name(V.who) }) }); }
      else if (P() < PN.love.inside_notice) { SH.addAff(st, V.who, SH.R.loop_inside_notice_aff); rep.scenes.push({ k: 'warn', title: SH.fillKeys(SX().SETTLE.noticed_t, { who: SH.name(V.who) }), s: SH.fillKeys(SX().SETTLE.noticed, { aff: -SH.R.loop_inside_notice_aff }) }); } } }
  }
  // ③ 들어오고 나간 돈: 부업 · 생활비 · 내 운용사 분기 정산 · 월급 · 땅 · 신용 이자
  function settlePay(st, c) {
    const { L, rep, row, R, mo } = c;
    if (st.sideJob) row('부업', st.sideJob.pay || 0);
    if (st.rank === 'jobless') row('생활비', -SH.R.founder_living_quarter / 3);
    else if (st.rank === 'founder') { L.fq = (L.fq || 1) * L.b0.clK; L.fqb = (L.fqb || 1) * L.b0.bnK;      /* 분기 성적은 달 성적의 곱 */
      if (mo % 3 === 0) { SH.founderQuarter(st, rep, clamp(L.fq - 1, SH.R.loop_founder_q_min, SH.R.loop_founder_q_max), L.fq - L.fqb); L.fq = 1; L.fqb = 1; rep.money.forEach(t => rep.scenes.push({ k: st.funds.firm_cash < 0 ? 'bad' : 'warn', title: '내 운용사 — 분기 정산', s: t })); } }
    else if (R) { const Rp = c.Rpay || R; row(`월급에서 남긴 돈(${Rp.n})`, Rp.save); st.income += Rp.save;
      if (SH.mile(st, 'staff_first_payday')) { SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.first_pay); rep.gets.push('첫 월급날 — 백화점이 열림'); } }
    { const up = SH.upkeepMonth(st); if (up) row('차 · 집 유지비', -up); }   /* 직급과 상관없이 달마다(무직 · 독립도) */
    if (SH.landTick) { const b = st.s.money; SH.landTick(st, rep); const d = st.s.money - b; if (rep.land) rep.rows.push([rep.land.seized ? '땅 — 은행이 가져감' : `땅 — 세 · 이자`, d]); }
    if (L.mon.int) rep.rows.push([`신용 이자(달 ${N.margin_interest}% · 주마다 냄)`, -L.mon.int]);
  }
  // ④ 성적(시장 대비) · 평판 · 맡은 돈 늘고 줆 · 성과금 · 고객 항의 — 시장 대비 초과 수익(exc)을 돌려줌
  function settleScore(st, c) {
    const { L, P, rep, row, ymNow, E } = c;
    /* 성적: 고른 종목이 '같은 비중으로 시장 전체를 샀을 때'보다 얼마나 잘했나 — 현금으로 쥔 몫은 덕도 탓도 아님 */
    const cr = clamp((L.b0.clK - 1) * 100, SH.R.loop_score_min, SH.R.loop_score_max), bench = clamp((L.b0.bnK - 1) * 100, SH.R.loop_score_min, SH.R.loop_score_max), exc = cr - bench, aum = st.rank !== c.rank0 ? c.aum0 : SH.loopAum(st); rep.cr = aum ? cr : null;   /* 맡은 돈: 이 결산에서 감사로 강등됐을 때만 강등 앞 값 — 그 밖엔 지금 값(독립은 분기 정산이 운용 자산을 바꾼 뒤 값이어야 함 · 11-14 검토 5 지적 1: 늘 결산 맨 앞 값을 써서 독립 분기 달의 '고객 돈' 줄 · 목표 글이 바뀌었음) */ rep.pick = cr; rep.bench = bench;
    if (exc > SH.R.loop_beat_market_min) SH.addStat(st, 'rep', exc >= SH.R.loop_rep_exc_big ? SH.R.loop_rep_exc_big_rep : SH.R.loop_rep_exc_rep);      /* 잘 고른 달은 객장에 소문이 남(평판) */
    if (aum && st.rank !== 'founder') { L.hist.push(exc); if (L.hist.length > 12) L.hist.shift();
      if (ymNow >= E.fund_from) { const r12 = L.hist.reduce((a, b) => a + b, 0); L.aumK = clamp(L.aumK * (r12 > 0 ? 1 + E.fund_in : r12 < 0 ? 1 - E.fund_out : 1), N.client.floor, E.fund_cap); }
      const ex = exc / 100 * aum; if (ex > 0) { row('성과금(고객 돈이 시장을 이김)', ex * N.bonus_rate); st.income += Math.round(ex * N.bonus_rate); }
      if (cr < N.client.complain_at) { scene(st); const ok = P() <= st.s.talk / SH.R.loop_calm_talk_div; if (!ok) { L.aumK = Math.max(N.client.floor, L.aumK * (1 - N.client.leave)); SH.addStat(st, 'rep', -1); }
        rep.scenes.push({ k: ok ? 'warn' : 'bad', title: SCENE_T.angry, ok, s: SH.fillKeys(SX().SETTLE.angry[0], { line: line(L, 'angry', SX().CLIENT_ANGRY), cr: pct(cr), tail: SH.fillKeys(SX().SETTLE.angry[ok ? 1 : 2], { calm: SH.loopCalm(st), leave: SH.loopPc(N.client.leave) }) }) }); } }
    return exc;
  }
  // ⑤ 카드가 준 과제 판가름
  function settleTask(st, c, exc) {
    const { L, rep, row } = c;
    /* 카드가 준 과제 = 이 달 목표(시장 이기기)로 판가름 */
    if (st.task) { const t = st.task, held = (sid) => { const s = SH.loopStocks().find(x => x.id === sid); return !!(s && L.pos[s.i]); };
      const ok = t.forced ? t.forced === 'success' : t.id === 'task_cheongwoon_volume' ? held('cheongwoon_chem') : t.id === 'task_cheongwoon_net_sale' ? held('cheongwoon_net') : exc > 0; st.wk.taskOk = ok; st.tasks.push({ tick: st.tick, mode: st.mode, id: t.id, ok });
      if (ok) { const b = Math.round(((SH.RK[c.rank0] || {}).salary || {}).amount * SH.R.staff_task_bonus_ratio || 0); if (b) row(`과제 성과금 — ${t.name}`, b);
        if (/^task_cheongwoon_/.test(t.id)) { row('특별 성과금', b); st.funds.dirty_money += b; if (t.id === 'task_cheongwoon_volume') st.counts.cheongwoon_success_count = (st.counts.cheongwoon_success_count || 0) + 1; } }
      rep.scenes.push({ k: ok ? 'ok' : 'warn', title: `과제 — ${t.name}`, s: SX().SETTLE.task[(/^task_cheongwoon_/.test(t.id) ? 'cw_' : '') + (ok ? 'ok' : 'fail')] }); st.task = null; }
  }
  // ⑥ 진급(내 평가액 문턱 · 11-17 턴제 — 옛 고객 돈 성적 점수는 걷음)
  function settleRank(st, c) {
    const { L, rep, R } = c;
    const i1 = ri(st);      /* 옛 평가 가산(eval_bonus → L.bonus) · 재직 달 수(L.inRank)는 읽는 곳이 없어 걷음(11-18 구조 검토 1118b 지적 2) */
    const nx = SH.RANK_ORDER[i1 + 2], need = nx ? (SH.R.loop_promo_worth || {})[nx] : null;      /* 진급 = 내 평가액이 다음 직급 문턱을 넘으면(11-17 턴제 · 개월 수 없음 · 좌천 없음) */
    if (c.caught || st.s.rep <= SH.R.rep_ruin) { /* 감사에 걸린 달 · 잘릴 평판이면 진급 없음 */ }
    else if (R && i1 === 0 && need != null && equity(st) >= need) { SH.promote(st, nx, 'loop');
      rep.scenes.push({ k: 'ok', title: `${rankRow(st.rank).n} 진급`, s: SH.fillKeys(SX().SETTLE.promo_first[0], { line: SX().PROMO_TXT[st.rank] || '' }), unlock: [SH.fillKeys(SX().SETTLE.promo_first[1], { aum: won(rankRow(st.rank).aum) }), SH.fillKeys(SX().SETTLE.promo_first[2], { rate: N.margin_interest, call: SH.loopPc(N.margin_call) })] }); }
    else if (R && i1 > 0 && need != null && equity(st) >= need && (i1 < N.ranks.length - 2 || SH.ym(st.date).y >= SH.R.loop_ceo_promo_year)) {   /* 맨 위 직급으로 오르는 것만 해 문턱 — 직급 줄 수로 셈(차례 숫자를 박지 않음 · 11-15 리허설 2) */
      SH.promote(st, nx, 'loop'); st.flags['loop_' + st.rank] = true;      /* 성적으로 먼저 오른 직급 — 그 직급을 주는 카드가 글을 바꿔 씀 */
      rep.scenes.push({ k: 'ok', title: `${rankRow(nx).n} 진급`, s: SH.fillKeys(SX().SETTLE.promo[0], { line: SX().PROMO_TXT[st.rank] || '', aum: won(rankRow(st.rank).aum) }), unlock: SX().PROMO_UNLOCK[st.rank] ? [SX().PROMO_UNLOCK[st.rank]] : null }); }   /* 진급 글 · 열림 글은 직급 id 로 찾음 */
    const ranked = SH.rankTargetCheck(st); if (ranked) rep.gets.push(`${SH.RK[ranked].name_ko} — 심사 통과`);
    if (L.rankSeen !== st.rank) { L.rankSeen = st.rank; L.hist = []; scene(st); }
  }
  // ⑦ 재산: 스트레스 · 깡통(직급은 안 내림) · 퇴출 · 파산 · 재산 돌파 — 달 끝 재산(w1)을 돌려줌
  function settleWorth(st, c, w0) {
    const { L, m, rep } = c;
    /* 스트레스: 잃은 만큼 · 빚을 지고 있으면 더(달마다 저절로 풀리는 몫은 마디 끝에서) */
    const w1 = worth(st), loss = w0 > 0 ? (w1 - w0) / Math.max(w0, SH.R.loop_stress_base_min) * 100 : 0;      /* 잃은 % = (w1 − w0) ÷ 밑 · 밑은 재산이 아주 작으면 바닥값(0 언저리에서 생활비만 나가도 %가 끝없이 커져 달마다 번아웃이 되풀이되던 것 — 회사를 나온 세라 루트) · 재산이 0 아래면 안 셈 */
    SH.addStat(st, 'stress', Math.round((loss < 0 ? -loss * N.stress.loss_k : 0) + (L.debt > 0 ? N.stress.lev : 0) - (SH.loopLover(st) === 'barowner' ? PN.lover.barowner.rest * (st.love.lv >= 2 ? PN.love.deep_mult : 1) : 0) + (SH.loopLover(st) && st.love.lv >= 3 ? PN.love.home_stress : 0)));
    L.peak = Math.max(L.peak, w1);
    if (L.peak >= SH.R.loop_wipe_peak_min && w1 < L.peak * SH.R.loop_wipe_ratio && !(L.noLev > m)) { L.wiped++; L.noLev = m + N.wipe_ban; L.peak = w1; scene(st);      /* 깡통은 직급을 안 내림(11-18 대표님 '모두 평가액으로' — 직급은 평가액 문턱으로만 · 신용 막힘 · 평판은 그대로) */
      SH.addStat(st, 'rep', SH.R.loop_wipe_rep);
      rep.scenes.push({ k: 'bad', title: SCENE_T.wiped, s: SH.fillKeys(SX().SETTLE.wiped, { line: line(L, 'wiped', SX().WIPED_TXT), pct: SH.loopPc(SH.R.loop_wipe_ratio), years: N.wipe_ban / 12 }) }); }
    if (L.caught >= 2 && !st.ending) { SH.setEnding(st, 'end_banned'); rep.scenes.push({ k: 'bad', title: '퇴출', s: SX().SETTLE.banned }); }
    else if (w1 < SH.R.loop_bankrupt_worth && L.debt > 0 && !st.ending) { SH.setEnding(st, 'end_debt'); rep.scenes.push({ k: 'bad', title: '파산', s: SX().SETTLE.debt }); }
    [1e8, 1e9, 1e10].forEach(k => { if (w1 >= k && SH.mile(st, 'worth_' + k)) { scene(st); SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.worth, { w: won(k) }); rep.scenes.push({ k: 'ok', title: `재산 ${won(k)} 돌파`, w: k, s: SX().SETTLE.worth }); } });
    return w1;
  }
  // ⑧ 문턱 장면: 쓰러짐 · 강제 매도 · 지분 공시 · 첫 땅 · 땅 잃음 → 장면 붙이기
  function settleGates(st, c) {
    const { L, rep } = c;
    if (L.down) rep.scenes.unshift({ k: 'bad', title: '쓰러졌다', s: SX().SETTLE.down });
    /* 문턱 장면: 강제 매도 · 지분 공시 · 첫 땅 · 땅 잃음은 여기서 결산 장면으로 올리고, 처음(과 두 번째) 겪는 것엔 따로 뜨는 장면을 붙임 */
    if (L.mon.forced) rep.scenes.unshift({ k: 'bad', title: SCENE_T.forced, s: SH.fillKeys(SX().SETTLE.forced, { n: L.mon.forced, call: SH.loopPc(N.margin_call) }) });
    { const own = L.mon.lines.filter(t => t.startsWith(OWN_PRE()))[0]; if (own) rep.scenes.push({ k: 'ok', title: SCENE_T.own, s: own.slice(OWN_PRE().length), stock: own.slice(OWN_PRE().length).split(' 5%')[0] }); }
    if (st.flags.land_owner && !L.told.g_land) rep.scenes.push({ k: 'ok', title: SCENE_T.land, s: SX().SETTLE.land_first });
    if (rep.land && rep.land.seized) rep.scenes.push({ k: 'bad', title: SCENE_T.seized, s: SX().SETTLE.land_seized });
    { const usedG = {}; rep.scenes.forEach(e => { const g = gateOf(st, e, rep); if (g && !usedG[g.key]) { usedG[g.key] = 1; e.sc = g; } }); }      /* 한 달에 같은 문턱이 둘이어도(상장폐지 두 종목) 장면은 하나 */
  }
  SH.loopSettle = function (st) {
    const L = st.L, m = SH.loopM(st), era = eraAt(Math.max(0, m)), P = () => rnd(L, 'pr');
    if (L.setTick === st.tick) return { kind: 'month', loop: true, hidden: true, gets: [], money: [], rows: [], why: [], scenes: [], goals: [], before: st.wk.snap, after: SH.snapshot(st), picks: [] };      /* 같은 달 결산을 두 번 부르면 아무것도 안 함 */
    L.setTick = st.tick;
    SH.loopOpen(st); while (L.week < 4) SH.loopWeek(st);
    SH.loopCareEnd(st);
    const rep = { kind: 'month', loop: true, gets: [], money: [], before: st.wk.snap, picks: st.wk.picks.slice(), rows: [], why: [], scenes: [], goals: [], ko: SH.dateLabel(st) };
    const mkt = SH.loopMkt(st), gain = SH.loopGain(st), myRet = L.b0.eqRaw > 0 ? gain / L.b0.eq * 100 : 0, w0 = L.b0.worth;      /* 달 첫머리 내 몫이 0 아래면 % 는 뜻이 없어 0 */
    const wBase = worth(st) - gain;      /* 스트레스의 밑 = 이 달 주식 수익을 뺀 지금 재산(달 중간에 가게 · 약속 · 땅에 쓴 돈은 '잃은 것'이 아님 — 한 달을 통째로 돌던 때엔 장 전에 다 썼음) */
    rep.rows.push(['주식 손익', Math.round(gain + (L.mon.int || 0))]);
    const row = (label, v) => { v = Math.round(v); if (!v) return; cash(st, v, label); rep.rows.push([label, v]); };
    const c = { L, m, P, rep, row, mkt };
    c.aum0 = SH.loopAum(st); c.rank0 = st.rank;   // 그 달 성과금 · 성적 · 과제 성과금도 그 달을 일한 직급의 맡은 돈 · 월급으로(11-14 검토 4 지적 2 — 월급만 고치고 남았던 같은 원인: 과장이 걸린 달의 성과금이 통째로 사라졌음)
    c.Rpay = SH.loopRank(st);   // 그 달 월급은 그 달을 일한 직급으로 — 감사 강등은 다음 달 월급부터(11-14: 전엔 강등 뒤 직급을 읽어 과장으로 일한 달이 '월급에서 남긴 돈(사원)'으로 나옴)
    settleInside(st, c);
    const R = SH.loopRank(st), mo = SH.ym(st.date).m, ymNow = st.date.slice(0, 7), E = PN.era; Object.assign(c, { R, mo, ymNow, E });
    settleEraScenes(st, c);
    settlePay(st, c);
    const exc = settleScore(st, c);
    settleTask(st, c, exc);
    if (L.debt > 0 && st.s.money > 0) { const pay = Math.min(L.debt, st.s.money); L.debt -= pay; scash(st, -pay, '신용 빚 갚음'); rep.repay = pay; }
    settleRank(st, c);
    const w1 = settleWorth(st, c, wBase);
    settleGates(st, c);
    rep.myRet = myRet; rep.mkt = mkt; rep.w0 = w0; rep.w1 = w1; rep.stress = [L.b0.stress, st.s.stress];
    rep.why = whyLines(st, rep); rep.goals = SH.loopGoals(st, rep); rep.lines = L.mon.lines.slice(-2);      /* 252: 장부 줄은 마지막 둘 · 장 화면에서 사고판 기록은 결산에 안 올림(돈 칸의 '주식 손익'이 맡음) */
    L.track.push([m, w1]); if (L.track.length > 140) L.track.shift();
    L.events = L.events.filter(e => e.age < e.h + 5); L.known = L.known.filter(k => evOf(L, k.eid));
    Object.keys(L.src).forEach(i => { if (!evOf(L, L.src[i])) delete L.src[i]; });
    L.n++; L.b0 = null;
    rep.after = SH.snapshot(st); rep.whyMoney = Object.assign({}, st.why || {});
    return rep;
  };

  /* 까닭 세 줄: 어느 종목 · 어느 소문 때문이었나 · 어느 능력치 덕 / 탓이었나 */
  /* 글 = 원본 04_시범/대사/장면_글.json 의 WHY */
  function whyLines(st, rep) {
    const L = st.L, M = L.mon, out = { forced: null, pnl: [], abil: null, missed: null }, K = (eid) => L.known.find(k => k.eid === eid), done = M.done.map(K).filter(Boolean);
    const about = (id) => { const k = K(L.src[id] || M.src[id]);
      if (!k) { const e = L.events.filter(x => x.id === +id && x.born >= SH.loopM(st) - 2 && (x.state || x.pub)).pop(), K0 = e && KIND[e.kind];
        if (e && e.state === 'fake') return SH.fillKeys(SX().WHY.nosrc_fake, { kind: K0.ko });
        if (e && e.state === 'dump') return SX().WHY.nosrc_dump;
        if (e && e.state === 'real') return SH.fillKeys(SX().WHY.nosrc_real, { kind: K0.ko });
        return SX().WHY.nosrc_mkt + (e ? SH.fillKeys(SX().WHY.nosrc_paper, { paper: K0.paper }) : ''); }
      const K1 = KIND[k.kind], src = SH.fillKeys(SX().WHY.src, { who: SH.name(k.who), kind: K1.ko });
      if (k.state && !M.done.includes(k.eid) && k.dumped !== SH.loopM(st)) return SH.fillKeys(SX().WHY.over, { who: SH.name(k.who), res: SX().WHY.over_res[k.state === 'real' ? 0 : 1] });
      if (k.dumped != null) return SH.fillKeys(SX().WHY.dumped, { src: src, dump: K1.dump });
      if (k.state === 'real') return SH.fillKeys(SX().WHY.real, { src: src }) + (k.says === true ? SX().WHY.real_ok : k.says === false ? SX().WHY.real_doubt : '');
      if (k.state === 'fake') return SH.fillKeys(SX().WHY.fake, { src: src }) + (k.says === false ? SX().WHY.fake_doubt : k.says === true ? SH.fillKeys(SX().WHY.fake_wrong, { acc: Math.round(k.acc * 100) }) : SX().WHY.fake_none);
      return SH.fillKeys(SX().WHY.pending, { src: src }); };
    Object.keys(M.pnl).map(i => [i, M.pnl[i]]).filter(x => Math.abs(x[1]) >= 1).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2).forEach(x => out.pnl.push({ k: x[1] >= 0 ? 'ok' : 'bad', s: `${SH.loopName(x[0])} ${x[1] >= 0 ? '+' : ''}${won(x[1])} — ${about(x[0])}` }));
    if (M.forced) out.forced = { k: 'bad', s: SH.fillKeys(SX().WHY.forced, { call: SH.loopPc(N.margin_call) }) };
    const ops = done.filter(k => k.says != null), right = ops.filter(k => k.says === (k.state === 'real')).length, fog = rep.stress[0] >= N.stress.fog || st.s.stress >= N.stress.fog;
    if (ops.length) out.abil = { k: right * 2 >= ops.length ? 'ok' : 'bad', s: SH.fillKeys(SX().WHY.abil, { ana: st.s.analysis, n: ops.length, right: right, acc: Math.round(SH.loopAcc(st) * 100) }) + (fog ? SH.fillKeys(SX().WHY.abil_fog, { fog: SH.loopPc(N.fog_pen) }) : '') };
    else if (!M.heard.length) out.abil = { k: 'warn', s: SX().WHY.unheard };
    else if (fog) out.abil = { k: 'bad', s: SH.fillKeys(SX().WHY.fog, { stress: Math.round(rep.stress[0]), line: N.stress.fog, fog: SH.loopPc(N.fog_pen) }) };
    const ms = done.filter(k => !k.bought && k.state === 'real').pop(), dodge = done.filter(k => !k.bought && k.state === 'fake').pop();
    if (dodge) out.missed = { k: 'ok', s: SH.fillKeys(SX().WHY.dodge, { stock: SH.loopName(dodge.id), who: SH.name(dodge.who) }) + (dodge.says === false ? SX().WHY.dodge_ok : '') };
    else if (ms) out.missed = { k: 'warn', s: SH.fillKeys(SX().WHY.missed, { stock: SH.loopName(ms.id), who: SH.name(ms.who) }) + (ms.says === false ? SX().WHY.missed_bad : '') };
    return [out.forced, out.pnl[0], out.abil, out.pnl[1], out.missed].filter(Boolean).slice(0, 2);      /* 252(11-17 대표님 '넘침 · 글이 너무 많음'): 두 줄까지 · '시장 전체 n%' 줄은 걷음(머리의 '시장 n%' 칩과 같은 말) */
  }

  /* 목표 셋: 이번 달 · 올해(다음 직급) · 인생(다음 재산 문턱) */
  SH.loopGoals = function (st, rep) {
    const L = st.L, R = SH.loopRank(st), i = ri(st), g = [], yr = (nm, o) => Object.assign({ ko: '올해 — ' + nm, nm, short: '' }, o);      /* nm · short = 사원 지도 옆 칸 한 줄(221) */
    if (rep) g.push({ ko: rep.cr != null ? '이번 달 — 고객 돈으로 시장 이기기' : '이번 달 — 시장보다 잘 고르기', ok: rep.pick > rep.bench + SH.R.loop_beat_market_min, text: rep.pick === 0 && rep.bench === 0 ? '주식을 들지 않은 달 — 덕도 탓도 없음' : `${rep.cr != null ? '고객 돈' : '내 고르기'} ${pct(rep.pick)} · 같은 비중으로 시장 전체를 샀다면 ${pct(rep.bench)}`, p: rep.pick > rep.bench + SH.R.loop_beat_market_min ? 1 : 0 });
    if (!R) g.push(yr(st.rank === 'founder' ? '내 운용사 지키기' : '다시 일어서기', { text: st.rank === 'founder' ? `회사 현금 ${won(st.funds.firm_cash)} · 운용 자산 ${won(st.funds.aum)}` : '월급이 없다 — 가진 돈을 굴려 버틴다', p: 0.5 }));
    else if (i >= 6) { const t = '2005년 겨울까지'; g.push(yr('대표 자리 지키기', { short: t, text: t, p: 1 })); }
    else { const nx = SH.RANK_ORDER[i + 2], need = (SH.R.loop_promo_worth || {})[nx] || 0, eq = equity(st), lock = i === N.ranks.length - 2 && SH.ym(st.date).y < SH.R.loop_ceo_promo_year;
      g.push(yr(`${N.ranks[i + 1].n} 진급`, { short: `${won(Math.max(0, eq))} / ${won(need)}`, text: `내 평가액(주식 + 현금 − 빚) ${won(eq)} / ${won(need)}` + (lock ? ` · ${SH.R.loop_ceo_promo_year}년부터` : ''), p: clamp(eq / Math.max(1, need), 0, 1) })); }
    const w = worth(st), lots = st.land ? Object.keys(st.land.lots).length : 0;
    if (!lots && SH.loopLandGoal) g.push(SH.loopLandGoal(st));
    else { const t = w < 1e8 ? 1e8 : w < 1e9 ? 1e9 : 1e10; g.push({ ko: `인생 — 재산 ${won(t)}`, text: `${won(Math.max(0, t - w))} 남음(지금 ${won(w)})`, p: clamp(w / t, 0, 1) }); }
    return g;
  };
  /* 첫 땅까지(땅 엔진 land.js 의 가장 싼 땅 · 빌릴 수 있는 만큼 빌렸을 때 드는 내 돈) */
  SH.loopLandGoal = function (st) {
    const D = (SH.D && SH.D.lands) || {}, lots = D.first_lots || []; if (!lots.length) return { ko: '인생 — 재산 1.00억', text: `${won(Math.max(0, 1e8 - worth(st)))} 남음`, p: clamp(worth(st) / 1e8, 0, 1) };
    const id = lots.slice().sort((a, b) => a.base - b.base)[0].lot, price = SH.landPrice(st, id), maxLoan = (D.loan && D.loan.land) || 0.5, need = Math.round(price * (1 - maxLoan)), open = SH.landOpen(st), nm = (SH.RK[D.open_rank || 'manager'] || {}).name_ko;
    return { ko: '인생 — 첫 땅', text: st.s.money >= need ? (open ? '내 돈이 모였다 — 지도의 땅에서 계약할 수 있음' : `내 돈은 모였다 — ${nm}부터 살 수 있음`) : `내 돈 ${won(need)}까지 ${won(need - st.s.money)} 남음` + (open ? '' : ` · ${nm}부터`), p: clamp(st.s.money / Math.max(1, need), 0, 1) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
