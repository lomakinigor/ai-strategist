# Двойной сигнал — задача завершена (Stop hook)
# Запуск: powershell -NoProfile -NonInteractive -File scripts/beep-done.ps1
[System.Console]::Beep(880, 220)
Start-Sleep -Milliseconds 180
[System.Console]::Beep(880, 220)
