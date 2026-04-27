# Звуковые уведомления Claude Code

> Задача: F-000B / T-000B. Реализовано: 2026-04-27.

## Что настроено

Два звуковых сигнала через хуки Claude Code (`~/.claude/settings.json`):

| Сигнал | Событие | Звук |
|--------|---------|------|
| Двойной бип | Задача полностью завершена | 880 Hz × 2 |
| Тройной бип | Claude ожидает подтверждения / уведомление | 660 Hz × 3 |

## Как работает

Claude Code поддерживает [хуки](https://docs.anthropic.com/en/docs/claude-code/hooks) — команды, выполняемые при наступлении определённых событий:

- **`Stop`** — срабатывает когда Claude Code завершает задачу и останавливается
- **`Notification`** — срабатывает когда Claude Code отправляет уведомление пользователю (например, ожидание разрешения на действие, пауза)

Оба хука выполняют PowerShell-команду с `[System.Console]::Beep(frequency, duration)` — встроенный системный звук Windows без внешних зависимостей.

## Конфигурация (текущая)

Файл: `C:/Users/Lenovo/.claude/settings.json`

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -NoProfile -NonInteractive -Command \"[System.Console]::Beep(880,220); Start-Sleep -Milliseconds 180; [System.Console]::Beep(880,220)\""
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -NoProfile -NonInteractive -Command \"[System.Console]::Beep(660,180); Start-Sleep -Milliseconds 150; [System.Console]::Beep(660,180); Start-Sleep -Milliseconds 150; [System.Console]::Beep(660,180)\""
          }
        ]
      }
    ]
  }
}
```

## Ручные скрипты

В директории проекта есть standalone-скрипты для ручной проверки:

```powershell
# Двойной сигнал
powershell -NoProfile -NonInteractive -File scripts/beep-done.ps1

# Тройной сигнал
powershell -NoProfile -NonInteractive -File scripts/beep-wait.ps1
```

## Как проверить

### Быстрая проверка в терминале
```bash
# Двойной бип
powershell -NoProfile -NonInteractive -Command "[System.Console]::Beep(880,220); Start-Sleep -Milliseconds 180; [System.Console]::Beep(880,220)"

# Тройной бип
powershell -NoProfile -NonInteractive -Command "[System.Console]::Beep(660,180); Start-Sleep -Milliseconds 150; [System.Console]::Beep(660,180); Start-Sleep -Milliseconds 150; [System.Console]::Beep(660,180)"
```

### Проверка хука Stop
Дать Claude Code простую задачу и дождаться завершения — должен сработать двойной бип.

### Проверка хука Notification
Хук срабатывает, когда Claude Code создаёт системное уведомление. Это происходит, в частности, когда:
- Claude Code работает в фоне и завершает задачу
- Claude Code запрашивает подтверждение пользователя

## Ограничения

### Текущая реализация (Windows 10)
- `[System.Console]::Beep()` — системный динамик или встроенные звуки. **Требует, чтобы звук не был заглушён на уровне системы.**
- На некоторых системах `Console.Beep` может быть отключён в BIOS или аудиодрайвере.
- Хук `Notification` срабатывает при системных уведомлениях Claude Code, **не** при каждом вопросе в чате.

### Для разных ОС

**macOS:**
```json
"command": "afplay /System/Library/Sounds/Glass.aiff; afplay /System/Library/Sounds/Glass.aiff"
```
Или с `osascript`:
```json
"command": "osascript -e 'beep 2'"
```

**Linux:**
```json
"command": "paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null; sleep 0.3; paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null"
```
Или через терминальный bell:
```json
"command": "printf '\\a'; sleep 0.3; printf '\\a'"
```

**Windows (альтернативный способ через wscript):**
```powershell
# Воспроизвести системный звук "Asterisk"
(New-Object Media.SoundPlayer "C:\Windows\Media\chimes.wav").PlaySync()
```

## VS Code: включение Terminal Bell

Если звук не слышен в терминале VS Code, проверить настройки:

1. Открыть `Ctrl+,` → поиск `bell`
2. `terminal.integrated.enableBell` → `true`
3. `terminal.integrated.bellDuration` → `1000` (или нужное значение в мс)

## Как отключить

Удалить или закомментировать секцию `hooks` из `~/.claude/settings.json`.

Для отключения только одного типа — удалить соответствующий блок (`Stop` или `Notification`).
