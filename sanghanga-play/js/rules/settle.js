/* =====================================================================
   settle.js — 결산 (인턴 금요일 · 달/분기 마디 끝) · 정규직 전환 심사
   결산 차례(이벤트_카드_1막 바탕 가정): ① 과제 판정 ② 성과금·부장 호감 ③ 수당·생활비
   ④ 숨은 숫자·전환 심사표 보임 ⑤ 12주(연장 16주) 전환 심사 → 결과 카드 ⑥ 결산 위 카드 한 장
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};

  // 마디 시작 때 찍어 두는 사진 (결산 막대: 전 → 뒤)
  SH.snapshot = (st) => ({ s: Object.assign({}, st.s), aff: Object.fromEntries(Object.entries(st.rel).map(([k, r]) => [k, [r.aff, r.st]])) });

  SH.bossPoints = function (st) {
    const pts = SH.R.boss_stage_points || [0, 0, 5, 10, 15];
    return pts[Math.min(pts.length - 1, st.rel.boss ? st.rel.boss.st : 0)] || 0;
  };
  /* 인턴 기간(155 · 11-14 대표님 '인턴기간을 8주로 줄이자 · 도장은 6으로'): 주 수는 규칙 conversion_window 한 곳(전 12 → 8) · 연장은 extension_weeks(4) —
     심사 주 · 연장 끝 주 · 도장판 칸 수 · 남은 주 · 카드의 '끝 주' 판정이 모두 이 둘을 읽음(전: 12 · 16 이 곳곳에 박혀 있었음) */
  SH.internWeeks = () => SH.R.conversion_window;
  SH.internExtEnd = () => SH.internWeeks() + SH.R.extension_weeks;
  // 전환 심사(숫자_기준): 점수 = 과제 성공 ÷ 인턴 주 수 × 60 + 평판 × 0.25 + 부장 단계 점수 · 마지막 그 주 수로 셈
  // 같은 식을 두 곳(심사 · 명단)이 씀 — rep 는 부르는 쪽이 넘김(명단은 0 아래를 0으로 자름 · 심사는 그대로)
  SH.convScore = (st, ok, win, rep) => Math.round((ok / win) * SH.R.conversion_task_weight + rep * SH.R.conversion_rep_weight + SH.bossPoints(st));
  SH.conversion = function (st) {
    const win = SH.R.conversion_window;
    const last = st.tasks.filter(t => t.mode === 'week').slice(-win);
    const ok = last.filter(t => t.ok).length;
    const score = SH.convScore(st, ok, win, st.s.rep);
    const pass = score >= SH.R.conversion_score_min && st.s.rep >= SH.R.conversion_rep_min && ok >= SH.R.conversion_tasks_min;
    return { ok, score, rep: st.s.rep, boss: SH.stageName(st, 'boss'), pass };
  };
  /* 정규직 후보 명단(11-12 밤 대표님 '섞는 길로' — 결산엔 명단 순위 · '나' 카드엔 도장판)
     동기 넷의 점수는 지어낸 곡선: 심사 주에 백승호 62 · 오세진 45(문턱 47 바로 아래 · 155: 전 48 · 문턱 50) · 강다은 44 · 문태호 36 으로 닿음 · 주마다 ±3 흔들림(주 수에 비례 — 초반엔 금수저 백승호가 앞섬)
     내 줄 = 심사 점수와 같은 셈 · 다만 '붙음' 조건(과제 · 평판 · 점수 문턱 — 값은 규칙 숫자 conversion_tasks_min · conversion_rep_min · conversion_score_min)을 다 채우기 전엔 문턱 위로 안 감 → 위 둘 안 = 실제로 붙는 판 */
  const MATES = () => SH.D.ui_lines.MATES;   /* 동기 넷 · 심사 주 점수 — 원본 04_시범/대사/화면_글.json */
  SH.internList = function (st) {
    const win = SH.R.conversion_window, thr = SH.R.conversion_score_min;
    const all = st.tasks.filter(t => t.mode === 'week'), n = all.length, last = all.slice(0, n).slice(-win), ok = last.filter(t => t.ok).length;
    const rep = st.s.rep;
    const raw = SH.convScore(st, ok, win, Math.max(0, rep));
    const pass = raw >= thr && rep >= SH.R.conversion_rep_min && ok >= SH.R.conversion_tasks_min;
    const me = pass ? Math.max(raw, thr) : Math.min(raw, thr - 3);
    const w = Math.min(n, win), wob = (k) => n >= win ? 0 : ((n * 7 + k * 13) % 7) - 3;
    const rows = MATES().map((m, k) => ({ nm: m.id ? SH.name(m.id) : m.nm, v: Math.max(0, Math.round((m.fin + wob(k)) * w / win)) }))
      .concat([{ nm: '나', v: me, me: true }]).sort((a, b) => b.v - a.v || (a.me ? -1 : 1));
    return { rows, rank: rows.findIndex(r => r.me), cut: 2, left: Math.max(0, win - n), ok, need: SH.R.conversion_tasks_min, n, win };
  };
  // 결산 화면에 말로 보이는 심사표 ('7번이면 된다'고 안내하지 않음)
  SH.conversionWords = function (st) {
    const c = SH.conversion(st);
    return [
      `과제 ${c.ok}번 — ${c.ok >= SH.R.conversion_tasks_min ? '문턱 넘음' : '아직 모자람'}`,
      `평판 ${c.rep >= SH.R.conversion_rep_min ? '됨' : '아직'}`,
      `부장 '${c.boss}'`
    ];
  };

  function judgeTask(st, rep) {
    const t = st.task || { id: 'none', name: '(과제 없음)', goal: 2, progress: 0 };
    const ok = t.forced ? t.forced === 'success' : t.progress >= t.goal;
    st.wk.taskOk = ok;
    st.tasks.push({ tick: st.tick, mode: st.mode, id: t.id, ok });
    st.period.n++; if (ok) st.period.ok++;
    rep.task = { name: t.name, progress: t.progress, goal: t.goal, ok, quote: t.quote };
    if (ok) {
      if (SH.mile(st, 'intern_first_task_success')) rep.gets.push('리서치센터가 열림');
      const bonus = st.rank === 'intern' ? SH.R.intern_task_bonus : Math.round(((SH.RK[st.rank] || {}).salary || {}).amount * SH.R.staff_task_bonus_ratio || 0);
      if (bonus) { SH.addMoney(st, bonus, '과제 성과금'); rep.gets.push(`성과금 +${SH.won(bonus)}`); }
      // 청운 물량 과제(R2 4절): 성공하면 성과금 ×2 · 늘어난 몫은 작전 몫(dirty_money)에도 셈
      if (/^task_cheongwoon_/.test(t.id)) {
        SH.addMoney(st, bonus, '특별 성과금'); st.funds.dirty_money += bonus; rep.gets.push(`특별 성과금 +${SH.won(bonus)}`);
        if (t.id === 'task_cheongwoon_volume') st.counts.cheongwoon_success_count = (st.counts.cheongwoon_success_count || 0) + 1;
      }
      if (st.rank === 'intern' || st.rel.boss.st < 4) { SH.addAff(st, 'boss', SH.R.boss_task_success); }
      rep.boss = SH.R.boss_task_success;
    } else {
      SH.addStat(st, 'stress', SH.R.task_fail_stress);
      SH.addAff(st, 'boss', SH.R.boss_task_fail);
      rep.boss = SH.R.boss_task_fail;
    }
  }

  // 인턴 금요일 결산 → 보고서 한 장 (화면이 그림)
  SH.weekSettle = function (st) {
    const rep = { kind: 'week', gets: [], money: [], before: st.wk.snap, conv: null, picks: st.wk.picks.slice() };
    judgeTask(st, rep);
    const sal = SH.RK.intern.salary;
    if (st.week % sal.every_n === 0) {
      SH.addMoney(st, sal.amount, '인턴 수당'); rep.money.push(`인턴 수당 +${SH.won(sal.amount)}`);
      SH.addMoney(st, -SH.RK.intern.living_cost, '생활비'); rep.money.push(`생활비 −${SH.won(SH.RK.intern.living_cost)}`);
    }
    rep.words = SH.conversionWords(st);
    if (st.week === SH.internWeeks() || (st.ext && st.week === SH.internExtEnd())) {
      const c = SH.conversion(st);
      rep.conv = c;
      st.conv = c.pass ? 'pass' : (st.week === SH.internWeeks() ? 'ext' : 'fail');
      if (st.week === SH.internWeeks()) st.convFirst = st.conv;
      if (st.week === SH.internWeeks()) st.convAt = { ok: c.ok, score: c.score, rep: c.rep, boss: c.boss, pass: c.pass };   // 첫 심사 때의 숫자(로봇이 균형을 잴 때 읽음)
    }
    rep.after = SH.snapshot(st);
    rep.why = Object.assign({}, st.why || {});   // 결산 '왜' — 이름표별 합(화면이 돈 큰 숫자를 누르면 보임)
    return rep;
  };
  /* ── 판이 '책'으로 남음(피드백 35 · 활협전 조사 C) ── scope 'act1' = 인턴 열두 주 · 'all' = 한 판 전체
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
    return { title, did, close: close.map(x => x.t), missed };
  };
  // 심사가 직접 부르는 결과 카드
  SH.conversionCard = function (st) {
    if (st.week !== SH.internWeeks() && !(st.ext && st.week === SH.internExtEnd())) return null;
    if (st.conv === 'pass') return SH.CODE_CARDS.pass;
    return st.week === SH.internWeeks() ? SH.CODE_CARDS.fail : SH.CODE_CARDS.ext;
  };

  // 달 결산(사원부터): 돈 고리가 씀(loop.js loopSettle) — 주식 손익 · 월급에서 남긴 돈 · 성과금 · 땅 · 이자 · 진급 · 까닭 세 줄 · 목표 셋
  SH.tickSettle = function (st) {
    const rep = SH.loopSettle(st);
    if (st.skipSettle > 0) { st.skipSettle--; rep.hidden = true; }
    return rep;
  };
})(typeof window !== 'undefined' ? window : globalThis);
