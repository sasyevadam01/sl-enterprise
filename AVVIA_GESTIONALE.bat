@echo off
TITLE SL Enterprise Launcher
COLOR 0A
CLS

ECHO ========================================================
ECHO          AVVIO SL ENTERPRISE - GESTIONALE
ECHO ========================================================
ECHO.

:: 1. Uccidi processi vecchi per evitare conflitti
ECHO [1/3] Pulizia processi precedenti...
taskkill /F /IM uvicorn.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
ECHO Fatto.

:: 2. Avvia Backend
ECHO.
ECHO [2/3] Avvio Backend Server (API)...
cd backend
start "SL Backend Console" cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
cd ..

:: 3. Avvia Frontend
ECHO.
ECHO [3/3] Avvio Frontend (Interfaccia)...
cd frontend
start "SL Frontend Console" cmd /k "npm run dev"
cd ..

ECHO.
ECHO ========================================================
ECHO    TUTTO AVVIATO! 
ECHO    Il browser dovrebbe aprirsi a breve...
ECHO    Se non si apre, vai su: http://localhost:5173
ECHO ========================================================
ECHO.
PAUSE
