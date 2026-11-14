/* =====================================================================
   ui/npc.js — 지도의 행인(걷기 · 말풍선) · 차 걸음 넘기기(차 움직임 자체는 map2/traffic.js)
   - npcMake · npcStep(.say · .draw) · npcItems — ui/world.js 의 고리(w2Loop) · 그리기(w2Draw)가 부름
   - 11-14 큰 짜임: ui/map.js 에서 떼어 냄
   ===================================================================== */
/* ── 행인(11-13 대표님 '장소 안 + 행인') — 인도를 오가는 사람들 · 그림은 img/npc(주인공 시트와 같은 칸 65×101 · 5칸 × 4줄)
   칸마다 숫자: 점심 · 주말엔 많이 · 밤엔 적게 · 지역마다 따로 · 길 찾기는 주인공과 같은 반 칸 격자 · 누르기 시험엔 안 만듦 */
const NPC_KINDS = ['npc_salaryman', 'npc_office_woman', 'npc_student', 'npc_ajumma', 'npc_delivery', 'npc_grandpa'];
const NPC_IMG = {};
// 51(11-13 대표님 '행인 걷는 모션이 어색 · 주인공과 같은 기준' · ㉡): 불러올 때 칸마다 몸의 발끝을 칸 아래 3px · 몸 가운데를 칸 가운데로 다시 놓음(칸마다 몸 자리가 흔들리던 것) · 화소를 못 읽으면(파일로 연 게임) 그대로
const npcImg = (k) => { if (!NPC_IMG[k]) { const im = new Image(); im.onload = () => { try {
    const cw = HSHEET.cw, ch = HSHEET.ch, cols = Math.round(im.naturalWidth / cw), rows = Math.round(im.naturalHeight / ch), src = document.createElement('canvas'); src.width = im.naturalWidth; src.height = im.naturalHeight;
    const sg = src.getContext('2d'); sg.drawImage(im, 0, 0); const d = sg.getImageData(0, 0, src.width, src.height).data, out = document.createElement('canvas'); out.width = src.width; out.height = src.height; const og = out.getContext('2d');
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { let x0 = cw, x1 = -1, y1 = -1;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[((r * ch + y) * src.width + c * cw + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y; }
      if (x1 < 0) continue; const dx = Math.round(cw / 2 - (x0 + x1) / 2), dy = (ch - 3) - y1;
      og.drawImage(src, c * cw, r * ch, cw, ch, c * cw + dx, r * ch + dy, cw, ch); }
    NPC_IMG[k] = out; } catch (e) { /* 그대로 씀 */ } }; im.src = `img/npc/${k}.png`; NPC_IMG[k] = im; } return NPC_IMG[k]; };
function npcSpots(r) {   // 걸을 수 있는 인도 칸(한 번 모아 둠)
  if (r.npcSpots) return r.npcSpots;
  const out = []; for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) if ((r.g[y * r.W + x] === 'side' || r.g[y * r.W + x] === 'plaza') && M2.walkable(r, x + 0.5, y + 0.5)) out.push([x, y]);
  return (r.npcSpots = out);
}
function npcMake(z) {
  const r = z.r, kind = z.P && z.P.slot && z.P.slot.kind, n = SHOT_STILL ? 0 : { lunch: 20, weekend: 16, work: 12, evening: 8 }[kind] || 10;
  const spots = npcSpots(r), near = spots.filter(c => { const p = M2.toScreen(r, c[0] + 0.5, c[1] + 0.5); return Math.hypot(p[0] - z.pos[0], p[1] - z.pos[1]) < 900; });
  const pick = (i) => { const L = i % 3 && near.length ? near : spots; return L[(Math.random() * L.length) | 0]; };   // 셋 중 둘은 주인공 둘레 — 화면에 보이게
  z.npcs = Array.from({ length: Math.round(n * (r.id === 'ydp' ? 0.8 : 1)) }, (_, i) => {
    const c = pick(i), k = NPC_KINDS[i % NPC_KINDS.length];
    return { k, pos: M2.toScreen(r, c[0] + 0.5, c[1] + 0.5), dir: 'SE', frame: 0, path: null, wait: Math.random() * 3000, walked: 0, sp: WALK_SPEED * (k === 'npc_grandpa' ? 0.3 : 0.35 + Math.random() * 0.1) };   // 68(11-13 대표님 '너무 빠름 · 절반쯤'): 주인공의 0.35~0.45배(할아버지 0.3)
  });
  // 64 · 66(11-13 대표님 '차선에 맞게 · 뒤로 가지 않게 · 빨간불에 서게'): 차는 map2/traffic.js 가 움직임(오른쪽 통행 차로 · 교차로에서 돌기 · 신호 · 앞차 간격 · 사람 앞 멈춤 · 지도 가장자리로 빠지고 새로 들어옴)
  //   사진 시험: ?shot=map&traf=10&trafms=20000 이면 정해진 씨앗으로 차 10대를 20초 미리 굴린 모습(늘 같은 사진)
  const tq = new URLSearchParams(location.search), nc = SHOT_STILL ? +(tq.get('traf') || 0) : Math.round(({ lunch: 9, weekend: 7, work: 8, evening: 5 }[kind] || 6) * (r.id === 'ydp' ? 0.75 : 1));
  const srnd = M2.seeded(20261113);
  z.traf = M2.trafficMake(r, nc, SHOT_STILL ? srnd : null);
  if (SHOT_STILL && nc) { const hp = [M2.toCell(r, z.pos[0], z.pos[1])]; for (let t = 0, T = +(tq.get('trafms') || 20000); t < T; t += 16) M2.trafficStep(z.traf, r, 16, hp); }
  z.npcRegion = r.id;
}
function npcStep(z, dt) {
  if (selfTesting) return;
  if (!z.npcs || z.npcRegion !== z.r.id) npcMake(z);
  const r = z.r, spots = npcSpots(r);
  z.npcs.forEach(n => {
    if (!n.path) { n.wait -= dt; n.frame = 0; if (n.wait > 0) return;
      for (let t = 0; t < 4 && !n.path; t++) { const c = spots[(Math.random() * spots.length) | 0], to = M2.toScreen(r, c[0] + 0.5, c[1] + 0.5);
        if (Math.hypot(to[0] - n.pos[0], to[1] - n.pos[1]) > 700) continue; const P = M2.pathTo(r, n.pos, to); if (P && P.length) n.path = P; }
      n.wait = 1500 + Math.random() * 4000; return; }
    M2.walkAlong(n, n.sp * dt, 0.5);   // 68: 다음 점 방향으로 바로 몸을 돌림(전엔 6px 넘을 때만 바뀌어 짧은 꺾임에서 몸이 늦게 돌았음)
    n.frame = 1 + (Math.floor(n.walked / STRIDE) % 4);
    if (!n.path.length) n.path = null;
  });
  npcStep.say(z, dt);
  // 64: 차 한 걸음 — 사람 자리(행인 · 주인공)를 칸으로 넘겨 차가 사람 앞 · 건너는 횡단보도 앞에서 서게
  if (z.traf && !SHOT_STILL) { const P = z.npcs.map(n => M2.toCell(r, n.pos[0], n.pos[1])); P.push(M2.toCell(r, z.pos[0], z.pos[1])); M2.trafficStep(z.traf, r, Math.min(dt, 50), P); }
}
/* 행인 말풍선(11-14 대표님 '행인들이 말풍선이 있었으면 좋겠음'): 주인공 가까이 있는 행인이 가끔 한마디 — 한 번에 둘까지 · 3초 · 때(출근 · 점심 · 밤 · 주말) · 해 · 사람 종류에 맞춰 */
npcStep.say = function (z, dt) {
  const st = G.st; if (!st || !z.npcs) return;
  z.npcs.forEach(n => { if (n.say && (n.say.t -= dt) <= 0) n.say = null; });
  z.sayWait = (z.sayWait == null ? 2500 : z.sayWait) - dt; if (z.sayWait > 0 || z.npcs.filter(n => n.say).length >= 2) return;
  z.sayWait = 2600 + Math.random() * 3200;
  const near = z.npcs.filter(n => !n.say && Math.hypot(n.pos[0] - z.pos[0], n.pos[1] - z.pos[1]) < 520); if (!near.length) return;
  const n = near[(Math.random() * near.length) | 0], L = SH.D.map_lines.NPC_LINES, sl = z.P && z.P.slot, k = !sl ? 'work' : sl.kind === 'weekend' ? 'weekend' : sl.kind === 'evening' ? 'evening' : sl.kind === 'lunch' ? 'lunch' : 'work';
  const ym = +st.date.slice(0, 4) + (+st.date.slice(5, 7) - 1) / 12;
  let pool = L[k].concat(L[k], L.stock, L.kind[n.k] || []); L.era.forEach(e => { if (ym >= e[0] && ym <= e[1]) pool = pool.concat(e[2], e[2]); });
  let t = pool[(Math.random() * pool.length) | 0]; if (t === z.sayLast) t = pool[(Math.random() * pool.length) | 0]; z.sayLast = t;
  n.say = { text: t, t: 3000 };
};
npcStep.draw = function (z, g) {   // 말풍선은 건물 · 밤 칠하기 뒤에(늘 읽히게)
  if (!z.npcs || z.npcRegion !== z.r.id) return; const hh = HERO_H * M2.HERO_SCALE;
  z.npcs.forEach(n => { if (!n.say) return; g.save(); g.font = "13px 'Galmuri11', sans-serif"; g.textBaseline = 'middle';
    const w = Math.ceil(g.measureText(n.say.text).width) + 16, h = 24, x = Math.round(n.pos[0] - w / 2), y = Math.round(n.pos[1] - hh - h - 8), a = Math.min(1, n.say.t / 300, (3000 - n.say.t) / 200 + 0.2);
    g.globalAlpha = Math.max(0, Math.min(1, a)); g.fillStyle = '#0b0e1a'; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = '#f6eedb'; g.fillRect(x, y, w, h);
    g.fillStyle = '#0b0e1a'; g.fillRect(Math.round(n.pos[0]) - 5, y + h, 10, 4); g.fillStyle = '#f6eedb'; g.fillRect(Math.round(n.pos[0]) - 3, y + h - 1, 6, 4);
    g.fillStyle = '#2a2230'; g.fillText(n.say.text, x + 8, y + h / 2 + 1); g.restore(); });
};
function npcItems(z, g) {   // 깊이 정렬에 넣을 행인
  if (!z.npcs || z.npcRegion !== z.r.id) return [];
  const hh = HERO_H * M2.HERO_SCALE, hw = HSHEET.cw * hh / HSHEET.ch;
  const cars = (z.traf ? z.traf.cars : []).filter(c => !c.out).map(c => M2.R2.carItem(g, z.r, c)).filter(Boolean);   // 64: 방향에 맞는 차 그림
  return cars.concat(z.npcs.map(n => { const im = npcImg(n.k); if (!(im.naturalWidth || (im.getContext && im.width))) return null; const c = M2.toCell(z.r, n.pos[0], n.pos[1]);
    return { x0: c[0] - 0.15, y0: c[1] - 0.15, x1: c[0] + 0.15, y1: c[1] + 0.15, sb: [n.pos[0] - hw / 2, n.pos[1] - hh, n.pos[0] + hw / 2, n.pos[1]],
      draw: () => g.drawImage(im, n.frame * HSHEET.cw, HSHEET.rows[n.dir] * HSHEET.ch, HSHEET.cw, HSHEET.ch, n.pos[0] - hw / 2, n.pos[1] - hh + 3, hw, hh) }; }).filter(Boolean));
}
