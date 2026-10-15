<#
.SYNOPSIS
  Generate PWA icons (192/512/180 PNG) for the quiz app.
#>
param([string]$OutDir = "public/icons")

Add-Type -AssemblyName System.Drawing
$dir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Path $dir -Force | Out-Null

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $brand = [System.Drawing.Color]::FromArgb(5, 7, 15)
  $g.Clear($brand)
  $neon = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(34, 211, 238)), ([float]($size * 0.05))
  $g.DrawRectangle($neon, [int]($size * 0.08), [int]($size * 0.08), [int]($size * 0.84), [int]($size * 0.84))
  $fontSize = [float]($size * 0.42)
  $font = New-Object System.Drawing.Font -ArgumentList "Consolas", $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(34, 211, 238))
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF -ArgumentList 0, 0, ([float]$size), ([float]$size)
  $g.DrawString("Ch", $font, $brush, $rect, $fmt)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "icon -> $path"
}

New-Icon 192 (Join-Path $dir "icon-192.png")
New-Icon 512 (Join-Path $dir "icon-512.png")
New-Icon 180 (Join-Path $dir "apple-touch-icon.png")
