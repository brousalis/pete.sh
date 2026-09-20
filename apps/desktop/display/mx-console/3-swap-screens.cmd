@echo off
rem Toggle Acer-only: disable all other Windows monitors, press again to restore
"C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "c:\dev\petehome\apps\desktop\display\toggle-acer-only.ps1"
