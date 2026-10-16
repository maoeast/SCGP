param(
  [Parameter(Mandatory = $true)][string]$TextFile,
  [Parameter(Mandatory = $true)][string]$OutFile
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $synth.SelectVoice('Microsoft Huihui Desktop')
  $synth.Rate = -1
  $synth.Volume = 100
  $synth.SetOutputToWaveFile($OutFile)
  $synth.Speak([System.IO.File]::ReadAllText($TextFile, [System.Text.Encoding]::UTF8))
} finally {
  $synth.Dispose()
}
