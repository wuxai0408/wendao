param()
# Hook: SessionStart — checks CLAUDE.md for broken references
$base = "C:\Users\liyou\Downloads\wx\wendao\.claude\evolution"
$repo = "C:\Users\liyou\Downloads\wx\wendao"
$claudeMd = "$repo\CLAUDE.md"

try {
    if (-not (Test-Path $claudeMd)) {
        # CLAUDE.md itself missing — critical
        $flag = "CLAUDE_MD_MISSING"
        $flags = @()
        $existing = Get-Content "$base\flags.txt" -Raw -Encoding utf8 -ErrorAction SilentlyContinue
        if ($existing -and $existing.Trim() -ne "CLEAN") {
            $flags = @($existing.Trim() -split "\r?\n" | Where-Object { $_ })
        }
        if ($flag -notin $flags) {
            $flags += $flag
            $flags -join "`n" | Set-Content "$base\flags.txt" -Encoding utf8
        }
        [Console]::Error.WriteLine("[Evo] DRIFT: CLAUDE.md missing!")
        return
    }

    $content = Get-Content $claudeMd -Raw -Encoding utf8

    # Extract all path-like references from CLAUDE.md
    $pathPattern = '[A-Za-z]:\\[^\s`"'')\]]+'
    $paths = [regex]::Matches($content, $pathPattern) | ForEach-Object { $_.Value }

    $drifts = @()
    foreach ($p in $paths) {
        # Normalize: strip trailing punctuation
        $clean = $p -replace '[.,;:!?)\\]+$', ''
        # Check if it's a file or directory reference
        if ($clean -match '\.(md|json|ps1|html|txt|js|py)$') {
            if (-not (Test-Path $clean -PathType Leaf)) {
                $drifts += "MISSING_FILE:$clean"
            }
        }
        elseif ($clean -match '\\(\.claude|agents|projects|memory|evolution)') {
            if (-not (Test-Path $clean)) {
                $drifts += "MISSING_DIR:$clean"
            }
        }
    }

    if ($drifts.Count -gt 0) {
        $flags = @()
        $existing = Get-Content "$base\flags.txt" -Raw -Encoding utf8 -ErrorAction SilentlyContinue
        if ($existing -and $existing.Trim() -ne "CLEAN") {
            $flags = @($existing.Trim() -split "\r?\n" | Where-Object { $_ })
        }

        $flagEntry = "CLAUDE_MD_DRIFT($($drifts.Count))"
        if ($flagEntry -notin $flags) {
            $flags += $flagEntry
        }
        $flags -join "`n" | Set-Content "$base\flags.txt" -Encoding utf8

        [Console]::Error.WriteLine("[Evo] DRIFT: $($drifts.Count) broken references in CLAUDE.md")
        foreach ($d in $drifts) {
            [Console]::Error.WriteLine("[Evo]   -> $d")
        }
    }
}
catch {
    # Silent — drift check should not block session start
}
