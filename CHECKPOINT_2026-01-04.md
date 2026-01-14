# 🔖 CHECKPOINT - SL Enterprise V2
**Data**: 4 Gennaio 2026, ore 14:07
**Versione**: 2.3 (Roadmap Espansione)

---

## ✅ MODULI GIÀ COMPLETATI (da checkpoint precedente)

### 1. AUTENTICAZIONE & SICUREZZA ✅
- [x] Login con JWT Token
- [x] Ruoli: super_admin, hr_manager, coordinator, record_user
- [x] Protezione API con middleware
- [x] Audit Log per tracciabilità azioni

### 2. HR SUITE - ANAGRAFICA ✅
- [x] CRUD Dipendenti completo
- [x] Bonifica Dati (Database_Aggiornato.xlsx)
- [x] Collegamento Dipendente ↔ Manager/Reparto/Banchina

### 3. HR SUITE - ORGANIGRAMMA ✅
- [x] Visualizzazione ad albero gerarchico (DA RIFARE - vedi punto 7 roadmap)

### 4. HR SUITE - GESTIONE TURNI ✅
- [x] Griglia settimanale interattiva
- [x] Turni: Mattina, Pomeriggio, Notte, Custom
- [x] Festività/Domeniche non editabili
- [x] Copia Settimana Precedente

### 5. HR SUITE - EVENTI & PUNTEGGI ✅
- [x] Sistema eventi + workflow approvativo

### 6. HR SUITE - FERIE & PERMESSI ✅
- [x] Richiesta + workflow approvativo

### 7. SCADENZE ✅
- [x] Certificazioni, visite mediche, contratti

### 8. LOGISTICA - GESTIONE RESI ✅
- [x] Workflow completo

### 9. FACTORY - MONITOR PRODUZIONE ✅
- [x] Importazione 47 macchine/ruoli
- [x] Stato Organico Real-time

### 10. INFRASTRUTTURA ✅
- [x] Backend FastAPI (porta 8000)
- [x] Frontend React/Vite (porta 5173)
- [x] Database SQLite

---

## 🚀 ROADMAP NUOVE FUNZIONALITÀ

### SPRINT 1: Quick Wins (Completato)
| # | Funzionalità | Effort | Status |
|---|--------------|--------|--------|
| 7 | **Organigramma Piramide** (Nuovo design) | 45 min | ✅ |
| 5 | **Bacheca Annunci** | 1 ora | ✅ |

### SPRINT 2: Core HR (In Corso)
| # | Funzionalità | Effort | Status |
|---|--------------|--------|--------|
| 12 | **Monte Ore Permessi** (250h/anno, scalano auto) | 1.5 ore | ✅ |
| 3 | **Calcolatore Costo Turno** (18€/h) | 45 min | ⏳ |

### SPRINT 3: Factory Avanzato
| # | Funzionalità | Effort |
|---|--------------|--------|
| 1 | **Monitor per Reparto** (non per banchina) | 1.5 ore |
| 8 | **Calcolatore Carico Lavoro** | 2 ore |
| - | **Gestione Fermi Macchina** | 2 ore |
| - | **Configuratore KPI** | 1 ora |

### SPRINT 4: Logistica Avanzata
| # | Funzionalità | Effort |
|---|--------------|--------|
| 9 | **Logistica Integrata Maps** | 5+ ore |
| 9.5 | **Patente CQC** come attestato | 15 min |

---

## 🏢 STRUTTURA AZIENDALE UFFICIALE

```
              👑 TITOLARI
    Gianluca | Valentino | Alessandro Siervo
                    │
        ┌───────────┼───────────┐
        │           │           │
   👔 Operation  👔 Dir.Amm.  🛡️ RSPP
     Manager    De Luca G.   Pignatiello C.
       (Tu)                  
        │
   ┌────┴────┐
   │         │
📦 Resp.Log  🏭 Produzione
 Laezza M.   (Coordinatori)
   │              │
👥 Ufficio    👷 Operai
              (per reparto)
```

---

## 📊 PARAMETRI OPERATIVI

| Parametro | Valore |
|-----------|--------|
| Costo orario operaio | 18€/h |
| Turno standard | 7h 45min |
| Turno centrale | 8h |
| Monte ore permessi annuo | 250h |
| Benchmark Pantografo | 90 righe/turno |

---

## 📁 FILE CHIAVE

- `Database_Aggiornato.xlsx` - 154 dipendenti (sorgente verità)
- `sl_enterprise.db` - Database SQLite attivo
- `MAPPA_BANCHINE_SIERVOPLAST.md` - Layout factory completo

---

## 🛠️ STACK TECNICO

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + Vite + TailwindCSS
- **Auth**: JWT
- **Ports**: Backend 8000, Frontend 5173
