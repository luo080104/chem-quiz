<#
.SYNOPSIS
  Extract plain text from a Word .doc/.docx using Microsoft Word COM automation.
  Inline images are emitted as U+0001 placeholders (the parser flags those
  options as needing the original picture).

.USAGE
  powershell -ExecutionPolicy Bypass -File scripts/extract-doc.ps1 `
    -In "data\source\Chapter1a_Atom_Questions.doc" `
    -Out "data\source\Chapter1a_Atom_Questions.txt"
#>
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out
)

$ErrorActionPreference = "Stop"
$inPath = (Resolve-Path -LiteralPath $In).Path
$outPath = [System.IO.Path]::GetFullPath($Out)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open($inPath, $false, $true)
  $text = $doc.Content.Text
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

# Normalize paragraph / line-break characters the same way the parser expects.
$normalized = $text -replace "`r`n", "`n" -replace "`r", "`n" -replace "`v", "`n"
[System.IO.File]::WriteAllText($outPath, $normalized, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Extracted -> $outPath ($($normalized.Length) chars)"
