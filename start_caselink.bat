@echo off
title CASELINK - AICTE Regulation Bureau Complaint Dashboard
echo =======================================================================
echo   CASELINK - AICTE Single-Window Complaint Monitoring Dashboard
echo   Problem Statement SIH 2026 - PS 26264
echo =======================================================================
echo.

set PYTHON_CMD=backend\.venv\Scripts\python.exe

if not exist %PYTHON_CMD% (
    echo [ERROR] Virtual environment python not found at %PYTHON_CMD%!
    pause
    exit /b 1
)

echo Starting CASELINK stack (FastAPI Backend + Vite Frontend)...
%PYTHON_CMD% run.py
pause
