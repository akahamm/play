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
/* ── 인턴 졸업 흐름(11-18 대표님 목업 '이대로' · 04_시범/목업/졸업흐름_1118): 졸업 책 · 사원 명함 · 막 제목 — 화면 전체(뒤 장면 · 대사 창을 가림) · 글은 화면_글.json GRAD · RANKCARD · ACT_TITLE ── */
bookHTML.grad = function (b) {
  const g = b.grad, T = SH.D.ui_lines.GRAD, last = g.shots[g.shots.length - 1], bg = last ? SH.cgPath(last.cg) : '';
  const big = (k, v, sub) => `<div><small>${esc(T.big3[k])}</small><b>${esc(v)}</b><i>${esc(sub)}</i></div>`;
  const grow = g.grow.map(([k, a, n]) => `<div class="gst"><span>${esc(SH.statKo(k))}</span><div class="gbar"><i style="width:${Math.min(100, a)}%"></i><em style="left:${Math.min(100, a)}%;width:${Math.max(0, Math.min(100, n) - Math.min(100, a))}%"></em></div><span>${a} → <b>${n}</b></span></div>`).join('');
  const ppl = b.close.length ? b.close.map((t, i) => { const [nm, ...rest] = t.split(' — '); const [tag, ...more] = rest.join(' — ').split(' · ');
    return `<div class="gpp">${fc(g.faces[i], 3)}<div><b>${esc(nm)}</b>${tag ? `<span class="gtag">${esc(tag)}</span>` : ''}${more.length ? `<small>${esc(more.join(' · '))}</small>` : ''}</div></div>`; }).join('') : `<div class="gnone">${esc(T.none_close)}</div>`;
  const shots = g.shots.map(x => `<figure><div class="ph" style="background-image:url('${SH.cgPath(x.cg)}')"></div><figcaption>${esc(x.title)}</figcaption></figure>`).join('');
  const miss = [g.skim.length ? SH.fillKeys(SH.D.ui_lines.GRAD.missed, { names: g.skim.join(' · ') }) : '', g.unknown ? SH.fillKeys(SH.D.ui_lines.GRAD.unknown, { n: g.unknown }) : ''].filter(Boolean).join('  ·  ');
  return `${bg ? `<div class="gbg" style="background-image:url('${bg}')"></div>` : ''}<div class="gbook"><div class="pg">
      <h1>${esc(b.title)}</h1><div class="big3">${big(0, g.rank + '등', SH.fillKeys(SH.D.ui_lines.GRAD.of, { n: g.of }))}${big(1, g.big + '번', SH.fillKeys(SH.D.ui_lines.GRAD.big_of, { n: g.weeks }))}${big(2, (g.money >= 0 ? '+' : '−') + SH.won(Math.abs(g.money)), '')}</div>
      <div class="gh">${esc(T.grow)}</div>${grow}</div>
    <div class="pg"><div class="gh">${esc(T.close)}</div><div class="gppl">${ppl}</div>
      ${shots ? `<div class="gh" style="margin-top:18px">${esc(T.shots)}</div><div class="galb">${shots}</div>` : ''}
      ${miss ? `<div class="gmiss">${esc(miss)}</div>` : ''}<div class="gclose"><div class="btn big" data-next="1">${esc(T.btn)}</div></div></div></div>`;
}
noticeOverlay.rank = function (P) {
  const R = SH.D.ui_lines.RANKCARD, st = G.st, nm = (SH.RK[P.rank] || {}).name_ko || P.title, places = SH.rankOpens(P.rank).join(' · ');
  const opens = R.opens.map((o, i) => [o[0], o[1], o[2].indexOf('{places}') < 0 ? o[2] : places ? SH.fillKeys(SH.D.ui_lines.RANKCARD.opens[3][2], { places }) : '']).filter(o => o[2]).map(o => `<div class="op"><span class="ic">${esc(o[0])}</span><div><b>${esc(o[1])}</b><small>${esc(o[2])}</small></div></div>`).join('');
  sfx('promote');
  overlay(`<div class="rkbg" style="background-image:url('${illImg.bgSrc('office_sales')}')"></div><div class="ncard"><img src="img/ui/ui_name_card.png" alt=""><div class="nc"><div class="co">${esc(R.co)}</div><div class="dept">${esc(R.dept)}</div><div class="nm">${esc(SH.HERO)}<small>${esc(nm)}</small></div><div class="ad">${esc(R.addr)}</div></div></div>
    <div class="rkr"><div class="kick">${esc(SH.fillKeys(SH.D.ui_lines.RANKCARD.kick, { date: SH.dateLabel(st) }))}</div><h1>${esc(nm)}</h1><div class="ln">${esc(R.line)}</div>
      <div class="px open"><div class="h">${esc(R.open_h)}</div>${opens}</div><div class="say"><span>${esc(SH.name(R.boss[0]))}:</span> "${esc(R.boss[1])}"</div>
      <div class="acts"><div class="btn big" data-next="1">계속 ▶</div></div></div>`, 'full rank');
}
noticeOverlay.act = function (P) {
  const A = SH.D.ui_lines.ACT_TITLE, a = G.st.act, t = A[a], bg = (SH.GAME.act_bg || {})[a], [h, sub] = String(P.title).split(' — ');
  sfx('page');
  overlay(`<div class="actt" data-next="1">${bg ? `<div class="rkbg" style="background-image:url('${illImg.bgSrc(bg)}')"></div>` : ''}<div class="atin"><div class="yr">${esc(t[0])}</div><h1>${esc(h)}${sub ? ` — <b>${esc(sub)}</b>` : ''}</h1><div class="rule"></div><p>${esc(t[1])}</p></div><div class="tap">${esc(A.tap)}</div></div>`, 'full act');
}
function noticeOverlay(P) {
  if (P.kind === 'rankcard' && SH.RK[P.rank]) return noticeOverlay.rank(P);
  if (P.kind === 'act' && (SH.D.ui_lines.ACT_TITLE || {})[G.st.act]) return noticeOverlay.act(P);
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
    <div class="sfoot"><div class="btn sm" data-act="to-title">처음 화면으로</div>${st.mode !== 'week' && SH.canResign(st) && st.L && !st.L.week && !st.L.used ? `<div class="btn sm ${st.s.money >= SH.R.founder_min_money ? '' : 'dis'}" data-act="resign">사표 — 독립</div>` : ''}<span class="sp"></span><small class="mute" title="문제를 알릴 때 이 판 이름을 같이 알려 주세요">${esc(window.GAME_VER || '개발판')}</small><span class="sp"></span><div class="btn big" data-act="ovl-close">닫기</div></div></div>`);   // 판 표시(11-14 대표님 — 올린 판마다 이름 · 공개 사본 도구가 GAME_VER 를 넣음 · 로컬은 '개발판')
}
