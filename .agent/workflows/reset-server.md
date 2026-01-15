---
description: Procedura standard per riavviare i server dopo modifiche al codice
---

# WORKFLOW: Reset e Riavvio Server

**IMPORTANTE**: Eseguire SEMPRE questa procedura dopo ogni modifica al codice backend o frontend.

// turbo-all

## Passi da seguire:

### 1. Termina processi Node (frontend)
```
taskkill /F /IM node.exe
```

### 2. Termina processi Python (backend)
```
taskkill /F /IM python.exe
```

### 3. Avvia Backend (porta 8000)
```
cd c:\Users\sasys\OneDrive\Desktop\SL Project\backend
python main.py
```
Attendere output: "Uvicorn running on http://0.0.0.0:8000"

### 4. Avvia Frontend (porta 5173)
```
cd c:\Users\sasys\OneDrive\Desktop\SL Project\frontend
npm run dev
```
Attendere output: "VITE ready" con "http://localhost:5173"

### 5. Verifica Backend funzionante
```
cd c:\Users\sasys\OneDrive\Desktop\SL Project\backend
python test_shifts_api.py
```
Deve mostrare: "Login OK" e "Dipendenti nel team: 158"

### 6. Comunicare all'utente ISTRUZIONI RESET TOKEN
Dire SEMPRE all'utente queste istruzioni:

```
Server riavviati e verificati. Per vedere i dati devi pulire il token vecchio:

1. Nel browser premi F12 (Strumenti Sviluppatore)
2. Vai su tab "Application" (o "Archiviazione")
3. Nel menu a sinistra: Local Storage → http://localhost:5173
4. Tasto destro → Clear (o seleziona tutto e Delete)
5. Chiudi F12 e ricarica la pagina (F5)
6. Fai login con: admin / admin
7. Vai su HR Suite → Dipendenti

Ora dovresti vedere tutto!
```

---

## Note importanti:
- Il token JWT diventa invalido dopo ogni riavvio del backend
- L'utente DEVE pulire localStorage e rifare login
- Senza questo passaggio, l'app sembra funzionare ma le API restituiscono 401
