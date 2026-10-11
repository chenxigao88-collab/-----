@echo off
cd /d "%~dp0"
set "ASH_NODE=node"
where node >nul 2>&1
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "ASH_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  ) else (
    echo Node.js is required. Please install Node.js and try again.
    pause
    exit /b 1
  )
)
"%ASH_NODE%" scripts\serve.mjs --open
pause
