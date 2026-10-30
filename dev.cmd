@echo off
rem ---------------------------------------------------------------------------
rem Start the app in development mode (electron-vite dev + HMR).
rem Double-click this file, or run it from anywhere.
rem
rem ELECTRON_RUN_AS_NODE is cleared here as well as in scripts/dev.js: if the
rem variable is inherited, Electron runs as plain Node, `app` is undefined and
rem the main process dies with "reading 'requestSingleInstanceLock'".
rem ---------------------------------------------------------------------------
setlocal

set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0"

if not exist "node_modules" (
  echo Dependencies are missing. Run "pnpm install" first.
  pause
  exit /b 1
)

rem The app holds a single-instance lock: starting a second copy only spawns an
rem extra Vite server and then bounces back to the existing window.
rem findstr (not find) so a Git-for-Windows PATH cannot shadow it.
tasklist /FI "IMAGENAME eq electron.exe" /NH 2>nul | findstr /I "electron.exe" >nul
if not errorlevel 1 (
  echo The dev app is already running - switch to its window instead.
  echo To force a restart, close that window first or run:
  echo   Get-Process electron ^| Stop-Process -Force
  pause
  exit /b 0
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm not on PATH, falling back to corepack...
  corepack pnpm dev
) else (
  pnpm dev
)

echo.
echo === dev exited ===
pause
endlocal
