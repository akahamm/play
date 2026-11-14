/* =====================================================================
   actions.js — 칸 행동(숫자 초안 2-2 행동 표) · 과제 · 만남
   - 칸마다 '어디서 · 무엇을'을 고름 → 행동 숫자 + (그 장소의 enter 카드가 있으면 카드) · 없으면 만남 오름
   - 업무 성공률: 30% + 주 실력×0.5 + 곁 실력×0.2 − 스트레스 80↑ 15% − 숙취 10% (10~95%)
   - 과제 진척: 업무 칸 +1(성공 +2) · 야근 +1(성공 +2 · 11-13 성공률 깎기 뺌) · 목표 2
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};

  /* ── 과제 ── (과제 카드 파일이 아직 없음 — 1막 카드가 부르는 둘 + 이름만 있는 주간 과제) */
  /* 과제 글(TASKS: 1막 카드가 부르는 과제 · WEEKLY/MONTHLY: 이름 + 부장 한마디 · 원본의 BIG 은 옛 분기 마디 것 — build_data 가 묶음에 안 실음) 원본 = 04_시범/대사/과제_글.json → 묶음 task_lines · 쓰는 때 읽음 */
  const TK = () => SH.D.task_lines;
  SH.startTask = function (st, id) {
    const t = TK().TASKS[id];
    if (t) { st.task = { id, name: t.name, quote: t.quote, goal: t.goal || 2, progress: 0 }; return; }
    const pool = st.mode === 'week' ? TK().WEEKLY : TK().MONTHLY;
    const p = pool[st.tick % pool.length];
    st.task = { id: id || `task_${st.mode}`, name: p[0], quote: p[1], goal: 2, progress: 0 };
  };
  // 마디 시작 때 기본 과제 (카드가 과제를 열면 그 카드가 바꿈)
  SH.defaultTask = function (st) {
    if (st.mode === 'week' && st.week === 1) { st.task = null; return; }          // 1주는 E02 가 줌
    if (st.mode === 'week' && st.seen.a1_sales_task != null && st.week >= 3 && st.week <= 5) return SH.startTask(st, 'task_sales_first');   /* 155: 인턴 8주 — 영업 과제 3 ~ 5주(전 3 ~ 6) */
    if (st.taskOverride && st.mode !== 'week') { const id = st.taskOverride; st.taskOverride = null; return SH.startTask(st, id); }      // 카드가 바꾼 과제(task.replace) — 다음 달 한 번
    if (st.mode !== 'week') { st.task = null; return; }      // 사원부터: 달마다 주어지는 과제는 없음 — 카드가 준 과제만(결산에서 '시장 이기기'로 판가름 · loop.js)
    SH.startTask(st, null);
  };

  /* ── 누가 어디 있나 (인물 카드 일정 + 장소 카드 '있는 사람') ── */
  function schedMatch(sc, slot) {
    if (sc.slot && sc.slot !== slot.slot) return false;
    if (!sc.day) return true;
    if (sc.day === '평일') return slot.day === '평일' || slot.day === '금';
    if (sc.day === '주말') return slot.day === '토' || slot.day === '일';
    return sc.day === slot.day;
  }
  SH.peopleAt = function (st, pid, slot) {
    const out = [];
    Object.values(SH.CH).forEach(c => {
      if (c.id === 'hero') return;
      if ((c.schedule || []).some(sc => sc.place === pid && schedMatch(sc, slot) && !(sc.cond_ko && !/야근/.test(sc.cond_ko)))) out.push(c.id);
    });
    return out;
  };

  /* ── 이 칸에 고를 수 있는 것 ── [{place, action, label, sub, variant, ok, why}] */
  const RANK_IN_TEXT = (t) => { const m = /(\S+)부터/.exec(t || ''); return m ? SH.RANK_BY_NAME[m[1]] : null; };
  SH.actionOk = function (st, a) {
    const r = RANK_IN_TEXT(a.unlock_ko);
    if (r && !SH.rankAtLeast(st, r)) return false;
    if (a.id === 'eve_entertain' && !st.task) return false;
    if (a.id === 'work_trading' && !SH.rankAtLeast(st, 'staff')) return false;
    if (a.id === 'work_deal' && !SH.rankAtLeast(st, 'manager')) return false;
    if ((a.id === 'eve_overtime' || a.id === 'eve_drinks') && st.mode === 'week' && st.week < 2) return true;
    return true;
  };
  function summary(a, extra, someone) {
    const e = a.effects || {}, out = [];
    if (e.hp) out.push(`체력 ${e.hp > 0 ? '+' : ''}${e.hp}`);
    if (a.id.startsWith('work_') || a.id === 'eve_overtime') out.push('과제 진척');
    if (a.id === 'lunch_meet') out.push(someone === false ? '인맥' : '만남');
    if (a.id === 'eve_date') out.push('호감 ♥♥');
    if (a.id === 'rest') out.push('푹 쉼');
    if (extra) out.push(extra);
    return out.join(' · ');
  }
  /* 장소별 단추 글(같은 행동도 장소마다 그 자리에서 할 만한 말 · 셈은 그대로) · 가벼운 만남 · 공부 갈래 이름 — 원본 04_시범/대사/화면_글.json 의 PLACE_ACT · LIGHT_MEET · STUDY_ACT · ACT_LABEL(없을 때 이름) */
  const UL = () => SH.D.ui_lines;
  SH.slotOptions = function (st, slot) {
    const out = [];
    const week = st.mode === 'week';
    const places = SH.D.places.items.filter(p => SH.isOpen(st, p.id) && (p.slots || []).includes(slot.kind)
      && (week ? (p.act_from === 1) : true));
    places.forEach(p => {
      const ppl = SH.peopleAt(st, p.id, slot);
      // 1막 뒤 장소는 장소 카드에 행동이 아직 없음 → 칸마다 기본 행동(가정)
      const acts = (p.actions && p.actions.length) ? p.actions : (week ? [] : ({ lunch: ['lunch_meet'], evening: ['eve_drinks', 'eve_date'], weekend: ['eve_date', 'rest'] }[slot.kind] || []));
      acts.forEach(aid => {
        const a = SH.AC[aid];
        if (!a || !(a.slots || []).includes(slot.kind) || !SH.actionOk(st, a)) return;
        if (aid === 'eve_date') {
          const need = slot.kind === 'evening' && st.mode === 'week' ? 3 : 1;   // 11-13 뼈대: 평일 밤 데이트는 썸(3단계)부터 · 주말은 지금처럼 (평일 = 일 · 주말 = 사람)
          const who = ppl.filter(c => st.rel[c] && st.rel[c].st >= need && SH.CH[c].group === 'romance');
          /* 139(11-14 대표님 '호감도가 매우 낮은데 벌써 데이트란 표현이 어색 · 가벼운 대사로 · 데이트는 특정 호감도 이상' → 질문 카드 '둘 다'):
             호감 20 전(첫 단계)에는 '차 한잔' 같은 가벼운 만남(값 싸고 호감 조금) · '데이트'라는 말과 데이트 값은 둘째 단계(호감 20)부터 */
          who.forEach(c => { const light = st.rel[c].st < 2, cost = light ? SH.R.date_light_cost : SH.R.date_cost, nm = light ? (UL().LIGHT_MEET[p.id] || UL().ACT_LABEL.light) : UL().ACT_LABEL.date;
            out.push({ place: p.id, action: aid, who: c, light, label: `${nm} — ${SH.name(c)}`, sub: light ? summary(a, `돈 −${SH.won(cost)}`).replace('♥♥', '♥') : summary(a, `돈 −${SH.won(cost)}`), ok: st.s.money >= cost, why: '돈이 모자람' }); });
          return;
        }
        if (aid === 'wk_study') {
          /* 132(11-14 대표님 '서점에서 할 만한 행동이 아님 · 다른 장소도 모두 점검'): 공부 갈래의 이름 · 가짓수를 장소에 맞춤(서점엔 책 두 가지 · 자취방은 셋) */
          (UL().STUDY_ACT[p.id] || UL().ACT_LABEL.study).forEach(([k, nm]) =>
            out.push({ place: p.id, action: aid, variant: k, label: nm, sub: summary(a, `돈 −${SH.won(-a.money)}`) }));
          return;
        }
        if (aid === 'eve_shop') { out.push({ place: p.id, action: aid, label: SH.shopOf && SH.shopOf(p.id) ? SH.fillKeys(UL().ACT_LABEL.shop_look, { shop: SH.shopOf(p.id).ko }) : UL().ACT_LABEL.shop_none, sub: UL().ACT_LABEL.shop_sub }); return; }
        /* 132: 같은 행동도 장소마다 그 자리에서 할 만한 말로(셈은 그대로 · 이름만) — 표에 없으면 예전 이름 */
        const lab = (UL().PLACE_ACT[p.id] || {})[aid] || UL().ACT_LABEL.act[aid] || a.name_ko;
        out.push({ place: p.id, action: aid, label: lab, sub: summary(a, a.money < 0 ? `돈 −${SH.won(-a.money)}` : (a.money_options && a.money_options.options ? `밥값 ${SH.won(-(a.money_options.options[0].amount))}` : ''), aid === 'lunch_meet' ? ppl.some(c => st.rel[c] && st.rel[c].st >= 1 && c !== 'boss') : undefined) });
        // 귀띔을 받은 다음 주: 그 종목으로 리서치 보고서 (아직 안 열렸어도 이 칸만)
        if (aid === 'work_research') SH.activeHints(st).forEach(h => out.push({ place: p.id, action: aid, variant: 'hint', hint: h,
          label: SH.fillKeys(UL().ACT_LABEL.tip, { stock: (SH.STOCK[h.stock] || {}).name_ko }), sub: UL().ACT_LABEL.tip_sub }));
      });
    });
    // 데이트 사다리(11-13 뼈대 2절): 호감 문턱을 넘은 사람과의 다음 데이트 장면은 주말에 그 약속 자리에서 — 그 사람의 보통 데이트 칸은 장면으로 바꿈
    if (slot.kind === 'weekend') SH.romanceIds().forEach(c => {
      const nd = SH.nextDate(st, c); if (!nd || !nd.ready) return;
      if (nd.ev.when.day && slot.day && nd.ev.when.day !== slot.day) return;   // 대사가 그 요일로 쓰여 있음
      for (let i = out.length - 1; i >= 0; i--) if (out[i].action === 'eve_date' && out[i].who === c) out.splice(i, 1);
      out.push({ place: nd.ev.when.place || 'home_studio', action: 'eve_date', who: c, date: nd.ev.id, label: `약속 — ${SH.name(c)}`,
        sub: summary(SH.AC.eve_date, `돈 −${SH.won(SH.R.date_cost)}`), ok: st.s.money >= SH.R.date_cost, why: '돈이 모자람' });
    });
    // 집은 늘 있음 (밤 · 주말 쉼)
    if (!out.some(o => o.action === 'rest') && (slot.kind === 'evening' || slot.kind === 'weekend'))
      out.push({ place: 'home_studio', action: 'rest', label: '쉼', sub: summary(SH.AC.rest) });
    // 같은 귀띔 변형은 하나만 (사무실 · 리서치센터 겹침)
    const seenV = new Set();
    return out.filter(o => { if (o.variant !== 'hint') return true; const k = o.hint.from; if (seenV.has(k)) return false; seenV.add(k); return true; })
      .map(o => Object.assign({ ok: true }, o));
  };
  /* ── 데이트 사다리 ── 카드 묶음 '이벤트_카드_데이트.md'(trigger: date) · 사람마다 파일 차례대로 한 장씩 */
  SH.romanceIds = () => Object.keys(SH.CH).filter(c => SH.CH[c].group === 'romance');
  SH.dateCards = c => SH.EVENTS.filter(e => e.trigger === 'date' && (e.who || [])[0] === c);
  const needOf = (e, c) => Number(String(((e.requires || {}).affection || {})[c] || '0').replace(/[^\d]/g, '')) || 0;
  SH.nextDate = function (st, c) {
    const r = st.rel[c]; if (!r || r.st < 1) return null;
    const list = SH.dateCards(c), k = list.findIndex(e => st.seen[e.id] == null); if (k < 0) return null;
    const ev = list[k], need = needOf(ev, c), prev = k ? needOf(list[k - 1], c) : 0;
    return { ev, need, prev, step: k + 1, ready: !r.q && SH.reqOk(st, ev.requires) };
  };
  // 사람 카드에 보일 '다음 약속까지 ●●○' — 앞 약속 문턱에서 이번 문턱까지 세 칸
  SH.dateMeter = function (st, c) {
    const nd = SH.nextDate(st, c); if (!nd) return null;
    const r = st.rel[c], span = Math.max(1, nd.need - nd.prev);
    return { ready: nd.ready, n: nd.ready ? 3 : Math.max(0, Math.min(2, Math.floor((r.aff - nd.prev) / span * 3))), need: nd.need, q: !!r.q };
  };
  // 153(11-14 대표님 '약속은 정확히 무슨 월 무슨 주 언제인지가 나오면 좋겠음 · 그래야 기억을 해둠'): 약속의 때 —
  //   주 마디는 그 요일 칸이 아직 안 지났으면 이번 주, 지났으면 다음 주(안 가면 한 주씩 밀림) · 달 마디는 이번 달 안
  SH.dateWhen = function (st, c) {
    const nd = SH.nextDate(st, c); if (!nd || !nd.ready) return null;
    const day = nd.ev.when.day || '', place = nd.ev.when.place || 'home_studio', pk = String((SH.PL[place] || {}).name_ko || '약속 자리').replace(/\(.*\)/, '').trim();
    const say = SH.fill(nd.ev.invite || '주말에 시간 되느냐고 묻는다.', st);
    if (st.mode !== 'week') return { ev: nd.ev, place, placeKo: pk, say, when: `${SH.dateLabel(st)} 안에`, short: '이번 달', next: false };
    const idx = SH.SLOTS.findIndex(s => s.kind === 'weekend' && (!day || s.day === day)), late = st.phase === 'monday' ? false : (st.si || 0) > idx;
    const wk = SH.dateLabel(late ? { mode: 'week', date: SH.addDays(st.date, 7) } : st).replace(/^\d+년 /, '');
    return { ev: nd.ev, place, placeKo: pk, say, when: `${wk} ${day ? day + '요일' : '주말'}`, short: `${late ? '다음 주 ' : ''}${day ? day + '요일' : '주말'}`, next: late };
  };
  // 그 사람이 먼저 연락 — 약속이 열린 주의 토요일 앞에 쪽지 한 번(카드의 invite 글)
  SH.dateInvites = function (st) {
    const out = [];
    SH.romanceIds().forEach(c => {
      const nd = SH.nextDate(st, c); if (!nd || !nd.ready || st.flags['invited_' + nd.ev.id]) return;
      st.flags['invited_' + nd.ev.id] = true;
      const w = SH.dateWhen(st, c);
      out.push({ t: 'notice', title: `${SH.name(c)} — 연락이 왔다`, text: w.say + (st.mode === 'week' ? ` (약속: ${w.when} · ${w.placeKo})` : ` (이번 달 지도에 '약속 — ${SH.name(c)}')`), kind: 'love' });
    });
    return out;
  };
  SH.activeHints = (st) => st.hints.filter(h => st.tick > h.tick && st.tick <= h.tick + h.weeks && !h.used);

  /* ── 업무 성공률 ── */
  SH.successRate = function (st, a, minus) {
    const R = SH.ACTION_RULES.success_rate, sx = a.success || {};
    let p = R.base + (st.s[sx.main_stat] || 0) * R.main_mult + (sx.sub_stats || []).reduce((t, k) => t + (st.s[k] || 0) * R.sub_mult, 0);
    if (st.s.stress >= R.stress_over) p -= R.stress_penalty;
    else if (st.mode === 'week' && SH.R.stress_mid != null && st.s.stress >= SH.R.stress_mid) p -= SH.R.stress_mid_penalty;   /* 156: 주 마디 — 80 앞에 한 계단(60) */
    if (st.mode === 'week' && SH.R.hp_low != null) p -= st.s.hp <= SH.R.hp_floor ? SH.R.hp_floor_penalty : st.s.hp <= SH.R.hp_low ? SH.R.hp_low_penalty : 0;   /* 156: 지치면 일이 안 풀림 */
    if (st.wk && st.wk.hangover) p -= R.hangover_penalty;
    p -= (minus || 0);
    return SH.clamp(Math.round(p), R.clamp[0], R.clamp[1]);
  };

  /* ── 행동 하나 하기 ── 돌려줌: 결과 글 몇 줄 (화면 토스트) */
  SH.doAction = function (st, opt, slot, withCard) {
    const a = SH.AC[opt.action];
    const res = [];
    if (!a) { SH.err(st, `없는 행동 ${opt.action}`); return res; }
    const e = a.effects || {};
    const whyL = a.name_ko || a.id;
    SH.withWhy(whyL, () => { for (const k in e) SH.addStat(st, k, e[k]); });
    // 돈
    let money = typeof a.money === 'number' ? a.money : 0;
    if (a.money_options && a.money_options.options) money = a.money_options.options[0].amount;
    if (a.id === 'eve_date') money = -(opt.light ? SH.R.date_light_cost : SH.R.date_cost);
    if (money) { SH.addMoney(st, money, whyL); res.push(`돈 ${SH.won(money)}`); }
    const W = st.wk;
    // 업무
    if (a.id.startsWith('work_') || a.id === 'eve_overtime') {
      const base = a.id === 'eve_overtime' ? (SH.AC[W.lastWork || 'work_sales']) : a;
      const rate = SH.successRate(st, base, 0);   // 11-13 뼈대: 금요일 밤 칸을 없애 야근 기회가 한 번 줄어 → 야근 성공률 깎기(−10%)를 뺌(평일 = 일 무게)
      const ok = SH.chance(st, rate);
      const prog = ok ? SH.ACTION_RULES.task_progress.on_success : SH.ACTION_RULES.task_progress.per_work;
      if (st.task) st.task.progress += prog;
      W.works++;
      if (a.id === 'eve_overtime') {
        const main = (base.success || {}).main_stat; if (main) SH.addStat(st, main, 1);
        SH.addAff(st, 'boss', SH.R.boss_overtime); W.overtimes++;
        if (ok) SH.addStat(st, 'rep', 1);   // 11-13 뼈대: 평일 = 일 무게 · 야근할 밤이 한 번으로 줄어 야근 성공에 평판 +1
        if (SH.mile(st, 'intern_first_overtime')) res.push('첫 야근');
      } else {
        W.lastWork = a.id;
        if (ok && a.rep && a.rep.on_success) SH.addStat(st, 'rep', a.rep.on_success);
      }
      res.push(`${a.name_ko} ${ok ? '성공' : '그럭저럭'} · 과제 +${prog}`); W.workRes = { ok, prog, rate, name: a.name_ko };
      W.hangover = false;
      if (opt.variant === 'hint' && opt.hint) {
        const h = st.hints.find(x => x.from === opt.hint.from && !x.used); if (h) h.used = true;
        const hit = SH.chance(st, (opt.hint.acc || 1) * 100);
        W.hintReport = { hit, stock: opt.hint.stock };
        if (hit) { SH.addStat(st, 'rep', SH.R.tip_hit_rep); SH.addAff(st, 'boss', SH.R.tip_hit_boss); res.push('귀띔이 맞았다!'); }
        else res.push('귀띔이 빗나갔다');
      }
    }
    if (a.id === 'eve_drinks') W.hangover = true;
    if (a.id === 'wk_study' && opt.variant) SH.addStat(st, opt.variant, a.skill_extra.choose_one || 4);
    if (a.id === 'wk_gym' && st.body < 10) { st.body++; SH.addStat(st, 'style', 1); }
    if (a.id === 'rest') { const home = SH.SHOP[st.equip.home]; if (home && home.slot === 'home') SH.addStat(st, 'hp', Math.max(0, home.tier) + (home.tier >= 3 ? 1 : 0)); }
    if (a.id === 'eve_shop') { /* 가게 화면은 흐름이 엶 */ }
    // 데이트 · 만남 (카드가 나온 칸은 카드 효과만 — 그 인물의 만남 오름은 뺌)
    if (a.id === 'eve_date' && opt.who) {
      const d = opt.light ? SH.R.date_light_affection : SH.R.date_affection + (slot.kind === 'weekend' ? SH.R.date_weekend_extra : 0);
      if (!(withCard && withCard.who && withCard.who.includes(opt.who))) { SH.meet(st, opt.who, d); res.push(`${SH.name(opt.who)} ♥`); }
    }
    if (a.id !== 'eve_date' && a.id !== 'rest' && a.id !== 'wk_study' && a.id !== 'wk_gym') {
      SH.peopleAt(st, opt.place, slot).forEach(cid => {
        if (withCard && (withCard.who || []).includes(cid)) return;
        if (cid === 'boss') return;                       // 부장은 결산으로만
        const d = SH.meetGain(st, cid);
        if (d > 0 && SH.meet(st, cid, d)) res.push(`${SH.name(cid)} ♥`);
      });
    }
    W.picks.push({ slot: slot.k, place: opt.place, action: opt.action, label: opt.label });
    return res;
  };
  // 만남 오름: 기본 +3 · 끌리는 태그 하나 +2 · 싫은 태그 하나 −3 (첫 만남 전 · 다툼 중이면 없음)
  SH.meetGain = function (st, cid) {
    const r = st.rel[cid], c = SH.CH[cid];
    if (!r || r.st < 1 || r.q) return 0;
    const t = SH.tags(st);
    let d = SH.R.meet_base;
    (c.likes || []).forEach(x => { if (t.has(x)) d += SH.R.meet_like; });
    (c.dislikes || []).forEach(x => { if (t.has(x)) d += SH.R.meet_dislike; });
    return d;
  };
  // 만남 연타 막이(11-13 대표님 '나머지는 추천대로' · 리서치 딥2 공식 ④3 — 스타듀 '대화 하루 한 번'):
  //   한 마디에 같은 사람을 또 만나면 오름 절반(올림) · 만남으로 오르는 합은 한 마디 meet_tick_cap 까지 · 선물(gift)은 이 셈 밖
  SH.meet = function (st, cid, d, gift) {
    const r = st.rel[cid]; if (!r) return 0;
    r.met = st.tick;
    if (!gift && d > 0) {
      const W = st.wk, n = (W.meetN = W.meetN || {})[cid] || 0, cap = SH.R.meet_tick_cap;
      W.meetN[cid] = n + 1;
      if (n >= 1) d = Math.ceil(d / 2);
      d = Math.max(0, Math.min(d, cap - ((W.metUp = W.metUp || {})[cid] || 0)));
      W.metUp[cid] = (W.metUp[cid] || 0) + d;
      if (!d) return 0;
    }
    st.wk.met[cid] = (st.wk.met[cid] || 0) + SH.addAff(st, cid, d);
    return d;
  };
})(typeof window !== 'undefined' ? window : globalThis);
