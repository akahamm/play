/* =====================================================================
   save.js — 저장 · 불러오기 (저장소는 SH.store — 브라우저에선 화면 쪽이 localStorage 를 꽂음 · 이 기기 이 브라우저에만 남음)
   - 자동 저장 한 칸(고를 때마다) + 손 저장 칸 셋 + 글자 묶음으로 내보내기/불러오기
   - 사생활 창 · 막힌 저장소에서는 조용히 실패함(try/catch) → 게임은 저장 없이도 돎
   - 저장에는 판 번호(v)와 id 만 씀(카드 · 장소 · 물건은 id) → 데이터가 바뀌어도 migrate 로 옮김
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const KEY = 'sanghanga_trial_save_v1';
  const SLOT = (n) => `sanghanga_trial_slot${n}`;
  // 저장소 한 곳(11-14 · 검토 2): 엔진은 브라우저를 모름 — 화면 쪽(ui/common.js 맨 위)이 이 기기 브라우저 저장소를 SH.store 로 꽂음
  // 앱 · 스팀 · 시험으로 옮길 땐 SH.store 만 { get, set, remove } 로 갈아 끼움(던지면 아래 try 가 조용히 실패로 받음) · 꽂은 것이 없으면 메모리(창을 닫으면 사라짐)
  SH.store = SH.store || (() => { const m = new Map(); return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => { m.set(k, String(v)); }, remove: (k) => { m.delete(k); } }; })();
  const VERSION = SH.SAVE_VERSION;   // 판 번호는 state.js 한 곳(새 판과 저장이 같은 값을 봄)
  const pack = (st) => JSON.stringify(Object.assign({}, st, { toasts: [], showCg: null, v: VERSION }, st.L ? { L: stockOut(st.L) } : {}, st.rel ? { rel: relOut(st.rel) } : {}, { sx: SX }));
  /* 사람과의 단계도 번호 대신 이름으로(11-14 — 종목 · 가게 물건에 이은 저장의 마지막 '차례 번호'): 인물 카드에서 단계를 끼우거나 차례를 바꿔도 옛 저장의 사이가 그대로.
     저장할 때만 단계 이름(sn)을 같이 쓰고(상태는 안 건드림), 읽을 때 그 이름의 지금 번호로 되돌린 뒤 뗌. 이름이 지금 자료에 없으면(단계 이름을 바꿈) 저장된 번호 그대로.
     이름 없는 옛 저장은 아래 얼려 둔 표(11-14 의 단계 이름 · 바꾸지 말 것)로 번호 → 이름을 풂. */
  const STG_1114 = {"reporter": ["모름", "취재원", "친구", "썸", "연인"], "heiress": ["모름", "구경꾼", "재밌는 사람", "썸", "연인"], "analyst": ["모름", "아는 후배", "믿는 후배", "썸", "연인"], "barowner": ["모름", "손님", "단골", "썸", "연인"], "boss": ["모름", "무시", "쓸 만한 놈", "인정", "내 밑 또는 내 편"], "rival": ["모름", "깔봄", "경쟁", "인정", "친구 또는 원수"], "client": ["모름", "문전박대", "들어는 봄", "믿음", "평생 고객"], "exec_oh": ["모름", "눈여겨봄", "심부름꾼", "내 사람", "한배 또는 적"], "rival_father": ["모름", "모르는 얼굴", "눈엣가시", "거래 상대 또는 적"], "chairman_yoon": ["모름", "딸의 손님", "쓸 만한 사윗감", "한식구 또는 걸림돌"], "npc_tailor": ["모름", "손님", "단골"]};   /* 뼈대 이름 허용: 옛 저장(11-14 앞)의 단계 번호를 이름으로 풀려고 얼려 둔 표 */
  function relOut(rel) { const o = {}; for (const c in rel) { const r = rel[c], s = r && typeof r === 'object' ? SH.stages(c)[r.st] : null; o[c] = s ? Object.assign({}, r, { sn: s.name_ko }) : r; } return o; }
  function relIn(st) { const rel = st.rel; if (!rel || typeof rel !== 'object') return;
    for (const c in rel) { const r = rel[c]; if (!r || typeof r !== 'object') continue;
      const name = r.sn != null ? r.sn : (STG_1114[c] || [])[r.st]; delete r.sn;
      if (typeof name === 'string' && SH.CH && SH.CH[c]) { const i = SH.stages(c).findIndex(x => x.name_ko === name); if (i >= 0) r.st = i; } } }
  /* 종목은 이름표로 저장(11-14 나중 할 일 ①-12): 도는 동안은 종목을 '몇 번째'(SH.loopStocks() 의 i)로 가리킴 — 저장할 때만 id 로 바꿔 쓰고 읽을 때 지금 차례로 되돌림
     → 종목을 가운데 끼우거나 차례를 바꿔도 옛 저장이 제 종목을 듦 · 새 종목은 시작 값 · 지워진 종목을 들고 있으면 그 주의 마지막 값으로 팔아 현금(빚부터 갚음)으로 돌려줌
     번호를 쓰는 칸(새 칸을 더하면 여기도): 배열 px · pxh · wpx · b0.px / 종목이 키인 묶음 pos · cost · ord · clEx · src · at · bottom · mon.pnl · mon.src / 종목을 id 칸에 든 것 events · known · pool 의 표결 · vote */
  const SX = 2;   // 저장 꼴 표지(판 번호와 따로) — 없으면 번호로 저장된 옛 저장 · 1 = 종목 이름표 · 2 = 단계 이름표(sn)까지(11-14 검토 4 지적 1: 단계 이름표를 더하며 안 올려, 되돌린 앞 판이 새 저장을 읽고 낡은 sn 을 다시 써 올라간 단계를 잃었음 → 앞 판은 2 를 모르는 꼴로 버림)
  const STK_1114 = ['cheongwoon_elec', 'hanbit_bank', 'daeyang_const', 'nuri_telecom', 'cheongwoon_chem', 'mirae_retail', 'dongbang_sec', 'cheongwoon_net', 'deoksan', 'saerom_venture', 'gold_dotcom'];   // 11-14 이전 저장(표지 없음)의 종목 차례 · 바꾸지 말 것   /* 뼈대 이름 허용: 옛 저장(11-14 앞)의 종목 차례를 얼려 둔 표 */
  const S_ARR = ['px', 'pxh', 'wpx'], S_KEY = ['pos', 'cost', 'ord', 'clEx', 'src', 'at', 'bottom'], M_KEY = ['pnl', 'src'];
  // L 의 종목 칸을 f(옛 표시) → 새 표시로 바꾼 사본 · arr: 배열을 { 표시: 값 } 으로(true) 또는 그 반대(false · mk 가 지금 차례 배열을 만듦)
  function stockMap(L, f, mk) {
    const obj = (o) => { if (!isObj(o)) return o; const r = {}; Object.keys(o).forEach(k => { const n = f(k); if (n != null) r[n] = o[k]; }); return r; };
    const arr = (a, name) => mk ? mk(a, name) : Array.isArray(a) ? obj(Object.assign({}, a)) : a;
    S_ARR.forEach(k => { if (k in L) L[k] = arr(L[k], k); });
    if (isObj(L.b0) && 'px' in L.b0) L.b0.px = arr(L.b0.px, 'wpx');
    S_KEY.forEach(k => { if (k in L) L[k] = obj(L[k]); });
    if (isObj(L.mon)) M_KEY.forEach(k => { if (k in L.mon) L.mon[k] = obj(L.mon[k]); });
    const one = (it) => { if (!isObj(it) || !('id' in it)) return true; const n = f(it.id); if (n == null) return false; it.id = n; return true; };
    ['events', 'known'].forEach(k => { if (Array.isArray(L[k])) L[k] = L[k].filter(one); });
    if (Array.isArray(L.pool)) L.pool = L.pool.filter(o => !isObj(o) || o.t !== 'vote' || one(o));
    if (isObj(L.vote) && !one(L.vote)) L.vote = null;
    return L;
  }
  function stockOut(L) {   // 저장할 때: 번호 → id (상태는 안 건드림 — 사본에서)
    const T = SH.loopStocks();
    return stockMap(JSON.parse(JSON.stringify(L)), (i) => { const s = T[i]; if (!s) throw new Error('없는 종목 번호 ' + i); return s.id; });
  }
  function stockIn(st, ids) {   // 읽을 때: id → 지금 번호 · ids 가 있으면 번호로 저장된 옛 저장(먼저 그 차례로 id 를 품)
    const L = st.L, T = SH.loopStocks(), at = {}; T.forEach(s => { at[s.id] = s.i; });
    if (ids) stockMap(L, (i) => { const id = ids[i]; if (id == null) throw new Error('없는 종목 번호 ' + i); return id; });
    // 지워진 종목을 들고 있으면: 지금 값(px)으로 팔아 빚부터 갚고 남은 것을 현금으로(조용히 사라지게 두지 않음 — 그 판을 버리는 것보다 덜 잃음)
    if (isObj(L.pos)) Object.keys(L.pos).forEach(id => { if (id in at) return; const px = isObj(L.px) ? L.px[id] : null, v = Math.round((L.pos[id] || 0) * (Number.isFinite(px) ? px : 0));
      if (!(v > 0) || !st.s || !Number.isFinite(st.s.money)) return; const pay = Number.isFinite(L.debt) ? Math.min(Math.max(0, L.debt), v) : 0; L.debt -= pay; st.s.money += v - pay;
      if (SH.whyAdd) SH.whyAdd(st, v - pay, '없어진 종목 정리'); if (SH.toast) SH.toast(st, `없어진 종목을 정리해 ${SH.won ? SH.won(v) : v} 받음`); });   // 이름은 자료에서 지워졌고 저장에도 없음 — 영문 id 는 안 보임(새 눈 검토 3 지적 6)
    const fill = { px: (s) => s.base, pxh: () => [] };
    return stockMap(L, (id) => (id in at ? at[id] : null), (o, name) => {
      if (!isObj(o)) return Array.isArray(o) ? null : o;   // 표지가 있는데 배열이면 번호로 된 것 — 꼴 검사가 버림
      return T.map(s => s.id in o ? o[s.id] : name === 'wpx' ? (Array.isArray(L.px) ? L.px[s.i] : s.base) : fill[name](s));   // 새 종목: 시작 값 · 값 그림 빔 · 주 기준 값은 지금 값(px 를 먼저 되돌림)
    });
  }
  // 판 번호가 다른 저장을 지금 꼴로 옮기는 자리 (판 2 가 생기면 여기에 한 단계씩)
  SH.migrate = function (st) {
    if (!st || typeof st !== 'object') return null;
    if (st.v === VERSION) {   // 같은 판 안에서 늘어난 칸은 기본값으로 채움(판 번호를 안 올림 — 옛 저장이 안 버려짐)
      if (st.rp == null) st.rp = (st.seed ^ 0x9E3779B9) | 0;
      if (!st.pc) st.pc = {};
      if (st.poolTick == null) st.poolTick = -99;
      const sx = st.sx; delete st.sx;   // 꼴 표지는 읽을 때만 씀(도는 상태엔 안 남김)
      relIn(st);   // 단계 이름 → 지금 번호(이름표는 읽을 때만 씀)
      return shapeOk(st, sx === SX || sx === 1 ? null : sx == null ? STK_1114 : false);
    }
    return null;      // 모르는 판은 버림
  };
  // 꼴 검사(11-14 칸 지우기 실험 · 검토 2): 판 번호만 맞고 칸이 빠지거나 꼴이 틀린 저장 — 엉뚱한 상태로 조용히 이어 가는 것이 버리는 것보다 나쁨
  // 진행 칸(없으면 그 판이 무엇인지 모름)은 없거나 꼴이 틀리면 버림(null) · 채워도 되는 칸(뒤에 늘어남 · 기록 · 보이는 것)만 새 판 값으로 채움
  // newGame · loopInit 에 칸을 더하면 아래 둘 가운데 한 곳에 꼭 적음(rules_test 가 빠진 이름을 잡음) · 애매하면 진행 칸
  // 꼴: n 유한한 수 · s 글 · b 참거짓 · a 배열 · o 묶음 · 뒤에 ? 면 null 도 됨 · * 아무 값(칸만 있으면 됨)
  const MUST = { seed: 'n', rs: 'n', tick: 'n', mode: 's', week: 'n', date: 's', act: 'n', rank: 's', rankSince: 'n', s: 'o', funds: 'o', counts: 'o', pledge: 'o', team: 'o', sideJob: 'o?', rankTarget: 's?', employed: 'b', body: 'n',
    rel: 'o', flags: 'o', seen: 'o', groups: 'o', opened: 'o', miles: 'o', task: 'o?', tasks: 'a', hints: 'a', wk: 'o?', phase: 's', si: 'n', q: 'a', collapses: 'n', lostNext: 'n', burnNext: 'b', debtTicks: 'n',
    owned: 'a', equip: 'o', suitCustom: 'b', L: 'o?', love: 'o?', ex: 'o?', grades: 'a', period: 'o', conv: 's?', ext: 'b', honest: 'n', workHist: 'a', income: 'n', ending: 's?', endTick: 'n?' };
  const FILL = ['rp', 'pc', 'poolTick', 'firsts', 'hist', 'yearShown', 'log', 'errors'];   // rp · pc · poolTick 은 위 migrate 가 채움
  const NUMS = ['s', 'funds', 'pledge', 'period'];   // 이 묶음들은 새 판에 있는 숫자 칸이 모두 유한한 수여야 함(NaN 이 오류 없이 끝까지 감)
  // 돈 고리 계좌(사원부터): loopInit 의 칸은 모두 진행 칸 · 뒤에 는 칸 dead · own · sp0 은 엔진이 달 첫머리(loopMonthStart)에 스스로 채움
  // → 달 첫머리를 한 번 지난 계좌(monTick 있음)에 dead · own 이 없으면 여기서 채움(달 중간 저장이면 엔진이 안 채우고 L.own[id] 에서 던짐) · sp0 은 읽는 곳이 없으면 넘김
  const L_MUST = { v: 'n', mr: 'n', pr: 'n', n: 'n', week: 'n', px: 'a', pxh: 'a', pos: 'o', cost: 'o', ord: 'o', clEx: 'o', src: 'o', open: 'o', debt: 'n', events: 'a', known: 'a', eseq: 'n', aumK: 'n', noCare: 'n', hist: 'a',
    bonus: 'n', inRank: 'n', rankSeen: 's', noLev: 'n', wiped: 'n', forced: 'n', caught: 'n', peak: 'n', lastScene: 'n', heard: 'n', hit: 'n', miss: 'n', track: 'a', pool: 'a?', mon: 'o?', b0: '*', down: 'b', usedInside: 'b', clCap: '*', told: 'o' };
  const L_FILL = ['dead', 'own'];   // 빈 묶음 · 엔진이 채우는 차례 그대로
  // 돌다가 생기는 칸(11-14 ①-13): 새 판(newGame · loopInit)엔 없고 엔진이 처음 쓰는 자리에서 만듦(st.x = st.x || … 꼴) — 없는 게 정상인 때가 있어 읽을 때 채우지 않음
  // (읽을 때 채우면 그 칸이 생기는 때가 달라져 상태 꼴 · 로봇 해시가 바뀜 · known · land 처럼 '없음'이 뜻을 갖는 칸도 있음) · 새 칸은 MUST · FILL · 여기 셋 가운데 한 곳에(rules_test 가 저장 · 걸음에서 본 칸과 맞댐)
  const LATE = ['why', 'toasts', 'known', 'notices', 'showCg', 'convFirst', 'convAt', 'pendingAct', 'land', 'taskOverride', 'cashTarget', 'endTitle', 'usedSlots', 'final', '_firstLand', 'lastUpkeep', 'verdictCount', 'skipSettle', 'closedQ', 'memo', 'first'];
  const L_LATE = ['monTick', 'loveNote', 'lost', 'last', 'wpx', 'setTick', 'seasonM', 'crashSeen', 'at', 'bottom', 'ownRep', 'payoffSeen', 'fq', 'fqb', 'vote', 'votedM'];
  // 달 중간(달 첫머리를 이미 돈 단계)인데 달 첫머리 표시(L.monTick)가 빠진 저장 — 그대로 두면 달 첫머리를 한 번 더 돌아 소문 · 만날 사람을 새로 뽑음 → 이 달로 채움
  // (정상 저장 1,390개에서 이 단계면 늘 monTick === tick · 'tick_start' 와 첫 'lmap' 은 아직 안 돈 때라 없어도 정상)
  const MID = ['lmap_wait', 'tick_events', 'tick_slots', 'lmarket', 'lsettle'];
  SH.SAVE_SHAPE = { MUST, FILL, L_MUST, L_FILL: L_FILL.concat('sp0'), LATE, L_LATE };   // 시험이 newGame · loopInit 칸 · 저장에서 본 칸과 맞대 봄
  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  const fits = (v, t) => t === '*' || (t.endsWith('?') && v === null) || ({ n: Number.isFinite(v), s: typeof v === 'string', b: typeof v === 'boolean', a: Array.isArray(v), o: isObj(v) })[t[0]];
  const allFit = (o, spec) => Object.keys(spec).every(k => k in o && fits(o[k], spec[k]));
  let NEW = null;   // 새 판 하나(처음 한 번만 만듦 — 숫자 칸 이름을 봄)
  function shapeOk(st, ids) {
    if (ids === false) return null;   // 모르는 꼴 표지(뒤 판에서 만든 저장)
    if (!allFit(st, MUST)) return null;
    if (st.mode !== 'week' && st.mode !== 'month') return null;
    if (st.rank === SH.RANK_FIRST ? st.mode !== 'week' : st.mode === 'week' && st.pendingAct !== 2) return null;   // 인턴은 주 마디뿐 · 주 마디인데 인턴이 아니면 2막을 기다리는 마지막 주(pendingAct 2)뿐
    if (st.rank !== SH.RANK_FIRST && !st.L) return null;   // 사원부터는 돈 고리 계좌가 있어야 함(진급 때 엶)
    let fresh = null;
    try {
      NEW = NEW || SH.newGame(0);
      if (NUMS.some(k => Object.keys(NEW[k]).some(x => !Number.isFinite(st[k][x])))) return null;
      if (Object.values(st.rel).some(r => !isObj(r) || !Number.isFinite(r.aff) || !Number.isFinite(r.st))) return null;
      if (st.L) {
        stockIn(st, ids);
        if (!allFit(st.L, L_MUST) || !st.L.px.every(Number.isFinite)) return null;
        if (st.mode === 'month' && MID.includes(st.phase) && !('monTick' in st.L)) st.L.monTick = st.tick;
        if ('monTick' in st.L) L_FILL.forEach(k => { if (!(k in st.L)) st.L[k] = {}; });
      }
      FILL.forEach(k => { if (!(k in st)) { fresh = fresh || SH.newGame(st.seed | 0); st[k] = fresh[k]; } });
      // 자료가 늘거나 줄었을 때(인물을 더함 · 뺌 · 카드를 뺌): 새 인물은 새 판 값 · 없어진 인물 · 카드는 걷어 냄
      if (st.rel && typeof st.rel === 'object' && SH.CH) {
        Object.keys(SH.CH).forEach(c => { if (c !== SH.GAME.hero && !st.rel[c]) st.rel[c] = { aff: 0, st: 0, q: false, met: -99 }; });
        Object.keys(st.rel).forEach(c => { if (!SH.CH[c]) delete st.rel[c]; });
        if (st.love && st.love.who && !SH.CH[st.love.who]) st.love = null;
      }
      if (Array.isArray(st.q) && SH.EV) st.q = st.q.filter(it => !it || it.t !== 'event' || SH.EV[it.id]);
    } catch (e) { return null; }
    return st;
  }
  const get = (k) => { try { const t = SH.store.get(k); return t ? SH.migrate(JSON.parse(t)) : null; } catch (e) { return null; } };
  const set = (k, v) => { try { SH.store.set(k, v); return true; } catch (e) { return false; } };
  // 저장 꼴(pack)도 던질 수 있음(모르는 종목 번호 → stockOut) — 저장소가 막힌 때와 같은 길로 조용히 실패(게임은 저장 없이 돎 · 새 눈 검토 3 지적 5)
  const packed = (st) => { try { return pack(st); } catch (e) { return null; } };
  const put = (k, st) => { const t = packed(st); return t != null && set(k, t); };
  SH.save = (st) => put(KEY, st);
  // 끝 갈래 도감(11-13 리서치 2판 6순위 — 다시 하기 · 프린세스 메이커 · 몬스터 프롬 '다른 끝 보기'): 본 끝 id 를 판 저장과 따로 쌓음
  const DEX = 'sanghanga_trial_endings_v1';
  SH.dexAdd = (id) => { if (!id) return; const l = SH.dex(); if (!l.includes(id)) { l.push(id); set(DEX, JSON.stringify(l)); } };
  SH.dex = () => { try { const t = SH.store.get(DEX); const l = t ? JSON.parse(t) : []; return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  // 다음 판 첫 선택(11-13 대표님 결정 7 — 끝 갈래 도감을 씀 · 시작 화면 한 줄): 본 끝 갈래마다 시작 한 줄이 열림 · 효과는 시작 숫자 하나만 작게
  const FO = (id) => SH.D.ui_lines.FIRST_OPT[id];   /* 이름 · 한 줄 — 원본 04_시범/대사/화면_글.json 의 FIRST_OPT(빈 한 줄 = 효과 없음) */
  SH.FIRST = [
    { id: 'plain', get name() { return FO(this.id)[0]; }, get sub() { return FO(this.id)[1]; }, eff: {} },
    { id: 'fell', get name() { return FO(this.id)[0]; }, get sub() { return FO(this.id)[1]; }, eff: { hp: 10 }, need: 'fall' },
    { id: 'top', get name() { return FO(this.id)[0]; }, get sub() { return FO(this.id)[1]; }, eff: { analysis: 5 }, need: 'top' },
    { id: 'stay', get name() { return FO(this.id)[0]; }, get sub() { return FO(this.id)[1]; }, eff: { network: 5 }, need: 'stay' }
  ];
  SH.firstOpts = () => {
    const d = SH.dex(), kind = (id) => ((SH.ENDINGS || {})[id] || (SH.R2_ENDINGS || {})[id] || [])[2];   // 끝 갈래 표의 셋째 칸(fall · ceo · own · company) — 새 갈래는 표에 한 줄이면 됨
    const g = { fall: d.some(id => kind(id) === 'fall'), top: d.some(id => kind(id) === 'ceo' || kind(id) === 'own'), stay: d.some(id => kind(id) === 'company') };   /* 뼈대 이름 허용: 끝 갈래 종류 이름 'ceo'(직급 id 가 아님) */
    return SH.FIRST.filter(f => !f.need || g[f.need]);
  };
  SH.applyFirst = (st, id) => {
    const f = SH.firstOpts().find(x => x.id === id); if (!f || !f.need) return;
    Object.entries(f.eff).forEach(([k, v]) => { st.s[k] += v; });
    st.first = f.id;
  };
  // 화면이 상태를 직접 고치지 않게 하는 엔진 문(11-13 구조 정리 걸음 4 — 전엔 ui/main.js 가 st.memo · st.stocks.practiced 를 바로 씀)
  SH.setMemo = (st, patch) => { st.memo = Object.assign({}, st.memo, patch); };   // 이어 하기 쪽지(한 일 · 다음) — 칸 순서 done → next 그대로
  SH.loadSave = () => get(KEY);
  // 옛 판(판 1) 저장이 남아 있나 — 시작 화면에 '이어 할 수 없음' 한 줄을 띄우려고(11-13 돈 고리로 판 2)
  SH.hasOldSave = () => { try { const t = SH.store.get(KEY); return !!t && (JSON.parse(t) || {}).v !== VERSION; } catch (e) { return false; } };
  SH.clearSave = function () { try { SH.store.remove(KEY); } catch (e) { /* 저장소가 막혀 있으면 지울 것도 없음 */ } };
  SH.saveSlot = (n, st) => put(SLOT(n), st);
  SH.loadSlot = (n) => get(SLOT(n));
  SH.infoOf = (st) => { try { return st ? `${SH.dateLabel(st)} · ${(SH.RK[st.rank] || {}).name_ko || ''} · ${SH.won(st.s.money)}` : null; } catch (e) { return null; } };   // 못 읽는 저장이면 '비어 있음'처럼
  SH.saveInfo = () => SH.infoOf(SH.loadSave());
  // 글자 묶음: 'SHG1:' + base64(utf-8 JSON) — 다른 기기로 옮길 때 복사해 붙임 · 저장 꼴을 못 만들면 null(화면이 '못 함'을 알림)
  SH.exportText = function (st) {
    const t = packed(st); if (t == null) return null;
    const bytes = new TextEncoder().encode(t);
    let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return 'SHG1:' + (root.btoa ? root.btoa(bin) : Buffer.from(bin, 'binary').toString('base64'));
  };
  SH.importText = function (t) {
    try {
      const m = /^\s*SHG1:([A-Za-z0-9+/=]+)\s*$/.exec(t || ''); if (!m) return null;
      const bin = root.atob ? root.atob(m[1]) : Buffer.from(m[1], 'base64').toString('binary');
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      return SH.migrate(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) { return null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
