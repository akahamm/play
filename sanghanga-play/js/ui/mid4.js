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
  if (r.kind === 'week' && st.rank === 'intern') { const L = SH.internList(st), T = SH.D.ui_lines.INTERN; return L.left ? SH.fillKeys(SH.D.ui_lines.INTERN.redo, { left: L.left, per: SH.stampPoints() }) : T.redo_last; }
  return '다음 과제에서 메우면 평가는 다시 오름';
}
function settleMid(P) {
  const st = G.st, r = P.rep, t = r.task, b = r.before, a = r.after;
  const ttl = r.kind === 'week' ? '이번 주' : '이달';
  const bossLine = SH.D.ui_lines.BOSS_SAY[t.ok ? (r.kind === 'week' ? 'week_ok' : 'month_ok') : 'fail'];   /* 원본 화면_글.json 의 BOSS_SAY */
  const dv = (k) => a.s[k] - b.s[k];
  const sgn = (v, money) => v === 0 ? '±0' : (v > 0 ? '+' : '−') + (money ? SH.won(Math.abs(v)) : Math.abs(v));
  const who2 = settleMid.who(st, a, b);
  const hr = st.wk && st.wk.hintReport;   // 1막 귀띔으로 보고서를 쓴 주
  const ev = [r.conv ? SH.D.ui_lines.INTERN[r.conv.pass ? 'conv_pass' : 'conv_fail'] : null,
    r.stock].filter(Boolean);
  return settleMid.v2({ P, st, r, t, dv, sgn, who: who2, bossLine, ttl, ev, hr });   // 한 주 끝 · 달 결산은 이 배치 하나(11-14 피드백 90 ~ 93 · 98 · 옛 배치 ?settle=1 은 11-14 밤 정리로 걷음)
}
/* 결산의 사람 칸: 이번 마디에 가장 가까워진 사람 한 명 — 글만 돌려줌 */
settleMid.who = function (st, a, b) {
  // 이번 마디에 가장 가까워진 사람 한 명
  const ch = Object.keys(a.aff).filter(c => c !== 'hero' && (a.aff[c][0] !== (b.aff[c] || [0])[0] || a.aff[c][1] !== (b.aff[c] || [0, 0])[1]))
    .sort((x, y) => (a.aff[y][0] - (b.aff[y] || [0])[0]) - (a.aff[x][0] - (b.aff[x] || [0])[0]));
  const c0 = ch[0];
  // 새 결산의 사람 칸(141): 제목 줄 · 얼굴 + 이름 + ♥ 얼마(이름 옆) · 지금 사이와 다음 사이까지 · 내 모습이 통했는지 풀어 쓴 줄
  if (!c0) return `<div class="m5-who px"><div class="hd"><span>가까워진 사람</span></div><div class="rl mute">없음 — 점심 · 밤에 사람 있는 곳으로 가 보자</div></div>`;
  const [v1, s1] = a.aff[c0], [v0, s0] = b.aff[c0] || [0, 0], d = v1 - v0, stg = SH.stages(c0), nm = (stg[s1] || {}).name_ko || '';
  const nx = stg[s1 + 1], lo = (stg[s1] || {}).min_affection || 0, hi = nx && nx.min_affection, fill = hi ? Math.max(0, Math.min(5, Math.floor((v1 - lo) / (hi - lo) * 5))) : 0;
  const dots = hi ? `<span class="m4-dots">${[0, 1, 2, 3, 4].map(k => `<i class="${k < fill ? 'on' : ''}"></i>`).join('')}</span>` : '';
  const rel = s1 > s0 && stg[s0] ? `<span class="mute">사이</span> ‘${esc(stg[s0].name_ko)}’ → <b class="pink-t">‘${esc(nm)}’</b>`
    : `<span class="mute">지금 사이</span> <b>‘${esc(nm)}’</b>${d < 0 ? '<span class="mute"> · 조금 멀어짐</span>' : ''}${hi ? `<span class="nx"><span class="mute">다음 ‘${esc(nx.name_ko)}’까지</span>${dots}</span>` : nx ? `<span class="nx mute">다음 ‘${esc(nx.name_ko)}’ — 마음을 전해야 함</span>` : ''}`;
  return `<div class="m5-who px"><div class="hd"><span>가까워진 사람</span></div>
      <div class="wr">${fc(c0, 1.25)}<b>${esc(SH.name(c0))}</b><span class="h ${d > 0 ? 'pink-t' : 'mute'}">${ic('heart', 2)} ${d > 0 ? '+' + d : d === 0 ? '±0' : '−' + (-d)}</span></div>
      <div class="rl">${rel}</div>${tasteChips.rows(st, c0)}</div>`;
};

/* ── 한 주 끝 결산 새 배치(11-14 피드백 90 ~ 93 · 98 → 11-17 목업 04_시범/목업/인턴화면_1116 넷째 장 확정: 왼쪽 과제 · 돈 · 가까워진 사람 / 오른쪽 정규직까지 · 달라진 것) ── 무엇이 성공인지 한 줄 · 돈 내역은 늘 펼침 · 능력치 변화 한 줄 · '정규직까지'를 한 덩어리로(판정 한 줄 + 도장 + 명단) · 일요일 밤 알림을 아래 한 줄로 */
settleMid.v2 = function (c) {
  const { P, st, r, t } = c, L = st.rank === 'intern' && r.kind === 'week' ? SH.internList(st) : null;
  const sc = document.getElementById('screen'); sc.className = 'k-settle m5'; G.redraw = () => settleMid(P);
  sc.innerHTML = settleMid.page(c, L);
  paint(sc); if (!G.instant) { sfx('stamp'); setTimeout(() => sfx(t.ok ? 'success' : 'fail'), 180); }
};
/* 아래는 결산 화면의 조각 — 모두 글(HTML)만 돌려줌 · 화면에 붙이기 · 소리는 위 v2 한 곳 */
settleMid.page = function (c, L) {
  const { st, ttl } = c;
  return `<div class="m5w">
    <div class="m5-head"><small>${esc(SH.dateLabel(st))} · 일요일 밤</small><h1>${ttl} <span>결산</span></h1></div>
    <div class="m5-grid"><div class="m5-col">
      ${settleMid.task(c)}
      <div class="m5-row">${settleMid.chg(c)}${settleMid.money(c)}</div>
    </div><div class="m5-col">
      ${L ? settleMid.conv(L) : ''}
      ${c.who}
    </div></div>
    <div class="m5-foot"><div class="btn big" data-next="1">다음 주로 ▶</div></div></div>`;
};
// 과제 칸: 성공 · 실패 도장 · 부장 말 · 만회 길 · 귀띔 적중
settleMid.task = function (c) {
  const { st, r, t, bossLine, ev, hr } = c;
  return `<div class="m5-task px gold"><div class="k">과제</div><h2>${esc(t.name)}</h2>
        <div class="boss">${fc('boss', 2, '', t.ok ? 'base' : 'sneer')}<p>${esc(bossLine)}${!t.ok ? `<span>${esc(redoLine(st, r))}</span>` : ''}</p></div><div class="m5-stamp ${t.ok ? '' : 'fail'}">${t.ok ? '성공' : '실패'}</div>
        ${hr || t.big || (ev && ev.length) ? `<div class="m5-ev">${t.big ? `<span class="good">${esc(SH.D.ui_lines.TASK_UI.big)}</span>` : ''}${hr ? `<span class="${hr.hit ? 'good' : 'bad'}">${hr.hit ? '귀띔 적중' : '귀띔 빗나감'}</span>` : ''}${(ev || []).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>`;
};
// 돈 칸: 이번 마디 돈 '왜' 내역(큰 것부터 여섯 줄 · 안 맞는 몫은 '그 밖')
settleMid.money = function (c) {
  const { r, dv, sgn } = c;
  const rows = Object.entries(r.why || {}).filter(([, v]) => v).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])), gap = dv('money') - rows.reduce((s, [, v]) => s + v, 0); if (gap) rows.push(['그 밖', gap]);
  const ln = (k, v, cls) => `<div class="ln ${cls || ''}"><span>${esc(k)}</span><b class="${v > 0 ? 'up-t' : v < 0 ? 'dn-t' : ''}">${sgn(v, true)}</b></div>`;
  return `<div class="m5-money px"><div class="hd"><span>돈</span><b class="${dv('money') > 0 ? 'up-t' : dv('money') < 0 ? 'dn-t' : ''}">${sgn(dv('money'), true)}</b></div>${rows.slice(0, 6).map(([k, v]) => ln(k, v)).join('') || '<div class="ln"><span class="mute">돈이 오간 일이 없음</span><b>±0</b></div>'}</div>`;
};
// 달라진 것 칸(191 · 목업 넷째 장): 막대 꼴 — 능력치(바뀐 것만) → 몸 · 마음(체력 · 스트레스) · 호감은 왼쪽 '가까워진 사람'에 있어 여기선 뺌(195) · 글은 화면_글.json 의 SETTLE
settleMid.chg = function (c) {
  const { r, dv } = c, b = r.before, a = r.after;
  const row = (k) => { const v = dv(k), lo = Math.max(0, Math.min(100, Math.min(b.s[k], a.s[k]))), up = Math.max(0, Math.min(100, a.s[k]) - lo);
    return `<div class="cr"><span class="k">${esc(SH.statKo(k))}</span><span class="mb"><i class="lo" style="width:${lo}%"></i><i class="up" style="left:${lo}%;width:${v > 0 ? up : 0}%"></i></span><b>${a.s[k]}</b><span class="d ${v > 0 ? 'up' : 'dn'}">${v > 0 ? '▲' : '▼'}${Math.abs(v)}</span></div>`; };
  const grp = (head, ks) => { const rs = ks.filter(k => dv(k)).map(k => row(k)).join('');      /* 238: 좋고 나쁨이 아니라 방향으로 칠함(스트레스가 올라도 빨강) */ return rs ? `<div class="grp">${esc(head)}</div>${rs}` : ''; };
  const body = grp(SH.D.ui_lines.SETTLE.g_stat, ME_STATS) + grp(SH.D.ui_lines.SETTLE.g_body, ['hp', 'stress']);
  return `<div class="m5-chg px"><div class="hd"><span>달라진 것</span></div>${body || `<div class="mute">${esc(SH.D.ui_lines.SETTLE.none)}</div>`}</div>`;
};
// 정규직까지 칸(인턴 주 결산만): 판정 한 줄 · 과제 도장(하나에 몇 점) · 인턴 다섯 명단(점수 · 등수 안 딱지 — 명단 머리 줄은 11-17 목업대로 뺌) — 글은 화면_글.json 의 INTERN
settleMid.conv = function (L) {
  const T = SH.D.ui_lines.INTERN, per = SH.stampPoints(), gap = L.gap;
  const rank = L.rank + 1, cut = L.cut;
  const verdict = L.left ? (L.pass ? SH.fillKeys(SH.D.ui_lines.INTERN.in, { rank }) : SH.fillKeys(SH.D.ui_lines.INTERN.out, { rank, cut, gap })) : (L.pass ? SH.fillKeys(SH.D.ui_lines.INTERN.fin_in, { rank }) : SH.fillKeys(SH.D.ui_lines.INTERN.fin_out, { rank }));
  const list = L.rows.map((x, k) => `<div class="r ${k < L.cut ? 'in' : ''} ${x.me ? 'mine' : ''}"><span class="no">${k + 1}</span><span class="nm">${esc(x.nm)}</span><b class="pt">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.pt, { v: x.v }))}</b><i class="bd ${k < L.cut ? 'ok' : 'no'}">${k < L.cut ? '정규직' : '탈락'}</i></div>`).join('');   /* 144(11-14 대표님 "'위 둘이 정규직' 텍스트 빼고 순위 옆에 정규직 · 탈락 뱃지"): 줄마다 딱지 */
  return `<div class="m5-conv px gold"><div class="hd"><span>${esc(T.head)}</span><small>${esc(L.left ? SH.fillKeys(SH.D.ui_lines.INTERN.left, { left: L.left }) : T.done)}</small></div><div class="vd ${L.pass ? 'ok' : 'no'}">${esc(verdict)}</div>
        <div class="st"><span class="mute">${esc(T.stamps)}</span>${Array.from({ length: L.win }, (_, i) => `<i class="${i < L.ok ? 'on' : ''}"></i>`).join('')}<b>${esc(SH.fillKeys(SH.D.ui_lines.INTERN.stamp_pts, { n: L.ok, per }))}</b></div>
        <div class="m5-list">${list}</div></div>`;
};
