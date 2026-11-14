/* =====================================================================
   ui/tick.js — 알림 · 수첩 · 판의 '책'(사원부터의 달 화면은 ui/loop.js)
   ===================================================================== */
/* ── 알림 · 수첩 ── */
// 판의 '책' 한 장 — 내가 한 일 · 가까워진 사람 · 놓친 사람
function bookHTML(b, closeOnly) {
  const col = (h, xs, none) => `<div class="bk"><h3>${h}</h3>${xs.length ? xs.map(x => `<div>· ${esc(x)}</div>`).join('') : `<div class="mute">${none}</div>`}</div>`;
  return `<div class="box px gold wide book"><h2>${esc(b.title)}</h2><div class="bks">${col('내가 한 일', b.did, '—')}${col('가까워진 사람', b.close, '아직 없음')}${col('놓친 사람', b.missed, '없음')}</div>
    <div class="acts">${closeOnly ? '<div class="btn big" data-act="ovl-close">닫기</div>' : '<div class="btn big" data-next="1">책장을 덮는다 ▶</div>'}</div></div>`;
}
function noticeOverlay(P) {
  sfx(P.kind === 'crash' ? 'crash' : P.kind === 'boom' ? 'promote' : P.kind === 'warn' ? 'fail' : P.kind === 'news' ? 'news' : 'select');
  overlay(`<div class="box px ${P.kind === 'warn' || P.kind === 'crash' ? '' : 'gold'} ${P.kind || ''}"><h2>${esc(P.title)}</h2>${P.big ? `<div class="bignum">${esc(P.big)}</div>` : ''}<p>${esc(P.text)}</p><div class="acts"><div class="btn big" data-next="1">계속 ▶</div></div></div>`, P.kind === 'warn' || P.kind === 'crash' ? 'warn' : '');
}
function notebookOverlay() {
  const st = G.st;
  /* 설정 창(11-14 대표님 '설정 좀 깔끔하게 다시 만들어 봐'): 덩어리 셋 — 저장 · 소리 · 나가기. 드물게 쓰는 것(다른 기기로 옮기기 · 소리 크레딧)은 작은 글씨 줄로 */
  overlay(`<div class="box px setting set2"><div class="shd"><h2>설정</h2><small class="mute">${esc(SH.dateLabel(st))} · ${esc((SH.RK[st.rank] || {}).name_ko || '')}</small></div>
    <div class="sec"><div class="st">저장</div>
      <div class="slots3">${[1, 2, 3].map(n => { const s = SH.loadSlot(n); return `<div class="sl px"><b>칸 ${n}</b><span class="${s ? '' : 'mute'}">${esc(SH.infoOf(s) || '비어 있음')}</span><div class="btn sm" data-act="slot-save" data-n="${n}">저장</div><div class="btn sm ${s ? '' : 'dis'}" data-act="slot-load" data-n="${n}">불러오기</div></div>`; }).join('')}</div>
      <div class="lnk"><span data-act="export">다른 기기로 옮기기(내보내기)</span><span data-act="import">글자로 불러오기</span></div></div>
    <div class="sec row"><div class="st">소리</div><div class="btn sm" data-act="sound-toggle" id="sndbtn">${SND.on ? '♪ 소리 켬' : '♪ 소리 끔'}</div><span class="sp"></span><div class="lnk"><span data-act="sound-credits">음악 크레딧</span></div></div>
    <div class="sfoot"><div class="btn sm" data-act="to-title">처음 화면으로</div><span class="sp"></span><small class="mute" title="문제를 알릴 때 이 판 이름을 같이 알려 주세요">${esc(window.GAME_VER || '개발판')}</small><span class="sp"></span><div class="btn big" data-act="ovl-close">닫기</div></div></div>`);   // 판 표시(11-14 대표님 — 올린 판마다 이름 · 공개 사본 도구가 GAME_VER 를 넣음 · 로컬은 '개발판')
}
