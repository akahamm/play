/* =====================================================================
   map2/traffic.js — 움직이는 차(64 · 66 · 11-13 대표님 '차선에 맞게 · 뒤로 가지 않게 · 여러 상황을 따져 · 빨간불에 서게')
   - 그리기 없음 · 화면(ui/map.js)과 시험(tools/traffic_test.js)이 같이 씀 · 찻길 흐름 · 교차로 · 신호는 iso.js roadNet / sigPhase
   - 차 한 대: 차로 가운데를 따라 곧게 · 교차로에 닿기 전에 갈 길(곧게 · 오른쪽 · 왼쪽)을 정해 그 차로와 만나는 점에서 돎 · 지도 가장자리로 빠지면 다른 가장자리에서 새로 들어옴
   - 서는 때: ① 신호 교차로의 빨강 · 노랑(정지선 앞) ② 교차로 안에 길이 겹치는 차가 있을 때(같은 쪽에서 온 차 · 맞은편에서 곧게/오른쪽으로 가는 차끼리만 같이 들어감)
     ③ 나갈 차로가 막혔을 때(교차로 안에 서지 않음) ④ 앞차 · 가로지르는 차와의 간격 ⑤ 차 앞의 사람 ⑥ 사람이 건너는 횡단보도 앞
   - 좌표는 칸(소수) · 방향 번호 0 +x · 1 +y · 2 −x · 3 −y · 빠르기 칸/ms
   - 쓰는 법: T = M2.trafficMake(R, n, rnd) → 장마다 M2.trafficStep(T, R, dt, peds) (peds = 사람 자리 [[칸x, 칸y], …]) → T.cars 를 그림(M2.carLook 이 그림 · 뒤집기 · 발자국을 돌려줌)
   ===================================================================== */
(function (root) {
  const M2 = root.M2 = root.M2 || {};
  const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const HALF = 0.36;            // 차 몸 반 폭(칸)
  const STOP = 0.8;             // 교차로 선에서 이만큼 앞에 섬 — 교차로 안에서 돈 차의 꽁무니(반 칸)가 기다리는 차에 안 닿게
  const KINDS = ['pt.car_white', 'pt.car_dark', 'pt.taxi', 'pt.car_white', 'pt.car_dark', 'pt.taxi', 'pt.bus'];
  const lenOf = (k) => { const pk = M2.PKINDS && M2.PKINDS[k]; return pk ? Math.max(pk.foot[0], pk.foot[1]) : 2; };
  const along = (p, d) => p[0] * D[d][0] + p[1] * D[d][1];            // 방향 d 쪽으로 잰 자리
  const side = (p, d) => d % 2 === 0 ? p[1] : p[0];                    // 차로 옆쪽 자리
  // 차 몸이 덮는 네모 [x0, y0, x1, y1]
  //   도는 점 둘레에선 몸을 짧게 봄(fe 앞 · re 뒤): 그 자리에서 방향이 바뀌므로, 돌기 직전엔 앞이 · 돈 직후엔 꽁무니가 옆 차로로 삐져나온 것으로 치지 않음(차 꽁무니가 따라 도는 것을 흉내)
  const body = (c) => { const f = c.fe == null ? c.L / 2 : c.fe, r = c.re == null ? c.L / 2 : c.re, s = D[c.d][0] + D[c.d][1], a = s > 0 ? -r : -f, b = s > 0 ? f : r;
    return c.d % 2 === 0 ? [c.pos[0] + a, c.pos[1] - HALF, c.pos[0] + b, c.pos[1] + HALF] : [c.pos[0] - HALF, c.pos[1] + a, c.pos[0] + HALF, c.pos[1] + b]; };
  const span = (B, d) => d === 0 ? [B[0], B[2]] : d === 2 ? [-B[2], -B[0]] : d === 1 ? [B[1], B[3]] : [-B[3], -B[1]];   // 네모를 방향 d 쪽으로 잰 구간
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

  M2.trafficMake = function (R, n, rnd) {
    const net = R.net, T = { t: 0, cars: [], rnd: rnd || Math.random };
    if (!net || !net.spawns.length) return T;
    // 처음엔 길 곳곳에(교차로 · 횡단보도 밖) 흩어 놓음 — 서로 두 칸 넘게 떨어지게
    const slots = []; for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) { if (net.jOf[y * R.W + x] >= 0 || R.g[y * R.W + x] !== 'road') continue; for (let d = 0; d < 4; d++) if (net.ok(x, y, d)) slots.push([x, y, d]); }
    for (let i = 0; i < n && slots.length; i++) {
      const k = KINDS[i % KINDS.length], car = { k, L: lenOf(k), pos: [0, 0], d: 0, v: 0, cruise: (k === 'pt.bus' ? 0.0036 : 0.0044) + T.rnd() * 0.0012, plan: null, inJ: -1, still: 0, alpha: 1, out: 0 };
      let placed = false;
      for (let t = 0; t < 40 && !placed; t++) { const s = slots[(T.rnd() * slots.length) | 0]; car.pos = [s[0] + 0.5, s[1] + 0.5]; car.d = s[2];
        const b = body(car), far = [b[0] - 2.5, b[1] - 2.5, b[2] + 2.5, b[3] + 2.5], ends = [car.pos[0] - D[s[2]][0] * car.L / 2, car.pos[1] - D[s[2]][1] * car.L / 2, car.pos[0] + D[s[2]][0] * car.L / 2, car.pos[1] + D[s[2]][1] * car.L / 2].map(Math.floor);
        // 차 몸 양 끝 칸도 같은 차로여야 함(교차로에 걸치지 않게)
        if (!net.ok(ends[0], ends[1], s[2]) || !net.ok(ends[2], ends[3], s[2]) || net.jOf[ends[1] * R.W + ends[0]] >= 0 || net.jOf[ends[3] * R.W + ends[2]] >= 0) continue;
        if (!T.cars.some(o => hit(far, body(o)))) placed = true; }
      if (!placed) { car.out = 1; car.wait = 500 + T.rnd() * 3000; }
      T.cars.push(car);
    }
    return T;
  };

  // 교차로에 들어가기 전에 갈 길을 정함 — 들어가는 칸 e 에서 곧게 가며 만나는 교차로 칸마다 '여기서 돌기'를 모으고, 끝까지 가면 '곧게'
  function choose(T, R, car, e) {
    const net = R.net, J = net.jOf[e[1] * R.W + e[0]], d = car.d, opts = [];
    let c = e.slice(), beyond = null;
    for (let guard = 0; guard < 12; guard++) {
      if (net.jOf[c[1] * R.W + c[0]] !== J) { beyond = c; break; }
      const g = net.cross(c[0], c[1], d);
      if (g >= 0) { const m = [c[0] + D[g][0], c[1] + D[g][1]]; if (!net.inb(m[0], m[1]) || net.ok(m[0], m[1], g)) opts.push({ type: g === (d + 1) % 4 ? 'R' : 'L', turn: [c[0] + 0.5, c[1] + 0.5], g, w: 2 }); }
      const nx = [c[0] + D[d][0], c[1] + D[d][1]];
      if (!net.inb(nx[0], nx[1])) { opts.push({ type: 'S', turn: null, g: d, w: car.L > 2 ? 9 : 3 }); break; }
      if (!net.valid(nx[0], nx[1], d)) break;
      c = nx;
    }
    if (beyond && net.ok(beyond[0], beyond[1], d)) opts.push({ type: 'S', turn: null, g: d, w: car.L > 2 ? 9 : 3 });
    if (!opts.length) return null;
    if (car.L > 2 && opts.some(o => o.type === 'S')) opts.splice(0, opts.length, ...opts.filter(o => o.type === 'S'));   // 긴 차(버스)는 곧게 갈 수 있으면 곧게만
    let r = T.rnd() * opts.reduce((a, o) => a + o.w, 0), pick = opts[0]; for (const o of opts) { r -= o.w; if (r <= 0) { pick = o; break; } }
    const j = net.juncs[J];
    // 들어가는 선 · 나가는 선(방향 쪽으로 잰 자리) · 나가서 설 자리(나갈 차로 첫머리)
    const edge = (dd, into) => dd === 0 ? (into ? j.x0 : j.x1 + 1) : dd === 2 ? -(into ? j.x1 + 1 : j.x0) : dd === 1 ? (into ? j.y0 : j.y1 + 1) : -(into ? j.y1 + 1 : j.y0);
    const lane = pick.turn ? pick.turn : car.pos, gd = pick.g, ex = edge(gd, false);
    // 나갈 차로에서 차 몸 + 여유가 들어갈 네모
    const a0 = ex, a1 = ex + car.L + 0.7, sv = side(lane, gd), box = gd % 2 === 0 ? [Math.min(a0, a1) * D[gd][0], sv - HALF, Math.max(a0, a1) * D[gd][0], sv + HALF] : [sv - HALF, Math.min(a0, a1) * D[gd][1], sv + HALF, Math.max(a0, a1) * D[gd][1]];
    const fix = (b) => [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])];
    return { J, type: pick.type, turn: pick.turn, g: gd, from: d, enter: edge(d, true), leave: ex, exitBox: fix(box), turned: !pick.turn };
  }
  function canEnter(T, R, car) {
    const p = car.plan, j = R.net.juncs[p.J];
    if (j.signal && M2.sigPhase(j, T.t)[p.from % 2 === 0 ? 'x' : 'y'] !== 'g') return false;
    for (const o of T.cars) { if (o === car || o.out) continue;
      if (o.inJ === p.J) { const same = o.plan.from === p.from, opp = o.plan.from === (p.from + 2) % 4; if (!(same || (opp && o.plan.type !== 'L' && p.type !== 'L'))) return false; }
      if (o.inJ !== p.J && o.v < 0.0015 && hit(p.exitBox, body(o))) return false;   // 나갈 자리에 선 차가 있으면 교차로에 안 들어감
    }
    return true;
  }

  M2.trafficStep = function (T, R, dt, peds) {
    const net = R.net; if (!net) return; T.t += dt; peds = peds || [];
    const W = R.W, H = R.H, gAt = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? R.g[y * W + x] : null;
    for (const car of T.cars) {
      if (car.out) {   // 지도 밖에서 기다리다 빈 가장자리 차로로 들어옴
        car.wait -= dt; if (car.wait > 0) continue;
        const s = net.spawns[(T.rnd() * net.spawns.length) | 0], d = s[2], pos = [s[0] + 0.5 - D[d][0] * (car.L / 2 + 0.5), s[1] + 0.5 - D[d][1] * (car.L / 2 + 0.5)];
        const probe = { pos: [pos[0] + D[d][0] * 2, pos[1] + D[d][1] * 2], d, L: car.L + 4 };
        if (T.cars.some(o => o !== car && !o.out && hit(body(probe), body(o)))) { car.wait = 600; continue; }
        car.pos = pos; car.d = d; car.v = car.cruise * 0.8; car.plan = null; car.inJ = -1; car.out = 0; car.still = 0; car.alpha = 0; car.since = null; car.fe = car.re = car.L / 2;
      }
      let d = car.d, limit = 99, why = '';
      car.fe = car.plan && !car.plan.turned ? Math.min(car.L / 2, HALF + Math.max(0, along(car.plan.turn, d) - along(car.pos, d))) : car.L / 2;
      car.re = car.since == null ? car.L / 2 : Math.min(car.L / 2, HALF + car.since);
      const front = along(car.pos, d) + car.fe;
      // 갈 길: 앞쪽 여섯 칸 안에 교차로가 있으면 정함
      if (!car.plan) { const c0 = [Math.floor(car.pos[0]), Math.floor(car.pos[1])];
        for (let k = 0; k <= 6; k++) { const c = [c0[0] + D[d][0] * k, c0[1] + D[d][1] * k]; if (!net.inb(c[0], c[1])) break; if (net.jOf[c[1] * W + c[0]] >= 0) { car.plan = choose(T, R, car, c); break; } } }
      const p = car.plan;
      if (p && car.inJ !== p.J) { const gap = p.enter - front;
        if (canEnter(T, R, car)) { if (gap <= STOP + 0.05) car.inJ = p.J; } else if (gap - STOP < limit) { limit = gap - STOP; why = 'sig'; } }
      // 앞을 봄: 도는 점까지만(돌고 나면 새 방향으로 다시 봄)
      const look = p && !p.turned ? Math.max(0, along(p.turn, d) - along(car.pos, d)) : 3, sv = side(car.pos, d);
      for (const o of T.cars) { if (o === car || o.out) continue;
        const B = body(o), sp = span(B, d), lat = d % 2 === 0 ? [B[1], B[3]] : [B[0], B[2]];
        if (lat[0] >= sv + HALF - 0.02 || lat[1] <= sv - HALF + 0.02 || along(o.pos, d) <= along(car.pos, d) || sp[0] >= front + look) continue;
        const gap = sp[0] - front - 0.45; if (gap < limit) { limit = gap; why = 'car'; } }
      // 돌 자리: 돈 뒤 차 몸이 놓일 자리(새 방향으로 반 길이 + 간격)에 다른 차가 있으면 도는 점 앞에서 기다림(같이 도는 앞차 꽁무니)
      if (p && !p.turned) { const g = p.g, tp = { pos: [p.turn[0] + D[g][0] * (car.L / 4 + 0.25), p.turn[1] + D[g][1] * (car.L / 4 + 0.25)], d: g, L: car.L / 2 + 0.5 }, tb = body(tp);
        if (T.cars.some(o => o !== car && !o.out && hit(tb, body(o))) && look - 0.02 < limit) { limit = look - 0.02; why = 'car'; } }
      for (const q of peds) { const qa = along(q, d) - front; if (Math.abs(side(q, d) - sv) < 0.6 && qa > -0.3 && qa < 1.5 && qa - 0.5 < limit) { limit = qa - 0.5; why = 'ped'; } }
      // 횡단보도: 앞쪽 두 칸 안의 횡단보도에 사람이 있으면 그 앞에서
      for (let k = 0; k <= 2; k++) { const fp = [car.pos[0] + D[d][0] * (car.L / 2 + k), car.pos[1] + D[d][1] * (car.L / 2 + k)], c = [Math.floor(fp[0]), Math.floor(fp[1])];
        if (gAt(c[0], c[1]) !== 'cross') continue;
        const near = d === 0 ? c[0] : d === 2 ? -(c[0] + 1) : d === 1 ? c[1] : -(c[1] + 1); if (near < front - 0.05) continue;   // 이미 올라섰으면 지나감
        const lineOf = (q) => d % 2 === 0 ? Math.floor(q[0]) === c[0] : Math.floor(q[1]) === c[1];
        if (peds.some(q => lineOf(q) && gAt(Math.floor(q[0]), Math.floor(q[1])) === 'cross' && Math.abs(side(q, d) - sv) < 2.2) && near - front - 0.2 < limit) { limit = near - front - 0.2; why = 'ped'; } }
      // 빠르기: 남은 거리에 맞춰 줄임 · 천천히 붙음
      const target = limit <= 0.03 ? 0 : Math.min(car.cruise, 0.0005 + limit * 0.0032);
      car.v += Math.max(-0.00003 * dt, Math.min(0.000005 * dt, target - car.v)); if (limit <= 0.03 || car.v < 0) car.v = 0;
      let step = Math.max(0, Math.min(car.v * dt, limit));
      if (p && !p.turned) { const dturn = along(p.turn, d) - along(car.pos, d);
        if (step >= dturn) { car.pos = p.turn.slice(); step = Math.min(step - dturn, 0.15); car.d = d = p.g; p.turned = true; car.since = 0; car.re = HALF; car.fe = car.L / 2; } }
      if (car.since != null) { car.since += step; car.re = Math.min(car.L / 2, HALF + car.since); if (car.since >= car.L / 2 - HALF) car.since = null; }
      car.pos = [car.pos[0] + D[d][0] * step, car.pos[1] + D[d][1] * step];
      car.still = step > 1e-6 ? 0 : car.still + dt; car.why = step > 1e-6 ? '' : why;
      // 교차로를 다 빠져나오면 갈 길을 비움
      if (p && car.inJ === p.J && p.turned && along(car.pos, d) - car.L / 2 >= p.leave) { car.inJ = -1; car.plan = null; }
      // 지도 가장자리: 흐려지며 빠짐
      const m = Math.min(car.pos[0], car.pos[1], W - car.pos[0], H - car.pos[1]);
      car.alpha = Math.max(0, Math.min(1, (m + 0.6) / 1.6));
      if (m < -(car.L / 2 + 0.4) || car.still > 40000 || !net.isR(Math.floor(car.pos[0]), Math.floor(car.pos[1])) && m > 0) { car.out = 1; car.wait = 400 + T.rnd() * 2600; car.inJ = -1; car.plan = null; }
    }
  };
  // 그릴 때: 방향에 맞는 그림(앞모습 · 뒷모습 · 좌우 뒤집기)과 발자국
  //   +y(왼쪽 아래로) = 앞모습 그대로 · +x(오른쪽 아래로) = 앞모습 뒤집음 · −y(오른쪽 위로) = 뒷모습(종류_b) · −x(왼쪽 위로) = 뒷모습 뒤집음 · 뒷모습 그림이 없으면 앞모습
  M2.carLook = function (car) {
    const pk = M2.PKINDS[car.k], back = car.d >= 2, bk = back && M2.PKINDS[car.k + '_b'], k = bk || pk, alongX = car.d % 2 === 0, L = car.L;
    return { sprite: k.sprite, h: k.h, flip: alongX, x0: alongX ? car.pos[0] - L / 2 : car.pos[0] - 0.5, y0: alongX ? car.pos[1] - 0.5 : car.pos[1] - L / 2, x1: alongX ? car.pos[0] + L / 2 : car.pos[0] + 0.5, y1: alongX ? car.pos[1] + 0.5 : car.pos[1] + L / 2 };
  };
  M2.carBody = body;
  if (typeof module !== 'undefined') module.exports = M2;
})(typeof window !== 'undefined' ? window : globalThis);
