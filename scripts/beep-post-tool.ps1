# PostToolUse hook — updates timestamp so PreToolUse knows a tool just completed
(Get-Date -Format 'o') | Out-File "$env:TEMP\claude-last-tool.txt" -Encoding utf8 -NoNewline
