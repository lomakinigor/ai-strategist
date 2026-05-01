# PostToolUse hook — timestamp + prettier on Edit/Write for TS/CSS files
(Get-Date -Format 'o') | Out-File "$env:TEMP\claude-last-tool.txt" -Encoding utf8 -NoNewline

try {
    $raw = [Console]::In.ReadToEnd()
    if ($raw) {
        $hook = $raw | ConvertFrom-Json
        $tool = $hook.tool_name
        if ($tool -eq 'Edit' -or $tool -eq 'Write') {
            $file = $hook.tool_input.file_path
            if ($file -match '\.(ts|tsx|js|jsx|css|json)$') {
                $projectRoot = "d:/AI/VS Code/Local/projects/ai-strategist"
                if ($file.StartsWith($projectRoot)) {
                    $rel = $file.Substring($projectRoot.Length).TrimStart('/\')
                    Set-Location $projectRoot
                    $null = & npx prettier --write $rel 2>&1
                }
            }
        }
    }
} catch { }
