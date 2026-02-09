@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%"

rem Clear Electron run-as-node flag (set by some tooling/terminals)
set ELECTRON_RUN_AS_NODE=

rem Run Electron dev server
cd /d "%ROOT%markvix"
call npm run dev

endlocal
