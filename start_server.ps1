$port = 8765
$filePath = "C:\Users\liyou\Downloads\无敌了\青云\招标文件_OA系统开发项目.docx"
$downloadDir = "C:\Users\liyou\Downloads\无敌了\青云\download"

if (-not (Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
}

$destPath = Join-Path $downloadDir "招标文件_OA系统开发项目.docx"
Copy-Item -Path $filePath -Destination $destPath -Force

# 创建简单的HTTP服务器脚本
$serverScript = @"
`$port = 8765
`$filePath = "C:\Users\liyou\Downloads\无敌了\青云\download\招标文件_OA系统开发项目.docx"
`$listener = New-Object System.Net.HttpListener
`$listener.Prefixes.Add("http://+:`$port/")
`$listener.Start()
Write-Host "服务器已启动，端口: `$port"

# 获取IP
`$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { `$_.IPAddress -like '192.*' }
if (`$ips) {
    `$ip = `$ips[0].IPAddress
    Write-Host "下载链接: http://`$ip`:`$port/"
}
Write-Host "按 Ctrl+C 停止服务器"

while (`$true) {
    `$context = `$listener.GetContext()
    `$request = `$context.Request
    `$response = `$context.Response
    
    `$response.ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    `$response.Headers.Add("Content-Disposition", "attachment; filename=招标文件_OA系统开发项目.docx")
    
    `$fileBytes = [System.IO.File]::ReadAllBytes(`$filePath)
    `$response.ContentLength64 = `$fileBytes.Length
    `$response.OutputStream.Write(`$fileBytes, 0, `$fileBytes.Length)
    `$response.Close()
    
    Write-Host "文件已下载！"
    break
}
`$listener.Stop()
"@

Set-Content -Path "C:\Users\liyou\Downloads\无敌了\青云\http_server.ps1" -Value $serverScript
Write-Host "服务器脚本已创建"
