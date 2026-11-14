/* =====================================================================
   ui/land.js — 땅 사기 화면(11-13 대표님 목업 '추천대로' · 목업/1113_땅사기)
   - 지도 위 필지 색: 살 수 있음 금빛 + 값 칩 · 내 땅 분홍 테두리 + 깃발 · 못 삼은 그리지 않음
   - 필지를 누르면 창 하나: 사기(값 · 위 건물 · 빌릴 수 있는 돈) → 대출(3 · 5 · 7할 · '못 내면' 줄) · 내 땅(짓기 셋 · 팔기)
   - 과장 첫날 한 번 '처음 — 땅 사기' 알림
   - 화면 전역을 늘리지 않으려고 모두 G.LAND 안에 둠(tools/lint_globals.js)
   ===================================================================== */
G.LAND = (function () {
  const V = { id: null, step: null, bf: 0.5 };   // 지금 연 창: 필지 id · 단계(buy | loan | mine) · 짓는 값 빌릴 몫
  const W = (v) => SH.won(Math.abs(v));
  const lotsIn = (r) => (r.lots || []).filter(l => SH.lotDef(l.id));
  const pct = (st, id) => { const idx = SH.landIndex(st), was = SH.landIndex({ date: (+String(st.date).slice(0, 4) - 1) + String(st.date).slice(4) }); return Math.round((idx / was - 1) * 100); };

  function draw(g, r, st) {
    if (!st || !SH.landOpen(st)) return;
    const S = SH.landState(st);
    lotsIn(r).forEach(l => {
      const P = [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.h], [l.x, l.y + l.h]].map(p => M2.toScreen(r, p[0], p[1])), mine = S.lots[l.id];
      g.save(); g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
      if (mine) { g.strokeStyle = 'rgba(255,128,170,.95)'; g.lineWidth = 4; g.stroke(); }
      else { g.fillStyle = 'rgba(242,193,78,.28)'; g.fill(); g.strokeStyle = 'rgba(242,193,78,.95)'; g.lineWidth = 3; g.stroke(); }
      const c = M2.toScreen(r, l.x + l.w / 2, l.y + l.h / 2);
      if (mine) { g.fillStyle = '#ff80aa'; g.fillRect(c[0] - 1, c[1] - 34, 3, 30); g.beginPath(); g.moveTo(c[0] + 2, c[1] - 34); g.lineTo(c[0] + 18, c[1] - 28); g.lineTo(c[0] + 2, c[1] - 22); g.fill(); }
      else {
        const t = SH.won(SH.landPrice(st, l.id)).replace(/,000원$/, '천').replace(/원$/, ''); g.font = 'bold 15px sans-serif'; const w = g.measureText(t).width + 14;
        g.fillStyle = 'rgba(11,14,26,.92)'; g.fillRect(c[0] - w / 2, c[1] - 12, w, 22); g.strokeStyle = '#f2c14e'; g.lineWidth = 2; g.strokeRect(c[0] - w / 2, c[1] - 12, w, 22);
        g.fillStyle = '#f2c14e'; g.textAlign = 'center'; g.fillText(t, c[0], c[1] + 4);
      }
      g.restore();
    });
  }
  // 지도 누름: 땅 칸이면 창을 열고 true
  function tap(r, w) {
    const st = G.st; if (!st || !SH.landOpen(st)) return false;
    const [cx, cy] = M2.toCell(r, w[0], w[1]), l = lotsIn(r).find(l => cx >= l.x && cx < l.x + l.w && cy >= l.y && cy < l.y + l.h);
    if (!l) return false;
    V.id = l.id; V.step = SH.landState(st).lots[l.id] ? 'mine' : 'buy'; sheet(); return true;
  }
  const row = (k, v, cls) => `<div class="lrow"><span>${esc(k)}</span><b class="${cls || ''}">${v}</b></div>`;
  function sheet() {
    const st = G.st, d = SH.lotDef(V.id); if (!d) return overlay('');
    const S = SH.landState(st), o = S.lots[V.id], price = SH.landPrice(st, V.id), can = SH.landCanAct(st), LD = SH.D.lands, p = pct(st, V.id);
    const wait = can ? '' : `<p class="mute">이번 ${SH.tickName(st)}엔 땅 일을 이미 했다(한 ${SH.tickName(st)}에 한 번).</p>`;
    let body = '', acts = '';
    if (V.step === 'buy') {
      body = row('지금 값', `${W(price)} <small class="${p < 0 ? 'red-t' : 'green-t'}">(작년보다 ${p >= 0 ? '+' : ''}${p}%)</small>`)
        + row('위 건물', d.old ? `낡은 건물 · 세 달 ${W(LD.old_rent * d.kan * SH.landMult(st, 'shop2'))}` : '빈 땅')
        + row('은행이 빌려줌', `값의 ${+(LD.loan.land * 10).toFixed(1)}할까지 · ${W(price * LD.loan.land)}`);
      acts = `<div class="btn ${can && st.s.money >= price ? '' : 'dis'}" data-act="land" data-op="buy" data-f="0">현금으로 산다</div><div class="btn ${can ? '' : 'dis'}" data-act="land" data-op="loan">빌려서 산다</div><div class="btn sm" data-act="land" data-op="close">그만</div>`;
    } else if (V.step === 'loan') {
      const rate = SH.landRate(st);
      body = (LD.loan.steps || []).map(f => { const loan = Math.round(price * f / 100000) * 100000, cash = price - loan, ok = can && st.s.money >= cash;
        return `<div class="lopt ${ok ? '' : 'dis'}" ${ok ? `data-act="land" data-op="buy" data-f="${f}"` : ''}><b>${+(f * 10).toFixed(1)}할 · ${W(loan)}</b><span>달 이자 ${W(loan * rate)} · 내 돈에서 ${W(cash)} → 남는 돈 ${st.s.money - cash >= 0 ? '' : '−'}${W(st.s.money - cash)}</span></div>`; }).join('')
        + row('달 이자(지금)', `${(rate * 100).toFixed(1)}%`) + row('못 내면', '카드빚처럼 쌓임 · 여섯 달 = 빚 끝', 'red-t');
      acts = `<div class="btn sm" data-act="land" data-op="back">다시 생각</div>`;
    } else {
      const rent = SH.lotRent(st, V.id), building = o.kind && st.tick < o.doneTick, k = o.kind && SH.kindDef(o.kind);
      body = row('땅값', `${W(price)} <small class="${price >= o.paid ? 'green-t' : 'red-t'}">(산 값 ${price >= o.paid ? '+' : '−'}${W(price - o.paid)})</small>`)
        + row('위 건물', k ? `${esc(k.name)}${building ? ` · 짓는 중(${o.doneTick - st.tick}${SH.tickName(st)} 뒤)` : ''}` : (o.old ? '낡은 건물' : '빈 땅'))
        + row('세 · 달', W(rent)) + row('남은 빚', o.loan ? W(o.loan) : '없음', o.loan ? 'red-t' : '')
        + row('팔면 손에', `${SH.landSellValue(st, V.id) - o.loan >= 0 ? '' : '−'}${W(SH.landSellValue(st, V.id) - o.loan)}`, 'gold-t');
      if (!o.kind) {
        const bl = Math.round(V.bf * 10);
        body += `<div class="lsub">무엇을 지을까 <small>짓는 값 ${bl}할 빌림 · <span class="lnk" data-act="land" data-op="bf">${V.bf ? '안 빌림으로' : '5할 빌림으로'}</span></small></div>`
          + (LD.kinds || []).map(k => { const cost = k.cost * d.kan, cash = cost - Math.round(cost * V.bf / 100000) * 100000, ok = can && d.kan >= (k.min_kan || 1) && st.s.money >= cash;
            return `<div class="lopt ${ok ? '' : 'dis'}" ${ok ? `data-act="land" data-op="build" data-k="${k.id}"` : ''}><b>${esc(k.name)} · ${W(cost)}</b><span>${k.months}달 · 세 달 ${W(k.rent * d.kan)}${d.kan < (k.min_kan || 1) ? ` · ${k.min_kan}칸부터` : ` · 내 돈에서 ${W(cash)}`}</span></div>`; }).join('');
      }
      acts = `<div class="btn ${can ? '' : 'dis'}" data-act="land" data-op="sell">판다</div><div class="btn sm" data-act="land" data-op="close">갖고 있는다</div>`;
    }
    overlay(`<div class="box px landbox"><h2>${esc(d.name)} <small>넓이 ${d.kan}칸</small></h2>${body}${wait}<div class="acts">${acts}</div></div>`);
  }
  // 땅 목록(달 계획표의 '땅' 단추 · 과장부터는 지도 대신 계획표로 한 달을 보냄): 셋 중 하나를 누르면 같은 창
  function list() {
    const st = G.st, S = SH.landState(st);
    const rows = (SH.D.lands.first_lots || []).map(d => { const o = S.lots[d.lot], k = o && o.kind && SH.kindDef(o.kind);
      return `<div class="lopt" data-act="land" data-op="open" data-id="${d.lot}"><b>${esc(d.name)} · ${d.kan}칸 ${o ? '<span class="pink-t">내 땅</span>' : ''}</b><span>${o ? `${k ? esc(k.name) + (st.tick < o.doneTick ? ' 짓는 중' : '') : (o.old ? '낡은 건물' : '빈 땅')} · 세 달 ${W(SH.lotRent(st, d.lot))}${o.loan ? ` · 빚 ${W(o.loan)}` : ''}` : `지금 값 ${W(SH.landPrice(st, d.lot))}${d.old ? ' · 낡은 건물' : ' · 빈 땅'}`}</span></div>`; }).join('');
    const loan = SH.landLoan(st), R = S.recall;
    const rc = R ? `<div class="lrecall"><b>은행 회수 — ${W(R.need - R.paid)}를 ${Math.max(0, R.until - st.tick)}${SH.tickName(st)} 안에 갚기</b><span>못 갚으면 은행이 땅을 판 값의 7할로 가져가고, 남는 빚은 내 돈에서 빠진다.</span><div class="btn ${st.s.money >= 100000 ? '' : 'dis'}" data-act="land" data-op="repay">지금 갚기(내 돈 ${W(st.s.money)})</div></div>` : '';
    overlay(`<div class="box px landbox"><h2>땅 <small>땅값 지수 ${Math.round(SH.landIndex(st))} (1997 = 100)${loan ? ` · 빚 합 ${W(loan)} · 달 이자 ${(SH.landRate(st) * 100).toFixed(1)}%` : ''}</small></h2>${rc}${rows}<div class="acts"><div class="btn sm" data-act="land" data-op="close">닫기</div></div></div>`);
  }
  function act(el) {
    const st = G.st, op = el.dataset.op;
    if (op === 'list') return list();
    if (op === 'repay') { if (el.classList.contains('dis')) return; const r = SH.landRepay(st); sfx(r.ok ? 'coin' : 'deny'); toast([r.msg]); if (r.ok) persist(st); return list(); }
    if (op === 'open') { V.id = el.dataset.id; V.step = SH.landState(st).lots[V.id] ? 'mine' : 'buy'; return sheet(); }
    if (op === 'close') { V.id = null; overlay(''); if (G.P && G.P.t === 'lmeet') G.LOOP.meet(G.P); return; }      // 급매 장면에서 열었으면 그 장면으로 돌아감
    if (op === 'loan') { V.step = 'loan'; return sheet(); }
    if (op === 'back') { V.step = 'buy'; return sheet(); }
    if (op === 'bf') { V.bf = V.bf ? 0 : 0.5; return sheet(); }
    if (el.classList.contains('dis')) return;
    let r = null;
    if (op === 'buy') r = SH.landBuy(st, V.id, +el.dataset.f || 0);
    if (op === 'build') r = SH.landBuild(st, V.id, el.dataset.k, V.bf);
    if (op === 'sell') { if (!el.dataset.ok) { el.dataset.ok = 1; el.textContent = '정말 판다'; return; } r = SH.landSell(st, V.id); }
    if (!r) return;
    sfx(r.ok ? 'coin' : 'deny'); toast([r.msg]);
    if (r.ok) { persist(st); V.step = SH.landState(st).lots[V.id] ? 'mine' : 'buy'; overlay(''); if (G.redraw) G.redraw(); if (G.P && G.P.t === 'lmeet') G.LOOP.meet(G.P); }
  }
  // 땅이 열린 첫 달 한 번: 지도가 뜰 때
  function intro(st) {
    if (!st || !SH.landOpen(st) || SH.landState(st).intro || (typeof selfTesting !== 'undefined' && selfTesting)) return;
    SH.landState(st).intro = true; persist(st);
    overlay(`<div class="box px landbox"><h2>${esc(SH.D.ui_lines.LAND_INTRO[0])}</h2><p>${esc(SH.D.ui_lines.LAND_INTRO[1])}</p><p class="mute">${esc(SH.fillKeys(SH.D.ui_lines.LAND_INTRO[2], { tick: SH.tickName(st) }))}</p><div class="acts"><div class="btn" data-act="land" data-op="list">땅 보기</div><div class="btn sm" data-act="land" data-op="close">나중에</div></div></div>`);
  }
  // 지도 다시 칠할 때(내 땅 건물이 바뀌었나)
  const key = (st) => st && st.land ? Object.entries(st.land.lots).map(([id, o]) => `${id}:${o.kind || ''}:${o.kind && st.tick >= o.doneTick ? 1 : 0}`).join('|') : '';
  const open = (id) => { V.id = id; V.step = SH.landState(G.st).lots[id] ? 'mine' : 'buy'; sheet(); };
  return { draw, tap, sheet, act, intro, key, list, open };
})();
