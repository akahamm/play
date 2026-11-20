/* =====================================================================
   ui/map.js — 지도(새 짜임 · js/map2) · 장소 앞 혼잣말 창 · 장소 안 화면 · 지도 옆 판
   - 칸 하나 = 지도에서 장소로 걸어감 → '들어갈까?' → 장소 안에서 할 일을 고름(피드백 48)
   - 지도 옆 판(인턴 주: 나 · 과제와 도장판 · 사람 · 귀띔 · 삐삐와 소지품 단추)은 늘 붙음 · 순위표 · 소지품 창도 여기(stampBoard.open · stampBoard.bag)
   - 11-13 대표님 '레거시 확실히 정리하고 바로 가자': 옛 그림 지도(map_full · 길 그물) · 예전 판(?ui=old) · 쉬운 판(?ui=simple) · 손그림 장소 화면을 걷어냄
   ===================================================================== */
const PIN_SUB = () => SH.placeCol('sub_ko');   /* 지도 이름표 부제 · 원본 = 04_시범/장소_카드.md '부제' 칸 */
const LOCK_TXT = () => SH.placeCol('lock_ko');   /* 11-14 가게별로 나눔 — 사원부터 여는 가게 셋(인턴 땐 자물쇠) */
const short = (n) => n.replace(/\(.*\)/, '').replace('여명증권 ', '').trim();

/* 지도 옆 칸(인턴 주 · 11-16 피드백 186 ~ 190 → 목업 04_시범/목업/인턴화면_1116 셋째 장 오른쪽 '안 ㉯ 고침' 확정 · 197):
   맨 위 줄(topBar me — 날짜 · 계절 · 지금 칸 · 톱니) 아래로 '나'(얼굴 · 이름 · 주차 · 돈 · 체력과 스트레스 한 줄 · 능력치) → 과제(금테 — 아래쪽 도장판을 누르면 순위표) → 사람 → 귀띔(있을 때만 한 줄) → 삐삐 · 소지품 단추
   과제 칸 = 얼굴 · 이름 · 할 일 한 줄 · 칸 막대와 n/전체 · 아래 '★ 보너스' 칸(midSide.bonus — 받는 것 · 조건 둘) · 도장판 — 글은 화면_글.json 의 TASK_UI · INTERN */
/* 201(11-17 대표님 목업 셋째 승인 · 04_시범/목업/인턴화면_1116/목업_10): 과제 칸 아래 '★ 보너스' 칸 — 첫 줄 = 받는 것(좁은 글꼴 한 줄) · 둘째 줄 = 조건 둘(평일 안에 · 능력치 선)을 칸으로(채우면 초록)
   받는 것은 규칙 값(intern_big_*)에서 · 선이 없는 주(line < 0)는 칸 없음 · 이미 받았으면 '보너스 받음' — 글은 화면_글.json 의 TASK_UI */
function midSide(st, P, byPlace, allDis, ask) {
  const t = st.task, goal = t ? t.goal : 2, prog = t ? Math.min(goal, t.progress) : 0;
  const nw = (G.flash && G.flash.task) || 0, bar = Array.from({ length: goal }, (_, i) => `<i class="${i < prog ? 'on' + (i >= prog - nw ? ' flb' : '') : ''}"></i>`).join('');   /* 117: 방금 찬 칸은 깜빡 */
  const TU = SH.D.ui_lines.TASK_UI, sk = t && t.kind ? SH.taskStat(t) : '', doTxt = !sk ? '' : P && P.slot && P.slot.kind === 'weekend' && prog < goal ? TU.wk[t.kind] : TU.do[t.kind];   /* 11-18 대표님 '가 + 나': 주말에 과제가 덜 찼으면 어디서 특근하는지 */
  return `<div class="side ms im">
    ${midMe(st)}
    <div class="card px gold tcard"><div class="hd"><span>이번 주 과제</span><span class="gold-t">+${SH.won(SH.R.intern_task_bonus)}</span></div>
      <div class="trow t2">${fc('boss', 1.5)}<div class="tx"><h3>${esc(t ? t.name : '월요일 아침에 받음')}</h3>${doTxt ? `<small class="tk">${esc(doTxt)}</small>` : ''}<div class="pgr2"><div class="prog">${bar}</div><span>${prog}/${goal}</span></div></div>${t && !t.big && prog >= goal ? '<b class="green-t">달성</b>' : ''}</div>
      ${sk ? midSide.bonus(st, P, t, sk) : ''}
      ${st.rank === 'intern' ? stampBoard(st) : ''}</div>
    ${midPeople(st) + midRumor(st)}
    <div class="tray">${toast.chip(st)}<div class="bagb" data-act="bag">${ic16('shop', 20)}<b>${esc(SH.D.ui_lines.BAG.btn)}</b></div></div>
  </div>`;
}
midSide.bonus = function (st, P, t, sk) {
  if (t.line == null || t.line < 0) return '';
  const TU = SH.D.ui_lines.TASK_UI, g = SH.bigGive(t.big || t.kind);   /* 받았으면 실제로 받은 갈래(아는 사람 도움 = help)의 것 · 아직이면 이 과제 갈래의 것 — 값은 규칙 한 곳(SH.bigGive) */
  const give = [TU.bonus_boss, SH.fillKeys(SH.D.ui_lines.TASK_UI.bonus_rep, { n: g.rep })].concat(g.money ? ['+' + SH.won(g.money)] : []).join(' · ');
  /* 215(11-17 대표님 '5주차 · 평일에 다 채우고 주말에 말솜씨를 올렸는데 보너스 못 받음'): 조건은 끝내는 그 순간에만 봄(rules/intern.js) — 보너스 없이 끝냈으면 '놓침' · 조건 칸은 끄고 흐리게(뒤에 능력치를 올려도 안 켜짐) */
  const miss = !t.big && t.progress >= t.goal;
  const wkday = !miss && (!!t.big || !!(P && P.slot && P.slot.day === '평일')), ck = (on) => `<i class="ck${on ? ' on' : ''}"></i>`;
  const cond = t.line === 0 ? `${ck(wkday)}<span>${esc(TU.ck_both)}</span>`
    : `${ck(wkday)}<span>${esc(TU.ck_weekday)}</span>${ck(!miss && (t.big || st.s[sk] >= t.line))}<span>${esc(SH.fillKeys(SH.D.ui_lines.TASK_UI.ck_stat, { stat: SH.statKo(sk), line: t.line }))}</span><span class="bb"><i style="width:${Math.min(100, Math.round(st.s[sk] / t.line * 100))}%"></i></span><b>${st.s[sk]}</b>`;
  return `<div class="tbon${t.big ? ' got' : miss ? ' miss' : ''}"><div class="h"><span>${esc(t.big ? TU.bonus_done : miss ? (t.how === null ? TU.bonus_card : TU.bonus_miss) : TU.bonus)}</span><small>${esc(give)}</small></div><div class="c">${cond}</div></div>`;
};
const MONO = () => SH.D.map_lines.MONO;
// 고르기 칩(11-12 '돈 표기가 다름' → 돈은 늘 동전 + '−20,000원' · 체력은 번개 + 숫자(11-13 피드백 47) · 만남 · 호감은 별)
const chipsOf = (sub) => String(sub || '').split(' · ').filter(t => t && !/호감/.test(t)).map(t => {   /* 108: 호감은 단추에서 뺌 */
  const money = /밥값|돈|₩|원$|만$|천$/.test(t), hp = /체력/.test(t);
  const txt = money ? t.replace(/^(밥값|돈)\s*/, '').replace(/^(\d)/, '−$1') : hp ? t.replace(/체력\s*/, '').replace('-', '−') : t;
  return `<span class="chip">${hp ? ic('hp') : money ? ic('coin') : /만남|호감/.test(t) ? ic('star') : ''}${esc(txt)}</span>`; }).join('');
// 얻는 것도 단추에(11-14 대표님 '술자리는 기력 · 돈이 나가는데 쉼은 채워짐 — 압도적으로 쉼': 술자리의 인맥 · 평판 · 스트레스가 안 보였음) — 능력 · 스트레스는 오르내림만 · 새 전역을 안 만들려고 chipsOf 에 붙임
// 업무 칸: 잘 풀릴 확률(인턴 주 과제는 풀려야 끝남) — 능력치가 높을수록 · 스트레스 80부터 · 다시 매달릴수록 깎임
chipsOf.odds = (st, o) => { const a = SH.AC[o.action]; if (!a || o.ok === false || !(a.id.startsWith('work_') || a.id === 'eve_overtime')) return ''; const base = a.id === 'eve_overtime' ? SH.AC[SH.overtimeWork(st)] : a; return `<small class="odds">잘 풀릴 확률 ${SH.successRate(st, base, 0)}%</small>`; };
chipsOf.gain = (o) => { const e = Object.assign({}, (SH.AC[o.action] || {}).effects || {}), out = []; if (o.action === 'wk_study' && o.variant && o.variant !== 'hint') e[o.variant] = (e[o.variant] || 0) + (((SH.AC.wk_study || {}).skill_extra || {}).choose_one || 4);   // 책 읽기 · 스피치 학원 · 동문회 = 그 능력 +4
  /* 108: 능력치는 단추에서 뺌 · 스트레스는 값 그대로(전: 능력 · 스트레스를 ▲ / ▼로) */
  if (+e.stress) out.push(`<span class="chip ${e.stress > 0 ? 'up' : 'dn'}">${ic('stress')}${e.stress > 0 ? '+' : '−'}${Math.abs(e.stress)}</span>`);
  return out.join(''); };
function monoOpen(pid) {
  G.walkT = null;
  if (!G.P.slot) return G.LOOP.mono(pid);   // 사원 뒤(물음 lmap) — ui/loop.js
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
/* '나' 칸(목업 '안 ㉯ 고침'): 얼굴 · 이름 · 인턴 n/6주 · 돈 → 체력과 스트레스 한 줄(같은 너비 · 누르면 설명) → 능력치 다섯 줄(첫날 옅은 칸 → 지금 막대) */
const ME_STATS = ['analysis', 'talk', 'network', 'rep', 'style'];   /* 이름은 자료(SH.statKo) */
function midMe(st) {
  /* 211(11-17 대표님 '노란색 개념이 없어도 될 것 같음 · 회색으로 채우자'): 능력치 막대는 지금 값 하나만 회색으로(전: 처음 값 회색 + 지금 값 노랑) */
  const rows = ME_STATS.map(k => { const nm = SH.statKo(k), v = Math.max(0, st.s[k]);
    return `<div class="mr"><span class="k">${nm}</span><span class="mb"><i class="now" style="width:${Math.min(100, v)}%"></i></span><b>${st.s[k]}</b></div>`; }).join('');
  const wk = st.rank === 'intern' && st.mode === 'week' ? SH.fillKeys(SH.D.ui_lines.INTERN.top0, { week: st.week, weeks: SH.internWeeks() }) : (SH.RK[st.rank] || {}).name_ko || '';   /* 183: 몇 주째인지 · 199(11-17 대표님): 이름 옆 오른쪽 끝에 돈(동전 없이) · 주차는 이름 밑 */
  return `<div class="card px mecard"><div class="meh">${fc(SH.GAME.hero, 1.5)}<div class="mt"><div class="mn"><b>${esc(SH.name(SH.GAME.hero))}</b>${((w) => `<span class="mw${w.length > midMe.wonLong ? ' sm' : ''}" title="돈 ${SH.won(st.s.money)}">${w}</span>`)(midMe.won(st.s.money))}</div><small class="mute mwk">${esc(wk)}</small></div></div>
    <div class="mhs">${topBar.hp(st)}${stressStat(st)}</div>${rows}</div>`;
}
midMe.wonLong = 10;   // 이 글자 수를 넘는 돈은 글자를 줄여 이름을 안 가림(화면 짜임 수)
midMe.won = function (v) {         // 좁은 칸용(199 · 11-17 대표님 '1억이 넘어가면 숫자 넘침 대처'): 1억 아래는 SH.won 그대로 · 넘으면 '1억 2,345만원'(만 아래는 버림)
  const a = Math.abs(Math.round(v)); if (a < 1e8) return SH.won(v);
  const e = Math.floor(a / 1e8), m = Math.floor(a % 1e8 / 1e4);
  return (v < 0 ? '−' : '') + e.toLocaleString('ko-KR') + '억' + (m ? ' ' + m.toLocaleString('ko-KR') + '만' : '') + '원';
};
// 정규직 도장판(과제 칸 아래쪽 · 누르면 순위표 창): 정규직 순위 n등 · 점수 | 주차 칸 · 순위표 ▸ · 인턴 주 수만큼 칸(규칙 conversion_window) — 일요일 밤 결산의 과제 성공 = 빨간 도장 · 실패 = ✕ · 이번 주 칸 깜빡 · 글은 화면_글.json 의 INTERN
function stampBoard(st) {
  const L = SH.internList(st), T = SH.D.ui_lines.INTERN, win = L.win, last = st.tasks.filter(t => t.mode === 'week').slice(-win);
  const fresh = st.wk && st.wk.picks && !st.wk.picks.length && st.mode === 'week';   // 결산 바로 뒤 새 주 — 막 찍힌 도장만 톡
  const cells = Array.from({ length: win }, (_, k) => { const t = last[k];
    if (t) return `<i class="${t.ok ? 'ok' : 'no'}${fresh && k === last.length - 1 ? ' new' : ''}">${t.ok ? '' : '✕'}</i>`;
    return `<i class="${k === last.length && st.mode === 'week' ? 'cur' : ''}">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.side_wk, { n: k + 1 }))}</i>`; }).join('');   /* 206: 빈 칸에 주차 */
  /* 206(11-17 대표님 시안 ㉮ 둘째 승인 · 목업_13): 위 줄 '정규직 순위 2등'(점수는 212 에서 뺌 — 순위표에 있음) · 아래 줄 주차 칸 + 오른쪽 '순위표 ▸' */
  const line = L.n ? `<small>${esc(T.side_head)}</small><span class="sr ${L.pass ? 'ok' : 'no'}">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.side_rank, { rank: L.rank + 1 }))}</span>` : `<span class="sr">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.side_rank0, { cut: L.cut }))}</span>`;
  return `<div class="cv sboard" data-act="rank"><div class="sh">${line}</div><div class="sr2"><div class="sb" style="grid-template-columns:repeat(${win},minmax(0,26px))">${cells}</div><b>${esc(T.side_go)}</b></div></div>`;
}
/* 순위표 창(190 · 목업 둘째 장 왼쪽): 다섯 명 점수 막대 · 붙는 끝 등수 아래 선 · 내 점수가 어디서 나왔나(SH.convParts) · 점수가 오르는 길 — 숫자는 모두 규칙 값에서 */
stampBoard.open = function () {
  const st = G.st, L = SH.internList(st), T = SH.D.ui_lines.INTERN, cp = SH.convParts(st), top = Math.max(1, ...L.rows.map(x => x.v));
  const rows = L.rows.map((x, k) => `<div class="rk ${k < L.cut ? 'in' : ''} ${x.me ? 'me' : ''}"><span class="no">${k + 1}</span><span class="nm">${esc(x.nm)}</span><span class="b"><i style="width:${Math.round(x.v / top * 100)}%"></i></span><b>${esc(SH.fillKeys(SH.D.ui_lines.INTERN.pt, { v: x.v }))}</b><i class="bd ${k < L.cut ? 'ok' : 'no'}">${k < L.cut ? '정규직' : '탈락'}</i></div>${k === L.cut - 1 ? `<div class="cut">${esc(T.rk_cut)}</div>` : ''}`).join('');
  const pts = SH.R.boss_stage_points, bst = SH.stages('boss'), cur = (st.rel.boss || {}).st || 0;
  const ups = pts.map((v, i) => [i, v]).filter(([i, v]) => i > cur && v > (pts[cur] || 0) && bst[i]).slice(0, 2).map(([i, v]) => SH.fillKeys(SH.D.ui_lines.INTERN.rk_way_boss, { stage: bst[i].name_ko, pts: v })).join(' · ');
  const part = (txt, v) => `<span>${esc(txt)} <b class="gold-t">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.pt, { v }))}</b></span>`;
  overlay(`<div class="box px gold rkwin"><div class="hd"><span class="gold-t">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.rk_title, { week: st.week, weeks: L.win }))}</span><small>${esc(L.left ? SH.fillKeys(SH.D.ui_lines.INTERN.left, { left: L.left }) : T.done)}</small></div>${rows}
    <div class="grp">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.rk_mine, { score: L.score }))}</div><div class="parts">${part(SH.fillKeys(SH.D.ui_lines.INTERN.rk_stamps, { n: L.ok }), cp.tasks)}${part(SH.fillKeys(SH.D.ui_lines.INTERN.rk_rep, { rep: st.s.rep }), cp.rep)}${part(SH.fillKeys(SH.D.ui_lines.INTERN.rk_boss, { stage: SH.stageName(st, 'boss') }), cp.boss)}</div>
    <div class="grp">${esc(T.rk_way_head)}</div><p class="way">${esc(SH.fillKeys(SH.D.ui_lines.INTERN.rk_way, { per: SH.stampPoints(), boss: ups || '—', rep: Math.round(1 / SH.R.conversion_rep_weight) }))}</p>
    <div class="acts"><div class="btn big" data-act="ovl-close">${esc(T.rk_close)}</div></div></div>`);
};
/* 소지품 창(186 · 새로 · 보기만): 가진 물건(st.owned)을 종류(가게 탭 차례)별로 · 걸친 것(st.equip)엔 '입음 · 참' — 팔기 · 바꿔 입기 없음 · 글은 화면_글.json 의 BAG */
stampBoard.bag = function () {
  const st = G.st, T = SH.D.ui_lines.BAG, own = st.owned.map(id => SH.item(id)).filter(Boolean);
  const grp = SH.SHOP_TABS.map(([k, nm]) => [nm, own.filter(it => it.slot === k), k]).filter(g => g[1].length);
  const body = grp.map(([nm, list, k]) => `<div class="grp">${esc(nm)}</div>${list.map(it => `<div class="bg-r"><span>${esc(it.name_ko)}</span>${st.equip[k] === it.id && T.on[k] ? `<i class="on">${esc(T.on[k])}</i>` : ''}</div>`).join('')}`).join('');
  overlay(`<div class="box px bagwin"><h2>${esc(T.title)}</h2>${body || `<p class="mute">${esc(T.none)}</p>`}<div class="acts"><div class="btn big" data-act="ovl-close">${esc(T.close)}</div></div></div>`);
};
/* 귀띔 줄(있을 때만 한 줄 · 사람 칸 아래 · 삐삐 · 소지품 단추 위): 1막 귀띔이 살아 있는 동안 종목과 오를지 내릴지 — 귀띔이 없으면 칸이 없음(첫 주 안내 · 소문 줄은 11-17 걷음) */
function midRumor(st) {
  const hint = SH.activeHints(st)[0]; if (!hint) return '';
  return `<div class="rum inside"><b>${esc(SH.D.ui_lines.INTERN.hint_tag)}</b><span>${esc(SH.fillKeys(SH.D.ui_lines.INTERN.hint, { stock: SH.STOCK[hint.stock].name_ko, dir: hint.dir === 'up' ? '▲' : '▼' }))}</span></div>`;
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

/* 204(11-17 대표님 '지도에서 뜨는 걸 장소 안에서 선택지 고를 때 뜨는 것처럼'): 장소에서 일을 고른 뒤 — 그 장소 그림을 그대로 두고 대화 창에 독백(없으면 업무 결과 · 고른 일) ·
   고르기 자리에 '계속' 하나 · 값 칸은 부르는 쪽(main.js answer)이 띄움 · '계속' · 빈 곳 · 엔터 → G.res(다음 화면) — 지도의 문 앞 창에서 바로 고른 것도 이 장소 그림으로 */
insideScreen.result = function (P0, pid, text) {
  if (!document.querySelector('#screen.k-inside') && P0) { if (P0.t === 'slot') insideScreen(P0, pid); else if (P0.t === 'lmap' && G.LOOP) G.LOOP.inside(pid); }   /* 사원 뒤(216)는 그 장소 안 화면 */
  const sc = document.getElementById('screen'); sc.classList.add('k-res');
  G.redraw = null;   /* 고른 뒤라 옛 고르기 화면을 다시 그리지 않음 */
  const tx = sc.querySelector('.dlg .text'); if (tx) tx.textContent = text;
  const ch = document.getElementById('ch'); if (ch) ch.innerHTML = `<div data-act="res-go" class="hot"><b>▶</b><span>${esc(SH.D.ui_lines.PLACE_RES.go)}</span></div>`;
};
/* 지도 화면: 물음 P(t:'slot') — 들어가 있는 중이면 장소 안 화면 */
function mapScreen(P) {
  const pre = G.st.wk && G.st.wk.pre;
  if (pre && pre.si === P.si) return insideScreen(P, pre.place);
  const byPlace = {};
  P.options.forEach((o, i) => { (byPlace[o.place] = byPlace[o.place] || []).push(i); });
  const allDis = (pid) => byPlace[pid] && byPlace[pid].every(i => P.options[i].ok === false);
  return worldScreen(P, byPlace, allDis);
}
