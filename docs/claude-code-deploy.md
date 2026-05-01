# Применение настроек Claude Code на удалённом сервере

Чеклист переноса локальной конфигурации Claude Code на Linux/macOS-сервер. Принцип: shared-конфиг (project) идёт через git, user-конфиг (`~/.claude/`) копируется/настраивается вручную.

## 1. Уже в репозитории (приедет с git pull)

| Файл | Назначение |
|------|------------|
| [`.claude/settings.json`](../.claude/settings.json) | project-level allow/deny под стек |
| [`.claude/rules/`](../.claude/rules/) | data-reliability, russia-context, hooks |
| [`.claudeignore`](../.claudeignore) | экономия токенов CC |
| [`.prettierrc`](../.prettierrc) | формат TS/CSS/JSON |
| [`CLAUDE.md`](../CLAUDE.md) | проектные инструкции |
| [`scripts/log-command.sh`](../scripts/log-command.sh) | Linux-аналог логирования |

## 2. Настроить вручную на сервере

### 2.1. Установить Claude Code

```bash
# через Anthropic CLI (актуальный способ — см. docs.anthropic.com)
curl -fsSL https://anthropic.com/install-claude-code.sh | sh
```

### 2.2. Создать `~/.claude/settings.json`

Содержимое (адаптировано под Linux: sandbox, .sh-хуки, без PowerShell):

```json
{
  "defaultMode": "acceptEdits",
  "permissions": {
    "allow": [
      "Bash(git diff*)", "Bash(git log*)", "Bash(git status*)",
      "Bash(git add*)", "Bash(git commit*)", "Bash(git pull*)",
      "Bash(npm run *)", "Bash(npx *)", "Bash(node *)",
      "Bash(ls*)", "Bash(pwd)", "Bash(grep*)", "Bash(cat*)",
      "Bash(head*)", "Bash(tail*)", "Bash(mkdir*)", "Bash(touch*)"
    ],
    "deny": [
      "Bash(rm -rf *)", "Bash(rm -fr *)",
      "Bash(git push --force*)", "Bash(git reset --hard*)",
      "Bash(sudo *)", "Bash(chmod 777 *)", "Bash(chown *)",
      "Read(**/.env)", "Read(**/.env.*)", "Read(**/credentials*)",
      "Read(**/*.key)", "Read(**/*.pem)", "Read(**/id_rsa)",
      "Write(**/.env)", "Write(**/.env.*)",
      "Edit(**/.env)", "Edit(**/.env.*)"
    ]
  },
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "allowWrite": ["./src", "./app", "./tests", "./docs", "./memory", "/tmp"],
      "denyWrite": ["/etc", "/usr/local/bin"],
      "denyRead": ["~/.aws/credentials", "~/.kube/config", "~/.ssh"]
    },
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org", "registry.npmjs.org",
                         "openrouter.ai", "api.perplexity.ai", "api.anthropic.com"],
      "allowLocalBinding": true
    }
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash /path/to/repo/scripts/log-command.sh"
          }
        ]
      }
    ]
  }
}
```

> **Замените** `/path/to/repo` на реальный путь к клону репозитория на сервере.

### 2.3. Установить зависимости хука

```bash
sudo apt-get install -y jq          # log-command.sh использует jq
chmod +x scripts/log-command.sh
```

## 3. Что осознанно НЕ переносим

| Что | Почему |
|-----|--------|
| `beep-*.ps1` | Звуковые сигналы на сервере не нужны (нет вывода) |
| Привязка хуков к Windows-путям | Linux-хуки используют свои `.sh` пути |
| `.claude/settings.local.json` | Личный файл, gitignored |
| Sandbox на Windows-стороне | На Windows нативно не работает, только Linux/macOS/WSL2 |

## 4. Sandbox: как проверить

```bash
claude --version              # должен быть актуальный
# в сессии:
/sandbox-status               # покажет включённость и applied policy
```

Если `sandbox.enabled: true` и операция нарушает правила — Claude Code откажет в выполнении с указанием правила.

## 5. Опционально

- **Codex CLI / Gemini CLI** — для multi-model review через `/council`. Установка через npm/pipx, ключи API. Сейчас — не критично.
- **MCP-серверы** — переносить только те, которыми реально пользуемся.
