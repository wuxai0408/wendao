param()
$base = "C:\Users\liyou\Downloads\wx\wendao\.claude\evolution"

try {
    # -- 1. Read/update engine state --
    $state = Get-Content "$base\state.json" -Raw -Encoding utf8 | ConvertFrom-Json

    $today = Get-Date -Format "yyyy-MM-dd"
    $existing = 0
    if (Test-Path "$base\sessions") {
        $existing = @(Get-ChildItem "$base\sessions" -Filter "$today-*.json" -ErrorAction SilentlyContinue).Count
    }
    $sessionId = "$today-" + "{0:D3}" -f ($existing + 1)

    # -- 2. Create enhanced session record --
    $session = [PSCustomObject]@{
        sessionId       = $sessionId
        startTime       = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
        endTime         = $null
        durationSeconds = $null
        status          = "active"
        filesChanged    = @()
        uncommittedChanges = $null
        flag            = "clean"
        agentUsed       = @()
        toolFailures    = 0
        corrections     = 0
        signals         = @()
        experienceCount = 0
        notes           = ""
    }
    $session | ConvertTo-Json -Depth 4 | Set-Content "$base\sessions\$sessionId.json" -Encoding utf8

    # -- 3. Update state --
    $state.totalSessions = [int]$state.totalSessions + 1
    $state.lastSessionStart = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    $state | ConvertTo-Json -Depth 4 | Set-Content "$base\state.json" -Encoding utf8

    # -- 4. Read flags — only print if real signals exist --
    $flagsRaw = Get-Content "$base\flags.txt" -Raw -Encoding utf8 -ErrorAction SilentlyContinue
    $flags = @()
    if ($flagsRaw) {
        $flags = @($flagsRaw.Trim() -split "\r?\n" | Where-Object { $_ -and $_ -ne "CLEAN" })
    }

    if ($flags.Count -gt 0) {
        [Console]::Error.WriteLine("[Evo] ====== $($flags.Count) SIGNAL(S) DETECTED ======")
        foreach ($f in $flags) {
            [Console]::Error.WriteLine("[Evo]   -> $f")
        }
        [Console]::Error.WriteLine("[Evo] =======================================")
        [Console]::Error.WriteLine("[Evo] Run self-check to process these signals.")
    }

    # -- 5. Read session handoff — only print if has content --
    $handoffFile = "$base\handoff.md"
    if (Test-Path $handoffFile) {
        $handoff = Get-Content $handoffFile -Raw -Encoding utf8
        # Only print if handoff has actual content (more than just a placeholder)
        if ($handoff.Trim() -and $handoff -notmatch '^\s*\(clean' -and $handoff.Length -gt 50) {
            [Console]::Error.WriteLine("")
            [Console]::Error.WriteLine("[Evo] === LAST SESSION HANDOFF ===")
            $handoff -split "\r?\n" | ForEach-Object { [Console]::Error.WriteLine("[Evo] $_") }
            [Console]::Error.WriteLine("[Evo] =============================")
        }
    }
}
catch {
    $m = "on-start: $_"
    Add-Content "$base\errors.log" -Value "$(Get-Date -uformat '%Y-%m-%d %H:%M:%S'): $m"
    [Console]::Error.WriteLine("[Evo] Hook error logged")
}
