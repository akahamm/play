/* =====================================================================
   ui/mid4.js — 인턴 주 결산(11-12 대표님 목업 '이대로 넣어' · 목업/1112_네화면/안.html) · 달 결산 · 지도 · 장은 ui/loop.js
   - 기준: 한 화면에 정할 것 하나 · 큰 숫자 셋까지 · 글 대신 아이콘 칩 (대표님 "보여지는 화면이 복잡하면 안 됨")
   - 결산 · 계획표 · 계좌 화면은 이 판 하나(11-13 예전 판 걷어냄)
   ===================================================================== */

/* ── 결산: 정할 것 = 다음으로 하나 · 큰 숫자 셋 = 돈 · 평판 · 체력 ── */
// 취향 표(리서치 '알아 가는 맛' — 스타듀 선물 · 두근두근 취향): 결산 사람 칸의 '좋아함 / 싫어함' 줄과 그 까닭 글
const tasteChips = {};
/* 141(11-14 대표님 "이 사람과의 상태 표현이 어색 · '거슬림: 게으름'이 뭘 말하는지 모르겠음 · UI부터 내용까지 검토"): 새 결산의 사람 칸에는
   꼬리표 대신 풀어 쓴 한 줄 — 무엇이(내 모습) · 왜 붙었는지 · 그래서 어떻게 되는지(만날 때 호감 ±얼마) */
/* 글 = 원본 04_시범/대사/화면_글.json 의 TAG_WHY · 문턱은 규칙 값(rules.json)에서 — 값을 바꾸면 글도 따라감 */
tasteChips.WHY = new Proxy({}, { get: (_, id) => { const t = SH.D.ui_lines.TAG_WHY[id]; return id === 'skill' ? SH.fillKeys(SH.D.ui_lines.TAG_WHY.skill, { avg: SH.R.tag_skill_avg }) : id === 'humor' ? SH.fillKeys(SH.D.ui_lines.TAG_WHY.humor, { talk: SH.R.tag_humor_talk }) : t; } });
tasteChips.rows = function (st, cid) {   // 한 줄에 하나: [좋아함/싫어함] 내 모습 — 왜 붙었나 · 오른쪽 끝에 만날 때 호감 ±얼마 · 싫어하는 것 먼저 · 둘까지(칸 높이)
  const c = SH.CH[cid] || {}, t = SH.tags(st), T = SH.D.stats.tags || [], nm = id => ((Array.isArray(T) ? T.find(x => x.id === id) : T[id]) || {}).name_ko || id;
  const row = (id, like) => `<div class="ts ${like ? 'like' : 'hate'}"><i class="lb">${like ? '좋아함' : '싫어함'}</i><b>${esc(nm(id))}</b>${tasteChips.WHY[id] ? `<span class="wy">${esc(tasteChips.WHY[id])}</span>` : ''}<span class="dv"><span class="mw">만나면</span> ${ic('heart', 1.5)}${like ? '+' + SH.R.meet_like : '−' + Math.abs(SH.R.meet_dislike)}</span></div>`;
  return (c.dislikes || []).filter(x => t.has(x)).map(x => row(x, false)).concat((c.likes || []).filter(x => t.has(x)).map(x => row(x, true))).slice(0, 2).join('');
};
// 실패해도 만회 길을 바로 보여 줌(리서치 '실패에 관대한 구조' — 스타듀 · 페르소나 후속작: 놓쳐도 다음에 메울 수 있다는 것을 알려 줌)
function redoLine(st, r) {
  if (r.kind === 'week' && st.rank === 'intern') {
    const win = SH.R.conversion_window, need = SH.R.conversion_tasks_min, all = st.tasks.filter(t => t.mode === 'week'), ok = all.slice(-win).filter(t => t.ok).length, left = Math.max(0, win - all.length);
    if (ok >= need) return '도장은 이미 넉넉함 — 심사까지 평판 · 점수를 챙기면 됨';
    if (ok + left >= need) return `만회 길: 남은 ${left}주 중 ${need - ok}번 성공하면 정규직 문턱`;
    return '이번 심사의 도장 문턱은 넘기 어려움 — 남은 주는 사람 · 돈에 쓰는 편이 나음';
  }
  return '다음 과제에서 메우면 평가는 다시 오름';
}
function settleMid(P) {
  const st = G.st, r = P.rep, t = r.task, b = r.before, a = r.after;
  const ttl = r.kind === 'week' ? '이번 주' : '이달';
  const bossLine = SH.D.ui_lines.BOSS_SAY[t.ok ? (r.kind === 'week' ? 'week_ok' : 'month_ok') : 'fail'];   /* 원본 화면_글.json 의 BOSS_SAY */
  const dv = (k) => a.s[k] - b.s[k];
  const sgn = (v, money) => v === 0 ? '±0' : (v > 0 ? '+' : '−') + (money ? SH.won(Math.abs(v)) : Math.abs(v));
  const who2 = settleMid.who(st, a, b, ttl);
  const hr = st.wk && st.wk.hintReport;   // 1막 귀띔으로 보고서를 쓴 주
  const ev = [r.conv ? `전환 심사 — ${r.conv.pass ? '붙음' : st.week === SH.internWeeks() ? '이번엔 못 넘음' : '끝내 못 넘음'}` : null,
    r.stock].filter(Boolean);
  return settleMid.v2({ P, st, r, t, dv, sgn, who: who2, bossLine, ttl, ev, hr });   // 한 주 끝 · 달 결산은 이 배치 하나(11-14 피드백 90 ~ 93 · 98 · 옛 배치 ?settle=1 은 11-14 밤 정리로 걷음)
}
/* 결산의 사람 칸: 이번 마디에 가장 가까워진 사람 한 명 — 글만 돌려줌 */
settleMid.who = function (st, a, b, ttl) {
  // 이번 마디에 가장 가까워진 사람 한 명
  const ch = Object.keys(a.aff).filter(c => c !== 'hero' && (a.aff[c][0] !== (b.aff[c] || [0])[0] || a.aff[c][1] !== (b.aff[c] || [0, 0])[1]))
    .sort((x, y) => (a.aff[y][0] - (b.aff[y] || [0])[0]) - (a.aff[x][0] - (b.aff[x] || [0])[0]));
  const c0 = ch[0];
  // 새 결산의 사람 칸(141): 제목 줄 · 얼굴 + 이름 + ♥ 얼마(이름 옆) · 지금 사이와 다음 사이까지 · 내 모습이 통했는지 풀어 쓴 줄
  if (!c0) return `<div class="m5-who px"><div class="hd"><span>${ttl} 가까워진 사람</span></div><div class="rl mute">없음 — 점심 · 밤에 사람 있는 곳으로 가 보자</div></div>`;
  const [v1, s1] = a.aff[c0], [v0, s0] = b.aff[c0] || [0, 0], d = v1 - v0, stg = SH.stages(c0), nm = (stg[s1] || {}).name_ko || '';
  const nx = stg[s1 + 1], lo = (stg[s1] || {}).min_affection || 0, hi = nx && nx.min_affection, fill = hi ? Math.max(0, Math.min(5, Math.floor((v1 - lo) / (hi - lo) * 5))) : 0;
  const dots = hi ? `<span class="m4-dots">${[0, 1, 2, 3, 4].map(k => `<i class="${k < fill ? 'on' : ''}"></i>`).join('')}</span>` : '';
  const rel = s1 > s0 && stg[s0] ? `<span class="mute">사이</span> ‘${esc(stg[s0].name_ko)}’ → <b class="pink-t">‘${esc(nm)}’</b>`
    : `<span class="mute">지금 사이</span> <b>‘${esc(nm)}’</b>${d < 0 ? '<span class="mute"> · 조금 멀어짐</span>' : ''}${hi ? `<span class="nx"><span class="mute">다음 ‘${esc(nx.name_ko)}’까지</span>${dots}</span>` : nx ? `<span class="nx mute">다음 ‘${esc(nx.name_ko)}’ — 마음을 전해야 함</span>` : ''}`;
  return `<div class="m5-who px"><div class="hd"><span>${ttl} 가까워진 사람</span></div>
      <div class="wr">${fc(c0, 1.25)}<b>${esc(SH.name(c0))}</b><span class="h ${d > 0 ? 'pink-t' : 'mute'}">${ic('heart', 2)} ${d > 0 ? '+' + d : d === 0 ? '±0' : '−' + (-d)}</span></div>
      <div class="rl">${rel}</div>${tasteChips.rows(st, c0)}</div>`;
};

/* ── 한 주 끝 결산 새 배치(예시 · ?settle=2 · 11-14 피드백 90 ~ 93 · 98) ── 무엇이 성공인지 한 줄 · 돈 내역은 늘 펼침 · 능력치 변화 한 줄 · '정규직까지'를 한 덩어리로(판정 한 줄 + 도장 + 명단) · 일요일 밤 알림을 아래 한 줄로 */
settleMid.v2 = function (c) {
  const { P, st, r, t } = c, L = st.rank === 'intern' && r.kind === 'week' ? SH.internList(st) : null, cv = L ? SH.conversion(st) : null;
  const sc = document.getElementById('screen'); sc.className = 'k-settle m5'; G.redraw = () => settleMid(P);
  sc.innerHTML = settleMid.page(c, L, cv);
  paint(sc); if (!G.instant) { sfx('stamp'); setTimeout(() => sfx(t.ok ? 'success' : 'fail'), 180); }
};
/* 아래는 결산 화면의 조각 — 모두 글(HTML)만 돌려줌 · 화면에 붙이기 · 소리는 위 v2 한 곳 */
settleMid.page = function (c, L, cv) {
  const { st, ttl } = c;
  return `<div class="m5w">
    <div class="m5-head"><small>${esc(SH.dateLabel(st))} · 일요일 밤</small><h1>${ttl} <span>결산</span></h1></div>
    <div class="m5-grid"><div class="m5-col">
      ${settleMid.task(c)}
      ${settleMid.money(c)}
      ${settleMid.chg(c)}
    </div><div class="m5-col">
      ${L ? settleMid.conv(L, cv) : ''}
      ${c.who}
    </div></div>
    <div class="m5-foot"><div class="btn big" data-next="1">다음 주로 ▶</div></div></div>`;
};
// 과제 칸: 성공 · 실패 도장 · 부장 말 · 만회 길 · 귀띔 적중
settleMid.task = function (c) {
  const { st, r, t, bossLine, ttl, ev, hr } = c;
  return `<div class="m5-task px gold"><div class="k">${ttl} 과제</div><h2>${esc(t.name)} — <b class="${t.ok ? 'gold-t' : 'red-t'}">${t.ok ? '성공' : '실패'}</b>${t.ok && r.gets && r.gets.length ? ` <small>성과금 +${SH.won(SH.R.intern_task_bonus)}</small>` : ''}</h2>
        <div class="boss">${fc('boss', 2, '', t.ok ? 'base' : 'sneer')}<p>${esc(bossLine)}${!t.ok ? `<span>${esc(redoLine(st, r))}</span>` : ''}</p></div><div class="m5-stamp ${t.ok ? '' : 'fail'}">${t.ok ? '성공' : '실패'}</div>
        ${hr || (ev && ev.length) ? `<div class="m5-ev">${hr ? `<span class="${hr.hit ? 'good' : 'bad'}">${hr.hit ? '귀띔 적중' : '귀띔 빗나감'}</span>` : ''}${(ev || []).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>`;
};
// 돈 칸: 이번 마디 돈 '왜' 내역(큰 것부터 여섯 줄 · 안 맞는 몫은 '그 밖')
settleMid.money = function (c) {
  const { r, dv, sgn, ttl } = c;
  const rows = Object.entries(r.why || {}).filter(([, v]) => v).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])), gap = dv('money') - rows.reduce((s, [, v]) => s + v, 0); if (gap) rows.push(['그 밖', gap]);
  const ln = (k, v, cls) => `<div class="ln ${cls || ''}"><span>${esc(k)}</span><b class="${v > 0 ? 'gold-t' : v < 0 ? 'red-t' : ''}">${sgn(v, true)}</b></div>`;
  return `<div class="m5-money px"><div class="hd"><span>${ttl} 돈</span><b class="${dv('money') >= 0 ? 'gold-t' : 'red-t'}">${sgn(dv('money'), true)}</b></div>${rows.slice(0, 6).map(([k, v]) => ln(k, v)).join('') || '<div class="ln"><span class="mute">돈이 오간 일이 없음</span><b>±0</b></div>'}</div>`;
};
// 달라진 것 칸: 체력 · 스트레스(아이콘) 다음 능력치
settleMid.chg = function (c) {
  const { dv, sgn, ttl } = c;
  /* 145(11-14 대표님 '기본 스탯(체력 · 스트레스)이 먼저 뜨고 그 다음에 능력치 · 기본 스탯은 아이콘으로'): 체력 · 스트레스는 위 줄과 같은 아이콘으로 맨 앞에 */
  const chg = [['hp', 'bolt'], ['stress', 'stress'], ['rep'], ['analysis'], ['talk'], ['network'], ['style']].map(([k, icn]) => { const nm = SH.statKo(k); const v = dv(k); return v ? `<span class="${(v > 0) === (k !== 'stress') ? 'good' : 'bad'}${icn ? ' base' : ''}" title="${nm}">${icn ? ic(icn, 2) : nm} <b>${sgn(v)}</b></span>` : ''; }).join('') || '<span class="mute">바뀐 것 없음</span>';
  return `<div class="m5-chg px"><div class="hd"><span>${ttl} 달라진 것</span></div><div class="chg">${chg}</div></div>`;
};
// 정규직까지 칸(인턴 주 결산만): 판정 한 줄 · 과제 도장 · 인턴 다섯 명단
settleMid.conv = function (L, cv) {
  const need = SH.R.conversion_tasks_min, verdict = L ? (L.rank < L.cut ? `지금 ${L.rank + 1}등 — 이대로면 정규직` : `지금 ${L.rank + 1}등 — ${L.rank - L.cut + 1}계단 모자람`) : '';
  const list = L ? L.rows.map((x, k) => `<div class="r ${k < L.cut ? 'in' : ''} ${x.me ? 'mine' : ''}"><span class="no">${k + 1}</span><span class="nm">${esc(x.nm)}</span><i class="bd ${k < L.cut ? 'ok' : 'no'}">${k < L.cut ? '정규직' : '탈락'}</i></div>`).join('') : '';   /* 144(11-14 대표님 "'위 둘이 정규직' 텍스트 빼고 순위 옆에 정규직 · 탈락 뱃지"): 점선과 글을 걷고 줄마다 딱지 */
  return `<div class="m5-conv px gold"><div class="hd"><span>정규직까지</span><small>심사까지 ${L.left}주</small></div><div class="vd ${L.rank < L.cut ? 'ok' : 'no'}">${verdict}</div>
        <div class="st"><span class="mute">과제 도장</span>${Array.from({ length: need }, (_, i) => `<i class="${i < cv.ok ? 'on' : ''}"></i>`).join('')}<b>${cv.ok} / ${need}</b></div>
        <div class="m5-list"><div class="lh mute">인턴 다섯 가운데</div>${list}</div></div>`;
};

