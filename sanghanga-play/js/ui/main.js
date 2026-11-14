/* =====================================================================
   ui/main.js — 화면과 엔진을 잇는 곳
   - 엔진이 낸 물음(SH.next) 하나를 화면 하나로 그림 → 누르면 SH.answer → 다시 그림
   - 고를 때마다 저절로 저장 · 다시 켜면 '지난번 한 일 · 다음' 두 줄 (직장인 눈 검토 ⑥)
   - 사진용 바로 가기: index.html?shot=map|event|settle|shop|album|lmap|market|end|stress (자동으로 그 장면까지 감 · 글자 치기 없음)
     (사진 모드 · 누르기 시험 · 예시 화면 같은 시험 손은 ui/devtest.js — 11-14 밤 정리에서 떼어 냄)
   ===================================================================== */

function describe(st, P) {
  switch (P.t) {
    case 'slot': return `${SH.dateLabel(st)} ${P.slot.ko} — 어디로 갈까`;
    case 'event': case 'reply': return `이야기 — ${SH.fill(SH.EV[P.id].title, st)}`;
    case 'settle': return `${SH.dateLabel(st)} 결산`;
    case 'lmap': return `${SH.dateLabel(st)} — 지도에서 자유 시간 고르기`;
    case 'lmeet': return `${SH.dateLabel(st)} — ${P.title}`;
    case 'lmarket': return `${SH.dateLabel(st)} — 장`;
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
  if (P.t !== 'notice' && P.t !== 'book' && P.t !== 'lmeet') overlay('');
  switch (P.t) {
    case 'event': transit('ill', () => { eventScreen(P); if (G.instant) while (dialogAdvance()); }); break;
    case 'reply': transit('ill', () => eventScreen(P, true)); break;
    case 'slot': transit('px', () => mapScreen(P)); break;
    case 'settle': transit('px', () => (P.rep.loop ? G.LOOP.settle(P) : settleMid(P))); break;
    case 'shop': SHOPV.sel = null; SHOPV.msg = ''; SHOPV.to = null; transit('px', () => shopScreen('flow')); break;
    case 'lmap': transit('px', () => G.LOOP.map(P)); break;
    case 'lmeet': G.LOOP.meet(P); break;
    case 'lmarket': transit('px', () => G.LOOP.market(P)); break;
    case 'notice': noticeOverlay(P); break;
    case 'book': sfx('page'); overlay(bookHTML(SH.bookOf(G.st, P.scope), false)); break;
    case 'album': transit('ill', () => albumScreen(P)); break;
    case 'end': transit('px', () => endScreen(P)); break;
  }
}
function answer(a, doneTxt) {
  if (busy) return;
  if (doneTxt) SH.setMemo(G.st, { done: doneTxt });
  statFloat.clear();   /* 앞서 뜬 값 칸은 다음 누름에서 걷힘 */
  const before = a && (a.choice != null || a.opt != null) ? statSnap(G.st) : null;
  const pick = a && a.opt != null && G.P && G.P.t === 'slot' && G.P.options ? G.P.options[a.opt] : null;   /* 113: 장소에서 고른 일 — 고른 뒤 독백에 씀 */   // 장소 안에서 고른 것도 바뀐 값을 보임(단추에서 표시를 걷어냈으므로)
  SH.answer(G.st, a);
  const t = SH.takeToasts(G.st);
  // 117 → 128(11-14 대표님 '맵에서 깜빡이는 효과가 거슬림 · 그거 빼고 맵 중앙 상단에 모아서 띄워주고 몇 초 있다가 사라지는 걸로'):
  //   다음 화면이 대화(이야기 · 대답)면 값 칸(다음 누름까지) · 지도면 지도 가운데 위에 한 줄로 모아 4초 · 그 밖(결산 등)엔 안 띄움 — 값 칸이 보여 주는 것(돈 · 체력 · 호감)은 위 알림 줄에서 뺌(130 중복)
  const w = before && SH.takeWorkRes(G.st);
  const after = before && !G.instant ? statSnap(G.st) : null;
  render();
  const wl = w ? `${w.name} — ${w.ok ? `잘 풀렸다! 과제 ${w.prog}칸` : `그럭저럭 · 과제 ${w.prog}칸`}` : '';   // 업무가 잘 풀렸는지 확실히(11-14 대표님 '잘 풀렸다는 기준이 있는지 아예 몰랐음 · 표시가 확실히 되어야')
  const kind = G.P && G.P.t, mode = kind === 'slot' ? 'map' : kind === 'event' || kind === 'reply' ? 'dlg' : '';
  let tt = t; if (after && mode) { statFloat(before, after, mode, wl, w && w.ok, mode === 'map' && pick ? statFloat.mono(pick, w) : ''); tt = t.filter(x => !/^(돈|체력) |[♥♡]|과제 \+\d/.test(String(x))); }   /* 값 줄이 이미 말한 것(돈 · 체력 · 호감 · 업무 결과)은 알림 줄에서 뺌 */
  toast(tt);
}

/* 고른 뒤 바뀐 값 칸 — 107(11-14 대표님 '증감이 너무 빨리 지나가서 아예 보이지 않음 · 현재 능력치에서 얼마가 늘었는지 보여주길'):
   원인 = 값 칸을 #screen 안에 붙였는데 화면 전환(transit)이 0.1초 뒤 #screen 을 새로 그리며 지웠음 → #stage 에 붙이고, 다음 누름(answer)까지 남김(지도 위에선 6초)
   꼴 = 지도 '나' 칸과 같은 줄: 이름 · 막대(늘어난 만큼 밝게) · 지금 값 · ▲얼마 — 전(11-13 '스탯 변경이 자연스럽게'): '분석 +2' 글자만 1.7초 */
const FLOAT_KO = ['analysis', 'talk', 'network', 'rep', 'style'];   /* 이름은 자료(SH.statKo) */
function statSnap(st) { const r = {}; Object.keys(st.rel || {}).forEach(c => { r[c] = st.rel[c].aff; }); return { s: Object.assign({}, st.s), r }; }
function statFloat(b, a, mode, top, topOk, mono) {   // mode: 'dlg' 대화 화면(오른쪽 · 다음 누름까지) · 'map' 지도 가운데 위(한 줄로 모아 4초) · 'mock' 사진용
  const force = mode === 'mock' || mode === true || !!statFloat.force;
  const row = (nm, was, now, good, cls) => { const d = now - was, lo = Math.max(0, Math.min(100, Math.min(was, now))), hi = Math.max(0, Math.min(100, Math.max(was, now)));
    return `<div class="sf-r ${cls || ''}"><span class="k">${nm}</span><span class="mb"><i class="hi ${d > 0 ? 'up' : 'dn'}" style="width:${hi}%"></i><i class="lo" style="width:${lo}%"></i></span><b>${now}</b><span class="d ${good ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span></div>`; };
  const out = [];
  FLOAT_KO.forEach(k => { const nm = SH.statKo(k), d = (a.s[k] || 0) - (b.s[k] || 0); if (d) out.push(row(nm, b.s[k] || 0, a.s[k] || 0, d > 0)); });
  Object.keys(a.r).forEach(c => { const d = a.r[c] - (b.r[c] || 0); if (d && SH.CH[c]) out.push(row(`${esc(SH.name(c))} ♥`, b.r[c] || 0, a.r[c], d > 0, 'love')); });
  { const d = (a.s.hp || 0) - (b.s.hp || 0); if (d) out.push(row(SH.statKo('hp'), b.s.hp || 0, a.s.hp || 0, d > 0)); }
  { const d = (a.s.stress || 0) - (b.s.stress || 0); if (d) out.push(row(SH.statKo('stress'), b.s.stress || 0, a.s.stress || 0, d < 0)); }   /* 스트레스는 내리면 좋은 것 */
  { const dm = (a.s.money || 0) - (b.s.money || 0); if (dm) out.push(`<div class="sf-r won"><span class="k">${SH.statKo('money')}</span><b>${SH.won(a.s.money || 0)}</b><span class="d ${dm > 0 ? 'up' : 'dn'}">${dm > 0 ? '▲' : '▼'}${SH.won(Math.abs(dm))}</span></div>`); }
  if (top) out.unshift(`<div class="sf-top ${topOk ? 'big' : 'mid'}">${esc(top)}</div>`);
  if (mono) out.push(`<div class="sf-mono">(${esc(mono)})</div>`);   /* 113(11-14 대표님 '선택을 하고 나서 독백으로 자기 생각을 말하면 좋을 때') — 장소에서 일을 고른 뒤 한 줄 */
  if (!out.length || (G.instant && !force)) return;
  const el = document.createElement('div'); el.className = 'statfloat v3' + (force ? ' mock' : '') + (mode === 'map' ? ' onmap' : ''); el.innerHTML = out.join('');
  (document.getElementById('stage') || document.body).appendChild(el);
  if (!force) statFloat.t = setTimeout(statFloat.clear, mode === 'map' ? (mono ? 7000 : 4000) : 20000);   /* 독백이 있으면 읽을 틈을 더 줌 */
}
/* 고른 뒤 독백 뽑기 — 표는 SH.D.mono(04_시범/대사/행동뒤_독백.json · 행동 id → {any · 장소 id · 업무는 ok/so}) · 같은 줄이 잇달아 안 나오게 · 가벼운 만남은 light_meet */
statFloat.mono = function (pick, w) {
  const key = pick.action === 'eve_date' ? (pick.light ? 'light_meet' : 'eve_date') : pick.action, T = (SH.D && SH.D.mono || {})[key]; if (!T) return '';
  if (key === 'wk_study' && pick.variant && pick.variant !== 'analysis') return '';   /* 공부 줄은 책 · 외우기 쪽 — 말하기 · 사람 만나기 갈래엔 안 띄움 */
  const arr = /^work_/.test(key) ? (w && w.ok ? T.ok : T.so) : (T[pick.place] && Math.random() < 0.6 ? T[pick.place] : T.any); if (!arr || !arr.length) return '';
  const L = statFloat.monoLast = statFloat.monoLast || {}; let i = (Math.random() * arr.length) | 0; if (arr.length > 1 && i === L[key]) i = (i + 1) % arr.length; L[key] = i; return arr[i];
};
/* 독백 표(행동 id → {any · 장소 id · 업무는 ok/so}) 원본 = 04_시범/대사/행동뒤_독백.json → build_data.py → data/bundle.js 의 mono(SH.D.mono) */
statFloat.d = () => '';   /* 117의 '값 옆 ▲얼마 깜빡임'은 128에서 뺌(부르는 자리는 남겨 둠 — 빈 글) */
statFloat.clear = function () { clearTimeout(statFloat.t); document.querySelectorAll('.statfloat').forEach(el => { if (el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => el.remove(), 320); }); };
function newGame(seed) { SH.clearSave(); G.st = SH.newGame(seed); SH.applyFirst(G.st, G.firstPick); G.firstPick = null; render(); }

/* ── 누르기 ── */
if (new URLSearchParams(location.search).get('dlg') !== '1') document.documentElement.classList.add('dlg2');   // 11-14 대표님 '이대로 바꿔' — 새 배치가 기본(옛 배치는 ?dlg=1)
// 화면 예시(11-14 피드백 85 · 86 · 89 · 94 · 97): 대화창을 대사 | 선택지 두 칸으로 · 선택지는 위에서부터 · 인물 칸 대신 이름표에 관계 — 대표님이 보시고 정하면 기본으로
const selfTesting = new URLSearchParams(location.search).has('selftest');   // 누르기 시험은 손가락 기기 두 번 누르기를 건너뜀
stage.addEventListener('click', e => {
  if (busy) return;
  const q = (s) => e.target.closest(s);
  const P = G.P, st = G.st;
  let el;
  if (G.walkT && G.walkSkip && !e.target.closest('[data-act]') && !(e.target.closest('#zone') && !e.target.closest('[data-walk]'))) return G.walkSkip();   // 지도 빈 곳은 새 자리로 걷기(input.js)   // 걷는 중 — 한 번 더 누르면 바로 도착
  if ((el = q('[data-act]'))) return act(el.dataset.act, el);
  if ((el = q('[data-lp]'))) { if (el.classList.contains('dis')) return; return G.LOOP.act(el); }   // 돈 고리(지도 두 칸 · 장 · 걸어 두는 주문) — ui/loop.js
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
  if ((el = q('[data-pick]'))) { if (el.dataset.pick === '' || !document.getElementById('ch').classList.contains('show')) return;
    const i = +el.dataset.pick, c = P.choices.find(x => x.i === i), go = () => answer({ choice: i }, `'${SH.fill(SH.EV[P.id].title, G.st)}' — ${c ? c.text : ''}`);
    const big = bigChoice(st, SH.EV[P.id].choices[i]);
    return big ? askConfirm(big, go) : go(); }
  if ((el = q('[data-shop]'))) { SHOPV.shop = el.dataset.shop; SHOPV.sel = null; SHOPV.to = null; SHOPV.msg = ''; sfx('door'); return shopScreen(); }
  if ((el = q('[data-tab]'))) { SHOPV.tab = el.dataset.tab; SHOPV.sel = null; SHOPV.to = null; return shopScreen(); }
  if ((el = q('[data-item-id]'))) { if (el.dataset.itemId) { SHOPV.sel = el.dataset.itemId; SHOPV.msg = ''; } return shopScreen(); }
  if ((el = q('[data-gift]'))) { SHOPV.to = el.dataset.gift; return shopScreen(); }
  if ((el = q('[data-next]'))) { if (P && (P.t === 'event' || P.t === 'reply') && dialogAdvance()) return; return answer({}); }
  // 빈 곳 누름: 대사 넘김
  if (P && (P.t === 'event' || P.t === 'reply')) { if (dialogAdvance()) return; if (P.t === 'reply' || !P.choices.length) return answer({}); const ch = document.getElementById('ch'); ch.classList.remove('nudge'); void ch.offsetWidth; ch.classList.add('nudge'); }
});
function act(a, el) {
  const st = G.st, P = G.P;
  const resume = (s, ovl) => { G.st = s; if (ovl) overlay(''); try { render(); } catch (e) { console.warn('저장을 이어 할 수 없음', e); G.st = null; overlay(''); toast(['저장을 이어 할 수 없어요 — 새로 시작해 주세요']); titleScreen(); } };   // 깨진 저장이 화면을 멈추지 않게(11-14)
  switch (a) {
    case 'new': return newGame();
    case 'first': G.firstPick = el.dataset.id; return titleScreen();   // 시작 화면 '이번 판 —' 한 줄
    case 'book': return overlay(bookHTML(SH.bookOf(G.st, 'all'), true));
    case 'continue': { const s = SH.loadSave(); if (s) resume(s); return; }
    case 'notebook': return notebookOverlay();
    case 'stress-info': return stressOverlay();
    case 'hp-info': return stressOverlay.hp();
    case 'person': return midPeople.card(el.dataset.id);
    case 'to-title': overlay(''); G.resume = st && st.memo; return titleScreen();
    case 'err-reload': location.reload(); return;   // 오류 알림의 '이어 하기' — 다시 열면 시작 화면의 '이어 하기'가 마지막 자동 저장에서 이음
    case 'ovl-close': overlay(''); if (P && (P.t === 'lmap' || P.t === 'lmarket') && G.redraw) G.redraw(); return;
    case 'map': return mapScreen(P);
    case 'enter': { const pid = el.dataset.enter, nm = short(SH.PL[pid].name_ko); return enterFx(nm, P.slot.ko, () => answer({ enter: pid }, `${P.slot.ko} — ${nm}`)); }
    case 'leave': { if (G.world) G.world.keep = true; return answer({ leave: 1 }); }   /* 127: 들어갔던 문 앞에 그대로 섬 */
    case 'mono-close': { const m = document.getElementById('mono'); if (m) m.innerHTML = ''; return; }
    case 'shop-exit': if (SHOPV.from === 'flow' && P.t === 'shop') return answer({}, '가게에 들렀다'); return render();
    case 'shop-hold': SHOPV.sel = null; SHOPV.msg = '보류 — 다음에 와도 그대로 있어요'; return shopScreen();
    case 'shop-buy': if (!el.dataset.ok) { const it = SH.item(SHOPV.sel); if (it && it.price >= Math.max(1000000, st.s.money * 0.5)) { el.dataset.ok = 1; return askConfirm(`${it.name_ko} — ${SH.won(it.price)}. 가진 돈의 큰 몫입니다. 살까요?`, () => act('shop-buy', el)); } }
    { const r = SH.buy(st, SHOPV.sel, SHOPV.to); SHOPV.msg = r.msg; sfx(r.ok ? 'coin' : 'deny'); if (r.ok) SHOPV.sel = null; persist(st); toast([r.msg]); return shopScreen(); }
    case 'shop': SHOPV.sel = null; SHOPV.msg = ''; return shopScreen('menu');   // 지도의 '상점' 단추로 엶('flow' 가 아니면 가게를 위 줄에서 고름 · 옛 달 계획표 'plan' 이름을 바꿈)
    case 'resign': return askConfirm('사표를 내고 독립합니다. 내 돈의 80%를 회사에 넣고, 되돌릴 수 없어요.', () => { SH.resign(st); persist(st); render(); toast(['독립 — 이제 분기마다 회사 현금을 봅니다']); });
    case 'talk-log': return talkLogOverlay();
    case 'talk-skip': return dialogSkip();
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
  const P = G.P; if (!P || !(P.t === 'event' || P.t === 'reply') || document.querySelector('#ovl .ovl')) return;
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
  titleScreen();
  fonts.then(() => { const sc = document.getElementById('screen'); if (G.redraw && sc && /\bk-title\b/.test(sc.className)) G.redraw(); });
})();
