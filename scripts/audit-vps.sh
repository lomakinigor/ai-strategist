#!/usr/bin/env bash
# Read-only аудит VPS-конфигурации Claude Code.
# Не вносит изменений. Запуск:
#   curl -sSL https://raw.githubusercontent.com/lomakinigor/ai-strategist/master/scripts/audit-vps.sh | bash
# или после клонирования репо:
#   bash scripts/audit-vps.sh

set +e

echo "=== A. РЕПО ==="
echo "pwd: $(pwd)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "HEAD: $(git rev-parse HEAD) — $(git log -1 --pretty=%s)"
    echo "git status --short:"
    git status --short
    echo "remote -v:"
    git remote -v
else
    echo "NOT a git repo"
fi
echo

echo "=== B. СИСТЕМА ==="
uname -a
cat /etc/os-release 2>/dev/null | head -3
echo "node: $(node --version 2>&1 || echo MISSING)"
echo "npm: $(npm --version 2>&1 || echo MISSING)"
echo "jq: $(jq --version 2>&1 || echo MISSING)"
echo "claude: $(which claude 2>&1 || echo NOT_IN_PATH)"
claude --version 2>&1 | head -1 || true
echo

echo "=== C. NPM (текущая папка) ==="
test -d node_modules && echo "node_modules: present" || echo "node_modules: MISSING"
test -f package-lock.json && echo "lock: present" || echo "lock: MISSING"
npm ls prettier 2>&1 | head -3
echo

echo "=== D. PROJECT-LEVEL (текущая папка) ==="
test -f .claude/settings.json && echo "project .claude/settings.json: present" || echo "project .claude/settings.json: MISSING"
test -f .claudeignore && echo ".claudeignore: present" || echo ".claudeignore: MISSING"
test -f .prettierrc && echo ".prettierrc: present" || echo ".prettierrc: MISSING"
if [ -d .claude/rules ]; then
    echo ".claude/rules/ files:"
    ls .claude/rules/
else
    echo ".claude/rules/: MISSING"
fi
test -x scripts/log-command.sh && echo "log-command.sh: executable" || echo "log-command.sh: MISSING/not_x"
echo

echo "=== E. USER-LEVEL ~/.claude/ ==="
if [ -f "$HOME/.claude/settings.json" ]; then
    echo "user settings.json: present"
    if command -v jq >/dev/null 2>&1; then
        jq '{
            defaultMode,
            allow_count: (.permissions.allow // [] | length),
            deny_count: (.permissions.deny // [] | length),
            sandbox_enabled: (.sandbox.enabled // false),
            sandbox_domains: (.sandbox.network.allowedDomains // []),
            hooks_keys: (.hooks // {} | keys)
        }' "$HOME/.claude/settings.json"
    else
        echo "(jq отсутствует, raw cat:)"
        cat "$HOME/.claude/settings.json"
    fi
else
    echo "user settings.json: MISSING"
fi
echo

echo "=== F. ХУК log-command ==="
test -d .claude/logs && echo "logs/ есть" || echo "logs/ нет"
test -f .claude/logs/commands.tsv && wc -l .claude/logs/commands.tsv || echo "commands.tsv нет"
echo

echo "=== G. AI-STRATEGIST ==="
test -d "$HOME/projects/ai-strategist" && echo "ai-strategist клон: ЕСТЬ ($HOME/projects/ai-strategist)" || echo "ai-strategist клон: НЕТ"
test -d "$HOME/ai-strategist" && echo "ai-strategist в \$HOME: ЕСТЬ"
echo

echo "=== H. CLAUDE-СКИЛЛЫ И КОММАНДЫ ==="
if [ -d "$HOME/.claude/skills" ]; then
    echo "skills:"
    ls "$HOME/.claude/skills/"
else
    echo "~/.claude/skills/: нет"
fi
if [ -d "$HOME/.claude/commands" ]; then
    echo "commands:"
    ls "$HOME/.claude/commands/"
else
    echo "~/.claude/commands/: нет"
fi
echo

echo "=== AUDIT DONE ==="
