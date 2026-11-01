$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $projectPath 'work\synthetic-voice'
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$voice = New-Object -ComObject SAPI.SpVoice
$spanish = @($voice.GetVoices() | Where-Object { $_.GetDescription() -match 'Helena.*Spanish' })
if ($spanish.Count -ne 1) { throw 'Se necesita la voz sintética Microsoft Helena Desktop (español) para reproducir este banco. No se usa un micrófono humano.' }
$voice.Voice = $spanish[0]
$samples = @(
  @{id='flame'; text='Lanzallamas'; expected='flamethrower'; rate=0},
  @{id='barrage'; text='Ráfaga'; expected='barrage'; rate=0},
  @{id='armor'; text='Blindaje'; expected='armor'; rate=0},
  @{id='charge'; text='Embestida'; expected='charge'; rate=0},
  @{id='flame_variant'; text='Ataca con llamas'; expected='flamethrower'; rate=1},
  @{id='barrage_variant'; text='Dispara'; expected='barrage'; rate=1},
  @{id='armor_variant'; text='Protégete'; expected='armor'; rate=-1},
  @{id='charge_variant'; text='Carga'; expected='charge'; rate=1},
  @{id='flame_use'; text='Usa lanzallamas'; expected='flamethrower'; rate=0},
  @{id='flame_counter'; text='Contraataca usando lanzallamas'; expected='flamethrower'; rate=-1},
  @{id='flame_fire'; text='Escupe fuego'; expected='flamethrower'; rate=0},
  @{id='flame_repeat'; text='Llamas, llamas'; expected='flamethrower'; rate=1},
  @{id='flame_now'; text='Ahora usa lanzallamas'; expected='flamethrower'; rate=0},
  @{id='negative_intent'; text='No quiero usar lanzallamas'; expected='none'; rate=0},
  @{id='question_use'; text='Puedo usar lanzallamas'; expected='none'; rate=0},
  @{id='description_attack'; text='El ataque se llama lanzallamas'; expected='none'; rate=0},
  @{id='testing'; text='Estoy probando si reconoce lanzallamas'; expected='none'; rate=0},
  @{id='incomplete'; text='Ataca con'; expected='none'; rate=0},
  @{id='negative'; text='No uses lanzallamas'; expected='none'; rate=0},
  @{id='descriptive'; text='Creo que las llamas son bonitas'; expected='none'; rate=0},
  @{id='question'; text='Cómo funciona la embestida'; expected='none'; rate=0},
  @{id='ambiguous'; text='Blindaje y embestida'; expected='none'; rate=0}
)
foreach ($sample in $samples) {
  $file = Join-Path $outputPath ($sample.id + '.wav')
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Format.Type = 18
  $stream.Open($file, 3, $false)
  $voice.AudioOutputStream = $stream
  $voice.Rate = $sample.rate
  [void]$voice.Speak($sample.text, 0)
  $stream.Close()
}
$manifest = @{source='synthetic-tts-not-human'; voice=$spanish[0].GetDescription(); sampleRate=16000; samples=$samples}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $outputPath 'manifest.json') -Encoding utf8
Write-Output "$($samples.Count) muestras sintéticas WAV generadas sin reproducir audio: $outputPath"
