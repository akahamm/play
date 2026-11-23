// 만든 파일 — 화면 장치 s_assets2.js · s_bgm.js · s_call.js · s_coach.js · s_commodity.js · s_corp.js · s_feel.js · s_life.js · s_listing.js · s_market.js · s_people.js · s_play.js · s_reward.js · s_secretary.js · s_skill.js · s_story2.js · s_trade.js · s_yuna2.js 를 build_data.py 로 붙임(고치려면 원 파일을 고치고 다시 묶음)
/* ── s_assets2.js ── */
/* 자산 장치 화면 s_assets2(개편 차례 6 · 07_재기/개편_자산.md) — 탭 '매물'(대표님 C4 '탭은 재량').
   정보 깊이(D-042): 1단 = 칸 넷(HOUSE · REAL ESTATE · CAR · ART — 이름 + 짧은 상태) · 2단 = 그 칸의 매물 줄 / 내 것 줄 · 3단 = 작은 창(값 · 하는 일 · 시간 멈춤).
   장부 하나(11-22 대표님 승인 · 목업 09_목업/자산통일_1122 H3 · M1 · M2): 집 · 차 · 상가를 사고팔고 이사하는 곳은 여기 하나 · 홈 칸은 보기만(누르면 a2Go 로 이 칸 2단) ·
   BANK 는 홈 MY DEBT 한 곳(1안) — 정기예금 · 게시판 · 내 예금은 a2Bank* 로 홈 은행 화면에 그려 줌(매물 1단엔 BANK 칸 없음).
   설명 글 없음 — 처음 들어올 때 유나 한마디(json lines) · 글 · 숫자는 03_자료/장치/assets2.json · 규칙은 m_assets2.js(window.Toy2Assets2). */
const A2 = () => window.Toy2Assets2, AD = () => A2()?.data();
const a2 = { view: 'top', seg: 'list', page: 0, kind: 'all', sheet: null, last: '', from: null };   /* from = 들어온 탭(홈 칸 표로 들어오면 'home' — 2단 BACK 이 그리로 돌아감 · 11-23 대표님 'BACK 누르면 홈으로 가야 하는데 매물로 감') */
const A2_TOP = ['house', 'estate', 'car', 'art'];
TABS_ALL.push(['assets2', (AD()?.ui.tab) || '매물', () => !!(AD() && g.s.assets2)]);
const a2Icon = f => art('아이콘/' + f);
const a2Pct = v => (Math.round(v * 100) / 100).toFixed(2) + '%';
const a2Mon = m => `${m.slice(0, 4)}.${m.slice(5, 7)}`;
const A2_PER = 8;   /* 2단 한 쪽에 여덟 줄(스크롤 대신 쪽 넘김) */
function a2Open(sheet) { a2.sheet = sheet; pane(); }   /* 시간 멈춤 · 되돌림은 screen.js holdSync 한 곳(작은 창 한 꼴 · 검토 11-22) */
function a2Close(go) {   /* 작은 창은 서서히 사라진 뒤 닫힘(움직임 줄이기면 바로) · 멈췄던 속도는 창이 다 닫힌 뒤 holdSync 가 되돌림 */
 const el = $('#pane .fa-sheet'), done = () => { a2.sheet = null; if (go) go(); else pane(); };
 if (!el || !calMotion()) return done(); el.classList.add('out'); setTimeout(done, 180);
}
const a2Do = (...p) => act('assets2', p);
function a2Lists() {   /* 칸마다 매물 · 내 것 */
 const st = g.s.assets2, my = st.my, D = AD();
 return {
  house: { list: T.houses.filter(h => h.id !== g.s.house).sort((p, q) => g.housePrice(p.id) - g.housePrice(q.id)), mine: [HOUSE[g.s.house]] },   /* 집 값은 그 달 시세(D-074 · g.housePrice 한 곳) */
  estate: { list: st.est.filter(x => a2.kind === 'all' || x.kind === a2.kind).sort((p, q) => p.price - q.price), mine: my.est },
  car: { list: st.cars.slice().sort((p, q) => p.price - q.price), mine: my.cars },
  art: { list: st.arts.slice().sort((p, q) => (p.price || p.est) - (q.price || q.est)), mine: my.arts },
  bank: { list: st.board.slice().sort((p, q) => p.amount - q.amount), mine: [...my.dep.map(d => ({ ...d, dep: true })), ...my.inv] },
  D };
}
function a2Row(k, x, mine) {
 const A = A2(), D = AD(), m = A.monthOf(g), seed = g.s.seed;
 let ic = '', name = '', tags = [], val = '', sub = '';
 if (k === 'house') { const nd = a2HouseNeed(x); return `<button class="a2-row ${mine ? 'mine' : ''}" data-a2pick="${esc(x.id)}" data-a2mine="${mine ? 1 : ''}"><img class="a2-ph" src="${art(x.bg)}" alt=""><span class="a2-nm"><b>${esc(x.name)}</b><small>안락 ${x.comfort} · 달 ${M(x.upkeep)}${nd ? ` · <i class="a2-lock">${emo('🔒')} ${nd}</i>` : ''}</small></span><span class="a2-v">${M(g.housePrice(x.id))}</span><em>›</em></button>`; }
 if (k === 'estate') { const K = A.kindOf(x.kind), G = D.estate.grades.find(q => q.id === x.grade); ic = K.icon; name = x.name; tags = [K.name, `${G.id} ${G.name}`, `${x.size}㎡`]; if (x.urgent && !mine) tags.push('<i class="a2-hot">급매</i>'); if (mine && x.rented) tags.push('<i class="a2-on">임대</i>');
  val = M(mine ? A.estValue(g, x) : x.price); }
 else if (k === 'car') { const C = D.car.classes.find(c => c.id === x.cls); ic = C.icon; name = x.name; tags = [`${Math.round(x.cond)}%`, x.km ? `${(x.km / 1e4).toFixed(1)}만 km` : '새']; if (mine && x.ins) tags.push('<i class="a2-on">보험</i>'); val = M(mine ? A.carValue(seed, m, x) : x.price); }
 else if (k === 'art') { const S = D.art.styles.find(q => q.id === x.style), Rr = D.art.rarity.find(q => q.id === x.rar); ic = S.icon; name = x.title; tags = [x.artist, Rr.name]; if (x.auction && !mine) tags.push('<i class="a2-hot">경매</i>'); val = M(mine ? x.value : x.price || x.est); if (x.auction && !mine) sub = '추정가'; }
 else if (x.dep) { ic = D.ui.icons.deposit; name = `정기예금 ${x.months}M`; tags = [a2Pct(x.rate), `~${a2Mon(x.due)}`]; val = M(x.amt); }
 else if (mine) { ic = D.ui.icons.invest; name = x.name; tags = [`${a2Pct(x.ret)}`, `~${a2Mon(x.due)}`]; val = M(x.amt); }
 else { const lock = g.lvl('wealth') < x.need; ic = D.ui.icons.invest; name = x.name; tags = [x.tier, `${a2Pct(x.ret)}`, `${x.term}M`]; if (lock) tags.push(`<i class="a2-lock">${emo('🔒')} 재력 Lv.${x.need}</i>`); val = M(x.amount); }
 return `<button class="a2-row ${mine ? 'mine' : ''}" data-a2pick="${esc(x.id)}" data-a2mine="${mine ? 1 : ''}"><img src="${a2Icon(ic)}" alt=""><span class="a2-nm"><b>${esc(name)}</b><small>${tags.map(t => t.startsWith('<i') ? t : esc(t)).join(' · ')}</small></span><span class="a2-v">${sub ? `<small>${sub}</small>` : ''}${val}</span><em>›</em></button>`;
}
function a2HouseNeed(x) { return g.lvl('wealth') < x.need ? `재력 Lv.${x.need}` : g.lvl('image') < (x.image || 0) ? `이미지 Lv.${x.image}` : ''; }
const a2HouseCost = x => g.housePrice(x.id) - g.housePrice() * 0.9;   /* 이사 = 새 집 값 − 지금 집 90%(sim.buyHouse 규칙 · 값은 그 달 시세) */
function a2Say(key) {   /* 유나 한마디 — 처음 한 번 · 누르면 닫힘 */
 const st = g.s.assets2, D = AD(); if (st.seen[key]) return '';
 const line = key === 'bank' && g.seniorLvl() < D.invest.odds_lvl ? D.lines.bank_lowlvl : D.lines[key];
 if (line) askHint({ id: 'a2_' + key, face: key === 'estate' ? 'wink' : 'base', text: line, done() { act('assets2', ['seen', key]); } });   /* 처음 한마디 = 유나 말칸 */
 return '';
}
function a2Kv(k, v, c = '') { return `<div class="fa-chg"><span>${k}</span><b class="${c}">${v}</b></div>`; }
function a2Sheet(k, x, mine) {   /* 3단 작은 창 — 값 몇 줄 + 단추 */
 const A = A2(), D = AD(), s = g.s, m = A.monthOf(g), seed = s.seed, E = D.estate, bt = (id, label, off, main) => `<button class="${main && !off ? 'primary' : ''}" data-a2do="${id}" ${off ? 'disabled' : ''}>${label}</button>`;
 let h = '', rows = [], bts = '';
 if (k === 'house') {
  const H0 = HOUSE[s.house], nd = a2HouseNeed(x), cost = a2HouseCost(x); h = esc(x.name);
  rows.push(['안락', `${H0.comfort} → ${x.comfort}`], ['달 유지비', `${M(H0.upkeep)} → ${M(x.upkeep)}`], ['값', M(g.housePrice(x.id))], ['지금 집 팔면', '+' + M(g.housePrice() * 0.9)], ['드는 돈', M(Math.max(0, cost))], ['현금', `${M(s.cash)} → ${M(s.cash - cost)}`]);
  bts = nd ? `<button disabled>${emo('🔒')} ${nd}</button>` : bt('house', '입주', s.cash < cost, true);
 } else if (k === 'estate') {
  const K = A.kindOf(x.kind), G = E.grades.find(q => q.id === x.grade), v = A.estValue(g, x), rent = A.estRent(g, x) * (1 - E.rent_tax);
  h = esc(x.name); rows.push(['종류', `${K.name} · ${G.id} ${G.name} · ${x.size}㎡`], ['상태', `${Math.round(x.cond)}%`]);
  if (!mine) { const cost = x.price * (1 + E.fee_buy); rows.push(['값', M(x.price)], ['드는 돈', M(cost)], ['월세(세후)', '+' + M(rent)], ['재산세 · 해', '−' + M(v * K.tax)]); bts = bt('buy_est', '매수', s.cash < cost, true); }
  else { const pnl = v * (1 - E.fee_sell) - x.paid, rc = A.repairCost(g, x), mc = A.remodelCost(g, x);
   rows.push(['지금 값', M(v)], ['산 값', M(x.paid)], ['팔면', `<span class="${pnl >= 0 ? 'up' : 'dn'}">${pnl >= 0 ? '+' : ''}${M(pnl)}</span>`], ['월세(세후)', x.rented ? '+' + M(rent) : '끔']);
   bts = bt('rent', x.rented ? '임대 중단' : '임대', false, !x.rented) + bt('repair', `수리 ${rc ? M(rc) : ''}`, !rc || s.cash < rc) + bt('remodel', `리모델링 ${mc ? M(mc) : ''}`, !mc || s.cash < mc) + bt('sell_est', '매도', false); }
 } else if (k === 'car') {
  const v = A.carValue(seed, m, x), ins = A.carIns(g, x); h = esc(x.name); rows.push(['상태', `${Math.round(x.cond)}%`], ['주행', x.km ? `${x.km.toLocaleString('ko-KR')} km` : '새']);
  if (!mine) { rows.push(['값', M(x.price)], ['보험 · 달', M(ins)]); bts = bt('buy_car', '매수', s.cash < x.price, true); }
  else { const f = A.carFix(g, x); rows.push(['지금 값', M(v)], ['산 값', M(x.paid)], ['보험 · 달', x.ins ? M(ins) : '끔']); bts = bt('ins', x.ins ? '보험 해지' : '보험 가입', false, !x.ins) + bt('fix_car', `수리 ${f.cost ? M(f.cost) : ''}`, !f.cost || s.cash < f.cost) + bt('sell_car', '매도', false); }
 } else if (k === 'art') {
  const Rr = D.art.rarity.find(q => q.id === x.rar), S = D.art.styles.find(q => q.id === x.style); h = esc(x.title); rows.push(['작가', esc(x.artist)], ['갈래', `${S.name} · ${Rr.name}`]);
  if (!mine && x.auction) { rows.push(['추정가', M(x.est)]); h += `<div class="fa-chips a2-bids">${D.art.bid_steps.map((st, i) => `<button class="${a2.sheet.bid === i ? 'on' : ''}" data-a2bid="${i}">${M(x.est * st)}</button>`).join('')}</div>`;
   const pay = x.est * D.art.bid_steps[a2.sheet.bid ?? 0] * (1 + D.art.buyer_fee); rows.push(['낼 돈', M(pay)]); bts = bt('bid', '입찰', s.cash < pay, true); }
  else if (!mine) { rows.push(['값', M(x.price)]); bts = bt('buy_art', '매수', s.cash < x.price, true); }
  else { rows.push(['지금 값', M(x.value)], ['산 값', M(x.paid)], ['화랑에 팔면', M(x.value * D.art.sell_gallery)]); bts = bt('sell_art:gallery', '매도', false) + bt('sell_art:auction', '경매', false, true); }
 } else if (x.term && !mine && !x.dep && x.ret) {   /* 게시판 제안 */
  const lock = g.lvl('wealth') < x.need, odds = g.seniorLvl() >= D.invest.odds_lvl; h = esc(x.name);
  rows.push(['크기', x.tier], ['넣는 돈', M(x.amount)], ['약속 · 해', a2Pct(x.ret)], ['기간', `${x.term}M`], ['받을 돈', M(x.amount * (1 + x.ret / 100 * x.term / 12))], ['성공', odds ? Math.round(x.p * 100) + '%' : '?']);
  bts = lock ? `<button disabled>${emo('🔒')} 재력 Lv.${x.need}</button>` : bt('join', '합류', s.cash < x.amount, true);
 } else if (x.dep) {
  const el = Math.max(0, Math.min(x.months, A.mi(m) - A.mi(x.from))), early = x.amt + x.amt * D.bank.early / 100 * el / 12 * (1 - D.bank.tax);
  h = `정기예금 ${x.months}M`; rows.push(['맡긴 돈', M(x.amt)], ['이율 · 해', a2Pct(x.rate)], ['만기', a2Mon(x.due)], ['만기에(세후)', M(x.amt + x.amt * x.rate / 100 * x.months / 12 * (1 - D.bank.tax))], ['지금 깨면', M(early)]); bts = bt('dep_close', '닫기', false);
 } else if (mine) { h = esc(x.name); rows.push(['넣은 돈', M(x.amt)], ['약속 · 해', a2Pct(x.ret)], ['결과', a2Mon(x.due)]); }
 else if (x.newDep != null) {   /* 예금 열기 */
  const t = D.bank.terms[x.newDep], rate = A.depRate(g, x.newDep), amt = a2.sheet.amt === 'all' ? Math.floor(s.cash / 1e6) * 1e6 : a2.sheet.amt;
  h = `정기예금 ${t.months}M` + `<div class="fa-chips">${[...D.bank.amounts, 'all'].map(v => `<button class="${a2.sheet.amt === v ? 'on' : ''}" data-a2amt="${v}">${v === 'all' ? '전체' : M(v)}</button>`).join('')}</div>`;
  rows.push(['이율 · 해', a2Pct(rate)], ['만기', a2Mon(A.mk(A.mi(m) + t.months))], ['만기에(세후)', M(amt + amt * rate / 100 * t.months / 12 * (1 - D.bank.tax))], ['현금', `${M(s.cash)} → ${M(Math.max(0, s.cash - amt))}`]);
  bts = bt('dep_open', '가입', !(amt >= D.bank.min) || s.cash < amt, true);
 }
 return `<h2>${h}</h2>${rows.map(r => a2Kv(r[0], r[1])).join('')}<div class="fa-ft"><button data-a2back>뒤로</button>${bts}</div>`;
}
function a2ListHtml(k, seg, L) {   /* 2단 줄(쪽 넘김) — 매물 칸 · 홈 은행이 같이 씀 */
 const A = A2(), D = AD(), mine = seg === 'mine', src = mine ? L[k].mine : L[k].list, pages = Math.max(1, Math.ceil(src.length / A2_PER)); a2.page = Math.min(a2.page, pages - 1);
 if (k === 'bank' && seg === 'deposit') return `<div class="a2-terms">${D.bank.terms.map((t, i) => `<button class="a2-term" data-a2dep="${i}"><small>${t.months}M</small><b>${a2Pct(A.depRate(g, i))}</b><span>가입 ›</span></button>`).join('')}</div>`;
 return src.length ? `<div class="a2-list">${src.slice(a2.page * A2_PER, (a2.page + 1) * A2_PER).map(x => a2Row(k, x, mine)).join('')}</div>${pages > 1 ? `<div class="a2-pg"><button class="sm" data-a2pg="-1" ${a2.page ? '' : 'disabled'}>◀</button><span>${a2.page + 1} / ${pages}</span><button class="sm" data-a2pg="1" ${a2.page < pages - 1 ? '' : 'disabled'}>▶</button></div>` : ''}` : `<div class="a2-empty">—</div>`;
}
function a2SheetHtml(k) { if (!a2.sheet) return ''; const h = `<div class="fa-sheet ${a2.sheet.still ? 'still' : ''}"><div class="fa-dim" data-a2back></div><div class="fa-win a2-win">${a2Sheet(k, a2.sheet.x, a2.sheet.mine)}</div></div>`; a2.sheet.still = true; return h; }   /* 다시 그릴 때(틱 · 고르기)는 나타남을 되풀이하지 않음 */
function a2Bind(k, L) {
 const s = g.s, D = AD();
 on('[data-a2view]', d => { if (d.a2view === 'top' && a2.from) { const f = a2.from; a2.from = null; a2.view = 'top'; a2.sheet = null; return tabTo(f); } a2.view = d.a2view; a2.seg = 'list'; a2.page = 0; a2.sheet = null; pane(); });   /* 홈에서 들어왔으면 BACK = 홈 */
 on('[data-a2seg]', d => { a2.seg = d.a2seg; a2.page = 0; pane(); });
 on('[data-a2kind]', d => { a2.kind = d.a2kind; a2.page = 0; pane(); });
 on('[data-a2pg]', d => { a2.page += +d.a2pg; pane(); });
 on('[data-a2pick]', d => { const src = d.a2mine ? L[k].mine : L[k].list, x = src.find(q => q.id === d.a2pick); if (x && !(k === 'house' && d.a2mine)) a2Open({ x, mine: !!d.a2mine, k }); });
 on('[data-a2dep]', d => a2Open({ x: { newDep: +d.a2dep }, amt: D.bank.amounts[0], k }));
 on('[data-a2amt]', d => { a2.sheet.amt = d.a2amt === 'all' ? 'all' : +d.a2amt; pane(); });
 on('[data-a2bid]', d => { a2.sheet.bid = +d.a2bid; pane(); });
 on('[data-a2back]', () => a2Close());
 on('[data-a2do]', d => { const [what, how] = d.a2do.split(':'), x = a2.sheet.x;
  if (what === 'house') return a2Close(() => act('house', x.id));   /* 이사 — sim.buyHouse 그대로 */
  if (what === 'dep_open') { const amt = a2.sheet.amt === 'all' ? Math.floor(s.cash / 1e6) * 1e6 : a2.sheet.amt; return a2Close(() => a2Do('dep_open', x.newDep, amt)); }
  if (what === 'rent') return a2Close(() => a2Do('rent', x.id, !x.rented));
  if (what === 'ins') return a2Close(() => a2Do('ins', x.id, !x.ins));
  if (what === 'bid') return a2Close(() => a2Do('bid', x.id, a2.sheet?.bid ?? 0));
  const bid = a2.sheet.bid; a2Close(() => a2Do(what, x.id, how ?? bid)); });
}
/* 홈에서 매물 그 칸 2단으로(홈 칸 · H3) — MY SHOP 은 REAL ESTATE(가진 게 있으면 MY · 없으면 상가 매물) */
function a2Go(k) {
 const st = g.s.assets2; a2.view = k; a2.page = 0; a2.sheet = null; a2.kind = 'all'; a2.seg = 'list';
 if (k === 'estate') { if (st?.my.est.length) a2.seg = 'mine'; else a2.kind = 'shop'; }
 if (k === 'car' && st?.my.cars.length) a2.seg = 'mine';
 tabTo('assets2'); a2.from = 'home';   /* 탭을 옮길 때 leave() 가 from 을 비우니 옮긴 뒤에 적음 */
}
/* 홈 은행(MY DEBT · BANK 1안)에 붙는 칸 — 정기예금 · 게시판 · 내 예금과 투자 */
function a2BankSegs() { const L = a2Lists(); return [['deposit', '예금'], ['list', `목록 ${L.bank.list.length}`], ['mine', `내 ${L.bank.mine.length}`]]; }
function a2BankBody(seg) { if (a2.sheet && a2.sheet.k !== 'bank') a2.sheet = null; return a2ListHtml('bank', seg, a2Lists()) + a2Say('bank'); }
function a2BankSheet() { return a2.sheet?.k === 'bank' ? a2SheetHtml('bank') : ''; }
function a2BankBind() { a2Bind('bank', a2Lists()); }
function a2Draw(P) {
 const A = A2(), D = AD(), s = g.s, st = s.assets2; if (!A || !D || !st) { P.innerHTML = ''; return; }
 if (!A2_TOP.includes(a2.view)) a2.view = 'top';
 if (a2.sheet && a2.sheet.k !== a2.view) a2.sheet = null;   /* 홈 은행에서 연 창은 여기서 안 그림 */
 const m = A.monthOf(g), seed = s.seed, L = a2Lists(), view = a2.view + ':' + a2.seg, moved = a2.last.split(':')[0] !== a2.view; a2.last = view;
 const T2 = D.ui.tiles, H0 = HOUSE[s.house];
 let body = '', sheet = '';
 if (a2.view === 'top') {
  const apt = A.seoulAptAvg(seed, m), shopN = st.my.est.filter(A.isShop).length;
  const val = { house: H0.name, estate: st.my.est.length ? `내 ${st.my.est.length}${shopN ? ` · 상가 ${shopN}` : ''}` : `서울 아파트 ${M(apt)}`, car: `${st.cars.length}대${st.my.cars.length ? ' · 내 ' + st.my.cars.length : ''}`, art: `${st.arts.length}점${st.my.arts.length ? ' · 내 ' + st.my.arts.length : ''}` };
  const cnt = { house: 0, estate: st.my.est.length, car: st.my.cars.length, art: st.my.arts.length };
  const bg = { house: H0.bg, estate: T2.estate.bg, car: T2.car.bg, art: T2.art.bg }, ic = { house: T2.house.icon, estate: '집/apt_mid.png', car: '차/import.png', art: '미술/abstract.png' };
  body = `<div class="a2-head"><small>${a2Mon(m)} 매물</small></div><div class="fa-tiles a2-tiles">${A2_TOP.map(k => `<button class="fa-tile" data-a2view="${k}" style="background-image:url('${art(bg[k])}')"><img class="a2-tic" src="${a2Icon(ic[k])}" alt="">${cnt[k] ? `<i class="a2-cnt">${cnt[k]}</i>` : ''}<b>${T2[k].name}</b><small>${esc(val[k])}</small><em>▶</em></button>`).join('')}</div>${a2Say('first')}`;
 } else if (a2.view === 'house') {   /* HOUSE 2단(M2) — 왼쪽 지금 사는 집 · 오른쪽 옮길 집 줄 */
  body = `<div class="fa-crumb"><button class="sm" data-a2view="top">◀ 뒤로</button><b>${T2.house.name}</b></div>
   <div class="a2-house"><div class="a2-hnow"><small>내 집 · 지금</small><span class="a2-hpic" style="background-image:url('${art(H0.bg)}')"></span><b>${esc(H0.name)}</b><small>안락 ${H0.comfort} · 달 ${M(H0.upkeep)}</small></div>${a2ListHtml('house', 'list', L)}</div>${a2Say('house')}`;
  sheet = a2SheetHtml('house');
 } else {
  const k = a2.view, mine = a2.seg === 'mine';
  const segs = [['list', `매물 ${L[k].list.length}`], ['mine', `내 ${L[k].mine.length}`]];
  const kinds = k === 'estate' && !mine ? `<div class="a2-kinds">${[['all', '전체'], ...D.estate.kinds.map(q => [q.id, q.name])].map(([id, n]) => `<button class="sm ${a2.kind === id ? 'on' : ''}" data-a2kind="${id}">${esc(n)}</button>`).join('')}</div>` : '';
  body = `<div class="fa-crumb"><button class="sm" data-a2view="top">◀ 뒤로</button><b>${T2[k].name}</b></div><div class="a2-segs">${segs.map(([id, n]) => `<button class="sm ${a2.seg === id ? 'on' : ''}" data-a2seg="${id}">${n}</button>`).join('')}</div>${kinds}${a2ListHtml(k, a2.seg, L)}${a2Say(k)}`;
  sheet = a2SheetHtml(k);
 }
 P.innerHTML = `<div class="fa-bg" style="background-image:url('${art(a2.view === 'top' || a2.view === 'house' ? H0.bg : T2[a2.view].bg)}')"></div><div class="fa-view ${moved ? 'fa-step' : ''}">${body}</div>${sheet}`;
 a2Bind(a2.view, L);
}
PANES.assets2 = { draw: a2Draw, go: a2Go, bankSegs: a2BankSegs, bankBody: a2BankBody, bankSheet: a2BankSheet, bankBind: a2BankBind,
 leave() { a2.sheet = null; a2.from = null; },   /* 탭을 옮기면 작은 창은 닫힘(2단 줄은 그대로) — 홈 은행에서 연 창도 */
 reset() { Object.assign(a2, { view: 'top', seg: 'list', page: 0, kind: 'all', sheet: null, last: '', from: null }); } };   /* 불러오기 · NEW GAME */
/* 창 — 큰 소식(만기 · 투자 결과 · 하자 · 사고 · 대박 · 경매)은 유나 창 · 작은 것(관리 수리 · 고장)은 한 줄 알림 */
MSGS.assets2 = (m, kit) => {
 const D = AD(), L = D?.lines.msg[m.kind]; if (!L) { $('#over').innerHTML = ''; kit.done(); return null; }
 const head = Toy2.fmt(L.head, { name: m.name || '' });
 if (m.small) { $('#over').innerHTML = ''; floatUp(`${esc(head)} · −${M(m.amount)}`, 'sell', '−'); kit.done(); return null; }
 const sign = ['defect', 'trouble', 'car_break', 'car_crash', 'car_crash_ins'].includes(m.kind) ? '−' : '';
 const rows = kit.kv(m.kind === 'auction_lose' ? '낙찰가' : m.kind === 'art_jump' ? '지금 값' : '금액', sign + M(m.amount), sign ? 'dn' : 'up') + (m.paid ? kit.kv('넣은 돈', M(m.paid)) : '') + (m.mul ? kit.kv('배', '×' + m.mul.toFixed(1)) : '');
 return kit.head(L.tag, L.face || 'base', `<h2>${esc(head)}</h2>${rows}`, esc(L.say));
};

/* ── s_bgm.js ── */
/* 화면 장치 · 소리(bgm · 개편 차례 10 · 07_재기/개편_소리.md) — 화면 상태(제목 · phase · 장면 · 탭 · 시대 mood)를 보고 곡 자리를 고르고 서서히 넘김.
   배정표 · 숫자 · 단추 글은 03_자료/장치/bgm.json(TOY2.dev.bgm) 한 곳. 고르기는 순수 함수(Toy2Bgm.slotOf · pick · next · trim)라 s_bgm_test.js 가 브라우저 없이 봄.
   규칙 쪽은 건드리지 않음 — screen.js 의 맨 위 이름(title · g · tab · T · SND · sfx · HUD · $)만 읽고, 효과음과 겹칠 때 낮추려고 screen.js 효과음 고리(SFX_HOOK)에 등록. */
'use strict';
(function () {
/* ── 고르기(순수) ── */
const SAD = new Set(['away']);
function sceneKind(sc, D) {
 for (const k of Object.keys(D.scenes || {})) { const r = D.scenes[k]; if ((r.ids || []).includes(sc.id) || (r.title && new RegExp(r.title).test(sc.title || ''))) return k; }
 return null;
}
/* st = { title, opening, phase, minute, speed, tab, msg, scene: {id, title} | null, mood, random, dayChg, play, day } → 자리 이름 | null(지금 곡 그대로) */
function slotOf(st, D) {
 if (st.title || st.opening) return 'title';
 if (st.phase === 'end') return 'ending';
 if (st.msg && D.msgs && D.msgs[st.msg]) return D.msgs[st.msg];
 if (st.scene) { const k = sceneKind(st.scene, D); if (k) return k; }   /* 꼬리표 없는 장면은 그 밑 phase 의 곡을 그대로(끊지 않음) */
 if (SAD.has(st.phase)) return 'sad';
 if (st.play) return 'play';
 if (st.phase === 'weekend' || st.phase === 'evening') return (D.tabs_after_close || {})[st.tab] || st.phase;
 if (st.phase === 'open') {
  if (!st.minute && !st.speed) return 'morning';
  const m = (D.mood || {})[st.mood] || 'open_normal';
  if (m === 'open_crash' || (st.dayChg || 0) <= D.crash_day) return 'open_crash';
  if (st.random && m === 'open_normal') return 'random_era';
  return m;
 }
 return null;
}
const listOf = (slot, D) => (D.slots[slot] && D.slots[slot].tracks) || [];
function pick(slot, D, cur, day) { const L = listOf(slot, D); if (!L.length) return null; if (cur && L.includes(cur)) return cur; return L[Math.abs(day | 0) % L.length]; }   /* 같은 자리 안의 곡이면 끊지 않음 · 아니면 날마다 돌아가며 */
function next(slot, D, cur) { const L = listOf(slot, D); if (!L.length) return null; const i = L.indexOf(cur); return L[(i + 1) % L.length]; }
const trim = (id, D) => Math.min(1, Math.pow(10, (D.target_db - D.tracks[id].rms_db) / 20));   /* 곡마다 크게 · 작게 들리는 차이를 맞춤(키우지는 않음) */
const CORE = { slotOf, pick, next, trim, sceneKind };
globalThis.Toy2Bgm = CORE;
if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
if (typeof document === 'undefined') return;

/* ── 틀기(브라우저) ── */
const D = () => (typeof T !== 'undefined' && T.dev && T.dev.bgm) || null;
if (!D()) return;
const KEY = D().key;
const pref = (() => { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && typeof v.on === 'boolean') return { on: v.on, v: Math.max(0, Math.min(D().vol_steps.length - 1, v.v | 0)) }; } catch { /* 못 읽으면 기본 */ } return { on: true, v: D().vol_default }; })();
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch { /* 못 써도 이번 화면에선 그대로 */ } };
let voices = [], curId = null, curSlot = null, blocked = false, duckUntil = 0, duckNow = 1, bad = new Set();
const ease = f => f * f * (3 - 2 * f);
function src(id) { return (typeof SND !== 'undefined' ? SND + 'bgm/' : D().dir) + encodeURIComponent(D().tracks[id].file); }
function tryPlay(v) { if (document.hidden) return; const p = v.a.play();   /* 숨은 창에선 안 틂 */ if (p && p.catch) p.catch(e => { if (e && e.name === 'NotAllowedError') blocked = true; }); }
function start(id) {
 if (id === curId) return; voices.forEach(v => { v.dir = -1; }); curId = id; if (!id || bad.has(id)) return;
 const a = new Audio(); a.preload = 'auto'; a.src = src(id); const v = { a, id, f: 0, dir: 1 };
 a.onended = () => { if (v.dir < 0) return; const n = next(curSlot, D(), id); if (!n || n === id) { a.currentTime = 0; tryPlay(v); } else start(n); };
 a.onerror = () => { bad.add(id); v.dir = -1; if (curId === id) curId = null; };   /* 못 불러와도 게임은 그대로 · 소리만 없음 */
 voices.push(v); tryPlay(v);
}
function stopAll() { voices.forEach(v => { v.dir = -1; }); curId = null; }
const STEP = 50;
setInterval(() => {   /* 서서히 넘김 · 낮춤 — 움직임 줄이기와 별개(소리 설정) */
 const d = D(), now = Date.now(), want = now < duckUntil ? d.duck.to : 1, dm = want < duckNow ? d.duck.in_ms : d.duck.out_ms;
 duckNow += Math.sign(want - duckNow) * Math.min(Math.abs(want - duckNow), STEP / dm);
 const master = d.vol_steps[pref.v];
 voices = voices.filter(v => {
  v.f = Math.max(0, Math.min(1, v.f + v.dir * STEP / d.fade_ms));
  if (v.f <= 0 && v.dir < 0) { try { v.a.pause(); v.a.removeAttribute('src'); v.a.load(); } catch { /* 이미 멈춤 */ } return false; }
  try { v.a.volume = Math.max(0, Math.min(1, ease(v.f) * master * trim(v.id, d) * duckNow)); } catch { /* 소리 칸 없음 */ }
  return true;
 });
}, STEP);
function snap() {
 const s = g && g.s; if (!s) return { title: true };
 const m0 = s.msgs && s.msgs[0]; let scene = null, era = {}, dayChg = 0;
 if (m0 && m0.type === 'scene') { const sc = ((T.story && T.story.scenes) || []).find(x => x.id === m0.id); scene = { id: m0.id, title: (sc && sc.title) || '' }; }
 try { era = g.era() || {}; } catch { /* 옛 판 */ }
 try { if (s.phase === 'open' && s.market && s.market.idx) dayChg = g.index() / s.market.idx - 1; } catch { /* 시장 칸 없음 */ }
 return { title: !!title, opening: !!$('#app .op'), phase: s.phase, minute: s.minute, speed: s.speed, tab, msg: m0 && m0.type, scene, mood: era.mood, random: !!era.random, dayChg, play: !!$('#over .pl-v, #over .pl-bust'), day: s.day | 0 };
}
function tickBgm() {
 if (!pref.on) { if (curId) stopAll(); return; }
 if (document.hidden) return;   /* 숨은 창은 곡을 새로 고르지 않음 */
 let st; try { st = snap(); } catch { return; }
 const slot = slotOf(st, D()); if (!slot) return;
 const id = pick(slot, D(), curId, st.day);
 curSlot = slot; if (id && id !== curId) start(id);
}
setInterval(tickBgm, 400);
CORE.now = () => ({ slot: curSlot, id: curId, on: pref.on, v: pref.v, blocked, duck: +duckNow.toFixed(2), voices: voices.map(v => ({ id: v.id, f: +v.f.toFixed(2), dir: v.dir, vol: +v.a.volume.toFixed(3), paused: v.a.paused, t: +v.a.currentTime.toFixed(1) })) });   /* 콘솔에서 지금 곡 보기 */
/* 창(브라우저 탭)이 숨으면 곡을 멈추고 돌아오면 그 자리부터 이어 틂(검토 11-22 '창 둘이면 bgm 겹침') */
document.addEventListener('visibilitychange', () => { if (document.hidden) voices.forEach(v => { try { v.a.pause(); } catch { /* 이미 멈춤 */ } }); else if (pref.on) { voices.filter(v => v.dir > 0).forEach(tryPlay); tickBgm(); } });
const wake = () => { if (!blocked) return; blocked = false; voices.filter(v => v.dir > 0).forEach(tryPlay); };   /* 브라우저 자동 재생 막힘 — 첫 눌림에 다시 틈 */
addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true);

/* 효과음과 겹칠 때 bgm 을 잠깐 낮춤 */
if (typeof SFX_HOOK !== 'undefined') SFX_HOOK.push(name => { const h = D().duck.hold_ms[name]; if (h && pref.on) duckUntil = Math.max(duckUntil, Date.now() + h); });   /* 효과음이 나면 bgm 을 잠깐 낮춤(screen.js 효과음 고리) */

/* ── 단추(위 띠 · 제목 화면) ── */
const bars = () => D().vol_steps.map((_, i) => i <= pref.v ? '▮' : '▯').join('');
function paint(el) { const u = D().ui, on = el.querySelector('.bgm-on'), vb = el.querySelector('.bgm-vol'); on.textContent = pref.on ? u.on : u.off; on.classList.toggle('off', !pref.on); on.setAttribute('aria-pressed', String(pref.on)); vb.innerHTML = `<small>${u.vol}</small>${bars()}`; vb.disabled = !pref.on; }
function box(id) {
 const el = document.createElement('div'); el.className = 'bgmbox'; el.id = id; el.innerHTML = '<button class="bgm-on" type="button"></button><button class="bgm-vol" type="button" aria-label="음량"></button>';
 el.addEventListener('click', e => e.stopPropagation()); el.addEventListener('keydown', e => e.stopPropagation());
 el.querySelector('.bgm-on').onclick = () => { pref.on = !pref.on; keep(); document.querySelectorAll('.bgmbox').forEach(paint); if (pref.on) { curId = null; tickBgm(); } else stopAll(); };
 el.querySelector('.bgm-vol').onclick = () => { pref.v = (pref.v + 1) % D().vol_steps.length; keep(); document.querySelectorAll('.bgmbox').forEach(paint); };
 paint(el); return el;
}
CORE.box = box;   /* 설정 창(s_feel.js SETTINGS · SOUND)도 같은 단추 — 같은 값(pref) */
HUD.push(() => { const top = $('header.top'); if (!top || $('#h-bgm')) return; top.insertBefore(box('h-bgm'), top.querySelector('.tmenu')); });
setInterval(() => { const t = $('#app .title'); if (t && !$('#t-bgm')) t.appendChild(box('t-bgm')); }, 400);
})();

/* ── s_call.js ── */
/* 전화 창(11-23 대표님 목업 C1b 'C1로 · 휴대폰 정 중앙 · 유나는 홈에서 가이드해 줄 때처럼 작은 아이콘으로' · 09_목업/전화창_1123) — screen.js msgBox 'call' 이 부름
   가운데 휴대폰(수신 고리 · 얼굴 · 이름 · 관계 · 대사 · 거절 / 받기 둥근 단추와 그 결과) + 오른쪽 아래 유나 얼굴 아이콘과 말칸(홈 안내와 같은 꼴) · 단추 id n · y 는 msgBox 가 묶음
   어둠은 공용 층(screen.js veilOverSync '.call-wrap') · 결과 값은 자료(numbers.rel_meet · rel_gift · rel_call_no · meet_cost) */
function callPhone(m, P, rel) {
 const s = g.s, up = N.rel_meet + (s.gift ? N.rel_gift : 0), fc = yunaImg('base', 'call-yi', false, '');
 return `<div class="call-wrap" data-k="call-${m.who}-${s.day}"><div class="call-ph"><div class="call-notch"></div><div class="call-sb"><span>${nowHM(s) || ''}</span><span>▮▮▮</span></div>
  <div class="call-inc">전화 왔어요</div><div class="call-ring"><i></i><i></i><i></i><img src="${face(P.portrait)}" alt=""></div>
  <div class="call-nm">${esc(P.name)}</div><div class="call-rel">${rel}</div><div class="call-q">"오늘 저녁 한잔 어때?"</div>
  <div class="call-bt"><button id="n" class="call-no"><b>✕</b>오늘은 안 돼<em>관계 ${N.rel_call_no}</em></button><button id="y" class="call-ok"><b>✆</b>좋지<em>관계 +${up} · ${M(N.meet_cost)} 원</em></button></div></div>
  ${fc ? `<div class="call-y"><span class="call-yf">${fc}</span><div class="call-yb"><div class="call-yn">${esc(SNAME)}</div><p>${esc(P.name)} 님 전화예요. 오늘 한잔하자시네요.</p></div></div>` : ''}</div>`;
}
/* 귀띔 창(11-23 대표님 피드백 22 '전화 오는 거랑 똑같이' → 시연 ㉮ '전화꼴' · 09_목업/귀띔창_1123) — 전화 창과 같은 휴대폰 + 유나 아이콘 말칸 · 수신 고리는 귀띔 색(금빛) · 단추 하나(id ok → msgBox 가 묶음)
   말 한 줄 아래 종목 칩(오름 ▲ 초록 · 내림 ▼ 빨강) · 내부 정보면 유나 걱정 얼굴 + 경고 말 · 유나 말 say 는 msgBox 가 넘김(이미 꾸민 글) */
function tipPhone(m, P, rel, say) {
 const s = g.s, nm = esc(ST[m.stock].name), fc = yunaImg(m.insider ? 'worry' : 'base', 'call-yi', false, '');
 return `<div class="call-wrap tip-wrap" data-k="tip-${m.who}-${s.msgs.length}-${s.day}"><div class="call-ph tip-ph"><div class="call-notch"></div><div class="call-sb"><span>${nowHM(s) || ''}</span><span>▮▮▮</span></div>
  <div class="call-inc">귀띔 왔어요</div><div class="call-ring"><i></i><i></i><i></i><img src="${face(P.portrait)}" alt=""></div>
  <div class="call-nm">${esc(P.name)}</div><div class="call-rel">${rel}</div><div class="call-q">"${nm}, ${esc(tipLine(m.dir))}"</div>
  <span class="tip-stk ${m.dir > 0 ? '' : 'dn'}">${nm} ${m.dir > 0 ? '▲' : '▼'}</span><button class="tip-ok" id="ok"><b>✓</b>알았어</button></div>
  ${fc ? `<div class="call-y"><span class="call-yf">${fc}</span><div class="call-yb"><div class="call-yn">${esc(SNAME)}</div><p>${say}</p></div></div>` : ''}</div>`;
}

/* ── s_coach.js ── */
/* 안내(코치 · 유나 한마디 · 화면 장치 · 11-23 대표님 '큰 파일 나누기 — 나눠') — screen.js 의 coachState ~ tut 구간을 통째로 옮김 · 동작 그대로 · 안내 시험(coach_test.js)은 이 파일을 통째로 읽음 */
function coachState(s) {
 if (!s.uiCoach) s.uiCoach = { first: s.tut === 99 || s.day > 0 ? T.coach.first.length : 0, seen: {}, off: false };
 s.uiCoach.seen ||= {};
 return s.uiCoach;
}
function takeCoach(s, id) {
 const c = coachState(s);
 if (c.off || c.seen[id]) return false;
 c.seen[id] = true;
 return true;
}
function laterReady(id, s, currentTab, choosing) {
 const m = s.msgs[0]?.type, clear = !s.msgs.length;
 if (id === 'choice') return choosing;
 if (id === 'month') return m === 'month';
 if (id === 'year') return m === 'year';
 if (id === 'susp') return (m === 'corp_law' && s.msgs[0].step === 'warn') || (clear && s.susp >= N.susp_warn);   /* 감독 경고 창(감독 길 하나 · D-071) */
 if (!clear) return false;
 if (id === 'evening') return s.phase === 'evening';
 if (id === 'weekend') return s.phase === 'weekend';
 if (id === 'tip') return currentTab === 'market' && s.shown.some(f => f.day === s.day && f.kind === 'tip');   /* 짚는 뉴스 띠가 트레이딩에만 있음 */
 if (id === 'speed') return s.day === 1 && s.phase === 'open';
 return id.startsWith('tab_') && s.phase === 'open' && currentTab === id.slice(4);
}
function coachHole(r, sr, k, W, H) {
 const x = Math.max(6, Math.min(W - 6, (r.left - sr.left) / k - 8));
 const y = Math.max(6, Math.min(H - 6, (r.top - sr.top) / k - 8));
 return { x, y, w: Math.max(0, Math.min(W - 6, (r.right - sr.left) / k + 8) - x), h: Math.max(0, Math.min(H - 6, (r.bottom - sr.top) / k + 8) - y) };
}
function coachBoxAt(hole, W, H, bw, bh) {   /* 말칸 자리 — 오른쪽 · 아래에서 잰 거리(r · b) · 기본 · 칸 위 · 칸 왼쪽 · 칸 아래 · 오른쪽 위 가운데 짚는 칸을 덜 덮는 곳 */
 const at = (r, b) => ({ r, b, x: W - r - bw, y: H - b - bh }), ok = p => p.x >= 6 && p.y >= 6 && p.r >= 6 && p.b >= 6, cover = p => Math.max(0, Math.min(p.x + bw, hole.x + hole.w) - Math.max(p.x, hole.x)) * Math.max(0, Math.min(p.y + bh, hole.y + hole.h) - Math.max(p.y, hole.y));
 const opts = [at(36, 86), at(36, H - hole.y + 16), at(W - hole.x + 16, 86), at(36, H - hole.y - hole.h - 16 - bh), at(36, H - bh - 90)].filter(ok);   /* 네 끝 모두 화면 안인 자리만(11-23 피드백 19: 짚는 칸이 화면 거의 전체면 '칸 아래'가 화면 밖인데 덮는 넓이 0이라 골라져 NEXT 를 못 누름) · 다 겹치면 기본 자리 */
 return opts.reduce((a, p) => cover(p) < cover(a) ? p : a, opts[0] || at(36, 86));
}
let tutShown = null, laterActive = null;
const yTip = s => goodToday(s).find(f => f.kind === 'tip' && f.who === 'sec') || goodToday(s).find(f => f.kind === 'tip');   /* 첫 거래 = 유나 귀띔 종목(결정 D-075 ① · 아무 좋은 소식 말고) */
/* 처음 한 번 유나 한마디(11-22 대표님 '비서가 가이드하는 것 모두를 하단 유나 아이콘 옆 말칸에서만') — 판이 그릴 때 askHint 로 올리고,
   코치 안내가 없을 때 같은 말칸에 하나씩 뜸 · 짚을 칸(target)이 있으면 그 칸만 밝힘 · 판을 다시 그리면 그 판 것만 남음 */
const HINTS = [];
function askHint(h) { if (h && h.text && !HINTS.some(x => x.id === h.id)) HINTS.push(h); }
const GUIDE_NM = () => typeof SNAME !== 'undefined' ? SNAME : '';
function tut() {
 let el = $('#tut'); if (!el) { el = document.createElement('div'); el.id = 'tut'; $('#stage').appendChild(el); }
 const hide = () => { el.innerHTML = ''; el.className = ''; tutShown = null; veilReq('tut', null); };
 if (title || !g) { laterActive = null; hide(); return; }
 const s = g.s, c = coachState(s), choosing = !!$('.scene-ch');
 if (c.off || $('.tcard, .calfx:not(.out)')) { hide(); return; }   /* 시간 카드 · 일력이 떠 있는 동안 안내는 숨음 */
 if (laterActive && !laterReady(laterActive.id, s, tab, choosing)) laterActive = null;
 let st = null, first = false;
 // 거래를 마치지 못했어도 장 마감 뒤에는 저녁 안내로 이어진다.
 if (s.phase !== 'open' && c.first < T.coach.first.length) c.first = T.coach.first.length - 1;
 // 장면의 첫 선택은 첫 거래 안내보다 먼저 만날 수도 있다.
 if (!s.msgs.length && c.first < T.coach.first.length && (s.phase === 'open' || c.first === T.coach.first.length - 1)) {
  const done = { market: () => tab === 'market', play: () => s.speed > 0 || goodToday(s).length > 0,
   buy: () => !!c.bought, bought: () => s.speed > 0, sell: () => !!c.sold };   /* '샀어요!'는 ▶ 로만 넘어감(11-23 대표님 '다음 버튼 없이 플레이 버튼 하나만') */
  while (T.coach.first[c.first] && done[T.coach.first[c.first].id]?.()) { if (T.coach.first[c.first].id === 'buy') c.seen.tip = true; c.first++; }   /* 스스로 먼저 사서 '사기' 걸음을 건너뛰어도 귀띔 안내는 첫 거래가 겸한 것으로(검토 '끝난 뒤 귀띔 살펴볼까요?가 또 뜸') */
  st = T.coach.first[c.first]; first = !!st;
  if (st?.tab && tab !== st.tab) { tab = st.tab; pane(); hud(true); }   /* 탭 둘러보기(11-20 대표님 '이 게임이 뭔지 · 각 탭이 뭔지부터') — 그 탭을 직접 열어 보여 줌 */
  if (st?.id === 'buy' && (!yTip(s) || s.speed || tab !== 'market')) st = null;
  if (st?.id === 'buy') c.seen.tip = true;   /* 첫 거래가 귀띔 안내를 겸함 — 튜토리얼 뒤에 또 안 뜸 */
  if (st?.id === 'sell' && tab === 'market' && c.bought && g.price(c.bought) <= s.avg[c.bought] * (1 + N.sell_cost + 0.03)) st = { id: 'sell_wait', target: '#pp', face: st.face, title: '조금만 더 지켜봐요', say: '값이 더 오르면 팔아 볼게요. 위 ▶ 로 흐름을 보세요.', act: true };   /* NEXT 없음 — 누르면 팔기 걸음을 건너뜀(11-20 끝까지 점검) · 장이 닫히면 마지막 걸음으로 */   /* 기다리는 동안 끊긴 것처럼 보이지 않게(11-20 대표님 '그 뒤로 튜토리얼이 더 뜨지 않음') */
  else if (st?.id === 'sell' && (tab !== 'market' || !c.bought)) st = null;   /* 귀띔 소식이 값에 실린 뒤에(시험관 '+0.8% 에서 팔라 해 귀띔 뜻이 무너짐') */   /* 안내대로 팔면 이익이 나게(시험관 '팔았는데 −4만') */
  if (st && ['buy', 'sell'].includes(st.id)) {
   sel = st.id === 'buy' ? yTip(s).stock : c.bought; focusAll = false; selC = null; mkList = 'stocks';
   if (s.speed) { g.dispatch('speed', 0); loop(); }
   marketLive(true);
  }
 }
 if (!st) {
  first = false;
  if (['s0100', 's0101', 's0102'].includes(g.s.msgs[0]?.id)) { hide(); return; }   /* 유나를 만나기 전(회상 · 백 여사 · 고시원 장면)엔 코치 창을 안 띄움 */
  st = laterActive || T.coach.later.find(x => !c.seen[x.id] && laterReady(x.id, s, tab, choosing) &&
   (x.id === 'choice' || c.first >= T.coach.first.length) && $$(x.id === 'susp' && !s.msgs.length ? '[data-lfk="susp"]' : x.target).some(e => e.offsetParent));
  if (st && !laterActive && takeCoach(s, st.id)) { laterActive = st; save(); }
 }
 let hint = null;
 if (!st && !s.msgs.length && HINTS.length && !g.storyPending()) { hint = HINTS[0]; st = { id: 'hint_' + hint.id, title: hint.title || '', say: hint.text, face: hint.face, target: hint.target && $$(hint.target).some(x => x.offsetParent) ? hint.target : null }; }
 if (!st || (g.storyPending() && st.id !== 'choice')) { hide(); return; }
 const target = st.id === 'susp' && !s.msgs.length ? '[data-lfk="susp"]' : first && st.tab ? (st.hl || '#pane') : st.target;
 const tgt = target ? $$(target).find(x => x.offsetParent) : null;
 if (target && !tgt) { hide(); return; }
 const key = (first ? 'first_' : 'later_') + st.id;
 const stage = $('#stage'), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth;
 const W = stage.offsetWidth, H = stage.offsetHeight;
 const hole = tgt ? coachHole(tgt.getBoundingClientRect(), sr, k, W, H) : null;
 if (tutShown !== key) {
  tutShown = key; save();
  const total = first ? `<span class="tn">${c.first + 1} / ${T.coach.first.length}</span>` : '';   /* 제목 앞 번호 · 튜토리얼 끄기는 뺌(11-20 대표님) */
  const fc = yunaImg(st.face, 'cface', false, '');
  const inner = `${fc ? `<div class="cnm">${esc(GUIDE_NM())}</div>` : ''}<div class="chead">${st.title ? `<b>${esc(st.title)}</b>` : ''}${total}</div><p>${emoText(st.say)}</p><div class="cbtns">${st.act ? '' : `<button class="btnp" id="tutok">${hint ? '확인' : '다음'}</button>`}</div>`;
  const keep = [...el.querySelectorAll('.cdim, .chole, .cbox')].map(x => x.style?.cssText || '');   /* 앞 걸음의 덮개 · 짚는 칸 · 창 자리 */
  el.innerHTML = `<div class="cdim"></div><div class="cdim"></div><div class="cdim"></div><div class="cdim"></div><div class="chole"></div><div class="cbox">${fc ? `<span class="cfc">${fc}</span>` : ''}<div class="cin swap">${inner}</div></div>`;
  if (keep.some(Boolean)) { [...el.querySelectorAll('.cdim, .chole, .cbox')].forEach((x, i) => { if (keep[i] && x.style) x.style.cssText = keep[i]; }); void el.offsetWidth; }   /* 앞 자리에서 새 자리로 옮겨 가고 글은 서서히(11-20 대표님 '딱딱 넘어감') */
  if ($('#tutok') && hint) $('#tutok').onclick = () => { HINTS.shift(); tutShown = null; hint.done?.(); tut(); };
  else if ($('#tutok')) $('#tutok').onclick = () => { if (first) { const cur = T.coach.first[c.first]; if (cur?.tab) c.seen['tab_' + cur.tab] = true; c.first++; } else laterActive = null; save(); tutShown = null; tut(); };
 }
 el.className = 'on' + (st.act ? ' act' : '') + (hint ? ' hint' : '');   /* 말칸은 늘 유나 얼굴 왼쪽(꾸밈 #tut .cbox) — 짚는 칸만 밝힘 */
 const d = [...el.querySelectorAll('.cdim')], ho = el.querySelector('.chole'), box = el.querySelector('.cbox');
 const bw = box.offsetWidth, bh = box.offsetHeight;
 if (hole) {
  d[0].style.cssText = `left:0;top:0;width:${W}px;height:${hole.y}px`;
  d[1].style.cssText = `left:0;top:${hole.y + hole.h}px;width:${W}px;height:${H - hole.y - hole.h}px`;
  d[2].style.cssText = `left:0;top:${hole.y}px;width:${hole.x}px;height:${hole.h}px`;
  d[3].style.cssText = `left:${hole.x + hole.w}px;top:${hole.y}px;width:${W - hole.x - hole.w}px;height:${hole.h}px`;
  ho.style.cssText = `display:block;left:${hole.x}px;top:${hole.y}px;width:${hole.w}px;height:${hole.h}px`;
  const bx = Math.max(6, Math.min(W - bw - 6, hole.x + hole.w / 2 - bw / 2));
  const by = Math.max(6, Math.min(H - bh - 6, hole.y + hole.h + bh + 16 <= H - 6 ? hole.y + hole.h + 16 : hole.y - bh - 16));
  box.style.cssText = `left:${bx}px;top:${by}px`;
  { /* 말칸 자리(꾸밈 #tut .cbox · 기본 오른쪽 아래) — 짚는 칸과 겹치면 그 칸 위 · 왼쪽 · 오른쪽 위 가운데 덜 덮는 곳으로(검토 11-22 'MY DEBT · 사기 · 팔기 · GOALS 끝 줄을 덮음') */
   const best = coachBoxAt(hole, W, H, bw, bh);
   if (best.r !== 36) box.style.right = best.r + 'px'; if (best.b !== 86) box.style.bottom = best.b + 'px'; }
 } else if (hint) { d.forEach(x => x.style.cssText = 'display:none'); ho.style.cssText = 'display:none'; box.style.cssText = '';   /* 짚을 칸 없는 한마디는 덮개 없이 말칸만 */
 } else {
  d[0].style.cssText = `left:0;top:0;width:${W}px;height:${H}px`;
  d.slice(1).forEach(x => x.style.cssText = 'display:none'); ho.style.cssText = 'display:none';
  box.style.cssText = `left:${Math.max(6, (W - bw) / 2)}px;top:${Math.max(6, (H - bh) / 2)}px`;
 }
 veilReq('tut', hole ? { a: 0.5, z: 69, hole: { x: hole.x, y: hole.y, w: hole.w, h: hole.h } } : hint ? null : { a: 0.5, z: 69 });   /* 어둠은 공용 층 하나(screen.js veilReq) — 덮개 .cdim 은 누름만 막음 */
}

/* ── s_commodity.js ── */
/* 화면 장치 · 원자재(개편 차례 3) — 탭 하나(원자재 여섯 카드 · 고른 것 사고팔기) · 값과 매매는 장치 m_commodity.js(g.dispatch('cmd', …)) */
TABS_ALL.push(['cmd', '원자재']);
let cmdSel = 'wti';
const cmdMod = () => (globalThis.Toy2Mods || []).find(m => m.name === 'commodity');
const cmdIcon = c => art('아이콘/원자재/' + c.icon + '.png'), cmdW = p => p == null ? '—' : p < 1e5 ? won(p) + '원' : M(p);   /* 가스처럼 작은 값은 원 단위로 */
function cmdTrade(side, f) {
 const c = T.commodities.find(x => x.id === cmdSel); if (!g.dispatch('cmd', [side, cmdSel, f])) return floatUp(`${esc(c.name)} · ${g.s.phase === 'open' ? '아니요' : '마감'}`, 'sys', '×', 'sys');
 const t = g.s.lastCmd; sfx('page');
 floatUp(`${esc(c.name)} ${side === 'buy' ? '매수' : '매도'} ${won(t.q)}${t.pnl ? ` · <b class="${t.pnl >= 0 ? 'up' : 'dn'}">${t.pnl >= 0 ? '+' : ''}${M(t.pnl)}</b>` : ''}`, side, '₩'); save(); hud(true);
}
PANES.cmd = {
 draw(P) {
  P.innerHTML = `<div class="cm-wrap"><div class="cm-grid">${T.commodities.map(c => `<button class="cm-card ${c.id === cmdSel ? 'on' : ''}" data-cm="${c.id}"><img src="${cmdIcon(c)}" alt=""><b>${esc(c.name)}</b><span class="cm-p" data-cmp="${c.id}"></span><span class="cm-ch" data-cmc="${c.id}"></span><small class="cm-h" data-cmh="${c.id}"></small></button>`).join('')}</div>
   <div class="cm-act"><div class="cm-sel"><img id="cm-ic" alt=""><div><b id="cm-name"></b><small id="cm-hold"></small></div></div><div class="cm-btns">${[0.1, 0.25, 0.5].map(f => `<button class="primary" data-cmbuy="${f}">매수 ${f * 100}%</button>`).join('')}${[0.5, 1].map(f => `<button data-cmsell="${f}">매도 ${f === 1 ? '전체' : '50%'}</button>`).join('')}</div></div></div>`;
  on('[data-cm]', d => swapView(() => { cmdSel = d.cm; PANES.cmd.draw(P); }));
  on('[data-cmbuy]', d => cmdTrade('buy', +d.cmbuy)); on('[data-cmsell]', d => cmdTrade('sell', +d.cmsell));
  PANES.cmd.live(true);
 },
 live() {
  const md = cmdMod(); if (!md || !$('.cm-grid')) return; const s = g.s, open = s.phase === 'open';
  for (const c of T.commodities) {
   const p = md.price(g, c.id), p0 = s.day ? md.price(g, c.id, s.day - 1) : p, h = s.cmd?.[c.id]?.q || 0, ch = p0 ? p / p0 - 1 : 0;
   const ep = $(`[data-cmp="${c.id}"]`), ec = $(`[data-cmc="${c.id}"]`), eh = $(`[data-cmh="${c.id}"]`); if (!ep) continue;
   ep.textContent = cmdW(p); ec.textContent = `${ch >= 0 ? '+' : '−'}${Math.abs(ch * 100).toFixed(2)}%`; ec.className = 'cm-ch ' + (ch >= 0 ? 'up' : 'dn'); eh.textContent = h ? `× ${won(h)}` : '';
  }
  const c = T.commodities.find(x => x.id === cmdSel), mine = s.cmd?.[cmdSel] || { q: 0, avg: 0 }, p = md.price(g, cmdSel), pnl = mine.q ? mine.q * p - mine.q * mine.avg : 0;
  $('#cm-ic').src = cmdIcon(c); $('#cm-name').textContent = `${c.name} · ${cmdW(p)} / ${c.unit}`;
  $('#cm-hold').innerHTML = mine.q ? `${won(mine.q)} ${esc(c.unit)} · ${M(mine.q * p)} · <b class="${pnl >= 0 ? 'up' : 'dn'}">${pnl >= 0 ? '+' : '−'}${M(Math.abs(pnl))}</b>` : '';
  $$('[data-cmbuy],[data-cmsell]').forEach(b => { b.disabled = !open || (!!b.dataset.cmsell && !mine.q); });
 },
};

/* ── s_corp.js ── */
/* 회사 · 권력 화면(개편 차례 7 · 규칙 m_corp.js · 글은 03_자료/장치/corp.json 의 ui · say · note_tag) — 탭 '경영' 하나 + 창 다섯(corp_note · corp_ev · corp_ask · corp_agm · corp_law) + 위 띠 칩(고발 · 거래 정지).
   첫 화면엔 내 회사 카드(또는 창업 카드) · 이사회 · 사건 셋만 · 누르면 2단 시트(STAFF · DEPT · ACTIONS · DEALS) — 홈 장부(D-042)와 같은 깊이. 설명 글 없음 · 처음 한 번은 유나 한마디(say.first_tab). */
'use strict';
(function () {
const CP = () => Toy2Corp.load(), UI = () => CP().ui, cs = () => g.s.corp;
const cpArt = k => art(CP().art.icons[k] || ''), cpBg = k => `background-color:${CP().art.fallback};background-image:url('${art(CP().art[k])}')`;
let cpView = 'top', cpShown = '', cpSize = 'small', cpOwn = 1, cpSector = null;
const bar = (n, v, cls = '') => `<div class="cp-bar ${cls}"><span>${esc(n)}</span><i><i style="width:${Math.max(0, Math.min(100, v)).toFixed(1)}%"></i></i><b>${Math.round(v)}</b></div>`;
const kv = (k, v, c = '') => `<div class="cp-kv"><span>${esc(k)}</span><b class="${c}">${v}</b></div>`;
const dleft = d => Math.max(0, d - g.s.day);

TABS_ALL.push(['corp', CP() ? UI().tab : '경영', () => { const c = cs(); if (!c) return false; return !!(c.co || g.s.cash >= CP().found.open_tab_cash || Object.keys(c.board).length || c.kase || Object.keys(c.ban).length); }]);

function foundCard() { const c = cs(), F = CP().found, u = UI(), cost = Math.round(F.sizes[cpSize].value * cpOwn), rest = dleft(c.cool); cpSector ||= CP().sectors[0].id;
 return `<div class="cp-pnl cp-main"><h3><img src="${cpArt('startup')}" alt="">${u.startup}</h3><div class="cp-hero" style="${cpBg('bg_office')}"></div>
  <div class="cp-form"><div class="cp-fr"><span>크기</span>${['small', 'large'].map(z => `<button class="sm ${cpSize === z ? 'on' : ''}" data-cpz="${z}">${u[z]} · ${M(F.sizes[z].value)}</button>`).join('')}</div>
  <div class="cp-fr"><span>${u.stake}</span>${[0.2, 0.3, 0.5, 1].map(o => `<button class="sm ${cpOwn === o ? 'on' : ''}" data-cpo="${o}">${o * 100}%</button>`).join('')}</div>
  <div class="cp-fr cp-sec"><span>${u.sector}</span>${CP().sectors.map(x => `<button class="sm ${cpSector === x.id ? 'on' : ''}" data-cps="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  ${kv(u.cost, M(cost) + ' 원', g.s.cash < cost ? 'dn' : '')}${rest ? kv(u.cool, rest + u.days) : ''}
  <button class="primary big cp-go" data-cpfound ${g.s.cash < cost || rest || g.s.phase === 'away' ? 'disabled' : ''}>${u.found}</button></div></div>`; }

function coCard() { const co = cs().co, u = UI(), B = co.bars, last = co.last;
 const badge = [co.role === 'ceo' ? u.ceo : u.holder, co.strike ? u.strike : '', co.ipo ? u.ipo : ''].filter(Boolean).map(t => `<em>${t}</em>`).join('') + (co.ipo && co.role === 'ceo' ? `<button class="sm primary cp-list" data-cpipo ${g.s.phase === 'away' ? 'disabled' : ''}>${u.list}</button>` : '');
 const tiles = [['staff', u.staff, `${co.staff.length} / ${Toy2Corp.staffCap(co)}`], ['dept', u.dept, u.lv + Toy2Corp.levelSum(co)], ['actions', u.actions, co.act || co.rnd ? u.pending : ''], ['deals', u.deals, cs().pend.length ? u.pending : co.deals.length]];
 return `<div class="cp-pnl cp-main"><h3><img src="${cpArt('office')}" alt="">${esc(co.name)}<small>${esc(CP().sectors.find(x => x.id === co.sector)?.name || '')}</small>${badge}</h3>
  <div class="cp-top"><div class="cp-hero sm" style="${cpBg('bg_office')}"></div><div class="cp-stats">${kv(u.value, M(Toy2Corp.equity(co)))}${kv(u.reserve, M(co.reserve), co.reserve < 0 ? 'dn' : '')}${kv(u.pts, won(co.pts))}${kv(u.last, last ? (last.net >= 0 ? '+' : '−') + M(Math.abs(last.net)) : '—', last && last.net < 0 ? 'dn' : 'up')}${kv(u.own, (co.own * 100).toFixed(1) + '%')}</div>
  <div class="cp-bars">${['mor', 'pro', 'res', 'bra', 'img'].map(k => bar(u.bars[k], B[k])).join('')}${bar(u.trust, co.trust, co.trust < 20 ? 'low' : 'tr')}</div></div>
  <div class="cp-tiles">${tiles.map(([k, n, v]) => `<button class="cp-tile" data-cpv="${k}" ${co.role !== 'ceo' && k !== 'actions' ? 'disabled' : ''}><img src="${cpArt({ staff: 'staff', dept: 'board', actions: 'research', deals: 'merger' }[k])}" alt=""><b>${n}</b><small>${v}</small></button>`).join('')}</div></div>`; }

function sideCard() { const c = cs(), u = UI(), rows = Object.entries(c.board).filter(([id]) => g.ST[id] && g.listed(id));
 const brd = rows.map(([id, B]) => `<div class="cp-brow"><b>${esc(ST[id].name)}</b><small>${(g.stake(id) * 100).toFixed(1)}%${B.seat || g.s.gate[id] >= 2 ? ' · ' + u.seat : ''}${B.ceo || g.s.gate[id] >= 3 ? ' · ' + u.ceo : ''}</small>${bar(u.sup, B.sup)}
  ${B.ceo && g.s.gate[id] < 3 ? `<div class="cp-pol">${Object.entries(POL).map(([k, n]) => `<button class="sm ${g.s.policy[id] === k ? 'on' : ''}" data-cppol="${id}:${k}">${n}</button>`).join('')}</div>` : ''}</div>`).join('');
 const k = c.kase, law = CP().law, bans = Object.entries(c.ban).filter(([, d]) => d > g.s.day);
 const kase = k ? `<div class="cp-case"><img src="${cpArt('gavel')}" alt=""><b>${esc(CP().law_text[k.kind])}</b><small>${esc(ST[k.stock]?.name || '')} · D-${dleft(k.end)} · ${u.lawyer} ${u.lv}${k.lawyer}</small>${k.lawyer < law.lawyer_max ? `<button class="sm" data-cplaw ${g.s.cash < Toy2Corp.lawyerFee(k.lawyer + 1) ? 'disabled' : ''}>${u.hire_lawyer || u.lawyer} ${M(Toy2Corp.lawyerFee(k.lawyer + 1))}</button>` : ''}</div>` : '';
 const ban = bans.map(([id, d]) => `<div class="cp-ban"><img src="${cpArt('halt')}" alt=""><b>${esc(ST[id].name)}</b><small>${u.ban} D-${dleft(d)}</small></div>`).join('');
 return `<div class="cp-pnl cp-side" style="${cpBg('bg_board')}"><h3><img src="${cpArt('board')}" alt="">${u.board}</h3><div class="cp-srows">${brd}${kase}${ban}</div></div>`; }

/* ── 2단 시트 ── */
function sheet(view) { const co = cs().co, u = UI(), D = CP(), K = Toy2Corp; if (!co) return '';
 const back = `<div class="cp-sh"><h2>${u[view]}</h2><button class="sm" data-cpback>${u.back}</button></div>`;
 if (view === 'staff') { const dn = d => d < 0 ? u.free : D.dept[d].name;
  const row = p => `<div class="cp-srow"><b>${esc(p.name)}</b><span class="cp-st">지력 ${p.int} · 정밀 ${p.prec} · 매력 ${p.cha} · 경험 ${p.xp}</span>${bar(u.bars.mor, p.mood)}<span>${M(p.pay)}</span><button class="sm" data-cpjob="${p.id}">${esc(dn(p.job))}</button><button class="sm cp-lite" data-cpfire="${p.id}">${u.fire}</button></div>`;
  const pool = (p, i) => `<div class="cp-srow pool"><b>${esc(p.name)}</b><span class="cp-st">지력 ${p.int} · 정밀 ${p.prec} · 매력 ${p.cha} · 경험 ${p.xp}</span><span></span><span>${M(K.askPay(co, p))}</span><button class="sm primary" data-cphire="${i}" ${co.staff.length >= K.staffCap(co) ? 'disabled' : ''}>${u.hire}</button><span></span></div>`;
  return back + `<div class="cp-list">${co.staff.map(row).join('')}${co.pool.length ? `<h4>${u.pool}</h4>` + co.pool.map(pool).join('') : ''}</div>`; }
 if (view === 'dept') { const e = K.effs(co);
  return back + `<div class="cp-list">${D.dept.map((d, i) => { const lv = co.dept[i], cost = d.cost[lv]; return `<div class="cp-drow"><b>${esc(d.name)}</b><span>${u.lv}${lv}</span><span class="cp-grade">${D.grade[K.tier(e[i]) - 1] || '—'}</span><span>${co.staff.filter(p => p.job === i).length + (i === 0 && co.role === 'ceo' ? 1 : 0)} / ${K.seats(co, i) + (i === 0 ? 1 : 0)}</span>
   ${lv < D.dept_upgrade.max_level ? `<button class="sm" data-cpup="${i}" ${co.reserve < cost ? 'disabled' : ''}>${u.upgrade} ${M(cost)}</button>` : '<span></span>'}</div>`; }).join('')}</div>`; }
 if (view === 'actions') { const b = K.bonus(co), need = n => b[D.dept.findIndex(d => d.id === n[0])] >= n[1], busyA = co.act ? D.menu.improve.find(x => x.id === co.act.id) : null, busyR = co.rnd ? D.menu.rnd.find(x => x.id === co.rnd.id) : null;
  const rk = Math.max(D.menu.rnd_cost[0], Math.round(co.value / D.menu.rnd_cost[1]) * D.menu.rnd_cost[2]);
  const imp = D.menu.improve.map(a => `<button class="cp-act" data-cpimp="${a.id}" ${co.role !== 'ceo' || co.act || !need(a.need) ? 'disabled' : ''}><b>${esc(a.name)}</b><small>${busyA === a ? u.pending + ' D-' + co.act.left : esc(D.dept.find(d => d.id === a.need[0]).name) + ' ★' + a.need[1]}</small></button>`).join('');
  const rnd = D.menu.rnd.map(p => `<button class="cp-act" data-cprnd="${p.id}" ${co.role !== 'ceo' || co.rnd || !need(p.need) || co.pts < rk ? 'disabled' : ''}><b>${esc(p.name)}</b><small>${busyR === p ? u.pending + ' D-' + co.rnd.left : rk + ' pt'}</small></button>`).join('');
  const sp = co.split.map((v, i) => `<div class="cp-sp"><span>${esc(u.split[i])}</span><button class="sm" data-cpsp="${i}:-5" ${co.role !== 'ceo' ? 'disabled' : ''}>−</button><b>${v}%</b><button class="sm" data-cpsp="${i}:5" ${co.role !== 'ceo' ? 'disabled' : ''}>+</button></div>`).join('');
  const add = [1e7, 1e8, 1e9].map(a => `<button class="sm" data-cpadd="${a}" ${g.s.cash < a ? 'disabled' : ''}>${u.add} ${M(a)}</button>`).join('');
  return back + `<div class="cp-acts"><h4>${u.improve}</h4><div class="cp-grid">${imp}</div><h4>${u.rnd}</h4><div class="cp-grid">${rnd}</div><h4>${u.split.join(' · ')}</h4><div class="cp-grid sp">${sp}</div>
   <div class="cp-foot">${add}<span></span>${co.role === 'ceo' ? `<button class="sm cp-lite" data-cpresign>${u.resign}</button>` : ''}<button class="sm cp-lite" data-cpsell>${u.sell} ${M(K.stakeV(co) * 0.9)}</button></div></div>`; }
 if (view === 'deals') { const Dl = D.deal, wait = cs().pend.length || g.s.day < (co.dealCd || 0);
  const row = (t, i) => { const cap = t.value * t.hype, offers = [['buy', 1.2], ['merge', 0.6]].map(([k, m]) => { const x = Math.round(cap * m); return `<button class="sm ${k === 'buy' ? 'primary' : ''}" data-cpdeal="${i}:${k}:${x}" ${wait || co.reserve < x ? 'disabled' : ''}>${u[k]} ${M(x)} · ${Math.round(K.dealChance(g, co, t, k, x))}%</button>`; }).join('');
   return `<div class="cp-drow deal"><b>${esc(t.name)}</b><span>${t.listed ? 'KOSPI · ' : ''}${esc(D.sectors.find(x => x.id === t.sector)?.name || '')}</span><span>${M(cap)}</span><span class="${t.profit < 0 ? 'dn' : 'up'}">${(t.profit * 100).toFixed(0)}%</span><span class="cp-db">${offers}</span></div>`; };
  return back + `<div class="cp-list">${cs().pend.map(p => `<div class="cp-drow"><b>${esc(p.t.name)}</b><span>${u.pending}</span><span>D-${dleft(p.at)}</span><span></span><span></span></div>`).join('')}${co.deals.map(row).join('')}</div>`; }
 return ''; }

PANES.corp = {
 leave() { cpView = 'top'; cpShown = ''; }, reset() { cpView = 'top'; cpShown = ''; },   /* 탭을 옮기거나 판이 바뀌면 경영 창(2단)은 닫힘(검토 11-22) */
 draw(P) { const c = cs(); if (!c) { P.innerHTML = ''; return; } if (!c.co && cpView !== 'top') cpView = 'top';
  if (c.co && !c.saidTab) { c.saidTab = true;   /* 회사가 생긴 뒤 처음 열 때 유나 한마디(회사 없을 땐 안내 글 없음 · 새 눈 11-22 판단 거리 9) */ g.msg({ type: 'corp_note', key: 'first_tab' }); setTimeout(() => { save(); refresh(); }, 0); }
  const sh = cpView !== 'top' ? sheet(cpView) : '';
  P.innerHTML = `<div class="fa-bg" style="${cpBg('bg_office')}"></div><div class="cp-wrap">${c.co ? coCard() : foundCard()}${sideCard()}</div>${sh ? `<div class="fa-sheet cp-sheet ${cpShown === cpView ? 'still' : ''}"><div class="fa-dim" data-cpback></div><div class="db-wrap cp-win">${sh}</div></div>` : ''}`;
  cpShown = sh ? cpView : '';
  const close = go => { const el = $('.cp-sheet'); if (!el || !calMotion()) return go(); el.classList.add('out'); setTimeout(go, 180); };
  on('[data-cpz]', d => { cpSize = d.cpz; pane(); }); on('[data-cpo]', d => { cpOwn = +d.cpo; pane(); }); on('[data-cps]', d => { cpSector = d.cps; pane(); });
  on('[data-cpfound]', () => { if (act('corp', ['found', cpSize, cpOwn, cpSector])) sfx('page'); });
  on('[data-cpv]', d => { cpView = d.cpv; pane(); }); on('[data-cpback]', () => close(() => { cpView = 'top'; pane(); }));
  on('[data-cphire]', d => act('corp', ['hire', +d.cphire])); on('[data-cpfire]', d => act('corp', ['fire', +d.cpfire]));
  on('[data-cpjob]', d => { const co = c.co, p = co.staff.find(x => x.id === +d.cpjob), n = CP().dept.length; for (let k = 1; k <= n + 1; k++) { const j = ((p.job + 1 + k) % (n + 1)) - 1; if (j < 0 || co.staff.filter(x => x.job === j).length < Toy2Corp.seats(co, j)) { act('corp', ['assign', p.id, j]); break; } } });
  on('[data-cpup]', d => act('corp', ['upgrade', +d.cpup])); on('[data-cpimp]', d => act('corp', ['improve', d.cpimp])); on('[data-cprnd]', d => act('corp', ['rnd', d.cprnd]));
  on('[data-cpsp]', d => { const [i, dv] = d.cpsp.split(':').map(Number), v = [...c.co.split]; v[i] = Math.max(0, Math.min(100, v[i] + dv)); const rest = v.reduce((n, x, k) => k === i ? n : n + x, 0); if (rest) for (let k = 0; k < 4; k++) if (k !== i) v[k] = v[k] / rest * (100 - v[i]); act('corp', ['split', v]); });
  on('[data-cpadd]', d => act('corp', ['add', +d.cpadd])); on('[data-cpresign]', () => act('corp', ['resign'])); on('[data-cpsell]', () => { cpView = 'top'; act('corp', ['sell']); });
  on('[data-cpipo]', () => { if (act('corp', ['ipo'])) sfx('page'); });
  on('[data-cpdeal]', d => { const [i, k, x] = d.cpdeal.split(':'); act('corp', ['deal', +i, k, +x]); });
  on('[data-cppol]', d => { const [id, p] = d.cppol.split(':'); act('corp', ['policy', id, p]); }); on('[data-cplaw]', () => act('corp', ['lawyer'])); },
 live(full) { if (full && cpView === 'top' && cs()?.co) { const el = $('.cp-stats'); if (el) { const tmp = document.createElement('div'); tmp.innerHTML = coCard(); const nw = tmp.querySelector('.cp-stats'); if (nw) el.innerHTML = nw.innerHTML; } } },
};

/* ── 창 ── */
const st = id => esc(ST[id]?.name || '');
MSGS.corp_note = (m, k) => { const D = CP(), key = m.key, co = cs()?.co;
 const name = m.name || (m.stock ? ST[m.stock]?.name : '') || (key === 'rnd_done' ? D.menu.rnd.find(x => x.id === m.id)?.name : key === 'act_done' ? D.menu.improve.find(x => x.id === m.id)?.name : key === 'upgrade' ? D.dept[m.d]?.name : key === 'ev_auto' ? D.ev_text[m.id]?.[0] : co?.name) || '';
 const extra = (m.k != null ? `<div class="cp-grade big">${D.grade[m.k]}</div>` : '') + (m.price ? k.kv(UI().sell, M(m.price), '') : '') + (m.score != null ? k.kv(UI().agm, m.score + ' / 30') : '');
 return k.head(D.note_tag[key] || '회사', D.note_face[key] || 'base', `<h2>${esc(name)}</h2>${extra}`, esc(key === 'ev_auto' ? D.ev_text[m.id]?.[1] : D.say[key] || '')); };
MSGS.corp_ev = (m, k) => { const D = CP(), [t, txt] = D.ev_text[m.id] || [m.id, ''], u = UI();
 return { html: k.head('회사 사건', 'base', `<h2>${esc(t)}</h2>${m.cost ? k.kv(u.cost, M(m.cost), cs()?.co?.reserve < m.cost ? 'dn' : '') : ''}`, esc(txt)), btns: `<button class="primary" id="cp-y">${u.ev[0]}</button><button id="cp-n">${u.ev[1]}</button>`,
  bind() { $('#cp-y').onclick = () => act('corp', ['ans', true]); $('#cp-n').onclick = () => act('corp', ['ans', false]); } }; };
MSGS.corp_ask = (m, k) => { const D = CP(), u = UI(), lab = u['ask_' + m.kind] || [u.ev[0], u.ev[1]];
 const body = m.kind === 'raise' ? `<h2>${esc(m.name)}</h2>${k.kv(u.pay, '+' + Math.round((D.staff.raise_mul - 1) * 100) + '%')}` : m.kind === 'offer' ? `<h2>${esc(cs()?.co?.name || '')}</h2>${k.kv(u.sell, M(m.price))}` : m.kind === 'ceo' ? `<h2>${st(m.stock)}</h2>${k.kv(u.ceo, '')}` : `<h2>${esc(cs()?.co?.name || '')}</h2>${k.kv(u.trust, Math.round(cs()?.co?.trust || 0))}`;
 const say = D.say[{ raise: 'raise_ask', offer: 'offer', ceo: 'ceo_offer', revolt: 'revolt_ask' }[m.kind]] || '';
 return { html: k.head(m.kind === 'offer' ? 'M&A' : m.kind === 'ceo' ? 'CEO' : m.kind === 'revolt' ? '이사회' : '직원', m.kind === 'revolt' ? 'worry' : 'base', body, esc(say)),
  btns: `<button class="primary" id="cp-y">${lab[0]}</button><button id="cp-n">${lab[1]}</button>`, bind() { $('#cp-y').onclick = () => act('corp', ['ans', true]); $('#cp-n').onclick = () => act('corp', ['ans', false]); } }; };
/* 주총 — 질문 셋을 한 장씩(답을 고르면 다음 질문으로 넘어감 · 셋째 답에서 결과) */
MSGS.corp_agm = (m, k) => { const D = CP(), u = UI(), picks = (m.uiPicks ||= []), i = picks.length, q = D.agm_q[m.qs[i]];
 return { html: k.head(u.agm + ' ' + (i + 1) + ' / 3', 'base', `<h2>${st(m.stock)}</h2><div class="bn-q">"${esc(q.q)}"</div><div class="cp-ans">${q.a.map((a, j) => `<button data-cpans="${j}">${esc(a[0])}</button>`).join('')}</div>`, i ? '' : esc(D.say.agm)), btns: `<button id="cp-skip">${u.skip}</button>`,
  bind() { on('[data-cpans]', d => { picks.push(+d.cpans); if (picks.length < 3) { save(); msgBox(m); } else act('corp', ['agm', m.stock, picks]); }); $('#cp-skip').onclick = () => act('msgdone'); } }; };
MSGS.corp_law = (m, k) => { const D = CP(), u = UI(), good = m.step === 'acquit';
 const body = `<h2>${esc(u.law_step[m.step])}</h2>${k.kv(esc(D.law_text[m.kind] || ''), st(m.stock))}${m.until ? k.kv(u.until, 'D-' + dleft(m.until)) : ''}${m.fine ? k.kv(u.fine, M(m.fine), 'dn') : ''}${m.days ? k.kv(u.jail, m.days + u.days) : ''}`;
 const say = D.say[m.step + '_' + m.kind] || D.say[m.step] || ''; const kase = cs()?.kase, fee = kase ? Toy2Corp.lawyerFee(kase.lawyer + 1) : 0;   /* 갈래마다 다른 말이 있으면 그것(의심 점수 경고 warn_susp · 종목 없음) */
 return { html: k.head(m.step === 'warn' || m.step === 'charge' ? '공지' : '판결', good ? 'wink' : 'worry', body, esc(say)),
  btns: m.step === 'charge' && kase && kase.lawyer < D.law.lawyer_max ? `<button id="cp-law" ${g.s.cash < fee ? 'disabled' : ''}>${u.hire_lawyer || u.lawyer} ${M(fee)}</button><button class="primary" id="ok">확인</button>` : `<button class="primary" id="ok">확인</button>`,
  bind() { if ($('#cp-law')) $('#cp-law').onclick = () => { g.dispatch('corp', ['lawyer']); act('msgdone'); }; } }; };

/* ── 위 띠 칩 — 고발 · 거래 정지가 있을 때만 ── */
HUD.push(full => { if (!full) return; const c = cs(), mon = $('.mon'); if (!mon) return; let el = $('#cp-chip'); const k = c?.kase, bans = c ? Object.values(c.ban).filter(d => d > g.s.day).length : 0;
 if (!k && !bans) { if (el) el.remove(); return; } if (!el) { el = document.createElement('button'); el.id = 'cp-chip'; el.className = 'sm'; mon.appendChild(el); el.onclick = () => { tab = 'corp'; cpView = 'top'; pane(); hud(true); }; }
 el.innerHTML = `${k ? `<img src="${cpArt('gavel')}" alt="">D-${dleft(k.end)}` : ''}${bans ? `<img src="${cpArt('halt')}" alt="">${UI().ban} ${bans}` : ''}`; });
})();

/* ── s_feel.js ── */
/* 편의 화면 장치(개편 차례 10 · 07_재기/개편_연출.md) — 설정 창(SETTINGS: MOTION · DEFAULT SPEED · SOUND) · 저장 슬롯(QUICK · SLOT 1 ~ 3 · AUTO 매달 · 불러오기 화면).
   숫자 · 글은 03_자료/장치/feel.json(TOY2.dev.feel) 한 곳 · 규칙(sim.js)은 안 건드림 — screen.js 맨 위 이름(g · title · tab · lastSpeed · Game · N · DAYS · save · store · drawGame · drawTitle · floatUp · M · esc · $ · TITLE_BTNS · MENU_BTNS · HUD)만 씀.
   슬롯 한 칸 = 지금 저장(g.save · localStorage[N.save_key])과 같은 꼴(JSON.stringify(g.s))을 다른 열쇠에 둔 것 · 칸 정보(날짜 · 순자산 · 저장 시각)는 따로 한 열쇠(key_meta).
   연출 끄기(MOTION OFF) = 기기의 움직임 줄이기와 똑같이: html.calm + 모든 꼴 파일의 '@media (prefers-reduced-motion:reduce)' 규칙을 html.calm 앞머리로 한 벌 더 깔고, screen.js calMotion() 이 html.calm 도 봄. */
'use strict';
(function () {
const D = () => (T.dev && T.dev.feel) || null;
if (!D()) return;
const U = () => D().ui, LS = store(), NS = () => D().news_stop || null;
const read = (k, d) => { try { const v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch { return d; } };
const write = (k, v) => { try { LS.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch { return false; } };

/* ── 설정 ── */
const pref = Object.assign({}, D().settings_default, read(D().key_settings, {}));
const keepPref = () => write(D().key_settings, pref);
const SP = N.speeds.filter(n => n > 0);
const sysCalm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function mirrorCalm() {   /* 움직임 줄이기 규칙을 html.calm 앞머리로 한 벌 — 장치 꼴이 늘어도 다시 안 고침 */
 if (document.getElementById('calm-css')) return; const out = [];
 const pre = sel => { const parts = []; let d = 0, cur = ''; for (const ch of sel) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts.map(x => x.trim()).filter(Boolean).map(x => /^(html|:root)\b/.test(x) ? x.replace(/^(html|:root)/, 'html.calm') : 'html.calm ' + x).join(','); };
 const walk = (rules, inside) => { for (const r of rules) {
  if (r.type === CSSRule.MEDIA_RULE) { if (/prefers-reduced-motion\s*:\s*reduce/.test(r.media.mediaText)) walk(r.cssRules, true); else walk(r.cssRules, inside); }
  else if (inside && r.type === CSSRule.STYLE_RULE) out.push(`${pre(r.selectorText)}{${r.style.cssText}}`);
  else if (inside && r.type === CSSRule.KEYFRAMES_RULE) out.push(r.cssText); } };
 for (const sh of document.styleSheets) { try { walk(sh.cssRules, false); } catch { /* 다른 곳 글꼴 꼴은 못 읽음 — 움직임 없음 */ } }
 const st = document.createElement('style'); st.id = 'calm-css'; st.textContent = out.join('\n'); document.head.appendChild(st);
}
const applyCalm = () => { document.documentElement.classList.toggle('calm', !!pref.calm); if (pref.calm) mirrorCalm(); };
applyCalm();
if (SP.includes(pref.speed)) lastSpeed = pref.speed;   /* 기본 속도 — ▶ 를 처음 누를 때 이 속도로 */

/* ── 슬롯 ── */
const SL = () => D().slots, slotKey = id => D().key_slot + id;
const meta = () => read(D().key_meta, {});
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const ymdOf = s => s.phase === 'weekend' ? wkISO(s.slot, s.day) : DAYS[s.day];   /* 주말엔 그 토 · 일 날짜(위 띠와 같은 셈 · screen.js wkISO — 규칙 g.weekendDate 가 있으면 그것) */
function saveSlot(id) {
 if (!g) return false; let ok = g.save({ setItem: (k, v) => { if (!write(slotKey(id), v)) throw Error('full'); } });
 if (ok) { const m = meta(); m[id] = { ymd: ymdOf(g.s), name: g.s.name, nw: Math.round(g.netWorth()), at: stamp(), ver: N.version }; ok = write(D().key_meta, m); }
 return ok;
}
const peek = id => Game.load({ getItem: () => LS.getItem(slotKey(id)) });   /* 판 버전이 다르면 null */
function loadSlot(id) {
 const G = peek(id); if (!G) return false;
 clearInterval(timer); timer = null; g = G; g.s.speed = 0; save();   /* 불러온 판이 지금 판(이어 하기 저장)이 됨 */
 document.querySelectorAll('#stage .visit,#stage .calfx,#stage .tcard').forEach(x => x.remove()); $('#over').innerHTML = ''; $('#over').classList.remove('wait');
 title = false; seen = 0; tab = 'home'; autoSeen = null; drawGame(); return true;
}
const slotName = id => (SL().find(x => x.id === id) || {}).name || id;
let autoSeen = null;
HUD.push(() => { if (!g) return; const mo = DAYS[g.s.day].slice(0, 7); if (autoSeen && autoSeen.g === g && autoSeen.mo !== mo && g.s.phase !== 'end') saveSlot('auto'); autoSeen = { g, mo }; });   /* 자동 — 새 달로 넘어간 그 순간 한 번 */

/* ── 창 틀(창 · 장면과 같은 결: 서서히 나타나고 사라짐 · 키는 아래 화면에 안 닿음) ── */
let box = null, boxKey = null, resume = 0;
function closeBox() {
 if (!box) return; const el = box; box = null; removeEventListener('keydown', boxKey, true);
 el.classList.add('out'); setTimeout(() => el.remove(), calMotion() ? 200 : 0);
 if (resume && g && !title && g.s.phase === 'open' && !g.s.msgs.length) { g.dispatch('speed', resume); save(); loop(); hud(true); } resume = 0;
}
function openBox(html, bind) {
 const again = !!box; if (box) { box.remove(); removeEventListener('keydown', boxKey, true); }
 if (!again && g && !title && g.s.speed) { resume = g.s.speed; g.dispatch('speed', 0); save(); loop(); hud(true); }   /* 창이 떠 있는 동안 장은 멈춤 · 닫으면 다시 */
 const el = document.createElement('div'); el.className = 'fe-box' + (again ? ' again' : ''); el.innerHTML = `<div class="fe-pn">${html}</div>`;
 el.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === el) closeBox(); });
 el.addEventListener('click', e => e.stopPropagation());
 boxKey = e => { if (e.target.closest && e.target.closest('input,textarea')) return; e.stopImmediatePropagation(); if (e.key === D().keys.close) { e.preventDefault(); closeBox(); } };
 addEventListener('keydown', boxKey, true); $('#stage').appendChild(el); box = el;
 el.querySelectorAll('[data-fe-x]').forEach(b => b.onclick = closeBox); bind(el);
}

/* SETTINGS — MOTION · DEFAULT SPEED · SOUND · NEWS STOP(판이 열려 있을 때만 · 판 저장 칸) */
function settings() {
 const u = U(), seg = (name, list, cur) => `<div class="fe-seg">${list.map(([v, t]) => `<button class="sm ${String(v) === String(cur) ? 'on' : ''}" data-${name}="${v}">${esc(t)}</button>`).join('')}</div>`;
 openBox(`<header><b>${u.settings}</b><button class="sm" data-fe-x>${u.close}</button></header>
  <div class="fe-row"><span>${u.motion}</span>${seg('mo', [[1, u.on], [0, u.off]], pref.calm ? 0 : 1)}${sysCalm() ? `<small class="fe-chip">${u.system_reduced}</small>` : ''}</div>
  <div class="fe-row"><span>${u.speed}</span>${seg('sp', SP.map(n => [n, '×' + n]), SP.includes(pref.speed) ? pref.speed : 1)}</div>
  <div class="fe-row"><span>${u.sound}</span><div class="fe-snd"></div></div>${g && !title && NS() ? `<div class="fe-row"><span>${u.news_stop}</span>${seg('ns', NS().options.map(v => [v, u.ns[v]]), newsStop())}</div>` : ''}`, el => {
  const B = globalThis.Toy2Bgm; if (B && B.box) el.querySelector('.fe-snd').appendChild(B.box('fe-bgm'));   /* 소리 = 위 띠 · 제목 화면의 bgm 단추와 같은 값(s_bgm.js) */
  el.querySelectorAll('[data-mo]').forEach(b => b.onclick = () => { pref.calm = b.dataset.mo === '0'; keepPref(); applyCalm(); settings(); });
  el.querySelectorAll('[data-ns]').forEach(b => b.onclick = () => { setNewsStop(b.dataset.ns); settings(); });   /* 장중 뉴스 멈춤(D-073) — 판 저장 칸(screen.js setNewsStop) */
  el.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { pref.speed = +b.dataset.sp; keepPref(); lastSpeed = pref.speed; if (g && !title && g.s.speed) { g.dispatch('speed', lastSpeed); save(); loop(); } if (!title) hud(true); settings(); });
 });
}

/* SAVE / LOAD */
function slots(onTitle, ask) {
 const u = U(), m = meta(), can = g && g.s.phase !== 'end' && !onTitle;
 const row = sl => { const x = m[sl.id], has = x && LS.getItem(slotKey(sl.id)) != null, old = has && x.ver !== N.version;
  return `<div class="fe-slot ${has ? '' : 'empty'}"><div class="fe-sn"><b>${esc(sl.name)}</b>${sl.keys ? `<small>${esc(sl.keys)}</small>` : ''}</div>
   <div class="fe-si">${has ? `<b>${esc(x.ymd.replace(/-/g, '.'))}</b><span>${esc(x.name || '')} · ${u.nw} ${M(x.nw)}</span><small>${old ? u.old : esc(x.at)}</small>` : `<span class="fe-empty">${u.empty}</span>`}</div>
   <div class="fe-sb">${sl.kind !== 'auto' && can ? `<button class="sm" data-sv="${sl.id}">${u.save}</button>` : ''}<button class="sm primary" data-ld="${sl.id}" ${has && !old ? '' : 'disabled'}>${u.load}</button></div></div>`; };
 openBox(`<header><b>${onTitle ? u.load : u.slots}</b><button class="sm" data-fe-x>${u.close}</button></header><div class="fe-slots">${SL().map(row).join('')}</div>
  ${ask ? `<div class="fe-ask"><span>${esc(slotName(ask))} · ${u.ask_load}</span><button class="sm" data-ask-n>${u.back}</button><button class="sm primary" data-ask-y>${u.ok}</button></div>` : ''}`, el => {
  el.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { const ok = saveSlot(b.dataset.sv); floatUp(`${esc(slotName(b.dataset.sv))} · ${ok ? u.saved : u.fail}`, 'sys', ok ? '✓' : '!', 'sys'); slots(onTitle); });
  el.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { const live = g && g.s.phase !== 'end'; if (live && ask !== b.dataset.ld) return slots(onTitle, b.dataset.ld); doLoad(b.dataset.ld); });
  if (ask) { el.querySelector('[data-ask-n]').onclick = () => slots(onTitle); el.querySelector('[data-ask-y]').onclick = () => doLoad(ask); }
 });
}
function doLoad(id) { const u = U(); resume = 0; closeBox(); if (loadSlot(id)) floatUp(`${esc(slotName(id))} · ${u.loaded}`, 'sys', '✓', 'sys'); else floatUp(`${esc(slotName(id))} · ${u.old}`, 'sys', '!', 'sys'); }

/* 단추 · 키 */
TITLE_BTNS.push({ id: 't-load', label: U().load, go: () => slots(true) }, { id: 't-set', label: U().settings, go: () => settings() });
MENU_BTNS.push({ id: 'm-slots', label: U().slots, go: () => slots(false) }, { id: 'm-set', label: U().settings, go: () => settings() });
addEventListener('keydown', e => {   /* QUICK — F5 저장 · F9 불러오기(TICKER88 꼴) */
 const k = D().keys; if (e.key !== k.quick_save && e.key !== k.quick_load) return; e.preventDefault(); if (box || e.repeat) return; const u = U();
 if (e.key === k.quick_save) { if (title || !g || g.s.phase === 'end') return; const ok = saveSlot('quick'); floatUp(`빠른 · ${ok ? u.saved : u.fail}`, 'sys', ok ? '✓' : '!', 'sys'); }
 else if (LS.getItem(slotKey('quick')) != null) doLoad('quick');
});
globalThis.Toy2Feel = { pref, settings, slots, saveSlot, loadSlot, meta, slotKey };   /* 콘솔 · 시험용 */
})();

/* ── s_life.js ── */
/* 생활 화면(개편 차례 4 · 규칙 m_life.js · 숫자 · 글 03_자료/장치/life.json) — 등록판으로만 붙임: 탭 TABS_ALL · PANES.life · 창 MSGS.life_* · 달 정산 줄 MONTH_ROWS · 위 띠 HUD(한 줄 알림).
   첫 화면 덩어리 넷(MOOD · SPEND · Lv. · TRIP — D-042) · 여행 고르기는 3단 작은 창(시간 멈춤) · 설명 글 없이 이름 · 값 · 짧은 상태만(D-020) · 처음 볼 때 유나 한 마디(글은 life.json says.first).
   자료(TOY2.dev.life)가 없으면 탭도 창도 안 생김(묶기 전 브라우저). */
(function () {
 const LD = () => T.dev?.life, LF = () => globalThis.Toy2Life, ok = () => !!(LD() && g?.s?.life);
 const icon = n => art('아이콘/' + n + '.png');
 const bar = (k, name, v, cls) => `<div class="lf-bar ${cls}" data-lfk="${k}">${cls === 'su' ? '<span class="lf-ni"></span>' : `<img src="${icon(cls === 'st' ? '생활/stress' : cls === 'cf' ? '생활/comfort' : '생활/happy')}" alt="">`}<span class="lf-bn">${name}</span><i><i style="width:${Math.round(v)}%"></i></i><b>${Math.round(v)}</b></div>`;
 let sheet = null;
 TABS_ALL.push(['life', '생활', () => ok()]);
 PANES.life = {
  /* 홈이 오른쪽 칸에 그대로 씀(11-22 대표님 결정 '홈 + 생활 한 화면 · 3안') — cards() = 칸 html · bind() = 눌림 */
  draw(P) { P.innerHTML = `<div class="lf-bg" style="background-image:url('${art(HOUSE[g.s.house].bg)}')"></div>` + this.cards(); this.bind(); },
  cards() {
   if (!ok()) return '';
   const s = g.s, L = s.life, d = LD(), lf = LF(), sp = lf.spendLevel(g), wx = d.weather.kinds[L.wx] || d.weather.kinds.sunny, ev = lf.eventsOn(g, lf.wkDate(g))[0], evk = ev && d.korea.kinds[ev.kind];
   const lv = L.level ?? 0, nextReq = L.next || d.level.start, lvp = Math.max(0, Math.min(1, g.netWorth() / nextReq));
   const month = Math.round(lf.spendDay(g) * d.days_per_month);
   return `<div class="lf-grid">
    <section class="lf-card lf-mood"><header><h3>기분</h3><span class="lf-chip"><img src="${icon(wx.icon)}" alt="">${esc(wx.name)}</span>${evk ? `<span class="lf-chip ev"><img src="${icon(evk.icon)}" alt="">${esc(evk.tag)}</span>` : ''}${s.away?.kind === 'sick' ? '<span class="lf-chip dn">병원</span>' : ''}</header>
     <div id="lf-bars">${bar('happy', '행복', L.happy, 'hp')}${bar('stress', '스트레스', s.stress, 'st')}${bar('comfort', '안락', L.comfort, 'cf')}${bar('susp', '의심', s.susp, 'su')}</div></section>
    <section class="lf-card lf-spend"><header><h3>지출</h3><b class="${month > 0 ? 'dn' : month < 0 ? 'up' : ''}">${month ? (month > 0 ? '−' : '+') + M(Math.abs(month)) + ' / 월' : '±0'}</b></header>
     <div class="lf-steps">${d.spend.map(x => `<button class="${x.id === sp.id ? 'on' : ''}" data-lfsp="${x.id}">${esc(x.name)}</button>`).join('')}</div></section>
    <section class="lf-card lf-lv"><header><h3>Lv. <b>${lv}</b></h3><small>다음 ${M(nextReq)}</small></header><i class="lf-prog"><i style="width:${Math.round(lvp * 100)}%"></i></i></section>
    <button class="lf-card lf-trip" id="lf-trip" ${['open', 'evening', 'weekend'].includes(s.phase) ? '' : 'disabled'}><img src="${icon('생활/vacation')}" alt=""><span><h3>여행</h3></span><i>›</i></button>
   </div>
   ${sheet === 'trip' ? tripSheet() : ''}
   ${s.uiLifeSeen ? '' : (askHint({ id: 'life', face: 'base', title: '기분', text: d.says.first, target: '.lf-mood', done() { g.s.uiLifeSeen = 1; save(); } }), '')}`;   /* 처음 한마디 = 유나 말칸(screen.js askHint) */
  },
  bind() {
   if (!ok()) return;
   on('[data-lfsp]', x => swapView(() => act('life', ['spend', x.lfsp])));
   if ($('#lf-trip')) $('#lf-trip').onclick = () => { sheet = 'trip'; pane(); };   /* 시간 멈춤 · 되돌림은 screen.js holdSync(작은 창 한 꼴) */
   if ($('#lf-say-ok')) $('#lf-say-ok').onclick = () => { g.s.uiLifeSeen = 1; save(); pane(); };
   on('[data-lfback]', () => fadeClose('.lf-sheet', () => { sheet = null; pane(); }));   /* 서서히 닫힘 */
   on('[data-lfgo]', x => fadeClose('.lf-sheet', () => { sheet = null; if (!act('life', ['trip', x.lfgo])) floatUp('여행 ✕', 'sys', '!', 'sys'); }));   /* 서서히 닫혀도 어둠은 공용 막(screen.js veilOn)이 이어 줌 */
  },
  leave() { sheet = null; }, reset() { sheet = null; },   /* 홈을 떠나거나 판이 바뀌면 TRIP 창은 닫힘 */
  live() { const s = g.s, L = s.life; if (!L || !$('#lf-bars')) return; for (const [k, v] of [['happy', L.happy], ['stress', s.stress], ['comfort', L.comfort], ['susp', s.susp]]) { const el = $(`[data-lfk="${k}"]`); if (!el) continue; el.querySelector('i > i').style.width = Math.round(v) + '%'; el.querySelector('b').textContent = Math.round(v); } },
 };
 function tripSheet() {
  const d = LD(), s = g.s;
  return `<div class="lf-sheet"><div class="lf-sh"><h2>여행</h2><div class="lf-trips">${d.trips.filter(t => !t.offer_only).map(t => `<button class="lf-t" data-lfgo="${t.id}" ${s.cash >= t.cost ? '' : 'disabled'} style="--bg:url('${art(t.bg)}')"><span class="lf-tp"></span><b>${esc(t.place)}</b><small>${t.days}일 · ${M(t.cost)}</small></button>`).join('')}</div><footer><button data-lfback>뒤로</button></footer></div></div>`;
 }
 /* 창 — 큰 소식 창 꼴(kit.head · 유나 한 마디 · D-047) */
 const say = k => esc(LD().says[k] || ''), face = k => LD().faces?.[k] || 'base';
 const pic = (src, cls = '') => `<div class="lf-pic ${cls}" style="background-image:url('${art(src)}')"></div>`;
 MSGS.life_warn = (m, k) => k.head('건강', face('warn'), `<h2>스트레스 ${Math.round(g.s.stress)}</h2>`, say('warn'));
 MSGS.life_hosp = (m, k) => k.head('병원', face('hosp'), pic(LD().hospital.art) + k.kv('병원', m.days + '일') + k.kv('병원비', M(m.cost), 'dn'), say('hosp'));
 MSGS.life_neg = (m, k) => k.head('잔액', face('neg'), k.kv('잔고', M(m.cash), 'dn') + k.kv('이자', Math.round(LD().neg.daily_rate * 1000) / 10 + '% / 일', 'dn'), say('neg'));
 MSGS.life_sale = (m, k) => k.head('강제 매각', face('sale'), pic(LD().neg.art) + k.kv({ car: '차', stocks: '주식', shops: '상가', house: '홈', mods: '자산' }[m.kind] || m.kind, esc(m.what || '')) + k.kv('받은 돈', '+' + M(m.got)) + k.kv('잔고', M(m.cash), m.cash < 0 ? 'dn' : ''), say('sale'));
 MSGS.life_broke = (m, k) => k.head('잔액', face('broke'), `<h2>자산 없음</h2>`, say('broke'));
 MSGS.life_level = (m, k) => k.head('레벨 업', face('level'), `<b class="lf-big">Lv. ${m.lv}</b>${k.kv('다음', M(m.next))}`, say('level'));
 MSGS.life_back = (m, k) => { const t = LD().trips.find(x => x.id === m.trip); return k.head('어서 오세요', face('back'), pic(t?.bg || LD().trips[0].bg) + `<h2>${esc(t?.place || '')} · ${m.days}일</h2>` + k.kv('행복', (m.happy >= 0 ? '+' : '') + m.happy) + k.kv('스트레스', (m.stress >= 0 ? '+' : '') + m.stress), say('back')); };
 MSGS.life_vac = (m, k) => { const t = LD().trips.find(x => x.id === m.trip); return { html: k.head('휴가', face('vac'), pic(t.bg) + k.kv('기간', t.days + '일') + k.kv('비용', M(t.cost), 'dn'), say('vac')), btns: `<button id="lf-n">나중에</button><button class="primary" id="lf-y" ${g.s.cash >= t.cost ? '' : 'disabled'}>진행 ▶</button>`, bind() { $('#lf-y').onclick = () => act('life', ['vac', true]); $('#lf-n').onclick = () => act('life', ['vac', false]); } }; };
 MSGS.life_ask = (m, k) => ({ html: k.head('초대장', face('reunion'), `<h2>동창회</h2>${k.kv('회비', M(m.cost), 'dn')}`, say('reunion')), btns: `<button id="lf-n">아니요</button><button class="primary" id="lf-y" ${g.s.cash >= m.cost ? '' : 'disabled'}>진행 ▶</button>`, bind() { $('#lf-y').onclick = () => act('life', ['reunion', true]); $('#lf-n').onclick = () => act('life', ['reunion', false]); } });
 /* 달 정산 — 손잡이로 더 쓴(아낀) 몫은 날마다 이미 나갔으니 보이기만 */
 MONTH_ROWS.push(() => { const L = g.s.life; if (!L?.lastSpend || !LD()) return null; const n = LF().spendLevel(g).name; return L.lastSpend > 0 ? { out: [['생활비 ' + n, L.lastSpend]] } : { in: [['아낀 생활비', -L.lastSpend]] }; });
 /* 한 줄 알림(D-048) — 생활 · 사람 장치가 쌓은 줄 가운데 새 것 하나(같은 때 생긴 것은 한 줄로) */
 HUD.push(() => { const s = g.s; for (const [k, Q] of [['uiLifeQn', s.life?.q], ['uiPeopleQn', s.people?.q]]) { if (!Q?.length) continue; const last = Q.at(-1); if ((s[k] || 0) >= last.n) continue; s[k] = last.n; floatUp(esc(last.text), '', `<img class="lf-tic" src="${icon(last.ic)}" alt="">`, 'lf-ti'); return; } });
})();

/* ── s_listing.js ── */
/* 화면 장치 · 종목 판(개편 차례 3) — 상장 폐지 · 분할 · 병합 · 합병 창(규칙 메시지 delist · split · merge) */
const lsName = id => esc(ST[id]?.name || '');
MSGS.delist = (m, k) => k.head('상장 폐지', 'worry', `<h2>${lsName(m.stock)}</h2>${m.lost ? k.kv('주식', `${won(Math.abs(m.lost))}주`, 'dn') : ''}${m.cash ? k.kv('정리 매매', `${m.cash >= 0 ? '+' : '−'}${M(Math.abs(m.cash))}`, m.cash >= 0 ? 'up' : 'dn') : ''}`, m.lost ? '상장 폐지예요. 남은 건 이것뿐이에요…' : '그 회사, 결국 시장에서 내려갔어요.');
MSGS.split = (m, k) => k.head(m.r >= 1 ? '액면 분할' : '주식 병합', 'base', `<h2>${lsName(m.stock)} ${m.r >= 1 ? '1 → ' + m.r : Math.round(1 / m.r) + ' → 1'}</h2>${k.kv('주식', `${won(m.from)} → ${won(m.to)}주`)}${m.cash ? k.kv('끝수 현금', '+' + M(m.cash), 'up') : ''}`, m.r >= 1 ? '주식 수만 늘었어요. 가진 값은 그대로예요.' : '주식을 합쳤어요. 끝수는 현금으로 들어왔어요.');
MSGS.merge = (m, k) => k.head('합병', 'surprise', `<h2>${lsName(m.stock)} → ${lsName(m.to)}</h2>${k.kv(lsName(m.stock), `${won(Math.abs(m.from))}주`)}${m.got ? k.kv(lsName(m.to), `+${won(m.got)}주`, 'up') : ''}${m.cash ? k.kv('현금', `${m.cash >= 0 ? '+' : '−'}${M(Math.abs(m.cash))}`, m.cash >= 0 ? 'up' : 'dn') : ''}`, m.from > 0 ? '사장님 주식이 사는 회사 주식으로 바뀌었어요.' : '공매도는 합병 값으로 되샀어요.');

/* ── s_market.js ── */
/* 화면 장치 · 시장(개편 차례 2) — 위 띠에 종합지수 한 칸(값 · 어제 종가 대비) · 서킷브레이커로 멈춘 동안 HALT
   규칙 쪽 값은 g.index() · g.halted() · g.era() 만 읽음(07_재기/개편_고리.md 표) */
HUD.push(() => {
 const top = $('header.top'); if (!top || !g?.s?.market) return; let el = $('#h-idx');
 if (!el) { el = document.createElement('div'); el.className = 'idxbox'; el.id = 'h-idx'; el.innerHTML = '<small>지수</small><b></b><em></em>'; top.insertBefore(el, top.querySelector('.datebox')); }
 const v = g.index(), ch = v / g.s.market.idx - 1, halt = g.s.phase === 'open' && g.halted();
 el.classList.toggle('halt', halt); el.querySelector('small').textContent = halt ? '거래 정지' : '지수';
 el.querySelector('b').textContent = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 const e = el.querySelector('em'); e.textContent = `${ch >= 0 ? '▲' : '▼'}${Math.abs(ch * 100).toFixed(2)}%`; e.className = ch >= 0 ? 'up' : 'down';
});

/* ── s_people.js ── */
/* 인맥 탭 화면(D-079 · D-081 · 목업 09_목업/인맥2_1122) + 명함 창 — 규칙은 이야기 인물 sim.js · 명함 m_people.js(숫자 · 글 03_자료/장치/people.json) 그대로.
   등록판으로만 붙임: PANES.people(screen.js drawPeople 이 부름) · MSGS.pp_* (위 띠 한 줄 알림은 s_life.js 의 HUD 가 같이 맡음).
   단역 얼굴 · 전신은 04_리소스/그림/단역(people.json art.face · body) · 없으면 이름 첫 글자 원. 명함 자료(TOY2.dev.people)가 없으면 이야기 인물만. */
(function () {
 const PD = () => T.dev?.people, PX = () => globalThis.Toy2People;
 const icon = n => art('아이콘/' + n + '.png');
 const POSTC = { ceo: '#f2c14e', dir: '#4fd1c5', staff: '#8aa0e6' };
 const pic = (n, k = 'face') => { const A = PD().art; if (!A[k] || !n.sex || !A.post_file?.[n.post]) return ''; return art(A[k].replace('{post}', A.post_file[n.post]).replace('{sex}', n.sex).replace('{age}', n.age >= (A.mid_from?.[n.post] ?? 99) ? 'mid' : 'young')); };   /* 단역 얼굴 · 전신(직급 × 남녀 × 나이 둘) — 없으면 이름 글자 */
 const av = (n, cls = '') => { const f = pic(n); return `<span class="pc-av ${cls} ${f ? 'img' : ''}" style="--pc:${POSTC[n.post] || '#8aa0e6'}${f ? `;background-image:url('${f}')` : ''}">${f ? '' : esc(n.name.slice(1, 2) || n.name[0])}</span>`; };
 const postName = n => PD().posts[n.post].name, coName = n => n.co ? PX().stockName(g, n.co) || n.coName : '전 ' + (n.coName || '');
 /* ── 인맥 탭(D-079 · D-081 · 목업 09_목업/인맥2_1122 C1B · KP · FB · NW) ──
    위 판 둘 연락처 · 인맥도(처음 = 연락처). 연락처 = 왼쪽 목록(맨 위 '오늘' 묶음 · 이야기 · 명함) + 카톡 대화 — 둘 다 화면 가운데.
    대화 머리의 프로필 사진을 누르면 카톡 프로필 꼴 창 → 그 사진을 누르면 전신(얇은 테 하나). 관계 단계 = 지금 단계 말 + 점 + 다음(D-078).
    할 일 단추 아래 걸리는 시간(D-080 · 분은 people.json time · 장중에만 흐름 · 규칙은 m_people.js pass). 인맥도 = 나 → 회사 · 소개 사슬 ·
    오른쪽 그 회사 사람(명함 사람을 누르면 묻는 사람으로 고름 · 한 번 더 누르면 대화) · 속사정 · 최근 귀띔 · 회사 사정 · 소개 · 주식 보기.
    연락처 하나 = 이야기 인물(s.contacts · 대화 uiTalk · 규칙 sim.js) + 명함(s.people.npc · 대화 people.log · 규칙 m_people.js) — 규칙은 둘 다 그대로.
    숫자 · 글은 people.json(ui · time) · 이야기 인물 관계 말은 toy2.json rel_words. 화면 상태는 판 저장에 안 넣음(탭을 다시 열면 연락처).
    연락처 한 줄의 이름표는 ck('s:<id>' · 'n:<id>') — 낱말 'key' 꼴 속성은 보안 장치가 비밀 파일로 잘못 봐서 안 씀. */
 const UI = () => PD()?.ui || { ladder: { words: ['명함', '안면', '단골', '내 사람'], at: [0, 30, 60, 85] }, male: [], male_scale: 1 };
 const kOf = c => (c.kind === 'npc' ? c.n.sex === 'm' : (UI().male || []).includes(c.p.who)) ? (UI().male_scale || 1) : 1;   /* 남자는 1.05배로 세움(팀 지시 11-20) */
 const npcOn = () => !!(PD() && g?.s?.people && PX());
 let seg = 'contacts', sel = null, coSel = null, whoSel = null, sheet = null, pop = null, netMine = false, chip = 'all', q = '', qFocus = false;
 const ago = c => c.last == null ? '—' : c.last === g.s.day ? '오늘' : `${g.s.day - c.last}거래일 전`;
 const coNm = id => ST[id]?.name || PX()?.stockName(g, id) || '';
 const tmLabel = k => { const m = PD()?.time?.[k] | 0; return g.s.phase !== 'open' || !m ? '' : m % 60 ? m + '분' : m / 60 + '시간'; };   /* 장중에만 시간이 흐르니 장중에만 보임 */
 function contacts() {
  const s = g.s, out = [];
  for (const p of peopleData()) { if (p.id === 'yuna' || !p.known) continue;
   out.push({ ck: 's:' + p.id, kind: 'story', id: p.id, p, name: p.name, sub: p.roleName + (p.stock && ST[p.stock] ? ' · ' + ST[p.stock].name : ''), face: smallArt(p), body: fullArt(p.who), words: T.rel_words[p.who] || [], word: relWord(p.who), rel: p.rel, last: p.last, co: p.stock || null, unread: unreadOf(p.id), appt: s.uiAppointment === p.id, next: peopleNext(p) }); }
  if (npcOn()) for (const n of PX().known(g)) { const L = UI().ladder, i = Math.max(0, L.at.filter(x => n.rel >= x).length - 1);
   out.push({ ck: 'n:' + n.id, kind: 'npc', id: n.id, n, name: n.name, sub: `${coName(n)} · ${postName(n)}`, face: pic(n), body: pic(n, 'body'), words: L.words, word: L.words[i], rel: n.rel, last: n.last, co: n.gone ? null : n.co, unread: 0, appt: s.people.appt?.id === n.id && s.people.appt.day === s.day, bday: n.bdayDay === s.day, next: L.at[i + 1] != null ? '관계 ' + L.at[i + 1] : '—' }); }
  return out;
 }
 const unknownN = () => peopleData().filter(p => p.id !== 'yuna' && !p.known).length + (npcOn() ? Object.keys(g.s.people.npc).length - PX().known(g).length : 0);
 const faceEl = (c, cls = '') => c.face ? `<span class="pp2-av ${cls}" style="background-image:url('${c.face}')"></span>` : (c.kind === 'npc' ? av(c.n, cls) : `<span class="pp2-av ${cls}"></span>`);
 const ladder = c => { const W = c.words, cur = Math.max(0, W.indexOf(c.word)); return `<span class="pp3-lv">${esc(c.word)}<i>${W.map((_, i) => i <= cur ? '●' : '○').join('')}</i>${c.next && c.next !== '—' ? `<em>다음 · ${esc(c.next)}</em>` : ''}</span>`; };   /* D-078 — 지금 단계 한 줄 + 점 + 다음 */
 function todayOf(C) {   /* 목록 맨 위 '오늘' — 저녁 약속 · 생일 · 새 메시지(사람마다 한 줄) */
  const s = g.s, out = [];
  for (const c of C) {
   if (c.appt) out.push({ c, pri: 0, ic: '🍶', t: '오늘 저녁 약속', rt: s.phase === 'evening' ? '지금' : hm(g.closeMin()) });
   else if (c.bday) out.push({ c, pri: 1, ic: '🎂', t: '생일', rt: '' });
   else if (c.unread) { const x = talkOf(c.id).at(-1);   /* 줄 글 = 대화창 마지막 줄(11-23 대표님 피드백 20 '뜨는 메시지도 카톡창과 다름') */ out.push({ c, pri: 2, ic: '☎', t: x?.text || '', rt: `<span class="dot">${c.unread}</span>` }); }
  }
  return out.sort((a, b) => a.pri - b.pri);
 }
 function heldCos() { const s = g.s; return g.stocks.filter(x => s.hold[x.id] && !s.delisted[x.id]).map(x => x.id); }
 function coCrew(id) {   /* 그 회사 사람 — 이야기 사장 + 명함(아는 · 모르는) */
  const s = g.s, out = [], sc = PX()?.storyCeo(id) || T.contacts.find(p => p.role === 'ceo' && p.stock === id);
  if (sc) out.push(s.contacts[sc.id]?.known ? { known: true, ck: 's:' + sc.id, post: '사장' } : { known: false, post: '사장' });
  if (npcOn()) for (const nid of s.people.co[id] || []) { const n = s.people.npc[nid]; if (n) out.push(n.known ? { known: true, ck: 'n:' + nid, post: postName(n), n } : { known: false, post: postName(n), n }); }
  return out;
 }
 const row = (c, small, rt, ic) => `<button class="pp3-row ${c.ck === sel ? 'on' : ''}" data-ppsel="${c.ck}" data-q="${esc((c.name + ' ' + c.sub).toLowerCase())}">${faceEl(c)}<span class="tx"><b>${esc(c.name)}</b><small>${ic ? emo(ic) + ' ' : ''}${esc(small)}</small></span><span class="rt">${rt}</span></button>`;
 const grp = (h, rows) => rows ? `<div class="pp3-grp"><div class="pp3-gh">${h}</div>${rows}</div>` : '';
 const btn = (attr, label, sub, hot, dis) => `<button class="${hot ? 'hot' : ''}" ${attr} ${dis ? 'disabled' : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
 function contactsHTML(C) {
  const st = C.filter(c => c.kind === 'story').length, nc = C.length - st, mine = c => chip === 'all' || c.kind === chip;
  const by = (a, b) => b.unread - a.unread || (b.last ?? -1) - (a.last ?? -1), TD = todayOf(C).filter(x => mine(x.c));
  const inTD = new Set(TD.map(x => x.c.ck));   /* '오늘'에 뜬 사람은 아래 묶음에서 뺌(11-23 대표님 피드백 20 '오늘 · 이야기 둘 다 뜸') */
  const S = C.filter(c => c.kind === 'story' && mine(c) && !inTD.has(c.ck)).sort(by), N0 = C.filter(c => c.kind === 'npc' && mine(c) && !inTD.has(c.ck)).sort(by);
  if (!C.some(c => c.ck === sel)) sel = (TD[0]?.c || S[0] || N0[0])?.ck || null;
  const norm = c => row(c, `${c.sub} · ${c.word}`, `${esc(ago(c))}${c.unread ? `<span class="dot">${c.unread}</span>` : ''}`);
  const none = chip === 'all' ? `<div class="pp3-none"><span class="pp3-nic">${emo('💬')}</span><b>${esc(PD().ui?.today_none || '')}</b></div>` : '';   /* 오늘 온 게 없어도 '오늘' 칸은 남기고 흐린 줄 하나(11-23 대표님 피드백 17 · 목업 인맥오늘_1123 흐린 줄) */
  const list = grp('오늘', TD.map(x => row(x.c, x.t, x.rt, x.ic)).join('') || none) + grp('이야기', S.map(norm).join('')) + grp('명함', N0.map(norm).join(''));
  const chips = [['all', `전체 ${C.length}`], ['story', `이야기 ${st}`], ['npc', `명함 ${nc}`]].map(([id, n]) => `<button class="sm ${chip === id ? 'on' : ''}" data-ppchip="${id}">${n}</button>`).join('');
  const cur = C.find(c => c.ck === sel);
  return `<div class="pp3-wrap"><div class="pp3-list"><label class="pp3-srch">${emo('🔍')}<input data-ppq placeholder="이름 · 회사" spellcheck="false"></label><div class="pp3-chp pp2-chips">${chips}</div><div class="pp3-rows">${list || '<div class="pp2-none">—</div>'}</div></div>${cur ? chatHTML(cur) : '<div class="pp3-chat"></div>'}</div>`;
 }
 function chatHTML(c) {
  const s = g.s, d = PD();
  let lines = [], acts = '';
  if (c.kind === 'story') {
   const L = talkOf(c.id); L.forEach(x => { x.read = true; }); lines = L.slice(-20);
   const ap = s.uiAppointment === c.id, greeted = s.contacts[c.id].greet === s.day, ask = c.rel >= 30;
   acts = btn('data-ppst="date"', ap ? '약속 취소' : '저녁 약속', '저녁', !ap) + btn('data-ppst="greet"', '안부', tmLabel('greet'), false, greeted) + btn('data-ppst="ask"', (ask ? '' : emo('🔒') + ' ') + '귀띔 부탁', tmLabel('tip'), false, !ask);
  } else {
   const n = c.n, P = s.people, talked = n.talked === s.day, canMeet = (s.phase === 'open' && !P.appt) || s.phase === 'evening', canGift = n.rel >= d.gift.need && s.day - (n.giftAt ?? -1e9) >= d.gift.gap;
   lines = (P.log[n.id] || []).slice(-20);
   acts = btn('data-ppnpc="meet"', '저녁 약속', c.appt ? '오늘 저녁' : s.phase === 'evening' ? '지금' : '저녁', !c.appt, !(canMeet && !c.appt)) + btn('data-ppnpc="talk"', '안부', tmLabel('talk'), false, talked) + btn('data-ppnpc="stock"', '시장 얘기', tmLabel('stock'), false, talked) + btn('data-ppgift', '선물', tmLabel('gift'), false, !canGift);
  }
  const day = x => x.d != null && DAYS[x.d] ? g.date(x.d) : '';
  const chat = lines.map((x, i, A) => (i === 0 || A[i - 1].d !== x.d ? `<span class="pp3-dy">${esc(day(x))}</span>` : '') + (x.sys ? `<span class="pp3-sys">${emoText(x.text)}</span>` : `<div class="pp3-b ${x.me ? 'me' : ''}">${emoText(x.text)}${x.tip ? '<small>귀띔</small>' : ''}</div>`)).join('');
  const gift = sheet === 'gift' && c.kind === 'npc' ? `<div class="pc-sheet"><h3>선물</h3>${d.gifts.map(gf => `<button data-ppg="${gf.id}" ${s.cash >= gf.price ? '' : 'disabled'}><img src="${icon(gf.icon)}" alt=""><b>${esc(gf.name)}</b><small>${M(gf.price)}</small></button>`).join('')}<button class="pc-x" data-ppgx>닫기</button></div>` : '';
  return `<div class="pp3-chat"><div class="pp3-hd"><button class="pp3-pic" data-pppop="kp" title="프로필">${faceEl(c, 'hd')}</button><span class="nm"><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></span>${ladder(c)}</div><div class="pp3-msgs">${chat}</div><div class="pp3-acts n${c.kind === 'npc' ? 4 : 3}">${acts}</div>${gift}</div>`;
 }
 function kpHTML(c) {   /* 카톡 프로필 꼴(D-081 · 목업 KP) — 사진을 누르면 전신 */
  const s = g.s, d = PD(), st = [c.sub];
  if (c.kind === 'story') { const tips = talkOf(c.id).filter(x => x.tip).length; if (c.p.who === 'baek') st.push('남은 원금 ' + M(s.baek.principal)); if (tips) st.push('받은 귀띔 ' + tips + '번'); }
  else { const n = c.n; if (n.likesKnown || n.rel >= d.reveal.likes) st.push('좋아함 ' + d.types[n.type].likes); if (n.rel >= d.reveal.bday) st.push(`생일 ${+n.bday.slice(0, 2)}/${+n.bday.slice(3)}`); }
  const canGift = c.kind === 'npc' && c.n.rel >= d.gift.need && s.day - (c.n.giftAt ?? -1e9) >= d.gift.gap, crew = c.co ? coCrew(c.co) : [];
  const ic = `<button data-pppop="">${emo('💬')}<span>대화</span></button>` + (c.kind === 'npc' ? `<button data-ppgift ${canGift ? '' : 'disabled'}>${emo('🎁')}<span>선물</span></button>` : '') + (c.co ? `<button data-ppco="${c.co}">${emo('🏢')}<span>${esc(coNm(c.co))} · ${crew.filter(x => x.known).length} / ${crew.length}</span></button>` : '');
  const bg = art(PD()?.art.tab || HOUSE[s.house].bg);
  return `<div class="pp3-pop"><div class="pp3-dim" data-pppop=""></div><div class="pp3-kp" style="--bg:url('${bg}')"><button class="pp3-kx" data-pppop="">✕</button><button class="pp3-kpc ${c.body ? '' : 'nofb'}" ${c.body ? 'data-pppop="fb"' : ''}>${faceEl(c, 'kp')}</button><div class="pp3-knm">${esc(c.name)}</div><div class="pp3-kst">${esc(st.join(' · '))}</div><div class="pp3-klv">${ladder(c)}</div><div class="pp3-kic n${(c.kind === 'npc') + !!c.co + 1}">${ic}</div></div></div>`;
 }
 const fbHTML = c => `<div class="pp3-pop"><div class="pp3-dim" data-pppop="kp"></div><div class="pp3-frm" data-pppop="kp"><img src="${c.body}" alt="${esc(c.name)}"><span class="pp3-fpl">${esc(c.name)}</span></div></div>`;   /* 전신 — 얇은 테 하나(D-081 · 목업 FB) · 누르면 프로필로 */
 function networkHTML(C) {
  const s = g.s, d = PD(), ids = npcOn() ? PX().liveStocks(g).map(x => x.id) : [...new Set(C.map(c => c.co).filter(Boolean))], held = new Set(heldCos()), n = ids.length;
  if (!ids.includes(coSel)) { coSel = [...held].find(id => ids.includes(id)) || ids.find(id => C.some(c => c.co === id)) || ids[0]; whoSel = null; }
  const W = 1300, H = 820, cx = W / 2, cy = H / 2 + 20, rx = 500, ry = 300, R0 = Math.max(40, 62 - Math.max(0, n - 10) * 2);
  const pos = ids.map((id, i) => [cx + rx * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / Math.max(1, n)), cy + ry * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / Math.max(1, n))]);
  const kn = id => C.filter(c => c.co === id).length, tot = id => coCrew(id).length;
  let svg = `<svg class="pp2-map" viewBox="0 0 ${W} ${H}">`;
  ids.forEach((id, i) => { const k = kn(id); svg += `<line x1="${cx}" y1="${cy}" x2="${pos[i][0] | 0}" y2="${pos[i][1] | 0}" class="${k ? 'on' : 'off'}"/>`; });
  const P = s.people, pairs = [];
  if (npcOn()) for (const e of P.chain.slice().reverse()) { const a = P.npc[e.by]?.co, b = P.npc[e.id]?.co; if (a && b && a !== b && ids.includes(a) && ids.includes(b) && !pairs.some(x => x[0] === a && x[1] === b)) pairs.push([a, b]); if (pairs.length >= 4) break; }
  pairs.forEach(([a, b], k) => { const A = pos[ids.indexOf(a)], B = pos[ids.indexOf(b)], qx = (A[0] + B[0]) / 2 + (cx - (A[0] + B[0]) / 2) * -0.25, qy = (A[1] + B[1]) / 2 + (cy - (A[1] + B[1]) / 2) * -0.25;
   svg += `<path class="intro" d="M${A[0] | 0},${A[1] | 0} Q${qx | 0},${qy | 0} ${B[0] | 0},${B[1] | 0}"/>`;
   if (k === 0) { const mx = 0.25 * A[0] + 0.5 * qx + 0.25 * B[0], my = 0.25 * A[1] + 0.5 * qy + 0.25 * B[1]; svg += `<g class="itag"><rect x="${(mx - 34) | 0}" y="${(my - 16) | 0}" width="68" height="30"/><text x="${mx | 0}" y="${(my + 7) | 0}">소개</text></g>`; } });
  ids.forEach((id, i) => { const [x, y] = pos[i], k = kn(id), nm = coNm(id) || id, on = id === coSel, dim = netMine && !held.has(id);
   svg += `<g class="nd ${on ? 'on' : ''} ${held.has(id) ? 'mine' : ''} ${k ? 'kn' : ''} ${dim ? 'dim' : ''}" data-ppco="${id}"><circle cx="${x | 0}" cy="${y | 0}" r="${on ? R0 + 8 : R0}"/><text x="${x | 0}" y="${(y - 4) | 0}" class="nm" style="font-size:${nm.length > 4 ? 17 : 19}px">${esc(nm)}</text><text x="${x | 0}" y="${(y + 22) | 0}" class="ct">${k} / ${tot(id)}</text></g>`; });
  C.filter(c => c.kind === 'story' && c.co && ids.includes(c.co)).forEach((c, k) => { const i = ids.indexOf(c.co), [x, y] = pos[i], dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1, fx = x + dx / L * (R0 + 52), fy = y + dy / L * (R0 + 40);
   svg += `<g class="sf" data-ppopen="${c.ck}"><clipPath id="ppc${k}"><circle cx="${fx | 0}" cy="${fy | 0}" r="32"/></clipPath><image href="${c.face}" x="${(fx - 32) | 0}" y="${(fy - 32) | 0}" width="64" height="64" clip-path="url(#ppc${k})" preserveAspectRatio="xMidYMin slice"/><circle cx="${fx | 0}" cy="${fy | 0}" r="32" class="ring"/><text x="${fx | 0}" y="${(fy + 54) | 0}">${esc(c.name)}</text></g>`; });
  svg += `<circle cx="${cx}" cy="${cy}" r="56" class="me"/><text x="${cx}" y="${cy + 10}" class="me">나</text></svg>`;
  const crew = coCrew(coSel), byCk = Object.fromEntries(C.map(c => [c.ck, c])), ch = coSel ? dayChg(coSel) : 0;
  const asks = crew.filter(x => x.known && x.n && byCk[x.ck]).map(x => byCk[x.ck]).sort((a, b) => b.rel - a.rel);
  if (!asks.some(c => c.ck === whoSel)) whoSel = asks[0]?.ck || null;
  const rows = crew.map(x => { const c = x.known && byCk[x.ck]; return c ? `<button class="pp3-crew ${c.ck === whoSel ? 'on' : ''}" ${c.kind === 'npc' ? `data-ppwho="${c.ck}"` : `data-ppopen="${c.ck}"`}>${faceEl(c, 'sm')}<span class="tx"><b>${esc(c.name)}</b><small>${esc(x.post)}</small></span><span class="pp2-st ${c.kind}">${esc(c.word)}</span></button>` : `<div class="pp3-crew lk"><span class="pp2-av sm lk">?</span><span class="tx"><b>???</b><small>${esc(x.post)}</small></span><span class="pp2-st npc">${emo('🔒')}</span></div>`; }).join('');
  const wn = byCk[whoSel]?.n, U = UI().note || {}, nt = npcOn() ? s.people.coNote?.[coSel] : null, nmOf = id => s.people.npc[id]?.name || '';
  const canAsk = wn && wn.talked !== s.day && !['away', 'end'].includes(s.phase), canIntro = wn && wn.rel >= d.intro.need && s.day - (wn.introAt ?? -1e9) >= d.intro.gap;
  const note = (nt?.ask ? `<div class="pp2-kv"><span>속사정</span><b>${esc((U.val?.[nt.ask.val] || '') + ' · ' + (U.mood?.[nt.ask.mood] || ''))}<small>${esc(nmOf(nt.ask.who))} · ${esc(md(nt.ask.d))}</small></b></div>` : '') + (nt?.tip ? `<div class="pp2-kv"><span>최근 귀띔</span><b>${esc(U.dir?.[nt.tip.dir] || '')}<small>${esc(nmOf(nt.tip.who))} · ${esc(md(nt.tip.d))}</small></b></div>` : '');
  const right = coSel ? `<div class="pp3-side"><div class="pp2-pn"><h4>${esc(coNm(coSel))}<small>${s.hold[coSel] ? `내 주식 ${Math.abs(s.hold[coSel]).toLocaleString('ko-KR')}주` : ''}</small>${s.open?.[coSel] ? `<span class="${sg2(ch)} pp2-chg">${pct1(ch)}</span>` : ''}</h4><div class="pp3-crews">${rows}</div>${note}<div class="pp3-acts n3">${btn('data-ppnet="ask"', '회사 사정', tmLabel('ask'), true, !canAsk)}${btn('data-ppnet="intro"', (canIntro ? '' : emo('🔒') + ' ') + '소개', tmLabel('intro'), false, !canIntro)}${btn(`data-pptrade="${coSel}"`, '주식 보기', '', false, false)}</div></div></div>` : '';
  const lv = npcOn() ? `인맥 Lv.${PX().netLevel(g)} · ` : '';
  return `<div class="pp2-net"><div class="pp2-nh"><b>인맥도</b><small>${lv}아는 사람 ${C.length} / ${C.length + unknownN()}</small><div class="pp2-chips"><button class="sm ${netMine ? '' : 'on'}" data-ppmine="0">전체</button><button class="sm ${netMine ? 'on' : ''}" data-ppmine="1">내 종목</button></div></div>${svg}</div>${right}`;
 }
 function storyAct(c, k) {   /* 이야기 인물 할 일 — 옛 인맥 탭과 같은 규칙(저녁 약속 · 안부 · 귀띔 부탁 → 저녁 약속) · 안부 · 귀띔 부탁은 장중 시간이 흐름(D-080) */
  const s = g.s, p = c.p, tick = k2 => g.dispatch('people', ['pass', k2]);
  if (k === 'date') { if (s.uiAppointment === p.id) { delete s.uiAppointment; delete s.uiApptDay; addTalk(p.id, { sys: true, text: '오늘 저녁 약속 취소', read: true }); } else { apptSet(p.id);   /* 약속은 그날 저녁 한 번(screen.js apptSet) */ addTalk(p.id, { me: true, text: '오늘 저녁 시간 돼?' }); addTalk(p.id, { text: '좋아요! 장 끝나고 봬요.', read: true }); addTalk(p.id, { sys: true, text: '📅 오늘 저녁 약속', read: true }); } }
  if (k === 'greet' && g.dispatch('greet', [p.id])) { addTalk(p.id, { me: true, text: '잘 지내?' }); addTalk(p.id, { text: ROLE_SAY[p.role] || '네, 잘 지내요.', read: true }); tick('greet'); }
  if (k === 'ask' && p.rel >= 30) { addTalk(p.id, { me: true, text: '요즘 들은 거 있어?' }); addTalk(p.id, { text: '여기선 좀 그렇고… 오늘 저녁에 봬요.', read: true }); apptSet(p.id); addTalk(p.id, { sys: true, text: '📅 오늘 저녁 약속', read: true }); tick('tip'); }
 }
 function draw(P) {
  const s = g.s, C = contacts();
  const top = `<div class="pp2-seg">${[['contacts', '연락처'], ['network', '인맥도']].map(([id, n]) => `<button class="sm ${seg === id ? 'on' : ''}" data-ppseg="${id}">${n}</button>`).join('')}</div>`;
  const body = seg === 'network' ? networkHTML(C) : contactsHTML(C), c = seg === 'contacts' ? C.find(v => v.ck === sel) : null;
  if (!c) pop = null;
  P.innerHTML = `<div class="pp-bg" style="background-image:url('${art(PD()?.art.tab || HOUSE[s.house].bg)}')"></div>${top}<div class="pp2-body s-${seg}">${body}</div>${c && pop ? (pop === 'fb' && c.body ? fbHTML(c) : kpHTML(c)) : ''}`;
  if (npcOn() && !s.uiPeopleSeen) askHint({ id: 'people', face: 'base', text: PD().says.first, done() { g.s.uiPeopleSeen = 1; save(); } });   /* 처음 한마디 = 유나 말칸 */
  const ls = $('.pp3-msgs'); if (ls) ls.scrollTop = ls.scrollHeight;
  const qi = $('[data-ppq]'), filt = () => { const t = q.trim().toLowerCase(); $$('.pp3-row').forEach(r => { r.hidden = !!t && !r.dataset.q.includes(t); }); $$('.pp3-grp').forEach(gp => { gp.hidden = ![...gp.querySelectorAll('.pp3-row')].some(r => !r.hidden) && !(gp.querySelector('.pp3-none') && !t); }); };   /* 빈 '오늘' 흐린 줄은 찾는 말이 없을 때만 남김 */
  if (qi) { qi.value = q; filt(); qi.oninput = () => { q = qi.value; filt(); }; qi.onfocus = () => { qFocus = true; }; qi.onblur = () => { qFocus = false; }; if (qFocus) { qi.focus(); qi.setSelectionRange(q.length, q.length); } }   /* 다시 그려도 찾는 말 · 글자 자리 그대로 */
  const openC = ck => swapView(() => { seg = 'contacts'; sel = ck; chip = 'all'; sheet = null; pop = null; pane(); secBadge(); });
  on('[data-ppseg]', x => swapView(() => { seg = x.ppseg; sheet = null; pop = null; pane(); }));
  on('[data-ppsel]', x => swapView(() => { sel = x.ppsel; sheet = null; pane(); secBadge(); }));
  on('[data-ppopen]', x => openC(x.ppopen));
  on('[data-ppchip]', x => { chip = x.ppchip; pane(); });
  on('[data-ppmine]', x => { netMine = x.ppmine === '1'; pane(); });
  on('[data-ppco]', x => { if (coSel !== x.ppco) whoSel = null; coSel = x.ppco; seg = 'network'; pop = null; sheet = null; swapView(() => pane()); });
  on('[data-ppwho]', x => { if (whoSel === x.ppwho) return openC(x.ppwho); whoSel = x.ppwho; pane(); });   /* 한 번 = 묻는 사람으로 고름 · 한 번 더 = 대화 */
  on('[data-pptrade]', x => mkGo(x.pptrade));
  on('[data-ppnet]', x => { const w = C.find(v => v.ck === whoSel); if (!w || w.kind !== 'npc') return; const r = g.dispatch('people', [x.ppnet, w.id]); save();
   if (x.ppnet === 'intro' && r && r !== true) { const m = r.ok && g.s.people.npc[r.who]; floatUp(m ? `소개 · ${esc(m.name)}` : '소개할 사람이 없대요', 'sys', emo('✉'), 'sys'); } refresh(); });
  on('[data-pppop]', x => { if (x.pppop) { pop = x.pppop; pane(); } else fadeClose('.pp3-pop', () => { pop = null; pane(); }); });
  if (!c) return;
  on('[data-ppst]', x => { storyAct(c, x.ppst); save(); refresh(); });
  on('[data-ppnpc]', x => { const r = g.dispatch('people', [x.ppnpc, c.id]); save(); if (x.ppnpc === 'meet' && r && r !== true && !r.ok) floatUp('다음에', 'sys', '✕', 'sys'); refresh(); });
  on('[data-ppgift]', () => { pop = null; sheet = 'gift'; pane(); });   /* 시간 멈춤 · 되돌림은 screen.js holdSync(작은 창 한 꼴) */
  on('[data-ppgx]', () => fadeClose('.pc-sheet', () => { sheet = null; pane(); }));   /* 서서히 닫힘 */
  on('[data-ppg]', x => fadeClose('.pc-sheet', () => { sheet = null; act('people', ['gift', c.id, x.ppg]); }));
 }
 PANES.people = { draw, reset() { seg = 'contacts'; sheet = null; pop = null; q = ''; }, leave() { sheet = null; pop = null; qFocus = false; } };   /* 탭을 옮기면 작은 창은 닫힘(검토 11-22) */
 /* 창 */
 const pw = (n, sub, q) => n ? `<div class="bn-who">${av(n, 'big')}<div><b>${esc(n.name)}</b><small>${sub}</small></div></div>${q ? `<div class="bn-q">"${esc(q)}"</div>` : ''}` : '';
 const sub = n => `${esc(coName(n))} · ${esc(postName(n))} · 관계 ${Math.round(n.rel)}`;
 const npc = m => g.s.people?.npc[m.npc];
 MSGS.pp_call = (m, k) => { const n = npc(m), kd = PD().weekend.kinds.find(x => x.id === m.kind); if (!n || !kd) return { html: k.head('전화', 'base', '', ''), bind() { act('people', ['call', false]); } };
  return { html: k.head('주말 전화', 'base', pw(n, sub(n), kd.say), esc(PD().says.call)), btns: kd.place ? `<button id="pc-n">다음에</button><button class="primary" id="pc-y">좋아요</button>` : `<button class="primary" id="pc-y">확인</button>`, bind() { $('#pc-y').onclick = () => act('people', ['call', true]); if ($('#pc-n')) $('#pc-n').onclick = () => act('people', ['call', false]); } }; };
 MSGS.pp_meet = (m, k) => { const n = npc(m), d = PD(), iv = m.intro && g.s.people.npc[m.intro]; return k.head('저녁', 'wink', pw(n, sub(n), '') + k.kv('관계', '+' + m.gain) + (m.tip ? k.kv('귀띔', esc(PX().stockName(g, m.tip.stock)) + (m.tip.dir > 0 ? ' ▲' : ' ▼') + (m.tip.insider ? ' · 내부' : '')) : '') + (iv ? k.kv('소개', esc(iv.name) + ' ' + esc(d.posts[iv.post].name)) : ''), m.tip?.insider ? '회사 안 사람 말이에요. 크게 벌면 감독원이 봐요.' : ''); };
 MSGS.pp_tip = (m, k) => { const n = npc(m); return k.head('귀띔', m.insider ? 'worry' : 'base', pw(n, sub(n), PD().lines.tip[m.dir > 0 ? 0 : 1].replace('{name}', PX().stockName(g, m.stock))), m.insider ? '회사 안 사람 말이에요. 크게 벌면 감독원이 봐요.' : ''); };
 MSGS.pp_block = (m, k) => { const n = npc(m), cost = m.q * m.px; return { html: k.head('끔-MARKET', 'surprise', pw(n, sub(n), PD().lines[m.cheap ? 'block_cheap' : 'block_dear']) + k.kv(esc(PX().stockName(g, m.stock)), m.q.toLocaleString('ko-KR') + '주') + k.kv('1주', won(m.px) + ' · 지금 ' + won(g.price(m.stock))) + k.kv('합계', M(cost), 'dn'), esc(PD().says.block)),
  btns: `<button id="pc-n">패스</button><button class="primary" id="pc-y" ${g.s.cash >= cost ? '' : 'disabled'}>매수</button>`, bind() { $('#pc-y').onclick = () => act('people', ['block', true]); $('#pc-n').onclick = () => act('people', ['block', false]); } }; };
 MSGS.pp_party = (m, k) => ({ html: k.head('초대장', 'surprise', `<div class="lf-pic" style="background-image:url('${art(PD().art.party)}')"></div><h2>파티</h2>`, esc(PD().lines.party)), btns: `<button id="pc-n">패스</button><button class="primary" id="pc-y">진행 ▶</button>`, bind() { $('#pc-y').onclick = () => act('people', ['party', true]); $('#pc-n').onclick = () => act('people', ['party', false]); } });
 MSGS.pp_party_res = (m, k) => k.head('파티', m.outcome === 'none' ? 'base' : 'wink', `<div class="lf-pic" style="background-image:url('${art(PD().art.party)}')"></div>${m.cash ? k.kv(m.cash > 0 ? '받은 돈' : '쓴 돈', (m.cash > 0 ? '+' : '−') + M(Math.abs(m.cash)), m.cash > 0 ? '' : 'dn') : ''}${m.met.length ? k.kv('새 명함', m.met.length + '장') : ''}`, esc(PD().says['party_' + m.outcome]));
 MSGS.pp_bday = (m, k) => k.head('생일 축하해요', 'wink', `<img class="pc-cake" src="${icon('생활/cake')}" alt="">${k.kv('축하금', '+' + M(m.gift))}${k.kv('모인 사람', m.n + '명')}`, esc(PD().says.bday));
})();

/* ── s_play.js ── */
/* 놀이 화면(개편 차례 9 · 07_재기/개편_놀이.md) — 탭 '놀이'(장소 카드 · 로또 · 토토) + 장소 창(경주 · 노래방 · 스크린골프 · 오락실 · 카지노 · 하우스) + 결과 창(MSGS).
   규칙은 m_play.js(Toy2Play) 한 곳 · 글은 play.json · 장소 창 안에서는 g.dispatch + save 만 부르고(창이 지워지지 않게) 나올 때 refresh.
   주말 지도 핀에서 들어오는 길은 PLAY_BOX[장소 id] — screen.js placeGo 첫 줄에 이어 붙일 자리(본 세션). */
'use strict';
(function () {
const PV = () => globalThis.Toy2Play, PD = () => PV() && PV().D();
const ready = () => !!(PD() && g.s.play);
const run = (...p) => { const v = g.dispatch('play', p); save(); return v; };
const icon = n => art('아이콘/놀이/' + n + '.png');
const V = id => PD().venues.find(v => v.id === id);
const SC = () => PD().screen;
const motion = () => calMotion();
const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const PA = () => PD().art || {};   /* 놀이 그림(play.json art) — 없으면 글 · 색 상자 */
const card = (c, k = 0) => { const A = PA(); if (c < 0) return `<i class="pl-pc back ${A.card_back ? 'img' : ''}" style="--d:${k * 0.1}s${A.card_back ? `;background-image:url('${art(A.card_back)}')` : ''}"></i>`; const su = Math.floor(c / 13);
 return A.card_front ? `<i class="pl-pc img ${[1, 2].includes(su) ? 'r' : ''}" style="--d:${k * 0.1}s;background-image:url('${art(A.card_front)}')">${RANKS[c % 13]}${A.suits?.[su] ? `<img src="${art(A.suits[su])}" alt="${SUITS[su]}">` : `<small>${SUITS[su]}</small>`}</i>` : `<i class="pl-pc ${[1, 2].includes(su) ? 'r' : ''}" style="--d:${k * 0.1}s">${RANKS[c % 13]}<small>${SUITS[su]}</small></i>`; };
const hw = (c, cls = '', k = 0) => { const H = PD().hwatu, [m, kind, name] = H[c], A = PA(); if (A.hwatu) { const n = H.slice(0, c + 1).filter(x => x[0] === m).length, f = A.hwatu.replace('{m}', String(m).padStart(2, '0')).replace('{k}', n); return `<i class="hw img k-${kind} ${cls}" style="--d:${k * 0.05}s;background-image:url('${art(f)}')" title="${esc(name)}"></i>`; }
 return `<i class="hw k-${kind} ${cls}" style="--d:${k * 0.05}s"><b>${m}</b><small>${esc(name.split(' ')[1] || name)}</small></i>`; };
const symH = k => PA().slot ? `<img src="${art(PA().slot.replace('{k}', k))}" alt="${esc(SC().symbols[k])}">` : esc(SC().symbols[k]);
const W = n => Math.abs(n) < 1e4 ? won(n) + '원' : M(n);   /* 만 원 아래는 원 단위로 */
const signM = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + W(Math.abs(n));
const amtChips = (list, cur, attr = 'amt') => list.map(a => `<button class="sm ${a === cur ? 'on' : ''}" data-${attr}="${a}" ${g.s.cash < a ? 'disabled' : ''}>${a ? W(a) : '베팅 없음'}</button>`).join('');
const sayHtml = t => yunaSay(t ? esc(t) : '', 'pl-say');   /* 유나 말칸 한 곳(screen.js yunaSay) — 떠난 판은 이름 없는 한 줄 */
/* 숫자 굴림 — 0 에서 값까지(움직임 줄이기면 바로) */
function roll(el, to, fmt = signM, ms = 700) { if (!el) return; if (!motion()) { el.textContent = fmt(to); return; } const t0 = performance.now(); const f = t => { const k = Math.max(0, Math.min(1, (t - t0) / ms)), e = 1 - (1 - k) ** 3; el.textContent = fmt(Math.round(to * e)); if (k < 1 && !el.dataset.done) requestAnimationFrame(f); }; el.dataset.done = ''; requestAnimationFrame(f); setTimeout(() => { el.dataset.done = '1'; el.textContent = fmt(to); }, ms + 120); }   /* 그림 틀이 멈춰도 끝 값은 꼭 보임 */
let VS = null, raf = 0, keyFn = null;   /* 지금 장소 창 */
const stop = () => { cancelAnimationFrame(raf); raf = 0; if (keyFn) { removeEventListener('keydown', keyFn); keyFn = null; } };

/* ── 탭 ── */
TABS_ALL.push(['play', '놀이', () => ready() && g.s.phase !== 'end']);
let totoSel = {}, totoAmt = 10000;
PANES.play = { draw(P) {
 if (!ready()) { P.innerHTML = ''; return; } const d = PD(), s = g.s, st = SC().status, pl = s.play;
 const cardOf = v => { if (['lotto', 'toto'].includes(v.id) || (v.unlock === 'house' && !pl.house.known)) return ''; const a = PV().avail(g, v.id);
  const chip = a.ok ? (v.locked ? st.noentry : st.open) : a.why === 'time' ? st[v.when[0]] : a.why === 'reach' ? emo('🔒') + ' ' + st.reach : a.why === 'busy' ? st.busy : a.why === 'lock' ? st.lock : st[v.when[0]] || '';
  return `<button class="pl-card ${a.ok ? '' : 'off'}" data-pv="${v.id}" ${a.ok ? '' : 'disabled'}><span class="pl-bg" style="background-image:url('${art(v.bg)}')"></span><img src="${icon(v.icon)}" alt=""><b>${esc(v.name)}</b><small class="pl-chip ${a.ok ? 'on' : ''}">${chip}</small>${v.fee || v.travel ? `<em>−${W((v.fee || 0) + (v.travel || 0))}</em>` : ''}</button>`; };
 const L = pl.lotto, draw = PV().drawDate(g), mine = L.tickets.filter(t => t.draw === draw), la = PV().avail(g, 'lotto').ok;
 const balls = (nums, bonus) => nums.map(n => `<i class="ball b${Math.ceil(n / 10)}">${n}</i>`).join('') + (bonus ? `<span class="pl-plus">+</span><i class="ball b${Math.ceil(bonus / 10)}">${bonus}</i>` : '');
 const wk = PV().totoWeek(g), ta = PV().avail(g, 'toto').ok, picks = Object.entries(totoSel).filter(([m]) => wk.matches[m]), odds = picks.length ? Math.floor(picks.reduce((n, [m, k]) => n * wk.matches[m].odds[{ H: 0, D: 1, A: 2 }[k]], 1) * 100) / 100 : 0;
 const slips = pl.toto.slips.filter(x => x.draw === wk.draw);
 const H = pl.horse, champ = H && H.champ.at(-1), news = pl.news.slice(-2).reverse();
 P.innerHTML = `<div class="pl-wrap"><div class="pl-grid">${d.venues.map(cardOf).join('')}</div>
 <aside class="pl-side">
  <section class="pl-box"><header><img src="${icon('lotto')}" alt=""><b>로또 6/45</b><small>${md(draw)} ${d.lotto.draw_time}</small></header>
   <div class="pl-tix">${mine.slice(-3).map(t => `<div>${balls(t.nums)}</div>`).join('')}${mine.length > 3 ? `<small>+${mine.length - 3}</small>` : ''}</div>
   <div class="pl-row">${[1, 5, 10].map(n => `<button class="sm" data-lt="${n}" ${!la || s.cash < n * d.lotto.price || mine.length + n > d.lotto.max_games_per_draw ? 'disabled' : ''}>×${n}</button>`).join('')}<span class="pl-n">${mine.length} 게임</span></div>
   ${L.last ? `<div class="pl-last"><small>${md(L.last.draw)}</small>${balls(L.last.win, L.last.bonus)}</div>` : ''}</section>
  <section class="pl-box"><header><img src="${icon('toto')}" alt=""><b>토토</b><small>${md(wk.draw)}</small></header>
   ${wk.matches.map(m => `<div class="pl-match"><span>${esc(m.home)}</span>${['H', 'D', 'A'].map((k, i) => `<button class="sm ${totoSel[m.m] === k ? 'on' : ''}" data-tm="${m.m}" data-tk="${k}" ${ta ? '' : 'disabled'}>${k === 'H' ? 'W' : k === 'D' ? 'D' : 'L'} ${m.odds[i].toFixed(2)}</button>`).join('')}<span>${esc(m.away)}</span></div>`).join('')}
   <div class="pl-row">${amtChips([1000, 10000, 100000, 1000000], totoAmt, 'ta')}${odds ? `<span class="pl-n">×${odds.toFixed(2)}</span>` : ''}<button class="sm primary" id="pl-toto" ${ta && picks.length && s.cash >= totoAmt ? '' : 'disabled'}>매수</button></div>
   ${slips.map(x => `<div class="pl-slip">${x.picks.map(([m, k]) => `${esc(wk.matches[m].home.split(' ')[0])} ${k === 'H' ? 'W' : k === 'D' ? 'D' : 'L'}`).join(' · ')}<b>${W(x.amt)} ×${x.odds}</b></div>`).join('')}</section>
  ${champ || news.length ? `<section class="pl-box pl-news">${champ ? `<div>${emo('🏆')} ${champ.year} · ${esc(champ.name)}</div>` : ''}${news.map(n => `<div>${esc(n.text)}</div>`).join('')}</section>` : ''}
 </aside></div>`;
 on('[data-pv]', dd => openVenue(dd.pv));
 on('[data-lt]', dd => { const r = act('play', ['lotto', { games: +dd.lt }]); if (r) { sfx('page'); floatUp(`로또 ×${dd.lt}`, 'buy', '−', ''); } });
 on('[data-tm]', dd => { if (totoSel[dd.tm] === dd.tk) delete totoSel[dd.tm]; else if (Object.keys(totoSel).length < d.toto.max_picks || totoSel[dd.tm]) totoSel[dd.tm] = dd.tk; pane(); });
 on('[data-ta]', dd => { totoAmt = +dd.ta; pane(); });
 if ($('#pl-toto')) $('#pl-toto').onclick = () => { const r = act('play', ['toto', { picks: Object.entries(totoSel).map(([m, k]) => [+m, k]), amt: totoAmt }]); if (r) { totoSel = {}; floatUp(`토토 ×${r.odds}`, 'buy', '−', ''); pane(); } };
} };
PANES.play.reset = () => { stop(); VS = null; totoSel = {}; };   /* 불러오기 · NEW GAME — 앞 판 장소 창 상태 · 그림 틀 · 키를 비움(검토 11-22) */
const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)} ${'일 월 화 수 목 금 토'.split(' ')[new Date(d + 'T00:00:00Z').getUTCDay()]}`;

/* ── 장소 들어가기 ── */
function openVenue(id, who) {
 const v = V(id), s = g.s; if (!v) return;
 if (id === 'foreign') return act('play', ['foreign']);
 if (['karaoke', 'sgolf'].includes(id) && who === undefined) { const known = T.contacts.filter(p => s.contacts[p.id].known).slice(0, 6);
  if (known.length) { $('#over').innerHTML = `<div class="modal dark pl-who" data-k="pl-who-${id}"><h1>${esc(v.name)}</h1><div class="opts"><button data-pw=""><span class="emo">${emo('🙂')}</span><b>혼자</b></button>${known.map(p => `<button data-pw="${p.id}"><img src="${face(p.portrait)}"><b>${esc(p.name)}</b><small>${esc(T.roles[p.role].name)}</small></button>`).join('')}</div><div class="mb"><button id="pl-back">뒤로</button></div></div>`;
   on('[data-pw]', dd => openVenue(id, dd.pw || null)); $('#pl-back').onclick = () => { $('#over').innerHTML = ''; refresh(); }; return; } }
 enterFx(v.name, s.phase === 'weekend' ? (s.slot ? '일요일' : '토요일') : '밤', () => { const r = run('enter', id, { who: who || null }); if (!r) { floatUp(esc(v.name), 'sys', '×', 'sys'); return refresh(); } if (r.scene) return refresh();
  VS = { id, say: r.first ? r.line : '', who: who || null, sub: {} }; drawVenue(); });
}
globalThis.PLAY_BOX = Object.fromEntries(['horse', 'cycle', 'boat', 'karaoke', 'sgolf', 'arcade', 'casino', 'house'].map(id => [id, () => openVenue(id)]));
PLAY_BOX.race = PLAY_BOX.horse;   /* 지금 주말 지도의 경마공원 핀 */
function clockTxt() { const at = g.s.play.at; if (!at || VS.id !== 'casino') return ''; const m = at.clock, day = m >= 1440 ? '일' : '토', mm = m % 1440; return `${day} ${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`; }
function drawVenue() {
 stop(); const v = V(VS.id);
 $('#over').innerHTML = `<div class="modal dark pl-v pl-${v.id}" data-k="pl-${v.id}"><div class="pl-hero" style="background-image:url('${art(v.bg)}')"><img class="pl-ic" src="${icon(v.icon)}" alt=""><h1>${esc(v.name)}</h1><div class="pl-chips"><span id="pl-clock"></span><span>현금 <b id="pl-cash"></b></span></div></div>${sayHtml(VS.say)}<div class="pl-body" id="pl-body"></div><div class="mb"><button id="pl-leave">떠나기</button></div></div>`;
 VS.say = ''; $('#pl-leave').onclick = leaveVenue; body(); }
function chips() { if ($('#pl-cash')) $('#pl-cash').textContent = M(g.s.cash); if ($('#pl-clock')) { $('#pl-clock').textContent = clockTxt(); $('#pl-clock').hidden = !clockTxt(); } }
function leaveVenue() { stop(); const id = VS && VS.id; run('leave'); VS = null; $('#over').innerHTML = ''; if (id) floatUp(esc(V(id).name), 'sell', '↩', ''); refresh(); }
function body() { chips(); const B = $('#pl-body'); if (!B) return; ({ horse: raceBody, cycle: raceBody, boat: raceBody, karaoke: karaokeBody, sgolf: golfBody, arcade: arcadeBody, casino: casinoBody, house: houseBody }[VS.id])(B); }

/* ── 경주 ── */
function raceBody(B) {
 const kind = VS.id, d = PD(), c = d[kind], card = run('card'), S = VS.sub; if (!card) return leaveVenue();
 if (card.done) { B.innerHTML = `<div class="pl-done">경주 ${c.races_per_day} / ${c.races_per_day} · 완료</div>`; return; }
 S.type ||= c.bet_types[0]; S.amt = S.amt && g.s.cash >= S.amt ? S.amt : d.amounts.find(a => a <= g.s.cash) || 0; if (S.no !== card.no) { S.no = card.no; S.pick = null; S.pick2 = null; }
 const H = g.s.play.horse, stats = d.lines.stats, odds = j => S.type === 'exacta' ? (S.pick != null && S.pick !== j ? card.odds.exacta[S.pick + '-' + j] : card.odds.win[j]) : card.odds[S.type][j];
 const sub = (x, j) => { if (kind === 'horse') { const h = H.pool[x.i], kn = Object.keys(h.known).map(k => `${stats[k]} ${PV().gradeOf(h[k])}`), pd = card.paddock && card.paddock.find(p => p.j === j);
   return [h.knownType ? d.horse.types.find(t => t.id === h.type).name : '', ...kn, pd ? '● ' + pd.word : '', h.hist.slice(-5).join('-')].filter(Boolean).join(' · '); }
  if (kind === 'cycle') return `${x.grade} · ${x.tname} · ${x.power}`; return `${x.course}코스 · 모터 ${x.motor} · ${x.skill}`; };
 B.innerHTML = `<div class="pl-rhead"><b>경주 ${card.no + 1} / ${c.races_per_day}</b>${card.final ? `<span class="pl-gp">${emo('🏆')} ${esc(d.horse.final_name)}</span>` : ''}</div>
 <div class="pl-lanes">${card.runners.map((x, j) => `<button class="pl-lane ${S.pick === j ? 'on' : ''} ${S.pick2 === j ? 'on2' : ''}" data-ln="${j}"><em>${j + 1}</em><span class="pl-ln-t"><b>${esc(x.name)}</b><small>${esc(sub(x, j))}</small></span><span class="pl-track"><i class="pl-runner" data-run="${j}"><img src="${PA().race?.[kind] ? art(PA().race[kind]) : icon(V(kind).icon)}" alt=""></i></span><span class="pl-odd">${odds(j).toFixed(1)}</span></button>`).join('')}</div>
 <div class="pl-ctl"><span class="pl-seg">${c.bet_types.map(t => `<button class="sm ${S.type === t ? 'on' : ''}" data-bt="${t}">${SC().bet_types[t]}</button>`).join('')}</span><span class="pl-seg">${amtChips(d.amounts, S.amt)}</span>
 ${kind === 'horse' ? `<button class="sm" id="pl-pad" ${card.paddock ? 'disabled' : ''}><img class="pl-sic" src="${icon('binoculars')}" alt="">패독</button>` : ''}<button class="primary" id="pl-go" ${S.pick == null || (S.type === 'exacta' && S.pick2 == null) || !S.amt ? 'disabled' : ''}>시작 ▶</button></div><div class="pl-res" id="pl-res"></div>`;
 on('[data-ln]', dd => { const j = +dd.ln; if (S.type === 'exacta' && S.pick != null && S.pick2 == null && j !== S.pick) S.pick2 = j; else { S.pick = j; S.pick2 = null; } raceBody(B); });
 on('[data-bt]', dd => { S.type = dd.bt; S.pick2 = null; raceBody(B); }); on('[data-amt]', dd => { S.amt = +dd.amt; raceBody(B); });
 if ($('#pl-pad')) $('#pl-pad').onclick = () => { run('paddock'); raceBody(B); };
 $('#pl-go').onclick = () => { const r = run('bet', { type: S.type, pick: S.type === 'exacta' ? [S.pick, S.pick2] : S.pick, amt: S.amt }); if (!r) return; chips(); $$('.pl-ctl button, .pl-lane').forEach(b => b.disabled = true); sfx('page');
  const runners = $$('[data-run]'), last = 2.2 + 0.18 * card.runners.length;
  runners.forEach(el => { const j = +el.dataset.run, p = r.order.indexOf(j), dur = p < 0 ? 0 : 2.2 + 0.18 * p; el.style.transition = motion() ? `left ${dur}s cubic-bezier(.3,.1,.3,1)` : 'none'; el.classList.toggle('gone', p < 0); requestAnimationFrame(() => requestAnimationFrame(() => { el.style.left = p < 0 ? '0%' : `calc((100% - 46px) * ${1 - p * 0.07})`; })); });
  setTimeout(() => { const R = $('#pl-res'); if (!R) return; const w = card.runners[r.order[0]];
   R.innerHTML = `<div class="pl-win">1 · ${esc(w.name)}${r.order[1] != null ? ` <small>2 · ${esc(card.runners[r.order[1]].name)}</small>` : ''}${r.pace ? ` <small>${r.pace}</small>` : ''}</div><b class="pl-big ${r.res === 'win' ? 'up' : r.res === 'refund' ? '' : 'dn'}" id="pl-big"></b><span class="pl-tag">${SC().res[r.res]}${r.odds ? ' ×' + r.odds : ''}</span>${r.reveal ? `<small class="pl-rev">${esc(r.reveal.horse)} · ${esc(stats[r.reveal.stat])} ${r.reveal.grade}</small>` : ''}<button class="primary" id="pl-next">${r.done ? '확인' : '다음 경주 ▶'}</button>`;
   roll($('#pl-big'), r.got - r.amt); if (r.res === 'win') sfx('page'); $('#pl-next').onclick = () => raceBody(B); }, motion() ? last * 1000 + 150 : 50); };
}

/* ── 노래방 — 노트가 선에 닿을 때 HIT(Space) ── */
function karaokeBody(B) {
 const d = PD().karaoke, S = VS.sub, at = g.s.play.at; S.song ??= 0; const left = at.paid - at.used;
 B.innerHTML = `<div class="pl-songs">${d.songs.map((t, i) => `<button class="sm ${S.song === i ? 'on' : ''}" data-song="${i}">♪ ${esc(t)}</button>`).join('')}</div>
 <div class="pl-rhythm"><div class="pl-rtrack" id="pl-rt"><i class="pl-hitline"></i></div><div class="pl-ctl"><span class="pl-n">${left > 0 ? left + '분' : '+1H'}</span><button class="primary" id="pl-sing">노래하기 ▶</button><button id="pl-hit" disabled>적중</button></div></div><div class="pl-res" id="pl-res">${S.last ? `<b class="pl-big">${S.last}</b>` : ''}</div>`;
 on('[data-song]', dd => { S.song = +dd.song; karaokeBody(B); });
 $('#pl-sing').onclick = () => { $$('.pl-songs button, #pl-sing').forEach(b => b.disabled = true); playNotes($('#pl-rt'), d.notes, acc => { const r = run('sing', { acc }); if (!r) return karaokeBody(B); S.last = r.score; chips(); karaokeBody(B); const big = $('#pl-res'); big.innerHTML = `<b class="pl-big" id="pl-big"></b><span class="pl-tag">점수</span><span class="pl-chip on">스트레스 ${r.stress}</span>${r.extended ? `<span class="pl-chip">+1H −${W(V('karaoke').fee)}</span>` : ''}`; roll($('#pl-big'), r.score, n => String(n), 1100); if (r.score >= 95) sfx('page'); }); };
}
function playNotes(track, n, done) {
 if (!motion()) return done(0.75);   /* 움직임 줄이기 — 노트 없이 바로 */
 const W = track.clientWidth || 900, hitX = 80, speed = 260, t0 = performance.now() / 1000 + 0.6, notes = Array.from({ length: n }, (_, i) => ({ t: t0 + 0.7 + i * 0.62 + (i % 3) * 0.08, el: null, got: null }));
 notes.forEach(x => { x.el = document.createElement('i'); x.el.className = 'pl-note'; track.appendChild(x.el); });
 const hit = () => { const now = performance.now() / 1000; let best = null; for (const x of notes) if (x.got == null && Math.abs(x.t - now) < 0.3 && (!best || Math.abs(x.t - now) < Math.abs(best.t - now))) best = x; if (!best) return; best.got = 1 - Math.abs(best.t - now) / 0.3; best.el.classList.add(best.got > 0.7 ? 'nice' : 'ok'); sfx('page'); };
 const hb = $('#pl-hit'); hb.disabled = false; hb.onclick = hit; keyFn = e => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); hit(); } }; addEventListener('keydown', keyFn);
 const step = () => { const now = performance.now() / 1000; for (const x of notes) { const xx = hitX + (x.t - now) * speed; x.el.style.transform = `translateX(${xx}px)`; x.el.style.opacity = xx < -40 || xx > W ? 0 : 1; if (x.got == null && now - x.t > 0.3) { x.got = 0; x.el.classList.add('miss'); } }
  if (now > notes.at(-1).t + 0.6) { stop(); hb.disabled = true; return done(notes.reduce((m, x) => m + (x.got || 0), 0) / n); } raf = requestAnimationFrame(step); };
 raf = requestAnimationFrame(step);
}

/* ── 스크린골프 — 게이지를 멈춰 친다 · 타당 내기 ── */
function golfBody(B) {
 const d = PD().sgolf, S = VS.sub, who = VS.who && PEOPLE[VS.who]; S.stake ??= 0; S.shots ||= []; const hole = S.shots.length;
 B.innerHTML = `<div class="pl-ctl"><span class="pl-seg">${amtChips(d.stake, S.stake, 'stk')}</span><span class="pl-n">${who ? esc(who.name) : SC().friend}</span></div>
 <div class="pl-holes">${d.holes.map((p, i) => `<div class="${i === hole ? 'on' : ''}"><small>홀 ${i + 1}</small><b>파 ${p}</b>${S.shots[i] != null ? `<em>${Math.round(S.shots[i] * 100)}</em>` : ''}</div>`).join('')}</div>
 <div class="pl-gauge"><i class="pl-sweet"></i><i class="pl-mark" id="pl-mark"></i></div><div class="pl-ctl"><button class="primary" id="pl-swing">스윙</button></div><div class="pl-res" id="pl-res"></div>`;
 on('[data-stk]', dd => { if (S.shots.length) return; S.stake = +dd.stk; golfBody(B); });
 const mk = $('#pl-mark'), t0 = performance.now(); let pos = 0; const step = t => { pos = 0.5 - 0.5 * Math.cos((t - t0) / 1000 * Math.PI * 1.1); mk.style.left = (pos * 100) + '%'; raf = requestAnimationFrame(step); };
 if (motion()) raf = requestAnimationFrame(step); else { pos = 0.8; mk.style.left = '80%'; }
 $('#pl-swing').onclick = () => { stop(); const acc = Math.max(0, 1 - Math.abs(pos - 0.82) / 0.45); S.shots.push(acc); sfx('page');
  if (S.shots.length < d.holes.length) return golfBody(B);
  const r = run('sgolf', { stake: S.stake, shots: S.shots }); S.shots = []; if (!r) { golfBody(B); return; } chips();
  $('#pl-res').innerHTML = `<table class="pl-sc"><tr><th></th>${r.holes.map((h, i) => `<th>${i + 1}</th>`).join('')}<th>합계</th></tr><tr><td>나</td>${r.holes.map(h => `<td class="${h.you < h.par ? 'up' : h.you > h.par ? 'dn' : ''}">${h.you}</td>`).join('')}<td>${r.you}</td></tr><tr><td>${who ? esc(who.name) : SC().friend}</td>${r.holes.map(h => `<td>${h.friend}</td>`).join('')}<td>${r.friend}</td></tr></table>${r.stake ? `<b class="pl-big ${r.money >= 0 ? 'up' : 'dn'}" id="pl-big"></b>` : ''}<button class="primary" id="pl-next">다음 판 ▶</button>`;
  if (r.stake) roll($('#pl-big'), r.money); $('#pl-swing').disabled = true; $('#pl-next').onclick = () => golfBody(B); };
}

/* ── 오락실 — 인형 뽑기 · 펀치 ── */
function arcadeBody(B) {
 const d = PD().arcade, S = VS.sub; S.game ||= 'claw'; S.prize ??= 0.25 + Math.random() * 0.5;
 B.innerHTML = `<div class="pl-ctl"><span class="pl-seg"><button class="sm ${S.game === 'claw' ? 'on' : ''}" data-ag="claw">인형뽑기 ${W(d.claw.price)}</button><button class="sm ${S.game === 'punch' ? 'on' : ''}" data-ag="punch">펀치 ${W(d.punch.price)}</button></span><span class="pl-n">${PA().dolls ? `<img class="pl-dico" src="${art(PA().dolls[0])}" alt="">` : '🧸'} ${g.s.play.dolls}</span></div>
 ${S.game === 'claw' ? `<div class="pl-claw"><i class="pl-doll" style="left:${S.prize * 100}%">${PA().dolls ? `<img src="${art(PA().dolls[Math.floor(S.prize * 10) % PA().dolls.length])}" alt="">` : '🧸'}</i><i class="pl-arm ${PA().claw ? 'img' : ''}" id="pl-arm">${PA().claw ? `<img src="${art(PA().claw)}" alt="">` : ''}</i></div>` : `<div class="pl-gauge v"><i class="pl-mark" id="pl-arm"></i></div>`}
 <div class="pl-ctl"><button class="primary" id="pl-press">${S.game === 'claw' ? '집기' : '치기'}</button></div><div class="pl-res" id="pl-res"></div>`;
 on('[data-ag]', dd => { S.game = dd.ag; arcadeBody(B); });
 const arm = $('#pl-arm'), t0 = performance.now(); let pos = 0; const step = t => { pos = 0.5 - 0.5 * Math.cos((t - t0) / 1000 * Math.PI * (S.game === 'claw' ? 0.7 : 1.6)); if (S.game === 'claw') arm.style.left = pos * 100 + '%'; else arm.style.left = pos * 100 + '%'; raf = requestAnimationFrame(step); };
 if (motion()) raf = requestAnimationFrame(step); else pos = S.game === 'claw' ? S.prize : 0.9;
 $('#pl-press').onclick = () => { stop(); $('#pl-press').disabled = true; const r = S.game === 'claw' ? run('claw', { off: Math.min(1, Math.abs(pos - S.prize) / 0.25) }) : run('punch', { pow: pos }); if (!r) return arcadeBody(B); chips();
  if (S.game === 'claw') { arm.classList.add('drop'); setTimeout(() => { $('#pl-res').innerHTML = `<b class="pl-big ${r.win ? 'up' : 'dn'}">${r.win ? '획득!' : '빗나감'}</b><button class="primary" id="pl-next">다시</button>`; if (r.win) { sfx('page'); S.prize = 0.25 + Math.random() * 0.5; } $('#pl-next').onclick = () => arcadeBody(B); }, motion() ? 900 : 0); }
  else { $('#pl-res').innerHTML = `<b class="pl-big" id="pl-big"></b><span class="pl-tag">힘</span><button class="primary" id="pl-next">다시</button>`; roll($('#pl-big'), r.score, n => String(n), 900); $('#pl-next').onclick = () => arcadeBody(B); } };
}

/* ── 카지노 ── */
function casinoBody(B) {
 const d = PD().casino, S = VS.sub, at = g.s.play.at; S.game ||= 'bj'; chips();
 if (at.closed && !(S.game === 'bj' && at.bj && at.bj.phase === 'play') && !(S.game === 'ch' && at.ch && at.ch.phase === 'flop')) { B.innerHTML = `<div class="pl-done">${esc(PD().lines.closed)}</div>${sayHtml(PD().lines.casino_closed)}`; return; }
 const tabs = `<div class="pl-ctl"><span class="pl-seg">${SC().games.map(([k, n]) => `<button class="sm ${S.game === k ? 'on' : ''}" data-cg="${k}">${n}</button>`).join('')}</span><span class="pl-n">${esc(d.age)}+</span></div>`;
 B.innerHTML = tabs + '<div id="pl-cz"></div>'; on('[data-cg]', dd => { S.game = dd.cg; casinoBody(B); });
 const Z = $('#pl-cz'); ({ bj: bjBody, ch: chBody, roul: roulBody, slot: slotBody }[S.game])(Z, B);
}
function bjBody(Z, B) {
 const d = PD().casino.blackjack, S = VS.sub, at = g.s.play.at; S.table ||= 'low'; const tb = d.tables.find(t => t.id === S.table), list = PD().amounts.filter(a => a >= tb.min && (!tb.max || a <= tb.max)); S.bet = list.includes(S.bet) ? S.bet : list[0];
 const B0 = at.bj, v = B0 ? viewOf(B0) : null;
 const handHtml = (h, i, live) => `<div class="pl-hand ${live ? 'on' : ''}">${h.cards.map((c, k) => card(c, k)).join('')}<span class="pl-tot">${h.total}</span>${h.res ? `<span class="pl-tag ${['win', 'bj'].includes(h.res) ? 'up' : h.res === 'push' ? '' : 'dn'}">${SC().res[h.res]} ${h.back ? '+' + M(h.back) : ''}</span>` : ''}</div>`;
 const playing = v && v.phase === 'play', h = playing && v.hands[v.idx];
 Z.innerHTML = `<div class="pl-table"><div class="pl-hand dealer">${v ? v.dealer.map((c, k) => card(c, k)).join('') + `<span class="pl-tot">${v.dtotal}</span>` : ''}</div>${v ? v.hands.map((x, i) => handHtml(x, i, playing && i === v.idx)).join('') : ''}</div>
 <div class="pl-ctl">${playing ? `<button class="primary" data-bj="hit">히트</button><button data-bj="stand">스탠드</button><button data-bj="double" ${h.cards.length === 2 && g.s.cash >= h.bet ? '' : 'disabled'}>더블</button><button data-bj="split" ${v.hands.length === 1 && h.cards.length === 2 && Math.min(10, h.cards[0] % 13 + 1) === Math.min(10, h.cards[1] % 13 + 1) && g.s.cash >= h.bet ? '' : 'disabled'}>분할</button>`
  : `<span class="pl-seg">${d.tables.map(t => `<button class="sm ${S.table === t.id ? 'on' : ''}" data-tb="${t.id}">${esc(t.name)}</button>`).join('')}</span><span class="pl-seg">${amtChips(list, S.bet)}</span><button class="primary" id="pl-deal" ${at.closed || !S.bet || g.s.cash < S.bet ? 'disabled' : ''}>거래</button>`}</div>
 <div class="pl-res">${v && v.phase === 'done' ? `<b class="pl-big ${v.back - v.hands.reduce((n, x) => n + x.bet, 0) >= 0 ? 'up' : 'dn'}" id="pl-big"></b>` : ''}</div>`;
 if (v && v.phase === 'done' && !S.rolled) { S.rolled = 1; roll($('#pl-big'), v.back - v.hands.reduce((n, x) => n + x.bet, 0)); } else if (v && v.phase === 'done') $('#pl-big').textContent = signM(v.back - v.hands.reduce((n, x) => n + x.bet, 0));
 on('[data-tb]', dd => { S.table = dd.tb; bjBody(Z, B); }); on('[data-amt]', dd => { S.bet = +dd.amt; bjBody(Z, B); });
 if ($('#pl-deal')) $('#pl-deal').onclick = () => { if (run('bj', 'deal', { bet: S.bet, table: S.table })) { S.rolled = 0; sfx('page'); chips(); bjBody(Z, B); } };
 on('[data-bj]', dd => { if (run('bj', dd.bj)) { chips(); bjBody(Z, B); } });
}
function viewOf(B0) {   /* 화면만의 보기(규칙 바꾸지 않음) — 판이 진행 중이면 딜러 한 장은 가림 */
 const done = B0.phase === 'done', T2 = PV().bjTotal; return { phase: B0.phase, idx: B0.idx, hands: B0.hands.map(h => ({ cards: h.cards, total: T2(h.cards).t, bet: h.bet, res: h.res, back: h.back })), dealer: done ? B0.dealer : [B0.dealer[0], -1], dtotal: done ? T2(B0.dealer).t : Math.min(10, B0.dealer[0] % 13 + 1) + (B0.dealer[0] % 13 === 0 ? 10 : 0), back: B0.back || 0 };
}
function chBody(Z) {
 const d = PD().casino.holdem, S = VS.sub, at = g.s.play.at, C = at.ch, list = PD().amounts.filter(a => a >= d.min_ante); S.ante = list.includes(S.ante) ? S.ante : list[0];
 const v = C && { p: C.p, board: C.phase === 'done' && C.res !== 'fold' ? C.board : C.board.slice(0, 3), d: C.phase === 'done' && C.res !== 'fold' ? C.d : [-1, -1], phase: C.phase, res: C.res, back: C.back || 0, ante: C.ante, pcat: C.pcat, dcat: C.dcat }, H = SC().hands;
 const spent = v ? (v.res === 'fold' ? v.ante : v.ante * (1 + d.call_mult)) : 0;
 Z.innerHTML = `<div class="pl-table">${v ? `<div class="pl-hand dealer">${v.d.map((c, k) => card(c, k)).join('')}${v.dcat ? `<span class="pl-tag">${H[v.dcat]}</span>` : ''}</div><div class="pl-hand board">${v.board.map((c, k) => card(c, k)).join('')}</div><div class="pl-hand on">${v.p.map((c, k) => card(c, k)).join('')}${v.pcat ? `<span class="pl-tag">${H[v.pcat]}</span>` : ''}</div>` : ''}</div>
 <div class="pl-ctl">${v && v.phase === 'flop' ? `<button class="primary" data-ch="call">전화 ${M(v.ante * d.call_mult)}</button><button data-ch="fold">폴드</button>` : `<span class="pl-seg">참가비 ${amtChips(list.slice(0, 5), S.ante)}</span><button class="primary" id="pl-deal" ${at.closed || g.s.cash < S.ante * (1 + d.call_mult) ? 'disabled' : ''}>거래</button>`}</div>
 <div class="pl-res">${v && v.phase === 'done' ? `<span class="pl-tag">${SC().res[v.res] || v.res}</span><b class="pl-big ${v.back - spent >= 0 ? 'up' : 'dn'}">${signM(v.back - spent)}</b>` : ''}</div>`;
 on('[data-amt]', dd => { S.ante = +dd.amt; chBody(Z); });
 if ($('#pl-deal')) $('#pl-deal').onclick = () => { if (run('ch', 'deal', { ante: S.ante })) { sfx('page'); chips(); chBody(Z); } };
 on('[data-ch]', dd => { if (run('ch', dd.ch)) { chips(); chBody(Z); } });
}
function roulBody(Z) {
 const d = PD().casino.roulette, S = VS.sub; S.rb ||= []; S.ramt ||= 10000;
 const lab = b => b.k === 'num' ? '#' + b.n : SC().roulette.find(x => x[0] === b.k && (x[2] == null || x[2] === b.n))[1];
 Z.innerHTML = `<div class="pl-wheel"><b id="pl-num" class="${S.last != null ? (S.last === 0 ? 'z' : d.red.includes(S.last) ? 'r' : 'k') : ''}">${S.last ?? '—'}</b></div>
 <div class="pl-ctl"><span class="pl-seg">${SC().roulette.map(([k, n, x]) => `<button class="sm" data-rk="${k}" data-rn="${x ?? ''}">${n}</button>`).join('')}</span></div>
 <div class="pl-nums">${Array.from({ length: 37 }, (_, n) => `<button class="sm ${n === 0 ? 'z' : d.red.includes(n) ? 'r' : 'k'}" data-rk="num" data-rn="${n}">${n}</button>`).join('')}</div>
 <div class="pl-ctl"><span class="pl-seg">${amtChips([1000, 10000, 100000, 1000000], S.ramt, 'ra')}</span><span class="pl-n">${S.rb.map(b => `${lab(b)} ${M(b.amt)}`).join(' · ') || '—'}</span><button class="sm" id="pl-clr" ${S.rb.length ? '' : 'disabled'}>클리어</button><button class="primary" id="pl-spin" ${S.rb.length && !g.s.play.at.closed ? '' : 'disabled'}>돌리기</button></div><div class="pl-res" id="pl-res"></div>`;
 on('[data-rk]', dd => { S.rb.push({ k: dd.rk, n: dd.rn === '' ? undefined : +dd.rn, amt: S.ramt }); roulBody(Z); }); on('[data-ra]', dd => { S.ramt = +dd.ra; roulBody(Z); });
 $('#pl-clr').onclick = () => { S.rb = []; roulBody(Z); };
 $('#pl-spin').onclick = () => { const r = run('roul', { bets: S.rb }); if (!r) return; chips(); $$('#pl-cz button').forEach(b => b.disabled = true); const el = $('#pl-num'); let k = 0; const fin = () => { S.last = r.n; roulBody(Z); $('#pl-res').innerHTML = `<b class="pl-big ${r.back - r.sum >= 0 ? 'up' : 'dn'}" id="pl-big"></b>`; roll($('#pl-big'), r.back - r.sum); };
  if (!motion()) return fin(); const tick = () => { el.textContent = Math.floor(Math.random() * 37); el.className = ''; if (++k < 18) setTimeout(tick, 40 + k * 8); else fin(); }; tick(); sfx('page'); };
}
function slotBody(Z) {
 const d = PD().casino.slot, S = VS.sub, sym = SC().symbols; S.sbet = d.bets.includes(S.sbet) ? S.sbet : d.bets[0];
 Z.innerHTML = `<div class="pl-reels">${(S.reels || ['seven', 'seven', 'seven']).map((k, i) => `<b data-rl="${i}">${symH(k)}</b>`).join('')}</div><div class="pl-ctl"><span class="pl-seg">${amtChips(d.bets, S.sbet, 'sb')}</span><button class="primary" id="pl-spin" ${g.s.cash < S.sbet || g.s.play.at.closed ? 'disabled' : ''}>돌리기</button></div><div class="pl-res" id="pl-res"></div>`;
 on('[data-sb]', dd => { S.sbet = +dd.sb; slotBody(Z); });
 $('#pl-spin').onclick = () => { const r = run('slot', { bet: S.sbet }); if (!r) return; chips(); $('#pl-spin').disabled = true; const els = $$('[data-rl]'), keys = Object.keys(sym);
  const fin = () => { S.reels = r.reels; slotBody(Z); $('#pl-res').innerHTML = `<b class="pl-big ${r.back - r.bet >= 0 ? 'up' : 'dn'}" id="pl-big"></b>`; roll($('#pl-big'), r.back - r.bet); if (r.back > r.bet) sfx('page'); };
  if (!motion()) return fin(); let k = 0; const tick = () => { els.forEach((el, i) => { el.innerHTML = symH(k < 8 + i * 5 ? keys[Math.floor(Math.random() * keys.length)] : r.reels[i]); }); if (++k < 20) setTimeout(tick, 55); else fin(); }; tick(); };
}

/* ── 하우스 고스톱 ── */
function houseBody(B) {
 const d = PD().house, S = VS.sub, at = g.s.play.at; S.stake = d.stake.includes(S.stake) ? S.stake : d.stake[0]; const G = at && at.gs;
 if (!at) return;
 const v = G && { hand: G.hands[0], floor: G.floor, piles: G.piles, scores: G.piles.map(PV().gsScore), go: G.go, need: G.need, phase: G.phase, deck: G.deck.length, money: G.money, nagari: G.nagari, raid: G.raid, winner: G.winner, cut: G.cut, score: G.score, mul: G.mul };
 const pileSum = p => SC().piles.map(([k, n]) => `${n} ${k === 'pi' ? PV().gsPi(p) : p.filter(c => PD().hwatu[c][1] === k || (k === 'tti' && ['hong', 'cheong', 'cho', 'tti'].includes(PD().hwatu[c][1]))).length}`).join(' · ');
 B.innerHTML = v ? `<div class="pl-gs">
  <div class="pl-opp">${[1, 2].map(i => `<div class="${v.phase === 'done' && v.winner === i ? 'win' : ''}"><b>${esc(d.names[i - 1])}</b><small>${pileSum(v.piles[i])}</small><span class="pl-chip ${v.scores[i] >= d.go_from ? 'on' : ''}">${v.scores[i]}${v.go[i] ? ` · ${v.go[i]}진행` : ''}</span></div>`).join('')}<div><small>덱</small><b>${v.deck}</b>${v.mul > 1 ? `<span class="pl-chip on">×${v.mul}</span>` : ''}</div></div>
  <div class="pl-floor">${v.floor.map((c, k) => hw(c, '', k)).join('')}</div>
  <div class="pl-mine"><small>${pileSum(v.piles[0])}</small><span class="pl-chip ${v.scores[0] >= d.go_from ? 'on' : ''}">${v.scores[0]}${v.go[0] ? ` · ${v.go[0]}진행` : ''}</span></div>
  <div class="pl-myhand">${v.hand.map((c, i) => `<button class="hwb" data-hw="${i}" ${v.need === 'play' ? '' : 'disabled'}>${hw(c, PD().hwatu.length && v.floor.some(f => PD().hwatu[f][0] === PD().hwatu[c][0]) ? 'm' : '', i)}</button>`).join('')}</div></div>` : '';
 const ctl = v && v.need === 'gostop' ? `<button class="primary" id="pl-go">진행</button><button id="pl-stop">멈춤</button>`
  : !v || v.phase === 'done' ? `<span class="pl-seg">${amtChips(d.stake, S.stake, 'hs')}</span><button class="primary" id="pl-deal" ${g.s.cash < S.stake * d.seed_points ? 'disabled' : ''}>거래</button>` : '';
 B.insertAdjacentHTML('beforeend', `<div class="pl-ctl">${ctl}</div><div class="pl-res" id="pl-res">${v && v.phase === 'done' ? (v.nagari ? `<b class="pl-big">나가리</b><span class="pl-chip on">다음 ×2</span>` : `<span class="pl-tag">${v.winner === 0 ? '승리' : '패배'} · ${v.score}</span><b class="pl-big ${v.money >= 0 ? 'up' : 'dn'}">${signM(v.money)}</b>${v.cut ? `<span class="pl-chip">−${M(v.cut)}</span>` : ''}`) : ''}</div>`);
 on('[data-hs]', dd => { S.stake = +dd.hs; houseBody(B); });
 const after = r => { if (!r) return houseBody(B); chips(); if (r.bust) return bustFx(r); houseBody(B); };
 if ($('#pl-deal')) $('#pl-deal').onclick = () => { sfx('page'); after(run('gs', 'deal', { stake: S.stake })); };
 on('[data-hw]', dd => after(run('gs', 'play', { idx: +dd.hw })));
 if ($('#pl-go')) $('#pl-go').onclick = () => after(run('gs', 'go')); if ($('#pl-stop')) $('#pl-stop').onclick = () => after(run('gs', 'stop'));
}
function bustFx() { stop(); VS = null; const O = $('#over'); O.innerHTML = `<div class="modal dark pl-bust" data-k="pl-bust" ${PA().raid ? `style="background:linear-gradient(rgba(90,11,16,.55),rgba(90,11,16,.75)),url('${art(PA().raid)}') center/cover !important"` : ''}><h1>${esc(PD().lines.bust)}</h1></div>`; sfx('door'); setTimeout(() => { O.innerHTML = ''; refresh(); }, motion() ? 1400 : 300); }

/* ── 결과 창(규칙이 s.msgs 에 넣은 것) ── */
const ballRow = (win, bonus) => win.map((n, i) => `<i class="ball b${Math.ceil(n / 10)} pl-pop" style="--d:${i * 0.25}s">${n}</i>`).join('') + `<span class="pl-plus">+</span><i class="ball b${Math.ceil(bonus / 10)} pl-pop" style="--d:${win.length * 0.25 + 0.2}s">${bonus}</i>`;
MSGS.play_lotto = (m, k) => { const L = PD().lines.lotto_say, best = m.best || 0;
 return k.head('로또', best && best <= 3 ? 'surprise' : best ? 'wink' : 'base', `<small class="wk-d">${md(m.draw)} · ${m.games} 게임</small><div class="pl-balls">${ballRow(m.win, m.bonus)}</div>${m.rows.filter(r => r.rank).slice(0, 3).map(r => `<div class="pl-tixr"><span class="pl-rank">${r.rank}등</span>${r.nums.map(n => `<i class="ball sm ${m.win.includes(n) ? 'b' + Math.ceil(n / 10) : 'dim'}">${n}</i>`).join('')}</div>`).join('')}${m.gross ? k.kv('당첨금', M(m.gross), 'up') + (m.tax ? k.kv('세금', '−' + M(m.tax), 'dn') : '') : ''}`, esc(L[best] || L['0'])); };
MSGS.play_toto = (m, k) => { const L = PD().lines.toto_say, wl = x => x === 'H' ? 'W' : x === 'D' ? 'D' : 'L';
 return k.head('토토', m.got ? 'wink' : 'base', `<small class="wk-d">${md(m.draw)}</small>${m.matches.map((x, i) => `<div class="pl-match"><span>${esc(x.home)}</span><b>${wl(m.out[i])}</b><span>${esc(x.away)}</span></div>`).join('')}${m.rows.map(r => `<div class="pl-slip ${r.hit ? 'up' : 'dn'}">${r.picks.map(([i, x]) => wl(x)).join(' · ')} ×${r.odds}<b>${r.hit ? '+' + M(r.got) : '−' + M(r.amt)}</b></div>`).join('')}`, esc(m.got ? L.hit : L.miss)); };
MSGS.play_hint = (m, k) => k.head('귀띔', 'base', `<h2>${esc(m.from)}</h2><div class="bn-q">"${esc(m.text)}"</div>`, '');
MSGS.play_invite = (m, k) => k.head('전화', 'worry', `<h2>${esc(m.from)}</h2><div class="bn-q">"${esc(m.text)}"</div>`, esc(PD().lines.invite_say));
MSGS.play_bust = (m, k) => k.head('버스트', 'worry', `<h2>${m.kind === 'habitual' ? '상습 도박' : '도박'}</h2>${k.kv('벌금', '−' + M(m.fine), 'dn')}${k.kv('적발', m.n + '번째')}`, esc(m.kind === 'habitual' ? PD().lines.habitual : PD().lines.bust_say));
MSGS.play_line = (m, k) => k.head('공지', 'base', `<div class="bn-q">${esc(m.text)}</div>`, esc(PD().lines.first[m.venue] || ''));
})();

/* ── s_reward.js ── */
/* 화면 장치 · 첫 달 작은 보상(11-22 결정 D-068 · 규칙 m_reward.js · 글은 03_자료/장치/reward.json ui) — ① 판의 첫 업적 = 짧은 축하 카드(나머지 업적은 지금처럼 한 줄) ② 랭킹 다가감 = 한 줄 알림.
   설명 글 없음(이름 · 값 · 짧은 상태 · 유나 한마디만) · 카드는 큰 소식 창 꼴(서서히 나타나고 사라짐 · 움직임 줄이기 따름). */
'use strict';
(function () {
const RW = () => T.dev?.reward?.ui || null;
/* ① 첫 업적 — sim.achieve 가 first 표시를 단 업적 창만 이리 옴(msgBox 'ach' 길) */
MSGS.ach = (m, k) => { const U = RW() || {}, a = ACH[m.id] || { name: m.id, text: '' };   /* 처음 뜰 때 한 번 날아와 뒤집힘(feel.json flip.types 'ach') */
 return k.head(esc(U.ach_tag || '클리어'), 'proud', `<h2>★ ${esc(a.name)}</h2><div class="bn-q">${esc(a.text)}</div>`, esc(U.ach_say || '')); };
/* ② 랭킹 다가감 — 장 마감에 규칙이 적은 것(s.reward.near)을 한 번만 한 줄로 · 평일 저녁 없이 다음 날로 넘어가도 그다음 날 아침까지는 띄움 · 본 것은 s.uiNear(불러와도 다시 안 뜸) */
HUD.push(() => { const r = g?.s?.reward, U = RW(); if (!r?.near || !U || g.s.day - r.near.day > 1) return; const key = r.near.day + ':' + r.near.to; if (g.s.uiNear === key) return; g.s.uiNear = key;
 floatUp(esc(Toy2.fmt(U.near, { to: r.near.to, gap: M(r.near.gap) })), 'buy', '▲', 'kA', 'rank_near'); });
})();

/* ── s_secretary.js ── */
/* 비서 탭(화면 장치 · 11-23 대표님 '큰 파일 나누기 — 나눠') — screen.js 에서 함수만 옮김 · 동작 그대로 · 상태 변수(secView · ysSheet · yunaView 등)와 짧은 도우미(chatSeen · yRate · md)는 screen.js 에 둠(처음 불러올 때 이름이 있게) */
function secChat(s) {   /* 오늘 대화 — 플레이어가 빠른 답으로 한 말은 판 상태 uiChat(그날만) */
 if (s.uiChat?.day !== s.day) s.uiChat = { day: s.day, items: [] };
 return s.uiChat;
}
function secMode(s) { const m = s.msgs[0]; return m?.type === 'senior' ? 'night' : s.phase === 'evening' ? 'evening' : s.phase === 'weekend' ? 'weekend' : 'open'; }
function yunaBubbles(s) {   /* 유나가 오늘 보낸 말(안 읽은 수 셈에도 씀) */
 const mode = secMode(s), out = [];
 if (mode === 'open') { out.push({ t: 0, at: hm(g.openMin()), text: '좋은 아침이에요, 사장님. 오늘 뉴스부터 봐요.' });
  for (const f of s.shown.filter(f => f.day === s.day && f.kind === 'news' && f.stock).slice(-2)) { const src = SRC[f.src], n = src?.stars ?? 0;
   out.push({ t: f.t, at: hm(g.openMin() + f.t), text: `이거 ${src ? src.name + '발' : '소문'}이에요. ${n ? '별 ' + ['', '하나', '둘', '셋'][n] : '별 없음'}.`, news: f }); }
  if (s.minute >= 120) out.push({ t: s.minute, at: hm(g.openMin() + s.minute), text: s.stress >= N.sick_from ? '사장님, 오늘은 좀 쉬세요. 얼굴이 안 좋아요.' : '장중엔 서두르지 마세요. 별을 보세요.' }); }
 if (mode === 'weekend') out.push({ t: 0, at: '10:00', text: '쉬는 날엔 쉬셔야 오래 가요.' });
 if (mode === 'evening') { const pnl = g.netWorth() - s.dayStart;
  out.push({ t: 0, at: hm(g.closeMin() + 1), text: pnl >= 0 ? (s.day ? '잘하셨어요, 사장님.' : '첫날치곤 괜찮았어요.') : '내일 만회해요.' });   /* 오늘 손익은 위 띠가 원본 — 결산은 이 말에 붙는 카드(D-045) */
  out.push({ t: 1, at: hm(g.closeMin() + 2), text: s.uiAppointment && s.uiAppointment !== 'yuna' ? `오늘은 ${PEOPLE[s.uiAppointment]?.name || ''}님 만나기로 하셨죠?` : '수고하셨어요, 사장님. 저녁은 어떻게 하실래요?' }); }
 return out;
}
function secBadge() { const s = g.s, b = $('.numtabs [data-tab=senior]'); if (!b || title) return; const n = yunaBubbles(s).length;
 if (tab === 'senior' && secView === 'chat') s.uiSecSeen = { day: s.day, mode: secMode(s), n }; const seen = chatSeen(s);   /* 태블릿 첫 화면은 HOME — 대화(CHAT)를 실제로 봤을 때만 읽음(11-22 대표님 'CHAT 1 이 안 사라짐') */
 const dot = $('#hb-dot'); if (dot) dot.hidden = !(n > seen);
 const cap = k => k > 99 ? '99+' : k;   /* 세 자리면 둥근 표시 밖으로 넘치던 것(11-23 화면 전수 누르기 사진 '190') */
 if (n > seen && tab !== 'senior' && tab !== 'home') b.dataset.badge = cap(n - seen); else delete b.dataset.badge;
 const pb = $('.numtabs [data-tab=people]'), un = T.contacts.reduce((k, c) => k + unreadOf(c.id), 0); if (pb) { if (un && tab !== 'people') pb.dataset.badge = cap(un); else delete pb.dataset.badge; } }
function ysSheetHtml(s) {
 const lv = g.seniorLvl(), cell = (k, v, c = '') => `<div><small>${k}</small><b class="${c}">${v}</b></div>`, back = '<button class="sm mk-x" data-ys-back>닫기 ✕</button>';
 const li = (a, b, c, d, cls = '') => `<div class="ysl"><span class="t">${a}</span><span>${b}</span><span>${c}</span><span class="r ${cls}">${d}</span></div>`;
 if (ysSheet === 'me') {
  const words = T.rel_words.yuna, cur = words.indexOf(relWord('yuna')), r = yRate(s), last = s.uiYunaLast, nx = lv < 5 ? (lv + 1) * 20 : null, log = (s.yunaTip?.log || []).slice(-3).reverse();
  return `<div class="mk-hd"><b>${SNAME}</b>${back}</div>
   <div class="ysm-lad">${words.map((w, i) => `<span class="${i === cur ? 'on' : ''}">${i <= cur + 1 ? esc(w) : '?'}</span>`).join('')}</div>
   <div class="ysm-trust">신뢰<span class="ys-meter pink"><i style="width:${nx ? Math.min(100, s.senior / nx * 100) : 100}%"></i></span><b>${Math.round(s.senior)}${nx ? ' / ' + nx : ''}</b></div>
   <div class="mk-cells">${cell('귀띔 맞힘', r ? `${r.hit} / ${r.k} · ${r.p}%` : '—')}${cell('받은 귀띔', (s.yunaTip?.n || 0) + '번')}${cell('마지막 저녁', last == null ? '없음' : last === s.day || secMode(s) === 'night' && last === s.day - 1 ? '오늘' : `${s.day - last}거래일 전`)}</div>
   ${log.length ? `<h3 class="ysm-h">귀띔 기록</h3><div class="ysm-list">${log.map(x => li(md(x.day), esc(ST[x.stock].name), `<span class="${x.dir > 0 ? 'up' : 'dn'}">${x.dir > 0 ? '▲' : '▼'}</span>`, x.hit ? '적중' : '빗나감', x.hit ? 'ok' : 'no')).join('')}</div>` : ''}`; }
 if (ysSheet === 'report') {
  const y0 = DAYS[s.day].slice(0, 4), h = s.hist.filter(x => DAYS[x.d]?.startsWith(y0)), base = h.length ? h[0].nw - h[0].pnl : s.start, now = g.netWorth(), got = T.achievements.filter(a => s.ach[a.id]).sort((a, b) => s.ach[b.id] - s.ach[a.id]), nx = T.achievements.find(a => !s.ach[a.id] && !g.achView(a).hidden);
  return `<div class="mk-hd"><b>${y0} 연간 리포트</b>${back}</div>
   <div class="mk-cells">${cell(`올해 · 시작 ${M(base)}에서`, `${now >= base ? '+' : '−'}${M(Math.abs(now - base))}`, now >= base ? 'up' : 'dn')}${cell('랭킹', g.rank() + '위')}${cell('업적', `${got.length} / ${T.achievements.length}`)}</div>
   <div class="ysm-chart"><canvas id="ys-nw" width="1100" height="200"></canvas><span style="left:14px;bottom:6px">${h.length ? md(h[0].d) : ''}</span><span style="right:14px;bottom:6px">${md(s.day)}</span></div>
   <h3 class="ysm-h">업적</h3><div class="ysm-list">${got.slice(0, 2).map(a => li(md(Math.max(0, s.ach[a.id] - 1)), esc(a.name), '', '획득', 'ok')).join('')}${nx ? li('다음', esc(nx.name), esc(nx.hidden ? nx.text : T.dev?.yuna2?.ui?.goal_text?.[nx.id] || nx.text), '').replace('class="ysl"', 'class="ysl off"') : ''}</div>`; }
 if (ysSheet === 'close') {
  const live = g.stocks.filter(x => !s.delisted[x.id]).map(x => [x, dayChg(x.id)]).sort((a, b) => b[1] - a[1]), rk = g.rank(), prev = s.uiRankDay?.rank, tip = (s.yunaTip?.log || []).find(x => x.at === s.day), tr = s.uiTrades?.day === s.day ? s.uiTrades.items : [];
  return `<div class="mk-hd"><b>장 마감 · ${md(s.day)}</b>${back}</div>
   <div class="mk-cells">${cell('거래', s.tradesToday + '회')}${cell('랭킹', `${rk}위${prev && prev !== rk ? ` <span class="${prev > rk ? 'up' : 'dn'}">${prev > rk ? '▲' : '▼'}${Math.abs(prev - rk)}</span>` : ''}`)}${cell('오늘 귀띔', tip ? (tip.hit ? '적중' : '빗나감') : '—', tip ? (tip.hit ? 'ok' : 'no') : '')}</div>
   <div class="mk-cells" style="grid-template-columns:1fr 1fr">${cell('최고', `${esc(live[0][0].name)} <span class="up">${pct1(live[0][1])}</span>`)}${cell('최저', `${esc(live.at(-1)[0].name)} <span class="dn">${pct1(live.at(-1)[1])}</span>`)}</div>
   ${tr.length ? `<h3 class="ysm-h">거래</h3><div class="ysm-list">${tr.slice(-4).map(x => li(x.at, esc(ST[x.id].name), x.side === 'buy' ? '매수' : '매도', M(x.v))).join('')}</div>` : ''}`; }
 if (ysSheet?.startsWith('buy:')) {   /* 목업 F6 */
  const it = window.Toy2Yuna2?.outfit?.(ysSheet.slice(4)); if (!it) return '';
  return `<div class="mk-hd"><h2>${esc(it.name)}</h2><button class="sm mk-x" data-ys-back>닫기 ✕</button></div><img class="st-buyim" src="${art('착장/yuna_' + it.id + '_base.png')}" alt="${esc(it.name)}">
   <div class="mk-cells" style="grid-template-columns:1fr 1fr">${cell('값', M(it.price))}${cell('현금', `${M(s.cash)} → ${M(s.cash - it.price)}`)}</div><div class="st-buyb"><button data-ys-back>취소</button><button class="primary" data-buy="${it.id}" ${window.Toy2Yuna2.canBuy(g, it.id) ? '' : 'disabled'}>매수</button></div>`; }
 if (ysSheet === 'eve') {
  const b = (ev, name, sub, off) => `<button data-ev="${ev}" ${off ? 'disabled' : ''}><span>${name}</span><small>${sub}</small></button>`;
  return `<div class="mk-hd"><h2>다른 계획</h2><button class="sm mk-x" data-ys-back>닫기 ✕</button></div><div class="ysm-eve">${b('pub', '호프집 갈래', '소문 · 새 사람')}${b('study', '공부할래', '시장 지식 +')}${lv >= N.senior_paid_level ? b('paid', '유료 분석 부탁해', M(g.paidCost()) + ' · 추천 종목', s.cash < g.paidCost()) : ''}<button data-yq="more"><span>다른 사람 만나기</span><small>›</small></button></div>`; }
 return '';
}
function ysNwChart() { const cv = $('#ys-nw'); if (!cv) return; const s = g.s, y0 = DAYS[s.day].slice(0, 4), d = s.hist.filter(x => DAYS[x.d]?.startsWith(y0)), c = cv.getContext('2d'), w = cv.width, h = cv.height; c.clearRect(0, 0, w, h); if (d.length < 2) return;
 const v = d.map(x => x.nw), base = d[0].nw - d[0].pnl, lo = Math.min(base, ...v), hi = Math.max(base, ...v), y = x => h - 30 - (x - lo) / (hi - lo || 1) * (h - 50), X = i => 10 + i / (v.length - 1) * (w - 20);
 c.setLineDash([8, 8]); c.strokeStyle = '#2c3870'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y(base)); c.lineTo(w, y(base)); c.stroke(); c.setLineDash([]);
 c.beginPath(); v.forEach((x, i) => i ? c.lineTo(X(i), y(x)) : c.moveTo(X(i), y(x))); c.strokeStyle = '#f2c14e'; c.lineWidth = 4; c.stroke(); }
function secShell(P, mode) {
 const s = g.s, A = window.Toy2Yuna2, y2ok = !!(A?.data?.() && s.yuna2);
 const bg = mode === 'weekend' ? art(HOUSE[s.house].bg) : art(mode === 'open' ? '배경/in_office_sales.jpg' : '배경/in_ceo_office.jpg');
 const ill = fullArt('yuna', mode === 'open' && s.stress >= N.sick_from ? 'worry' : Y_FACE[mode]);   /* 입은 착장 · 표정은 fullArt 가 따름 */
 const views = [['chat', '대화'], ...(y2ok ? [['report', '리포트'], ['data', '데이터']] : []), ['annual', '연간'], ['closet', '옷장']];   /* ANNUAL = DATA 와 CLOSET 사이 · 해마다 한 장(11-23 대표님) */
 if (!views.some(v => v[0] === secView)) secView = 'chat';
 const nb = yunaBubbles(s).length; if (secView === 'chat') s.uiSecSeen = { day: s.day, mode, n: nb };   /* 대화를 열면 읽음 */
 const unread = Math.max(0, nb - chatSeen(s));
 const rail = views.map(([k, n]) => `<button class="${secView === k ? 'on' : ''}" data-sv="${k}">${n}${k === 'chat' && unread ? `<i class="st-bd">${unread}</i>` : ''}</button>`).join(''), key = bg + '|' + ill;
 if (P.querySelector('.st-tab') && P.dataset.sec === key) {   /* 겉(배경 · 유나 · 태블릿 틀)은 그대로 두고 띠 · 본문만 바꿈 — 누를 때마다 탭 전체가 다시 떠오르지 않게(11-22 대표님) */
  $('.st-rail').innerHTML = rail; const M0 = $('#st-main'); M0.className = 'st-main'; M0.innerHTML = '';
 } else {
  P.dataset.sec = key; delete P.dataset.nb;
  P.innerHTML = `<div class="ys-bg" style="background-image:url('${bg}')"></div><img class="ys-ill st-ill${yunaView === 'full' ? ' full' : ''}" src="${ill}" alt="${SNAME}">
  <div class="st-yv">${[['full', '축소'], ['close', '확대']].map(([k, n]) => `<button class="${yunaView === k ? 'on' : ''}" data-yv="${k}">${n}</button>`).join('')}</div>
  <div class="st-tab"><nav class="st-rail">${rail}</nav><div class="st-main" id="st-main"></div></div>`;
 }
 on('[data-yv]', (d, b) => { yunaView = d.yv; try { localStorage.setItem('ydo_yuna_view', yunaView); } catch { /* 못 써도 이번 화면에선 그대로 */ } $('.st-ill')?.classList.toggle('full', yunaView === 'full'); $$('[data-yv]').forEach(x => x.classList.toggle('on', x === b)); });   /* 유나 그림만 바꿈 */
 return { M2: $('#st-main'), y2ok, A };
}
function secYears(s) {   /* 해마다 한 줄 — s.hist 를 해로 묶음 · 지난해 랭킹 · 업적은 연말 기록(s.years · sim.js 달 정산) · 올해는 지금 값 */
 const by = {}; for (const x of s.hist) { const y = DAYS[x.d]?.slice(0, 4); if (y) (by[y] ||= []).push(x); }
 const y0 = DAYS[s.day].slice(0, 4); by[y0] ||= [];
 return Object.keys(by).sort().reverse().map(y => { const h = by[y], now = y === y0, base = h.length ? h[0].nw - h[0].pnl : s.start, nw = now ? g.netWorth() : h.at(-1).nw, Y = s.years?.[y];
  return { y: +y, now, pnl: nw - base, nw, rank: now ? g.rank() : Y?.rank ?? null, ach: now ? Object.keys(s.ach).length : Y?.ach ?? Object.values(s.ach).filter(d => DAYS[d - 1]?.slice(0, 4) <= y).length }; });
}
function drawSecTab(P, mode) {
 const s = g.s, { M2, y2ok, A } = secShell(P, mode);
 if (secView === 'annual') {   /* 해마다 한 장 — 맨 위 올해(진행 중) · 아래로 지난해 · 누르면 그해 결산(11-23 대표님 · 목업 09_목업/비서연간_1123) */
  const U = A?.data?.()?.ui?.annual || {}, yt = s.yunaTip || {}, yrs = secYears(s);
  if (secYear != null && !yrs.some(x => x.y === secYear)) secYear = null;
  const row = x => `<button class="st-yc ${x.now ? 'now' : ''}" data-yr="${x.y}"><span class="y">${x.now ? `<small>${esc(U.now || '')}</small>` : ''}${x.y}</span><span class="k"><span>${esc(U.pnl || '')}<b class="${x.pnl >= 0 ? 'up' : 'dn'}">${x.pnl >= 0 ? '+' : '−'}${M(Math.abs(x.pnl))}</b></span><span>${esc(U.nw || '')}<b>${M(x.nw)}</b></span><span>${esc(U.rank || '')}<b>${x.rank == null ? '—' : x.rank + '위'}</b></span><span>${esc(U.ach || '')}<b>${x.ach} / ${T.achievements.length}</b></span></span><i class="ys-go">›</i></button>`;
  if (secYear == null) M2.innerHTML = `<div class="st-hd"><b class="st-t">${esc(U.title || '연간')}</b></div><div class="st-yr">${yrs.map(row).join('')}</div>`;
  else {
   const x = yrs.find(v => v.y === secYear), L = (yt.log || []).filter(v => DAYS[v.day]?.startsWith(String(x.y))), hit = L.filter(v => v.hit).length;
   const cell = (k, v, c = '') => `<div class="st-w"><small>${esc(k)}</small><b class="${c}">${v}</b></div>`;
   M2.innerHTML = `<button class="st-back" data-yr="">‹ ${esc(U.title || '연간')}</button><div class="st-hd"><b class="st-t">${x.y} 연간 리포트</b></div>
    <div class="st-ad">${cell(U.pnl || '', `${x.pnl >= 0 ? '+' : '−'}${M(Math.abs(x.pnl))}`, x.pnl >= 0 ? 'up' : 'dn')}${cell(U.nw || '', M(x.nw))}${cell(U.rank || '', x.rank == null ? '—' : x.rank + '위')}${cell(U.ach || '', `${x.ach} / ${T.achievements.length}`)}${cell(U.tip || '', L.length ? Math.round(hit / L.length * 100) + '%' : '—')}</div>
    <div class="ys-b st-asay">${esc(x.pnl >= 0 ? U.say_up || '' : U.say_dn || '')}</div>`;
  }
  on('[data-yr]', d => swapView(() => { secYear = d.yr === '' ? null : +d.yr; pane(); }));
 } else if (secView === 'report' || secView === 'data') {
  const open = k => A.open(g, k);
  if (secView === 'report') y2.seg = 'report';
  else if (y2.seg === 'report' || y2.seg !== 'ladder' && y2.seg !== 'tip' && !open(y2.seg)) y2.seg = 'tip';   /* DATA 는 TIP 부터(HOME 의 TIP 적중 · 기록이 옴 · 11-23 목업 ㉮) */
  PANES.yuna2.draw(M2); M2.classList.add(secView === 'report' ? 'st-rep' : 'st-data');
  const rt = A.rates(g);
  M2.insertAdjacentHTML('afterbegin', `<div class="st-hd"><b class="st-t">${secView === 'report' ? '리포트' : '데이터'}</b>${secView === 'report' ? `<span class="st-hit"><small>적중</small><b>${rt.report == null ? '—' : rt.report + '%'}</b></span>` : ''}</div>`);
 } else if (secView === 'closet') {
  const C = A?.data?.()?.closet, y = s.yuna2 || { own: ['office'], wear: 'office' };   /* 목업 F5 — TRUST 가 차면 돈으로 사서 엶 · 산 옷은 눌러 입힘 */
  M2.innerHTML = `<div class="st-hd"><b class="st-t">옷장</b><span class="st-hit pk"><small>신뢰</small><b>${Math.round(s.senior)}</b></span></div><div class="st-oc">${(C?.items || [{ id: 'office', name: '사무실', trust: 0, price: 0 }]).map(it => {
   const own = y.own.includes(it.id), on = y.wear === it.id, ok = s.senior >= it.trust, img = it.id === 'office' ? art('기준/yuna_원본.png') : art('착장/yuna_' + it.id + '_base.png');
   const st = on ? '<span class="now">지금</span>' : own ? `<span></span><button class="sm" data-wear="${it.id}">입기</button>` : ok ? `<span>신뢰 ${it.trust} ✓</span><button class="sm hot" data-buyask="${it.id}" ${s.cash < it.price ? 'disabled' : ''}>매수 ${M(it.price)}</button>` : `<span>${emo('🔒')} 신뢰 ${it.trust}</span><em>${M(it.price)}</em>`;
   return `<div class="st-o ${on ? 'on' : ''} ${own ? '' : ok ? 'buy' : 'lk'}"><img src="${img}" alt="${esc(it.name)}" loading="lazy"><b>${esc(it.name)}</b><div class="st-os">${st}</div></div>`; }).join('')}</div>`;
  on('[data-wear]', d => act('yuna2', ['wear', d.wear]));
  on('[data-buyask]', d => { ysSheet = 'buy:' + d.buyask; pane(); });
 }
 secSheet(P);
 on('[data-sv]', d => swapView(() => { secView = d.sv; pane(); }));
 on('#st-main [data-stk]', d => mkGo(d.stk));
}
function secSheet(P) {   /* 열린 작은 창 — 같은 창이면 안만 바꿈 */
 const sh = ysSheetHtml(g.s), sh0 = P.querySelector('.ys-sheet'), small = ysSheet === 'eve' || ysSheet?.startsWith('buy:');
 if (sh && sh0 && sh0.dataset.k === ysSheet) sh0.lastElementChild.innerHTML = sh;
 else { if (sh0) sh0.outerHTML = ''; if (sh) P.insertAdjacentHTML('beforeend', `<div class="fa-sheet ys-sheet" data-k="${ysSheet}"><div class="fa-dim" data-ys-back></div><div class="${small ? 'fa-win ysm-win3' : 'db-wrap ysm-win'}">${sh}</div></div>`); }
 if (ysSheet === 'report') ysNwChart();
 on('[data-ys]', d => { ysSheet = d.ys; pane(); });
 on('[data-ys-back]', () => { const el = $('.ys-sheet'), done = () => { ysSheet = null; pane(); }; if (!el || !calMotion()) return done(); el.classList.add('out'); setTimeout(done, 180); });
 on('[data-buy]', d => fadeClose('.ys-sheet', () => { const el = $('.ys-sheet'); if (el) el.outerHTML = ''; ysSheet = null; act('yuna2', ['buy', d.buy]); }));   /* BUY 확인 창도 서서히 닫힌 뒤 삼 */
}
function drawSec(P) {
 const s = g.s, mode = secMode(s), m = s.msgs[0];
 if (mode !== secMode0) { secMode0 = mode; if (mode === 'evening' || mode === 'night') secView = 'chat'; }   /* 저녁 고르기 · 밤 귀띔은 대화에서 */
 if (secView !== 'chat') { drawSecTab(P, mode); return; }
 if (ysSheet === 'eve' && mode !== 'evening' || ysSheet === 'close' && mode !== 'evening') ysSheet = null;
 const lv = g.seniorLvl(), nx = lv < 5 ? (lv + 1) * 20 : null, tr = Math.round(s.senior), words = T.rel_words.yuna, cur = words.indexOf(relWord('yuna'));   /* 비서 프로필 줄은 CHAT 에만(11-23 대표님 '나머지 탭에선 비서 프로필이 사라져야') — 이름 · 단계 점 · 다음 · TRUST 막대 */
 const head = `<button class="ys-hd" data-ys="me"><img src="${coachFace(Y_FACE[mode])}" alt=""><div><b>${SNAME}</b><small>${esc(relWord('yuna'))} <i class="ys-dots">${words.map((w, i) => i <= cur ? '●' : '○').join('')}</i>${nx ? ` · 다음 ${nx}` : ''}</small></div><span class="ys-tr"><small>신뢰</small><b>${tr}</b><i class="st-mtr"><i style="width:${nx ? Math.min(100, tr / nx * 100) : 100}%"></i></i></span><i class="ys-go">›</i></button>`;
 const yt0 = s.yunaTip || {}, tt = mode === 'night' ? null : [...(yt0.pend || []), ...(yt0.log || [])].find(p => p.day === s.day - 1);   /* TODAY TIP — 어젯밤 저녁에 짚어 준 것 · CHAT 맨 위 고정(목업 ㉮ ②) */
 const pin = tt ? `<button class="ys-pin" data-stk="${tt.stock}"><small>오늘 귀띔</small><b>${secIc(tt.stock)}${esc(ST[tt.stock]?.name || '')} <span class="${tt.dir > 0 ? 'up' : 'dn'}">${tt.dir > 0 ? '▲' : '▼'}</span></b><em>어젯밤</em></button>` : '';
 const chat = secChat(s), bub = yunaBubbles(s);
 const stockCard = (id, top, sub) => `<span class="ys-stk" data-stk="${id}"><b>${esc(ST[id].name)}</b><span class="${top.c}">${top.t}<i class="ys-go">›</i></span><small>${esc(sub)}</small></span>`;
 const yb = x => `<div class="ys-b">${esc(x.text)}${x.news ? stockCard(x.news.stock, { t: `${Math.round(g.price(x.news.stock)).toLocaleString()} ${pct1(dayChg(x.news.stock))}`, c: sg2(dayChg(x.news.stock)) }, `${x.news.head} · ${SRC[x.news.src]?.name || ''} ${'★'.repeat(SRC[x.news.src]?.stars || 0)}`) : ''}${x.html || ''}<small>${x.at}</small></div>`;
 const mine = x => x.me ? `<div class="ys-b me">${esc(x.text)}<small>${x.at}</small></div>` : yb(x);
 const wi = mode === 'weekend' ? wkISO(s.slot, s.day) : '';   /* 주말 대화 머리는 그 토 · 일 날짜(금요일 날짜가 뜨던 것) */
 let lines = '', foot = '', day = wi ? `${+wi.slice(5, 7)}월 ${+wi.slice(8, 10)}일 ${s.slot ? '일' : '토'}요일` : `${md(s.day)} ${WEEK_KO[dow(s.day)]}요일`, sbt = nowHM(s) || (s.slot ? '일요일' : '토요일');
 if (mode === 'open' || mode === 'weekend') {
  lines = [...bub.map(x => ({ ...x })), ...chat.items].sort((a, b) => a.t - b.t).map(mine).join('');
  /* 아래 단추 줄 뺌(목업 F2) — 종목은 말칸 카드로 · 귀띔은 저녁 '같이 먹자' · 올해 결산은 HOME */
 } else if (mode === 'evening') {
  const rk = g.rank(), prev = s.uiRankDay?.rank, tip = (s.yunaTip?.log || []).find(x => x.at === s.day);
  const card = `<span class="ys-stk" data-ys="close"><b>장 마감 · ${md(s.day)}</b><span><i class="ys-go">›</i></span><small>거래 ${s.tradesToday}회 · 랭킹 ${rk}위${prev && prev !== rk ? ` ${prev > rk ? '▲' : '▼'}${Math.abs(prev - rk)}` : ''}${tip ? ' · 귀띔 ' + (tip.hit ? '적중' : '빗나감') : ''}</small></span>`;
  day += ' · 장 마감'; sbt = hm(g.closeMin() + 2);
  const ap = s.uiAppointment, apP = ap && ap !== 'yuna' ? T.contacts.find(p => p.id === ap) : null;
  const pick = [apP ? `<button class="hot" data-ev="meet" data-who="${apP.id}">만나기 · ${esc(apP.name)}<small>예약한 약속</small></button>` : '',
   `<button class="${apP ? '' : 'hot'}" data-ev="senior">같이 먹자<small>내일 귀띔 · 신뢰 +8</small></button>`,
   '<button data-ev="rest">오늘은 혼자 쉴게<small>스트레스 −</small></button>', '<button data-ys="eve">다른 계획<i class="ys-go">›</i></button>'].join('');
  lines = bub.map((x, i) => i === 0 ? { ...x, html: card } : x).map(mine).join('') + `<div class="ys-pick">${pick}</div>`;
 } else {   /* night — 저녁을 같이 한 뒤 · 귀띔 알림(msg senior)이 창 대신 여기로 */
  const r = yRate(s), rate = r ? r.p + '%' : '—';
  day = `${md(m.day ?? s.day)} ${WEEK_KO[dow(m.day ?? s.day)]}요일 · 저녁`; sbt = '21:10';
  lines = `<div class="ys-b me">${m.paid ? '분석 부탁해' : '같이 먹자'}<small>15:33</small></div><div class="ys-b">오늘 고마웠어요, 사장님.<small>21:05</small></div>${m.paid ? '' : '<div class="ys-day pink">신뢰 +8</div>'}`
   + (m.none ? '<div class="ys-b">오늘은 딱히 보이는 게 없네요. 푹 쉬세요.<small>21:06</small></div>'
    : `<div class="ys-b">하나만 짚어 드릴게요. 장 열리면 바로요.${stockCard(m.stock, { t: m.dir > 0 ? '▲' : '▼', c: m.dir > 0 ? 'up' : 'dn' }, `내일 귀띔 · ${m.sure ? '이건 꽤 확실해요' : '유나 맞힘 ' + rate}`)}<small>21:06</small></div>`)
   + '<div class="ys-b">내일 봬요.<small>21:06</small></div>';
  foot = `<div class="ys-q"><button class="hot" id="ys-next">다음 날</button></div>`;
 }
 const { M2 } = secShell(P, mode);
 M2.classList.add('st-chat');
 M2.innerHTML = `<div class="ys-sb"><span>${sbt}</span></div>${head}${pin}<div class="ys-ls"><div class="ys-day">${esc(day)}</div>${lines}</div>${foot}`;
 const ckey = mode + '|' + s.day, bs = $$('#st-main .ys-b'), nb = P.dataset.ck === ckey ? +P.dataset.nb || 0 : 0;   /* 이미 보던 말칸은 다시 떠오르지 않고 새 말칸만 */
 bs.slice(0, nb).forEach(b => b.style.animation = 'none'); P.dataset.ck = ckey; P.dataset.nb = bs.length;
 secSheet(P);
 const ls = $('.ys-ls'); if (ls) ls.scrollTop = ls.scrollHeight;
 on('[data-ev]', d => { ysSheet = null; meetEvening(d.ev, d.who); });
 on('#pane [data-stk]', d => mkGo(d.stk));   /* 범위를 판 안으로(놀이 창의 같은 이름 칩을 가로채던 것 · 검토 2절) */
 on('[data-sv]', d => swapView(() => { secView = d.sv; pane(); }));
 if ($('#ys-next')) $('#ys-next').onclick = () => act('msgdone');
 on('[data-yq]', d => { if (d.yq === 'more') { ysSheet = null; s.uiEveMore = s.day; save(); return refresh(); } });
}
function meetEvening(kind, who) {
 const day = g.s.day, st0 = g.s.stress, kn0 = g.s.rep.know, tr0 = g.s.senior, ok = g.dispatch('evening', [kind, who]);
 if (ok) { if (kind === 'senior') g.s.uiYunaLast = day; const ap = g.s.uiAppointment; if (ap && !(kind === 'meet' && who === ap) && !(kind === 'senior' && ap === 'yuna')) apptMiss(ap, day); delete g.s.uiAppointment; delete g.s.uiApptDay; }   /* 약속과 다른 저녁을 고르면 그 사람 대화에 한 줄 */
 save(); refresh();
 if (ok) { const ds = Math.round(g.s.stress - st0), dk = Math.round(g.s.rep.know - kn0), dt = Math.round(g.s.senior - tr0), bits = [dt ? `유나 <b class="pk">+${dt}</b>` : '', ds ? `스트레스 ${ds > 0 ? '+' : ''}${ds}` : '', dk ? `시장 지식 <b class="up">+${dk}</b>` : ''].filter(Boolean);   /* 고른 보람이 보이게(시험관 '혼자 쉴게는 아무 반응 없음') */
  if (bits.length) setTimeout(() => floatUp(bits.join(' · '), '', dt ? emo('♡') : '+', dt ? 'kH' : ''), 600); }
}

/* ── s_skill.js ── */
/* 스킬 탭(11-23 결정 D-083 ~ D-086 · 목업 09_목업/평판탭_1123 A1 ~ A4) + 스킬 포인트 +1 말칸(목업 09_목업/직감창_1123 K3)
   위 가운데 뿌리 '스킬 · 포인트 N' → 아래 세 갈래 기둥 · 칸 = 아이콘 + 이름 + 빛남(지금 익힐 수 있음) · 칸을 누르면 오른쪽 설명 판(효과 · 필요한 평판 · 익히기 · 닫기 · 아래 작은 '다시 고르기')
   · 오른쪽 위 ? 도움말 · 왼쪽 평판 작은 스탯 여섯(누르면 다음 Lv 까지와 하면 오르는 것)
   규칙은 sim.js(inst · instOpen · canLearn · learn · respec) · 글 · 색 · 아이콘 · 오르는 법은 자료(toy2.json instinct.ui · reps) · 상태 변수(skSel · skHelp · skRep · skRespec)는 screen.js
   말칸: screen.js msgBox 'year' · 'inst' 가 skillPlus(m) 를 부름 · 유나가 떠난 판은 가운데 작은 창(K1 꼴) · 팝업은 유나만(D-086) */
const SKU = () => T.instinct.ui;
const skFmt = (t, o) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
/* 자리(목업 A 와 같은 값 · 판 왼쪽 위가 0) — 나무 상자 .sk-tree 는 SK_X 부터 */
const SK_X = 380, SK_COLX = [180, 520, 860], SK_ROOT = [520, 105], SK_BY = 262, SK_TY = 385, SK_TDY = 140, SK_PAIR = 150;
function repPts(id) { return id === 'wealth' ? g.netWorth() : Math.round(id === 'net' ? g.netPts() : g.s.rep[id]); }
function repSteps(id) { return id === 'wealth' ? N.wealth_tiers : N.rep_levels; }
/* 칸 상태 — got 익힘 · open 지금 익힐 수 있음(빛남) · ok 열렸지만 포인트가 없거나 다시 고른 날 · wait 앞 칸부터 · lock 평판 모자람 · shut 옆 칸을 익혀 닫힘 */
function skState(n) { const I = g.inst(); if (I.got.includes(n.id)) return 'got'; const f = g.instNode(n.id); if (f.t.some(x => x.id !== n.id && I.got.includes(x.id))) return 'shut';
 if (g.instOpen(n.id)) return I.pt >= 1 && I.lock !== g.s.day ? 'open' : 'ok'; return g.lvl(n.cond[0]) < n.cond[1] ? 'lock' : 'wait'; }
function skDot() { return !!g && g.instChoices().length > 0; }   /* 아래 탭 점 — 지금 익힐 칸이 있을 때 */
function skTree() {
 const U = SKU(), I = g.inst(); let lines = '', out = '';
 T.instinct.branches.forEach((b, bi) => {
  const cx = SK_COLX[bi], hy = SK_BY;
  lines += `<path d="M${SK_ROOT[0]} ${SK_ROOT[1] + 70} C ${SK_ROOT[0]} ${hy - 60}, ${cx} ${hy - 90}, ${cx} ${hy - 26}" stroke="${b.color}" stroke-opacity=".5" stroke-width="5" fill="none"/>`;
  out += `<div class="sk-bl" style="left:${cx}px;top:${hy}px;--bc:${b.color}">${emo(b.icon)}${esc(b.name)}</div>`;
  let prev = [[cx, hy + 22]];
  b.tiers.forEach((t, ti) => {
   const y = SK_TY + ti * SK_TDY, cur = [];
   t.forEach((n, k) => {
    const x = cx + (k - (t.length - 1) / 2) * SK_PAIR, st = skState(n);
    for (const [ax, ay] of prev) lines += `<line x1="${ax}" y1="${ay}" x2="${x}" y2="${y - 48}" stroke="${b.color}" stroke-opacity="${st === 'got' ? 0.85 : st === 'open' ? 0.6 : 0.22}" stroke-width="4"/>`;
    out += `<button class="sk-n ${st}${skSel === n.id ? ' sel' : ''}" data-sk="${n.id}" style="left:${x}px;top:${y}px;--bc:${b.color}"><span class="c">${emo(n.icon)}</span><span class="nm">${esc(n.name)}</span></button>`;
    cur.push([x, y + 66]);
   });
   if (t.length > 1) out += `<div class="sk-or" style="left:${cx}px;top:${y - 10}px">${esc(U.or)}</div>`;
   prev = cur.length === 1 ? cur : [[cx, y + 66]];
  });
 });
 return `<div class="sk-tree" style="left:${SK_X}px"><svg class="sk-lines" width="1040" height="940">${lines}</svg>${out}<div class="sk-root" style="left:${SK_ROOT[0]}px;top:${SK_ROOT[1]}px"><b>${esc(U.root)}</b><span>${esc(U.pts)} <i>${I.pt}</i></span></div></div>`;
}
function skStats() {
 const U = SKU();
 return `<div class="sk-stats"><div class="cap">${esc(U.stats)}</div>${T.reps.map(r => `<button class="sk-st${skRep === r.id ? ' on' : ''}" data-skrep="${r.id}" style="--rc:${r.color}">${emo(r.icon)}<span class="sn">${esc(r.name)}</span><span class="sl">${g.lvl(r.id)}</span></button>`).join('')}</div>`;
}
function skPop(id) {
 const U = SKU(), r = REP[id], L = g.lvl(id), nx = repSteps(id)[L + 1], cur = repPts(id), fm = v => id === 'wealth' ? M(v) : String(Math.round(v));
 const head = nx == null ? `<h4>${esc(r.name)}<em>Lv.${L}</em></h4><div class="nx">${esc(U.rep_max)}</div>`
  : `<h4>${esc(r.name)}<em>Lv.${L} → ${L + 1}</em></h4><div class="nx">${fm(cur)} / ${fm(nx)} · <b>${esc(skFmt(U.rep_more, { n: fm(Math.max(0, nx - cur)) }))}</b></div>`;
 return `<div class="sk-dim" data-skx="over"></div><div class="sk-pop" style="--rc:${r.color}">${head}<ul>${(r.how || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>${nx == null ? '' : `<div class="gv">${esc(skFmt(U.rep_then, { n: L + 1 }))}${esc(r.perks[L] || '')}</div>`}</div>`;
}
function skSide(id) {
 const U = SKU(), f = g.instNode(id); if (!f) return '';
 const { b, ti, t, n } = f, st = skState(n), I = g.inst(), R = REP[n.cond[0]], ok = g.lvl(n.cond[0]) >= n.cond[1];
 if (skRespec) {
  const cost = T.instinct.respec_cost, can = g.s.cash >= cost && I.got.length;
  return `<div class="sk-side" style="--bc:${b.color}"><h3>${esc(U.respec)}</h3><p>${esc(U.respec_note)}</p>
   <div class="kv"><span>${esc(U.respec_cost)}</span>${M(cost)}</div><div class="kv"><span>${esc(U.respec_pts)}</span>${I.pt} → ${I.pt + I.got.length}</div><div class="sp"></div>
   <button class="sk-do" id="sk-rs-do" ${can ? '' : 'disabled'}>${esc(U.ok)}</button><button class="sk-x" id="sk-rs-back">${esc(U.back)}</button></div>`;
 }
 const nextT = b.tiers[ti + 1], nxt = nextT ? nextT.map(x => esc(x.name)).join(` ${esc(U.or)} `) : esc(U.last);
 const why = st === 'ok' ? (I.pt < 1 ? U.no_pt : U.today) : ['wait', 'lock', 'shut'].includes(st) ? U[st] : '';
 return `<div class="sk-side" style="--bc:${b.color}"><span class="tg">${esc(b.name)} · ${esc(U.tiers[ti] || '')}</span><span class="big">${emo(n.icon)}</span><h3>${esc(n.name)}</h3><p>${esc(n.line)}</p>
  <div class="kv"><span>${esc(U.need)}</span><span class="cp${ok ? ' ok' : ''}" style="--rc:${R.color}">${esc(R.name)} Lv.${n.cond[1]}${ok ? ' ✓' : ''}</span></div>
  ${t.length > 1 ? `<div class="kv"><span>${esc(U.or)}</span>${esc(U.pick_one)}</div>` : ''}<div class="kv"><span>${esc(U.next)}</span>${nxt}</div><div class="sp"></div>
  ${why ? `<div class="why">${esc(why)}</div>` : ''}
  ${st === 'got' ? `<div class="sk-got">${esc(U.got)}</div>` : `<button class="sk-do" id="sk-learn" ${st === 'open' ? '' : 'disabled'}>${esc(U.learn)}</button>`}<button class="sk-x" data-skx="side">${esc(U.close)}</button>
  ${I.got.length ? `<button class="sk-rs" id="sk-rs">${esc(U.respec)} · ${esc(U.respec_cost)} ${M(T.instinct.respec_cost)}</button>` : ''}</div>`;
}
function skHelpCard() {
 const U = SKU();
 return `<div class="sk-dim" data-skx="over"></div><div class="sk-hc"><h4>${esc(U.help_title)}</h4>${U.help.map(([k, t]) => `<div class="lg"><i class="${k}"></i>${esc(t)}</div>`).join('')}<div class="sk-tip">${esc(U.help_tip)}</div></div>`;
}
PANES.rep = {
 draw(P) {
  const U = SKU();
  if (skSel && !g.instNode(skSel)) skSel = null;
  P.innerHTML = `<div class="sk-bg" style="background-image:url('${art('배경/in_office_sales.jpg')}')"></div>${skStats()}<button class="sk-help" id="sk-help" aria-label="${esc(U.help_title)}">?</button>${skTree()}${skSel ? skSide(skSel) : ''}${skHelp ? skHelpCard() : ''}${skRep ? skPop(skRep) : ''}`;
  if (skRep) { const a = $(`[data-skrep="${skRep}"]`), p = $('.sk-pop'); if (a && p) p.style.top = a.offsetTop + 'px'; }   /* 누른 평판 줄 옆에 */
  on('[data-sk]', d => { skSel = skSel === d.sk ? null : d.sk; skRespec = false; skHelp = false; skRep = null; pane(); });
  on('[data-skrep]', d => { skRep = skRep === d.skrep ? null : d.skrep; skHelp = false; pane(); });
  on('[data-skx]', d => { if (d.skx === 'side') { skSel = null; skRespec = false; } else { skHelp = false; skRep = null; } pane(); });
  $('#sk-help').onclick = () => { skHelp = !skHelp; skRep = null; pane(); };
  if ($('#sk-learn')) $('#sk-learn').onclick = () => { const id = skSel, nm = g.instNode(id)?.n.name; if (act('learn', id)) { sfx('page'); floatUp(esc(nm || ''), 'buy', '★', 'kA'); } else pane(); };
  if ($('#sk-rs')) $('#sk-rs').onclick = () => { skRespec = true; pane(); };
  if ($('#sk-rs-back')) $('#sk-rs-back').onclick = () => { skRespec = false; pane(); };
  if ($('#sk-rs-do')) $('#sk-rs-do').onclick = () => { skRespec = false; skSel = null; act('respec'); };
 },
 leave() { skSel = null; skHelp = false; skRep = null; skRespec = false; },
 reset() { skSel = null; skHelp = false; skRep = null; skRespec = false; },
};
/* 스킬 포인트 +1 말칸(K3) — 오른쪽 아래 유나 얼굴 + 말칸 · [나중에] [스킬로 ›] · 단추 id sk-later · sk-go 는 msgBox 가 묶음 */
function skillPlus(m) {
 const U = SKU(), s = g.s, why = m.type === 'year' ? 'year' : (m.why || 'ach');
 const o = { via: T.dev?.reward?.ui?.inst_first?.[m.via] || '', th: m.th, year: m.year, nw: m.nw != null ? M(m.nw) : '', rank: m.rank };
 const tag = skFmt(U.plus_why[why], o), sum = m.type === 'year' ? `<div class="skp-sum">${esc(skFmt(U.plus_year, o))}</div>` : '';
 const bts = `<div class="skp-bts"><button id="sk-later">${esc(U.later)}</button><button class="primary" id="sk-go">${esc(U.go)}</button></div>`, k = `${m.type}-${s.day}-${s.msgs.length}`;
 if (yunaHere()) return `<div class="skp-wrap" data-k="${k}"><div class="skp-y"><span class="skp-yf">${yunaImg('base', 'skp-yi', false, '')}</span><div class="skp-yb"><div class="skp-yn">${esc(SNAME)}</div><h3>${esc(U.plus)}</h3>${sum}<p>${esc(skFmt(U.plus_say[why], o))}</p>${bts}</div></div></div>`;
 return `<div class="skp-wrap solo" data-k="${k}"><div class="skp-w"><small>${esc(tag)}</small><div class="skp-sp"><b>+1</b></div><h2>${esc(U.plus)}</h2>${sum}<p>${esc(U.plus_solo)}</p>${bts}</div></div>`;
}

/* ── s_story2.js ── */
/* 화면 장치 · 이야기 끝(개편 차례 8-0 · 07_재기/개편_이야기.md) — 2020-12-30 장 마감 성적표 창(m_story2 가 띄운 'story_end').
   끝 화면(drawEnding) 꼴을 그대로 쓰고 단추는 CONTINUE 하나 · 보면 브라우저 저장소 한 칸(story2.json done_key = 'yeouido_story_done')에 '1' → 다음 새 판 READY 에 ERA 고르기.
   글 · 이름은 03_자료/장치/story2.json card 한 곳 · 설명 글 없음(이름 · 값 · 짧은 상태만). */
MSGS.story_end = (m, kit) => {
 const D = window.Toy2Story2?.data(), C = D?.card; if (!C) return null;
 try { localStorage.setItem(D.done_key, '1'); } catch { /* 저장을 못 해도 이번 판은 그대로 이어짐 */ }
 const side = m.side ? (m.side.kind === 'wed' ? C.side_wed : m.side.kind === 'lover' ? C.side_lover : C.side_stage).replace('{name}', CAST[m.side.who] || '').replace('{stage}', STAGES[m.side.stage] || '') : C.side_none;
 const row = (k, v) => `<p><small>${esc(C.rows[k])}</small><b>${v}</b></p>`;
 const paths = [C.path1[m.path1] ?? C.path1[''], C.path2[m.path2] ?? C.path2[''], C.path3[m.path3] ?? C.path3['']].map(esc).join('<br>');
 const html = `<div class="story-screen ending-screen se2" data-k="story_end-${m.date}"><div class="story-bg" style="background-image:url('${sceneArt('in_han_river')}')"></div>${m.side ? `<img class="ending-person" src="${fullArt(m.side.who)}" alt="">` : ''}
  <section class="story-panel ending-panel"><small class="se2-tag">${esc(C.tag)} · ${esc(C.sub.replace('{date}', m.date))}</small><h1>${esc(m.name)}</h1>
   <div class="se2-grid">${row('rank', m.rank + '위')}${row('nw', M(m.nw))}${row('years', esc(C.years.replace('{n}', m.years)))}${row('ach', m.ach)}${row('scenes', m.scenes)}</div>
   <div class="story-panel"><small>${esc(C.rows.path)}</small><p>${paths}</p></div>
   <div class="story-panel"><small>${esc(C.rows.debt)}</small><p>${esc(C.debt[m.debt] || '')}${m.principal ? ' · ' + M(m.principal) : ''}</p></div>
   <div class="story-panel"><small>${esc(C.rows.side)}</small><p>${esc(side)}${m.yunaGone ? ' · ' + esc(C.yuna_gone) : ''}</p></div>
   <div class="mb" id="mb"></div></section></div>`;
 return { html, btns: `<button class="primary" id="ok">${esc(C.go)}</button>` };
};

/* ── s_trade.js ── */
/* 트레이딩 탭(화면 장치 · 11-23 대표님 '큰 파일 나누기 — 나눠') — screen.js 에서 함수만 옮김 · 동작 그대로 · 상태 변수(mkList · selC · mkRange · mkSheet 등)와 짧은 도우미(emo · secIc · newsOf · dayStr 등)는 screen.js 에 둠 */
function newsList() { const F = $('#feed'); if (!F) return; F.innerHTML = g.s.shown.filter(f => f.day === g.s.day).slice().reverse().map(f => `<button class="item ${f.kind} ${f.dir > 0 ? 'good' : 'bad'}" data-nf="${f.stock || ''}"><span class="t">${g.clock(f.t)}</span>${srcLabel(f)}${smellTag(f)}<b>${esc(feedHead(f))}</b></button>`).join('') || '<p class="muted">아직 없음</p>'; on('[data-nf]', d => { if (d.nf) { sel = d.nf; focusAll = false; marketLive(true); } }); }
function mkGo(id) { if (id) sel = id; selC = null; focusAll = false; mkList = 'stocks'; mkSheet = null; tab = 'market'; if (g.s.msgs[0]?.type === 'senior') g.s.uiNightAway = g.s.day; refresh(); }   /* 밤 귀띔 중에도 칩으로 트레이딩에 감(11-23 대표님 '트레이딩으로 보내') — 그날은 비서 탭으로 되돌리지 않음 · 위 띠 '유나 귀띔 보기 ›'로 돌아감 */   /* 다른 탭에서 그 종목 트레이딩으로(검토 1-2) — 고른 원자재 · 전 종목 차트 · 열린 창을 비움 */
function unseen(id) { const sn = (g.s.newsSeen ||= {})[id] ?? -1; return newsOf(id).some(f => nKey(f.day, f.t || 0) > sn); }
function markSeen(id) { (g.s.newsSeen ||= {})[id] = nKey(g.s.day, g.s.minute); }
function preSeries(id, first, vol, n) {
 let h = (g.s.seed || 1) >>> 0; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
 const rnd = () => { h = (h + 0x6D2B79F5) >>> 0; let x = h; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
 const out = []; let v = first; for (let k = 1; k <= n; k++) { const z = Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()); v = v / Math.exp(z * vol); out.unshift([-k, v]); }
 return out;
}
function cmdTradeMk(side, f) {   /* 원자재 사고팖(규칙 m_commodity.js · 꼴은 s_commodity.js cmdTrade 와 같음) */
 const c = T.commodities.find(x => x.id === selC); if (!g.dispatch('cmd', [side, selC, f])) return floatUp(`${esc(c.name)} · ${g.s.phase === 'open' ? '아니요' : '마감'}`, 'sys', '×', 'sys');
 const tr = g.s.lastCmd; sfx('page'); floatUp(`${esc(c.name)} ${side === 'buy' ? '매수' : '매도'} ${won(tr.q)}${tr.pnl ? ` · <b class="${tr.pnl >= 0 ? 'up' : 'dn'}">${tr.pnl >= 0 ? '+' : ''}${M(tr.pnl)}</b>` : ''}`, side, '₩'); save(); hud(true);
}
function mkNewsHtml(items) {   /* 오른쪽 뉴스 — 새 것 위 · 번호 = 차트 위 번호 */
 return items.length ? items.map((f, i) => `<button class="mk-ni ${f.kind} ${f.dir > 0 ? 'good' : f.dir < 0 ? 'bad' : ''}" data-nf="${f.stock || ''}"><span class="m"><i class="pin">${i + 1}</i><span class="t">${g.clock(f.t)}</span>${srcLabel(f)}${smellTag(f)}</span><b>${esc(feedHead(f))}</b></button>`).join('') : '<p class="muted mk-none">—</p>';
}
function marketLive(full) { const s = g.s; if (!$('#chart')) return;
 if (!g.m.path[sel]) { const nx = g.stocks.find(x => g.m.path[x.id] && !s.delisted[x.id]); if (nx) { sel = nx.id; pane(); } return; }   /* 고른 종목이 합병 · 상장 폐지로 오늘 장에 없으면 첫 상장 종목으로(11-23 화면 전수 누르기 — 2017-10 합병 뒤 값 경로가 없어 그릴 때마다 예외) */
 const md2 = mkCmd(), open = s.phase === 'open';
 if (!focusAll && !selC && tab === 'market') markSeen(sel);   /* 보고 있는 종목은 본 것 */
 for (const x of g.stocks) { const r = $(`[data-row="${x.id}"]`); if (!r) continue; const dl = s.delisted[x.id], p = g.price(x.id), ch = dl ? 0 : p / g.m.path[x.id][0] - 1, q = s.hold[x.id];
  r.classList.toggle('sel', x.id === sel && !focusAll && !selC); r.classList.toggle('dead', !!dl); r.classList.toggle('own', q > 0); r.classList.toggle('short', q < 0);
  r.querySelector('.pr').textContent = dl ? '상장폐지' : won(p); const c = r.querySelector('.ch'), ct = chgTxt(ch); c.textContent = dl ? '' : ct.t; c.className = 'ch ' + (dl ? '' : ct.c); r.querySelector('.hq').textContent = q ? (q < 0 ? '공매도 ' : '보유 ') + won(Math.abs(q)) + '주' : '';
  r.querySelector('.ud').hidden = !unseen(x.id); }
 const uds = $('#mk-uds'); if (uds) uds.hidden = !g.stocks.some(x => unseen(x.id));
 if (md2) for (const c of T.commodities) { const r = $(`[data-crow="${c.id}"]`); if (!r) continue; const p = md2.price(g, c.id), p0 = s.day ? md2.price(g, c.id, s.day - 1) : p, ch = p0 ? p / p0 - 1 : 0, h = s.cmd?.[c.id]?.q || 0;
  r.classList.toggle('sel', c.id === selC); r.classList.toggle('own', h > 0); const e = r.querySelector('.ch'), et = chgTxt(ch); e.textContent = et.t; e.className = 'ch ' + et.c; r.querySelector('.cpr').textContent = p == null ? '' : `${wonOrM(p)}원 / ${c.unit}`; }
 $('#mk-clock').textContent = '';   /* 장중 시계 뺌(D-050) */ mkSheetLive();
 $$('[data-rg]').forEach(b => { b.classList.toggle('on', b.dataset.rg === (selC ? '3M' : mkRange)); b.disabled = !!selC && b.dataset.rg === '1D'; });   /* 원자재 값은 하루 한 번 — 1D 없음 */
 const cv = $('#chart'), c = cv.getContext('2d'), w = cv.width, h = cv.height; c.clearRect(0, 0, w, h); c.font = '15px Galmuri11, sans-serif';
 const L0 = 8, R0 = 92, T0 = 14, B0 = 30, PW = w - L0 - R0, PH = h - T0 - B0;   /* 그림 칸 · 오른쪽 값 눈금 · 아래 시간/날짜 */
 const yAxis = (lo, hi, fmtv) => { const y = v => T0 + (hi - v) / (hi - lo) * PH; c.textAlign = 'left'; for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, Y = y(v); c.strokeStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(L0, Y); c.lineTo(L0 + PW, Y); c.stroke(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillText(fmtv(v), L0 + PW + 8, Y + 5); } return y; };
 const xLab = (x, txt, col = 'rgba(255,255,255,.45)') => { c.fillStyle = col; c.textAlign = 'center'; c.fillText(txt, Math.max(L0 + 24, Math.min(L0 + PW - 24, x)), h - 8); c.textAlign = 'left'; c.strokeStyle = 'rgba(255,255,255,.05)'; c.beginPath(); c.moveTo(x, T0); c.lineTo(x, T0 + PH); c.stroke(); };
 const fmtW = wonOrM;   /* 값 · 축 눈금 한 꼴(1억 아래는 원 단위 — 검토 '11만 · 99,164 섞임') */
 const lineAt = (pts, X, y, col, fill) => { if (pts.length < 2) return; if (fill) { const gr = c.createLinearGradient(0, T0, 0, T0 + PH); gr.addColorStop(0, col === '#ff5a5f' ? 'rgba(255,90,95,.20)' : 'rgba(75,141,255,.20)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.beginPath(); pts.forEach(([i, v], k) => k ? c.lineTo(X(i), y(v)) : c.moveTo(X(i), y(v))); c.lineTo(X(pts.at(-1)[0]), T0 + PH); c.lineTo(X(pts[0][0]), T0 + PH); c.closePath(); c.fillStyle = gr; c.fill(); }
  c.beginPath(); pts.forEach(([i, v], k) => k ? c.lineTo(X(i), y(v)) : c.moveTo(X(i), y(v))); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); };
 /* 3M — 지난 거래일(px) 앞에 판 시작 전 값을 채워 늘 N.px_show 칸 */
 const days3 = (have, first, vol, id) => { const need = N.px_show + 1 - have.length; return need > 0 ? [...preSeries(id, first, vol, need), ...have] : have.slice(-(N.px_show + 1)); };
 const draw3M = (pts, col) => { const K = pts.length, X = i => L0 + (i - pts[0][0] + 0.5) / K * PW, v = pts.map(p => p[1]), lo = Math.min(...v) * 0.98, hi = Math.max(...v) * 1.02, y = yAxis(lo, hi, fmtW);
  c.fillStyle = 'rgba(242,193,78,.08)'; c.fillRect(X(pts.at(-1)[0]) - PW / K / 2, T0, PW / K, PH);
  for (let k = 0; k < K - 6; k += Math.ceil(K / 4)) xLab(X(pts[k][0]), mdShort(pts[k][0])); xLab(X(pts.at(-1)[0]), '오늘', '#ffcf5a');
  lineAt(pts, X, y, col, false); c.beginPath(); c.arc(X(pts.at(-1)[0]), y(v.at(-1)), 6, 0, 7); c.fillStyle = col; c.fill(); return y; };
 if (selC && md2) {   /* 원자재 — 3M 만 */
  const cm = T.commodities.find(x => x.id === selC), p = md2.price(g, selC), p0 = s.day ? md2.price(g, selC, s.day - 1) : p, ch = p0 ? p / p0 - 1 : 0, mine = s.cmd?.[selC] || { q: 0, avg: 0 }, pl = mine.q ? mine.q * p - mine.q * mine.avg : 0;
  $('#c-name').textContent = cm.name; $('.mk-name').disabled = true; $('#c-price').textContent = fmtW(p) + '원'; const cc = $('#c-ch'), ct = chgTxt(ch, ' '); cc.textContent = ct.t; cc.className = ct.c;
  $('#o-name').textContent = cm.name; const oc = $('#o-ch'), ot = chgTxt(ch); oc.textContent = ot.t; oc.className = ot.c;
  $('#mk-news').innerHTML = mkNewsHtml([]); $('#mk-nn').textContent = '';
  $('#o-q').textContent = mine.q ? `${won(mine.q)} ${cm.unit}` : '없음'; $('#o-avg').textContent = mine.q ? fmtW(mine.avg) + '원' : '-'; const op = $('#o-pnl'); op.textContent = mine.q ? (pl >= 0 ? '+' : '') + M(pl) : '-'; op.className = sc(pl);
  { const pos = $('.mk-right .pos'); if (pos) { pos.classList.toggle('empty', !mine.q); pos.classList.add('nostake'); } } $('#sell-lab').textContent = '팔기';
  $$('[data-buyf]').forEach(b => b.disabled = !open); $$('[data-sellf]').forEach(b => b.disabled = !open || !mine.q);
  const have = []; for (let d = Math.max(0, s.day - N.px_show); d <= s.day; d++) { const v = md2.price(g, selC, d); if (v != null) have.push([d, v]); }
  if (have.length) draw3M(days3(have, have[0][1], (cm.sd || 0.08) / Math.sqrt(21), selC), ch >= 0 ? '#ff5a5f' : '#4b8dff');
  return; }
 const st = ST[sel], p = g.price(sel), dl = s.delisted[sel], o = g.m.path[sel][0] * s.extra[sel], ch = dl ? 0 : p / o - 1, q = s.hold[sel], pl = q > 0 ? q * (p - s.avg[sel]) : q < 0 ? -q * (s.avg[sel] - p) : 0;
 $('#c-name').innerHTML = focusAll ? '전체 종목 · ' + mkRange : secIc(sel) + esc(st.name); $('#o-name').innerHTML = focusAll ? '' : secIc(sel) + esc(st.name); $('.mk-name').disabled = focusAll; $('#c-sub').textContent = focusAll ? '' : `${st.sector} · 하루 거래 ${won(st.turnover / 1e8)}억`; $('#c-price').textContent = focusAll ? '' : dl ? '상장폐지' : won(p) + '원'; const cc = $('#c-ch'), ct = chgTxt(ch, ' '); cc.textContent = focusAll || dl ? '' : ct.t; cc.className = ct.c;
 const oc = $('#o-ch'), ot = chgTxt(ch); oc.textContent = focusAll || dl ? '' : ot.t; oc.className = ot.c;
 const items = focusAll ? [] : newsOf(sel).slice().sort((a, b) => b.t - a.t), nk = items.map(f => f.t + f.head).join('|');
 const nb = $('#mk-news'); if (nb.dataset.k !== nk) { nb.dataset.k = nk; nb.innerHTML = mkNewsHtml(items); } $('#mk-nn').textContent = items.length || '';
 $('#o-q').textContent = q ? (q < 0 ? '공매도 ' : '') + won(Math.abs(q)) + '주' : '없음'; $('#o-avg').textContent = q ? won(s.avg[sel]) + '원' : '-'; const op = $('#o-pnl'); op.textContent = q ? (pl >= 0 ? '+' : '') + M(pl) : '-'; op.className = sc(pl); $('#o-stake').textContent = (g.stake(sel) * 100).toFixed(2) + '%'; { const pos = $('.mk-right .pos'); if (pos) { pos.classList.toggle('empty', !q); pos.classList.toggle('nostake', g.stake(sel) < 0.01); } }
 const shortable = q <= 0 && g.canShort(sel); $('#sell-lab').textContent = q > 0 ? '매도' : shortable ? '공매도' : '매도';
 $$('[data-buyf]').forEach(b => { const f = +b.dataset.buyf; b.disabled = focusAll || !open || dl || (q >= 0 ? s.cash * f < p : s.cash < (f >= 1 ? -q : Math.max(1, Math.floor(-q * f))) * p); });   /* 공매도 갚기도 현금이 모자라면 흐림(11-23 화면 전수 누르기) */
 $$('[data-sellf]').forEach(b => b.disabled = focusAll || !open || dl || !(q > 0 || shortable) || (q <= 0 && s.cash * +b.dataset.sellf * N.short_margin < p));   /* 공매도는 증거금(현금 × 비율 × short_margin)으로 한 주도 못 사면 흐림 */
 $('#o-hint').textContent = !open ? '마감' : `영향 ${pct(N.impact_k * s.cash * 0.5 / st.turnover)} · 수수료 ${N.sell_cost * 100}%`;   /* 이름 · 값만(설명 문장 뺌) */
 const daily = id => days3([...(s.px?.[id] || []).slice(-N.px_show), [s.day, g.price(id)]], (s.px?.[id]?.[Math.max(0, (s.px?.[id]?.length || 1) - N.px_show)]?.[1]) || g.m.path[id][0] * s.extra[id], ST[id].vol || 0.016, id);
 if (focusAll) {   /* 전 종목 — 1D = 오늘 장(어제 종가 = 0) · 3M = 지난 석 달(첫 날 = 0) · 고른 기간 단추와 같음(검토 '1D 인데 가로축 석 달') */
  let sr, X, xEnd;
  if (mkRange === '1D') { const MM = g.M(), now = Math.min(s.minute, MM), st2 = Math.max(1, Math.round(MM / 260)); X = m => L0 + m / MM * PW; xEnd = X(now);
   sr = g.stocks.map((x, k) => { if (s.delisted[x.id]) return { x, k, v: [], m: [] }; const b = g.m.path[x.id][0], ms = []; for (let m = 0; m < now; m += st2) ms.push(m); ms.push(now); return { x, k, m: ms, v: ms.map(m => g.price(x.id, m) / b - 1) }; });
  } else { const K = N.px_show + 1; X = i => L0 + (i + 0.5) / K * PW; xEnd = X(K - 1);
   sr = g.stocks.map((x, k) => { const d = s.delisted[x.id] ? [] : daily(x.id); return { x, k, d, m: d.map((_, i) => i), v: d.map(p2 => p2[1] / d[0][1] - 1) }; }); }
  const all = sr.flatMap(z => z.v), lo = Math.min(-0.02, ...all), hi = Math.max(0.02, ...all), y = yAxis(lo, hi, pct);
  if (mkRange === '1D') { const MM = g.M(); for (let m = 0; m < MM - 20; m += 60) xLab(X(m), g.clock(m)); xLab(X(MM), g.clock(MM)); }
  else { const K = N.px_show + 1, d0 = sr.find(z => z.d.length)?.d || []; for (let k = 0; k < d0.length - 6; k += Math.ceil(K / 4)) xLab(X(k), mdShort(d0[k][0])); xLab(X(K - 1), '오늘', '#ffcf5a'); }
  c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(L0, y(0)); c.lineTo(L0 + PW, y(0)); c.stroke(); c.setLineDash([]);
  const labs = [];
  for (const z of sr) { if (z.v.length < 2) continue; c.beginPath(); z.v.forEach((r, i) => i ? c.lineTo(X(z.m[i]), y(r)) : c.moveTo(X(z.m[i]), y(r))); c.strokeStyle = LINE[z.k % LINE.length]; c.lineWidth = 2.5; c.stroke(); labs.push({ z, y: y(z.v.at(-1)) + 5 }); }
  labs.sort((a, b) => a.y - b.y); const GAP = 18, top = T0 + 14, bot = T0 + PH;   /* 이름표가 겹치지 않게 아래로 밀고 · 넘치면 다 같이 올림(검토 '이름표 겹침') */
  for (let i = 1; i < labs.length; i++) labs[i].y = Math.max(labs[i].y, labs[i - 1].y + GAP);
  const over = labs.length ? labs.at(-1).y - bot : 0; if (over > 0) { for (const l of labs) l.y -= over; for (let i = 0; i < labs.length && labs[i].y < top; i++) labs[i].y = top + i * GAP; }
  const lx = Math.min(L0 + PW - 96, xEnd + 8); c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = 'rgba(11,14,26,.85)';
  for (const l of labs) { c.strokeText(l.z.x.name, lx, l.y); c.fillStyle = LINE[l.z.k % LINE.length]; c.fillText(l.z.x.name, lx, l.y); }
  c.lineJoin = 'miter'; return; }
 if (dl) return;
 const col = p >= o ? '#ff5a5f' : '#4b8dff';
 if (mkRange === '3M') { const y = draw3M(daily(sel), col); if (s.avg[sel] && q) { c.setLineDash([3, 5]); c.strokeStyle = '#ffcf5a'; c.beginPath(); c.moveTo(L0, y(s.avg[sel])); c.lineTo(L0 + PW, y(s.avg[sel])); c.stroke(); c.setLineDash([]); } return; }
 /* 1D — 오늘 장 처음부터 끝까지 칸 · 선은 지금까지 · 지금 시각 점선 · 어제 종가 점선 · 뉴스 번호(작게) */
 const MM = g.M(), now = Math.min(s.minute, MM), pts = []; for (let m = 0; m <= now; m++) pts.push([m, g.price(sel, m)]);
 const vs = pts.map(x => x[1]).concat(o, q && s.avg[sel] ? [s.avg[sel]] : []), lo = Math.min(...vs) * 0.995, hi = Math.max(...vs) * 1.005, y = yAxis(lo, hi, fmtW), X = m => L0 + m / MM * PW;
 for (let m = 0; m < MM - 20; m += 60) if (!open || Math.abs(m - now) > 28) xLab(X(m), g.clock(m)); xLab(X(MM), g.clock(MM));   /* 장 끝 시각과 겹치는 정각은 뺌(새해 첫날 15:00 끝) */
 c.setLineDash([6, 6]); c.strokeStyle = 'rgba(169,179,214,.55)'; c.beginPath(); c.moveTo(L0, y(o)); c.lineTo(L0 + PW, y(o)); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(169,179,214,.8)'; c.textAlign = 'right'; c.fillText(`어제 종가 ${won(Math.round(o))}`, L0 + PW - 6, y(o) - 8); c.textAlign = 'left';
 lineAt(pts, X, y, col, true);
 if (pts.length) { c.beginPath(); c.arc(X(now), y(pts.at(-1)[1]), 7, 0, 7); c.fillStyle = col; c.fill(); }
 if (open && now > 0) { c.setLineDash([3, 5]); c.strokeStyle = 'rgba(242,193,78,.7)'; c.beginPath(); c.moveTo(X(now), T0); c.lineTo(X(now), T0 + PH); c.stroke(); c.setLineDash([]); const tx = g.clock(now), tw = c.measureText(tx).width + 14, bx = Math.max(L0, Math.min(L0 + PW - tw, X(now) - tw / 2)); c.fillStyle = '#f2c14e'; c.fillRect(bx, h - 26, tw, 22); c.fillStyle = '#0b0e1a'; c.fillText(tx, bx + 7, h - 9); }
 items.forEach((f, i) => { if (f.t > now) return; const px = X(f.t), py = y(g.price(sel, f.t)), cl = f.kind === 'tip' ? '#ff86b0' : f.dir < 0 ? '#5b9bff' : '#ff6b6b';   /* 작게(지름 18) — 차트 보는 데 방해 안 되게(11-22 대표님) */
  c.strokeStyle = cl; c.globalAlpha = 0.8; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - 14); c.stroke(); c.globalAlpha = 0.92; c.beginPath(); c.arc(px, py - 23, 9, 0, 7); c.fillStyle = cl; c.fill(); c.globalAlpha = 1; c.fillStyle = '#10131c'; c.font = '12px Galmuri11, sans-serif'; c.textAlign = 'center'; c.fillText(String(i + 1), px, py - 19); c.textAlign = 'left'; c.font = '15px Galmuri11, sans-serif'; });
 if (s.minute < 1 && !s.speed) { c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '26px sans-serif'; c.textAlign = 'center'; c.fillText('▶ 재생  ·  스페이스', L0 + PW / 2, h / 2); c.textAlign = 'left'; c.font = '15px Galmuri11, sans-serif'; }
 if (s.avg[sel] && q) { c.setLineDash([3, 5]); c.strokeStyle = '#ffcf5a'; c.beginPath(); c.moveTo(L0, y(s.avg[sel])); c.lineTo(L0 + PW, y(s.avg[sel])); c.stroke(); c.setLineDash([]); c.fillStyle = '#ffcf5a'; c.fillText('내 평균 단가', L0 + 6, y(s.avg[sel]) - 6); }
}
function mkSheetHtml() { const s = g.s, today = s.shown.filter(f => f.day === s.day);
 const row = f => `<button class="mk-ni" data-mkgo="${f.stock || ''}" ${f.stock ? '' : 'disabled'}>${srcLabel(f)}<b class="${f.dir > 0 ? 'up' : f.dir < 0 ? 'down' : ''}">${esc(feedHead(f))}</b><small>${f.stock ? esc(ST[f.stock].name) : ''}</small></button>`;
 if (mkSheet === 'news') return `<div class="mk-hd"><b>오늘 뉴스</b><small>${today.length}</small><button class="sm mk-x" data-mk-back>닫기 ✕</button></div><div class="mk-list">${today.slice().reverse().map(row).join('') || '<p class="muted">없음</p>'}</div>`;
 const st = ST[sel], q = s.hold[sel], p = g.price(sel), pl = q > 0 ? q * (p - s.avg[sel]) : q < 0 ? -q * (s.avg[sel] - p) : 0, gt = s.gate[sel] ?? -1, mine = today.filter(f => f.stock === sel);
 return `<div class="mk-hd"><b>${esc(st.name)}</b><small>${esc(st.sector)}${st.small ? ' · 작은 종목' : ''}</small><button class="sm mk-x" data-mk-back>닫기 ✕</button></div>
  <div class="mk-cells"><div><small>보유</small><b>${q ? (q < 0 ? '공매도 ' : '') + won(Math.abs(q)) + '주' : '없음'}</b></div><div><small>평균 단가</small><b>${q ? won(s.avg[sel]) : '-'}</b></div><div><small>평가 손익</small><b class="${sc(pl)}">${q ? (pl >= 0 ? '+' : '') + M(pl) : '-'}</b></div></div>
  <div class="mk-lad"><b>지분<em>${(g.stake(sel) * 100).toFixed(2)}%</em></b><div>${GATES.map(([i, n]) => `<span class="${gt >= i ? 'on' : ''}">${Math.round(N.stake_gates[i] * 100)}%<small>${n}</small></span>`).join('')}</div></div>
  <div class="mk-list">${mine.slice().reverse().map(row).join('') || '<p class="muted">오늘 소식 없음</p>'}</div>`; }
function mkSheetLive() { const P = $('#pane'); if (!P || tab !== 'market') return; let el = $('#mksheet');
 if (el?.classList.contains('fade-out')) { if (!mkSheet) return; el.remove(); el = null; }   /* 사라지는 중인 창 — 다시 열면 새로 */
 if (!mkSheet) { if (el) { mkLast = ''; const gone = el; fadeClose(gone, () => gone.remove()); } return; }   /* 뉴스 · 종목 창도 서서히 닫힘 */
 if (!el) { el = document.createElement('div'); el.id = 'mksheet'; el.className = 'fa-sheet'; el.innerHTML = '<div class="fa-dim" data-mk-back></div><div class="db-wrap mk-win"></div>'; P.appendChild(el); mkLast = ''; }
 const h = mkSheetHtml(); if (h === mkLast) return; mkLast = h; el.querySelector('.mk-win').innerHTML = h;
 on('[data-mk-back]', () => { mkSheet = null; mkSheetLive(); });
 on('[data-mkgo]', d => { if (!d.mkgo) return; sel = d.mkgo; selC = null; focusAll = false; mkSheet = null; if (mkList !== 'stocks') { mkList = 'stocks'; pane(); } else marketLive(true); }); }
function nwChart() { const cv = $('#nwchart'); if (!cv) return; const c = cv.getContext('2d'), w = cv.width, h = cv.height, d = g.s.hist; c.clearRect(0, 0, w, h); if (d.length < 2) return; const v = d.map(x => x.nw), lo = Math.min(...v), hi = Math.max(...v), y = x => h - 20 - (x - lo) / (hi - lo || 1) * (h - 40);
 c.beginPath(); v.forEach((x, i) => { const X = 60 + i / (v.length - 1) * (w - 70); i ? c.lineTo(X, y(x)) : c.moveTo(X, y(x)); }); c.strokeStyle = '#ffcf5a'; c.lineWidth = 3; c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '15px sans-serif'; c.fillText(M(hi), 2, 22); c.fillText(M(lo), 2, h - 16); }
/* 거절 까닭 한 줄(11-23 화면 전수 누르기 · 규칙은 false 만 돌려줌) — 글은 feel.json trade_fail */
function tradeWhy(side) { const W = FEEL().trade_fail || {}, s = g.s, h = s.hold[sel] || 0, p = g.price(sel);
 const why = s.phase !== 'open' ? W.closed : g.halted() ? W.halted : g.storyPending() ? W.story : !g.listed(sel) || s.delisted[sel] ? W.delisted
  : side === 'buy' ? (h < 0 || s.cash < p ? W.cash : W.cap) : h <= 0 ? (g.canShort(sel) ? W.cash : W.noshort) : W.other;
 if (why) floatUp(esc(why), 'sys', '!', 'sys'); }
function trade(side, f, id) { if (id) sel = id; const s = g.s, p0 = g.price(sel), q0 = s.hold[sel] || 0; if (!g.dispatch(side, [sel, f])) { tradeWhy(side); return; } const t = s.lastTrade, moved = g.price(sel) / p0 - 1;
 if (s.uiTrades?.day !== s.day) s.uiTrades = { day: s.day, items: [] }; s.uiTrades.items.push({ at: hm(g.openMin() + s.minute), id: sel, side, v: Math.round(Math.abs((s.hold[sel] || 0) - q0) * p0) });   /* 비서 탭 2단 '오늘 결산'의 TRADES — 그날만(D-045) */
 const coach = coachState(s); if (side === 'buy') coach.bought ||= sel; else if (coach.bought === sel) coach.sold = true;
 floatUp(t.pnl ? `${esc(ST[sel].name)} 매도 · <b class="${sc(t.pnl)}">${t.pnl >= 0 ? '+' : ''}${M(t.pnl)}</b>` : `${esc(ST[sel].name)} ${side === 'buy' ? '매수' : s.hold[sel] < 0 ? '공매도' : '매도'} · 밀림 ${pct(moved)}`, side, '₩'); save(); hud(true); phase(); }

/* ── s_yuna2.js ── */
/* 화면 장치 · 유나 장치(개편 차례 8 · 07_재기/개편_이야기.md) — 탭 '분석'(YUNA DESK: REPORT · SECTOR · DIVIDEND · BOARD · LEVEL) · 탭 '목표'(업적 다음 할 일 · 진행 막대)
   창: yuna_report(문장 보고) · wed(결혼식) · wed_event(결혼 생활) · rep_lv(평판 단계 — 한 줄 알림).
   규칙은 m_yuna2.js(window.Toy2Yuna2) · 글 · 숫자는 03_자료/장치/yuna2.json · 설명 글 없음 — 처음 들어올 때 유나 한마디(json lines · 누르면 닫힘). */
const Y2 = () => window.Toy2Yuna2, Y2D = () => Y2()?.data();
const y2 = { seg: 'report' };
TABS_ALL.push(['yuna2', Y2D()?.ui.tab || '분석', () => !!(Y2D() && g.s.yuna2 && !window.Toy2Story?.gone(g))]);
TABS_ALL.push(['goals', Y2D()?.ui.goals_tab || '목표', () => !!(Y2D() && g.s.yuna2)]);
const y2f = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const y2Pct = (v, d = 1) => v == null ? Y2D().ui.none : (v * 100).toFixed(d) + '%';
function y2Say(key) {   /* 유나 한마디 — 처음 한 번 */
 const D = Y2D(); if (g.s.yuna2.seen[key] || !D.lines[key]) return '';
 askHint({ id: 'y2_' + key, face: 'wink', text: D.lines[key], done() { act('yuna2', ['seen', key]); } });   /* 처음 한마디 = 유나 말칸 */
 return '';
}
function y2Report() {   /* 목업 09_목업/비서점검_1122 F3 — 맡기기(값 · 진행 중 · 종목 칩) · 받은 보고서 */
 const D = Y2D(), U = D.ui, A = Y2(), st = g.s.yuna2, canAsk = A.open(g, 'ask'), full = st.req.length >= D.ask.max_open, cost = A.askCost(g), day = g.s.day;
 const ic = id => typeof secIc === 'function' ? secIc(id) : '', dd = q => 'D-' + Math.max(1, q.due - day);
 const prog = st.req.map(q => `<div class="y2-prog">${ic(q.stock)}<b>${esc(ST[q.stock]?.name || '')}</b><span>${typeof md === 'function' ? md(q.day) : ''}</span><em>${dd(q)}</em></div>`).join('');
 const chips = g.stocks.filter(x => !g.s.delisted[x.id]).map(x => { const q = st.req.find(r => r.stock === x.id);
  return `<button class="y2-chip ${q ? 'w' : ''}" data-y2ask="${x.id}" ${q || full || g.s.cash < cost ? 'disabled' : ''}>${ic(x.id)}<span>${esc(x.name)}</span>${q ? `<small>${dd(q)}</small>` : ''}</button>`; }).join('');
 const cards = st.reports.slice(0, 4).map(r => `<div class="y2-card"><div class="y2-ch">${ic(r.stock)}<b>${esc(ST[r.stock]?.name || r.stock)}</b><i class="y2-v ${r.view}">${esc(U.view[r.view])}</i><small>${esc(r.date)}${r.graded && r.hit != null ? ` <i class="y2-hit ${r.hit ? 'up' : 'dn'}">${r.hit ? '✓' : '✗'}</i>` : ''}</small></div>${r.lines.slice(1).map(l => `<p>${esc(l)}</p>`).join('')}</div>`).join('');
 const ask = canAsk ? `<div class="y2-askhd"><small>${esc(U.ask)} · ${cost ? M(cost) : esc(U.free)}</small><span>${st.req.length} / ${D.ask.max_open}</span></div>${prog}<div class="y2-chips">${chips}</div>` : `<div class="y2-lock">${emo('🔒')} ${esc(y2f(U.lock, { n: D.unlock.ask }))}</div>`;
 return `<div class="y2-rp">${ask}${cards ? `<div class="y2-cards">${cards}</div>` : ''}</div>`;
}
function y2Table(head, rows) { return `<table class="y2-t"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`; }
function y2Seg(seg) {
 const D = Y2D(), U = D.ui, A = Y2();
 if (seg === 'report') return y2Report();
 if (seg === 'tip') {   /* 비서 HOME 을 나눔(11-23 대표님 목업 ㉮) — TIP 적중 · 기록은 DATA 첫 칸 */
  const s = g.s, yt = s.yunaTip || { n: 0, hit: 0 }, rt = A.rates(g), last = s.uiYunaLast, log = (yt.log || []).slice(-8).reverse();
  const dir = d => `<span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}</span>`;
  return `<div class="st-w st-tipv"><div class="st-tiph"><small>${esc(U.seg.tip)} 적중</small><b>${rt.tip == null ? '—' : rt.tip + '%'}</b><span>${yt.hit} / ${yt.n}번</span></div>
   <div class="st-lg">${log.map(x => `<div><small>${md(x.day)}</small><span>${esc(ST[x.stock]?.name || '')}</span>${dir(x.dir)}<span class="${x.hit ? 'ok' : 'no'}">${x.hit ? '적중' : '빗나감'}</span></div>`).join('')}<div><small>저녁</small><span>마지막 저녁</span><span></span><span>${last == null ? '없음' : last === s.day ? '오늘' : `${s.day - last}거래일 전`}</span></div></div></div>`;
 }
 if (seg === 'sector') return `<div class="y2-sx">${A.sectors(g).map(x => `<div><img src="${art('아이콘/섹터/' + x.id + '.png')}" alt="" onerror="this.remove()"><b>${esc(x.name)}</b><i class="y2-w ${x.wind}">${esc(U.wind[x.wind])}</i><em class="${x.cycle >= 0 ? 'up' : 'dn'}">${esc(U.col.cycle)} ${x.cycle >= 0 ? '▲' : '▼'}</em></div>`).join('')}</div>`;   /* 업종 카드 여덟(목업 F4) */
 if (seg === 'dividend') return y2Table([U.col.stock, U.col.yield, U.col.next, U.col.hold], A.dividends(g).map(x => `<tr><td>${esc(x.name)}</td><td>${y2Pct(x.yield, 2)}</td><td>${x.next}월${x.pay ? ' · +' + M(x.pay) : ''}</td><td>${x.hold ? won(x.hold) : '—'}</td></tr>`));
 if (seg === 'board') { const L = A.board(g); return L.length ? y2Table([U.col.stock, U.col.stake, U.col.seat, U.col.support], L.map(x => `<tr><td>${esc(x.name)}</td><td>${y2Pct(x.stake)}</td><td>${esc(U.seat[x.seat] || '')}</td><td><i class="y2-bar"><i style="width:${x.support}%"></i></i> ${x.support}%</td></tr>`)) : `<div class="y2-empty">${esc(U.none)}</div>`; }
 const lv = g.seniorLvl(), w = A.wed(g), M2 = D.marriage;
 return `<div class="y2-lad">${D.ladder.map(x => `<div class="${lv >= x.lv ? 'on' : ''}"><b>${esc(y2f(U.lv, { n: x.lv }))}</b><span>${esc(x.text)}</span></div>`).join('')}${w ? `<div class="on y2-wed"><b>${emo('♥')}</b><span>${esc(y2f(U.wed, { name: M2.names[w.who], date: w.date }))} · ${esc(M2.help_text[w.who])}</span></div>` : ''}</div>`;
}
PANES.yuna2 = { draw(P) {
 const D = Y2D(); if (!D || !g.s.yuna2) { P.innerHTML = ''; return; }
 const U = D.ui, A = Y2(), lv = g.seniorLvl(), rt = A.rates(g), segs = Object.keys(U.seg);
 if (segs.includes(y2.seg) && y2.seg !== 'report' && y2.seg !== 'tip' && y2.seg !== 'ladder' && !A.open(g, y2.seg)) y2.seg = 'report';
 P.innerHTML = `<div class="y2-hd"><img src="${coachFace('base')}" alt="${SNAME}"><div><small>${esc(U.title)}</small><b>${SNAME} · ${esc(y2f(U.lv, { n: lv }))}</b></div>
   <div class="y2-rt"><span><small>${esc(U.rate)} · ${esc(U.tip_rate)}</small><b>${rt.tip == null ? esc(U.none) : rt.tip + '%'}</b></span><span><small>${esc(U.rate)} · ${esc(U.report_rate)}</small><b>${rt.report == null ? esc(U.none) : rt.report + '%'}</b></span></div></div>
  <div class="y2-segs">${segs.map(k => { const lock = k !== 'report' && k !== 'tip' && k !== 'ladder' && !A.open(g, k); return `<button class="${y2.seg === k ? 'on' : ''}" data-y2seg="${k}" ${lock ? 'disabled' : ''}>${esc(U.seg[k])}${lock ? ` <small>${emo('🔒')} ${esc(y2f(U.lock, { n: D.unlock[k] }))}</small>` : ''}</button>`; }).join('')}</div>
  <div class="y2-body">${y2Seg(y2.seg)}</div>${y2Say('desk')}`;
 on('[data-y2seg]', d => swapView(() => { y2.seg = d.y2seg; pane(); }));
 on('[data-y2ask]', d => { if (act('yuna2', ['ask', d.y2ask])) floatUp(esc(ST[d.y2ask].name) + ' · ' + esc(U.ask), 'buy', emo('✉')); });
 on('[data-y2seen]', d => act('yuna2', ['seen', d.y2seen]));
} };
PANES.goals = { next(n) { const D = Y2D(); if (!D || !g.s.yuna2) return []; return Y2().goals(g).filter(x => !x.done).slice(0, n ?? D.goals_next).map(x => ({ name: x.name, p: x.p, once: x.once, val: x.once ? '' : `${x.now} / ${x.to}` })); },   /* 홈 왼쪽 GOALS 기둥(11-22 3안) */
 draw(P) {
 const D = Y2D(); if (!D || !g.s.yuna2) { P.innerHTML = ''; return; }
 const L = Y2().goals(g), next = L.filter(x => !x.done).slice(0, D.goals_next), rest = L.filter(x => !next.includes(x));
 const bar = x => `<i class="y2-bar"><i style="width:${Math.round(x.p * 100)}%"></i></i>`;
 const val = x => x.done ? esc(D.ui.done) : x.once ? '' : `${esc(x.now)} / ${esc(x.to)}`, txt = x => esc(x.hidden ? x.text : D.ui.goal_text?.[x.id] || x.text);   /* 긴 업적 설명은 짧은 글로(yuna2.json ui.goal_text · 검토 11-22) */
 P.innerHTML = `<div class="y2-gn">${next.map(x => `<div class="y2-g big"><small>${esc(D.ui.next)}</small><b>${esc(x.name)}</b><span>${txt(x)}</span>${x.once ? '' : bar(x)}<em>${val(x)}</em></div>`).join('')}</div>
  <div class="y2-gl">${rest.map(x => `<div class="y2-g ${x.done ? 'done' : ''}"><b>${x.done ? '★ ' : ''}${esc(x.name)}</b><span>${txt(x)}</span>${x.once || x.done ? '' : bar(x)}<em>${val(x)}</em></div>`).join('')}</div>${y2Say('goals')}`;
 on('[data-y2seen]', d => act('yuna2', ['seen', d.y2seen]));
} };
/* ── 창 ── */
MSGS.yuna_report = (m, kit) => { const D = Y2D(); if (!D) return null;
 return kit.head('리포트', m.view === 'sell' ? 'worry' : 'base', `<h2>${esc(ST[m.stock]?.name || '')}</h2><div class="y2-rep">${m.lines.slice(1, -1).map(l => `<p>${esc(l)}</p>`).join('')}</div><i class="y2-v ${m.view} big">${esc(D.ui.view[m.view])}</i>`, esc(m.lines.at(-1))); };
function y2Person(m, tag, body, say) {   /* 결혼 상대가 왼쪽에 서는 큰 소식 창(head 꼴 · 유나 대신 그 사람) */
 return `<div class="bn-wrap" data-k="${m.type}-${g.s.day}-${g.s.msgs.length}"><div class="bn-clip"><img class="bn-yuna" src="${fullArt(m.who)}" alt="${esc(CAST[m.who] || '')}"></div><div class="bn msg"><div class="bn-tag">${tag}</div><div class="bn-bd">${body}${say ? `<div class="bn-say"><b>${esc((CAST[m.who] || '').slice(1))}</b><span>${say}</span></div>` : ''}<div class="mb bn-mb" id="mb"></div></div></div></div>`;
}
MSGS.wed = (m, kit) => { const D = Y2D(); if (!D) return null; const W = D.marriage.wed;
 const dw = m.dowry ? `<div class="bn-kv"><span>${esc(y2f(W.dowry, { name: ST[m.dowry.stock]?.name || '', n: won(m.dowry.n) }))}</span><b class="up">+</b></div>` : '';
 return `<div class="y2-wedbg" style="background-image:url('${art('개편배경/bg_wedding_hall.jpg')}')"></div>` + y2Person(m, W.tag, `<h2>${esc(D.marriage.names[m.who])}</h2>${kit.kv(esc(D.ui.kv.wed), '−' + M(m.cost), 'dn')}${dw}<div class="bn-kv"><span>${emo('♥')}</span><b>${esc(D.marriage.help_text[m.who])}</b></div>`, esc(W.line[m.who])); };
MSGS.wed_event = (m, kit) => { const D = Y2D(); if (!D) return null;
 const chips = [m.cash ? kit.kv(esc(D.ui.kv.cash), (m.cash > 0 ? '+' : '−') + M(Math.abs(m.cash)), m.cash > 0 ? 'up' : 'dn') : '', m.stress ? kit.kv(esc(D.ui.kv.stress), (m.stress > 0 ? '+' : '') + m.stress, m.stress > 0 ? 'dn' : 'up') : '', m.rel ? kit.kv(esc(D.ui.kv.rel), (m.rel > 0 ? '+' : '') + m.rel, m.rel > 0 ? 'up' : 'dn') : ''].join('');
 return `<div class="y2-wedbg" style="background-image:url('${art('개편배경/bg_newlywed_home.jpg')}')"></div>` + y2Person(m, '홈', `<div class="bn-q">${esc(m.text)}</div>${chips}`, ''); };
MSGS.rep_lv = (m, kit) => { floatUp(esc(m.text), m.to > m.from ? 'buy' : 'sys', m.to > m.from ? '▲' : '▼'); kit.done(); return null; };   /* 평판 단계 — 큰 창 대신 한 줄(업적과 같은 꼴) */

