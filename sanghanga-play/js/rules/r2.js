/* =====================================================================
   r2.js — 2~6막 카드(이벤트_카드_R2.md 1절 '양식 더함')가 쓰는 결과 · 규칙
   - 셈 표지(count) · 돈 칸 넷(A8) · 평가 점수 · 딜 · 팀 · 상점(사기·대출·되팔기·압류) · 현금 비중
   - 판결(감경 셈) · 추징 · 퇴사 · 부업 · 개업 · 출자 약속 · 카드가 주는 직급(그 결산 진급 심사를 넘을 때만)
   숫자는 카드 파일 3절 '숫자 기준과 다름' · 4절 '바탕 가정'(모두 가정)
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const add = (o, k, v) => { o[k] = (o[k] || 0) + (Number(v) || 0); };

  SH.R2_EFFECT = Object.assign(SH.R2_EFFECT || {}, {   // 있던 것에 더함(11-15: 통째로 새로 만들면 싣는 차례가 바뀔 때 다른 파일이 붙인 효과가 조용히 사라짐)
    count(st, v) { for (const c in v) { st.counts[c] = Math.max(0, (st.counts[c] || 0) + Number(v[c] || 0)); if (c === 'oh_bond') st.counts[c] = Math.min(5, st.counts[c]); } },
    dirty_money(st, v) { add(st.funds, 'dirty_money', v); },
    firm_cash(st, v) { add(st.funds, 'firm_cash', v); },
    aum(st, v) { add(st.funds, 'aum', v); },
    group_money_amount(st, v) { add(st.funds, 'group_money_amount', v); },
    eval_bonus(st, v) { add(st.period, 'bonus', v); },
    deal(st, v) { add(st.counts, 'deal', v); },
    team(st, v) { for (const k in v) add(st.team, k, v[k]); },
    use_slots(st, v) { st.usedSlots = v; },             // 달·분기 마디는 여섯 칸을 먼저 고르므로 기록만
    skip_settle(st, v) { st.skipSettle = (st.skipSettle || 0) + Number(v || 1); },
    side_job(st, v) { st.sideJob = v; SH.toast(st, `부업 — 달 ${SH.won(v.pay || 0)}`); },
    pledge(st, v) { add(st.pledge, 'share', v.share); add(st.pledge, 'trust', v.trust); },
    leave_company(st, v) { if (v) { SH.setRank(st, 'jobless'); st.employed = false; SH.toast(st, '회사를 나왔다'); } },
    firm(st, v) {
      if (v.open) {
        SH.setRank(st, 'founder'); st.employed = true; st.flags.founder = st.tick + 1;
        add(st.funds, 'firm_cash', st.pledge.share); add(st.funds, 'aum', st.pledge.trust); st.pledge = { share: 0, trust: 0 };
        SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.r2_open);
      }
      ['office_tier', 'staff_count', 'unpaid_ticks'].forEach(k => { if (v[k] != null) add(st.team, k, v[k]); });
    },
    cash_ratio(st, v) { st.cashTarget = Object.assign(st.cashTarget || {}, v); if (v.company != null) SH.setCashRatio(st, 'co', v.company); },
    // 감경 셈(4절): ① 증거 2 이상 ② 기자에게 전화 ③ 세라 증언 ④ 최갑수 내 편 증인 — 둘 이상이면 기소유예 · 도주 시도면 하나 깎음
    verdict(st, v) {
      let n = 0;
      if ((st.counts.evidence || 0) >= 2) n++;
      if (st.flags.called_press) n++;
      if (st.flags.sera_testifies) n++;
      if (st.flags.boss_owes || st.flags.saved_boss) n++;
      if (st.flags.tried_to_flee) n--;
      const f = v === 'count' && n >= 2 ? 'deferred_prosecution' : 'suspended_sentence';
      st.flags[f] = st.tick + 1; st.verdictCount = n;
      SH.toast(st, f === 'deferred_prosecution' ? '판결 — 기소유예' : '판결 — 집행유예');
    },
    // 추징 셈(4절): 작전 몫 + 그룹 자금 몫 + 1998 손실 옮기기 1억 + 거슬러 적은 일지 5천만
    forfeit(st, v) {
      if (v === 'all') { const was = st.s.money; st.s.money = Math.min(st.s.money, 0); SH.whyAdd(st, st.s.money - was, '추징'); SH.toast(st, `추징 — 가진 돈 ${SH.won(was)}을 다 냄`); return; }
      const amt = (st.funds.dirty_money || 0) + (st.funds.group_money_amount || 0) + (st.flags.oh_cover_1998 ? SH.R.forfeit_oh_cover : 0) + (st.flags.signed_backdated ? SH.R.forfeit_backdated : 0);
      SH.addMoney(st, -amt, '추징'); SH.toast(st, `추징 −${SH.won(amt)}`);
    },
    shop(st, v) {
      if (v.loan) { SH.addMoney(st, v.loan, '빌린 돈'); add(st.funds, 'loan', v.loan); }
      if (v.buy) SH.forceBuy(st, v.buy);
      if (v.sell_all || v.seize_all) {
        const keep = v.keep || [];
        const kept = (id) => { const it = SH.item(id); return keep.includes(id) || (it && keep.includes(it.slot)) || (id === 'suit_custom' && keep.includes('first_suit')); };
        let got = 0;
        st.owned = st.owned.filter(id => {
          if (kept(id) || ['suit_0', 'watch_0'].includes(id)) return true;
          const it = SH.item(id); if (!it) return false;
          if (v.sell_all) { const r = (SH.D.shop.resale || {})[it.slot]; got += Math.round(it.price * (typeof r === 'number' ? r : 0.8)); }
          return false;
        });
        Object.keys(st.equip).forEach(sl => { if (!st.owned.includes(st.equip[sl])) delete st.equip[sl]; });
        if (!st.equip.suit) st.equip.suit = st.owned.includes('suit_custom') ? 'suit_custom' : 'suit_0';
        if (!st.equip.watch) st.equip.watch = 'watch_0';
        st.s.style = SH.styleNow(st);
        if (got) SH.addMoney(st, got, '물건 되팔기');
        SH.toast(st, v.seize_all ? '압류 — 물건이 다 나갔다' : `되팔기 +${SH.won(got)}`);
      }
    }
  });
  SH.styleNow = (st) => Object.values(st.equip).reduce((t, id) => t + ((SH.item(id) || {}).style || 0), 0) + st.body;
  // 카드가 사 주는 물건: 값은 상점 표 그대로 빠짐(모자라면 빚) · 자리 잠금은 안 봄
  SH.forceBuy = function (st, id) {
    const it = SH.item(id); if (!it) { SH.err(st, `상점에 없는 물건 ${id}`); return; }
    SH.addMoney(st, -it.price, '물건 삼');
    if (!st.owned.includes(id)) st.owned.push(id);
    const cur = SH.item(st.equip[it.slot]);
    if (it.slot !== 'gift' && (!cur || it.style > cur.style)) { st.equip[it.slot] = id; st.s.style = SH.styleNow(st); }
    if (it.slot === 'car') SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.car, { item: it.name_ko });
    if (it.slot === 'home' && it.tier > 0) SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.home, { item: it.name_ko });
    st.lastUpkeep = SH.upkeepOf(it);   // 방금 산 물건의 달 유지비(대사의 {upkeep})
  };
  /* 달 유지비(11-14 대표님 '추천대로' — 전엔 대사가 보여 주기만 하고 한 번도 안 뺌): 가게 표의 '유지비/달' 칸이 원본 · 칸이 없는 것(집)은 값 × 규칙 몫 · 자취방(단 0)은 월급에서 남긴 돈에 이미 들어 있어 0
     달 결산이 지금 타는 차 · 사는 집 하나씩을 '차 · 집 유지비' 한 줄로 뺌(loop.js settlePay) */
  SH.upkeepOf = (it) => !it || !(it.price > 0) ? 0 : it.upkeep_month != null ? it.upkeep_month
    : it.slot === 'car' ? Math.round(it.price * SH.R.upkeep_car_month) : it.slot === 'home' && it.tier > 0 ? Math.round(it.price * SH.R.upkeep_home_month) : 0;
  SH.upkeepMonth = (st) => ['car', 'home'].reduce((a, sl) => a + SH.upkeepOf(SH.item((st.equip || {})[sl])), 0);

  /* 현금 비중(cashRatio · setCashRatio)은 돈 고리 loop.js 가 맡음 */

  /* ── 카드가 주는 직급 ── 2막부터는 그 결산 진급 심사(도착 직급 문턱 + R2 보정)를 넘을 때만 · 내려가는 건 바로 */
  SH.arrivalOk = function (st, rid) {
    const prev = SH.D.ranks.items.find(r => r.next === rid);
    if (!prev) return true;
    const P = prev.promote || {};
    let rep = P.rep_min;
    if (rid === 'asst_manager' && (st.counts.oh_bond || 0) >= 1) rep = 15;        // 3절: 대리 심사 평판 15 (오상무 줄)
    if (rep != null && st.s.rep < rep) return false;
    if (P.skill_min != null && SH.skillAvg(st) < P.skill_min) return false;
    if (P.deals_min && !st.L && (st.counts.deal || 0) < P.deals_min) return false;      /* 돈 고리엔 '딜' 행동이 없어 이 문턱은 영영 못 넘었음(11-13 밤 — 카드가 주는 차장 진급이 다 막혀 세라 루트 가운데 막이 안 나옴) */
    return true;
  };
  SH.cardRank = function (st, rid) {
    if (rid === 'founder') { SH.setRank(st, 'founder'); return; }
    if (st.mode === 'week' || st.rank === 'intern') { SH.promote(st, rid, 'event'); return; }
    const a = SH.RANK_ORDER.indexOf(st.rank), b = SH.RANK_ORDER.indexOf(rid);
    if (b >= 0 && a >= 0 && b < a) { SH.setRank(st, rid); SH.toast(st, `${SH.RK[rid].name_ko}로 내려감`); return; }
    if (b <= a) return;
    if (SH.arrivalOk(st, rid)) SH.promote(st, rid, 'eval'); else { st.rankTarget = rid; SH.toast(st, `${SH.RK[rid].name_ko} 심사 — 다음 결산에서 다시`); }
  };
  SH.rankTargetCheck = function (st) {
    const t = st.rankTarget; if (!t) return null;
    if (SH.RANK_ORDER.indexOf(t) <= SH.RANK_ORDER.indexOf(st.rank)) { st.rankTarget = null; return null; }
    if (SH.arrivalOk(st, t)) { st.rankTarget = null; SH.promote(st, t, 'eval'); return t; }
    return null;
  };

  /* ── 작전 종목 값(가정 · 카드 파일 2절): 청운화학 1996 가을부터 달마다 +4~8% → 1997-11 무너짐 · 청운넷 상장 5,000 → 2000-02 정점 → 연말 −95% ── */
  SH.SPECIAL_DRIFT = function (id, ym) {   /* 기간 · % 는 규칙 표 special_drift */
    for (const [a, b, v] of (SH.R.special_drift || {})[id] || []) if (ym >= a && ym <= b) return v;
    return null;
  };
  /* R2 끝 갈래 표 — 원본 = 04_시범/대사/끝_갈래.json 의 R2_ENDINGS(묶음 endings) */
  Object.defineProperty(SH, 'R2_ENDINGS', { get: () => (SH.D && SH.D.endings || {}).R2_ENDINGS, configurable: true });
})(typeof window !== 'undefined' ? window : globalThis);
