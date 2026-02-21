# 📖 PROGETTO.md - La Bibbia di SL Enterprise

**Ultimo Aggiornamento:** 21 Febbraio 2026
**Stato Progetto:** v2.0 (Produzione Attiva)

---

## 🎯 Visione del Progetto
SL Enterprise è il sistema MES/ERP integrato per Siervoplast, progettato per gestire in tempo reale la produzione, la logistica, le risorse umane e la flotta aziendale. La filosofia del progetto è mantenere un sistema sicuro, professionale e centralizzato ("Libro Contabile").

---

## 🚀 Stato Corrente & Aggiornamenti Recenti

### Ultimo Pull (21/02/2026)
Abbiamo sincronizzato il codice con le ultime modifiche remote e applicato nuove features:
- **Fleet Management (Ricarica)**: Implementato Fast Pickup, Takeover forzato (Passaggio di Consegne) con penalità `forgot_return` e calcolo dinamico della ricarica proporzionata alla batteria rimanente.
- **Logistica**: Ottimizzazione del pool di produzione e inserimento dati.
- **Infrastruttura**: Pulizia e miglioramento degli script di avvio.

---

## 🛠️ Stack Tecnologico

- **Frontend**: React 18 + Vite (Design System: Cyberpunk Premium / Light Enterprise v5.0)
- **Backend**: FastAPI (Python 3.11)
- **Database**: SQLite (sl_enterprise.db) - *Essenziale per la Bibbia: non toccare senza autorizzazione.*
- **Container**: Docker + Docker Compose
- **Server**: VPS Linux (Aruba)
- **AI**: Gemini 1.5/Gemini 2.0 (Antigravity Integration)

---

## 🛡️ Protocolli di Manutenzione

### 1. Backup & Sicurezza
- **DATABASE**: Il file `backend/sl_enterprise.db` è il cuore del sistema. Va backuppato prima di ogni operazione di deploy.
- **UPLOADS**: La cartella `uploads/` contiene i documenti digitali (PDF/Foto).

### 2. Aggiornamento Strumenti
- **Antigravity**: Per aggiornare l'estensione, apri VS Code -> Extensions -> Cerca "Antigravity" -> Update. Essenziale per il supporto a Gemini 3.1 Pro e nuove funzionalità AI.

### 3. Deploy Online
1. `git push origin main` dal locale.
2. `git pull origin main` sul server (via Putty).
3. `docker compose up -d --build` per applicare.

---

## 📋 Note per gli Sviluppatori (IA e Umani)
- Seguire sempre i principi di **Clean Code**.
- Aggiornare questo file ad ogni fine sessione per mantenere la "Verità Numerica".
- Rispettare rigorosamente il sistema tabellare e di sicurezza.

---
*Creato e mantenuto da Antigravity per Siervoplast*
