# PreToolUse hook — beep only when a permission dialog likely preceded this tool call
#
# Two-guard approach:
#   1. tool_name filter  — only react to Bash (ignore Read/Write/Edit/Glob/etc.)
#   2. Elapsed-time guard — only beep if time since last PostToolUse > threshold
#
# When tools are auto-approved they run fast (<threshold) → PostToolUse keeps the
# timestamp fresh → elapsed stays small → NO beep.
# When a permission dialog appears the user takes several seconds to respond →
# elapsed grows past the threshold → beep fires on the next tool after approval.

$tsFile    = "$env:TEMP\claude-last-tool.txt"
$threshold = 5   # seconds — tune up if you get false positives, down if dialogs are missed

# ── 1. Read stdin JSON to determine tool_name ─────────────────────────────────
$toolName = $null
try {
    $raw = [Console]::In.ReadToEnd()
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        $json     = $raw | ConvertFrom-Json -ErrorAction Stop
        $toolName = $json.tool_name
    }
} catch { }

# Guard 1: only Bash triggers this signal
if ($toolName -ne "Bash") { return }

# ── 2. Elapsed-time guard ─────────────────────────────────────────────────────
# No timestamp file = first tool of the session → stay silent (no baseline yet)
if (-not (Test-Path $tsFile)) { return }

$shouldBeep = $false
try {
    $lastTs  = [datetime](Get-Content $tsFile -Raw -ErrorAction Stop).Trim()
    $elapsed = (Get-Date) - $lastTs
    $shouldBeep = ($elapsed.TotalSeconds -gt $threshold)
} catch { }

if (-not $shouldBeep) { return }

# ── 3. Play triple descending signal 784→659→523 Hz ──────────────────────────
function Invoke-Tone($freq, $dur) {
    $rate    = 44100
    $samples = [int]($rate * $dur / 1000)
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)
    $bw.Write([byte[]]@(82,73,70,70))
    $bw.Write([int](36 + $samples * 2))
    $bw.Write([byte[]]@(87,65,86,69))
    $bw.Write([byte[]]@(102,109,116,32))
    $bw.Write([int]16)
    $bw.Write([int16]1)
    $bw.Write([int16]1)
    $bw.Write([int]$rate)
    $bw.Write([int]($rate * 2))
    $bw.Write([int16]2)
    $bw.Write([int16]16)
    $bw.Write([byte[]]@(100,97,116,97))
    $bw.Write([int]($samples * 2))
    for ($i = 0; $i -lt $samples; $i++) {
        $t = $i / $rate
        $v = [int](32000 * [Math]::Sin(2 * [Math]::PI * $freq * $t))
        $bw.Write([int16]$v)
    }
    $bw.Flush()
    $ms.Position = 0
    $player = New-Object System.Media.SoundPlayer($ms)
    $player.PlaySync()
    $bw.Dispose(); $ms.Dispose()
}

Invoke-Tone 784 350
Start-Sleep -Milliseconds 100
Invoke-Tone 659 250
Start-Sleep -Milliseconds 100
Invoke-Tone 523 250
