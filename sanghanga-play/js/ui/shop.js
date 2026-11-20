/* =====================================================================
   ui/shop.js — 상점(목업 05) · 왼쪽 거울: 지금 모습 ▶ 입으면 · 오른쪽 물건 칸
   - 산 뒤 남는 돈 · 멋이 안 오르는 물건은 미리 '멋 그대로' · '보류' 단추 (직장인 눈 검토 ④)
   - 숨은 숫자 '멋'은 상점에서 보임 (대표님 결정)
   ===================================================================== */
const SHOPV = { tab: 'suit', sel: null, to: null, from: null, msg: '', shop: null };   // shop = 지금 보는 가게(달 마디에서 처음 열면 백화점)
const ITEM_PX = { suit_0: 'ready', suit_custom: 'custom', suit_1: 'dept', suit_2: 'custom', suit_3: 'italy', suit_4: 'coat' };

function shopScreen(from) {
  SHOPV.from = from || SHOPV.from;
  const st = G.st;
  /* 가게별로 나눔(11-14): 주 마디는 들어간 그 가게만 · 사원 뒤는 걸어 들어간 그 가게만('walk' · ui/loop.js) · 그 밖(사진 손 'menu')은 열린 가게를 위 줄에서 고름 */
  const shops = SH.shopsOpen(st), fixed = (SHOPV.from === 'flow' && G.P && SH.shopOf(G.P.place)) || (SHOPV.from === 'walk' && SH.shopOf(SHOPV.shop));
  if (fixed) SHOPV.shop = fixed.id; else if (!shops.some(s => s.id === SHOPV.shop)) SHOPV.shop = (shops.find(s => s.id === 'department_store') || shops[0]).id;
  const shop = SH.shopOf(SHOPV.shop);
  if (!shop.tabs.includes(SHOPV.tab)) { SHOPV.tab = shop.tabs[0]; SHOPV.sel = null; }
  const items = SH.shopItems(st, SHOPV.tab, shop.id);
  const sel = items.find(x => x.id === SHOPV.sel) || null;
  const romance = Object.keys(st.rel).filter(c => st.rel[c].st >= 1 && SH.CH[c].group === 'romance');
  if (sel && sel.slot === 'gift' && !SHOPV.to) SHOPV.to = romance[0] || null;
  const c = { st, shops, fixed, shop, items, sel, romance };
  const sc = document.getElementById('screen');
  sc.className = 'k-shop m4';
  G.redraw = () => shopScreen();
  /* 217(11-17 대표님 '가게 UI 가 피드백 이후로 최신화 안 됨'): 윗줄은 인턴 뒤 꼴(날짜 · 돈은 동전 없이 · 나가기) — 체력 · 스트레스 · 때 칩은 뺌
     222(11-17 대표님 '각 상점에서 자동차 고친 것처럼'): 거울(옷 입은 주인공)은 옷 나눔에서만 · 집 · 시계 · 소품 · 선물 · 차는 물건 그림(itemPrev) */
  const wear = SHOPV.tab === 'suit';
  sc.innerHTML = topBar(st, { me: 1, noSlot: 1, right: '◀ 나가기', rightAct: 'shop-exit', extra: `<span class="tmoney" title="돈">${SH.won(st.s.money)}</span>` }) + `<div class="mid">${wear ? shopScreen.prev(c) : shopScreen.itemPrev(c)}
  ${shopScreen.right(c)}</div>`;
  paint(sc); shopScreen.drawImgs(sc);
  if (wear) shopScreen.mirrors(st, sel);
}
/* 옷 말고 다른 물건 가게의 왼쪽(217 차 대리점 · 목업_16 → 222 모든 가게): 지금 쓰는 것 ▶ 사면 — 물건 그림 둘(img/shop/<물건 id>.png) · 멋 · (유지비가 드는 물건이면) 유지비 / 달
   지금 쓰는 것 = 걸친 것(st.equip) · 없으면 그 나눔에서 값 없는 것(차: 지하철) · 선물은 '고른 선물'만 */
shopScreen.img = (id) => `<canvas class="shimg" data-shimg="${id}"></canvas>`;
/* 물건 그림은 그림판에 직접 그림(11-17 사진 시험 '찍을 때마다 다른 화면' — <img> 를 줄여 그리는 방식이 그때그때 달라 화소가 흔들렸음) · 칸 크기는 꾸밈이 잡고 그 두 배로 담아 가운데 맞춤 */
shopScreen.imgs = {};
shopScreen.drawImgs = function (root) {
  root.querySelectorAll('canvas[data-shimg]').forEach(cv => { const id = cv.dataset.shimg, W = cv.clientWidth * 2, H = cv.clientHeight * 2; if (!W || !H) return; cv.width = W; cv.height = H;
    const im = shopScreen.imgs[id] || (shopScreen.imgs[id] = Object.assign(new Image(), { src: `img/shop/${id}.png` }));
    const draw = () => { const g = cv.getContext('2d'), k = Math.min(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, W, H); g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); };
    if (im.complete && im.naturalWidth) draw(); else im.addEventListener('load', draw, { once: true }); });
};      /* 칸 크기는 꾸밈이 미리 잡음(그림이 실리기 전후로 칸이 안 흔들리게 · 11-17 사진 시험 '찍을 때마다 다른 화면') */
shopScreen.itemPrev = function (c) {
  const { st, sel, shop } = c, T = SH.D.ui_lines.SHOP_PREV, slot = SHOPV.tab;
  const now = slot === 'gift' ? null : SH.item(st.equip[slot]) || SH.D.shop.items.find(x => x.slot === slot && x.price == null) || null;
  const to = sel && sel.slot === slot && (!now || sel.id !== now.id) ? sel : null, up0 = now ? SH.upkeepOf(now) : 0, up1 = to ? SH.upkeepOf(to) : up0, upRow = slot === 'car' || up0 || up1;
  const cell = (it, k) => `<div class="cc"><div class="lb${k ? ' gold-t' : ''}">${esc(SH.fillKeys(T[k ? 'to' : 'now'][slot] || '{name}', { name: it.name_ko }))}</div>${shopScreen.img(it.id)}</div>`;
  const place = SH.PL[shop.id] || { name_ko: shop.ko };
  return `<div class="prev px item"><div class="say"><div class="b nof"><div class="tx">${esc(SHOPV.msg || SH.D.ui_lines.SHOP_SAY[shop.id] || SH.D.ui_lines.SHOP_SAY.shop)}</div><small>${esc(place.name_ko || '')}</small></div></div>
    <div class="cars">${now ? cell(now, 0) : ''}${now && to ? '<span class="arrow2">▶</span>' : ''}${to ? cell(to, 1) : ''}${!now && !to ? `<div class="cc mute">${esc(T.pick)}</div>` : ''}</div>
    <div class="style">${slot === 'gift' ? (to ? `<div class="tags">${shopScreen.likes(to)}</div>` : '') : `<div class="r"><span class="mute">멋</span><span class="big">${st.s.style}${to && to.gain > 0 ? ` ▶ <span class="gold-t">${st.s.style + to.gain}</span>` : ''}</span></div>`}
      ${upRow ? `<div class="r"><span class="mute">${esc(T.upkeep)}</span><span class="big">${SH.won(up0)}${to ? ` ▶ <span class="${up1 > up0 ? 'up-t' : up1 < up0 ? 'dn-t' : ''}">${SH.won(up1)}</span>` : ''}</span></div>
      <small class="mute">${esc(T.upkeep_note)}</small>` : ''}</div></div>`;
};
/* 아래는 가게 화면의 조각 — 거울 그리기(mirrors) 말고는 모두 글(HTML)만 돌려줌 */
// 왼쪽: 주인 얼굴 · 말풍선 · '지금 ▶ 입으면' 딱지 · 멋 숫자와 별 · 입은 것
shopScreen.prev = function (c) {
  const { st, shop, sel } = c;
  const place = SH.PL[shop.id] || { id: shop.id, name_ko: shop.ko }, tailor = shop.id === 'tailor';   // 양복점 주인 얼굴과 말은 양복점에서만(전: 백화점에서도 양복점 주인이 '양복이 명함')
  return `<div class="prev px"><canvas id="shop"></canvas>
    <div class="say">${tailor ? fc('npc_tailor', 1.75) : ''}<div class="b${tailor ? '' : ' nof'}"><div class="tx">${esc(SHOPV.msg || (tailor ? SH.D.ui_lines.SHOP_SAY[st.rank === 'intern' ? 'intern' : 'tailor'] : SH.D.ui_lines.SHOP_SAY[shop.id] || SH.D.ui_lines.SHOP_SAY.shop))}</div><small>${esc(place ? place.name_ko : '가게')}</small></div></div>
    <span class="lab2" style="left:104px;top:440px">지금</span>
    ${sel && sel.slot === 'suit' ? '<span class="lab2 gold-t" style="left:312px;top:440px">입으면</span><span class="arrow">▶</span>' : ''}
    <div class="style"><div class="r"><span class="mute">멋</span><span class="big">${st.s.style}${sel && sel.gain > 0 ? ` <span class="mute" style="font-size:max(14px,var(--fl))">▶</span> <span class="gold-t">${st.s.style + sel.gain}</span>` : ''}</span></div>
      <div class="stars">${Array.from({ length: 20 }, (_, i) => `<i class="${i < Math.round(st.s.style / 5) ? 'on' : sel && sel.gain > 0 && i < Math.round((st.s.style + sel.gain) / 5) ? 'pv' : ''}"></i>`).join('')}</div>
      <div class="likes">입은 것: ${Object.values(st.equip).map(id => (SH.item(id) || {}).name_ko).filter(Boolean).map(esc).join(' · ')}</div></div></div>`;
};
// 오른쪽: 가게 고르기 줄 · 나눔(탭) · 물건 칸 · 못 사는 칸 한 줄 · 고른 칸 상자
shopScreen.right = function (c) {
  const { st, shops, fixed, shop, sel } = c, { gridItems, moreLine } = shopScreen.grid(c.items), buyBar = shopScreen.buyBar(c);
  return `<div class="right">${!fixed && shops.length > 1 ? `<div class="shops">${shops.map(s => `<span class="${s.id === shop.id ? 'on' : ''}" data-shop="${s.id}">${esc(s.ko)}</span>`).join('')}</div>` : ''}
    ${shop.tabs.length > 1 ? `<div class="tabs">${SH.SHOP_TABS.filter(([k]) => shop.tabs.includes(k)).map(([k, n]) => `<span class="${k === SHOPV.tab ? 'on' : ''}" data-tab="${k}">${ic16({ suit: 'suit', watch: 'star', accessory: 'shop', gift: 'heart' }[k] || 'star', 26)}${n}</span>`).join('')}</div>` : ''}
    <div class="grid">${gridItems.map(it => shopScreen.card(st, it)).join('')}</div>${moreLine}
    ${buyBar ? `<div class="buy px${sel && sel.slot === 'gift' ? ' gift' : sel && SH.upkeepOf(sel) ? ' up' : ''}">${buyBar}</div>` : ''}</div>`;
};
// 중간 판(11-12 목업 '이대로 넣어'): 못 사는 칸은 한 줄로 · 아래 줄은 큰 숫자 셋 · '산다'는 못 사면 이유를 단추에
// 물건 칸: 열린 것 다음 잠긴 것 하나까지 여섯 칸 · 나머지 잠긴 수는 한 줄로
shopScreen.grid = function (items) {
  const open = items.filter(it => !it.lock), locked = items.filter(it => it.lock);
  const gridItems = open.concat(locked.slice(0, 1)).slice(0, 6);
  const rest = locked.length - (gridItems.length - open.length);
  const moreLine = rest > 0 ? `<div class="m4-more">${ic('lock', 2)} 진급하면 ${rest}개 더 열려요</div>` : '';
  return { gridItems, moreLine };
};
// 고른 칸 상자: 값 · 산 뒤 남는 돈 · 달 유지비 · 줄 사람 · '산다'(못 사면 이유)
shopScreen.buyBar = function (c) {
  const { st, sel, romance } = c;
  const after = sel ? st.s.money - sel.price : null;
  const why = sel ? (sel.ok ? '' : sel.why || '못 삼') : '';
  return sel ? `<div class="n"><small>값</small><b>${SH.won(sel.price)}</b></div>
        <div class="n"><small>산 뒤 남는 돈</small><b class="${after < 0 ? 'red-t' : ''}">${SH.won(after)}</b></div>
        ${SH.upkeepOf(sel) ? `<div class="n"><small>달 유지비</small><b>${SH.won(SH.upkeepOf(sel))}</b></div>` : ''}
        ${sel.slot === 'gift' ? `<div class="n who"><small>줄 사람</small>${romance.length ? romance.map(c => `<div class="btn sm ${SHOPV.to === c ? 'on' : ''}" data-gift="${c}">${SH.name(c)}</div>`).join('') : '<span class="mute">아직 없음</span>'}</div>`
          : ''}
        <div class="acts"><div class="btn big ${sel.ok && (sel.slot !== 'gift' || SHOPV.to) ? '' : 'dis'}" data-act="shop-buy">${why ? esc(why) : sel.slot === 'gift' && !SHOPV.to ? '줄 사람 고르기' : '산다'}</div><div class="btn" data-act="shop-hold">보류</div></div>`
      : '';   /* 고른 것이 없으면 아래 상자를 안 그림(전: 빈 큰 상자에 '물건을 누르면 …' 한 줄 · 산 뒤 말은 주인 말풍선에 이미 나옴) */
};
// 물건 한 칸: 그림 · 값(가진 것은 '있음') · 멋 변화 · 좋아하는 사람 딱지 · 자물쇠
shopScreen.card = function (st, it) {
  const icon = it.slot === 'suit' ? `<canvas data-item="${ITEM_PX[it.id] || 'ready'}" data-s="3"></canvas>` : shopScreen.img(it.id);   /* 217 · 222: 옷 말고는 물건 그림 */
  /* 147(11-14 대표님 '어색한 · 겹치는 · 중복된 부분을 스스로 찾아 수정'): 가진 물건은 값 대신 '있음'만(전: 값 + '있음' 딱지 + '멋 그대로(이미 그만큼 입음)') */
  const styleTxt = it.slot === 'gift' ? (it.note_ko || '선물') : it.owned ? (st.equip[it.slot] === it.id ? '지금 쓰는 것' : '') : it.gain > 0 ? `멋 +${it.gain}` : '멋 그대로';
  return `<div class="it px ${it.id === SHOPV.sel ? 'gold sel' : ''} ${it.lock ? 'lock' : ''}" data-item-id="${it.lock || it.owned ? '' : it.id}">
      <div class="top2">${icon}${it.owned ? '<span class="own2">✔ 있음</span>' : `<span class="pr">${SH.won(it.price)}</span>`}</div>
      <div class="nm">${esc(it.name_ko)}</div><div class="st" style="${(it.gain > 0 && !it.owned) || it.slot === 'gift' ? '' : 'color:var(--mute)'}">${esc(styleTxt)}</div>
      <div class="tags">${it.lock ? `<span class="tag lock">${esc(it.lock)}</span>` : shopScreen.likes(it)}</div>${it.lock ? '<canvas class="lk" data-icon="lock" data-s="3"></canvas>' : ''}</div>`;
};
// 물건 태그를 좋아하는 · 싫어하는 사람(셋까지)
shopScreen.likes = function (it) {
  const out = [];
  Object.values(SH.CH).forEach(c => { if (c.id === 'hero') return;
    if ((it.tags || []).some(t => (c.likes || []).includes(t))) out.push(`<span class="tag like">♥ ${c.name_ko}</span>`);
    if ((it.tags || []).some(t => (c.dislikes || []).includes(t))) out.push(`<span class="tag hate">✕ ${c.name_ko}</span>`); });
  return out.slice(0, 3).join('');
};
// 거울 둘(캔버스) + 지도에서 걷는 도트 주인공을 거울에 — 화면에 붙인 뒤 부름
shopScreen.mirrors = function (st, sel) {
  const c = pxCanvas(document.getElementById('shop'), 210, 310, 2);
  R(c, '#5a3c24', 0, 0, 210, 310); for (let x = 0; x < 210; x += 14) R(c, '#4a301c', x, 0, 1, 200);
  R(c, '#3a2614', 0, 200, 210, 4); for (let y = 204; y < 310; y += 10) for (let x = 0; x < 210; x += 20) R(c, ((x + y) / 10) % 2 ? '#7a5a3a' : '#6a4a2e', x + (y % 20 ? 10 : 0), y, 20, 10);
  function mirror(x) { R(c, '#c8a040', x, 74, 84, 140); R(c, '#8a6a20', x + 2, 76, 80, 136); R(c, '#cfdde8', x + 4, 78, 76, 132); R(c, '#e8f0f6', x + 8, 82, 10, 60); }
  mirror(10); mirror(114);
  const prevTier = sel && sel.slot === 'suit' ? sel.tier : SH.suitTier(st);
  {   // 지도에서 걷는 도트 주인공을 거울에(옷 색은 단계대로 · 11-12 '그림 결 맞추기')
    const hh = 190, ww = Math.round(HSHEET.cw * hh / HSHEET.ch), mir = (cx, tier, dim) => `<div class="mirhero ${dim ? 'dim' : ''}" style="left:${cx - ww / 2}px;top:${418 - hh}px;width:${ww}px;height:${hh}px;background-image:url(${heroSheetSrc(tier)});background-size:${ww * HSHEET.cols}px ${hh * 4}px"></div>`;
    document.querySelector('.k-shop .prev').insertAdjacentHTML('beforeend', mir(104, SH.suitTier(st), false) + mir(312, prevTier, !(sel && sel.slot === 'suit')));
  }
};
