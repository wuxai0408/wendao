param()
$base = "C:\Users\liyou\Downloads\无敌了\青云\.claude\evolution"

try {
    $state = Get-Content "$base\state.json" -Raw -Encoding utf8 | ConvertFrom-Json

    $today = Get-Date -Format "yyyy-MM-dd"
    $existing = 0
    if (Test-Path "$base\sessions") {
        $existing = @(Get-ChildItem "$base\sessions" -Filter "$today-*.json" -ErrorAction SilentlyContinue).Count
    }
    $sessionId = "$today-" + "{0:D3}" -f ($existing + 1)

    $session = [PSCustomObject]@{
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

    $state.totalSessions = [int]$state.totalSessions + 1
    $state.lastSessionStart = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    $state | ConvertTo-Json -Depth 4 | Set-Content "$base\state.json" -Encoding utf8

    $flags = Get-Content "$base\flags.txt" -Raw -Encoding utf8 -ErrorAction SilentlyContinue
    if ($flags -and $flags.Trim() -ne "CLEAN") {
        [Console]::Error.WriteLine("[Evo] Flags: $($flags.Trim())")
    }
}
catch {
    $m = "on-start: $_"
    Add-Content "$base\errors.log" -Value "$(Get-Date -uformat '%Y-%m-%d %H:%M:%S'): $m"
    [Console]::Error.WriteLine("[Evo] Hook error logged")
}