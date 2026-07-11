Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);
    
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@

$wshell = New-Object -ComObject wscript.shell
$wechatHwnd = [IntPtr]67626

# 1. 激活微信窗口
[WinAPI]::SetForegroundWindow($wechatHwnd) | Out-Null
Start-Sleep -Milliseconds 1000

# 2. 按 Ctrl+F 搜索
$wshell.SendKeys("^f")
Start-Sleep -Milliseconds 1500

# 3. 输入"文件传输助手"
$wshell.SendKeys("文件传输助手")
Start-Sleep -Milliseconds 1500

# 4. 按 Enter 打开聊天
$wshell.SendKeys("{ENTER}")
Start-Sleep -Milliseconds 1500

# 5. 按 Ctrl+O 打开文件选择
$wshell.SendKeys("^o")
Start-Sleep -Milliseconds 2000

# 6. 输入文件路径
$wshell.SendKeys("C:\Users\liyou\Downloads\无敌了\青云\招标文件_OA系统开发项目.docx")
Start-Sleep -Milliseconds 1000

# 7. 按 Enter 选文件
$wshell.SendKeys("{ENTER}")
Start-Sleep -Milliseconds 3000

# 8. 按 Enter 发送
$wshell.SendKeys("{ENTER}")
Write-Host "所有操作已执行完毕"
