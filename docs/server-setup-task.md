# Задание для Claude Code на VPS

Это разовое задание. После выполнения — отчёт по формату, файл можно удалить или оставить как лог.

## Цель

Применить на этом VPS ту же конфигурацию Claude Code, что уже зафиксирована локально в репозитории (коммиты `252267c`, `f277a85`). Конкретно:
1. Подтвердить, что shared-конфиги из репо подтянуты и валидны.
2. Установить системные зависимости (`jq`, `prettier` через npm).
3. Создать `~/.claude/settings.json` с Linux-вариантом (sandbox + log-command hook), пути адаптировать под VPS.
4. Проверить, что sandbox работает и аудит-лог пишется.
5. Вернуть структурированный отчёт.

## Предусловия (проверь и сообщи, если что-то не так)

1. ОС — Linux (любой популярный дистрибутив с `apt`/`dnf`/`apk`). Если другая — сообщи и остановись.
2. Репозиторий уже склонирован в текущую рабочую директорию. Если нет — сообщи путь, где он есть, или останови выполнение и спроси у пользователя.
3. На текущей ветке `master`, без локальных uncommitted изменений. Если есть — выведи `git status` и спроси что делать (не коммитить, не сбрасывать самостоятельно).
4. У пользователя есть `sudo` без пароля **или** `jq` уже установлен. Если sudo требует пароль и `jq` нет — сообщи и остановись с инструкцией для пользователя.
5. Установлен Node.js (любой LTS) и npm. Если нет — сообщи и остановись.

## Контекст (для Claude — это уже в репо)

Прочитай перед стартом:
- [`CLAUDE.md`](../CLAUDE.md) — общие правила проекта
- [`.claude/rules/`](../.claude/rules/) — data-reliability, russia-context, hooks
- [`docs/claude-code-deploy.md`](claude-code-deploy.md) — чеклист, на который опирается это задание (там же готовый JSON-фрагмент для `~/.claude/settings.json`)
- Скрипт хука: [`scripts/log-command.sh`](../scripts/log-command.sh)

## Шаги выполнения

### Шаг 1. Sync репозитория

```bash
git fetch origin
git status
git log --oneline -5
```

Убедись, что HEAD = `f277a85` или новее. Если позади — `git pull --ff-only origin master`. Если есть untracked/modified — **остановись и сообщи**, не сбрасывай.

### Шаг 2. npm-зависимости

```bash
npm ci
```

Должны установиться все deps включая `prettier ^3.8.3`. Если упадёт — сообщи stderr дословно, не пытайся починить через --force/--legacy.

### Шаг 3. Системные зависимости

Установи `jq` (нужен для `log-command.sh`):

```bash
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y jq

# RHEL/Rocky/Alma
sudo dnf install -y jq

# Alpine
sudo apk add --no-cache jq
```

Проверь:
```bash
jq --version
```

### Шаг 4. Сделай хук исполняемым

```bash
chmod +x scripts/log-command.sh
```

### Шаг 5. Сформируй `~/.claude/settings.json`

**Важно:** возьми JSON-шаблон из [`docs/claude-code-deploy.md`](claude-code-deploy.md) раздел 2.2 (там уже всё с sandbox и нужными доменами).

Замени плейсхолдер `/path/to/repo` на абсолютный путь к этому репозиторию (получишь через `pwd`).

Если файл `~/.claude/settings.json` **уже существует** — НЕ перезаписывай. Сделай резервную копию `cp ~/.claude/settings.json ~/.claude/settings.json.bak.$(date +%s)`, затем покажи пользователю текущий и предлагаемый JSON, спроси подтверждение перед заменой.

Если файла нет — создай:
```bash
mkdir -p ~/.claude
cat > ~/.claude/settings.json <<'EOF'
{ ... сюда вставь готовый JSON с подставленным абсолютным путём ... }
EOF
```

Проверь что валидный JSON:
```bash
jq . ~/.claude/settings.json > /dev/null && echo OK
```

### Шаг 6. Проверки

#### 6.1. Тесты и сборка проекта (sanity check, что ничего не сломалось)

```bash
npm run test
npm run build
```

Оба должны быть зелёными. Если что-то падает — отчётись с stderr, не правь.

#### 6.2. Хук log-command работает

Создай тестовый JSON-вход и прогони хук вручную:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"echo hello"}}' | bash scripts/log-command.sh
ls -la .claude/logs/commands.tsv 2>&1
tail -1 .claude/logs/commands.tsv 2>&1
```

Должна появиться строка с timestamp, `Bash`, `echo hello`. Файл должен быть в `.gitignore` (уже зафиксировано на строке `.claude/logs/`).

#### 6.3. Sandbox status

В рамках текущей сессии на VPS — Claude Code должен сам видеть свой sandbox. Если есть встроенная команда `/sandbox-status` или эквивалент — выведи её результат. Если нет — покажи актуальное содержимое `~/.claude/settings.json` через `jq .sandbox ~/.claude/settings.json`.

### Шаг 7. Зафиксируй версию

Запомни: эта сессия применила коммит репозитория `<вставь актуальный HEAD>` к VPS-конфигу.

## Что НЕ нужно делать

- НЕ менять файлы в репозитории
- НЕ коммитить ничего на сервере
- НЕ запускать `git push`
- НЕ устанавливать Codex/Gemini CLI (отложено)
- НЕ копировать `beep-*.ps1` хуки — они Windows-only и на сервере бесполезны
- НЕ редактировать `.claude/settings.json` (project-level) — он уже корректный из git
- НЕ пытаться сэмулировать звуковые сигналы

## Формат отчёта (обязательный)

В конце выполнения верни блок:

```
## РЕЗЮМЕ СЕРВЕРНОЙ УСТАНОВКИ

- HEAD репо на VPS: <hash> <subject>
- Абсолютный путь репо: <path>
- ОС / дистрибутив: <output of `uname -a` или `lsb_release -d`>
- Node / npm / jq версии: <…>
- npm ci: success / failed
- npm run test: <N passed / N failed>
- npm run build: success / failed
- ~/.claude/settings.json: создан / обновлён / уже был, без изменений
- Бэкап старого settings: <путь к .bak> (если был)
- Sandbox enabled: true / false (из jq)
- log-command.sh smoke-test: success / failed (последняя строка commands.tsv)
- Что не получилось: <список или "ничего">
- Следующий рекомендуемый шаг: <…>
```

Если на любом шаге что-то падает или вызывает сомнение — **остановись, отчётись, спроси**. Не используй `--force`, `--no-verify`, `sudo rm -rf`, не сбрасывай git.
