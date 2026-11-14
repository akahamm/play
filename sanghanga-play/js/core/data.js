/* =====================================================================
   data.js — 데이터 읽기 · 공용 도우미 (화면 없이도 돎 — 로봇 시험이 같은 파일을 씀)
   - 데이터는 변환기가 만든 data/bundle.js (window.GAME_DATA) 하나만 씀 → 파일로 열어도 됨(공개 사본도 묶음만).
     묶음이 없으면 못 읽음(11-14: data/*.json 을 하나씩 fetch 하던 길은 카드 대부분 · 땅이 빠지는 깨진 길이라 걷음).
   - 모든 엔진 파일은 SH 라는 이름표 하나에 붙음(전역 오염을 줄임).
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};

  /* ── 데이터 ── */
  SH.loadData = function () {   // 묶음이 없으면 던짐 — 부르는 쪽(ui/main.js)이 '데이터를 못 읽었습니다' 한 줄
    if (!root.GAME_DATA) throw new Error('data/bundle.js 없음');
    return SH.useData(root.GAME_DATA);
  };
  // 데이터 한 벌을 엔진이 쓰기 좋게 펼쳐 둠 (색인 · 규칙 표)
  SH.useData = function (D) {
    SH.D = D;
    const by = (arr) => Object.fromEntries(arr.map(x => [x.id, x]));
    const evFiles = D.events_files || Object.keys(D).filter(k => k.startsWith('events_'));
    SH.EVENTS = [];
    evFiles.forEach(k => (D[k] ? D[k].items : []).forEach(e => { e._file = k; e._act = D[k].act; SH.EVENTS.push(e); }));
    SH.EV = by(SH.EVENTS);
    SH.CH = by(D.characters.items);
    SH.PL = by(D.places.items);
    SH.AC = by(D.actions.items);
    SH.RK = by(D.ranks.items);
    SH.SHOP = by(D.shop.items);
    SH.STOCK = by(D.stocks.items);
    { const br = D.ranks.items.find(r => r.branch_from); SH.RANK_BRANCH = br ? br.id : null; SH.RANK_BRANCH_FROM = br ? br.branch_from : null; }   // 갈래 직급(독립)과 그 직급이 갈라져 나온 자리 — 직급 카드의 branch_from
    SH.RANK_ORDER = D.ranks.items.filter(r => !r.branch_from).map(r => r.id);   // 직급 카드 차례 그대로(갈래로 빠지는 '독립'만 뺌)
    SH.RANK_FIRST = SH.RANK_ORDER[0]; SH.RANK_TOP = SH.RANK_ORDER[SH.RANK_ORDER.length - 1];   // 첫 직급(1막) · 꼭대기 직급 — 뼈대는 직급 이름을 직접 안 씀
    // 규칙 숫자 한 표(rules.json · 기획 결정 A6) — 코드 안에 숫자를 박지 않고 여기서 읽음
    SH.R = {};
    (D.rules ? D.rules.items : []).forEach(r => { SH.R[r.id] = r.value; });
    SH.ACTION_RULES = D.actions.rules;
    SH.ART = new Set((D.art_files && D.art_files.cutout) || []);
    SH.CGS = new Set((D.art_files && D.art_files.cg) || []);
    // 이름 → 직급 id ('사원' → staff)
    SH.RANK_BY_NAME = {};
    D.ranks.items.forEach(r => { SH.RANK_BY_NAME[r.name_ko] = r.id; r.name_ko.split('·').forEach(a => { SH.RANK_BY_NAME[a.trim()] = SH.RANK_BY_NAME[a.trim()] || r.id; }); });
    return D;
  };

  /* ── 씨앗 있는 주사위 (같은 씨앗 = 같은 판 · 로봇 재현용) ── */
  // mulberry32 한 걸음: o[k] 를 씨앗으로 들고 다님 — 엔진의 주사위는 모두 이것(11-14 밤 정리 · 전엔 data · events · loop 에 세 벌)
  SH.mul32 = function (o, k) {
    let t = (o[k] = (o[k] + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  SH.rng = (st) => SH.mul32(st, 'rs');   // 0~1 · 상태 안에 씨앗을 들고 다님(저장해도 이어짐)
  SH.chance = (st, pct) => SH.rng(st) * 100 < pct;

  /* ── 작은 도우미 ── */
  SH.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  SH.won = function (v) {            // 원 → '337,000원'(11-12 대표님 '만 · 천 대신 337,000원')
    const s = v < 0 ? '−' : ''; v = Math.abs(Math.round(v));
    return s + v.toLocaleString('ko-KR') + '원';
  };
  SH.HERO = '한태준';
  // 받침에 맞는 조사 (이/가 · 은/는 · 을/를 · 과/와 · 부를 때 아/야 · 으로/로 — ㄹ 받침이면 '로')
  SH.josa = function (word, pair) {
    const c = word.charCodeAt(word.length - 1);
    const jong = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0;
    const [a, b] = pair.split('/');
    return word + (jong && !(pair === '으로/로' && jong === 8) ? a : b);
  };
  /* 자리표 뒤에 붙여 쓰는 조사 꼴 — 글에 '{s}이/가' 처럼 쓰면 받침에 맞춰 하나만 남김. 받는 꼴은 이 표 한 곳(대사/README.md · build_data.py 가 이 줄을 읽어 원본을 검사) */
  SH.JOSA = ['이라고/라고', '이/가', '은/는', '을/를', '과/와', '으로/로', '아/야'];
  const JOSA_RE = SH.JOSA.map(p => p.replace('/', '\\/')).join('|');
  SH.fillWord = (t, key, word) => String(t || '').replace(new RegExp(`\\{${key}\\}(${JOSA_RE})?`, 'g'), (_, p) => p ? SH.josa(word, p) : word);   // {key} + 조사 꼴 → 낱말 + 맞는 조사
  /* 장소 카드의 화면 칸 하나 → { 장소 id: 값 }(장면에만 쓰는 장소 포함 · 빈칸은 없음) — 화면(배경 · 곡 · 지도 건물 · 부제 · 잠김 글)이 읽음 */
  const PC = {}; SH.placeCol = (k) => { const P = (SH.D && SH.D.places) || {}; if (PC.src !== P) { PC.src = P; PC.m = {}; }
    if (!PC.m[k]) { const o = PC.m[k] = {}; (P.items || []).concat(P.scene_items || []).forEach(p => { if (p[k] != null) o[p.id] = p[k]; }); } return PC.m[k]; };
  SH.fillKeys = (t, o) => { const ks = Object.keys(o); return String(t || '').replace(ks.length ? new RegExp(`\\{(${ks.join('|')})\\}(${JOSA_RE})?`, 'g') : /(?!)/, (_, k, p) => p ? SH.josa(String(o[k]), p) : String(o[k])); };   // 자리표 여럿을 한 번에(채운 낱말 속 '{…}' 는 다시 안 채움) · 조사 꼴은 fillWord 와 같음
  SH.fillHero = (t) => SH.fillWord(SH.fillWord(t, 'hero', SH.HERO), 'name',   /* 뼈대 이름 허용: 글의 자리표 이름 {hero}(인물 id 가 아님) */ SH.HERO.length >= 3 ? SH.HERO.slice(1) : SH.HERO)   // {name} = 성을 뺀 이름 — 부름말 단계(인물_말투.md)
    .replace(/\{family\}/g, () => SH.HERO.length >= 3 ? SH.HERO[0] : SH.HERO);   // 성 — '한 인턴'
  SH.fill = (t, st) => SH.fillHero(t)   // 주인공 이름 + 그 판(st)의 돈({money} 등) — 판은 부르는 쪽이 넘김(11-14: 전역 '지금 판' SH._st 를 없앰 · 판 없이 부르면 돈 자리표는 빈 글)
    .replace(/\{(money|firm_cash|aum|upkeep)\}/g, (_, k) => { if (!st) return ''; const v = k === 'money' ? st.s.money : k === 'upkeep' ? (st.lastUpkeep || 0) : st.funds[k]; return Math.round(v || 0).toLocaleString('ko-KR'); });

  /* ── 그림 고르기 (표정 이름 → 파일) ──
     이벤트 카드의 표정은 한글('냉소' · '놀람' …) · 그림 파일은 영어(ill_boss_sneer)
     → 인물 카드의 표정 셋(id · name_ko)으로 맞추고, 없으면 기본 그림으로 내려감 */
  const EXPR_ALIAS = { 놀람: 'surprise', 웃음: 'smile', 미소: 'smile', 당황: 'flustered', 비웃음: 'smirk', 화남: 'angry', 토라짐: 'pout', 서운함: 'sulk', 차가움: 'cold', 냉소: 'sneer', 무뚝뚝: 'stern', 껄껄: 'laugh', 눈시울: 'moved', 결심: 'determined', 긴장: 'nervous' };
  SH.exprId = function (cid, expr) {
    if (!expr || expr === '기본' || expr === 'base') return 'base';
    const c = SH.CH && SH.CH[cid];
    const list = (c && c.art && c.art.expressions) || [];
    const hit = list.find(e => e.id === expr || e.name_ko === expr || e.name_ko.split(/\s+/).includes(expr) || e.name_ko.includes(expr));
    if (hit) return hit.id;
    return EXPR_ALIAS[expr] || expr;
  };
  // 그림 폴더 표 한 곳 — base 는 game/ 에서 본 상대 경로 · ill 오린 반신 · svg 옛 그림 · cg 컷신(+ 확장자)
  // 공개 사본(올리기/build_web.py)은 이 한 줄만 바꿔 씀(img/t · img/svg · img/cg · .jpg) — 글자를 바꾸면 build_web.py · tools/assets_check.py 도 같이
  SH.PATHS = { base: '', ill: 'img/t/', svg: 'img/svg/', cg: 'img/cg/', cgExt: '.jpg' };
  // 그림 후보 차례: 오린 반신(표정) → 오린 반신(기본) → 옛 SVG
  SH.artChain = function (cid, expr, base) {
    const P = SH.PATHS; base = base || P.base;
    const e = SH.exprId(cid, expr), out = [];
    if (SH.ART.has(`ill_${cid}_${e}`)) out.push(`${base}${P.ill}ill_${cid}_${e}.png`);
    if (SH.ART.has(`ill_${cid}_base`)) out.push(`${base}${P.ill}ill_${cid}_base.png`);
    if (((SH.D.art_files || {}).svg || []).includes(cid)) out.push(`${base}${P.svg}ill_${cid}_cut.svg`);
    return out;
  };
  SH.cgPath = (id, base) => (id && SH.CGS.has(id)) ? `${base || SH.PATHS.base}${SH.PATHS.cg}${id}${SH.PATHS.cgExt}` : null;
  SH.name = (cid) => cid === SH.GAME.hero ? SH.HERO : cid === 'nar' ? '' : String(cid).startsWith('tag:') ? String(cid).slice(4) : (SH.CH[cid] ? SH.CH[cid].name_ko : cid);
  SH.statKo = (k) => ((SH.D.stats.items.find(x => x.id === k) || {}).short_ko) || k;   // 능력치 화면 이름 — 원본 숫자_진급_초안.md 1-1 표의 '화면 이름' 칸
  SH.job = (cid) => (SH.CH[cid] && SH.CH[cid].job_ko) || '';   // 직함 — 원본 인물_카드.md 의 '직함' 칸
})(typeof window !== 'undefined' ? window : globalThis);
