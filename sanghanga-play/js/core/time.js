/* =====================================================================
   time.js — 시간 마디와 칸
   - 1막 인턴: 한 마디 = 한 주 · 고르기 다섯 칸(평일 출근·점심·밤 + 토·일) + 금요일 결산(칸 안 씀)
     (11-13 대표님 '평일 / 주말 이렇게 심플하게' — 금요일 밤 칸 없앰 · 뼈대_설계_1113.md)
     (이벤트_카드_1막 바탕 가정 '시간 — 한 주 = 고르기 여섯 칸')
   - 2막부터: 한 마디 = 한 달(사원부터 끝까지 · 숫자 초안 3-4 의 '분기 마디'는 11-13 에 버림)
     마디가 커져도 고르기는 여섯 번 — 짧은 화면 하나에 묶음
   - 끝: 2005 겨울(마지막 분기 2005-09~11) 뒤 2005-12-30 폐장일에 판정(기획 결정 A3)
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};

  /* 칸 이름(ko)은 자료 — 원본 04_시범/대사/화면_글.json 의 SLOT_KO(지도 위 짧은 이름은 SLOT_SHORT) · slot · day 는 카드가 견주는 열쇠라 여기 */
  SH.SLOTS = [
    { k: 'work', slot: '출근', day: '평일', kind: 'work', get ko() { return SH.D.ui_lines.SLOT_KO[this.k]; } },
    { k: 'lunch', slot: '점심', day: '평일', kind: 'lunch', get ko() { return SH.D.ui_lines.SLOT_KO[this.k]; } },
    { k: 'eve', slot: '퇴근뒤', day: '평일', kind: 'evening', get ko() { return SH.D.ui_lines.SLOT_KO[this.k]; } },
    { k: 'settle', slot: '결산', day: '금', kind: null, get ko() { return SH.D.ui_lines.SLOT_KO[this.k]; } },
    { k: 'sat', slot: '주말낮', day: '토', kind: 'weekend', get ko() { return SH.D.ui_lines.SLOT_KO[this.k]; } },
    { k: 'sun', slot: '주말낮', day: '일', kind: 'weekend', get ko() { return SH.D.ui_lines.SLOT_KO[this.k]; } }
  ];
  SH.PICK_SLOTS = SH.SLOTS.filter(s => s.k !== 'settle');     // 고르는 다섯 칸

  /* ── 날짜 ── */
  const pad = (n) => String(n).padStart(2, '0');
  SH.ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  SH.parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
  SH.addDays = (s, n) => { const d = SH.parseDate(s); d.setDate(d.getDate() + n); return SH.ymd(d); };
  SH.addMonths = (s, n) => { const d = SH.parseDate(s); return SH.ymd(new Date(d.getFullYear(), d.getMonth() + n, 1)); };
  SH.ym = (s) => { const [y, m] = s.split('-').map(Number); return { y, m }; };

  // 이 마디가 덮는 달 목록 [{y,m}] — 이벤트 when.month · when.quarter 판정과 연말 앨범에 씀
  SH.tickMonths = function (st) {
    const { y, m } = SH.ym(st.date);
    return [{ y, m }];      // 마디는 한 주 또는 한 달 — 둘 다 그 달 하나(11-13 분기 마디를 버림 · 11-14 밤 정리로 분기 가지 걷음)
  };
  SH.monthsInTick = (st) => st.mode === 'month' ? 1 : 0.25;

  // 다음 마디 크기: 인턴 뒤로는 늘 달(옛 판의 '차장 이상 · 독립 · 1999-06 부터 = 분기'는 11-13 에 버림)
  SH.modeFor = function (st, date) {
    return 'month';      // 11-13 돈 고리: 분기 마디를 버림 — 사원부터 끝까지 한 달씩(카드의 when.quarter 는 그 분기의 달이면 맞음)
  };
  // 마지막 달(SH.LAST_TICK_BEFORE)은 rules/game.js

  /* ── 이름표 ── */
  const SEASON = { 12: '겨울', 1: '겨울', 2: '겨울', 3: '봄', 4: '봄', 5: '봄', 6: '여름', 7: '여름', 8: '여름', 9: '가을', 10: '가을', 11: '가을' };
  SH.dateLabel = function (st) {
    if (st.mode === 'week') {
      const d = SH.parseDate(st.date);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${Math.ceil(d.getDate() / 7)}주`;
    }
    const { y, m } = SH.ym(st.date);
    return `${y}년 ${m}월`;
  };
  SH.subLabel = function (st) {
    const rk = SH.RK[st.rank] ? SH.RK[st.rank].name_ko : st.rank;
    const m = SH.ym(st.date).m;
    if (st.mode === 'week') return `${SEASON[m]} · ${rk} ${st.week}주째${st.ext ? ' · 연장' : ''}`;
    return `${SEASON[m]} · ${rk}`;
  };
  SH.tickName = (st) => st.mode === 'week' ? '주' : '달';
})(typeof window !== 'undefined' ? window : globalThis);
