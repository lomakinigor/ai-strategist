# PreToolUse hook — triple beep STRICTLY for interactive Bash confirmation
# Plays sound only when:
# - tool_name == "Bash"
# - and command is not explicitly marked to skip permissions

# Read entire stdin as JSON (if any)
$inputJson = $null
try {
    $raw = ""
    while ($line = [Console]::In.ReadLine()) {
        $raw += $line
    }
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        $inputJson = $raw | ConvertFrom-Json -ErrorAction Stop
    }
} catch {
    # If JSON is invalid, stay silent
    return
}

if ($null -eq $inputJson) {
    return
}

# Expect fields like: tool_name, tool_input.command, hook_event_name, etc.
$toolName = $inputJson.tool_name
$command  = $inputJson.tool_input.command

# Only Bash tool
if ($toolName -ne "Bash") {
    return
}

# If command contains an explicit flag to skip permissions, stay silent
# (you можешь изменить/удалить этот фильтр, если не используешь такие флаги)
if ($command -match "--dangerously-skip-permissions") {
    return
}

function Invoke-Tone($freq, $dur) {
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
    $bw.Dispose(); $ms.Dispose()
}

# Triple beep
Invoke-Tone 784 350
Start-Sleep -Milliseconds 100
Invoke-Tone 659 250
Start-Sleep -Milliseconds 100
Invoke-Tone 523 250
