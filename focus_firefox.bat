@echo off
:: Wait 1 second
timeout /t 1 /nobreak >nul

:: Use a more robust PowerShell method to force the window to the front
powershell -NoProfile -Command ^
    "$wshell = New-Object -ComObject WScript.Shell;" ^
    "$proc = Get-Process firefox -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1;" ^
    "if ($proc) {" ^
    "    $wshell.AppActivate($proc.Id);" ^
    "    $wshell.SendKeys('%%{TAB}');" ^
    "    Write-Host 'Attempted to focus Firefox ID:' $proc.Id;" ^
    "} else {" ^
    "    Write-Host 'Firefox process not found.';" ^
    "}"
