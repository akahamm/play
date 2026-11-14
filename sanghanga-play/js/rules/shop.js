/* =====================================================================
   shop.js — 상점 (숫자 초안 4절) · 산 물건 = 멋 + 끌림 태그 · 입은 옷이 픽셀 모습·앨범에 보임
   - 멋 = 칸마다 입은 물건 하나의 멋(옷·시계·소품·차·집) + 몸 — 같은 칸에 더 좋은 걸 사면 차이만큼 오름
   - 1막 양복점: 맞춤 정장(40만 · 멋 7)은 이벤트 카드 E14 로 맞추고 E21 에 찾아 입음(숫자_기준)
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  /* 가게별 물건 · 탭 이름(11-14 대표님 질문 카드 '가게 탭 = 가게별로 나눔') — 표는 원본 04_시범/숫자_진급_초안.md 4절 '가게와 탭'(11-15 전엔 여기) → shop.json 의 tabs · shops
     가게가 늘면 그 표에 한 줄(id = 장소 카드의 장소 id · rank = 열리는 직급 · only/not = 그 탭에서 이 가게가 파는 · 안 파는 물건) */
  Object.defineProperty(SH, 'SHOP_TABS', { get: () => SH.D.shop.tabs, configurable: true });
  Object.defineProperty(SH, 'SHOPS', { get: () => SH.D.shop.shops, configurable: true });
  SH.shopOf = (id) => SH.SHOPS.find(s => s.id === id) || null;
  SH.shopsOpen = (st) => SH.SHOPS.filter(s => !s.rank || SH.rankAtLeast(st, s.rank));
  const STYLE_SLOTS = ['suit', 'watch', 'accessory', 'car', 'home'];
  // 1막 양복점의 맞춤 정장 (상점 표의 1단 값·멋을 씀 — 숫자_기준 '맞춤 정장(1막 양복점)') · 값 · 멋은 shop.json 의 suit_1 을 쓰는 때 읽음(사본을 박지 않음 · 되팔기 같은 다른 칸은 안 가져옴)
  const CS = () => SH.D.shop.custom_suit;   /* 이름 · 값 · 멋을 빌려 오는 물건 · 열림 글 — 원본 4절 '1막 맞춤 정장' */
  SH.CUSTOM_SUIT = { id: 'suit_custom', slot: 'suit', tier: 1, get name_ko() { return CS().name_ko; }, get price() { return SH.SHOP[CS().same_as].price; }, get style() { return SH.SHOP[CS().same_as].style; }, tags: [], unlock_rank: null, get unlock_ko() { return CS().unlock_ko; } };
  SH.item = (id) => id === 'suit_custom' ? SH.CUSTOM_SUIT : SH.SHOP[id];

  SH.shopItems = function (st, tab, shopId) {   // shopId 를 주면 그 가게가 파는 것만(화면) · 안 주면 전부(로봇 · 사기 판정)
    let list = SH.D.shop.items.filter(x => x.slot === tab && x.price != null && x.unlock_ko !== '사건');
    if (tab === 'suit' && st.rank === 'intern') list = [SH.CUSTOM_SUIT].concat(list);
    const shop = shopId && SH.shopOf(shopId);
    if (shop) list = shop.tabs.includes(tab) ? list.filter(x => (!shop.only || shop.only.includes(x.id)) && !(shop.not || []).includes(x.id)) : [];
    return list.map(it => {
      const owned = st.owned.includes(it.id);
      const cur = SH.item(st.equip[it.slot]);
      const gain = STYLE_SLOTS.includes(it.slot) ? Math.max(0, it.style - (cur ? cur.style : 0)) : 0;
      let lock = null;
      if (it.unlock_rank && !SH.rankAtLeast(st, it.unlock_rank)) lock = `${SH.RK[it.unlock_rank].name_ko}부터`;
      if (it.id === 'suit_custom' && (st.flags.suit_ordered || st.suitCustom)) lock = '맞춤 중 · 찾는 날을 기다림';
      /* 148(11-14 대표님 "'양복점 사장과 먼저 이야기'는 언제 어떻게 해제하는지 모르겠음"): 푸는 길을 그대로 적음 — 장면 a1_first_suit = 첫 월급(4주) 뒤 5 ~ 11주 토요일에 양복점에 들어가면 */
      if (it.id === 'suit_custom' && st.seen.a1_first_suit == null) { const ev = SH.EV && SH.EV.a1_first_suit, wr = (ev && ev.when && ev.when.week_range) || [5, 11];
        lock = st.week < wr[0] ? `${wr[0]}주부터 · 토요일에 맞춤` : st.week <= wr[1] ? '토요일에 오면 맞춤' : 'gone'; }
      const ok = !lock && !owned && st.s.money >= it.price;
      return Object.assign({}, it, { owned, gain, lock, ok, why: lock || (owned ? '이미 있음' : st.s.money < it.price ? '돈이 모자람' : '') });
    }).filter(x => x.lock !== 'gone');   // 맞춤 정장을 권하는 때(장면)가 지나면 목록에서 뺌 — 풀 길이 없는 자물쇠를 남기지 않음
  };

  // 사기 → { ok, msg } · 선물은 받을 사람(to)
  SH.buy = function (st, id, to) {
    const it = SH.item(id);
    if (!it) return { ok: false, msg: '없는 물건' };
    const row = SH.shopItems(st, it.slot).find(x => x.id === id);
    if (!row || !row.ok) return { ok: false, msg: row ? row.why : '못 삼' };
    SH.addMoney(st, -it.price, '물건 삼');
    if (it.slot === 'gift') {
      const eff = it.gift_effects || {};
      const who = to || Object.keys(st.rel).find(c => st.rel[c].st >= 1 && SH.CH[c].group === 'romance');
      if (!who) return { ok: true, msg: '줄 사람이 없어 서랍에 넣어 둠' };
      let d = eff[who] != null ? eff[who] : (eff['*'] || 0);
      const r = st.rel[who];
      if (r.q) { d = Math.round(-SH.R.caught_affection * SH.R.makeup_gift_ratio); r.q = false; if (who === 'analyst') delete st.flags.analyst_upset; }
      SH.meet(st, who, d, 'gift');
      Object.keys(eff).forEach(c => { if (c !== '*' && c !== who && st.rel[c]) SH.addAff(st, c, eff[c]); });
      return { ok: true, msg: `${SH.name(who)}에게 ${it.name_ko} ♥` };
    }
    st.owned.push(it.id);
    if (it.id === 'suit_custom') { st.flags.suit_ordered = st.tick + 1; return { ok: true, msg: '맞춤 정장 — 열흘 뒤 찾음' }; }
    const cur = SH.item(st.equip[it.slot]);
    const gain = it.style - (cur ? cur.style : 0);
    if (gain > 0) { st.equip[it.slot] = it.id; SH.addStat(st, 'style', gain); }
    if (it.slot === 'car') SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.car, { item: it.name_ko });
    if (it.slot === 'home' && it.tier > 0) SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.home, { item: it.name_ko });
    if (it.slot === 'suit' && it.tier >= 1) SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.suit, { item: it.name_ko });
    return { ok: true, msg: `${it.name_ko} — 멋 ${gain > 0 ? '+' + gain : '그대로'}` };
  };
  // E21(찾아 입은 날): 카드 효과가 멋 +4 를 주므로 여기선 입은 옷만 바꿈
  SH.wearCustom = function (st) {
    if (st.flags.first_suit && st.equip.suit !== 'suit_custom' && !st.suitCustom) {
      st.suitCustom = true; st.equip.suit = 'suit_custom';
      if (!st.owned.includes('suit_custom')) st.owned.push('suit_custom');
    }
  };
  // 픽셀 모습에 쓸 옷 단(0 기성 · 1 맞춤 · 2 … ) — 화면이 색을 고름
  SH.suitTier = (st) => { const it = SH.item(st.equip.suit); return it ? it.tier : 0; };
})(typeof window !== 'undefined' ? window : globalThis);
