# PreToolUse hook — triple beep ONLY for Bash confirmation dialog
# This script must play sound exclusively for:
# onShellCommandConfirmationRequested
# All other events must stay silent.

$inputJson = $null

try {
    $raw = ""
    while (($line = [Console]::In.ReadLine()) -ne $null) {
        $raw += $line
    }

    if ([string]::IsNullOrWhiteSpace($raw)) {
        return
    }

    $inputJson = $raw | ConvertFrom-Json -ErrorAction Stop
}
catch {
    return
}

if ($null -eq $inputJson) {
    return
}

$toolName = $inputJson.toolname
if (-not $toolName) { $toolName = $inputJson.tool_name }

$eventName = $inputJson.hookeventname
if (-not $eventName) { $eventName = $inputJson.hook_event_name }
if (-not $eventName) { $eventName = $inputJson.event }
if (-not $eventName) { $eventName = $inputJson.eventType }

$command = $null
if ($inputJson.toolinput) { $command = $inputJson.toolinput.command }
if ((-not $command) -and $inputJson.tool_input) { $command = $inputJson.tool_input.command }

$logFile = "$env:TEMP\claude-beep-debug.log"
"$(Get-Date -Format 'HH:mm:ss') [beep-pre-tool] event=$eventName tool=$toolName" |
    Add-Content $logFile -ErrorAction SilentlyContinue

if ($toolName -ne "Bash") {
    return
}

if ($command -match "--dangerously-skip-permissions") {
    return
}

function Play-Tone($freq, $dur) {
    $rate = 44100
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

    $bw.Dispose()
    $ms.Dispose()
}

Play-Tone 784 350
Start-Sleep -Milliseconds 100
Play-Tone 659 250
Start-Sleep -Milliseconds 100
Play-Tone 523 250
