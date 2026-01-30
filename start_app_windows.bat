@echo off
TITLE LabData Manager Launcher
CLS
ECHO -------------------------------------------------------
ECHO   LabData Manager - Start Script
ECHO -------------------------------------------------------
ECHO.

REM 1. Versuch: Node.js (npx serve)
where npx >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [INFO] Node.js gefunden. Starte Webserver auf Port 3000...
    ECHO [INFO] Browser wird geoeffnet...
    
    REM Browser starten (verzögert, damit Server bereit ist)
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:3000/LaborTool.html"
    
    REM Server starten
    call npx serve . -p 3000
    GOTO END
)

REM 2. Versuch: Python 3
where python >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [INFO] Python gefunden. Starte http.server auf Port 8000...
    ECHO [INFO] Browser wird geoeffnet...
    
    start "" "http://localhost:8000/LaborTool.html"
    python -m http.server 8000
    GOTO END
)

REM 3. Fallback: Datei direkt öffnen
ECHO [WARN] Weder Node.js noch Python gefunden.
ECHO [INFO] Oeffne Datei direkt im Browser (einige Funktionen koennten eingeschraenkt sein)...
start LaborTool.html

:END
PAUSE