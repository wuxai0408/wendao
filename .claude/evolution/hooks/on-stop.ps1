param()
$base = "C:\Users\liyou\Downloads\wx\wendao\.claude\evolution"
$repo = "C:\Users\liyou\Downloads\wx\wendao"
$expFile = "$repo\经验库.md"

try {
    # -- 1. Find current active session --
    $latest = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { return }

    $session = Get-Content $latest.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    if ($session.status -ne "active") { return }

    # -- 2. Calculate duration --
    $start = [DateTime]::Parse($session.startTime)
    $duration = [math]::Round(((Get-Date) - $start).TotalSeconds, 0)

    # -- 3. Git change detection --
    $filesChanged = @()
    $uncommitted = $null
    try {
        Push-Location $repo
        $d = git diff --name-only HEAD 2>$null
        if ($d) { $filesChanged = @($d) }
        $uncommitted = @(git status --porcelain 2>$null).Count
        Pop-Location
    }
    catch { }

    # -- 4. Experience library linkage --
    $experienceAdded = 0
    $expTopics = @{}
    try {
        if (Test-Path $expFile) {
            $expContent = Get-Content $expFile -Raw -Encoding utf8
            $pattern = '##\s+\d+\.\s+.\s*(.+?)(?:\r?\n|$)'
            $matches = [regex]::Matches($expContent, $pattern)
            $experienceAdded = $matches.Count

            foreach ($m in $matches) {
                $topic = $m.Groups[1].Value
                $key = $topic.Trim()
                if ($key -match '^(.+?)[：:]') {
                    $key = $Matches[1].Trim()
                }
                $shortKey = $key.Substring(0, [Math]::Min(4, $key.Length))
                if (-not $expTopics.ContainsKey($shortKey)) {
                    $expTopics[$shortKey] = 0
                }
                $expTopics[$shortKey]++
            }
        }
    }
    catch { }

    # -- 5. Signal detection --
    $signals = @()

    # 5a. High uncommitted
    if ($uncommitted -gt 5) {
        $signals += "HIGH_UNCOMMITTED($uncommitted)"
    }

    # 5b. Long session
    if ($duration -gt 3600) {
        $signals += "LONG_SESSION($($duration)s)"
    }

    # 5c. Tool failures
    $toolFailures = 0
    if ($session.PSObject.Properties.Name -contains "toolFailures") {
        $toolFailures = [int]$session.toolFailures
    }
    if ($toolFailures -ge 2) {
        $signals += "TOOL_FAILURES($toolFailures)"
    }

    # 5d. User corrections
    $corrections = 0
    if ($session.PSObject.Properties.Name -contains "corrections") {
        $corrections = [int]$session.corrections
    }
    if ($corrections -ge 1) {
        $signals += "USER_CORRECTIONS($corrections)"
    }

    # -- 6. Cross-session pattern detection --
    $completed = Get-ChildItem "$base\sessions" -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | ForEach-Object {
        Get-Content $_.FullName -Raw -Encoding utf8 | ConvertFrom-Json
    } | Where-Object { $_.status -eq "completed" }

    # 6a. Persistent uncommitted
    $multiUncommit = ($completed | Where-Object { $_.uncommittedChanges -and [int]$_.uncommittedChanges -gt 0 }).Count
    if ($multiUncommit -ge 3) {
        $signals += "PERSISTENT_UNCOMMITTED($multiUncommit)"
    }

    # 6b. Recurring tool failures
    $multiFail = ($completed | Where-Object {
        $t = 0
        if ($_.PSObject.Properties.Name -contains "toolFailures") { $t = [int]$_.toolFailures }
        $t -ge 2
    }).Count
    if ($multiFail -ge 2) {
        $signals += "RECURRING_TOOL_FAILURES($multiFail)"
    }

    # 6c. Frequent corrections
    $multiCorrect = ($completed | Where-Object {
        $c = 0
        if ($_.PSObject.Properties.Name -contains "corrections") { $c = [int]$_.corrections }
        $c -ge 1
    }).Count
    if ($multiCorrect -ge 2) {
        $signals += "FREQUENT_CORRECTIONS($multiCorrect)"
    }

    # -- 7. Experience topic consolidation check --
    foreach ($key in $expTopics.Keys) {
        if ($expTopics[$key] -ge 3) {
            $signals += "EXPERIENCE_CONSOLIDATION($key`:$($expTopics[$key]))"
            break
        }
    }

    # -- 8. Update session record --
    $session.endTime = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    $session.durationSeconds = $duration
    $session.status = "completed"
    $session.filesChanged = @($filesChanged)
    $session.uncommittedChanges = $uncommitted
    $session.toolFailures = $toolFailures
    $session.corrections = $corrections
    $session.signals = $signals
    $session.experienceCount = $experienceAdded

    if (-not ($session.PSObject.Properties.Name -contains "agentUsed")) {
        $session | Add-Member -NotePropertyName "agentUsed" -NotePropertyValue @() -Force
    }
    if (-not ($session.PSObject.Properties.Name -contains "notes")) {
        $session | Add-Member -NotePropertyName "notes" -NotePropertyValue "" -Force
    }

    $session | ConvertTo-Json -Depth 4 | Set-Content $latest.FullName -Encoding utf8

    # -- 9. Update aggregate statistics --
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
            flags = $signals
        }
        $summary | ConvertTo-Json -Depth 4 | Set-Content "$base\signals\summary.json" -Encoding utf8
    }

    # -- 10. Write flags.txt --
    if ($signals.Count -gt 0) {
        $signals -join "`n" | Set-Content "$base\flags.txt" -Encoding utf8
        [Console]::Error.WriteLine("[Evo] Signals: $($signals -join ', ')")
    }
    else {
        "CLEAN" | Set-Content "$base\flags.txt" -Encoding utf8
    }

    # -- 11. Output summary --
    [Console]::Error.WriteLine("[Evo] Uncommitted: $uncommitted | Failures: $toolFailures | Corrections: $corrections | Exp: $experienceAdded")

    # -- 12. Write session handoff --
    $handoffFile = "$base\handoff.md"
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $changedList = ""
    if ($filesChanged.Count -gt 0) {
        $changedList = ($filesChanged | ForEach-Object { "- $_" }) -join "`n"
    }
    else {
        $changedList = "(no files changed)"
    }
    $signalList = ""
    if ($signals.Count -gt 0) {
        $signalList = ($signals | ForEach-Object { "- $_" }) -join "`n"
    }
    else {
        $signalList = "(clean)"
    }
    $handoff = @"
# Session Handoff
**Last session**: $($session.sessionId)
**Ended**: $now
**Duration**: $($duration)s
**Uncommitted files**: $uncommitted

## Files Changed
$changedList

## Signals
$signalList

## Tips
- Check flags.txt for pending signals
- Run self-check if signals detected
- Uncommitted changes: $uncommitted files waiting for commit
"@
    $handoff | Set-Content $handoffFile -Encoding utf8
    [Console]::Error.WriteLine("[Evo] Handoff written: $handoffFile")
}
catch {
    $m = "on-stop: $_"
    Add-Content "$base\errors.log" -Value "$(Get-Date -uformat '%Y-%m-%d %H:%M:%S'): $m"
    [Console]::Error.WriteLine("[Evo] Hook error logged")
}
