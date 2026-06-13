# on-stop.ps1 — 进化系统停止钩子 + 信号检测
$ErrorActionPreference = "Stop"
$base = "C:\Users\liyou\Downloads\无敌了\青云\.claude\evolution"

try {
    # 找到 active session
    $latestSession = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latestSession) { exit 0 }

    $session = Get-Content $latestSession.FullName -Raw -Encoding utf8 | ConvertFrom-Json

    # 只在 active 状态更新
    if ($session.status -ne "active") { exit 0 }

    # 计算时长
    $start = [DateTime]::Parse($session.startTime)
    $now = Get-Date
    $duration = [math]::Round(($now - $start).TotalSeconds, 0)

    # Git 状态
    $filesChanged = @()
    $uncommitted = $null
    try {
        Push-Location "C:\Users\liyou\Downloads\无敌了\青云"
        $diffFiles = git diff --name-only HEAD 2>$null
        if ($diffFiles) { $filesChanged = @($diffFiles) }
        $uncommitted = @(git status --porcelain 2>$null).Count
        Pop-Location
    } catch { }

    # 更新 session 文件
    $session.endTime = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    $session.durationSeconds = $duration
    $session.status = "completed"
    $session.filesChanged = $filesChanged
    $session.uncommittedChanges = $uncommitted
    $session | ConvertTo-Json -Depth 4 | Set-Content $latestSession.FullName -Encoding utf8

    # === 信号检测 ===
    $flags = @()

    # 检查最近10个会话数据
    $allSessions = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object {
        Get-Content $_.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    } | Where-Object { $_.status -eq "completed" }

    # 信号1: 未提交变更过多
    if ($uncommitted -gt 5) {
        $flags += "HIGH_UNCOMMITTED($uncommitted)"
    }

    # 信号2: 会话时间过长
    if ($duration -gt 3600) {
        $flags += "LONG_SESSION($($duration)s)"
    }

    # 信号3: 多个会话都有未提交变更
    $multiUncommit = ($allSessions | Where-Object { $_.uncommittedChanges -gt 0 }).Count
    if ($multiUncommit -ge 3) {
        $flags += "PERSISTENT_UNCOMMITTED($multiUncommit sessions)"
    }

    # 更新 summary
    if ($allSessions.Count -gt 0) {
        $summary = @{
            lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
            window = @{ lastNSessions = 10; count = $allSessions.Count }
            aggregates = @{
                avgDurationSeconds = [math]::Round(($allSessions | Measure-Object -Property durationSeconds -Average).Average, 0)
                avgFilesChanged = [math]::Round(($allSessions | Measure-Object -Property filesChanged -Average | ForEach-Object { $_.Average }), 1)
                totalUncommitted = ($allSessions | Measure-Object -Property uncommittedChanges -Sum).Sum
                sessionsWithChanges = ($allSessions | Where-Object { $_.filesChanged.Count -gt 0 }).Count
            }
            flags = $flags
        }
        $summary | ConvertTo-Json -Depth 4 | Set-Content "$base\signals\summary.json" -Encoding utf8
    }

    # 写 flags.txt
    if ($flags.Count -gt 0) {
        $flags -join "`n" | Set-Content "$base\flags.txt" -Encoding utf8
        [Console]::Error.WriteLine("[进化] 检测到信号: $($flags -join ', ')")
    } else {
        "CLEAN" | Set-Content "$base\flags.txt" -Encoding utf8
    }

    # Git 状态提示
    if ($uncommitted -gt 0) {
        [Console]::Error.WriteLine("[进化] 未提交变更: $uncommitted 个文件")
    } else {
        [Console]::Error.WriteLine("[进化] 工作区干净")
    }

    exit 0
} catch {
    $errMsg = "on-stop hook error: $_"
    Add-Content -Path "$base\errors.log" -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $errMsg"
    [Console]::Error.WriteLine("[进化] on-stop hook 异常 (已记录)")
    exit 0
}
