# PreToolUse hook — plays triple signal only after a pause (permission dialog or user input)
# Fires when time since last completed tool > threshold seconds
$tsFile = "$env:TEMP\claude-last-tool.txt"
$threshold = 3  # seconds — larger than auto-approve latency, smaller than permission dialog response

$shouldBeep = $true
if (Test-Path $tsFile) {
    try {
        $lastTs = [datetime](Get-Content $tsFile -Raw -ErrorAction Stop).Trim()
        $elapsed = (Get-Date) - $lastTs
        if ($elapsed.TotalSeconds -lt $threshold) {
            $shouldBeep = $false
        }
    } catch { }
}

if ($shouldBeep) {
    (Get-Date -Format 'o') | Out-File $tsFile -Encoding utf8 -NoNewline

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
        $bw.Dispose(); $ms.Dispose()
    }

    Play-Tone 784 350
    Start-Sleep -Milliseconds 100
    Play-Tone 659 250
    Start-Sleep -Milliseconds 100
    Play-Tone 523 250
}
