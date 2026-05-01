# Хуки и звуковые сигналы

Скрипты в [`scripts/`](../../scripts/). Зарегистрированы в `~/.claude/settings.json` (глобально).

| Скрипт | Hook | Поведение |
|--------|------|-----------|
| `beep-pre-tool.ps1` | `PreToolUse` (tool=Bash) | Тройной ↓ 784→659→523 Hz при диалоге «Allow this bash command?» |
| `beep-post-tool.ps1` | `PostToolUse` | Авто-prettier на Edit/Write для `.ts/.tsx/.js/.jsx/.css/.json` + timestamp |
| `beep-done.ps1` | `Stop` | Двойной ↑ 660→880 Hz при завершении задачи |
| `beep-confirm.ps1` | `onShellCommandConfirmationRequested` | Legacy, не срабатывает в VSCode extension |

**Инвариант:** `PreToolUse + tool=Bash + не --dangerously-skip-permissions` → тройной сигнал.
В VSCode extension `onShellCommandConfirmationRequested` не приходит, правильный триггер — `PreToolUse`.

**Отладка:**
```powershell
New-Item "$env:TEMP\claude-beep-debug.flag"  # включить лог
Get-Content "$env:TEMP\claude-beep-debug.log" | Select-Object -Last 20
```

## Кросс-платформенность

PowerShell-скрипты работают только на Windows. На Linux/macOS-сервере использовать `.sh`-эквиваленты (звуковые сигналы там обычно не нужны, но `format-touched` и `log-command` — нужны).
