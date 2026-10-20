@echo off
pwsh.exe -NoProfile -File "%~dp0app\launch.ps1"
if errorlevel 1 pause
