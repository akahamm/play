/* =====================================================================
   ui/album.js — 연말 앨범(목업 06) · 시작 장 · 끝 장
   - 앨범: 인턴 첫날 ▶ 지금(입은 옷 · 직급이 그림에 보임) · 그해 번 돈 · 모은 돈 · 처음들 · 만난 사람
   ===================================================================== */
// 지금 모습 그림: 직급별 반신(있는 것) — 인턴·사원은 입은 옷으로 가름
function heroArt(st) {
  const r = st.rank;
  if (r === 'ceo') return 'ceo'; if (r === 'founder') return 'founder';
  if (['director', 'general_manager'].includes(r)) return 'exec';
  if (['manager', 'deputy_gm', 'asst_manager'].includes(r) || SH.suitTier(st) >= 1) return 'manager';
  return 'base';
}
const FIRST_ICON = { suit: '<canvas data-item="custom" data-bare="1" data-s="2"></canvas>', client: '<canvas data-face="client" data-n="32" data-s="1.1"></canvas>' };

function albumScreen(P) {
  const st = G.st, y = P.year;
  const yr = st.hist.filter(h => h.date.startsWith(String(y)));
  const inc = yr.map(h => h.income), ast = yr.map(h => h.money);
  const firsts = st.firsts.filter(f => f.date.startsWith(String(y))).slice(-5);
  const shown = firsts.length ? firsts : st.firsts.slice(-5);
  const people = Object.keys(st.rel).filter(c => st.rel[c].st >= 1 && SH.CH[c].group).sort((a, b) => st.rel[b].aff - st.rel[a].aff).slice(0, 5);
  const startY = SH.ym(SH.D.events_act1.act_dates.start).y;
  const sum = inc.reduce((a, b) => a + b, 0);
  const rk = (SH.RK[st.rank] || {}).name_ko || '';
  const sc = document.getElementById('screen');
  sc.className = 'k-album';
  G.redraw = () => albumScreen(P);
  sc.innerHTML = `<canvas id="snow"></canvas><div class="mid"><div class="book">
   <div class="page l"><div class="ttl">${y} · 올해의 앨범<small>12월 · 종무식 날 밤</small></div>
    <div class="pol" style="left:28px;top:92px;transform:rotate(-3deg)"><span class="tape"></span>
      <div class="ph" style="background:linear-gradient(#e8dcc4,#bfae8e)">${artImg('hero', 'base', '', 'filter:sepia(.6) saturate(.7) contrast(.95) brightness(1.03)')}</div>
      <div class="cap"><b>${startY}년 3월 6일 · 인턴 첫날</b><span>헐렁한 회색 기성복 · 전자시계 · 삐삐</span></div></div>
    <div class="vs">▶</div>
    <div class="pol" style="left:316px;top:84px;transform:rotate(2.5deg)"><span class="tape" style="transform:rotate(5deg)"></span>
      <div class="ph" style="background:linear-gradient(#e6eaf0,#aab6cc)">${artImg('hero', heroArt(st))}<canvas data-person="${heroNow()}" data-s="3" style="position:absolute;right:6px;bottom:6px"></canvas></div>
      <div class="cap"><b>${y}년 12월 · 지금</b><span>${esc(Object.values(st.equip).map(id => (SH.item(id) || {}).name_ko).filter(Boolean).slice(0, 2).join(' · '))} · ${esc(rk)} 명함</span></div></div>
    <div class="badge" style="left:500px;top:66px">${esc(rk)}!</div>
    <div class="btm"><div class="diary">"${y === startY ? '석 달 전엔 이름도 못 불렸다. 이젠 명함이 있다.' : '한 해가 또 갔다. 숫자는 거짓말을 안 한다.'}"</div>
    <div class="charts"><div class="chart"><div class="h"><span>그때그때 번 돈</span><b>올해 ${SH.won(sum)}</b></div><svg id="inc" viewBox="0 0 248 92" preserveAspectRatio="none"></svg></div>
      <div class="chart"><div class="h"><span>가진 돈</span><b>${SH.won(ast[0] || 0)} ▶ ${SH.won(ast[ast.length - 1] || st.s.money)}</b></div><svg id="ast" viewBox="0 0 248 92" preserveAspectRatio="none"></svg></div></div></div></div>
   <div class="page r"><div class="sec">올해의 처음들<small>${shown.length} 장면</small></div>
    <div class="firsts">${shown.map(f => { const d = SH.parseDate(f.date); return `<div class="f"><span class="dt">${d.getMonth() + 1}월 ${d.getDate()}일</span><span class="ic">${FIRST_ICON[f.icon] || ic(f.icon === 'coin' ? 'coin' : f.icon === 'bolt' ? 'bolt' : 'star', 3)}</span><div class="tx">${esc(f.title)}<span>${esc(f.sub)}</span></div></div>`; }).join('')}</div>
    <div class="sec" style="margin-top:18px">만난 사람들<small>${people.length} · 지금 사이</small></div>
    <div class="people">${people.map(c => `<div class="p"><canvas data-face="${c}" data-s="1.6"></canvas><div class="nm">${SH.name(c)}<span>${esc(SH.stageName(st, c))}</span></div></div>`).join('')}</div>
    <div class="go"><div class="btn big" data-next="1">${y + 1}년으로 ▶</div></div></div></div></div>`;
  paint(sc);
  chart('inc', inc, 'bar'); chart('ast', ast, 'line');
  const c = pxCanvas(document.getElementById('snow'), 320, 180, 4); for (let i = 0; i < 90; i++) R(c, i % 4 ? 'rgba(255,255,255,.55)' : '#fff', (i * 89) % 320, (i * 41) % 180, 1, 1);
}
function chart(id, vals, kind) {
  const s = document.getElementById(id); if (!s || !vals.length) return;
  const w = 248, H = 92, max = Math.max(1, ...vals.map(v => Math.abs(v)));
  let h = '';
  if (kind === 'bar') {
    const bw = Math.max(6, Math.min(18, Math.floor(w / vals.length) - 4)), gap = vals.length > 1 ? (w - vals.length * bw) / (vals.length - 1) : 0;
    vals.forEach((v, i) => { const bh = Math.max(1, Math.round(Math.max(0, v) / max * (H - 26))); const x = Math.round(i * (bw + gap)); h += `<rect x="${x}" y="${H - 14 - bh}" width="${bw}" height="${bh}" fill="#3a4a8a"/>`; });
  } else {
    const pts = vals.map((v, i) => [6 + i * (w - 12) / Math.max(1, vals.length - 1), H - 14 - Math.max(0, v) / max * (H - 28)]);
    h += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#3a4a8a" stroke-width="2.5"/>`;
    const L = pts[pts.length - 1]; h += `<rect x="${L[0] - 4}" y="${L[1] - 4}" width="8" height="8" fill="#ef5350"/>`;
  }
  s.innerHTML = h;
}

/* ── 시작 장 ── */
// (11-14 대표님 '첫 실행 화면에서 "여의도의 봄 ~" 문구 삭제해' — 이어 하기 옆 분위기 한 줄을 뺌)
function titleScreen() {
  const info = SH.saveInfo();
  const sc = document.getElementById('screen');
  sc.className = 'k-title';
  const t = SH.D.ui_lines.TICKER.map(x => `<span>${x}</span>`).join('');
  const last = G.resume;
  G.redraw = () => titleScreen();
  sc.innerHTML = `<canvas id="night"></canvas><div class="shade"></div><div class="ticker"><div>${t + t}</div></div>
    <div class="ttl"><h1>상한가<small>여의도 1995</small></h1>
      <div class="who">지방대 출신 인턴 ${HERO}.<br>십 년 뒤, 대표가 될까 · 독립할까 · 무너질까.</div></div>
    ${(o => o.length > 1 ? `<div class="first"><span>이번 판 —</span>${o.map(f => `<div class="c ${(G.firstPick || 'plain') === f.id ? 'on' : ''}" data-act="first" data-id="${f.id}">${esc(f.name)}${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</div>`).join('')}</div>` : '')(SH.firstOpts())}
    <div class="go"><div class="btn big" data-act="new">새로 시작 ▶</div>${info ? `<div class="btn" data-act="continue">이어 하기</div>` : SH.hasOldSave() ? '<small class="mute" style="max-width:420px">지난번 저장은 게임이 크게 바뀌어 이어 할 수 없어요. 새로 시작하면 사원부터 새 한 달(지도 → 장 → 결산)이 나옵니다.</small>' : ''}
      <div class="h">${info ? '' : '누르기만으로 합니다 · 휴대폰은 옆으로 눕혀서'}${SH.dex().length ? `${info ? '' : '<br>'}지금까지 본 끝 ${SH.dex().length}가지 — 다른 끝도 있어요` : ''}</div></div>
    <div class="btn sm tsnd" data-act="sound-toggle" id="sndbtn" title="처음엔 화면을 한 번 눌러야 소리가 납니다(브라우저 규칙)">${SND.on ? '♪ 소리 켬' : '♪ 소리 끔'}</div>`;
  drawNight(document.getElementById('night'));
}

/* ── 끝 장 ── */
/* 1막 낙방: 무엇이 모자랐는지 세 줄 + 다음 판에 할 것 하나 (11-12 대표님 '게임성 — 쉽게') */
function whyFell(st) {
  if (st.rank !== 'intern') return '';
  const c = SH.conversion(st), R = SH.R;
  const rows = [
    [c.ok >= R.conversion_tasks_min, SH.fillKeys(SH.D.ui_lines.FELL.tasks[0], { n: c.ok }), SH.D.ui_lines.FELL.tasks[1]],   /* 원본 화면_글.json 의 FELL */
    [c.rep >= R.conversion_rep_min, SH.fillKeys(SH.D.ui_lines.FELL.rep[0], { n: c.rep }), SH.D.ui_lines.FELL.rep[1]],
    [st.rel.boss.st >= 2, SH.fillKeys(SH.D.ui_lines.FELL.boss[0], { stage: c.boss }), SH.D.ui_lines.FELL.boss[1]]
  ];
  const miss = rows.find(r => !r[0]) || rows[0];
  return `<div class="why px"><b>왜 이름이 없었나</b>
    ${rows.map(([ok, t]) => `<div class="r ${ok ? 'ok' : 'no'}"><i>${ok ? '✔' : '✘'}</i>${esc(t)}</div>`).join('')}
    <div class="tip">다음 판엔 — ${esc(miss[2])}</div></div>`;
}
function endScreen(P) {
  const st = G.st, [name, sub, kind] = P.info;
  const f = st.final;
  if (!selfTesting && !/[?&]shot=/.test(location.search)) SH.dexAdd(st.ending || name);   // 끝 갈래 도감(시작 화면 '지금까지 본 끝') · 시험 · 사진은 안 쌓음
  const partner = f && f.partner ? SH.fillKeys(SH.D.ui_lines.FELL.partner, { nm: SH.name(f.partner), stage: f.partnerStage }) : (f ? SH.D.ui_lines.FELL.alone : '');
  const sc = document.getElementById('screen');
  sc.className = 'k-end';
  G.redraw = () => endScreen(P);
  sc.innerHTML = `<canvas id="grey"></canvas><div class="mid"><div class="headline">${esc(name)}</div>
    <div class="sub">${esc(sub)} · ${f ? '2005년 12월 30일 폐장일 판정' : esc(SH.dateLabel(st))}</div>
    ${whyFell(st)}<div class="fates show ${st.rank === 'intern' ? 'gone' : ''}">
      <div class="fate ${kind === 'ceo' ? 'me' : ''}" style="--c:#f2c14e"><div class="fr"><canvas data-fate="ceo"></canvas></div><b>대표</b><span>증권사 꼭대기</span></div>
      <div class="fate ${kind === 'own' || kind === 'company' ? 'me' : ''}" style="--c:#62cc7e"><div class="fr"><canvas data-fate="own"></canvas></div><b>${kind === 'company' ? '회사원' : '독립'}</b><span>${kind === 'company' ? '여의도에 남음' : '내 이름 건 회사'}</span></div>
      <div class="fate ${kind === 'fall' ? 'me' : ''}" style="--c:#ef5350"><div class="fr"><canvas data-fate="fall"></canvas></div><b>몰락</b><span>모두 잃음</span></div></div>
    <div class="final">${esc((SH.RK[st.rank] || {}).name_ko || '')} · 돈 ${esc(SH.won(st.s.money))} · ${SH.tickName(st) === '주' ? '인턴 ' + st.tick + '주' : String(st.date).slice(0, 4) + '년까지'}${partner ? ' · ' + esc(partner) : ''}${(cs => `<br><span class="sum">내 선택의 합 — 일한 칸 ${cs.work}% · 솔직하게 ${cs.honest}번 · 쓰러짐 ${cs.collapses}번 · 본 이야기 ${cs.stories}장 · 가까워진 사람 ${cs.close}명</span>`)(SH.choiceSum(st))}</div>
    <div class="again"><div class="btn" data-act="book">이 판의 책</div><div class="btn big" data-act="new">처음부터 다시 ▶</div></div></div>`;
  drawGrey(document.getElementById('grey'));
  sc.querySelectorAll('canvas[data-fate]').forEach(cv => drawFate(cv, cv.dataset.fate));
}
