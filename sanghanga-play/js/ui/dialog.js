/* =====================================================================
   ui/dialog.js — 이벤트 장면(목업 03) · 대화창
   - 대사는 한 글자씩 · 누르면 한 번에 · 마지막 줄 뒤에 고르기
   - 고르기 조건: 숫자가 모자라면 회색 + 무엇이 모자란지 · 관계·표지 조건이면 아예 숨김 (엔진이 가름)
   - 고르기 단추에 비용을 미리 보임(돈 · 체력 · 이 칸을 쓰는지) — 숨은 숫자는 말로도 안 보임
   - 컷신(cg)이 있으면 무대를 꽉 채우고 대화창을 얹음
   ===================================================================== */
const BG_OF = () => SH.placeCol('bg');   /* 장소 → 칠한 배경 · 원본 = 04_시범/장소_카드.md '칠한 배경' 칸 */
// 장소 안 배경 그림(11-13 대표님 '장소 안 + 행인' · img/bg) — 없는 장소는 위 BG_OF 의 칠한 배경 그대로
const PLACE_BG = () => SH.placeCol('bg_img');   /* 장소 → img/bg/in_<값>.jpg · 원본 = 04_시범/장소_카드.md '배경 그림' 칸 */
function placeBg(pid, bg) { const k = PLACE_BG()[pid]; return k ? `<img class="bg bgimg" decoding="sync" src="${illImg.bgSrc(k)}" alt="">` : `<div class="bg bg-${bg}"></div>${BGPROPS[bg] || ''}`; }
const D = { lines: [], li: 0, P: null, focus: null };
/* 임시(11-16 대표님 '이벤트 씬에 보기 변경 작은 단추 · 극 초반 정하은 · 민유진 장면으로 잠깐 바꿔 보고 결정'): 대사 화면에 주인공 그림을 띄우는 방식 넷 · 인물 크기 둘을 눌러 바꿔 봄
   단추 글 = 자료(대사/화면_글.json VIEW_TRY) · 고른 값은 이 브라우저에 남음 · 꾸밈 = game.css 끝 'vm-' 'vs-' · 방식이 정해지면 고른 것만 남기고 이 묶음과 단추를 걷음(남은_할일) */
D.view = {
  T: () => SH.D.ui_lines.VIEW_TRY, on: (id) => !!(SH.EV && SH.EV[id]) || !!D.scene,   /* 11-16 대표님 '전체에 띄워' — 모든 대사 장면(큰 그림이 깔리는 장면은 부르는 쪽에서 뺌) */
  keys: (k) => D.view.T()[k].map(x => x[0]),
  get: (k) => { let v = D.view.mem[k] || new URLSearchParams(location.search).get(k === 'modes' ? 'vm' : 'vs'); try { v = v || localStorage.getItem('sh_view_' + k); } catch (e) { /* 저장을 못 쓰는 브라우저 — 이번 화면 동안만 */ } const L = D.view.keys(k); return L.includes(v) ? v : L[0]; },   /* 주소 끝 &vm=duo&vs=up 으로도 고름(사진 · 바로 보기) */
  next: (k) => { const L = D.view.keys(k), v = L[(L.indexOf(D.view.get(k)) + 1) % L.length]; D.view.mem[k] = v; try { localStorage.setItem('sh_view_' + k, v); } catch (e) { /* 못 써도 이번 화면에선 바뀜 */ } },
  mem: {}, last: null, hm: 'base',
  label: (k) => `${D.view.T().label[k]} · ${(D.view.T()[k].find(x => x[0] === D.view.get(k)) || [])[1]}`,
  tools: (id) => D.view.on(id) ? ['modes', 'sizes'].map(k => `<span class="btn sm vw" data-act="view-${k}">${esc(D.view.label(k))}</span>`).join('') : '',
  heroMood: (expr) => { const o = heroArt(G.st).replace(/_smile$/, ''), e = SH.exprId(SH.GAME.hero, expr); return o === 'base' ? e : `${o}_${e}`; },   /* 직급 옷 그림 = ill_hero_<옷>_<표정> */
  main: () => document.querySelector('#screen img.ill:not(.sw-old):not(.me)'),
  apply() {
    const sc = document.getElementById('screen'), im = D.view.main(); if (!sc || !D.P || !D.view.on(D.P.id) || !sc.querySelector('.dlg')) return;
    const m = D.view.get('modes'), z = D.view.get('sizes'), ME = SH.GAME.hero;
    [...sc.classList].filter(c => /^v[ms]-/.test(c)).forEach(c => sc.classList.remove(c)); sc.classList.add('vm-' + m, 'vs-' + z);
    sc.querySelectorAll('img.ill.me,canvas.hchip').forEach(e => e.remove());
    /* 주인공 그림: '둘이 함께'는 늘 왼쪽에 · 상대가 없는 장면(혼잣말 · 혼자 있는 장면)은 '번갈아'에서도 주인공이 섬 */
    if (m === 'duo' || (m === 'swap' && !im)) (im || sc.querySelector('.dots')).insertAdjacentHTML('afterend', artImg(ME, D.view.hm, 'ill me' + (sc.classList.contains('dark') ? ' night' : '') + (G.instant ? '' : ' sw-in')));
    if (m === 'chip') { sc.querySelector('.dlg').insertAdjacentHTML('beforebegin', `<canvas class="hchip" data-face="${ME}" data-mood="${D.view.hm}" data-n="64" data-s="4.5"></canvas>`); faceDraw(sc.querySelector('canvas.hchip')); }
    if (im && D.view.last) setArt(im, D.view.last.id, D.view.last.mood);   /* '번갈아'에서 주인공이 서 있던 자리를 상대 그림으로 되돌림 */
    ['modes', 'sizes'].forEach(k => { const b = sc.querySelector(`[data-act="view-${k}"]`); if (b) b.textContent = D.view.label(k); });
    if (D.lines[D.li]) D.view.line(D.lines[D.li]);
  },
  line(line) {      /* 그 줄을 말하는 사람에 맞춰 주인공 그림 · 밝기 */
    const sc = document.getElementById('screen'); if (!sc || !D.P || !D.view.on(D.P.id) || line.speaker === 'nar') return;
    const me = line.speaker === SH.GAME.hero, m = D.view.get('modes'); sc.dataset.spk = me ? 'me' : 'you';
    if (!me) return;
    D.view.hm = D.view.heroMood(line.expr);
    const im = (m === 'swap' && D.view.main()) || (m === 'swap' || m === 'duo' ? sc.querySelector('img.ill.me:not(.sw-old)') : null), cv = m === 'chip' ? sc.querySelector('canvas.hchip') : null;
    if (im) setArt(im, SH.GAME.hero, D.view.hm);
    if (cv) { cv.dataset.mood = D.view.hm; faceDraw(cv); }
  },
};
D.talk = (P) => !!P && (P.t === 'event' || P.t === 'reply' || P.t === 'lmeet');   /* 한 줄씩 넘기는 대사 화면인 물음 */
const TALK_LOG = [];      // 대사 기록 (휠 위 · '기록' 단추)

function focusOf(ev) {      // 그림으로 세울 사람: 그림 칸의 첫 인물(나중 표정 빼고) → 누가 첫째
  const ch = ((ev.art && ev.art.chars) || []).find(c => !c.later);
  return ch ? { id: ch.id, expr: ch.expr } : (ev.who && ev.who[0] ? { id: ev.who[0], expr: null } : null);
}
// 고르기 단추에 붙일 값 — 108(11-14 대표님 '체력, 스트레스, 돈의 변화는 선택지 질문에 포함 · 호감도와 능력치 변화만 뺄 것'): 체력 · 스트레스 · 돈은 값 그대로 · 능력 · 호감은 고른 뒤 뜨는 칸에서만
//   (전: 11-13 '오르내림만' — 능력 · 체력 · 스트레스 · 호감을 ▲ / ▼로) · 숨은 줄기 값(작전 · 증거 표지)은 안 보임
function costOf(st, ev, c) {
  const e = c.effects || {}, out = [], chip = (i, t, cls) => `<span class="cchip${cls ? ' ' + cls : ''}">${i}${esc(t)}</span>`;
  const arrow = (v, big) => (v > 0 ? '▲' : '▼').repeat(Math.abs(v) >= big ? 2 : 1), sg = (v) => (v > 0 ? '+' : '−') + Math.abs(v);
  if (+e.hp) out.push(chip(ic('hp'), sg(+e.hp), +e.hp > 0 ? 'up' : 'dn'));      /* 238: 색은 방향(오름 빨강 · 내림 파랑) */
  if (+e.stress) out.push(chip(ic('stress'), sg(+e.stress), +e.stress > 0 ? 'up' : 'dn'));
  if (e.task && e.task.progress) out.push(chip(ic16('up', 16), `과제 ${arrow(e.task.progress, 2)}`, 'up'));
  if (e.money) out.push(chip(ic('coin'), `${e.money > 0 ? '+' : '−'}${SH.won(Math.abs(e.money))}`, e.money < 0 ? 'dn' : 'up'));
  // '이 칸' 칩은 뺌 — 한 장면의 고르기가 모두 같은 칸을 써서 정보가 없음(장면 글이 '[고르면 … 칸을 씁니다]'로 알림)
  if (e.ending) out.push(chip('', '여기서 끝남', 'end'));
  return out.join('');
}

/* scene = 카드가 아닌 장면(11-16 대표님 '만남 창을 대사 장면처럼' — 사원 뒤 만남 · 결산 앞 장면 · ui/loop.js meet 가 넘김): { title · when.place · who · art.cg · lines · extra(끝 줄에 드러나는 쪽지 · 얻은 것) · acts(끝 줄 단추) } */
function eventScreen(P, isReply, scene) {
  G.redraw = null;     // 대화 중엔 다시 그리지 않음(배경은 CSS 로 늘어남)
  const st = G.st, ev = scene || SH.EV[P.id];
  const cg = SH.cgPath(ev.art && ev.art.cg);
  D.P = P; D.li = 0; D.isReply = !!isReply; D.scene = scene || null;
  D.lines = scene ? scene.lines : P.lines;
  if (!D.lines.length) D.lines = [{ speaker: 'nar', expr: null, text: '…' }];
  const f = focusOf(ev); D.focus = f; illImg.scene(D.lines, f);
  const place = SH.PL[ev.when.place];
  const chip = `${place ? short(place.name_ko) : ''}${ev.when.slot && ev.when.slot !== '결산' ? ' · ' + ev.when.slot.replace('퇴근뒤', '퇴근 뒤').replace('주말낮', '주말') : ev.when.slot === '결산' && ev.when.day === '금' ? ' · 금요일' : ''}`;   /* 금요일 퇴근길 장면만 요일을 붙임 — 일요일 밤 결산 뒤의 발표 · 경고 장면(월요일 아침)은 장소만 */
  let who = '';
  if (f && f.id && SH.CH[f.id]) {
    const r = st.rel[f.id];
    const stg = SH.stageName(st, f.id);
    who = `<div class="who px"><div class="n">${SH.name(f.id)}</div><div class="s">${SH.job(f.id)}</div>
      <div class="st"><span class="mute">관계</span><span class="gold-t">${stg}</span>${r && r.q ? '<span class="red-t">· 다투는 중</span>' : ''}</div></div>`;
  }
  const next = `<div class="hot" data-next="1"><b>▶</b>계속</div>`;
  const ch = isReply ? next : scene ? (scene.acts || '') + next
    : (P.choices.length ? P.choices.map((c, k) => {
      const cost = costOf(st, ev, ev.choices[c.i]);
      return `<div data-pick="${c.ok ? c.i : ''}" class="${c.ok ? '' : 'dis'}"><b>${k + 1}</b><span>${esc(c.text)}${c.ok ? '' : `<small>${esc(c.why)}</small>`}</span>${cost ? `<small class="cchips">${cost}</small>` : ''}</div>`;
    }).join('') : next);
  const sc = document.getElementById('screen');
  /* 장면이 벌어지는 자리 — when.place, 없으면 카드 art.bg(bg_<장소 id>)가 가리키는 장소(배경 그림이 있는 곳만) */
  const abg = ev.art && ev.art.bg ? ev.art.bg.replace(/^bg_/, '') : null, at = ev.when.place || (abg && PLACE_BG()[abg] ? abg : undefined), dark = ['bar', 'hotel'].includes(BG_OF()[at]);
  sc.className = 'k-event' + (cg ? ' cgon' : '') + (dark ? ' dark' : '');
  const bg = BG_OF()[at] || 'office';
  sc.innerHTML = (cg ? `<img class="cg" src="${cg}" alt=""><div class="cgshade"></div>`
    : `${placeBg(at, bg)}<div class="dots"></div>${f ? artImg(f.id, SH.exprId(f.id, f.expr), 'ill ' + (dark ? 'night' : '')) : ''}`)
    + `<div class="title"><span class="chip">${esc(chip)}</span><h2>${esc(SH.fill(ev.title, st))}</h2></div>${cg ? '' : who}${(scene && scene.extra) || ''}
    <div class="dlg px"><div class="name" id="nm"></div><div class="tools">${cg ? '' : D.view.tools(P.id)}<span class="btn sm log" data-act="talk-log">${esc(SH.D.ui_lines.DLG.log)}</span><span class="btn sm" data-act="talk-back">${esc(SH.D.ui_lines.DLG.back)}</span><span class="btn sm" data-act="talk-skip">${esc(SH.D.ui_lines.DLG.skip)}</span></div>
      <div class="text" id="tx"></div><div class="ch" id="ch">${ch}</div></div>`;
  paint(sc);
  D.view.last = f && SH.CH[f.id] ? { id: f.id, mood: SH.exprId(f.id, f.expr) } : null; D.view.hm = D.view.heroMood(null); delete sc.dataset.spk; if (!cg) D.view.apply();   /* 말하는 쪽 표시는 장면마다 새로 */
  // 이미 본 카드(되풀이 카드)는 본 줄을 건너뛰고 마지막 줄부터
  if (!isReply) TALK_LOG.push({ sep: true, text: SH.fill(scene ? P.title : ev.title, st) });   // 지난 대사 창에서 장면이 갈리는 자리
  if (!isReply && !scene && st.seen[ev.id] != null && D.lines.length > 1) { D.lines.slice(0, -1).forEach(logLine); D.li = D.lines.length - 1; }
  showLine();
}
/* back = '뒤로'로 온 줄(11-16 대표님 '선택지 제외하고 이전 대화로 되돌리는 기능'): 글은 바로 다 뜨고 지난 대사 기록에 다시 안 쌓임 */
function showLine(back) {
  const line = D.lines[D.li];
  const nm = document.getElementById('nm'), tx = document.getElementById('tx');
  if (!nm) return;
  document.getElementById('screen').classList.toggle('fin', D.li === D.lines.length - 1);   /* 끝 줄 — 만남 장면의 쪽지 · 얻은 것이 드러남 */
  document.querySelector('#screen [data-act="talk-back"]')?.classList.toggle('dis', D.li === 0);
  if (line.speaker === 'nar') { nm.className = 'name hide'; tx.className = 'text nar'; }
  else { nm.className = 'name' + (line.speaker === 'hero' ? ' me' : ''); nm.innerHTML = `${esc(SH.name(line.speaker))}<small>${esc(SH.job(line.speaker))}${document.documentElement.classList.contains('dlg2') && line.speaker !== 'hero' && SH.CH[line.speaker] && G.st.rel[line.speaker] ? ` · <i class="rel">${esc(SH.stageName(G.st, line.speaker))}</i>${G.st.rel[line.speaker].q ? ' · 다투는 중' : ''}` : ''}</small>`; tx.className = 'text'; }
  /* 그림은 말하는 사람으로 — 뒤로 온 줄이 서술이면 그때 서 있던 사람(그 앞의 마지막 말한 줄) · 그런 줄이 없으면 장면의 첫 사람 */
  const ref = back && line.speaker === 'nar' ? D.lines.slice(0, D.li).reverse().find(l => l.speaker !== 'nar') : line, im = D.view.main();
  if (ref) {
    if (im && ref.speaker !== 'nar' && ref.speaker !== 'hero' && SH.CH[ref.speaker]) {
      const base = D.focus && D.focus.id === ref.speaker ? D.focus.expr : null;
      D.view.last = { id: ref.speaker, mood: SH.exprId(ref.speaker, ref.expr || base) };
      setArt(im, D.view.last.id, D.view.last.mood);
    }
    D.view.line(ref);
  } else if (back && im && D.focus && SH.CH[D.focus.id]) { D.view.last = { id: D.focus.id, mood: SH.exprId(D.focus.id, D.focus.expr) }; setArt(im, D.view.last.id, D.view.last.mood); }
  if (!back) logLine(line);
  const done = () => { if (D.li === D.lines.length - 1) { document.getElementById('ch')?.classList.add('show'); toast.fit(); } else tx.insertAdjacentHTML('beforeend', '<span class="more blink">▼</span>'); };
  typeInto(tx, line.text, done); if (back) finishType();
}
D.back = function () {   /* 그 장면 안에서 앞 줄로 한 줄 — 고르기 · 앞 장면으로는 안 돌아감(그 앞은 '지난 대사') */
  finishType(); if (D.li <= 0) return false;
  D.li--; document.getElementById('ch')?.classList.remove('show'); showLine(true); return true;
};
function logLine(l) { TALK_LOG.push({ who: l.speaker === 'nar' ? '' : SH.name(l.speaker), text: l.text }); if (TALK_LOG.length > 200) TALK_LOG.shift(); }
function dialogSkip() { finishType(); while (D.li < D.lines.length - 1) { D.li++; showLine(); finishType(); } document.getElementById('ch')?.classList.add('show'); }
function talkLogOverlay() {   /* 닫기는 맨 위에 늘 보이게 · 대사만 그 아래에서 넘김 · 창밖을 누르거나 Esc 로도 닫힘(11-16 대표님 '닫을 길이 없음 — 밑에 닫기가 있는데 안 보였음') */
  overlay(`<div class="box px wide tlog"><div class="tl-h"><h2>지난 대사</h2><div class="btn" data-act="ovl-close">닫기</div></div><p class="talklog">${TALK_LOG.slice(-60).map(l => l.sep ? `<span class="mute">── ${esc(l.text)} ──</span>` : `${l.who ? `<b class="gold-t">${esc(l.who)}</b> ` : ''}${esc(l.text)}`).join('<br>') || '아직 없음'}</p></div>`);
  const b = document.querySelector('#ovl .talklog'); if (b) b.scrollTop = b.scrollHeight;
}
function dialogAdvance() {
  if (finishType()) return true;
  if (D.li < D.lines.length - 1) { D.li++; showLine(); return true; }
  const ch = document.getElementById('ch');
  if (ch && !ch.classList.contains('show')) { ch.classList.add('show'); return true; }
  return false;   // 마지막 줄 — 고르기를 기다림
}
