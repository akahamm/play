/* =====================================================================
   ui/bridge.js — 지도의 다리(지역 밖으로 이어지는 바닥 · 난간 · 표지판 · 밤 불빛) · 다리 건너기
   - w2Draw.span/deck/rail/bridge/bridgeItems/bridgeLit · w2Enter.cross — ui/world.js 의 w2Draw · w2Enter 에 붙음(그 뒤에 실음)
   - 11-14 큰 짜임: ui/map.js 에서 떼어 냄
   ===================================================================== */
/* ── 다리(11-14 대표님 95 · 96 '영등포 버튼 촌스러움 · 다리를 건너가는 느낌으로 · 다리 끝까지 걸어감') ──
   출구 칸에서 지역 안쪽으로 '다리' 땅이 이어진 만큼이 다리 · 지역 밖으로 일곱 칸 더 이어 옅어짐 · 옆이 못 걷는 곳(물 · 지역 밖)인 칸에만 난간 · 옆면 · 교각 · 가로등
   먼 쪽 난간은 땅 바로 위, 가까운 쪽 난간 · 표지판은 깊이 정렬에 넣어 주인공이 두 난간 사이를 걷게 · 새 지역 · 가로로 놓인 다리도 같은 식(출구가 붙은 변만 봄)
   전(60): 흐린 마름모 여섯 칸 + 큰 금빛 팻말 — 커밋 b69dfc9 까지 */
w2Draw.EXT = 7;
w2Draw.span = function (r, e) {   // 출구 하나의 다리 꼴: scr(t, s) = 다리 시작에서 t 칸 · 폭의 s(0 먼 쪽 ~ 1 가까운 쪽)
  const S = r._spans || (r._spans = {}); if (S[e.id]) return S[e.id];
  const cs = e.cells, c = cs[0], dir = c[1] >= r.H - 2 ? [0, 1] : c[1] <= 1 ? [0, -1] : c[0] >= r.W - 2 ? [1, 0] : [-1, 0], ax = dir[0] ? 0 : 1, sgn = dir[ax];
  const lo = Math.min.apply(null, cs.map(q => q[1 - ax])), w = Math.max.apply(null, cs.map(q => q[1 - ax])) - lo + 1, N = ax ? r.H : r.W;
  const cell = (a, b) => ax ? [b, a] : [a, b];   /* (다리 방향, 폭 방향) → [x, y] */
  const kind = (a, b) => { const q = cell(a, b); return q[0] >= 0 && q[1] >= 0 && q[0] < r.W && q[1] < r.H ? r.g[q[1] * r.W + q[0]] : null; };
  let L = 0; while (L < N && kind(sgn > 0 ? N - 1 - L : L, lo) === 'bridge') L++;
  const a0 = (sgn > 0 ? N : 0) - sgn * L, row = (i) => sgn > 0 ? a0 + i : a0 - 1 - i;
  const side = (i, s) => { if (i >= L) return 'out'; const b = s ? lo + w : lo - 1, k = kind(row(i), b), q = cell(row(i), b); return k === 'water' ? 'water' : k && M2.walkable(r, q[0] + 0.5, q[1] + 0.5) ? 'walk' : 'wall'; };
  return (S[e.id] = { e, dir, ax, sgn, lo, w, L, a0, N, cell, side, to: e.to.region,
    scr: (t, s) => { const q = cell(a0 + sgn * t, lo + s * w); return M2.toScreen(r, q[0], q[1]); },
    al: (i) => i < L ? 1 : Math.max(0, 0.9 * (1 - (i - L + 0.5) / w2Draw.EXT)) });
};
w2Draw.deck = function (g, r) {   // 다리 바닥 무늬(땅 굽기와 같은 식 — render.js paintGround) · 그림이 아직 없으면 단색
  if (r._deck) return r._deck;
  if (!M2.R2.ready('sp.gr_bridge')) return M2.R2.COL.bridge;
  const im = M2.R2.IMG['sp.gr_bridge'], T = im.naturalWidth / (M2.SPRITES['sp.gr_bridge'].per || 6), pat = g.createPattern(im, 'repeat');
  pat.setTransform(new DOMMatrix([32 / T, 16 / T, -32 / T, 16 / T, r.ox, r.oy])); return (r._deck = pat);
};
/* 115(11-14 대표님 '다리는 에셋을 쓴 게 아니라 직접 그린 거 같은데 · 에셋 만들어서 붙이는 형태로 · 앞으로도 명심'): 난간 · 교각 · 가로등 · 표지는 낱장 그림(img/skin/pr_bridge_* · pr_road_sign — 그림/다듬기/다리둔치_넣기.py)
   코드는 '어디에 놓나'만 정함 — 전(9edab6d ~ 1360118): 선 · 네모로 직접 그림 */
w2Draw.spr = (id) => M2.R2.ready(id) ? { im: M2.R2.IMG[id], m: M2.SPRITES[id] } : null;
// 난간 한 칸: 낱장(두 칸 길이 · 왼쪽 아래 → 오른쪽 위)의 아래 선 두 끝(base)을 다리 가장자리의 두 칸 묶음에 맞춰 놓고(기울기는 2:1에 맞게 살짝 밀어 줌) 이 칸 몫(반쪽)만 그림 · 가로로 놓인 다리는 좌우로 뒤집음
w2Draw.rail = function (g, sp, i, s) {
  const S = w2Draw.spr('sp.pr_bridge_rail');
  if (S && S.m.base) { const i0 = i - (i % 2), A = sp.scr(i0, s), B = sp.scr(i0 + 2, s), Lp = A[0] < B[0] ? A : B, Rp = A[0] < B[0] ? B : A;
    const xl = S.m.base[0][0], yl = S.m.base[0][1], xr = S.m.base[1][0], yr = S.m.base[1][1], k = (Rp[0] - Lp[0]) / (xr - xl), m = (yr - yl) / (xr - xl), want = (Rp[1] - Lp[1]) / (Rp[0] - Lp[0]);
    const W = S.m.size[0], H = S.m.size[1], mid = (xl + xr) / 2, C = sp.scr(i, s), D = sp.scr(i + 1, s), left = (C[0] + D[0]) / 2 < (Lp[0] + Rp[0]) / 2, fl = want > 0;
    g.save();
    if (fl) { const sh = (-want - m) * k; g.transform(-k, sh, 0, k, Lp[0] + k * xr, Lp[1] - (sh * xr + k * yr)); } else { const sh = (want - m) * k; g.transform(k, sh, 0, k, Lp[0] - k * xl, Lp[1] - (sh * xl + k * yl)); }
    const lh = fl ? !left : left, sx = lh ? 0 : mid, sw = lh ? mid : W - mid; g.drawImage(S.im, sx, 0, sw, H, sx, 0, sw, H); g.restore(); }
  const L = w2Draw.spr('sp.pr_bridge_lamp');   /* 네 칸마다 가로등 — 먼 쪽 · 가까운 쪽 엇갈려 */
  if (L && i % 4 === (s ? 2 : 0)) { const m = sp.scr(i + 0.5, s), hh = w2Draw.LAMP, sc = hh / L.m.size[1]; g.drawImage(L.im, m[0] - L.m.foot[0] * sc, m[1] - hh, L.m.size[0] * sc, hh); }
};
w2Draw.LAMP = 70;
w2Draw.bridge = function (z, g) {
  const r = z.r, quad = (P, fill) => { g.beginPath(); P.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } };
  r.exits.forEach(e => { const sp = w2Draw.span(r, e); if (!sp.L) return; const S = sp.scr, deck = w2Draw.deck(g, r), E = sp.L + w2Draw.EXT, P = w2Draw.spr('sp.pr_bridge_pier');
    quad([S(Math.max(0, sp.L - 3), 0), S(Math.max(0, sp.L - 3), 1), S(sp.L, 1), S(sp.L, 0)], deck);   /* 지역 끝의 그늘 · 테두리를 다리 위에선 걷어냄(바닥은 땅 무늬 그대로) */
    for (let i = sp.L; i < E; i++) { g.save(); g.globalAlpha = sp.al(i); quad([S(i, 0), S(i, 1), S(i + 1, 1), S(i + 1, 0)], deck); g.restore(); }
    for (let i = 0; i < E; i++) { g.save(); g.globalAlpha = sp.al(i);
      if (P && sp.side(i, 1) === 'water' && i % 4 === 1) {   /* 교각: 가까운 쪽 가장자리 아래로만 보이게 잘라(상판 밑에 받친 꼴) */
        const m = S(i + 0.5, 1), a = S(i - 1, 1), b = S(i + 2, 1), wd = 40, hh = wd * P.m.size[1] / P.m.size[0];
        g.save(); quad([a, b, [b[0], b[1] + 240], [a[0], a[1] + 240]]); g.clip(); g.drawImage(P.im, m[0] - wd / 2 + 4, m[1] - hh * 0.2, wd, hh); g.restore(); }
      if (sp.side(i, 0) !== 'walk') w2Draw.rail(g, sp, i, 0);
      g.restore(); }
  });
};
w2Draw.bridgeItems = function (z, g) {   // 깊이 정렬에 넣을 것: 가까운 쪽 난간(칸마다) · 다리 어귀의 도로 표지
  const r = z.r, out = []; z.signs = [];
  r.exits.forEach(e => { const sp = w2Draw.span(r, e); if (!sp.L) return;
    for (let i = 0; i < sp.L + w2Draw.EXT; i++) { if (sp.side(i, 1) === 'walk') continue;
      const a = sp.scr(i, 1), b = sp.scr(i + 1, 1), p = sp.cell(sp.a0 + sp.sgn * i, sp.lo + sp.w), q = sp.cell(sp.a0 + sp.sgn * (i + 1), sp.lo + sp.w);
      out.push({ x0: Math.min(p[0], q[0]), y0: Math.min(p[1], q[1]), x1: Math.max(p[0], q[0]) + (sp.ax ? 0.05 : 0), y1: Math.max(p[1], q[1]) + (sp.ax ? 0 : 0.05),
        sb: [Math.min(a[0], b[0]) - 7, Math.min(a[1], b[1]) - w2Draw.LAMP - 4, Math.max(a[0], b[0]) + 7, Math.max(a[1], b[1])], draw: () => { g.save(); g.globalAlpha *= sp.al(i); w2Draw.rail(g, sp, i, 1); g.restore(); } }); }
    // 도로 표지: 빈 초록 판 낱장(pr_road_sign) + 건너편 이름과 뻗는 쪽 화살표(글은 자료라 코드가 판 안에 씀 — 낱장의 panel 자리) · 다리 어귀 먼 쪽 · 전체 지도에선 크게
    const k = z.over ? Math.min(3.6, 0.9 / z.zoom) : 1, base = sp.scr(0.5, -0.14), c = sp.cell(sp.a0 + sp.sgn * 0.5, sp.lo - 0.14 * sp.w), name = M2.REGIONS[sp.to].ko;
    const v0 = sp.scr(0, 0.5), v1 = sp.scr(1, 0.5), ang = Math.atan2(v1[1] - v0[1], v1[0] - v0[0]), HH = 136 * k;
    out.push({ x0: c[0] - 0.1, y0: c[1] - 0.1, x1: c[0] + 0.1, y1: c[1] + 0.1, sb: [base[0] - HH * 0.7, base[1] - HH, base[0] + HH * 0.7, base[1]], draw: () => { const S = w2Draw.spr('sp.pr_road_sign'); if (!S) return;
      const sc = HH / S.m.size[1], x0 = base[0] - S.m.foot[0] * sc, y0 = base[1] - HH, pn = S.m.panel; g.drawImage(S.im, x0, y0, S.m.size[0] * sc, HH); if (!pn) return;
      z.signs.push({ to: sp.to, sb: [x0 + pn[0] * sc - 6, y0 + pn[1] * sc - 6, x0 + pn[2] * sc + 6, y0 + pn[3] * sc + 6] });
      if (z.over) { g.save(); g.strokeStyle = `rgba(242,193,78,${SHOT_STILL ? 0.9 : 0.55 + 0.4 * Math.sin(performance.now() / 380)})`; g.lineWidth = 5 * k / 2; g.strokeRect(x0 + pn[0] * sc - 4, y0 + pn[1] * sc - 4, (pn[2] - pn[0]) * sc + 8, (pn[3] - pn[1]) * sc + 8); g.restore(); }   /* 전체 지도: 누를 수 있다는 금빛 테두리 */
      const px = x0 + pn[0] * sc, py = y0 + pn[1] * sc, pw = (pn[2] - pn[0]) * sc, ph = (pn[3] - pn[1]) * sc, fs = Math.max(8, Math.min(ph * 0.6, pw * 0.86 / (name.length + 1.2))), ar = fs * 0.045;
      g.save(); g.fillStyle = '#f4f7f2'; g.font = `${fs}px 'Galmuri11', sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left'; const tw = g.measureText(name).width, gap = fs * 0.3, tot = tw + gap + 22 * ar, sx = px + (pw - tot) / 2;
      g.fillText(name, sx, py + ph / 2 + 1); g.translate(sx + tw + gap + 11 * ar, py + ph / 2); g.rotate(ang); g.scale(ar, ar); g.beginPath(); [[11, 0], [1, -8], [1, -3], [-10, -3], [-10, 3], [1, 3], [1, 8]].forEach((q, n) => n ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); g.restore(); } });
  });
  return out;
};
w2Draw.bridgeLit = function (z, g) {   // 밤: 다리 가로등 빛(불빛 장에)
  const r = z.r; g.save(); g.globalCompositeOperation = 'lighter';
  r.exits.forEach(e => { const sp = w2Draw.span(r, e); for (let i = 0; i < sp.L + w2Draw.EXT; i++) [0, 1].forEach(s => { if (!sp.L || i % 4 !== (s ? 2 : 0) || sp.side(i, s) === 'walk') return;
    const m = sp.scr(i + 0.5, s), hy = m[1] - w2Draw.LAMP * 0.9, gr = g.createRadialGradient(m[0], hy, 2, m[0], hy + 16, 50); gr.addColorStop(0, `rgba(255,226,150,${0.6 * sp.al(i)})`); gr.addColorStop(1, 'rgba(255,226,150,0)'); g.fillStyle = gr; g.fillRect(m[0] - 54, hy - 40, 108, 110); }); });
  g.restore();
};
// 다리 건너기(95 · 96): 다리 끝(출구 칸)에 닿으면 지역 밖 다리로 몇 걸음 더 걸어 나가 옅어지고 → 짧은 전환 → 건너편 다리 밖에서 걸어 들어옴
//   그동안(z.bridge) 지도 누름은 '바로 도착'만 · 키는 안 받음 · 사진 · 누르기 시험은 전처럼 바로 넘어감
w2Enter.cross = function (z, e, then) {
  const sp = w2Draw.span(z.r, e), fin = () => { z.bridge = false; z.crossing = false; if (then) then(); };
  if (G.instant || selfTesting || !sp.L) { w2Enter(z, e.to.region, e.to.entrance); return fin(); }
  z.bridge = true; z.crossing = true; z.onDone = null;
  const from = z.r.id, c = M2.toCell(z.r, z.pos[0], z.pos[1]), d = (sp.sgn > 0 ? sp.N - c[sp.ax] : c[sp.ax]) + 3.2;
  w2Go(z, [M2.toScreen(z.r, c[0] + sp.dir[0] * d, c[1] + sp.dir[1] * d)], () => enterFx(M2.REGIONS[e.to.region].ko, '다리를 건넌다', () => {
    w2Enter(z, e.to.region, e.to.entrance);
    const back = z.r.exits.find(x => x.to.region === from), en = z.r.entrances.find(x => x.id === e.to.entrance) || z.r.entrances[0], s2 = back && w2Draw.span(z.r, back);
    if (!s2 || !s2.L) return fin();
    const inPt = z.pos.slice(), d2 = (s2.sgn > 0 ? s2.N - en.at[s2.ax] : en.at[s2.ax]) + 3.2;
    z.pos = M2.toScreen(z.r, en.at[0] + s2.dir[0] * d2, en.at[1] + s2.dir[1] * d2); z.dir = dirOf([inPt[0] - z.pos[0], inPt[1] - z.pos[1]]); w2Cam(z, true);
    w2Go(z, [inPt], fin);
  }));
};
