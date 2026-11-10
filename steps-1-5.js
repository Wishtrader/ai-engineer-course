/* Шаги 1–5: окружение, точка входа, импорты, config.py, llm.py.
   Формат: что делаем → зачем в проекте → как выглядит в коде → почему так → проверка. */

(function () {
  const steps = [

    /* ═══════════════════ 1. Окружение ═══════════════════ */
    {
      id: "env",
      n: 1,
      title: "Окружение: готовим папку проекта к работе",
      summary: "Создаём .venv, ставим pytest, кладём ключ в .env и проверяем, что чекер вообще запускается",
      goal: "поднять окружение так, чтобы <code>check_task1.py</code> запускался и доходил до проверок.",
      where: "<code>.venv/bin/python</code> — с него начинается любой запуск в этом проекте",
      blocks: [
        { type: "p", text: "На этом шаге мы не пишем логику. Мы готовим место, где она будет работать: отдельный Python для проекта, pytest для проверки тестов и файл с ключом доступа к моделям." },
        { type: "note", kind: "why", title: "Зачем это в нашем проекте",
          text: "Чекер <code>check_task1.py</code> при запуске делает две вещи, которые требуют подготовки: импортирует <code>pytest</code> (его надо установить в проектное окружение) и вызывает модель (нужен ключ). Если чего-то нет, вы увидите <code>ModuleNotFoundError</code> или ошибку ключа — и легко решите, что «код сломан», хотя сломан не код." },

        { type: "h2", text: "1.1. Что именно мы запускаем" },
        { type: "code", caption: "три команды, которые делают всю подготовку", lang: "bash", lines: [
          "cd /root/cost-router",
          "python3 -m venv .venv",
          ".venv/bin/pip install -r requirements.txt",
          "cp .env.example .env      # и вписать настоящий ключ",
        ]},
        { type: "p", text: "Первая команда создаёт папку <code>.venv</code> — личное окружение проекта. Вторая ставит в это окружение <code>pytest</code> (в <code>requirements.txt</code> он один). Третья копирует шаблон <code>.env</code>, куда вы впишете ключ." },

        { type: "h2", text: "1.2. Почему запускаем по пути, а не «активируем»" },
        { type: "p", text: "У Python есть три разных «себя»: системный, базовый и текущего окружения. Проверить, кого вы запустили, можно за одну команду." },
        { type: "code", caption: "проверка окружения", lang: "bash", lines: [
          ".venv/bin/python -c \"import sys; print(sys.prefix); print(sys.base_prefix)\"",
          "# /root/cost-router/.venv            ← это окружение проекта",
          "# /root/.hermes/tools/python-3.14...  ← базовый Python, на который оно ссылается",
        ]},
        { type: "p", text: "Если обе строки одинаковые — вы <strong>не</strong> в окружении проекта, и pytest не найдётся. Именно поэтому во всех командах курса мы пишем <code>.venv/bin/python</code>: так путь нельзя забыть активировать, и команда работает в любом окне терминала." },

        { type: "h2", text: "1.3. Почему ключ лежит в .env, а не в коде" },
        { type: "p", text: "Проект читает ключ сам, без сторонних библиотек. Вот код, который это делает (файл <code>core/llm.py</code>):" },
        { type: "code", caption: "core/llm.py, функция _api_key", lines: [
          "def _api_key() -> str:",
          '    key = os.getenv("OPENROUTER_API_KEY", "").strip()',
          "    if key:",
          "        return key                       # 1) сначала переменная окружения",
          "    for path in (\"/root/.hermes/.env\", ...):",
          "        for line in open(path):",
          '            if line.startswith("OPENROUTER_API_KEY="):',
          "                return line.split(\"=\", 1)[1].strip()   # 2) потом файл .env",
          '    raise RuntimeError("OPENROUTER_API_KEY не задан")      # 3) потом честная ошибка',
        ]},
        { type: "p", text: "Три уровня — три разных сценария. Переменная окружения нужна, чтобы разово подменить ключ на один запуск (например, в CI). Файл <code>.env</code> — обычный рабочий вариант. А последняя строка важна для диагностики: проект падает с понятным текстом, а не с загадочным <code>None</code>." },
        { type: "note", kind: "warn", title: "Почему не в коде",
          text: "Код уходит в git. Ключ в коде = ключ в истории репозитория, даже если вы потом удалите строку. Поэтому <code>.env</code> добавлен в <code>.gitignore</code>; проверить — <code>git check-ignore -v .env</code>." },

        { type: "h2", text: "1.4. Проверка: всё готово, если чекер запускается" },
        { type: "code", caption: "запуск и ожидаемый вывод", lang: "bash", lines: [
          "cd /root/cost-router && .venv/bin/python check_task1.py",
          "",
          "# ПРОВЕРКА ЗАДАЧИ 1",
          "# кейс A: t03_backoff на meta-llama/llama-3.3-70b-instruct",
          "#   ✗ attempt() не реализован (NotImplementedError)",
          "# ЗАДАЧА 1 НЕ ВЫПОЛНЕНА",
        ]},
        { type: "p", text: "Этот «провал» — <strong>хороший</strong> результат. Он означает: Python нашёлся, pytest на месте, конфиг прочитан, чекер дошёл до вызова вашей функции. Не хватает только логики — и её вы напишете на шаге 8." },
        { type: "note", kind: "warn", title: "Если вывод другой",
          text: "<code>No module named pytest</code> — запустили не тот Python. <code>OPENROUTER_API_KEY не задан</code> — нет ключа в <code>.env</code>. <code>FileNotFoundError: tasks/…</code> — запустили не из корня проекта. Три самых частых ошибки и все три лечатся здесь, на шаге 1." },

        { type: "checks", items: [
          { id: "env-1", text: "Могу объяснить своими словами: зачем проекту своё окружение, а не системный Python" },
          { id: "env-2", text: "<code>sys.prefix</code> показывает <code>.venv</code>, а <code>sys.base_prefix</code> — базовый Python" },
          { id: "env-3", text: "Чекер запускается и доходит до строки <code>attempt() не реализован</code>" },
          { id: "env-4", text: "Ключ лежит в <code>.env</code>, и <code>git check-ignore -v .env</code> это подтверждает" },
          { id: "env-5", text: "Знаю, какую ошибку увижу, если pytest не установлен — и почему" },
          { id: "env-6", text: "Понимаю порядок источников ключа: окружение → <code>.env</code> → понятная ошибка" },
        ]},
      ],
      tasks: [
        { id: "env-t1", title: "Проверить, что окружение именно проектное", why: "Самая частая причина «не вижу pytest» — не тот Python.", cmd: "cd /root/cost-router && .venv/bin/python -c \"import sys; print(sys.prefix); print(sys.base_prefix)\"" },
        { id: "env-t2", title: "Воспроизвести ошибку «не тот Python»", why: "Когда ошибка вызвана своими руками, она запоминается и больше не пугает.", cmd: "cd /root/cost-router && python3 -m pytest --version; echo \"exit=$?\"" },
        { id: "env-t3", title: "Подменить ключ на один запуск", why: "Пригодится в CI и при отладке: приоритет env над .env видно сразу.", cmd: "cd /root/cost-router && OPENROUTER_API_KEY=bad .venv/bin/python -c \"from core.llm import _api_key; print(_api_key()[:6])\"" },
      ],
    },

    /* ═══════════════════ 2. Точка входа ═══════════════════ */
    {
      id: "entry",
      n: 2,
      title: "Точка входа: почему чекер запускается, а импорт — нет",
      summary: "Разбираем один запуск по шагам: кто находит файл, откуда берётся core, что делает if __name__",
      goal: "понимать, что происходит при <code>python check_task1.py</code>, и почему <code>import check_task1</code> не запускает проверку.",
      where: "<code>check_task1.py</code> — единственный файл, который вы запускаете руками; остальные подключаются импортом",
      blocks: [
        { type: "p", text: "У любого проекта есть одна дверь, через которую входят. Здесь это <code>check_task1.py</code>. Наша задача — понять три вещи: кто находит этот файл, откуда берётся пакет <code>core</code> и почему при импорте ничего не выполняется." },

        { type: "h2", text: "2.1. Кто находит файл" },
        { type: "p", text: "Файл по команде ищет <strong>оболочка</strong> (bash), а не Python. Python получает уже готовый путь к файлу. Поэтому запуск по полному пути работает из любой папки:" },
        { type: "code", caption: "проверка", lang: "bash", lines: [
          "cd /tmp && /root/cost-router/.venv/bin/python /root/cost-router/check_task1.py",
          "# работает: оболочка нашла файл по полному пути",
        ]},

        { type: "h2", text: "2.2. Откуда берётся core: список путей sys.path" },
        { type: "p", text: "Модули ищет уже Python — по списку папок <code>sys.path</code>, сверху вниз, первое совпадение выигрывает. В нашем случае нужную папку добавляет сам Python: при запуске файла он ставит на первое место <strong>папку этого файла</strong>." },
        { type: "code", caption: "смотрим список и проверяем первое место", lang: "bash", lines: [
          "printf 'import sys; print(sys.path[0])\\n' > probe.py",
          ".venv/bin/python probe.py",
          "# /root/cost-router      ← папка файла попала в поиск",
        ]},
        { type: "p", text: "Вот почему строка <code>from core.config import CASCADE</code> работает: папка <code>core</code> лежит рядом с чекером, а папка проекта уже в списке поиска. Никакой магии «относительно файла» в коде нет — это следствие правила." },
        { type: "note", kind: "why", title: "Зачем это знать",
          text: "Из этого правила немедленно следует, почему <code>python -c \"import check_task1\"</code> из другой папки падает с <code>ModuleNotFoundError: core</code>. В режиме <code>-c</code> на первом месте стоит текущая папка, а не папка скрипта — и <code>core</code> оказывается негде искать." },

        { type: "h2", text: "2.3. Почему импорт не запускает проверку" },
        { type: "p", text: "Каждый файл при загрузке получает имя в переменной <code>__name__</code>. Запущенный файл получает <code>\"__main__\"</code>, импортированный — своё имя. Отсюда конструкция в конце чекера:" },
        { type: "code", caption: "последние строки check_task1.py", lines: [
          'if __name__ == "__main__":',
          "    sys.exit(main())",
        ]},
        { type: "p", text: "Читается буквально: «если это запущенный файл — вызови <code>main()</code>». При импорте условие ложно, и проверка не стартует. Но всё, что написано <strong>вне</strong> условия, выполняется и при импорте: импорты, константы, объявления функций." },
        { type: "note", kind: "warn", title: "Что было бы без этой защиты",
          text: "Любой <code>import check_task1</code> — из pytest, из редактора, из соседнего скрипта — прогнал бы весь чекер: чтение задач, запросы к моделям, потраченные деньги. Защита нужна не для красоты, а чтобы импорт оставался бесплатным." },

        { type: "h2", text: "2.4. Проверка" },
        { type: "code", caption: "три команды — три разных результата", lang: "bash", lines: [
          ".venv/bin/python check_task1.py                     # ПРОВЕРКА ЗАДАЧИ 1 …",
          ".venv/bin/python -c \"import check_task1\"             # тишина — это правильно",
          ".venv/bin/python -c \"import check_task1; print(check_task1.__name__)\"",
          "# check_task1",
        ]},
        { type: "checks", items: [
          { id: "entry-1", text: "Могу объяснить: файл ищет оболочка, а модули — Python по <code>sys.path</code>" },
          { id: "entry-2", text: "Знаю, что при запуске файла в поиск попадает папка файла, а не текущая папка" },
          { id: "entry-3", text: "Проверил(а): импорт чекера не печатает ни строки проверки" },
          { id: "entry-4", text: "Понимаю, почему <code>import check_task1</code> из /tmp падает с ModuleNotFoundError" },
          { id: "entry-5", text: "Могу сказать, что выполнится при импорте, а что нет" },
          { id: "entry-6", text: "Проверил(а) код выхода <code>echo $?</code> и понимаю, зачем он нужен" },
        ]},
      ],
      tasks: [
        { id: "entry-t1", title: "Увидеть sys.path[0] своими глазами", why: "Одна команда закрывает половину вопросов «почему не находится модуль».", cmd: "printf 'import sys; print(repr(sys.path[0]))\\n' > /tmp/p.py && /root/cost-router/.venv/bin/python /tmp/p.py && /root/cost-router/.venv/bin/python -c 'import sys; print(repr(sys.path[0]))'" },
        { id: "entry-t2", title: "Проверить, что импорт ничего не запускает", why: "Это и есть смысл защиты — убедиться, что она работает.", cmd: "cd /root/cost-router && .venv/bin/python -c \"import check_task1; print('импорт прошёл молча')\"" },
      ],
    },

    /* ═══════════════════ 3. Импорты ═══════════════════ */
    {
      id: "imports",
      n: 3,
      title: "Импорты: как файлы проекта подключаются друг к другу",
      summary: "Шесть файлов в core: кто от кого зависит, почему точка в импорте и почему пустой __init__.py",
      goal: "понимать, почему <code>from core.config import CASCADE</code> работает, и в каком порядке можно менять файлы, не ломая проект.",
      where: "<code>config → llm → verifier/judge → router</code>: зависимости идут в одну сторону",
      blocks: [
        { type: "p", text: "Проект — это не один файл, а шесть. Логика лежит в папке <code>core</code>, чекер и тесты — снаружи. Разберём, как одно подключается к другому и почему порядок тут важен." },
        { type: "code", caption: "структура и зависимости", lang: "bash", lines: [
          "cost-router/",
          "├── check_task1.py     ← запускаете вы (импортирует core.config, core.router)",
          "├── core/",
          "│   ├── __init__.py    ← пустой файл: «эта папка — пакет»",
          "│   ├── config.py      ← модели и цены (ни от кого не зависит)",
          "│   ├── llm.py         ← вызов модели (нужен config)",
          "│   ├── verifier.py    ← запуск тестов (нужен только стандартный Python)",
          "│   ├── judge.py       ← судья (нужны config и llm)",
          "│   └── router.py      ← каскад (нужны все)",
          "├── tasks/*.json       ← задачи",
          "└── tests/*.py         ← тесты для этих задач",
        ]},

        { type: "h2", text: "3.1. Два способа импортировать" },
        { type: "code", caption: "снаружи пакета — абсолютно, внутри — относительно", lines: [
          "# в check_task1.py (файл вне пакета)",
          "from core.config import CASCADE",
          "",
          "# внутри core/router.py (тот же пакет)",
          "from .config import CASCADE, Model",
          "from .llm import call, extract_code",
        ]},
        { type: "p", text: "Точка означает «в этом же пакете». Внутри <code>core</code> это короче и не зависит от того, как пакет назовут снаружи. Снаружи точка не работает: у запущенного файла нет пакета-родителя." },

        { type: "h2", text: "3.2. Почему зависимости идут в одну сторону" },
        { type: "ul", items: [
          "<code>config.py</code> не знает ни о ком — его можно читать и менять первым.",
          "<code>llm.py</code> берёт из конфига модель и формулу цены.",
          "<code>judge.py</code> берёт из llm сам вызов, из конфига — модель судьи.",
          "<code>router.py</code> собирает всех вместе: генерирует, проверяет, оценивает.",
        ]},
        { type: "p", text: "Если бы <code>config.py</code> попытался импортировать <code>router</code>, получился бы цикл: <code>router</code> ждёт <code>config</code>, а <code>config</code> — <code>router</code>. Python загрузил бы один из них наполовину и выдал ошибку. Отсюда практическое правило: стрелки зависимостей всегда вниз по слоям." },
        { type: "note", kind: "why", title: "Зачем это в проекте",
          text: "Вы будете писать <code>attempt()</code> в <code>router.py</code>. Если знать, что <code>call</code>, <code>run_tests</code> и <code>judge</code> уже подключены в начале файла, не придётся угадывать имена и добавлять импорты наугад." },

        { type: "h2", text: "3.3. Проверка: сломать и починить" },
        { type: "code", caption: "что будет, если убрать __init__.py", lang: "bash", lines: [
          "mv core/__init__.py /tmp/",
          ".venv/bin/python -c 'import core.config'",
          "# ImportError / ModuleNotFoundError — папка перестала быть пакетом",
          "mv /tmp/__init__.py core/",
        ]},
        { type: "checks", items: [
          { id: "imp-1", text: "Могу назвать, какие файлы от каких зависят, и почему стрелки идут в одну сторону" },
          { id: "imp-2", text: "Понимаю, зачем нужен пустой <code>core/__init__.py</code>" },
          { id: "imp-3", text: "Объясняю разницу между <code>core.config</code> и <code>.config</code> в импорте" },
          { id: "imp-4", text: "Знаю, что произойдёт, если импортировать <code>router</code> из <code>config</code>" },
          { id: "imp-5", text: "Проверил(а) на практике: без <code>__init__.py</code> импорт падает" },
        ]},
      ],
      tasks: [
        { id: "imp-t1", title: "Сломать пакет нарочно", why: "Ошибка, вызванная своими руками, объясняет правило лучше текста.", cmd: "cd /root/cost-router && mv core/__init__.py /tmp/ && .venv/bin/python -c 'import core.config'; mv /tmp/__init__.py core/" },
        { id: "imp-t2", title: "Проверить направление зависимостей", why: "Увидеть, что импорты идут только вниз по слоям.", cmd: "cd /root/cost-router && grep -rn '^from \\.' core/*.py" },
      ],
    },

    /* ═══════════════════ 4. config.py ═══════════════════ */
    {
      id: "config",
      n: 4,
      title: "core/config.py: какие модели есть и сколько стоит вызов",
      summary: "Модель как данные, каскад от дешёвой к дорогой и расчёт стоимости на реальных числах",
      goal: "прочитать конфиг и посчитать, во сколько обойдётся один вызов на каждом уровне каскада.",
      where: "первый файл цепочки: <code>config → llm → verifier/judge → router</code>",
      blocks: [
        { type: "p", text: "Здесь описано всё, что проект знает о моделях: их имена, цены и порядок, в котором их пробовать. Это фундамент экономики — если цены или порядок неверны, все дальнейшие выводы тоже." },

        { type: "h2", text: "4.1. Модель — это просто данные" },
        { type: "code", caption: "core/config.py", lines: [
          "@dataclass(frozen=True)",
          "class Model:",
          "    id: str                    # имя модели у провайдера",
          "    vendor: str                # кто её сделал: meta, openai, google, anthropic",
          "    price_in_per_1m: float     # $ за 1 млн входных токенов",
          "    price_out_per_1m: float    # $ за 1 млн выходных токенов",
        ]},
        { type: "p", text: "Четыре поля — всё, что нужно, чтобы сравнивать модели деньгами. <code>vendor</code> понадобится позже: судью мы обязаны брать у другого разработчика, чем автора кода." },
        { type: "code", caption: "как выглядит одна модель", lines: [
          'Model("meta-llama/llama-3.3-70b-instruct", "meta", 0.100, 0.320)',
          "# читается: llama от meta, $0.10 за миллион входных, $0.32 за миллион выходных",
        ]},

        { type: "h2", text: "4.2. Каскад: порядок и есть стратегия" },
        { type: "code", caption: "CASCADE — от дешёвой к дорогой", lines: [
          "CASCADE = [",
          '    Model("meta-llama/llama-3.3-70b-instruct", "meta",      0.100,  0.320),  # уровень 1',
          '    Model("openai/gpt-4o-mini",                "openai",    0.150,  0.600),  # уровень 2',
          '    Model("google/gemini-2.5-flash",           "google",    0.300,  2.500),  # уровень 3',
          '    Model("anthropic/claude-sonnet-4.5",       "anthropic", 3.000, 15.000),  # уровень 4',
          "]",
        ]},
        { type: "p", text: "Позиция в списке — это уровень: первая модель уровень 1, последняя уровень 4. Роутер начнёт с первого уровня и поднимется выше только если гейт не пропустил результат. Смысл: не платить за sonnet там, где llama справилась." },

        { type: "h2", text: "4.3. Стоимость: формула и числа" },
        { type: "code", caption: "estimate_cost", lines: [
          "def estimate_cost(model, tokens_in, tokens_out) -> float:",
          "    return (tokens_in  / 1_000_000) * model.price_in_per_1m + \\",
          "           (tokens_out / 1_000_000) * model.price_out_per_1m",
        ]},
        { type: "p", text: "Считаем реальный случай: 1200 входных токенов (промпт с задачей и критериями) и 300 выходных (код)." },
        { type: "code", caption: "проверка на числах", lang: "bash", lines: [
          ".venv/bin/python -c \"from core.config import CASCADE, estimate_cost; print(round(estimate_cost(CASCADE[0], 1200, 300), 6))\"",
          "# 0.000216   ← llama",
          ".venv/bin/python -c \"from core.config import CASCADE, estimate_cost; print(round(estimate_cost(CASCADE[3], 1200, 300), 6))\"",
          "# 0.0081     ← sonnet, в 37 раз дороже",
        ]},
        { type: "p", text: "Выходные токены дороже входных в несколько раз: генерация требует больше вычислений. Поэтому длина ответа — такой же рычаг экономии, как и длина промпта." },

        { type: "h2", text: "4.4. Судья: почему обязательно другого вендора" },
        { type: "code", caption: "judge_for", lines: [
          "def judge_for(worker: Model) -> Model:",
          "    candidates = [j for j in JUDGES if j.vendor != worker.vendor]",
          "    return candidates[sum(ord(c) for c in worker.id) % len(candidates)]",
        ]},
        { type: "p", text: "Если код писала модель одного разработчика и её же оценивает судья того же разработчика, у них похожие слепые зоны — ошибки совпадут, и гейт пропустит брак. Поэтому судья всегда из другого лагеря. А детерминированный выбор (по хэшу от имени) нужен, чтобы один и тот же прогон давал один и тот же результат." },
        { type: "note", kind: "why", title: "Зачем это в проекте",
          text: "Без этого файла каскад нечего сравнивать: нет цен — нет экономии, нет <code>vendor</code> — нет независимого судьи, нет уровней — роутер не знает, куда идти. На шаге 8 <code>attempt()</code> будет брать отсюда модель, уровень и формулу стоимости." },

        { type: "checks", items: [
          { id: "cfg-1", text: "Могу объяснить, что означает каждое из четырёх полей <code>Model</code>" },
          { id: "cfg-2", text: "Посчитал(а) стоимость 1200/300 токенов для llama и sonnet и знаю разницу" },
          { id: "cfg-3", text: "Понимаю, почему порядок в <code>CASCADE</code> — это стратегия, а не оформление" },
          { id: "cfg-4", text: "Объясняю, зачем судья другого вендора и почему выбор детерминированный" },
          { id: "cfg-5", text: "Знаю, что произойдёт с экономией, если перепутать порядок уровней" },
        ]},
      ],
      tasks: [
        { id: "cfg-t1", title: "Посчитать стоимость двух уровней", why: "Свои числа запоминаются и защищаются на интервью.", cmd: "cd /root/cost-router && .venv/bin/python -c \"from core.config import CASCADE, estimate_cost; print([round(estimate_cost(m,1200,300),6) for m in CASCADE])\"" },
        { id: "cfg-t2", title: "Проверить, кто судит каждую модель", why: "Увидеть правило «другой вендор» в действии.", cmd: "cd /root/cost-router && .venv/bin/python -c \"from core.config import CASCADE, judge_for; [print(m.vendor, '->', judge_for(m).vendor) for m in CASCADE]\"" },
        { id: "cfg-t3", title: "Убедиться, что модель нельзя изменить", why: "Понять, зачем <code>frozen=True</code>: константы не должны мутировать.", cmd: "cd /root/cost-router && .venv/bin/python -c \"from core.config import CASCADE; CASCADE[0].price_in_per_1m = 0\"" },
      ],
    },

    /* ═══════════════════ 5. llm.py ═══════════════════ */
    {
      id: "llm",
      n: 5,
      title: "core/llm.py: как один вызов модели даёт текст, цену и ошибку",
      summary: "Собираем запрос, читаем ответ, считаем токены, обрабатываем отказы — на примере реального кода",
      goal: "понимать путь запроса к модели и уметь объяснить, откуда берутся стоимость и ошибка в результате.",
      where: "единственное место, где проект ходит в интернет: <code>router → llm → провайдер</code>",
      blocks: [
        { type: "p", text: "Всё общение с моделями идёт через одну функцию <code>call()</code>. Она принимает модель и два текста (правила и задачу), возвращает текст ответа, число токенов, стоимость и задержку — или ошибку." },

        { type: "h2", text: "5.1. Что уходит на сервер" },
        { type: "code", caption: "тело запроса", lines: [
          "payload = {",
          '    "model": "meta-llama/llama-3.3-70b-instruct",',
          '    "messages": [',
          '        {"role": "system", "content": WORKER_SYSTEM},   # правила: «верни только код»',
          '        {"role": "user",   "content": prompt},          # задача и критерии',
          "    ],",
          '    "max_tokens": 1200,',
          '    "temperature": 0.0,',
          "}",
        ]},
        { type: "ul", items: [
          "<strong>system</strong> — контракт ответа: только код в блоке, ровно указанная функция, без print и сети.",
          "<strong>user</strong> — данные задачи и критерии приёмки.",
          "<strong>max_tokens</strong> — потолок длины ответа, он же потолок стоимости вызова.",
          "<strong>temperature 0</strong> — максимум предсказуемости: нужно, чтобы прогон повторялся.",
        ]},
        { type: "note", kind: "why", title: "Зачем это в проекте",
          text: "Промпт здесь — не «вежливая просьба», а техническое требование. Если из system убрать «только код», модель начнёт объяснять решение прозой, <code>extract_code</code> вытащит прозу, и тесты упадут на синтаксисе. Ошибка будет выглядеть как «модель плохо пишет код», хотя виноват промпт." },

        { type: "h2", text: "5.2. Что возвращается: ответ с ценой" },
        { type: "code", caption: "разбор ответа", lines: [
          'text = data["choices"][0]["message"]["content"]',
          'usage = data.get("usage", {})',
          'tin  = int(usage.get("prompt_tokens", 0))',
          'tout = int(usage.get("completion_tokens", 0))',
          "return LLMResult(text, tin, tout, estimate_cost(model, tin, tout),",
          "                 latency, model.id)",
        ]},
        { type: "p", text: "Проект не возвращает «просто строку». Он возвращает объект из семи полей: текст, токены, стоимость, задержка, модель, ошибка. Причина практичная: в отчёте нужно доказать экономию числами, а не словами." },

        { type: "h2", text: "5.3. Когда что-то пошло не так" },
        { type: "code", caption: "какие ошибки повторяем, какие — нет", lines: [
          "429              лимит частоты    → подождать и повторить",
          "500/502/503/504  сбой провайдера  → подождать и повторить",
          "400              плохой запрос    → повторять бессмысленно",
          "401              ключ             → повторять бессмысленно",
          "timeout          нет ответа       → повторить (но бюджет времени ограничен)",
        ]},
        { type: "code", caption: "как это сделано", lines: [
          "for attempt in range(retries):",
          "    try:",
          "        ...вызов...",
          "        return результат",
          "    except urllib.error.HTTPError as e:",
          "        if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:",
          "            time.sleep(2 ** attempt)     # 1s, затем 2s, затем 4s",
          "            continue",
          "        return LLMResult(\"\", 0, 0, 0.0, ..., error=f\"HTTP {e.code}\")",
        ]},
        { type: "p", text: "Пауза растёт вдвое: 1, 2, 4 секунды. Это даёт провайдеру время восстановиться и не добивает его частыми повторами." },
        { type: "note", kind: "why", title: "Почему ошибка, а не исключение",
          text: "Отказ одной модели — нормальный ход каскада: попытка фиксируется как неудачная, роутер идёт на уровень выше. Если бы <code>call()</code> бросал исключение, каждый вызов пришлось бы оборачивать в try/except, и одна забытая обёртка роняла бы весь прогон." },

        { type: "h2", text: "5.4. Достать код из ответа модели" },
        { type: "code", caption: "три типичных ответа", lines: [
          "# 1) в блоке с языком        2) в блоке без языка      3) без блока",
          "```python                     ```                       Вот решение:",
          "def f(): return 1             def f(): return 1         def f(): return 1",
          "```                           ```                       Готово",
        ]},
        { type: "p", text: "Первые два случая <code>extract_code</code> разбирает: он режет текст по <code>```</code> и берёт содержимое блока. Третий — возвращает текст целиком, и pytest упадёт. Это слабое место честно оставлено в проекте как напоминание: надёжнее требовать от модели строгий формат, а не угадывать по тексту." },

        { type: "h2", text: "5.5. Проверка: один настоящий вызов" },
        { type: "code", caption: "что увидим", lang: "bash", lines: [
          "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE; from core.llm import call; r = call(CASCADE[0], \"Отвечай одним словом.\", \"Скажи: OK\"); print(r.text, r.cost_usd, round(r.latency_s,2), r.error)'",
          "# OK 2.4e-05 0.83 None   ← текст, цена, задержка, ошибки нет",
        ]},
        { type: "checks", items: [
          { id: "llm-1", text: "Могу объяснить, зачем в запросе отдельно system и user" },
          { id: "llm-2", text: "Знаю, откуда берутся <code>prompt_tokens</code> и <code>completion_tokens</code>" },
          { id: "llm-3", text: "Различаю ошибки, которые повторяем, и которые не имеет смысла повторять" },
          { id: "llm-4", text: "Понимаю, почему функция возвращает объект с ошибкой, а не бросает исключение" },
          { id: "llm-5", text: "Сделал(а) реальный вызов и увидел цену и задержку" },
        ]},
      ],
      tasks: [
        { id: "llm-t1", title: "Один реальный вызов", why: "Цена и задержка запоминаются лучше, когда увидишь их сам.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.config import CASCADE; from core.llm import call; r = call(CASCADE[0], \"Отвечай одним словом.\", \"Скажи: OK\"); print(r.text, r.cost_usd, round(r.latency_s,2), r.error)'" },
        { id: "llm-t2", title: "Поймать ошибку ключа", why: "Убедиться, что отказ приходит результатом, а не падением.", cmd: "cd /root/cost-router && OPENROUTER_API_KEY=bad .venv/bin/python -c 'from core.config import CASCADE; from core.llm import call; print(call(CASCADE[0], \"x\", \"y\").error)'" },
        { id: "llm-t3", title: "Проверить извлечение кода", why: "Увидеть, где парсер справляется, а где нет.", cmd: "cd /root/cost-router && .venv/bin/python -c 'from core.llm import extract_code; print(repr(extract_code(\"```python\\ndef f(): return 1\\n```\")))'" },
      ],
    },
  ];

  steps.forEach(s => window.COURSE.steps.push(s));
})();
