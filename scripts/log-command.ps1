# PreToolUse hook — append tool invocations to project audit log
# Writes TSV: timestamp <TAB> tool <TAB> short_summary
# Non-blocking: any error is swallowed. Log path is gitignored.

try {
    $raw = [Console]::In.ReadToEnd()
    if (-not $raw) { exit 0 }

    $hook = $raw | ConvertFrom-Json
    $tool = $hook.tool_name
    if (-not $tool) { exit 0 }

    $summary = ''
    switch ($tool) {
        'Bash'   { $summary = $hook.tool_input.command }
        'Edit'   { $summary = $hook.tool_input.file_path }
        'Write'  { $summary = $hook.tool_input.file_path }
        'Read'   { $summary = $hook.tool_input.file_path }
        'Glob'   { $summary = $hook.tool_input.pattern }
        'Grep'   { $summary = $hook.tool_input.pattern }
        default  { $summary = '' }
    }
    if ($summary) {
        $summary = ($summary -replace "`r?`n", ' ').Substring(0, [Math]::Min(200, $summary.Length))
    }

    $projectRoot = 'd:/AI/VS Code/Local/projects/ai-strategist'
    $logDir = Join-Path $projectRoot '.claude/logs'
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $logFile = Join-Path $logDir 'commands.tsv'

    $ts = Get-Date -Format 'o'
    $line = "{0}`t{1}`t{2}" -f $ts, $tool, $summary
    Add-Content -Path $logFile -Value $line -Encoding utf8
} catch { }
exit 0
