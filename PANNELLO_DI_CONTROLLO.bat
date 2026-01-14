@echo off
TITLE SL Enterprise - PANNELLO DI CONTROLLO
COLOR 1F
CLS

REM -- DIAGNOSTICA INIZIALE --
echo.
echo    [ CONTROLLO SISTEMA IN CORSO... ]
echo.

REM 1. Posizionamento
cd /d "%~dp0"

REM 2. Check Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    COLOR 4F
    ECHO    [ERRORE CRITICO]  PYTHON NON E' INSTALLATO!
    ECHO    Il programma non puo' funzionare su questo computer.
    ECHO    ---------------------------------------------------
    ECHO    SOLUZIONE: Usa il VIDEO DEMO che hai sulla chiavetta.
    PAUSE
    EXIT
) ELSE (
    ECHO    [OK] Python trovato.
)

REM 3. Check Node.js
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    COLOR 4F
    ECHO    [ERRORE CRITICO]  NODE.JS NON E' INSTALLATO!
    ECHO    La parte grafica non puo' partire su questo computer.
    ECHO    ---------------------------------------------------
    ECHO    SOLUZIONE: Usa il VIDEO DEMO che hai sulla chiavetta.
    PAUSE
    EXIT
) ELSE (
    ECHO    [OK] Node.js trovato.
)

REM 4. Check Cartelle
IF EXIST "backend" (
    ECHO    [OK] Cartella backend trovata.
) ELSE (
    COLOR 4F
    ECHO    [ERRORE] Manca la cartella 'backend'!
    PAUSE
    EXIT
)

ECHO.
ECHO    [ TEMA VERDE: IL SISTEMA PUO' PARTIRE! ]
ECHO.
TIMEOUT /T 2 >nul
CLS

:MENU
COLOR 1F
ECHO.
ECHO    ################################################
ECHO    #       SL ENTERPRISE - CONTROL PANEL          #
ECHO    ################################################
ECHO.
ECHO    1. [ AVVIA ]   Avvia il Gestionale
ECHO    2. [ RIAVVIA ] Sblocca e Riavvia
ECHO    3. [ CHIUDI ]  Esci
ECHO.
SET /P M=Scegli (1, 2, 3): 

IF %M%==1 GOTO START
IF %M%==2 GOTO RESTART
IF %M%==3 GOTO STOP
GOTO MENU

:RESTART
taskkill /F /IM uvicorn.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
TIMEOUT /T 2 >nul
GOTO START

:START
CLS
ECHO.
ECHO [1/2] Avvio Backend...
cd backend
start "SL Backend" cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
cd ..

TIMEOUT /T 2 >nul

ECHO [2/2] Avvio Frontend...
cd frontend
REM start "SL Frontend" cmd /k "npm run dev"
start "SL Frontend" cmd /k "npx vite --host"
cd ..

ECHO.
ECHO [OK] I server sono partiti.
ECHO      Apertura browser tra 5 secondi...
TIMEOUT /T 5
start http://localhost:5173
GOTO MENU

:STOP
taskkill /F /IM uvicorn.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
EXIT
