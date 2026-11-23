/* =====================================================================
   ui/loop.js — 돈 고리 화면(사원부터의 한 달 · 엔진 js/rules/loop.js)
   - 사원 뒤 지도(11-15 기획 '지도 중심'): 인턴과 같은 걷는 지도(ui/world.js worldScreen)에 이 파일이 얹는 것 — 표시(pins) · 문 앞 혼잣말(mono) · 장소 안(inside) · 오른쪽 칸(side) · 주간 소식 띠(news)
     한 주 = 지도에서 하나를 함(자유 시간 한 칸 · 답 go) · 이번 주 마침(end) · 이 달 끝까지(skip) — 장 화면은 물음 없이 지도에서 열고 닫음
   - 만남 장면 틀 · 주식 본 화면 · 결산(까닭 세 줄 · 목표 셋)
   - 화면 전역을 늘리지 않게 G.LOOP 하나로 냄(tools/lint_globals.js) · 누르기는 data-lp="종류:값" → G.LOOP.act
   ===================================================================== */
(function () {
  const N = SH.LOOP_N, PN = N.proto, won = SH.loopWon, pct = SH.loopPct, num = (v) => Math.round(v).toLocaleString('ko-KR');
  const cls = (v) => v > 0.0001 ? 'lp-up' : v < -0.0001 ? 'lp-dn' : 'mute', sg = (v) => (v > 0 ? '+' : '') + won(v);
  const V = { goOpen: false, sel: 0, credit: false, side: 'buy', qty: 0, msg: '', warn: '', month: null, seen: {}, newsKey: null, band: false };
  const screen = () => document.getElementById('screen');
  const UL = () => SH.D.ui_lines.LOOP_MAP;   /* 이 화면의 문장 — 원본 04_시범/대사/화면_글.json 의 LOOP_MAP */
  const OFFICE = 'office_sales', NEAR = 300;   /* 증권사 내 자리(공부하는 곳) · 얘기 없는 사람 · 급매 딱지가 보이는 거리(화면 px — 문 · 필지 가운데에서) */

  /* ── 지도에 뜨는 것 ── 장소는 placeOf · 이름과 짧은 칩은 optKo(긴 설명 글은 두지 않음 — 11-15 '화면 글 원칙') */
  const placeOf = (o) => o.t === 'landdeal' ? 'market' : (o.t === 'makeup' || o.t === 'reunite') ? ((SH.LOOP_PPL.find(p => p.cid === o.who) || {}).place || 'han_river') : o.t === 'person' ? (o.card && ((SH.EV[o.card] || {}).when || {}).place) || (SH.LOOP_PPL.find(p => p.cid === o.who) || {}).place || 'hotel_bar'
    : o.t === 'client' ? 'client_office' : o.t === 'vote' ? 'banquet_hall' : o.t === 'trial' ? SH.LOOP_TRIAL[o.who].place : o.t === 'study' ? SH.R.loop_study_place.study : o.t === 'act' ? o.place : o.t === 'rest' ? SH.loopRestPlace(G.st) : o.t === 'date' ? ((SH.EV[o.ev] || {}).when || {}).place || 'han_river' : o.place;
  /* 가 볼 만한 곳 줄의 행동력 값(11-18 대표님 '각 선택지 옆에 행동력') — 그곳 일들의 값 · 다르면 '10~30' */
  const apOf = (its) => { const c = [...new Set(its.map(SH.loopApCost))].sort((a, b) => a - b); return c.length ? `<i class="ap">${c.length > 1 ? c[0] + '~' + c[c.length - 1] : c[0]}</i>` : ''; };
  const placeKo = (pid) => short((SH.PL[pid] || {}).name_ko || '');
  const MUST = { date: 1, makeup: 1, reunite: 1, trial: 1, vote: 1, place: 1 };
  const must = (o) => !!(MUST[o.t] || (o.t === 'person' && (o.card || o.pity)));      /* 꼭 챙길 것 = 금색 테두리 */
  const talk = (o) => o.t === 'person' && !!o.eid;      /* 얘기 있는 사람 = 말풍선 딱지 */
  const whoOf = (o) => o.who && SH.CH[o.who] ? o.who : null;
  function optKo(st, o) {
    const L = st.L;
    if (o.t === 'person') { const r = st.rel[o.who], e = o.eid && L.events.find(x => x.eid === o.eid); return { n: SH.name(o.who), s: o.card ? '장면' : e ? SH.LOOP_KIND[e.kind].ko : r.st < 1 ? '처음' : '' }; }
    if (o.t === 'date') return { n: `약속 — ${SH.name(o.who)}`, s: SH.won(SH.R.date_cost) };
    if (o.t === 'makeup') return { n: `달래기 — ${SH.name(o.who)}`, s: Math.round(Math.max(SH.R.loop_makeup_min, Math.min(SH.R.loop_makeup_max, PN.love.makeup_base + PN.love.makeup_talk * st.s.talk)) * 100) + '%' };
    if (o.t === 'reunite') return { n: `다시 찾아가기 — ${SH.name(o.who)}`, s: '' };
    if (o.t === 'place') return { n: placeKo(o.place), s: '장면' };
    if (o.t === 'client') return { n: SH.loopCan(st, 'client') ? '고객 돌보기' : '김만복 사장 찾아가기', s: o.card ? '장면' : '' };
    if (o.t === 'trial') return { n: `${SH.name(o.who)} — ${SH.LOOP_TRIAL[o.who].ko}`, s: '' };
    if (o.t === 'vote') return { n: `주주총회 — ${SH.loopName(o.id)}`, s: o.side === 'for' ? '경영진 편' : '배당 쪽' };
    if (o.t === 'landdeal') return { n: '급매 땅', s: `−${Math.round((1 - ((SH.D.lands || {}).deal_mult || 1)) * 100)}%` };
    if (o.t === 'act') return { n: (SH.AC[o.a] || {}).name_ko || o.a, s: '' };
    if (o.t === 'study') return { n: `공부 — ${SH.statKo(o.k)}`, s: `+${SH.R.loop_study_gain}` };
    return { n: '쉼', s: `${SH.statKo('stress')} −${N.stress.rest}` };
  }
  function goalsHtml(g) { return g.map(x => `<div class="lp-goal">${esc(x.ko)} · <span class="${x.ok ? 'gold-t' : ''}">${esc(x.text)}</span><span class="lp-bar"><i style="width:${Math.round((x.p || 0) * 100)}%"></i></span></div>`).join(''); }
  const dateKo = (st) => SH.dateLabel(st);      /* 11-17 턴제: 한 달 = 한 턴(주 표시 없음) */
  const wkOf = (st) => st.tick * 4 + st.L.week;
  const seen = (st) => (V.seen.k === wkOf(st) ? V.seen : (V.seen = { k: wkOf(st) }));      /* 가까이 가서 본 것(그 주 동안 유지) */
  const shopAt = (st, pid) => SH.shopsOpen(st).some(s => s.id === pid);
  function byPlace(st) { const m = {}; st.L.pool.forEach((o, i) => { if (o.t === 'landdeal') return; const p = placeOf(o); (m[p] = m[p] || []).push(i); }); return m; }
  const wk = (L, i) => { const x = L.pxh[i]; return x.length > 1 ? (x[x.length - 1] / x[x.length - 2] - 1) * 100 : 0; };      /* 지난주 오르내림 % */
  const arrow = (v) => `${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}%`;

  /* ── 지도 화면(물음 lmap) = 인턴과 같은 worldScreen — 달 첫 주는 회사 앞, 그 뒤로는 서 있던 자리에서 이어 감 ── */
  function map(P) { worldScreen(P, {}, () => false); coach(G.st); }
  /* 첫 지도 손가락 안내(11-18 졸업 흐름 목업) — 사원 첫 달 한 번 · 넷을 차례로 짚음(건너뛰기 없음 · 11-18 대표님) · 글은 화면_글.json COACH */
  function coach(st, i) {
    if (i == null) { if (selfTesting || /[?&](shot|selftest|clicktest|savetest)=/.test(location.search) || !st.L || st.L.n !== 0 || st.L.told.coach) return; const P0 = G.P; return setTimeout(() => { if (G.st === st && G.P === P0 && !document.querySelector('#ovl .ovl') && SH.loopFirst(st, 'coach')) coach(st, 0); }, 500); }   /* 늦게 뜰 때 화면이 바뀌었거나 다른 창이 떠 있으면 안 띄움(구조 검토 지적 1) */
    const C = SH.D.ui_lines.COACH, s = C.steps[i]; if (!s) { if (document.querySelector('#ovl .ovl.coachw')) overlay(''); return; }   /* 안내 창일 때만 닫음 */
    const sg = document.getElementById('stage').getBoundingClientRect(), k = sg.width / 1280, rot = isRot();
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - sg.left) / k, y: (r.top - sg.top) / k, w: r.width / k, h: r.height / k }; };
    const inside = (b) => b.w >= 40 && b.h >= 18 && b.x >= 0 && b.y >= 0 && b.x + b.w <= 1280 && b.y + b.h <= 720;
    const sel = { ap: '.lms .card.lite', map: '#pins .pin:not(.hid) .plate', mkt: '.lms .card.wk', skip: '.lms .ends .btn' }[s[0]];
    const r = rot ? null : [...document.querySelectorAll(sel)].map(box).find(inside);
    const pos = !r ? 'left:50%;transform:translateX(-50%)' : r.x > 640 ? `right:${Math.round(1280 - r.x + 18)}px` : `left:${Math.round(r.x + r.w + 18)}px`, by = !r ? 300 : Math.max(16, Math.min(720 - 130, r.y + r.h / 2 - 44));
    const hx = r && r.x - 4, hy = r && r.y - 4, hw = r && r.w + 8, hh = r && r.h + 8;
    const dim = (x, y, w, h) => `<div class="cdim" style="left:${x}px;top:${y}px;width:${Math.max(0, w)}px;height:${Math.max(0, h)}px"></div>`;   /* 구멍 둘레를 네모 넷으로 덮음 */
    overlay(`${r ? dim(0, 0, 1280, hy) + dim(0, hy + hh, 1280, 720 - hy - hh) + dim(0, hy, hx, hh) + dim(hx + hw, hy, 1280 - hx - hw, hh) : dim(0, 0, 1280, 720)}${r ? `<div class="chole" style="left:${hx}px;top:${hy}px;width:${hw}px;height:${hh}px"></div>` : ''}<div class="cbox px gold" style="${pos};top:${by}px"><div class="ct"><span class="n">${i + 1}</span><b>${esc(s[1])}</b></div><p>${esc(s[2])}</p><div class="cbt"><div class="btn">${esc(i === C.steps.length - 1 ? C.done : C.next)}</div></div></div>`, 'coachw');
    const o = document.querySelector('#ovl .ovl'); if (o) o.addEventListener('click', (e) => { e.stopPropagation(); coach(st, i + 1); }, { once: true });
  }
  function keep(st) { const k = !!G.world && V.month === st.tick; V.month = st.tick; return k; }

  /* 표시: pool 것이 있는 건물에 이름표(금색 = 꼭 챙길 것 · 말풍선 = 얘기 있음 · 분홍 편지 = 약속) · 얘기 없는 사람뿐이면 '?'(가까이 가면 얼굴)
     내 땅 · 내 건물은 필지 위 금색 이름표 · 급매는 살 수 있는 필지에 '?'(가까이 가면 딱지) · 이 주에 할 것이 있는 곳은 모두 왼쪽 아래 목록(248) */
  function pins(z) {
    const st = G.st, L = st.L, pool = L.pool, bp = byPlace(st), S = seen(st), el = document.getElementById('pins'), go = document.getElementById('zgo'); if (!el) return;
    const out = []; z.pins = [];
    z.r.blds.forEach((b, i) => {
      const ps = (b.places || []).filter(p => SH.PL[p]); if (!ps.length) return;
      const pid = ps.find(p => bp[p]) || ps.find(p => p === OFFICE) || ps[0], its = (bp[pid] || []).map(k => pool[k]);
      if (its.length) {      /* 223(11-17): 영업부는 할 것이 있을 때만(전: 늘 핀 — 안에서 '장 보기'를 열었음) */
        const hot = its.some(must), tk = its.some(talk), hid = !!its.length && !hot && !tk && its.every(o => o.t === 'person') && !S[pid];
        const lead = its.find(must) || its.find(talk) || (S[pid] && its.find(whoOf)), ppl = [...new Set(its.filter(o => whoOf(o) && (must(o) || talk(o) || S[pid])).map(whoOf))];
        const si = its.some(o => o.t === 'date') ? '<span class="si date">✉</span>' : tk ? '<span class="si talk">…</span>' : '';
        z.pins.push({ i, b, k: hot || tk ? 'go' : 'mk', hot, hid, key: pid });
        out.push(hid ? `<div class="pin mk hid" data-walk="${pid}" data-b="${i}"><div class="plate">?</div></div>`
          : `<div class="pin mk${hot ? ' hot' : ''}" data-walk="${pid}" data-b="${i}">${ppl.length ? `<div class="who">${ppl.slice(0, 3).map(c => fc(c, 1)).join('')}</div>` : ''}<div class="plate">${si}${esc(lead && whoOf(lead) ? SH.name(lead.who) : placeKo(pid))}</div></div>`);
        return; }
      const open = ps.find(p => SH.isOpen(st, p)), lk = !open && ps.find(p => LOCK_TXT()[p]);      /* 그 밖의 곳: 인턴처럼 마우스를 올리면 이름(누르면 걸어감) */
      if (open) { z.pins.push({ i, b, k: 'off' }); out.push(`<div class="pin mini off" data-walk="${open}" data-b="${i}"><div class="plate">${esc(placeKo(open))}</div></div>`); }
      else if (lk) { z.pins.push({ i, b, k: 'lock' }); out.push(`<div class="pin mini lock" data-walk="${lk}" data-b="${i}"><div class="plate">${ic('lock')} ${esc(placeKo(lk))}</div></div>`); }
    });
    const own = (st.land && st.land.lots) || {}, di = pool.findIndex(o => o.t === 'landdeal'), buy = di >= 0 ? ((SH.D.lands || {}).first_lots || []).filter(d => !own[d.lot]).map(d => d.lot) : [];
    (z.r.lots || []).filter(l => SH.lotDef(l.id)).forEach(l => { const o = own[l.id], key = 'L' + l.id;
      if (o) { z.pins.push({ i: key, b: l, k: 'mk', lot: 1 }); out.push(`<div class="pin mk mine" data-lp="lot:${l.id}" data-b="${key}"><div class="plate"><span class="si flag">▲</span>${o.kind && st.tick >= o.doneTick ? '내 건물' : '내 땅'}</div></div>`); }
      else if (buy.includes(l.id)) { z.pins.push({ i: key, b: l, k: 'mk', lot: 1, hid: !S[key], key });
        out.push(S[key] ? `<div class="pin mk hot deal" data-lp="go:${di}" data-b="${key}"><div class="plate">${esc(optKo(st, pool[di]).n)}</div></div>` : `<div class="pin mk hid" data-lp="lotgo:${l.id}" data-b="${key}"><div class="plate">?</div></div>`); } });
    el.innerHTML = out.join(''); paint(el);
    /* 왼쪽 목록(248 · 11-17 대표님 '사원 이후에도 인턴 때처럼 누가 어디에 있는지 — 가 볼 만한 곳'): 이 주에 할 것이 있는 곳을 다 — 지역마다 묶어 · 약속 → 꼭 챙길 것 → 아는 사람 순
       줄 꼴은 인턴 목록과 같음(아는 사람 얼굴 · 못 만난 사람은 ? · 사람이 없으면 '장소') · 지도에 건물이 없는 곳(호텔 바 · 일식집)은 '그 밖' */
    const at = {}; pool.forEach(o => { if (o.t === 'landdeal') return; const pid = placeOf(o); (at[pid] = at[pid] || []).push(o); });
    const met = (c) => st.rel[c] && st.rel[c].st >= 1, rank = (pid) => at[pid].some(o => o.t === 'date') ? 3 : at[pid].some(must) ? 2 : at[pid].some(o => whoOf(o) && met(o.who)) ? 1 : 0;
    const grp = Object.keys(M2.REGIONS).map(id => [M2.REGIONS[id].ko, id]).concat([[UL().elsewhere, '']]).map(([ko, id]) => [ko, Object.keys(at).filter(pid => { const t = bldOf(pid); return id ? t && t.r.id === id : !t; }).sort((x, y) => rank(y) - rank(x))]).filter(g => g[1].length);
    const nGo = grp.reduce((t, g) => t + g[1].length, 0), head = `<div class="h fold" data-lp="gofold"><span>${esc(UL().go_h)}</span><span class="far">${esc(SH.fillKeys(UL().go_fold, { n: nGo }))} ${V.goOpen ? '▾' : '▴'}</span></div>`;      /* 접어 두고 펼치면 얼굴 · 이름만(11-17 대표님 목업 '가 + 접는 목록') */
    if (go) { go.className = grp.length ? 'zgo px lz' + (V.goOpen ? '' : ' shut') : ''; go.innerHTML = !grp.length ? '' : !V.goOpen ? head : head + grp.map(([ko, ids]) => `<div class="rg">${esc(ko)}</div>${ids.map(pid => { const its = at[pid], ppl = [...new Set(its.map(whoOf).filter(c => c && met(c)))], unk = its.some(o => whoOf(o) && !met(o.who));
      return `<div class="btn sm" data-walk="${pid}">${ppl.slice(0, 2).map(c => fc(c, 0.75)).join('')}${unk && ppl.length < 2 ? `<span class="pbox who">${ic('who', 2)}</span>` : ppl.length ? '' : `<span class="pbox">${its.some(must) ? ic('star') : esc(UL().go_place)}</span>`}<span class="nm">${esc(placeKo(pid))}</span>${apOf(its)}${its.some(o => o.t === 'date') ? `<i class="nw dt">${esc(UL().go_date)}</i>` : ''}</div>`; }).join('')}`).join(''); paint(go); }
    const a = document.getElementById('zarea'); if (a) a.textContent = z.r.ko;
  }
  /* 가까이 가면 보임(w2PinPos 가 그릴 때마다 부름 · 필지로 걸어간 뒤에도) — 바뀐 것이 있을 때만 이름표를 다시 만듦 */
  function near(z) {
    if (!z || !z.loop) return; const S = seen(G.st); let ch = 0;
    (z.pins || []).forEach(p => { if (!p.hid || S[p.key]) return; const b = p.b, d = p.lot ? M2.toScreen(z.r, b.x + b.w / 2, b.y + b.h / 2) : M2.doorPt(z.r, b);
      if (Math.hypot(d[0] - z.pos[0], d[1] - z.pos[1]) * (z.zoom || 1) < NEAR) { S[p.key] = 1; ch = 1; } });
    if (ch) pins(z);
  }
  function walkLot(id) { const z = G.world, l = z && (z.r.lots || []).find(x => x.id === id); if (!l) return; const P = M2.pathTo(z.r, z.pos, M2.toScreen(z.r, l.x + l.w / 2, l.y + l.h / 2)); if (!P) return; w2Go(z, P, () => { zoneHeroDraw(-1); near(z); }); }

  /* 문 앞 혼잣말(인턴의 monoOpen 과 같은 틀) — 약속 자리면 들어가는 것이 곧 약속 */
  function mono(pid) {
    G.walkT = null; const st = G.st, L = st.L, m = document.getElementById('mono'); if (!m || !SH.PL[pid]) return;
    const nm = placeKo(pid), its = byPlace(st)[pid] || [], D = SH.D.map_lines.DOOR, dt = its.find(i => L.pool[i].t === 'date'), no = '<div class="btn" data-act="mono-close">아니, 나간다</div>';
    let line, btns = '<div class="btn" data-act="mono-close">돌아선다</div>';
    /* 이번 주 것이 걸린 곳은 아직 안 열린 장소라도 들어감(약속 자리 · 일식집의 오 상무 — 옛 목록 지도는 열림을 안 봤음 · 11-15 검토 2) */
    if (!SH.isOpen(st, pid) && !its.length) line = SH.fillKeys(D.locked, { place: nm, when: LOCK_TXT()[pid] || D.locked_when });
    else if (dt != null && SH.loopSlots(st) >= 1) { line = SH.fillKeys(D.date, { place: nm, who: SH.name(L.pool[dt].who) }); btns = `<div class="btn big" data-lp="go:${dt}"><span>약속에 간다</span></div>${no}`; }
    else if (its.length || shopAt(st, pid)) { line = SH.fillKeys(D.ask, { place: nm }); btns = `<div class="btn big" data-lp="in:${pid}"><span>들어간다</span></div>${no}`; }
    else line = SH.fillKeys(D.nothing, { place: nm });
    m.innerHTML = `<div class="box px">${fc('hero', 2)}<div class="say"><b>나</b><p>${esc(line)}</p></div><div class="acts">${btns}</div></div>`;
    paint(m);
  }
  /* 장소 안(인턴의 insideScreen 과 같은 틀 · 배경 · 고르기 단추) — 그 장소의 이번 주 것 + 가게(칸 안 씀) + 그냥 나간다 — 주식 시세는 옆 칸 단추 하나로만(223) */
  function inside(pid) {
    const st = G.st, L = st.L, p = SH.PL[pid], bg = BG_OF()[pid] || 'office', dark = ['bar', 'hotel'].includes(bg), its = byPlace(st)[pid] || [], can = (o) => L.week === 0 && L.ap >= SH.loopApCost(o);
    G.redraw = () => inside(pid);
    const who = its.map(i => whoOf(L.pool[i])).find(Boolean), D = SH.D.map_lines.DOOR;
    const line = ((PLACE_LINE()[pid] || '') + (who ? SH.fillKeys(D.inside_ppl, { who: SH.name(who) }) : D.inside_none)).trim();
    let n = 0; const row = (lp, t, chip, why) => `<div data-lp="${lp}" class="${why ? 'dis' : ''}"><b>${++n}</b><span>${esc(t)}${why ? `<small>${esc(why)}</small>` : ''}</span>${chip ? `<small class="cchips"><span class="chip">${esc(chip)}</span></small>` : ''}</div>`;
    const ch = its.map(i => { const o = L.pool[i], k = optKo(st, o); return row('go:' + i, k.s ? `${k.n} · ${k.s}` : k.n, SH.fillKeys(UL().ap_cost, { n: SH.loopApCost(o) }), can(o) ? '' : UL().no_slot); }).join('')
      + (shopAt(st, pid) ? row('shop:' + pid, SH.fillKeys(SH.D.ui_lines.ACT_LABEL.shop_look, { shop: SH.shopOf(pid).ko })) : '');
    const sc = screen(); sc.className = 'k-event k-inside lp-in' + (dark ? ' dark' : '');
    sc.innerHTML = `${placeBg(pid, bg)}<div class="dots"></div>${who ? artImg(who, SH.exprId(who, null), 'ill ' + (dark ? 'night' : '')) : ''}`
      + `<div class="title"><span class="chip">${esc(placeKo(pid))}</span><h2>${esc(p.name_ko)}</h2></div>
      <div class="dlg px"><div class="name me">나</div><div class="text nar">${esc(line)}</div><div class="ch show" id="ch">${ch}<div data-lp="out" class="leave"><b>↩</b><span>그냥 나간다</span></div></div></div>`;
    paint(sc);
  }
  /* 오른쪽 칸(인턴의 .side.ms 틀 · 위 칸은 topBar 얇은 줄 — 날짜 · 톱니): 216(11-17 대표님 '사원부터 인턴 피드백이 반영 안 됨' · 목업_15 승인) — 인턴과 같은 '나' 칸(midMe) → 이번 주 장 → 자유 시간 · 올해 목표 → 사람(휴대폰 가로에선 뺌) → 삐삐 · 소지품 → [이번 주 마침 | 이 달] 한 줄 */
  function side(st, P) {
    const L = st.L, hide = bandDue(st, P), live = SH.loopLive(st);
    const held = Object.keys(L.pos).map(Number).sort((a, b) => L.pos[b] * L.px[b] - L.pos[a] * L.px[a]).slice(0, 3);
    const sr = (nm, v) => `<div class="sr"><span>${esc(nm)}</span><b class="${hide ? 'mute' : cls(v)}" data-v="${arrow(v)}" data-c="${cls(v)}">${hide ? '—' : arrow(v)}</b></div>`;      /* 주간 소식 띠가 떠 있는 동안은 '—'(같은 숫자를 두 곳에 안 보임) */
    const rows = held.length ? held.map(i => sr(SH.loopName(i), wk(L, i))).join('') : sr(UL().market, live.reduce((t, i) => t + wk(L, i), 0) / Math.max(1, live.length));
    const nr = L.known.filter(k => !k.state && !k.bought && L.mon.heard.includes(k.eid)).length, left = Math.max(0, L.ap || 0), mx = Math.max(1, L.apMax || 0), lost = left < 1 && !(L.used || 0);
    /* 221(11-17 대표님 '이해가 안 됨'): 네모 칸 · % 막대 대신 글 두 줄 — '이번 주 할 일 n번 남음 / 다 함 / 쉬는 주' · '대리 진급 0 / 14달' */
    const free = left >= 1 ? `<b class="gold-t">${esc(SH.fillKeys(UL().free_n, { n: left, max: mx }))}</b>` : `<b class="mute">${esc(lost ? UL().free_lost : UL().free_done)}</b>`;      /* 행동력 한 줄 + 막대(11-17 대표님 목업 가) */
    const g = SH.loopGoals(st, null)[0] || {};
    return `<div class="side ms lms im">
      ${midMe(st)}
      <div class="card px lite"><div class="ln"><span>${esc(UL().free_h)}</span>${free}</div><div class="apbar"><i style="width:${Math.round(100 * left / mx)}%"></i></div>
        ${g.nm ? `<div class="ln"><span>${esc(g.nm)}</span><b>${esc(g.short || '')}</b></div>` : ''}</div>
      <div class="card px gold wk"><div class="hd"><span>${esc(UL().mkt_h)}</span></div>${rows}
        <div class="go">${nr ? `<span class="rtag">${esc(SH.fillKeys(UL().new_rumor, { n: nr }))}</span>` : '<span></span>'}<div class="btn" data-lp="mkt">${esc(UL().mkt_btn)}</div></div></div>
      ${midPeople(st)}
      <div class="tray">${toast.chip(st)}<div class="bagb" data-act="bag">${ic16('shop', 20)}<b>${esc(SH.D.ui_lines.BAG.btn)}</b></div></div>
      <div class="ends"><div class="btn big" data-lp="skip">${esc(UL().skip_btn)}</div></div></div>`;
  }
  /* 주간 소식: 주를 마친 뒤 처음 그려질 때 한 번 — 지도 위쪽 띠(가진 종목 오르내림 한 줄 + 소식 두 줄 · 넘치면 '외 N건') · 몇 초 뒤나 누르면 사라짐 · 강제 매도면 겹침 창 */
  const bandDue = (st, P) => !!(P && P.news) && V.newsKey !== st.tick + ':' + P.news.week;
  function news(P) {
    const st = G.st, L = st.L, n = P.news, z = document.getElementById('zone'); if (!z || !bandDue(st, P)) return;
    V.newsKey = st.tick + ':' + n.week; V.band = true;
    const held = Object.keys(L.pos).map(Number).slice(0, 2), live = SH.loopLive(st), up = (v) => `<span class="${cls(v)}">${arrow(v)}</span>`;
    const top = held.length ? held.map(i => `${esc(SH.loopName(i))} ${up(wk(L, i))}`).join(' · ') : `${esc(UL().market)} ${up(live.reduce((t, i) => t + wk(L, i), 0) / Math.max(1, live.length))}`;
    const all = (n.lines || []).concat((n.news || []).filter(x => x.k !== 'paper'), (n.news || []).filter(x => x.k === 'paper')), show = all.slice(0, 2), more = all.length - show.length;
    const el = document.createElement('div'); el.className = 'wnews'; el.dataset.lp = 'band';
    el.innerHTML = `<div class="r"><span class="k">${esc(UL().week_news)}</span><b>${top}</b></div>${show.map(x => `<div class="r s2 ${x.k || ''}">${esc(x.s)}</div>`).join('')}${more > 0 ? `<div class="r s2 mute">${esc(SH.fillKeys(UL().more, { n: more }))}</div>` : ''}`;
    z.appendChild(el);
    if (!SHOT_STILL) setTimeout(bandOff, 6000);
    if (n.forced) { sfx('crash'); overlay(`<div class="box px warn"><h2>${esc(UL().forced_t)}</h2><p>${esc(SH.D.loop_scenes.LEDGER.forced_say)}</p><p>${esc((n.lines || []).filter(l => l.s.startsWith(SH.D.loop_scenes.LEDGER.forced.split('{')[0])).map(l => l.s).join(' '))}</p><p class="mute">${esc(SH.fillKeys(UL().forced_note, { pct: SH.loopPc(N.margin_call) }))}</p><div class="acts"><div class="btn big" data-act="ovl-close">계속 ▶</div></div></div>`, 'warn'); }
  }
  function bandOff() { V.band = false; document.querySelectorAll('.wnews').forEach(e => e.remove()); document.querySelectorAll('.lms .sr b[data-v]').forEach(b => { b.textContent = b.dataset.v; b.className = b.dataset.c; }); }
  /* 지도에서 하나를 함(자유 시간 한 칸) · 이번 주 마침(칸이 남았으면 한 번 되물음) · 이 달 끝까지(꼭 챙길 것이 남았으면 한 번 알림) */
  const wkey = (st) => `${wkOf(st)}:${st.L.used || 0}`;
  function go(i) { const st = G.st, o = st.L.pool[i]; if (!o) return; if (st.L.week > 0 || !(st.L.ap >= SH.loopApCost(o))) { toast([UL().no_slot]); return; } answer({ go: i }, `${dateKo(st)} — ${optKo(st, o).n}`); }
  function skip() { const st = G.st; if (st.L.pool.some(must) && V.warn !== 's' + wkey(st)) { V.warn = 's' + wkey(st); toast([UL().must_left]); return; } bandOff(); answer({ skip: true }, SH.dateLabel(st)); }

  /* ── 소문 한 장 ── */
  function rumorHtml(st, k, sel) {
    const L = st.L, K = SH.LOOP_KIND[k.kind], age = k.gw != null ? SH.loopM(st) * 4 + L.week - k.gw : (SH.loopM(st) - k.got) * 4 + L.week;      /* 들은 주(k.gw) — 옛 저장의 줄엔 없음 */
    const op = k.says == null ? '<span class="dim">내 소견: 아직 못 냄</span>' : `내 소견: <b class="${k.says ? 'gold-t' : 'pink-t'}">${k.says ? '숫자가 맞음' : '수상함'}</b> <span class="mute">(적중 ${Math.round(k.acc * 100)}%)</span>`;
    const nx = noteTx(k);
    const stt = k.dumped != null ? '<span class="pink-t">✔ 진짜였음 → 큰손이 털고 나감</span>' : k.state === 'real' ? '<span class="green-t">✔ 진짜였음</span>' : k.state === 'fake' ? '<span class="pink-t">✘ 헛소문이었음</span>' : `<span class="mute">들은 지 ${age}주</span>`;
    return `<div class="lp-rum ${sel ? 'on' : ''} ${k.state ? 'done' : ''}" data-lp="sel:${k.id}"><div class="hd"><span class="tag">${K.ko}</span><b>${esc(SH.loopName(k.id))}</b><span class="mute">· ${esc(SH.name(k.who))}</span><span class="sp"></span>${stt}</div>
      <div>오른다 · <b>${esc(nx.up)}</b> · <b>${esc(nx.when)}</b>${k.kind === 'inside' ? ` <span class="pink-t">· ${esc(nx.illegal)}</span>` : ''}</div>
      <div><span class="mute">출처 믿음</span> <span class="st">${SH.loopStar(k.star)}</span> <span class="mute">${esc(nx.real)}</span></div><div>${op}</div></div>`;
  }

  /* ── 만남 장면(틀) ── 이야기 장면과 같은 화면(ui/dialog.js eventScreen)으로: 장소 배경 + 반신 + 한 줄씩 · 끝 줄에 소문 쪽지와 얻은 것
     11-16 대표님 '디자인 개선 · 스크립트를 잘 안 보게 됨' → 목업 ㉯ '대사 장면처럼'(전: 지도 위 겹침 창에 글을 한 덩어리로) */
  /* 소문 한 줄의 글(폭 · 때 · 진짜일 셈 · 불법)은 소문 수첩(rumorHtml)과 만남 쪽지(noteHtml)가 같이 씀 — 원본 대사/화면_글.json LOOP_MAP 의 note_* */
  function noteTx(k) { const T = UL(); return { up: SH.fillKeys(T.note_up, { mag: k.mag }), when: SH.fillKeys(T.note_when, { lo: k.lo, hi: k.hi }), real: SH.fillKeys(T.note_real, { pct: Math.round(k.star * 100) }), illegal: T.note_illegal }; }
  function noteHtml(k) {
    const T = UL(), K = SH.LOOP_KIND[k.kind], nx = noteTx(k);
    return `<div class="mnote"><h4>${esc(T.note_h)} · ${K.ko} · ${esc(SH.name(k.who))}</h4><div class="big">${esc(SH.loopName(k.id))} <i>▲ ${esc(nx.up)}</i></div>
      <div>${esc(nx.when)} · ${esc(T.note_trust)} <span class="st">${SH.loopStar(k.star)}</span> ${esc(nx.real)}${k.kind === 'inside' ? ` <b>${esc(nx.illegal)}</b>` : ''}</div><div class="to">${esc(T.note_to)}</div></div>`;
  }
  function meet(P) {
    const st = G.st, k = P.rumor && st.L.known.find(x => x.eid === P.rumor), who = P.who && SH.CH[P.who] ? P.who : null, say = !P.gate && who, lines = [];
    /* 줄을 서술 / 말로 가름: 따옴표 안 = 만난 사람의 말(이름 칸 · 그 사람 그림) · 밖 = 서술 — 결산 앞 장면 · 상대 없는 장면은 여러 사람 말이 섞여 통째로 서술
       만난 사람이 아닌 이의 말은 자료가 따옴표 앞에 표지를 붙임(대사/README.md '만남 줄의 말한 사람'): @me = 주인공의 말 · @x = 그 밖의 사람 말(서술로 둠) — 표지 없는 헷갈리는 꼴은 자료 검사가 멈춤 */
    (P.lines || []).forEach(l => (say ? String(l).split(/((?:@me|@x)?"[^"]*")/) : [String(l).replace(/@(?:me|x)(?=")/g, '')]).forEach(x => { const t = x.trim(), m = say && /^(@me|@x)?"([^"]*)"$/.exec(t); if (!t) return;
      lines.push(!m ? { speaker: 'nar', expr: null, text: t } : m[1] === '@x' ? { speaker: 'nar', expr: null, text: `"${m[2]}"` } : { speaker: m[1] ? SH.GAME.hero : who, expr: null, text: m[2] }); }));
    sfx('select');
    eventScreen(P, false, { title: P.bare ? '' : P.title,   /* 이름 · 직함뿐인 제목(규칙이 bare 로 알림)은 왼쪽 사람 칸이 이미 말함 */
      when: { place: P.place }, who: who ? [who] : [], art: { cg: P.cg }, lines,
      extra: `<div class="mfin">${k ? noteHtml(k) : ''}${(P.gain || []).filter(Boolean).map(x => `<span class="lp-chip">${esc(x)}</span>`).join('')}</div>`,
      acts: P.land && SH.landCanAct(st) ? `<div data-act="land" data-op="list"><b>◆</b><span>${esc(UL().land_go)}</span></div>` : '' });
  }

  /* ── 주식 본 화면 ── */
  function drawChart() {
    const cv = document.getElementById('lpchart'); if (!cv) return;
    /* 224(11-17 대표님 '숫자도 잘리고 글자가 눌린 모양'): 그리는 판을 화면 칸의 두 배 크기로 맞춤(전: 1072×460 고정 판을 칸 크기로 늘려 가로 · 세로 배율이 달랐음) · 왼쪽 숫자 칸 폭은 숫자 길이를 재서(전: 76 고정이라 다섯 자리가 잘림) */
    if (cv.clientWidth && cv.clientHeight) { cv.width = cv.clientWidth * 2; cv.height = cv.clientHeight * 2; }      /* client 크기 = 무대 배율(fit)을 타기 전의 칸 크기 */
    const st = G.st, L = st.L, g = cv.getContext('2d'), W = cv.width, H = cv.height, id = V.sel, h = L.pxh[id].length ? L.pxh[id] : [L.px[id]], c = L.cost[id], o = L.ord[id] || {};
    const marks = [c, c && o.take ? c * (1 + o.take / 100) : null, c && o.stop ? c * (1 - o.stop / 100) : null].filter(Boolean);
    let lo = Math.min(...h, ...marks), hi = Math.max(...h, ...marks); const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
    g.clearRect(0, 0, W, H); g.font = '22px Galmuri11, sans-serif'; g.textBaseline = 'middle';
    const LM = Math.ceil(Math.max(...[0, 1, 2, 3, 4].map(i => g.measureText(num(lo + (hi - lo) * i / 4)).width))) + 20;      /* 왼쪽 숫자 칸 폭 */
    const X = (i) => LM + i * (W - LM - 36) / 12, Y = (v) => H - 44 - (v - lo) / (hi - lo) * (H - 84);
    for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4; g.strokeStyle = '#1f2a55'; g.lineWidth = 2; g.beginPath(); g.moveTo(LM, Y(v)); g.lineTo(W - 24, Y(v)); g.stroke(); g.fillStyle = '#6f7aa3'; g.textAlign = 'right'; g.fillText(num(v), LM - 8, Y(v)); }
    const ln = (v, col, t) => { g.setLineDash([10, 8]); g.strokeStyle = col; g.beginPath(); g.moveTo(LM, Y(v)); g.lineTo(W - 24, Y(v)); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.textAlign = 'left'; g.fillText(t, LM + 8, Y(v) - 16); };
    if (c) ln(c, '#f2c14e', `산 값 ${num(c)}`); if (c && o.take) ln(c * (1 + o.take / 100), '#ff6b62', `+${o.take}% 팔기`); if (c && o.stop) ln(c * (1 - o.stop / 100), '#5c9bff', `−${o.stop}% 팔기`);
    const up = h[h.length - 1] >= h[0], col = up ? '#ff6b62' : '#5c9bff'; g.strokeStyle = col; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); h.forEach((v, i) => { const x = X(i + 13 - h.length); i ? g.lineTo(x, Y(v)) : g.moveTo(x, Y(v)); }); g.stroke();
    h.forEach((v, i) => { g.fillStyle = i === h.length - 1 ? '#fff' : col; g.beginPath(); g.arc(X(i + 13 - h.length), Y(v), i === h.length - 1 ? 8 : 4, 0, 7); g.fill(); });
    g.fillStyle = '#6f7aa3'; g.textAlign = 'center'; g.fillText('열두 주 전', X(0) + 40, H - 14); g.fillText('지금', X(12), H - 14);
    if (h.length >= 5) { const r4 = (h[h.length - 1] / h[h.length - 5] - 1) * 100, t = r4 >= PN.hot && st.s.analysis >= PN.hot_ana ? ['과열', '#ff86b0'] : r4 <= PN.cold && st.s.analysis >= PN.cold_ana ? ['바닥', '#62cc7e'] : null;
      if (t) { g.fillStyle = t[1]; g.textAlign = 'right'; g.fillText(`${t[0]} — 넉 주에 ${pct(r4, 0)}`, W - 30, 24); } }
  }
  /* 243(11-17 대표님 '주식 화면 전체를 실제 HTS 를 참고해 다시' → 목업 최종 4 · 피드백 228 ~ 242): 게임 윗줄 없이 한 화면
     맨 위 줄(제목 · 날짜 · 주차 · 설정 · 지도로) → 세 칸(내 주식 손익 · 이 달 나 대 시장 · 내 돈은 어디에) → 왼쪽 시세 + 잔고 한 표 · 그 아래 종목마다 아는 것(최근 소식 · 소문)
     → 오른쪽 고른 종목 차트 + 주문(사기 · 팔기 · ± 한 주 · 막대 · 10 · 25 · 50% · 최대) → 확인 창 두 번(체결할까요? → 체결되었습니다)
     옛 화면의 소문 수첩 · 이 달 소식 · 걸어 두기는 단추를 누르면 겹침 창 · 신용 · 고객 돈 · 5% 공시 · 내부자 경고는 주문 칸과 확인 창에 · 색은 빨강 = 오름 · 파랑 = 내림(238) */
  const SK = () => UL().STOCK;
  const wonF = (v) => num(Math.round(v)) + '원';      /* 주문 칸 · 확인 창은 원 단위 숫자 그대로 */
  const sgn0 = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(Math.round(v))), sgw = (v) => sgn0(v) + '원';      /* 표 · 손익은 원 단위 숫자 그대로(만 줄임 없이 · 목업 최종 4) */
  function holdSum(st) { const L = st.L; let b = 0, e = 0; Object.keys(L.pos).forEach(i => { b += L.pos[i] * L.cost[i]; e += L.pos[i] * L.px[i]; }); return { b, e, g: e - b, r: b ? (e - b) / b * 100 : 0 }; }
  function curveSvg(st, w, h, now) {      /* 이 달 주마다 나(빨강) 대 시장(회색) — 규칙이 주마다 L.mon.curve 에 쌓음 · 247: 곡선이 덜 쌓인 저장(올리기 전에 시작한 달)은 0 → 지금 한 줄로 · 끝 점에 네모 */
    const L = st.L, cv = L.mon.curve || [], c = cv.length === L.week ? [[0, 0]].concat(cv) : [[0, 0]].concat(L.week ? Array(L.week - 1).fill(null) : [], L.week ? [now] : []);
    const pts = c.map((p, k) => p && [k, p]).filter(Boolean), vs = pts.map(q => q[1]).flat(), lo = Math.min(0, ...vs), hi = Math.max(0.5, ...vs), X = (k) => 4 + k * (w - 8) / 4, Y = (v) => 4 + (hi - v) / (hi - lo || 1) * (h - 8);
    const ln = (j, col) => `<polyline points="${pts.map(q => `${X(q[0]).toFixed(1)},${Y(q[1][j]).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`, e = pts[pts.length - 1];
    const dot = (j, col) => `<rect x="${(X(e[0]) - 3).toFixed(1)}" y="${(Y(e[1][j]) - 3).toFixed(1)}" width="6" height="6" fill="${col}"/>`;
    return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="4" x2="${w - 4}" y1="${Y(0)}" y2="${Y(0)}" stroke="#2c3768" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>${ln(1, '#6f7aa3')}${ln(0, '#ff6b62')}${dot(1, '#6f7aa3')}${dot(0, '#ff6b62')}</svg>`;
  }
  function infoRow(st, i, curM) {
    const T = SK(), L = st.L, nm = SH.loopName(i), k = SH.loopLiveRumor(st, i)[0], mn = L.mon.news.slice().reverse().find(x => x.id == null && String(x.s).includes(nm));
    const n = (L.lastNews && L.lastNews[i]) || (mn && { k: mn.k, s: mn.s, m: curM, w: L.week });      /* 243 앞 저장은 종목 표시가 없어 이 달 소식에서 이름으로 찾음 */
    const news = n ? `<span class="${n.k === 'ok' ? 'up-t' : n.k === 'bad' ? 'dn-t' : ''}">${esc(n.m !== curM ? SH.fillKeys(UL().STOCK.ago_m, { n: curM - n.m }) : L.week - n.w > 0 ? SH.fillKeys(UL().STOCK.ago_w, { n: L.week - n.w }) : UL().STOCK.ago_now)} · ${esc(n.s)}</span>` : '<span class="dim">—</span>';
    const rum = k ? (() => { const nx = noteTx(k); return `<span class="pink-t">${esc(SH.LOOP_KIND[k.kind].ko)} · 오른다 ${esc(nx.up)} · ${esc(nx.when)} · 믿음 </span><span class="gold-t">${SH.loopStar(k.star)}</span><span class="pink-t"> · ${esc(nx.real)}${k.kind === 'inside' ? ' · ' + esc(nx.illegal) : ''}</span>`; })() : '<span class="dim">—</span>';
    return `<tr class="${i === V.sel ? 'sel' : ''}" data-lp="sel:${i}"><td>${esc(SH.loopName(i))}</td><td class="sknw">${news}</td><td class="skrm">${rum}</td></tr>`;
  }
  function market(P) {
    const st = G.st, L = st.L, T = SK(); SH.loopOpen(st);
    const live = SH.loopLive(st); if (!live.includes(V.sel)) V.sel = live[0];
    const id = V.sel, px = L.px[id], held = L.pos[id] || 0, cost = L.cost[id], down = L.down, hs = holdSum(st), curM = SH.loopM(st);
    const my = SH.loopGain(st) / L.b0.eq * 100, mkt = SH.loopMkt(st), cr = (L.b0.clK - 1) * 100, hasCl = SH.loopCan(st, 'client'), worth = SH.loopWorth(st), cash = Math.max(0, st.s.money);
    const ord = live.filter(i => L.pos[i]).concat(live.filter(i => !L.pos[i]));
    const rows = ord.map(i => { const n = L.pos[i] || 0, r = wk(L, i), e = n * L.px[i], g = n ? e - n * L.cost[i] : 0, gr = n ? (L.px[i] / L.cost[i] - 1) * 100 : 0, lr = SH.loopLiveRumor(st, i).length;
      return `<tr class="${i === id ? 'sel' : ''}" data-lp="sel:${i}"><td>${esc(SH.loopName(i))} <small class="dim">${esc(SH.loopStocks()[i].sec)}</small>${lr ? ' <i class="dot"></i>' : ''}</td><td>${num(L.px[i])}</td><td class="${cls(r)}">${pct(r)}</td>
        <td>${n ? num(n) + '주' : '<span class="dim">—</span>'}</td><td>${n ? num(L.cost[i]) : ''}</td><td>${n ? num(e) : ''}</td><td class="${cls(g)}">${n ? sgn0(g) : ''}</td><td class="${cls(gr)}">${n ? pct(gr, 2) : ''}</td></tr>`; }).join('');
    const { y, m } = SH.ym(st.date);
    const sc = screen(); sc.className = 'k-loop lp-mkt sk'; G.redraw = () => market(P);
    sc.innerHTML = `<div class="sk-hd"><b>${esc(T.title)}</b><span class="mute">${y}년 ${m}월</span><span class="sp"></span>
        <div class="btn sm" data-act="notebook" title="설정">${ic('gear', 2)}</div><div class="btn big gold" data-lp="map">◀ 지도로</div></div>
      <div class="sk-top">
        <div class="px c1"><small>${esc(T.pl)}</small>${Object.keys(L.pos).length ? `<div><b class="big ${cls(hs.g)}">${sgw(hs.g)}</b> <b class="${cls(hs.r)}">${pct(hs.r, 2)}</b></div><small class="dim">${esc(SH.fillKeys(UL().STOCK.pl_sub, { buy: num(hs.b), ev: num(hs.e) }))}</small>` : `<div class="dim">${esc(T.pl_none)}</div>`}</div>
        <div class="px c2"><small>${esc(T.mon)} — <span class="${cls(my)}">${esc(T.me)} ${pct(my)}</span> · <span class="dim">${esc(T.mkt)} ${pct(mkt)}</span>${hasCl ? ` · ${esc(T.cl)} <span class="${cls(cr)}">${pct(cr)}</span>` : ''} · ${esc(my >= mkt ? T.ahead : T.behind)}</small>${curveSvg(st, 340, 56, [+my.toFixed(1), +mkt.toFixed(1)])}</div>
        <div class="px c3"><small>${esc(T.where)} · ${esc(T.worth)} <span class="gold-t">${num(worth)}</span>${hasCl ? ` · ${esc(T.aum)} ${won(SH.loopAum(st))}` : ''}</small>
          <div class="bar"><i style="flex:${Math.max(0, hs.e)};background:var(--gold)"></i><i style="flex:${cash};background:#8a93c9"></i>${L.debt > 0 ? `<i style="flex:${L.debt};background:var(--pink)"></i>` : ''}</div>
          <div class="lg"><span><b class="gold-t">■</b> ${esc(T.stock)} ${won(hs.e)}</span><span><b style="color:#8a93c9">■</b> ${esc(T.cash)} ${won(cash)}</span><span class="${L.debt > 0 ? 'pink-t' : 'dim'}">${esc(T.debt)} ${won(L.debt)}</span></div></div></div>
      <div class="px sk-tb"><table><tr>${T.th.map(t => `<th>${esc(t)}</th>`).join('')}</tr>${rows}
        ${Object.keys(L.pos).length ? `<tr class="sum"><td class="mute">${esc(T.sum)}</td><td></td><td></td><td></td><td class="dim">${num(hs.b)}</td><td>${num(hs.e)}</td><td class="${cls(hs.g)}">${sgn0(hs.g)}</td><td class="${cls(hs.r)}">${pct(hs.r, 2)}</td></tr>` : ''}</table></div>
      <div class="px sk-in"><div class="hd"><span>${esc(T.info_h)} <small class="dim">— ${esc(T.info_tip)}</small></span><span class="sp"></span><span class="btn sm" data-lp="note">${esc(T.note_btn)}</span><span class="btn sm" data-lp="news">${esc(T.news_btn)}</span></div>
        <table><tr>${T.info_th.map(t => `<th>${esc(t)}</th>`).join('')}</tr>${live.map(i => infoRow(st, i, curM)).join('')}</table></div>
      <div class="px sk-r"><div class="hd"><b class="big">${esc(SH.loopName(id))}</b><b class="big ${cls(wk(L, id))}">${num(px)}</b><span class="${cls(wk(L, id))}">${pct(wk(L, id))}</span><span class="sp"></span>${held ? `<small class="mute">${esc(SH.fillKeys(UL().STOCK.held, { n: num(held) }))} · <span class="${cls(px - cost)}">${sgw((px - cost) * held)} (${pct((px / cost - 1) * 100, 2)})</span></small>` : ''}</div>
        <canvas id="lpchart"></canvas>${orderForm(st, id, px, held, down)}</div>`;
    paint(sc); drawChart(); orderWire();
  }
  /* 주문 칸: 사기 · 팔기 → ± 한 주 · 막대(끌기) · 10 · 25 · 50% · 최대 → 총 · 그 뒤 현금 → 큰 단추(확인 창) — 막대를 끄는 동안은 숫자만 바꿈(orderPaint · 다시 그리면 끌기가 끊김) */
  const orderMax = (st, id) => V.side === 'buy' ? Math.floor(SH.loopRoom(st, V.credit) / st.L.px[id]) : st.L.pos[id] || 0;
  function orderNums(st, id) { const L = st.L, q = V.qty;
    if (V.side !== 'buy') { const x = q && SH.loopSellQuote(st, id, 0, q); return x ? { q, v: x.v, owe: 0, pay: x.pay, after: x.after, real: x.real, px: x.px, drop: x.drop } : { q, v: 0, owe: 0, pay: 0, after: st.s.money, real: 0, px: L.px[id] }; }      /* 팔기는 규칙의 미리 셈(공시 종목 값 빠짐 · 빚 갚음까지) */
    const px = L.px[id], v = q * px, owe = Math.max(0, v - Math.max(0, st.s.money));
    return { q, v, owe, pay: 0, after: st.s.money - (v - owe), real: 0, px }; }
  function orderForm(st, id, px, held, down) {      /* 신용으로 산 뒤엔 '지금 내 몫 %'도(옛 화면에 있던 것 · 구조 검토 1117b 지적 4) */
    const T = SK(), L = st.L, buy = V.side === 'buy', max = orderMax(st, id); V.qty = Math.max(0, Math.min(V.qty, max));
    const canC = SH.loopCan(st, 'credit'), ins = buy && SH.loopLiveRumor(st, id).some(k => k.kind === 'inside'), o = L.ord[id] || {}, ordOpen = SH.loopCan(st, 'order');
    const tab = (k, t) => `<span class="btn sm${V.side === k ? ' on ' + k : ''}" data-lp="side:${k}">${t}</span>`, chip = (p) => `<span class="btn sm${max && V.qty === Math.floor(max * p / 100) ? ' on' : ''}${down || !max ? ' dis' : ''}" data-lp="qf:${p}">${p === 100 ? '최대' : p + '%'}</span>`;
    return `<div class="sk-of${down ? ' off' : ''}"><div class="tabs">${tab('buy', esc(T.buy))}${tab('sell', held ? `${esc(T.sell)} <small>${num(held)}주</small>` : esc(T.sell))}</div>
      <div class="qty"><span class="btn${down || !max ? ' dis' : ''}" data-lp="qd:-1">−</span><b id="oq" class="big">${num(V.qty)}주</b><span class="btn${down || !max ? ' dis' : ''}" data-lp="qd:1">+</span></div>
      <input id="oslide" type="range" min="0" max="${max}" step="1" value="${V.qty}"${down || !max ? ' disabled' : ''} style="--p:${max ? V.qty / max * 100 : 0}%">
      <div class="chips">${[10, 25, 50, 100].map(chip).join('')}</div>
      <div class="ln"><span class="mute">${esc(T.sum_v)}</span><b id="ov" class="big">${wonF(orderNums(st, id).v)}</b></div>
      <div class="ln"><span class="mute">${esc(buy ? T.after_buy : T.after_sell)}</span><span id="oa">${wonF(orderNums(st, id).after)}</span></div>
      <div class="opt">${canC ? `<span class="btn sm${V.credit ? ' on' : ''}" data-lp="credit">${esc(V.credit ? T.credit_on : T.credit_off)}</span>` : SH.loopRank(st) && SH.loopRank(st).aum ? `<span class="lp-chip">${esc(T.credit_stop)}</span>` : ''}${SH.loopMargin(st) != null ? (() => { const mr = SH.loopMargin(st); return `<span class="${mr < 0.4 ? 'pink-t' : 'mute'}">${esc(SH.fillKeys(UL().STOCK.margin, { pct: Math.round(mr * 100) }))}</span>`; })() : ''}
        ${ordOpen ? `<span class="btn sm${o.take || o.stop || o.hold ? ' on' : ''}" data-lp="ordset">${esc(T.ord_btn)}</span>` : `<span class="dim">${esc(SH.fillKeys(UL().STOCK.ord_lock, { n: Math.max(1, PN.unlock.order - L.n) }))}</span>`}${ins ? `<span class="pink-t">${esc(UL().note_illegal)}</span>` : ''}</div>
      <span id="ogo" class="btn big go ${buy ? 'buy' : 'sell'}${V.qty && !down ? '' : ' dis'}" data-lp="ask">${down ? esc(UL().closed) : esc((buy ? SH.fillKeys(UL().STOCK.go_buy, { n: num(V.qty) }) : SH.fillKeys(UL().STOCK.go_sell, { n: num(V.qty) })))}</span></div>`;
  }
  function orderPaint() { const st = G.st, id = V.sel, T = SK(), buy = V.side === 'buy', x = orderNums(st, id), max = orderMax(st, id), $ = (k) => document.getElementById(k); if (!$('oq')) return;
    $('oq').textContent = num(x.q) + '주'; $('ov').textContent = wonF(x.v); $('oa').textContent = wonF(x.after); $('ogo').textContent = (buy ? SH.fillKeys(UL().STOCK.go_buy, { n: num(x.q) }) : SH.fillKeys(UL().STOCK.go_sell, { n: num(x.q) })); $('ogo').classList.toggle('dis', !x.q);
    $('oslide').value = x.q; $('oslide').style.setProperty('--p', (max ? x.q / max * 100 : 0) + '%');
    document.querySelectorAll('.sk-of .chips [data-lp]').forEach(e => e.classList.toggle('on', !!max && x.q === Math.floor(max * +e.dataset.lp.split(':')[1] / 100))); }
  function orderWire() { const s = document.getElementById('oslide'); if (s) s.oninput = () => { V.qty = +s.value; orderPaint(); }; }
  /* 확인 창 두 번(239): 체결할까요?(값 · 그 뒤 · 고객 돈 · 5% 공시 · 내부자 경고) → 체결되었습니다 */
  function ask() { const st = G.st, L = st.L, id = V.sel, T = SK(), buy = V.side === 'buy', x = orderNums(st, id); if (!x.q) return;
    const ln = (k, v) => `<div class="ln"><span class="mute">${esc(k)}</span><span>${v}</span></div>`, ins = buy && SH.loopLiveRumor(st, id).some(k => k.kind === 'inside'), own = SH.loopOwnLeft(st, id), cn = buy && SH.loopClientNote(st, id);
    sfx('select');
    overlay(`<div class="sk-dlg ${buy ? 'buy' : 'sell'}"><h3>${esc(T.ask_h)}</h3><span class="tag">${esc(buy ? T.buy : T.sell)}</span>
      ${ln(T.k_stock, esc(SH.loopName(id)))}${ln(T.k_qty, num(x.q) + '주')}${ln(T.k_px, `${wonF(x.px)} · ${esc(T.px_note)}`)}${ln(T.sum_v, `<b class="big">${wonF(x.v)}</b>${x.owe ? ` <small class="pink-t">(${esc(T.debt)} ${wonF(x.owe)})</small>` : ''}`)}
      ${ln(buy ? T.after_buy : T.after_sell, wonF(x.after))}${!buy && x.real ? ln(T.real, `<span class="${cls(x.real)}">${sgw(x.real)}</span>`) : ''}
      ${cn ? `<div class="hint">${esc(cn)}</div>` : ''}${own != null ? `<div class="hint">${own > 0 ? `5% 공시까지 ${num(own)}주` : '5% 넘게 들고 있음(공시됨) — 5% 아래로 팔면 값이 먼저 빠짐'}</div>` : ''}
      ${V.credit && buy ? `<div class="hint">신용: 내 몫의 두 배까지 삼 · 달 이자 ${N.margin_interest}% · 내 몫이 건 돈의 ${SH.loopPc(N.margin_call)}% 아래면 강제로 팔림</div>` : ''}
      ${ins ? '<div class="warn">내부자 얘기가 걸린 종목 — 사면 불법. 이 달 감사에 걸릴 확률 20% · 걸리면 재산 4할 추징과 좌천 · 두 번이면 퇴출.</div>' : ''}
      <div class="acts"><span class="btn big ${buy ? 'buy' : 'sell'}" data-lp="order">${esc(T.ok)}</span><span class="btn big" data-act="ovl-close">${esc(T.close)}</span></div></div>`, 'sk-ovl'); }
  function order() { const st = G.st, L = st.L, id = V.sel, T = SK(), buy = V.side === 'buy', q = V.qty, c0 = L.cost[id];
    const r = buy ? SH.loopBuy(st, id, q * L.px[id], V.credit) : SH.loopSell(st, id, 0, null, q);
    if (!r.ok) { overlay(''); sfx('deny'); toast(['✕ ' + r.msg]); return market(G.P); }
    const real = buy || !c0 ? 0 : r.v - c0 * r.n;      /* 실현 손익은 실제 판 값으로(구조 검토 1117b 지적 1) */
    V.qty = 0; sfx('trade'); persist(st); market(G.P);
    const ln = (k, v) => `<div class="ln"><span class="mute">${esc(k)}</span><span>${v}</span></div>`, n = L.pos[id] || 0;
    overlay(`<div class="sk-dlg done"><h3>${esc(T.done_h)}</h3><div class="msg"><span class="up-t">✔</span> ${esc((buy ? SH.fillKeys(UL().STOCK.done_buy, { stock: SH.loopName(id), n: num(r.n), v: wonF(r.v) }) : SH.fillKeys(UL().STOCK.done_sell, { stock: SH.loopName(id), n: num(r.n), v: wonF(r.v) })))}</div>
      ${ln(T.now_held, n ? `${num(n)}주 · ${esc(SH.fillKeys(UL().STOCK.avg, { v: wonF(L.cost[id]) }))}` : '—')}${!buy ? ln(T.real, `<span class="${cls(real)}">${sgw(real)}</span>`) : ''}${ln(T.cash, wonF(st.s.money))}
      <div class="acts"><span class="btn big gold" data-act="ovl-close">${esc(T.confirm)}</span></div></div>`, 'sk-ovl'); }
  /* 옛 화면에서 늘 보이던 것 — 단추를 누르면 겹침 창 */
  function noteOvl() { const st = G.st, known = st.L.known.slice().reverse(), T = SK();
    overlay(`<div class="sk-dlg wide"><h3>${esc(T.note_h)}</h3><div class="lp-scroll">${known.length ? known.map(k => rumorHtml(st, k, k.id === V.sel)).join('') : `<div class="dim">${esc(UL().no_rumor)}</div>`}</div><div class="acts"><span class="btn big" data-act="ovl-close">${esc(T.close)}</span></div></div>`, 'sk-ovl'); }
  function newsOvl() { const L = G.st.L, T = SK();
    overlay(`<div class="sk-dlg wide"><h3>${esc(T.news_h)}</h3><div class="lp-scroll">${L.mon.news.slice().reverse().map(n => `<div class="lp-news ${n.k}">${esc(n.s)}</div>`).join('') + L.mon.lines.slice().reverse().map(l => `<div class="lp-news me">▸ ${esc(l)}</div>`).join('') || '<div class="dim">아직 조용함</div>'}</div><div class="acts"><span class="btn big" data-act="ovl-close">${esc(T.close)}</span></div></div>`, 'sk-ovl'); }
  function ordOvl() { const st = G.st, L = st.L, id = V.sel, T = SK(), o = L.ord[id] || {}, held = L.pos[id] || 0;
    const b = (k, t, lab) => `<span class="btn sm${o[k] === t ? ' on' : ''}" data-lp="${k}:${t}">${lab}</span>`;
    overlay(`<div class="sk-dlg"><h3>${esc(SH.fillKeys(UL().STOCK.ord_h, { stock: SH.loopName(id) }))}</h3>${held ? `<div class="ordr"><span class="mute">${esc(T.ord_up)}</span>${PN.take.map(t => b('take', t, '+' + t + '%')).join('')}</div><div class="ordr"><span class="mute">${esc(T.ord_dn)}</span>${PN.stop.map(t => b('stop', t, '−' + t + '%')).join('')}</div><div class="ordr"><span class="mute">${esc(T.ord_hold)}</span>${PN.hold.map(t => b('hold', t, t + '주')).join('')}</div>${V.msg ? `<div class="hint">${V.msg}</div>` : ''}` : `<div class="dim">${esc(T.ord_none)}</div>`}
      <div class="acts"><span class="btn big" data-act="ovl-close">${esc(T.close)}</span></div></div>`, 'sk-ovl'); }

  /* ── 결산 ── */
  function settle(P) {
    /* 216 · 5(11-17 대표님 목업_17 '이대로 바꿔'): 인턴 주 결산(ui/mid4.js settleMid · 210)과 같은 짜임 — 왼쪽: 재산 칸(재산 앞뒤 · 나 · 시장 · 고객 돈 · 왜 이렇게 됐나 · 이달 줄) → [달라진 것 | 돈]
       오른쪽: 목표까지 → 가까워진 사람(+ 이달 장면) · 달라진 것 · 가까워진 사람은 settleMid.chg · who 를 그대로 씀(달 첫머리 값 = rep.before · 끝 값 = rep.after) · 카드 제목에 '이달' 안 붙임 */
    const st = G.st, r = P.rep, d = r.w1 - r.w0, sc = screen(); sc.className = 'k-settle m5'; G.redraw = () => settle(P);
    const dv = (k) => (r.after.s[k] || 0) - (r.before.s[k] || 0);
    const head = `<div class="m5-task px gold"><div class="k">${esc(UL().settle_worth)}</div><h2>${won(r.w0)} → <span class="${cls(d)}">${won(r.w1)}</span> <small class="${cls(d)}">(${sg(d)})</small></h2>
      <div class="m5-ev"><span class="${r.myRet > 0 ? 'up-t' : r.myRet < 0 ? 'dn-t' : ''}">나 ${pct(r.myRet)}</span><span>시장 ${pct(r.mkt)}</span>${r.cr != null ? `<span>고객 돈 ${pct(r.cr)}</span>` : ''}</div>
      <div class="lp-wl">${r.why.map(w => `<div class="lp-why ${w.k}">▸ ${esc(w.s)}</div>`).join('')}${(r.lines || []).map(l => `<div class="mute">▸ ${esc(l)}</div>`).join('')}</div></div>`;
    const money = `<div class="m5-money px"><div class="hd"><span>돈</span><b class="${cls(d)}">${sg(d)}</b></div>${r.rows.map(x => `<div class="ln"><span>${esc(x[0])}</span><b class="${cls(x[1])}">${sg(x[1])}</b></div>`).join('')}${r.repay ? `<div class="ln"><span class="mute">남은 현금으로 신용 빚 갚음</span><b class="mute">${won(r.repay)}</b></div>` : ''}</div>`;
    const goals = `<div class="m5-conv px gold"><div class="hd"><span>목표까지</span></div>${goalsHtml(r.goals)}${(r.gets || []).map(x => `<div class="lp-chip">${esc(x)}</div>`).join('')}</div>`;
    const scenes = r.scenes.map(e => `<div class="lp-ev ${e.k}"><b>${esc(e.title)}</b>${esc(e.s)}${e.unlock ? `<ul>${e.unlock.map(u => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}</div>`).join('');
    const who = settleMid.who(st, r.after, r.before).replace(/<\/div>\s*$/, scenes + '</div>');
    sc.innerHTML = `<div class="m5w"><div class="m5-head"><small>${esc(UL().settle_sub)}</small><h1>${esc(r.ko)} <span>결산</span></h1></div>
      <div class="m5-grid"><div class="m5-col">${head}<div class="m5-row">${settleMid.chg({ r, dv })}${money}</div></div><div class="m5-col">${goals}${who}</div></div>
      <div class="m5-foot"><div class="btn big" data-next="1">다음 달 ▶</div></div></div>`;
    paint(sc); if (!G.instant) setTimeout(() => sfx(d >= 0 ? 'success' : 'fail'), 200);
  }


  function act(el) {
    const st = G.st, L = st.L, [a, v] = el.dataset.lp.split(':'), id = V.sel;
    if (a === 'go') return go(+v);
    if (a === 'in') return enterFx(placeKo(v), '', () => inside(v));
    if (a === 'out' || a === 'map') { V.msg = ''; return map(G.P); }
    if (a === 'shop') { SHOPV.shop = v; SHOPV.sel = null; SHOPV.to = null; SHOPV.msg = ''; sfx('door'); return shopScreen('walk'); }      /* 가게: 칸을 안 씀 · 나가면 지도(main.js shop-exit → render) */
    if (a === 'mkt') return market(G.P);
    if (a === 'gofold') { V.goOpen = !V.goOpen; return pins(G.world); }
    if (a === 'skip') return skip();
    if (a === 'band') return bandOff();
    if (a === 'lot') return G.LAND.open(v);
    if (a === 'lotgo') return walkLot(v);
    if (a === 'sel') { V.sel = +v; V.qty = 0; if (document.querySelector('.lp-mkt') && !document.querySelector('#ovl .ovl')) market(G.P); return; }
    if (a === 'note') return noteOvl();
    if (a === 'news') return newsOvl();
    if (a === 'ordset') { V.msg = ''; return ordOvl(); }
    if (a === 'ask') return ask();
    if (a === 'order') return order();
    if (a === 'credit') { V.credit = !V.credit; return market(G.P); }
    if (a === 'side') { V.side = v; V.qty = 0; return market(G.P); }
    if (a === 'qf' || a === 'qd') { const max = orderMax(st, id); V.qty = Math.max(0, Math.min(max, a === 'qf' ? Math.floor(max * +v / 100) : V.qty + +v)); return orderPaint(); }
    if (a === 'take' || a === 'stop' || a === 'hold') { const cur = (L.ord[id] || {})[a]; SH.loopOrder(st, id, { [a]: cur === +v ? 0 : +v }); V.msg = cur === +v ? '걸어 둔 주문을 풂' : a === 'hold' ? `${esc(SH.loopName(id))} — 산 지 ${v}주가 지나면 전부 팔기로 걸어 둠(지금 ${SH.loopHeldWeeks(st, id)}주째)` : `${esc(SH.loopName(id))} — 산 값보다 ${a === 'take' ? '+' : '−'}${v}%에 닿으면 전부 팔기로 걸어 둠`; persist(st); market(G.P); return ordOvl(); }      /* 243: 걸어 두기는 겹침 창에서 — 바꾼 뒤 그 창을 다시 그림 */
  }
  /* 사진 · 누르기 시험용 손: 자유 시간이 있으면 얘기 · 장면 먼저 하나 → 없으면 이번 주 마침 */
  function autoPick(st) { const p = st.L.pool; if (SH.loopSlots(st) < 1 || !p.length) return { end: true }; const hot = p.findIndex(o => o.eid || o.card || o.t === 'date' || o.t === 'place' || o.t === 'makeup'); return { go: hot >= 0 ? hot : 0 }; }
  G.LOOP = { map, placeOf, keep, pins, near, mono, inside, side, news, meet, market, settle, act, autoPick, label: (o) => optKo(G.st, o).n };   // label: 고른 뒤 결과 화면 글(216)
})();
