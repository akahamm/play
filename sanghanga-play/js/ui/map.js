/* =====================================================================
   ui/map.js — 지도(새 짜임 · js/map2) · 장소 앞 혼잣말 창 · 장소 안 화면 · 지도 옆 판
   - 칸 하나 = 지도에서 장소로 걸어감 → '들어갈까?' → 장소 안에서 할 일을 고름(피드백 48)
   - 지도 옆 판(과제 · 나 · 사람 · 소문)은 늘 붙음 · 인턴 땐 위 띠에 돈 · 체력 · 스트레스
   - 11-13 대표님 '레거시 확실히 정리하고 바로 가자': 옛 그림 지도(map_full · 길 그물) · 예전 판(?ui=old) · 쉬운 판(?ui=simple) · 손그림 장소 화면을 걷어냄
   ===================================================================== */
const PIN_SUB = () => SH.placeCol('sub_ko');   /* 지도 이름표 부제 · 원본 = 04_시범/장소_카드.md '부제' 칸 */
const LOCK_TXT = () => SH.placeCol('lock_ko');   /* 11-14 가게별로 나눔 — 사원부터 여는 가게 셋(인턴 땐 자물쇠) */
const RUMORS = () => SH.D.map_lines.RUMORS;   /* 지도 글 표(RUMORS · ERA_RUMORS · MONO · PLACE_LINE · 행인 말 NPC_LINES) 원본 = 04_시범/대사/지도_글.json → 묶음 map_lines */

// 시대 소문(리서치 2판 한국 · 시대 — 시대 분위기가 곧 매력 · 우리 말로 새로 씀) · [부터 해, 까지 해, 글] — 그 해에만 섞여 나옴
const ERA_RUMORS = () => SH.D.map_lines.ERA_RUMORS;
function rumorOf(st) {
  const y = SH.parseDate(st.date).getFullYear(), era = ERA_RUMORS().filter(r => y >= r[0] && y <= r[1]).map(r => r[2]), all = RUMORS().concat(era);
  return all[st.tick % all.length];
}
const short = (n) => n.replace(/\(.*\)/, '').replace('여명증권 ', '').trim();

/* 110(11-14 대표님 '좀 더 심플하게 · 1/2 숫자와 한 칸씩은 같은 개념이라 중복'): 과제 칸 = 얼굴 · 이름 · 칸 막대 · 다 차면 '달성' — 숫자와 설명 줄은 뺌(규칙은 첫 주 안내 글로)
   중간 판 옆 판: 과제(부장 얼굴 + 막대 + 보상 아이콘) · 이번 주 칸 그림 여섯 · 지금 갈 곳 단추 */
function midSide(st, P, byPlace, allDis, ask) {
  const t = st.task, goal = t ? t.goal : 2, prog = t ? Math.min(goal, t.progress) : 0;
  const nw = (G.flash && G.flash.task) || 0, bar = Array.from({ length: goal }, (_, i) => `<i class="${i < prog ? 'on' + (i >= prog - nw ? ' flb' : '') : ''}"></i>`).join('');   /* 117: 방금 찬 칸은 깜빡 */
  const W = st.wk;
  const tiles = SH.PICK_SLOTS.map(s => {
    const si = SH.SLOTS.indexOf(s), pk = W.picks.find(p => p.slot === s.k), now = si === P.si;
    const where = pk ? short((SH.PL[pk.place] || {}).name_ko || pk.label || '') : W.consumed[si] ? '이야기' : '';
    return `<div class="tl ${now ? 'now' : pk || W.consumed[si] ? 'done' : ''}"><small>${esc(SH.D.ui_lines.SLOT_SHORT[s.k] || s.ko)}</small><b>${now ? '▶' : esc(where)}</b></div>`;
  }).join('');
  return `<div class="side ms">
    <div class="card px gold"><div class="hd"><span>이번 주 과제</span><span class="gold-t">${ic('coin')} +${SH.won(SH.R.intern_task_bonus)}</span></div>
      <div class="trow t2">${fc('boss', 1.5)}<div class="tx"><h3>${esc(t ? t.name : '월요일 아침에 받음')}</h3><div class="prog">${bar}</div></div>${t && prog >= goal ? '<b class="green-t">달성</b>' : ''}</div></div>
    ${midMe(st) + midPeople(st) + midRumor(st)}
  </div>`;
}
const MONO = () => SH.D.map_lines.MONO;
// 고르기 칩(11-12 '돈 표기가 다름' → 돈은 늘 동전 + '−20,000원' · 체력은 번개 + 숫자(11-13 피드백 47) · 만남 · 호감은 별)
const chipsOf = (sub) => String(sub || '').split(' · ').filter(t => t && !/호감/.test(t)).map(t => {   /* 108: 호감은 단추에서 뺌 */
  const money = /밥값|돈|₩|원$|만$|천$/.test(t), hp = /체력/.test(t);
  const txt = money ? t.replace(/^(밥값|돈)\s*/, '').replace(/^(\d)/, '−$1') : hp ? t.replace(/체력\s*/, '').replace('-', '−') : t;
  return `<span class="chip">${hp ? ic('bolt') : money ? ic('coin') : /만남|호감/.test(t) ? ic('star') : ''}${esc(txt)}</span>`; }).join('');
// 얻는 것도 단추에(11-14 대표님 '술자리는 기력 · 돈이 나가는데 쉼은 채워짐 — 압도적으로 쉼': 술자리의 인맥 · 평판 · 스트레스가 안 보였음) — 능력 · 스트레스는 오르내림만 · 새 전역을 안 만들려고 chipsOf 에 붙임
// 업무 칸: 잘 풀릴 확률(잘 풀리면 과제가 한 번에 두 칸) — 능력치가 높을수록 · 스트레스 80부터 깎임
chipsOf.odds = (st, o) => { const a = SH.AC[o.action]; if (!a || o.ok === false || !(a.id.startsWith('work_') || a.id === 'eve_overtime')) return ''; const base = a.id === 'eve_overtime' ? SH.AC[(st.wk && st.wk.lastWork) || 'work_sales'] : a; return `<small class="odds">잘 풀릴 확률 ${SH.successRate(st, base, 0)}%</small>`; };
chipsOf.gain = (o) => { const e = Object.assign({}, (SH.AC[o.action] || {}).effects || {}), out = []; if (o.action === 'wk_study' && o.variant && o.variant !== 'hint') e[o.variant] = (e[o.variant] || 0) + (((SH.AC.wk_study || {}).skill_extra || {}).choose_one || 4);   // 책 읽기 · 스피치 학원 · 동문회 = 그 능력 +4
  /* 108: 능력치는 단추에서 뺌 · 스트레스는 값 그대로(전: 능력 · 스트레스를 ▲ / ▼로) */
  if (+e.stress) out.push(`<span class="chip ${e.stress < 0 ? 'pos' : 'neg'}">${ic('stress')}${e.stress > 0 ? '+' : '−'}${Math.abs(e.stress)}</span>`);
  return out.join(''); };
function monoOpen(pid) {
  G.walkT = null;
  const st = G.st, P = G.P, p = SH.PL[pid], nm = short(p.name_ko), m = document.getElementById('mono'); if (!m) return;
  const opts = P.options.map((o, i) => [o, i]).filter(([o]) => o.place === pid), ok = opts.filter(([o]) => o.ok !== false);
  let line, btns;
  if (!SH.isOpen(st, pid)) { line = SH.fillKeys(SH.D.map_lines.DOOR.locked, { place: nm, when: LOCK_TXT()[pid] || SH.D.map_lines.DOOR.locked_when }); }   /* 장소 앞 혼잣말 — 원본 지도_글.json 의 DOOR */
  else if (!ok.length) { line = (opts[0] && opts[0][0].why) ? SH.fillKeys(SH.D.map_lines.DOOR.why, { place: nm, why: opts[0][0].why }) : (p.slots || []).length === 1 && p.slots[0] === 'evening' && P.slot.kind !== 'evening' ?   /* 저녁 칸만 여는 곳(장소 카드 '칸') — 11-15 대표님 '추천대로': 부제 글을 열쇠로 읽던 것을 걷고 다섯 곳 모두에 */
       SH.fillKeys(SH.D.map_lines.DOOR.evening, { place: nm }) : SH.fillKeys(SH.D.map_lines.DOOR.nothing, { place: nm }); }
  else { const L = MONO()[pid] || SH.D.map_lines.DOOR.enter.map(t => SH.fillKeys(t, { place: nm })); line = L[st.tick % L.length]; }
  // 장소 앞에선 '들어갈까?'만(피드백 48 · 목업 ㉠ — 안에 누가 있는지는 '자주 오는 사람' 한 줄)
  const ppl = SH.peopleAt(st, pid, P.slot).filter(c => st.rel[c] && st.rel[c].st >= 1);
  let sub = '';
  if (ok.length) { line = SH.fillKeys(SH.D.map_lines.DOOR.ask, { place: nm }); sub = `${P.slot.ko}${ppl.length ? ' · 자주 오는 사람 ' + ppl.map(c => SH.name(c)).join(' · ') : ''}`; }
  const dt = ok.find(([o]) => o.date), dtNo = !dt && opts.find(([o]) => o.date);   /* 151: 약속 자리면 들어가는 것이 곧 약속 — 물음에서 미리 알림 */
  if (dt) { line = SH.fillKeys(SH.D.map_lines.DOOR.date, { place: nm, who: SH.name(dt[0].who) }); sub = `들어가면 바로 만난다 · 돈 −${SH.won(SH.R.date_cost)}`; }
  else if (dtNo && ok.length) sub += ` · ${SH.josa(SH.name(dtNo[0].who), '과/와')}의 약속은 ${dtNo[0].why || '지금 안 됨'}`;
  btns = ok.length ? `<div class="btn big" data-act="enter" data-enter="${pid}"><span>${dt ? '약속에 간다' : '들어간다'}</span></div><div class="btn" data-act="mono-close">아니, 나간다</div>`
    : '<div class="btn" data-act="mono-close">돌아선다</div>';
  m.innerHTML = `<div class="box px">${fc('hero', 2)}<div class="say"><b>나</b><p>${esc(line)}${sub ? `<small class="mute" style="display:block">${esc(sub)}</small>` : ''}</p></div><div class="acts">${btns}</div></div>`;
  paint(m);
}
// 데이트 사다리: '다음 약속까지 ●●○' — 다 차면 '약속 ✉'(주말 칸에 약속이 생김) · 다툼 중이면 '다툼'
function dateDots(st, c) {
  const m = SH.dateMeter(st, c); if (!m) return '';
  const t = m.q ? '다툼' : m.ready ? '약속 ✉' : '약속 ' + '●'.repeat(m.n) + '○'.repeat(3 - m.n);
  return `<span class="dt ${m.ready && !m.q ? 'on' : ''}" title="다음 데이트: 호감 ${m.need}">${t}</span>`;
}
// 109(11-14 대표님 '눌러볼 수 있는 카드가 생겼으니 나중에 추가될 사람들을 고려해 사진과 이름만 남기고 작게 · 대신 약속 잡을 수 있는 상태는 밖에서 알 수 있게'):
//   두 줄기 작은 칸 = 얼굴 + 이름 · 약속을 잡을 수 있으면 분홍 '약속 ✉' · 다투는 중이면 '다툼' — 호감 막대 · 사이 · 약속 칸은 카드 안으로(전: 사람마다 세 줄)
//   150(11-14 대표님 '약속 뱃지 부분이 짤림'): 딱지를 이름 옆이 아니라 이름 아래에(얼굴 높이 안 두 줄) — 옆에 두면 반쪽 칸 너비를 넘어 옆 사람 얼굴에 가렸음
function midPeople(st) {
  const ids = Object.keys(SH.CH).filter(c => SH.CH[c].group === 'romance');
  const met = ids.filter(c => (st.rel[c] || {}).st >= 1), unk = ids.length - met.length;
  return `<div class="card px ppl"><div class="hd"><span>사람</span><span class="mute ph">누르면 카드</span></div><div class="pgrid">${met.map(c => { const m = SH.dateMeter(st, c), q = st.rel[c].q || (m && m.q), rdy = m && m.ready && !q;
    return `<div class="pp${rdy ? ' rdy' : ''}" data-act="person" data-id="${c}" title="누르면 이 사람의 카드">${fc(c, 1)}<span class="tx"><span class="nm">${esc(SH.name(c))}</span>${q ? '<span class="tg">다툼</span>' : rdy ? `<span class="tg on">${esc((SH.dateWhen(st, c) || {}).short || '')} 약속</span>` : ''}</span></div>`; }).join('')}${unk ? `<div class="pp unk"><span class="q">?</span><span class="nm">모름 ${unk}명</span></div>` : ''}</div></div>`;
}
/* 사람 카드(11-14 대표님 '사람을 눌렀을 때 어떤 사람인지 · 배경을 설명하는 카드 · 이벤트 일러스트도 모아서' · '만날수록 열림'): 사이가 한 단계 오를 때마다 한 줄씩 열림 · 같이 본 장면 그림은 본 것만(안 본 것은 자물쇠)
   글의 근거 = 인물_카드.md(한 줄 · 끌리는 것 · 원하는 것 · 상처 — '비밀' 칸은 줄거리라 안 씀) */
midPeople.card = function (c) {
  const st = G.st, ch = SH.CH[c], r = st.rel[c]; if (!ch || !r) return;
  const T = midPeople.card.bio(c, ch), stg = SH.stages(c);
  const lines = midPeople.card.lines(T, stg, r), tiles = midPeople.card.tiles(st, c);
  overlay(`<div class="box px gold wide pcard"><div class="pc-l">${artImg(c, null, 'pc-ill') || fc(c, 5)}</div>
    <div class="pc-r">${midPeople.card.head(st, c, ch, r, stg)}
      ${midPeople.card.date(st, c, r)}
      <div class="pc-sec"><b>어떤 사람</b>${lines}</div>
      <div class="pc-sec two"><div><b>만나는 곳</b><p>${esc(T.where)}</p></div>${T.tell ? `<div><b>해 주는 얘기</b><p>${esc(T.tell)}</p></div>` : ''}</div>
      <div class="pc-sec"><b>같이 본 장면</b><div class="cgs">${tiles || '<p class="mute">아직 없다</p>'}</div></div>
      <div class="acts"><div class="btn big" data-act="ovl-close">닫기</div></div></div></div>`);
};
// 사람 카드의 조각 — 모두 글(HTML)만 돌려줌 · 창에 붙이기(overlay)는 위 한 곳
// 글의 근거(인물_카드.md): 해 주는 얘기 · 만나는 곳 · 사이마다 열리는 넉 줄 — 표에 없는 사람은 한 줄 소개만
midPeople.card.bio = function (c, ch) {
  return SH.D.ui_lines.PEOPLE_BIO[c] || { tell: '', where: '', l: [ch.oneliner_ko || ''] };   /* 원본 04_시범/대사/화면_글.json 의 PEOPLE_BIO */
};
// 이름 · 직업 · 나이 · 지금 사이 + 다음 사이까지 막대
midPeople.card.head = function (st, c, ch, r, stg) {
  const nx = stg[r.st + 1], hi = nx && nx.min_affection;
  return `<div class="pc-hd"><h2>${esc(SH.name(c))}</h2><small class="mute">${esc(SH.job(c))} · ${ch.age || ''}세</small><span class="sg pink-t">${esc(SH.stageName(st, c))}${r.q ? ' · 다투는 중' : ''}</span></div>
      <div class="pc-bar"><span class="bar"><i style="width:${r.aff}%"></i></span><small class="mute">${hi ? `‘${esc(nx.name_ko)}’까지 ${Math.max(0, hi - r.aff)}` : nx ? `‘${esc(nx.name_ko)}’ — 마음을 전해야 함` : '가장 가까운 사이'}</small></div>`;
};
// 어떤 사람: 사이가 한 단계 오를 때마다 한 줄씩 열림(안 열린 줄은 자물쇠)
midPeople.card.lines = function (T, stg, r) {
  return T.l.map((t, k) => k < Math.max(1, r.st) ? `<p>${esc(t)}</p>` : `<p class="lk">${ic('lock')} ${esc((stg[k + 1] || {}).name_ko || '더 가까운 사이')}부터 알게 된다</p>`).join('');
};
// 같이 본 장면: 본 그림만(여덟 장까지) · 못 본 수는 자물쇠 칸 하나
midPeople.card.tiles = function (st, c) {
  const cgs = SH.EVENTS.filter(ev => ev.art && ev.art.cg && (ev.who || []).includes(c) && SH.cgPath(ev.art.cg)), seen = cgs.filter(ev => st.seen[ev.id] != null);
  return seen.slice(0, 8).map(ev => `<div class="cgt"><img src="${SH.cgPath(ev.art.cg)}" alt=""><small>${esc(SH.fill(ev.title, st))}</small></div>`).join('') + (cgs.length > seen.length ? `<div class="cgt lk"><div class="q">${ic('lock', 3)}</div><small>아직 못 본 장면 ${cgs.length - seen.length}</small></div>` : '');
};
// 약속 칸(잡혀 있으면 때 · 곳 · 그 사람이 한 말) · 없으면 만남 점
midPeople.card.date = function (st, c, r) {
  const w = !r.q && SH.dateWhen(st, c);   /* 152 · 153(11-14 대표님 '약속이 뭐였는지 사람 카드에서 나와야 함 · 정확히 무슨 월 무슨 주 언제인지'): 약속이 잡혀 있으면 때 · 곳 · 그 사람이 한 말 */
  return w ? `<div class="pc-date px"><div class="h"><span class="tg">약속</span><b>${esc(w.when)}</b><span>${esc(w.placeKo)}</span></div><p>${esc(w.say)}</p><small class="mute">${st.mode === 'week' ? `그날 ${esc(w.placeKo)}에 가면 바로 만난다 · 돈 ${SH.won(SH.R.date_cost)} · 안 가면 다음 주로 밀린다` : '이번 달 지도에서 고른다'}</small></div>` : `<div class="pc-dt">${dateDots(st, c)}</div>`;
};
/* '나' 카드: 육성 시뮬의 맛 — 첫날(옅은 칸) → 지금(막대) · 이번 주 오른 만큼 ▲ */
const ME_STATS = ['analysis', 'talk', 'network', 'rep', 'style'];   /* 이름은 자료(SH.statKo) */
function midMe(st) {
  const snap = (st.wk && st.wk.snap && st.wk.snap.s) || st.s, start = k => ((SH.D.stats.items.find(x => x.id === k) || {}).start) || 0;
  const rows = ME_STATS.map(k => { const nm = SH.statKo(k), v = Math.max(0, st.s[k]), s0 = Math.max(0, start(k)), d = st.s[k] - (snap[k] || 0);
    return `<div class="mr"><span class="k">${nm}</span><span class="mb"><i class="s0" style="width:${Math.min(100, s0)}%"></i><i class="now" style="width:${Math.min(100, v)}%"></i></span><b>${st.s[k]}</b>${statFloat.d('s', k, 'd')}</div>`; }).join('');   /* 117: 방금 고른 것으로 바뀐 값만 ▲얼마가 4초 깜빡임(main.js answer · G.flash) — 평소엔 안 보임(107) */
  const up = ME_STATS.reduce((t, k) => t + Math.max(0, st.s[k] - (snap[k] || 0)), 0);
  const conv = st.rank === 'intern' ? stampBoard(st) : '';
  return `<div class="card px mecard"><div class="hd"><span>나 — ${esc((SH.RK[st.rank] || {}).name_ko || '')}</span></div>${conv}${rows}</div>`;
}
// 정규직 도장판(11-12 밤 대표님 '섞는 길로' — '나' 카드엔 도장판): 인턴 주 수만큼 칸(규칙 conversion_window · 155: 12 → 8) · 금요일 과제 성공 = 빨간 도장 · 실패 = ✕ · 이번 주 칸 깜빡 · 도장이 conversion_tasks_min(6)개면 심사 문턱
function stampBoard(st) {
  const win = SH.R.conversion_window, need = SH.R.conversion_tasks_min, all = st.tasks.filter(t => t.mode === 'week'), last = all.slice(-win), ok = last.filter(t => t.ok).length;
  const fresh = st.wk && st.wk.picks && !st.wk.picks.length && st.mode === 'week';   // 결산 바로 뒤 새 주 — 막 찍힌 도장만 톡
  const cells = Array.from({ length: win }, (_, k) => { const t = last[k];
    if (t) return `<i class="${t.ok ? 'ok' : 'no'}${fresh && k === last.length - 1 ? ' new' : ''}">${t.ok ? '' : '✕'}</i>`;
    return `<i class="${k === last.length && st.mode === 'week' ? 'cur' : ''}"></i>`; }).join('');
  const left = Math.max(0, win - all.length);
  return `<div class="cv sboard"><div class="sh"><span>정규직까지</span><b class="${ok >= need ? 'gold-t' : ''}">도장 ${ok} / ${need}</b><small>${all.length < win ? `남은 주 ${left}` : `최근 ${win}주`}</small></div><div class="sb" style="grid-template-columns:repeat(${win},minmax(0,26px))">${cells}</div></div>`;
}
const FIRST_TIPS = (st) => SH.D.ui_lines.FIRST_TIPS.map(t => SH.fillKeys(t, { window: SH.R.conversion_window, tasks: SH.R.conversion_tasks_min }));   /* 글 원본 = 04_시범/대사/화면_글.json */
function midRumor(st) {
  const hint = SH.activeHints(st)[0];
  // 첫 네 주(인턴)는 소문 대신 규칙 한 줄(리서치 '설명 없는 첫 진행이 버려지는 1순위' — 게임 데브 타이쿤 · 프린세스 메이커 불만)
  const tip = !hint && st.rank === 'intern' && st.tick < 4 ? FIRST_TIPS(st)[(st.tick + ((st.wk || {}).picks || []).length) % 5] : '';
  const txt = hint ? `귀띔 — ${SH.STOCK[hint.stock].name_ko} ${hint.dir === 'up' ? '▲' : '▼'}` : tip || rumorOf(st);
  return `<div class="rum inside ${tip ? 'tip' : ''}"><b>${tip ? '안내' : '소문'}</b><span>${esc(txt)}</span></div>`;   // 중간 판: 오른쪽 기둥 맨 아래 칸(11-12 '소문이 자취방 글자를 가림') · 11-13 기둥 흐름 안으로 — 띄워 두면 사람 목록 끝 줄을 덮음
}
function shade(hex) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, v - 12); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); }

const PLACE_LINE = () => SH.D.map_lines.PLACE_LINE;
/* 장소 안 화면(피드백 48): 장면 배경 위에 혼잣말 · 와 있는 사람 · 할 일 고르기 — 들어가면 이 칸은 여기서 보냄(나가기 없음) */
function insideScreen(P, pid) {
  G.redraw = () => insideScreen(P, pid);
  const st = G.st, p = SH.PL[pid], bg = BG_OF()[pid] || 'office', dark = ['bar', 'hotel'].includes(bg);
  const met = !!(st.wk.pre && st.wk.pre.id);
  const ppl = SH.peopleAt(st, pid, P.slot).filter(c => st.rel[c] && st.rel[c].st >= 1);
  const flavor = PLACE_LINE()[pid] || '';
  const line = met ? SH.D.map_lines.DOOR.inside_done : (flavor + (ppl.length ? SH.fillKeys(SH.D.map_lines.DOOR.inside_ppl, { who: SH.name(ppl[0]) }) : SH.D.map_lines.DOOR.inside_none)).trim();
  const opts = P.options.map((o, i) => [o, i]).filter(([o]) => o.place === pid);
  { const mk = +new URLSearchParams(location.search).get('mockn'); if (mk) opts.length = Math.min(opts.length, mk); }   // 화면 예시용: 선택지 수를 맞춰 봄(&mockn=N)
  const ch = opts.map(([o, i], k) => `<div data-opt="${o.ok === false ? '' : i}" class="${o.ok === false ? 'dis' : ''}"><b>${k + 1}</b><span>${esc(o.label)}${o.ok === false ? `<small>${esc(o.why || '')}</small>` : ''}${chipsOf.odds(st, o)}</span>${o.sub || chipsOf.gain(o) ? `<small class="cchips">${chipsOf(o.sub)}${chipsOf.gain(o)}</small>` : ''}</div>`).join('');
  const out = `<div data-act="leave" class="leave"><b>↩</b><span>그냥 나간다</span></div>`;   /* 127: 칸을 안 쓰고 지도로 */
  const sc = document.getElementById('screen');
  sc.className = 'k-event k-inside' + (dark ? ' dark' : '');
  sc.innerHTML = `${placeBg(pid, bg)}<div class="dots"></div>${!met && ppl.length ? artImg(ppl[0], SH.exprId(ppl[0], null), 'ill ' + (dark ? 'night' : '')) : ''}`
    + `<div class="title"><span class="chip">${esc(short(p.name_ko))} · ${esc(P.slot.ko)}</span><h2>${esc(p.name_ko)}</h2></div>
    <div class="dlg px"><div class="name me">나</div><div class="text nar">${esc(line)}</div><div class="ch show" id="ch">${ch}${out}</div></div>`;
  paint(sc);
}

/* 지도 화면: 물음 P(t:'slot') — 들어가 있는 중이면 장소 안 화면 */
function mapScreen(P) {
  const pre = G.st.wk && G.st.wk.pre;
  if (pre && pre.si === P.si) return insideScreen(P, pre.place);
  const byPlace = {};
  P.options.forEach((o, i) => { (byPlace[o.place] = byPlace[o.place] || []).push(i); });
  const allDis = (pid) => byPlace[pid] && byPlace[pid].every(i => P.options[i].ok === false);
  return worldScreen(P, byPlace, allDis);
}
