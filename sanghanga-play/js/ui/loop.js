/* =====================================================================
   ui/loop.js — 돈 고리 화면(사원부터의 한 달 · 엔진 js/rules/loop.js)
   - 월초 지도(자유 시간 두 칸) · 만남 장면 틀 · 주식 본 화면(기본 멈춤 · 다음 주 ▶ · 이 달 끝까지 ▶▶) · 결산(까닭 세 줄 · 목표 셋)
   - 화면 전역을 늘리지 않게 G.LOOP 하나로 냄(tools/lint_globals.js) · 누르기는 data-lp="종류:값" → G.LOOP.act
   ===================================================================== */
(function () {
  const N = SH.LOOP_N, PN = N.proto, won = SH.loopWon, pct = SH.loopPct, num = (v) => Math.round(v).toLocaleString('ko-KR');
  const cls = (v) => v > 0.0001 ? 'lp-up' : v < -0.0001 ? 'lp-dn' : 'mute', sg = (v) => (v > 0 ? '+' : '') + won(v);
  const V = { sel: 0, credit: false, picks: [], tick: null, msg: '', warned: 0 };
  const screen = () => document.getElementById('screen');

  /* ── 지도(여의도 · 본 게임과 같은 그리기 · 걷지 않음 — 달 단위라 고르기만) ── */
  const BLD = () => SH.placeCol('bld');   /* 장소 → 지도 건물 번호 · 원본 = 04_시범/장소_카드.md '지도 건물' 칸 */
  const EDGE = () => SH.placeCol('edge');   /* 지도 밖 장소의 가장자리 표시 · 같은 표 '가장자리' 칸 */
  const region = () => w2R().yeouido, bld = (r, id) => r.blds.find(b => b.id === 'yeouido.' + id);
  const SIDE = () => document.documentElement.classList.contains('tight') ? 470 : 420, MW = () => (G.W || 1280) - SIDE(), MH = 660;
  let CAM = null;
  function cam(r) {
    if (CAM && CAM.w === MW()) return CAM;
    const ps = ['b01', 'b04', 'b06', 'b08', 'b09', 'b13', 'p01', 'b17'].map(id => M2.doorPt(r, bld(r, id))), xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    return (CAM = { w: MW(), c: [(x0 + x1) / 2, (y0 + y1) / 2 - 30], z: Math.min((MW() - 200) / (x1 - x0), (MH - 200) / (y1 - y0)) });
  }
  const w2sc = (C, p) => [(p[0] - C.c[0]) * C.z + MW() / 2, (p[1] - C.c[1]) * C.z + MH / 2];
  function paintMap() {
    const cv = document.getElementById('lpmap'); if (!cv) return; const r = region(), C = cam(r), g = cv.getContext('2d'), D = 2, z = C.z, off = [MW() / 2 - C.c[0] * z, MH / 2 - C.c[1] * z];
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = M2.R2.bg(); g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(z * D, 0, 0, z * D, off[0] * D, off[1] * D);
    M2.R2.drawGround(g, r, [-off[0] / z, -off[1] / z, (MW() - off[0]) / z, (MH - off[1]) / z]);
    M2.R2.drawScene(g, r, { extra: [], sigT: 3000 });
  }
  const placeOf = (o) => o.t === 'landdeal' ? 'market' : (o.t === 'makeup' || o.t === 'reunite') ? ((SH.LOOP_PPL.find(p => p.cid === o.who) || {}).place || 'han_river') : o.t === 'person' ? (o.card && ((SH.EV[o.card] || {}).when || {}).place) || (SH.LOOP_PPL.find(p => p.cid === o.who) || {}).place || 'hotel_bar'
    : o.t === 'client' ? 'client_office' : o.t === 'vote' ? 'banquet_hall' : o.t === 'trial' ? SH.LOOP_TRIAL[o.who].place : o.t === 'study' ? 'office_sales' : o.t === 'rest' ? 'han_river' : o.t === 'date' ? ((SH.EV[o.ev] || {}).when || {}).place || 'han_river' : o.place;
  const placeKo = (pid) => short((SH.PL[pid] || {}).name_ko || '');
  function optKo(st, o) {
    const L = st.L;
    if (o.t === 'person') { const r = st.rel[o.who], p = SH.LOOP_PPL.find(x => x.cid === o.who), e = o.eid && L.events.find(x => x.eid === o.eid);
      const s = [o.card ? '장면 있음' : '', e ? `얘기 있음 · ${SH.LOOP_KIND[e.kind].ko}` : '', !o.card && !e ? (r.st < 1 ? '처음 만남' : o.pity ? '먼저 찾아옴' : `얘기 없음 · 호감 ${r.aff}`) : ''].filter(Boolean).join(' · ');
      return { n: SH.name(o.who), s, d: `${SH.job(o.who) || ''} · ${placeKo(placeOf(o))}`, hot: !!(o.card || e), who: o.who, inside: p && p.kind === 'inside' && e }; }
    if (o.t === 'date') return { n: `약속 — ${SH.name(o.who)}`, s: (o.lover ? '이 달 안에 · ' : '') + `데이트 · ${SH.won(SH.R.date_cost)}`, d: o.lover ? `${SH.loopLoveKo(st)} · 놓치면 호감이 떨어지고 두 번이면 다툼` : placeKo(placeOf(o)) + (st.love && st.love.who !== o.who ? ` · ${SH.josa(SH.name(st.love.who), '이/가')} 알 수도 있음` : ''), hot: true, who: o.who };
    if (o.t === 'makeup') return { n: `달래기 — ${SH.name(o.who)}`, s: `다툼 중 · 성공률 ${Math.round(Math.max(SH.R.loop_makeup_min, Math.min(SH.R.loop_makeup_max, PN.love.makeup_base + PN.love.makeup_talk * st.s.talk)) * 100)}%`, d: '석 달을 넘기면 헤어짐', hot: true, who: o.who };
    if (o.t === 'reunite') return { n: `다시 찾아가기 — ${SH.name(o.who)}`, s: '한 번뿐인 길', d: '되면 다시 연인', hot: true, who: o.who };
    if (o.t === 'place') return { n: placeKo(o.place), s: '장면 있음', d: '누가 기다리고 있다', hot: true };
    if (o.t === 'client') { const has = SH.loopCan(st, 'client'); return { n: has ? '고객 돌보기' : '김만복 사장 찾아가기', s: (o.card ? '장면 있음 · ' : '') + (has ? (L.aumK >= N.client.cap ? '맡은 돈은 이미 가득 — 사이만 쌓임' : `맡은 돈 +${SH.loopWon(SH.loopAum(st) / L.aumK * N.client.care)}`) + (SH.loopDeleg(st) ? '' : ` · ${L.noCare}달째 못 봄`) : `말솜씨 +${SH.R.loop_client_talk}`), d: has ? (SH.loopDeleg(st) ? '부하가 안부를 챙김 — 안 가도 그 때문에 줄지는 않음' : `석 달 안 돌보면 달마다 ${SH.loopPc(N.client.decay)}%씩 줄어듦`) : '덕산정밀 서울사무소', hot: !!o.card, who: 'client' }; }
    if (o.t === 'trial') return { n: `${SH.name(o.who)} — ${SH.LOOP_TRIAL[o.who].ko}`, s: '이 달뿐 · 같이 넘기면 사이가 깊어짐', d: `안 가면 호감 −${-SH.R.loop_trial_miss_aff} · 석 달 뒤에 다시`, hot: true, who: o.who };
    if (o.t === 'vote') { const VT = N.proto.era.vote; return { n: `주주총회 — ${SH.loopName(o.id)}`, s: o.side === 'for' ? '경영진 편에 표' : '배당을 늘리라는 쪽에 표', d: o.side === 'for' ? `조용히 끝남 — 인맥 +${VT.net} · 스트레스 −${-SH.R.loop_vote_for_stress}` : `반반 — 이 달 첫 주에 결과: 통과하면 값 +${VT.up}% · 평판 +${VT.rep} / 안 되면 값 −${VT.down}%`, hot: true }; }
    if (o.t === 'landdeal') return { n: '급매 땅', s: `이 달만 ${Math.round((1 - ((SH.D.lands || {}).deal_mult || 1)) * 100)}% 쌈`, d: '보고 나서 안 사도 됨 · 사려면 내 돈이 있어야 함', hot: true };
    if (o.t === 'study') return { n: `공부 — ${SH.statKo(o.k)}`, s: `${SH.statKo(o.k)} +${SH.R.loop_study_gain}`, d: o.k === 'analysis' ? '소견이 맞을 확률이 오름' : o.k === 'network' ? '지도에 뜨는 사람 · 일이 늘어남' : '고객 달래기 · 돌보기' };
    return { n: '쉼 — 한강 둔치', s: `스트레스 −${N.stress.rest} · 체력 +${SH.R.loop_rest_hp}`, d: `스트레스 ${N.stress.fog}부터 소견이 흐려지고 ${N.stress.down}면 쓰러짐` };
  }
  function goalsHtml(g) { return g.map(x => `<div class="lp-goal">${esc(x.ko)} · <span class="${x.ok ? 'gold-t' : ''}">${esc(x.text)}</span><span class="lp-bar"><i style="width:${Math.round((x.p || 0) * 100)}%"></i></span></div>`).join(''); }
  function statLine(st) { return `<div class="lp-stat">분석 <b>${st.s.analysis}</b> <span class="mute">소견 적중 ${Math.round(SH.loopAcc(st) * 100)}%</span> · 인맥 <b>${st.s.network}</b> · 말솜씨 <b>${st.s.talk}</b>${SH.loopCan(st, 'client') ? ` <span class="mute">달래기 ${SH.loopCalm(st)}%</span>` : ''}</div>`; }

  function map(P) {
    const st = G.st, L = st.L, room = Math.max(0, 2 - (L.lost || 0));
    if (V.tick !== st.tick) { V.tick = st.tick; V.picks = []; V.msg = ''; V.warned = 0; }
    V.picks = V.picks.filter(i => L.pool[i]).slice(0, room);
    const sc = screen(), r = region(), C = cam(r); sc.className = 'k-loop lp-map'; G.redraw = () => map(P);
    const opts = L.pool.map((o, i) => { const k = optKo(st, o), on = V.picks.indexOf(i);
      return `<div class="lp-opt ${k.hot ? 'hot' : ''} ${on >= 0 ? 'on' : ''}" data-lp="pick:${i}"><span class="n">${on >= 0 ? on + 1 : '·'}</span><span class="t"><b>${esc(k.n)}</b> <span class="${k.hot ? 'gold-t' : 'mute'}">— ${esc(k.s)}</span>${k.inside ? ' <span class="pink-t">내부자</span>' : ''}<small>${esc(k.d)}</small></span></div>`; }).join('');
    const stack = {}, mks = L.pool.map((o, i) => { const pid = placeOf(o), k = optKo(st, o), on = V.picks.indexOf(i), b = BLD()[pid] && bld(r, BLD()[pid]); let p;
      const n = stack[pid] = (stack[pid] || 0) + 1;
      if (b) { p = w2sc(C, M2.doorPt(r, b)); p[1] -= 30 * C.z; p[0] += [0, 150, -150, 300][Math.min(3, n - 1)]; p[1] += n > 1 ? 26 : 0; }      /* 같은 건물에 둘이 뜨면 옆으로 벌림 */ else { const right = /▶$/.test(EDGE()[pid] || ''); stack[right ? '_r' : '_l'] = (stack[right ? '_r' : '_l'] || 0) + 1; p = right ? [MW() - 96, 150 + stack._r * 50] : [100, MH - 40 - stack._l * 50]; }
      return `<div class="lp-mk ${k.hot ? 'hot' : ''} ${on >= 0 ? 'on' : ''} ${b ? '' : 'edge'}" data-lp="pick:${i}" style="left:${Math.max(84, Math.min(MW() - 84, p[0]))}px;top:${Math.max(48, p[1])}px">${on >= 0 ? `<span class="n">${on + 1}</span>` : ''}<b>${esc(k.n)}</b><small>${b ? '' : esc(EDGE()[pid] || '') + ' · '}${esc(k.s)}</small></div>`; }).join('');
    const g = SH.loopGoals(st, null);
    sc.innerHTML = topBar(st) + `<canvas id="lpmap" width="${MW() * 2}" height="${MH * 2}" style="width:${MW()}px;height:${MH}px"></canvas><div class="lp-mks" style="width:${MW()}px">${mks}</div>
      <div class="lp-side"><h3>${esc(SH.dateLabel(st))} — 자유 시간 ${room === 2 ? '두' : room === 1 ? '한' : '0'} 칸</h3>
        <div class="lp-hint">${L.lost ? `<span class="pink-t">몸이 말을 안 듣는다 — ${Math.min(2, L.lost)}칸을 쉼에 뺏김.</span> ` : ''}사람은 <span class="gold-t">얘기 있음</span>일 때만 새 소문을 줍니다. 평소 근무는 저절로 합니다.</div>
        <div class="lp-opts">${opts}</div>
        ${statLine(st)}
        ${goalsHtml(g)}
        <div class="lp-btns"><div class="btn sm" data-act="shop">${ic16('shop', 20)} 상점</div>${SH.landOpen(st) ? `<div class="btn sm" data-act="land" data-op="list">${ic16('home', 20)} 땅</div>` : ''}${SH.canResign(st) ? `<div class="btn sm ${st.s.money >= SH.R.founder_min_money ? '' : 'dis'}" data-act="resign">사표 — 독립</div>` : ''}
          <span class="sp"></span><span class="mute">${V.picks.length}/${room}</span><div class="btn big" data-lp="go">장으로 ▶</div></div></div>`;
    paint(sc); paintMap(); [300, 900, 2000].forEach(t => setTimeout(paintMap, t));
    if (G.LAND) G.LAND.intro(st);
  }
  function pick(i) {
    const st = G.st, room = Math.max(0, 2 - (st.L.lost || 0)), at = V.picks.indexOf(i);
    if (at >= 0) V.picks.splice(at, 1); else if (V.picks.length >= room) { toast([room ? '자유 시간을 다 골랐어요 — 바꾸려면 고른 것을 한 번 더 눌러 빼세요' : '이 달은 고를 칸이 없어요']); return; } else V.picks.push(i);
    V.warned = 0; sfx('select'); map(G.P);
  }
  function go() {
    const st = G.st, room = Math.max(0, 2 - (st.L.lost || 0));
    if (V.picks.length < room && st.L.pool.length >= room && !V.warned) { V.warned = 1; toast([`자유 시간이 ${room - V.picks.length}칸 남았어요 — 그대로 보내려면 한 번 더 누르세요`]); return; }
    const picks = V.picks.slice(); V.picks = []; V.msg = ''; V.credit = false;
    answer({ picks }, `${SH.dateLabel(st)} — 지도에서 ${picks.length}칸을 보냄`);
  }

  /* ── 소문 한 장 ── */
  function rumorHtml(st, k, sel) {
    const L = st.L, K = SH.LOOP_KIND[k.kind], age = (SH.loopM(st) - k.got) * 4 + (L.b0 ? L.week : 0);
    const op = k.says == null ? '<span class="dim">내 소견: 아직 못 냄</span>' : `내 소견: <b class="${k.says ? 'gold-t' : 'pink-t'}">${k.says ? '숫자가 맞음' : '수상함'}</b> <span class="mute">(적중 ${Math.round(k.acc * 100)}%)</span>`;
    const stt = k.dumped != null ? '<span class="pink-t">✔ 진짜였음 → 큰손이 털고 나감</span>' : k.state === 'real' ? '<span class="green-t">✔ 진짜였음</span>' : k.state === 'fake' ? '<span class="pink-t">✘ 헛소문이었음</span>' : `<span class="mute">들은 지 ${age}주</span>`;
    return `<div class="lp-rum ${sel ? 'on' : ''} ${k.state ? 'done' : ''}" data-lp="sel:${k.id}"><div class="hd"><span class="tag">${K.ko}</span><b>${esc(SH.loopName(k.id))}</b><span class="mute">· ${esc(SH.name(k.who))}</span><span class="sp"></span>${stt}</div>
      <div>오른다 · <b>+${k.mag}% 안팎</b> · <b>${k.lo}~${k.hi}주 안</b>${k.kind === 'inside' ? ' <span class="pink-t">· 이걸로 사면 불법</span>' : ''}</div>
      <div><span class="mute">출처 믿음</span> <span class="st">${SH.loopStar(k.star)}</span> <span class="mute">${Math.round(k.star * 100)}%가 진짜</span></div><div>${op}</div></div>`;
  }

  /* ── 만남 장면(틀) ── 지도 위 겹침 창 */
  function meet(P) {
    const st = G.st, k = P.rumor && st.L.known.find(x => x.eid === P.rumor);
    sfx('select');
    overlay(`<div class="box px gold lp-meet"><div class="hd">${P.who && SH.CH[P.who] ? fc(P.who, 2) : ''}<div><h2>${esc(P.title)}</h2><small class="mute">${esc(placeKo(P.place))}</small></div></div>
      ${P.cg && SH.cgPath(P.cg) ? `<img class="lp-cg" src="${SH.cgPath(P.cg)}" alt="">` : ''}
      ${(P.lines || []).map(l => `<p class="say${l[0] === '(' ? ' in' : ''}">${esc(l)}</p>`).join('')}
      ${k ? `<p class="mute">소문 수첩에 적음</p>${rumorHtml(st, k)}` : ''}
      <p>${(P.gain || []).map(x => `<span class="lp-chip">${esc(x)}</span>`).join('')}</p>
      <div class="acts">${P.land && SH.landCanAct(st) ? '<div class="btn" data-act="land" data-op="list">땅 보러 가기</div>' : ''}<div class="btn big" data-next="1">${P.land ? '넘어간다' : '다음'} ▶</div></div></div>`);
  }

  /* ── 주식 본 화면 ── */
  function drawChart() {
    const cv = document.getElementById('lpchart'); if (!cv) return; const st = G.st, L = st.L, g = cv.getContext('2d'), W = cv.width, H = cv.height, id = V.sel, h = L.pxh[id].length ? L.pxh[id] : [L.px[id]], c = L.cost[id], o = L.ord[id] || {};
    const marks = [c, c && o.take ? c * (1 + o.take / 100) : null, c && o.stop ? c * (1 - o.stop / 100) : null].filter(Boolean);
    let lo = Math.min(...h, ...marks), hi = Math.max(...h, ...marks); const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
    const X = (i) => 84 + i * (W - 120) / 12, Y = (v) => H - 44 - (v - lo) / (hi - lo) * (H - 84);
    g.clearRect(0, 0, W, H); g.font = '22px Galmuri11, sans-serif'; g.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4; g.strokeStyle = '#1f2a55'; g.lineWidth = 2; g.beginPath(); g.moveTo(84, Y(v)); g.lineTo(W - 24, Y(v)); g.stroke(); g.fillStyle = '#6f7aa3'; g.textAlign = 'right'; g.fillText(num(v), 76, Y(v)); }
    const ln = (v, col, t) => { g.setLineDash([10, 8]); g.strokeStyle = col; g.beginPath(); g.moveTo(84, Y(v)); g.lineTo(W - 24, Y(v)); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.textAlign = 'left'; g.fillText(t, 92, Y(v) - 16); };
    if (c) ln(c, '#f2c14e', `산 값 ${num(c)}`); if (c && o.take) ln(c * (1 + o.take / 100), '#ff6b62', `+${o.take}% 팔기`); if (c && o.stop) ln(c * (1 - o.stop / 100), '#5c9bff', `−${o.stop}% 팔기`);
    const up = h[h.length - 1] >= h[0], col = up ? '#ff6b62' : '#5c9bff'; g.strokeStyle = col; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); h.forEach((v, i) => { const x = X(i + 13 - h.length); i ? g.lineTo(x, Y(v)) : g.moveTo(x, Y(v)); }); g.stroke();
    h.forEach((v, i) => { g.fillStyle = i === h.length - 1 ? '#fff' : col; g.beginPath(); g.arc(X(i + 13 - h.length), Y(v), i === h.length - 1 ? 8 : 4, 0, 7); g.fill(); });
    g.fillStyle = '#6f7aa3'; g.textAlign = 'center'; g.fillText('열두 주 전', X(0) + 40, H - 14); g.fillText('지금', X(12), H - 14);
    if (h.length >= 5) { const r4 = (h[h.length - 1] / h[h.length - 5] - 1) * 100, t = r4 >= PN.hot && st.s.analysis >= PN.hot_ana ? ['과열', '#ff86b0'] : r4 <= PN.cold && st.s.analysis >= PN.cold_ana ? ['바닥', '#62cc7e'] : null;
      if (t) { g.fillStyle = t[1]; g.textAlign = 'right'; g.fillText(`${t[0]} — 넉 주에 ${pct(r4, 0)}`, W - 30, 24); } }
  }
  function market(P) {
    const st = G.st, L = st.L; SH.loopOpen(st);
    const live = SH.loopLive(st); if (!live.includes(V.sel)) V.sel = live[0];
    const id = V.sel, px = L.px[id], held = L.pos[id] || 0, cost = L.cost[id], canC = SH.loopCan(st, 'credit'), room = SH.loopRoom(st, V.credit), o = L.ord[id] || {}, down = L.down;
    const wk = (i) => { const x = L.pxh[i]; return x.length > 1 ? (x[x.length - 1] / x[x.length - 2] - 1) * 100 : 0; };
    const rows = live.map(i => { const n = L.pos[i] || 0, r = wk(i), g = n ? (L.px[i] / L.cost[i] - 1) * 100 : 0, lr = SH.loopLiveRumor(st, i).length;
      return `<div class="lp-row ${i === id ? 'on' : ''} ${n ? 'held' : ''}" data-lp="sel:${i}"><span>${esc(SH.loopName(i))}${lr ? '<i class="dot"></i>' : ''}<small>${n ? `${num(n)}주 · <span class="${cls(g)}">${pct(g)}</span>` : esc(SH.loopStocks()[i].sec)}</small></span><span class="r">${num(L.px[i])}</span><span class="r ${cls(r)}">${pct(r)}</span></div>`; }).join('');
    const ins = SH.loopLiveRumor(st, id).some(k => k.kind === 'inside'), mr = SH.loopMargin(st);
    const F = [['¼', 0.25], ['½', 0.5], ['전부', 1]];
    const buyB = F.map(x => `<span class="btn sm ${room >= px && !down ? '' : 'dis'}" data-lp="buy:${x[1]}">${x[0]} <small>${won(room * x[1])}</small></span>`).join('');
    const sellB = F.map(x => `<span class="btn sm ${held && !down ? '' : 'dis'}" data-lp="sell:${x[1]}">${x[0]}</span>`).join('');
    const ordB = SH.loopCan(st, 'order') ? `<span class="k">걸어 두기</span><span>${held ? `<span class="mute">오르면</span> ${PN.take.map(t => `<span class="btn sm ${o.take === t ? 'on' : ''}" data-lp="take:${t}">+${t}%</span>`).join('')} <span class="mute">내리면</span> ${PN.stop.map(t => `<span class="btn sm ${o.stop === t ? 'on' : ''}" data-lp="stop:${t}">−${t}%</span>`).join('')} <span class="mute">산 지</span> ${PN.hold.map(t => `<span class="btn sm ${o.hold === t ? 'on' : ''}" data-lp="hold:${t}">${t}주</span>`).join('')}` : '<span class="dim">가진 종목에만 걸 수 있어요(산 값 기준 · 닿으면 전부 팖)</span>'}</span>` : `<span class="k dim">걸어 두기</span><span class="dim">${Math.max(1, PN.unlock.order - L.n)}달 뒤에 열림</span>`;
    const known = L.known.slice().reverse(), my = (SH.loopEquity(st) / L.b0.eq - 1) * 100, mkt = SH.loopMkt(st), cr = (L.b0.clK - 1) * 100, hasCl = SH.loopCan(st, 'client');
    const sc = screen(); sc.className = 'k-loop lp-mkt'; G.redraw = () => market(P);
    sc.innerHTML = topBar(st, { sub: `${SH.subLabel(st)} · ${Math.min(4, L.week + 1)}주` }) + `<div class="lp-grid">
      <div class="lp-col"><h3>종목 <small class="mute">값 · 지난주</small></h3>${rows}
        <div class="lp-hint">금빛 점 = 수첩에 살아 있는 소문이 있는 종목. 값은 한 주에 한 번 움직입니다 — 기본은 멈춤.</div></div>
      <div class="lp-col"><h3>${esc(SH.loopName(id))} <b>${num(px)}원</b> <small class="${cls(wk(id))}">지난주 ${pct(wk(id))}</small>${held ? `<small class="mute r">${num(held)}주 · 산 값 ${num(cost)} · <span class="${cls(px - cost)}">${sg((px - cost) * held)}</span></small>` : ''}</h3>
        <canvas id="lpchart" width="1072" height="460"></canvas>
        <div class="lp-ord"><span class="k">사기</span><span>${buyB}${canC ? `<span class="btn sm ${V.credit ? 'on' : ''}" data-lp="credit">신용 ${V.credit ? '켬' : '끔'}</span>` : SH.loopRank(st) && SH.loopRank(st).aum ? '<span class="lp-chip">신용 정지 중</span>' : ''}</span>
          <span class="k">팔기</span><span>${sellB}</span>${ordB}</div>
        ${canC && V.credit ? `<div class="lp-hint">신용: 내 몫의 두 배까지 삼 · 달 이자 ${N.margin_interest}% · 내 몫이 건 돈의 ${SH.loopPc(N.margin_call)}% 아래면 강제로 팔림${mr != null ? ` · 지금 내 몫 <b class="${mr < 0.4 ? 'pink-t' : ''}">${Math.round(mr * 100)}%</b>` : ''}</div>` : ''}
        ${SH.loopClientNote(st, id) || SH.loopOwnLeft(st, id) != null ? `<div class="lp-hint">${[SH.loopClientNote(st, id), SH.loopOwnLeft(st, id) != null ? (SH.loopOwnLeft(st, id) > 0 ? `5% 공시까지 ${num(SH.loopOwnLeft(st, id))}주` : '5% 넘게 들고 있음(공시됨) — 5% 아래로 팔면 값이 먼저 빠짐') : ''].filter(Boolean).join(' · ')}</div>` : ''}
        ${ins ? '<div class="lp-warn">내부자 얘기가 걸린 종목 — 사면 불법. 이 달 감사에 걸릴 확률 20% · 걸리면 재산 4할 추징과 좌천 · 두 번이면 퇴출.</div>' : ''}
        <div class="lp-fill">${V.msg || (down ? '쓰러져서 이 달은 장을 못 봅니다 — [이 달 끝까지]를 누르세요.' : '종목을 고르고 사거나 팔면 여기에 체결 결과가 나옵니다. 할 게 없으면 [이 달 끝까지 ▶▶].')}</div></div>
      <div class="lp-col lp-right"><h3>소문 수첩 <small class="mute">${known.filter(k => !k.state).length}건 살아 있음</small></h3>
        <div class="lp-scroll a">${known.length ? known.map(k => rumorHtml(st, k, k.id === id)).join('') : '<div class="dim">아직 들은 얘기가 없어요. 월초 지도에서 「얘기 있음」이 붙은 사람을 만나면 여기에 적힙니다.</div>'}</div>
        <h3>신문 · 이 달에 있었던 일 <small class="mute">신문은 한 주 늦음</small></h3>
        <div class="lp-scroll b">${L.mon.news.slice().reverse().map(n => `<div class="lp-news ${n.k}">${esc(n.s)}</div>`).join('') + L.mon.lines.slice().reverse().map(l => `<div class="lp-news me">▸ ${esc(l)}</div>`).join('') || '<div class="dim">아직 조용함</div>'}</div></div>
      <div class="lp-foot"><span class="pips">${[0, 1, 2, 3].map(i => `<i class="${i < L.week ? 'f' : ''}"></i>`).join('')}<span class="mute">${L.week}/4주</span></span>
        <span>재산 <b class="gold-t">${won(SH.loopWorth(st))}</b> · 주식 <b>${won(SH.loopStockV(st))}</b>${L.debt > 0 ? ` · 빚 <b class="pink-t">${won(L.debt)}</b>` : ''}${hasCl ? ` · 맡은 돈 <b>${won(SH.loopAum(st))}</b>` : ''}</span>
        <span>이 달 — 나 <b class="${cls(my)}">${pct(my)}</b> · 시장 <b class="${cls(mkt)}">${pct(mkt)}</b>${hasCl ? ` · 고객 돈 <b class="${cls(cr)}">${pct(cr)}</b>` : ''}</span>
        <span class="sp"></span><div class="btn ${L.week >= 4 ? 'dis' : ''}" data-lp="week">다음 주 ▶</div><div class="btn big" data-lp="month">${L.week >= 4 ? '결산 보기 ▶' : '이 달 끝까지 ▶▶'}</div></div></div>`;
    paint(sc); drawChart();
  }
  function done(r) { V.msg = (r.ok ? '' : '✕ ') + esc(r.msg); if (r.ok) SH.loopLog(G.st, r.msg); sfx(r.ok ? 'coin' : 'deny'); persist(G.st); market(G.P); }
  function week() {
    const st = G.st, L = st.L, px0 = L.px.slice(), pos0 = Object.assign({}, L.pos), W = SH.loopWeek(st); if (!W) return;
    const ids = Object.keys(pos0), dv = ids.reduce((t, i) => t + pos0[i] * (L.px[i] - px0[i]), 0), top = ids.sort((a, b) => Math.abs(pos0[b] * (L.px[b] - px0[b])) - Math.abs(pos0[a] * (L.px[a] - px0[a])))[0];
    V.msg = (ids.length ? `${L.week}주가 지남 — 가진 주식 <span class="${cls(dv)}">${sg(dv)}</span>(${esc(SH.loopName(top))} ${pct((L.px[top] / px0[top] - 1) * 100)})` : `${L.week}주가 지남 — 가진 주식 없음`)
      + (W.lines.length ? '<br>' + W.lines.map(l => esc(l.s)).join('<br>') : '') + (L.week >= 4 ? '<br><span class="gold-t">이 달 장이 끝났습니다 — [결산 보기 ▶]</span>' : '');
    sfx(W.forced ? 'crash' : dv > 0 ? 'coin' : 'select'); persist(st); market(G.P);
    if (W.forced) overlay(`<div class="box px warn"><h2>강제 매도</h2><p>${esc(SH.D.loop_scenes.LEDGER.forced_say)}</p><p>${esc(W.lines.filter(l => l.s.startsWith(SH.D.loop_scenes.LEDGER.forced.split('{')[0])).map(l => l.s).join(' '))}</p><p class="mute">빚으로 산 주식은 값이 빠지면 내 몫부터 녹습니다. 내 몫이 건 돈의 ${SH.loopHal(N.margin_call)}할 아래가 되면 증권사가 전부 팝니다.</p><div class="acts"><div class="btn big" data-act="ovl-close">계속 ▶</div></div></div>`, 'warn');
  }
  function month() {
    const st = G.st, L = st.L; let forced = false;
    while (L.week < 4) { const W = SH.loopWeek(st); if (W && W.forced) forced = true; }
    if (forced) toast(['이 달에 강제 매도가 있었습니다 — 결산에서 확인하세요']);
    answer({}, `${SH.dateLabel(st)} 장을 마침`);
  }

  /* ── 결산 ── */
  function settle(P) {
    const st = G.st, r = P.rep, d = r.w1 - r.w0, sc = screen(); sc.className = 'k-loop lp-settle'; G.redraw = () => settle(P);
    sc.innerHTML = `<div class="lp-sheet px gold"><h2>${esc(r.ko)} 결산</h2>
      <div class="lp-sum">재산 ${won(r.w0)} → <b class="${cls(d)} big">${won(r.w1)}</b> <span class="${cls(d)}">(${sg(d)})</span> · 나 <span class="${cls(r.myRet)}">${pct(r.myRet)}</span> · 시장 <span class="${cls(r.mkt)}">${pct(r.mkt)}</span>${r.cr != null ? ` · 고객 돈 <span class="${cls(r.cr)}">${pct(r.cr)}</span>` : ''} · 스트레스 ${Math.round(r.stress[0])} → ${Math.round(r.stress[1])}</div>
      <div class="lp-two"><div><div class="gold-t">돈이 들고 난 곳</div><table class="lp-tbl">${r.rows.map(x => `<tr><td>${esc(x[0])}</td><td class="${cls(x[1])}">${sg(x[1])}</td></tr>`).join('')}${r.repay ? `<tr><td class="mute">남은 현금으로 신용 빚 갚음</td><td class="mute">${won(r.repay)}</td></tr>` : ''}</table>
          <div class="gold-t" style="margin-top:12px">목표까지</div>${goalsHtml(r.goals)}${(r.gets || []).map(x => `<div class="lp-chip">${esc(x)}</div>`).join('')}</div>
        <div><div class="gold-t">왜 이렇게 됐나</div>${r.why.map(w => `<div class="lp-why ${w.k}">${esc(w.s)}</div>`).join('')}
          ${r.scenes.map(e => `<div class="lp-ev ${e.k}"><b>${esc(e.title)}</b>${esc(e.s)}${e.unlock ? `<ul>${e.unlock.map(u => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}</div>`).join('')}
          ${(r.lines || []).length ? `<div class="lp-lines mute">${r.lines.map(l => '▸ ' + esc(l)).join('<br>')}</div>` : ''}</div></div>
      <div class="acts"><div class="btn big" data-next="1">다음 달 ▶</div></div></div>`;
    paint(sc); if (!G.instant) setTimeout(() => sfx(d >= 0 ? 'success' : 'fail'), 200);
  }

  function act(el) {
    const st = G.st, L = st.L, [a, v] = el.dataset.lp.split(':'), id = V.sel;
    if (a === 'pick') return pick(+v);
    if (a === 'go') return go();
    if (a === 'sel') { V.sel = +v; if (G.P && G.P.t === 'lmarket' && !document.querySelector('#ovl .ovl')) market(G.P); return; }
    if (a === 'credit') { V.credit = !V.credit; return market(G.P); }
    if (a === 'buy') return done(SH.loopBuy(st, id, SH.loopRoom(st, V.credit) * +v, V.credit));
    if (a === 'sell') return done(SH.loopSell(st, id, +v));
    if (a === 'take' || a === 'stop' || a === 'hold') { const cur = (L.ord[id] || {})[a]; SH.loopOrder(st, id, { [a]: cur === +v ? 0 : +v }); V.msg = cur === +v ? '걸어 둔 주문을 풂' : a === 'hold' ? `${esc(SH.loopName(id))} — 산 지 ${v}주가 지나면 전부 팔기로 걸어 둠(지금 ${SH.loopHeldWeeks(st, id)}주째)` : `${esc(SH.loopName(id))} — 산 값보다 ${a === 'take' ? '+' : '−'}${v}%에 닿으면 전부 팔기로 걸어 둠`; persist(st); return market(G.P); }
    if (a === 'week') return week();
    if (a === 'month') return month();
  }
  /* 사진 · 누르기 시험용 손: 지도에선 얘기 · 장면 먼저 두 칸 */
  function autoPicks(st) { const p = st.L.pool, room = Math.max(0, 2 - (st.L.lost || 0)), hot = p.map((o, i) => i).filter(i => p[i].eid || p[i].card || p[i].t === 'date' || p[i].t === 'place' || p[i].t === 'makeup'); return hot.concat(p.map((o, i) => i).filter(i => !hot.includes(i))).slice(0, room); }
  G.LOOP = { map, meet, market, settle, act, autoPicks };
})();
