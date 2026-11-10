[CmdletBinding()]
param(
    [int]$Port = 3000,
    [string]$HostName = "akimoto.tail90ac4a.ts.net",
    [int]$ServePort = 443,
    [switch]$RegisterStartup
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Tailscale = "C:\Program Files\Tailscale\tailscale.exe"
if (-not (Test-Path -LiteralPath $Tailscale)) { $Tailscale = "tailscale" }

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if (($listener.LocalAddress -eq "0.0.0.0" -or $listener.LocalAddress -eq "::") -and $proc.CommandLine -match "server\.js") {
        Write-Host "Restarting opencode server on loopback (was $($listener.LocalAddress):$Port)..."
        Stop-Process -Id $listener.OwningProcess -Force
        Start-Sleep -Milliseconds 800
        $listener = $null
    }
}

if (-not $listener) {
    Write-Host "Starting opencode server on 127.0.0.1:$Port ..."
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $Root -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 300
        $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    } while (-not $listener -and (Get-Date) -lt $deadline)
    if (-not $listener) { throw "opencode server did not start on port $Port" }
}

$out = Join-Path $env:TEMP "tailscale-serve-out.txt"
$err = Join-Path $env:TEMP "tailscale-serve-err.txt"
Remove-Item -LiteralPath $out, $err -ErrorAction SilentlyContinue
$p = Start-Process -FilePath $Tailscale -ArgumentList @("serve", "--bg", "--yes", "--https=$ServePort", "http://127.0.0.1:$Port") -RedirectStandardOutput $out -RedirectStandardError $err -PassThru -WindowStyle Hidden
if (-not $p.WaitForExit(30000)) {
    try { $p.Kill() } catch { }
    Get-Content -LiteralPath $out, $err -ErrorAction SilentlyContinue
    throw "Tailscale Serve is not enabled for this tailnet. Enable it first: https://login.tailscale.com/f/serve"
}
Get-Content -LiteralPath $out, $err -ErrorAction SilentlyContinue
if ($p.ExitCode -ne 0) { throw "tailscale serve failed with exit code $($p.ExitCode)" }

& $Tailscale serve status
Write-Host ""
Write-Host "opencode mobile server URL: https://$HostName"

if ($RegisterStartup) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    Register-ScheduledTask -TaskName "opencode-tailscale-serve" -Action $action -Trigger $trigger -Description "Start opencode server and Tailscale Serve at logon" -Force | Out-Null
    Write-Host "Startup task 'opencode-tailscale-serve' registered."
}
