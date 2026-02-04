@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PYTHONPATH=%SCRIPT_DIR%apps\cli;%PYTHONPATH%"

REM Check for .venv in repo root
if exist "%SCRIPT_DIR%.venv\Scripts\python.exe" (
    "%SCRIPT_DIR%.venv\Scripts\python.exe" -m petehome_cli %*
) else (
    python -m petehome_cli %*
)
