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
function placeBg(pid, bg) { const k = PLACE_BG()[pid]; return k ? `<img class="bg bgimg" src="img/bg/in_${k}.jpg" alt="">` : `<div class="bg bg-${bg}"></div>${BGPROPS[bg] || ''}`; }
const D = { lines: [], li: 0, P: null, focus: null };
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
  if (+e.hp) out.push(chip(ic('bolt'), sg(+e.hp), +e.hp > 0 ? 'pos' : 'neg'));
  if (+e.stress) out.push(chip(ic('stress'), sg(+e.stress), +e.stress > 0 ? 'neg' : 'pos'));
  if (e.task && e.task.progress) out.push(chip(ic16('up', 16), `과제 ${arrow(e.task.progress, 2)}`, 'pos'));
  if (e.money) out.push(chip(ic('coin'), `${e.money > 0 ? '+' : '−'}${SH.won(Math.abs(e.money))}`, e.money < 0 ? 'neg' : 'pos'));
  // '이 칸' 칩은 뺌 — 한 장면의 고르기가 모두 같은 칸을 써서 정보가 없음(장면 글이 '[고르면 … 칸을 씁니다]'로 알림)
  if (e.ending) out.push(chip('', '여기서 끝남', 'end'));
  return out.join('');
}

function eventScreen(P, isReply) {
  G.redraw = null;     // 대화 중엔 다시 그리지 않음(배경은 CSS 로 늘어남)
  const st = G.st, ev = SH.EV[P.id];
  const cg = SH.cgPath(ev.art && ev.art.cg);
  D.P = P; D.li = 0; D.isReply = !!isReply;
  D.lines = isReply ? P.lines : P.lines;
  if (!D.lines.length) D.lines = [{ speaker: 'nar', expr: null, text: '…' }];
  const f = focusOf(ev); D.focus = f;
  const place = SH.PL[ev.when.place];
  const chip = `${place ? short(place.name_ko) : ''}${ev.when.slot && ev.when.slot !== '결산' ? ' · ' + ev.when.slot.replace('퇴근뒤', '퇴근 뒤').replace('주말낮', '주말') : ev.when.slot === '결산' ? ' · 금요일 결산' : ''}`;
  let who = '';
  if (f && f.id && SH.CH[f.id]) {
    const r = st.rel[f.id];
    const stg = SH.stageName(st, f.id);
    who = `<div class="who px"><div class="n">${SH.name(f.id)}</div><div class="s">${SH.job(f.id)}</div>
      <div class="st"><span class="mute">관계</span><span class="gold-t">${stg}</span>${r && r.q ? '<span class="red-t">· 다투는 중</span>' : ''}</div></div>`;
  }
  const ch = isReply ? `<div class="hot" data-next="1"><b>▶</b>계속</div>`
    : (P.choices.length ? P.choices.map((c, k) => {
      const cost = costOf(st, ev, ev.choices[c.i]);
      return `<div data-pick="${c.ok ? c.i : ''}" class="${c.ok ? '' : 'dis'}"><b>${k + 1}</b><span>${esc(c.text)}${c.ok ? '' : `<small>${esc(c.why)}</small>`}</span>${cost ? `<small class="cchips">${cost}</small>` : ''}</div>`;
    }).join('') : `<div class="hot" data-next="1"><b>▶</b>계속</div>`);
  const sc = document.getElementById('screen');
  const dark = ['bar', 'hotel'].includes(BG_OF()[ev.when.place]);
  sc.className = 'k-event' + (cg ? ' cgon' : '') + (dark ? ' dark' : '');
  const bg = BG_OF()[ev.when.place] || 'office';
  sc.innerHTML = (cg ? `<img class="cg" src="${cg}" alt=""><div class="cgshade"></div>`
    : `${placeBg(ev.when.place, bg)}<div class="dots"></div>${f ? artImg(f.id, SH.exprId(f.id, f.expr), 'ill ' + (dark ? 'night' : '')) : ''}`)
    + `<div class="title"><span class="chip">${esc(chip)}</span><h2>${esc(SH.fill(ev.title, st))}</h2></div>${cg ? '' : who}
    <div class="dlg px"><div class="name" id="nm"></div><div class="tools"><span class="btn sm log" data-act="talk-log">◀ 지난 대사</span><span class="btn sm" data-act="talk-skip">빨리 ▶▶</span></div>
      <div class="text" id="tx"></div><div class="ch" id="ch">${ch}</div></div>`;
  paint(sc);
  // 이미 본 카드(되풀이 카드)는 본 줄을 건너뛰고 마지막 줄부터
  if (!isReply) TALK_LOG.push({ sep: true, text: SH.fill(ev.title, st) });   // 지난 대사 창에서 장면이 갈리는 자리
  if (!isReply && st.seen[ev.id] != null && D.lines.length > 1) { D.lines.slice(0, -1).forEach(logLine); D.li = D.lines.length - 1; }
  showLine();
}
function showLine() {
  const line = D.lines[D.li];
  const nm = document.getElementById('nm'), tx = document.getElementById('tx');
  if (!nm) return;
  if (line.speaker === 'nar') { nm.className = 'name hide'; tx.className = 'text nar'; }
  else { nm.className = 'name' + (line.speaker === 'hero' ? ' me' : ''); nm.innerHTML = `${esc(SH.name(line.speaker))}<small>${esc(SH.job(line.speaker))}${document.documentElement.classList.contains('dlg2') && line.speaker !== 'hero' && SH.CH[line.speaker] && G.st.rel[line.speaker] ? ` · <i class="rel">${esc(SH.stageName(G.st, line.speaker))}</i>${G.st.rel[line.speaker].q ? ' · 다투는 중' : ''}` : ''}</small>`; tx.className = 'text'; }
  // 말하는 사람으로 그림을 바꿈(그림이 있는 인물만)
  const im = document.querySelector('#screen img.ill');
  if (im && line.speaker !== 'nar' && line.speaker !== 'hero' && SH.CH[line.speaker]) {
    const base = D.focus && D.focus.id === line.speaker ? D.focus.expr : null;
    setArt(im, line.speaker, SH.exprId(line.speaker, line.expr || base));
  }
  logLine(line);
  const done = () => { if (D.li === D.lines.length - 1) document.getElementById('ch')?.classList.add('show'); else tx.insertAdjacentHTML('beforeend', '<span class="more blink">▼</span>'); };
  typeInto(tx, line.text, done);
}
function logLine(l) { TALK_LOG.push({ who: l.speaker === 'nar' ? '' : SH.name(l.speaker), text: l.text }); if (TALK_LOG.length > 200) TALK_LOG.shift(); }
function dialogSkip() { finishType(); while (D.li < D.lines.length - 1) { D.li++; showLine(); finishType(); } document.getElementById('ch')?.classList.add('show'); }
function talkLogOverlay() {
  overlay(`<div class="box px wide"><h2>지난 대사</h2><p class="talklog" style="font-size:max(14px,var(--fl));line-height:1.8">${TALK_LOG.slice(-60).map(l => l.sep ? `<span class="mute">── ${esc(l.text)} ──</span>` : `${l.who ? `<b class="gold-t">${esc(l.who)}</b> ` : ''}${esc(l.text)}`).join('<br>') || '아직 없음'}</p>
    <div class="acts"><div class="btn big" data-act="ovl-close">닫기</div></div></div>`);
  const b = document.querySelector('#ovl .box'); if (b) b.scrollTop = b.scrollHeight;
}
function dialogAdvance() {
  if (finishType()) return true;
  if (D.li < D.lines.length - 1) { D.li++; showLine(); return true; }
  const ch = document.getElementById('ch');
  if (ch && !ch.classList.contains('show')) { ch.classList.add('show'); return true; }
  return false;   // 마지막 줄 — 고르기를 기다림
}
