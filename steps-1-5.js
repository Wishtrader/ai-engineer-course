/* Шаги 1–5: окружение, точка входа, импорты, config.py, llm.py.
   Глубокий разбор: механика под капотом + примеры с реальным выводом. */

(function () {
  const steps = [

    /* ═══════════════════════ 1. Окружение ═══════════════════════ */
    {
      id: "env",
      n: 1,
      title: "Окружение: что происходит под капотом",
      summary: "Интерпретатор, байткод, venv, pip, .env — и почему одной установки Python мало",
      blocks: [
        { type: "p", text: "Этот шаг кажется скучной подготовкой, но 80% «непонятных ошибок» новичка — именно здесь: не тот интерпретатор, не тот <code>site-packages</code>, ключ не подхватился. Разберём механику, а не ритуалы." },

        { type: "h2", text: "1.1. Python — программа, которая читает текст" },
        { type: "p", text: "<code>python3 file.py</code> делает три вещи: читает файл как текст, компилирует его в <strong>байткод</strong> (внутренний язык виртуальной машины), исполняет байткод в CPython. Компиляции в отдельный исполняемый файл, как в C или Go, нет — но и «чистой интерпретации строка за строкой» тоже нет." },
        { type: "code", caption: "посмотреть, во что превращается функция", lang: "bash", lines: [
          ".venv/bin/python -c \"import dis; dis.dis('def f(x): return x*2')\"",
          "#  LOAD_CONST   0 (1)      ← константа-множитель",
          "#  LOAD_FAST    0 (x)      ← аргумент",
          "#  BINARY_OP    5 (*)      ← умножение",
          "#  RETURN_VALUE",
        ]},
        { type: "p", text: "Байткод кэшируется в папке <code>__pycache__</code> рядом с исходником (файлы <code>*.pyc</code>). Это чистое ускорение повторного запуска: при изменении исходника кэш пересоздаётся. Поэтому <code>__pycache__</code> не коммитят." },
        { type: "note", kind: "tip", title: "Зачем это знать",
          text: "Из «есть байткод и кэш» следуют два практических вывода: правки в <code>.py</code> применяются без пересборки, а долгоживущий процесс (сервер, бот) старый код <strong>не увидит</strong>, пока его не перезапустить — знакомый всем «я же поправил, почему не работает»." },

        { type: "h2", text: "1.2. venv: три уровня Python" },
        { type: "p", text: "Виртуальное окружение — не копия интерпретатора (копия была бы гигабайтной), а папка с конфигом и своим <code>site-packages</code>, которая ссылается на системный Python. Различают три пути:" },
        { type: "ul", items: [
          "<code>sys.prefix</code> — текущее окружение (то, что вы активировали);",
          "<code>sys.base_prefix</code> — «настоящий» Python, на который окружение ссылается;",
          "<code>sys.executable</code> — конкретный бинарник, который сейчас работает.",
        ]},
        { type: "code", caption: "проверить, что окружение действительно своё", lang: "bash", lines: [
          "cat .venv/pyvenv.cfg          # home = путь к базовому Python",
          ".venv/bin/python -c \"import sys; print(sys.prefix); print(sys.base_prefix); print(sys.executable)\"",
          "# /root/cost-router/.venv",
          "# /root/.hermes/tools/python-3.14.9.../bin   ← базовый",
          "# /root/cost-router/.venv/bin/python         ← запущенный",
        ]},
        { type: "p", text: "Если <code>sys.prefix == sys.base_prefix</code> — вы <strong>не в окружении</strong>, и пакеты проекта не найдутся. Это самая частая причина ошибки <code>ModuleNotFoundError: pytest</code>." },
        { type: "note", kind: "warn", title: "Почему activate — не магия",
          text: "<code>source .venv/bin/activate</code> всего лишь меняет <code>PATH</code> и подсказку в приглашении. Он не влияет на уже запущенные процессы и не действует на новые окна терминала. Поэтому в проекте мы везде пишем <code>.venv/bin/python</code> — путь нельзя «забыть активировать»." },

        { type: "h2", text: "1.3. pip: куда именно ставятся пакеты" },
        { type: "p", text: "<code>pip</code> скачивает <strong>wheel</strong> (готовый архив с кодом и метаданными), распаковывает в <code>site-packages</code> того окружения, из которого запущен, и пишет запись в <code>*.dist-info</code>. Никакой «глобальной установки» по умолчанию нет — но только если вы запускаете pip из окружения." },
        { type: "code", caption: "три команды, которые отвечают на все вопросы про пакет", lang: "bash", lines: [
          ".venv/bin/pip show -f pytest     # версия, где лежит, список файлов",
          ".venv/bin/python -c \"import pytest, sys; print(pytest.__file__)\"",
          ".venv/bin/python -m pytest --version",
        ]},
        { type: "p", text: "Разница между <code>pip</code> и <code>python -m pip</code>: второй гарантированно соответствует тому интерпретатору, который вы вызвали. Если в системе несколько Python, <code>pip</code> может оказаться от другого — классическая ловушка «поставил, а не видно»." },

        { type: "h2", text: "1.4. .env: как ключ попадает в код" },
        { type: "p", text: "Проект не использует <code>python-dotenv</code> — ключ читается вручную, с приоритетом переменной окружения над файлом. Вот реальный код из <code>core/llm.py</code>:" },
        { type: "code", caption: "приоритет источников ключа", lines: [
          "def _api_key() -> str:",
          '    key = os.getenv("OPENROUTER_API_KEY", "").strip()',
          "    if key:",
          "        return key                      # 1) переменная окружения",
          "    for path in (\"/root/.hermes/.env\", \"/root/.hermes/profiles/xzx/.env\"):",
          "        try:",
          "            for line in open(path, encoding=\"utf-8\", errors=\"replace\"):",
          '                if line.startswith("OPENROUTER_API_KEY="):',
          "                    return line.split(\"=\", 1)[1].strip()",
          "        except OSError:",
          "            continue",
          '    raise RuntimeError("OPENROUTER_API_KEY не задан")   # 3) явная ошибка',
        ]},
        { type: "p", text: "Порядок важен: переменная окружения побеждает файл. Так можно разово переопределить ключ на один запуск (<code>OPENROUTER_API_KEY=... python check_task1.py</code>), не редактируя <code>.env</code>. А последняя строка — пример хорошего сообщения об ошибке: падать нужно с понятным текстом, а не с <code>KeyError: None</code>." },
        { type: "note", kind: "warn", title: "Секреты и git",
          text: "<code>.env</code> обязан быть в <code>.gitignore</code>. Если файл уже попал в историю — удалить его новым коммитом недостаточно, он останется в старых снимках. Тогда ключ отзывают и чистят историю (<code>git filter-repo</code>), и это правильный порядок: сначала отозвать, потом чистить." },

        { type: "h2", text: "1.5. Воспроизводимость: почему ==, а не >=" },
        { type: "code", caption: "requirements.txt проекта", lang: "bash", lines: [
          "pytest==8.3.4",
          "",
          "# альтернатива для приложений (не библиотек):",
          "# pip freeze > requirements.lock",
          "# pip install --require-hashes -r requirements.lock",
        ]},
        { type: "p", text: "Точные версии — это про воспроизводимость: у вас и у CI одинаковое поведение. <code>&gt;=</code> означает «через полгода поставлю что-то другое», и тесты внезапно начинают вести себя иначе. Библиотеки (то, что импортируют другие) наоборот пишут диапазоны — там важна совместимость, а не фиксация." },

        { type: "note", kind: "warn", title: "Ловушка: venv нельзя копировать",
          text: "Внутри окружения есть файлы с абсолютными путями: первая строка <code>.venv/bin/pip</code> указывает на конкретный интерпретатор. Скопированный <code>cp -r</code> venv внешне работает, но <code>pip</code> ставит пакеты в <strong>чужую</strong> папку. Проверка — <code>head -1 .venv/bin/pip</code>; лечение — удалить и создать заново (две команды)." },

        { type: "checks", items: [
          { id: "env-1", text: "<code>sys.prefix</code> указывает на <code>.venv</code>, а <code>sys.base_prefix</code> — на системный Python" },
          { id: "env-2", text: "Знаю, где физически лежит пакет: <code>pip show -f pytest</code> и <code>pytest.__file__</code>" },
          { id: "env-3", text: "pytest установлен именно в проектное окружение: <code>.venv/bin/python -m pytest --version</code> → 8.3.4" },
          { id: "env-4", text: "Понимаю приоритет источников ключа: переменная окружения → .env → RuntimeError" },
          { id: "env-5", text: "<code>git check-ignore -v .env</code> подтверждает, что ключ не уйдёт в git" },
          { id: "env-6", text: "Видел(а) байткод через <code>dis</code> и понимаю, зачем <code>__pycache__</code>" },
        ]},
      ],
      tasks: [
        { id: "env-t1", title: "Создать окружение с нуля и проверить три пути", why: "Пока не увидите разницу prefix/base_prefix, путаница с «не тем Python» будет возвращаться.", cmd: "cd /root/cost-router && .venv/bin/python -c \"import sys; print(sys.prefix); print(sys.base_prefix)\"" },
        { id: "env-t2", title: "Сломать интерпретатор намеренно", why: "Ошибка ModuleNotFoundError запоминается лучше, если вызвать её самому.", cmd: "cd /root/cost-router && python3 -m pytest --version; echo \"exit=$?\"" },
        { id: "env-t3", title: "Переопределить ключ на один запуск", why: "Понять приоритет env над .env — это пригодится в CI.", cmd: "cd /root/cost-router && OPENROUTER_API_KEY=bad .venv/bin/python -c \"from core.llm import _api_key; print(_api_key()[:6])\"" },
      ],
    },

    /* ═══════════════════════ 2. Точка входа ═══════════════════════ */
    {
      id: "entry",
      n: 2,
      title: "Точка входа: как Python находит и запускает программу",
      summary: "sys.path, три режима запуска, механика импорта, __name__, гард и код выхода",
      blocks: [
        { type: "p", text: "Здесь самая частая путаница новичка: «Python не находит мой модуль». Причина почти всегда одна — непонимание того, что <strong>файл ищет оболочка, а модули ищет Python</strong>, и делает это по списку <code>sys.path</code>." },

        { type: "h2", text: "2.1. Кто что ищет" },
        { type: "ul", items: [
          "<code>python check_task1.py</code> — <strong>bash</strong> ищет файл в текущей папке и передаёт Python абсолютный путь. Если файла нет, Python даже не запустится (<code>can't open file</code>).",
          "<code>from core.config import CASCADE</code> — <strong>Python</strong> ищет пакет <code>core</code> в каждом каталоге из <code>sys.path</code> по порядку и берёт первое совпадение.",
        ]},

        { type: "h2", text: "2.2. Механика импорта: finder → loader → sys.modules" },
        { type: "p", text: "Импорт — не «чтение файла», а конвейер: <strong>finder</strong> обходит <code>sys.path</code> и находит спецификацию модуля, <strong>loader</strong> исполняет его код в новом пространстве имён, результат кладётся в словарь <code>sys.modules</code>. Второй импорт того же модуля код <strong>не выполняет</strong> — берёт готовый объект из кэша." },
        { type: "code", caption: "посмотреть, что Python нашёл и что уже загружено", lines: [
          "import importlib.util, sys",
          "spec = importlib.util.find_spec(\"core.config\")",
          "print(spec.origin)        # /root/cost-router/core/config.py",
          "print(\"core.config\" in sys.modules)   # False до импорта",
          "import core.config",
          "print(\"core.config\" in sys.modules)   # True после",
        ]},
        { type: "note", kind: "tip", title: "Почему это важно",
          text: "Кэш <code>sys.modules</code> объясняет три вещи сразу: повторный импорт дешёвый; правки в файле не подхватываются без перезапуска; ошибки вида <code>partially initialized module</code> появляются при циклическом импорте." },

        { type: "h2", text: "2.3. Из чего складывается sys.path" },
        { type: "p", text: "Список собирается из четырёх источников: позиция запуска (0-й элемент), <code>PYTHONPATH</code>, стандартная библиотека, <code>site-packages</code> активного окружения. Плюс файлы <code>.pth</code> в site-packages, которые добавляют пути при старте." },
        { type: "code", caption: "полный путь поиска в этом проекте", lang: "bash", lines: [
          ".venv/bin/python -c \"import sys; [print(i, p) for i,p in enumerate(sys.path)]\"",
          "# 0                                                       ← см. 2.4",
          "# 1  .../python314.zip                                    ← stdlib (архив)",
          "# 2  .../lib/python3.14                                   ← stdlib",
          "# 3  .../lib-dynload                                      ← бинарные модули",
          "# 4  /root/cost-router/.venv/lib/python3.14/site-packages ← пакеты проекта",
        ]},
        { type: "p", text: "Порядок — это приоритет. Файл <code>json.py</code> в корне проекта окажется <strong>раньше</strong> стандартного модуля и затенит его: половина библиотек начнёт падать с загадочными ошибками. Правило: не называйте свои файлы именами из stdlib." },

        { type: "h2", text: "2.4. Три режима запуска — три разных sys.path[0]" },
        { type: "code", caption: "сравнить поведение", lang: "bash", lines: [
          "# 1) скрипт: в позицию 0 попадает ПАПКА ФАЙЛА",
          ".venv/bin/python /root/cost-router/check_task1.py     # sys.path[0] = /root/cost-router",
          "",
          "# 2) модуль: в позицию 0 попадает текущая папка (cwd)",
          "cd /root/cost-router && .venv/bin/python -m core.router # sys.path[0] = /root/cost-router",
          "",
          "# 3) -c: тоже cwd",
          ".venv/bin/python -c \"import sys; print(repr(sys.path[0]))\"  # ''",
        ]},
        { type: "p", text: "Следствие, которое стоит запомнить: из другой папки запуск по полному пути <strong>работает</strong> (скрипт приносит свой каталог в path), а <code>python -c \"import check_task1\"</code> из другой папки — <strong>падает</strong>, потому что в пути там только cwd." },

        { type: "h2", text: "2.5. __name__: почему один файл ведёт себя по-разному" },
        { type: "p", text: "Запущенный файл получает имя <code>\"__main__\"</code>; импортированный — имя модуля. Это единственное различие, на котором держится вся конструкция в конце файла." },
        { type: "code", caption: "два сценария, один файл", lang: "bash", lines: [
          "printf 'print(__name__)\\n' > probe.py",
          ".venv/bin/python probe.py               # __main__",
          ".venv/bin/python -c \"import probe\"      # probe",
        ]},
        { type: "code", caption: "гард в check_task1.py", lines: [
          "def main() -> int:",
          "    ...",
          "    return 0 if not failures else 1",
          "",
          'if __name__ == "__main__":',
          "    sys.exit(main())",
        ]},
        { type: "p", text: "Гард прячет только <strong>вызов</strong>. Всё, что написано на верхнем уровне, выполняется и при импорте: импорты, константы (<code>GREEN = \"\\033[32m\"</code>), объявления функций, <code>failures: list[str] = []</code>. Поэтому правило — на нулевом отступе только объявления." },
        { type: "note", kind: "warn", title: "Что было бы без гарда",
          text: "Любой <code>import check_task1</code> — из pytest, из IDE, из соседнего скрипта — запустил бы весь чекер: чтение JSON, обращение к моделям, деньги. Гард — это не стиль, а защита от побочных эффектов." },

        { type: "h2", text: "2.6. Код выхода: контракт с оболочкой и CI" },
        { type: "code", caption: "как это работает в терминале", lang: "bash", lines: [
          ".venv/bin/python check_task1.py; echo \"exit=$?\"",
          "# exit=1   ← attempt() ещё не реализован",
          "",
          ".venv/bin/python check_task1.py && echo \"сдано\" || echo \"не сдано\"",
        ]},
        { type: "p", text: "<code>sys.exit(N)</code> завершает процесс с кодом N. Ноль — успех, любое другое число — ошибка. Именно на этом строятся CI, git-хуки и цепочки <code>&amp;&amp;</code>: текст на экране может быть каким угодно, а решение принимается по коду." },

        { type: "checks", items: [
          { id: "entry-1", text: "Понимаю разницу: файл ищет оболочка, модуль ищет Python по <code>sys.path</code>" },
          { id: "entry-2", text: "Проверил(а) <code>sys.path[0]</code> во всех трёх режимах: скрипт / <code>-m</code> / <code>-c</code>" },
          { id: "entry-3", text: "Знаю, что порядок в <code>sys.path</code> решает, какой модуль загрузится" },
          { id: "entry-4", text: "Увидел(а) <code>__name__ == \"__main__\"</code> и имя модуля при импорте" },
          { id: "entry-5", text: "Объясняю, почему гард не спасает от кода верхнего уровня" },
          { id: "entry-6", text: "Проверил(а) код выхода через <code>echo $?</code> и цепочку <code>&amp;&amp;</code>" },
          { id: "entry-7", text: "Убедился(ась), что <code>import check_task1</code> ничего не печатает" },
        ]},
      ],
      tasks: [
        { id: "entry-t1", title: "Поймать разницу режимов запуска", why: "Одна команда показывает, откуда берётся 0-й элемент sys.path.", cmd: "printf 'import sys; print(repr(sys.path[0]))\\n' > /tmp/p.py && cd /tmp && /root/cost-router/.venv/bin/python /tmp/p.py && /root/cost-router/.venv/bin/python -c 'import sys; print(repr(sys.path[0]))'" },
        { id: "entry-t2", title: "Убрать гард в копии файла", why: "Увидеть своими глазами, что происходит при импорте без защиты.", cmd: "cd /root/cost-router && cp check_task1.py /tmp/ck.py && sed -i 's/if __name__/if True or __name__/' /tmp/ck.py && grep -n 'if True' /tmp/ck.py" },
        { id: "entry-t3", title: "Проверить кэш импортов", why: "Понять, почему правки в файле не видны в запущенном процессе.", cmd: "cd /root/cost-router && .venv/bin/python -c \"import sys; print('core.config' in sys.modules); import core.config; print('core.config' in sys.modules)\"" },
      ],
    },

    /* ═══════════════════════ 3. Импорты ═══════════════════════ */
    {
      id: "imports",
      n: 3,
      title: "Импорты и структура пакета",
      summary: "Модуль, пакет, __init__.py, абсолютные и относительные импорты, циклические зависимости, слои",
      blocks: [
        { type: "p", text: "Проект состоит из шести файлов в папке <code>core</code>, но именно импорты определяют, что от чего зависит и в каком порядке это можно менять. Понимание слоёв — то, что отличает «код работает» от «код можно развивать»." },
        { type: "code", caption: "структура проекта и направление зависимостей", lang: "bash", lines: [
          "cost-router/",
          "├── check_task1.py      → импортирует core.config, core.router",
          "├── core/",
          "│   ├── __init__.py     ← пустой: помечает пакет",
          "│   ├── config.py       ← ни от кого не зависит (нижний слой)",
          "│   ├── llm.py          ← зависит от config",
          "│   ├── verifier.py     ← stdlib + ничего из core",
          "│   ├── judge.py        ← зависит от config, llm",
          "│   └── router.py       ← зависит от всех (верхний слой)",
          "├── tasks/  *.json      ← данные",
          "└── tests/  *.py        ← pytest-тесты задач",
        ]},

        { type: "h2", text: "3.1. Модуль, пакет и __init__.py" },
        { type: "ul", items: [
          "<strong>Модуль</strong> — один файл <code>.py</code>, импортируется по имени без расширения.",
          "<strong>Пакет</strong> — папка с <code>__init__.py</code>; сам <code>__init__.py</code> может быть пустым.",
          "<strong>Namespace-пакет</strong> — папка без <code>__init__.py</code>; существует, но неявных гарантий нет — для прикладного кода так делать не стоит.",
        ]},
        { type: "p", text: "В <code>__init__.py</code> <strong>можно</strong> поднимать удобные имена (<code>from .config import Model</code>), но <strong>не стоит</strong> держать тяжёлую логику: он выполняется при первом импорте любого подмодуля — то есть платить будет каждый, кто просто импортирует пакет." },
        { type: "code", caption: "что видно снаружи при пустом __init__.py", lang: "bash", lines: [
          ".venv/bin/python -c \"import core; print([n for n in dir(core) if not n.startswith('_')])\"",
          "# []   ← пакет пуст, модули надо импортировать по имени",
          ".venv/bin/python -c \"from core.config import Model; print(Model.__module__)\"",
          "# core.config",
        ]},

        { type: "h2", text: "3.2. Абсолютные и относительные импорты" },
        { type: "code", caption: "оба варианта в проекте", lines: [
          "# в check_task1.py — он СНАРУЖИ пакета, только абсолютный",
          "from core.config import CASCADE",
          "from core.router import TaskSpec, attempt",
          "",
          "# внутри core/router.py — относительный",
          "from .config import CASCADE, MIN_SCORE, Model, estimate_cost, judge_for, level_of",
          "from .llm import call, extract_code",
          "from .verifier import run_tests",
        ]},
        { type: "p", text: "Точка — это «текущий пакет», две точки — «родительский». Работает только там, где у модуля есть пакет-родитель. У файла, запущенного как программа, <code>__package__</code> пуст, и Python выдаст <code>ImportError: attempted relative import with no known parent package</code>." },
        { type: "note", kind: "tip", title: "Практическое правило",
          text: "Внутри пакета — относительные импорты (короче и не зависят от того, как пакет назовут снаружи). Точка входа вне пакета — абсолютные. Смешивать в одном файле незачем." },

        { type: "h2", text: "3.3. Циклические импорты: почему падает и как чинить" },
        { type: "p", text: "Python исполняет модуль сверху вниз. Если <code>a</code> импортирует <code>b</code>, а <code>b</code> в этот момент импортирует <code>a</code>, второй увидит <strong>частично инициализированный</strong> модуль: то, что объявлено ниже строки импорта, ещё не существует." },
        { type: "code", caption: "три способа разорвать цикл", lines: [
          "# 1) вынести общее в отдельный модуль (лучший)",
          "#    config.py не знает ни о ком — cycle невозможен",
          "",
          "# 2) импорт внутри функции (быстро, но прячет зависимость)",
          "def build_router():",
          "    from .router import attempt",
          "    return attempt",
          "",
          "# 3) только для аннотаций типов",
          "from typing import TYPE_CHECKING",
          "if TYPE_CHECKING:",
          "    from .router import Attempt",
        ]},
        { type: "p", text: "В этом проекте циклов нет по конструкции: <code>config</code> — нижний слой, <code>router</code> — верхний. Проверить себя можно, нарисовав стрелки: они всегда должны идти в одну сторону — вниз по слоям." },

        { type: "checks", items: [
          { id: "imp-1", text: "Знаю, что делает пустой <code>core/__init__.py</code> и почему в нём не должно быть логики" },
          { id: "imp-2", text: "Объясняю разницу <code>from core.config import X</code> и <code>from .config import X</code>" },
          { id: "imp-3", text: "Могу назвать, почему относительный импорт падает при запуске файла как программы" },
          { id: "imp-4", text: "Понимаю, что такое частично инициализированный модуль при цикле" },
          { id: "imp-5", text: "Знаю три способа разорвать циклическую зависимость" },
          { id: "imp-6", text: "Нарисовал(а) граф импортов проекта и проверил(а), что он без циклов" },
        ]},
      ],
      tasks: [
        { id: "imp-t1", title: "Сломать импорт нарочно", why: "Увидеть текст ModuleNotFoundError и понять, что он говорит о sys.path, а не о синтаксисе.", cmd: "cd /root/cost-router && mv core/__init__.py /tmp/ && .venv/bin/python -c 'import core.config'; mv /tmp/__init__.py core/" },
        { id: "imp-t2", title: "Собрать граф импортов одной командой", why: "Проверить направление зависимостей, не открывая пять файлов.", cmd: "cd /root/cost-router && grep -rn '^from \\.' core/*.py" },
      ],
    },

    /* ═══════════════════════ 4. config.py ═══════════════════════ */
    {
      id: "config",
      n: 4,
      title: "core/config.py: данные, типы и цена",
      summary: "dataclass и frozen, расчёт стоимости на реальных числах, детерминированный выбор судьи",
      blocks: [
        { type: "p", text: "Файл делает три вещи: объявляет модель как тип данных, задаёт каскад с ценами и считает стоимость вызова. Это фундамент экономики всего эксперимента — если цены или формула неверны, все дальнейшие выводы тоже." },

        { type: "h2", text: "4.1. dataclass: что генерируется и зачем frozen" },
        { type: "code", caption: "объявление", lines: [
          "@dataclass(frozen=True)",
          "class Model:",
          "    id: str",
          "    vendor: str",
          "    price_in_per_1m: float     # $ за 1M входных токенов",
          "    price_out_per_1m: float    # $ за 1M выходных токенов",
        ]},
        { type: "p", text: "<code>@dataclass</code> генерирует <code>__init__</code>, <code>__repr__</code> и <code>__eq__</code> по полям. <code>frozen=True</code> добавляет запрет на присваивание и, при необходимости, <code>__hash__</code> — объект становится неизменяемым значением." },
        { type: "code", caption: "почему frozen — не педантизм", lang: "bash", lines: [
          ".venv/bin/python -c \"from core.config import CASCADE; m = CASCADE[0]; print(m)\"",
          "# Model(id='meta-llama/llama-3.3-70b-instruct', vendor='meta', ...)",
          ".venv/bin/python -c \"from core.config import CASCADE; CASCADE[0].price_in_per_1m = 0\"",
          "# dataclasses.FrozenInstanceError: cannot assign to field 'price_in_per_1m'",
        ]},
        { type: "p", text: "Каскад — глобальная константа. Если бы её можно было менять, один прогон мог бы незаметно испортить цены для всех последующих, а отладить это крайне неприятно." },

        { type: "h2", text: "4.2. Каскад: порядок данных = политика" },
        { type: "code", caption: "CASCADE — от дешёвой к дорогой", lines: [
          "CASCADE: list[Model] = [",
          '    Model("meta-llama/llama-3.3-70b-instruct", "meta",      0.100,  0.320),  # ур. 1',
          '    Model("openai/gpt-4o-mini",                "openai",    0.150,  0.600),  # ур. 2',
          '    Model("google/gemini-2.5-flash",           "google",    0.300,  2.500),  # ур. 3',
          '    Model("anthropic/claude-sonnet-4.5",       "anthropic", 3.000, 15.000),  # ур. 4',
          "]",
        ]},
        { type: "p", text: "Индекс списка — это уровень. <code>level_of(0) == 1</code>, поэтому весь остальной код может говорить «уровнями» (1..4), а не индексами. Такая мелочь убирает off-by-one в отчётах и логах." },

        { type: "h2", text: "4.3. Стоимость: считаем на реальных числах" },
        { type: "code", caption: "формула", lines: [
          "def estimate_cost(model: Model, tokens_in: int, tokens_out: int) -> float:",
          "    return (tokens_in / 1_000_000) * model.price_in_per_1m + \\",
          "           (tokens_out / 1_000_000) * model.price_out_per_1m",
        ]},
        { type: "code", caption: "один и тот же запрос на двух уровнях", lang: "bash", lines: [
          ".venv/bin/python -c \"from core.config import CASCADE, estimate_cost; print(round(estimate_cost(CASCADE[0], 1200, 300), 8))\"",
          ".venv/bin/python -c \"from core.config import CASCADE, estimate_cost; print(round(estimate_cost(CASCADE[3], 1200, 300), 8))\"",
          "# llama : 0.000216    (1200*0.1 + 300*0.32)/1M",
          "# sonnet: 0.0081      (1200*3.0 + 300*15.0)/1M",
          "# разница ≈ 37x — это и есть предмет оптимизации",
        ]},
        { type: "p", text: "Выходные токены почти всегда дороже входных (у sonnet — в 5 раз), потому что генерация дороже чтения. Отсюда практическое правило: сокращать <strong>не только контекст, но и длину ответа</strong> — <code>max_tokens</code> и требование краткого формата экономят больше, чем кажется." },

        { type: "h2", text: "4.4. judge_for: детерминированный выбор другого вендора" },
        { type: "code", caption: "реализация", lines: [
          "def judge_for(worker: Model) -> Model:",
          "    candidates = [j for j in JUDGES if j.vendor != worker.vendor]",
          "    if not candidates:",
          '        raise ValueError(f"нет судьи другого вендора для {worker.vendor}")',
          "    return candidates[sum(ord(c) for c in worker.id) % len(candidates)]",
        ]},
        { type: "p", text: "Здесь два решения, каждое можно защищать на интервью. Первое: <strong>судья не того же вендора</strong> — ошибки моделей одного разработчика коррелированы, и «свой» судья систематически пропускает «свои» ошибки. Второе: выбор <strong>детерминированный</strong> (хэш от id), а не случайный — иначе один и тот же прогон даёт разные результаты, и отлаживать невозможно." },

        { type: "h2", text: "4.5. MIN_SCORE: порог — это калибровка, а не константа" },
        { type: "p", text: "<code>MIN_SCORE = 3.5</code> — не «правильное число из учебника». Это параметр, который подбирается по данным: прогоняем судью на N задачах с известным верным ответом и смотрим, при каком пороге доля ложных approve падает до приемлемой. В учебном демо он взят «на глаз», и это нормально — но должно быть записано, что он не откалиброван." },
        { type: "note", kind: "warn", title: "Как это спрашивают на интервью",
          text: "«Почему 3.5?» — плохой ответ: «так в примере». Хороший: «порог подобран на размеченном наборе, цена ложного пропуска выше цены ложного отказа, поэтому порог сдвинут вверх; при изменении судьи порог пересматривается»." },

        { type: "checks", items: [
          { id: "cfg-1", text: "Знаю, какие методы генерирует <code>@dataclass</code> и что добавляет <code>frozen=True</code>" },
          { id: "cfg-2", text: "Посчитал(а) вручную стоимость 1200 входных / 300 выходных токенов для llama и sonnet" },
          { id: "cfg-3", text: "Понимаю, почему выходные токены дороже и как это влияет на <code>max_tokens</code>" },
          { id: "cfg-4", text: "Объясняю, зачем судья другого вендора и почему выбор детерминированный" },
          { id: "cfg-5", text: "Знаю, что <code>MIN_SCORE</code> — калибруемый параметр, а не истина" },
          { id: "cfg-6", text: "Могу назвать, что сломается, если каскад перестанет быть отсортирован по цене" },
        ]},
      ],
      tasks: [
        { id: "cfg-t1", title: "Проверить, что каскад отсортирован", why: "Дешёвая модель обязана быть первой, иначе каскад не экономит, а наоборот.", cmd: "cd /root/cost-router && .venv/bin/python -c \"from core.config import CASCADE; print([(m.id, m.price_out_per_1m) for m in CASCADE])\"" },
        { id: "cfg-t2", title: "Найти самого дорогого судью", why: "Судья — платный вызов; на дорогом судье экономия каскада съедается.", cmd: "cd /root/cost-router && .venv/bin/python -c \"from core.config import JUDGES; print(sorted(JUDGES, key=lambda m: m.price_out_per_1m))\"" },
        { id: "cfg-t3", title: "Убедиться, что frozen работает", why: "Поймать FrozenInstanceError своими руками.", cmd: "cd /root/cost-router && .venv/bin/python -c \"from core.config import CASCADE; CASCADE[0].price_in_per_1m = 0\"" },
      ],
    },

    /* ═══════════════════════ 5. llm.py ═══════════════════════ */
    {
      id: "llm",
      n: 5,
      title: "core/llm.py: HTTP, токены и отказы",
      summary: "Как устроен вызов модели, что такое usage, какие ошибки ретраить и почему функция возвращает результат, а не бросает исключение",
      blocks: [
        { type: "p", text: "Здесь происходит всё, что обычно скрыто за <code>client.chat.completions.create()</code>: сборка JSON, авторизация, таймаут, разбор ответа, подсчёт токенов и обработка отказов. Понимание этого слоя — разница между «подключил SDK» и «умею диагностировать инцидент»." },

        { type: "h2", text: "5.1. Что физически уходит на сервер" },
        { type: "code", caption: "запрос", lines: [
          "payload = {",
          '    "model": "meta-llama/llama-3.3-70b-instruct",',
          '    "messages": [',
          '        {"role": "system", "content": "<правила: только код в ```python>"},',
          '        {"role": "user",   "content": "<спецификация задачи и критерии>"},',
          "    ],",
          '    "max_tokens": 1200,',
          '    "temperature": 0.0,',
          "}",
          "req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(),",
          '    headers={"Authorization": f"Bearer {key}",',
          '             "Content-Type": "application/json",',
          '             "User-Agent": "judge-loop-demo"})',
        ]},
        { type: "ul", items: [
          "<code>messages</code> — диалог; <strong>system</strong> задаёт контракт ответа, <strong>user</strong> — данные задачи. Правила в system не «сильнее» user, но модели следуют им заметно стабильнее.",
          "<code>max_tokens</code> — жёсткий потолок генерации: он же граница стоимости одного вызова.",
          "<code>temperature</code> — при 0 модель выбирает наиболее вероятные токены: нужно для воспроизводимости, а не для «творчества».",
          "<code>timeout</code> в <code>urlopen</code> — обязателен: без него зависший сокет держит процесс бесконечно.",
        ]},

        { type: "h2", text: "5.2. usage: откуда берётся стоимость" },
        { type: "code", caption: "разбор ответа", lines: [
          'text = data["choices"][0]["message"]["content"]',
          'usage = data.get("usage", {}) or {}',
          'tin  = int(usage.get("prompt_tokens", 0) or 0)',
          'tout = int(usage.get("completion_tokens", 0) or 0)',
          "cost = estimate_cost(model, tin, tout)",
        ]},
        { type: "p", text: "Стоимость считает провайдер, а мы её только воспроизводим по своим ценам — это нужно, чтобы сравнивать модели между собой в одной шкале и складывать в отчёт. Если провайдер не вернул <code>usage</code>, получаем нули: тогда стоимость попытки будет занижена, и это надо явно помечать, а не молча принимать за правду." },

        { type: "h2", text: "5.3. Какие отказы бывают" },
        { type: "code", caption: "три разных класса ошибок — три разных решения", lines: [
          "# 1) HTTP-ошибка: сервер ответил кодом",
          "429  → лимит частоты      → ретрай с backoff",
          "500/502/503/504 → сбой провайдера → ретрай с backoff",
          "400  → плохой запрос      → НЕ ретраить, ошибка кода",
          "401  → ключ             → НЕ ретраить, ошибка конфигурации",
          "404  → модели нет       → НЕ ретраить, ошибка данных",
          "",
          "# 2) сетевая ошибка: ответа не было (URLError, timeout)",
          "#    → ретрай; но если таймаут длинный, бюджет времени кончился",
          "",
          "# 3) ошибка парсинга: ответ пришёл, но не тот формат",
          "#    → НЕ ретраить тот же запрос; это сигнал о контракте/схеме",
        ]},
        { type: "p", text: "Ключевое различие: ретрай лечит <strong>временные</strong> сбои. Повтор запроса с неверным ключом или несуществующей моделью не только бесполезен — он тратит время и деньги, а в случае лимитов ещё и ухудшает ситуацию." },

        { type: "h2", text: "5.4. Ретраи, которые не вредят" },
        { type: "code", caption: "как это сделано в проекте", lines: [
          "for attempt in range(retries):",
          "    try:",
          "        with urllib.request.urlopen(req, timeout=120) as resp:",
          "            data = json.load(resp)",
          "        return LLMResult(text, tin, tout, cost, latency, model.id)",
          "    except urllib.error.HTTPError as e:",
          "        last_err = f\"HTTP {e.code}\"",
          "        if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:",
          "            time.sleep(2 ** attempt)      # 1s, 2s, 4s",
          "            continue",
          "        return LLMResult(\"\", 0, 0, 0.0, ..., last_err)",
        ]},
        { type: "p", text: "Что здесь можно улучшить и о чём стоит сказать на интервью: добавить <strong>jitter</strong> (случайную добавку), иначе несколько параллельных клиентов синхронно бьют сервер в одни и те же моменты; ограничить <strong>общий бюджет</strong> времени, а не только число попыток; уважать заголовок <code>Retry-After</code> при 429." },
        { type: "code", caption: "вариант с jitter и бюджетом", lines: [
          "import random, time",
          "",
          "def backoff(attempt: int, base: float = 1.0, cap: float = 8.0) -> float:",
          "    delay = min(cap, base * (2 ** attempt))",
          "    return delay * (0.5 + random.random() * 0.5)   # 50–100% от расчётной",
          "",
          "deadline = time.monotonic() + 90",
          "while time.monotonic() < deadline and attempt < retries:",
          "    ...",
        ]},

        { type: "h2", text: "5.5. Почему результат, а не исключение" },
        { type: "p", text: "<code>call()</code> возвращает <code>LLMResult</code> с полем <code>error</code>, а не бросает. Причина в том, что отказ одной модели — <strong>нормальный ход каскада</strong>: попытка фиксируется как проваленная, роутер поднимается на уровень выше. Исключение же потребовало бы try/except в каждом вызывающем месте и легко теряется при рефакторинге." },
        { type: "note", kind: "tip", title: "Когда исключение всё-таки лучше",
          text: "Если ошибка означает «дальше идти нельзя» (нет ключа, нет такой модели) — исключение честнее. Если ошибка локальна для попытки — результат с полем error. Разница в том, кто принимает решение: вызывающий код или текущая операция." },

        { type: "h2", text: "5.6. extract_code: разбор ответа модели" },
        { type: "code", caption: "три типичных ответа модели", lines: [
          "# 1) код в заборе с языком",
          "```python",
          "def f(): return 1",
          "```",
          "",
          "# 2) забор без языка",
          "```",
          "def f(): return 1",
          "```",
          "",
          "# 3) без забора, с пояснением вокруг  ← самый неудобный случай",
          "Вот решение:",
          "def f(): return 1",
          "Надеюсь, поможет!",
        ]},
        { type: "p", text: "<code>extract_code</code> обрабатывает первые два случая: делит текст по <code>```</code> и берёт нечётные фрагменты. Третий случай он вернёт целиком — вместе с прозой, и pytest упадёт на синтаксисе. Это не баг парсера, а следствие нестрогого контракта: правильный путь — закрепить формат ответа (structured output) и проверять его валидатором, а не угадывать." },

        { type: "checks", items: [
          { id: "llm-1", text: "Понимаю роль <code>system</code> и <code>user</code> и зачем <code>max_tokens</code>" },
          { id: "llm-2", text: "Знаю, откуда берутся <code>prompt_tokens</code> и <code>completion_tokens</code>" },
          { id: "llm-3", text: "Могу разложить ошибки на «ретраить» и «не ретраить» и объяснить почему" },
          { id: "llm-4", text: "Понимаю, зачем jitter и общий дедлайн, а не только счётчик попыток" },
          { id: "llm-5", text: "Объясняю, почему <code>call()</code> возвращает объект с ошибкой вместо исключения" },
          { id: "llm-6", text: "Проверил(а) <code>extract_code</code> на трёх формах ответа и знаю его слабое место" },
          { id: "llm-7", text: "Сделал(а) реальный вызов и увидел стоимость и задержку" },
        ]},
      ],
      tasks: [
        { id: "llm-t1", title: "Один реальный вызов", why: "Увидеть стоимость и latency своими глазами — цифры запоминаются лучше текста.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE; from core.llm import call; r = call(CASCADE[0], \"Отвечай одним словом.\", \"Скажи: OK\"); print(r.text, r.cost_usd, round(r.latency_s,2), r.error)'" },
        { id: "llm-t2", title: "Сломать ключ", why: "Проверить, что ошибка возвращается, а не падает трейсбеком.", cmd: "cd /root/cost-router && OPENROUTER_API_KEY=bad .venv/bin/python -c 'from core.config import CASCADE; from core.llm import call; print(call(CASCADE[0], \"x\", \"y\").error)'" },
        { id: "llm-t3", title: "Найти слабое место парсера", why: "Понять, зачем нужен structured output, а не регулярки по тексту.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.llm import extract_code; print(repr(extract_code(\"Вот решение:\\ndef f(): return 1\\nГотово\")))'" },
      ],
    },
  ];

  steps.forEach(s => window.COURSE.steps.push(s));
})();
