# Звуковые уведомления Claude Code

> Задача: F-000B / T-000B. Обновлено: F-000C / T-000C (2026-04-27).

## Что настроено

Два звуковых сигнала через хуки Claude Code (`~/.claude/settings.json`):

| Сигнал | Hook event | Паттерн | Тоны |
|--------|-----------|---------|------|
| Двойной восходящий | `Stop` | низкий → высокий | 660 Hz → 880 Hz |
| Тройной нисходящий | `Notification` | высокий → низкий | 784 Hz → 659 Hz → 523 Hz |

## Как работает

Claude Code поддерживает [хуки](https://docs.anthropic.com/en/docs/claude-code/hooks):

- **`Stop`** — Claude Code завершил задачу и остановился → двойной сигнал «та-ДА»
- **`Notification`** — Claude Code отправляет уведомление (ожидание разрешения, пауза, системное событие) → тройной нисходящий сигнал «соль-ми-до»

## Конфигурация (текущая)

Файл: `C:/Users/Lenovo/.claude/settings.json`

```json
{
  "permissions": { "allow": ["mcp__pencil"] },
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "powershell -NoProfile -NonInteractive -File \"d:/AI/VS Code/Local/projects/ai-strategist/scripts/beep-done.ps1\"" }]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "powershell -NoProfile -NonInteractive -File \"d:/AI/VS Code/Local/projects/ai-strategist/scripts/beep-wait.ps1\"" }]
      }
    ]
  }
}
```

**Важно:** `PreToolUse` hooks были удалены в F-000C — они срабатывали перед каждым вызовом инструмента, не только при permission dialog, что давало ложные сигналы.

## Ручные скрипты

```powershell
# Двойной сигнал (задача завершена)
powershell -NoProfile -NonInteractive -File scripts/beep-done.ps1

# Тройной нисходящий сигнал (ожидание подтверждения)
powershell -NoProfile -NonInteractive -File scripts/beep-wait.ps1
```

## Ограничения

### Нет хука PermissionRequest
Claude Code не имеет отдельного hook event для permission dialog ("Allow this bash command?").
Ближайший доступный хук — `Notification`, который срабатывает при системных уведомлениях Claude Code.

Если `Notification` не покрывает конкретный тип permission dialog — это ограничение платформы.
В этом случае сигнал будет отсутствовать для этого события — это честное поведение.

**Что НЕ нужно делать:** использовать `PreToolUse` как замену — он вызывает ложные сигналы при каждом вызове инструмента.

### Громкость
`System.Media.SoundPlayer` использует аудиокарту и системный уровень звука. Требует включённого звука в Windows.

### Проверка хуков вручную
- `Stop` → дать Claude Code простую задачу, дождаться завершения
- `Notification` → триггерится при permission dialog в некоторых конфигурациях; проверяется при появлении реального диалога разрешения

## Как отключить

Удалить или закомментировать секцию `hooks` из `~/.claude/settings.json`.
