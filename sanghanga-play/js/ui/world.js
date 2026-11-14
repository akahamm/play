/* =====================================================================
   ui/world.js — 지도 화면 본체(걸어 다니는 지도 · js/map2 가 그림)
   - 지도 화면 만들기(worldScreen) · 이름표(w2Pins · w2PinPos) · 그리기(w2Draw) · 카메라(w2Cam) · 고리(w2Loop)
   - 걷기(w2Go · w2Advance · walkTo · mapTap) · 지역 넘어가기(w2CheckExit · w2Enter) · 전체 지도(worldOverview) · 주인공 시트 옷 색
   - 11-14 큰 짜임: ui/map.js(71KB)에서 떼어 냄 — 옆 판 · 혼잣말 · 장소 안은 ui/map.js · 다리는 ui/bridge.js · 행인과 차는 ui/npc.js
   - 싣는 차례: map.js → world.js → bridge.js → npc.js(다리 · 행인이 w2Draw · HSHEET 에 붙음)
   ===================================================================== */
// 걷기 시트(대각선 · 11-12 대표님 '지도에 맞춰 대각선으로'): 줄 = 남동 · 남서 · 북동(뒷모습) · 북서(뒷모습) · 줄마다 4걸음
// 11-12 대표님 '걷는 동작이 없음 · 멈추면 서 있는 자세' → 칸 5개: 0 = 서 있음 · 1~4 = 크게 엇갈리는 걸음(img/zone/hero_walk2.png)
const HSHEET = M2.C.HSHEET;   // 상수는 map2/iso.js M2.C 한 곳
// 산 옷 색을 도트 주인공에게 입힘(11-12 '그림 결 맞추기') — 단계 0(기성)은 그림 그대로 · 1~4는 셔츠 → 웃옷 색 · 회색 바지 → 바지 색 · 넥타이 → 넥타이 색
const HSHEET_IMG = new Image(), HSHEET_TIER = {};
HSHEET_IMG.onload = () => { W2.img = {}; if (G.world) w2Draw(G.world);   // 옷 색 입힌 시트를 다시 만듦
  const sc = document.getElementById('screen'); if (sc && /\bk-shop\b/.test(sc.className) && G.redraw) G.redraw(); };   // 가게가 떠 있으면 거울도 다시(11-14: 시트가 읽히기 전에 가게를 그리면 거울 속 주인공이 옷 색 없이 남았음 — 드물게 나던 버그 · 시험 사진이 흔들리던 까닭)
HSHEET_IMG.src = HSHEET.src;
function heroSheetSrc(tier) {
  tier = Math.max(0, Math.min(4, tier | 0));
  if (!tier || !HSHEET_IMG.complete || !HSHEET_IMG.naturalWidth) return HSHEET.src;
  if (HSHEET_TIER[tier]) return HSHEET_TIER[tier];
  const w = HSHEET_IMG.naturalWidth, h = HSHEET_IMG.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'); c.drawImage(HSHEET_IMG, 0, 0); const im = c.getImageData(0, 0, w, h), d = im.data, P = SUIT_PAL[tier];
  const hex = (x) => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
  const C = hex(P.C), Cs = hex(P.c), PT = hex(P.P), T = hex(P.T);
  for (let y = 0; y < h; y++) { const yf = (y % HSHEET.ch) / HSHEET.ch;
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (d[i + 3] < 10) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), put = (q) => { d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; };
      if (yf > 0.24 && yf < 0.68 && mn > 150 && mx - mn < 45) put(mx > 215 ? C : Cs);          // 흰 셔츠 → 웃옷
      else if (yf > 0.55 && mx - mn < 25 && mx > 60 && mx < 190) put(mx > 130 ? PT : Cs.map(v => v * 0.8 | 0));   // 회색 바지 → 바지
      else if (yf > 0.24 && yf < 0.6 && b > r + 30 && b > 60 && mx < 170) put(T);              // 넥타이
    } }
  c.putImageData(im, 0, 0); return (HSHEET_TIER[tier] = cv.toDataURL());
}
const dirOf = (d) => M2.dir4(d[0], d[1]);   // 대각선 시트 넷 — 가는 쪽의 사분면(셈은 map2/iso.js)
/* ── 지도(새 짜임 · 지도 설계 3절 · js/map2 — 11-13 대표님 '레거시 확실히 정리하고 바로 가자') ──
   지역 둘(여의도 · 영등포) · 칸 땅 + 낱장 건물 · 사물(js/map2/render.js — 블록도와 같은 그리기)
   걷기 = 반 칸 격자 길 찾기(iso.js · 길이 없으면 걷지 않음) · 지역을 넘는 길은 다리 끝 출구에서 넘어감
   장소 ↔ 건물 = 지역 자료(regions.js)의 건물 places · 지도는 편집 화면(block.html?edit=1)에서 고침
   G.world = { r 지역 · pos 발(지역 화면 좌표) · dir · frame · cam · zoom · over · path } */
const WALK_SPEED = M2.C.WALK_SPEED, STRIDE = M2.C.STRIDE, HERO_H = M2.C.HERO_H;
// 낱장 53장 싣기는 첫 화면이 그려진 뒤 쉬는 틈에(11-13 구조 정리 걸음 9 — 시작 화면이 그림 받기와 다투지 않게) · 지도가 먼저 열리면 그때 바로
(window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => M2.R2.init({ skin: true }), { timeout: 1500 });
const W2 = { R: null, img: {} };
function w2R() {   // 땅 사기(11-13): 내 땅 건물이 바뀌면 지역을 다시 칠함 · 짓는 건물은 SH.landSrc 가 끼움
  const lk = G.LAND ? G.LAND.key(G.st) : ''; if (W2.lk !== lk) { W2.R = null; W2.lk = lk; }
  if (!W2.R) { W2.R = {}; for (const id in M2.REGIONS) W2.R[id] = M2.build(SH.landSrc && G.st ? SH.landSrc(G.st, M2.REGIONS[id]) : M2.REGIONS[id]); } return W2.R; }
function bldOf(pid) { const R = w2R(); for (const id in R) { const b = R[id].blds.find(x => (x.places || []).includes(pid)); if (b) return { r: R[id], b }; } return null; }
function heroSheetImg(tier) { const src = heroSheetSrc(tier); if (!W2.img[src]) { const im = new Image(); im.onload = () => { if (G.world) w2Draw(G.world); }; im.src = src; W2.img[src] = im; } return W2.img[src]; }
const sideW = () => document.documentElement.classList.contains('tight') ? 360 : 300;   // 오른쪽 기둥 폭 — CSS html.mid .k-map .side(300) · html.tight .k-map .side(360) 와 같은 값
function worldFit() { return { aw: (G.W || 1280) - sideW(), ah: 720 }; }   /* 126(11-14 대표님 '상단 바가 맵을 너무 가려서 답답' → 목업 셋 가운데 '오른쪽 기둥'): 지도는 화면 맨 위부터 끝까지(전: 위 줄 아래 656) · 날짜 · 돈 · 체력 · 스트레스는 오른쪽 기둥 맨 위 */   // 지도 칸(오른쪽 기둥 왼쪽 · 위 띠 아래)
// 이 칸에 보일 장소(잠긴 곳은 자물쇠)
function placeState(pids, st, slot, byPlace, allDis) {
  const ps = pids.filter(pid => SH.PL[pid] && (SH.PL[pid].slots || []).includes(slot.kind));
  const open = ps.filter(pid => SH.isOpen(st, pid)), go = open.filter(pid => byPlace[pid] && !allDis(pid));
  if (go.length) return { k: 'go', pid: go[0] };
  if (open.length) return { k: 'off', pid: open[0] };
  const lk = ps.find(pid => LOCK_TXT()[pid]); if (lk) return { k: 'lock', pid: lk };
  return { k: 'none' };
}
function worldScreen(P, byPlace, allDis) {
  M2.R2.init({ skin: true });   // 아직 안 받았으면 지금(받은 그림은 다시 안 받음)
  G.redraw = () => worldScreen(P, byPlace, allDis); G.armed = null;
  if (G.world && G.world.home) { G.world.r = G.world.home.r; G.world.pos = G.world.home.pos; G.world.home = null; }   /* 전체 지도에서 다른 지역을 보던 중에 화면이 다시 그려지면 주인공이 있는 지역으로(안 그러면 보던 지역에 주인공이 놓임) */
  const st = G.st, slot = P.slot, F = worldFit(), night = slot.kind === 'evening', R = w2R();
  // 시작 자리: 이번 주 마지막으로 간 곳 문 앞 · 주말(또는 자취방에서 시작하는 밤)은 자취방 · 아니면 여명증권 앞
  const last = (st.wk.picks.slice(-1)[0] || {}).place, lb = bldOf(last), home = bldOf('home_studio');
  let r, pos;
  if (G.world && G.world.keep) { r = G.world.r; pos = G.world.pos.slice(); }
  else if (lb) { r = lb.r; pos = M2.doorPt(r, lb.b); }
  else if (home && (slot.kind === 'weekend' || (slot.kind === 'evening' && last === 'home_studio'))) { r = home.r; pos = M2.doorPt(r, home.b); }
  else { r = R.yeouido; const e = r.entrances.find(x => x.id === 'start') || r.entrances[0]; pos = M2.toScreen(r, e.at[0], e.at[1]); }
  if (G.world && G.world.raf) cancelAnimationFrame(G.world.raf);
  G.world = { r, pos, dir: 'SE', frame: 0, zoom: Math.max(0.7, Math.min(1, F.aw / 1000)), cam: pos.slice(), over: false, F, P, byPlace, allDis, onExit: true };
  const ask = { work: '오늘 일은 어디서?', lunch: '어디서 먹을까', evening: '어디로 갈까', weekend: '어디로 갈까' }[slot.kind];   /* 130(11-14 대표님 '일요일 텍스트가 반복됨'): 때(점심 · 일요일)는 위 칸의 칩이 말하므로 물음에선 뺌 */
  document.getElementById('screen').className = 'k-map';
  document.getElementById('screen').innerHTML = topBar(st, { si: P.si, sub: String(SH.subLabel(st)).split(' · ')[0] }) + `<div id="zone" class="world w2 ${night ? 'night' : ''}" style="width:${F.aw}px;height:${F.ah}px">
      <canvas id="w2cv"></canvas><div class="znight"></div><canvas id="w2lit"></canvas><div id="pins"></div><div id="zhov"></div>
      <div class="zname"><span id="zarea"></span><small>${esc(ask)}</small></div><div id="zgo"></div>
      <div class="btn sm zov" data-act="world-over">전체 지도</div><div id="zvw"></div>
    </div><div id="mono"></div>
    ${midSide(st, P, byPlace, allDis, ask)}`;
  w2Pins(G.world);
  paint(document.getElementById('screen'));
  w2Draw(G.world); w2Loop(G.world);
  if (G.LAND) G.LAND.intro(st);   // 과장 첫날 한 번 '처음 — 땅 사기'
  if (/[?&]perf=1/.test(location.search)) setTimeout(() => w2Perf(G.world), 300);
}
// 성능 재기(?perf=1 · 밤 작업 C): 한 장 그리기 · 행인 걸음을 40번 바로 돌려 ms 를 잼(헤드리스의 rAF 속도 제한을 피함) · 결과는 <pre id="result">
function w2Perf(z) {
  const step = [], draw = [], q = (a) => { const s2 = a.slice().sort((x, y) => x - y); return `평균 ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2)} · 90% ${s2[(s2.length * 0.9) | 0].toFixed(2)} · 최대 ${s2[s2.length - 1].toFixed(2)}`; };
  const c0 = performance.now(); z.r.chunks = null; w2Draw(z); const bake = performance.now() - c0;   // 첫 장 = 땅 조각 굽기 포함
  for (let i = 0; i < 40; i++) { const t0 = performance.now(); npcStep(z, 16); const t1 = performance.now(); z.pos = [z.pos[0] + 3, z.pos[1] + 1.5]; w2Cam(z); w2Draw(z); const t2 = performance.now(); step.push(t1 - t0); draw.push(t2 - t1); }
  const pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = `PERF 첫 장(조각 굽기 포함) ${bake.toFixed(1)}ms · 행인 ${(z.npcs || []).length} · 차 ${z.traf ? z.traf.cars.length : 0} · 걸음 ms ${q(step)} · 그리기 ms ${q(draw)} · 땅 조각 ${z.r.chunks ? z.r.chunks.size : 0}`; document.body.prepend(pre);
}
// 이름표(지금 지역) · 다른 지역 · 지도에 없는 장소는 왼쪽 위 '다른 곳' 줄
function w2Pins(z) {
  const st = G.st, slot = z.P.slot, pins = document.getElementById('pins'), go = document.getElementById('zgo'); if (!pins) return;
  z.pins = [];
  pins.innerHTML = z.r.blds.map((b, i) => {
    const s = placeState(b.places || [], st, slot, z.byPlace, z.allDis); if (s.k === 'none') return '';
    z.pins.push({ i, b, k: s.k, hot: s.k === 'go' && SH.peopleAt(st, s.pid, slot).some(c => st.rel[c] && st.rel[c].st >= 1) }); const nm = esc(short(SH.PL[s.pid].name_ko));
    if (s.k === 'lock') return `<div class="pin mini lock" data-walk="${s.pid}" data-b="${i}"><div class="plate">${ic('lock')} ${nm}</div></div>`;
    const nw = st.known && st.known[s.pid] === st.tick ? '<i class="nw">NEW</i>' : '';   /* 112 · 133(11-14 대표님 "'새로' 박스가 촌스러움 · NEW · 뱃지 같은 걸"): 이번에 새로 열린 곳 = 이름표 오른쪽 위 모서리의 작은 뱃지 */
    if (s.k === 'off') return `<div class="pin mini off" data-walk="${s.pid}" data-b="${i}"><div class="plate">${nm}${nw}</div></div>`;
    const ppl = SH.peopleAt(st, s.pid, slot).filter(c => st.rel[c] && st.rel[c].st >= 1);
    return `<div class="pin go ${ppl.length ? 'hot' : ''}" data-walk="${s.pid}" data-b="${i}"><span class="arr bob">▼</span>${ppl.length ? `<div class="who">${ppl.slice(0, 3).map(c => fc(c, 1)).join('')}</div>` : ''}<div class="plate">${nm}${nw}</div></div>`;
  }).join('');
  /* 124(11-14 대표님 "'다른 곳'에는 여의도 장소, 영등포 장소가 다 나와야 함"): 지금 칸에 갈 수 있는 곳을 지역마다 묶어 다 보임 — 지금 지역 것도(전: 다른 지역 것만) · 지도에 없는 곳은 '그 밖' */
  const dateAt = {}; ((z.P && z.P.options) || []).forEach(o => { if (o.date && o.ok !== false) dateAt[o.place] = o.who; });   /* 151: 약속 자리는 그 칸에 여는 곳이 아니어도 목록에 · 그 사람 얼굴로 · 맨 위 */
  const all = Object.keys(z.byPlace).filter(pid => SH.PL[pid] && !z.allDis(pid) && (dateAt[pid] || (SH.isOpen(st, pid) && (SH.PL[pid].slots || []).includes(slot.kind)))).map(pid => [pid, bldOf(pid)]);
  const here = z.home ? z.home.r : z.r, grp = Object.keys(M2.REGIONS).map(id => [M2.REGIONS[id].ko, all.filter(([, t]) => t && t.r.id === id), id]).concat([['그 밖', all.filter(([, t]) => !t), '']]).filter(q => q[1].length);
  /* 137 · 138(11-14 대표님 '리서치센터 글만 우측 정렬이 안 됨 · 아이콘 자리는 네모 박스에 장소 · 사람 있는 곳부터 · 화살표 꼴도 한 기준으로') · 134(NEW 뱃지):
     줄 꼴 하나 = [얼굴(없으면 '장소' 네모)] + 오른쪽 정렬 이름 · 지역마다 사람이 있는 곳 먼저 · 다른 지역 표시는 지역 이름 줄이 맡음(화살표 없음) */
  const pplAt = (pid) => dateAt[pid] ? [dateAt[pid]] : SH.peopleAt(st, pid, slot).filter(c => st.rel[c] && st.rel[c].st >= 1);
  go.className = all.length ? 'zgo px' : ''; go.innerHTML = all.length ? `<div class="h">갈 수 있는 곳</div>${grp.map(([ko, list]) => `<div class="rg">${esc(ko)}</div>${list.map(([pid]) => [pid, pplAt(pid)]).sort((x, y) => (dateAt[y[0]] ? 2 : y[1].length ? 1 : 0) - (dateAt[x[0]] ? 2 : x[1].length ? 1 : 0)).map(([pid, ppl]) =>
    `<div class="btn sm" data-walk="${pid}">${ppl.length ? ppl.slice(0, 2).map(c => fc(c, 0.75)).join('') : '<span class="pbox">장소</span>'}<span class="nm">${esc(short(SH.PL[pid].name_ko))}</span>${dateAt[pid] ? '<i class="nw dt">약속</i>' : st.known && st.known[pid] === st.tick ? '<i class="nw">NEW</i>' : ''}</div>`).join('')}`).join('')}` : '';
  paint(go);
  const a = document.getElementById('zarea'); if (a) a.textContent = z.r.ko;
  paint(pins);
}
// 화면 ↔ 지역 좌표
const w2s = (z, p) => M2.toView(z, z.F.aw, z.F.ah, p);
const s2w = (z, p) => M2.fromView(z, z.F.aw, z.F.ah, p);
function w2Draw(z) {
  const cv = document.getElementById('w2cv'); if (!cv || G.world !== z || selfTesting) return;   // 누르기 시험은 그리지 않음(빠르게)
  const DPR = Math.min(2, window.devicePixelRatio || 1), W = z.F.aw, H = z.F.ah;
  if (cv.width !== W * DPR) { cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  const g = cv.getContext('2d'), r = z.r;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = M2.R2.bg(); g.fillRect(0, 0, cv.width, cv.height);   /* 67: 지도 밖은 어두운 바탕 */
  const o = w2s(z, [0, 0]); g.setTransform(z.zoom * DPR, 0, 0, z.zoom * DPR, o[0] * DPR, o[1] * DPR);
  const a = s2w(z, [0, 0]), b = s2w(z, [W, H]);
  M2.R2.drawGround(g, r, [a[0], a[1], b[0], b[1]]);
  if (G.LAND) G.LAND.draw(g, r, G.st);   // 땅 사기: 살 수 있는 땅 금빛 · 내 땅 분홍
  // 갈 곳 표시(11-13 대표님 3 · 추천 ㉠): 지금 칸에 갈 수 있는 건물 바닥에 금빛 테두리 · 아는 사람이 있으면 분홍 · 천천히 숨 쉬듯
  const pulse = SHOT_STILL ? 0.9 : 0.55 + 0.35 * Math.sin(performance.now() / 420);
  (z.pins || []).filter(p => p.k === 'go').forEach(p => { const B = p.b, P = [[B.x - 0.15, B.y - 0.15], [B.x + B.w + 0.15, B.y - 0.15], [B.x + B.w + 0.15, B.y + B.h + 0.15], [B.x - 0.15, B.y + B.h + 0.15]].map(q => M2.toScreen(r, q[0], q[1]));
    g.save(); g.beginPath(); P.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
    const col = p.hot ? '255,128,170' : '242,193,78'; g.fillStyle = `rgba(${col},${0.18 * pulse})`; g.fill(); g.shadowColor = `rgba(${col},.9)`; g.shadowBlur = 10; g.strokeStyle = `rgba(${col},${pulse})`; g.lineWidth = 4; g.stroke(); g.restore(); });
  const hs = M2.HERO_SCALE, hh = HERO_H * hs, hw = HSHEET.cw * hh / HSHEET.ch, hc = M2.toCell(r, z.pos[0], z.pos[1]), sheet = heroSheetImg(SH.suitTier(G.st));
  const ha = Math.max(0, 1 - Math.max(0, -hc[0], -hc[1], hc[0] - r.W, hc[1] - r.H) / 3.4);   /* 지역 밖 다리로 걸어 나가면 옅어짐 */
  const hero = { x0: hc[0] - 0.15, y0: hc[1] - 0.15, x1: hc[0] + 0.15, y1: hc[1] + 0.15, sb: [z.pos[0] - hw / 2, z.pos[1] - hh, z.pos[0] + hw / 2, z.pos[1]],
    draw: () => { if (sheet.complete && sheet.naturalWidth) { g.save(); g.globalAlpha *= ha; g.drawImage(sheet, z.frame * HSHEET.cw, HSHEET.rows[z.dir] * HSHEET.ch, HSHEET.cw, HSHEET.ch, z.pos[0] - hw / 2, z.pos[1] - hh + 3, hw, hh); g.restore(); } } };
  w2Draw.bridge(z, g);   /* 다리: 지역 밖으로 이어지는 바닥 · 옆면 · 교각 · 먼 쪽 난간(장면 아래) */
  M2.R2.drawScene(g, r, { extra: (z.home ? [] : [hero]).concat(npcItems(z, g), w2Draw.bridgeItems(z, g)), focus: z.home ? null : hero, hover: z.hover, sigT: z.traf ? z.traf.t : 0 });   /* z.home = 전체 지도에서 다른 지역을 보는 중(주인공은 거기 없음) */
  if (z.P && z.P.slot && z.P.slot.kind === 'evening') { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(128,124,158)'; g.fillRect(0, 0, cv.width, cv.height); g.restore(); }
  npcStep.draw(z, g);   // 70: 밤 어둡게(전 CSS 필터 brightness .55 · 푸른 기와 같은 꼴)
  // 밤 불빛(하는 순서 ㄹ · 11-13 대표님 '괜찮음' → 기본으로 켬 · ?lit=0 이면 끔): 밤 칠하기가 안 걸린 따로 한 장에 창 · 가로등
  const lc = document.getElementById('w2lit'), litOn = z.P && z.P.slot && z.P.slot.kind === 'evening' && !/[?&]lit=0/.test(location.search);
  if (lc) { lc.style.display = litOn ? '' : 'none';
    if (litOn) { if (lc.width !== cv.width) { lc.width = cv.width; lc.height = cv.height; lc.style.width = W + 'px'; lc.style.height = H + 'px'; }
      const lg = lc.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, lc.width, lc.height); lg.setTransform(z.zoom * DPR, 0, 0, z.zoom * DPR, o[0] * DPR, o[1] * DPR);
      M2.R2.warmLights(r); M2.R2.drawLights(lg, r, { clear: hero.sb }); w2Draw.bridgeLit(z, lg); } }
  w2PinPos(z);
}
// 사진 시험(?shot= · ?perf=1 은 빼고): 행인 없음 · 숨쉬기 멈춤 → 같은 화면은 늘 같은 사진(구조 정리 사진 비교 · 진단 걸음 0) — 게임 동작은 그대로
const SHOT_STILL = /[?&]shot=/.test(location.search) && !/[?&]perf=1/.test(location.search);
function w2PinPos(z) {   // 이름표를 건물 지붕 위에
  // 52(11-13 대표님 '예전처럼 그 방향 모서리 끝에 장소 표시'): 화면 밖 갈 곳 이름표는 그 방향 가장자리에 붙이고 화살표 · 누르면 그쪽으로 걸어감
  const W = z.F.aw, H = z.F.ah, mx = 90, my = 70;
  (z.pins || []).forEach(({ i, b, k }) => { const el = document.querySelector(`#pins [data-b="${i}"]`); if (!el) return;
    const top = M2.toScreen(z.r, b.x + b.w / 2, b.y + b.h / 2), p = w2s(z, [top[0], M2.R2.bldTop(z.r, b) - 2]);
    let x = p[0], y = p[1]; const out = k === 'go' && !z.over && (x < mx || x > W - mx || y < my + 30 || y > H - my + 50);
    if (out) { const a = Math.atan2(y - H / 2, x - W / 2); x = Math.max(mx, Math.min(W - mx, x)); y = Math.max(my + 30, Math.min(H - my + 50, y)); el.style.setProperty('--ang', a + 'rad'); }
    el.classList.toggle('edge', out);
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; });
}
function w2Cam(z, snap) {   // 주인공이 가운데쯤 · 지역 밖은 덜 보이게 · 전체 지도면 지역 한 장이 칸에 다 들어가게
  if (z.over) { z.zoom = Math.min(z.F.aw / z.r.pxW, z.F.ah / z.r.pxH) * 0.96; z.cam = [z.r.pxW / 2, z.r.pxH / 2]; return; }
  z.zoom = Math.max(0.7, Math.min(1, z.F.aw / 1000));
  // 54(11-13 대표님 '마우스로 지도 넘기기'): 끌어 둔 만큼(z.pan) 비켜 봄 · 걷기 시작하면 주인공 쪽으로 천천히 돌아옴
  if (z.pan && z.path) { z.pan = [z.pan[0] * 0.88, z.pan[1] * 0.88]; if (Math.hypot(z.pan[0], z.pan[1]) < 2) z.pan = null; }
  const t = [z.pos[0] + (z.pan ? z.pan[0] : 0), z.pos[1] - 30 + (z.pan ? z.pan[1] : 0)];
  z.cam = M2.camEase(z.cam, t, snap || SHOT_STILL);   /* 사진 모드는 바로 제자리(천천히 따라오면 찍는 때마다 화소가 반 칸씩 달라짐 — 11-14 지도 화면을 화소 기준에) */
}
function w2Loop(z) {
  if (selfTesting) return;
  let last = performance.now();
  const tick = (t) => { if (G.world !== z || !document.getElementById('w2cv')) return; const dt = Math.min(250, t - last); /* 50(11-13): 느린 장이 생겨도 걸음이 따라잡게(전엔 50ms 로 잘라 밤에 느려짐) */ last = t;
    try { w2Advance(z, dt); npcStep(z, dt); w2Cam(z); w2Draw(z); } catch (e) { if (!z.errSaid) { z.errSaid = 1; console.error('지도 그리기 오류(고리는 이어 감)', e); if (G.oops) G.oops(e); } }   // 11-14: 한 장에서 던져도 지도가 얼지 않게 · 같은 오류는 한 번만
    z.raf = requestAnimationFrame(tick); };
  z.raf = requestAnimationFrame(tick);
}
// 걷기: 점들을 차례로 · 걸은 거리만큼 걸음 칸이 넘어감 · 출구 칸을 밟으면 지역을 넘어감
function w2Go(z, pts, done) {
  if (G.instant || !pts || !pts.length) { if (pts && pts.length) z.pos = pts[pts.length - 1].slice(); z.path = null; zoneHeroDraw(-1, true); return done && done(); }
  z.path = pts.slice(); z.onDone = done; z.walked = 0; G.walkT = 1;
  G.walkSkip = () => { const end = z.path && z.path.length ? z.path[z.path.length - 1] : z.pos; z.pos = end.slice(); z.path = null; G.walkT = null; G.walkSkip = null; zoneHeroDraw(-1, true); const d = z.onDone; z.onDone = null; if (d) d(); };
}
function w2Advance(z, dt) {
  if (!z.path || z.home) return;
  M2.walkAlong(z, WALK_SPEED * dt, 6);   // 6px 넘게 남았을 때만 몸을 돌림(짧은 꺾임에서 떨지 않게)
  { const f0 = z.frame; z.frame = 1 + (Math.floor(z.walked / STRIDE) % 4); if (z.frame !== f0 && z.frame === 1) sfx('step'); }   /* 131: 걸음 네 칸에 한 번 발소리(두 번이면 초에 다섯 번이라 따닥거림) */
  if (!z.path.length) { z.path = null; z.frame = 0; G.walkT = null; G.walkSkip = null; const d = z.onDone; z.onDone = null; if (d) d(); }
  w2CheckExit(z);
}
function w2CheckExit(z) {
  const e = M2.exitAt(z.r, z.pos);
  if (!e) { z.onExit = false; return false; }
  if (z.onExit || z.crossing) return false;   // 넘어오자마자 다시 넘어가지 않게 · 지역을 넘는 걷기는 w2Cross 가 맡음
  z.path = null; G.walkT = null; G.walkSkip = null; w2Enter.cross(z, e); return true;
}
function w2Enter(z, id, entrance) {
  M2.R2.drop(z.r); z.r = w2R()[id];
  const e = z.r.entrances.find(x => x.id === entrance) || z.r.entrances[0];
  z.pos = M2.toScreen(z.r, e.at[0], e.at[1]); z.onExit = true; w2Cam(z, true); w2Pins(z);
  const f = document.getElementById('zone'); if (f && !G.instant) { f.classList.add('cross'); setTimeout(() => f.classList.remove('cross'), 260); }
}
function zoneHeroDraw(frame, snap) { const z = G.world; if (!z) return; z.frame = frame < 0 ? 0 : 1 + (frame % 4); if (snap) w2Cam(z, true); w2Draw(z); }
function worldOverview(on) { const z = G.world; if (!z) return; z.over = on == null ? !z.over : on;
  if (!z.over && z.home) { z.r = z.home.r; z.pos = z.home.pos; z.home = null; w2Pins(z); }   /* 다른 지역을 보다가 닫으면 주인공이 있는 지역으로 */
  const el = document.getElementById('zone'); if (el) el.classList.toggle('over', z.over); w2Cam(z, true); w2Draw(z); worldOverview.btns(z); }
/* 전체 지도에서 다른 지역 보기(11-14 대표님 '전체지도에서 여의도, 영등포 지도 모두 볼 수 있게 · 영등포 화살표를 누르면 영등포 지도로 · 넘어갈 때는 부드럽게'):
   전체 지도일 때 초록 이정표('영등포 ↙')를 누르면 지도만 그 지역으로 바뀜(주인공은 제자리 · z.home 에 원래 지역을 적어 둠) · 123: 보는 눈이 다리 쪽으로 옮겨 가듯 — 지금 지도는 다리 반대쪽으로 밀려 나가고 새 지도가 다리 쪽에서 들어옴(전: 반대 방향)
   보는 동안 이름표를 누르면 전체 지도를 닫고(원래 지역으로) 그 장소로 걸어감 · 지역이 늘어도 출구마다 단추가 하나씩 생김 */
worldOverview.btns = function (z) { const box = document.getElementById('zvw'); if (box) box.innerHTML = ''; };   /* 122(11-14 대표님 '영등포 지도 버튼 빼고 이 기능을 영등포 이정표에'): 단추는 없앰 — 전체 지도에서 초록 이정표를 누르면 넘어감(mapTap · z.signs) */
worldOverview.view = function (id) {
  const z = G.world, R = w2R()[id]; if (!z || !z.over || !R || R === z.r || z.path || z.bridge || worldOverview.busy) return;
  const e = z.r.exits.find(x => x.to.region === id), sp = e && w2Draw.span(z.r, e), dx = sp ? (sp.dir[0] - sp.dir[1]) * 70 : -70, dy = sp ? (sp.dir[0] + sp.dir[1]) * 35 : 35;   /* 다리가 뻗는 쪽(화면에서) */
  const els = ['w2cv', 'w2lit', 'pins'].map(k => document.getElementById(k)).filter(Boolean), set = (t, o, tr) => els.forEach(el => { el.style.transition = tr; el.style.transform = t; el.style.opacity = o; });
  const swap = () => { if (!z.home) z.home = { r: z.r, pos: z.pos }; z.r = R; if (z.home.r === R) { z.pos = z.home.pos; z.home = null; } w2Pins(z); w2Cam(z, true); w2Draw(z); worldOverview.btns(z); };
  if (G.instant) return swap();
  worldOverview.busy = true; set(`translate(${-dx}px,${-dy}px)`, 0, 'transform .26s ease-in, opacity .26s ease-in');
  setTimeout(() => { swap(); set(`translate(${dx}px,${dy}px)`, 0, 'none'); requestAnimationFrame(() => requestAnimationFrame(() => { set('none', 1, 'transform .3s ease-out, opacity .3s ease-out'); setTimeout(() => { set('', '', ''); worldOverview.busy = false; }, 320); })); }, 270);
};
// 장소로 걸어감: 같은 지역이면 문 앞까지 · 다른 지역이면 그쪽 출구 → 넘어가서 → 문 앞 · 길이 없으면 걷지 않음
function walkTo(pid) {
  const z = G.world, m = document.getElementById('mono'); if (!z || !document.getElementById('zone') || z.bridge) return;
  z.crossing = false;   /* 새로 고른 길 — 앞서 다른 지역으로 가던 표시는 지움 */
  if (z.over) worldOverview(false);
  if (m) m.innerHTML = '';
  const t = bldOf(pid); if (!t) return monoOpen(pid);   // 지도에 아직 없는 곳 — 걷지 않고 바로
  const arrive = () => { z.dir = 'NE'; zoneHeroDraw(-1); monoOpen(pid); };   // 문 앞에 서면 문 쪽(뒷모습)
  if (t.r === z.r) { const P = M2.pathTo(z.r, z.pos, M2.doorPt(z.r, t.b)); if (!P) { toast(['거기는 지금 갈 수 없어요']); return; } return w2Go(z, P, arrive); }
  const ex = z.r.exits.find(e => e.to.region === t.r.id); if (!ex) return monoOpen(pid);
  const c = ex.cells[0], P1 = M2.pathTo(z.r, z.pos, M2.toScreen(z.r, c[0] + 0.5, c[1] + 0.5));
  if (!P1) { toast(['거기는 지금 갈 수 없어요']); return; }
  z.crossing = true;
  w2Go(z, P1, () => w2Enter.cross(z, ex, () => { const P2 = M2.pathTo(z.r, z.pos, M2.doorPt(z.r, t.b)); w2Go(z, P2 || [], arrive); }));
}
// 지도 누름(input.js) — 11-13 대표님 '자유롭게 이동 · 아무 건물을 눌러도 가게':
//   건물이면 어떤 건물이든 그 문 앞까지 걸어감(장소가 있으면 '들어갈까?' · 잠겼거나 지금 갈 일이 없으면 그 한 줄 · 장소가 없으면 '볼일이 없다')
//   빈 곳이면 그 자리로 · 막힌 곳(물 · 화단 · 건물 몸)을 누르면 가장 가까운 걸을 자리로 맞춤(iso.js pathTo)
function mapTap(clientX, clientY) {
  const z = G.world, cv = document.getElementById('w2cv'); if (!z || !cv) return;
  if (z.bridge) { if (G.walkSkip) G.walkSkip(); return; }   /* 다리를 건너는 중 — 누르면 바로 도착 */
  z.crossing = false;
  // 62(11-13 대표님 '이름표 달린 건물을 누르면 다른 건물로'): 화면 배율을 빼고 지도 좌표로 — 전엔 창이 1280보다 크면 누른 자리가 밀렸음(마우스 올림은 이미 뺐음)
  const rc = cv.getBoundingClientRect(), sc = cv.width / Math.min(2, window.devicePixelRatio || 1) / rc.width, w = s2w(z, [(clientX - rc.left) * sc, (clientY - rc.top) * sc]);
  if (z.over) { const hit = (z.signs || []).find(q => w[0] >= q.sb[0] && w[0] <= q.sb[2] && w[1] >= q.sb[1] && w[1] <= q.sb[3]); if (hit) return worldOverview.view(hit.to);   /* 122: 이정표를 누르면 그 지역 지도로 */
    const away = !!z.home; worldOverview(false); if (away) return; }   /* 다른 지역을 보던 중이면 닫기만 */
  if (G.LAND && G.LAND.tap(z.r, w)) return;   // 땅 칸을 누르면 땅 창
  const b = M2.R2.bldAt(z.r, w), pin = b && (z.pins || []).find(x => x.b === b);
  if (pin) { const el = document.querySelector(`#pins [data-b="${pin.i}"]`); if (el) return walkTo(el.dataset.walk); }
  if (b && b.door) {
    const P = M2.pathTo(z.r, z.pos, M2.doorPt(z.r, b)); if (!P) { toast(['거기는 갈 수 없어요']); return; }
    const pid = (b.places || [])[0];
    return w2Go(z, P, () => { z.dir = 'NE'; zoneHeroDraw(-1); if (pid && SH.PL[pid]) monoOpen(pid); else monoNote(`${b.name}. 지금은 볼일이 없다.`); });
  }
  const P = M2.pathTo(z.r, z.pos, w); if (!P) { toast(['거기는 갈 수 없어요']); return; }
  w2Go(z, P, () => { zoneHeroDraw(-1); nearDoor(); });
}
// 장소가 없는 건물 앞 혼잣말 한 줄
function monoNote(line) {
  const m = document.getElementById('mono'); if (!m) return;
  m.innerHTML = `<div class="box px">${fc('hero', 2)}<div class="say"><b>나</b><p>${esc(line)}</p></div><div class="acts"><div class="btn" data-act="mono-close">돌아선다</div></div></div>`;
  paint(m);
}
// 키보드 걷기(input.js): 그 자리가 걸을 곳인가
function freeOk(p) { const z = G.world; if (!z) return false; const c = M2.toCell(z.r, p[0], p[1]); return M2.walkable(z.r, c[0], c[1]); }
