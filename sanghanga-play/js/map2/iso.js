/* =====================================================================
   map2/iso.js — 새 지도 짜임의 바닥(04_시범/지도_짜임_설계_1113.md 3절) · 화면과 로봇이 같이 씀(그리기 없음)
   - 칸: 2:1 마름모 · 한 칸 대각선 64×32 · 화면 x = ox + 32(cx − cy) · y = oy + 16(cx + cy) · 논리 원점 고정
   - 땅: 칸마다 땅 종류(지역 자료의 도형을 차례로 칠함 · 위에 얹는 것이 통행에서 이김)
   - 걷기: 반 칸(32×16) 격자 = 땅이 걸을 곳 − 건물 발자국 · 길 찾기 A*(화면 거리 비용) · 곧게 당기기(선·끝점 다시 검사) · 길 없으면 null(곧장 가지 않음)
   - 깊이: 화면에서 겹치는 것끼리 발자국 상자로 앞뒤를 정해 위상 정렬 · 맞물리면(순환) 표시
   ===================================================================== */
(function (root) {
  const M2 = root.M2 = root.M2 || {};
  M2.HW = 32; M2.HH = 16;   // 반 대각선(한 칸 = 64×32)
  // 걷기 · 주인공 상수 한 곳(11-13 구조 정리 걸음 3 — 전엔 check.js · kinds.js · ui/map.js · block.html 에 따로 박혀 있었음)
  M2.C = {
    WALK_SPEED: 0.19,    // 걷기 빠르기(지도 px / ms) — 블록도 · 본 게임 · 로봇 걷는 시간이 같이 씀
    STRIDE: 18,          // 걸음 그림 한 장 넘기는 거리(px)
    HERO_H: 58,          // 주인공 그림 높이(px · 줄이기 전)
    HERO_SCALE: 0.6,     // 11-13 대표님 결 시안 ㉠ — 칸 · 걷는 시간은 그대로, 그림만 줄임
    HSHEET: { src: 'img/zone/hero_walk2.png', cw: 65, ch: 101, cols: 5, rows: { SE: 0, SW: 1, NE: 2, NW: 3 } }   // 걷기 시트(칸 크기 · 방향 줄)
  };
  M2.WALK_SPEED = M2.C.WALK_SPEED; M2.HERO_SCALE = M2.C.HERO_SCALE;   // 옛 이름(부르는 곳이 많아 남김)
  // 땅 종류 — walk: 걸을 수 있나 · cost: 걷는 값(길 찾기가 싼 땅을 먼저 고름 · 없으면 1) · over: 위에 얹는 것(통행에서 아래를 이김)
  //   11-13 대표님 '자유롭게 이동' — 찻길도 걸음(값 4라 횡단보도 쪽을 먼저 탐) · 빈 땅도 걸음 · 막힌 건 물 · 화단 · 공사장 · 건물 · 막는 사물뿐
  M2.GROUND = {
    water: { walk: 0, ko: '물' }, road: { walk: 1, cost: 4, ko: '찻길' }, side: { walk: 1, ko: '인도' }, plaza: { walk: 1, ko: '광장' },
    grass: { walk: 1, cost: 1.2, ko: '잔디' }, bank: { walk: 1, cost: 1.2, ko: '둔치' }, cross: { walk: 1, over: 1, ko: '횡단보도' }, bridge: { walk: 1, over: 1, ko: '다리' },
    site: { walk: 0, ko: '공사장' }, vacant: { walk: 1, cost: 1.5, ko: '빈 땅' },
    parking: { walk: 1, cost: 1.3, ko: '주차장' }, yard: { walk: 1, ko: '마당' }, flower: { walk: 0, ko: '화단' }
  };
  M2.toScreen = (R, cx, cy) => [R.ox + M2.HW * (cx - cy), R.oy + M2.HH * (cx + cy)];
  M2.toCell = (R, x, y) => { const a = (x - R.ox) / M2.HW, b = (y - R.oy) / M2.HH; return [(a + b) / 2, (b - a) / 2]; };

  /* ── 지역 만들기: 자료(도형 목록) → 칸 땅 · 걷기 격자 · 건물 ── */
  M2.build = function (src) {
    const W = src.size[0], H = src.size[1];
    const R = { id: src.id, ko: src.ko, W, H, ox: H * M2.HW, oy: 0, g: new Array(W * H).fill(src.fill || 'water'), src };
    R.pxW = (W + H) * M2.HW; R.pxH = (W + H) * M2.HH;
    const set = (x, y, k, onland) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (onland && (R.g[i] === 'water' || R.g[i] === 'bank')) return; R.g[i] = k; };
    for (const op of src.ground || []) {
      if (op.t === 'band') {          // x + y 가 [lo, hi) 인 띠 (가장자리 |x − y| > taper 는 건너뜀)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = x + y; if (s >= op.lo && s < op.hi && (op.taper == null || Math.abs(x - y) <= op.taper)) set(x, y, op.k); }
      } else if (op.t === 'rect') {
        for (let y = op.y; y < op.y + op.h; y++) for (let x = op.x; x < op.x + op.w; x++) set(x, y, op.k, op.onland);
      } else if (op.t === 'line') {   // 칸 따라 꺾이는 선 + 폭(찻길 · 인도 · 설계 3-2) — 점 사이는 가로 · 세로로만(편집 화면이 맞춤)
        for (let i = 1; i < op.pts.length; i++) {
          const [ax, ay] = op.pts[i - 1], [bx, by] = op.pts[i], w = op.w || 1;
          for (let y = Math.min(ay, by); y <= Math.max(ay, by) + w - 1; y++) for (let x = Math.min(ax, bx); x <= Math.max(ax, bx) + w - 1; x++) set(x, y, op.k, op.onland);
        }
      }
    }
    R.lots = (src.lots || []).map(l => Object.assign({}, l));
    R.blds = (src.buildings || []).map(b => {   // 문 칸 · 발자국은 건물 종류가 원본(kinds.js)
      const o = Object.assign({}, b), k = b.kind && M2.BKINDS && M2.BKINDS[b.kind];
      if (k) { o.w = k.foot[0]; o.h = k.foot[1]; o.door = [b.x + k.door[0], b.y + k.door[1]]; o.sprite = k.sprite; }
      return o;
    });
    R.props = (src.props || []).map(p => Object.assign({ k: M2.PKINDS && M2.PKINDS[p.kind] }, p));
    // 64 · 66(11-13 대표님 '차선에 맞게 · 신호등을 사거리 몇 곳에'): 찻길 흐름(차로 방향 · 교차로)을 셈 · 지역 자료 signals 에 적힌 교차로엔 신호등 기둥 둘을 끼움(그 칸에 있던 사물은 비킴)
    R.net = M2.roadNet(R);
    if (M2.PKINDS && M2.PKINDS['pt.traffic_light']) R.net.juncs.filter(j => j.signal).forEach(j => {
      [['pt.traffic_light', [j.x0 - 1, j.y0 - 1], 'y'], ['pt.traffic_light_x', [j.x1 + 1, j.y0 - 1], 'x']].forEach(([kind, c, ax]) => { const k = M2.PKINDS[kind], gk = R.g[c[1] * W + c[0]]; if (!k || !(gk === 'side' || gk === 'plaza' || gk === 'yard')) return;
        R.props = R.props.filter(p => { const f = (p.k && p.k.foot) || [1, 1]; return !(c[0] >= p.at[0] && c[0] < p.at[0] + f[0] && c[1] >= p.at[1] && c[1] < p.at[1] + f[1]); });
        R.props.push({ kind, at: c, k, sig: { j: j.id, ax } }); }); });
    // 63(11-13 대표님 '흔히 아는 주차장 모습으로'): 주차장 덩어리마다 칸 줄 · 통로 · 입구를 정하고(M2.parkLayout) 칸에 맞춰 차를 세움 — 지도 자료는 그대로 · 만들 때만 끼움(59 의 '두 줄마다 흩어 세우기'를 갈아엎음)
    if (M2.PKINDS) {
      const taken = new Set(); R.props.forEach(p => { const f = (p.k && p.k.foot) || [1, 1]; for (let dy = 0; dy < f[1]; dy++) for (let dx = 0; dx < f[0]; dx++) taken.add((p.at[0] + dx) + ',' + (p.at[1] + dy)); });
      R.parks = M2.parkLayout(R, taken);
      const ap = new Set(); R.parks.forEach(P => P.apron.forEach(c => ap.add(c[0] + ',' + c[1])));   // 진입로를 막는 사물(가로수 · 가로등 …)은 비킴
      if (ap.size) R.props = R.props.filter(p => { const f = (p.k && p.k.foot) || [1, 1]; for (let dy = 0; dy < f[1]; dy++) for (let dx = 0; dx < f[0]; dx++) if (ap.has((p.at[0] + dx) + ',' + (p.at[1] + dy))) return false; return true; });
      const CARS = ['pt.car_white', 'pt.car_dark', 'pt.taxi', 'pt.car_white', 'pt.car_dark'];
      if (src.autoPark !== false) R.parks.forEach(P => P.stalls.forEach(s => { const hsh = (((s.x * 73856093) ^ (s.y * 19349663)) >>> 0) % 100; if (hsh >= 72) return;   // 칸의 일곱 할쯤만 참
        const base = CARS[hsh % CARS.length], sx = P.ax === 'x' ? '_x' : '', back = ((hsh >> 2) & 1) && M2.PKINDS[base + '_b' + sx] ? '_b' : '', kind = base + back + sx, k = M2.PKINDS[kind];   // 절반쯤은 뒷모습(거꾸로 댄 차)
        if (k) R.props.push({ kind, at: [s.x, s.y], k, park: 1 }); }));
    }
    R.lots.forEach(l => { if (l.state === 'vacant') for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) set(x, y, 'vacant'); });
    R.exits = src.exits || []; R.entrances = src.entrances || [];
    M2.walkGrid(R);
    // 59: 세운 차가 걷는 칸을 가둬 섬이 생기면(가장 큰 걷는 땅에 안 이어진 칸) 그 둘레 세운 차를 빼고 다시 — 길 시험이 '길 없음'을 잡음
    for (let it = 0; it < 6 && R.props.some(p => p.park); it++) {
      const W = R.W, H = R.H, ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && M2.walkable(R, x + 0.5, y + 0.5), comp = new Int32Array(W * H).fill(-1), size = [];
      for (let s0 = 0; s0 < W * H; s0++) { const sx = s0 % W, sy = (s0 - sx) / W; if (comp[s0] >= 0 || !ok(sx, sy)) continue; const id = size.length, st = [s0]; comp[s0] = id; let n = 0;
        while (st.length) { const q = st.pop(), qx = q % W, qy = (q - qx) / W; n++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = qx + dx, ny = qy + dy, o = ny * W + nx; if (ok(nx, ny) && comp[o] < 0) { comp[o] = id; st.push(o); } }); }
        size.push(n); }
      if (size.length <= 1) break;
      const main = size.indexOf(Math.max(...size)), bad = new Set(); for (let i = 0; i < W * H; i++) if (comp[i] >= 0 && comp[i] !== main) bad.add(i);
      const before = R.props.length;
      R.props = R.props.filter(p => !p.park || ![...Array(4).keys()].some(dy => [-1, 0, 1].some(dx => bad.has((p.at[1] + dy - 1) * W + p.at[0] + dx))));
      if (R.props.length === before) break;
      M2.walkGrid(R);
    }
    return R;
  };
  /* ── 찻길 흐름(64 · 66): 찻길 칸(찻길 · 횡단보도)마다 차가 가는 방향을 정함 — 오른쪽 통행
     - 가로 찻길(x 로 긴 띠)은 아래쪽 절반 줄이 +x · 위쪽 절반이 −x / 세로 찻길은 왼쪽 절반 칸이 +y · 오른쪽 절반이 −y (폭이 넷이어도 같은 식)
     - 두 흐름이 다 있는 칸 = 교차로 칸 · 이어진 교차로 칸 묶음 = 교차로(juncs) · 지역 자료 signals: [[x, y], …] 가 가리키는 교차로는 신호 있음
     - good: (칸, 방향)에서 규칙대로(곧게 · 교차로에서 돌기) 가서 지도 가장자리로 빠져나갈 수 있나 — 차는 good 인 쪽으로만 감(강가에서 끊긴 길로 안 들어감)
     - 방향 번호 0 +x · 1 +y · 2 −x · 3 −y · 오른쪽으로 돌기 = (d + 1) % 4 */
  M2.DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  M2.roadNet = function (R) {
    const W = R.W, H = R.H, N = W * H, D = M2.DIRS, LONG = 4;
    const isR = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (R.g[y * W + x] === 'road' || R.g[y * W + x] === 'cross');
    const hx = new Int16Array(N), vy = new Int16Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isR(x, y)) {
      if (!isR(x - 1, y)) { let n = 0; while (isR(x + n, y)) n++; for (let k = 0; k < n; k++) hx[y * W + x + k] = n; }
      if (!isR(x, y - 1)) { let n = 0; while (isR(x, y + n)) n++; for (let k = 0; k < n; k++) vy[(y + k) * W + x] = n; } }
    const xr = (x, y) => isR(x, y) && hx[y * W + x] > LONG, yr = (x, y) => isR(x, y) && vy[y * W + x] > LONG;
    const fx = new Int8Array(N), fy = new Int8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x;
      if (xr(x, y)) { let u = 0, d = 0; while (xr(x, y - u - 1)) u++; while (xr(x, y + d + 1)) d++; if (u + d) fx[i] = u < (u + d + 1) / 2 ? -1 : 1; }
      if (yr(x, y)) { let l = 0, r = 0; while (yr(x - l - 1, y)) l++; while (yr(x + r + 1, y)) r++; if (l + r) fy[i] = l < (l + r + 1) / 2 ? 1 : -1; } }
    // 한 줄만 남은 칸(강가에서 잘린 모서리)은 같은 줄의 이웃 흐름을 이어받음
    for (let it = 0, ch = 1; ch && it < W + H; it++) { ch = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x;
      if (xr(x, y) && !fx[i]) { const v = (xr(x - 1, y) && fx[i - 1]) || (xr(x + 1, y) && fx[i + 1]); if (v) { fx[i] = v; ch = 1; } }
      if (yr(x, y) && !fy[i]) { const v = (yr(x, y - 1) && fy[i - W]) || (yr(x, y + 1) && fy[i + W]); if (v) { fy[i] = v; ch = 1; } } } }
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const valid = (x, y, d) => inb(x, y) && (d === 0 ? fx[y * W + x] === 1 : d === 2 ? fx[y * W + x] === -1 : d === 1 ? fy[y * W + x] === 1 : fy[y * W + x] === -1);
    const cross = (x, y, d) => { const i = y * W + x; if (d % 2 === 0) return fy[i] === 1 ? 1 : fy[i] === -1 ? 3 : -1; return fx[i] === 1 ? 0 : fx[i] === -1 ? 2 : -1; };   // 이 칸에서 갈아탈 수 있는 다른 축 방향
    // 다음 상태들: 곧게 · (교차로 칸이면) 돌기 — 'exit' = 지도 밖으로 빠짐
    const succ = (x, y, d) => { const out = [], n = [x + D[d][0], y + D[d][1]]; if (!inb(n[0], n[1])) out.push('exit'); else if (valid(n[0], n[1], d)) out.push([n[0], n[1], d]);
      const g = cross(x, y, d); if (g >= 0) { const m = [x + D[g][0], y + D[g][1]]; if (!inb(m[0], m[1])) out.push('exit'); else if (valid(m[0], m[1], g)) out.push([m[0], m[1], g]); } return out; };
    const good = new Uint8Array(N * 4);
    for (let ch = 1; ch;) { ch = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let d = 0; d < 4; d++) { const s = (y * W + x) * 4 + d; if (good[s] || !valid(x, y, d)) continue;
      if (succ(x, y, d).some(q => q === 'exit' || good[(q[1] * W + q[0]) * 4 + q[2]])) { good[s] = 1; ch = 1; } } }
    const ok = (x, y, d) => valid(x, y, d) && !!good[(y * W + x) * 4 + d];
    // 교차로
    const jOf = new Int16Array(N).fill(-1), juncs = [];
    for (let s0 = 0; s0 < N; s0++) { if (jOf[s0] >= 0 || !fx[s0] || !fy[s0]) continue; const id = juncs.length, st = [s0], J = { id, cells: [], x0: W, y0: H, x1: 0, y1: 0, signal: false }; jOf[s0] = id;
      while (st.length) { const q = st.pop(), x = q % W, y = (q - x) / W; J.cells.push([x, y]); J.x0 = Math.min(J.x0, x); J.x1 = Math.max(J.x1, x); J.y0 = Math.min(J.y0, y); J.y1 = Math.max(J.y1, y);
        D.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy, o = ny * W + nx; if (inb(nx, ny) && jOf[o] < 0 && fx[o] && fy[o]) { jOf[o] = id; st.push(o); } }); }
      J.off = ((J.x0 * 7 + J.y0 * 13) % 11) / 11;   // 신호 주기 어긋남(교차로마다 다르게)
      juncs.push(J); }
    ((R.src && R.src.signals) || []).forEach(c => { const j = juncs.find(J => c[0] >= J.x0 && c[0] <= J.x1 && c[1] >= J.y0 && c[1] <= J.y1); if (j) j.signal = true; });
    // 들어오는 자리: 지도 가장자리 칸에서 안쪽으로 향하는 좋은 차로
    const spawns = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (x && y && x < W - 1 && y < H - 1) continue;
      [[0, x === 0], [2, x === W - 1], [1, y === 0], [3, y === H - 1]].forEach(([d, at]) => { if (at && ok(x, y, d)) spawns.push([x, y, d]); }); }
    return { W, H, fx, fy, jOf, juncs, spawns, valid, ok, cross, isR, inb };
  };
  // 신호: 교차로 j 의 시각 t(ms) 때 축마다 빛 — { x: 'g' | 'y' | 'r', y: … } (가로 초록 → 노랑 → 모두 빨강 → 세로 초록 → 노랑 → 모두 빨강)
  M2.SIG = { green: 8000, yellow: 2000, red: 1000 };
  M2.sigPhase = function (j, t) { const S = M2.SIG, half = S.green + S.yellow + S.red, u = ((t + j.off * half * 2) % (half * 2) + half * 2) % (half * 2), a = u < half ? 'x' : 'y', v = u % half;
    const on = v < S.green ? 'g' : v < S.green + S.yellow ? 'y' : 'r'; return a === 'x' ? { x: on, y: 'r' } : { x: 'r', y: on }; };
  /* ── 주차장 짜임(63): 이어진 주차장 칸 덩어리마다 '칸 줄(차 길이 2칸 · 폭 1칸) + 통로 + 입구'
     - 후보: 차가 서는 축 둘(y · x) × 무늬 둘(칸2 통로2 칸2 · 칸2 통로1 칸2) × 어긋남 → 입구 있는 통로에 열린 칸이 가장 많은 것(넓은 통로를 조금 더 침)
     - 통로가 못 들어가는 자투리는 바깥(찻길 · 마당 · 인도)으로 열린 칸만(길가 주차)
     - 돌려줌 [{ ax, cells, stalls: [{ x, y, w, h, m: [dx, dy](열린 쪽), out }], aisle: [[x, y]], ent: [{ x, y, d: [dx, dy](안으로 들어가는 방향), in }] }]
     - 확장: 지역 자료가 주차장 짜임을 직접 정하고 싶으면 이 함수 대신 같은 꼴을 R.parks 에 넣으면 됨(그리기 · 차 세우기는 R.parks 만 봄) */
  M2.parkLayout = function (R, taken) {
    const W = R.W, H = R.H, at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? R.g[y * W + x] : null, OPEN = { road: 1, yard: 1, side: 1, plaza: 1 };
    const seen = new Uint8Array(W * H), parks = [], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const PATS = [{ p: ['a', 'b', 'A', 'A', 'c', 'd'], k: 1.3 }, { p: ['a', 'b', 'A', 'c', 'd'], k: 1 }];
    for (let s0 = 0; s0 < W * H; s0++) {
      if (seen[s0] || R.g[s0] !== 'parking') continue;
      const cells = [], st = [s0]; seen[s0] = 1;
      while (st.length) { const q = st.pop(), x = q % W, y = (q - x) / W; cells.push([x, y]); N4.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy, o = ny * W + nx; if (at(nx, ny) === 'parking' && !seen[o]) { seen[o] = 1; st.push(o); } }); }
      const inC = new Set(cells.map(c => c[0] + ',' + c[1])), has = (x, y) => inC.has(x + ',' + y), free = (x, y) => has(x, y) && !(taken && taken.has(x + ',' + y));
      let best = null;
      for (const ax of ['y', 'x']) {
        const V = (c) => ax === 'y' ? c[1] : c[0], v0 = Math.min(...cells.map(V)), cell = (u, v) => ax === 'y' ? [u, v] : [v, u], dv = ax === 'y' ? [0, 1] : [1, 0];
        for (const pat of PATS) for (let ph = 0; ph < pat.p.length; ph++) {
          const role = (c) => pat.p[(V(c) - v0 + ph) % pat.p.length];
          const aisle = cells.filter(c => role(c) === 'A' && free(c[0], c[1])), aset = new Map(aisle.map((c, i) => [c[0] + ',' + c[1], i]));
          // 통로 덩어리 · 입구(통로 칸이 바깥의 다닐 수 있는 땅과 맞닿은 변)
          const run = new Int32Array(aisle.length).fill(-1), runEnt = [];
          aisle.forEach((c, i) => { if (run[i] >= 0) return; const id = runEnt.length, q = [i], ent = []; run[i] = id;
            while (q.length) { const j = q.pop(), [x, y] = aisle[j]; N4.forEach(([dx, dy]) => { const k = aset.get((x + dx) + ',' + (y + dy)); if (k != null) { if (run[k] < 0) { run[k] = id; q.push(k); } } else if (!has(x + dx, y + dy) && OPEN[at(x + dx, y + dy)]) ent.push({ x, y, d: [-dx, -dy], side: dx * dv[0] + dy * dv[1] === 0 }); }); }
            // 입구는 통로 끝(줄 방향)을 먼저 · 없으면 옆이 트인 곳 하나만
            const ends = ent.filter(e => e.side); runEnt.push(ends.length ? ends : ent.slice(0, 1)); });
          const stalls = []; let score = 0;
          cells.forEach(c => { const rl = role(c); if (rl !== 'a' && rl !== 'c') return;
            const c2 = [c[0] + dv[0], c[1] + dv[1]]; if (!free(c[0], c[1]) || !free(c2[0], c2[1])) return;
            const m = rl === 'a' ? dv : [-dv[0], -dv[1]], mc = rl === 'a' ? [c2[0] + dv[0], c2[1] + dv[1]] : [c[0] - dv[0], c[1] - dv[1]], ai = aset.get(mc[0] + ',' + mc[1]);
            let w8 = 0, out = 0; if (ai != null) w8 = runEnt[run[ai]].length ? 1 : 0.25; else if (!has(mc[0], mc[1]) && OPEN[at(mc[0], mc[1])]) { w8 = 0.5; out = 1; }
            if (!w8) return; score += w8; stalls.push({ x: c[0], y: c[1], w: ax === 'y' ? 1 : 2, h: ax === 'y' ? 2 : 1, m, out }); });
          score *= pat.k;
          if (!best || score > best.score + 1e-9) best = { score, ax, stalls, aisle, runEnt };
        }
      }
      // 입구: 통로 끝들 가운데 찻길에 가장 가까운 묶음 하나(큰 주차장은 둘)만 엶 — 나머지 끝은 턱으로 막힌 막다른 통로
      //   통로가 두 칸이면 들어가는 방향의 오른쪽 칸이 '들어감' · 왼쪽 칸이 '나감'(오른쪽 통행) · apron = 입구에서 찻길까지 인도를 건너는 진입로 칸
      const groups = []; best.runEnt.forEach(L => { const used = new Set(); L.forEach((e, i) => { if (used.has(i)) return; const g = [e]; used.add(i);
        L.forEach((o, j) => { if (!used.has(j) && o.d[0] === e.d[0] && o.d[1] === e.d[1] && Math.abs(o.x - e.x) + Math.abs(o.y - e.y) === 1) { g.push(o); used.add(j); } });
        let far = 9; g.forEach(q => { for (let k = 1; k <= 3; k++) { const gk = at(q.x - q.d[0] * k, q.y - q.d[1] * k); if (gk === 'road') { far = Math.min(far, k); break; } if (!OPEN[gk]) break; } });
        groups.push({ g, far }); }); });
      groups.sort((p, q) => p.far - q.far || q.g.length - p.g.length);
      const ent = [], apron = []; groups.filter((G, i) => i === 0 || (i === 1 && cells.length >= 40 && G.far < 9)).forEach(G => G.g.forEach(e => { const rt = [-e.d[1], e.d[0]], pair = (sg) => G.g.some(o => o !== e && o.x === e.x + sg * rt[0] && o.y === e.y + sg * rt[1]);
        ent.push({ x: e.x, y: e.y, d: e.d, in: pair(1) && !pair(-1) ? 0 : 1 });
        if (G.far < 9) for (let k = 1; k < G.far; k++) apron.push([e.x - e.d[0] * k, e.y - e.d[1] * k]); }));   // 진입로 칸에 선 나무 · 가로등은 build 가 비킴
      parks.push({ ax: best.ax, cells, stalls: best.stalls, aisle: best.aisle, ent, apron });
    }
    return parks;
  };
  M2.groundAt = (R, cx, cy) => { const x = Math.floor(cx), y = Math.floor(cy); return (x < 0 || y < 0 || x >= R.W || y >= R.H) ? null : R.g[y * R.W + x]; };

  /* ── 걷기 격자(반 칸) ── */
  M2.walkGrid = function (R) {
    const W2 = R.W * 2, H2 = R.H * 2, ok = new Uint8Array(W2 * H2), cost = new Float32Array(W2 * H2).fill(1);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) { const G = M2.GROUND[R.g[(y >> 1) * R.W + (x >> 1)]]; ok[y * W2 + x] = G && G.walk ? 1 : 0; if (G && G.cost) cost[y * W2 + x] = G.cost; }
    R.props.forEach(p => { if (!p.k || !p.k.blocks) return; for (let y = p.at[1] * 2; y < (p.at[1] + p.k.foot[1]) * 2; y++) for (let x = p.at[0] * 2; x < (p.at[0] + p.k.foot[0]) * 2; x++) if (x >= 0 && y >= 0 && x < W2 && y < H2) ok[y * W2 + x] = 0; });
    R.blds.forEach(b => { for (let y = b.y * 2; y < (b.y + b.h) * 2; y++) for (let x = b.x * 2; x < (b.x + b.w) * 2; x++) if (x >= 0 && y >= 0 && x < W2 && y < H2) ok[y * W2 + x] = 0; });
    R.wg = { W: W2, H: H2, ok, cost };
  };
  const hc = (R, cx, cy) => [Math.floor(cx * 2), Math.floor(cy * 2)];
  M2.walkable = (R, cx, cy) => { const [x, y] = hc(R, cx, cy), g = R.wg; return x >= 0 && y >= 0 && x < g.W && y < g.H && !!g.ok[y * g.W + x]; };
  // 화면 두 점 사이가 모두 걸을 곳인가(4px마다 검사) · maxCost 를 주면 그보다 비싼 땅(찻길 등)을 지나는 선도 안 됨 — 곧게 당기기가 찻길을 가로지르지 않게
  M2.costAt = (R, cx, cy) => { const [x, y] = hc(R, cx, cy), g = R.wg; return x >= 0 && y >= 0 && x < g.W && y < g.H ? g.cost[y * g.W + x] : 99; };
  M2.clear = function (R, a, b, maxCost) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 4));
    for (let i = 0; i <= n; i++) { const t = i / n, c = M2.toCell(R, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); if (!M2.walkable(R, c[0], c[1])) return false; if (maxCost != null && M2.costAt(R, c[0], c[1]) > maxCost + 1e-6) return false; }
    return true;
  };
  // 반 칸 가운데의 화면 점
  const hcCenter = (R, x, y) => M2.toScreen(R, (x + 0.5) / 2, (y + 0.5) / 2);
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  // 화면 점 → 화면 점 · 돌려줌: 화면 점 배열(첫 점 뺌) 또는 null(길 없음)
  M2.pathTo = function (R, from, to) {
    const g = R.wg, W = g.W;
    const fc = M2.toCell(R, from[0], from[1]), tc = M2.toCell(R, to[0], to[1]);
    let [sx, sy] = hc(R, fc[0], fc[1]); let [tx, ty] = hc(R, tc[0], tc[1]);
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < g.H;
    let snapped = false;   // 막힌 곳을 누르면 가장 가까운 걸을 자리로 맞춤(11-13 대표님 '자유롭게 이동')
    if (!inb(tx, ty) || !g.ok[ty * W + tx]) { const n = M2.nearest(R, Math.max(0, Math.min(W - 1, tx)), Math.max(0, Math.min(g.H - 1, ty))); if (!n) return null; [tx, ty] = n; snapped = true; }
    if (!inb(sx, sy) || !g.ok[sy * W + sx]) { const n = M2.nearest(R, sx, sy); if (!n) return null; [sx, sy] = n; }
    const s = sy * W + sx, t = ty * W + tx, N = W * g.H;
    const gs = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const T = hcCenter(R, tx, ty), h = (x, y) => { const p = hcCenter(R, x, y); return Math.hypot(p[0] - T[0], p[1] - T[1]); };
    // 열린 목록 = 이진 힙(11-13 구조 정리 걸음 12 — 전엔 매번 처음부터 훑어 가장 작은 값을 찾아 큰 지역에서 최대 20ms 넘게 튐)
    const hf = [], hc2 = [];
    const push = (f, c) => { let i = hf.length; hf.push(f); hc2.push(c); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hc2[i] = hc2[p]; i = p; } hf[i] = f; hc2[i] = c; };
    const pop = () => { const top = hc2[0], lf = hf.pop(), lc = hc2.pop(), n = hf.length; if (n) { let i = 0; for (;;) { let m = 2 * i + 1; if (m >= n) break; if (m + 1 < n && hf[m + 1] < hf[m]) m++; if (hf[m] >= lf) break; hf[i] = hf[m]; hc2[i] = hc2[m]; i = m; } hf[i] = lf; hc2[i] = lc; } return top; };
    push(h(sx, sy), s); gs[s] = 0;
    while (hf.length) {
      const c = pop();
      if (done[c]) continue; done[c] = 1; if (c === t) break;
      const x = c % W, y = (c / W) | 0, pc = hcCenter(R, x, y);
      for (const [dx, dy] of N8) {
        const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue; const j = ny * W + nx; if (!g.ok[j] || done[j]) continue;
        if (dx && dy && (!g.ok[y * W + nx] || !g.ok[ny * W + x])) continue;   // 모서리 끼어 지나가기 막기
        const pn = hcCenter(R, nx, ny), ng = gs[c] + Math.hypot(pn[0] - pc[0], pn[1] - pc[1]) * g.cost[j];   // 비용 = 화면 거리 × 땅 값(걷는 빠르기는 같고, 찻길은 되도록 피함)
        if (ng < gs[j]) { gs[j] = ng; prev[j] = c; push(ng + h(nx, ny), j); }
      }
    }
    if (s !== t && prev[t] < 0) return null;   // 길이 없으면 걷지 않음(설계 3-6 — 곧장 가지 않음)
    const cells = []; for (let c = t; c >= 0 && c !== s; c = prev[c]) cells.push(c); cells.reverse();
    const pts = cells.map(c => hcCenter(R, c % W, (c / W) | 0));
    if (!pts.length) pts.push(hcCenter(R, tx, ty));
    if (!snapped) { pts[pts.length - 1] = to.slice(); if (!M2.clear(R, pts[pts.length - 1], pts[pts.length - 1])) pts[pts.length - 1] = hcCenter(R, tx, ty); }
    // 곧게 당기기: 보이는 데까지 건너뜀(당긴 선도 걷는 곳 안인지 검사)
    const out = []; let cur = from.slice(), i = 0;
    const cAt = (p) => { const q = M2.toCell(R, p[0], p[1]); return M2.costAt(R, q[0], q[1]); };
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !M2.clear(R, cur, pts[j], Math.max(cAt(cur), cAt(pts[j])))) j--; out.push(pts[j]); cur = pts[j]; i = j + 1; }
    return out;
  };
  M2.nearest = function (R, x0, y0) {   // 가장 가까운 걸을 반 칸
    const g = R.wg; for (let r = 1; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = x0 + dx, y = y0 + dy; if (x >= 0 && y >= 0 && x < g.W && y < g.H && g.ok[y * g.W + x]) return [x, y]; }
    return null;
  };
  M2.pathLen = (from, pts) => { let L = 0, c = from; for (const p of pts) { L += Math.hypot(p[0] - c[0], p[1] - c[1]); c = p; } return L; };

  /* ── 깊이: 겹치는 것끼리 발자국 상자로 앞뒤 · 위상 정렬 ── 항목 {x0, y0, x1, y1(칸 상자), sb:[l,t,r,b](화면 사각형)} */
  M2.depthSort = function (items) {
    const n = items.length, after = items.map(() => []), indeg = new Array(n).fill(0);
    const ov = (a, b) => a.sb[0] < b.sb[2] && b.sb[0] < a.sb[2] && a.sb[1] < b.sb[3] && b.sb[1] < a.sb[3];
    const front = (a, b) => (a.x0 >= b.x1 - 1e-6) || (a.y0 >= b.y1 - 1e-6);   // a 가 b 보다 +x 또는 +y 쪽(화면 앞)
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = items[i], B = items[j]; if (!ov(A, B)) continue;
      const af = front(A, B), bf = front(B, A);
      if (af && !bf) { after[j].push(i); indeg[i]++; } else if (bf && !af) { after[i].push(j); indeg[j]++; }
      else { const k = (A.x0 + A.x1 + A.y0 + A.y1) - (B.x0 + B.x1 + B.y0 + B.y1); if (k > 0) { after[j].push(i); indeg[i]++; } else { after[i].push(j); indeg[j]++; } }
    }
    const q = [], out = []; for (let i = 0; i < n; i++) if (!indeg[i]) q.push(i);
    q.sort((a, b) => items[a].sb[3] - items[b].sb[3]);
    while (q.length) { const i = q.shift(); out.push(items[i]); for (const j of after[i]) if (--indeg[j] === 0) q.push(j); }
    const cyc = items.filter((_, i) => indeg[i] > 0);
    cyc.forEach(it => { it.cycle = true; out.push(it); });   // 맞물림 — 편집 화면이 빨갛게 표시할 것
    return out;
  };
  // 건물 상자의 화면 사각형(높이 포함)
  M2.boxScreen = function (R, b) {
    const P = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map(([x, y]) => M2.toScreen(R, x, y));
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys) - (b.z || 40), Math.max(...xs), Math.max(...ys)];
  };
  // 건물 문 앞 화면 점
  M2.doorPt = (R, b) => M2.toScreen(R, b.door[0] + 0.5, b.door[1] + 0.5);

  // 씨앗 있는 주사위(mulberry32) — 지도 무리(차 · 길 시험 · 편집 화면)는 이것 하나(11-14 밤 정리 · 지도는 엔진 SH 에 기대지 않음)
  M2.seeded = (s) => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* 걷기 · 보는 틀 — 본 게임 지도(ui/world.js) · 행인(ui/npc.js) · 지도 편집 화면(block.html)이 같이 씀(11-14 큰 짜임: 셋이 같은 셈을 따로 한 벌씩 갖고 있었음) */
  M2.dir4 = (dx, dy) => (dy >= 0 ? (dx >= 0 ? 'SE' : 'SW') : (dx >= 0 ? 'NE' : 'NW'));   // 대각선 시트 넷 — 가는 쪽의 사분면
  // 길(o.path 의 점들)을 left 만큼 따라 걸음: o.pos · o.path · o.dir · o.walked 를 고침 · 다음 점이 turn 보다 멀 때만 몸을 돌림
  M2.walkAlong = function (o, left, turn) {
    while (left > 0 && o.path.length) {
      const p = o.path[0], dx = p[0] - o.pos[0], dy = p[1] - o.pos[1], d = Math.hypot(dx, dy);
      if (d > turn) o.dir = M2.dir4(dx, dy);
      if (d <= left) { o.pos = p.slice(); o.path.shift(); left -= d; o.walked += d; } else { o.pos = [o.pos[0] + dx / d * left, o.pos[1] + dy / d * left]; o.walked += left; left = 0; }
    }
  };
  // 보는 틀 v = { cam, zoom } · 화면 칸 w × h — 지역 좌표 ↔ 화면 좌표
  M2.toView = (v, w, h, p) => [(p[0] - v.cam[0]) * v.zoom + w / 2, (p[1] - v.cam[1]) * v.zoom + h / 2];
  M2.fromView = (v, w, h, p) => [(p[0] - w / 2) / v.zoom + v.cam[0], (p[1] - h / 2) / v.zoom + v.cam[1]];
  M2.camEase = (cam, t, snap) => (snap ? t : [cam[0] + (t[0] - cam[0]) * 0.15, cam[1] + (t[1] - cam[1]) * 0.15]);   // 카메라가 목표로 천천히 따라옴(snap 이면 바로)
  M2.exitAt = (R, pos) => { const c = M2.toCell(R, pos[0], pos[1]), cx = Math.floor(c[0]), cy = Math.floor(c[1]); return R.exits.find(e => e.cells.some(q => q[0] === cx && q[1] === cy)); };   // 발이 밟은 출구 칸(없으면 undefined)

  if (typeof module !== 'undefined') module.exports = M2;
})(typeof window !== 'undefined' ? window : globalThis);
