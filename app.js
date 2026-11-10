/* Приложение курса: рендер из COURSE, прогресс в localStorage, напоминания. */
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

  /* ── состояние ─────────────────────────────────────────── */
  const defaults = () => ({ v: 1, items: {}, lastStep: 1, lastVisit: 0, reminder: { enabled: false, time: "19:00", lastNotified: "" } });
  let state;
  try {
    state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch { state = defaults(); }
  state.items = state.items || {};
  state.reminder = Object.assign({ enabled: false, time: "19:00", lastNotified: "" }, state.reminder || {});

  const save = () => {
    state.lastVisit = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn("localStorage недоступен", e); }
  };

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

  /* ── рендер: боковая навигация ─────────────────────────── */
  function renderNav(active) {
    const nav = $("#nav");
    nav.innerHTML = "";
    COURSE.steps.forEach(step => {
      const items = stepItems(step.n);
      const d = countDone(items);
      const b = el("button", "nav-item");
      b.type = "button";
      b.innerHTML = `
        <span class="nav-num">${String(step.n).padStart(2, "0")}</span>
        <span class="nav-title">${step.title}</span>
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

  /* ── рендер: шаг ───────────────────────────────────────── */
  function codeBlock(block) {
    const wrap = el("div", "codewrap");
    const pre = el("pre");
    pre.textContent = (block.lines || []).join("\n");
    const btn = el("button", "copy", "copy");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        btn.textContent = "ok";
        btn.classList.add("ok");
        setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("ok"); }, 1400);
      } catch { btn.textContent = "err"; }
    });
    if (block.caption) {
      const cap = el("div", "hint");
      cap.style.marginBottom = "6px";
      cap.textContent = block.caption;
      wrap.appendChild(cap);
    }
    wrap.append(pre, btn);
    return wrap;
  }

  function checklist(items) {
    const group = el("div", "checkgroup");
    const head = el("div", "cg-head");
    const d = countDone(items);
    head.innerHTML = `<span>чек-лист</span><span>${d}/${items.length}</span>`;
    group.appendChild(head);
    items.forEach(it => {
      const label = el("label", "check");
      const input = el("input");
      input.type = "checkbox";
      input.checked = done(it.id);
      input.dataset.id = it.id;
      const box = el("span", "box");
      const txt = el("span", "txt", it.text);
      input.addEventListener("change", () => {
        if (input.checked) state.items[it.id] = Date.now();
        else delete state.items[it.id];
        save();
        const dd = countDone(items);
        head.lastElementChild.textContent = `${dd}/${items.length}`;
        renderNav(currentStep());
        renderProgress();
      });
      label.append(input, box, txt);
      group.appendChild(label);
    });
    return group;
  }

  function taskCard(task) {
    const card = el("div", "task");
    const head = el("div", "task-head");
    head.innerHTML = `<span class="task-tag">задание</span><h3>${task.title}</h3>`;
    card.appendChild(head);
    if (task.why) card.appendChild(el("p", "why", task.why));

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
    card.appendChild(label);

    if (task.cmd) {
      const wrap = el("div", "codewrap");
      const pre = el("pre");
      pre.textContent = task.cmd;
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

  function renderStep(n) {
    const step = COURSE.steps.find(s => s.n === n) || COURSE.steps[0];
    const art = $("#article");
    art.innerHTML = "";
    art.appendChild(el("div", "eyebrow", `шаг ${step.n} · ${stepItems(step.n).length} пунктов`));
    art.appendChild(el("h1", null, step.title));
    art.appendChild(el("p", "lede", step.summary));

    step.blocks.forEach(b => {
      switch (b.type) {
        case "h2": art.appendChild(el("h2", null, b.text)); break;
        case "h3": art.appendChild(el("h3", null, b.text)); break;
        case "p": art.appendChild(el("p", null, b.text)); break;
        case "ul": {
          const ul = el("ul");
          b.items.forEach(i => ul.appendChild(el("li", null, i)));
          art.appendChild(ul);
          break;
        }
        case "ol": {
          const ol = el("ol");
          b.items.forEach(i => ol.appendChild(el("li", null, i)));
          art.appendChild(ol);
          break;
        }
        case "code": art.appendChild(codeBlock(b)); break;
        case "note": {
          const note = el("div", `note ${b.kind || ""}`);
          const title = b.title ? `<strong>${b.title}</strong><br>` : "";
          note.innerHTML = `<span class="ico">${b.kind === "warn" ? "!" : "▸"}</span><div>${title}${b.text}</div>`;
          art.appendChild(note);
          break;
        }
        case "checks": art.appendChild(checklist(b.items)); break;
        default: break;
      }
    });

    if (step.tasks && step.tasks.length) {
      art.appendChild(el("h2", null, "Задания"));
      step.tasks.forEach(t => art.appendChild(taskCard(t)));
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
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
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
      const top = el("div", "phase-top");
      const items = p.todo;
      const d = countDone(items);
      top.innerHTML = `<div><span class="phase-n">фаза ${p.n}</span><h3>${p.title}</h3></div>
        <span class="meta">${d}/${items.length} · ${p.metric}</span>`;
      card.appendChild(top);
      card.appendChild(el("p", null, p.what));
      const reqs = el("div", "req");
      p.closes.forEach(c => reqs.appendChild(el("span", "tag", c)));
      card.appendChild(reqs);
      card.appendChild(checklist(items));
      art.appendChild(card);
    });

    $("#crumbs").textContent = "План трека B";
    document.title = "План: 7 фаз — курс cost-router";
    renderNav("plan");
    renderProgress();
    window.scrollTo(0, 0);
  }

  /* ── роутинг ───────────────────────────────────────────── */
  const currentStep = () => {
    const m = location.hash.match(/^#\/step\/(\d+)/);
    return m ? Number(m[1]) : state.lastStep || 1;
  };

  function go(hash) {
    closeRail();
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    const h = location.hash;
    const m = h.match(/^#\/step\/(\d+)/);
    if (h.startsWith("#/plan")) renderPlan();
    else if (m) renderStep(Math.min(Math.max(1, Number(m[1])), COURSE.steps.length));
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
    body.innerHTML = `
      <p>Прогресс лежит в <code>localStorage</code> этого браузера. Очистка кэша его удалит — поэтому делайте экспорт.</p>
      <div class="hint">сейчас отмечено: <strong>${d} из ${allItems.length}</strong></div>
      <div class="row">
        <button class="btn primary" id="expBtn">Скачать .json</button>
        <button class="btn" id="impBtn">Импортировать .json</button>
      </div>
      <input type="file" id="impFile" accept="application/json" hidden>
      <div class="hint" id="impHint"></div>
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
      if (!confirm("Сбросить весь прогресс? Действие необратимо.")) return;
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
      t = el("div", null, "");
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
    $("#remindBtn").onclick = reminderSheet;
    $("#quickRemind").onclick = reminderSheet;
    $("#dataBtn").onclick = dataSheet;
    $("#sheetClose").onclick = closeSheet;
    $("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
    document.addEventListener("keydown", e => {
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
