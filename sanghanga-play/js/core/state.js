/* =====================================================================
   state.js — 게임 상태 한 덩어리와 숫자 바꾸기
   - 상태는 순수한 객체(JSON 으로 저장 가능) · 화면 코드는 상태를 읽기만 함
   - 숫자 키는 숫자 초안 1-1 과 같음: money hp stress analysis talk network rep style
   - 돈 칸 나눔 자리(기획 결정 A8): 내 돈 s.money · 회사 현금 · 고객 운용 자산 · 검은돈 — 지금은 0 으로 둠
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const STAT_KEYS = ['money', 'hp', 'stress', 'analysis', 'talk', 'network', 'rep', 'style'];
  SH.STAT_KEYS = STAT_KEYS;
  SH.SAVE_VERSION = 2;   // 저장 판 번호 한 곳(새 판 v · save.js 가 읽음) — 11-13 돈 고리: 사원부터의 한 달이 바뀌어 옛 저장(판 1)은 못 이음 — 대표님 '저장 호환은 깸'
  const SKILLS = ['analysis', 'talk', 'network'];

  SH.newGame = function (seed) {
    seed = (seed == null ? Date.now() : seed) | 0;
    const start = {};
    SH.D.stats.items.forEach(x => { start[x.id] = x.start; });
    const st = {
      v: SH.SAVE_VERSION, seed, rs: seed, rp: (seed ^ 0x9E3779B9) | 0, pc: {}, poolTick: -99,   // rp · pc · poolTick = 소사건 풀(씨앗 · 본 횟수 · 마지막 마디)
      tick: 0, mode: 'week', week: 1, date: SH.D.events_act1.act_dates.start,
      act: 1, rank: SH.RANK_FIRST, rankSince: 0,
      s: Object.assign({}, start),
      funds: { firm_cash: 0, aum: 0, dirty_money: 0, group_money_amount: 0 },   // 기획 결정 A8 · R2 양식 더함
      counts: {}, pledge: { share: 0, trust: 0 }, team: {}, sideJob: null, rankTarget: null, employed: true,
      body: 1,
      rel: {}, flags: {}, seen: {}, groups: {}, opened: {}, miles: {},
      task: null, tasks: [], hints: [],
      wk: null, phase: 'tick_start', si: 0, q: [],
      collapses: 0, lostNext: 0, burnNext: false, debtTicks: 0,
      owned: SH.GAME.start_owned.slice(), equip: Object.assign({}, SH.GAME.start_equip), suitCustom: false,
      L: null, love: null, ex: null, grades: [], period: { ok: 0, n: 0 },
      conv: null, ext: false, honest: 0, workHist: [],
      firsts: [], hist: [], income: 0, yearShown: {},
      ending: null, endTick: null, log: [], errors: []
    };
    Object.keys(SH.CH).forEach(cid => { if (cid !== SH.GAME.hero) st.rel[cid] = { aff: 0, st: 0, q: false, met: -99 }; });
    SH.D.places.items.forEach(p => { if (p.unlock && p.unlock.kind === 'start') st.opened[p.id] = true; });
    SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.first_day);
    return st;
  };

  /* ── 숫자 ── */
  // 실력·평판은 50 넘으면 오름 절반, 80 넘으면 1/4 (숫자 초안 1-1) · 분기 마디는 ×2 (2-1)
  // 직급 · 끝 갈래를 바꾸는 문(11-14 밤 정리 A4) — 곳마다 다른 일(기록 · 알림 · 표지 · '이미 정해졌으면 안 덮음')은 부르는 쪽에 그대로 둠
  SH.setRank = function (st, rid) { st.rank = rid; st.rankSince = st.tick + 1; };      // 새 직급은 다음 마디부터 셈
  SH.setEnding = function (st, id) { st.ending = id; st.endTick = st.tick; };
  SH.addStat = function (st, k, v, scale) {
    if (!v) return 0;
    const s = st.s;
    if (v > 0 && (SKILLS.includes(k) || k === 'rep')) {
      const cur = s[k];
      v = v * (scale || 1);
      // 80 부터는 높을수록 더 천천히: 80 → 1/4 · 90 → 1/8 · 95 → 1/10 (11-12 숫자 균형 — 2막에 실력이 100에 닿던 것)
      if (cur >= SH.R.gain_quarter_at) v = v / (4 + (cur - SH.R.gain_quarter_at) * 0.4); else if (cur >= SH.R.gain_half_at) v = v / 2;
      // 끝수는 확률로(0.25 면 넷에 한 번 +1) — '최소 1'이면 80 넘어서도 칸마다 +1씩 쌓여 2막에 100에 닿음(11-12 숫자 균형)
      const whole = Math.floor(v); v = whole + (SH.rng(st) < v - whole ? 1 : 0);
      if (!v) return 0;
    }
    const before = s[k];
    s[k] = before + v;
    const def = SH.D.stats.items.find(x => x.id === k);
    if (def && def.min != null) s[k] = Math.max(def.min, s[k]);
    if (def && def.max != null) s[k] = Math.min(def.max, s[k]);
    if (k === 'money' && v > 0) st.income += v;
    if (k === 'money' && s[k] !== before) SH.whyAdd(st, s[k] - before);
    if (k === 'stress' && s[k] > before) {   // 넘는 순간 한 줄(피드백 45)
      const R = SH.R, up = (t) => before < t && s[k] >= t;
      if (up(R.stress_high)) SH.toast(st, `스트레스 ${R.stress_high} — 업무가 잘 안 풀리고 마음이 덜 열린다`);
      else if (up(R.rush_stress_min)) SH.toast(st, `스트레스 ${R.rush_stress_min} — 조급해졌다`);
      else if (st.mode === 'week' && R.stress_mid != null && up(R.stress_mid)) SH.toast(st, `스트레스 ${R.stress_mid} — 일이 손에 덜 잡힌다`);
    }
    if (k === 'hp' && s[k] < before && st.mode === 'week' && SH.R.hp_low != null) {   // 156: 체력이 문턱 아래로 내려가는 순간 한 줄
      const R = SH.R, down = (t) => before > t && s[k] <= t;
      if (down(R.hp_floor)) SH.toast(st, `체력 ${R.hp_floor} — 바닥이다. 일이 거의 안 풀린다`);
      else if (down(R.hp_low)) SH.toast(st, `체력 ${R.hp_low} — 지쳤다. 일이 덜 풀린다`);
    }
    return s[k] - before;
  };
  /* ── 결산 '왜'(대표님 결정 5): 이 마디에 돈이 어디서 얼마 들고 났는지 — 이름표별 합 = 결산 돈 큰 숫자 ──
     이름표는 돈을 바꾸는 자리에서 SH.addMoney(st, 값, 이름표) 로 붙임 · 화면 계산엔 안 씀(보여 주기만) */
  SH.whyAdd = (st, d, why) => { const w = st.why || (st.why = {}), k = why || SH._why || '그 밖'; w[k] = (w[k] || 0) + d; };
  SH.addMoney = (st, v, why) => { const o = SH._why; SH._why = why; try { return SH.addStat(st, 'money', v); } finally { SH._why = o; } };
  SH.withWhy = (why, fn) => { const o = SH._why; SH._why = why; try { return fn(); } finally { SH._why = o; } };
  SH.skillAvg = (st) => Math.round((st.s.analysis + st.s.talk + st.s.network) / 3);

  /* ── 관계: 호감 · 단계 · 다툼 ── */
  SH.stages = (cid) => (SH.CH[cid] && SH.CH[cid].stages) || [];
  // '가 또는 나' 갈래 단계는 둘 중 하나만 써도 같은 칸 (R2 양식 더함 '갈래 단계 이름')
  SH.stageIdx = function (cid, name) {
    return SH.stages(cid).findIndex(s => s.name_ko === name || s.name_ko.split(' 또는 ').map(x => x.trim()).includes(name));
  };
  SH.stageName = (st, cid) => { const s = SH.stages(cid)[st.rel[cid] ? st.rel[cid].st : 0]; return s ? s.name_ko : '모름'; };
  // 문턱(20·45·75)을 넘으면 단계가 오름 — 단, 첫 만남(단계 1) 전에는 안 오르고, 마지막 단계는 이벤트로만(기획 결정 A4)
  SH.autoStage = function (st, cid) {
    const r = st.rel[cid]; if (!r || r.st < 1) return;
    const list = SH.stages(cid);
    let top = list.length - 1;
    // 마지막 단계(연인 등)는 호감 75 + 고백 표지(confessed_<인물>)가 있을 때만 (기획 결정 A4)
    if (SH.R.lover_needs_event && list.length >= 5 && !st.flags['confessed_' + cid]) top = list.length - 2;
    for (let i = r.st + 1; i <= top; i++) {
      const m = list[i].min_affection;
      if (m != null && r.aff >= m) r.st = i; else break;
    }
  };
  SH.addAff = function (st, cid, v, why) {
    const r = st.rel[cid]; if (!r || !v) return 0;
    if (v > 0 && st.s.stress >= SH.R.stress_high) v = Math.ceil(v / 2);
    const b = r.aff;
    r.aff = SH.clamp(r.aff + v, 0, 100);
    const before = r.st;
    SH.autoStage(st, cid);
    if (r.st > before) SH.note(st, `${SH.name(cid)} — '${SH.stageName(st, cid)}'`, 'stage');
    return r.aff - b;
  };
  SH.setStage = function (st, cid, name) {     // 올리기만 (내리는 건 다툼 규칙뿐)
    const r = st.rel[cid]; if (!r) return;
    const i = SH.stageIdx(cid, name);
    if (i > r.st) { r.st = i; SH.note(st, `${SH.name(cid)} — '${name}'`, 'stage'); }
  };

  /* ── 끌림 태그 (숫자 초안 1-3) ── 지금 참인 태그 모음 */
  SH.tags = function (st) {
    const t = new Set(['humble_origin']);
    if (SH.skillAvg(st) >= SH.R.tag_skill_avg) t.add('skill');
    if (st.honest > 0) t.add('honest');
    const h = st.workHist.slice(-4);
    if (h.length) {
      const r = h.reduce((a, b) => a + b, 0) / h.length;     // 업무·야근 칸 / 일할 수 있는 칸(출근·밤 둘)
      if (r >= SH.R.tag_diligent_ratio) t.add('diligent'); else if (r < SH.R.tag_lazy_ratio) t.add('lazy');
    }
    if (st.s.talk >= SH.R.tag_humor_talk) t.add('humor');
    if (st.s.stress <= SH.R.ease_stress_max) t.add('ease');
    if (st.s.stress >= SH.R.rush_stress_min) t.add('rush');
    let flashy = 0;
    Object.values(st.equip).forEach(id => {
      const it = SH.SHOP[id]; if (!it) return;
      (it.tags || []).forEach(x => t.add(x));
      if ((it.tags || []).includes('flashy')) flashy += it.style;
    });
    if (flashy < SH.R.tag_flashy_style) t.delete('flashy');
    // 대담(bold · stats.json 정의 '한 종목에 절반 넘게 건 적') — 11-13 정의만 있고 구현이 빠져 윤세라 끌림 셋 중 하나가 얻을 수 없었음(조사 확정)
    const L = st.L;
    if (L) { const total = SH.loopStockV(st) + Math.max(0, st.s.money); if (total > 0 && Object.keys(L.pos).some(i => L.pos[i] * L.px[i] > total * SH.R.tag_bold_share)) t.add('bold'); }
    return t;
  };

  /* ── 열림 ── */
  SH.rankAtLeast = (st, rid) => {
    if (st.rank === 'jobless') return false;
    if (st.rank === SH.RANK_BRANCH) return SH.RANK_ORDER.indexOf(rid) <= SH.RANK_ORDER.indexOf(SH.RANK_BRANCH_FROM);
    return SH.RANK_ORDER.indexOf(st.rank) >= SH.RANK_ORDER.indexOf(rid);
  };
  // 112(11-14 대표님 '새로운 장소가 열릴 때 이제 어디에 가볼 수 있다 라는 알림'): 차례가 시작될 때 지금 열린 곳을 아는 곳(st.known)과 맞대 새로 열린 곳을 알림 — 열리는 길(단계 · 직급 · 주 · 장면)이 여럿이라 한 곳에서 봄
  //   st.known[장소] = 열린 것을 안 때(st.tick · 처음부터 열려 있던 곳은 −1) — 지도 이름표의 '새로'가 이 값을 봄
  SH.newPlaces = function (st) {
    const open = SH.D.places.items.filter(p => p.id && SH.isOpen(st, p.id));
    if (!st.known) { st.known = {}; open.forEach(p => { st.known[p.id] = -1; }); return; }
    open.forEach(p => { if (st.known[p.id] == null) { st.known[p.id] = st.tick; SH.toast(st, `새 장소 — 이제 ${String(p.name_ko || p.id).replace(/\(.*\)/, '').trim()}에 가 볼 수 있다`); } });
  };
  SH.isOpen = function (st, pid) {
    const p = SH.PL[pid]; if (!p) return false;
    if (st.opened[pid]) return true;
    const u = p.unlock || {};
    if (u.kind === 'milestone') return !!st.miles[u.id];
    if (u.kind === 'stage') { const r = st.rel[u.person]; return !!r && r.st >= SH.stageIdx(u.person, u.stage); }
    if (u.kind === 'rank') {
      if (!SH.rankAtLeast(st, u.id) && !(u.id === SH.RANK_BRANCH && st.rank === SH.RANK_BRANCH)) return false;
      return !p.style_min || st.s.style >= p.style_min;
    }
    if (u.kind === 'week' && (p.actions || []).length) return st.mode !== 'week' || st.week >= u.week;   /* 116: 할 일이 있는 장소는 그 주부터 스스로 열림(새 장소 여섯) */
    return false;    // text · event_only · (할 일 없는) week — 카드의 unlocks 가 엶
  };
  SH.mile = function (st, id) { if (!st.miles[id]) { st.miles[id] = st.tick + 1; return true; } return false; };

  /* ── 기록 ── */
  SH.note = function (st, text, kind) { st.log.push({ t: st.tick, text, kind: kind || 'info' }); if (st.log.length > 300) st.log.shift(); };
  // 처음들 표의 한 줄([제목, 한 줄, 아이콘] — 원본 04_시범/대사/화면_글.json 의 FIRSTS)을 자리표를 채워 적음 · 채우는 키는 build_data.py 가 이 부름을 읽어 검사
  SH.addFirstOf = (st, f, o) => SH.addFirst(st, SH.fillKeys(f[0], o || {}), SH.fillKeys(f[1], o || {}), f[2]);
  SH.addFirst = function (st, title, sub, icon) {
    if (st.firsts.some(f => f.title === title)) return;
    // 인턴(주 마디)은 그 칸의 요일로: 평일 칸은 월~수 · 결산은 금 · 토 · 일
    const off = st.mode === 'week' ? [0, 1, 2, 4, 5, 6][Math.min(5, st.si || 0)] : 0;
    st.firsts.push({ date: off ? SH.addDays(st.date, off) : st.date, title, sub: sub || '', icon: icon || 'star' });
  };
  // 같은 마디의 같은 오류 글은 한 번만 · 모두 ERR_MAX 줄까지(못 고르는 번호를 되풀이해도 저장이 끝없이 안 붇게 — 새 눈 검토 3 지적 10)
  const ERR_MAX = 200;
  SH.err = function (st, msg) { const m = `${st.tick}:${msg}`; if (st.errors.length < ERR_MAX && !st.errors.includes(m)) st.errors.push(m); };
})(typeof window !== 'undefined' ? window : globalThis);
