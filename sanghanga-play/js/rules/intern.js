/* =====================================================================
   rules/intern.js — 인턴 여섯 주의 과제: 종류 · 큰 건 · 아는 사람 도움 (11-16 능력치 다시 설계 · 대표님 '추천대로 해')
   - 주 과제에 종류가 있음(리서치 · 영업 · 둘 다) — 그 종류의 업무로만 참 · 한 번은 제대로 풀려야 끝남(안 풀리면 한 칸만 차고, 다시 매달릴수록 덜 풀림)
   - 주 차림: 1 배우는 주(첫 과제 카드 · 리서치) · 2 리서치 · 3 영업 · 4 부장이 둘을 내밈(카드에서 고름) · 5 안 하던 쪽(분석과 말솜씨 가운데 낮은 쪽) · 6 큰 과제(둘 다)
   - 카드가 과제 칸을 바로 채우는 효과(task.progress)는 이야기의 덤 — 종류를 안 가리고 한 칸씩 참(목표에서 멈춤 · core/events.js) · 그렇게 끝난 과제는 큰 건이 아님
   - 큰 건: 평일 안에 풀었고, 그 업무의 주 능력치(아는 사람 도움이면 주 능력치와 인맥 가운데 높은 쪽 — 11-18 대표님 '조건에 들었는데 보너스가 안 나옴')가 그 주 선(intern_line) 이상 — 둘 다 과제는 두 일을 모두 평일 안에
   - 어떻게 끝났나(t.how): 업무로 풀면 'work' · 도움으로 풀면 'help' · null 이면 카드가 채운 것(과제를 열 때 null · 옛 저장은 칸이 없어 까닭 모름 — 그냥 '놓침') — 과제 칸이 '놓침'의 까닭을 고름(ui/map.js)
     → 부장 호감 · 평판 · 돈(순위 점수 식은 그대로 — 부장 단계 점수와 평판으로만 닿음)
   - 아는 사람 도움: 인맥이 net_help_at 을 넘은 수만큼 한 주에, 안 풀린 과제 업무를 (net_help_base + 인맥)% 로 한 번 더
   - 값은 게임_숫자.json · 과제 이름과 종류는 대사/과제_글.json 의 TASKS · rules/actions.js 뒤에 실음
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const KIND = { work_research: 'research', work_sales: 'sales' }, WORK_OF = { research: 'work_research', sales: 'work_sales' };
  const PLAN = [null, 'task_w2_research', 'task_sales_first', 'pick', 'weak', 'task_w6_big'];   // 1주는 첫 과제 카드가 줌 · 3주는 영업 과제 카드가 같은 것을 엶

  // 이번 주 기본 과제(카드가 바꿀 수 있음 — 4주는 부장이 둘을 내미는 장면에서 고름 · 여기 값은 그 장면이 없을 때)
  SH.internTaskId = function (st) {
    const p = PLAN[st.week - 1];
    if (p === 'pick') return st.s.talk > st.s.analysis ? 'task_w4_sales' : 'task_w4_research';
    if (p === 'weak') return st.s.talk <= st.s.analysis ? 'task_w5_sales' : 'task_w5_research';
    return p === undefined ? 'task_w2_research' : p;      // 여섯 주를 넘긴 옛 저장
  };
  SH.internLine = (st, kind) => { const v = SH.R.intern_line[st.week - 1]; return st.mode !== 'week' || v == null ? -1 : kind === 'both' ? 0 : v; };   // 둘 다 과제는 어느 주든 선 없음(두 일을 모두 평일 안에)
  SH.taskStat = (t) => t && t.kind === 'sales' ? 'talk' : 'analysis';

  // 이 업무가 지금 과제를 채울 수 있나(종류가 없는 과제 — 사원 뒤 카드 과제 — 는 무엇이든)
  SH.taskFits = function (st, actId) {
    const t = st.task, k = KIND[actId];
    if (!t || !t.kind) return true;
    if (!k || t.progress >= t.goal) return false;
    return t.kind === 'both' ? !(t.parts || {})[k] : t.kind === k;
  };
  // 이 과제(둘 다 과제면 그 일)에서 지금까지 안 풀린 횟수 — 다시 매달릴수록 성공률이 intern_retry_step 씩 바뀜
  SH.taskFails = function (st, actId) {
    const t = st.task, k = KIND[actId];
    if (!t || !t.kind || st.mode !== 'week' || !SH.taskFits(st, actId)) return 0;
    return (t.kind === 'both' ? (t.failsK || {})[k] : t.fails) || 0;
  };
  // 야근은 이번 주 과제에 매달리는 것 — 과제 종류의 업무(둘 다 과제면 덜 푼 쪽 · 방금 하던 쪽 먼저)
  SH.overtimeWork = function (st) {
    const t = st.task, last = (st.wk && st.wk.lastWork) || 'work_sales';
    if (!t || !t.kind || st.mode !== 'week') return last;
    if (t.kind !== 'both') return WORK_OF[t.kind];
    const p = t.parts || {};
    return !p[KIND[last]] ? last : p.research ? 'work_sales' : 'work_research';
  };

  function bigOk(st, t, act, help) {
    if (t.line == null || t.line < 0 || t.big) return false;
    if (t.kind === 'both') return t.parts.research === 1 && t.parts.sales === 1;
    const main = st.s[(act.success || {}).main_stat] || 0;
    return (help ? Math.max(main, st.s.network || 0) : main) >= t.line;
  }
  /* 큰 건 갈래(research · sales · both · help)가 주는 것 — 지급(giveBig)과 과제 칸 '★ 보너스' 글(ui/map.js)이 이 한 곳을 읽음(구조 검토 1117 지적 3) */
  SH.bigGive = function (k) {
    const R = SH.R;
    return { boss: R.intern_big_boss, rep: { research: R.intern_big_rep_research, sales: R.intern_big_rep_sales, both: R.intern_big_rep_both, help: R.intern_big_rep_help }[k] || 0,
      money: k === 'sales' ? R.intern_big_money_sales : k === 'both' ? R.intern_big_money_both : 0 };
  };
  function giveBig(st, t, help) {
    const k = t.kind === 'both' ? 'both' : help ? 'help' : t.kind, g = SH.bigGive(k);
    t.big = k; st.counts.intern_big = (st.counts.intern_big || 0) + 1;
    SH.withWhy('큰 건', () => { SH.addAff(st, 'boss', g.boss); SH.addStat(st, 'rep', g.rep); if (g.money) SH.addMoney(st, g.money, '큰 건'); });
  }

  /* 업무 한 번이 과제에 주는 것 — 돌려줌 { ok(도움으로 뒤집힐 수 있음) · prog(찬 칸) · help · big · fit } */
  SH.taskWork = function (st, act, ok, slot) {
    const t = st.task, P = SH.ACTION_RULES.task_progress, out = { ok, prog: 0, help: false, big: false, fit: true };
    if (!t) return out;
    if (st.mode !== 'week' || !t.kind) { out.prog = ok ? P.on_success : P.per_work; t.progress += out.prog; return out; }   // 종류 없는 과제는 옛 셈(업무마다 한 칸 · 잘 풀리면 두 칸)
    out.fit = SH.taskFits(st, act.id);
    if (!out.fit) return out;
    const k = KIND[act.id], W = st.wk, weekday = slot.day === '평일', before = t.progress;
    if (!ok && (W.helps || 0) < SH.R.net_help_at.filter(x => st.s.network >= x).length) {
      W.helps = (W.helps || 0) + 1;
      if (SH.chance(st, SH.clamp(SH.R.net_help_base + st.s.network, 0, SH.ACTION_RULES.success_rate.clamp[1]))) { ok = out.ok = true; out.help = true; }
    }
    if (t.kind === 'both') {
      t.parts = t.parts || {}; t.failsK = t.failsK || {};
      if (ok) { t.parts[k] = weekday ? 1 : 2; t.progress = Math.min(t.goal, t.progress + 1); } else t.failsK[k] = (t.failsK[k] || 0) + 1;
    } else if (ok) t.progress = t.goal;
    else { t.progress = Math.max(t.progress, t.goal - 1); t.fails = (t.fails || 0) + 1; }
    out.prog = t.progress - before;
    if (t.progress >= t.goal && before < t.goal) t.how = out.help ? 'help' : 'work';
    if (t.progress >= t.goal && before < t.goal && weekday && bigOk(st, t, act, out.help)) { giveBig(st, t, out.help); out.big = true; }
    return out;
  };

  /* 사원부터 시작(11-18 대표님 '인턴 과정 아예 스킵' · 구조 검토 지적 6 — 실제 기능이라 규칙 쪽에 둠 · 시험 손 devtest.js workHand 도 이 손을 씀)
     인턴 손: 출근엔 과제에 맞는 업무(힌트 → 맞는 것 → 영업) · 점심은 구내식당 · 기자 카페 번갈아 · 밤은 지치면 쉼 아니면 야근 · 주말은 과제가 남고 버틸 만하면 특근 · 첫 양복 장면은 둘째 고르기 */
  SH.INTERN_HAND = {
    slot: (P, st) => {
      const f = (fn) => { const i = P.options.findIndex(o => o.ok !== false && !o.seenShop && fn(o)); return i >= 0 ? i : null; };
      const todo = st.task && st.task.progress < st.task.goal, fit = (o) => /^work_/.test(o.action) && SH.taskFits(st, o.action);
      if (P.slot.kind === 'work') return f(o => o.variant === 'hint') ?? f(fit) ?? f(o => o.action === 'work_sales');
      if (P.slot.kind === 'lunch') return f(o => o.place === (st.week % 2 ? 'cafeteria' : 'cafe_press'));
      if (P.slot.kind === 'evening') return st.s.hp < SH.R.start_staff_rest_hp || !todo ? f(o => o.action === 'rest') : f(o => o.action === 'eve_overtime');
      if (P.slot.kind === 'weekend') return todo && st.s.hp >= SH.R.start_staff_weekend_hp ? f(fit) : P.slot.day === '토' ? (f(o => o.action === 'eve_shop') ?? f(o => o.action === 'wk_study')) : f(o => o.action === 'rest');
      return null;
    },
    event: (P, ok) => (P.id === 'a1_first_suit' ? (ok.find(c => c.i === 1) || ok[0] || {}).i : null)
  };
  /* 새 판(st)의 인턴을 이 손으로 치러 사원 첫 달 지도 물음까지 — 돌려줌: 그 물음(정규직이 못 됐거나 끝났으면 null) */
  SH.startAsStaff = function (st) {
    const H = SH.INTERN_HAND;
    for (let n = 0; n < SH.R.start_staff_steps; n++) {
      const P = SH.next(st);
      if (P.t === 'end') return null;
      if (st.rank !== SH.RANK_FIRST && P.t === 'lmap') return P;
      let a = {};
      if (P.t === 'event') { const ok = P.choices.filter(c => c.ok), pk = H.event(P, ok); a = { choice: pk != null ? pk : (ok[0] || {}).i }; }
      else if (P.t === 'slot') { const pk = H.slot(P, st); a = { opt: pk != null ? pk : P.options.findIndex(o => o.ok !== false) }; }
      SH.answer(st, a); SH.takeToasts(st);
    }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
