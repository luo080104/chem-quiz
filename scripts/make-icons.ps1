<#
.SYNOPSIS
  Generate PWA icons (dark + light sets) for the quiz app.
#>
param([string]$OutDir = "public/icons")

Add-Type -AssemblyName System.Drawing
$dir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Path $dir -Force | Out-Null

function New-Icon([int]$size, [string]$path, [int]$br, [int]$bg, [int]$bb, [int]$nr, [int]$ng, [int]$nb) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb($br, $bg, $bb))
  $pen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb($nr, $ng, $nb)), ([float]($size * 0.05))
  $g.DrawRectangle($pen, [int]($size * 0.08), [int]($size * 0.08), [int]($size * 0.84), [int]($size * 0.84))
  $fontSize = [float]($size * 0.42)
  $font = New-Object System.Drawing.Font -ArgumentList "Consolas", $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb($nr, $ng, $nb))
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

# dark set: near-black bg + neon cyan
New-Icon 192 (Join-Path $dir "icon-192.png") 5 7 15 34 211 238
New-Icon 512 (Join-Path $dir "icon-512.png") 5 7 15 34 211 238
New-Icon 180 (Join-Path $dir "apple-touch-icon.png") 5 7 15 34 211 238

# light set: light bg + deep teal
New-Icon 192 (Join-Path $dir "icon-192-light.png") 238 242 247 14 116 144
New-Icon 512 (Join-Path $dir "icon-512-light.png") 238 242 247 14 116 144
New-Icon 180 (Join-Path $dir "apple-touch-icon-light.png") 238 242 247 14 116 144
