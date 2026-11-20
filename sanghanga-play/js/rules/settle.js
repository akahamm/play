/* =====================================================================
   settle.js — 결산 (인턴 한 주 끝 일요일 밤 · 달 마디 끝) · 정규직 판정(명단 순위)
   결산 차례(인턴 · 일요일 밤 한 번 — 11-16 대표님 '주말 특근은 그 주 과제에'): ① 과제 판정(주말 특근까지 든 칸으로) ② 성과금·부장 호감
   ③ 명단 순위 ④ 마지막 주면 순위로 정규직 판정 → 발표 카드 · 그 앞 주에 등수 밖이면 경고 카드 (금요일엔 그때까지의 과제 상태를 보고, 수당 날이면 수당·생활비 — fridayCheck)
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};

  // 마디 시작 때 찍어 두는 사진 (결산 막대: 전 → 뒤)
  SH.snapshot = (st) => ({ s: Object.assign({}, st.s), aff: Object.fromEntries(Object.entries(st.rel).map(([k, r]) => [k, [r.aff, r.st]])) });

  SH.bossPoints = function (st) {
    const pts = SH.R.boss_stage_points;
    return pts[Math.min(pts.length - 1, st.rel.boss ? st.rel.boss.st : 0)] || 0;
  };
  /* 인턴 기간(11-16 대표님 '인턴 6주 · 순위 하나만 · 연장 없음'): 주 수는 규칙 conversion_window 한 곳 —
     판정 주 · 도장판 칸 수 · 남은 주 · 카드의 '끝 주'가 모두 이것을 읽음 */
  SH.internWeeks = () => SH.R.conversion_window;
  // 순위 점수(숫자_기준): 과제 성공 ÷ 인턴 주 수 × conversion_task_weight + 평판 × conversion_rep_weight + 부장 단계 점수 — 도장 하나의 점수는 SH.stampPoints
  SH.convScore = (st, ok, win, rep) => Math.round((ok / win) * SH.R.conversion_task_weight + rep * SH.R.conversion_rep_weight + SH.bossPoints(st));
  SH.stampPoints = () => Math.round(SH.R.conversion_task_weight / SH.R.conversion_window);
  // 내 순위 점수가 어디서 나왔나(도장 · 부장 · 나머지는 평판) — 화면(탈락 까닭)이 식을 따로 세지 않게 한 곳에서
  SH.convParts = function (st) { const L = SH.internList(st), tasks = Math.round(L.ok / L.win * SH.R.conversion_task_weight), boss = SH.bossPoints(st); return { tasks, boss, rep: L.score - tasks - boss, score: L.score }; };
  /* 정규직 후보 명단 = 판정 그 자체(11-16 대표님 '순위 하나만' — 옛 기준 셋 점수 · 평판 · 도장 문턱을 없앰): 마지막 주 결산에서 conversion_cut 등 안이면 정규직
     동기 넷의 점수는 지어낸 곡선: 마지막 주에 규칙 숫자 intern_mates_fin 에 닿음 · 그 전엔 주 수에 비례 + 주마다 조금 흔들림
     내 줄 = 순위 점수 그대로(0 아래는 0) · 같은 점수면 내가 앞 */
  const MATES = () => SH.D.ui_lines.MATES;   /* 동기 넷의 이름 — 원본 04_시범/대사/화면_글.json */
  SH.internList = function (st) {
    const win = SH.R.conversion_window, cut = SH.R.conversion_cut;
    const all = st.tasks.filter(t => t.mode === 'week'), n = all.length, ok = all.slice(-win).filter(t => t.ok).length;
    const me = Math.max(0, SH.convScore(st, ok, win, st.s.rep));
    const w = Math.min(n, win), wob = (k) => n >= win ? 0 : ((n * 7 + k * 13) % 7) - 3;
    const fin = SH.R.intern_mates_fin;
    const rows = MATES().map((m, k) => ({ nm: m.id ? SH.name(m.id) : m.nm, v: Math.max(0, Math.round((fin[k] + wob(k)) * w / win)) }))
      .concat([{ nm: '나', v: me, me: true }]).sort((a, b) => b.v - a.v || (a.me ? -1 : 1));
    const rank = rows.findIndex(r => r.me), pass = rank < cut, ref = rows[pass ? cut : cut - 1];   // 견줄 줄: 붙는 자리면 바로 아래 등수 · 아니면 붙는 끝 등수
    return { rows, rank, cut, pass, gap: ref ? Math.abs(me - ref.v) : 0, left: Math.max(0, win - n), ok, n, win, score: me };
  };
  SH.conversion = function (st) {
    const L = SH.internList(st);
    return { ok: L.ok, score: L.score, rep: st.s.rep, boss: SH.stageName(st, 'boss'), rank: L.rank, pass: L.pass };
  };

  // 과제가 됐나(지금까지 찬 칸으로) — 금요일 중간 점검과 일요일 밤 판정이 같은 셈을 씀
  const taskDone = (t) => !!t && (t.forced ? t.forced === 'success' : t.progress >= t.goal);
  /* 금요일: 중간 점검(그때까지의 과제 상태 — 금요일 장면의 글이 읽는 표시) + 수당 날(직급 카드의 '몇 주마다' — 첫 수당 장면과 토요일 양복점이 금요일에 받은 돈에 기댐) ·
     도장 · 성과금 · 순위는 주말 특근까지 마친 일요일 밤에(weekSettle) */
  SH.fridayCheck = function (st) {
    st.wk.taskOk = taskDone(st.task);
    const sal = SH.RK.intern.salary;
    if (st.week % sal.every_n === 0) { SH.addMoney(st, sal.amount, '인턴 수당'); SH.addMoney(st, -SH.RK.intern.living_cost, '생활비'); }
  };
  function judgeTask(st, rep) {
    const t = st.task || { id: 'none', name: '(과제 없음)', goal: 2, progress: 0 };
    const ok = taskDone(t);
    st.wk.taskOk = ok;
    st.tasks.push({ tick: st.tick, mode: st.mode, id: t.id, ok });
    st.period.n++; if (ok) st.period.ok++;
    rep.task = { name: t.name, progress: t.progress, goal: t.goal, ok, quote: t.quote, big: t.big || null };
    if (ok) {
      if (SH.mile(st, 'intern_first_task_success')) rep.gets.push('리서치센터가 열림');
      const bonus = st.rank === 'intern' ? SH.R.intern_task_bonus : Math.round(((SH.RK[st.rank] || {}).salary || {}).amount * SH.R.staff_task_bonus_ratio || 0);
      if (bonus) { SH.addMoney(st, bonus, '과제 성과금'); rep.gets.push(`성과금 +${SH.won(bonus)}`); }
      // 청운 물량 과제(R2 4절): 성공하면 성과금 ×2 · 늘어난 몫은 작전 몫(dirty_money)에도 셈
      if (/^task_cheongwoon_/.test(t.id)) {
        SH.addMoney(st, bonus, '특별 성과금'); st.funds.dirty_money += bonus; rep.gets.push(`특별 성과금 +${SH.won(bonus)}`);
        if (t.id === 'task_cheongwoon_volume') st.counts.cheongwoon_success_count = (st.counts.cheongwoon_success_count || 0) + 1;
      }
      const up = st.rank === 'intern' ? SH.R.intern_boss_task_success : SH.R.boss_task_success;
      if (st.rank === 'intern' || st.rel.boss.st < 4) { SH.addAff(st, 'boss', up); }
      rep.boss = up;
    } else {
      SH.addStat(st, 'stress', SH.R.task_fail_stress);
      SH.addAff(st, 'boss', SH.R.boss_task_fail);
      rep.boss = SH.R.boss_task_fail;
    }
  }

  // 인턴 한 주 결산(일요일 밤) → 보고서 한 장 (화면이 그림)
  SH.weekSettle = function (st) {
    if (st.wk.settleRep) {      // 금요일에 판정하던 때의 저장을 주말 칸에서 이어 받음 — 그 주는 이미 셈했으니 그 결산을 그대로 보임(도장 · 성과금을 두 번 주지 않음) · 순위 판정만 지금 규칙으로
      const old = st.wk.settleRep; st.wk.settleRep = null;
      if (st.week >= SH.internWeeks() && st.conv !== 'pass') st.conv = SH.conversion(st).pass ? 'pass' : 'fail';
      return old;
    }
    const rep = { kind: 'week', gets: [], before: st.wk.snap, conv: null, picks: st.wk.picks.slice() };
    judgeTask(st, rep);
    if (st.week >= SH.internWeeks()) {      // 마지막 주(옛 8주 때 저장이 그 뒤 주에서 이어지면 그 주 끝에)
      const c = SH.conversion(st);
      rep.conv = c;
      st.conv = c.pass ? 'pass' : 'fail';
      st.convAt = { ok: c.ok, score: c.score, rep: c.rep, boss: c.boss, rank: c.rank, pass: c.pass };   // 판정 때의 숫자(로봇이 균형을 잴 때 읽음)
    }
    rep.after = SH.snapshot(st);
    rep.why = Object.assign({}, st.why || {});   // 결산 '왜' — 이름표별 합(화면이 돈 큰 숫자를 누르면 보임)
    return rep;
  };
  /* ── 판이 '책'으로 남음(피드백 35 · 활협전 조사 C) ── scope 'act1' = 인턴 기간 · 'all' = 한 판 전체
     세 칸: 내가 한 일 · 가까워진 사람 · 놓친 사람(대사 아닌 항목) */
  // 내 선택의 합(11-13 리서치 2판 3순위 — 프린세스 메이커 끝 화면 '내 선택의 합으로 이해되는 결말'): 이미 쌓는 값만 씀
  SH.choiceSum = function (st) {
    const wh = st.workHist || [], work = wh.length ? Math.round(wh.reduce((a, b) => a + b, 0) / wh.length * 100) : 0;
    const close = Object.entries(st.rel || {}).filter(([c, r]) => SH.CH[c] && SH.CH[c].group === 'romance' && r.st >= 2).length;
    return { work, honest: st.honest || 0, collapses: st.collapses || 0, stories: Object.keys(st.seen || {}).length, close };
  };
  SH.bookOf = function (st, scope) {
    const act1 = scope === 'act1', wk = st.tasks.filter(t => !act1 || t.mode === 'week');
    const did = [];
    did.push(`과제 ${wk.length}번 중 ${wk.filter(t => t.ok).length}번 해냄`);
    const dates = Object.keys(st.seen).filter(id => /^date_/.test(id)).length;
    if (dates) did.push(`데이트 장면 ${dates}번`);
    const fs = st.firsts.filter(f => !act1 || f.date < '1995-07');
    fs.slice(-5).forEach(f => did.push(`${f.title}${f.sub ? ' — ' + f.sub : ''}`));
    if (!act1) did.push(`마지막 자리 — ${(SH.RK[st.rank] || {}).name_ko || ''} · 돈 ${SH.won(st.s.money)}`);
    const close = [], missed = [];
    let unknown = 0;
    Object.keys(st.rel).forEach(c => {
      const r = st.rel[c], ch = SH.CH[c]; if (!ch || !ch.group) return;
      const nd = Object.keys(st.seen).filter(id => id.startsWith('date_' + c + '_')).length;
      if (r.st < 1) { if (ch.group === 'romance') unknown++; return; }
      if (r.q) { missed.push(`${SH.name(c)} — 다툰 채로`); return; }
      if (r.st >= 2) close.push({ c, t: `${SH.name(c)} — ${SH.stageName(st, c)}${nd ? ` · 데이트 ${nd}번` : ''}`, aff: r.aff });
      else if (ch.group === 'romance') missed.push(`${SH.name(c)} — 스쳐 지나감(${SH.stageName(st, c)})`);
    });
    if (unknown) missed.push(`${act1 ? '아직 못 만난' : '끝내 만나지 못한'} 사람 ${unknown}명`);
    close.sort((a, b) => b.aff - a.aff);
    const y = String(st.date).slice(0, 4), title = act1 ? `1995년 봄 — 인턴 ${['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'][SH.internWeeks()] || SH.internWeeks()} 주` : `${y === '1995' ? '1995' : '1995 — ' + y}`;
    const out = { title, did, close: close.map(x => x.t), missed };
    /* 인턴 졸업 책(11-18 대표님 졸업 흐름 목업 '이대로') — 큰 숫자 셋 · 능력치 처음 → 지금 · 가까워진 사람 얼굴 · 인턴 동안 본 컷신 · 스쳐 간 사람 이름(ui/tick.js 가 그림) */
    if (act1) {
      const IL = SH.internList(st), start = {}, BODY = ['money', 'hp', 'stress'];
      SH.D.stats.items.forEach(x => { start[x.id] = x.start; });
      const shots = Object.keys(st.seen).filter(id => st.seen[id] < SH.internWeeks() && SH.EV[id] && SH.EV[id].art && SH.EV[id].art.cg)
        .sort((a, b) => st.seen[a] - st.seen[b]).map(id => ({ cg: SH.EV[id].art.cg, title: SH.fill(SH.EV[id].title, st) }))
        .filter((x, i, a) => a.findIndex(y => y.cg === x.cg) === i).slice(-3);
      const skim = Object.keys(st.rel).filter(c => SH.CH[c] && SH.CH[c].group === 'romance' && st.rel[c].st === 1 && !st.rel[c].q).map(c => SH.name(c));
      out.grad = { rank: IL.rank + 1, of: IL.rows.length, big: st.counts.intern_big || 0, weeks: SH.internWeeks(), money: st.s.money - (start.money || 0),
        grow: SH.D.stats.items.filter(x => !BODY.includes(x.id)).map(x => [x.id, start[x.id] || 0, st.s[x.id] || 0]),
        faces: close.map(x => x.c), shots, skim, unknown };
    }
    return out;
  };
  // 결산이 직접 부르는 카드: 마지막 주 = 발표(붙음 · 떨어짐) · 그 앞 주에 등수 밖 = 부장의 경고('한 주 남았다')
  SH.conversionCard = function (st) {
    if (st.pendingAct === 2) return null;      // 붙음 발표를 이미 본 판(금요일에 발표하던 때의 저장)
    if (st.week >= SH.internWeeks()) return st.conv === 'pass' ? SH.CODE_CARDS.pass : SH.CODE_CARDS.fail;
    if (st.week === SH.internWeeks() - 1 && !SH.internList(st).pass) return SH.CODE_CARDS.warn;
    return null;
  };

  // 달 결산(사원부터): 돈 고리가 씀(loop.js loopSettle) — 주식 손익 · 월급에서 남긴 돈 · 성과금 · 땅 · 이자 · 진급 · 까닭 세 줄 · 목표 셋
  SH.tickSettle = function (st) {
    const rep = SH.loopSettle(st);
    if (st.skipSettle > 0) { st.skipSettle--; rep.hidden = true; }
    return rep;
  };
})(typeof window !== 'undefined' ? window : globalThis);
