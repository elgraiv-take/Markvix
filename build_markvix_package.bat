@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%"

rem Patch version as yyMMDD (locale-independent)
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyMMdd"') do set PATCH=%%i

rem Keep major.minor from package.json, replace patch with the date
for /f %%i in ('powershell -NoProfile -Command "(Get-Content -Raw '%ROOT%markvix\package.json' | ConvertFrom-Json).version"') do set BASE_VERSION=%%i
for /f "tokens=1,2 delims=." %%a in ("%BASE_VERSION%") do set PKG_VERSION=%%a.%%b.%PATCH%

echo Building package version %PKG_VERSION%

if not exist "%ROOT%artifact" mkdir "%ROOT%artifact"

rem Clear Electron run-as-node flag (set by some tooling/terminals)
set ELECTRON_RUN_AS_NODE=

cd /d "%ROOT%markvix"
call npm run build:win -- --config.directories.output=../artifact --config.extraMetadata.version=%PKG_VERSION%

endlocal
