/* =====================================================================
   ui/sound.js — 소리 표 하나(11-12 대표님 '효과음 · 배경음 — 무료로 먼저') · 근거 리서치/소리_1112.md · 소리_2차_1114.md
   - 배경음: 장면 이름 → 파일(snd/) · 장면이 바뀌면 0.8초에 걸쳐 바꿔 틂 · 파일만 갈아 끼우면 산 음원 · 맞춤 음원으로 바뀜
     · 어느 화면에 어느 곡인지는 bgmFor() 한 곳 · 장소 → 곡은 장소 카드의 '곡' 칸(04_시범/장소_카드.md → SH.placeCol('bgm')) · 곡은 끊긴 자리에서 이어 틂(SND.pos)
   - 효과음: 파일(sfx.FILE 표 · snd/sfx_*.wav · Kenney CC0)이 먼저 · 파일이 없거나 아직 못 읽었으면 합성(SFX 표)
     · 도장 · 폭락 · 전화는 맞는 무료 소리가 없어 합성 그대로
   - 받은 곳 · 라이선스 · 바꿔 넣는 법: 04_시범/소리_장부.md · tools/snd_put.sh · 들어 보기: snd.html
   - 첫 누르기 뒤에만 소리가 남(브라우저 규칙) · 켬/끔은 이 브라우저에 기억
   ===================================================================== */
const BGM = {
  title: { ko: '첫 화면', file: 'snd/bgm_title.m4a', vol: 0.5, credit: '"Lobby Time"' },
  day: { ko: '평일 낮 지도', file: 'snd/bgm_day.m4a', vol: 0.28, credit: '"Local Forecast"' },
  night: { ko: '평일 밤', file: 'snd/bgm_night.m4a', vol: 0.84,   /* 118 → 129(11-14 대표님 '여전히 너무 작음 · 지금의 두 배'): 0.28 → 0.42 → 0.84 */ credit: '"Bossa Antigua"' },
  bar: { ko: '바', file: 'snd/bgm_bar.m4a', vol: 0.45, credit: '"George Street Shuffle"' },
  settle: { ko: '결산', file: 'snd/bgm_settle.m4a', vol: 0.5, credit: '"Funk Game Loop"' },
  crisis: { ko: '외환위기', file: 'snd/bgm_crisis.m4a', vol: 0.45, credit: '"Impact Lento"' },
  /* 135(11-14 대표님 '장소나 상황별로 · 주말 배경음은 따로 — 들으면 바로 주말인지 평일인지') — 새 여덟 곡은 파일 소리 크기를 -18 LUFS 로 맞춰 둠(음량 0.5 안팎이면 옛 곡들과 비슷) */
  weekend: { ko: '주말 낮', file: 'snd/bgm_weekend.m4a', vol: 0.55, credit: '"Carefree"' },
  river: { ko: '주말 한강 둔치', file: 'snd/bgm_river.m4a', vol: 0.5, credit: '"Almost Bliss"' },
  lunch: { ko: '점심(식당 · 카페 안)', file: 'snd/bgm_lunch.m4a', vol: 0.45, credit: '"Easy Lemon (60 second)"' },
  office: { ko: '사무실 업무', file: 'snd/bgm_office.m4a', vol: 0.42, credit: '"Opportunity Walks"' },
  quiet: { ko: '서점 · 조용한 실내', file: 'snd/bgm_quiet.m4a', vol: 0.5, credit: '"Gymnopedie No. 1"' },
  market: { ko: '시장 · 포장마차', file: 'snd/bgm_market.m4a', vol: 0.45, credit: '"Street Party"' },
  romance: { ko: '설레는 장면(데이트 · 고백)', file: 'snd/bgm_romance.m4a', vol: 0.6, credit: '"Reawakening"' },
  home: { ko: '자취방 밤', file: 'snd/bgm_home.m4a', vol: 0.45, credit: '"Late Night Radio"' }
};
const SND = { on: true, ac: null, cur: null, el: null, want: null, unlocked: false, pos: {}, bad: {} };   // bad: 이 판에서 못 읽은 곡(다시 안 받음)
try { SND.on = SH.store.get('sanghanga_sound') !== 'off'; } catch (e) { }
function sndAC() { try { SND.ac = SND.ac || new (window.AudioContext || window.webkitAudioContext)(); if (SND.ac.state === 'suspended') SND.ac.resume(); } catch (e) { SND.ac = null; } return SND.ac; }

/* ── 효과음(합성 · 파일이 없을 때) — [모양, 높이 Hz, 길이 초, 음량, 높이 끝(미끄럼), 늦춤 초] 여러 개를 차례로 ──
   131(11-14 대표님 '효과음이 전혀 없음'): 음량이 0.04 ~ 0.09라 안 들렸음 → 파일로 바꾸고, 합성으로 남는 것도 음량을 올림 */
const SFX = {
  click: [['square', 880, 0.05, 0.1]],
  select: [['triangle', 660, 0.06, 0.16], ['triangle', 990, 0.07, 0.14, null, 0.05]],
  deny: [['sawtooth', 220, 0.12, 0.1, 160]],
  page: [['triangle', 520, 0.04, 0.1]],
  coin: [['square', 988, 0.07, 0.1], ['square', 1319, 0.16, 0.1, null, 0.07]],
  stamp: [['noise', 0, 0.12, 0.4], ['sine', 90, 0.16, 0.45, 50]],
  success: [['triangle', 523, 0.1, 0.16], ['triangle', 659, 0.1, 0.16, null, 0.1], ['triangle', 784, 0.22, 0.16, null, 0.2]],
  fail: [['sawtooth', 330, 0.18, 0.1, 220], ['sawtooth', 247, 0.3, 0.1, 160, 0.16]],
  promote: [['square', 523, 0.1, 0.1], ['square', 659, 0.1, 0.1, null, 0.1], ['square', 784, 0.1, 0.1, null, 0.2], ['square', 1047, 0.35, 0.1, null, 0.3]],
  crash: [['sine', 110, 0.6, 0.5, 40], ['noise', 0, 0.4, 0.15]],
  news: [['noise', 0, 0.08, 0.2], ['triangle', 740, 0.08, 0.1, null, 0.06]],
  phone: [['square', 1200, 0.08, 0.2], ['square', 1500, 0.08, 0.2, null, 0.09], ['square', 1200, 0.08, 0.2, null, 0.18], ['square', 1500, 0.08, 0.2, null, 0.27]],
  step: [['noise', 0, 0.035, 0.06]]
};
function sfx(name) {
  if (!SND.on || G.instant || !(SFX[name] || sfx.FILE[name])) return;
  const ac = sndAC(); if (!ac) return;
  try {
    const d = sfx.FILE[name], u = d && d.f[d.f.length > 1 ? (Math.random() * d.f.length) | 0 : 0], buf = u && sfx.buf[u];
    if (buf) { const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; g.gain.value = d.vol; src.connect(g); g.connect(ac.destination); src.start(); return; }
    if (!SFX[name]) return;
    const t0 = ac.currentTime;
    SFX[name].forEach(([type, hz, dur, vol, hz2, at]) => {
      const t = t0 + (at || 0), g = ac.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(ac.destination);
      if (type === 'noise') {
        const n = Math.max(1, Math.floor(ac.sampleRate * dur)), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const s = ac.createBufferSource(); s.buffer = b; s.connect(g); s.start(t);
      } else {
        const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(hz, t); if (hz2) o.frequency.exponentialRampToValueAtTime(hz2, t + dur);
        o.connect(g); o.start(t); o.stop(t + dur + 0.02);
      }
    });
  } catch (e) { }
}

/* 파일 효과음 표 — 이름: { ko 쓰임 · f 파일(여럿이면 그때그때 하나) · vol 음량 } · 소리를 바꾸려면 tools/snd_put.sh 의 표를 고쳐 다시 돌림 */
sfx.FILE = {
  click: { ko: '단추 누름', f: ['snd/sfx_click.wav'], vol: 0.6 },
  select: { ko: '정함 · 알림', f: ['snd/sfx_select.wav'], vol: 0.3 },
  deny: { ko: '안 됨(돈 모자람 등)', f: ['snd/sfx_deny.wav'], vol: 0.3 },
  page: { ko: '책장 넘김', f: ['snd/sfx_page.wav'], vol: 0.8 },
  news: { ko: '신문 · 소식', f: ['snd/sfx_news.wav'], vol: 0.8 },
  coin: { ko: '돈 들어옴 · 나감', f: ['snd/sfx_coin.wav'], vol: 0.9 },
  door: { ko: '장소에 들어감', f: ['snd/sfx_door.wav'], vol: 0.45 },
  step: { ko: '걷는 발소리', f: ['snd/sfx_step1.wav', 'snd/sfx_step2.wav', 'snd/sfx_step3.wav', 'snd/sfx_step4.wav'], vol: 0.16 },
  success: { ko: '잘됨', f: ['snd/sfx_success.wav'], vol: 0.35 },
  fail: { ko: '안됨', f: ['snd/sfx_fail.wav'], vol: 0.35 },
  promote: { ko: '진급 · 호황', f: ['snd/sfx_promote.wav'], vol: 0.45 }
};
sfx.KO = { stamp: '도장', crash: '폭락', phone: '전화 · 삐삐' };   // 합성으로만 남은 소리의 한글 이름(소리 듣기 화면 snd.html 이 읽음 — 파일 소리는 위 표의 ko)
sfx.buf = {};      // 파일 이름 → 읽어 둔 소리
sfx.load = () => {   // 첫 누르기 뒤 한 번 — 못 읽은 파일은 조용히 합성으로 남음
  const ac = sndAC(); if (!ac || sfx.loaded) return; sfx.loaded = true;
  Object.values(sfx.FILE).forEach(d => d.f.forEach(u => fetch(u).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).then(buf => { sfx.buf[u] = buf; }).catch(() => { })));
};

/* ── 배경음 ── */
function bgmPlay(name) {
  SND.want = name;
  if (!SND.on || !SND.unlocked || G.instant) return;
  if (SND.cur === name && SND.el && !SND.el.paused) return;
  const old = SND.el, def = BGM[name];
  if (old) { const o = old; if (SND.cur && SND.cur !== 'title') SND.pos[SND.cur] = o.currentTime; let v = o.volume; const f = setInterval(() => { v -= 0.06; if (v <= 0) { clearInterval(f); o.pause(); } else o.volume = v; }, 50); }
  SND.cur = name; SND.el = null;
  if (!def || SND.bad[name]) return;   // 11-14: 파일이 없으면 0.7초 고리가 새 Audio 를 끝없이 받던 것 — 한 번 못 읽은 곡은 이 판에서 조용히 건너뜀
  const a = new Audio(def.file); a.loop = true; a.volume = 0; SND.el = a;
  a.addEventListener('error', () => { SND.bad[name] = 1; }, { once: true });
  a.addEventListener('loadedmetadata', () => { const p = SND.pos[name]; if (p > 1 && p < a.duration - 8) { try { a.currentTime = p; } catch (e) { } } }, { once: true });   // 장면이 자주 바뀌어도 곡 앞머리만 되풀이되지 않게
  a.play().then(() => { let v = 0; const f = setInterval(() => { v += 0.05; if (v >= def.vol || SND.el !== a) { clearInterval(f); if (SND.el === a) a.volume = def.vol; } else a.volume = v; }, 50); }).catch(() => { });
}
// 지금 화면에 맞는 배경음: 타이틀 · 결산 · 위기(1997-11 ~ 1998-06) · 설레는 장면 · 장소(바 · 둔치 · 서점 · 시장 · 자취방 · 식당 · 사무실) · 칸(주말 · 밤 · 낮)
//   지도 위: 평일 낮 = day · 평일 밤 = night · 주말 = weekend(들으면 바로 주말) / 장소 안 · 장면: 그 장소의 곡, 없으면 칸의 곡(출근 = office · 점심 = lunch)
function bgmFor() {
  const sc = document.getElementById('screen'), st = G.st, P = G.P; if (!sc) return null;
  const k = sc.className || '';
  if (!st || /k-title/.test(k)) return 'title';
  if (/k-settle/.test(k)) return 'settle';
  const ym = (st.date || '').slice(0, 7);
  if (ym >= '1997-11' && ym <= '1998-06') return 'crisis';
  const card = (P && P.id && SH.EV && SH.EV[P.id]) || null;
  const slot = P && (P.slot || (P.si >= 0 && SH.SLOTS && SH.SLOTS[P.si])), kind = (slot && slot.kind) || '';
  const pre = st.wk && st.wk.pre, inside = /k-inside/.test(k) && pre ? pre.place : '';
  const place = inside || (P && P.place) || (card && card.when && card.when.place) || '';
  const scene = !!(inside || card), t = SH.placeCol('bgm')[place] || '';
  if (card && (card.trigger === 'date' || /confess/.test(card.id))) return 'romance';
  if (t === 'bar') return 'bar';
  if (kind === 'evening') return t === 'home' || t === 'market' ? t : 'night';
  if (kind === 'weekend') return t === 'river' || t === 'quiet' || t === 'market' ? t : 'weekend';
  if (kind === 'work' || kind === 'lunch') return !scene ? 'day' : t && t !== 'home' ? t : kind === 'lunch' ? 'lunch' : 'office';
  return t && t !== 'home' ? t : 'day';
}
// 장소 → 곡은 장소 카드의 '곡' 칸(새 장소 = 장소 카드 한 줄 · 없는 장소는 칸의 곡)
setInterval(() => { const n = bgmFor(); if (n && n !== SND.want) bgmPlay(n); else if (n && SND.unlocked && SND.on && (!SND.el || SND.el.paused) && SND.cur !== null) bgmPlay(n); }, 700);
// 첫 누르기에서 소리를 엶
addEventListener('pointerdown', () => { if (SND.unlocked) return; SND.unlocked = true; SND.unlockAt = Date.now(); sndAC(); sfx.load(); const n = bgmFor(); if (n) { SND.cur = null; bgmPlay(n); } }, { capture: true });

/* ── 켬/끔 단추 · 크레딧 ── */
function soundToggle() {
  if (SND.on && SND.unlockAt && Date.now() - SND.unlockAt < 900) { SND.unlockAt = 0; return; }   // 첫 누름이 바로 이 단추면: 브라우저가 막던 소리가 그 누름으로 켜진 것 — 끄지 않음(11-14 첫 화면 소리 단추)
  SND.on = !SND.on; try { SH.store.set('sanghanga_sound', SND.on ? 'on' : 'off'); } catch (e) { }
  if (!SND.on && SND.el) { SND.el.pause(); SND.cur = null; } else if (SND.on) { SND.cur = null; bgmPlay(bgmFor() || 'day'); }
  const b = document.getElementById('sndbtn'); if (b) b.textContent = SND.on ? '♪ 소리 켬' : '♪ 소리 끔';
}
function soundCredits() {
  overlay(`<div class="box px"><h2>소리 크레딧</h2><p style="font-size:max(13px,var(--fl));line-height:1.7">배경음 — Kevin MacLeod (incompetech.com)
${Object.values(BGM).map(b => b.credit).join(' · ')}
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
(웹용으로 줄이고 한 소리로 합침)

효과음 — Kenney (kenney.nl) · CC0
(도장 · 폭락 소리는 게임 안에서 직접 합성)</p><div class="acts"><div class="btn big" data-act="ovl-close">닫기</div></div></div>`);
}
// 소리 켬/끔은 설정 창 안에서만(11-12 대표님 '소리 켬 단추가 거슬림 · 기본값은 켜짐')
