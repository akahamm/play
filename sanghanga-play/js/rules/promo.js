/* =====================================================================
   promo.js — 진급 (숫자 초안 3-5 잘림 · 3-6 독립)
   - 진급 심사는 돈 고리 결산(loop.js)이 함 — 옛 분기 평가 · 사다리 심사 · 연말 성과급 · 대표 심사는
     부르는 곳이 끊겨 걷음(11-14 밤 정리 · 원문 _to_delete/걷어낸_코드_1114.md)
   - 2막 뒤는 '틀'만 — 딜·이사회 같은 장치는 대신 숫자로 어림(아래 '가정')
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};

  SH.promote = function (st, rid, why) {
    if (!SH.RK[rid] || rid === st.rank) return;
    SH.setRank(st, rid);
    const nm = SH.RK[rid].name_ko;
    SH.note(st, `${nm} 진급`, 'promo');
    SH.toast(st, `진급 — ${nm}`);
    if (rid === 'staff') { SH.mile(st, 'rank:staff'); }
    else SH.addFirst(st, SH.fillKeys(SH.D.ui_lines.FIRSTS.promo[0], { rank: nm }), SH.RK[rid].desk_art_ko ? SH.fillKeys(SH.D.ui_lines.FIRSTS.promo[1], { desk: SH.RK[rid].desk_art_ko }) : '', SH.D.ui_lines.FIRSTS.promo[2]);
    if (rid === 'staff') { SH.loopInit(st); SH.graduate(st); }      // 정규직 — 내 돈 계좌(돈 고리) · 졸업 정리
    st.notices = st.notices || [];
    st.notices.push({ title: `${nm}!`, text: why === 'event' ? SH.D.loop_scenes.PROMO_NOTE.event : why === 'loop' ? SH.fillKeys(SH.D.loop_scenes.PROMO_NOTE.loop, { desk: SH.RK[rid].desk_art_ko || '' }).trim() : SH.fillKeys(SH.D.loop_scenes.PROMO_NOTE.gate, { desk: SH.RK[rid].desk_art_ko || '' }).trim(), kind: rid === 'staff' ? 'rankcard' : 'promo', rank: rid });   /* 글 = 장면_글.json 의 PROMO_NOTE · 사원은 명함 장면(ui/tick.js · 11-18 졸업 흐름) */
  };

  /* 인턴 졸업(정규직 전환) — 사원 첫 달이 '쓰러졌다' · '장 못 봄'으로 시작하지 않게 체력은 grad_hp_floor 까지 · 스트레스는 grad_stress_cap 아래로 · 인턴 마지막 주의 쉼 · 쓰러짐 자국을 지움(11-18 대표님 졸업 흐름 목업 '이대로') */
  SH.graduate = function (st) {
    SH.addStat(st, 'hp', Math.max(0, SH.R.grad_hp_floor - st.s.hp));
    SH.addStat(st, 'stress', -Math.max(0, st.s.stress - SH.R.grad_stress_cap));
    if (st.wk) { st.wk.rest = false; st.wk.lost = 0; }
  };
  // 그 직급이 되면 열리는 장소 이름(장소 카드 '열림' 칸이 직급인 것) — 명함 장면의 '새 장소' 줄
  SH.rankOpens = (rid) => SH.D.places.items.filter(p => p.unlock && p.unlock.kind === 'rank' && p.unlock.id === rid).map(p => p.name_ko);

  // 잘림 → 재기(실력 평균 55 · 인맥 50) 또는 몰락 (3-5 · 여쭐 것 2 '재기 추천')
  SH.fire = function (st, why) {
    const R = SH.D.ranks.rules.rehire || {};
    const i = SH.RANK_ORDER.indexOf(st.rank);
    if (SH.skillAvg(st) >= (R.skill_avg_min || 55) && st.s.network >= (R.network_min || 50) && i > 1) {
      const to = SH.RANK_ORDER[Math.max(1, i - (R.drop_ranks || 1))];
      SH.setRank(st, to); st.grades.push({ tick: st.tick, rank: to, score: 0, g: 'R' });
      st.flags.rehired = st.tick;
      (st.notices = st.notices || []).push({ title: SH.D.loop_scenes.PROMO_NOTE.fired[0], text: SH.fillKeys(SH.D.loop_scenes.PROMO_NOTE.fired[1], { why: why, rank: SH.RK[to].name_ko }), kind: 'warn' });
    } else {
      SH.setEnding(st, 'end_fired');
    }
  };

  /* ── 독립 (3-6 · 틀만) ── 과장부터 사표 · 내 돈 founder_min_money(5,000만) 이상 */
  SH.canResign = (st) => SH.rankAtLeast(st, 'manager') && !['founder', 'ceo', 'jobless'].includes(st.rank);
  SH.resign = function (st) {
    if (!SH.canResign(st) || st.s.money < SH.R.founder_min_money) return false;
    const put = Math.round(st.s.money * SH.R.founder_put_ratio);
    SH.addMoney(st, -put, '독립 — 회사에 넣은 돈');
    st.funds.firm_cash = put;
    st.funds.aum = (st.s.rep + st.s.network) * SH.R.founder_aum_per_point + (st.rel.client && st.rel.client.st >= 3 ? SH.R.founder_aum_client : 0);
    SH.setRank(st, 'founder'); st.flags.founder = st.tick;
    SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.founder);
    st.closedQ = 0;
    return true;
  };
  // 분기 수입: 운용 보수(운용 자산의 분기 0.375%) + 성과 보수(수익의 20%) − 비용 · 회사 현금 0 아래 2분기 = 폐업
  // 돈 고리(11-13): 수익률은 주사위가 아니라 그 분기에 내가 굴린 성적(ret) · 성과 보수는 시장보다 잘한 몫(exc)의 2할
  SH.founderQuarter = function (st, rep, ret0, exc) {
    const f = st.funds;
    const ret = ret0 != null ? ret0 : (SH.rng(st) - SH.R.founder_ret_center) * SH.R.founder_ret_span;
    const gain = Math.round(f.aum * ret);
    // 11-13 대표님 독립 문턱 ㉢ — 저절로 느는 몫을 줄이고 손해 본 분기엔 고객 돈이 빠짐(전엔 문 닫는 독립이 0)
    f.aum = Math.max(0, f.aum + gain + (st.s.rep + st.s.network) * SH.R.founder_aum_grow);
    if (ret < 0) f.aum = Math.round(f.aum * (1 - SH.R.founder_loss_outflow));
    const fee = Math.round(f.aum * SH.R.founder_fee_quarter) + Math.max(0, Math.round((exc != null ? f.aum * exc : gain) * SH.R.founder_perf_fee));
    const cost = SH.R.founder_cost_staff + SH.R.founder_cost_office + SH.R.founder_living_quarter;     // 직원 하나 · 오피스텔 · 내 생활비(회사가 냄)
    f.firm_cash += fee - cost;
    const draw = f.firm_cash > 0 ? Math.round(Math.max(0, fee - cost) * SH.R.founder_draw_ratio) : 0;   // 가정: 남는 보수의 30% 를 내 돈으로
    if (draw) { f.firm_cash -= draw; SH.addMoney(st, draw, '회사에서 받은 돈'); }
    rep.money.push(`운용 보수 +${SH.won(fee)} · 비용(생활비 포함) −${SH.won(cost)}${draw ? ` · 내 몫 +${SH.won(draw)}` : ''}`);
    if (f.firm_cash < 0) { st.closedQ = (st.closedQ || 0) + 1; if (st.closedQ >= SH.R.founder_closed_quarters) { SH.setEnding(st, 'end_closed'); } }
    else st.closedQ = 0;
  };
})(typeof window !== 'undefined' ? window : globalThis);
