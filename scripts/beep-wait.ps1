# Тройной сигнал — ожидание подтверждения разработчика (Notification hook)
# Запуск: powershell -NoProfile -NonInteractive -File scripts/beep-wait.ps1
[System.Console]::Beep(660, 180)
Start-Sleep -Milliseconds 150
[System.Console]::Beep(660, 180)
Start-Sleep -Milliseconds 150
[System.Console]::Beep(660, 180)
