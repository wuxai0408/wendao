param()
$base = "C:\Users\liyou\Downloads\无敌了\青云\.claude\evolution"

try {
    $latest = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { return }

    $session = Get-Content $latest.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    if ($session.status -ne "active") { return }

    $start = [DateTime]::Parse($session.startTime)
    $duration = [math]::Round(((Get-Date) - $start).TotalSeconds, 0)

    $filesChanged = @()
    $uncommitted = $null
    try {
        Push-Location "C:\Users\liyou\Downloads\无敌了\青云"
        $d = git diff --name-only HEAD 2>$null
        if ($d) { $filesChanged = @($d) }
        $uncommitted = @(git status --porcelain 2>$null).Count
        Pop-Location
    }
    catch { }

    $session.endTime = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    $session.durationSeconds = $duration
    $session.status = "completed"
    $session.filesChanged = $filesChanged
    $session.uncommittedChanges = $uncommitted
    $session | ConvertTo-Json -Depth 4 | Set-Content $latest.FullName -Encoding utf8

    $flags = @()
    if ($uncommitted -gt 5) {
        $flags += "HIGH_UNCOMMITTED($uncommitted)"
    }
    if ($duration -gt 3600) {
        $flags += "LONG_SESSION($($duration)s)"
    }

    $completed = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object {
        Get-Content $_.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    } | Where-Object { $_.status -eq "completed" }

    $multiUncommit = ($completed | Where-Object { $_.uncommittedChanges -gt 0 }).Count
    if ($multiUncommit -ge 3) {
        $flags += "PERSISTENT_UNCOMMITTED($multiUncommit)"
    }

    if ($completed.Count -gt 0) {
        $summary = [PSCustomObject]@{
            lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
            window = @{ lastNSessions = 10; count = $completed.Count }
            aggregates = @{
                avgDurationSeconds = [math]::Round(($completed | Measure-Object -Property durationSeconds -Average).Average, 0)
                avgFilesChanged = [math]::Round((($completed | ForEach-Object { $_.filesChanged.Count }) | Measure-Object -Average).Average, 1)
                totalUncommitted = ($completed | Measure-Object -Property uncommittedChanges -Sum).Sum
                sessionsWithChanges = ($completed | Where-Object { $_.filesChanged.Count -gt 0 }).Count
            }
            flags = $flags
        }
        $summary | ConvertTo-Json -Depth 4 | Set-Content "$base\signals\summary.json" -Encoding utf8
    }

    if ($flags.Count -gt 0) {
        $flags -join "`n" | Set-Content "$base\flags.txt" -Encoding utf8
        [Console]::Error.WriteLine("[Evo] Signals: $($flags -join ', ')")
    }
    else {
        "CLEAN" | Set-Content "$base\flags.txt" -Encoding utf8
    }

    if ($uncommitted -gt 0) {
        [Console]::Error.WriteLine("[Evo] Uncommitted: $uncommitted files")
    }
    else {
        [Console]::Error.WriteLine("[Evo] Clean")
    }
}
catch {
    $m = "on-stop: $_"
    Add-Content "$base\errors.log" -Value "$(Get-Date -uformat '%Y-%m-%d %H:%M:%S'): $m"
    [Console]::Error.WriteLine("[Evo] Hook error logged")
}