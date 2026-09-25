<#
.SYNOPSIS
  Convert .wmf/.emf equation images to .png (browsers cannot display metafiles)
  and update the image manifest's savedAs paths.

.USAGE
  powershell -ExecutionPolicy Bypass -File scripts/convert-metafiles.ps1 `
    -Dir public\images\yourbank
#>
param([Parameter(Mandatory = $true)][string]$Dir)

Add-Type -AssemblyName System.Drawing
$dirPath = (Resolve-Path -LiteralPath $Dir).Path
$manifestPath = Join-Path $dirPath "manifest.json"
$manifest = if (Test-Path $manifestPath) { Get-Content $manifestPath -Raw | ConvertFrom-Json } else { @() }

foreach ($m in $manifest) {
  if (-not $m.savedAs) { continue }
  $ext = [System.IO.Path]::GetExtension($m.savedAs).ToLower()
  if ($ext -ne ".wmf" -and $ext -ne ".emf") { continue }
  $src = $m.savedAs
  if (-not [System.IO.Path]::IsPathRooted($src)) { $src = Join-Path $dirPath ([System.IO.Path]::GetFileName($src)) }
  if (-not (Test-Path -LiteralPath $src)) { continue }
  $png = [System.IO.Path]::ChangeExtension($src, ".png")
  $img = [System.Drawing.Image]::FromFile($src)
  $w = [Math]::Max(1, [int]$img.Width); $h = [Math]::Max(1, [int]$img.Height)
  $scale = 3
  $bmp = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $w * $scale, $h * $scale)
  $g.Dispose()
  $bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $img.Dispose()
  $m.savedAs = $png
  Write-Output ("converted: $src -> $png")
}
$json = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($manifestPath, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "manifest updated: $manifestPath"
