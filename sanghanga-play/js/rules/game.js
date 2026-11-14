/* =====================================================================
   rules/game.js — 뼈대(core)가 묻는 이 게임의 이름표 한 장(11-14 큰 짜임 다섯째)
   - 뼈대는 인물 · 장소 · 행동 · 물건 · 카드 · 날짜 이름을 직접 쓰지 않고 이 표(SH.GAME)와 자료(SH.D)에서 읽음
     → 테마를 바꾼 새 게임은 rules/ 와 이 표, 자료(data/)를 갈아 끼움(뼈대는 그대로)
   - 직급 이름(첫 · 꼭대기 · 갈래)은 직급 카드에서 뽑음 — core/data.js 의 SH.RANK_FIRST · RANK_TOP · RANK_BRANCH · RANK_BRANCH_FROM
   - core/data.js 바로 뒤에 실음(core/events.js · core/flow.js 가 실릴 때 SH.CODE_CARDS 를 읽음)
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  SH.GAME = {
    hero: 'hero',                                              // 주인공 인물 id(관계 표에서 빠지고, 이름은 SH.HERO)
    rest: { place: 'home_studio', action: 'rest' },            // 쓰러졌을 때 · 고를 것이 없을 때의 쉼
    shop_action: 'eve_shop',                                   // 이 행동을 고르면 가게 화면이 열림
    start_owned: ['suit_0', 'watch_0'],                        // 새 판이 들고 시작하는 물건
    start_equip: { suit: 'suit_0', watch: 'watch_0' },         // 새 판이 걸친 것
    acts: [['2002-01', 6], ['2000-03', 5], ['1999-01', 4], ['1997-01', 3]], act_base: 2,   // 막 = 십 년 뼈대의 때(이 달부터 그 막 · 그 앞은 act_base)
    end_by_rank: { top: 'end_ceo', branch: 'end_founder', other: 'end_company' },          // 폐장일 끝 갈래: 꼭대기 직급 · 갈래 직급(독립) · 그 밖
  };
  SH.CODE_CARDS = { pass: 'a1_conversion_pass', fail: 'a1_conversion_fail', ext: 'a1_extension_fail' };   // 인턴 판정 카드 id 한 곳(settle · flow · events 가 이 표를 읽음)
  SH.CODE_GATES = {                                            // 카드 조건 밖에 코드가 따로 보는 것(카드 id → 판정 · core/events.js 의 카드 고르기가 읽음)
    a1_tip_payoff: (st) => !!(st.wk && st.wk.hintReport)       // 귀띔 종목으로 보고서를 쓴 주의 결산에만
  };
  SH.LAST_TICK_BEFORE = '2006-01';     // 이 달부터 시작하는 마디는 없음 → 폐장일 판정 · 11-13 밤: 분기 마디를 버린 뒤로 2005-12 가 안 돌아 12월 결산에 걸린 끝 카드(END-1~4)가 한 번도 안 나왔음 → 12월까지 돎
})(typeof window !== 'undefined' ? window : globalThis);
