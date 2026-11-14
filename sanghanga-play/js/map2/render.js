/* =====================================================================
   map2/render.js — 지도 그리기 한 곳(지도 설계 3-2 · 3-5 · 4절) · 블록도(block.html)와 본 게임 지도(ui/world2.js)가 같이 씀
   - 땅: 1024² 조각을 보이는 곳만 굽고 오래 안 본 조각부터 비움 · 땅 종류마다 무늬 낱장(kinds.js GROUND_SKIN · 없으면 단색) · 인도 · 찻길 경계는 코드가 연석 띠로 그림
   - 건물 · 사물: 낱장(발자국 너비에 맞춤 · 맨 아래 꼭짓점 = 발자국 아래 꼭짓점) · 낱장이 없거나 아직 안 왔으면 상자
   - 깊이: 화면에서 겹치는 것끼리 발자국으로 위상 정렬(iso.js depthSort) · 주인공 · 다른 것도 items 로 받음 · 주인공을 덮는 앞 건물은 반투명(o.focus)
   - 쓰는 법: M2.R2.init({ skin }) → 그릴 때마다 drawGround(g, r, view) · drawScene(g, r, { extra, label }) (g 의 변환은 지역 화면 좌표)
   ===================================================================== */
(function (root) {
  const M2 = root.M2 = root.M2 || {};
  const COL = { water: '#3b6fa8', road: '#5a5f69', side: '#bdb6a6', plaza: '#d3cab6', grass: '#7fae6a', bank: '#cdbd8c', cross: '#e9e6dc', bridge: '#8f7f6b', site: '#9c8a6a', vacant: '#a7946b', parking: '#8b8e95', yard: '#cfc6b2', flower: '#5d8a4c' };
  const PARK_COL = '#7d828c';   // 진입로 덧칠(주차장 바닥과 비슷한 빛)
  const CH = 1024, CH_MAX = 12, IMG = {}, REG = new Set();
  let SKIN = true, frameNo = 0, SIGT = 0, EDGE = 1;
  // 67(11-13 대표님 '경계 시안은 3번으로'): 지역 바깥 = 어두운 바탕 위에 지도 판 — 아래로 그림자 · 가장자리 안쪽 그늘 · 밝은 테두리(init 에 edge: 0 을 주면 예전처럼 물빛 바탕)
  //   시안 ① 물로 둘러쌈 · ② 도시가 이어짐 + 안개는 걷어냄(사진 04_시범/목업/1113_경계시안 · 코드는 커밋 f219f45)
  const EDGE_BG = '#10172a';
  const rimPath = (g, r) => { g.beginPath(); [[0, 0], [r.W, 0], [r.W, r.H], [0, r.H]].forEach((c, i) => { const p = M2.toScreen(r, c[0], c[1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); };
  const ready = (id) => !!(SKIN && id && IMG[id] && IMG[id].complete && IMG[id].naturalWidth);
  function init(o) {
    SKIN = !o || o.skin !== false; EDGE = o && o.edge === 0 ? 0 : 1;
    if (!SKIN) return;
    for (const id in M2.SPRITES) if (!IMG[id]) { const im = new Image(); im.src = (o && o.base || '') + M2.SPRITES[id].file; IMG[id] = im;
      if (M2.SPRITES[id].type === 'ground') im.addEventListener('load', regrind); }   // 땅 무늬가 오면 조각을 다시 구움
  }
  // 땅 무늬가 연달아 도착해도 조각 다시 굽기는 몰아서 한 번(11-13 구조 정리 걸음 9 — 전엔 도착마다 전부 버려 첫 지도에서 8번 다시 구움)
  let regrindT = 0;
  function regrind() { if (regrindT) return; regrindT = setTimeout(() => { regrindT = 0; REG.forEach(r => { r.chunks = null; }); }, 120);
  }
  const dia = (g, sx, sy) => { g.moveTo(sx, sy); g.lineTo(sx + 32, sy + 16); g.lineTo(sx, sy + 32); g.lineTo(sx - 32, sy + 16); g.closePath(); };
  function paintGround(r, g, box) {
    const near = (sx, sy) => sx + 32 >= box[0] && sx - 32 <= box[2] && sy + 32 >= box[1] && sy <= box[3];
    // 67: 지도 마름모 밖은 비워 둠(어두운 바탕 · 그림자가 비침) · 안쪽 바탕은 물빛
    if (EDGE) { g.clearRect(box[0], box[1], box[2] - box[0], box[3] - box[1]); rimPath(g, r); g.fillStyle = COL.water; g.fill(); }
    else { g.fillStyle = COL.water; g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]); }
    // 1) 단색 칸(무늬 낱장이 없는 땅)
    const skinOf = (k) => { const id = M2.GROUND_SKIN && M2.GROUND_SKIN[k]; return ready(id) ? id : null; };
    for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) {
      const k = r.g[y * r.W + x], [sx, sy] = M2.toScreen(r, x, y); if (!near(sx, sy) || skinOf(k)) continue;
      g.beginPath(); dia(g, sx, sy); g.fillStyle = COL[k] || '#f0f'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 1; g.stroke();
    }
    // 2) 무늬 땅: 종류마다 칸을 한 길(path)로 모아 한 번에 — 칸 사이 이음선이 안 생김 · 무늬는 위에서 본 평면을 2:1로 눕힘(위상은 지역 좌표 기준)
    const kinds = new Set(); for (let i = 0; i < r.g.length; i++) if (skinOf(r.g[i])) kinds.add(r.g[i]);
    kinds.forEach(k => {
      const id = skinOf(k), im = IMG[id], T = im.naturalWidth / (M2.SPRITES[id].per || 6), pat = g.createPattern(im, 'repeat');
      pat.setTransform(new DOMMatrix([32 / T, 16 / T, -32 / T, 16 / T, r.ox, r.oy]));
      g.beginPath();
      for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) if (r.g[y * r.W + x] === k) { const [sx, sy] = M2.toScreen(r, x, y); if (near(sx, sy)) dia(g, sx, sy); }
      g.fillStyle = pat; g.fill();
    });
    // 63: 주차장 바닥 = 찻길 아스팔트 무늬 + 조금 밝게(찻길과 같은 재질 · 구분은 밝기와 칸 선으로)
    g.beginPath(); for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) if (r.g[y * r.W + x] === 'parking') { const [sx, sy] = M2.toScreen(r, x, y); if (near(sx, sy)) dia(g, sx, sy); }
    g.fillStyle = 'rgba(150,156,168,.42)'; g.fill();
    // 55: 인도 칸에 보도블록 빛(붉은 기) — 광장 · 마당과 같은 회색이라 찻길 옆 띠로 안 읽혔음
    g.beginPath(); for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) if (r.g[y * r.W + x] === 'side') { const [sx, sy] = M2.toScreen(r, x, y); if (near(sx, sy)) dia(g, sx, sy); }
    g.fillStyle = 'rgba(176,96,72,.20)'; g.fill();
    // 3) 덧그림(코드): 주차 칸 선 · 화단 꽃 · 횡단보도 줄 · 인도와 찻길 사이 연석 띠
    for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) {
      const k = r.g[y * r.W + x], [sx, sy] = M2.toScreen(r, x, y); if (!near(sx, sy)) continue;
      // 찻길 노란 중앙선: 폭 2 찻길의 두 칸 사이(교차로는 건너뜀)
      const A = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < r.W && yy < r.H ? r.g[yy * r.W + xx] : null; };
      if (k === 'road' && A(1, 0) === 'road' && A(-1, 0) !== 'road' && A(2, 0) !== 'road') { g.strokeStyle = '#e8c33a'; g.lineWidth = 2; const p = M2.toScreen(r, x + 1, y), q = M2.toScreen(r, x + 1, y + 1); g.beginPath(); g.moveTo(p[0] - 2, p[1]); g.lineTo(q[0] - 2, q[1]); g.moveTo(p[0] + 2, p[1]); g.lineTo(q[0] + 2, q[1]); g.stroke(); }
      if (k === 'road' && A(0, 1) === 'road' && A(0, -1) !== 'road' && A(0, 2) !== 'road') { g.strokeStyle = '#e8c33a'; g.lineWidth = 2; const p = M2.toScreen(r, x, y + 1), q = M2.toScreen(r, x + 1, y + 1); g.beginPath(); g.moveTo(p[0], p[1] - 2); g.lineTo(q[0], q[1] - 2); g.moveTo(p[0], p[1] + 2); g.lineTo(q[0], q[1] + 2); g.stroke(); }
      if (k === 'flower') { const C = ['#e2556b', '#f2c14e', '#f7f0e0', '#c97be0']; for (let q = 0; q < 7; q++) { const u = ((x * 7 + y * 13 + q * 5) % 11) / 11 - 0.5, v = ((x * 3 + y * 17 + q * 7) % 13) / 13 - 0.5; g.fillStyle = C[(x + y + q) % 4]; g.fillRect(sx + (u - v) * 40 - 2, sy + 16 + (u + v) * 20 - 2, 4, 4); }
        g.strokeStyle = '#b9b2a2'; g.lineWidth = 2; g.beginPath(); dia(g, sx, sy); g.stroke(); }
    }
    for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) {
      const k = r.g[y * r.W + x], [sx, sy] = M2.toScreen(r, x, y); if (!near(sx, sy)) continue;
      if (k === 'cross') {   // 65(11-13 대표님 '횡단보도답게'): 찻길 방향과 나란한 굵은 흰 띠 셋을 칸 모양 그대로(전엔 짧은 줄 다섯을 한 기울기로)
        const rd = (xx, yy) => { const q = (xx >= 0 && yy >= 0 && xx < r.W && yy < r.H) ? r.g[yy * r.W + xx] : null; return q === 'road'; }, alongX = rd(x - 1, y) || rd(x + 1, y);
        g.fillStyle = 'rgba(244,242,234,.93)';
        for (let q = 0; q < 3; q++) { const a0 = 0.12 + q * 0.29, a1 = a0 + 0.17;
          const P = alongX ? [[x + 0.08, y + a0], [x + 0.92, y + a0], [x + 0.92, y + a1], [x + 0.08, y + a1]] : [[x + a0, y + 0.08], [x + a1, y + 0.08], [x + a1, y + 0.92], [x + a0, y + 0.92]];
          g.beginPath(); P.forEach((p, n) => { const s2 = M2.toScreen(r, p[0], p[1]); n ? g.lineTo(s2[0], s2[1]) : g.moveTo(s2[0], s2[1]); }); g.closePath(); g.fill(); }
      }
      if (k === 'side' || k === 'plaza' || k === 'yard') {   // 이웃이 찻길인 변에 연석
        const at = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < r.W && yy < r.H ? r.g[yy * r.W + xx] : null; };
        g.strokeStyle = '#f1ece0'; g.lineWidth = 5;   // 55(11-13 대표님 '인도가 안 보임'): 연석을 굵고 밝게
        if (at(1, 0) === 'road') { g.beginPath(); g.moveTo(sx + 32, sy + 16); g.lineTo(sx, sy + 32); g.stroke(); }
        if (at(0, 1) === 'road') { g.beginPath(); g.moveTo(sx - 32, sy + 16); g.lineTo(sx, sy + 32); g.stroke(); }
        if (at(-1, 0) === 'road') { g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 32, sy + 16); g.stroke(); }
        if (at(0, -1) === 'road') { g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 32, sy + 16); g.stroke(); }
      }
    }
    // 63(11-13 대표님 '흔히 아는 주차장 모습으로'): 주차장 짜임(iso.js parkLayout)대로 — 테두리 턱 · 칸 선(열린 쪽만 빼고 세 변) · 입구 화살표
    const seg = (a, b) => { const p = M2.toScreen(r, a[0], a[1]), q = M2.toScreen(r, b[0], b[1]); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); };
    const SIDES = [[[0, -1], [0, 0], [1, 0]], [[0, 1], [0, 1], [1, 1]], [[-1, 0], [0, 0], [0, 1]], [[1, 0], [1, 0], [1, 1]]];   // [바깥 방향, 변의 두 끝(칸 안 비율)]
    (r.parks || []).forEach(P => {
      // 진입로: 입구와 찻길 사이 인도 칸을 아스팔트로 덮음(턱이 낮아진 자리)
      if (P.apron && P.apron.length) { const id = skinOf('parking'); let fs = PARK_COL;
        if (id) { const im = IMG[id], T = im.naturalWidth / (M2.SPRITES[id].per || 6); fs = g.createPattern(im, 'repeat'); fs.setTransform(new DOMMatrix([32 / T, 16 / T, -32 / T, 16 / T, r.ox, r.oy])); }
        g.beginPath(); P.apron.forEach(c => { const q = M2.toScreen(r, c[0], c[1]); dia(g, q[0], q[1]); }); g.fillStyle = fs; g.fill(); if (id) { g.fillStyle = 'rgba(150,156,168,.42)'; g.fill(); } }
      const open = new Set(); P.ent.forEach(e => open.add(e.x + ',' + e.y + ',' + (-e.d[0]) + ',' + (-e.d[1])));
      P.stalls.forEach(s => { if (s.out) for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) open.add((s.x + i) + ',' + (s.y + j) + ',' + s.m[0] + ',' + s.m[1]); });
      g.strokeStyle = '#d6d1c4'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath();   // 테두리 턱: 찻길 · 입구 · 바깥으로 열린 칸 앞은 비움
      P.cells.forEach(([x, y]) => SIDES.forEach(([d, a, b]) => { const nx = x + d[0], ny = y + d[1], q = nx >= 0 && ny >= 0 && nx < r.W && ny < r.H ? r.g[ny * r.W + nx] : null;
        if (q === 'parking' || q === 'road' || open.has(x + ',' + y + ',' + d[0] + ',' + d[1])) return; seg([x + a[0], y + a[1]], [x + b[0], y + b[1]]); }));
      g.stroke();
      g.strokeStyle = 'rgba(250,250,246,.92)'; g.lineWidth = 2; g.lineCap = 'butt'; g.beginPath();   // 칸 선
      P.stalls.forEach(s => SIDES.forEach(([d, a, b]) => { if (d[0] === s.m[0] && d[1] === s.m[1]) return; seg([s.x + a[0] * s.w, s.y + a[1] * s.h], [s.x + b[0] * s.w, s.y + b[1] * s.h]); }));
      g.stroke();
      g.fillStyle = 'rgba(250,250,246,.9)';   // 입구 화살표(들어감 · 나감)
      P.ent.forEach(e => { const k = e.in ? 1 : -1, d = [e.d[0] * k, e.d[1] * k], p = [-d[1], d[0]], c = [e.x + 0.5, e.y + 0.5], at = (f, s) => M2.toScreen(r, c[0] + d[0] * f + p[0] * s, c[1] + d[1] * f + p[1] * s);
        g.beginPath(); [[-0.34, -0.06], [0.04, -0.06], [0.04, -0.2], [0.36, 0], [0.04, 0.2], [0.04, 0.06], [-0.34, 0.06]].forEach((q, n) => { const s2 = at(q[0], q[1]); n ? g.lineTo(s2[0], s2[1]) : g.moveTo(s2[0], s2[1]); }); g.closePath(); g.fill(); });
    });
    g.lineCap = 'butt';
    // 66(11-13 대표님 '신호등 · 빨간불에 섬'): 신호 교차로로 들어가는 차로마다 정지선(교차로 선에서 0.62칸 앞 — 차는 그 뒤에 섬)
    if (r.net) { g.strokeStyle = 'rgba(244,242,234,.93)'; g.lineWidth = 3; g.beginPath();
      r.net.juncs.filter(j => j.signal).forEach(j => {
        for (let y = j.y0; y <= j.y1; y++) { if (r.net.valid(j.x0 - 1, y, 0)) seg([j.x0 - 0.62, y + 0.06], [j.x0 - 0.62, y + 0.94]); if (r.net.valid(j.x1 + 1, y, 2)) seg([j.x1 + 1.62, y + 0.06], [j.x1 + 1.62, y + 0.94]); }
        for (let x = j.x0; x <= j.x1; x++) { if (r.net.valid(x, j.y0 - 1, 1)) seg([x + 0.06, j.y0 - 0.62], [x + 0.94, j.y0 - 0.62]); if (r.net.valid(x, j.y1 + 1, 3)) seg([x + 0.06, j.y1 + 1.62], [x + 0.94, j.y1 + 1.62]); } });
      g.stroke(); }
    // 4) 빈 땅 테두리
    r.lots.filter(l => l.state === 'vacant').forEach(l => {
      const P = [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.h], [l.x, l.y + l.h]].map(p => M2.toScreen(r, p[0], p[1]));
      g.setLineDash([8, 6]); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); g.setLineDash([]);
    });
  }
  function chunk(r, i, j) {
    REG.add(r); r.chunks = r.chunks || new Map(); const key = i + ',' + j; let c = r.chunks.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = CH; c.height = CH; const g = c.getContext('2d');
      g.translate(-i * CH, -j * CH); paintGround(r, g, [i * CH, j * CH, (i + 1) * CH, (j + 1) * CH]); r.chunks.set(key, c);
      if (r.chunks.size > CH_MAX) { let old = null; r.chunks.forEach((v, k) => { if (k !== key && (!old || v.t < old[1].t)) old = [k, v]; }); if (old) r.chunks.delete(old[0]); }
    }
    c.t = frameNo; return c;
  }
  // view = 보이는 지역 화면 상자 [x0, y0, x1, y1]
  function drawGround(g, r, view) {
    const i0 = Math.max(0, Math.floor(view[0] / CH)), i1 = Math.min(Math.ceil(r.pxW / CH) - 1, Math.floor(view[2] / CH)), j0 = Math.max(0, Math.floor(view[1] / CH)), j1 = Math.min(Math.ceil(r.pxH / CH) - 1, Math.floor(view[3] / CH));
    if (EDGE) { g.save(); g.translate(0, 18); rimPath(g, r); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill(); g.restore(); }   // 67: 판 아래 그림자
    frameNo++; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) g.drawImage(chunk(r, i, j), i * CH, j * CH);
    if (EDGE) {   // 67: 가장자리 안쪽 그늘(네 겹) · 밝은 테두리 — 땅 위 · 건물 아래(높은 건물은 안 덮음)
      g.save(); rimPath(g, r); g.clip(); [[110, .10], [70, .12], [36, .14], [14, .16]].forEach(([w, a]) => { rimPath(g, r); g.strokeStyle = `rgba(8,12,26,${a})`; g.lineWidth = w; g.stroke(); }); g.restore();
      rimPath(g, r); g.strokeStyle = '#e6d9b8'; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke(); }
  }
  const drop = (r) => { r.chunks = null; };   // 지역을 떠나면 비움
  // 낱장 맞추기
  const bFit = (r, b) => { const m = M2.SPRITES[b.sprite], s = 32 * (b.w + b.h) / m.size[0], bot = M2.toScreen(r, b.x + b.w, b.y + b.h); return { s, bot, x0: bot[0] - m.foot[0] * s, y0: bot[1] - m.foot[1] * s, w: m.size[0] * s, h: m.size[1] * s }; };
  const pFit = (r, p) => { const m = M2.SPRITES[p.k.sprite], s = p.k.h / m.size[1], bot = M2.toScreen(r, p.at[0] + p.k.foot[0], p.at[1] + p.k.foot[1]); return { s, bot, x0: bot[0] - (p.k.flip ? m.size[0] - m.foot[0] : m.foot[0]) * s, y0: bot[1] - m.foot[1] * s, w: m.size[0] * s, h: m.size[1] * s }; };   // flip = 좌우로 뒤집어 쓰는 종류(가로로 선 차)
  const skinned = (b) => ready(b.sprite) && !!M2.SPRITES[b.sprite].foot;   // 기준점 없는 낱장(땅 무늬 등)이 건물에 잘못 걸려도 상자로
  // 건물 화면 상자(깊이 · 누르기) — 낱장이면 낱장이 덮는 곳, 상자면 상자
  const bldBox = (r, b) => { if (skinned(b)) { const f = bFit(r, b); return [f.x0, f.y0, f.x0 + f.w, f.bot[1]]; } return M2.boxScreen(r, b); };
  const bldTop = (r, b) => skinned(b) ? bFit(r, b).y0 : M2.toScreen(r, b.x + b.w / 2, b.y + b.h / 2)[1] - b.z;   // 이름표를 놓을 지붕 위 y
  function drawBuilding(g, r, b) {
    if (skinned(b)) { const f = bFit(r, b); g.drawImage(IMG[b.sprite], f.x0, f.y0, f.w, f.h); return; }
    const z = b.z, P = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map(p => M2.toScreen(r, p[0], p[1]));
    const up = (p) => [p[0], p[1] - z], base = b.old ? [150, 112, 74] : b.places && b.places.length ? [226, 214, 190] : [190, 192, 200];
    const sh = (k) => `rgb(${base.map(v => Math.round(v * k)).join(',')})`;
    const face = (pts, col) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); };
    face([P[3], P[2], up(P[2]), up(P[3])], sh(0.78));   // 왼쪽 아래 면(+y · 빛)
    face([P[1], P[2], up(P[2]), up(P[1])], sh(0.62));   // 오른쪽 아래 면(+x · 그늘)
    face([P[0], P[1], P[2], P[3]].map(up), sh(1));       // 지붕
  }
  function drawProp(g, r, p) { if (!ready(p.k.sprite)) return; const f = pFit(r, p);
    if (p.k.flip) { g.save(); g.translate(f.x0 + f.w, f.y0); g.scale(-1, 1); g.drawImage(IMG[p.k.sprite], 0, 0, f.w, f.h); g.restore(); } else g.drawImage(IMG[p.k.sprite], f.x0, f.y0, f.w, f.h);
    if (p.sig && r.net) {   // 66: 신호등 불빛 — 지금 빛만 밝게(둘레에 번짐) · 나머지 등은 어둡게 덮음 · 등 자리는 낱장(260×462)에서 잰 값
      const ph = M2.sigPhase(r.net.juncs[p.sig.j], SIGT)[p.sig.ax], m = M2.SPRITES[p.k.sprite], at = (u, v) => [p.k.flip ? f.x0 + (m.size[0] - u) * f.s : f.x0 + u * f.s, f.y0 + v * f.s];
      const lamp = (u, v, rad, on, col) => { const c = at(u, v), rr = Math.max(1.6, rad * f.s);
        if (!on) { g.fillStyle = 'rgba(24,26,30,.82)'; g.beginPath(); g.arc(c[0], c[1], rr + 0.4, 0, 6.3); g.fill(); return; }
        g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], rr * 3.2); gr.addColorStop(0, col + ',.9)'); gr.addColorStop(1, col + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(c[0], c[1], rr * 3.2, 0, 6.3); g.fill(); g.restore();
        g.fillStyle = col + ',1)'; g.beginPath(); g.arc(c[0], c[1], rr, 0, 6.3); g.fill(); };
      lamp(131, 136, 13, ph === 'g', 'rgba(70,235,110'); lamp(169, 154, 13, ph === 'y', 'rgba(255,196,60'); lamp(207, 173, 13, ph === 'r', 'rgba(255,70,60');
      lamp(81, 287, 9, ph !== 'r', 'rgba(255,70,60'); lamp(81, 322, 9, ph === 'r', 'rgba(70,235,110');   // 걷는 사람 등: 차가 빨강일 때 초록
    } }
  // 64: 움직이는 차 한 대를 깊이 정렬 항목으로 — 방향에 맞는 그림(traffic.js carLook) · 발자국 아래 꼭짓점에 맞춤 · 지도 가장자리에선 흐리게
  function carItem(g, r, car) {
    const L = M2.carLook(car), im = IMG[L.sprite]; if (!ready(L.sprite)) return null;
    const m = M2.SPRITES[L.sprite], s = L.h / m.size[1], bot = M2.toScreen(r, L.x1, L.y1), w = m.size[0] * s, h = m.size[1] * s, x0 = bot[0] - (L.flip ? m.size[0] - m.foot[0] : m.foot[0]) * s, y0 = bot[1] - m.foot[1] * s;
    return { x0: L.x0, y0: L.y0, x1: L.x1, y1: L.y1, sb: [x0, y0, x0 + w, bot[1]], draw: () => { g.save(); g.globalAlpha *= car.alpha == null ? 1 : car.alpha;
      if (L.flip) { g.translate(x0 + w, y0); g.scale(-1, 1); g.drawImage(im, 0, 0, w, h); } else g.drawImage(im, x0, y0, w, h); g.restore(); } };
  }
  // 건물 · 사물 · extra(주인공 등 {x0,y0,x1,y1,sb,draw}) 를 깊이 순서로 · label(b) 가 있으면 건물마다 부름(블록도 이름표)
  function drawScene(g, r, o) {
    o = o || {};
    SIGT = o.sigT != null ? o.sigT : (typeof performance !== 'undefined' ? performance.now() : 0);   // 신호 시각: 차를 움직이는 쪽이 주면 그 시각(차와 같은 박자)
    const items = r.blds.filter(b => !b.area).map(b => ({ b, x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h, bot: M2.toScreen(r, b.x + b.w, b.y + b.h), sb: bldBox(r, b), draw: () => { drawBuilding(g, r, b); if (o.label) o.label(b); } }));
    r.props.forEach(p => { if (p.k && ready(p.k.sprite) && M2.SPRITES[p.k.sprite].foot) { const f = pFit(r, p); items.push({ p, x0: p.at[0], y0: p.at[1], x1: p.at[0] + p.k.foot[0], y1: p.at[1] + p.k.foot[1], bot: f.bot, sb: [f.x0, f.y0, f.x0 + f.w, f.bot[1]], draw: () => drawProp(g, r, p) }); } });
    (o.extra || []).forEach(x => items.push(x));
    // 가림(설계 3-5): o.focus(주인공) 보다 뒤에 그려지면서 그 몸을 덮는 건물 · 사물은 반투명
    const order = M2.depthSort(items), fi = o.focus ? order.indexOf(o.focus) : -1;
    const fp = fi >= 0 ? [(o.focus.sb[0] + o.focus.sb[2]) / 2, o.focus.sb[1] * 0.4 + o.focus.sb[3] * 0.6] : null;
    order.forEach((it, i) => {
      // 덮는가: 상자 안이고, 발자국 아래 꼭짓점에서 양쪽으로 2:1로 올라가는 아래 경계보다 위(건물 몸 안)
      const hide = fp && i > fi && it !== o.focus && it.bot && fp[0] > Math.max(it.sb[0], it.bot[0] - 32 * (it.y1 - it.y0)) && fp[0] < Math.min(it.sb[2], it.bot[0] + 32 * (it.x1 - it.x0)) && fp[1] > it.sb[1] && fp[1] < it.bot[1] - Math.abs(fp[0] - it.bot[0]) * 0.5;
      if (it.b) it.b._ghost = !!hide;   // 밤 불빛도 이 건물은 옅게
      (it.b || it.p || {})._ord = i;     // 그린 순서 — 밤 불빛이 앞 건물에 가린 가로등을 거름
      if (hide) { g.save(); g.globalAlpha = 0.45; it.draw(); g.restore(); } else it.draw();
      if (it.b && it.b === o.hover) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22; it.draw(); g.restore(); }   // 56: 마우스를 올린(눌릴) 건물을 밝힘
    });
  }
  // 밤 불빛(11-13 하는 순서 ㄹ — 밤 칠하기는 그대로 · 그 위 따로 한 장에 불 켜진 창 · 가로등 빛만): 창 = 낱장의 유리(푸르고 어두운 화소)를 작은 칸으로 묶어 건물마다 정해진 몫만 켬
  const LIT = {};
  function litOf(b) {
    const key = b.id || (b.x + ',' + b.y); if (key in LIT) return LIT[key];
    if (!ready(b.sprite)) return null;
    LIT[key] = null;
    try {
      const im = IMG[b.sprite], w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
      const cg = c.getContext('2d'); cg.drawImage(im, 0, 0); const d = cg.getImageData(0, 0, w, h).data;
      const out = document.createElement('canvas'); out.width = w; out.height = h; const og = out.getContext('2d');
      // 49(11-13 대표님 '네모가 삐져나옴' · ㉠): 유리 화소(푸르고 어두움)를 이웃끼리 묶은 덩어리 = 창 하나 · 정해진 몫의 덩어리만 그 화소 그대로 켬
      //   벽을 따라 기울어진 창 모양 그대로 · 넓은 덩어리(지붕 · 유리 외벽 통째)는 창이 아니라 뺌 · 맨 아래 8% 줄(문 · 땅)은 뺌
      let sd = 7; for (const ch of key) sd = (sd * 31 + ch.charCodeAt(0)) & 0x7fffffff;
      const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; }, on = 0.25 + rnd() * 0.3;
      const glass = new Uint8Array(w * h), yMax = Math.floor(h * 0.92);
      // 대표님 11-13 '보이는 두 벽에만': 지붕 마름모(2:1 · 그림 위쪽, 가운데 아래 꼭짓점이 너비의 절반 높이) 안은 빼고 두 벽 화소만
      // 71(11-13 대표님 '뒤쪽에 불빛'): 지붕 마름모를 그림 너비로 짐작하던 것 → 맨 왼쪽 · 맨 오른쪽 기둥의 꼭대기(벽 윗선)와 발 꼭짓점으로 벽 윗선을 그어 그 위는 모두 뺌
      const colTop = (x) => { for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > 200) return y; return h; };
      let x0 = 0, x1 = w - 1; while (x0 < w && colTop(x0) >= h) x0++; while (x1 > 0 && colTop(x1) >= h) x1--;
      const mt = M2.SPRITES[b.sprite], fxp = Math.round(mt.foot[0] * w / mt.size[0]), tL = colTop(Math.min(w - 1, x0 + 2)), tR = colTop(Math.max(0, x1 - 2));
      const roofTop = (x) => (x <= fxp ? tL + (x - x0) / 2 : tR + (x1 - x) / 2) + 3;
      for (let y = 0; y < yMax; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (y < roofTop(x)) continue; if (d[i + 3] > 200 && d[i + 2] > d[i] + 12 && d[i + 2] >= d[i + 1] - 6 && d[i] + d[i + 1] + d[i + 2] < 520) glass[y * w + x] = 1; }
      const seen = new Uint8Array(w * h), img = og.createImageData(w, h), od = img.data, maxA = w * h * 0.012, stack = [];
      for (let s0 = 0; s0 < w * h; s0++) {
        if (!glass[s0] || seen[s0]) continue;
        const px = []; let x0 = w, x1 = 0; stack.push(s0); seen[s0] = 1;
        while (stack.length) { const q = stack.pop(), qx = q % w, qy = (q - qx) / w; px.push(q); if (qx < x0) x0 = qx; if (qx > x1) x1 = qx;
          if (qx > 0 && glass[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; stack.push(q - 1); } if (qx < w - 1 && glass[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; stack.push(q + 1); }
          if (qy > 0 && glass[q - w] && !seen[q - w]) { seen[q - w] = 1; stack.push(q - w); } if (qy < h - 1 && glass[q + w] && !seen[q + w]) { seen[q + w] = 1; stack.push(q + w); } }
        if (px.length < 4 || px.length > maxA || x1 - x0 > w * 0.2 || rnd() >= on) continue;
        const warm = rnd() < 0.8 ? [255, 206, 120] : [255, 236, 190];
        px.forEach(q => { const o = q * 4; od[o] = warm[0]; od[o + 1] = warm[1]; od[o + 2] = warm[2]; od[o + 3] = 200; });
      }
      og.putImageData(img, 0, 0);
      LIT[key] = out;
    } catch (e) { LIT[key] = null; }   // 파일로 연 게임은 그림 화소를 못 읽을 수 있음 → 창 불빛 없이(가로등은 그대로)
    return LIT[key];
  }
  // 50(11-13): 밤 지도에 들어갈 때 창 불빛을 한 번에 미리 셈 — 걷다가 처음 보이는 건물마다 세면 한 장이 100ms 넘게 튀어 걸음이 느려졌음
  function warmLights(r) { if (r._litWarm) return; let all = true; r.blds.forEach(b => { if (b.area || !b.sprite) return; if (skinned(b)) litOf(b); else all = false; }); if (all) r._litWarm = 1; }   // 그림이 다 와야 끝으로 침
  function drawLights(g, r, o) {
    o = o || {};
    g.save(); g.globalCompositeOperation = 'lighter';
    // 71 다시(11-13 대표님 '뒷면 창 불빛이 왜 보이냐'): 불빛 한 장이 모든 건물 위라 뒤 건물 창 불빛이 앞 건물을 뚫고 비쳤음 → 그린 순서(뒤 → 앞)대로 건물마다 자기 모양만큼 뒤 불빛을 지우고 자기 불빛을 켬
    r.blds.filter(b => !b.area && skinned(b)).sort((a, c) => (a._ord || 0) - (c._ord || 0)).forEach(b => {
      const f = bFit(r, b), L = litOf(b);
      g.globalCompositeOperation = 'destination-out'; g.globalAlpha = b._ghost ? 0.45 : 1; g.drawImage(IMG[b.sprite], f.x0, f.y0, f.w, f.h);
      if (L) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = b._ghost ? 0.25 : 1; g.drawImage(L, f.x0, f.y0, f.w, f.h); }
    });
    g.globalAlpha = 1;
    g.restore();
    if (o.clear) g.clearRect(o.clear[0], o.clear[1], o.clear[2] - o.clear[0], o.clear[3] - o.clear[1]);   // 주인공 몸 위엔 창 불빛을 안 얹음
    g.save(); g.globalCompositeOperation = 'lighter';
    r.props.forEach(p => {
      if (!p.k || p.k.sprite !== 'sp.pr_lamp' || !ready(p.k.sprite)) return;
      const f = pFit(r, p), hx = f.x0 + f.w * (o.headX || 0.3), hy = f.y0 + f.h * (o.headY || 0.08);
      if (r.blds.some(b => !b.area && b._ord > p._ord && !b._ghost && (sb => hx > sb[0] && hx < sb[2] && hy > sb[1] && hy < sb[3])(bldBox(r, b)))) return;   // 앞 건물 뒤에 선 가로등은 빛도 가림
      let gr = g.createRadialGradient(hx, hy, 0, hx, hy, 30); gr.addColorStop(0, 'rgba(255,224,160,.95)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(hx - 30, hy - 30, 60, 60);
      g.save(); g.translate(f.bot[0], f.bot[1]); g.scale(1, 0.5); gr = g.createRadialGradient(0, 0, 0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,205,130,.32)'); gr.addColorStop(1, 'rgba(255,205,130,0)'); g.fillStyle = gr; g.fillRect(-64, -64, 128, 128); g.restore();
    });
    g.restore();
  }
  // 56(11-13 대표님 '어디가 눌린 건지 명확치 않음'): 낱장의 안 투명한 화소로 판정 — 네모 상자만 보면 그림의 투명한 모서리가 옆 건물을 덮었음
  const ALPHA = {};
  function solidAt(r, b, w) {
    if (!skinned(b)) return true;
    let m = ALPHA[b.sprite];
    if (m === undefined) { try { const im = IMG[b.sprite], c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; m = ALPHA[b.sprite] = { a, w: c.width, h: c.height }; } catch (e) { m = ALPHA[b.sprite] = null; } }
    if (!m) return true;   // 파일로 연 게임 등 화소를 못 읽으면 상자로
    const f = bFit(r, b), u = Math.floor((w[0] - f.x0) / f.w * m.w), v = Math.floor((w[1] - f.y0) / f.h * m.h);
    return u >= 0 && v >= 0 && u < m.w && v < m.h && m.a[v * m.w + u] > 40;
  }
  // 지역 화면 점 w 에 있는 건물(지붕 · 벽까지) — 앞(x + y 큰 쪽) 건물이 이김
  function bldAt(r, w) {
    let hit = null;
    r.blds.forEach(b => { if (b.area) { const d = M2.doorPt(r, b); if (Math.hypot(w[0] - d[0], w[1] - d[1]) < 40) hit = b; return; }
      const sb = bldBox(r, b); if (w[0] > sb[0] && w[0] < sb[2] && w[1] > sb[1] && w[1] < sb[3] && (!hit || hit.area || b.y + b.x > hit.x + hit.y) && solidAt(r, b, w)) hit = b; });
    return hit;
  }
  M2.R2 = { init, ready, COL, bg: () => EDGE ? EDGE_BG : COL.water, drawGround, drawScene, carItem, drawLights, warmLights, bldTop, bldAt, bFit, drop, IMG };   // drawBuilding · bldBox · pFit 는 이 파일 안에서만 씀(11-14 밤 정리 — 밖에서 0건)
  if (typeof module !== 'undefined') module.exports = M2;
})(typeof window !== 'undefined' ? window : globalThis);
