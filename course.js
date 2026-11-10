/* Данные курса. Правится вручную — приложение читает только этот файл.
   Типы блоков: h2 | p | ul | ol | code | note | checks | quote
   У code: { lines: [...] } — строки склеиваются через \n, экранирование не нужно.
   У checks: { items: [{ id, text }] } — id уникален в пределах всего курса. */

window.COURSE = {
  meta: {
    title: "cost-router: курс с нуля",
    subtitle: "Разбор проекта в порядке реального выполнения — от venv до продакшн-решений. Фаза 0 трека B.",
    updated: "2026-11-10",
    repo: "https://github.com/Wishtrader/cost-router",
  },

  steps: [
    /* ─────────────────────────── 1 ─────────────────────────── */
    {
      id: "env",
      n: 1,
      title: "Окружение",
      summary: "Python, venv, pip, .env — и почему одной установки мало",
      blocks: [
        { type: "p", text: "Файл <code>.py</code> — обычный текст. Python читает его сверху вниз и выполняет. Компиляции в отдельный файл нет." },
        { type: "h2", text: "1.1. Зачем виртуальное окружение" },
        { type: "p", text: "Две кухни, одна коробка ингредиентов — так выглядит установка всех пакетов в один общий Python. Разные проекты требуют разные версии одного пакета, и они ломают друг друга. <strong>venv</strong> — отдельная папка со своей копией Python и своими пакетами." },
        { type: "code", caption: "создать окружение", lines: [
          "cd /root/cost-router",
          "python3 -m venv .venv",
          "source .venv/bin/activate     # появится (.venv) в начале строки",
          ".venv/bin/pip install -r requirements.txt",
        ]},
        { type: "note", kind: "tip", title: "Надёжнее, чем activate",
          text: "Вызывать интерпретатор по пути <code>.venv/bin/python</code> — то же самое, но не требует помнить про <code>source</code> и работает в любом окне терминала." },
        { type: "h2", text: "1.2. Почему в проекте только один пакет" },
        { type: "p", text: "Внутри <code>.venv</code> из коробки нет <code>requests</code>, <code>openai</code>, <code>langchain</code>. Всё на стандартной библиотеке: <code>urllib</code> для HTTP, <code>json</code>, <code>subprocess</code>, <code>dataclasses</code>. Меньше зависимостей — меньше поводов сломаться и понятнее, что происходит." },
        { type: "h2", text: "1.3. Ключ API" },
        { type: "p", text: "Проект ходит в модели через OpenRouter. Ключ нельзя держать в коде: код уходит в git. Он живёт в <code>.env</code>, который перечислен в <code>.gitignore</code>." },
        { type: "code", caption: "проверить, что ключ не утечёт", lines: [
          "cp .env.example .env        # затем вписать настоящий ключ",
          "git check-ignore -v .env    # должна вывестись строка с .gitignore",
        ]},
        { type: "note", kind: "warn", title: "Ловушка: venv нельзя копировать",
          text: "Внутри <code>.venv</code> лежат файлы с абсолютными путями к исходному месту. Скопированное окружение внешне работает, но <code>pip</code> пишет в чужую папку. Проверка: <code>head -1 .venv/bin/pip</code> должен указывать на ваш проект. Сомневаетесь — удалите и создайте заново." },
        { type: "checks", items: [
          { id: "env-1", text: "Окружение создано и <code>.venv/bin/python -c \"import sys; print(sys.prefix)\"</code> показывает мой проект" },
          { id: "env-2", text: "pytest установлен: <code>.venv/bin/python -m pytest --version</code> выдаёт 8.3.4" },
          { id: "env-3", text: "<code>.env</code> создан, ключ вписан, <code>git check-ignore -v .env</code> подтверждает игнор" },
        ]},
      ],
      tasks: [
        { id: "env-t1", title: "Поднять окружение с нуля", why: "Проверка, что вы умеете воспроизвести проект на любой машине.", cmd: "cd /root/cost-router && .venv/bin/python check_task1.py" },
      ],
    },

    /* ─────────────────────────── 2 ─────────────────────────── */
    {
      id: "entry",
      n: 2,
      title: "Точка входа",
      summary: "Как Python находит файл, sys.path и if __name__ == \"__main__\"",
      blocks: [
        { type: "p", text: "Команда <code>.venv/bin/python check_task1.py</code>: файл по пути находит <strong>оболочка</strong>, Python получает готовый путь и выполняет его. А вот <strong>модули</strong> (<code>core</code>, <code>json</code>, <code>pytest</code>) ищет сам Python — по списку путей <code>sys.path</code>." },
        { type: "code", caption: "посмотреть sys.path", lines: [
          '.venv/bin/python -c "import sys; [print(i, p) for i,p in enumerate(sys.path)]"',
          "# 0  ''                       ← режим -c: текущая папка",
          "# 1  .../lib/python314.zip    ← stdlib",
          "# 2  .../lib/python3.14       ← stdlib",
          "# 3  .../lib-dynload          ← бинарные модули",
          "# 4  /root/cost-router/.venv/lib/python3.14/site-packages  ← сюда ставит pip",
        ]},
        { type: "p", text: "Порядок просмотра сверху вниз, первое совпадение выигрывает. Поэтому <code>pytest</code> берётся из своего <code>.venv</code>, и поэтому же файл <code>json.py</code> в папке проекта затенил бы стандартный модуль." },
        { type: "h2", text: "2.1. Что попадает в sys.path[0]" },
        { type: "p", text: "При запуске <strong>файла</strong> в позицию 0 попадает папка этого файла, а не текущая папка. Отсюда работает <code>from core.config import CASCADE</code>: <code>core</code> лежит рядом со скриптом, а <code>/root/cost-router</code> уже в пути." },
        { type: "code", caption: "проверить самому", lines: [
          "printf 'import sys\\nprint(sys.path[0])\\n' > probe.py",
          ".venv/bin/python probe.py            # /root/cost-router",
          ".venv/bin/python -c \"import sys; print(sys.path[0])\"   # пусто = cwd",
        ]},
        { type: "h2", text: "2.2. __name__" },
        { type: "ul", items: [
          "запустили файл как программу → <code>__name__ == \"__main__\"</code>",
          "импортировали в другой модуль → <code>__name__</code> равно имени модуля",
        ]},
        { type: "code", caption: "гард в конце файла", lines: [
          'if __name__ == "__main__":',
          "    sys.exit(main())",
        ]},
        { type: "p", text: "Гард прячет <strong>вызов</strong> <code>main()</code>, но не код верхнего уровня. Импорты, константы и <code>def</code> выполняются всегда. Правило: на нулевом отступе только импорты, константы и функции; вся работа — внутри функций под гардом." },
        { type: "note", kind: "warn", title: "Почему это важно именно здесь",
          text: "Без гарда любой <code>import check_task1</code> (pytest, IDE, другой скрипт) прогонял бы весь чекер: HTTP-запросы к моделям и потраченные деньги." },
        { type: "p", text: "<code>sys.exit(main())</code> отдаёт код выхода оболочке: <code>0</code> — успех, <code>1</code> — провал. Сейчас <code>attempt()</code> не реализован, поэтому чекер возвращает <code>1</code>." },
        { type: "checks", items: [
          { id: "entry-1", text: "Выполнил пробник и увидел <code>sys.path[0] = /root/cost-router</code>" },
          { id: "entry-2", text: "Проверил <code>__name__</code> при запуске (<code>__main__</code>) и при импорте (имя модуля)" },
          { id: "entry-3", text: "Объяснил(а) себе, почему <code>python -c \"import check_task1\"</code> из /tmp падает с ModuleNotFoundError" },
          { id: "entry-4", text: "Проверил код выхода: <code>.venv/bin/python check_task1.py; echo $?</code> → 1" },
        ]},
      ],
      tasks: [
        { id: "entry-t1", title: "Убрать гард в копии файла", why: "Увидеть своими глазами, что происходит при импорте без защиты.", cmd: "cp check_task1.py /tmp/ck.py && sed -i 's/if __name__/if True or __name__/' /tmp/ck.py" },
      ],
    },

    /* ─────────────────────────── 3 ─────────────────────────── */
    {
      id: "imports",
      n: 3,
      title: "Импорты и пакет",
      summary: "core/__init__.py, from .config import ..., почему не circular",
      blocks: [
        { type: "p", text: "Пакет — это папка с файлом <code>__init__.py</code> внутри. Сам файл может быть пустым: его наличие говорит Python «это пакет, а не просто папка»." },
        { type: "code", caption: "структура", lines: [
          "cost-router/",
          "├── check_task1.py        ← программа (точка входа)",
          "├── tasks/               ← JSON-спецификации задач",
          "├── tests/               ← pytest-тесты по задачам",
          "└── core/",
          "    ├── __init__.py      ← пустой: отмечает пакет",
          "    ├── config.py        ← модели, каскад, цены",
          "    ├── llm.py          ← HTTP-клиент к модели",
          "    ├── verifier.py     ← запуск pytest в песочнице",
          "    ├── judge.py        ← LLM-судья качества",
          "    └── router.py       ← каскад + attempt()",
        ]},
        { type: "h2", text: "3.1. Точка и относительный импорт" },
        { type: "code", caption: "два способа", lines: [
          "# абсолютный (в check_task1.py — он снаружи пакета)",
          "from core.config import CASCADE",
          "",
          "# относительный (внутри пакета core)",
          "from .config import Model, estimate_cost",
          "from .llm import call, extract_code",
        ]},
        { type: "p", text: "Точка означает «в этом же пакете». Относительные импорты работают только внутри пакета: файл, запущенный как программа, пакетом не считается — у него <code>__name__ == \"__main__\"</code> и нет родителя." },
        { type: "note", kind: "warn", title: "Ловушка: circular import",
          text: "<code>router.py</code> импортирует <code>judge</code>, <code>llm</code>, <code>verifier</code>, <code>config</code>. Если бы <code>config.py</code> попытался импортировать <code>router</code>, Python упал бы на циклическом импорте. Направление зависимостей всегда в одну сторону: <code>config → llm → verifier/judge → router</code>." },
        { type: "checks", items: [
          { id: "imp-1", text: "Понимаю, зачем нужен пустой <code>core/__init__.py</code>" },
          { id: "imp-2", text: "Могу объяснить разницу <code>from core.config import X</code> и <code>from .config import X</code>" },
          { id: "imp-3", text: "Нарисовал(а) граф импортов проекта и увидел, что он без циклов" },
        ]},
      ],
      tasks: [
        { id: "imp-t1", title: "Сломать импорт нарочно", why: "Ошибки учат быстрее объяснений: увидеть текст ModuleNotFoundError и ImportError.", cmd: "cd /root/cost-router && mv core/__init__.py /tmp/ && .venv/bin/python -c 'import core.config'; mv /tmp/__init__.py core/" },
      ],
    },

    /* ─────────────────────────── 4 ─────────────────────────── */
    {
      id: "config",
      n: 4,
      title: "core/config.py",
      summary: "dataclass, frozen, каскад моделей, стоимость вызова",
      blocks: [
        { type: "p", text: "Файл задаёт <strong>модели и цены</strong>. Каскад — упорядоченный список: уровень 1 самый дешёвый, последний самый дорогой. Смысл: не платить за дорогую модель там, где хватает дешёвой." },
        { type: "code", caption: "dataclass", lines: [
          "@dataclass(frozen=True)",
          "class Model:",
          "    id: str",
          "    vendor: str",
          "    price_in_per_1m: float     # $ за 1M входных токенов",
          "    price_out_per_1m: float    # $ за 1M выходных токенов",
        ]},
        { type: "p", text: "<code>@dataclass</code> генерирует <code>__init__</code>, <code>__repr__</code> и сравнение по полям. <code>frozen=True</code> запрещает менять поля после создания: модель-константа не должна случайно мутировать посреди прогона." },
        { type: "h2", text: "4.1. Каскад и цены" },
        { type: "code", caption: "CASCADE", lines: [
          "CASCADE: list[Model] = [",
          '    Model("meta-llama/llama-3.3-70b-instruct", "meta",      0.100,  0.320),  # ур. 1',
          '    Model("openai/gpt-4o-mini",                "openai",    0.150,  0.600),  # ур. 2',
          '    Model("google/gemini-2.5-flash",           "google",    0.300,  2.500),  # ур. 3',
          '    Model("anthropic/claude-sonnet-4.5",       "anthropic", 3.000, 15.000),  # ур. 4',
          "]",
        ]},
        { type: "p", text: "Разброс специально большой: llama на выходе в ~47 раз дешевле sonnet. Иначе экономию каскада просто не видно." },
        { type: "h2", text: "4.2. Судья другого вендора" },
        { type: "code", caption: "judge_for", lines: [
          "def judge_for(worker: Model) -> Model:",
          '    """Судья другого вендора: ошибки моделей одного вендора коррелированы."""',
          "    candidates = [j for j in JUDGES if j.vendor != worker.vendor]",
          "    if not candidates:",
          '        raise ValueError(f"нет судьи другого вендора для {worker.vendor}")',
          "    return candidates[sum(ord(c) for c in worker.id) % len(candidates)]",
        ]},
        { type: "p", text: "Это не косметика: если код писала модель вендора X и её же проверяет судья вендора X, ошибки совпадают и гейт пропускает брак. Судья обязан быть из другого лагеря." },
        { type: "code", caption: "стоимость", lines: [
          "def estimate_cost(model: Model, tokens_in: int, tokens_out: int) -> float:",
          "    return (tokens_in / 1_000_000) * model.price_in_per_1m + \\",
          "           (tokens_out / 1_000_000) * model.price_out_per_1m",
        ]},
        { type: "checks", items: [
          { id: "cfg-1", text: "Понимаю, что делает <code>@dataclass(frozen=True)</code> и зачем здесь frozen" },
          { id: "cfg-2", text: "Посчитал(а) вручную стоимость 2000 входных / 500 выходных токенов для llama и для sonnet" },
          { id: "cfg-3", text: "Проверил(а) <code>judge_for()</code>: для llama какой вендор судит и почему не meta" },
        ]},
      ],
      tasks: [
        { id: "cfg-t1", title: "Добавить пятую модель в каскад", why: "Понять структуру данных на практике: цены берутся с openrouter.ai/api/v1/models.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE, estimate_cost; print([(m.id, m.vendor) for m in CASCADE]); print(estimate_cost(CASCADE[0], 2000, 500))'" },
        { id: "cfg-t2", title: "Найти самого дорогого судью", why: "Судья — тоже платный вызов; на нём экономия каскада незаметно съедается.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.config import JUDGES; print(sorted(JUDGES, key=lambda m: m.price_out_per_1m))'" },
      ],
    },

    /* ─────────────────────────── 5 ─────────────────────────── */
    {
      id: "llm",
      n: 5,
      title: "core/llm.py",
      summary: "urllib, JSON, ретраи с backoff, извлечение кода из ответа",
      blocks: [
        { type: "p", text: "Один клиент на все вендоры: воркер и судья могут быть любой моделью без ветвлений в коде. На каждом вызове считаются токены, деньги и задержка — иначе нечем доказывать экономию." },
        { type: "code", caption: "как собирается запрос", lines: [
          'payload = {',
          '    "model": model.id,',
          '    "messages": [{"role": "system", "content": system},',
          '                 {"role": "user", "content": user}],',
          '    "max_tokens": max_tokens,',
          '    "temperature": temperature,',
          "}",
          "req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(),",
          '    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})',
        ]},
        { type: "p", text: "<code>temperature=0</code> — не украшение: демо должно воспроизводиться. Иначе прогон на встрече отличается от отрепетированного." },
        { type: "h2", text: "5.1. Ретраи" },
        { type: "code", caption: "экспоненциальный backoff", lines: [
          "for attempt in range(retries):",
          "    try:",
          "        ...",
          "    except urllib.error.HTTPError as e:",
          '        if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:',
          "            time.sleep(2 ** attempt)   # 1s, 2s, 4s",
          "            continue",
          '        return LLMResult("", 0, 0, 0.0, ..., last_err)',
        ]},
        { type: "p", text: "Ретраятся только <strong>временные</strong> ошибки: лимиты и 5xx. Ошибка 400 (плохой запрос) не лечится повтором — она сразу возвращается как результат с заполненным <code>error</code>. Это важное решение: функция не бросает исключение, а возвращает объект с ошибкой — вызывающий код обязан её проверить." },
        { type: "h2", text: "5.2. Код из ответа модели" },
        { type: "code", caption: "extract_code", lines: [
          'if "```" not in text:',
          "    return text.strip()",
          'parts = text.split("```")',
          "# нечётные индексы — содержимое заборов",
          "for chunk in parts[1::2]:",
          '    body = chunk.removeprefix("python")',
          "    return body.strip()",
        ]},
        { type: "note", kind: "tip", title: "Почему это отдельная функция",
          text: "Модели почти всегда оборачивают код в markdown-забор. Если не снять его, pytest получит текст с ``` и упадёт на синтаксисе — и вы будете думать, что модель написала плохой код, хотя проблема в парсинге." },
        { type: "checks", items: [
          { id: "llm-1", text: "Понимаю, зачем <code>LLMResult</code> с полями cost/latency/error вместо простой строки" },
          { id: "llm-2", text: "Вижу разницу между ошибкой, которую лечит retry, и той, которую нет" },
          { id: "llm-3", text: "Проверил(а) <code>extract_code</code> на ответе с ```python и без забора" },
        ]},
      ],
      tasks: [
        { id: "llm-t1", title: "Один реальный вызов", why: "Увидеть стоимость и задержку своими глазами, а не из учебника.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE; from core.llm import call; r = call(CASCADE[0], \"Отвечай одним словом.\", \"Скажи: OK\"); print(r.text, r.cost_usd, round(r.latency_s,2), r.error)'" },
        { id: "llm-t2", title: "Сломать ключ", why: "Проверить, что ошибка возвращается, а не падает трейсбеком.", cmd: "cd /root/cost-router && OPENROUTER_API_KEY=bad .venv/bin/python -c 'from core.config import CASCADE; from core.llm import call; print(call(CASCADE[0], \"x\", \"y\").error)'" },
      ],
    },

    /* ─────────────────────────── 6 ─────────────────────────── */
    {
      id: "verifier",
      n: 6,
      title: "core/verifier.py",
      summary: "Песочница, subprocess, таймаут, разбор вывода pytest",
      blocks: [
        { type: "p", text: "<strong>Детерминированный верификатор</strong> запускает настоящие тесты на сгенерированном коде. Судью можно уговорить — он «понимает замысел» и прощает краевые случаи. Тест не прощает. Поэтому гейт двойной: сначала тесты, потом судья." },
        { type: "code", caption: "песочница", lines: [
          "workdir = tempfile.mkdtemp(prefix=\"jloop_\")",
          "with open(os.path.join(workdir, f\"{function_name}.py\"), \"w\", encoding=\"utf-8\") as f:",
          "    f.write(code)",
          "with open(os.path.join(workdir, \"test_gen.py\"), \"w\", encoding=\"utf-8\") as f:",
          "    f.write(test_source)",
          "",
          "env = {",
          '    "PATH": os.environ.get("PATH", "/usr/bin:/bin"),',
          '    "PYTHONPATH": workdir,',
          '    "PYTHONDONTWRITEBYTECODE": "1",',
          '    "HOME": workdir,',
          '    "NO_PROXY": "*",      # режем сеть: сгенерированный код не должен никуда ходить',
          "}",
        ]},
        { type: "p", text: "Здесь четыре независимых решения по безопасности: отдельная временная папка, отдельный процесс, жёсткий таймаут и обрезанная сеть. Код пишет модель — обращаться с ним как с недоверенным." },
        { type: "code", caption: "запуск и разбор", lines: [
          "proc = subprocess.run(",
          '    [_test_python(), "-m", "pytest", "test_gen.py", "-q", "--no-header",',
          '     "-p", "no:cacheprovider"],',
          "    cwd=workdir, env=env, capture_output=True, text=True, timeout=timeout,",
          ")",
          "counts = dict((kind, int(n)) for n, kind in _COUNT_RE.findall(out))",
          "passed = counts.get(\"passed\", 0)",
          "failed = counts.get(\"failed\", 0) + counts.get(\"error\", 0)",
        ]},
        { type: "note", kind: "warn", title: "Тонкость",
          text: "<code>ok</code> требует <code>total &gt; 0</code>. Если pytest вообще не собрал тесты, «0 провалов» — это не успех, а сломанный прогон. Молчаливый зелёный тест опаснее красного." },
        { type: "checks", items: [
          { id: "ver-1", text: "Понимаю, зачем <code>NO_PROXY=*</code> и <code>cwd=workdir</code>" },
          { id: "ver-2", text: "Вижу, почему таймаут — обязательное условие, а не вежливость" },
          { id: "ver-3", text: "Могу объяснить, почему <code>total == 0</code> считается провалом" },
        ]},
      ],
      tasks: [
        { id: "ver-t1", title: "Прогнать заведомо битый код", why: "Увидеть, как выглядит провал гейта изнутри.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.verifier import run_tests; o = run_tests(\"def f():\\n    return 1\\n\", \"from f import f\\n\\ndef test_x():\\n    assert f() == 2\\n\", \"f\"); print(o.ok, o.passed, o.total)'" },
      ],
    },

    /* ─────────────────────────── 7 ─────────────────────────── */
    {
      id: "judge",
      n: 7,
      title: "core/judge.py",
      summary: "Строгий JSON, вердикт против баллов, стоимость проверки",
      blocks: [
        { type: "p", text: "Тесты отвечают «работает ли». Судья — «хорошо ли сделано»: читаемость, краевые случаи, риски в проде. Чтобы результат можно было использовать как гейт, судья обязан вернуть <strong>строгий JSON</strong>, а не текст." },
        { type: "code", caption: "схема ответа", lines: [
          '{"correctness": N, "robustness": N, "clarity": N,',
          ' "verdict": "approve"|"reject", "reason": "одно предложение"}',
        ]},
        { type: "h2", text: "7.1. Парсинг, который не падает" },
        { type: "p", text: "<code>_parse_json</code> снимает markdown-забор, затем пробует <code>json.loads</code>, затем вытаскивает первый <code>{...}</code> регуляркой. Если всё равно не вышло — возвращается <code>JudgeOutcome(\"error\", ...)</code>, а не исключение: гейт должен получить решение, а не уронить прогон." },
        { type: "h2", text: "7.2. Главное решение: верим баллам, а не слову" },
        { type: "code", caption: "согласование вердикта и оценок", lines: [
          'raw_verdict = str(data.get("verdict", "")).lower()',
          "# Если модель написала approve, но баллы ниже порога — верим баллам.",
          'verdict = "approve" if (raw_verdict == "approve" and avg >= min_score) else "reject"',
        ]},
        { type: "p", text: "Модели склонны хвалить. Поэтому <code>approve</code> от судьи принимается только при среднем балле не ниже <code>MIN_SCORE</code>. Это ровно тот класс решений, который отличает инженера от «подключил модель и поверил»." },
        { type: "checks", items: [
          { id: "jud-1", text: "Понимаю, зачем схема ответа фиксирована и что будет при свободном тексте" },
          { id: "jud-2", text: "Могу объяснить, почему <code>approve</code> при баллах 2.7 превращается в <code>reject</code>" },
          { id: "jud-3", text: "Помню, что вызов судьи тоже стоит денег и входит в <code>total_cost</code>" },
        ]},
      ],
      tasks: [
        { id: "jud-t1", title: "Проверить парсер на «плохих» ответах", why: "Убедиться, что чужой формат не ломает гейт.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.judge import _parse_json; print(_parse_json(\"```json\\n{\\\"verdict\\\":\\\"approve\\\"}\\n```\")); print(_parse_json(\"вот ответ: {\\\"correctness\\\": 4}\"))'" },
      ],
    },

    /* ─────────────────────────── 8 ─────────────────────────── */
    {
      id: "router",
      n: 8,
      title: "core/router.py и attempt()",
      summary: "Задача 1: одна попытка — генерация, тесты, судья",
      blocks: [
        { type: "p", text: "Роутер — это каскад: дешёвая модель → гейт → эскалация при провале. Задача 1 — реализовать <code>attempt()</code>: <strong>одну</strong> попытку, без эскалации." },
        { type: "code", caption: "контракт", lines: [
          "def attempt(model: Model, task: TaskSpec, test_source: str,",
          "            level: int = 1) -> Attempt:",
          '    raise NotImplementedError("ЗАДАЧА 1: реализуйте attempt()")',
        ]},
        { type: "h2", text: "8.1. Порядок действий" },
        { type: "ol", items: [
          "Собрать промпт воркера из <code>task.spec</code> и <code>task.acceptance</code>",
          "Вызвать <code>call(model, WORKER_SYSTEM, prompt)</code>",
          "Если <code>res.error</code> — вернуть <code>Attempt</code> с <code>passed=False</code> и причиной",
          "Достать код через <code>extract_code(res.text)</code>",
          "Прогнать <code>run_tests(code, test_source, task.function_name)</code>",
          "Вызвать <code>judge(judge_for(model), ...)</code> — судья другого вендора",
          "Собрать <code>passed</code> как «тесты зелёные И вердикт approve»",
          "Заполнить поля <code>Attempt</code>: <code>generate_cost</code>, <code>judge_cost</code>, <code>tests_passed/total</code>, <code>judge_score</code>, <code>reason</code>",
        ]},
        { type: "note", kind: "warn", title: "Решение, которое надо принять самому",
          text: "Вызывать ли судью, если тесты уже провалились? Судья стоит денег. В коде это должно быть решением с комментарием-обоснованием, а не случайностью. Подумайте: что даёт ревью кода, который заведомо не проходит тесты?" },
        { type: "h2", text: "8.2. Почему total_cost — property" },
        { type: "code", caption: "Attempt", lines: [
          "@property",
          "def total_cost(self) -> float:",
          '    """Полная стоимость попытки: генерация + проверка."""',
          "    return self.generate_cost + self.judge_cost",
        ]},
        { type: "p", text: "<code>@property</code> — вычисляемое поле без скобок при обращении. Важно: судья тоже платный. Если считать только генерацию, экономия каскада будет завышена, и график на защите развалится от первого вопроса." },
        { type: "checks", items: [
          { id: "rtr-1", text: "Реализовал(а) <code>attempt()</code> по контракту, без подсказок в коде" },
          { id: "rtr-2", text: "Чекер <code>check_task1.py</code> зелёный: 7 проверок и кейс B" },
          { id: "rtr-3", text: "Принял(а) и закомментировал(а) решение про вызов судьи при упавших тестах" },
          { id: "rtr-4", text: "Записал(а) цифры прогона: cost per task, доля успеха уровня 1" },
        ]},
      ],
      tasks: [
        { id: "rtr-t1", title: "Реализовать attempt()", why: "Первая задача, которую нельзя списать: контракт есть, логики нет.", cmd: "cd /root/cost-router && .venv/bin/python check_task1.py" },
        { id: "rtr-t2", title: "Задача 2: цикл каскада", why: "Эскалация уровней, накопление попыток, итоговая стоимость.", cmd: "cd /root/cost-router && git log --oneline -3   # посмотреть, где остановились" },
      ],
    },

    /* ─────────────────────────── 9 ─────────────────────────── */
    {
      id: "git",
      n: 9,
      title: "Git: рабочий цикл",
      summary: "status, add, commit, push, что коммитить и что нет",
      blocks: [
        { type: "p", text: "Git хранит историю изменений. Минимальный цикл: посмотреть, что изменилось → добавить нужное → зафиксировать с осмысленным сообщением → отправить в GitHub." },
        { type: "code", caption: "цикл", lines: [
          "git status -s",
          "git add core/router.py",
          'git commit -m "feat: implement attempt() with double gate"',
          "git push",
        ]},
        { type: "p", text: "Сообщение коммита — для человека через полгода (и для себя). <code>feat:</code> новая функциональность, <code>fix:</code> исправление, <code>docs:</code> документы, <code>chore:</code> инфраструктура." },
        { type: "h2", text: "9.1. Что не коммитить" },
        { type: "code", caption: ".gitignore", lines: [
          ".venv/",
          "__pycache__/",
          "*.pyc",
          ".env",
          "artifacts/",
        ]},
        { type: "note", kind: "warn", title: "Проверка перед первым пушем",
          text: "<code>git status</code> не должен показывать <code>.env</code> и <code>.venv</code>. Если показывает — <code>.gitignore</code> не работает, и ключ утечёт в историю: удалить файл потом недостаточно, он останется в коммите." },
        { type: "checks", items: [
          { id: "git-1", text: "Сделал(а) коммит задачи 1 своими руками, с осмысленным сообщением" },
          { id: "git-2", text: "Проверил(а) <code>git status</code>: нет <code>.env</code> и <code>.venv</code>" },
          { id: "git-3", text: "Запушил(а) в свой репозиторий и вижу коммит на GitHub" },
        ]},
      ],
      tasks: [
        { id: "git-t1", title: "Первый собственный коммит", why: "Дальше весь прогресс фиксируется в истории — это и есть доказательство работы.", cmd: "cd /root/cost-router && git status -s" },
      ],
    },
  ],

  /* ── план: 7 фаз трека B ─────────────────────────────────── */
  plan: {
    title: "План: 7 фаз трека B",
    lede: "AI Product Engineer (Organic Soft и вакансии этого класса). Каждая фаза закрывается артефактом и числами. Без чисел фаза не считается пройденной. Фазы 1–3 разобраны практически в шагах 10–12.",
    phases: [
      { n: 0, title: "База", what: "Шаги 1–9 курса, затем attempt() и задача 2 в cost-router", closes: ["C4", "P3"], metric: "чекер зелёный, код написан без подсказок",
        todo: [{ id: "ph0-1", text: "Шаги 1–9 курса пройдены" }, { id: "ph0-2", text: "attempt() реализован, check_task1.py зелёный" }, { id: "ph0-3", text: "Задача 2: цикл каскада с эскалацией" }] },
      { n: 1, title: "LLM-шлюз", what: "cost-router → HTTP-сервис: tiering по сложности, квоты на ключ, structured output — практика в шаге 10", closes: ["C1", "C3", "C4", "P2", "P4", "R9"], metric: "cost per task, p95 latency, доля эскалаций; тесты на таймаут/429/битый JSON",
        todo: [{ id: "ph1-1", text: "HTTP-эндпоинт с выбором уровня по сложности задачи" }, { id: "ph1-2", text: "Квоты и учёт стоимости на ключ" }, { id: "ph1-3", text: "Тесты на временные ошибки и битый JSON" }] },
      { n: 2, title: "Память + RAG", what: "Персистентное состояние многошагового workflow, retrieval, изоляция между проектами — практика в шаге 11", closes: ["C2", "P4", "R10"], metric: "hit rate / precision@k, стоимость на диалог, доказанная изоляция тенантов",
        todo: [{ id: "ph2-1", text: "Хранилище состояния сценария между шагами" }, { id: "ph2-2", text: "Retrieval с метрикой качества" }, { id: "ph2-3", text: "Тест изоляции: чужой проект не видит данные" }] },
      { n: 3, title: "Evals", what: "Харнесс: сценарии, критерии, инъекция отказов, регрессии в CI — практика в шаге 12", closes: ["C1", "P5", "P8", "R5", "R8"], metric: "% успеха до/после изменения промпта; разделение «модель» vs «код»",
        todo: [{ id: "ph3-1", text: "Набор сценариев с критериями" }, { id: "ph3-2", text: "Инъекция отказов инструментов и прерываний" }, { id: "ph3-3", text: "Прогон в CI на каждый коммит" }] },
      { n: 4, title: "Data + эксперимент", what: "SQL по реальным данным, гипотеза, метрика, размер выборки, интерпретация", closes: ["P7", "P8", "P9"], metric: "отчёт эксперимента: эффект, доверительный интервал, вывод",
        todo: [{ id: "ph4-1", text: "SQL-запросы по реальной выборке" }, { id: "ph4-2", text: "Расчёт размера выборки для A/B" }, { id: "ph4-3", text: "Отчёт с эффектом и неопределённостью" }] },
      { n: 5, title: "Стек продукта", what: "TS/Node: порт одного компонента (шлюз или MCP-клиент) на их стек", closes: ["P10"], metric: "работающий сервис на Node, сравнение с Python-версией",
        todo: [{ id: "ph5-1", text: "Компонент портирован на TypeScript" }, { id: "ph5-2", text: "Тесты и те же метрики" }, { id: "ph5-3", text: "Записано сравнение реализаций" }] },
      { n: 6, title: "Клиентский прод", what: "Та же связка у клиента студии: AI-фича в живом продукте с метриками", closes: ["P3", "P9", "C5"], metric: "кейс «проблема → гипотеза → внедрение → метрика» с цифрами",
        todo: [{ id: "ph6-1", text: "Выбран клиентский сценарий с измеримой метрикой" }, { id: "ph6-2", text: "Фича выкачена в прод" }, { id: "ph6-3", text: "Замер до/после и разбор" }] },
    ],
  },
};
