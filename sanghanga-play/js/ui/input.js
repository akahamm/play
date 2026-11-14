/* =====================================================================
   ui/input.js — 누르기 · 키보드(11-12 대표님 '클릭한 위치로 이동 · WASD 직접 조작 · 엔터 · 스페이스 · 숫자키로 고르기')
   - 지도 빈 곳 누름 → 그 자리로 걸어감(걸을 수 있는 곳 칸 지도 안 가장 가까운 곳)
   - WASD(화살표) → 주인공을 직접 움직임 · 건물 문 가까이면 그 이름표가 빛남 → 엔터 · 스페이스로 들어감
   - 고르기가 열려 있으면: W · S · 위아래 화살표로 고르고 엔터 · 스페이스로 정함 · 숫자 1~9 는 바로 그 줄
   ===================================================================== */
const KEYS = { held: new Set(), raf: 0, last: 0, walked: 0, sel: -1, list: null };
// 지금 고를 수 있는 것들(위에서 아래 순서) — 열린 창이 먼저
function choiceList() {
  const q = (s) => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null);
  const sets = ['#ovl .acts .btn, #ovl [data-trade]:not(.dis), #ovl [data-amt]', '#mono [data-opt], #mono [data-act="enter"], #mono [data-act="mono-close"]', '.k-inside #ch [data-opt]:not([data-opt=""])', '#ch [data-pick]:not([data-pick=""])',
    '.k-shop .it[data-item-id]:not([data-item-id=""]), .k-shop .buy .btn:not(.dis)'];
  for (const s of sets) { const l = q(s); if (l.length) return l; }
  return [];
}
function markSel(list) {
  document.querySelectorAll('.ksel').forEach(e => e.classList.remove('ksel'));
  if (list && list[KEYS.sel]) list[KEYS.sel].classList.add('ksel');
}
function onMap() { return !!(G.world && document.getElementById('zone') && !document.querySelector('#ovl .ovl')); }

/* ── 54 · 56(11-13): 지도 끌기(마우스 · 손가락 한 개 — 6px 넘게 움직이면 끌기, 그 뒤 누름은 무시) · 마우스를 올리면 눌릴 건물을 밝힘 ── */
document.addEventListener('pointerdown', e => { if (!onMap() || !e.target.closest('#zone') || e.target.closest('[data-walk],[data-act],[data-tip],.btn,#mono')) return; G.drag = { x: e.clientX, y: e.clientY, on: false }; });
document.addEventListener('pointermove', e => {
  const z = G.world; if (!onMap() || !z) return;
  if (G.drag && (e.buttons & 1 || e.pointerType === 'touch')) {
    const dx = e.clientX - G.drag.x, dy = e.clientY - G.drag.y;
    if (!G.drag.on && Math.hypot(dx, dy) > 6) G.drag.on = true;
    if (G.drag.on) { const k = (z.zoom || 1) * (document.getElementById('w2cv').getBoundingClientRect().width / z.F.aw), p = z.pan || [0, 0];   // k = 화면 px → 지도 px
      z.pan = [Math.max(-1400, Math.min(1400, p[0] - dx / k)), Math.max(-900, Math.min(900, p[1] - dy / k))]; G.drag.x = e.clientX; G.drag.y = e.clientY; G.drag.moved = true; }
    return;
  }
  if (e.pointerType !== 'mouse' || !e.target.closest('#zone')) { if (z.hover) z.hover = null; return; }
  const cv = document.getElementById('w2cv'); if (!cv) return; const rc = cv.getBoundingClientRect(), sc = cv.width / (Math.min(2, window.devicePixelRatio || 1)) / rc.width;
  const w = s2w(z, [(e.clientX - rc.left) * sc, (e.clientY - rc.top) * sc]), b = e.target.closest('[data-walk],.btn') ? null : M2.R2.bldAt(z.r, w);
  z.hover = b && !b.area ? b : null; cv.style.cursor = z.hover ? 'pointer' : '';
  // 53(11-13 대표님 '무슨 건물인지 눌러 봐야 앎'): 마우스를 올린 건물 이름 · 볼일 한 줄(휴대폰은 누르면 혼잣말 창에 이름)
  const tip = document.getElementById('zhov'); if (!tip) return;
  if (!z.hover) { tip.style.display = 'none'; return; }
  const pid = (z.hover.places || []).find(p => SH.PL[p]), top = M2.toScreen(z.r, z.hover.x + z.hover.w / 2, z.hover.y + z.hover.h / 2), p = w2s(z, [top[0], M2.R2.bldTop(z.r, z.hover) - 2]);
  tip.innerHTML = `<b>${esc(pid ? SH.PL[pid].name_ko : z.hover.name || '건물')}</b><small>${pid ? (SH.isOpen(G.st, pid) ? '누르면 문 앞까지' : '아직 못 들어감') : '볼일 없음'}</small>`;
  tip.style.display = ''; tip.style.left = Math.round(p[0]) + 'px'; tip.style.top = Math.round(p[1] - 8) + 'px';
});
document.addEventListener('pointerup', () => { if (G.drag && !G.drag.moved) G.drag = null; else if (G.drag) setTimeout(() => { G.drag = null; }, 0); });

/* ── 지도 누름 → 건물이면 그 장소로 · 빈 곳이면 그 자리로(map.js mapTap) ── */
document.addEventListener('click', e => {
  if (G.drag && G.drag.moved) { G.drag = null; return; }   // 끌기 끝의 누름은 걷기로 안 셈
  if (!onMap() || !e.target.closest('#zone') || e.target.closest('[data-walk],[data-act],[data-tip],.btn,#mono')) return;
  const m = document.getElementById('mono'); if (m) m.innerHTML = '';
  mapTap(e.clientX, e.clientY);
});

/* ── 문 앞 가까운 건물(이 칸에 갈 수 있는 곳만 · 지금 지역) ── */
function nearDoor() {
  const z = G.world; if (!z) return null;
  let best = null, bd = 46;
  document.querySelectorAll('#pins .pin.go[data-walk]').forEach(el => { const t = bldOf(el.dataset.walk); if (!t || t.r !== z.r) return;
    const d0 = M2.doorPt(t.r, t.b), d = Math.hypot(d0[0] - z.pos[0], d0[1] - z.pos[1]); if (d < bd) { bd = d; best = el; } });
  document.querySelectorAll('#pins .pin.near').forEach(e => e.classList.remove('near'));
  if (best) best.classList.add('near');
  return best;
}

/* ── WASD 로 직접 걷기 ── */
const KDIR = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
function freeStep(t) {
  const z = G.world; KEYS.raf = 0;
  if (!onMap() || !KEYS.held.size) { if (z && KEYS.moving) { KEYS.moving = false; zoneHeroDraw(-1); nearDoor(); } return; }
  if (z.bridge) { KEYS.last = t; KEYS.raf = requestAnimationFrame(freeStep); return; }   /* 다리를 건너는 중엔 키로 안 움직임(끝나면 누르고 있던 쪽으로 이어 걸음) */
  const dt = Math.min(50, t - (KEYS.last || t)); KEYS.last = t;
  let vx = 0, vy = 0; KEYS.held.forEach(k => { vx += KDIR[k][0]; vy += KDIR[k][1]; });
  const l = Math.hypot(vx, vy);
  try {
  if (l) { vx /= l; vy /= l; const sp = WALK_SPEED * 1.25 * dt, n = [z.pos[0] + vx * sp, z.pos[1] + vy * sp];
    if (freeOk(n)) z.pos = n; else if (freeOk([n[0], z.pos[1]])) z.pos = [n[0], z.pos[1]]; else if (freeOk([z.pos[0], n[1]])) z.pos = [z.pos[0], n[1]];
    KEYS.walked += sp; z.dir = dirOf([vx, vy]); KEYS.moving = true; w2CheckExit(z); zoneHeroDraw(Math.floor(KEYS.walked / STRIDE)); nearDoor(); }
  } catch (e) { if (!KEYS.errSaid) { KEYS.errSaid = 1; console.error('걷기 오류(고리는 이어 감)', e); if (G.oops) G.oops(e); } }   // 11-14: 한 걸음에서 던져도 키 걷기가 멈추지 않게 · 같은 오류는 한 번만
  KEYS.raf = requestAnimationFrame(freeStep);
}

addEventListener('keydown', e => {
  if (busy || !G.P) return;
  const k = e.key.toLowerCase();
  const list = choiceList();
  // 고르기가 열려 있음 — 위아래로 고르고 엔터 · 스페이스로 정함 · 숫자는 바로
  if (list.length) {
    if (/^[1-9]$/.test(k) && list[+k - 1]) { e.preventDefault(); list[+k - 1].click(); KEYS.sel = -1; return; }
    if (k === 'w' || k === 'arrowup' || k === 's' || k === 'arrowdown' || k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') {
      e.preventDefault(); const up = k === 'w' || k === 'arrowup' || k === 'a' || k === 'arrowleft';
      KEYS.sel = KEYS.sel < 0 ? (up ? list.length - 1 : 0) : (KEYS.sel + (up ? -1 : 1) + list.length) % list.length; markSel(list); return; }
    if (k === 'enter' || k === ' ') { e.preventDefault(); const el = list[KEYS.sel >= 0 && KEYS.sel < list.length ? KEYS.sel : 0]; KEYS.sel = -1; if (el) el.click(); return; }
  }
  // 지도 — WASD 로 걷기 · 엔터 · 스페이스로 가까운 건물에 들어감
  if (onMap()) {
    if (KDIR[k]) { e.preventDefault(); if (G.world.bridge) return;
      if (G.walkT && G.world) { G.world.path = null; G.world.onDone = null; G.world.crossing = false; G.walkT = null; G.walkSkip = null; }
      const m = document.getElementById('mono'); if (m && m.innerHTML) m.innerHTML = '';
      if (G.world.over) worldOverview(false);
      if (!KEYS.held.has(k)) { KEYS.held.add(k); if (!KEYS.raf) { KEYS.last = 0; KEYS.raf = requestAnimationFrame(freeStep); } } return; }
    if (k === 'enter' || k === ' ') { e.preventDefault(); const d = nearDoor(); if (d) d.click(); return; }
    return;
  }
  // 그 밖(대화 · 결산 · 알림) — 엔터 · 스페이스는 넘김(누른 것과 같음) · 숫자는 대화 고르기
  if (k === ' ' || k === 'enter') { e.preventDefault(); const nx = document.querySelector('#ovl [data-next], .k-settle [data-next]'); (nx || stage).dispatchEvent(new MouseEvent('click', { bubbles: true })); }
});
addEventListener('keyup', e => { KEYS.held.delete(e.key.toLowerCase()); });
addEventListener('blur', () => KEYS.held.clear());
