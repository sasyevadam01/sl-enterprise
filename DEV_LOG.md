# 📝 DEV LOG - SL PROJECT V2 (Enterprise)

**Start Date**: 30/12/2024
**Goal**: Creare un gestionale aziendale fluido, veloce e scalabile.
**Stack**: React.js (Frontend) + FastAPI (Backend) + MariaDB.

---

## 📅 SESSIONE 1: Inizializzazione
**Stato**: 🟡 In Corso

### 🎯 Obiettivi
1. Definire l'architettura del progetto.
2. Creare la struttura delle cartelle (`backend` vs `frontend`).
3. Preparare il terreno per lo sviluppo.

### 📝 Note Tecniche & Decisioni
- **Design Pattern**: Separazione netta (Decoupled Architecture). Il Frontend parla col Backend solo via API. Questo garantisce la massima velocità percepita dall'utente.
- **Database**: Predisposizione per MariaDB.
- **Style**: Design "Premium Professional" (no emoji eccessive, UI pulita).

### 🪜 Passi Eseguiti
- [x] Creazione cartella progetto.
- [x] Creazione `DEV_LOG.md` (Questo file).
- [x] Setup Backend (Python/FastAPI).
- [x] Setup Frontend (React/Vite).

**Esito Sessione 1**: Setup completato. Backend su 8000, Frontend su 5173. Tailwind configurato.

---

## 🔐 SESSIONE 2: Core Security & Models
**Stato**: 🟡 In Corso

### 🎯 Obiettivi
1.  Implementare Autenticazione JWT.
2.  Definire modelli DB (User/Department).
3.  Proteggere le API.

### 📝 Note
- Useremo `python-jose` per i token.
- I ruoli user saranno stringhe Enum o semplici stringhe validate.


---
