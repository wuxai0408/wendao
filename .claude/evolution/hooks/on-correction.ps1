param()
$base = "C:\Users\liyou\Downloads\wx\wendao\.claude\evolution"

try {
    $latest = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { return }

    $session = Get-Content $latest.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    if ($session.status -ne "active") { return }

    $prompt = $input | Out-String
    if (-not $prompt) { return }

    $negPatterns = @(
        "不对",
        "错了",
        "不行",
        "不是",
        "别(?:这样|做)",
        "不要",
        "重新",
        "再来",
        "换一个",
        "不好",
        "很差",
        "有问题",
        "搞错",
        "误会",
        "完全错",
        "又错了",
        "wrong",
        "no\b",
        "incorrect",
        "\bbad\b",
        "redo",
        "retry"
    )

    $isCorrection = $false
    foreach ($p in $negPatterns) {
        if ($prompt -match $p) {
            $isCorrection = $true
            break
        }
    }

    if (-not $isCorrection) { return }

    $count = 0
    if ($session.PSObject.Properties.Name -contains "corrections") {
        $count = [int]$session.corrections
    }
    else {
        $session | Add-Member -NotePropertyName "corrections" -NotePropertyValue 0 -Force
    }
    $session.corrections = $count + 1

    $session | ConvertTo-Json -Depth 4 | Set-Content $latest.FullName -Encoding utf8
    [Console]::Error.WriteLine("[Evo] Correction #$($session.corrections) detected")
}
catch { }
