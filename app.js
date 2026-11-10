/* Приложение курса: рендер из COURSE, прогресс в localStorage, экзамен, поиск, заметки. */
(() => {
  "use strict";

  const KEY = "crc:v1";
  const RING_LEN = 113; // 2πr, r=18
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const stripTags = s => String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  /* ── состояние ─────────────────────────────────────────── */
  const defaults = () => ({ v: 1, items: {}, notes: {}, exams: {}, lastStep: 1, lastVisit: 0,
    reminder: { enabled: false, time: "19:00", lastNotified: "" } });
  let state;
  try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch { state = defaults(); }
  state.items = state.items || {};
  state.notes = state.notes || {};
  state.exams = state.exams || {};
  state.reminder = Object.assign({ enabled: false, time: "19:00", lastNotified: "" }, state.reminder || {});

  const save = () => {
    state.lastVisit = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn("localStorage недоступен", e); }
  };

  /* ── подсветка синтаксиса (без зависимостей) ───────────── */
  const KEYWORDS = {
    python: new Set(("def class return if elif else for while in not and or is None True False import from as " +
      "with try except finally raise pass lambda global nonlocal yield assert break continue del async await match case").split(" ")),
    bash: new Set(("cd echo export source if then else fi for do done while read local function set unset " +
      "mkdir cp mv rm ls cat head tail printf git python python3 curl pkill touch").split(" ")),
    json: new Set(("true false null").split(" ")),
  };

  function guessLang(code) {
    const lines = code.split("\n");
    const bashish = lines.filter(l => /^\s*(cd|curl|git|printf|\.venv\/|python3?\b|export|ls|head|kill|touch|mkdir|rm|pkill|source)\b/.test(l)).length;
    if (bashish >= Math.max(1, Math.floor(lines.length / 3))) return "bash";
    if (/^\s*[[{]/.test(code.trim())) return "json";
    return "python";
  }

  function highlight(code, lang) {
    const kw = KEYWORDS[lang] || KEYWORDS.python;
    const re = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|#[^\n]*|\/\/[^\n]*|\b\d+(?:\.\d+)?\b|[A-Za-z_][A-Za-z0-9_]*|\s+|.)/g;
    const parts = Array.from(code.matchAll(re), m => m[0]);
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i];
      if (t.startsWith("#") || t.startsWith("//")) out += `<span class="c">${esc(t)}</span>`;
      else if (/^["']/.test(t)) out += `<span class="s">${esc(t)}</span>`;
      else if (/^\d/.test(t)) out += `<span class="n">${esc(t)}</span>`;
      else if (/^[A-Za-z_]/.test(t)) {
        let j = i + 1;
        while (j < parts.length && /^\s+$/.test(parts[j])) j++;
        const isCall = parts[j] === "(";
        if (kw.has(t)) out += `<span class="k">${esc(t)}</span>`;
        else if (isCall) out += `<span class="n">${esc(t)}</span>`;
        else out += esc(t);
      } else out += esc(t);
    }
    return out;
  }

  /* ── порядок шагов: модули могут загружаться в любом порядке ─ */
  COURSE.steps.sort((a, b) => a.n - b.n);

  /* ── сбор всех пунктов ─────────────────────────────────── */
  const allItems = [];
  COURSE.steps.forEach(step => {
    (step.blocks || []).forEach(b => { if (b.type === "checks") b.items.forEach(it => allItems.push({ id: it.id, step: step.n })); });
    (step.tasks || []).forEach(t => allItems.push({ id: t.id, step: step.n }));
  });
  COURSE.plan.phases.forEach(p => p.todo.forEach(t => allItems.push({ id: t.id, step: "plan" })));

  const stepItems = n => allItems.filter(i => i.step === n);
  const done = id => Boolean(state.items[id]);
  const countDone = list => list.filter(i => done(i.id)).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const examOf = n => (window.EXAMS && window.EXAMS[n]) || [];

  /* ── навигация и прогресс ──────────────────────────────── */
  function renderNav(active) {
    const nav = $("#nav");
    nav.innerHTML = "";
    COURSE.steps.forEach(step => {
      const items = stepItems(step.n);
      const d = countDone(items);
      const ex = state.exams[step.n];
      const b = el("button", "nav-item");
      b.type = "button";
      const examMark = ex ? ` <span class="exam-mark">${ex.score}/${ex.total}</span>` : "";
      b.innerHTML = `
        <span class="nav-num">${String(step.n).padStart(2, "0")}</span>
        <span class="nav-title">${step.title}${examMark}</span>
        <span class="nav-tick${d === items.length && items.length ? " done" : ""}">${d}/${items.length}</span>`;
      if (active === step.n) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => go(`#/step/${step.n}`));
      nav.appendChild(b);
    });
  }

  function renderProgress() {
    const d = countDone(allItems);
    const p = pct(d, allItems.length);
    $("#ringPct").textContent = p + "%";
    $("#ringFg").style.strokeDashoffset = String(RING_LEN - (RING_LEN * p) / 100);
    $("#statChecked").textContent = `${d} / ${allItems.length} пунктов`;
    $("#footNote").textContent = `${d} из ${allItems.length} пунктов · прогресс локальный`;
  }

  /* ── заметки ───────────────────────────────────────────── */
  function noteButton(id, label) {
    const btn = el("button", "note-btn" + (state.notes[id] ? " has" : ""), "✎");
    btn.type = "button";
    btn.dataset.note = id;
    btn.title = state.notes[id] ? "Заметка: " + state.notes[id].t.slice(0, 60) : "Добавить заметку";
    btn.setAttribute("aria-label", label ? `Заметка: ${label}` : "Заметка");
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      noteSheet(id);
    });
    return btn;
  }

  function noteSheet(id) {
    const existing = state.notes[id] ? state.notes[id].t : "";
    $("#sheetTitle").textContent = "Заметка";
    const body = $("#sheetBody");
    body.innerHTML = `
      <div class="hint">ключ пункта: <code>${esc(id)}</code> — заметка привязана к нему и переживает обновления курса</div>
      <textarea id="noteText" rows="7" placeholder="что не понял, что перечитать, что проверить"></textarea>
      <div class="row">
        <button class="btn primary" id="noteSave">Сохранить</button>
        <button class="btn danger" id="noteDel">Удалить</button>
      </div>`;
    $("#noteText").value = existing;
    openSheet();
    $("#noteText").focus();
    $("#noteSave").onclick = () => {
      const t = $("#noteText").value.trim();
      if (t) state.notes[id] = { t, ts: Date.now() };
      else delete state.notes[id];
      save();
      closeSheet();
      refreshNoteButtons();
      toast(t ? "Заметка сохранена" : "Заметка удалена");
    };
    $("#noteDel").onclick = () => {
      delete state.notes[id];
      save();
      closeSheet();
      refreshNoteButtons();
      toast("Заметка удалена");
    };
  }

  function refreshNoteButtons() {
    document.querySelectorAll(".note-btn").forEach(b => {
      const id = b.dataset.note;
      if (!id) return;
      b.classList.toggle("has", Boolean(state.notes[id]));
      b.title = state.notes[id] ? "Заметка: " + state.notes[id].t.slice(0, 60) : "Добавить заметку";
    });
  }

  /* ── код-блоки и задания ───────────────────────────────── */
  function codeBlock(block, anchor) {
    const wrap = el("div", "codewrap");
    if (block.caption) {
      const cap = el("div", "hint");
      cap.style.marginBottom = "6px";
      cap.textContent = block.caption;
      wrap.appendChild(cap);
    }
    const code = (block.lines || []).join("\n");
    const lang = block.lang || guessLang(code);
    const pre = el("pre");
    pre.innerHTML = highlight(code, lang);
    pre.dataset.lang = lang;
    const btn = el("button", "copy", "copy");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "ok";
        btn.classList.add("ok");
        setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("ok"); }, 1400);
      } catch { btn.textContent = "err"; }
    });
    wrap.append(pre, btn);
    if (anchor) wrap.dataset.blk = anchor;
    return wrap;
  }

  function checklist(items, anchorBase) {
    const group = el("div", "checkgroup");
    const head = el("div", "cg-head");
    const d = countDone(items);
    head.innerHTML = `<span>чек-лист</span><span>${d}/${items.length}</span>`;
    group.appendChild(head);
    items.forEach(it => {
      const row = el("div", "check-row");
      row.dataset.blk = `${anchorBase}:${it.id}`;
      const label = el("label", "check");
      const input = el("input");
      input.type = "checkbox";
      input.checked = done(it.id);
      input.dataset.id = it.id;
      input.addEventListener("change", () => {
        if (input.checked) state.items[it.id] = Date.now();
        else delete state.items[it.id];
        save();
        head.lastElementChild.textContent = `${countDone(items)}/${items.length}`;
        renderNav(currentStep());
        renderProgress();
      });
      label.append(input, el("span", "box"), el("span", "txt", it.text));
      row.append(label, noteButton(it.id, stripTags(it.text)));
      group.appendChild(row);
    });
    return group;
  }

  function taskCard(task) {
    const card = el("div", "task");
    card.dataset.blk = `task:${task.id}`;
    const head = el("div", "task-head");
    head.innerHTML = `<span class="task-tag">задание</span><h3>${task.title}</h3>`;
    card.appendChild(head);
    if (task.why) card.appendChild(el("p", "why", task.why));

    const row = el("div", "check-row");
    const label = el("label", "check");
    const input = el("input");
    input.type = "checkbox";
    input.checked = done(task.id);
    input.addEventListener("change", () => {
      if (input.checked) state.items[task.id] = Date.now();
      else delete state.items[task.id];
      save();
      renderNav(currentStep());
      renderProgress();
    });
    label.append(input, el("span", "box"), el("span", "txt", "выполнено"));
    row.append(label, noteButton(task.id, task.title));
    card.appendChild(row);

    if (task.cmd) {
      const wrap = el("div", "codewrap");
      const pre = el("pre");
      pre.innerHTML = highlight(task.cmd, guessLang(task.cmd));
      const btn = el("button", "copy", "copy");
      btn.type = "button";
      btn.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(task.cmd); btn.textContent = "ok"; setTimeout(() => (btn.textContent = "copy"), 1400); }
        catch { btn.textContent = "err"; }
      });
      wrap.append(pre, btn);
      card.appendChild(wrap);
    }
    return card;
  }

  /* ── рендер: шаг ───────────────────────────────────────── */
  function renderStep(n) {
    const step = COURSE.steps.find(s => s.n === n) || COURSE.steps[0];
    const art = $("#article");
    art.innerHTML = "";
    const ex = state.exams[step.n];
    const examInfo = ex ? ` · экзамен ${ex.score}/${ex.total}` : "";
    art.appendChild(el("div", "eyebrow", `шаг ${step.n} · ${stepItems(step.n).length} пунктов${examInfo}`));
    art.appendChild(el("h1", null, step.title));
    art.appendChild(el("p", "lede", step.summary));

    step.blocks.forEach((b, idx) => {
      const anchor = `${step.id}:${idx}`;
      let node = null;
      switch (b.type) {
        case "h2": node = el("h2", null, b.text); break;
        case "h3": node = el("h3", null, b.text); break;
        case "p": node = el("p", null, b.text); break;
        case "ul": {
          node = el("ul");
          b.items.forEach(i => node.appendChild(el("li", null, i)));
          break;
        }
        case "ol": {
          node = el("ol");
          b.items.forEach(i => node.appendChild(el("li", null, i)));
          break;
        }
        case "code": node = codeBlock(b, anchor); break;
        case "note": {
          node = el("div", `note ${b.kind || ""}`);
          const title = b.title ? `<strong>${b.title}</strong><br>` : "";
          node.innerHTML = `<span class="ico">${b.kind === "warn" ? "!" : "▸"}</span><div>${title}${b.text}</div>`;
          break;
        }
        case "checks": node = checklist(b.items, step.id); break;
        default: break;
      }
      if (!node) return;
      if (!node.dataset.blk) node.dataset.blk = anchor;
      art.appendChild(node);
    });

    if (step.tasks && step.tasks.length) {
      art.appendChild(el("h2", null, "Задания"));
      step.tasks.forEach(t => art.appendChild(taskCard(t)));
    }

    if (examOf(step.n).length) {
      const box = el("div", "exam-cta");
      const prevEx = state.exams[step.n];
      box.innerHTML = `<div><strong>Экзамен по шагу ${step.n}</strong><br>
        <span class="hint">${prevEx ? `лучший результат: ${prevEx.score}/${prevEx.total}` : `${examOf(step.n).length} вопроса`} · разбор ответов после проверки</span></div>`;
      const b = el("button", "btn primary", prevEx ? "Пройти заново" : "Начать экзамен");
      b.type = "button";
      b.addEventListener("click", () => go(`#/exam/${step.n}`));
      box.appendChild(b);
      art.appendChild(box);
    }

    const navRow = el("div", "stepnav");
    const prev = el("button");
    prev.innerHTML = `<span class="dir">назад</span>${n > 1 ? COURSE.steps[n - 2].title : "—"}`;
    prev.disabled = n <= 1;
    prev.addEventListener("click", () => go(`#/step/${n - 1}`));
    const next = el("button");
    const isLast = n >= COURSE.steps.length;
    next.innerHTML = `<span class="dir">дальше</span>${isLast ? "План: 7 фаз" : COURSE.steps[n].title}`;
    next.addEventListener("click", () => go(isLast ? "#/plan" : `#/step/${n + 1}`));
    navRow.append(prev, next);
    art.appendChild(navRow);

    state.lastStep = n;
    save();
    document.title = `Шаг ${n}. ${step.title} — курс cost-router`;
    $("#crumbs").textContent = `Шаг ${n} из ${COURSE.steps.length}`;
    renderNav(n);
    renderProgress();
    window.scrollTo(0, 0);
  }

  /* ── рендер: экзамен ───────────────────────────────────── */
  function renderExam(n) {
    const step = COURSE.steps.find(s => s.n === n);
    const qs = examOf(n);
    if (!step || !qs.length) return go("#/step/1");
    const art = $("#article");
    art.innerHTML = "";
    art.appendChild(el("div", "eyebrow", `экзамен · шаг ${step.n}`));
    art.appendChild(el("h1", null, step.title));
    art.appendChild(el("p", "lede", `${qs.length} вопроса. После проверки — разбор каждого ответа.`));

    const prev = state.exams[n];
    if (prev) art.appendChild(el("div", "hint", `предыдущая попытка: ${prev.score}/${prev.total} · ${new Date(prev.ts).toLocaleString("ru-RU")}`));

    const form = el("div", "exam");
    qs.forEach((q, qi) => {
      const card = el("div", "exam-q");
      card.innerHTML = `<div class="q-num">вопрос ${qi + 1} из ${qs.length}</div><h3>${q.q}</h3>`;
      const opts = el("div", "opts");
      q.options.forEach((o, oi) => {
        const lab = el("label", "opt");
        const input = el("input");
        input.type = "radio";
        input.name = `q${qi}`;
        input.value = String(oi);
        lab.append(input, el("span", "opt-mark"), el("span", "opt-txt", o));
        opts.appendChild(lab);
      });
      card.appendChild(opts);
      const fb = el("div", "feedback");
      fb.hidden = true;
      card.appendChild(fb);
      form.appendChild(card);
    });

    const row = el("div", "row");
    row.style.marginTop = "18px";
    const submit = el("button", "btn primary", "Проверить");
    submit.type = "button";
    const retry = el("button", "btn", "Заново");
    retry.type = "button";
    retry.hidden = true;
    row.append(submit, retry);
    form.appendChild(row);
    art.appendChild(form);

    $("#crumbs").textContent = `Экзамен · шаг ${n}`;
    document.title = `Экзамен: ${step.title} — курс cost-router`;
    renderNav(n);
    renderProgress();
    window.scrollTo(0, 0);

    submit.addEventListener("click", () => {
      let score = 0;
      let answered = 0;
      const cards = Array.from(form.querySelectorAll(".exam-q"));
      qs.forEach((q, qi) => {
        const chosen = cards[qi].querySelector(`input[name="q${qi}"]:checked`);
        const fb = cards[qi].querySelector(".feedback");
        const opts = cards[qi].querySelectorAll(".opt");
        opts.forEach(o => o.classList.remove("correct", "wrong"));
        if (chosen) answered++;
        const ok = Boolean(chosen) && Number(chosen.value) === q.a;
        if (ok) score++;
        opts[q.a].classList.add("correct");
        if (chosen && !ok) chosen.closest(".opt").classList.add("wrong");
        fb.hidden = false;
        fb.className = "feedback " + (ok ? "ok" : "bad");
        fb.innerHTML = `<strong>${ok ? "верно" : "неверно"}</strong> — ${q.why}`;
      });
      state.exams[n] = { score, total: qs.length, ts: Date.now() };
      save();
      const result = el("div", "exam-result");
      result.innerHTML = `<strong>${score} из ${qs.length} (${pct(score, qs.length)}%)</strong> · отвечено ${answered}/${qs.length}`;
      form.insertBefore(result, row);
      submit.hidden = true;
      retry.hidden = false;
      renderNav(n);
      renderProgress();
      toast(`Результат: ${score}/${qs.length}`);
    });

    retry.addEventListener("click", () => go("#/exam/" + n));
  }

  function renderExamIndex() {
    const art = $("#article");
    art.innerHTML = "";
    art.appendChild(el("div", "eyebrow", "проверка знаний"));
    art.appendChild(el("h1", null, "Экзамены"));
    art.appendChild(el("p", "lede", "Короткие проверки по каждому шагу. Вопросы — про решения и причины, а не про формулировки."));
    const totalQ = COURSE.steps.reduce((s, st) => s + examOf(st.n).length, 0);
    const passed = Object.values(state.exams).reduce((s, e) => s + e.score, 0);
    art.appendChild(el("div", "hint", `вопросов в курсе: ${totalQ} · правильно в последних попытках: ${passed}`));

    const list = el("div", "exam-index");
    COURSE.steps.forEach(st => {
      const qs = examOf(st.n);
      if (!qs.length) return;
      const row = el("div", "exam-row");
      const ex = state.exams[st.n];
      row.innerHTML = `<div class="exam-row-main"><span class="nav-num">${String(st.n).padStart(2, "0")}</span> ${st.title}</div>
        <div class="exam-row-right"><span class="hint">${ex ? `${ex.score}/${ex.total} (${pct(ex.score, ex.total)}%)` : "не пройден"}</span></div>`;
      const b = el("button", "btn" + (ex ? "" : " primary"), ex ? "Заново" : "Начать");
      b.type = "button";
      b.addEventListener("click", () => go(`#/exam/${st.n}`));
      row.appendChild(b);
      list.appendChild(row);
    });
    art.appendChild(list);
    $("#crumbs").textContent = "Экзамены";
    document.title = "Экзамены — курс cost-router";
    renderNav("exam");
    renderProgress();
    window.scrollTo(0, 0);
  }

  /* ── рендер: план ──────────────────────────────────────── */
  function renderPlan() {
    const art = $("#article");
    art.innerHTML = "";
    art.appendChild(el("div", "eyebrow", "трек B · AI Product Engineer"));
    art.appendChild(el("h1", null, COURSE.plan.title));
    art.appendChild(el("p", "lede", COURSE.plan.lede));

    COURSE.plan.phases.forEach(p => {
      const card = el("div", "phase");
      const items = p.todo;
      const d = countDone(items);
      const top = el("div", "phase-top");
      top.innerHTML = `<div><span class="phase-n">фаза ${p.n}</span><h3>${p.title}</h3></div>
        <span class="meta">${d}/${items.length} · ${p.metric}</span>`;
      card.appendChild(top);
      card.appendChild(el("p", null, p.what));
      const reqs = el("div", "req");
      p.closes.forEach(c => reqs.appendChild(el("span", "tag", c)));
      card.appendChild(reqs);
      card.appendChild(checklist(items, `plan:${p.n}`));
      art.appendChild(card);
    });

    $("#crumbs").textContent = "План трека B";
    document.title = "План: 7 фаз — курс cost-router";
    renderNav("plan");
    renderProgress();
    window.scrollTo(0, 0);
  }

  /* ── поиск ─────────────────────────────────────────────── */
  const index = [];
  function buildIndex() {
    COURSE.steps.forEach(st => {
      index.push({ n: st.n, kind: "шаг", text: st.title, anchor: null, extra: st.summary });
      (st.blocks || []).forEach((b, i) => {
        const anchor = `${st.id}:${i}`;
        if (b.type === "p" || b.type === "note") index.push({ n: st.n, kind: "текст", text: stripTags(b.text), anchor, extra: b.title || "" });
        if (b.type === "h2" || b.type === "h3") index.push({ n: st.n, kind: "раздел", text: stripTags(b.text), anchor, extra: "" });
        if (b.type === "ul" || b.type === "ol") b.items.forEach(t => index.push({ n: st.n, kind: "список", text: stripTags(t), anchor, extra: "" }));
        if (b.type === "code") index.push({ n: st.n, kind: "код", text: stripTags((b.lines || []).join(" ")), anchor, extra: b.caption || "" });
        if (b.type === "checks") b.items.forEach(t => index.push({ n: st.n, kind: "пункт", text: stripTags(t.text), anchor: `${st.id}:${i}:${t.id}`, extra: "" }));
      });
      (st.tasks || []).forEach(t => index.push({ n: st.n, kind: "задание", text: t.title + " " + (t.why || ""), anchor: `task:${t.id}`, extra: t.cmd || "" }));
      examOf(st.n).forEach((q, qi) => index.push({ n: st.n, kind: "экзамен", text: q.q, anchor: null, extra: `вопрос ${qi + 1}` }));
    });
    COURSE.plan.phases.forEach(p => index.push({ n: "plan", kind: "фаза", text: p.title + " " + p.what, anchor: null, extra: p.metric }));
  }
  buildIndex();

  function search(q) {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const words = needle.split(/\s+/);
    return index
      .map(item => {
        const hay = (item.text + " " + (item.extra || "")).toLowerCase();
        let score = 0;
        words.forEach(w => { if (hay.includes(w)) score += item.text.toLowerCase().includes(w) ? 3 : 1; });
        return { item, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(r => r.item);
  }

  function searchSheet() {
    $("#sheetTitle").textContent = "Поиск по курсу";
    const body = $("#sheetBody");
    body.innerHTML = `
      <input type="text" id="searchInput" placeholder="например: sys.path, квоты, evals, изоляция" autocomplete="off">
      <div class="hint">↑ ↓ — выбор, Enter — открыть, Esc — закрыть</div>
      <div class="results" id="searchResults"></div>`;
    openSheet();
    const input = $("#searchInput");
    input.focus();
    let current = -1;

    const openResult = r => {
      closeSheet();
      go(typeof r.n === "number" ? `#/step/${r.n}` : "#/plan");
      if (r.anchor) setTimeout(() => flash(r.anchor), 120);
    };

    const render = () => {
      const results = search(input.value);
      const box = $("#searchResults");
      box.innerHTML = "";
      current = -1;
      if (!input.value.trim()) { box.innerHTML = `<div class="hint">введите минимум 2 символа</div>`; return; }
      if (!results.length) { box.innerHTML = `<div class="hint">ничего не найдено</div>`; return; }
      results.forEach(r => {
        const row = el("button", "result");
        row.type = "button";
        const where = typeof r.n === "number" ? `шаг ${r.n}` : "план";
        row.innerHTML = `<span class="res-kind">${r.kind}</span>
          <span class="res-text">${esc(r.text.slice(0, 160))}</span>
          <span class="res-where">${where}</span>`;
        row.addEventListener("click", () => openResult(r));
        box.appendChild(row);
      });
    };

    input.addEventListener("input", render);
    input.addEventListener("keydown", e => {
      const rows = Array.from(document.querySelectorAll("#searchResults .result"));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!rows.length) return;
        current = (current + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
        rows.forEach((r, i) => r.classList.toggle("sel", i === current));
        rows[current].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const pick = rows[current >= 0 ? current : 0];
        if (pick) pick.click();
      }
    });
    render();
  }

  function flash(anchor) {
    const node = document.querySelector(`[data-blk="${CSS.escape(anchor)}"]`);
    if (!node) return;
    node.classList.add("flash");
    const y = node.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
    setTimeout(() => node.classList.remove("flash"), 2600);
  }

  /* ── роутинг ───────────────────────────────────────────── */
  const currentStep = () => {
    const m = location.hash.match(/^#\/step\/(\d+)/);
    const e = location.hash.match(/^#\/exam\/(\d+)/);
    if (m) return Number(m[1]);
    if (e) return Number(e[1]);
    return state.lastStep || 1;
  };

  function go(hash) {
    closeRail();
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    const h = location.hash;
    let m;
    if (h.startsWith("#/plan")) renderPlan();
    else if ((m = h.match(/^#\/exam\/(\d+)/))) renderExam(Math.min(Math.max(1, Number(m[1])), COURSE.steps.length));
    else if (h.startsWith("#/exam")) renderExamIndex();
    else if ((m = h.match(/^#\/step\/(\d+)/))) renderStep(Math.min(Math.max(1, Number(m[1])), COURSE.steps.length));
    else {
      const next = allItems.find(i => !done(i.id));
      const n = next && typeof next.step === "number" ? next.step : 1;
      location.replace(`#/step/${n}`);
    }
  }

  /* ── напоминания ───────────────────────────────────────── */
  function reminderSheet() {
    const body = $("#sheetBody");
    $("#sheetTitle").textContent = "Напоминания";
    const perm = ("Notification" in window) ? Notification.permission : "unsupported";
    body.innerHTML = `
      <p>Два независимых способа. Первый работает, пока вкладка открыта. Второй — настоящий, через календарь.</p>
      <label>время (локальное)
        <input type="time" id="remTime" value="${state.reminder.time}">
      </label>
      <div class="row">
        <button class="btn primary" id="remSave">Сохранить время</button>
        <button class="btn" id="remPerm">Разрешить уведомления</button>
        <button class="btn" id="remTest">Тест</button>
      </div>
      <div class="hint">статус разрешения: <strong>${perm}</strong></div>
      <hr style="border:0;border-top:1px solid #232a33;margin:6px 0">
      <button class="btn" id="remIcs">Скачать .ics для календаря</button>
      <div class="hint">Файл добавляет ежедневное событие со ссылкой на курс. Импортируйте в Google Calendar / iOS / календарь Telegram-бота — напоминание придёт, даже если вкладка закрыта.</div>
      <hr style="border:0;border-top:1px solid #232a33;margin:6px 0">
      <label>состояние
        <select id="remEnabled">
          <option value="off"${state.reminder.enabled ? "" : " selected"}>выключено</option>
          <option value="on"${state.reminder.enabled ? " selected" : ""}>включено (пока вкладка открыта)</option>
        </select>
      </label>`;
    openSheet();

    $("#remSave").onclick = () => {
      state.reminder.time = $("#remTime").value || "19:00";
      save();
      toast(`Время сохранено: ${state.reminder.time}`);
    };
    $("#remEnabled").onchange = e => {
      state.reminder.enabled = e.target.value === "on";
      save();
      toast(state.reminder.enabled ? "Напоминание включено" : "Напоминание выключено");
    };
    $("#remPerm").onclick = async () => {
      if (!("Notification" in window)) return toast("Браузер не поддерживает уведомления");
      const p = await Notification.requestPermission();
      toast("Разрешение: " + p);
      reminderSheet();
    };
    $("#remTest").onclick = () => notify("Проверка связи", "Курс cost-router: уведомления работают.");
    $("#remIcs").onclick = () => downloadIcs();
  }

  function notify(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body, tag: "crc" }); return; } catch {}
    }
    toast(body, 6000);
  }

  function downloadIcs() {
    const [h, m] = (state.reminder.time || "19:00").split(":");
    const now = new Date();
    const dt = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const time = `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const url = location.origin + location.pathname;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//cost-router course//RU", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT", "UID:crc-" + Date.now() + "@course",
      `DTSTAMP:${dt}T${time}Z`, `DTSTART:${dt}T${time}`, "DURATION:PT20M",
      "RRULE:FREQ=DAILY", "SUMMARY:Курс cost-router — следующий шаг",
      `DESCRIPTION:Продолжить обучение: ${url}`, "BEGIN:VALARM", "TRIGGER:-PT5M",
      "ACTION:DISPLAY", "DESCRIPTION:Курс cost-router", "END:VALARM", "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "cost-router-course.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function reminderTick() {
    if (!state.reminder.enabled) return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (state.reminder.lastNotified === today) return;
    const [h, m] = (state.reminder.time || "19:00").split(":").map(Number);
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    const left = allItems.length - countDone(allItems);
    if (!left) return;
    notify("Курс cost-router", `Осталось ${left} пунктов. Продолжим?`);
    state.reminder.lastNotified = today;
    save();
  }

  /* ── данные прогресса ──────────────────────────────────── */
  function dataSheet() {
    const body = $("#sheetBody");
    $("#sheetTitle").textContent = "Данные прогресса";
    const d = countDone(allItems);
    const notes = Object.keys(state.notes).length;
    const exams = Object.keys(state.exams).length;
    const notesList = Object.entries(state.notes)
      .sort((a, b) => b[1].ts - a[1].ts)
      .map(([id, n]) => `<div class="note-line"><code>${esc(id)}</code><div>${esc(n.t).replace(/\n/g, "<br>")}</div></div>`)
      .join("");
    body.innerHTML = `
      <p>Прогресс, заметки и результаты экзаменов лежат в <code>localStorage</code> этого браузера. Очистка кэша его удалит — поэтому делайте экспорт.</p>
      <div class="hint">отмечено: <strong>${d} из ${allItems.length}</strong> · заметок: <strong>${notes}</strong> · экзаменов: <strong>${exams}</strong></div>
      <div class="row">
        <button class="btn primary" id="expBtn">Скачать .json</button>
        <button class="btn" id="impBtn">Импортировать .json</button>
      </div>
      <input type="file" id="impFile" accept="application/json" hidden>
      <div class="hint" id="impHint"></div>
      ${notes ? `<hr style="border:0;border-top:1px solid #232a33;margin:6px 0"><div class="hint">мои заметки</div><div class="notes-list">${notesList}</div>` : ""}
      <hr style="border:0;border-top:1px solid #232a33;margin:6px 0">
      <button class="btn danger" id="resetBtn">Сбросить прогресс</button>`;
    openSheet();

    $("#expBtn").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
      a.download = `cost-router-progress-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    $("#impBtn").onclick = () => $("#impFile").click();
    $("#impFile").onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed || typeof parsed !== "object" || !parsed.items) throw new Error("нет поля items");
        state = Object.assign(defaults(), parsed);
        save();
        closeSheet();
        route();
        toast("Прогресс импортирован");
      } catch (err) {
        $("#impHint").textContent = "Не удалось прочитать файл: " + err.message;
      }
    };
    $("#resetBtn").onclick = () => {
      if (!confirm("Сбросить весь прогресс, заметки и результаты экзаменов? Действие необратимо.")) return;
      state = defaults();
      save();
      closeSheet();
      route();
      toast("Прогресс сброшен");
    };
  }

  /* ── sheet / toast / rail ──────────────────────────────── */
  function openSheet() { $("#sheet").hidden = false; }
  function closeSheet() { $("#sheet").hidden = true; }
  function openRail() { $("#rail").classList.add("open"); $("#scrim").hidden = false; }
  function closeRail() { $("#rail").classList.remove("open"); $("#scrim").hidden = true; }

  let toastTimer;
  function toast(msg, ms = 2600) {
    let t = $("#toast");
    if (!t) {
      t = el("div");
      t.id = "toast";
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:80;background:#161d24;border:1px solid #2a3340;color:#e9ecf1;padding:10px 14px;border-radius:9px;font:13px/1.4 var(--sans);box-shadow:0 8px 30px rgba(0,0,0,.5);max-width:calc(100% - 32px)";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  /* ── старт ─────────────────────────────────────────────── */
  function staleBanner() {
    const d = countDone(allItems);
    const last = state.lastVisit || 0;
    const days = last ? Math.floor((Date.now() - last) / 86400000) : 0;
    if (!d || d >= allItems.length || days < 2) return;
    const next = allItems.find(i => !done(i.id));
    const b = $("#staleBanner");
    b.innerHTML = `<span>Прошло ${days} дн. с последнего захода. Осталось ${allItems.length - d} пунктов.</span>
      <button type="button">${next && typeof next.step === "number" ? `К шагу ${next.step}` : "К плану"}</button>`;
    b.querySelector("button").onclick = () => {
      b.hidden = true;
      go(next && typeof next.step === "number" ? `#/step/${next.step}` : "#/plan");
    };
    b.hidden = false;
  }

  function init() {
    renderNav(currentStep());
    renderProgress();
    staleBanner();

    $("#menuBtn").onclick = () => ($("#rail").classList.contains("open") ? closeRail() : openRail());
    $("#railClose").onclick = closeRail;
    $("#scrim").onclick = closeRail;
    $("#resumeBtn").onclick = () => {
      const next = allItems.find(i => !done(i.id));
      if (!next) return go("#/plan");
      go(typeof next.step === "number" ? `#/step/${next.step}` : "#/plan");
    };
    $("#planBtn").onclick = () => go("#/plan");
    $("#examBtn").onclick = () => go("#/exam");
    $("#remindBtn").onclick = reminderSheet;
    $("#quickRemind").onclick = reminderSheet;
    $("#quickSearch").onclick = searchSheet;
    $("#dataBtn").onclick = dataSheet;
    $("#sheetClose").onclick = closeSheet;
    $("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });

    document.addEventListener("keydown", e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); searchSheet(); return; }
      if (e.key === "/" && !typing) { e.preventDefault(); searchSheet(); return; }
      if (e.key === "Escape") { closeSheet(); closeRail(); }
    });

    window.addEventListener("hashchange", route);
    route();
    setInterval(reminderTick, 30000);
    reminderTick();
    save();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
