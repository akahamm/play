/* =====================================================================
   map2/editor.js — 지도 편집 화면(block.html?edit=1 · 개발용 · 지도 설계 5절 · 7절 4)
   - 고치는 것: 땅(사각형 · 꺾이는 길 + 폭) · 필지 · 건물(종류 낱장 / 상자) · 사물 · 출입구(칸 · 목적지) · 도착 자리
   - 되돌리기(⌘Z) · 다시 읽기(검사까지) · 처음 자료로 · 검사(check.js — 로봇과 같은 검사) 통과 뒤에만 내보내기(regions.js 통째 · 복사 / 내려받기)
   - 이 판이 서면 지도는 편집 화면에서만 고침(설계 5절) — 내보낸 regions.js 를 그 자리에 갈아 끼움
   - 자료는 M2.REGIONS 를 바로 고치고 BLOCK.rebuild 로 다시 만듦 · 건물 종류(kind) 건물은 문 칸을 적지 않음(종류가 원본)
   - Tiled JSON 은 '목표'(설계 5절) — 속성 이름만 맞춰 둠: kind · places · door · state · buy · to_region · to_entrance · 좌표는 칸
   ===================================================================== */
(function () {
  if (!new URLSearchParams(location.search).has('edit') || !window.BLOCK) return;
  const B = window.BLOCK, S = B.S, M2 = window.M2;
  S.free = true; S.grid = true; const gb = document.getElementById('bGrid'); if (gb) gb.classList.add('on');
  const TOOLS = [['view', '보기'], ['ground', '땅'], ['line', '길'], ['lot', '필지'], ['bld', '건물'], ['prop', '사물'], ['exit', '출입구']];
  const BOX = { s: [2, 2], m: [3, 3], l: [4, 4], x: [5, 5] };
  const BOX_Z = { s: 40, m: 80, l: 120, x: 160 };
  const E = { tool: 'view', gk: 'side', lw: 2, bk: Object.keys(M2.BKINDS)[0] || 'box.m', pk: Object.keys(M2.PKINDS)[0], sel: null, drag: null, pts: [], undo: [], checked: false, probs: [], pick: null };
  const BASE = JSON.stringify(M2.REGIONS);   // 처음 자료
  const src = () => M2.REGIONS[S.r.id];
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── 화면 ── */
  const css = document.createElement('style');
  css.textContent = `#ed{position:fixed;right:max(12px,env(safe-area-inset-right,0px));top:12px;bottom:12px;width:300px;overflow:auto;background:rgba(11,14,26,.94);border:2px solid #3a4778;border-radius:8px;padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:10px;z-index:5}
#ed h3{margin:0;font-size:15px;color:#f2c14e}#ed .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#ed .btn{padding:4px 8px;font-size:13px}
#ed select,#ed input{background:#141a33;color:#f3efe6;border:1px solid #3a4778;border-radius:4px;padding:3px 6px;font-size:13px;max-width:100%}
#ed label{display:flex;gap:6px;align-items:center}#ed .mute{color:#a9b3c7}#ed .bad{color:#ff8a8a}#ed .ok{color:#7fd68a}
#ed textarea{width:100%;height:120px;background:#0b0e1a;color:#cfd6ee;border:1px solid #3a4778;font:11px/1.4 ui-monospace,monospace}
#ed .prob{cursor:pointer}#ed .prob:hover{text-decoration:underline}.note{right:330px!important}`;
  document.head.appendChild(css);
  const P = document.createElement('div'); P.id = 'ed'; document.body.appendChild(P);
  const note = document.querySelector('.note'); if (note) note.textContent = '편집 화면 · 끌면 옮김(보기) · 바퀴로 확대 · ⌘Z 되돌리기 · Delete 지우기 · Esc 취소';

  function panel() {
    const r = S.r, s = src();
    const opt = {
      view: () => '<span class="mute">끌면 화면이 옮겨집니다. 건물을 누르면 정보가 보입니다.</span>',
      ground: () => `<label>땅 종류 <select id="edGk">${Object.keys(M2.GROUND).map(k => `<option value="${k}" ${k === E.gk ? 'selected' : ''}>${M2.GROUND[k].ko}</option>`).join('')}</select></label><span class="mute">끌어서 사각형으로 칠합니다.</span>`,
      line: () => `<label>땅 종류 <select id="edGk">${['road', 'side', 'plaza', 'grass'].map(k => `<option value="${k}" ${k === E.gk ? 'selected' : ''}>${M2.GROUND[k].ko}</option>`).join('')}</select></label><label>폭 <input id="edLw" type="number" min="1" max="6" value="${E.lw}" style="width:52px"></label><span class="mute">누를 때마다 점이 찍히고 가로 · 세로로 맞춰집니다. Enter 로 끝냄(점 ${E.pts.length}).</span><div class="row"><span class="btn" data-a="lineEnd">선 끝</span><span class="btn" data-a="lineCancel">취소</span></div>`,
      lot: () => '<span class="mute">끌어서 새 필지(빈 땅)를 만듭니다. 누르면 고릅니다.</span>',
      bld: () => `<label>놓을 것 <select id="edBk">${Object.keys(M2.BKINDS).map(k => `<option value="${k}" ${k === E.bk ? 'selected' : ''}>${esc(M2.BKINDS[k].ko)} · 낱장</option>`).join('')}${Object.keys(BOX).map(f => `<option value="box.${f}" ${E.bk === 'box.' + f ? 'selected' : ''}>상자 ${f} (${BOX[f].join('×')})</option>`).join('')}</select></label><span class="mute">빈 칸을 누르면 놓고, 건물을 누르면 고릅니다. 고른 건물은 끌어서 옮깁니다.</span>`,
      prop: () => `<label>사물 <select id="edPk">${Object.keys(M2.PKINDS).map(k => `<option value="${k}" ${k === E.pk ? 'selected' : ''}>${esc(M2.PKINDS[k].ko)}</option>`).join('')}</select></label><span class="mute">인도 칸을 누르면 놓고, 사물을 누르면 고릅니다.</span>`,
      exit: () => (s.exits || []).map((e, i) => `<div class="row"><b>출구 ${esc(e.id)}</b> → <select data-ex="${i}" data-f="region">${Object.keys(M2.REGIONS).map(id => `<option ${id === e.to.region ? 'selected' : ''}>${id}</option>`).join('')}</select><select data-ex="${i}" data-f="entrance">${(M2.REGIONS[e.to.region].entrances || []).map(en => `<option ${en.id === e.to.entrance ? 'selected' : ''}>${en.id}</option>`).join('')}</select><span class="btn ${E.pick && E.pick.ex === i ? 'on' : ''}" data-a="pickEx" data-i="${i}">칸 고르기</span></div>`).join('')
        + (s.entrances || []).map((en, i) => `<div class="row"><b>도착 ${esc(en.id)}</b><span class="mute">${en.at.join(', ')}</span><span class="btn ${E.pick && E.pick.en === i ? 'on' : ''}" data-a="pickEn" data-i="${i}">자리 찍기</span></div>`).join('')
        + '<div class="row"><span class="btn" data-a="addEx">출구 더하기</span><span class="btn" data-a="addEn">도착 자리 더하기</span></div>'
    }[E.tool]();
    P.innerHTML = `<h3>지도 편집 · ${esc(r.ko)}</h3>
      <div class="row">${Object.keys(M2.REGIONS).map(id => `<span class="btn ${id === r.id ? 'on' : ''}" data-region="${id}">${esc(M2.REGIONS[id].ko)}</span>`).join('')}</div>
      <div class="row">${TOOLS.map(([k, n]) => `<span class="btn ${k === E.tool ? 'on' : ''}" data-tool="${k}">${n}</span>`).join('')}</div>
      <div class="row">${opt}</div>
      <div id="edSel">${selHTML()}</div>
      <div class="row"><span class="btn" data-a="undo">되돌리기 (${E.undo.length})</span><span class="btn" data-a="reload">다시 읽기</span><span class="btn" data-a="base">처음 자료로</span></div>
      <div class="row"><span class="btn" data-a="check">검사</span><span class="btn ${E.checked ? '' : 'mute'}" data-a="export">내보내기</span></div>
      <div id="edChk">${chkHTML()}</div><div id="edOut"></div>`;
  }
  function selHTML() {
    const s = src(), sel = E.sel; if (!sel) return '<span class="mute">고른 것 없음</span>';
    if (sel.t === 'bld') { const b = s.buildings[sel.i]; if (!b) return '';
      return `<b>${esc(b.id)}</b><div class="row"><label>이름 <input data-bf="name" value="${esc(b.name)}"></label></div><div class="row"><label>장소 <input data-bf="places" value="${esc((b.places || []).join(','))}" placeholder="장소 id, 쉼표"></label></div>
        <div class="row mute">${b.kind ? '종류 ' + esc(b.kind) : `상자 ${b.frame} · 높이 <input data-bf="z" type="number" value="${b.z}" style="width:60px">`} · 자리 ${b.x}, ${b.y}</div><div class="row"><span class="btn" data-a="del">지우기</span></div>`; }
    if (sel.t === 'lot') { const l = s.lots[sel.i]; if (!l) return '';
      return `<b>${esc(l.id)}</b> <span class="mute">${l.x}, ${l.y} · ${l.w}×${l.h}</span><div class="row"><label>상태 <select data-lf="state"><option value="vacant" ${l.state === 'vacant' ? 'selected' : ''}>빈 땅</option><option value="old" ${l.state === 'old' ? 'selected' : ''}>허름한 건물</option></select></label><label><input type="checkbox" data-lf="buy" ${l.buy ? 'checked' : ''}> 살 수 있음</label></div><div class="row"><span class="btn" data-a="del">지우기</span></div>`; }
    if (sel.t === 'prop') { const p = s.props[sel.i]; if (!p) return '';
      return `<b>${esc(M2.PKINDS[p.kind] ? M2.PKINDS[p.kind].ko : p.kind)}</b> <span class="mute">${p.at.join(', ')}</span><div class="row"><span class="btn" data-a="del">지우기</span></div>`; }
    return '';
  }
  function chkHTML() {
    if (!E.ran) return '<span class="mute">검사 전 — 내보내려면 검사를 통과해야 합니다.</span>';
    if (!E.probs.length) return '<span class="ok">문제 0 — 내보낼 수 있습니다.</span>';
    return `<span class="bad">문제 ${E.probs.length}</span>` + E.probs.slice(0, 40).map((p, i) => `<div class="prob" data-prob="${i}">· ${esc(M2.REGIONS[p.region].ko)} [${esc(p.kind)}] ${esc(p.text)}</div>`).join('');
  }

  /* ── 자료 고치기 ── */
  function change(fn) {   // 고치기 하나 = 되돌리기 하나
    E.undo.push(JSON.stringify(M2.REGIONS)); if (E.undo.length > 60) E.undo.shift();
    fn(src()); B.rebuild(S.r.id); E.checked = false; E.ran = false; panel();
  }
  function restore(json) { const o = JSON.parse(json); for (const id in o) M2.REGIONS[id] = o[id]; for (const id in M2.REGIONS) B.rebuild(id); E.sel = null; E.checked = false; E.ran = false; panel(); }
  const nextId = (list, pre) => { let n = 0; list.forEach(o => { const m = String(o.id).match(new RegExp('^' + pre.replace('.', '\\.') + '(\\d+)$')); if (m) n = Math.max(n, +m[1]); }); return pre + String(n + 1).padStart(2, '0'); };
  function runCheck() {
    E.probs = []; for (const id in B.R) E.probs.push(...M2.check(B.R[id], B.R).problems);
    E.ran = true; E.checked = !E.probs.length; panel();
  }
  function exportJS() {
    if (!E.checked) { B.flash('검사를 먼저 통과해야 내보냅니다'); return; }
    const head = `/* =====================================================================\n   map2/regions.js — 지역 자료(지도 편집 화면이 내보냄 · ${new Date().toISOString().slice(0, 16).replace('T', ' ')})\n   - 지도는 편집 화면(block.html?edit=1)에서만 고침 · 짜임 설명은 지도_짜임_설계_1113.md 3절 · kinds.js\n   ===================================================================== */\n`;
    const js = head + `(function (root) {\n  const M2 = root.M2 = root.M2 || {};\n  M2.REGIONS = ${M2.fmtRegions(M2.REGIONS)};\n  if (typeof module !== 'undefined') module.exports = M2;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
    const out = document.getElementById('edOut');
    out.innerHTML = `<textarea id="edTa" readonly></textarea><div class="row"><span class="btn" data-a="copy">복사</span><a class="btn" id="edDl" download="regions.js">내려받기</a><span class="mute">game/js/map2/regions.js 자리에 갈아 끼움</span></div>`;
    document.getElementById('edTa').value = js;
    document.getElementById('edDl').href = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
  }

  /* ── 누르기 ── */
  const cellOf = (ev) => { const w = B.s2w([ev.clientX, ev.clientY]), c = M2.toCell(S.r, w[0], w[1]); return [Math.floor(c[0]), Math.floor(c[1])]; };
  const inRect = (c, o) => c[0] >= o.x && c[0] < o.x + o.w && c[1] >= o.y && c[1] < o.y + o.h;
  function bldIndexAt(ev, c) {
    const s = src(), r = S.r; let hit = -1;
    r.blds.forEach((b, i) => { if (!b.area && inRect(c, b)) hit = i; });
    if (hit < 0) { const b = B.bldAt(B.s2w([ev.clientX, ev.clientY])); if (b) hit = r.blds.indexOf(b); }
    return hit >= 0 ? s.buildings.findIndex(x => x.id === r.blds[hit].id) : -1;
  }
  B.edit = {
    down(ev) {
      const c = cellOf(ev), s = src(), t = E.tool;
      if (E.pick) {   // 출입구 칸 · 도착 자리 찍기
        change(s2 => { if (E.pick.ex != null) { const e = s2.exits[E.pick.ex], k = e.cells.findIndex(q => q[0] === c[0] && q[1] === c[1]); if (k >= 0) e.cells.splice(k, 1); else e.cells.push(c); } else s2.entrances[E.pick.en].at = [c[0] + 0.5, c[1] + 0.5]; });
        return true;
      }
      if (t === 'view') { const i = bldIndexAt(ev, c); if (i >= 0) { E.sel = { t: 'bld', i }; panel(); } E.drag = { pan: [ev.clientX, ev.clientY] }; return true; }
      if (t === 'ground' || t === 'lot') { E.drag = { a: c, b: c }; return true; }
      if (t === 'line') {
        let p = c; if (E.pts.length) { const q = E.pts[E.pts.length - 1]; p = Math.abs(c[0] - q[0]) >= Math.abs(c[1] - q[1]) ? [c[0], q[1]] : [q[0], c[1]]; }
        E.pts.push(p); panel(); return true;
      }
      if (t === 'bld') {
        const i = bldIndexAt(ev, c);
        if (i >= 0) { E.sel = { t: 'bld', i }; E.drag = { move: 'bld', i, a: c, b: c }; panel(); return true; }
        change(s2 => {
          const id = nextId(s2.buildings, s2.id + '.b'), nb = { id, name: '새 건물', x: c[0], y: c[1], places: [] };
          if (E.bk.startsWith('box.')) { const f = E.bk.slice(4); Object.assign(nb, { w: BOX[f][0], h: BOX[f][1], z: BOX_Z[f], frame: f, door: [c[0] + BOX[f][0], c[1] + (BOX[f][1] >> 1)] }); }
          else { const k = M2.BKINDS[E.bk]; Object.assign(nb, { w: k.foot[0], h: k.foot[1], z: 90, frame: k.frame, kind: E.bk }); }
          s2.buildings.push(nb); E.sel = { t: 'bld', i: s2.buildings.length - 1 };
        });
        return true;
      }
      if (t === 'prop') {
        s.props = s.props || [];
        const i = s.props.findIndex(p => { const k = M2.PKINDS[p.kind] || { foot: [1, 1] }; return c[0] >= p.at[0] && c[0] < p.at[0] + k.foot[0] && c[1] >= p.at[1] && c[1] < p.at[1] + k.foot[1]; });
        if (i >= 0) { E.sel = { t: 'prop', i }; E.drag = { move: 'prop', i, a: c, b: c }; panel(); return true; }
        change(s2 => { s2.props = s2.props || []; s2.props.push({ kind: E.pk, at: c }); E.sel = { t: 'prop', i: s2.props.length - 1 }; });
        return true;
      }
      if (t === 'exit') return true;
      return false;
    },
    drawOver(g) {
      const r = S.r, s = src(), dia = (x, y, w, h, stroke, fill, lw) => { const P = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(p => M2.toScreen(r, p[0], p[1])); g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } };
      (s.lots || []).forEach((l, i) => dia(l.x, l.y, l.w, l.h, E.sel && E.sel.t === 'lot' && E.sel.i === i ? '#f2c14e' : l.state === 'old' ? '#c98a4a' : '#ffffff', null, E.sel && E.sel.t === 'lot' && E.sel.i === i ? 4 : 1.5));
      r.exits.forEach(e => e.cells.forEach(c => dia(c[0], c[1], 1, 1, '#f2c14e', 'rgba(242,193,78,.35)', 1)));
      r.entrances.forEach(en => { const p = M2.toScreen(r, en.at[0], en.at[1]); g.fillStyle = '#5ab4ff'; g.beginPath(); g.arc(p[0], p[1], 7, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText(en.id, p[0], p[1] - 10); });
      if (E.sel && E.sel.t === 'bld') { const b = r.blds.find(x => x.id === (s.buildings[E.sel.i] || {}).id); if (b) { dia(b.x, b.y, b.w, b.h, '#f2c14e', 'rgba(242,193,78,.18)', 4); dia(b.door[0], b.door[1], 1, 1, '#5ab4ff', 'rgba(90,180,255,.4)', 2); } }
      if (E.sel && E.sel.t === 'prop') { const p = s.props[E.sel.i], k = p && M2.PKINDS[p.kind]; if (p) dia(p.at[0], p.at[1], k ? k.foot[0] : 1, k ? k.foot[1] : 1, '#f2c14e', 'rgba(242,193,78,.25)', 3); }
      if (E.drag && E.drag.a && !E.drag.move) { const x = Math.min(E.drag.a[0], E.drag.b[0]), y = Math.min(E.drag.a[1], E.drag.b[1]); dia(x, y, Math.abs(E.drag.a[0] - E.drag.b[0]) + 1, Math.abs(E.drag.a[1] - E.drag.b[1]) + 1, '#f2c14e', 'rgba(242,193,78,.2)', 2); }
      if (E.drag && E.drag.move) { const dx = E.drag.b[0] - E.drag.a[0], dy = E.drag.b[1] - E.drag.a[1]; const o = E.drag.move === 'bld' ? s.buildings[E.drag.i] : null; if (o) dia(o.x + dx, o.y + dy, o.w || 1, o.h || 1, '#7fd68a', 'rgba(127,214,138,.2)', 3); const p = E.drag.move === 'prop' ? s.props[E.drag.i] : null; if (p) dia(p.at[0] + dx, p.at[1] + dy, 1, 1, '#7fd68a', 'rgba(127,214,138,.3)', 3); }
      if (E.pts.length) { g.strokeStyle = '#f2c14e'; g.lineWidth = 3; g.beginPath(); E.pts.forEach((c, i) => { const p = M2.toScreen(r, c[0] + 0.5, c[1] + 0.5); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke(); E.pts.forEach(c => dia(c[0], c[1], 1, 1, '#f2c14e', null, 2)); }
      E.probs.filter(p => p.region === r.id && p.at).forEach(p => dia(p.at[0], p.at[1], 1, 1, '#ff5a5a', 'rgba(255,90,90,.45)', 2));
    }
  };
  const cv = document.getElementById('cv');
  cv.addEventListener('pointermove', (ev) => {
    if (!E.drag) return;
    if (E.drag.pan) { S.cam[0] -= (ev.clientX - E.drag.pan[0]) / S.zoom; S.cam[1] -= (ev.clientY - E.drag.pan[1]) / S.zoom; E.drag.pan = [ev.clientX, ev.clientY]; return; }
    E.drag.b = cellOf(ev);
  });
  addEventListener('pointerup', () => {
    const d = E.drag; E.drag = null; if (!d || d.pan) return;
    const dx = d.b[0] - d.a[0], dy = d.b[1] - d.a[1];
    if (d.move) { if (!dx && !dy) return; change(s => { if (d.move === 'bld') { const b = s.buildings[d.i]; b.x += dx; b.y += dy; if (b.door) b.door = [b.door[0] + dx, b.door[1] + dy]; } else { const p = s.props[d.i]; p.at = [p.at[0] + dx, p.at[1] + dy]; } }); return; }
    const x = Math.min(d.a[0], d.b[0]), y = Math.min(d.a[1], d.b[1]), w = Math.abs(dx) + 1, h = Math.abs(dy) + 1;
    if (E.tool === 'ground') change(s => s.ground.push({ t: 'rect', k: E.gk, x, y, w, h }));
    if (E.tool === 'lot') {
      const s = src(), i = (s.lots || []).findIndex(l => inRect(d.a, l));
      if (w === 1 && h === 1 && i >= 0) { E.sel = { t: 'lot', i }; panel(); return; }
      change(s2 => { s2.lots = s2.lots || []; s2.lots.push({ id: nextId(s2.lots, s2.id + '.lot'), x, y, w, h, state: 'vacant', buy: 1 }); E.sel = { t: 'lot', i: s2.lots.length - 1 }; });
    }
  });
  cv.addEventListener('wheel', (ev) => { ev.preventDefault(); S.zoom = Math.max(0.2, Math.min(2.5, S.zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12))); }, { passive: false });
  function endLine() { if (E.pts.length < 2) { E.pts = []; panel(); return; } const pts = E.pts.slice(); E.pts = []; change(s => s.ground.push({ t: 'line', k: E.gk, w: E.lw, pts })); }
  function del() {
    const sel = E.sel; if (!sel) return;
    change(s => { if (sel.t === 'bld') s.buildings.splice(sel.i, 1); if (sel.t === 'lot') s.lots.splice(sel.i, 1); if (sel.t === 'prop') s.props.splice(sel.i, 1); });
    E.sel = null; panel();
  }
  addEventListener('keydown', (ev) => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (E.undo.length) restore(E.undo.pop()); return; }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { del(); return; }
    if (ev.key === 'Escape') { E.pts = []; E.pick = null; E.sel = null; panel(); return; }
    if (ev.key === 'Enter' && E.tool === 'line') { endLine(); return; }
    const k = { ArrowLeft: [-60, 0], ArrowRight: [60, 0], ArrowUp: [0, -60], ArrowDown: [0, 60] }[ev.key]; if (k) { S.cam[0] += k[0] / S.zoom; S.cam[1] += k[1] / S.zoom; }
  });
  P.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-tool],[data-a],[data-region],[data-prob]'); if (!el) return;
    if (el.dataset.tool) { E.tool = el.dataset.tool; E.pts = []; E.pick = null; panel(); return; }
    if (el.dataset.region) { B.enter(el.dataset.region); S.cam = S.pos.slice(); E.sel = null; panel(); return; }
    if (el.dataset.prob != null) { const p = E.probs[+el.dataset.prob]; if (p.region !== S.r.id) { B.enter(p.region); S.cam = S.pos.slice(); } if (p.at) { const w = M2.toScreen(S.r, p.at[0] + 0.5, p.at[1] + 0.5); S.cam = [w[0], w[1]]; } panel(); return; }
    const a = el.dataset.a;
    if (a === 'undo') { if (E.undo.length) restore(E.undo.pop()); }
    else if (a === 'reload') { for (const id in M2.REGIONS) B.rebuild(id); runCheck(); }
    else if (a === 'base') { E.undo.push(JSON.stringify(M2.REGIONS)); restore(BASE); }
    else if (a === 'check') runCheck();
    else if (a === 'export') exportJS();
    else if (a === 'copy') { const ta = document.getElementById('edTa'); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => B.flash('복사했습니다'), () => { ta.select(); B.flash('글을 골라 두었습니다 — ⌘C 로 복사'); }); }
    else if (a === 'del') del();
    else if (a === 'lineEnd') endLine();
    else if (a === 'lineCancel') { E.pts = []; panel(); }
    else if (a === 'pickEx') { E.pick = E.pick && E.pick.ex === +el.dataset.i ? null : { ex: +el.dataset.i }; panel(); }
    else if (a === 'pickEn') { E.pick = E.pick && E.pick.en === +el.dataset.i ? null : { en: +el.dataset.i }; panel(); }
    else if (a === 'addEx') change(s => { s.exits = s.exits || []; const other = Object.keys(M2.REGIONS).find(id => id !== s.id) || s.id; s.exits.push({ id: 'exit' + (s.exits.length + 1), cells: [], to: { region: other, entrance: (M2.REGIONS[other].entrances[0] || {}).id } }); E.pick = { ex: s.exits.length - 1 }; });
    else if (a === 'addEn') change(s => { s.entrances = s.entrances || []; s.entrances.push({ id: 'in' + (s.entrances.length + 1), at: [Math.floor(s.size[0] / 2) + 0.5, Math.floor(s.size[1] / 2) + 0.5] }); E.pick = { en: s.entrances.length - 1 }; });
  });
  P.addEventListener('change', (ev) => {
    const el = ev.target, s = src();
    if (el.id === 'edGk') { E.gk = el.value; return; } if (el.id === 'edLw') { E.lw = Math.max(1, Math.min(6, +el.value || 1)); return; }
    if (el.id === 'edBk') { E.bk = el.value; return; } if (el.id === 'edPk') { E.pk = el.value; return; }
    if (el.dataset.bf && E.sel) { const f = el.dataset.bf; change(s2 => { const b = s2.buildings[E.sel.i]; if (f === 'places') b.places = el.value.split(',').map(t => t.trim()).filter(Boolean); else if (f === 'z') b.z = Math.max(10, +el.value || b.z); else b[f] = el.value; }); return; }
    if (el.dataset.lf && E.sel) { const f = el.dataset.lf; change(s2 => { const l = s2.lots[E.sel.i]; if (f === 'buy') l.buy = el.checked ? 1 : 0; else l.state = el.value; }); return; }
    if (el.dataset.ex != null) { const i = +el.dataset.ex; change(s2 => { const e = s2.exits[i]; if (el.dataset.f === 'region') { e.to.region = el.value; e.to.entrance = (M2.REGIONS[el.value].entrances[0] || {}).id; } else e.to.entrance = el.value; }); }
    void s;
  });
  window.EDIT = { E, runCheck, exportJS, change, src };   // 시험용
  panel();
  // 눌러 보는 시험(?edit=1&edtest=1): 진짜 누르기 길(down · pointerup)로 놓기 · 옮기기 · 지우기 · 길 · 필지 · 사물 · 되돌리기 · 검사 · 내보내기 → 결과를 <pre id="result">
  if (new URLSearchParams(location.search).has('edtest')) {
    const out = [], ok = (c, t) => out.push((c ? 'ok ' : 'NG ') + t), at = (c) => { const p = B.w2s(M2.toScreen(S.r, c[0] + 0.5, c[1] + 0.5)); return { clientX: p[0], clientY: p[1] }; };
    const tap = (c) => { B.edit.down(at(c)); dispatchEvent(new Event('pointerup')); };
    const drag = (a, b) => { B.edit.down(at(a)); cv.dispatchEvent(Object.assign(new Event('pointermove'), at(b))); dispatchEvent(new Event('pointerup')); };
    const tool = (t) => { E.tool = t; panel(); };
    const s0 = src(), nb = s0.buildings.length, nl = (s0.lots || []).length, np = (s0.props || []).length, ng = s0.ground.length;
    runCheck(); ok(E.checked, '처음 자료 검사 통과');
    tool('bld'); E.bk = 'box.s'; tap([3, 60]); ok(src().buildings.length === nb + 1, '상자 건물 놓기 → ' + src().buildings[src().buildings.length - 1].id);
    const nbId = src().buildings[src().buildings.length - 1].id; tap([3, 60]); drag([3, 60], [5, 60]); ok(src().buildings.find(b => b.id === nbId).x === 5, '건물 끌어 옮기기');
    E.bk = 'bt.office_m_a'; tap([8, 56]); const kb = src().buildings[src().buildings.length - 1]; ok(kb.kind === 'bt.office_m_a' && !kb.door, '낱장 건물 놓기(문은 종류에서)');
    tool('line'); E.gk = 'road'; E.lw = 2; tap([2, 50]); tap([12, 51]); endLine(); const ln = src().ground[src().ground.length - 1]; ok(ln.t === 'line' && ln.pts[1][1] === 50, '길: 가로로 맞춤');
    tool('lot'); drag([14, 52], [16, 54]); ok((src().lots || []).length === nl + 1 && src().lots[src().lots.length - 1].w === 3, '필지 끌어 만들기');
    /* 사물이 없는 칸을 찾아 놓음 — 전엔 [24, 22] 고정이었는데 지도에 그 자리 사물이 생겨 '놓기'가 '고르기'가 되고, 다음 줄이 있던 사물을 지워 두 줄이 실패로 나왔음(11-14) */
    const free = (c) => !(src().props || []).some(p => { const k = M2.PKINDS[p.kind] || { foot: [1, 1] }; return c[0] >= p.at[0] && c[0] < p.at[0] + k.foot[0] && c[1] >= p.at[1] && c[1] < p.at[1] + k.foot[1]; });
    let pc = [24, 22]; for (let x = 24; x < 40 && !free(pc); x++) pc = [x, 22];
    tool('prop'); tap(pc); ok((src().props || []).length === np + 1, '사물 놓기');
    E.sel = { t: 'prop', i: src().props.length - 1 }; del(); ok(src().props.length === np, '사물 지우기');
    runCheck(); ok(E.ran, '검사 돎 · 문제 ' + E.probs.length + (E.probs[0] ? ' (' + E.probs[0].kind + ')' : ''));
    exportJS(); ok(!document.getElementById('edTa') || !E.checked, '문제 있으면 내보내기 막힘');
    while (E.undo.length) restore(E.undo.pop());
    ok(src().buildings.length === nb && src().ground.length === ng && (src().lots || []).length === nl, '모두 되돌리기');
    runCheck(); ok(E.checked, '되돌린 뒤 검사 통과'); exportJS(); const ta = document.getElementById('edTa');
    ok(ta && /M2\.REGIONS = \{/.test(ta.value), '내보내기 글 ' + (ta ? ta.value.length : 0) + '자');
    let back = null; try { const f = new Function('window', 'globalThis', ta.value + '; return window.M2.REGIONS;'); back = f({}, {}); } catch (e) { out.push('NG 내보낸 글 읽기 실패 ' + e.message); }
    ok(back && JSON.stringify(back) === JSON.stringify(M2.REGIONS), '내보낸 글을 다시 읽으면 같은 자료');
    const pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = 'EDTEST ' + (out.some(l => l.startsWith('NG')) ? 'FAIL' : 'PASS') + '\n' + out.join('\n'); document.body.prepend(pre);
  }
})();
