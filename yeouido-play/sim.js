/* 장난감 2판 규칙 — 기획 01_기획/장난감2_한장.md · 설계 02_설계/장난감_2판.md · 숫자는 03_자료/장난감2/toy2.json 한 곳.
   시장의 운은 날마다 씨앗으로 미리 정하고(내 매매와 따로), 내 매매 · 지분 · 정보원 귀띔은 그 위에 얹는다. */
'use strict';
(function (root) {
const T = root.TOY2 || require('./data.js'), N = T.numbers, H = T.headlines;
const Story = root.Toy2Story || require('./story.js');
N.story_on ??= true; N.stage2_yuna_acc ??= 0.05;
if (typeof process !== 'undefined' && process.env?.TOY_OVERRIDE) Object.assign(N, JSON.parse(process.env.TOY_OVERRIDE));
const idx = a => Object.fromEntries(a.map(x => [x.id, x]));
const I0 = T.instinct, ST = idx(T.stocks), SRC = idx(T.sources), HOUSE = idx(T.houses), SHOP = idx(T.shops), CAR = idx(T.cars), PEOPLE = idx(T.contacts), PLACE = idx(T.places), REP = idx(T.reps), ACH = idx(T.achievements), CAREER = idx(T.careers);
const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const uni = (r, [a, b]) => a + (b - a) * r(), gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pick = (r, a) => a[Math.floor(r() * a.length)];
function weighted(r, arr) { const sum = arr.reduce((n, x) => n + x.weight, 0); let x = r() * sum; for (const a of arr) { x -= a.weight; if (x < 0) return a; } return arr.at(-1); }

/* 달력: 장이 서는 날(평일)만 */
const DAYS = (() => { const out = [], d = new Date(N.start_date + 'T00:00:00Z'), end = new Date(N.end_date + 'T00:00:00Z'); while (d <= end) { const w = d.getUTCDay(); if (w && w < 6) out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); } return out; })();
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const dow = i => new Date(DAYS[i] + 'T00:00:00Z').getUTCDay();
const eraOf = i => T.era.filter(e => e.from <= DAYS[i]).at(-1);

/* 하루 흐름(기울기)은 따로 뽑음 — 선배가 하루 앞서 귀띔할 수 있게 */
function dayTrend(seed, day, prev, era, open, fair) { const r = rng(seed ^ Math.imul(day + 7, 0x85EBCA6B)), t = {}, gap = {}; for (const s of T.stocks) { const pull = open && fair ? N.revert * Math.log(fair[s.id] / open[s.id]) : 0; t[s.id] = (prev?.[s.id] || 0) * N.trend_carry + gauss(r) * N.trend_sd + era.drift + pull; gap[s.id] = gauss(r); } return { t, gap }; } // 값은 제값(fair) 쪽으로 천천히 끌림

function makeDay(seed, day, open, prevTrend, tips, policy, fair) {
 const r = rng(seed ^ Math.imul(day + 1, 0x9E3779B1)), M = N.minutes, era = eraOf(day), path = {}, feed = [], move = {};
 for (const s of T.stocks) move[s.id] = new Float64Array(M + 1);
 const add = (id, from, len, total) => { for (let m = Math.max(0, from); m < Math.min(M, from + len); m++) move[id][m + 1] += total / len; };
 const n = Math.round(uni(r, N.news_per_day));
 for (let i = 0; i < n; i++) {
  const st = pick(r, T.stocks), src = weighted(r, T.sources), good = r() < 0.5, dir = good ? 1 : -1, real = r() < src.accuracy;
  const size = uni(r, N.news_size) * src.size_mul, delay = Math.round(uni(r, src.delay)), spread = Math.round(uni(r, N.news_spread)), deny = Math.round(uni(r, N.denial_after));
  const hi = M - delay - spread - deny - 12, t = Math.round(15 + r() * Math.max(1, hi - 15)), id = day + ':' + i;
  const pre = uni(r, N.news_pre), mv = real ? size : size * N.fake_follow; add(st.id, t - 3, 3, dir * mv * pre);
  feed.push({ t, kind: 'news', stock: st.id, src: src.id, dir, real, id, head: fmt(pick(r, H[good ? 'good' : 'bad']), { name: st.name }) });
  if (real) { add(st.id, t + delay, spread, dir * size * (1 - pre)); if (src.id !== 'notice') feed.push({ t: t + delay + spread, kind: 'confirm', stock: st.id, dir, of: id, head: fmt(H.confirm, { name: st.name }) }); }
  else { add(st.id, t + delay, Math.round(spread / 2), dir * size * N.fake_follow * (1 - pre)); add(st.id, t + delay + deny, 10, -dir * size * N.fake_follow); feed.push({ t: t + delay + deny, kind: 'denial', stock: st.id, dir: -dir, of: id, head: fmt(H.denial, { name: st.name }) }); }
 }
 (tips || []).forEach((tp, i) => { const rr = rng(seed ^ Math.imul(day + 3, 0x27D4EB2F) ^ (i * 7919)), real = rr() < tp.acc, size = uni(rr, N.tip_size), delay = Math.round(uni(rr, N.tip_delay)), spread = Math.round(uni(rr, N.news_spread));
  if (real) add(tp.stock, tp.t + delay, spread, tp.dir * size);
  feed.push({ t: tp.t, kind: 'tip', stock: tp.stock, dir: tp.dir, real, who: tp.who, insider: !!tp.insider, acc: tp.acc, head: tp.head || fmt(H[tp.dir > 0 ? 'tip_good' : 'tip_bad'], { who: tp.whoName, name: ST[tp.stock].name }) }); });
 for (let k = 0; k < 2; k++) if (r() < N.surprise_chance / 2) { const st = pick(r, T.stocks), dir = r() < 0.5 ? 1 : -1, t = Math.round(30 + r() * 320), size = uni(r, N.surprise_size); add(st.id, t, 3, dir * size); feed.push({ t, kind: 'surprise', stock: st.id, dir, head: fmt(H[dir > 0 ? 'surprise_good' : 'surprise_bad'], { name: st.name }) }); }
 if (era.head && era.from === DAYS[day]) feed.push({ t: 1, kind: 'era', dir: era.drift > 0 ? 1 : -1, head: era.head });
 const { t: trend, gap } = dayTrend(seed, day, prevTrend, era, open, fair);
 for (const s of T.stocks) {
  const pol = policy?.[s.id], tr = trend[s.id] + (pol === 'invest' ? N.policy_invest * M / M : 0) + (pol === 'buyback' ? 0.001 : 0), vm = era.vol * (pol === 'buyback' ? 0.8 : 1);
  const p = new Float64Array(M + 1); p[0] = open[s.id] * (1 + gap[s.id] * s.vol * 0.35 * vm);
  const sd = s.vol * vm / Math.sqrt(M), wob = s.vol * N.noise_mul * vm / Math.sqrt(M); let base = p[0], dev = 0, inc = 0;
  for (let m = 1; m <= M; m++) { let ret = tr / M + move[s.id][m] + gauss(r) * sd; if (m >= N.close_wobble_from) ret += gauss(r) * N.close_wobble_sd; base = Math.max(50, base * (1 + ret));
   inc = inc * N.noise_smooth + gauss(r) * wob * Math.sqrt(1 - N.noise_smooth ** 2); dev = dev * (1 - N.noise_revert) + inc; p[m] = base * (1 + (m === M ? dev * 0.3 : dev)); }
  path[s.id] = p;
 }
 feed.sort((a, b) => a.t - b.t);
 return { path, trend, feed };
}

class Game {
 constructor(opt = {}, saved = null) {
  this.T = T; this.N = N; this.DAYS = DAYS;
  if (saved) { this.s = saved; Story.init(this); this.build(); return; }
  const c = CAREER[opt.career || 'ex'], seed = (opt.seed ?? 20100104) >>> 0, r = rng(seed ^ 0xC0FFEE);
  const level = T.levels.find(l => l.id === opt.level);
  this.s = { version: N.version, seed, name: opt.name || '정민재', level: level?.id || null, career: c.id, day: 0, minute: 0, phase: 'open', speed: 0, autopause: true,
   cash: level ? level.severance + level.principal : c.cash, debt: level ? 0 : c.debt,
   baek: { principal: level?.principal || 0, rateMul: level?.rateMul || 1, state: level ? 'owe' : 'paid', paidDay: null }, deposit: 0, hold: {}, avg: {}, flag: {}, impact: {}, extra: {}, ramp: [], gate: {}, gateDay: {}, policy: {}, delisted: {},
   open: Object.fromEntries(T.stocks.map(s => [s.id, s.price])), fair: Object.fromEntries(T.stocks.map(s => [s.id, s.price])), trendPrev: null, shown: [], msgs: [], tips: [], pending: [],
   rep: { know: 0, ethics: 40, net: 0, charity: 0, image: 0, ...c.rep }, stress: c.stress, house: 'gosiwon', car: 'none', shops: {}, gift: 0,
   contacts: Object.fromEntries(T.contacts.map(p => [p.id, { known: p.start, rel: p.start ? 20 : 0, last: 0 }])), senior: 20,
   susp: 0, warned: false, probe: false, lawyer: false, jailCount: 0, away: null, slot: 0, firm: null, ach: {}, log: [], hist: [],
   trades: 0, tradesToday: 0, dayStart: 0, monthIncome: 0, peakJul: null, divMonth: 0, luck: !!c.luck,
   rich: Array.from({ length: N.rich_count }, () => (level ? level.severance : c.cash - c.debt) * N.rich_floor_mul + N.rich_median * Math.exp(gauss(r) * N.rich_sd)) };   /* 100위 끝자리 = 시작 순자산 × rich_floor_mul — 1막에서 닿는 문턱(숫자 가설표) */
  for (const s of T.stocks) { this.s.hold[s.id] = 0; this.s.impact[s.id] = 0; this.s.extra[s.id] = 1; this.s.gate[s.id] = -1; }
  { const tm = (T.teams || []).find(x => x.id === opt.team), lk = (T.looks || []).find(x => x.id === opt.look);   /* 새 판 LOOK · TEAM(11-20) — 팀은 시작 평판 · 현금 + 그 갈래 첫 노드 */
   this.s.look = lk ? lk.id : null; this.s.team = tm ? tm.id : null;
   if (tm) { for (const [k, v] of Object.entries(tm.rep)) this.s.rep[k] = (this.s.rep[k] || 0) + v; this.s.cash += tm.cash; if (tm.node) this.inst().got.push(tm.node); } }
  Story.init(this); this.build(); this.s.dayStart = this.netWorth(); this.s.start = this.s.dayStart;
  this.storyAt('장 전'); this.msg({ type: 'hello' });
 }
 storyAt(time, event) { return Story.pump(this, time, event); }
 storyText(str) { return Story.text(this, str); }
 storyPending() { return this.s.msgs.some(m => m.type === 'scene'); }
 baekInterest() { const b = this.s.baek; return b.state === 'owe' ? b.principal * N.loan_rate * b.rateMul : 0; }
 baekRepay(amount) {
  const s = this.s, b = s.baek;
  if (DAYS[s.day] < '2012-01-02' || b.state !== 'owe' || !Number.isFinite(amount) || amount <= 0) return false;
  const paid = Math.min(amount, b.principal, s.cash); if (paid <= 0) return false;
  b.principal -= paid; s.cash -= paid;
  if (!b.principal) { b.state = 'paid'; b.paidDay = DAYS[s.day]; } return true;
 }
 /* ── 조회 ── */
 build() { const s = this.s; this.m = makeDay(s.seed, s.day, s.open, s.trendPrev, s.tips, s.policy, s.fair); }
 date(i = this.s.day) { const d = DAYS[i]; return `${d.slice(0, 4)}년 ${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일 ${WEEK[dow(i)]}`; }
 clock(m = this.s.minute) { const t = N.open + m; return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
 price(id, m = this.s.minute) { if (this.s.delisted[id]) return 0; return this.m.path[id][m] * this.s.extra[id] * (1 + this.s.impact[id]); }
 stocksValue() { return T.stocks.reduce((n, s) => n + this.s.hold[s.id] * this.price(s.id), 0); }
 assets() { const s = this.s; return HOUSE[s.house].price * 0.9 + CAR[s.car].price * 0.6 + Object.entries(s.shops).reduce((n, [k, q]) => n + SHOP[k].price * 0.9 * q, 0) + (s.firm ? s.firm.capital : 0); }
 netWorth() { const s = this.s; return s.cash + s.deposit + this.stocksValue() + this.assets() - s.debt - s.baek.principal; }
 money(n) { const a = Math.abs(n), sg = n < 0 ? '-' : ''; return a >= 1e12 ? sg + (a / 1e12).toFixed(2) + '조' : a >= 1e8 ? sg + (a / 1e8).toFixed(2) + '억' : sg + Math.round(a / 1e4).toLocaleString('ko-KR') + '만'; }
 lvl(id) { if (id === 'wealth') return Math.max(0, N.wealth_tiers.filter(x => this.netWorth() >= x).length - 1); const pts = id === 'net' ? this.netPts() : this.s.rep[id]; return N.rep_levels.filter(x => pts >= x).length - 1; }
 /* ── 큰손 감각 나무(결정 D-032) — 평판은 조건만 · 점수는 큰 마디에서 · 셋째 마디는 둘 중 하나 · 옛 저장엔 칸이 없어 처음 쓸 때 만듦 ── */
 inst() { return (this.s.inst ||= { pt: 0, got: [], earned: 0, rankHit: [], achN: 0, lock: -1 }); }
 has(id) { return !!this.s.inst?.got.includes(id); }
 instNode(id) { for (const b of I0.branches) for (const [ti, t] of b.tiers.entries()) for (const n of t) if (n.id === id) return { b, ti, t, n }; return null; }
 instOpen(id) { const I = this.inst(), f = this.instNode(id); if (!f || I.got.includes(id) || f.t.some(x => x.id !== id && I.got.includes(x.id))) return false;
  return (f.ti === 0 || f.b.tiers[f.ti - 1].some(x => I.got.includes(x.id))) && this.lvl(f.n.cond[0]) >= f.n.cond[1]; }
 canLearn(id) { const I = this.inst(); return I.pt >= 1 && I.lock !== this.s.day && this.instOpen(id); }
 learn(id) { if (!this.canLearn(id)) return false; const I = this.inst(); I.got.push(id); I.pt--; return true; }
 respec() { const I = this.inst(); if (!I.got.length || this.s.cash < I0.respec_cost) return false; this.s.cash -= I0.respec_cost; I.pt += I.got.length; I.got = []; I.lock = this.s.day; return true; }   /* 비서 상담료 + 하룻밤(그날은 못 배움) */
 instGain() { const I = this.inst(); I.pt++; I.earned++; }
 instChoices() { return I0.branches.map(b => b.tiers.flat().find(n => this.canLearn(n.id))).filter(Boolean); }   /* 셋 중 하나 — 갈래마다 지금 배울 수 있는 첫 노드 */
 netPts() { return Object.values(this.s.contacts).filter(c => c.known).reduce((n, c) => n + c.rel, 0) / 10 + this.s.rep.net; }
 stake(id) { return Math.max(0, this.s.hold[id]) / ST[id].shares; }
 loanLimit() { const banker = T.contacts.some(p => p.role === 'banker' && this.s.contacts[p.id].known && this.s.contacts[p.id].rel >= 40); return N.loan_tiers[Math.max(0, this.lvl('wealth')) + (banker ? 1 : 0) + (this.has('w_bank') ? 1 : 0)] ?? N.loan_tiers.at(-1); }
 loanRate() { return Math.max(0.002, N.loan_rate - (this.lvl('image') >= 2 ? 0.001 : 0) - (T.contacts.some(p => p.role === 'banker' && this.s.contacts[p.id].rel >= 60) ? 0.002 : 0)); }
 canShort() { return this.lvl('wealth') >= (this.has('w_short') ? 1 : 2); }
 seniorLvl() { return Math.min(5, Math.floor(this.s.senior / 20)); }
 rank() { const idxv = T.stocks.reduce((n, s) => n + (this.s.delisted[s.id] ? 0.3 : this.price(s.id) / s.price), 0) / T.stocks.length, nw = this.netWorth(); return 1 + this.s.rich.filter(w => w * (0.5 + 0.5 * idxv) > nw).length; }
 msg(m) { this.s.msgs.push(m); }
 note(text) { this.s.log.push({ day: this.s.day, text }); if (this.s.log.length > 200) this.s.log.shift(); }
 achieve(id) { if (!this.s.ach[id] && ACH[id]) { this.s.ach[id] = this.s.day + 1; this.msg({ type: 'ach', id }); const I = this.inst(); if (++I.achN % I0.gain.ach_every === 0) { this.instGain(); this.msg({ type: 'inst', why: 'ach' }); } } }
 r(salt) { return rng(this.s.seed ^ Math.imul(this.s.day + 11, 0x2545F491) ^ Math.imul(salt + 1, 0x9E3779B9) ^ this.s.minute); }

 /* ── 장중 ── */
 trade(side, id, frac) {
  const s = this.s; if (this.storyPending() || s.phase !== 'open' || !ST[id] || s.delisted[id] || !(frac > 0 && frac <= 1)) return false;
  const p = this.price(id), tv = ST[id].turnover;
  if (side === 'buy') {
   if (s.hold[id] < 0) { const q = frac >= 1 ? -s.hold[id] : Math.max(1, Math.floor(-s.hold[id] * frac)), dI = N.impact_k * q * p / tv, fill = p * (1 + dI / 2), cost = q * fill; if (cost > s.cash) return false;
    const pnl = q * s.avg[id] - cost; s.cash -= cost; s.hold[id] += q; s.impact[id] += dI; if (!s.hold[id]) s.avg[id] = 0; if (pnl > 0) this.achieve('short'); this.afterTrade(id, pnl); return true; }
   const A = s.cash * frac, dI = N.impact_k * A / tv, fill = p * (1 + dI / 2), q = Math.floor(A / fill); if (q < 1) return false;
   const cost = q * fill; s.cash -= cost; s.avg[id] = ((s.avg[id] || 0) * s.hold[id] + cost) / (s.hold[id] + q); s.hold[id] += q; s.impact[id] += dI;
   const tip = this.m.feed.find(f => f.kind === 'tip' && f.stock === id && f.insider && f.t <= s.minute); if (tip) s.flag[id] = { insider: true, day: s.day };
   this.checkGate(id); this.afterTrade(id, 0); return true;
  }
  if (s.hold[id] > 0) { const q = frac >= 1 ? s.hold[id] : Math.max(1, Math.floor(s.hold[id] * frac)), dI = N.impact_k * q * p / tv, fill = p * (1 - dI / 2), got = q * fill * (1 - N.sell_cost), pnl = got - q * s.avg[id];
   if (frac >= 1 && this.has('w_block')) { s.impact[id] += dI * (1 - I0.block_impact); }
   s.cash += got; s.hold[id] -= q; s.impact[id] -= dI; if (!s.hold[id]) s.avg[id] = 0; if (pnl > 0) { this.achieve('first_win'); if (pnl / Math.max(1, this.netWorth()) > 0.01) s.rep.know += 1; }
   if (s.flag[id]?.insider && pnl > 0) { s.susp += Math.min(45, pnl / Math.max(1, this.netWorth()) * N.susp_insider_mul) * (1 - this.lvl('ethics') * 0.12); s.rep.ethics -= 2; }
   if (s.gateDay[id] != null && s.day - s.gateDay[id] <= 5 && q >= (s.hold[id] + q) / 2) { s.susp += N.susp_pump; s.gateDay[id] = null; }
   if (!s.hold[id]) delete s.flag[id]; this.afterTrade(id, pnl); return true; }
  if (!this.canShort()) return false; // 공매도: 재력 2단계부터
  const A = s.cash * frac * N.short_margin, dI = N.impact_k * A / tv, fill = p * (1 - dI / 2), q = Math.floor(A / fill); if (q < 1) return false;
  const value = Math.abs(s.hold[id] - q) * p; if (s.cash + q * fill < value * (1 + N.short_margin)) return false;
  s.avg[id] = ((s.avg[id] || 0) * -s.hold[id] + q * fill) / (-s.hold[id] + q); s.cash += q * fill * (1 - N.sell_cost); s.hold[id] -= q; s.impact[id] -= dI; this.afterTrade(id, 0); return true;
 }
 afterTrade(id, pnl) { const s = this.s; s.trades++; s.tradesToday++; s.lastTrade = { id, pnl, t: s.minute }; this.checkSusp(); }
 checkGate(id) { const s = this.s, st = this.stake(id); N.stake_gates.forEach((g0, i) => { const g = i === 1 && this.has('w_vote') ? I0.vote_gate : g0; if (st >= g && s.gate[id] < i) { s.gate[id] = i;
   if (i === 0) { const r = this.r(i); s.ramp.push({ id, left: 15, step: uni(r, N.stake_jump) / 15 }); s.gateDay[id] = s.day; s.rep.image += 5; this.achieve('stake5'); }
   if (i === 2) this.achieve('director'); if (i === 3) { this.achieve('ceo'); s.policy[id] = s.policy[id] || 'invest'; s.rep.image += 10; }
   s.shown.push({ day: s.day, t: s.minute, kind: 'stake', stock: id, dir: 1, head: fmt(H.stake, { name: ST[id].name, pct: Math.round(g * 100) }) }); this.msg({ type: 'stake', stock: id, gate: i }); } }); }
 checkSusp() { const s = this.s; if (s.susp >= N.susp_warn && !s.warned) { s.warned = true; this.msg({ type: 'warn' }); this.achieve('warned'); } if (s.susp >= N.susp_probe && !s.probe) { s.probe = true; this.msg({ type: 'probe' }); } }
 tick() {
  const s = this.s; if (s.phase !== 'open' || this.storyPending()) return false;
  s.minute++; const k = Math.pow(0.5, 1 / N.impact_half_life); for (const id in s.impact) s.impact[id] *= k;
  for (const r of s.ramp) if (r.left > 0) { s.extra[r.id] *= 1 + r.step; r.left--; } s.ramp = s.ramp.filter(r => r.left > 0);
  for (const f of this.m.feed) if (f.t === s.minute) s.shown.push({ ...f, day: s.day });
  if (s.shown.length > 400) s.shown = s.shown.slice(-300);
  if (s.minute >= N.minutes) this.closeDay(); return true;
 }
 closeDay() {
  const s = this.s, nw = this.netWorth(), pnl = nw - s.dayStart;
  this.scoreYunaTips();
  if (pnl < 0) s.stress += -pnl / Math.max(1, s.dayStart) * 100 * N.stress_loss_mul; s.stress += Math.max(0, s.tradesToday - N.stress_trade_free) * N.stress_trade; s.stress -= HOUSE[s.house].comfort / 40 + CAR[s.car].comfort / 40; s.stress = Math.max(0, Math.min(100, s.stress));
  s.hist.push({ d: s.day, nw: Math.round(nw), pnl: Math.round(pnl) }); if (s.hist.length > 800) s.hist.shift();
  for (const st of T.stocks) if (st.small && !s.delisted[st.id] && this.price(st.id) < st.price * 0.22) { s.delisted[st.id] = true; this.msg({ type: 'delist', stock: st.id, lost: s.hold[st.id] }); s.hold[st.id] = 0; }
  this.checkAch(); if (DAYS[s.day] >= '2011-07-25' && DAYS[s.day] <= '2011-07-29') s.peakJul = nw;
  if (DAYS[s.day] >= '2011-09-01' && s.peakJul != null && !s.ach.crash && nw >= s.peakJul) this.achieve('crash');
  const r = this.r(99); if (s.stress >= N.sick_from && r() < N.sick_chance) { const d = Math.round(uni(r, N.sick_days)); s.away = { kind: 'sick', left: d, total: d }; s.cash -= N.hospital_cost; s.stress = 35; this.msg({ type: 'sick', days: d }); }
  if (s.probe && r() < N.probe_chance) this.verdict(r);
  if (r() < 0.012) this.msg({ type: 'scam' }); if (r() < 0.008) { const cost = 1000000 + HOUSE[s.house].price * 0.01; s.cash -= cost; this.msg({ type: 'event', text: `집에 물이 샜다 — 수리비 ${this.money(cost)} 원` }); }
  if (s.day >= DAYS.length - 1 || nw < N.bankrupt) { s.phase = 'end'; s.broke = nw < N.bankrupt; return; }
  s.phase = s.away ? 'away' : 'evening';
  if (s.phase === 'evening' && dow(s.day) === 5) { const w = s.wk || { day: s.day, nw: s.dayStart, trades: s.trades }; this.msg({ type: 'week', from: w.day, pnl: Math.round(nw - w.nw), trades: s.trades - w.trades, tips: (s.yunaTip?.log || []).filter(x => x.day >= w.day && x.hit).length }); }   /* 금요일 장 마감 — 이번 주(D-050) */
  if (s.phase === 'evening' && this.storyAt('저녁')) return;
  if (s.phase === 'evening') { const known = T.contacts.filter(p => s.contacts[p.id].known); if (known.length && r() < N.call_chance) this.msg({ type: 'call', who: pick(r, known).id }); }
  if (s.phase === 'evening' && dow(s.day) !== 5 && !N.weekday_evening && !s.msgs.some(m => m.type === 'call' || m.type === 'scene')) { const sp = s.speed; this.endEvening(); if (s.phase === 'open') s.speed = sp; }   /* 평일 저녁 없앰(D-050) — 약속 · 장면 · 전화가 없는 날은 바로 다음 날로 · 흐르던 속도 그대로 */
 }
 verdict(r) { const s = this.s; s.probe = false; s.susp = 20; s.rep.ethics -= 10; s.rep.image = Math.max(0, s.rep.image - 15);
  if (s.lawyer || r() < 0.5) { const fine = Math.max(0, this.netWorth()) * (s.lawyer || this.has('f_off') ? N.fine / 2 : N.fine); s.cash -= fine; this.msg({ type: 'verdict', kind: 'fine', fine }); }
  else { const d = Math.round(uni(r, N.jail_days)); s.away = { kind: 'jail', left: d, total: d }; s.jailCount++; this.achieve('jailed'); this.msg({ type: 'verdict', kind: 'jail', days: d }); }
  s.lawyer = false; }
 checkAch() { const s = this.s, nw = this.netWorth(); [[2e8, 'nw2'], [1e9, 'nw10'], [5e9, 'nw50'], [2e10, 'nw200']].forEach(([v, id]) => nw >= v && this.achieve(id));
  if (Object.values(s.contacts).filter(c => c.known).length >= 8) this.achieve('people8'); const rk = this.rank(); if (rk <= 10) this.achieve('top10');
  const I = this.inst(); for (const th of I0.gain.rank) if (rk <= th && !I.rankHit.includes(th)) { I.rankHit.push(th); this.instGain(); this.msg({ type: 'inst', why: 'rank', th }); } }

 /* ── 저녁 · 주말 ── */
 evening(kind, who) {
  const s = this.s; if (s.phase !== 'evening' || this.storyPending()) return false;
  if (this.storyAt('저녁', { kind, who })) return true; const r = this.r(7);
  if (kind === 'meet') { const c = s.contacts[who], p = PEOPLE[who]; if (!c?.known) return false; const role = T.roles[p.role];
   c.rel = Math.min(100, c.rel + N.rel_meet + (s.gift ? N.rel_gift : 0)); s.gift = 0; c.last = s.day; s.cash -= 300000; s.stress = Math.max(0, s.stress - (role.calm || 4));
   if (role.ethics) s.rep.ethics += role.ethics / 2; if (p.role === 'analyst') s.rep.know += 1;
   if (r() < 0.45 + c.rel / 200) this.tipFrom(p, c.rel, r); else this.msg({ type: 'talk', who, text: '오늘은 별다른 얘기 없이 술잔만 기울였다.' });
   if (c.rel >= N.intro_rel && r() < 0.3) this.intro(r, who); }
  else if (kind === 'senior') { s.senior = Math.min(100, s.senior + 8); s.cash -= 200000; s.stress = Math.max(0, s.stress - 5); this.seniorHint(r, this.has('i_big')); }
  else if (kind === 'paid') { if (this.seniorLvl() < N.senior_paid_level) return false; const cost = N.senior_paid_cost * (this.lvl('know') >= 4 ? 0.5 : 1); if (s.cash < cost) return false; s.cash -= cost; this.seniorHint(r, true); }
  else if (kind === 'pub') { s.cash -= 200000; s.stress = Math.max(0, s.stress - 8); if (r() < 0.6) this.tipFrom({ id: 'pub', name: '옆자리 손님', role: 'tipster' }, 0, r); if (r() < 0.15 + this.lvl('net') * 0.05) this.intro(r); }
  else if (kind === 'rest') { s.stress = Math.max(0, s.stress - N.stress_rest * (1 + this.lvl('charity') * 0.15) - HOUSE[s.house].comfort / 15); }
  else if (kind === 'study') { s.rep.know += 2; s.stress = Math.min(100, s.stress + 2); }
  else return false;
  this.endEvening(); return true;
 }
 greet(who) { const s = this.s, c = s.contacts[who]; if (!c?.known || c.greet === s.day) return false; c.greet = s.day; c.rel = Math.min(100, c.rel + N.rel_greet); return true; }   /* 인맥 탭 '안부 묻기' — 사람마다 하루 한 번(11-20 R 목업) */
 answerCall(yes, who) { const s = this.s, c = s.contacts[who]; s.msgs = s.msgs.filter(m => !(m.type === 'call' && m.who === who)); if (!c) return false; if (yes) return this.evening('meet', who); c.rel = Math.max(0, c.rel + N.rel_call_no); return true; }
 tipFrom(p, rel, r) { const s = this.s, role = T.roles[p.role]; const stock = p.stock && !s.delisted[p.stock] ? p.stock : pick(r, T.stocks.filter(x => !s.delisted[x.id])).id;
  const acc = Math.min(0.97, role.acc + rel / 1000 + this.lvl('net') * 0.01), t = role.early || this.has('i_early') ? Math.round(uni(r, N.tip_minute)) : Math.round(60 + r() * 150), dir = r() < 0.55 ? 1 : -1;
  s.pending.push({ stock, dir, t, acc, who: p.id, whoName: p.name, insider: !!role.insider }); this.msg({ type: 'tip', who: p.id, stock, dir, insider: !!role.insider }); }
 /* 유나 귀띔 맞힘 — 귀띔한 날 장 마감 값(c0)과 다음 거래일 장 마감 값을 맞대 셈(비서 탭 YUNA TIP · 11-20 E 목업) · 옛 저장엔 칸이 없어 처음 쓸 때 만듦 */
 yunaTips() { return (this.s.yunaTip ||= { n: 0, hit: 0, pend: [] }); }
 noteYunaTip(stock, dir) { const y = this.yunaTips(); y.n++; y.pend.push({ day: this.s.day, stock, dir, c0: this.price(stock) }); }
 scoreYunaTips() { const s = this.s, y = s.yunaTip; if (!y) return; y.pend = y.pend.filter(p => { if (p.day >= s.day) return true; const hit = !s.delisted[p.stock] && (this.price(p.stock) - p.c0) * p.dir > 0; if (hit) y.hit++; (y.log ||= []).push({ day: p.day, at: s.day, stock: p.stock, dir: p.dir, hit }); if (y.log.length > 30) y.log.shift(); return false; }); }
 seniorHint(r, paid) { const s = this.s, lv = this.seniorLvl(), next = dayTrend(s.seed, s.day + 1, this.m.trend, eraOf(Math.min(DAYS.length - 1, s.day + 1)), Object.fromEntries(T.stocks.map(x => [x.id, this.m.path[x.id][N.minutes] * s.extra[x.id]])), s.fair).t;
  if (paid || lv >= N.senior_big_level) { const best = T.stocks.filter(x => !s.delisted[x.id]).sort((a, b) => Math.abs(next[b.id]) - Math.abs(next[a.id]))[0]; const dir = Math.sign(next[best.id]) || 1; this.noteYunaTip(best.id, dir); this.msg({ type: 'senior', stock: best.id, dir, sure: true, paid: !!paid, day: s.day }); return; }
  if (lv >= N.senior_free_level || this.has('i_report') || r() < 0.4 + this.lvl('know') * 0.1) { const st = pick(r, T.stocks.filter(x => !s.delisted[x.id])), right = r() < Math.min(1, 0.65 + this.lvl('know') * 0.04 + (s.story.stage.yuna >= 2 ? N.stage2_yuna_acc : 0)), dir = Math.sign(next[st.id]) * (right ? 1 : -1) || 1; this.noteYunaTip(st.id, dir); this.msg({ type: 'senior', stock: st.id, dir, day: s.day }); }
  else this.msg({ type: 'senior', none: true, day: s.day }); }
 intro(r, by) { const s = this.s, unknown = T.contacts.filter(p => !s.contacts[p.id].known && (by || p.role !== 'ceo' || this.lvl('net') >= 2)); if (!unknown.length) return; const p = pick(r, unknown); s.contacts[p.id].known = true; s.contacts[p.id].rel = this.has('f_card') ? I0.card_rel : 15; s.contacts[p.id].last = s.day; this.msg({ type: 'intro', who: p.id, by }); }
 endEvening() { const s = this.s; s.msgs = s.msgs.filter(m => m.type !== 'call'); if (dow(s.day) === 5) { s.phase = 'weekend'; s.slot = 0; this.storyAt('주말'); } else this.nextDay(); }
 weekend(place, arg) {
  const s = this.s, P = PLACE[place]; if (this.storyPending() || s.phase !== 'weekend' || !P || (CAR[s.car].reach < P.reach && !(place === 'golf' && this.has('f_golf')))) return false;
  if (this.storyAt('주말', { place })) return true; const r = this.r(31 + s.slot);
  s.cash -= P.cost; s.stress = Math.max(0, s.stress + P.stress * (place === 'home' ? 1 + HOUSE[s.house].comfort / 50 : 1) * (place === 'temple' ? 1 + this.lvl('charity') * 0.2 : 1));
  if (place === 'pub') { if (r() < 0.6) this.tipFrom({ id: 'pub', name: '옆자리 손님', role: 'tipster' }, 0, r); if (r() < 0.25 + this.lvl('net') * 0.05) this.intro(r); }
  if (place === 'golf') { const g = T.contacts.filter(p => p.golf && s.contacts[p.id].known); if (g.length) { const p = PEOPLE[arg] && g.includes(PEOPLE[arg]) ? PEOPLE[arg] : g[0]; s.contacts[p.id].rel = Math.min(100, s.contacts[p.id].rel + 15); s.contacts[p.id].last = s.day; this.msg({ type: 'talk', who: p.id, text: '라운딩 내내 이야기꽃이 폈다.' }); } s.rep.net += 3; if (r() < 0.35) { const u = T.contacts.filter(p => p.golf && !s.contacts[p.id].known); if (u.length) { const p = pick(r, u); s.contacts[p.id].known = true; s.contacts[p.id].rel = 20; this.msg({ type: 'intro', who: p.id }); } } }
  if (place === 'store') { if (s.cash >= 1000000) { s.cash -= 1000000; s.gift = 1; } }
  if (place === 'temple' && arg > 0 && s.cash >= arg) { s.cash -= arg; s.rep.charity += arg / N.charity_won_per_pt; s.rep.ethics += arg / (N.charity_won_per_pt * 2); s.donated = (s.donated || 0) + arg; if (this.has('f_gala')) s.rep.image += arg / N.charity_won_per_pt / 2; if (s.donated >= 1e8) this.achieve('charity'); if (this.lvl('charity') >= 3) s.rep.image += 1; }
  this.endWeekend(); return true;
 }
 endWeekend() { this.s.slot++; if (this.s.slot >= 2) this.nextDay(); else this.storyAt('주말'); }
 bet(horse, amount) { const s = this.s, h = T.horses[horse]; if (!h || !(amount > 0) || amount > s.cash) return null; const r = this.r(77 + s.slot); let x = r() * (s.luck ? 0.85 : 1), win = -1; for (let i = 0; i < T.horses.length; i++) { x -= T.horses[i].p; if (x < 0) { win = i; break; } } if (win < 0) win = T.horses.length - 1;
  s.cash -= amount; let got = 0; if (win === horse) { got = amount * h.odds; s.cash += got; s.stress = Math.max(0, s.stress - 10); if (h.odds >= 10) this.achieve('jackpot'); } else s.stress = Math.min(100, s.stress + 4); return { win, got }; }

 /* ── 다음 날 · 달 · 해 ── */
 nextDay() {
  const s = this.s; if (s.day >= DAYS.length - 1) { s.phase = 'end'; return false; }
  s.open = Object.fromEntries(T.stocks.map(x => [x.id, this.m.path[x.id][N.minutes] * s.extra[x.id]]));
  { const px = (s.px ||= {}); for (const x of T.stocks) if (!s.delisted[x.id]) { const L = (px[x.id] ||= []); L.push([s.day, Math.round(s.open[x.id])]); if (L.length > N.px_keep) L.shift(); } }   /* 지난날 종가를 쌓아 종목 차트를 이어 그림(11-20 대표님 피드백 12) */ for (const id in s.extra) s.extra[id] = 1; for (const id in s.impact) s.impact[id] = 0;
  { const fr = rng(s.seed ^ Math.imul(s.day + 5, 0x165667B1)), era = eraOf(s.day); for (const x of T.stocks) s.fair[x.id] *= 1 + era.drift + gauss(fr) * N.fair_sd + (s.policy[x.id] === 'invest' ? N.policy_invest : 0); }
  s.trendPrev = this.m.trend; const prevMonth = DAYS[s.day].slice(0, 7); s.day++; s.minute = 0; s.tradesToday = 0; s.tips = s.pending; s.pending = []; this.build();
  if (DAYS[s.day].slice(0, 7) !== prevMonth) this.month(); this.checkSusp();
  if (s.away) { s.phase = 'away'; } else { s.phase = 'open'; this.storyAt('장 전'); if (this.has('i_brief')) { const f = this.m.feed.find(x => x.kind === 'news' && x.real); if (f) s.shown.push({ day: s.day, t: 0, kind: 'brief', stock: f.stock, dir: f.dir, head: fmt(I0.brief_head, { name: ST[f.stock].name }) }); } }
  s.dayStart = this.netWorth(); if (!s.wk || dow(s.day) <= dow(s.day - 1) || s.day - s.wk.day >= 5) s.wk = { day: s.day, nw: Math.round(s.dayStart), trades: s.trades };   /* 이번 주 시작 값(D-050) */
  if (s.autopause) s.speed = 0; return true;
 }
 month() {
  const s = this.s, mon = +DAYS[s.day].slice(5, 7), house = HOUSE[s.house], car = CAR[s.car], r = this.r(55);
  const living = N.living_base + house.upkeep + car.upkeep, interest = s.debt * this.loanRate(), dep = s.deposit * N.deposit_rate, rent = Object.entries(s.shops).reduce((n, [k, q]) => n + SHOP[k].rent * q, 0);
  let director = 0; for (const st of T.stocks) if (s.gate[st.id] >= 2 && !s.delisted[st.id]) director += this.price(st.id) * st.shares * N.director_pay;
  let div = 0; if ([1, 4, 7, 10].includes(mon)) for (const st of T.stocks) if (!s.delisted[st.id]) div += s.hold[st.id] * this.price(st.id) * st.div * (s.policy[st.id] === 'div' ? 2 : 1);
  let shortFee = 0; for (const st of T.stocks) if (s.hold[st.id] < 0) shortFee += -s.hold[st.id] * this.price(st.id) * N.short_fee;
  let fund = 0, wages = 0; if (s.firm) { for (const m of s.firm.mgr) { wages += m.pay; fund += s.firm.capital * (m.mean + gauss(r) * m.sd) / s.firm.mgr.length; } if (!s.firm.mgr.length) fund = 0; s.firm.capital = Math.max(0, s.firm.capital + fund); s.firm.last = fund; }
  const income = rent + director + Math.max(0, div), tax = income * N.income_tax;
  const baekInterest = this.baekInterest(), baekPrincipal = s.baek.principal;
  s.cash += income - tax - living - interest - baekInterest - shortFee - wages + dep;
  if (s.debt > Math.max(0, this.netWorth()) * 0.5) s.stress = Math.min(100, s.stress + N.stress_debt);
  if (s.cash < 0) { s.debt += -s.cash; s.cash = 0; s.stress = Math.min(100, s.stress + 5); }
  for (const p of T.contacts) { const c = s.contacts[p.id]; if (c.known && s.day - c.last > 20) c.rel = Math.max(0, c.rel - N.rel_decay); }
  s.senior = Math.max(0, s.senior - 1); s.susp = Math.max(0, s.susp - N.susp_decay * (1 + (this.lvl('ethics') >= 2 ? 0.5 : 0)));
  if (this.lvl('charity') >= 3) s.rep.image += 1; if (this.has('f_tv')) s.rep.image += I0.tv_image;
  if (this.has('w_club')) this.tipFrom({ id: 'club', name: '큰손 모임', role: 'analyst' }, I0.club_rel, r);
  s.lastMonth = { baekInterest, baekPrincipal, living, interest, rent, director, div, tax, shortFee, fund, wages, dep, debt: s.debt };
  this.msg({ type: 'month', ...s.lastMonth }); this.storyAt('달 정산');
  if (mon === 1) { this.instGain(); this.msg({ type: 'year', inst: 1, year: +DAYS[s.day].slice(0, 4) - 1, nw: this.netWorth(), rank: this.rank() }); }
  if ([1, 4, 7, 10].includes(mon)) for (const st of T.stocks) if (s.gate[st.id] >= 1 && !s.delisted[st.id]) this.msg({ type: 'agm', stock: st.id, ceo: s.gate[st.id] >= 3 });
 }
 awayDay() { const s = this.s; if (this.storyPending() || s.phase !== 'away' || !s.away) return false; s.minute = N.minutes; s.away.left--; const done = s.away.left <= 0;
  const nw = this.netWorth(); s.hist.push({ d: s.day, nw: Math.round(nw), pnl: Math.round(nw - s.dayStart) }); if (done) { s.away = null; }
  if (s.day >= DAYS.length - 1) { s.phase = 'end'; return true; } if (dow(s.day) === 5 && done) { s.phase = 'weekend'; s.slot = 0; this.storyAt('주말'); return true; } this.nextDay(); return true; }

 /* ── 은행 · 집 · 차 · 상가 · 회사 ── */
 bank(kind, amount) { const s = this.s; if (!(amount > 0) || s.phase === 'away' || s.phase === 'end') return false;
  if (kind === 'borrow') { if (s.debt + amount > this.loanLimit()) return false; s.debt += amount; s.cash += amount; }
  else if (kind === 'repay') { const a = Math.min(amount, s.debt, s.cash); if (a <= 0) return false; s.debt -= a; s.cash -= a; }
  else if (kind === 'save') { if (amount > s.cash) return false; s.cash -= amount; s.deposit += amount; }
  else if (kind === 'withdraw') { const a = Math.min(amount, s.deposit); if (a <= 0) return false; s.deposit -= a; s.cash += a; }
  else return false; return true; }
 buyHouse(id) { const s = this.s, h = HOUSE[id]; if (!h || id === s.house || this.lvl('wealth') < h.need || this.lvl('image') < (h.image || 0)) return false; const net = h.price - HOUSE[s.house].price * 0.9; if (s.cash < net) return false; s.cash -= net; s.house = id; if (id === 'riverapt') this.achieve('apt'); if (id === 'penthouse') this.achieve('penthouse'); return true; }
 buyCar(id) { const s = this.s, c = CAR[id]; if (!c || id === s.car) return false; const net = c.price - CAR[s.car].price * 0.6; if (s.cash < net) return false; s.cash -= net; s.car = id; if (c.image) s.rep.image += c.image; if (id === 'import') this.achieve('import'); return true; }
 shop(id, buy) { const s = this.s, x = SHOP[id]; if (!x) return false; if (buy) { if (s.cash < x.price) return false; s.cash -= x.price; s.shops[id] = (s.shops[id] || 0) + 1; this.achieve('landlord'); return true; } if (!s.shops[id]) return false; s.shops[id]--; s.cash += x.price * 0.9; return true; }
 firm(kind, arg) { const s = this.s;
  if (kind === 'found') { if (s.firm || this.lvl('wealth') < 3 || s.cash < N.firm_cost) return false; s.cash -= N.firm_cost; s.firm = { capital: N.firm_cost, mgr: [], last: 0 }; this.achieve('firm'); return true; }
  if (!s.firm) return false; const tiers = T.firm_tiers;   /* 매니저 값은 toy2.json 한 곳(화면도 같이 읽음 · 11-20) */
  if (kind === 'hire') { if (!tiers[arg] || s.firm.mgr.length >= 3) return false; s.firm.mgr.push({ ...tiers[arg], tier: arg }); return true; }
  if (kind === 'fire') { s.firm.mgr.splice(arg, 1); return true; }
  if (kind === 'add') { if (!(arg > 0) || arg > s.cash) return false; s.cash -= arg; s.firm.capital += arg; return true; }
  if (kind === 'take') { const a = Math.min(arg, s.firm.capital); if (!(a > 0)) return false; s.firm.capital -= a; s.cash += a; return true; } return false; }
 agm(stock, choice) { const s = this.s; s.msgs = s.msgs.filter(m => !(m.type === 'agm' && m.stock === stock)); if (s.gate[stock] >= 3) s.policy[stock] = choice; else if (choice === 'div') s.policy[stock] = this.stake(stock) + this.lvl('image') * 0.02 > 0.12 ? 'div' : s.policy[stock]; s.rep.image += 1; return true; }
 scam(trust) { const s = this.s; s.msgs = s.msgs.filter(m => m.type !== 'scam'); if (trust) { const lost = s.cash * 0.04; s.cash -= lost; this.msg({ type: 'event', text: `'확실한 종목' 전화였다. 입금하자 연락이 끊겼다 — ${this.money(lost)} 원을 잃었다` }); s.stress = Math.min(100, s.stress + 10); } return true; }
 hireLawyer() { const s = this.s; if (!s.probe || s.lawyer || s.cash < N.lawyer_cost) return false; s.cash -= N.lawyer_cost; s.lawyer = true; return true; }
 ending() { const s = this.s, nw = this.netWorth(), rank = this.rank(); const ceo = Object.values(s.gate).some(g => g >= 3) || !!s.firm;
  const id = (s.away?.kind === 'jail' || s.jailCount >= 2) ? 'jail' : s.broke || nw < 10000000 ? 'broke' : rank <= 10 ? 'whale' : ceo ? 'owner' : nw > s.start ? 'rich' : 'ant';
  const names = { jail: '철창 — 선을 넘었다', broke: '파산 — 여의도를 떠났다', whale: '여의도 큰손 — 열 손가락 안', owner: '회사 주인 — 시장 밖에서도 힘이 있다', rich: '평범한 부자 — 잃지 않았다', ant: '아직 개미 — 다음 판에' };
  return { id, name: names[id], nw, rank, start: s.start }; }
 dispatch(a, p = []) {
  const s = this.s; switch (a) {
   case 'tick': return this.tick(); case 'buy': return this.trade('buy', p[0], p[1]); case 'sell': return this.trade('sell', p[0], p[1]);
   case 'speed': if (N.speeds.includes(p)) { s.speed = p; return true; } return false; case 'autopause': s.autopause = !!p; return true;
   case 'evening': return this.evening(p[0], p[1]); case 'call': return this.answerCall(p[0], p[1]); case 'greet': return this.greet(p[0]); case 'weekend': return this.weekend(p[0], p[1]);
   case 'away': return this.awayDay(); case 'bank': return this.bank(p[0], p[1]); case 'house': return this.buyHouse(p); case 'car': return this.buyCar(p); case 'shop': return this.shop(p[0], p[1]);
   case 'firm': return this.firm(p[0], p[1]); case 'agm': return this.agm(p[0], p[1]); case 'scam': return this.scam(p); case 'lawyer': return this.hireLawyer();
   case 'scene': return Story.choose(this, p[0], p[1]);
   case 'baekRepay': return this.baekRepay(p);
   case 'learn': return this.learn(p); case 'respec': return this.respec();
   case 'msgdone': return s.msgs[0]?.type === 'scene' ? Story.choose(this, s.msgs[0].id, -1, true) : !!s.msgs.shift();
  } return false; }
 save(st) { try { st.setItem(N.save_key, JSON.stringify(this.s)); return true; } catch { return false; } }
 static load(st) { try { const s = JSON.parse(st.getItem(N.save_key)); if (s?.version !== N.version || !Number.isInteger(s.day)) return null; return new Game({}, s); } catch { return null; } }
}
root.Toy2 = { Game, T, N, ST, SRC, HOUSE, SHOP, CAR, PEOPLE, PLACE, REP, ACH, CAREER, DAYS, fmt, rng, eraOf, dow };
if (typeof module !== 'undefined') module.exports = root.Toy2;
})(globalThis);
