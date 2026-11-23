/* =====================================================================
   ui/main.js — 화면과 엔진을 잇는 곳
   - 엔진이 낸 물음(SH.next) 하나를 화면 하나로 그림 → 누르면 SH.answer → 다시 그림
   - 고를 때마다 저절로 저장 · 다시 켜면 '지난번 한 일 · 다음' 두 줄 (직장인 눈 검토 ⑥)
   - 사진용 바로 가기: index.html?shot=map|event|settle|shop|album|lmap|linside|market|end|stress (자동으로 그 장면까지 감 · 글자 치기 없음)
     (사진 모드 · 누르기 시험 · 예시 화면 같은 시험 손은 ui/devtest.js — 11-14 밤 정리에서 떼어 냄)
   ===================================================================== */

function describe(st, P) {
  switch (P.t) {
    case 'slot': return `${SH.dateLabel(st)} ${P.slot.ko} — 어디로 갈까`;
    case 'event': case 'reply': return `이야기 — ${SH.fill(SH.EV[P.id].title, st)}`;
    case 'settle': return `${SH.dateLabel(st)} 결산`;
    case 'lmap': return `${SH.dateLabel(st)} ${Math.min(4, ((st.L || {}).week || 0) + 1)}주 — 지도`;
    case 'lmeet': return `${SH.dateLabel(st)} — ${P.title}`;
    case 'shop': return '가게 안';
    case 'album': return `${P.year}년 앨범`;
    default: return P.title || '';
  }
}
// 저장은 이 한 곳에서(11-13 구조 정리 걸음 4) — 끝 화면이면 저장을 지움 · 아니면 지금 판을 저장
function persist(st, P) { if (P && P.t === 'end') SH.clearSave(); else SH.save(st); }
function render() {
  const st = G.st;
  const P = G.P = SH.next(st);
  SH.setMemo(st, { done: (st.memo && st.memo.done) || '첫 출근', next: describe(st, P) });
  persist(st, P);
  if (P.t !== 'notice' && P.t !== 'book') overlay('');
  /* 결산 화면에서 넘어오며 날짜가 바뀌었으면(answer 가 G.calFrom 에 앞 날짜를 둠) 일력 넘김 — 끝 화면 · 빠른 진행 · 시험은 안 함
     지도로 넘어갈 땐 새 화면 위에서 · 대사 장면으로 시작하는 주는 가린 바탕에서 다 넘긴 뒤에 장면을 그림(170) */
  const cal = G.calFrom; G.calFrom = null; const cw = G.calWk; G.calWk = null;
  const draw = () => {
    switch (P.t) {
      case 'event': transit('ill', () => { eventScreen(P); if (G.instant) while (dialogAdvance()); }); break;
      case 'reply': transit('ill', () => eventScreen(P, true)); break;
      case 'slot': transit('px', () => { mapScreen(P); toast.tell(); }, G.group === 'ill'); break;   /* 대사 장면에서 돌아올 땐 겹쳐 넘어감 */
      case 'settle': transit('px', () => (P.rep.loop ? G.LOOP.settle(P) : settleMid(P))); break;
      case 'shop': SHOPV.sel = null; SHOPV.msg = ''; SHOPV.to = null; transit('px', () => shopScreen('flow')); break;
      case 'lmap': transit('px', () => { G.LOOP.map(P); toast.tell(); }, G.group === 'ill'); break;
      case 'lmeet': transit('ill', () => { G.LOOP.meet(P); if (G.instant) while (dialogAdvance()); }); break;
      case 'notice': noticeOverlay(P); break;
      case 'book': { sfx('page'); const b = SH.bookOf(G.st, P.scope); overlay(b.grad ? bookHTML.grad(b) : bookHTML(b, false), b.grad ? 'full grad' : ''); break; }   /* 인턴 졸업 책은 화면 전체(11-18) */
      case 'album': transit('ill', () => albumScreen(P)); break;
      case 'end': transit('px', () => endScreen(P)); break;
    }
  };
  if (cw && P.t === 'lmap' && st.L && st.date === cw[0] && st.L.week + 1 !== cw[1] && !G.instant && !selfTesting) transit.cal(cw[0], st.date, null, [cw[1], st.L.week + 1]);
  if (cal && cal !== st.date && P.t !== 'end' && !G.instant && !selfTesting) { const talk = D.talk(P); transit.cal(cal, st.date, talk ? draw : null); if (talk) return; }
  draw();
}
function answer(a, doneTxt) {
  if (busy) return;
  if (doneTxt) SH.setMemo(G.st, { done: doneTxt });
  statFloat.clear();   /* 앞서 뜬 값 칸은 다음 누름에서 걷힘 */
  const before = a && (a.choice != null || a.opt != null || a.go != null) ? statSnap(G.st) : null;
  const lo = a && a.go != null && G.P && G.P.t === 'lmap' && G.st.L ? G.st.L.pool[a.go] : null;   /* 216 라 · 마: 사원 뒤 지도에서 고른 일도 인턴처럼 결과 화면 · 값 칸 */
  const pick = a && a.opt != null && G.P && G.P.t === 'slot' && G.P.options ? G.P.options[a.opt] : lo ? { place: G.LOOP.placeOf(lo), action: ({ rest: 'rest', study: 'wk_study' })[lo.t] || '', label: G.LOOP.label(lo) } : null;   /* 113: 장소에서 고른 일 — 고른 뒤 독백에 씀 */   // 장소 안에서 고른 것도 바뀐 값을 보임(단추에서 표시를 걷어냈으므로)
  const P0 = G.P;   /* 204: 고른 뒤 결과를 그 장소 그림 위에 보일 때 씀 */
  G.calFrom = G.P && G.P.t === 'settle' ? G.st.date : null;
  G.calWk = a && a.end && G.P && G.P.t === 'lmap' && G.st.L ? [G.st.date, G.st.L.week + 1] : null;   /* 216 바: 사원 뒤 '이번 주 마침' — 같은 달 안에서 주가 바뀌면 render 가 주 한 장을 넘김 */   /* 결산을 넘기면 주(달)가 바뀜 — render 가 일력 넘김을 띄움 */
  SH.answer(G.st, a);
  const t = SH.takeToasts(G.st);
  /* 값 칸: 다음 화면이 대화(이야기 · 대답)면 그 위에(다음 누름까지) — 128(11-14)의 '지도 가운데 위 한 줄'은 204(11-17 대표님 '장소 안에서 선택지 고를 때 뜨는 것처럼')로 걷음:
     장소에서 일을 고른 뒤 다음 화면이 대화가 아니면, 지도로 바로 가지 않고 그 장소 그림 위 대화 창에 독백 · 오른쪽 위에 값 칸 → '계속'(빈 곳 · 엔터)으로 다음 화면
     값 칸이 보여 주는 것(돈 · 체력 · 호감 · 업무 결과)은 알림 줄에서 뺌(130 중복) */
  const w = before && SH.takeWorkRes(G.st);
  const after = before && (!G.instant || selfTesting) ? statSnap(G.st) : null;   /* 누르기 시험도 결과 화면을 지나가게(값 칸은 G.instant 라 안 그림 · 구조 검토 1117 지적 4) */
  const wl = w ? statFloat.workLine(w) : '';   // 업무가 잘 풀렸는지 확실히(11-14 대표님 '잘 풀렸다는 기준이 있는지 아예 몰랐음 · 표시가 확실히 되어야')
  const nx = SH.next(G.st), kind = nx.t, talk = kind === 'event' || kind === 'reply' || kind === 'lmeet';   /* 다음 물음은 여기서 봄(G.P 는 render 가 바꿈 — 구조 검토 1117 지적 2) · SH.next 는 물음이 줄에 있으면 같은 것을 돌려줌 */
  const tidy = () => t.filter(x => !/^(돈|체력) |[♥♡]|과제 \+\d/.test(String(x)));
  /* 216 · 5: 사원 달 결산 화면은 가운데까지 글이 차 알림 쪽지가 앉을 자리가 없음(누르기 시험 'toast overlap' 32) — 그 화면에선 알림을 모아 두었다가 결산을 넘긴 다음 화면에서 띄움 */
  const flush = (list) => { const l = (G.toastLater || []).concat(list); G.toastLater = null; toast(l); };
  if (after && pick && !talk && SH.PL[pick.place]) {
    const mono = statFloat.mono(pick, w);
    if (statFloat.rows(before, after) || mono || wl) {
      persist(G.st, nx);   /* 고른 일은 '계속' 전에 저장(구조 검토 1117 지적 1 — 결과 화면에서 끄면 잃었음) */
      insideScreen.result(P0, pick.place, mono || wl || pick.label);
      statFloat(before, after, 'res', wl || pick.label, w ? w.ok : true);
      G.res = () => { G.res = null; statFloat.clear(); render(); flush(tidy()); };
      return;
    }
  }
  render();
  if (after && talk) { statFloat(before, after, 'dlg', wl, w && w.ok); flush(tidy()); return; }
  if (kind === 'settle' && nx.rep && nx.rep.loop) G.toastLater = (G.toastLater || []).concat(t); else flush(t);
}

/* 고른 뒤 바뀐 값 칸 — 107(11-14 대표님 '증감이 너무 빨리 지나가서 아예 보이지 않음 · 현재 능력치에서 얼마가 늘었는지 보여주길'):
   원인 = 값 칸을 #screen 안에 붙였는데 화면 전환(transit)이 0.1초 뒤 #screen 을 새로 그리며 지웠음 → #stage 에 붙이고, 다음 누름(answer)까지 남김(지도 위에선 6초)
   꼴 = 지도 '나' 칸과 같은 줄: 이름 · 막대(늘어난 만큼 밝게) · 지금 값 · ▲얼마 — 전(11-13 '스탯 변경이 자연스럽게'): '분석 +2' 글자만 1.7초 */
const FLOAT_KO = ['analysis', 'talk', 'network', 'rep', 'style'];   /* 이름은 자료(SH.statKo) */
function statSnap(st) { const r = {}; Object.keys(st.rel || {}).forEach(c => { r[c] = st.rel[c].aff; }); return { s: Object.assign({}, st.s), r }; }
function statFloat(b, a, mode, top, topOk) {   // mode: 'dlg' 대화 화면(오른쪽 · 다음 누름까지) · 'res' 장소 안 결과(204 · '계속'까지) · 'mock' 사진용
  const force = mode === 'mock' || mode === true || !!statFloat.force;
  const row = (nm, was, now, cls) => { const d = now - was, lo = Math.max(0, Math.min(100, Math.min(was, now))), hi = Math.max(0, Math.min(100, Math.max(was, now)));
    /* 203(11-17 대표님 '늘어난 수치가 눈에 안 뜸' → 목업 ㉡): 노란 막대 = 둘 중 작은 값 · 바뀐 조각은 밝은 색(아무리 작아도 statFloat.minSeg) · 바뀌기 전 자리에 흰 눈금 */
    const w = Math.max(hi - lo, statFloat.minSeg), was0 = Math.max(0, Math.min(100, was));
    return `<div class="sf-r ${cls || ''}"><span class="k">${nm}</span><span class="mb"><i class="lo" style="width:${lo}%"></i><i class="ch ${d > 0 ? 'up' : 'dn'}" style="left:${Math.min(lo, 100 - w)}%;width:${w}%"></i><i class="tk" style="left:${was0}%"></i></span><b>${now}</b><span class="d ${d > 0 ? 'up' : 'dn'}">      ${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span></div>`; };
  const out = [];
  /* 184(11-16 대표님 '늘 능력치 / 기본치(체력 · 스트레스) / 호감도 차례 · 호감도는 색을 조금 달리') · 205(11-17 대표님 '돈은 가장 마지막에'): 능력치 → 체력 · 스트레스 → 호감(분홍 · 꾸밈 .love) → 돈 */
  FLOAT_KO.forEach(k => { const nm = SH.statKo(k), d = (a.s[k] || 0) - (b.s[k] || 0); if (d) out.push(row(nm, b.s[k] || 0, a.s[k] || 0)); });
  { const d = (a.s.hp || 0) - (b.s.hp || 0); if (d) out.push(row(`<span class="ik" title="${esc(SH.statKo('hp'))}">${ic('hp')}</span>`, b.s.hp || 0, a.s.hp || 0)); }   /* 209(11-17 대표님): 체력 · 스트레스는 이름 대신 지도 옆 칸과 같은 아이콘 */
  { const d = (a.s.stress || 0) - (b.s.stress || 0); if (d) out.push(row(`<span class="ik" title="${esc(SH.statKo('stress'))}">${ic('stress')}</span>`, b.s.stress || 0, a.s.stress || 0)); }   /* 238: 색은 방향(스트레스가 올라도 빨강) */
  Object.keys(a.r).forEach(c => { const d = a.r[c] - (b.r[c] || 0); if (d && SH.CH[c]) out.push(row(`${esc(SH.name(c))} ♥`, b.r[c] || 0, a.r[c], 'love')); });
  { const dm = (a.s.money || 0) - (b.s.money || 0); if (dm) out.push(`<div class="sf-r won"><span class="k">${SH.statKo('money')}</span><b>${SH.won(a.s.money || 0)}</b><span class="d ${dm > 0 ? 'up' : 'dn'}">${dm > 0 ? '▲' : '▼'}${SH.won(Math.abs(dm))}</span></div>`); }
  if (top) out.unshift(`<div class="sf-top ${topOk ? 'ok' : 'so'}">${esc(top)}</div>`);   /* 이름을 ok · so 로 — 전 이름 mid 는 화면 가운데 기둥 틀(.mid · 자리 고정)과 겹쳐 제목 줄이 첫 값 줄 위에 얹혔음(11-15 대표님 '증감 박스에 글자가 겹침 · 맵에서도') */
  if (!out.length || (G.instant && !force)) return;
  const el = document.createElement('div'); el.className = 'statfloat v3' + (force ? ' mock' : ''); el.innerHTML = out.join('');
  (document.getElementById('stage') || document.body).appendChild(el);
  paint(el);   /* 체력 · 스트레스 아이콘(그림 칸)을 그림 */
  if (!force && mode !== 'res') statFloat.t = setTimeout(statFloat.clear, 20000);   /* 장소 안 결과는 '계속'을 누를 때 걷힘 */
}
/* 고른 뒤 독백 뽑기 — 표는 SH.D.mono(04_시범/대사/행동뒤_독백.json · 행동 id → {any · 장소 id · 업무는 ok/so}) · 같은 줄이 잇달아 안 나오게 · 가벼운 만남은 light_meet */
statFloat.mono = function (pick, w) {
  const key = pick.action === 'eve_date' ? (pick.light ? 'light_meet' : 'eve_date') : pick.action, T = (SH.D && SH.D.mono || {})[key]; if (!T) return '';
  if (key === 'wk_study' && pick.variant && pick.variant !== 'analysis') return '';   /* 공부 줄은 책 · 외우기 쪽 — 말하기 · 사람 만나기 갈래엔 안 띄움 */
  const arr = /^work_/.test(key) ? (w && w.ok ? T.ok : T.so) : (T[pick.place] && Math.random() < 0.6 ? T[pick.place] : T.any); if (!arr || !arr.length) return '';
  const L = statFloat.monoLast = statFloat.monoLast || {}; let i = (Math.random() * arr.length) | 0; if (arr.length > 1 && i === L[key]) i = (i + 1) % arr.length; L[key] = i; return arr[i];
};
/* 독백 표(행동 id → {any · 장소 id · 업무는 ok/so}) 원본 = 04_시범/대사/행동뒤_독백.json → build_data.py → data/bundle.js 의 mono(SH.D.mono) */
statFloat.workLine = (w) => { const name = w.name, prog = w.prog;   /* 글은 화면_글.json 의 TASK_UI — 다른 일 · 큰 건 · 아는 사람 도움 · 풀림 · 안 풀림 */
  return w.fit === false ? SH.fillKeys(SH.D.ui_lines.TASK_UI.w_nofit, { name }) : w.big ? SH.fillKeys(SH.D.ui_lines.TASK_UI.w_big, { name }) : w.help ? SH.fillKeys(SH.D.ui_lines.TASK_UI.w_help, { name, prog }) : w.ok ? SH.fillKeys(SH.D.ui_lines.TASK_UI.w_ok, { name, prog }) : SH.fillKeys(SH.D.ui_lines.TASK_UI.w_no, { name, prog }); };   /* 값 칸 제목 줄(업무 결과) — 사진용 예시(devtest)도 이 글을 씀 */
statFloat.rows = (b, a) => FLOAT_KO.concat(['hp', 'stress', 'money']).some(k => (a.s[k] || 0) !== (b.s[k] || 0)) || Object.keys(a.r).some(c => SH.CH[c] && a.r[c] !== (b.r[c] || 0));   // 204: 보일 값 줄이 있나
statFloat.minSeg = 3;   // 바뀐 조각의 가장 작은 폭(막대의 %) — ▲1 도 보이게(화면 짜임 수)
statFloat.d = () => '';   /* 117의 '값 옆 ▲얼마 깜빡임'은 128에서 뺌(부르는 자리는 남겨 둠 — 빈 글) */
statFloat.clear = function () { clearTimeout(statFloat.t); document.querySelectorAll('.statfloat').forEach(el => { if (el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => el.remove(), 320); }); };
function newGame(seed) { SH.clearSave(); G.st = SH.newGame(seed); SH.applyFirst(G.st, G.firstPick); G.firstPick = null; render(); }
/* 사원부터 시작(11-18 대표님 '인턴 과정 아예 스킵하고 사원부터'): 새 판의 인턴을 규칙의 인턴 손(rules/intern.js SH.startAsStaff)이 대신 치러
   정규직이 된 뒤 사원 첫 달 지도에서 넘겨줌 · 떨어진 판은 새 씨앗으로 다시(start_staff_tries 번) · 인턴 동안 생긴 일(만난 사람 · 호감 · 돈)은 그대로 남음 */
newGame.staff = function () {
  SH.clearSave(); const i0 = G.instant; G.instant = true; let got = null;
  try { for (let k = 0; k < SH.R.start_staff_tries && !got; k++) { const st = SH.newGame(); SH.applyFirst(st, G.firstPick); if (SH.startAsStaff(st)) got = st; } }
  finally { G.instant = i0; }
  G.firstPick = null; if (!got) return newGame();
  SH.takeToasts(got); G.st = got; G.group = null; render();
};

/* ── 누르기 ── */
if (new URLSearchParams(location.search).get('dlg') !== '1') document.documentElement.classList.add('dlg2');   // 11-14 대표님 '이대로 바꿔' — 새 배치가 기본(옛 배치는 ?dlg=1)
// 화면 예시(11-14 피드백 85 · 86 · 89 · 94 · 97): 대화창을 대사 | 선택지 두 칸으로 · 선택지는 위에서부터 · 인물 칸 대신 이름표에 관계 — 대표님이 보시고 정하면 기본으로
const selfTesting = new URLSearchParams(location.search).has('selftest');   // 누르기 시험은 손가락 기기 두 번 누르기를 건너뜀
stage.addEventListener('click', e => {
  if (busy || e.target.closest('.calfx')) return;   /* 일력 넘김을 눌러 걷은 누름은 아래 화면에 안 닿게 */
  if (e.target.classList.contains('ovl') && e.target.querySelector('.tlog, .pgr')) return act('ovl-close');   /* 지난 대사 창 · 삐삐는 창밖(어두운 곳)을 눌러도 닫힘 */
  const q = (s) => e.target.closest(s);
  const P = G.P, st = G.st;
  let el;
  if (G.walkT && G.walkSkip && !e.target.closest('[data-act]') && !(e.target.closest('#zone') && !e.target.closest('[data-walk]'))) return G.walkSkip();   // 지도 빈 곳은 새 자리로 걷기(input.js)   // 걷는 중 — 한 번 더 누르면 바로 도착
  if ((el = q('[data-act]'))) return act(el.dataset.act, el);
  if ((el = q('[data-lp]'))) { if (el.classList.contains('dis')) return; return G.LOOP.act(el); }   // 돈 고리(사원 뒤 지도 · 장소 안 · 장 · 걸어 두는 주문) — ui/loop.js
  if ((el = q('[data-walk]'))) {
    // 손가락 기기(마우스 올리기가 없음 · 11-12 대표님 F9): 지도 건물은 한 번 누르면 테두리 · 이름만 켜고, 같은 건물을 또 누르면 걸어감
    const pid = el.dataset.walk, onMapBld = el.closest('#pins') && matchMedia('(hover: none)').matches && !selfTesting;
    if (onMapBld && G.armed !== pid) {
      G.armed = pid; document.querySelectorAll('#pins .hov').forEach(x => x.classList.remove('hov'));
      document.querySelectorAll(`#pins [data-walk="${pid}"]`).forEach(x => x.classList.add('hov')); return;
    }
    G.armed = null; return walkTo(pid);
  }
  if ((el = q('[data-tip]'))) { toast([el.dataset.tip]); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
  if ((el = q('[data-opt]'))) { if (el.dataset.opt === '') return; const o = P.options[+el.dataset.opt]; return answer({ opt: +el.dataset.opt }, `${P.slot.ko} — ${o.label}`); }
  if ((el = q('[data-pick]'))) { if (el.dataset.pick === '' || !P || P.t !== 'event' || !document.getElementById('ch').classList.contains('show')) return;
    const i = +el.dataset.pick, c = P.choices.find(x => x.i === i), go = () => answer({ choice: i }, `'${SH.fill(SH.EV[P.id].title, G.st)}' — ${c ? c.text : ''}`);
    const big = bigChoice(st, SH.EV[P.id].choices[i]);
    return big ? askConfirm(big, go) : go(); }
  if ((el = q('[data-shop]'))) { SHOPV.shop = el.dataset.shop; SHOPV.sel = null; SHOPV.to = null; SHOPV.msg = ''; sfx('door'); return shopScreen(); }
  if ((el = q('[data-tab]'))) { SHOPV.tab = el.dataset.tab; SHOPV.sel = null; SHOPV.to = null; return shopScreen(); }
  if ((el = q('[data-item-id]'))) { if (el.dataset.itemId) { SHOPV.sel = el.dataset.itemId; SHOPV.msg = ''; } return shopScreen(); }
  if ((el = q('[data-gift]'))) { SHOPV.to = el.dataset.gift; return shopScreen(); }
  if ((el = q('[data-next]'))) { if (D.talk(P) && dialogAdvance()) return; return answer({}); }
  // 빈 곳 누름: 대사 넘김
  if (G.res) return G.res();   /* 204: 장소 안 결과는 빈 곳을 눌러도 넘어감 */
  if (D.talk(P)) { if (dialogAdvance()) return; if (P.t !== 'event' || !P.choices.length) return answer({}); const ch = document.getElementById('ch'); ch.classList.remove('nudge'); void ch.offsetWidth; ch.classList.add('nudge'); }
});
function act(a, el) {
  const st = G.st, P = G.P;
  const resume = (s, ovl) => { G.st = s; if (ovl) overlay(''); try { render(); } catch (e) { console.warn('저장을 이어 할 수 없음', e); G.st = null; overlay(''); toast(['저장을 이어 할 수 없어요 — 새로 시작해 주세요']); titleScreen(); } };   // 깨진 저장이 화면을 멈추지 않게(11-14)
  switch (a) {
    case 'new': return newGame();
    case 'new-staff': return newGame.staff();
    case 'first': G.firstPick = el.dataset.id; return titleScreen();   // 시작 화면 '이번 판 —' 한 줄
    case 'book': return overlay(bookHTML(SH.bookOf(G.st, 'all'), true));
    case 'continue': { const s = SH.loadSave(); if (s) resume(s); return; }
    case 'notebook': return notebookOverlay();
    case 'pager': return toast.pager();
    case 'pager-prev': return toast.pager(-1);
    case 'pager-next': return toast.pager(1);
    case 'stress-info': return stressOverlay();
    case 'hp-info': return stressOverlay.hp();
    case 'person': return midPeople.card(el.dataset.id);
    case 'rank': return stampBoard.open();   // 인턴 지도 옆 칸 도장판 → 순위표 창(ui/map.js)
    case 'bag': return stampBoard.bag();   // 인턴 지도 옆 칸 '소지품' → 가진 물건 창(ui/map.js)
    case 'to-title': overlay(''); G.resume = st && st.memo; return titleScreen();
    case 'err-reload': location.reload(); return;   // 오류 알림의 '이어 하기' — 다시 열면 시작 화면의 '이어 하기'가 마지막 자동 저장에서 이음
    case 'ovl-close': overlay(''); if (P && P.t === 'lmap' && G.redraw && !document.getElementById('zone')) G.redraw(); return;   // 장 화면 · 장소 안은 다시 그림(지도는 그대로 — 주간 소식 띠를 안 지움)
    case 'map': return mapScreen(P);
    case 'enter': { const pid = el.dataset.enter, nm = short(SH.PL[pid].name_ko); return enterFx(nm, P.slot.ko, () => answer({ enter: pid }, `${P.slot.ko} — ${nm}`)); }
    case 'res-go': return G.res && G.res();   /* 204: 장소 안 결과 → 다음 화면 */
    case 'leave': { if (G.world) G.world.keep = true; return answer({ leave: 1 }); }   /* 127: 들어갔던 문 앞에 그대로 섬 */
    case 'mono-close': { const m = document.getElementById('mono'); if (m) m.innerHTML = ''; return; }
    case 'shop-exit': if (SHOPV.from === 'flow' && P.t === 'shop') return answer({}, '가게에 들렀다'); return render();
    case 'shop-hold': SHOPV.sel = null; SHOPV.msg = '보류 — 다음에 와도 그대로 있어요'; return shopScreen();
    case 'shop-buy': if (!el.dataset.ok) { const it = SH.item(SHOPV.sel); if (it && it.price >= Math.max(1000000, st.s.money * 0.5)) { el.dataset.ok = 1; return askConfirm(`${it.name_ko} — ${SH.won(it.price)}. 가진 돈의 큰 몫입니다. 살까요?`, () => act('shop-buy', el)); } }
    { const r = SH.buy(st, SHOPV.sel, SHOPV.to); SHOPV.msg = r.msg; sfx(r.ok ? 'coin' : 'deny'); if (r.ok) SHOPV.sel = null; persist(st); toast([r.msg]); return shopScreen(); }
    case 'resign': return askConfirm('사표를 내고 독립합니다. 내 돈의 80%를 회사에 넣고, 되돌릴 수 없어요.', () => { SH.resign(st); persist(st); render(); toast(['독립 — 이제 분기마다 회사 현금을 봅니다']); });
    case 'talk-log': return talkLogOverlay();
    case 'talk-back': return D.back();
    case 'talk-skip': return dialogSkip();
    case 'view-modes': case 'view-sizes': D.view.next(a.slice(5)); return D.view.apply();   /* 임시 — 보기 바꾸기 시험(ui/dialog.js D.view) */
    case 'slot-save': { const n = +el.dataset.n; toast([SH.saveSlot(n, st) ? `칸 ${n}에 저장` : `칸 ${n}에 저장하지 못함`]); return notebookOverlay(); }
    case 'slot-load': { const s = SH.loadSlot(+el.dataset.n); if (s) resume(s, true); return; }
    case 'export': { const t = SH.exportText(st); if (!t) { toast(['저장 글을 만들지 못함']); return; } overlay(`<div class="box px"><h2>저장 내보내기</h2><p style="font-size:max(13px,var(--fl))">아래 글자 묶음을 통째로 복사해 두면 다른 기기에서 '불러오기'로 이어 할 수 있어요.</p>
      <textarea readonly style="width:100%;height:160px;font-size:max(11px,var(--fl));background:#0b0e1a;color:var(--cream);border:2px solid var(--line)">${esc(t)}</textarea><div class="acts"><div class="btn big" data-act="ovl-close">닫기</div></div></div>`); return; }
    case 'import': { let t = null; try { t = prompt('저장 글자 묶음(SHG1:…)을 붙여 넣으세요'); } catch (e) { t = null; } const s = SH.importText(t); if (s) resume(s, true); else if (t) toast(['못 읽는 글자 묶음']); return; }
    case 'yes': { overlay(''); const f = G.onYes; G.onYes = null; if (f) f(); return; }
    case 'sound-toggle': return soundToggle();
    case 'sound-credits': return soundCredits();
    case 'land': return G.LAND.act(el);   // 땅 사기 창(ui/land.js)
    case 'world-over': return worldOverview();
    case 'world-view': return worldOverview.view(el.dataset.to);
  }
}
// 되돌릴 수 없는 큰 고르기만 한 번 더 물음: 끝이 나는 고르기 · 큰돈
function bigChoice(st, c) {
  const e = (c && c.effects) || {};
  if (e.ending) return '이 고르기로 이야기가 끝납니다. 정말 이걸로 할까요?';
  if (e.money && -e.money >= Math.max(300000, st.s.money * 0.5)) return `돈 ${SH.won(-e.money)}이 나갑니다(가진 돈 ${SH.won(st.s.money)}). 정말 할까요?`;
  return null;
}
function askConfirm(text, onYes) {
  G.onYes = onYes;
  overlay(`<div class="box px gold"><h2>한 번 더</h2><p>${esc(text)}</p><div class="acts"><div class="btn" data-act="ovl-close">아니요</div><div class="btn big" data-act="yes">네</div></div></div>`);
}
// 눌림 소리 — 짧은 딸깍 (첫 누름 뒤에만 소리 장치를 켬 · 못 켜면 조용히)
let AC = null;
function click() {
  if (typeof sfx === 'function') return sfx('click');
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = 880; g.gain.setValueAtTime(0.05, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.05);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.06); } catch (e) { AC = null; }
}
stage.addEventListener('pointerdown', e => { if (e.target.closest('.btn,.choice,.opt,.pin,.it,[data-pick],[data-next],[data-tab]')) click(); });
// 휠: 아래 = 넘김 · 위 = 대사 기록
stage.addEventListener('wheel', e => {
  const P = G.P; if (!D.talk(P) || document.querySelector('#ovl .ovl')) return;
  if (e.deltaY > 20) stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  else if (e.deltaY < -20) talkLogOverlay();
}, { passive: true });
// 키보드는 ui/input.js(WASD · 엔터 · 스페이스 · 숫자 · 위아래 고르기)

/* ── 시작 ── */
/* 게임 중 오류 알림(11-14 대표님 '추천대로' — 전엔 누르다 예외가 나면 그 화면에 갇히고 아무 말이 없었음): 한 번만 알리고 '이어 하기'(다시 엶 → 마지막 자동 저장에서)
   누르기 시험 · 사진 모드에서는 안 띄움(시험은 오류를 따로 셈). 그림 · 소리를 못 읽은 것은 오류가 아니라 여기 안 옴(창의 error 는 스크립트 예외만). 판 이름을 같이 보여 줌. */
G.oops = function (err) {
  if (G.oopsShown || selfTesting || /[?&]shot=/.test(location.search)) return; G.oopsShown = true;
  try { overlay(`<div class="box px setting"><div class="shd"><h2>문제가 생겼어요</h2></div>
    <div class="sec">방금까지 한 것은 자동으로 저장돼 있어요. <b>이어 하기</b>를 누르면 게임을 다시 열고, 시작 화면에서 이어 할 수 있어요.</div>
    <div class="sec"><small class="mute">${esc(window.GAME_VER || '개발판')} · ${esc(String((err && err.message) || err || '').slice(0, 80))}</small></div>
    <div class="sfoot"><span class="sp"></span><div class="btn" data-act="ovl-close">그냥 계속</div><div class="btn big" data-act="err-reload">이어 하기</div></div></div>`); } catch (e) { /* 알림을 그리다 또 나면 조용히 */ }
};
addEventListener('error', (e) => { if (e && e.error) G.oops(e.error); });
addEventListener('unhandledrejection', (e) => G.oops(e && e.reason));
(async function boot() {
  try { SH.loadData(); } catch (e) { document.getElementById('screen').innerHTML = '<p style="padding:40px">데이터를 못 읽었습니다 — data/bundle.js 가 있는지 보세요.</p>'; return; }
  const q = new URLSearchParams(location.search);
  /* 글꼴(game/fonts)이 읽힌 뒤에 그림 — 캔버스 글자(장 화면 값 그림 · 다리 표지 · 말풍선)는 글꼴이 읽히기 전에 그리면 다른 글꼴로 남음
     사진 모드는 다 읽힐 때까지 기다렸다 그려 늘 같은 사진 · 게임은 기다리지 않고 첫 화면을 띄운 뒤, 읽혔을 때 아직 첫 화면이면 한 번 다시 그림(11-14 글꼴을 게임 폴더에 둔 뒤) */
  const fonts = document.fonts && document.fonts.load ? Promise.all(['22px Galmuri11', 'bold 22px Galmuri11', '14px Galmuri14', '12px Galmuri9'].map(f => document.fonts.load(f))).catch(() => {}) : Promise.resolve();
  if (q.get('shot')) { await fonts; return runShot(q.get('shot')); }
  if (q.get('selftest')) return selfTest(+q.get('selftest') || 3);
  if (q.has('clicktest')) setTimeout(selfTest.click, 800);   // 시험 손은 ui/devtest.js
  if (q.get('fast')) G.instant = true;
  const s = SH.loadSave(); G.resume = s && s.memo;
  titleScreen(); illImg.warm();
  fonts.then(() => { const sc = document.getElementById('screen'); if (G.redraw && sc && /\bk-title\b/.test(sc.className)) G.redraw(); });
})();

/* 휴대폰 · 태블릿(손가락 기기): 첫 터치에 전체 화면 + 가로 잠금(못 하는 브라우저는 그냥 넘어감) · 홈 화면 앱 · 이미 전체 화면이면 안 함
   11-16 대표님 '데스크톱에서는 안 하게': 전엔 기기를 안 가려 데스크톱에서도 새로 고친 뒤 첫 클릭에 전체 화면이 됐음 → 손가락 기기(pointer:coarse)에서만(index.html 안에 있던 것을 여기로 옮김) */
(function () {
  const standalone = navigator.standalone === true || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches;
  const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen;
  if (standalone || !req || !matchMedia('(pointer:coarse)').matches) return;
  const go = () => { document.removeEventListener('pointerdown', go, true);
    try { const p = req.call(d, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {});
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* 전체 화면을 못 거는 브라우저 — 그대로 둠 */ } };
  document.addEventListener('pointerdown', go, true);
})();
