# on-start.ps1 — 进化系统启动钩子
$ErrorActionPreference = "Stop"
$base = "C:\Users\liyou\Downloads\无敌了\青云\.claude\evolution"

try {
    # 读状态
    $state = Get-Content "$base\state.json" -Raw -Encoding utf8 | ConvertFrom-Json

    # 生成 session ID
    $today = Get-Date -Format "yyyy-MM-dd"
    $existing = if (Test-Path "$base\sessions") { @(Get-ChildItem "$base\sessions" -Filter "$today-*.json" -ErrorAction SilentlyContinue).Count } else { 0 }
    $sessionId = "$today-" + "{0:D3}" -f ($existing + 1)

    # 写会话文件
    $session = @{
        sessionId = $sessionId
        startTime = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
        endTime = $null
        durationSeconds = $null
        status = "active"
        filesChanged = @()
        uncommittedChanges = $null
        flag = "clean"
        agentUsed = ""
        notes = ""
    }
    $session | ConvertTo-Json -Depth 4 | Set-Content "$base\sessions\$sessionId.json" -Encoding utf8

    # 更新状态计数
    $state.totalSessions = [int]$state.totalSessions + 1
    $state.lastSessionStart = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    $state | ConvertTo-Json -Depth 4 | Set-Content "$base\state.json" -Encoding utf8

    # 读 flags，输出到 stderr 让 Claude Code 可见
    $flags = Get-Content "$base\flags.txt" -Raw -Encoding utf8 -ErrorAction SilentlyContinue
    if ($flags -and $flags.Trim() -ne "CLEAN") {
        [Console]::Error.WriteLine("[进化] 上次会话标记: $($flags.Trim())")
    }

    exit 0
} catch {
    $errMsg = "on-start hook error: $_"
    Add-Content -Path "$base\errors.log" -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $errMsg"
    [Console]::Error.WriteLine("[进化] on-start hook 异常 (已记录)")
    exit 0
}
