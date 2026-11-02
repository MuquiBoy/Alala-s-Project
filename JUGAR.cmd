@echo off
setlocal
cd /d "%~dp0"
set "ALALAS_NODE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined ALALAS_NODE set "ALALAS_NODE=%%N"
if not defined ALALAS_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "ALALAS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined ALALAS_NODE (
  echo Instala Node.js 22.12 o posterior desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist "%~dp0server-dist\server.mjs" (
  echo Falta compilar el juego. Sigue los pasos de instalacion en README.md.
  pause
  exit /b 1
)
"%ALALAS_NODE%" "%~dp0server-dist\server.mjs" --open
if errorlevel 1 pause
