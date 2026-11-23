/* =====================================================================
   map2/check.js — 지역 검사 한 곳(지도 설계 3-3 · 3-5 · 3-6 · 3-7 · 5절)
   - 블록도 로봇(tools/block_robot.js)과 편집 화면(?edit=1)이 같은 검사를 씀 — 편집 화면은 문제 0일 때만 내보냄
   - M2.check(R, ALL) → { problems: [{ region, kind, text, at? }], stats: { 장소 사이 걷는 시간 등 } }
     R = M2.build 결과 하나 · ALL = 모든 지역의 build 결과(출입구 목적지 검사용 · 없으면 건너뜀)
   ===================================================================== */
(function (root) {
  const M2 = root.M2 = root.M2 || {};
  M2.check = function (r, ALL) {
    const out = [], P = (kind, text, at) => out.push({ region: r.id, kind, text, at });
    const pts = [];
    // 문 · 출입구 · 도착 칸이 걸을 곳인가
    r.blds.forEach(b => {
      if (!b.door) { P('문 없음', b.name); return; }
      if (!M2.walkable(r, b.door[0] + 0.5, b.door[1] + 0.5)) P('문 막힘', `${b.name} ${b.door}`, b.door);
      if (b.places && b.places.length) pts.push([b.name, M2.doorPt(r, b)]);
    });
    r.exits.forEach(e => e.cells.forEach(c => { if (!M2.walkable(r, c[0] + 0.5, c[1] + 0.5)) P('출구 막힘', `${e.id} ${c}`, c); }));
    r.entrances.forEach(e => { if (!M2.walkable(r, e.at[0], e.at[1])) P('도착 막힘', `${e.id} ${e.at}`, [Math.floor(e.at[0]), Math.floor(e.at[1])]); });
    // 출입구 목적지(3-7): 목적지 지역 · 도착 자리가 있나 · 도착 자리가 다시 출구 위면 넘어가자마자 되넘어감
    if (ALL) r.exits.forEach(e => {
      const t = ALL[e.to.region]; if (!t) { P('출구 목적지 없음', `${e.id} → ${e.to.region}`); return; }
      const en = t.entrances.find(x => x.id === e.to.entrance); if (!en) { P('출구 도착 자리 없음', `${e.id} → ${e.to.region}.${e.to.entrance}`); return; }
      const cx = Math.floor(en.at[0]), cy = Math.floor(en.at[1]);
      if (t.exits.some(x => x.cells.some(c => c[0] === cx && c[1] === cy))) P('도착 자리가 출구 위', `${e.to.region}.${e.to.entrance}`);
    });
    r.exits.forEach(ex => pts.push(['출구 ' + ex.id, M2.toScreen(r, ex.cells[0][0] + 0.5, ex.cells[0][1] + 0.5)]));
    // 모두 서로 닿나 · 걷는 시간
    const rows = []; let worst = ['', 0];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const path = M2.pathTo(r, pts[i][1], pts[j][1]);
      if (!path) { P('안 닿음', `${pts[i][0]} ↔ ${pts[j][0]}`); continue; }
      const L = M2.pathLen(pts[i][1], path); rows.push(L); if (L > worst[1]) worst = [`${pts[i][0]} ↔ ${pts[j][0]}`, L];
    }
    rows.sort((a, b) => a - b);
    // 문 자리: 발자국 밖에서 한 면에 바로 붙어야 함(종류의 문 칸이 낱장 문과 맞는지)
    r.blds.filter(b => !b.area && b.door).forEach(b => { const [dx, dy] = b.door, inX = dx >= b.x && dx < b.x + b.w, inY = dy >= b.y && dy < b.y + b.h;
      if (!((inX && (dy === b.y - 1 || dy === b.y + b.h)) || (inY && (dx === b.x - 1 || dx === b.x + b.w)))) P('문이 벽에 안 붙음', `${b.name} ${b.door}`, b.door); });
    // 건물끼리 · 건물과 빈 땅이 겹치나(허름한 건물은 제 필지 위라 괜찮음)
    const own = {}; const mark = (x, y, who) => { const k = x + ',' + y; if (own[k] && own[k] !== who) P('겹침', `${own[k]} · ${who} ${x},${y}`, [x, y]); else own[k] = who; };
    r.blds.filter(b => !b.area).forEach(b => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) mark(x, y, b.name); });
    r.lots.filter(l => l.state === 'vacant').forEach(l => { for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) mark(x, y, '빈 땅 ' + l.id); });
    // 사물: 종류가 있나 · 인도 위인가 · 건물 · 문 · 출구와 안 겹치나
    const taken = new Set(); r.blds.filter(b => !b.area).forEach(b => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) taken.add(x + ',' + y); if (b.door) taken.add(b.door.join(',')); });
    r.exits.forEach(e => e.cells.forEach(c => taken.add(c.join(','))));
    r.props.forEach(p => { if (!p.k) { P('사물 종류 없음', p.kind, p.at); return; }
      for (let y = p.at[1]; y < p.at[1] + p.k.foot[1]; y++) for (let x = p.at[0]; x < p.at[0] + p.k.foot[0]; x++) {
        if (taken.has(x + ',' + y)) P('사물 겹침', `${p.kind} ${x},${y}`, [x, y]);
        if (!(p.k.on || ['side', 'yard', 'plaza']).includes(M2.groundAt(r, x, y))) P('사물이 놓는 땅 밖', `${p.kind} ${x},${y}`, [x, y]); } });
    // 깊이 맞물림(3-5)
    const items = r.blds.filter(b => !b.area).map(b => ({ x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h, sb: M2.boxScreen(r, b), b }));
    M2.depthSort(items).filter(it => it.cycle).forEach(c => P('깊이 맞물림', c.b.name, [c.b.x, c.b.y]));
    // 이름표 겹침 · 꼴
    const seen = new Set(); r.blds.concat(r.lots).forEach(o => { if (seen.has(o.id)) P('이름표 겹침', o.id); seen.add(o.id); if (!String(o.id).startsWith(r.id + '.')) P('이름표 꼴', `${o.id} (앞이 '${r.id}.' 이어야)`); });
    const walk = r.wg.ok.reduce((a, b) => a + b, 0);
    return { problems: out, stats: { pts: pts.length, pairs: rows.length, mid: rows.length ? rows[rows.length >> 1] : 0, worst, walk } };
  };
  // 지역 자료를 글로(편집 화면 내보내기 · regions.js 꼴) — 물건 하나 한 줄이라 바뀐 곳이 커밋에서 잘 보임
  M2.fmtRegions = (RG) => '{\n' + Object.entries(RG).map(([id, r]) => `  ${JSON.stringify(id)}: {\n` + Object.entries(r).map(([k, v]) => Array.isArray(v) && v.length && typeof v[0] === 'object'
    ? `    ${JSON.stringify(k)}: [\n` + v.map(x => '      ' + JSON.stringify(x)).join(',\n') + '\n    ]' : `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n  }').join(',\n') + '\n}';
  M2.sec = (L) => (L / M2.WALK_SPEED / 1000).toFixed(1);
  if (typeof module !== 'undefined') module.exports = M2;
})(typeof window !== 'undefined' ? window : globalThis);
