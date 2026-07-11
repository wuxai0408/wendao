param()
$base = "C:\Users\liyou\Downloads\wx\wendao\.claude\evolution"

try {
    # 找到当前活跃的会话文件
    $latest = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { return }

    $session = Get-Content $latest.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    if ($session.status -ne "active") { return }

    # 递增工具失败计数
    $count = 0
    if ($session.PSObject.Properties.Name -contains "toolFailures") {
        $count = [int]$session.toolFailures
    } else {
        $session | Add-Member -NotePropertyName "toolFailures" -NotePropertyValue 0 -Force
    }
    $session.toolFailures = $count + 1

    # 记录失败工具名（如果有参数传入）
    if ($args.Count -gt 0) {
        if (-not ($session.PSObject.Properties.Name -contains "lastFailedTool")) {
            $session | Add-Member -NotePropertyName "lastFailedTool" -NotePropertyValue "" -Force
        }
        $session.lastFailedTool = $args[0]
    }

    $session | ConvertTo-Json -Depth 4 | Set-Content $latest.FullName -Encoding utf8
    # silent — tool failure count auto-tracked
}
catch {
    # 静默失败 — 工具失败钩子不应阻塞
}
