@echo off
rem ---------------------------------------------------------------------------
rem Launch GitGUI with the stock Electron binary.
rem
rem Why not GitGUI.exe from dist/?
rem   electron-builder rewrites the exe resources (icon/version), which produces a
rem   brand-new file hash with zero prevalence. Windows Defender ASR rule
rem   "Block executable files from running unless they meet a prevalence, age, or
rem   trusted list criterion" (01443614-CD74-433A-B99E-2ECDC07BFC25) blocks those
rem   unsigned, zero-prevalence binaries, and the shell reports it as
rem   "Windows cannot access the specified device, path, or file".
rem   The stock electron.exe from node_modules is a widely distributed file that
rem   the reputation service already trusts, so it launches fine.
rem ---------------------------------------------------------------------------
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "ELECTRON=%ROOT%\node_modules\electron\dist\electron.exe"

if not exist "%ELECTRON%" (
  echo Electron binary not found at:
  echo   %ELECTRON%
  echo Run "pnpm install" first.
  pause
  exit /b 1
)

if not exist "%ROOT%\out\main\index.js" (
  echo Build output not found at %ROOT%\out
  echo Run "pnpm build" first.
  pause
  exit /b 1
)

rem Make sure Electron is not mistaken for plain Node.
set "ELECTRON_RUN_AS_NODE="

start "" "%ELECTRON%" "%ROOT%"
endlocal
