/* =====================================================================
   land.js — 땅 사기 첫 판(11-13 대표님 목업 '추천대로' · 목업/1113_땅사기 · 숫자는 땅_카드.md → GAME_DATA.lands)
   - 과장부터 열림 · 첫 판 땅 셋 · 사기(현금 · 대출 3 · 5 · 7할) · 짓기(셋 중 하나 · 짓는 동안 세 없음) · 팔기
   - 달 · 분기 결산에 세 · 이자 · 땅값 세 줄(SH.landTick) · 한 마디에 사기 · 짓기 · 팔기 합쳐 한 번
   - 대출 돈은 손에 안 들어옴(땅값 · 짓는 값으로 바로) → 독립 셈(내 돈)엔 안 들어감
   - 이자는 결산에서 내 돈에서 빠짐 → 0 밑이면 지금 카드빚 규칙 그대로(빚 끝 · flow.js)
   - 1998 흔들림 장면(이벤트_카드_땅.md)의 고르기는 효과 칸 land: sell · hold · discount
   - 저장: st.land 하나(같은 판 안에서 늘어난 칸 — 없으면 빈 꼴로 채움 · save.js migrate)
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const L = () => (SH.D && SH.D.lands) || {};
  const ym = (d) => { const [y, m] = String(d).slice(0, 7).split('-').map(Number); return y * 12 + m - 1; };
  const round10 = (v) => Math.round(v / 100000) * 100000;   // 땅 돈은 10만 원 단위로 반올림(돈 글로 쓰는 SH.won 과 다름)

  SH.landState = (st) => st.land || (st.land = { opened: null, intro: false, lots: {}, shock: null, discount: false, acted: -99, lastValue: 0 });
  // 과장부터 열림 · 땅을 가진 채 잘렸으면(실업) 팔 수는 있게 열어 둠
  SH.landOpen = (st) => !!((L().first_lots || []).length && ((L().open_rank && SH.rankAtLeast(st, L().open_rank)) || (st.land && Object.keys(st.land.lots).length)));
  SH.lotDef = (id) => (L().first_lots || []).find(l => l.lot === id) || null;
  SH.kindDef = (id) => (L().kinds || []).find(k => k.id === id) || null;

  // 땅값 지수(1997 = 100) · 표 사이 달은 곧게 이음
  SH.landIndex = function (st) {
    const T = L().index || [], t = ym(st.date);
    if (!T.length) return 100;
    if (t <= ym(T[0].at)) return T[0].v;
    for (let i = 1; i < T.length; i++) { const a = ym(T[i - 1].at), b = ym(T[i].at); if (t <= b) return T[i - 1].v + (T[i].v - T[i - 1].v) * (t - a) / Math.max(1, b - a); }
    return T[T.length - 1].v;
  };
  // 급매(11-13 돈 고리): 지도에서 '급매 땅'에 자유 시간 한 칸을 쓴 달은 그 달 사는 값이 deal_mult
  SH.landDeal = (st) => !!(st.land && st.land.deal === st.tick);
  SH.landPrice = (st, id) => { const d = SH.lotDef(id); return d ? round10(d.base * SH.landIndex(st) / 100 * (SH.landDeal(st) && !SH.landState(st).lots[id] ? (L().deal_mult || 1) : 1)) : 0; };
  // 달 이자: 표의 계단 · 흔들림 장면 뒤 석 달은 shock.rate
  SH.landRate = function (st) {
    const S = SH.landState(st), t = ym(st.date);
    if (S.shock && st.tick < S.shock.until) return (L().shock || {}).rate || 0;
    let v = 0; (L().interest || []).forEach(x => { if (t >= ym(x.from)) v = x.v; });
    return v;
  };
  // 세 곱: 때마다(불경기 · 회복기) · 흔들림 장면에서 '세 깎기'를 골랐으면 불경기 곱 대신 discount_mult
  SH.landMult = function (st, kind) {
    const S = SH.landState(st), t = ym(st.date); let m = 1;
    (L().rent_mult || []).forEach(x => { if (t >= ym(x.from) && t <= ym(x.to) && x[kind] != null) m = x[kind]; });
    if (S.discount && m < 1) m = L().discount_mult || 0.7;
    return m;
  };
  // 이 땅의 달 세(짓는 중이면 0 · 낡은 건물은 상가 곱)
  SH.lotRent = function (st, id) {
    const o = SH.landState(st).lots[id], d = SH.lotDef(id);
    if (!o || !d) return 0;
    if (o.kind) { if (st.tick < o.doneTick) return 0; const k = SH.kindDef(o.kind); return k ? Math.round(k.rent * d.kan * SH.landMult(st, o.kind)) : 0; }
    return o.old ? Math.round((L().old_rent || 0) * d.kan * SH.landMult(st, 'shop2')) : (L().empty_rent || 0);
  };
  SH.landLoan = (st) => Object.values(SH.landState(st).lots).reduce((a, o) => a + (o.loan || 0), 0);
  SH.landSellValue = (st, id) => { const o = SH.landState(st).lots[id]; return o ? SH.landPrice(st, id) + Math.round((o.cost || 0) * (L().sell_build_ratio || 0.7)) : 0; };
  SH.landCanAct = (st) => SH.landOpen(st) && SH.landState(st).acted !== st.tick && st.mode !== 'week';
  const lf = (v, max) => Math.max(0, Math.min(max, +v || 0));

  SH.landBuy = function (st, id, frac) {
    const S = SH.landState(st), d = SH.lotDef(id);
    if (!d || S.lots[id] || !SH.landCanAct(st)) return { ok: false, msg: '이번 달엔 못 삼' };
    const price = SH.landPrice(st, id), loan = round10(price * lf(frac, (L().loan || {}).land || 0)), cash = price - loan;
    if (st.s.money < cash) return { ok: false, msg: `내 돈이 ${SH.won(cash - st.s.money)} 모자람` };
    SH.addMoney(st, -cash, `땅 삼 · ${d.name}`);
    S.lots[id] = { paid: price, loan, kind: null, cost: 0, doneTick: null, old: !!d.old, since: st.tick };
    S.acted = st.tick; st.flags.land_owner = true;
    SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.land, { lot: d.name, price: SH.won(price) });
    return { ok: true, msg: `${SH.josa(d.name, '을/를')} 샀다${loan ? ` · 빌린 돈 ${SH.won(loan)}` : ''}` };
  };
  SH.landBuild = function (st, id, kind, frac) {
    const S = SH.landState(st), o = S.lots[id], d = SH.lotDef(id), k = SH.kindDef(kind);
    if (L().build_rank && !SH.rankAtLeast(st, L().build_rank)) return { ok: false, msg: `건물은 ${(SH.RK[L().build_rank] || {}).name_ko}부터 지을 수 있음` };
    if (!o || o.kind || !k || !d || d.kan < (k.min_kan || 1) || !SH.landCanAct(st)) return { ok: false, msg: '이번 달엔 못 지음' };
    const cost = k.cost * d.kan, loan = round10(cost * lf(frac, (L().loan || {}).build || 0)), cash = cost - loan;
    if (st.s.money < cash) return { ok: false, msg: `내 돈이 ${SH.won(cash - st.s.money)} 모자람` };
    SH.addMoney(st, -cash, `짓는 값 · ${d.name}`);
    Object.assign(o, { kind, cost, loan: o.loan + loan, old: false, doneTick: st.tick + Math.max(1, Math.ceil(k.months / SH.monthsInTick(st))) });
    S.acted = st.tick;
    return { ok: true, msg: `${d.name}에 ${SH.josa(k.name, '을/를')} 짓기 시작했다` };
  };
  function sellOne(st, id) {
    const S = SH.landState(st), o = S.lots[id], d = SH.lotDef(id);
    const net = SH.landSellValue(st, id) - (o.loan || 0);
    SH.addMoney(st, net, `땅 팖 · ${d.name}`);
    delete S.lots[id];
    if (!Object.keys(S.lots).length) st.flags.land_owner = false;
    return net;
  }
  SH.landSell = function (st, id) {
    const _r = SH._landSell0(st, id), S0 = SH.landState(st);
    if (_r && _r.ok && S0.recall) { const loan = SH.landLoan(st); if (loan <= 0) S0.recall = null; else S0.recall.need = Math.min(S0.recall.need, S0.recall.paid + loan); }      // 판 땅의 빚은 회수 요구에서도 빠짐(새 눈 검토 19)
    return _r;
  };
  SH._landSell0 = function (st, id) {
    const S = SH.landState(st);
    if (!S.lots[id] || !SH.landCanAct(st)) return { ok: false, msg: '이번 달엔 못 팖' };
    const net = sellOne(st, id); S.acted = st.tick;
    return { ok: true, msg: `팔았다 — 손에 ${net >= 0 ? '' : '−'}${SH.won(Math.abs(net))}` };
  };

  // 은행 회수(11-13 대표님 '은행 회수 더함' · 땅_카드.md recall): 흔들림 때 빚이 땅값(건물 빼고)의 ratio 를 넘으면 기한 안에 빚의 part 갚기
  //   갚기는 한 마디 한 번 제한 밖 · 기한이 지나도 덜 갚았으면 결산에서 땅을 판 값의 seize 로 가져가고 남는 빚은 내 돈에서(카드빚 규칙으로 이어짐)
  SH.landLandValue = (st) => Object.keys(SH.landState(st).lots).reduce((a, id) => a + SH.landPrice(st, id), 0);
  SH.landRepay = function (st) {
    const S = SH.landState(st), R = S.recall; if (!R) return { ok: false, msg: '갚을 회수가 없음' };
    const left = Math.min(R.need - R.paid, SH.landLoan(st)), pay = Math.min(left, Math.max(0, Math.floor(st.s.money / 100000) * 100000));      // 갚을 것은 남은 빚까지만(새 눈 검토 19)
    if (left <= 0) { S.recall = null; return { ok: true, msg: '갚을 빚이 없다 — 은행이 물러섰다' }; }
    if (pay <= 0) return { ok: false, msg: '갚을 돈이 없음' };
    let rest = pay; const ids = Object.keys(S.lots).filter(id => S.lots[id].loan > 0), tot = SH.landLoan(st);
    ids.forEach((id, i) => { const o = S.lots[id], cut = i === ids.length - 1 ? rest : Math.min(rest, Math.round(pay * o.loan / tot)); o.loan -= cut; rest -= cut; });
    SH.addMoney(st, -pay, '빚 갚음 · 한빛은행'); R.paid += pay;
    if (R.paid >= R.need) S.recall = null;
    return { ok: true, msg: S.recall ? `${SH.won(pay)} 갚음 — 남은 ${SH.won(R.need - R.paid)}` : '회수 끝 — 은행이 물러섰다' };
  };
  function seize(st, rep) {
    const S = SH.landState(st), rc = L().recall || {};
    let got = 0; Object.keys(S.lots).forEach(id => { got += Math.round(SH.landSellValue(st, id) * (rc.seize || 0.7)); });
    const loan = SH.landLoan(st), net = got - loan, names = Object.keys(S.lots).map(id => SH.lotDef(id).name).join(' · ');
    SH.addMoney(st, net, '은행 회수 · 땅 넘김');
    S.lots = {}; S.recall = null; st.flags.land_owner = false; st.flags.land_seized = true;
    SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.land_lost, { names: names });
    if (rep) rep.money.push(`은행 회수 — 땅을 넘김 · ${net >= 0 ? '+' : '−'}${SH.won(Math.abs(net))}`);
    return net;
  }

  // 달 · 분기 결산(settle.js tickSettle 이 부름): 세 · 이자 · 땅값 · 처음 열린 때 찍기
  SH.landTick = function (st, rep) {
    const S = SH.landState(st);
    if (S.opened == null && SH.landOpen(st)) S.opened = st.tick;
    if (S.recall && st.tick >= S.recall.until) { const net = seize(st, rep); rep.land = { seized: true, net }; return; }
    const ids = Object.keys(S.lots); if (!ids.length) return;
    const n = SH.monthsInTick(st); let rent = 0;
    ids.forEach(id => { const r = Math.round(SH.lotRent(st, id) * n); if (r) { SH.addMoney(st, r, `세 · ${SH.lotDef(id).name}`); rent += r; } });
    const loan = SH.landLoan(st), it = Math.round(loan * SH.landRate(st) * n);
    if (it) SH.addMoney(st, -it, '이자 · 한빛은행');
    const val = ids.reduce((a, id) => a + SH.landSellValue(st, id), 0);
    rep.land = { rent, interest: it, loan, value: val, prev: S.lastValue || val, building: ids.some(id => S.lots[id].kind && st.tick < S.lots[id].doneTick), recall: S.recall ? { left: S.recall.need - S.recall.paid, ticks: S.recall.until - st.tick } : null };
    S.lastValue = val;
  };

  // 지도에 내 땅 건물 끼우기(ui/map.js 가 지역을 칠하기 전에 부름): 낡은 건물을 헐고 공사장 · 새 건물로 · 빈 땅엔 새로 세움
  SH.landSrc = function (st, src) {
    const S = st && st.land; if (!S || !Object.keys(S.lots).length) return src;
    const out = Object.assign({}, src, { buildings: (src.buildings || []).slice(), lots: (src.lots || []).map(l => Object.assign({}, l)) });
    Object.entries(S.lots).forEach(([id, o]) => {
      const lot = out.lots.find(l => l.id === id); if (!lot || !o.kind) return;
      const k = SH.kindDef(o.kind), done = st.tick >= o.doneTick;
      out.buildings = out.buildings.filter(b => b.lot !== id);
      lot.state = 'mine';
      out.buildings.push({ id: id + '.mine', name: done ? k.name : '공사장', x: lot.x, y: lot.y, w: 3, h: 3, z: 40, frame: 'm', places: [], lot: id, kind: done ? k.bkind : 'bt.land_site', mine: 1 });
    });
    return out;
  };

  // 1998 흔들림 장면의 고르기(이벤트_카드_땅.md): 이자는 어느 쪽이든 석 달 올라감
  SH.R2_EFFECT = SH.R2_EFFECT || {};
  SH.R2_EFFECT.land = function (st, v) {
    const S = SH.landState(st), sh = L().shock || {};
    S.shock = { until: st.tick + Math.max(1, Math.ceil((sh.months || 3) / SH.monthsInTick(st))) };
    if (v === 'sell') Object.keys(S.lots).forEach(id => sellOne(st, id));
    if (v === 'discount') S.discount = true;
    const rc = L().recall, loan = SH.landLoan(st), lv = SH.landLandValue(st);
    if (rc && loan > 0 && loan > lv * rc.ratio) S.recall = { need: round10(loan * rc.part), paid: 0, until: S.shock.until };
  };
})(typeof window !== 'undefined' ? window : globalThis);
