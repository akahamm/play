/* 장난감 2판 규칙 — 기획 01_기획/장난감2_한장.md · 설계 02_설계/장난감_2판.md · 숫자는 03_자료/게임/toy2.json 한 곳.
   시장의 운은 날마다 씨앗으로 미리 정하고(내 매매와 따로), 내 매매 · 지분 · 정보원 귀띔은 그 위에 얹는다. */
'use strict';
(function (root) {
const T = root.TOY2 || require('./data.js'), N = T.numbers, H = T.headlines;
const Story = root.Toy2Story || require('./story.js');
N.story_on ??= true; N.stage2_yuna_acc ??= 0.05;
if (typeof process !== 'undefined' && process.env?.TOY_OVERRIDE) Object.assign(N, JSON.parse(process.env.TOY_OVERRIDE));
/* 장치 줄(개편 고리 차례 · 07_재기/개편_고리.md) — 장치 파일 m_<이름>.js 는 스스로 (globalThis.Toy2Mods ||= []).push({ name, <고리>(g, …) }) 로 등록한다.
   브라우저: build_data.py 가 m_*.js 를 이름 차례로 data.js 끝에 붙여 이 파일보다 먼저 읽힘 · Node: 아래에서 같은 폴더의 m_*.js 를 이름 차례로 부름(m_*_test.js 는 뺌).
   장치가 없으면 고리는 아무것도 안 함 — 지금 규칙과 같은 값. 고리 이름은 HOOKS 한 곳. */
const HOOKS = ['init', 'dayInput', 'tick', 'close', 'evening', 'weekend', 'day', 'month', 'year', 'assets', 'act', 'ending', 'tradeGate', 'sellOff', 'negCash', 'ownsCar', 'buyCar', 'shop', 'sellCar', 'afterTrade', 'split', 'keepStock', 'housePrice', 'carPrice'];   /* 합치기 차례 더함: tradeGate(g, side, id) → false 면 매매 막음 · sellOff(g, need) → 강제 매각에 판 원 · negCash(g) → true 면 음수 현금을 장치가 맡음(달 정산이 빚으로 안 넘김)
   11-22 장부 하나: ownsCar(g) → true 면 차 값은 장치가 셈 · buyCar(g, id) · shop(g, id, buy) → 맡으면 true/false · sellCar(g, hc) → 강제 매각 차 { got, what }(생활 장치가 부름)
   11-22 저녁 검토: afterTrade(g, id, dq, px) → 내 매매 한 번(trade 만 · 분할 · 강제 매각 · 합병 · 지참 · 장외 덩어리는 안 부름) · split(g, id, r) → 분할(r > 1) · 병합(r < 1) 뒤 장치가 쥔 기준가를 같은 비율로 · keepStock(g, id) → true 면 위기설 · 합병 · 청산 · 작은 종목 폐지에서 뺌(이야기 종목)
   11-22 결정 D-074: housePrice(g, id, i) · carPrice(g, id, i) → 사는 집 사다리 · 차 사다리 값(그 달 매물 시세 · 새 차 값 · 자산 장치) — 없으면 toy2.json 값 */
if (!root.Toy2Mods && typeof require === 'function' && typeof __dirname === 'string') { const fs = require('fs'), path = require('path'); for (const f of fs.readdirSync(__dirname).filter(f => /^m_.+\.js$/.test(f) && !/_test\.js$/.test(f)).sort()) require(path.join(__dirname, f)); }
const MODS = root.Toy2Mods || [];
const idx = a => Object.fromEntries(a.map(x => [x.id, x]));
const I0 = T.instinct, ST = idx(T.stocks), SRC = idx(T.sources), HOUSE = idx(T.houses), SHOP = idx(T.shops), CAR = idx(T.cars), PEOPLE = idx(T.contacts), PLACE = idx(T.places), REP = idx(T.reps), ACH = idx(T.achievements), CAREER = idx(T.careers);
const fmt = (s, o = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
/* 돈 글 한 곳(결정 D-075 ③ · 화면 M 도 이 함수) — '1억 · 1.2억 · 20억 · 5,000만'(끝의 0 뺌) · 1만 원 단위 반올림이 1억에 닿으면 억으로 */
const trim0 = x => x.toFixed(2).replace(/\.?0+$/, '');
function money(n) { const a = Math.abs(n), sg = n < 0 ? '-' : '', man = Math.round(a / 1e4); return a >= 1e12 ? sg + trim0(a / 1e12) + '조' : a >= 1e8 || man >= 1e4 ? sg + trim0(a / 1e8) + '억' : sg + man.toLocaleString('ko-KR') + '만'; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const uni = (r, [a, b]) => a + (b - a) * r(), gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pick = (r, a) => a[Math.floor(r() * a.length)];
function weighted(r, arr) { const sum = arr.reduce((n, x) => n + x.weight, 0); let x = r() * sum; for (const a of arr) { x -= a.weight; if (x < 0) return a; } return arr.at(-1); }

/* ── 달력(개편 차례 2) — 2026-11-30 까지 실제 거래일(TOY2.era_data.days · 개장 · 마감 시각) · 그 뒤는 규칙(T.calendar)으로 끝없이 늘림.
   모든 판이 같은 DAYS · DINFO 배열을 나눠 씀(판 씨앗과 무관) — 필요할 때 ensureDays(i) 로 뒤에 붙임(화면이 받은 DAYS 와 같은 배열). ── */
const ED = T.era_data || {}, CAL = T.calendar || {};
const hm2m = s => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const iso = d => d.toISOString().slice(0, 10);
const DAYS = [], DINFO = [];   /* DINFO[i] = { o: 개장(자정부터 분), c: 마감, tag } */
for (const r of ED.days?.days || []) if (r.d >= N.start_date) { DAYS.push(r.d); DINFO.push({ o: hm2m(r.open), c: hm2m(r.close), tag: r.tag || null }); }
const LAST_REAL = DAYS.at(-1) || '';   /* 실제 자료 끝 — 이 뒤는 규칙 달력 · 무작위 시대 */
const HOL = {};
function lunar(k, y) { const t = CAL[k] || {}; let yy = y; while (!t[yy] && yy > 2008) yy -= 19; while (!t[yy] && yy < 2026) yy += 19; return t[yy] ? y + '-' + t[yy] : null; }   /* 19년 주기 어림(세션이 정함) */
function holidays(y) {
 if (HOL[y]) return HOL[y]; const set = new Set((CAL.fixed || []).map(md => y + '-' + md)), add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
 const wd = s => new Date(s + 'T00:00:00Z').getUTCDay(), nextFree = s => { let d = add(s, 1); while (!wd(d) || wd(d) === 6 || set.has(d)) d = add(d, 1); return d; };
 for (const k of ['seol', 'chuseok']) { const c = lunar(k, y); if (!c) continue; const blk = [add(c, -1), c, add(c, 1)], clash = blk.some(d => !wd(d) || set.has(d)); blk.forEach(d => set.add(d)); if (clash) set.add(nextFree(blk[2])); }   /* 대체공휴일 꼴 — 일요일 · 다른 휴일과 겹치면 뒤 첫 평일 */
 const b = lunar('buddha', y); if (b) { const clash = set.has(b) || !wd(b) || wd(b) === 6; set.add(b); if (clash) set.add(nextFree(b)); }
 for (const md of CAL.sub_single || []) { const d = y + '-' + md; if (!wd(d) || wd(d) === 6) set.add(nextFree(d)); }
 let ye = y + '-12-31'; while (!wd(ye) || wd(ye) === 6) ye = add(ye, -1); set.add(ye);   /* 연말 휴장(주말이면 앞 평일) */
 return (HOL[y] = set);
}
function extendDays(n) {
 const d = new Date((DAYS.at(-1) || (() => { const x = new Date(N.start_date + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - 1); return iso(x); })()) + 'T00:00:00Z');
 const O = hm2m(CAL.open || '09:00'), C = hm2m(CAL.close || '15:30'), LO = hm2m(CAL.late_open || '10:00'), SC = hm2m(CAL.suneung_close || '16:30');
 while (DAYS.length < n) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(), s = iso(d); if (!w || w === 6 || holidays(+s.slice(0, 4)).has(s)) continue;
  const first = !DAYS.length || DAYS.at(-1).slice(0, 4) !== s.slice(0, 4), sun = w === 4 && s.slice(5) >= (CAL.suneung_from || '11-12') && s.slice(5) <= (CAL.suneung_to || '11-18');
  DAYS.push(s); DINFO.push({ o: first || sun ? LO : O, c: sun ? SC : C, tag: first ? 'new_year' : sun ? 'suneung' : null }); }
}
const ensureDays = i => { if (DAYS.length <= i) extendDays(i + 1 + (N.days_ahead || 80)); };
ensureDays(N.days_ahead || 80);
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const dow = i => (ensureDays(i), new Date(DAYS[i] + 'T00:00:00Z').getUTCDay());
const minutesOf = i => (ensureDays(i), DINFO[i].c - DINFO[i].o), openOf = i => (ensureDays(i), DINFO[i].o);
/* 그 주 마지막 거래일 — 다음 거래일이 이번 주 토요일 뒤(금요일 · 설 · 추석 · 금요일 공휴일 앞 날) · 주말 지도 · 주간 결산이 이 날 장 뒤에 옴 */
const WE = [], addISO = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const satAfter = i => addISO(DAYS[i], 6 - dow(i));   /* 그 거래일 뒤 첫 토요일 */
const weekEnd = i => WE[i] ?? (ensureDays(i + 1), WE[i] = DAYS[i + 1] > satAfter(i));
/* 실제 시대 칸 · 큰 날 · 규칙(날짜 → 칸) */
const REAL_ERAS = ED.era?.eras || [], BIG = Object.fromEntries((ED.index_path?.big_days || []).map(b => [b.d, b.pct])), RULES = ED.rules || {};
const realEra = d => { for (let i = REAL_ERAS.length - 1; i >= 0; i--) if (REAL_ERAS[i].from <= d) return d <= REAL_ERAS[i].to || i === REAL_ERAS.length - 1 ? REAL_ERAS[i] : null; return null; };
/* 실제 지수 길(새 눈 11-22 판단 거리 1) — index_path 를 거래일마다 이은 값 PATH[i](실제 날만). 마디 = 2013 말 종가 · 달 평균(그 달 가운데 거래일 · 닻 5거래일 안이면 뺌) · 연말 종가(그해 마지막 거래일) · 닻(그날 종가).
   마디 사이는 큰 날(big_days)을 그대로 넣고 남는 몫을 큰 날 아닌 날에 고르게 나눔 — 시대 칸 drift(칸 처음 ~ 끝 한 줄)보다 달마다 꼴을 따름. 시장 바탕 k 가 이 길 둘레로 흔들림(mstep). */
const PATH = (() => { const IP = ED.index_path, n = REAL_N_PRE(); if (!IP?.months?.length || !n) return null; const pos = {}; for (let i = 0; i < n; i++) pos[DAYS[i]] = i;
 const knot = new Map([[-1, IP.base?.kospi || N.idx_base]]), anc = (IP.anchors || []).filter(a => a.d in pos).map(a => pos[a.d]);
 for (const m of IP.months) { const ix = DAYS.slice(0, n).map((d, i) => d.slice(0, 7) === m.m ? i : -1).filter(i => i >= 0); if (!ix.length) continue;
  if (m.kind === '연말 종가') knot.set(ix.at(-1), m.kospi); else if (m.kind !== '채움') { const mid = ix[ix.length >> 1]; if (!anc.some(a => Math.abs(a - mid) <= 5) && !(DAYS[mid] in BIG)) knot.set(mid, m.kospi); } }
 for (const a of IP.anchors || []) if (a.d in pos) knot.set(pos[a.d], a.kospi);
 const ks = [...knot.keys()].sort((a, b) => a - b), P = new Float64Array(n);
 for (let j = 1; j < ks.length; j++) { const a = ks[j - 1], b = ks[j]; let bigSum = 0, free = 0; for (let i = a + 1; i <= b; i++) if (DAYS[i] in BIG) bigSum += Math.log(1 + BIG[DAYS[i]] / 100); else free++;
  const rest = Math.log(knot.get(b) / knot.get(a)) - bigSum; let v = knot.get(a);
  for (let i = a + 1; i <= b; i++) { v *= Math.exp(DAYS[i] in BIG ? Math.log(1 + BIG[DAYS[i]] / 100) + (free ? 0 : rest / (b - a)) : rest / free); P[i] = v; } }
 for (let i = ks.at(-1) + 1; i < n; i++) P[i] = (DAYS[i] in BIG ? 1 + BIG[DAYS[i]] / 100 : 1) * (i ? P[i - 1] : knot.get(-1));   /* 마지막 닻 뒤(2026-11-23 ~ 30)는 그 값 그대로 */
 return { P, base: knot.get(-1) }; })();
function REAL_N_PRE() { return LAST_REAL ? DAYS.indexOf(LAST_REAL) + 1 : 0; }
const ruleAt = (list, d) => (list || []).find(x => x.from <= d && (!x.to || d <= x.to)) || null;
const eraOf = i => realEra(DAYS[i]) || T.era.filter(e => e.from <= DAYS[i]).at(-1) || T.era[0];   /* 옛 꼴(실제 칸만) — 판마다 다른 무작위 시대는 g.era(i) */
/* 거시 — 달마다 값(실제 macro.json · 빈 칸은 앞 달 값) · 그 뒤 달은 판마다 무작위(g.macro) */
const SECTOR = idx(T.sectors || []), byLvl = l => (T.rand_era || []).find(e => e.lvl === l);
const REAL_N = LAST_REAL ? DAYS.indexOf(LAST_REAL) + 1 : 0;
const MACRO_KEYS = ['wti', 'gold', 'copper', 'natgas', 'wheat', 'corn', 'usdkrw', 'bok_rate', 'fed_rate'];
const REAL_MACRO = (() => { const out = {}; let last = {}; for (const m of ED.macro?.months || []) { const v = {}; for (const k of MACRO_KEYS) v[k] = m[k] ?? last[k] ?? null; out[m.m] = last = v; } return out; })();
const REAL_MACRO_LAST = Object.keys(REAL_MACRO).at(-1) || '';
const MACRO_AVG = (() => { const ms = Object.values(REAL_MACRO), out = {}; for (const k of MACRO_KEYS) { const xs = ms.map(m => m[k]).filter(x => x > 0); out[k] = xs.length ? Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length) : 1; } return out; })();   /* 무작위 거시가 돌아갈 평균(실제 값의 기하 평균) */
const addMonth = (ym, n) => { let y = +ym.slice(0, 4), m = +ym.slice(5, 7) + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + '-' + String(m).padStart(2, '0'); };

/* 하루 흐름(기울기)은 따로 뽑음 — 유나가 하루 앞서 귀띔할 수 있게. rm = 그날 시장(지수) 로그 등락 — 모든 종목에 얹힘 · ti = 종목 자기 몫(다음 날로 이어짐) */
function dayTrend(seed, day, prev, era, open, fair, inp, rm = 0, stocks = T.stocks) { const r = rng(seed ^ Math.imul(day + 7, 0x85EBCA6B)), t = {}, ti = {}, gap = {}, back = Math.exp(-rm);
 for (const s of stocks) { const pull = open?.[s.id] > 0 && fair?.[s.id] > 0 ? N.revert * Math.log(fair[s.id] * back / open[s.id]) : 0;   /* 폐지된 종목(값 없음)은 끌림 없이 씨앗만 씀 */ ti[s.id] = (prev?.[s.id] || 0) * N.trend_carry + gauss(r) * N.trend_sd + pull; t[s.id] = ti[s.id] + rm * (s.beta ?? 1); if (inp?.trend) t[s.id] += inp.trend[s.id] || 0; gap[s.id] = gauss(r); }
 return { t, ti, gap }; } // 값은 제값(fair) 쪽으로 천천히 끌림 · inp = 장치 고리 dayInput 을 모은 것(없으면 null)

/* 그날 분마다 값 길 — cx = { era, rm, lim(가격제한 %), cb(서킷브레이커 단), M(장 분 수) } */
function makeDay(seed, day, open, prevTrend, tips, policy, fair, inp, cx) {
 const r = rng(seed ^ Math.imul(day + 1, 0x9E3779B1)), M = cx.M, era = cx.era, path = {}, feed = [], move = {}, stocks = cx.stocks || T.stocks;
 for (const s of stocks) move[s.id] = new Float64Array(M + 1);
 const add = (id, from, len, total) => { for (let m = Math.max(0, from); m < Math.min(M, from + len); m++) move[id][m + 1] += total / len; };
 const n = Math.round(uni(r, N.news_per_day));
 for (let i = 0; i < n; i++) {
  const st = pick(r, stocks), src = weighted(r, T.sources), good = r() < 0.5, dir = good ? 1 : -1, real = r() < src.accuracy;
  const size = uni(r, N.news_size) * src.size_mul, delay = Math.round(uni(r, src.delay)), spread = Math.round(uni(r, N.news_spread)), deny = Math.round(uni(r, N.denial_after));
  const hi = M - delay - spread - deny - 12, t = Math.round(15 + r() * Math.max(1, hi - 15)), id = day + ':' + i;
  const pre = uni(r, N.news_pre), mv = real ? size : size * N.fake_follow; add(st.id, t - 3, 3, dir * mv * pre);
  feed.push({ t, kind: 'news', stock: st.id, src: src.id, dir, real, size, id, head: fmt(pick(r, H[good ? 'good' : 'bad']), { name: st.name }) });
  if (real) { add(st.id, t + delay, spread, dir * size * (1 - pre)); if (src.id !== 'notice') feed.push({ t: t + delay + spread, kind: 'confirm', stock: st.id, dir, of: id, head: fmt(H.confirm, { name: st.name }) }); }
  else { add(st.id, t + delay, Math.round(spread / 2), dir * size * N.fake_follow * (1 - pre)); add(st.id, t + delay + deny, 10, -dir * size * N.fake_follow); feed.push({ t: t + delay + deny, kind: 'denial', stock: st.id, dir: -dir, of: id, head: fmt(H.denial, { name: st.name }) }); }
 }
 (tips || []).forEach((tp, i) => { if (!move[tp.stock]) return; const rr = rng(seed ^ Math.imul(day + 3, 0x27D4EB2F) ^ (i * 7919)), real = rr() < tp.acc, size = uni(rr, N.tip_size), delay = Math.round(uni(rr, N.tip_delay)), spread = Math.round(uni(rr, N.news_spread)), tt = Math.min(tp.t, M - 20);
  if (real) add(tp.stock, tt + delay, spread, tp.dir * size);
  feed.push({ t: tt, kind: 'tip', stock: tp.stock, dir: tp.dir, real, size, who: tp.who, insider: !!tp.insider, acc: tp.acc, head: tp.head || fmt(H[tp.dir > 0 ? 'tip_good' : 'tip_bad'], { who: tp.whoName, name: ST[tp.stock].name }) }); });
 for (let k = 0; k < 2; k++) if (r() < N.surprise_chance / 2) { const st = pick(r, stocks), dir = r() < 0.5 ? 1 : -1, t = Math.round(30 + r() * (M - 70)), size = uni(r, N.surprise_size); add(st.id, t, 3, dir * size); feed.push({ t, kind: 'surprise', stock: st.id, dir, size, head: fmt(H[dir > 0 ? 'surprise_good' : 'surprise_bad'], { name: st.name }) }); }
 if (era.head && era.from === DAYS[day]) feed.push({ t: 1, kind: 'era', dir: era.drift > 0 ? 1 : -1, head: era.head, random: !!era.random });
 const { t: trend, ti, gap } = dayTrend(seed, day, prevTrend, era, open, fair, inp, cx.rm, cx.all || stocks);   /* cx.all = g.trendStocks()(씨앗 차례가 종목 목록 바뀜에 안 흔들림) */
 const L = (cx.lim ?? N.limit_default) / 100, wobFrom = M - (N.minutes - N.close_wobble_from);
 for (const s of stocks) {
  const pol = policy?.[s.id], tr = trend[s.id] + (pol === 'invest' ? N.policy_invest * M / M : 0) + (pol === 'buyback' ? 0.001 : 0), vm = era.vol * (inp?.vol ?? 1) * (pol === 'buyback' ? 0.8 : 1);
  const lo = open[s.id] * (1 - L), hi = open[s.id] * (1 + L), cl = v => v < lo ? lo : v > hi ? hi : v;   /* 가격제한(시대 규칙) */
  const p = new Float64Array(M + 1); p[0] = cl(open[s.id] * (1 + gap[s.id] * s.vol * 0.35 * vm));
  const sd = s.vol * vm / Math.sqrt(M), wob = s.vol * N.noise_mul * vm / Math.sqrt(M); let base = p[0], dev = 0, inc = 0;
  for (let m = 1; m <= M; m++) { let ret = tr / M + move[s.id][m] + gauss(r) * sd; if (m >= wobFrom) ret += gauss(r) * N.close_wobble_sd; base = Math.max(50, base * (1 + ret));
   inc = inc * N.noise_smooth + gauss(r) * wob * Math.sqrt(1 - N.noise_smooth ** 2); dev = dev * (1 - N.noise_revert) + inc; p[m] = cl(base * (1 + (m === M ? dev * 0.3 : dev))); }
  path[s.id] = p;
 }
 /* 실제 날: 종목 자기 몫(뉴스 · 귀띔 · 잡음)이 모여 지수를 흔드는 몫을 idx_damp 만큼 덜어 냄 — 시가총액 무게 비율에서 시장 몫(rm)을 뺀 나머지를 모든 종목에 거꾸로 나눔 · 종목끼리 차이는 그대로(새 눈 11-22 판단 거리 1) */
 if (cx.damp > 0 && cx.w) { let W = 0; for (const s of stocks) W += cx.w[s.id] || 0;
  if (W > 0) for (let m = 0; m <= M; m++) { let q = 0; for (const s of stocks) if (cx.w[s.id]) q += cx.w[s.id] * path[s.id][m] / open[s.id]; const f = Math.exp(-cx.damp * (Math.log(q / W) - cx.rm * m / M));
   for (const s of stocks) { const lo = open[s.id] * (1 - L), hi = open[s.id] * (1 + L), v = path[s.id][m] * f; path[s.id][m] = v < lo ? lo : v > hi ? hi : v; } } }
 /* 서킷브레이커 · 사이드카 — 고른 무게 지수가 전날보다 떨어진 폭(시대 규칙 단 · 하루 한 번씩 · 장 끝 40분 앞까지) */
 const halt = [], ids = stocks.map(s => s.id), ratio = m => ids.reduce((a, id) => a + path[id][m] / open[id], 0) / ids.length;
 if (cx.cb?.stages?.length && ids.length) { let si = 0, side = false;
  for (let m = 1; m <= M; m++) { const q = ratio(m) - 1;
   if (!side && Math.abs(q) >= 0.05) { side = true; feed.push({ t: m, kind: 'sidecar', dir: q > 0 ? 1 : -1, head: H.sidecar || '[속보] 사이드카 발동 — 프로그램 매매 5분 멈춤' }); }
   const st = cx.cb.stages[si]; if (st && q <= -st.drop_pct / 100 && m < M - (cx.cb.no_trigger_last_min ?? 40)) { si++; const hold = st.halt_min == null ? M - m : st.halt_min, end = Math.min(M, m + hold);
    for (const id of ids) { const v = path[id][m]; for (let k = m + 1; k <= end; k++) path[id][k] = v; }
    halt.push([m, end]); feed.push({ t: m, kind: 'cb', dir: -1, stage: si, head: fmt(H.cb || '[속보] 서킷브레이커 {n}단계 — 주식 매매 {min}분 멈춤', { n: si, min: hold }) }); if (st.halt_min == null) break; } } }
 feed.sort((a, b) => a.t - b.t);
 return { path, trend, ti, feed, halt, M };
}

class Game {
 constructor(opt = {}, saved = null) {
  this.T = T; this.N = N; this.DAYS = DAYS;
  if (saved) { this.s = saved; this.relist(); Story.init(this); this.hook('init', opt, true); this.build(); return; }   /* 불러오기 길 — 장치는 옛 저장에 없는 칸을 보충 */
  const c = CAREER[opt.career || 'ex'], seed = (opt.seed ?? 20140102) >>> 0, r = rng(seed ^ 0xC0FFEE);
  const level = T.levels.find(l => l.id === opt.level);
  this.s = { version: N.version, seed, name: opt.name || '정민재', level: level?.id || null, career: c.id, day: 0, minute: 0, phase: 'open', speed: 0, autopause: true,
   cash: level ? level.severance + level.principal : c.cash, debt: level ? 0 : c.debt,
   baek: { principal: level?.principal || 0, rateMul: level?.rateMul || 1, state: level ? 'owe' : 'paid', paidDay: null }, deposit: 0, hold: {}, avg: {}, flag: {}, impact: {}, extra: {}, ramp: [], gate: {}, gateDay: {}, policy: {}, delisted: {},
   open: Object.fromEntries(T.stocks.map(s => [s.id, s.price])), fair: Object.fromEntries(T.stocks.map(s => [s.id, s.price])), listing: { ids: T.stocks.map(s => s.id), defs: {}, adj: {}, n: 0, plan: null }, flow: {}, trendPrev: null, shown: [], msgs: [], tips: [], pending: [],
   rep: { know: 0, ethics: 40, net: 0, charity: 0, image: 0, ...c.rep }, stress: c.stress, house: 'gosiwon', car: 'none', shops: {}, gift: 0,
   contacts: Object.fromEntries(T.contacts.map(p => [p.id, { known: p.start, rel: p.start ? 20 : 0, last: 0 }])), senior: 20,
   susp: 0, warned: false, jailCount: 0, away: null, slot: 0, firm: null, ach: {}, log: [], hist: [],
   trades: 0, tradesToday: 0, dayStart: 0, monthIncome: 0, peakJul: null, divMonth: 0, luck: !!c.luck,
   rich: Array.from({ length: N.rich_count }, () => (level ? level.severance : c.cash - c.debt) * N.rich_floor_mul + N.rich_median * Math.exp(gauss(r) * N.rich_sd)) };   /* 100위 끝자리 = 시작 순자산 × rich_floor_mul — 1막에서 닿는 문턱(숫자 가설표) */
  this.relist();   /* 판마다 종목 목록 · 표(차례 3) */
  for (const s of this.stocks) { this.s.hold[s.id] = 0; this.s.impact[s.id] = 0; this.s.extra[s.id] = 1; this.s.gate[s.id] = -1; }
  this.marketInit(opt.eraMode);   /* 시장 바탕 — 실제 시대(기본) · 무작위 시대('random') */
  { const tm = (T.teams || []).find(x => x.id === opt.team), lk = (T.looks || []).find(x => x.id === opt.look);   /* 새 판 LOOK · TEAM(11-20) — 팀은 시작 평판 · 현금 + 그 갈래 첫 노드 */
   this.s.look = lk ? lk.id : null; this.s.team = tm ? tm.id : null;
   if (tm) { for (const [k, v] of Object.entries(tm.rep)) this.s.rep[k] = (this.s.rep[k] || 0) + v; this.s.cash += tm.cash; if (tm.node) this.inst().got.push(tm.node); } }
  Story.init(this); this.hook('init', opt, false); this.build(); this.s.dayStart = this.netWorth(); this.s.start = this.s.dayStart; this.s.wk = { day: 0, nw: Math.round(this.s.dayStart), trades: this.s.trades };   /* 첫 주 결산이 첫날부터 셈(새 눈 11-22: 첫 주가 '1월 3일 ~ 1월 3일'로 첫날 거래를 빼먹음) · 새 판 길 — 장치는 s.<이름> 칸을 만듦 */
  this.storyAt('장 전'); this.msg({ type: 'hello' });
 }
 /* ── 장치 고리 — hook: 장치마다 차례로 부르고 undefined 가 아닌 답을 모음 · hookFirst: 처음 나온 답(행동 · 저녁처럼 한 장치가 맡는 것) · hookSum: 답을 더함 ── */
 hook(name, ...a) { const out = []; for (const m of MODS) if (typeof m[name] === 'function') { const v = m[name](this, ...a); if (v !== undefined) out.push(v); } return out; }
 hookFirst(name, ...a) { for (const m of MODS) if (typeof m[name] === 'function') { const v = m[name](this, ...a); if (v !== undefined) return v; } }
 hookSum(name, ...a) { let n = 0; for (const v of this.hook(name, ...a)) n += +v || 0; return n; }
 dayInput(day) { if (!MODS.length) return null; let trend = null, vol = 1; for (const x of this.hook('dayInput', day)) { if (x.trend) { trend ||= {}; for (const id in x.trend) trend[id] = (trend[id] || 0) + x.trend[id]; } if (x.vol != null) vol *= x.vol; } return trend || vol !== 1 ? { trend, vol } : null; }   /* 그날 기울기 더함 · 흔들림 곱 — 내일 미리 보기(seniorHint)도 같은 값을 받아야 하니 장치는 씨앗 · 저장 칸으로만 정함 */
 /* ── 시장 바탕(개편 차례 2) — 장치가 기댈 공용 값은 여기 메서드로만 읽음(07_재기/개편_고리.md 표) ── */
 ymd(i = this.s.day) { ensureDays(i); return DAYS[i]; }   /* 'YYYY-MM-DD' */
 M(i = this.s.day) { return i === this.s.day && this.m ? this.m.M : minutesOf(i); }   /* 그날 장 분 수(개장 ~ 마감) */
 openMin(i = this.s.day) { return openOf(i); }   /* 개장 시각(자정부터 분) */
 closeMin(i = this.s.day) { return openOf(i) + minutesOf(i); }
 dayTag(i = this.s.day) { ensureDays(i); return DINFO[i].tag; }   /* 'new_year' · 'suneung' · 'suneung_moved' · null */
 weekEnd(i = this.s.day) { return weekEnd(i); }   /* 그 주 마지막 거래일인가(금요일 · 연휴 앞 날) — 장 뒤 주간 결산 · 주말 지도 */
 weekendDate(slot = this.s.slot, i = this.s.day) { ensureDays(i); return addISO(satAfter(i), slot ? 1 : 0); }   /* 주말 칸 날짜 — 0 = 토 · 1 = 일(연휴 앞 수요일 장 뒤여도 그 주 토 · 일) */
 kept(id) { return !!this.hookFirst('keepStock', id); }   /* 이야기에 쓰이는 종목 — 위기설 · 합병 · 청산 · 작은 종목 폐지에서 뺌(목록 · 날짜는 장치 자료) */
 trendStocks() { return Object.values(this.ST); }   /* 하루 기울기를 뽑는 차례 — 상장했던 종목 전부(폐지돼도 자리 그대로 · 새 종목은 끝에) · 오늘 저녁 미리 본 내일 기울기가 밤사이 폐지 · 상장에 안 흔들림 */
 isRealDay(i = this.s.day) { return this.s.market.mode === 'real' && this.ymd(i) <= LAST_REAL; }   /* 실제 시대 자료 안의 날 */
 idxTrack(i = this.s.day) { return this.isRealDay(i) ? !!PATH : true; }   /* 지수 되돌림(idx_track · idx_damp) — 실제 날은 실제 지수 길이 있을 때 · 무작위 시대 날(2026-11 뒤 · 새 판 RANDOM)은 늘 켬(결정 D-066) */
 era(i = this.s.day) { const d = this.ymd(i); return this.isRealDay(i) ? realEra(d) : this.randEra(i); }   /* { from, name, mood, drift, vol, head, random? } */
 randEra(i) {
  const mk = this.s.market, ch = (mk.chain ||= []), start = mk.mode === 'real' ? REAL_N : 0, E = T.rand_era, byL = Object.fromEntries(E.map(e => [e.lvl, e]));
  while (!ch.length || ch.at(-1).fromIdx + ch.at(-1).n <= i) {
   const prev = ch.at(-1), R = rng(this.s.seed ^ 0x5EED0 ^ Math.imul(ch.length + 1, 0x9E3779B1)), fromIdx = prev ? prev.fromIdx + prev.n : start;
   const L0 = prev ? prev.lvl : mk.mode === 'real' ? ({ 호황: 1, 보합: 0, 불황: -2, 폭락: -4, 회복: 1 })[realEra(LAST_REAL)?.mood] ?? 0 : 0, gap = (prev?.lt || 0) - N.rand_trend * (fromIdx - start);
   const w = E.map(e => e.lvl === L0 ? 0 : (L0 === -4 && Math.abs(e.lvl) > 1 ? 0 : Math.exp(-Math.abs(e.lvl - L0) / N.rand_inertia) * Math.exp(-gap * e.lvl * N.rand_gap_k) * (e.lvl === -4 ? (L0 >= 2 || L0 <= -2 ? 0.6 : 0.15) : 1)));   /* 관성(가까운 단 쪽) · 변동(같은 단 안 이어짐) · 추세선에서 멀면 되돌아옴 · 폭락 뒤엔 회복 쪽 */
   let x = R() * w.reduce((a, b) => a + b, 0), k = 0; for (; k < E.length - 1; k++) { x -= w[k]; if (x < 0) break; }
   const e = E[k], n = Math.round(uni(R, e.n)); ensureDays(fromIdx);
   ch.push({ from: DAYS[fromIdx], fromIdx, n, lvl: e.lvl, prevLvl: L0, name: e.name, mood: L0 === -4 && e.lvl >= 0 ? '회복' : e.mood, drift: e.drift, vol: e.vol, head: e.head, random: true, lt: (prev?.lt || 0) + e.drift * n });
  }
  for (let j = ch.length - 1; j >= 0; j--) if (ch[j].fromIdx <= i) return ch[j]; return ch[0];
 }
 bigDay(i) {   /* 그날 지수 큰 등락 %(없으면 null) — 실제 큰 날 · 무작위 폭락 칸의 큰 날 · 폭락 뒤 첫날 반등 */
  if (this.isRealDay(i)) return BIG[this.ymd(i)] ?? null; const e = this.era(i), b = byLvl(e.lvl), R = rng(this.s.seed ^ Math.imul(i + 17, 0x3C6EF372));
  if (b?.big && i > e.fromIdx && R() < b.big[0]) return uni(R, [b.big[2], b.big[1]]);
  const pb = byLvl(e.prevLvl); if (pb?.rebound && i === e.fromIdx && R() < pb.rebound[0]) return uni(R, [pb.rebound[1], pb.rebound[2]]); return null;
 }
 mstep(i, k, tgt) { const e = this.era(i), b = this.bigDay(i), R = rng(this.s.seed ^ Math.imul(i + 13, 0x7FEB352D)), real = PATH && this.isRealDay(i);
  if (real) { const t1 = PATH.P[i], t0 = i ? PATH.P[i - 1] : PATH.base, r0 = Math.log(t1 / t0), r = b != null ? r0 + N.mkt_pull * Math.log(t0 / k) : r0 + gauss(R) * N.mkt_sd * N.mkt_sd_real * e.vol + N.mkt_pull * Math.log(t0 / k); return { r, k: k * Math.exp(r), tgt: t1 }; }   /* 실제 날 — 실제 지수 길(PATH) 둘레 · 큰 날은 그 % + 길 쪽 끌림(새 눈 11-22) */
  const r0 = b != null ? Math.log(1 + b / 100) : e.drift;   /* 시장(지수 바탕) 하루 — 시대 칸 drift + 잡음(vol 배) + 시대 길 쪽 끌림 · 큰 날은 그 % 그대로 */
  const r = b != null ? r0 : r0 + gauss(R) * N.mkt_sd * e.vol + N.mkt_pull * Math.log(tgt / k); return { r, k: k * Math.exp(r), tgt: tgt * Math.exp(r0) }; }
 macro(i = this.s.day) { return this.macroYM(this.ymd(i).slice(0, 7)); }   /* 그 달 거시 { wti gold copper natgas wheat corn usdkrw bok_rate fed_rate } */
 macroYM(ym) {
  const mk = this.s.market; if (mk.mode === 'real' && ym <= REAL_MACRO_LAST) return REAL_MACRO[ym] || REAL_MACRO[Object.keys(REAL_MACRO)[0]];
  const mac = (mk.mac ||= {}); if (mac[ym]) return mac[ym]; const first = Object.keys(REAL_MACRO)[0];
  if (!mk.macLast) { mk.macLast = mk.mode === 'real' ? REAL_MACRO_LAST : addMonth(this.ymd(0).slice(0, 7), -1); if (mk.mode !== 'real') mac[mk.macLast] = { ...REAL_MACRO[first] }; }
  if (ym <= mk.macLast) return mac[ym] || REAL_MACRO[ym] || mac[mk.macLast];
  const avg = MACRO_AVG; while (mk.macLast < ym) {
   const nm = addMonth(mk.macLast, 1), p = mac[mk.macLast] || REAL_MACRO[mk.macLast], R = rng(this.s.seed ^ Math.imul(+nm.replace('-', '') + 1, 0x2545F491)), v = {};
   let j = DAYS.findIndex(d => d.slice(0, 7) === nm); if (j < 0) { ensureDays(DAYS.length + 40); j = DAYS.findIndex(d => d.slice(0, 7) === nm); } const lv = j >= 0 ? this.era(j).lvl ?? 0 : 0;
   for (const c of T.commodities) v[c.id] = +(p[c.id] * Math.exp(gauss(R) * c.sd + 0.04 * Math.log(avg[c.id] / p[c.id]) + lv * 0.004)).toFixed(2);   /* 무작위 거시 — 제 평균 쪽으로 천천히 · 호황이면 살짝 오름 */
   v.usdkrw = +(p.usdkrw * Math.exp(gauss(R) * 0.02 + 0.05 * Math.log(avg.usdkrw / p.usdkrw) - lv * 0.003)).toFixed(2);
   const step = (x, up) => Math.max(0.5, Math.min(5, x + (R() < 0.18 ? 0.25 * up : 0))); v.bok_rate = step(p.bok_rate, lv > 0 ? 1 : lv < 0 ? -1 : (R() < 0.5 ? 1 : -1) * (p.bok_rate > 2.5 ? -1 : 1)); v.fed_rate = Math.max(0.25, Math.min(6, step(p.fed_rate, lv > 0 ? 1 : lv < 0 ? -1 : 0)));
   mac[nm] = v; mk.macLast = nm; }
  return mac[ym];
 }
 commodity(id, i = this.s.day) {   /* 그날 원자재 값(달 값 사이를 이음 + 날 잡음 · 씨앗으로 정해짐) */
  const d = this.ymd(i), ym = d.slice(0, 7), a = this.macroYM(ym)[id], b = this.macroYM(addMonth(ym, 1))[id] ?? a, f = (+d.slice(8, 10) - 1) / 30, c = T.commodities.find(x => x.id === id);
  if (a == null) return null; const R = rng(this.s.seed ^ Math.imul(i + 29, 0x6C8E9CF5) ^ id.length * 7919); return Math.exp(Math.log(a) * (1 - f) + Math.log(b) * f + gauss(R) * (c?.sd || 0.04) * 0.12);
 }
 secShock(sec, i = this.s.day) {   /* 업종 실적 바람 — 원자재 · 환율 · 금리가 석 달 전보다 움직인 만큼 × 업종 민감도(T.sectors.sens) */
  const ym = this.ymd(i).slice(0, 7), key = sec + ym, c = (this._ss ||= {}); if (key in c) return c[key];
  const a = this.macroYM(ym), b = this.macroYM(addMonth(ym, -3) < this.ymd(0).slice(0, 7) ? ym : addMonth(ym, -3)), S = SECTOR[sec]?.sens || {}; let x = 0;
  for (const [k, w] of Object.entries(S)) if (a[k] != null && b[k] != null) x += w * (k.endsWith('_rate') ? (a[k] - b[k]) * 0.1 : Math.log(a[k] / b[k]));
  return (c[key] = x);
 }
 cycle(sec, i) { const c = (this._cyc ||= {}); if (!c[sec]) { const R = rng(this.s.seed ^ [...sec].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619), 2166136261)); c[sec] = [uni(R, N.cycle_days), R() * 2 * Math.PI]; } return N.cycle_amp * Math.sin(2 * Math.PI * i / c[sec][0] + c[sec][1]); }   /* 시장 순환 — 업종마다 오르내림(주기 · 시작 판마다) */
 limit(i = this.s.day) { return ruleAt(RULES.price_limit, this.ymd(i))?.pct ?? N.limit_default; }   /* 가격제한 % */
 rule(name, i = this.s.day) { return ruleAt(RULES[name], this.ymd(i)); }   /* rules.json 칸(short_ban · circuit_breaker · session …) 그날 것 */
 halted() { return !!this.m?.halt?.some(([a, b]) => this.s.minute >= a && this.s.minute < b); }   /* 서킷브레이커로 멈춘 분 */
 index(m = this.s.minute) { const s = this.s, mk = s.market; let a = 0, b = 0; for (const x of this.stocks) if (!s.delisted[x.id] && s.open[x.id] > 0) { const w = x.shares * s.open[x.id]; a += w * this.price(x.id, m) / s.open[x.id]; b += w; } return b ? mk.idx * a / b : mk.idx; }   /* 종합지수(시가총액 무게 · 어제 종가에서 이어 감) */
 company(id) { const s = this.s, c = s.market.co[id], x = this.ST[id]; return c && x ? { id, name: x.name, sector: x.sec, value: Math.exp(c.v), hype: Math.exp(c.h), profit: c.p + (c.pm || 0), fair: s.fair[id], cap: this.price(id) * x.shares } : null; }   /* 회사 실체 — value · hype 는 1 이 처음 · profit 은 하루 몫 */
 marketInit(mode) {
  const base = ED.index_path?.base?.kospi || N.idx_base, mk = { mode: mode === 'random' || !REAL_ERAS.length ? 'random' : 'real', chain: [], k: base, tgt: base, r: 0, idx: base, idx0: base, ih: [], co: {} };
  for (const x of this.stocks) mk.co[x.id] = { v: 0, h: 0, p: 0, he: 0 };
  this.s.market = mk; const st = this.mstep(0, base, base); mk.k = st.k; mk.tgt = st.tgt; mk.r = st.r; for (const x of this.stocks) this.s.fair[x.id] *= Math.exp(st.r); return mk;
 }
 nextMarket() {   /* 내일 시장 바탕을 미리 셈(바꾸지 않음) — nextDay 가 그대로 쓰고 유나 귀띔(seniorHint)도 같은 값을 봄 */
  const s = this.s, mk = s.market, d1 = s.day + 1, M = this.m.M; ensureDays(d1 + 1);
  const open = {}; for (const x of this.stocks) open[x.id] = this.m.path[x.id][M] * s.extra[x.id];
  const idx = this.index(M), st = this.mstep(d1, mk.k, mk.tgt), R = rng(s.seed ^ Math.imul(s.day + 5, 0x165667B1)), co = {}, dl = {}; let sum = 0, n = 0;
  if (this.idxTrack(d1) && idx > 0 && mk.k > 0) st.r -= N.idx_track * Math.log(idx / mk.k);   /* 종목 공통 몫에 '지수 − 바탕' 틈을 되돌림 — 종목 값을 모은 지수가 바탕 길(k)을 따름 · 종목 차이(실체 · 뉴스)는 그 둘레(새 눈 11-22 판단 거리 1) · 무작위 시대도 켬(결정 D-066) */
  for (const x of this.stocks) { const c = mk.co[x.id]; const p = c.p * N.co_profit_keep + gauss(R) * N.co_profit_sd, pm = N.co_macro * this.secShock(x.sec, d1); let he = c.he * N.co_effect_keep, v = c.v * (1 - N.co_value_revert) + p + pm;   /* 이익 = 제 몫(천천히 바뀜) + 업종 바람(그 달 원자재 · 환율 · 금리) */
   for (const f of this.m.feed) if (f.stock === x.id && f.size) { if (f.kind === 'news' || f.kind === 'tip') { if (f.real) { v += f.dir * f.size * N.news_val; he += f.dir * f.size * N.news_hype; } else he += f.dir * f.size * N.fake_hype; } else if (f.kind === 'surprise') v += f.dir * f.size * N.surprise_val; }   /* 진짜 뉴스 · 귀띔 · 속보가 실체를 바꿈 */
   const fl = (s.flow?.[x.id] || 0) / x.turnover; if (Math.abs(fl) > 0.01) he += Math.sign(fl) * Math.min(N.flow_hype_max, Math.abs(fl) * N.flow_hype);   /* 내 큰 매매의 뒷맛 — 인기가 며칠 밀림 */
   const h = c.h * N.co_hype_keep + gauss(R) * N.co_hype_sd + he; co[x.id] = { ...c, v, h, p, he, pm }; dl[x.id] = v - c.v + h - c.h + this.cycle(x.sec, d1) - this.cycle(x.sec, s.day); if (!s.delisted[x.id]) { const w = x.shares * s.fair[x.id]; sum += Math.exp(dl[x.id]) * w; n += w; } }
  const mean = n ? Math.log(sum / n) : 0, fair = {};   /* 실체 몫은 종목끼리 견줌(시가총액 무게 평균을 뺌) — 지수 자체는 시장 바탕이 정함 · 기본가치는 아주 천천히 제자리로(co_value_revert) */
  for (const x of this.stocks) fair[x.id] = s.fair[x.id] * Math.exp(st.r + dl[x.id] - mean + gauss(R) * N.fair_sd + (s.policy[x.id] === 'invest' ? N.policy_invest : 0));
  return { open, idx, fair, co, k: st.k, tgt: st.tgt, r: st.r };
 }
 /* ── 종목 판(개편 차례 3) — 판마다 지금 상장된 종목 목록 this.stocks · 종목 표 this.ST(판마다 분할 · 병합이 고친 주식 수 · 기준가) ── */
 relist() {
  const L = this.s.listing, all = {}; for (const x of T.stocks) all[x.id] = { ...x, ...(L.adj[x.id] || {}) }; for (const [id, d] of Object.entries(L.defs)) { all[id] = { ...d, ...(L.adj[id] || {}) }; ST[id] ||= d; }
  this.ST = all; this.stocks = L.ids.map(id => all[id]); return this.stocks;
 }
 listed(id) { return !!this.ST[id] && this.s.listing.ids.includes(id) && !this.s.delisted[id]; }
 holdCap(id) { const R = rng(this.s.seed ^ [...id].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619), 2166136261)); return N.hold_cap[0] + R() * N.hold_cap[1]; }   /* 한 종목 가질 수 있는 몫(회사마다 56 ~ 73%) */
 corpNews(kind, id, o = {}) { const s = this.s, x = this.ST[id]; s.shown.push({ day: s.day, t: 0, kind: 'corp', ev: kind, stock: id, dir: o.dir ?? 0, head: fmt(pick(rng(s.seed ^ s.day ^ kind.length * 131), T.corp_heads[kind]), { name: x?.name || '', to: o.to ? this.ST[o.to]?.name ?? o.to : '', r: o.r ?? '' }) }); }
 yearPlan() {   /* 해마다 상장 · 위기설 날을 미리 정함(씨앗) — 해마다 새 얼굴 · 사라지는 회사 */
  const s = this.s, y = DAYS[s.day].slice(0, 4), L = s.listing; if (L.plan?.y === y) return L.plan;
  let a = s.day; while (a > 0 && DAYS[a - 1].slice(0, 4) === y) a--; ensureDays(a + 260); let b = a; while (DAYS[b + 1]?.slice(0, 4) === y) b++;
  const R = rng(s.seed ^ Math.imul(+y, 0x2C1B3C6D)), span = () => a + Math.floor(R() * (b - a + 1)), n1 = Math.round(uni(R, N.ipo_per_year)), n2 = Math.round(uni(R, N.crisis_per_year));
  return (L.plan = { y, ipo: Array.from({ length: n1 }, span), crisis: Array.from({ length: n2 }, () => a + Math.floor(R() * Math.max(1, b - a - N.crisis_days[1] - 2))) });   /* 해마다 위기설 하나는 그해 안에 결말(합병 · 청산)까지 */
 }
 corpDay() {   /* 새 날 장 전(nextDay · build 앞) — 분할 · 병합 · 신주 · 위기설 → 결말 · 신규 상장. 씨앗으로 정해짐 */
  const s = this.s, L = s.listing, d = s.day, R = rng(s.seed ^ Math.imul(d + 41, 0x51ED270B)), plan = this.yearPlan(), mk = s.market;
  for (const x of [...this.stocks]) { const id = x.id, p = s.open[id], c = mk.co[id]; if (!this.listed(id)) continue;
   if (p > N.split_above && R() < N.split_chance) { const r = [5, 10, 50].find(k => p / k <= N.split_above / 3) || 50; this.split(id, r); continue; }
   if (p < N.revsplit_below && R() < N.revsplit_chance) { this.split(id, 1 / 10); continue; }
   if (c.v < N.rights_v && R() < N.rights_chance) { const q = uni(R, [0.1, 0.3]), f = 1 / (1 + q * N.rights_dilute); this.adj(id, { shares: Math.round(x.shares * (1 + q)) }); s.open[id] *= f; s.fair[id] *= f; this.corpNews('rights', id, { dir: -1, r: Math.round(q * 100) }); continue; }
   if (!c.crisis && c.v < N.crisis_v && R() < N.crisis_chance && !this.kept(id)) this.crisis(id, R);   /* 이야기 종목은 위기설 없음(keepStock) */
   if (c.crisis && d >= c.crisis.until) this.resolve(id, R);
  }
  for (const k of plan.crisis.filter(i => i === d)) { const cand = this.stocks.filter(x => !mk.co[x.id].crisis && this.listed(x.id) && !this.kept(x.id)).sort((a, b) => (mk.co[a.id].v + mk.co[a.id].h) - (mk.co[b.id].v + mk.co[b.id].h)); if (cand.length > N.list_min - 2) this.crisis(cand[0].id, R, k === plan.crisis[0]); }
  for (const k of plan.ipo.filter(i => i === d)) if (this.stocks.length < N.list_max + 4) this.ipo(R);
  if (this.stocks.length > N.list_max && R() < 0.01) { const w = this.stocks.filter(x => !mk.co[x.id].crisis && !this.kept(x.id)).sort((a, b) => mk.co[a.id].v - mk.co[b.id].v)[0]; if (w) this.crisis(w.id, R); }   /* 너무 많으면 약한 회사부터 위기 */
  if (this.stocks.length < N.list_min && R() < 0.05) this.ipo(R);
 }
 adj(id, o) { const L = this.s.listing; L.adj[id] = { ...(L.adj[id] || {}), ...o }; this.relist(); }
 split(id, r) {   /* 액면분할(r > 1) · 병합(r < 1) — 주식 수 × r · 값 ÷ r · 내 주식도 같이(병합 끝수는 현금) */
  const s = this.s, x = this.ST[id], h = s.hold[id], nh = r >= 1 ? h * r : Math.trunc(h * r), rest = r < 1 ? (h - nh / r) * s.open[id] : 0;
  s.hold[id] = nh; s.cash += rest; if (s.avg[id]) s.avg[id] /= r; s.open[id] /= r; s.fair[id] /= r; for (const pt of s.px?.[id] || []) pt[1] = Math.round(pt[1] / r);
  for (const t of s.yunaTip?.pend || []) if (t.stock === id) t.c0 /= r;
  this.adj(id, { shares: Math.round(x.shares * r), price: x.price / r }); this.hook('split', id, r);   /* 장치가 쥔 기준가(이사회 px0 · 유나 보고 p0 · 감독 창 · 장외 덩어리)도 같은 비율로 */ this.corpNews(r >= 1 ? 'split' : 'revsplit', id, { r: r >= 1 ? r : Math.round(1 / r) }); if (h) this.msg({ type: 'split', stock: id, r, from: h, to: nh, cash: rest });
 }
 crisis(id, R, fated) { const c = this.s.market.co[id]; c.crisis = { from: this.s.day, until: this.s.day + Math.round(uni(R, N.crisis_days)), fated: !!fated }; c.he -= 0.04; c.h -= 0.05; this.corpNews('crisis', id, { dir: -1 }); }
 resolve(id, R) {   /* 위기설 결말 — 회복 · 합병(내 주식이 사는 회사 주식으로) · 청산(상장 폐지 · 남은 값 조금) */
  const s = this.s, c = s.market.co[id], x = this.ST[id], w = N.crisis_end.map((v, i) => v * (i === 0 ? (c.crisis.fated ? 0 : Math.exp(c.v + 0.4)) : 1)); delete c.crisis;   /* 그해 정해진 위기설은 회복 없음 */
  let k = 0, z = R() * w.reduce((a, b) => a + b, 0); for (; k < w.length - 1; k++) { z -= w[k]; if (z < 0) break; }
  if (this.kept(id)) k = 0;   /* 이야기 종목(옛 저장에 걸려 있던 위기설)은 회복으로만 */
  if (k === 0) { c.v += 0.3; c.he += 0.05; (this._fairBump ||= {})[id] = 1.15; this.corpNews('recover', id, { dir: 1 }); return; }   /* 제값 재평가는 오늘 값 길을 만든 뒤(nextDay) — 어젯밤 유나 미리 보기와 오늘 기울기가 같게 */
  const buyer = k === 1 ? this.stocks.filter(y => y.id !== id && this.listed(y.id) && !s.market.co[y.id].crisis).sort((a, b) => (b.shares * s.open[b.id]) - (a.shares * s.open[a.id]) + (b.sec === x.sec) - (a.sec === x.sec))[0] : null;
  if (buyer) this.merge(id, buyer.id, uni(R, N.merge_premium)); else this.delistCo(id, N.liquidation);
 }
 merge(id, to, prem) { const s = this.s, h = s.hold[id], per = s.open[id] * prem, pa = s.open[to]; let got = 0, cash = 0;
  if (h > 0) { got = Math.floor(h * per / pa); cash = h * per - got * pa; const cost = h * (s.avg[id] || 0) + (s.hold[to] > 0 ? s.hold[to] * s.avg[to] : 0); if (s.hold[to] >= 0) { s.hold[to] += got; s.avg[to] = s.hold[to] ? cost / s.hold[to] : 0; } else { s.hold[to] += got; } s.cash += cash; }
  else if (h < 0) { cash = h * per; s.cash += cash; }   /* 공매도는 합병 값으로 되삼 */
  this.corpNews('merge', id, { to, dir: 1 }); this.dropListing(id); if (h) this.msg({ type: 'merge', stock: id, to, from: h, got, cash }); }
 delistCo(id, frac) { const s = this.s, h = s.hold[id], cash = h * s.open[id] * frac; s.cash += cash; this.corpNews('liquidate', id, { dir: -1 }); this.dropListing(id); this.msg({ type: 'delist', stock: id, lost: h, cash }); }
 dropListing(id) { const s = this.s, L = s.listing; s.delisted[id] = true; s.hold[id] = 0; s.avg[id] = 0; delete s.flag[id]; delete s.policy[id]; L.ids = L.ids.filter(x => x !== id); this.relist(); }
 ipo(R, o = null) {   /* 신규 상장 — 가짜 이름 · 한국 업종 꼴 · o 가 있으면 그 칸을 덮음(장치가 제 회사를 올릴 때 { name sec price shares turnover }) */
  const s = this.s, L = s.listing, sec = (o?.sec && SECTOR[o.sec]) || pick(R, T.sectors), I = T.ipo_names, used = new Set(Object.values(this.ST).map(x => x.name));
  let name = ''; for (let t = 0; t < 30 && (!name || used.has(name)); t++) name = pick(R, I.pre) + pick(R, I.suf[sec.id]); if (used.has(name)) name += ' ' + (L.n + 2);
  const price = Math.round(Math.exp(uni(R, [Math.log(5000), Math.log(60000)])) / 50) * 50, cap = Math.exp(uni(R, [Math.log(5e10), Math.log(1.5e12)])), shares = Math.round(cap / price);
  const id = 'n' + (s.seed % 46656).toString(36) + '_' + (++L.n), def = { id, name, sector: I.label[sec.id], sec: sec.id, price, shares, turnover: Math.round(cap * uni(R, [0.006, 0.02])), vol: +uni(R, I.vol[sec.id]).toFixed(3), div: +uni(R, [0, 0.01]).toFixed(4), small: cap < 1e11, ipo: DAYS[s.day] };
  if (o) { for (const k of ['name', 'price', 'shares', 'turnover']) if (o[k] != null) def[k] = o[k]; def.small = def.shares * def.price < 1e11; if (o.mine) def.mine = true; }
  L.defs[id] = def; L.ids.push(id); this.relist(); s.hold[id] = 0; s.avg[id] = 0; s.impact[id] = 0; s.extra[id] = 1; s.gate[id] = -1; s.open[id] = def.price; s.fair[id] = def.price * Math.exp(N.ipo_hype); s.market.co[id] = { v: 0, h: N.ipo_hype, p: 0, he: 0.01 };
  if (this.m?.path && !this.m.path[id]) { this.m.path[id] = new Float64Array(this.m.M + 1).fill(def.price); this.m.trend[id] = 0; }   /* 장중 상장(장치) — 오늘 남은 장은 공모가 그대로 · 내일부터 값 길 */
  this.corpNews('ipo', id, { dir: 1 }); return id;
 }
 storyAt(time, event) { return Story.pump(this, time, event); }
 storyText(str) { return Story.text(this, str); }
 storyPending() { return this.s.msgs.some(m => m.type === 'scene'); }
 baekInterest() { const b = this.s.baek; return b.state === 'owe' ? Math.round(b.principal * this.bankRate() * b.rateMul) : 0; }   /* 차용증 '은행 × N' 그대로 — 그 달 은행 금리 × 배수(옛 고정 loan_rate 0.6% × 배수를 바꿈 · 새 눈 11-22) */
 baekRepay(amount) {
  const s = this.s, b = s.baek;
  if (DAYS[s.day] < N.baek_repay_from || b.state !== 'owe' || !Number.isFinite(amount) || amount <= 0) return false;
  const paid = Math.min(amount, b.principal, s.cash); if (paid <= 0) return false;
  b.principal -= paid; s.cash -= paid;
  if (!b.principal) { b.state = 'paid'; b.paidDay = DAYS[s.day]; } return true;
 }
 /* ── 조회 ── */
 build() { const s = this.s; ensureDays(s.day + 1); const M = minutesOf(s.day); this.m = makeDay(s.seed, s.day, s.open, s.trendPrev, s.tips, s.policy, s.fair, this.dayInput(s.day), { era: this.era(), rm: s.market.r, lim: this.limit(), cb: this.rule('circuit_breaker'), M, stocks: this.stocks, all: this.trendStocks(), ...(this.idxTrack() ? { damp: N.idx_damp, w: Object.fromEntries(this.stocks.filter(x => !s.delisted[x.id] && s.open[x.id] > 0).map(x => [x.id, x.shares * s.open[x.id]])) } : {}) }); this.m.lim = this.limit() / 100; }
 date(i = this.s.day) { const d = this.ymd(i); return `${d.slice(0, 4)}년 ${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일 ${WEEK[dow(i)]}`; }
 clock(m = this.s.minute) { const t = this.openMin() + m; return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
 price(id, m = this.s.minute) { if (this.s.delisted[id]) return 0; const P = this.m.path[id], o = this.s.open[id], L = this.m.lim, v = P[m < P.length ? m : P.length - 1] * this.s.extra[id] * (1 + this.s.impact[id]); return v < o * (1 - L) ? o * (1 - L) : v > o * (1 + L) ? o * (1 + L) : v; }   /* 가격제한 안 */
 stocksValue() { return this.stocks.reduce((n, s) => n + this.s.hold[s.id] * this.price(s.id), 0); }
 housePrice(id = this.s.house, i = this.s.day) { const v = this.hookFirst('housePrice', id, i); return Number.isFinite(v) ? v : HOUSE[id]?.price ?? 0; }   /* 사는 집 사다리 값 한 곳(결정 D-074) — 그 달 같은 종류 매물 시세(자산 장치) · 장치가 없으면 toy2.json houses */
 carPrice(id = this.s.car, i = this.s.day) { const v = this.hookFirst('carPrice', id, i); return Number.isFinite(v) ? v : CAR[id]?.price ?? 0; }   /* 차 사다리 · 차 목표 값 한 곳(결정 D-074) — 그 달 새 차 값(자산 장치) · 없으면 toy2.json cars */
 assets() { const s = this.s; return this.housePrice() * 0.9 + (this.hookFirst('ownsCar') ? 0 : this.carPrice() * 0.6) + Object.entries(s.shops).reduce((n, [k, q]) => n + SHOP[k].price * 0.9 * q, 0) + (s.firm ? s.firm.capital : 0) + this.hookSum('assets'); }
 netWorth() { const s = this.s; return s.cash + s.deposit + this.stocksValue() + this.assets() - s.debt - s.baek.principal; }
 money(n) { return money(n); }
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
 paidCost() { return N.senior_paid_cost * (this.lvl('know') >= 4 ? 0.5 : 1); }   /* 비서 유료 분석 값 — 시장 지식 Lv.4 면 반값(규칙 · 화면 두 곳이 같이 씀) */
 netPts() { return Object.values(this.s.contacts).filter(c => c.known).reduce((n, c) => n + c.rel, 0) / 10 + this.s.rep.net; }
 stake(id) { return Math.max(0, this.s.hold[id]) / this.ST[id].shares; }
 loanLimit() { const banker = T.contacts.some(p => p.role === 'banker' && this.s.contacts[p.id].known && this.s.contacts[p.id].rel >= 40); return N.loan_tiers[Math.max(0, this.lvl('wealth')) + (banker ? 1 : 0) + (this.has('w_bank') ? 1 : 0)] ?? N.loan_tiers.at(-1); }
 baseRate(i) { const b = this.macro(i).bok_rate; return Number.isFinite(b) ? b : N.base_rate_fallback; }   /* 그 달 기준금리 연 %(실제 거시 → 무작위 거시 · 자산 장치 rateAt 도 이 값을 따름) */
 depositRate() { return this.baseRate() * N.deposit_share / 1200; }   /* 보통예금 달 이율 = 기준금리 × deposit_share */
 bankRate(i = this.s.day) { return Math.max(0.002, (this.baseRate(i) + N.loan_spread) / 1200); }   /* 그 달 은행 대출 달 이율(기준금리 + loan_spread · 사람마다 깎아 주는 몫 없음) — 백 여사 이자의 바탕(새 눈 11-22 판단 거리 4) */
 loanRate() { return Math.max(0.002, this.bankRate() - (this.lvl('image') >= 2 ? 0.001 : 0) - (T.contacts.some(p => p.role === 'banker' && this.s.contacts[p.id].rel >= 60) ? 0.002 : 0)); }
 canShort(id) { if (this.lvl('wealth') < (this.has('w_short') ? 1 : 2)) return false; const b = this.rule('short_ban'); if (b) { if (b.scope.startsWith('전면')) return false; if (id && this.ST[id].shares * this.price(id) < N.short_big_cap) return false; } return true; }   /* 공매도 금지 기간(시대 규칙) — 전면 · 큰 종목만 */
 seniorLvl() { return Math.min(5, Math.floor(this.s.senior / 20)); }
 rank() { const idxv = this.index() / this.s.market.idx0, nw = this.netWorth(); return 1 + this.s.rich.filter(w => w * (0.5 + 0.5 * idxv) > nw).length; }
 msg(m) { this.s.msgs.push(m); }
 note(text) { this.s.log.push({ day: this.s.day, text }); if (this.s.log.length > 200) this.s.log.shift(); }
 achView(a) { const hid = a.open && !this.s.ach[a.id] && this.ymd() < a.open; return hid ? { ...a, name: '???', text: '???', hidden: true } : a; }   /* 때가 안 된 목표 · 업적은 가림(T.achievements[].open · 새 눈 11-22) */
 achieve(id) { if (!this.s.ach[id] && ACH[id]) { this.s.ach[id] = this.s.day + 1; this.msg({ type: 'ach', id, first: Object.keys(this.s.ach).length === 1 });   /* first = 판의 첫 업적(화면 축하 카드 · D-068) */ const I = this.inst(); if (++I.achN % I0.gain.ach_every === 0) { this.instGain(); this.msg({ type: 'inst', why: 'ach' }); } } }
 r(salt) { return rng(this.s.seed ^ Math.imul(this.s.day + 11, 0x2545F491) ^ Math.imul(salt + 1, 0x9E3779B9) ^ this.s.minute); }

 /* ── 장중 ── */
 trade(side, id, frac) {   /* 체결 밀림은 한 번에 impact_cap 까지(그날 누적 충격 묶음 · 차례 3) */
  const s = this.s; this._h0 = s.hold[id]; if (this.hookFirst('tradeGate', side, id) === false) return false; if (this.storyPending() || s.phase !== 'open' || this.halted() || !this.listed(id) || s.delisted[id] || !(frac > 0 && frac <= 1)) return false;
  const p = this.price(id), tv = this.ST[id].turnover;
  if (side === 'buy') {
   if (s.hold[id] < 0) { const q = frac >= 1 ? -s.hold[id] : Math.max(1, Math.floor(-s.hold[id] * frac)), dI = N.impact_k * q * p / tv, fill = p * (1 + Math.min(dI, 2 * N.impact_cap) / 2), cost = q * fill; if (cost > s.cash) return false;
    const pnl = q * s.avg[id] - cost; s.cash -= cost; s.hold[id] += q; s.impact[id] += dI; if (!s.hold[id]) s.avg[id] = 0; if (pnl > 0) this.achieve('short'); this.afterTrade(id, pnl); return true; }
   const A = s.cash * frac, room = Math.floor(this.holdCap(id) * this.ST[id].shares) - Math.max(0, s.hold[id]); let dI = N.impact_k * A / tv, fill = p * (1 + Math.min(dI, 2 * N.impact_cap) / 2), q = Math.floor(A / fill); if (q > room) { q = room; dI = N.impact_k * q * p / tv; fill = p * (1 + Math.min(dI, 2 * N.impact_cap) / 2); } if (q < 1) return false;   /* 보유 한도(회사마다) — 막히면 산 만큼으로 충격 다시 셈 */
   const cost = q * fill; s.cash -= cost; s.avg[id] = ((s.avg[id] || 0) * s.hold[id] + cost) / (s.hold[id] + q); s.hold[id] += q; s.impact[id] += dI;
   const tip = this.m.feed.find(f => f.kind === 'tip' && f.stock === id && f.insider && f.t <= s.minute); if (tip) s.flag[id] = { insider: true, day: s.day };
   this.checkGate(id); this.afterTrade(id, 0); return true;
  }
  if (s.hold[id] > 0) { const q = frac >= 1 ? s.hold[id] : Math.max(1, Math.floor(s.hold[id] * frac)), dI = N.impact_k * q * p / tv, fill = p * (1 - Math.min(dI, 2 * N.impact_cap) / 2), got = q * fill * (1 - N.sell_cost), pnl = got - q * s.avg[id];
   if (frac >= 1 && this.has('w_block')) { s.impact[id] += dI * (1 - I0.block_impact); }
   s.cash += got; s.hold[id] -= q; s.impact[id] -= dI; if (!s.hold[id]) s.avg[id] = 0; if (pnl > 0) { this.achieve('first_win'); if (pnl / Math.max(1, this.netWorth()) > 0.01) s.rep.know += 1; }
   if (s.flag[id]?.insider && pnl > 0) { s.susp += Math.min(45, pnl / Math.max(1, this.netWorth()) * N.susp_insider_mul) * (1 - this.lvl('ethics') * 0.12); s.rep.ethics -= 2; }
   if (s.gateDay[id] != null && s.day - s.gateDay[id] <= 5 && q >= (s.hold[id] + q) / 2) { s.susp += N.susp_pump; s.gateDay[id] = null; }
   if (!s.hold[id]) delete s.flag[id]; this.afterTrade(id, pnl); return true; }
  if (!this.canShort(id)) return false; // 공매도: 재력 2단계부터 · 금지 기간
  const A = s.cash * frac * N.short_margin, dI = N.impact_k * A / tv, fill = p * (1 - Math.min(dI, 2 * N.impact_cap) / 2), q = Math.floor(A / fill); if (q < 1) return false;
  const value = Math.abs(s.hold[id] - q) * p; if (s.cash + q * fill < value * (1 + N.short_margin)) return false;
  s.avg[id] = ((s.avg[id] || 0) * -s.hold[id] + q * fill) / (-s.hold[id] + q); s.cash += q * fill * (1 - N.sell_cost); s.hold[id] -= q; s.impact[id] -= dI; this.afterTrade(id, 0); return true;
 }
 afterTrade(id, pnl) { const s = this.s; s.impact[id] = Math.max(-N.impact_cap, Math.min(N.impact_cap, s.impact[id])); (s.flow ||= {})[id] = (s.flow[id] || 0) + (s.hold[id] - (this._h0 || 0)) * this.price(id);   /* 그날 누적 충격 묶음 · 다음 날 뒷맛용 순매수 */
  s.trades++; s.tradesToday++; s.lastTrade = { id, pnl, t: s.minute }; this.hook('afterTrade', id, s.hold[id] - (this._h0 || 0), this.price(id)); }   /* 내 매매 사건(장치 — 감독 · 이야기 표시) */
 checkGate(id) { const s = this.s, st = this.stake(id); N.stake_gates.forEach((g0, i) => { const g = i === 1 && this.has('w_vote') ? I0.vote_gate : g0; if (st >= g && s.gate[id] < i) { s.gate[id] = i;
   if (i === 0) { const r = this.r(i); s.ramp.push({ id, left: 15, step: uni(r, N.stake_jump) / 15 }); s.gateDay[id] = s.day; s.rep.image += 5; this.achieve('stake5'); }
   if (i === 2) this.achieve('director'); if (i === 3) { this.achieve('ceo'); s.policy[id] = s.policy[id] || 'invest'; s.rep.image += 10; }
   s.shown.push({ day: s.day, t: s.minute, kind: 'stake', stock: id, dir: 1, head: fmt(H.stake, { name: this.ST[id].name, pct: Math.round(g * 100) }) }); this.msg({ type: 'stake', stock: id, gate: i }); } }); }
 tick() {
  const s = this.s; if (s.phase !== 'open' || this.storyPending()) return false;
  s.minute++; const k = Math.pow(0.5, 1 / N.impact_half_life); for (const id in s.impact) s.impact[id] *= k;
  for (const r of s.ramp) if (r.left > 0) { s.extra[r.id] *= 1 + r.step; r.left--; } s.ramp = s.ramp.filter(r => r.left > 0);
  for (const f of this.m.feed) if (f.t === s.minute) s.shown.push({ ...f, day: s.day });
  if (s.shown.length > 400) s.shown = s.shown.slice(-300);
  this.hook('tick');
  if (s.minute >= this.m.M) this.closeDay(); return true;
 }
 closeDay() {
  const s = this.s, nw = this.netWorth(), pnl = nw - s.dayStart;
  this.scoreYunaTips();
  if (pnl < 0) s.stress += -pnl / Math.max(1, s.dayStart) * 100 * N.stress_loss_mul; s.stress += Math.max(0, s.tradesToday - N.stress_trade_free) * N.stress_trade; s.stress -= HOUSE[s.house].comfort / 40 + CAR[s.car].comfort / 40; s.stress = Math.max(0, Math.min(100, s.stress));
  s.hist.push({ d: s.day, nw: Math.round(nw), pnl: Math.round(pnl) }); if (s.hist.length > 800) s.hist.shift();
  for (const st of [...this.stocks]) if (st.small && this.price(st.id) < st.price * 0.22 && !this.kept(st.id)) { const lost = s.hold[st.id]; this.corpNews('liquidate', st.id, { dir: -1 }); this.msg({ type: 'delist', stock: st.id, lost }); this.dropListing(st.id); }   /* 작은 종목이 상장가 22% 아래면 폐지 */
  this.checkAch(); if (DAYS[s.day] >= N.crash_peak[0] && DAYS[s.day] <= N.crash_peak[1]) s.peakJul = nw;
  if (DAYS[s.day] >= N.crash_after && s.peakJul != null && !s.ach.crash && nw >= s.peakJul) this.achieve('crash');
  const r = this.r(99); if (!s.away && s.stress >= N.sick_from && r() < N.sick_chance) {   /* 장중에 떠난 여행(s.away 가 먼저 있음)은 그대로 */ const d = Math.round(uni(r, N.sick_days)); s.away = { kind: 'sick', left: d, total: d }; s.cash -= N.hospital_cost; s.stress = 35; this.msg({ type: 'sick', days: d }); }
  if (r() < 0.012) this.msg({ type: 'scam' }); if (r() < 0.008) { const cost = 1000000 + this.housePrice() * 0.01; s.cash -= cost; this.msg({ type: 'event', text: `집에 물이 샜다 — 수리비 ${this.money(cost)} 원` }); }
  this.hook('close', nw);   /* 장 마감 사건(장치) — 끝 판정 앞 */
  if (nw < N.bankrupt) { s.phase = 'end'; s.broke = true; return; }   /* 끝 날짜 없음 — 파산만(이야기 끝 성적표는 차례 8-0) */
  s.phase = s.away ? 'away' : 'evening';
  if (weekEnd(s.day)) { const w = s.wk || { day: s.day, nw: s.dayStart, trades: s.trades }; this.msg({ type: 'week', from: w.day, pnl: Math.round(nw - w.nw), trades: s.trades - w.trades, tips: (s.yunaTip?.log || []).filter(x => x.day >= w.day && x.hit).length }); }   /* 그 주 마지막 거래일 장 마감 — 이번 주(D-050) · 금요일이 휴장인 주(설 · 추석)도 · 병 · 구속 · 여행으로 떠나는 날도 */
  if (s.phase === 'evening' && this.storyAt('저녁')) return;
  if (s.phase === 'evening') { const known = T.contacts.filter(p => s.contacts[p.id].known); if (known.length && r() < N.call_chance) this.msg({ type: 'call', who: pick(r, known).id }); }
  if (s.phase === 'evening' && !weekEnd(s.day) && !N.weekday_evening && !(s.uiAppointment && (s.uiApptDay ?? s.day) === s.day) && !s.msgs.some(m => m.type === 'call' || m.type === 'scene' || m.type === 'story_end')) {   /* 오늘 저녁 약속(인맥)이 있으면 평일 저녁을 없애지 않음(검토 2절 · 약속 밀림) */ const sp = s.speed; this.endEvening(); if (s.phase === 'open') s.speed = sp; }   /* 평일 저녁 없앰(D-050) — 약속 · 장면 · 전화가 없는 날은 바로 다음 날로 · 흐르던 속도 그대로 */
 }
 checkAch() { const s = this.s, nw = this.netWorth(); [[2e8, 'nw2'], [1e9, 'nw10'], [5e9, 'nw50'], [2e10, 'nw200']].forEach(([v, id]) => nw >= v && this.achieve(id));
  if (Object.values(s.contacts).filter(c => c.known).length >= 8) this.achieve('people8'); const rk = this.rank(); if (rk <= 10) this.achieve('top10');
  const I = this.inst(); for (const th of I0.gain.rank) if (rk <= th && !I.rankHit.includes(th)) { I.rankHit.push(th); this.instGain(); this.msg({ type: 'inst', why: 'rank', th }); } }

 /* ── 저녁 · 주말 ── */
 evening(kind, who) {
  const s = this.s; if (s.phase !== 'evening' || this.storyPending()) return false;
  if ((kind === 'senior' || kind === 'paid') && Story.gone(this)) return false;   /* 유나가 떠난 뒤엔 비서 저녁 · 유료 분석 없음(개편 차례 8 · 이야기 s0321) */
  if (this.storyAt('저녁', { kind, who })) return true; const r = this.r(7);
  if (kind === 'meet') { const c = s.contacts[who], p = PEOPLE[who]; if (!c?.known) return false; const role = T.roles[p.role];
   c.rel = Math.min(100, c.rel + N.rel_meet + (s.gift ? N.rel_gift : 0)); s.gift = 0; c.last = s.day; s.cash -= N.meet_cost;   /* 만남 비용(자료 numbers.meet_cost · 전화 창이 같은 값을 보여 줌 · 11-23) */  s.stress = Math.max(0, s.stress - (role.calm || 4));
   if (role.ethics) s.rep.ethics += role.ethics / 2; if (p.role === 'analyst') s.rep.know += 1;
   if (r() < 0.45 + c.rel / 200) this.tipFrom(p, c.rel, r); else this.msg({ type: 'talk', who, text: '오늘은 별다른 얘기 없이 술잔만 기울였다.' });
   if (c.rel >= N.intro_rel && r() < 0.3) this.intro(r, who); }
  else if (kind === 'senior') { s.senior = Math.min(100, s.senior + 8); s.cash -= 200000; s.stress = Math.max(0, s.stress - 5); this.seniorHint(r, this.has('i_big')); }
  else if (kind === 'paid') { if (this.seniorLvl() < N.senior_paid_level) return false; const cost = this.paidCost(); if (s.cash < cost) return false; s.cash -= cost; this.seniorHint(r, true); }
  else if (kind === 'pub') { s.cash -= 200000; s.stress = Math.max(0, s.stress - 8); if (r() < 0.6) this.tipFrom({ id: 'pub', name: '옆자리 손님', role: 'tipster' }, 0, r); if (r() < 0.15 + this.lvl('net') * 0.05) this.intro(r); }
  else if (kind === 'rest') { s.stress = Math.max(0, s.stress - N.stress_rest * (1 + this.lvl('charity') * 0.15) - HOUSE[s.house].comfort / 15); }
  else if (kind === 'study') { s.rep.know += 2; s.stress = Math.min(100, s.stress + 2); }
  else if (!this.hookFirst('evening', kind, who)) return false;   /* 새 저녁 행동(장치) — 맡으면 true */
  this.endEvening(); return true;
 }
 greet(who) { const s = this.s, c = s.contacts[who]; if (!c?.known || c.greet === s.day) return false; c.greet = s.day; c.rel = Math.min(100, c.rel + N.rel_greet); return true; }   /* 인맥 탭 '안부 묻기' — 사람마다 하루 한 번(11-20 R 목업) */
 answerCall(yes, who) { const s = this.s, c = s.contacts[who]; s.msgs = s.msgs.filter(m => !(m.type === 'call' && m.who === who)); if (!c) return false; if (yes) return this.evening('meet', who); c.rel = Math.max(0, c.rel + N.rel_call_no); return true; }
 tipFrom(p, rel, r) { const s = this.s, role = T.roles[p.role]; const stock = p.stock && !s.delisted[p.stock] ? p.stock : pick(r, this.stocks.filter(x => !s.delisted[x.id])).id;
  const acc = Math.min(0.97, role.acc + rel / 1000 + this.lvl('net') * 0.01), t = role.early || this.has('i_early') ? Math.round(uni(r, N.tip_minute)) : Math.round(60 + r() * 150), dir = r() < 0.55 ? 1 : -1;
  s.pending.push({ stock, dir, t, acc, who: p.id, whoName: p.name, insider: !!role.insider }); this.msg({ type: 'tip', who: p.id, stock, dir, insider: !!role.insider }); }
 /* 유나 귀띔 맞힘 — 귀띔한 날 장 마감 값(c0)과 다음 거래일 장 마감 값을 맞대 셈(비서 탭 YUNA TIP · 11-20 E 목업) · 옛 저장엔 칸이 없어 처음 쓸 때 만듦 */
 yunaTips() { return (this.s.yunaTip ||= { n: 0, hit: 0, pend: [] }); }
 noteYunaTip(stock, dir) { const y = this.yunaTips(); y.n++; y.pend.push({ day: this.s.day, stock, dir, c0: this.price(stock) }); }
 scoreYunaTips() { const s = this.s, y = s.yunaTip; if (!y) return; y.pend = y.pend.filter(p => { if (p.day >= s.day) return true; const hit = !s.delisted[p.stock] && (this.price(p.stock) - p.c0) * p.dir > 0; if (hit) y.hit++; (y.log ||= []).push({ day: p.day, at: s.day, stock: p.stock, dir: p.dir, hit }); if (y.log.length > 30) y.log.shift(); return false; }); }
 seniorHint(r, paid) { const s = this.s, lv = this.seniorLvl(), nm = this.nextMarket(), next = dayTrend(s.seed, s.day + 1, this.m.ti, this.era(s.day + 1), nm.open, nm.fair, this.dayInput(s.day + 1), nm.r, this.trendStocks()).t;   /* 내일 값과 같은 셈(build 와 같은 씨앗 차례) */
  if (paid || lv >= N.senior_big_level) { const best = this.stocks.filter(x => !s.delisted[x.id]).sort((a, b) => Math.abs(next[b.id]) - Math.abs(next[a.id]))[0]; const dir = Math.sign(next[best.id]) || 1; this.noteYunaTip(best.id, dir); this.msg({ type: 'senior', stock: best.id, dir, sure: true, paid: !!paid, day: s.day }); return; }
  if (lv >= N.senior_free_level || this.has('i_report') || r() < 0.4 + this.lvl('know') * 0.1) { const st = pick(r, this.stocks.filter(x => !s.delisted[x.id])), right = r() < Math.min(1, 0.65 + this.lvl('know') * 0.04 + (s.story.stage.yuna >= 2 ? N.stage2_yuna_acc : 0)), dir = Math.sign(next[st.id]) * (right ? 1 : -1) || 1; this.noteYunaTip(st.id, dir); this.msg({ type: 'senior', stock: st.id, dir, day: s.day }); }
  else this.msg({ type: 'senior', none: true, day: s.day }); }
 intro(r, by) { const s = this.s, unknown = T.contacts.filter(p => !s.contacts[p.id].known && (by || p.role !== 'ceo' || this.lvl('net') >= 2)); if (!unknown.length) return; const p = pick(r, unknown); s.contacts[p.id].known = true; s.contacts[p.id].rel = this.has('f_card') ? I0.card_rel : 15; s.contacts[p.id].last = s.day; this.msg({ type: 'intro', who: p.id, by }); }
 endEvening() { const s = this.s; s.msgs = s.msgs.filter(m => m.type !== 'call'); if (weekEnd(s.day)) {   /* 그 주 마지막 거래일 저녁 → 주말(금요일 휴장인 주도) */ s.phase = 'weekend'; s.slot = 0; this.storyAt('주말'); } else this.nextDay(); }
 weekend(place, arg) {
  const s = this.s, P = PLACE[place]; if (this.storyPending() || s.phase !== 'weekend' || !P || (CAR[s.car].reach < P.reach && !(place === 'golf' && this.has('f_golf')))) return false;
  if (this.storyAt('주말', { place })) return true; const r = this.r(31 + s.slot);
  s.cash -= P.cost; s.stress = Math.max(0, s.stress + P.stress * (place === 'home' ? 1 + HOUSE[s.house].comfort / 50 : 1) * (place === 'temple' ? 1 + this.lvl('charity') * 0.2 : 1));
  if (place === 'pub') { if (r() < 0.6) this.tipFrom({ id: 'pub', name: '옆자리 손님', role: 'tipster' }, 0, r); if (r() < 0.25 + this.lvl('net') * 0.05) this.intro(r); }
  if (place === 'golf') { const g = T.contacts.filter(p => p.golf && s.contacts[p.id].known); if (g.length) { const p = PEOPLE[arg] && g.includes(PEOPLE[arg]) ? PEOPLE[arg] : g[0]; s.contacts[p.id].rel = Math.min(100, s.contacts[p.id].rel + 15); s.contacts[p.id].last = s.day; this.msg({ type: 'talk', who: p.id, text: '라운딩 내내 이야기꽃이 폈다.' }); } s.rep.net += 3; if (r() < 0.35) { const u = T.contacts.filter(p => p.golf && !s.contacts[p.id].known); if (u.length) { const p = pick(r, u); s.contacts[p.id].known = true; s.contacts[p.id].rel = 20; this.msg({ type: 'intro', who: p.id }); } } }
  if (place === 'store') { if (s.cash >= 1000000) { s.cash -= 1000000; s.gift = 1; } }
  if (place === 'temple' && arg > 0 && s.cash >= arg) { s.cash -= arg; s.rep.charity += arg / N.charity_won_per_pt; s.rep.ethics += arg / (N.charity_won_per_pt * 2); s.donated = (s.donated || 0) + arg; if (this.has('f_gala')) s.rep.image += arg / N.charity_won_per_pt / 2; if (s.donated >= 1e8) this.achieve('charity'); if (this.lvl('charity') >= 3) s.rep.image += 1; }
  this.hook('weekend', place, arg);   /* 장소 효과(장치) */
  this.endWeekend(); return true;
 }
 endWeekend() { this.s.slot++; if (this.s.slot >= 2) this.nextDay(); else this.storyAt('주말'); }

 /* ── 다음 날 · 달 · 해 ── */
 nextDay() {
  const s = this.s, mk = s.market, nm = this.nextMarket(); s.open = nm.open;
  { const px = (s.px ||= {}); for (const x of this.stocks) if (!s.delisted[x.id]) { const L = (px[x.id] ||= []); L.push([s.day, Math.round(s.open[x.id])]); if (L.length > N.px_keep) L.shift(); } }   /* 지난날 종가를 쌓아 종목 차트를 이어 그림(11-20 대표님 피드백 12) */ for (const id in s.extra) s.extra[id] = 1; for (const id in s.impact) s.impact[id] = 0;
  s.fair = nm.fair; mk.co = nm.co; mk.k = nm.k; mk.tgt = nm.tgt; mk.r = nm.r; mk.idx = nm.idx; mk.ih.push([s.day, Math.round(nm.idx * 100) / 100]); if (mk.ih.length > N.px_keep) mk.ih.shift();   /* 시장 바탕 · 회사 실체 · 지수 종가 */
  s.trendPrev = this.m.ti; const prevMonth = DAYS[s.day].slice(0, 7); s.day++; ensureDays(s.day + (N.days_ahead || 80)); s.minute = 0; s.tradesToday = 0; s.tips = s.pending; s.pending = []; s.flow = {}; this.corpDay(); this.build(); if (this._fairBump) { for (const [id, k] of Object.entries(this._fairBump)) if (s.fair[id]) s.fair[id] *= k; this._fairBump = null; }
  if (DAYS[s.day].slice(0, 7) !== prevMonth) this.month();
  if (s.away) { s.phase = 'away'; } else { s.phase = 'open'; this.storyAt('장 전'); if (this.has('i_brief')) { const f = this.m.feed.find(x => x.kind === 'news' && x.real); if (f) s.shown.push({ day: s.day, t: 0, kind: 'brief', stock: f.stock, dir: f.dir, head: fmt(I0.brief_head, { name: this.ST[f.stock].name }) }); } }
  this.hook('day');   /* 날마다(장 전 · 입원 중에도) — 장치 */
  s.dayStart = this.netWorth(); if (!s.wk || weekEnd(s.day - 1) || s.day - s.wk.day >= 5) s.wk = { day: s.day, nw: Math.round(s.dayStart), trades: s.trades };   /* 이번 주 시작 값(D-050) */
  if (s.autopause) s.speed = 0; return true;
 }
 month() {
  const s = this.s, mon = +DAYS[s.day].slice(5, 7), house = HOUSE[s.house], car = CAR[s.car], r = this.r(55);
  const living = N.living_base + house.upkeep + car.upkeep, interest = s.debt * this.loanRate(), dep = s.deposit * this.depositRate(), rent = Object.entries(s.shops).reduce((n, [k, q]) => n + SHOP[k].rent * q, 0);
  let director = 0; for (const st of this.stocks) if (s.gate[st.id] >= 2 && !s.delisted[st.id]) director += this.price(st.id) * st.shares * N.director_pay;
  let div = 0; if ([1, 4, 7, 10].includes(mon)) for (const st of this.stocks) if (!s.delisted[st.id]) div += s.hold[st.id] * this.price(st.id) * st.div * (s.policy[st.id] === 'div' ? 2 : 1);
  let shortFee = 0; for (const st of this.stocks) if (s.hold[st.id] < 0) shortFee += -s.hold[st.id] * this.price(st.id) * N.short_fee;
  let fund = 0, wages = 0; if (s.firm) { for (const m of s.firm.mgr) { wages += m.pay; fund += s.firm.capital * (m.mean + gauss(r) * m.sd) / s.firm.mgr.length; } if (!s.firm.mgr.length) fund = 0; s.firm.capital = Math.max(0, s.firm.capital + fund); s.firm.last = fund; }
  const income = rent + director + Math.max(0, div), tax = income * N.income_tax;
  const baekInterest = this.baekInterest(), baekPrincipal = s.baek.principal;
  const ex = { in: [], out: [] }; for (const x of this.hook('month', { living, interest, dep, rent, director, div, tax, shortFee, fund, wages, income, baekInterest })) { if (x.in) ex.in.push(...x.in); if (x.out) ex.out.push(...x.out); }   /* 달 정산 줄(장치) — [[이름, 원]] · 화면 달 정산 창에 그대로 줄이 됨 */
  s.cash += income - tax - living - interest - baekInterest - shortFee - wages + dep;
  if (ex.in.length || ex.out.length) s.cash += ex.in.reduce((n, x) => n + x[1], 0) - ex.out.reduce((n, x) => n + x[1], 0);
  if (s.debt > Math.max(0, this.netWorth()) * 0.5) s.stress = Math.min(100, s.stress + N.stress_debt);
  if (s.cash < 0 && !this.hookFirst('negCash')) { s.debt += -s.cash; s.cash = 0; s.stress = Math.min(100, s.stress + 5); }   /* 음수 현금을 장치(생활 · 강제 매각)가 맡으면 빚으로 넘기지 않음 */
  for (const p of T.contacts) { const c = s.contacts[p.id]; if (c.known && s.day - c.last > 20) c.rel = Math.max(0, c.rel - N.rel_decay); }
  s.senior = Math.max(0, s.senior - 1); s.susp = Math.max(0, s.susp - N.susp_decay * (1 + (this.lvl('ethics') >= 2 ? 0.5 : 0)));
  if (this.lvl('charity') >= 3) s.rep.image += 1; if (this.has('f_tv')) s.rep.image += I0.tv_image;
  if (this.has('w_club')) this.tipFrom({ id: 'club', name: '큰손 모임', role: 'analyst' }, I0.club_rel, r);
  s.lastMonth = { baekInterest, baekPrincipal, living, interest, rent, director, div, tax, shortFee, fund, wages, dep, debt: s.debt }; if (ex.in.length || ex.out.length) s.lastMonth.extra = ex;
  this.msg({ type: 'month', ...s.lastMonth }); this.storyAt('달 정산');
  if (mon === 1) { this.instGain(); this.msg({ type: 'year', inst: 1, year: +DAYS[s.day].slice(0, 4) - 1, nw: this.netWorth(), rank: this.rank() }); (s.years ||= {})[+DAYS[s.day].slice(0, 4) - 1] = { nw: this.netWorth(), rank: this.rank(), ach: Object.keys(s.ach).length };   /* 해마다 한 줄(비서 탭 ANNUAL · 11-23 대표님 '연도별로 계속 쌓는 방식') */ this.hook('year', +DAYS[s.day].slice(0, 4)); }   /* 새 해(장치) — 새 해 숫자 */
  if ([1, 4, 7, 10].includes(mon)) for (const st of this.stocks) if (s.gate[st.id] >= 1 && !s.delisted[st.id]) this.msg({ type: 'agm', stock: st.id, ceo: s.gate[st.id] >= 3 });
 }
 awayDay() { const s = this.s; if (this.storyPending() || s.phase !== 'away' || !s.away) return false; s.minute = this.m.M; s.away.left--; const done = s.away.left <= 0;
  const nw = this.netWorth(); s.hist.push({ d: s.day, nw: Math.round(nw), pnl: Math.round(nw - s.dayStart) }); if (done) { s.away = null; }
  if (weekEnd(s.day) && done) { s.phase = 'weekend'; s.slot = 0; this.storyAt('주말'); return true; } this.nextDay(); return true; }

 /* ── 은행 · 집 · 차 · 상가 · 회사 ── */
 bank(kind, amount) { const s = this.s; if (!(amount > 0) || s.phase === 'away' || s.phase === 'end') return false;
  if (kind === 'borrow') { if (s.debt + amount > this.loanLimit()) return false; s.debt += amount; s.cash += amount; }
  else if (kind === 'repay') { const a = Math.min(amount, s.debt, s.cash); if (a <= 0) return false; s.debt -= a; s.cash -= a; }
  else if (kind === 'save') { if (amount > s.cash) return false; s.cash -= amount; s.deposit += amount; }
  else if (kind === 'withdraw') { const a = Math.min(amount, s.deposit); if (a <= 0) return false; s.deposit -= a; s.cash += a; }
  else return false; return true; }
 buyHouse(id) { const s = this.s, h = HOUSE[id]; if (!h || id === s.house || this.lvl('wealth') < h.need || this.lvl('image') < (h.image || 0)) return false; const net = this.housePrice(id) - this.housePrice() * 0.9; if (s.cash < net) return false;   /* 이사 = 새 집 값 − 지금 집 90%(값은 그 달 시세 · D-074) */ s.cash -= net; s.house = id; if (id === 'riverapt') this.achieve('apt'); if (id === 'penthouse') this.achieve('penthouse'); return true; }
 buyCar(id) { const h = this.hookFirst('buyCar', id); if (h !== undefined) return h;   /* 장부 하나(11-22) — 차는 자산 장치 장부에 삼 */
  const s = this.s, c = CAR[id]; if (!c || id === s.car) return false; const net = this.carPrice(id) - this.carPrice() * 0.6; if (s.cash < net) return false; s.cash -= net; s.car = id; if (c.image) s.rep.image += c.image; if (id === 'import') this.achieve('import'); return true; }
 shop(id, buy) { const h = this.hookFirst('shop', id, buy); if (h !== undefined) return h;   /* 장부 하나(11-22) — 상가는 자산 장치 REAL ESTATE 에 */
  const s = this.s, x = SHOP[id]; if (!x) return false; if (buy) { if (s.cash < x.price) return false; s.cash -= x.price; s.shops[id] = (s.shops[id] || 0) + 1; this.achieve('landlord'); return true; } if (!s.shops[id]) return false; s.shops[id]--; s.cash += x.price * 0.9; return true; }
 firm(kind, arg) { const s = this.s;
  if (kind === 'found') { if (s.firm || this.lvl('wealth') < 3 || s.cash < N.firm_cost) return false; s.cash -= N.firm_cost; s.firm = { capital: N.firm_cost, mgr: [], last: 0 }; this.achieve('firm'); return true; }
  if (!s.firm) return false; const tiers = T.firm_tiers;   /* 매니저 값은 toy2.json 한 곳(화면도 같이 읽음 · 11-20) */
  if (kind === 'hire') { if (!tiers[arg] || s.firm.mgr.length >= 3) return false; s.firm.mgr.push({ ...tiers[arg], tier: arg }); return true; }
  if (kind === 'fire') { s.firm.mgr.splice(arg, 1); return true; }
  if (kind === 'add') { if (!(arg > 0) || arg > s.cash) return false; s.cash -= arg; s.firm.capital += arg; return true; }
  if (kind === 'take') { const a = Math.min(arg, s.firm.capital); if (!(a > 0)) return false; s.firm.capital -= a; s.cash += a; return true; } return false; }
 agm(stock, choice) { const s = this.s; s.msgs = s.msgs.filter(m => !(m.type === 'agm' && m.stock === stock)); if (s.gate[stock] >= 3) s.policy[stock] = choice; else if (choice === 'div') s.policy[stock] = this.stake(stock) + this.lvl('image') * 0.02 > 0.12 ? 'div' : s.policy[stock]; s.rep.image += 1; return true; }
 scam(trust) { const s = this.s; s.msgs = s.msgs.filter(m => m.type !== 'scam'); if (trust) { const lost = Math.max(0, s.cash) * N.scam_lose; s.cash -= lost; this.msg({ type: 'event', text: fmt(T.lines[lost > 0 ? 'scam_lost' : 'scam_empty'], { money: this.money(lost) }) }); s.stress = Math.min(100, s.stress + 10); } return true; }   /* 현금이 음수면 잃을 돈 없음(0 기준 · 음수에 곱해 돈을 주지 않음) · 몫 · 글은 toy2.json */
 ending() { const s = this.s, nw = this.netWorth(), rank = this.rank(); const ceo = Object.values(s.gate).some(g => g >= 3) || !!s.firm;
  const id = (s.away?.kind === 'jail' || s.jailCount >= 2) ? 'jail' : s.broke || nw < 10000000 ? 'broke' : rank <= 10 ? 'whale' : ceo ? 'owner' : nw > s.start ? 'rich' : 'ant';
  const names = { jail: '철창 — 선을 넘었다', broke: '파산 — 여의도를 떠났다', whale: '여의도 큰손 — 열 손가락 안', owner: '회사 주인 — 시장 밖에서도 힘이 있다', rich: '평범한 부자 — 잃지 않았다', ant: '아직 개미 — 다음 판에' };
  const e = { id, name: names[id], nw, rank, start: s.start }; this.hook('ending', e); return e; }   /* 끝 판정 덧붙임(장치) — e 를 고침 */
 dispatch(a, p = []) {
  const s = this.s; switch (a) {
   case 'tick': return this.tick(); case 'buy': return this.trade('buy', p[0], p[1]); case 'sell': return this.trade('sell', p[0], p[1]);
   case 'speed': if (N.speeds.includes(p)) { s.speed = p; return true; } return false; case 'autopause': s.autopause = !!p; return true;
   case 'evening': return this.evening(p[0], p[1]); case 'call': return this.answerCall(p[0], p[1]); case 'greet': return this.greet(p[0]); case 'weekend': return this.weekend(p[0], p[1]);
   case 'away': return this.awayDay(); case 'bank': return this.bank(p[0], p[1]); case 'house': return this.buyHouse(p); case 'car': return this.buyCar(p); case 'shop': return this.shop(p[0], p[1]);
   case 'firm': return this.firm(p[0], p[1]); case 'agm': return this.agm(p[0], p[1]); case 'scam': return this.scam(p);
   case 'scene': return Story.choose(this, p[0], p[1]);
   case 'baekRepay': return this.baekRepay(p);
   case 'learn': return this.learn(p); case 'respec': return this.respec();
   case 'msgdone': return s.msgs[0]?.type === 'scene' ? Story.choose(this, s.msgs[0].id, -1, true) : !!s.msgs.shift();
  } const v = this.hookFirst('act', a, p); return v === undefined ? false : v; }   /* 새 행동 이름(장치) */
 save(st) { try { st.setItem(N.save_key, JSON.stringify(this.s)); return true; } catch { return false; } }
 static load(st) { try { const s = JSON.parse(st.getItem(N.save_key)); if (s?.version !== N.version || !Number.isInteger(s.day)) return null; return new Game({}, s); } catch { return null; } }
}
root.Toy2 = { Game, T, N, money, IDX_PATH: PATH, ST, SRC, HOUSE, SHOP, CAR, PEOPLE, PLACE, REP, ACH, CAREER, SECTOR, DAYS, DINFO, LAST_REAL, fmt, rng, eraOf, dow, uni, gauss, pick, weighted, dayTrend, makeDay, ensureDays, minutesOf, openOf, holidays, ruleAt, HOOKS, MODS };   /* 뒤 다섯은 장치가 쓰라고(고리 차례) */
if (typeof module !== 'undefined') module.exports = root.Toy2;
})(globalThis);
