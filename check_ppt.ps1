try {
    $ppt = New-Object -ComObject PowerPoint.Application
    Write-Host "PPT_OK"
    $ppt.Quit()
} catch {
    Write-Host "PPT_NO"
}
