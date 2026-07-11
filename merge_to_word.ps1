$SourcePath = "C:\Users\liyou\Downloads\无敌了\青云"
$OutputFile = "合并文档_$((Get-Date).ToString('yyyyMMdd_HHmmss')).docx"

$files = Get-ChildItem -Path $SourcePath -Include *.docx, *.pptx, *.ppt, *.xlsx, *.xls -Recurse -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -ne $OutputFile -and $_.Name -ne "merge_to_word.ps1" -and $_.Name -ne "合并文档*" }

if ($files.Count -eq 0) {
    Write-Host "没有找到任何 Office 文件" -ForegroundColor Red
    exit
}

Write-Host "找到 $($files.Count) 个文件" -ForegroundColor Green

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = $false
$doc = $word.Documents.Add()
$selection = $word.Selection

$ok = 0
$fail = 0

foreach ($file in $files) {
    Write-Host "处理: $($file.Name)..." -ForegroundColor Yellow
    $ext = $file.Extension.ToLower()
    
    try {
        $selection.Style = "Heading 1"
        $selection.TypeText("===== $($file.BaseName) =====")
        $selection.TypeParagraph()
        $selection.Style = "Normal"
        
        if ($ext -eq ".docx") {
            $tdoc = $word.Documents.Open($file.FullName, $false, $true, $false)
            $tdoc.Content.Copy()
            $tdoc.Close($false)
            $selection.Paste()
            $selection.TypeParagraph()
            $selection.TypeParagraph()
            $ok++
            Write-Host "  [OK] Word" -ForegroundColor Green
        }
        elseif ($ext -eq ".pptx" -or $ext -eq ".ppt") {
            try {
                $ppt = New-Object -ComObject PowerPoint.Application
                $ppt.Visible = $false
                $pres = $ppt.Presentations.Open($file.FullName, $true, $false, $false)
                foreach ($slide in $pres.Slides) {
                    $selection.Style = "Heading 2"
                    $selection.TypeText("幻灯片 $($slide.SlideNumber)")
                    $selection.TypeParagraph()
                    $selection.Style = "Normal"
                    foreach ($shape in $slide.Shapes) {
                        if ($shape.HasTextFrame) {
                            $txt = $shape.TextFrame.TextRange.Text
                            if ($txt.Trim().Length -gt 0) {
                                $selection.TypeText($txt)
                                $selection.TypeParagraph()
                            }
                        }
                    }
                    $selection.TypeParagraph()
                }
                $pres.Close()
                $ppt.Quit()
                [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
                $ok++
                Write-Host "  [OK] PPT" -ForegroundColor Green
            } catch {
                $selection.TypeText("[PPT 内容提取失败，请手动查看原文件]")
                $selection.TypeParagraph()
                $selection.TypeParagraph()
                $fail++
                Write-Host "  [FAIL] PPT错误: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        elseif ($ext -eq ".xlsx" -or $ext -eq ".xls") {
            try {
                $excel = New-Object -ComObject Excel.Application
                $excel.Visible = $false
                $excel.DisplayAlerts = $false
                $wb = $excel.Workbooks.Open($file.FullName)
                foreach ($ws in $wb.Sheets) {
                    $ur = $ws.UsedRange
                    if ($ur -ne $null) {
                        $rc = $ur.Rows.Count
                        $cc = $ur.Columns.Count
                        $selection.Style = "Heading 2"
                        $selection.TypeText("工作表: $($ws.Name) ($rc 行 x $cc 列)")
                        $selection.TypeParagraph()
                        $selection.Style = "Normal"
                        # 写入为纯文本
                        for ($i = 1; $i -le [Math]::Min($rc, 200); $i++) {
                            $rowText = ""
                            for ($j = 1; $j -le [Math]::Min($cc, 50); $j++) {
                                try { $v = $ur.Cells.Item($i, $j).Text } catch { $v = "" }
                                if ($v -ne "") { $rowText += $v + "`t" }
                            }
                            if ($rowText -ne "") {
                                $selection.TypeText($rowText)
                                $selection.TypeParagraph()
                            }
                        }
                        $selection.TypeParagraph()
                    }
                }
                $wb.Close($false)
                $excel.Quit()
                [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
                $ok++
                Write-Host "  [OK] Excel" -ForegroundColor Green
            } catch {
                $selection.TypeText("[Excel 内容提取失败，请手动查看原文件]")
                $selection.TypeParagraph()
                $selection.TypeParagraph()
                $fail++
                Write-Host "  [FAIL] Excel错误: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } catch {
        $fail++
        Write-Host "  [FAIL] 错误: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    Start-Sleep -Milliseconds 200
}

$outputPath = Join-Path $SourcePath $OutputFile
$doc.SaveAs2($outputPath, 16)
$doc.Close()
$word.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null

Write-Host "`n========== 完成 ==========" -ForegroundColor Green
Write-Host "成功: $ok | 失败: $fail" -ForegroundColor $(if ($fail -gt 0) {"Yellow"} else {"Green"})
Write-Host "输出: $outputPath" -ForegroundColor Cyan
