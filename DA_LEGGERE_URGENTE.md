# 🚨 DA LEGGERE URGENTE - MANUALE OPERATIVO SL ENTERPRISE

Questo documento contiene tutte le informazioni essenziali per gestire, aggiornare e riparare SL Enterprise. È destinato al prossimo Agente Antigravity e all'utente amministratore.

## 1. 📂 Repository & Codice Sorgente
*   **Repository Ufficiale GitHub:** `https://github.com/sasyevadam01/sl-enterprise.git`
*   **Branch Principale:** `master`
*   **Percorso Locale Utente:** `c:\Users\sasys\OneDrive\Desktop\SL Project`

### Flusso di Lavoro Standard (Git)
Per salvare modifiche fatte in locale:
1.  `git add .` (Aggiunge tutti i file modificati)
2.  `git commit -m "Descrizione modifica"` (Salva in locale)
3.  `git push origin master` (Invia al cloud GitHub)

---

## 2. 🖥️ Gestione Server (Putty)
Il server di produzione si trova all'indirizzo **93.186.255.104**.
Si accede tramite **Putty** con utente `root`.

### Comandi Fondamentali
Una volta loggati nel server, eseguire sempre questi comandi nella cartella del progetto (`/root` o `~/sl-enterprise`):

#### A. Aggiornare il Codice (Deploy)
Dopo aver fatto `git push` dal PC locale, sul server eseguire:
```bash
git pull origin master
```

#### B. Riavviare i Servizi
Se si tocca il **Backend** (Python, API, Database):
```bash
docker compose up -d --build backend
# Oppure (più veloce se non ci sono nuove librerie):
docker compose restart backend
```

Se si tocca il **Frontend** (React, JS, CSS):
```bash
docker compose up -d --build frontend
```
*(Nota: Il frontend richiede sempre il --build per vedere le modifiche).*

---

## 3. 🛠️ Risoluzione Problemi Emersi (Storico Recente)

### Problema: Sidebar Vuota / Permessi Mancanti
*   **Causa:** L'utente aveva un ruolo "stringa" (es. 'coordinator') ma non l'ID del ruolo nel database, oppure il DB mancava della colonna `role_id`.
*   **Soluzione Applicata:** 
    1.  Patchato lo schema DB (`fix_schema.py`).
    2.  Creato script per assegnare ID (`assign_role_ids.py`).
    3.  Allineato permessi hardcoded in `models/core.py`.
*   **Se succede di nuovo:** Eseguire lo script di ri-assegnazione:
    ```bash
    docker cp backend/assign_role_ids.py sl-backend:/app/assign_role_ids.py
    docker exec -it sl-backend python assign_role_ids.py
    ```

### Problema: Privacy Task (Coordinatori vedono tutto)
*   **Soluzione:** Modificato `backend/routers/tasks.py`. Rimossa la stringa "coordinator" dalla lista dei "Super Utenti" che possono vedere tutto. Ora vedono solo i propri task.

### Problema: Errore 405 su Modifica Utenti
*   **Causa:** Il frontend chiamava `/users/123/` (con slash finale) ma il backend voleva `/users/123`.
*   **Soluzione:** Rimossi trailing slashes in `frontend/src/api/client.js`.

---

## 4. 🚑 Comandi Docker Utili (Pronto Intervento)

*   **Vedere i log (errori) in tempo reale:**
    ```bash
    docker compose logs -f backend
    # oppure
    docker compose logs -f frontend
    ```
*   **Entrare nel database (MariaDB/Sqlite):**
    ```bash
    # Se SQLite (attuale setup):
    docker exec -it sl-backend sqlite3 sl_enterprise.db
    ```
*   **Eseguire script Python "al volo" dentro il container:**
    1.  Copiare lo script: `docker cp nome_script.py sl-backend:/app/nome_script.py`
    2.  Eseguire: `docker exec -it sl-backend python nome_script.py`

---

## 5. 📅 Storico Aggiornamenti

### 14/01/2025 - Fix Visibilità Task e Bonus
1.  **Task Visibility (Frontend):** 
    *   **Problema:** I task "delegati" (creati ma assegnati ad altri) erano invisibili.
    *   **Causa:** Il frontend usava il campo `created_by` (inesistente) invece di `assigned_by` e falliva il confronto ID (numero vs stringa).
    *   **Soluzione:** Aggiornato `TasksPage.jsx` per usare `assigned_by` e `String(id) === String(id)` per confronti robusti.
2.  **Bonus Management (Employee Dropdown):**
    *   **Problema:** Dropdown dipendenti vuoto.
    *   **Soluzione:** Aggiornato `BonusManagementPanel.jsx` per usare `employeesApi.getEmployees()` (client.js) che gestisce correttamente il parsing della risposta API.

---

**Ultimo Aggiornamento:** 14/01/2025
**Stato Attuale:** Sistema Stabile. Task Board funzionante per tutti i ruoli.

