$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$desktopDirectory = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopDirectory "ALALA'S CHILDREN.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
if ((Test-Path -LiteralPath $shortcutPath) -and ($shortcut.Description -ne "ALALA'S CHILDREN - Fase 1 - Arena experimental")) { throw 'Ya existe otro acceso directo con este nombre. No se reemplazó.' }
$launcher = Join-Path $projectDirectory 'JUGAR.cmd'
$shortcut.TargetPath = $env:ComSpec
$shortcut.Arguments = '/d /c ""' + $launcher + '""'
$shortcut.WorkingDirectory = $projectDirectory
$shortcut.Description = "ALALA'S CHILDREN - Fase 1 - Arena experimental"
$shortcut.WindowStyle = 7
$shortcut.Save()
$savedShortcut = $shell.CreateShortcut($shortcutPath)
if (-not $savedShortcut.TargetPath) { throw 'Windows no conservó el destino del acceso directo.' }
Write-Output $shortcutPath
