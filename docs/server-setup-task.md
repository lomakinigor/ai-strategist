# Задание для Claude Code на VPS — аудит конфигурации

> **Это задача только на чтение и отчёт.** Не вноси никаких изменений: не редактируй файлы, не устанавливай пакеты, не правь `~/.claude/settings.json`, не запускай `git pull` / `git reset` / `npm install`. Только проверки + отчёт + план.

## Контекст

На этом VPS уже часть конфигурации Claude Code выполнена раньше. Нужно понять — что именно. Локально (на машине разработчика) уже зафиксированы коммиты `252267c` и `f277a85` с проектной конфигурацией CC и инструкцией по серверу. Твоя цель — сравнить текущее состояние VPS с целевой конфигурацией и подсветить дельту.

## Целевая конфигурация (что должно быть на VPS в итоге)

Подробное описание — в [`docs/claude-code-deploy.md`](claude-code-deploy.md). Кратко:

1. **Repo на актуальном HEAD** — последний коммит `master` с актуальными `.claude/settings.json`, `.claude/rules/`, `.claudeignore`, `.prettierrc`, `CLAUDE.md`, `scripts/log-command.sh`
2. **npm-зависимости установлены** — включая `prettier ^3.8.3`
3. **`jq` доступен** в PATH (нужен для `log-command.sh`)
4. **`scripts/log-command.sh`** имеет права на выполнение (`+x`)
5. **`~/.claude/settings.json`** существует с разделами:
   - `defaultMode: "acceptEdits"`
   - `permissions.allow` под наш стек (npm/npx/git)
   - `permissions.deny` для опасных команд и секретов
   - `sandbox.enabled: true` с filesystem allowWrite/denyWrite/denyRead и network.allowedDomains (включая `openrouter.ai`, `api.perplexity.ai`, `api.anthropic.com`, `github.com`, `*.npmjs.org`)
   - `hooks.PreToolUse` указывает на `bash <abs_path_to_repo>/scripts/log-command.sh`
6. **Smoke-test хука** `scripts/log-command.sh` пишет в `.claude/logs/commands.tsv` без ошибок

## Что проверить (read-only)

Выполни проверки последовательно, по каждой запиши результат. Если команда падает или результат неоднозначен — пометь и продолжай дальше, не пытайся «починить».

### A. Состояние репозитория

```bash
pwd
git rev-parse HEAD
git log --oneline -3
git status --short
git remote -v
```

Цель: HEAD = `236e592` или новее, без uncommitted, origin указывает на правильный репо.

### B. Системные инструменты

```bash
uname -a
cat /etc/os-release 2>/dev/null | head -5
node --version
npm --version
jq --version 2>&1 || echo "jq NOT installed"
which claude || echo "claude CLI NOT in PATH"
claude --version 2>&1 || true
```

### C. npm-зависимости

```bash
test -d node_modules && echo "node_modules: present" || echo "node_modules: MISSING"
npm ls prettier 2>&1 | head -3
test -f package-lock.json && echo "lock: present" || echo "lock: MISSING"
```

Не запускай `npm install` / `npm ci`.

### D. Project-level CC-конфиг (должен прийти из git)

```bash
test -f .claude/settings.json && echo "project settings.json: present" || echo "MISSING"
test -f .claudeignore && echo ".claudeignore: present" || echo "MISSING"
test -f .prettierrc && echo ".prettierrc: present" || echo "MISSING"
ls -la .claude/rules/ 2>&1
test -x scripts/log-command.sh && echo "log-command.sh: executable" || echo "log-command.sh: NOT executable / MISSING"
```

### E. User-level CC-конфиг

```bash
test -f ~/.claude/settings.json && echo "user settings.json: present" || echo "MISSING"
```

Если файл есть — выведи отдельно ключевые разделы (без секретов, если попадутся):

```bash
jq '{defaultMode, permissions_allow_count: (.permissions.allow | length // 0), permissions_deny_count: (.permissions.deny | length // 0), sandbox_enabled: (.sandbox.enabled // false), sandbox_allowedDomains: (.sandbox.network.allowedDomains // []), hooks_PreToolUse: (.hooks.PreToolUse // [])}' ~/.claude/settings.json 2>&1
```

Если `jq` не установлен — просто `cat ~/.claude/settings.json` (если он есть) и пометь что разбор JSON не делался.

### F. Hook smoke-test (без побочных эффектов)

```bash
test -d .claude/logs && echo "logs dir: present" || echo "logs dir: not yet created"
test -f .claude/logs/commands.tsv && wc -l .claude/logs/commands.tsv || echo "commands.tsv: not yet created"
```

Не запускай хук вручную в этой сессии — это создаст лишние записи. Просто посмотри, есть ли уже логи (значит хук уже подключён и работал раньше).

### G. Sandbox-проверка

Если в Claude Code твоей версии есть встроенная команда статуса sandbox — выведи её. Если нет — ограничься выводом из шага E.

## Формат отчёта (обязательный)

Верни ровно такой блок (заполни значениями из проверок, ничего не выдумывай — если не проверил, пиши «не проверено»):

```
## АУДИТ VPS — состояние конфигурации Claude Code

### Репозиторий
- pwd: <…>
- HEAD: <hash> <subject>
- Отставание от origin/master: <commits behind / up-to-date>
- Uncommitted: <none / список>

### Система
- ОС: <uname / os-release>
- Node: <ver> / npm: <ver>
- jq: <ver / NOT installed>
- claude CLI: <ver / NOT in PATH>

### npm
- node_modules: <present / missing>
- prettier (из npm ls): <ver / not found>

### Project-level (из репо)
- .claude/settings.json: <present / missing>
- .claudeignore: <present / missing>
- .prettierrc: <present / missing>
- .claude/rules/ файлы: <список>
- scripts/log-command.sh executable: <yes / no / missing>

### User-level (~/.claude/)
- settings.json: <present / missing>
- defaultMode: <…>
- allow rules count: <N>
- deny rules count: <N>
- sandbox.enabled: <true / false / отсутствует>
- sandbox.network.allowedDomains: <список или "не задано">
- hooks.PreToolUse: <содержимое или "не задано">

### Хук log-command
- .claude/logs/ существует: <yes / no>
- commands.tsv: <N строк / отсутствует>

### Дельта (что нужно сделать)
1. <…>
2. <…>

### Предлагаемый план установки недостающего
- Шаг 1: <конкретная команда / правка>
- Шаг 2: <…>
- …

### Риски / вопросы пользователю
- <если есть переписанный ранее ~/.claude/settings.json с кастомом — какие разделы НЕ затирать>
- <если нужен sudo и его нет>
- <всё остальное, что требует решения пользователя до начала работ>
```

## Важно

- Ничего не меняй на этом этапе. Цель — точная картина и согласованный план.
- Если на любом шаге команда требует sudo и его нет — пометь в отчёте и иди дальше.
- Если `~/.claude/settings.json` уже содержит **что-то нестандартное** (другие хуки, MCP-серверы, кастомные allow-правила) — сохрани это в дельту как «требует ручного слияния, не затирать».
- После моего одобрения плана будем выполнять установку отдельной задачей.
