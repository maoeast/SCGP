param([Parameter(Mandatory=$true)][string]$InputDocx, [Parameter(Mandatory=$true)][string]$OutputPdf)
$ErrorActionPreference = 'Stop'
$wordApp = $null
$wordDocument = $null
try {
  $wordApp = New-Object -ComObject Word.Application
  $wordApp.Visible = $false
  $wordApp.DisplayAlerts = 0
  $wordDocument = $wordApp.Documents.Open([IO.Path]::GetFullPath($InputDocx), $false, $true)
  $wordDocument.ExportAsFixedFormat([IO.Path]::GetFullPath($OutputPdf), 17)
  Write-Output ('Word render completed: ' + $wordDocument.ComputeStatistics(2) + ' pages')
} finally {
  if ($wordDocument) { $wordDocument.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wordDocument) }
  if ($wordApp) { $wordApp.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp) }
}
