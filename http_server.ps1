$port = 8765
$filePath = "C:\Users\liyou\Downloads\无敌了\青云\download\招标文件_OA系统开发项目.docx"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
$listener.Start()
Write-Host "服务器已启动，端口: $port"

$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.*' }
if ($ips) {
    $ip = $ips[0].IPAddress
    Write-Host "下载链接: http://$($ip):$port/"
}
Write-Host "等待下载..."

$context = $listener.GetContext()
$request = $context.Request
$response = $context.Response

$response.ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
$response.Headers.Add("Content-Disposition", "attachment; filename=招标文件_OA系统开发项目.docx")

$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$response.ContentLength64 = $fileBytes.Length
$response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
$response.Close()

Write-Host "文件已下载完成！"
$listener.Stop()
