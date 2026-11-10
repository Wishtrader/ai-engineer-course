/* Шаги 6–9: верификатор, судья, роутер/attempt(), git.
   Формат: что делаем → зачем в проекте → как выглядит в коде → почему так → проверка. */

(function () {
  const steps = [

    /* ═══════════════════ 6. verifier.py ═══════════════════ */
    {
      id: "verifier",
      n: 6,
      title: "core/verifier.py: проверяем код тестами",
      summary: "Запуск тестов на сгенерированном коде в отдельном процессе: папка, окружение, таймаут, результат",
      goal: "понимать, как проект проверяет код модели объективно — тестами, а не на глаз.",
      where: "первая половина гейта: <code>router → verifier → ok / fail</code>",
      blocks: [
        { type: "p", text: "Модель написала код. Прежде чем ему поверить, проект запускает на нём настоящие тесты. Этот файл делает ровно это: кладёт код и тесты в отдельную папку, запускает pytest отдельным процессом и возвращает результат — прошло, сколько тестов, что в выводе." },
        { type: "note", kind: "why", title: "Зачем это в проекте",
          text: "Тесты — объективная часть гейта. Судья (следующий шаг) субъективен: он читает код и может простить краевой случай. Тест простить не может. Если бы гейт держался только на судье, брак проходил бы в результат, а вы бы не знали, на каком основании." },

        { type: "h2", text: "6.1. Как выглядит запуск в коде" },
        { type: "code", caption: "core/verifier.py, суть функции run_tests", lines: [
          "workdir = tempfile.mkdtemp(prefix=\"jloop_\")          # отдельная папка",
          "write(workdir/f\"{function_name}.py\", code)             # код модели",
          "write(workdir/\"test_gen.py\",           test_source)     # тесты",
          "",
          "proc = subprocess.run(",
          "    [python, \"-m\", \"pytest\", \"test_gen.py\", \"-q\"],",
          "    cwd=workdir, env=env, capture_output=True, text=True,",
          "    timeout=25,                                       # ← не обсуждается",
          ")",
        ]},
        { type: "p", text: "Три вещи делают этот запуск безопасным и предсказуемым: отдельная папка (чужой код не попадёт в проект), отдельный процесс (падение не уронит программу) и таймаут (бесконечный цикл не повесит прогон)." },

        { type: "h2", text: "6.2. Почему отдельный процесс, а не import" },
        { type: "ul", items: [
          "код модели может упасть, зациклиться или съесть память — процесс это выдержит, а ваша программа нет;",
          "у процесса можно отнять сеть и окружение — в текущем процессе вы бы «отнимали» у себя;",
          "результат чистый: код выхода и вывод отдельно от ваших print-ов.",
        ]},
        { type: "code", caption: "что передаём процессу", lines: [
          "env = {",
          '    "PATH": os.environ.get("PATH", "/usr/bin:/bin"),',
          '    "PYTHONPATH": workdir,           # чтобы тесты нашли сгенерированный модуль',
          '    "PYTHONDONTWRITEBYTECODE": "1",  # не мусорить',
          '    "HOME": workdir,',
          '    "NO_PROXY": "*",',
          "}",
        ]},
        { type: "p", text: "<code>env</code> собран с нуля, а не скопирован из окружения. Это осознанно: дочерний процесс не должен видеть ваш <code>OPENROUTER_API_KEY</code> и прочие переменные." },
        { type: "note", kind: "warn", title: "Честно про NO_PROXY",
          text: "<code>NO_PROXY=*</code> не блокирует сеть — он лишь отключает прокси. Прямой доступ к внешним адресам остаётся. Настоящая изоляция — отдельный сетевой namespace, контейнер без сети или ограничения через seccomp. В демо этот флаг снижает риск, но не устраняет его; так и надо говорить." },

        { type: "h2", text: "6.3. Как проект понимает результат" },
        { type: "code", caption: "что считается успехом", lines: [
          "@property",
          "def ok(self) -> bool:",
          "    return (not self.timeout",
          "            and self.returncode == 0",
          "            and self.total > 0",
          "            and self.passed == self.total)",
        ]},
        { type: "p", text: "Четыре условия, а не одно. Особенно важно <code>total &gt; 0</code>: если тесты не собрались, pytest скажет «0 провалов», и без этой проверки прогон выглядел бы успешным, хотя не проверено ничего." },
        { type: "code", caption: "таймаут — это провал проверки, а не ошибка верификатора", lines: [
          "except subprocess.TimeoutExpired as e:",
          "    out, rc, timed_out = f\"TIMEOUT после {timeout}s\", -1, True",
          "    # код не прошёл гейт; в отчёте отдельная причина — «модель зациклилась»",
        ]},

        { type: "h2", text: "6.4. Проверка" },
        { type: "code", caption: "битый код должен провалиться", lang: "bash", lines: [
          "cd /root/cost-router && .venv/bin/python -c 'from core.verifier import run_tests; o = run_tests(\"def f():\\n    return 1\\n\", \"from f import f\\n\\ndef test_x():\\n    assert f() == 2\\n\", \"f\"); print(o.ok, o.passed, o.total)'",
          "# False 0 1   ← не прошло, 0 из 1",
        ]},
        { type: "checks", items: [
          { id: "ver-1", text: "Могу объяснить, почему тесты надёжнее судьи и почему нужны оба" },
          { id: "ver-2", text: "Знаю, зачем отдельный процесс, отдельная папка и таймаут" },
          { id: "ver-3", text: "Понимаю, почему <code>env</code> собирается с нуля, а не копируется" },
          { id: "ver-4", text: "Честно объясняю, что <code>NO_PROXY</code> не режет сеть" },
          { id: "ver-5", text: "Могу объяснить, почему <code>total == 0</code> считается провалом" },
        ]},
      ],
      tasks: [
        { id: "ver-t1", title: "Прогнать заведомо битый код", why: "Увидеть провал гейта изнутри, без обращения к модели.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.verifier import run_tests; o = run_tests(\"def f():\\n    return 1\\n\", \"from f import f\\n\\ndef test_x():\\n    assert f() == 2\\n\", \"f\"); print(o.ok, o.passed, o.total)'" },
        { id: "ver-t2", title: "Получить таймаут", why: "Убедиться, что зацикливание не вешает прогон.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.verifier import run_tests; o = run_tests(\"def f():\\n    while True: pass\\n\", \"from f import f\\n\\ndef test_x():\\n    assert f() is None\\n\", \"f\", timeout=3); print(o.ok, o.timeout)'" },
        { id: "ver-t3", title: "Сломать сбор тестов", why: "Проверить, что «0 провалов» без тестов даёт провал.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.verifier import run_tests; o = run_tests(\"def f(): return 1\", \"это не питон\", \"f\"); print(o.ok, o.passed, o.total)'" },
      ],
    },

    /* ═══════════════════ 7. judge.py ═══════════════════ */
    {
      id: "judge",
      n: 7,
      title: "core/judge.py: вторая половина гейта",
      summary: "Судья оценивает код по рубрике, отвечает строгим JSON, а решение принимается по баллам",
      goal: "понимать, зачем нужен LLM-судья, как он отвечает и как из его ответа получается решение geyта.",
      where: "вторая половина гейта: <code>router → verifier → judge → passed</code>",
      blocks: [
        { type: "p", text: "Тесты говорят «работает». Судья говорит «хорошо ли сделано»: читаемо ли, что сломается на пустом входе, нет ли риска в проде. Это не замена тестов, а дополнение — и, как любой LLM, судья требует строгого контракта." },
        { type: "note", kind: "why", title: "Зачем это в проекте",
          text: "Код может проходить тесты и быть непригодным: тесты покрывают три случая из десяти, а судья смотрит на обработку <code>None</code>, огромных значений, неверных типов. Плюс судья объясняет словами, почему решение плохое — это попадает в отчёт и помогает понять, что чинить." },

        { type: "h2", text: "7.1. Что мы просим у судьи" },
        { type: "code", caption: "оценка по трём критериям, 1..5", lines: [
          "correctness  — верно ли решает задачу, включая случаи вне тестов",
          "robustness   — что сломается в проде: пустой вход, None, огромные значения",
          "clarity      — читаемо ли, идиоматично ли для Python",
          "",
          "ответ строго: {correctness, robustness, clarity, verdict, reason}",
        ]},
        { type: "p", text: "Шкала с якорями («5 — редко, 3 — средне, 1-2 — есть проблема») важнее, чем кажется: без неё модель ставит 5 почти всему и гейт перестаёт различать качество." },

        { type: "h2", text: "7.2. Как ответ превращается в решение" },
        { type: "code", caption: "согласование вердикта и баллов", lines: [
          'scores = {k: int(data.get(k, 0)) for k in ("correctness", "robustness", "clarity")}',
          "avg = sum(scores.values()) / 3",
          'raw = str(data.get("verdict", "")).lower()',
          "",
          "# написал approve, но баллы ниже порога — верим баллам",
          'verdict = "approve" if (raw == "approve" and avg >= min_score) else "reject"',
        ]},
        { type: "p", text: "Модели склонны хвалить. Поэтому одного слова «approve» недостаточно: нужен ещё и средний балл не ниже порога. При расхождении выбирается более осторожный вариант — ложный отказ стоит одной лишней попытки, ложное одобрение стоит брака в результате." },

        { type: "h2", text: "7.3. Почему ответ обязан быть JSON" },
        { type: "code", caption: "три уровня защиты при разборе", lines: [
          "1. снять markdown-забор ```json … ```",
          "2. попробовать json.loads как есть",
          "3. вытащить первый {...} регуляркой",
          "если всё равно не вышло → JudgeOutcome(\"error\", ...), а не исключение",
        ]},
        { type: "p", text: "Свободный текст нельзя сравнить с порогом, поэтому контракт жёсткий. А ошибка возвращается как результат: прогон должен доехать до отчёта, иначе непонятно, что сломалось — модель или парсер." },

        { type: "h2", text: "7.4. Сколько это стоит" },
        { type: "code", caption: "судья — тоже платный вызов", lang: "bash", lines: [
          "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE, JUDGES, estimate_cost; g=estimate_cost(CASCADE[0],1200,300); j=estimate_cost(JUDGES[0],1200,300); print(round(g,6), round(j,6), round(j/(g+j)*100), \"% judge\")'",
          "# 0.000216 0.000617 74 % judge   ← на дешёвой модели ревью дороже генерации",
        ]},
        { type: "p", text: "Отсюда практические решения: не звать судью на коде, который уже провалил тесты; кэшировать вердикт по хэшу кода; иногда брать дешёвого судью и калибровать его вручную." },

        { type: "h2", text: "7.5. Проверка" },
        { type: "code", caption: "парсер на трёх ответах", lang: "bash", lines: [
          "cd /root/cost-router && .venv/bin/python -c 'from core.judge import _parse_json; print(_parse_json(\"```json\\n{\\\"verdict\\\":\\\"approve\\\"}\\n```\")); print(_parse_json(\"вот ответ: {\\\"correctness\\\": 4}\")); print(_parse_json(\"никакого json\"))'",
          "# {'verdict': 'approve'}",
          "# {'correctness': 4}",
          "# None   ← ошибка контракта, а не падение",
        ]},
        { type: "checks", items: [
          { id: "jud-1", text: "Могу объяснить, что судья добавляет к тестам и чего он не заменяет" },
          { id: "jud-2", text: "Понимаю, почему при расхождении слова и баллов решают баллы" },
          { id: "jud-3", text: "Объясняю, зачем жёсткий JSON-формат и что будет при свободном тексте" },
          { id: "jud-4", text: "Проверил(а) парсер на трёх ответах, включая мусор" },
          { id: "jud-5", text: "Знаю, что ревью — платный вызов и когда его не стоит делать" },
        ]},
      ],
      tasks: [
        { id: "jud-t1", title: "Проверить парсер на плохих ответах", why: "Убедиться, что чужой формат не ломает гейт.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.judge import _parse_json; print(_parse_json(\"```json\\n{\\\"verdict\\\":\\\"approve\\\"}\\n```\")); print(_parse_json(\"вот ответ: {\\\"correctness\\\": 4}\")); print(_parse_json(\"никакого json\"))'" },
        { id: "jud-t2", title: "Посчитать долю судьи в стоимости", why: "Понять, почему ревью — отдельная статья расходов.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE, JUDGES, estimate_cost; g=estimate_cost(CASCADE[0],1200,300); j=estimate_cost(JUDGES[0],1200,300); print(round(j/(g+j)*100), \"% judge\")'" },
      ],
    },

    /* ═══════════════════ 8. router.py ═══════════════════ */
    {
      id: "router",
      n: 8,
      title: "core/router.py: собираем одну попытку (задача 1)",
      summary: "Из чего состоит attempt(): промпт → модель → тесты → судья → заполненный Attempt",
      goal: "написать <code>attempt()</code> самому: одну попытку без эскалации, с честными полями и обоснованным решением.",
      where: "верхний слой: <code>router</code> использует config, llm, verifier и judge",
      blocks: [
        { type: "p", text: "Роутер — место, где всё соединяется. Задача 1 — написать <code>attempt()</code>: она делает <strong>одну</strong> попытку (одна модель, один код, одна проверка) и возвращает объект <code>Attempt</code> со всеми фактами. Эскалация на следующий уровень — это задача 2, здесь её нет." },
        { type: "note", kind: "why", title: "Зачем это в проекте",
          text: "Из <code>Attempt</code>-ов складывается вся статистика: сколько задач решил уровень 1, сколько стоил прогон, почему провалились остальные. Если функция не заполнит поля (стоимость, число тестов, причину), каскад будет работать, но доказать экономию и разобрать провалы будет нечем." },

        { type: "h2", text: "8.1. Что вы получаете и что должны вернуть" },
        { type: "code", caption: "контракт", lines: [
          "def attempt(model: Model, task: TaskSpec, test_source: str,",
          "            level: int = 1) -> Attempt:",
          "    ...",
        ]},
        { type: "code", caption: "поля Attempt, которые надо заполнить", lines: [
          "model, level                     # кто и на каком уровне",
          "code, passed, reason             # что сгенерировано и чем закончилось",
          "generate_cost, judge_cost        # стоимость обоих вызовов",
          "tests_passed, tests_total        # результат тестов",
          "judge_score, judge_verdict       # результат ревью",
        ]},

        { type: "h2", text: "8.2. Порядок действий" },
        { type: "ol", items: [
          "Собрать промпт: <code>task.spec</code> + критерии <code>task.acceptance</code>.",
          "Вызвать <code>call(model, WORKER_SYSTEM, prompt)</code>.",
          "Если <code>res.error</code> — вернуть <code>Attempt(passed=False, reason=...)</code>, сохранив стоимость.",
          "Достать код: <code>extract_code(res.text)</code>.",
          "Прогнать тесты: <code>run_tests(code, test_source, task.function_name)</code>.",
          "Если тесты зелёные — вызвать <code>judge(judge_for(model), ...)</code>.",
          "Собрать <code>passed = тесты зелёные И вердикт approve</code>.",
          "Заполнить все поля и вернуть объект.",
        ]},
        { type: "p", text: "Такую же последовательность можно увидеть в любой системе «сгенерируй — проверь»: сначала получить результат, потом объективная проверка, потом субъективная, и только затем решение. Ниже — пример из другой области, чтобы был виден шаблон, но не готовый ответ." },
        { type: "code", caption: "аналог: проверка ответа на арифметическую задачу", lines: [
          "def check_once(model, problem, expected, level=1):",
          "    res = call(model, \"Отвечай одним числом.\", build_prompt(problem))",
          "    if res.error:",
          "        return AttemptResult(ok=False, reason=f\"provider: {res.error}\", cost=res.cost_usd)",
          "    answer = parse_number(res.text)",
          "    ok_exact = answer == expected",
          "    review = review_answer(model, problem, answer) if ok_exact else None",
          "    passed = ok_exact and (review is None or review.approved)",
          "    return AttemptResult(ok=passed, reason=\"ok\" if passed else \"wrong_answer\",",
          "                         cost=res.cost_usd + (review.cost if review else 0.0))",
        ]},
        { type: "p", text: "Совпадает всё, кроме начинки: проверка ошибки, извлечение результата, объективный тест, при успехе — ревью, затем сборка <code>passed</code> из двух условий и стоимости из двух вызовов." },

        { type: "h2", text: "8.3. Решение, которое принимаете вы" },
        { type: "p", text: "Звать ли судью, если тесты уже провалились? Аргумент за: судья объяснит, что не так. Аргумент против: это не изменит <code>passed</code> (он уже false), но стоит денег и времени. В проекте принято второе, и в коде это должно быть <strong>явным комментарием</strong>, а не случайностью." },
        { type: "code", caption: "как это выглядит", lines: [
          "outcome = run_tests(code, test_source, task.function_name)",
          "",
          "# Решение: судью зовём только при зелёных тестах.",
          "# Причина: при провале тестов ревью не влияет на passed,",
          "# но стоит ~0.0006$ и 1-3 секунды на каждую попытку.",
          "if outcome.ok:",
          "    j = judge(judge_for(model), task.title, task.spec,",
          "              task.acceptance, code, f\"{outcome.passed}/{outcome.total}\")",
          "else:",
          "    j = None",
        ]},

        { type: "h2", text: "8.4. Зачем всё это: считаем экономию" },
        { type: "p", text: "Пусть 80% задач решает уровень 1, ещё 15% — уровень 2, ещё 5% — уровень 3. Стоимость попытки = генерация + ревью." },
        { type: "code", caption: "арифметика каскада", lang: "bash", lines: [
          "уровень 1:  0.000216 + 0.000617 = 0.000833",
          "уровень 2:  0.000360 + 0.000617 = 0.000977",
          "уровень 3:  0.001110 + 0.000617 = 0.001727",
          "уровень 4:  0.008100 + 0.000617 = 0.008717",
          "",
          "каскад: 0.000833 + 0.2*0.000977 + 0.05*0.001727 ≈ 0.001114",
          "всегда sonnet: 0.008717          → выгода ≈ 7.8x",
          "100 задач: $0.11 вместо $0.87",
        ]},
        { type: "note", kind: "warn", title: "Что делает эти числа честными",
          text: "Экономия возникает только если распределение сложности реальное и каскад не теряет качество. Дешёвый каскад, который решает 60% вместо 90%, просто переносит стоимость в ручную работу. Поэтому в отчёт всегда идут два числа: стоимость и доля решённых задач." },

        { type: "h2", text: "8.5. Проверка" },
        { type: "code", caption: "чекер проверяет 7 свойств и провальный кейс", lang: "bash", lines: [
          "cd /root/cost-router && .venv/bin/python check_task1.py",
          "# ✓ возвращает объект Attempt",
          "# ✓ поле model заполнено той моделью, что передали",
          "# ✓ код извлечён из ответа",
          "# ✓ тесты действительно запускались",
          "# ✓ стоимость генерации учтена",
          "# ✓ причина заполнена (ok при успехе)",
          "# ЗАДАЧА 1 ВЫПОЛНЕНА",
        ]},
        { type: "checks", items: [
          { id: "rtr-1", text: "Могу перечислить восемь шагов <code>attempt()</code> по памяти" },
          { id: "rtr-2", text: "Понимаю, почему судья вызывается только после успешных тестов" },
          { id: "rtr-3", text: "Реализовал(а) <code>attempt()</code> и чекер зелёный" },
          { id: "rtr-4", text: "В коде есть комментарий с обоснованием решения про судью" },
          { id: "rtr-5", text: "Посчитал(а) ожидаемую стоимость задачи для каскада и для «сразу sonnet»" },
          { id: "rtr-6", text: "Могу объяснить, зачем в <code>total_cost</code> входит стоимость ревью" },
        ]},
      ],
      tasks: [
        { id: "rtr-t1", title: "Реализовать attempt()", why: "Контракт есть, логики нет — первая задача, которую нельзя списать.", cmd: "cd /root/cost-router && .venv/bin/python check_task1.py" },
        { id: "rtr-t2", title: "Посчитать экономию на своих числах", why: "Свои цифры защищаются на интервью лучше заученных.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE, JUDGES, estimate_cost; j=estimate_cost(JUDGES[0],1200,300); c=[estimate_cost(m,1200,300)+j for m in CASCADE]; print([round(x,6) for x in c]); print(\"cascade:\", round(c[0]+0.2*c[1]+0.05*c[2],6), \"sonnet:\", round(c[3],6))'" },
        { id: "rtr-t3", title: "Задача 2: цикл каскада", why: "Эскалация уровней и накопление попыток — следующий шаг после зелёного чекера.", cmd: "cd /root/cost-router && git log --oneline -3" },
      ],
    },

    /* ═══════════════════ 9. Git ═══════════════════ */
    {
      id: "git",
      n: 9,
      title: "Git: фиксируем работу так, чтобы её было видно",
      summary: "Цикл status → add → commit → push, что не должно попасть в репозиторий и зачем осмысленные сообщения",
      goal: "самостоятельно коммитить свою работу и не утащить в репозиторий секреты и окружение.",
      where: "финал каждого шага: код написан → тесты зелёные → коммит",
      blocks: [
        { type: "p", text: "Код, который лежит только на вашей машине, не существует для работодателя. Git превращает работу в историю: видно, что сделано, когда и зачем. Для портфолио это важнее, чем красивое резюме." },
        { type: "note", kind: "why", title: "Зачем это в проекте",
          text: "Через месяц вы вернётесь к <code>attempt()</code> и не вспомните, почему выбрали именно такой порядок шагов. История коммитов с сообщениями — ваша собственная документация. Плюс именно её смотрят на интервью, когда просят «покажите, как вы работаете»." },

        { type: "h2", text: "9.1. Минимальный цикл" },
        { type: "code", caption: "четыре команды", lang: "bash", lines: [
          "git status -s                                  # что изменилось",
          "git diff core/router.py                        # что именно изменилось",
          "git add core/router.py                         # подготовить к коммиту",
          'git commit -m "feat: implement attempt() with tests and judge gate"',
          "git push",
        ]},
        { type: "p", text: "Один коммит — одно осмысленное изменение. Не «всё за день», а «реализовал attempt и обосновал решение про судью». Такой коммит можно откатить целиком и объяснить одной строкой." },

        { type: "h2", text: "9.2. Что не должно попасть в репозиторий" },
        { type: "code", caption: ".gitignore проекта", lang: "bash", lines: [
          ".venv/",
          "__pycache__/",
          "*.pyc",
          ".env",
          "artifacts/",
        ]},
        { type: "p", text: "Проверка перед первым пушем — одна команда: <code>git status</code> не должен показывать <code>.env</code> и <code>.venv</code>. Если показывает, значит правило не работает, и ключ уйдёт в историю репозитория." },
        { type: "note", kind: "warn", title: "Почему удалить файл потом недостаточно",
          text: "<code>.gitignore</code> действует только на новые файлы. Если <code>.env</code> уже был закоммичен, он остаётся в старых снимках. Правильный порядок: сначала отозвать ключ у провайдера, потом <code>git rm --cached .env</code>, и только затем чистить историю, если это нужно." },

        { type: "h2", text: "9.3. Проверка" },
        { type: "code", caption: "что должно быть видно", lang: "bash", lines: [
          "cd /root/cost-router && git log --oneline -3",
          "# a1b2c3d feat: implement attempt() with tests and judge gate",
          "# 9f8e7d6 docs: add step 2 notes",
          "# 5c4b3a2 chore: scaffold cost-router",
          "",
          "git status -s      # пусто — значит всё зафиксировано",
        ]},
        { type: "checks", items: [
          { id: "git-1", text: "Сделал(а) коммит своей работы с осмысленным сообщением" },
          { id: "git-2", text: "Проверил(а) <code>git status</code>: нет <code>.env</code> и <code>.venv</code>" },
          { id: "git-3", text: "Понимаю, почему удаление файла не убирает его из истории" },
          { id: "git-4", text: "Запушил(а) в репозиторий и вижу коммит на GitHub" },
        ]},
      ],
      tasks: [
        { id: "git-t1", title: "Первый собственный коммит", why: "С этого момента каждый шаг фиксируется в истории — это и есть доказательство работы.", cmd: "cd /root/cost-router && git status -s" },
        { id: "git-t2", title: "Посмотреть историю как список решений", why: "Убедиться, что сообщения читаются как ответы на «что и зачем».", cmd: "cd /root/cost-router && git log --oneline -10" },
      ],
    },
  ];

  steps.forEach(s => window.COURSE.steps.push(s));
})();
