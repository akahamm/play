/* =====================================================================
   flow.js — 게임 흐름 (물음 → 답)
   - SH.next(st)   : 지금 플레이어가 정할 것 하나(물음)를 돌려줌 — 화면도 로봇도 이것만 봄
   - SH.answer(st, a): 그 물음에 답함 → 상태가 바뀜
   물음 종류: event(카드) · reply(고른 뒤 한마디) · slot(칸 하나: 어디서 무엇을) · lmap(달 마디: 지도에서 자유 시간 두 칸) · lmeet(만남 장면 틀) · lmarket(장)
            · settle(결산) · shop(가게) · notice(알림) · album(연말 앨범) · end(끝)
   한 주(인턴): 마디 시작 → 월요일 아침 카드 → 출근 · 점심 · 평일 밤 → 금요일 결산(퇴근길) → 토 → 일 → 일요일 밤 '새 주' → 마디 끝
   달(사원부터): 마디 시작 → 지도 두 칸 → 장면 → 그 달 카드 → 장(네 주) → 결산(진급 · 좌천) → 마디 끝 — 돈 고리 loop.js
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const CLOSERS = new Set([SH.CODE_CARDS.pass, SH.CODE_CARDS.ext]);   // 1막을 닫는 카드 — 그날 밤까지 닫음

  /* 끝 갈래 표(id → [이름, 한 줄, 묶음]) — 원본 = 04_시범/대사/끝_갈래.json → 묶음 endings · 쓰는 때 읽음 */
  Object.defineProperty(SH, 'ENDINGS', { get: () => (SH.D && SH.D.endings || {}).ENDINGS, configurable: true });

  function ev(id) { return SH.EV[id]; }
  function push(st, item, front) { if (front) st.q.unshift(item); else st.q.push(item); }

  /* ── 물음 꾸미기 (화면이 바로 쓰게) ── */
  function decorate(st, it) {
    if (it.t === 'event') {
      const e = ev(it.id);
      return Object.assign({}, it, { ev: e, lines: SH.eventLines(st, e), choices: SH.eventChoices(st, e), cg: SH.cgPath(e.art && e.art.cg) ? e.art.cg : null });
    }
    if (it.t === 'slot') return Object.assign({}, it, { slot: SH.SLOTS[it.si] });
    return it;
  }

  SH.next = function (st) {
    for (let guard = 0; guard < 400; guard++) {
      if (st.q.length) return decorate(st, st.q[0]);
      if (st.ending) return { t: 'end', ending: st.ending, info: SH.ENDINGS[st.ending] || (SH.R2_ENDINGS || {})[st.ending] || [st.endTitle || '끝', st.ending, /fall/.test(st.ending) ? 'fall' : 'company'], final: st.final || null };
      step(st);
    }
    SH.err(st, '흐름이 멈춤(물음이 안 나옴)');
    SH.setEnding(st, 'end_company');
    return { t: 'end', ending: st.ending, info: SH.ENDINGS.end_company };
  };

  const WN = () => SH.D.loop_scenes.WEEK_NOTE;   /* 마디 알림 [제목, 글] — 원본 04_시범/대사/장면_글.json 의 WEEK_NOTE */
  /* ── 한 걸음 ── */
  function step(st) {
    const W = st.wk;
    switch (st.phase) {
      case 'tick_start': {
        st.why = {};
        st.wk = { snap: SH.snapshot(st), picks: [], consumed: {}, started: {}, works: 0, overtimes: 0, hangover: !!(W && W.hangover),
          hintReport: null, taskOk: null, met: {}, lost: st.lostNext || 0, rest: !!st.burnNext };
        st.lostNext = 0; st.burnNext = false; st.income = 0;
        SH.defaultTask(st);
        if (st.wk.lost) push(st, { t: 'notice', title: SH.fillKeys(WN().down_after[0], { tick: SH.tickName(st) }), text: SH.fillKeys(WN().down_after[1], { n: st.wk.lost }), kind: 'warn' });
        if (st.wk.rest) push(st, { t: 'notice', title: WN().rest_now[0], text: SH.fillKeys(WN().rest_now[1], { tick: SH.tickName(st) }), kind: 'warn' });
        if (st.mode === 'week') { st.phase = 'monday'; }
        else { st.phase = 'lmap'; }
        return;
      }
      case 'monday': {
        const c = SH.pickCard(st, 'auto', { phase: 'monday', slot: '출근', day: '월' });
        if (c) push(st, { t: 'event', id: c.id, si: 0, consumes: SH.consumesSlot(c) });
        st.phase = 'slots'; st.si = 0;
        return;
      }
      case 'slots': {
        if (st.si >= SH.SLOTS.length) { st.phase = 'tick_end'; return; }
        const slot = SH.SLOTS[st.si], si = st.si;
        if (slot.k === 'settle') {
          // 금요일 오후 몰아치기(11-13 뼈대 — 금요일 밤 칸을 없애 메울 자리가 줄어서): 평일 밤이 이야기 장면으로 쓰여 야근할 틈이 없던 주에, 과제가 한 칸만 모자라고 체력이 남았으면 몸으로 마저 끝냄
          if (st.task && st.task.progress === st.task.goal - 1 && st.s.hp >= SH.R.friday_rush_hp_min && !W.picks.some(p => p.slot === 'eve')) {   // 평일 밤을 내가 고르지 못한 주만(이야기 장면이 그 칸을 가져가 야근할 틈이 없던 주)
            st.task.progress += 1; SH.addStat(st, 'hp', SH.R.friday_rush_hp); SH.addStat(st, 'stress', SH.R.friday_rush_stress);
            push(st, { t: 'notice', title: WN().friday[0], text: SH.fillKeys(WN().friday[1], { hp: -SH.R.friday_rush_hp }), kind: 'warn' });
          }
          W.settleRep = SH.weekSettle(st);      // 셈(과제 판정 · 수당)은 금요일에 · 결산 화면은 주말까지 마친 일요일 밤에 한 번(11-14 대표님 '한 주 끝나는 걸로 맞춰서 하나에')
          const id = SH.conversionCard(st) || (SH.pickCard(st, 'settle', { phase: 'settle' }) || {}).id;
          if (id) push(st, { t: 'event', id, si });
          if (id === SH.CODE_CARDS.pass) push(st, { t: 'book', scope: 'act1' });   // 정규직 발표 뒤 인턴 기간이 '책' 한 장으로
          st.si++; return;
        }
        if (W.consumed[si]) { st.si++; return; }
        const pickNo = SH.PICK_SLOTS.indexOf(slot);
        if (W.rest || pickNo < W.lost) { forcedRest(st, slot); st.si++; return; }
        if (!W.started[si]) {
          W.started[si] = true;
          if (slot.day === '토') SH.dateInvites(st).forEach(n => push(st, n));   // 데이트 사다리 — 그 사람이 먼저 연락
          const c = SH.pickCard(st, 'auto', { phase: 'slot', slot: slot.slot, day: slot.day });
          if (c) { push(st, { t: 'event', id: c.id, si, consumes: SH.consumesSlot(c) }); return; }
        }
        SH.newPlaces(st);
        push(st, { t: 'slot', si, options: SH.slotOptions(st, slot) });
        return;
      }
      /* ── 달 마디(사원부터 · 돈 고리 loop.js): 지도에서 자유 시간 두 칸 → 장면 → 그 달 카드 → 장 → 결산 ── */
      case 'lmap': {
        const fresh = st.L == null || st.L.monTick !== st.tick;
        SH.loopMonthStart(st);
        if (fresh) { SH.dateInvites(st).forEach(n => push(st, n)); SH.loopIntro(st).forEach(n => push(st, n)); }
        push(st, { t: 'lmap' });
        st.phase = 'lmap_wait'; return;
      }
      case 'lmap_wait': st.phase = 'lmap'; return;         // 답이 안 왔는데 걸음이 돌면 다시 물음
      case 'lmarket': { SH.loopOpen(st); push(st, { t: 'lmarket', closed: !!st.L.down }); st.phase = 'lsettle'; return; }
      case 'lsettle': {
        const rep = SH.tickSettle(st);
        if (!rep.hidden) (rep.scenes || []).filter(e => e.sc).forEach(e => { if (st.L && e.sc.key) st.L.told['g_' + e.sc.key] = (st.L.told['g_' + e.sc.key] || 0) + 1; push(st, { t: 'lmeet', who: e.sc.who, place: e.sc.place, title: e.title, lines: e.sc.lines, gain: [], gate: 1, cg: e.sc.cg || null }); });      // 문턱 장면은 결산 앞에 한 장면씩
        if (!rep.hidden) push(st, { t: 'settle', rep });
        const c = SH.pickCard(st, 'settle', { phase: 'settle' });
        if (c) push(st, { t: 'event', id: c.id, si: -1 });
        st.phase = 'tick_end'; return;
      }
      case 'tick_events': st.si = 0; W.mondayDone = false; st.phase = 'tick_slots'; return;
      // 달·분기 마디의 카드: 1막 한 주와 같은 칸 차례(출근 · 점심 · 주중 밤 · 결산 · 금요일 밤 · 토 · 일) · 한 칸에 한 장 + chain
      case 'tick_slots': {
        if (st.si >= SH.SLOTS.length) { st.phase = 'lmarket'; return; }      // 여기 오는 길은 lmap 답뿐 — lmap 이 계좌(st.L)를 엶 · 계좌 없는 사원 저장은 save.js 가 버림(11-14 계좌 없을 때 가지 걷음)
        const slot = SH.SLOTS[st.si], si = st.si;
        if (slot.k === 'settle') { st.si++; return; }      // 돈 고리: 결산은 그 달 카드와 장이 다 끝난 뒤(lsettle)
        if (W.consumed[si]) { st.si++; return; }
        if (si === 0 && !W.mondayDone) {
          W.mondayDone = true;
          const m = SH.pickCard(st, 'auto', { phase: 'monday', slot: '출근', day: '월' });
          if (m) { push(st, { t: 'event', id: m.id, si: 0 }); return; }
        }
        const c = SH.pickCard(st, 'auto', { phase: 'slot', slot: slot.slot, day: slot.day });
        if (c) push(st, { t: 'event', id: c.id, si });
        st.si++; return;
      }
      case 'tick_end': { if (W.settleRep) { const rep = W.settleRep; W.settleRep = null; rep.after = SH.snapshot(st); rep.why = Object.assign({}, st.why || {}); rep.picks = W.picks.slice(); push(st, { t: 'settle', rep }); return; }      // 주말에 쓴 돈 · 체력까지 담아 보여 줌
        endTick(st); return; }
      default: SH.err(st, `모르는 단계 ${st.phase}`); st.phase = 'tick_end';
    }
  }

  function forcedRest(st, slot) {
    const a = SH.AC.rest;
    SH.withWhy('쓰러져 쉼', () => { for (const k in a.effects) SH.addStat(st, k, a.effects[k]); });
    st.wk.picks.push({ slot: slot.k, place: SH.GAME.rest.place, action: SH.GAME.rest.action, label: '쓰러져 쉼' });
  }

  /* ── 답 ── */
  SH.answer = function (st, a) {
    a = a || {};
    const it = st.q.shift();
    if (!it) { SH.err(st, '물음 없이 답이 옴'); return; }
    if (it.t === 'event') {
      const e = ev(it.id);
      if (!e) { SH.err(st, `없는 카드 ${it.id}`); return; }
      const choices = SH.eventChoices(st, e);
      let i = a.choice;
      if ((e.choices || []).length) {
        // 못 고르는 고르기(조건이 안 맞음 · 없는 번호)는 효과 없이 같은 물음을 다시 띄움 · 답이 비었거나 고를 수 있는 게 없을 때만 첫 고르기
        if (i == null || !choices.some(c => c.i === i && c.ok)) { SH.err(st, `${e.id}: 못 고르는 고르기 ${i}`); if (i != null && choices.some(c => c.ok)) { st.q.unshift(it); return; } i = (choices.find(c => c.ok) || { i: 0 }).i; }
      } else i = -1;
      const r = SH.resolveEvent(st, e, i);
      if (st.wk) {
        if (it.consumes && it.si >= 0) st.wk.consumed[it.si] = true;
        if (CLOSERS.has(e.id)) SH.SLOTS.forEach((s, k) => { if (k > it.si) st.wk.consumed[k] = true; });
      }
      SH.wearCustom(st);
      const items = [];
      if (r.reply.length) items.push({ t: 'reply', id: e.id, lines: r.reply });
      if (r.next) {
        const n = ev(r.next);
        // chain 카드는 앞 카드의 칸을 이어 씀 — 그 카드의 칸이 이 주의 뒤 칸이면 그 칸을 씀(E19 → E13 금요일 밤)
        let si = it.si, consumes = SH.consumesSlot(n);
        if (n.when && n.when.slot && n.when.slot !== '결산') {
          const k = SH.SLOTS.findIndex((s, idx) => idx >= Math.max(0, it.si) && s.slot === n.when.slot && (!n.when.day || s.day === n.when.day || (s.day === '평일' && n.when.day !== '금' && !['토', '일', '주말'].includes(n.when.day))));
          if (k >= 0) { si = k; consumes = true; }
        }
        items.push({ t: 'event', id: n.id, si, consumes });
      }
      st.q.unshift(...items);
      return;
    }
    if (it.t === 'slot') {
      const slot = SH.SLOTS[it.si];
      // 장소에 들어감(피드백 48 · 11-13 대표님 목업 '둘 다 ㉠'): 그 장소 장면 카드를 먼저 보이고, 할 일은 장면 뒤 장소 안에서 고름 · 칸은 할 일을 고를 때 씀
      // 127(11-14 대표님 '그냥 나갈 수도 있는데 그런 선택지가 없음'): 들어간 장소에서 아무것도 안 하고 나감 — 칸은 안 씀 · 지도로 돌아가 다른 곳을 고를 수 있음
      //   들어가며 장면을 이미 봤으면 그 칸엔 다른 곳에서 장면이 또 뜨지 않게(st.wk.sawScene — 한 칸에 장면 하나)
      if (a.leave) { st.q.unshift(it); if (st.wk.pre && st.wk.pre.si === it.si) { if (st.wk.pre.id) st.wk.sawScene = it.si; st.wk.pre = null; } return; }
      // 151(11-14 대표님 '약속이 잡히면 해당 장소에서 바로 이벤트로 넘어가면 좋겠음'): 약속 자리에 들어가면 장소 안에서 다시 고르지 않고 바로 약속 장면(그 할 일을 고른 것과 같음 · 돈이 모자라면 예전처럼 장소 안으로)
      const di = a.enter && !(st.wk.pre && st.wk.pre.si === it.si) ? it.options.findIndex(o => o.place === a.enter && o.date && o.ok !== false) : -1;
      if (di >= 0) a = { opt: di };
      if (a.enter) {
        st.q.unshift(it);
        if (st.wk.pre && st.wk.pre.si === it.si) return;
        const c = st.wk.sawScene === it.si ? null : SH.pickCard(st, 'enter', { phase: 'slot', slot: slot.slot, day: slot.day, place: a.enter });
        st.wk.pre = { si: it.si, place: a.enter, id: c ? c.id : null };
        if (c) push(st, { t: 'event', id: c.id, si: it.si }, true);
        return;
      }
      const opt = it.options[a.opt];
      if (!opt || opt.ok === false) { SH.err(st, `칸 ${slot.k}: 못 고르는 것 ${a.opt}`); }
      const o = opt && opt.ok !== false ? opt : (it.options.find(x => x.ok !== false) || { place: SH.GAME.rest.place, action: SH.GAME.rest.action, label: '쉼' });
      const pre = st.wk.pre && st.wk.pre.si === it.si && st.wk.pre.place === o.place ? st.wk.pre : null;   // 들어갈 때 이미 본 장면
      st.wk.pre = null;
      const card = o.date ? ev(o.date) : pre ? (pre.id ? ev(pre.id) : null) : st.wk.sawScene === it.si ? null : SH.pickCard(st, 'enter', { phase: 'slot', slot: slot.slot, day: slot.day, place: o.place });
      const res = SH.doAction(st, o, slot, card);
      res.forEach(t => SH.toast(st, t));
      st.wk.consumed[it.si] = true;
      st.si = it.si + 1;
      if (card && !(pre && card.id === pre.id)) push(st, { t: 'event', id: card.id, si: it.si }, true);
      else if (o.action === SH.GAME.shop_action) push(st, { t: 'shop', place: o.place }, true);
      return;
    }
    if (it.t === 'lmap') { st.q.unshift(...SH.loopChoose(st, a.picks || [])); st.phase = 'tick_events'; return; }
    // settle · shop · notice · album · reply 는 읽고 넘김
  };

  /* ── 마디 끝 ── */
  function endTick(st) {
    const W = st.wk, R = SH.R;
    st.workHist.push(st.mode === 'week' ? Math.min(1, W.works / 2) : 0.67);   /* 141(11-14 대표님 '거슬림: 게으름 이게 뭘 말하는지'): 한 주에 일할 수 있는 칸은 출근 · 밤 둘인데 셋으로 나눠서, 출근만 해도 1/3 = '게으름'이 붙었음(금요일 밤 칸을 없앨 때 남은 숫자) → 둘로 나눔 */      // 사원부터 평소 근무는 자동(돈 고리) — 성실 쪽으로 셈
    if (st.workHist.length > 8) st.workHist.shift();
    // 쓰러짐 (체력 0) — 두 번째는 경고 · 세 번째는 과로 몰락 (기획 결정 A6)
    if (st.s.hp <= 0) {
      st.collapses++;
      SH.addMoney(st, -R.collapse_hospital, '쓰러져 병원비');
      st.s.hp = R.collapse_hp_after;
      st.lostNext = R.collapse_lost_slots;
      if (st.collapses >= R.collapse_ruin_at) { SH.setEnding(st, 'end_overwork'); }
      else if (st.collapses >= R.collapse_warn_at) push(st, { t: 'notice', title: WN().collapse_warn[0], text: WN().collapse_warn[1], kind: 'warn' });
      else push(st, { t: 'notice', title: WN().collapse[0], text: SH.fillKeys(WN().collapse[1], { cost: SH.won(R.collapse_hospital), tick: SH.tickName(st) }), kind: 'warn' });
    }
    if (st.s.stress >= R.burnout_stress) {
      st.burnNext = true; SH.addStat(st, 'rep', R.burnout_rep);
      push(st, { t: 'notice', title: WN().burnout[0], text: SH.fillKeys(WN().burnout[1], { tick: SH.tickName(st) }), kind: 'warn' });
    }
    // 마디 회복
    /* 156(11-14 대표님 '체력과 스트레스 관리가 그렇게 중요하지가 않아 · 계수 조정'): 주 마디(인턴)는 저절로 낫는 양을 줄임 — 전엔 일 + 점심만 해도 한 주 뒤 체력이 오히려 차서 쉴 까닭이 없었음 */
    SH.addStat(st, 'hp', st.mode === 'week' && R.week_recover_hp != null ? R.week_recover_hp : R.tick_recover_hp);
    SH.addStat(st, 'stress', st.mode === 'week' && R.week_recover_stress != null ? R.week_recover_stress : R.tick_recover_stress);
    // 오래 안 만나면 호감이 줄어듦 (연애 상대만)
    // 달 · 분기 마디는 달 수에 맞춤(11-13 대표님 '추천대로' — 주 마디는 그대로): 시작 = 4달 분량 · 크기 = 달 값 × 달 수
    const dMo = st.mode === 'week' ? 1 : SH.monthsInTick(st), dAfter = st.mode === 'week' ? R.affection_decay_after : Math.ceil(R.affection_decay_after / dMo);
    Object.entries(st.rel).forEach(([cid, r]) => {
      if (r.st < 1 || SH.CH[cid].group !== 'romance' || st.tick - r.met < dAfter || r.met < 0) return;
      const stg = SH.stages(cid), top = stg.length - 1;
      // 멈춤 선(11-13 리서치 2판 8 — 스타듀 '단계 뒤엔 안 떨어짐'): 지금 관계 단계의 최소 호감 아래로는 안 깎음 · '썸인데 호감 20' 어긋남 막기
      const floor = Math.max(0, (stg[r.st] || {}).min_affection || 0);
      r.aff = Math.max(Math.min(floor, r.aff), r.aff + (r.st >= top ? R.affection_decay_lover : R.affection_decay) * dMo);
    });
    // 빚 · 평판 바닥
    if (st.s.money < 0) {
      if (st.mode !== 'week') SH.addMoney(st, Math.round(st.s.money * R.debt_interest_month * SH.monthsInTick(st)), '카드빚 이자');
      const sal = ((SH.RK[st.rank] || {}).salary || {}).amount || 500000;
      st.debtTicks = st.s.money < -sal * R.debt_limit_salary_mult ? st.debtTicks + 1 : 0;
      if (st.debtTicks >= R.debt_ruin_ticks) { SH.setEnding(st, 'end_debt'); }
    } else st.debtTicks = 0;
    if (st.s.rep <= R.rep_ruin && !st.ending) SH.fire(st, '평판이 바닥');
    // 기록 (연말 앨범 그래프)
    st.hist.push({ tick: st.tick, date: st.date, mode: st.mode, money: st.s.money, income: st.income, rank: st.rank });
    (st.notices || []).forEach(n => push(st, Object.assign({ t: 'notice' }, n)));
    st.notices = [];
    // 연말 앨범 (12월이 든 마디)
    if (st.mode !== 'week' && SH.tickMonths(st).some(x => x.m === 12) && !st.ending) {
      const y = SH.tickMonths(st).find(x => x.m === 12).y;
      if (!st.yearShown[y]) { st.yearShown[y] = true; push(st, { t: 'album', year: y }); }
    }
    // 다음 마디로
    st.tick++;
    if (st.ending) { st.phase = 'done'; return; }
    if (st.mode === 'week') {
      if (st.pendingAct === 2 && st.rank !== SH.RANK_FIRST) {
        st.act = 2; st.pendingAct = null;
        st.date = SH.addMonths(st.date, 1);
        st.mode = SH.modeFor(st, st.date);
        SH.stocksOpen(st);
        push(st, { t: 'notice', title: WN().act2[0], text: WN().act2[1], kind: 'act' });
      } else if (st.week >= SH.internExtEnd() || (st.week >= SH.internWeeks() && !st.ext)) {
        if (!st.ending) { SH.setEnding(st, 'end_intern_fall'); SH.err(st, '1막 끝에 전환 결과 카드가 안 나옴'); }
        st.phase = 'done'; return;
      } else { st.week++; st.date = SH.addDays(st.date, 7); }
    } else {
      st.date = SH.addMonths(st.date, 1);
      if (st.date.slice(0, 7) >= SH.LAST_TICK_BEFORE) { finalJudge(st); st.phase = 'done'; return; }
      st.mode = SH.modeFor(st, st.date);
      if (st.act < 6) { const a = actOf(st.date); if (a > st.act) { st.act = a; push(st, { t: 'notice', title: `${a}막 — ${SH.D.timeline.items[a - 1].name_ko}`, text: SH.D.timeline.items[a - 1].era_ko, kind: 'act' }); } }
    }
    st.phase = 'tick_start';
  }
  // 막 = 십 년 뼈대의 때 (가정: 달력으로만 가름)
  function actOf(date) {
    for (const [from, act] of SH.GAME.acts) if (date >= from) return act;   // 늦은 달부터 차례로(rules/game.js)
    return SH.GAME.act_base;
  }
  // 폐장일 판정 (기획 결정 A3): 끝 갈래 + 곁에 남은 사람
  function finalJudge(st) {
    const E = SH.GAME.end_by_rank, kind = st.rank === SH.RANK_TOP ? E.top : st.rank === SH.RANK_BRANCH ? E.branch : E.other;
    let partner = null;
    Object.entries(st.rel).forEach(([cid, r]) => {
      if (SH.CH[cid].group !== 'romance') return;
      if (r.st >= SH.stages(cid).length - 1 && (!partner || r.aff > st.rel[partner].aff)) partner = cid;
    });
    if (st.love && st.rel[st.love.who] && !st.rel[st.love.who].q && st.rel[st.love.who].st >= SH.stages(st.love.who).length - 1) partner = st.love.who;      // 돈 고리의 연인이 먼저(새 눈 검토 19)
    else if (st.L && partner && st.rel[partner].q) partner = null;
    st.final = { date: SH.R.final_judge_date, kind, partner, partnerStage: partner ? SH.stageName(st, partner) : null };
    SH.setEnding(st, kind);
  }

  SH.takeToasts = function (st) { const t = st.toasts || []; st.toasts = []; return t; };
  SH.takeWorkRes = function (st) { const w = st.wk && st.wk.workRes; if (w) st.wk.workRes = null; return w; };      /* 업무 결과는 한 번만 보여 줌(읽고 비움) */
})(typeof window !== 'undefined' ? window : globalThis);
