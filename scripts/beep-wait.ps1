# Тройной сигнал разными тонами — ожидание подтверждения (Notification hook)
# Тоны: 523 Hz → 659 Hz → 784 Hz (до-ми-соль, восходящее мажорное трезвучие)

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

Play-Tone 523 250
Start-Sleep -Milliseconds 100
Play-Tone 659 250
Start-Sleep -Milliseconds 100
Play-Tone 784 350
