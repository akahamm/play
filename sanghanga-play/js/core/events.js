/* =====================================================================
   events.js — 이벤트 판정과 결과
   카드 양식(이벤트_카드_1막 1절): when(year·week·day·slot·place) · trigger(auto·enter·chain·settle)
   · requires · once · priority · group · lines([if …] 조건 줄) · choices(requires·effects·reply·next) · effects · next · unlocks
   - 한 칸에 카드 한 장(priority 큰 것) + 그 카드가 부르는 chain
   - group: 같은 묶음에서 평생 한 장
   - 1막 밖 카드(루트 카드 묶음)는 when.year · when.month · when.quarter 로 마디를 가림
   ===================================================================== */
(function (root) {
  const SH = root.SH = root.SH || {};
  const WEEKDAY = ['월', '화', '수', '목', '평일'];

  // 심사·결산 코드가 직접 부르는 카드 — 칸마다 고르는 판정에서는 뺌
  SH.CODE_CALLED = new Set([SH.CODE_CARDS.pass, SH.CODE_CARDS.fail, SH.CODE_CARDS.ext]);
  // 카드 조건 밖에 코드가 따로 보는 것(카드의 _notes 에 '코드가 봄'이라 적힌 것) — 카드 id 와 그 판정은 이름표(rules/game.js 의 SH.CODE_GATES)에 둠(뼈대에 카드 이름을 안 씀 · 11-15 검토 6 지적 1)
  const CODE_GATES = SH.CODE_GATES || {};

  /* ── 비교 ">=선배" · ">=10" ── */
  function cmp(a, op, b) {
    switch (op) { case '>=': return a >= b; case '<=': return a <= b; case '>': return a > b; case '<': return a < b; case '!=': return a !== b; default: return a === b; }
  }
  function splitOp(v) {
    const m = /^\s*(>=|<=|==|!=|>|<|=)?\s*(.+?)\s*$/.exec(String(v));
    return { op: m[1] || '>=', val: m[2] };
  }

  /* ── 조건(requires) ── 돌려줌: { ok, statOnly(모자란 게 숫자뿐인가), why[] } */
  SH.reqCheck = function (st, req) {
    const out = { ok: true, statOnly: true, why: [] };
    if (!req) return out;
    const fail = (stat, why) => { out.ok = false; if (!stat) out.statOnly = false; if (why) out.why.push(why); };
    for (const k in req) {
      const v = req[k];
      if (k === '_notes') continue;
      if (k === 'stage') {
        for (const cid in v) { if (cid === '_notes') continue;
          const { op, val } = splitOp(v[cid]); const r = st.rel[cid];
          if (!r || !cmp(r.st, op, SH.stageIdx(cid, val))) fail(false); }
      } else if (k === 'affection') {
        for (const cid in v) { const { op, val } = splitOp(v[cid]); const r = st.rel[cid];
          if (!r || !cmp(r.aff, op, Number(val))) fail(false); }
      } else if (k === 'stat') {
        for (const sk in v) { const { op, val } = splitOp(v[sk]);
          if (!cmp(SH.numOf(st, sk), op, Number(val))) {
            const nm = (SH.D.stats.items.find(x => x.id === sk) || {}).name_ko || sk;
            fail(true, sk === 'money' ? `돈 ${SH.won(Number(val))} 필요` : `${nm} ${val} 필요`);
          } }
      } else if (k === 'flags') {
        (v || []).forEach(f => { const neg = f[0] === '-'; const name = neg ? f.slice(1) : f;
          if (!!st.flags[name] === neg) fail(false); });
      } else if (k === 'seen') {
        (v || []).forEach(id => { if (st.seen[id] == null) fail(false); });
      } else if (k === 'weeks_since') {
        for (const id in v) { const { op, val } = splitOp(v[id]);
          if (st.seen[id] == null || !cmp(st.tick - st.seen[id], op, Number(val))) fail(false); }
      } else if (k === 'task') {
        if (!st.task || st.task.id !== v) fail(false);
      } else if (k === 'any') {
        if (!(v || []).some(sub => SH.reqCheck(st, sub).ok)) fail(false);
      } else if (k === 'rank') {           // '사원' = 지금 그 직급 · '>=차장' = 사다리 순서로 그 이상
        const m = /^\s*(>=|<=|>|<|==|=)?\s*(.+?)\s*$/.exec(String(v)); const rid = SH.RANK_BY_NAME[m[2]] || m[2];
        const a = SH.RANK_ORDER.indexOf(st.rank), b = SH.RANK_ORDER.indexOf(rid);
        // 연산자 없이 직급만 적힌 조건: 달 마디(돈 고리)에선 진급이 성적으로 정해져 이야기의 때보다 한 칸 앞설 수 있음 → 그 직급 또는 바로 위까지 맞음
        if (!(m[1] ? (a >= 0 && cmp(a, m[1] === '=' ? '==' : m[1], b)) : (st.rank === rid || (st.L && st.mode !== 'week' && a >= 0 && b >= 1 && a === b + 1)))) fail(false);
      } else if (k === 'count') {
        for (const c in v) { const { op, val } = splitOp(v[c]); if (!cmp(st.counts[c] || 0, op, Number(val))) fail(false); }
      } else if (k === 'flags_not') {
        (v || []).forEach(f => { if (st.flags[f]) fail(false); });
      } else if (k === 'owns') {
        (v || []).forEach(o => { if (!SH.owns(st, o)) fail(false); });
      } else if (k === 'quarrel') {
        for (const cid in v) { const r = st.rel[cid]; if (!r || !!r.q !== !!v[cid]) fail(false); }
      } else {
        fail(false);       // 모르는 조건 키는 '안 맞음'으로 (검사기가 잡음)
      }
    }
    return out;
  };
  SH.reqOk = (st, req) => SH.reqCheck(st, req).ok;
  // 숫자 칸: 숫자 키 · 돈 칸 나눔(A8) · 실력 평균
  SH.numOf = (st, k) => k === 'skill_avg' ? SH.skillAvg(st) : (k in st.s ? st.s[k] : (st.funds[k] || 0));
  SH.owns = (st, o) => st.owned.includes(o) || st.owned.some(id => { const it = SH.item(id); return it && it.slot === o && (it.tier || 0) > 0; });

  /* ── 대사 조건 줄 [if …] ── 쓰는 말: week · flags.x · stage.x >= 단계 · task.success/fail · hint.hit · and · or · not */
  SH.condOk = function (st, cond) {
    if (!cond) return true;
    return String(cond).split(/\s+or\s+/).some(orPart => orPart.split(/\s+and\s+/).every(term => {
      term = term.trim(); let neg = false;
      if (term.startsWith('not ')) { neg = true; term = term.slice(4).trim(); }
      let v = false, m;
      if ((m = /^week\s*(==|>=|<=|>|<|!=)\s*(\d+)$/.exec(term))) v = cmp(st.week, m[1], +m[2]);
      else if ((m = /^flags\.(\w+)$/.exec(term))) v = !!st.flags[m[1]];
      else if ((m = /^stage\.(\w+)\s*(>=|<=|==|>|<)\s*(.+)$/.exec(term))) v = !!st.rel[m[1]] && cmp(st.rel[m[1]].st, m[2], SH.stageIdx(m[1], m[3].trim()));
      else if (term === 'task.success') v = !!(st.wk && st.wk.taskOk === true);
      else if (term === 'task.fail') v = !!(st.wk && st.wk.taskOk === false);
      else if (term === 'hint.hit') v = !!(st.wk && st.wk.hintReport && st.wk.hintReport.hit);
      else if ((m = /^count\.(\w+)\s*(>=|<=|==|>|<|=)\s*(-?\d+)$/.exec(term))) v = cmp(st.counts[m[1]] || 0, m[2] === '=' ? '==' : m[2], +m[3]);
      else if ((m = /^stage\.(\w+)\s*=\s*(.+)$/.exec(term))) v = !!st.rel[m[1]] && st.rel[m[1]].st === SH.stageIdx(m[1], m[2].trim());
      else if ((m = /^rank\s*(>=|<=|==|>|<|=)\s*(.+)$/.exec(term))) v = cmp(SH.RANK_ORDER.indexOf(st.rank), m[1] === '=' ? '==' : m[1], SH.RANK_ORDER.indexOf(SH.RANK_BY_NAME[m[2].trim()] || m[2].trim()));
      else if ((m = /^owns\.(\w+)$/.exec(term))) v = SH.owns(st, m[1]);
      else if ((m = /^quarrel\.(\w+)$/.exec(term))) v = !!(st.rel[m[1]] && st.rel[m[1]].q);
      else if ((m = /^cash\.(company|mine)\s*(>=|<=|>|<)\s*([\d.]+)$/.exec(term))) v = cmp(SH.cashRatio(st, m[1] === 'company' ? 'co' : 'me'), m[2], +m[3]);
      else if ((m = /^(\w+)\s*(>=|<=|==|>|<)\s*(-?\d+)$/.exec(term)) && (m[1] in st.s || m[1] in st.funds)) v = cmp(SH.numOf(st, m[1]), m[2], +m[3]);
      else SH.err(st, `모르는 대사 조건 '${term}'`);
      return neg ? !v : v;
    }));
  };

  /* ── 언제(when) 맞나 ── ctx: { phase:'monday'|'slot'|'settle'|'tick', slot, day, place } */
  function weekOk(st, ev) {
    const wr = ev.when && ev.when.week_range;
    if (!wr) return true;
    let [a, b] = wr;
    if (b === SH.internWeeks() && st.ext) b = SH.internExtEnd();          // 끝이 인턴 끝 주면 연장 넉 주에도 나옴
    return st.week >= a && st.week <= b;
  }
  function rangeHas(v, x) {                    // 3 · "3-5" · [3,5]
    if (v == null) return true;
    if (Array.isArray(v)) return v.includes(x);
    const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(v));
    if (m) return x >= +m[1] && x <= +m[2];
    return Number(String(v).replace(/\D/g, '')) === x;
  }
  SH.whenOk = function (st, ev, ctx) {
    const w = ev.when || {};
    if (ev._act != null && ev._act !== st.act) return false;
    if (st.mode === 'week') {
      if (ev._act == null && w.week == null) return false;   // 막이 안 정해진 카드(루트 묶음)는 달·분기 마디에서만
      if (!weekOk(st, ev)) return false;
    } else {
      if (ev._act === 1) return false;
      const ms = SH.tickMonths(st);
      if (w.year != null && !ms.some(x => rangeHas(w.year, x.y))) return false;
      if (w.month != null && !ms.some(x => (w.year == null || rangeHas(w.year, x.y)) && rangeHas(w.month, x.m))) return false;
      if (w.quarter != null && !ms.some(x => rangeHas(w.quarter, Math.ceil(x.m / 3)))) return false;
      if (w.rank != null) { const rid = SH.RANK_BY_NAME[w.rank] || w.rank, a = SH.RANK_ORDER.indexOf(st.rank), b = SH.RANK_ORDER.indexOf(rid); if (!(st.rank === rid || (st.L && a >= 0 && b >= 1 && a === b + 1))) return false; }
    }
    // 칸
    if (ctx.phase === 'settle') return w.slot === '결산';
    if (w.slot === '결산') return false;
    if (ctx.phase === 'tick') return true;               // 달·분기 마디: 칸 구분 없이 마디에 하나
    if (w.slot && w.slot !== ctx.slot) return false;
    // 요일
    const d = w.day;
    if (ctx.phase === 'monday') { if (d !== '월') return false; }
    else if (d) {
      if (ctx.day === '평일') { if (!WEEKDAY.includes(d) || (d === '월' && w.slot === '출근')) return false; }
      else if (ctx.day === '금') { if (d !== '금') return false; }
      else if (ctx.day === '토' || ctx.day === '일') { if (!(d === ctx.day || d === '주말')) return false; }
    }
    if (ctx.place && w.place && w.place !== ctx.place) return false;
    return true;
  };

  SH.cardFree = (st, ev) => !(ev.once && st.seen[ev.id] != null) && !(ev.group && st.groups[ev.group]);

  // 칸 하나에 나올 카드 한 장 (priority 큰 것부터)
  SH.pickCard = function (st, trigger, ctx) {
    const list = SH.EVENTS.filter(ev => ev.trigger === trigger && !SH.CODE_CALLED.has(ev.id) && SH.cardFree(st, ev)
      && SH.whenOk(st, ev, ctx) && SH.reqOk(st, ev.requires) && (!CODE_GATES[ev.id] || CODE_GATES[ev.id](st)));
    list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return list[0] || (trigger === 'auto' ? SH.pickPool(st, ctx) : null);   // 줄거리 카드가 없는 빈 칸만 소사건이 채움
  };

  // ── 소사건 풀(11-13 리서치 2판 — 다시 하기: 몬스터 프롬 '한 판에 일부만' · Reigns 무게 뽑기 · 스토리렛 쿨다운) ──
  // 소사건 전용 씨앗 st.rp — 주식 · 수익률 주사위(st.rs) 순서를 건드리지 않음 · 새 판은 newGame 이, 옛 저장은 읽을 때(save.js migrate) 채움
  SH.rngPool = function (st) {
    return SH.mul32(st, 'rp');
  };
  // when.month(11-13 명절 · 연말): 이 마디가 덮는 달 중 하나라도 맞으면 · 인턴 주 마디는 그 주의 달
  const poolWhen = (ev, y, ctx, st) => { const w = ev.when || {}; return (w.year == null || rangeHas(w.year, y)) && (!w.slot || w.slot === ctx.slot)
    && (w.month == null || SH.tickMonths(st).some(x => rangeHas(w.month, x.m))); };
  SH.pickPool = function (st, ctx) {
    if (!SH.R.pool_on || !ctx || ctx.phase !== 'slot' || st.poolTick === st.tick) return null;   // 마디당 한 장
    const y = SH.parseDate(st.date).getFullYear(), pc = st.pc || {};
    const list = SH.EVENTS.filter(ev => ev.trigger === 'pool' && (pc[ev.id] || 0) < (ev.max || 2)
      && (st.seen[ev.id] == null || st.tick - st.seen[ev.id] >= (ev.cooldown || 8)) && poolWhen(ev, y, ctx, st) && SH.reqOk(st, ev.requires));
    const must = list.find(ev => ev.must);   // 명절 · 연말: 그 달 칸이 오면 확률 없이 먼저(대표님 '그 달에만 꼭')
    if (must) { st.poolTick = st.tick; return must; }
    if (!list.length || SH.rngPool(st) * 100 >= ((st.mode !== 'week' && SH.R.pool_chance_month) || SH.R.pool_chance || 0)) return null;      // 달 마디는 따로 둔 확률(인턴 열두 주는 그대로)
    const wt = (ev) => (ev.weight || 10) * (st.seen[ev.id] == null ? 2 : 1);   // 이 판에 아직 안 본 카드는 두 배
    let r = SH.rngPool(st) * list.reduce((a, ev) => a + wt(ev), 0);
    st.poolTick = st.tick;   // 뽑는 순간 찍음 — 풀기 전에 새로고침해도 같은 마디에 다시 안 뽑힘(위험 검토 11-13)
    for (const ev of list) { r -= wt(ev); if (r < 0) return ev; }
    return list[list.length - 1];
  };

  // 이 카드가 칸 행동을 대신하나 (고르기에 칸 행동이 적힌 카드 — 카드 _notes 에 '대신함')
  SH.consumesSlot = (ev) => /대신함/.test(((ev._notes || {}).trigger) || '');

  /* ── 화면에 보일 대사 · 고르기 ── */
  SH.parseLine = function (s) {          // "analyst@미소: …" → {speaker, expr, text}
    const t0 = String(s); let cond = null, body = t0;
    const ci = /^\s*\[if\s+([^\]]+)\]\s*/.exec(body); if (ci) { cond = ci[1]; body = body.slice(ci[0].length); }
    const m = /^\s*((?:tag:[^:：@]+)|[a-z_]+)(?:@([^:：]+))?\s*[:：]\s*([\s\S]*)$/.exec(body);
    if (!m) return { speaker: 'nar', expr: null, text: body, cond };
    return { speaker: m[1], expr: m[2] || null, text: m[3], cond };
  };
  SH.eventLines = (st, ev) => (ev.lines || []).filter(l => SH.condOk(st, l.cond)).map(l => ({ speaker: l.speaker, expr: l.expr, text: SH.fill(l.text, st) }));
  // 고르기 조건: 숫자가 모자라면 회색(무엇이 모자란지 보임) · 관계·표지 조건이면 숨김 (양식 빈칸 8 가정)
  SH.eventChoices = function (st, ev) {
    return (ev.choices || []).map((c, i) => {
      const r = SH.reqCheck(st, c.requires);
      return { i, text: SH.fill(c.text, st), ok: r.ok, hidden: !r.ok && !r.statOnly, why: r.why.join(' · ') };
    }).filter(c => !c.hidden);
  };

  /* ── 결과(effects) ── 카드 쪽 + 고르기 쪽 둘 다 더함 */
  SH.applyEffects = function (st, eff, src) {
    if (!eff) return;
    for (const k in eff) {
      const v = eff[k];
      if (k === '_notes') continue;
      if (SH.R2_EFFECT && SH.R2_EFFECT[k]) { SH.R2_EFFECT[k](st, v, src); continue; }
      if (SH.STAT_KEYS.includes(k)) {
        const d = SH.withWhy(src && src.title ? `장면 · ${src.title}` : '장면', () => SH.addStat(st, k, v));
        if (k === 'money' || k === 'hp') SH.toast(st, `${k === 'money' ? '돈' : '체력'} ${d >= 0 ? '+' : ''}${k === 'money' ? SH.won(d) : d}`);
      } else if (k === 'affection') {
        for (const cid in v) { const d = SH.addAff(st, cid, v[cid]); if (d) SH.toast(st, `${SH.name(cid)} ${d > 0 ? '♥' : '♡'}`); }
      } else if (k === 'stage') {
        for (const cid in v) SH.setStage(st, cid, v[cid]);
      } else if (k === 'quarrel') {
        for (const cid in v) { const r = st.rel[cid]; if (!r) continue;
          if (v[cid] === 'start' || v[cid] === 'keep') r.q = true; else if (v[cid] === 'end') r.q = false; }
      } else if (k === 'flags') {
        (v || []).forEach(f => { if (f[0] === '-') delete st.flags[f.slice(1)]; else st.flags[f] = st.tick + 1; });
        SH.flagFirsts(st);
      } else if (k === 'task') {
        if (v.start) SH.startTask(st, v.start);
        if (v.replace) { st.taskOverride = v.replace; }
        if (v.result && st.task) st.task.forced = v.result;
        if (v.progress && st.task) st.task.progress += v.progress;
      } else if (k === 'hint' && st.mode !== 'week') {
        SH.loopHint(st, v, src);
      } else if (k === 'hint') {
        const who = src && src.who && src.who[0];
        const tip = (SH.D.stocks.tips || []).find(t => t.person === who && t.accuracy != null);
        st.hints.push({ stock: v.stock, dir: v.dir, from: src ? src.id : null, acc: tip ? tip.accuracy : 1, tick: st.tick, weeks: v.week || v.tick || 1 });
        SH.toast(st, `귀띔 — ${(SH.STOCK[v.stock] || {}).name_ko || v.stock} ${v.dir === 'up' ? '▲' : '▼'}`);
      } else if (k === 'rank') {
        SH.cardRank(st, SH.RANK_BY_NAME[v] || v);
      } else if (k === 'act') {
        st.pendingAct = v;
      } else if (k === 'album') {
        if (v.shot === 'intern_end') SH.addFirstOf(st, SH.D.ui_lines.FIRSTS.intern_pass);
      } else if (k === 'ending') {
        // 끝 고르기 꼴 {pick: [{requires, id}, …]} — 위에서부터 조건 맞는 첫 끝 (R2 양식 더함)
        const id = (v && typeof v === 'object' && v.pick) ? ((v.pick.find(p => SH.reqOk(st, p.requires)) || {}).id) : v;
        if (id) { SH.setEnding(st, id); if (src && src.title) st.endTitle = SH.fill(src.title, st); }
      } else if (k === 'show_cg') {
        st.showCg = v;
      }
    }
  };

  // 기억 표지 → '처음들'(연말 앨범) · 표지 → [제목, 한 줄, 아이콘] — 원본 04_시범/대사/화면_글.json 의 FLAG_FIRSTS(차례 = 앨범에 적히는 차례)
  SH.flagFirsts = function (st) {
    const FLAG_FIRSTS = SH.D.ui_lines.FLAG_FIRSTS;
    for (const f in FLAG_FIRSTS) if (st.flags[f]) SH.addFirst(st, ...FLAG_FIRSTS[f]);
  };

  // 카드 한 장을 고르기 i 로 끝냄 → { reply:[줄], next: 카드 id }
  SH.resolveEvent = function (st, ev, i) {
    const c = (ev.choices || [])[i];
    if (c && !SH.reqOk(st, c.requires)) { SH.err(st, `${ev.id} 고르기 ${i + 1} 조건이 안 맞는데 골랐음`); return { reply: [], next: null }; }   // 효과 · 본 표시 없이 끝(SH.answer 는 이 앞에서 같은 물음을 다시 띄움)
    st.seen[ev.id] = st.tick;
    if (ev.trigger === 'pool') { st.pc[ev.id] = (st.pc[ev.id] || 0) + 1; st.poolTick = st.tick; }
    if (ev.group) st.groups[ev.group] = ev.id;
    SH.applyEffects(st, ev.effects, ev);
    let reply = [];
    if (c) {
      if (/정직/.test(((c._notes || {}).text) || '')) st.honest++;
      SH.applyEffects(st, c.effects, ev);
      reply = (c.reply || []).map(r => typeof r === 'object' && r && !Array.isArray(r) ? r : SH.parseLine(r)).map(l => Object.assign({}, l, { text: SH.fill(l.text, st) })).filter(l => SH.condOk(st, l.cond));
    } else if ((ev.choices || []).length) SH.err(st, `${ev.id} 고르기 ${i} 가 없음`);
    (ev.unlocks || []).forEach(u => { if (u.kind === 'stock') SH.loopUnlock(st, u.id); if (u.kind === 'place') { if (!st.opened[u.id]) { st.opened[u.id] = true; }   /* 알림은 SH.newPlaces 한 곳에서(112) */ } });
    if (st.flags.on_extension) st.ext = true;
    const next = (c && c.next) || ev.next || null;
    if (next && !SH.EV[next]) SH.err(st, `${ev.id} 다음 카드 '${next}' 가 없음`);
    return { reply, next: next && SH.EV[next] ? next : null };
  };

  SH.toast = function (st, t) { (st.toasts = st.toasts || []).push(t); };
})(typeof window !== 'undefined' ? window : globalThis);
