<#
.SYNOPSIS
  Build and serve the quiz app on the LAN so a phone on the same Wi-Fi can open it.

.USAGE
  powershell -ExecutionPolicy Bypass -File scripts/run-local.ps1
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

if (-not (Test-Path "node_modules")) { npm install --no-fund --no-audit }
npm run build

Write-Output ""
Write-Output "Starting preview server (Ctrl+C to stop)..."
Write-Output "Open one of these on your phone (same Wi-Fi):"
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
  ForEach-Object { Write-Output ("  http://{0}:4173/" -f $_.IPAddress) }
Write-Output ""
npm run preview
