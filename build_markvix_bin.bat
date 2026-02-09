@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%"

rem Ensure output directory exists
if not exist "%ROOT%.bin" mkdir "%ROOT%.bin"

rem Clear Electron run-as-node flag (set by some tooling/terminals)
set ELECTRON_RUN_AS_NODE=

rem Build Windows artifacts into .bin
cd /d "%ROOT%markvix"
call npm run build:win -- --config.directories.output=../.bin

endlocal
