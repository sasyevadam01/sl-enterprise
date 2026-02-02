# 📦 RICHIESTA MATERIALE - Specifica Completa
## Sistema di Logistica Interna SIERVOPLAST

**Versione:** 1.0  
**Data:** 21 Gennaio 2026  
**Approvazione:** In attesa

---

## 📋 INDICE
1. [Obiettivo del Sistema](#1-obiettivo-del-sistema)
2. [Attori Coinvolti](#2-attori-coinvolti)
3. [Flusso Operativo Completo](#3-flusso-operativo-completo)
4. [Sistema Punti e Penalità](#4-sistema-punti-e-penalità)
5. [Configurazione Admin](#5-configurazione-admin)
6. [Mappa Interattiva](#6-mappa-interattiva)
7. [Report e Statistiche](#7-report-e-statistiche)
8. [Specifiche Tecniche](#8-specifiche-tecniche)

---

## 1. OBIETTIVO DEL SISTEMA

### Problema Attuale
Oggi le richieste di materiale avvengono via **WhatsApp** sul gruppo "Richiesta Materiale". Questo crea:
- ❌ Richieste perse o ignorate
- ❌ Nessun tracciamento di chi prende in carico
- ❌ Impossibile sapere quanto tempo ci mette il magazziniere
- ❌ Nessuna responsabilità misurabile
- ❌ Fermi produzione per attese non monitorate

### Soluzione Proposta
Un sistema **stile Uber** dove:
- ✅ L'operatore fa richiesta con 1 click
- ✅ I magazzinieri vedono la "piscina" di richieste
- ✅ Chi prende in carico indica l'ETA
- ✅ L'operatore può sollecitare se l'attesa è troppo lunga
- ✅ Tutto è tracciato con punti e penalità
- ✅ Il coordinatore supervisiona in tempo reale

---

## 2. ATTORI COINVOLTI

### 👷 RICHIEDENTE (Operatore Banchina)
- **Chi:** Operatori di produzione nelle varie banchine
- **Ruolo sistema:** `order_user` + permesso `request_logistics`
- **Pagina:** `/logistics/request` ("Richiesta Materiali")
- **Azioni:**
  - Invia richieste materiale
  - Vede stato della propria richiesta
  - Può sollecitare urgenza
  - Conferma ricezione materiale

### 🚛 MAGAZZINIERE / TRANSPALLETTISTA
- **Chi:** Personale addetto alla movimentazione materiali
- **Ruolo sistema:** `warehouse_operator`
- **Pagina:** `/logistics/pool` ("Gestione Magazzino")
- **Azioni:**
  - Vede la "piscina" di richieste
  - Prende in carico con ETA
  - Gestisce la propria coda
  - Completa le consegne
  - Invia messaggi veloci

### 👔 COORDINATORE
- **Chi:** Responsabile reparto/turno
- **Ruolo sistema:** `coordinator` + permesso `supervise_logistics`
- **Pagina:** `/logistics/dashboard` ("Dashboard Logistica")
- **Azioni:**
  - Vede mappa con tutte le richieste
  - Riceve alert per richieste in ritardo
  - Può assegnare forzatamente
  - Vede statistiche real-time

### ⚙️ AMMINISTRATORE
- **Chi:** IT / Direzione
- **Ruolo sistema:** `admin` / `super_admin`
- **Pagina:** `/admin/logistics-config`
- **Azioni:**
  - Configura tipi di materiale
  - Modifica messaggi preimpostati
  - Imposta opzioni ETA
  - Configura punti e penalità

---

## 3. FLUSSO OPERATIVO COMPLETO

### STEP 1: Creazione Richiesta
```
OPERATORE (Banchina B14) apre l'app
  ↓
Vede griglia di pulsanti:
  📦 Cartoni Guanciali
  📦 Cartoni Materassi STV
  📦 Cartoni Piegati
  🧵 Bobine Grassi
  🧵 Bobine Premium
  🎯 Pedane Vuote
  🚛 Ritiro Pedane
  ♻️ Cambio Sfrido
  🧵 Tessuto... (campo libero)
  ➕ Altro...
  ↓
Clicca "📦 Cartoni Materassi STV"
  ↓
[Opzionale] Inserisce quantità o nota
  ↓
Clicca "INVIA RICHIESTA"
  ↓
✅ "Richiesta inviata! In attesa di un magazziniere..."
```

**Dati salvati:**
- Tipo materiale
- Banchina (automatica da profilo utente)
- Richiedente (user loggato)
- Timestamp creazione
- Status: `pending`

---

### STEP 2: Piscina Richieste (Magazzinieri)
```
MAGAZZINIERE apre la sua app
  ↓
Vede lista richieste ordinate per urgenza/tempo:
  ┌─────────────────────────────────────┐
  │ 🔴 URGENTE - Cartoni B14            │
  │    ⏱️ 5m 23s in attesa              │
  │    👤 Ciro Esposito                  │
  │    [🏃 PRENDO IO]                    │
  ├─────────────────────────────────────┤
  │ 🟡 Bobine Premium B11               │
  │    ⏱️ 2m 45s in attesa              │
  │    👤 Mario Rossi                    │
  │    [🏃 PRENDO IO]                    │
  ├─────────────────────────────────────┤
  │ 🟢 Pedane Vuote B5                  │
  │    ⏱️ 45s in attesa                 │
  │    👤 Luigi Bianchi                  │
  │    [🏃 PRENDO IO]                    │
  └─────────────────────────────────────┘
```

**Colorazione SLA:**
- 🟢 Verde: < 2 minuti
- 🟡 Giallo: 2-3 minuti
- 🔴 Rosso lampeggiante: > 3 minuti

---

### STEP 3: Presa in Carico con ETA
```
MAGAZZINIERE clicca "PRENDO IO"
  ↓
Popup richiede ETA:
  ┌────────────────────────────────┐
  │   ⏰ Fra quanto arrivi?        │
  │                                │
  │   [ 5 min ]    [ 10 min ]      │
  │   [ 15 min ]   [ 20 min ]      │
  │   [ 30+ min ]                  │
  │                                │
  │         [CONFERMA]             │
  └────────────────────────────────┘
  ↓
Seleziona "10 min" → Conferma
  ↓
Richiesta passa a status: `processing`
Salvato: ETA promessa = 10 minuti
```

---

### STEP 4: Vista Richiedente (Attesa)
```
OPERATORE vede la sua card aggiornarsi:
  ┌─────────────────────────────────────┐
  │ 📦 Cartoni Materassi STV            │
  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
  │ 🚶 Giovanni sta arrivando!          │
  │ ⏱️ Arrivo stimato: ~10 minuti       │
  │                                     │
  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
  │       [⚠️ SOLLECITA URGENZA]        │
  └─────────────────────────────────────┘
```

---

### STEP 5: Sollecito Urgenza (Opzionale)
```
Se l'operatore ritiene l'ETA troppo lunga:
  ↓
Clicca "⚠️ SOLLECITA URGENZA"
  ↓
Conferma: "Sei sicuro? Questo notificherà il coordinatore"
  ↓
Effetti:
  - Richiesta diventa URGENTE 🔴
  - Notifica push al magazziniere assegnato
  - Notifica push al coordinatore
  - Badge urgenza lampeggiante sulla mappa
```

---

### STEP 6: Messaggi Veloci (Magazziniere)
```
MAGAZZINIERE può inviare messaggi preimpostati:
  ↓
Clicca icona messaggio 💬
  ↓
Sceglie tra opzioni configurabili:
  • "In coda al retrattile"
  • "Carico altre pedane, poi vengo"
  • "Sto arrivando!"
  • "Problema: materiale non disponibile"
  • [Campo libero per testo custom]
  ↓
Operatore riceve notifica con il messaggio
```

---

### STEP 7: Completamento Consegna
```
MAGAZZINIERE arriva, consegna il materiale
  ↓
Clicca "✅ CONSEGNATO"
  ↓
Sistema calcola:
  - Tempo effettivo vs ETA promessa
  - Assegna punti o penalità
  - Aggiorna statistiche
  ↓
OPERATORE vede: "✅ Materiale consegnato!"
  ↓
[Opzionale] Operatore può confermare ricezione
```

---

### STEP 8: Rilascio Task (Emergenza)
```
Se il MAGAZZINIERE non riesce a completare:
  ↓
Clicca "❌ NON RIESCO"
  ↓
Popup: "Vuoi rilasciare questa richiesta?"
  ↓
Effetti:
  - Task torna nella piscina
  - Penalità -1 punto al magazziniere
  - Altro magazziniere può prenderla
```

---

## 4. SISTEMA PUNTI E PENALITÀ

### ⚠️ REGOLAMENTO UFFICIALE - DA PRESENTARE AI MAGAZZINIERI

---

### 🏆 PUNTI POSITIVI (Si Guadagnano)

| Azione | Punti | Condizione |
|--------|-------|------------|
| **Missione completata in tempo** | +1 | Consegna entro l'ETA promessa |
| **Missione URGENTE completata** | +2 | Richiesta sollecitata, completata in tempo |
| **Super velocità** | +1 bonus | Consegna in meno di metà dell'ETA |
| **Salvataggio task abbandonata** | +1 | Prendi una task rilasciata da altri |

**Esempio:**
- Mario prende una richiesta, promette 10 minuti, consegna in 8 → **+1 punto**
- La richiesta era URGENTE → **+2 punti totali**
- Ha consegnato in 4 minuti (metà di 10) → **+1 bonus = +3 punti totali**

---

### 🔴 PENALITÀ (Si Perdono Punti)

| Azione | Penalità | Condizione |
|--------|----------|------------|
| **Ritardo lieve** | -1 | Consegna 1-5 minuti oltre l'ETA |
| **Ritardo grave** | -2 | Consegna 5-15 minuti oltre l'ETA |
| **Ritardo critico** | -3 | Consegna oltre 15 minuti dall'ETA |
| **Task rilasciata** | -1 | Hai preso in carico ma non riesci a completare |
| **Sollecito ricevuto** | -1 | L'operatore ha dovuto sollecitare urgenza |

**Esempio:**
- Giovanni promette 5 minuti, consegna in 12 minuti (ritardo 7 min) → **-2 punti**
- L'operatore aveva sollecitato urgenza → **-1 aggiuntivo = -3 punti totali**

---

### 📊 FASCE DI VALUTAZIONE MENSILE

| Fascia | Punti Mensili | Giudizio | Conseguenze |
|--------|---------------|----------|-------------|
| 🥇 **Eccellente** | > 100 | Top Performer | Bonus produttività |
| 🥈 **Buono** | 70-100 | Nella media alta | Nessuna |
| 🟡 **Sufficiente** | 40-69 | Nella media | Nessuna |
| 🟠 **Migliorabile** | 20-39 | Sotto la media | Colloquio con coordinatore |
| 🔴 **Insufficiente** | < 20 | Critico | Richiamo formale |

---

### 🏅 BADGE SPECIALI (Traguardi)

| Badge | Nome | Condizione |
|-------|------|------------|
| 🚀 | **Razzo** | 100 missioni completate |
| ⚡ | **Fulmine** | Media risposta < 1 minuto per un mese |
| 🎯 | **Precisione** | 50 missioni consecutive senza penalità |
| 🦸 | **Salvatore** | 10 task salvate (prese dopo rilascio altri) |
| 📈 | **In Crescita** | Miglioramento 50% rispetto mese precedente |

---

### 📋 TABELLA RIASSUNTIVA VELOCE

```
╔═══════════════════════════════════════════════════════════════╗
║           SISTEMA PUNTI LOGISTICA - RIEPILOGO                ║
╠═══════════════════════════════════════════════════════════════╣
║  GUADAGNI:                                                    ║
║    • Consegna in tempo        → +1 punto                     ║
║    • Consegna URGENTE         → +2 punti                     ║
║    • Super velocità           → +1 bonus                     ║
║    • Salvi task abbandonata   → +1 punto                     ║
╠═══════════════════════════════════════════════════════════════╣
║  PENALITÀ:                                                    ║
║    • Ritardo 1-5 min          → -1 punto                     ║
║    • Ritardo 5-15 min         → -2 punti                     ║
║    • Ritardo > 15 min         → -3 punti                     ║
║    • Rilasci task             → -1 punto                     ║
║    • Ricevi sollecito         → -1 punto                     ║
╠═══════════════════════════════════════════════════════════════╣
║  OBIETTIVO MENSILE: > 70 punti = BUONO                       ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 5. CONFIGURAZIONE ADMIN

### 5.1 Tipi di Materiale
Pagina: `/admin/logistics-config` → Tab "Materiali"

| Campo | Descrizione | Esempio |
|-------|-------------|---------|
| **Label** | Nome visualizzato | "Cartoni Guanciali" |
| **Icona** | Emoji | 📦 |
| **Categoria** | Raggruppamento | `imballo`, `materie_prime`, `logistica` |
| **Richiede descrizione** | Campo libero obbligatorio | ✅ per "Tessuto" |
| **Attivo** | Visibile nella lista | ✅ / ❌ |
| **Ordine** | Posizione nella griglia | 1, 2, 3... |

**CRUD Completo:** Puoi aggiungere, modificare, disattivare qualsiasi tipo senza toccare codice.

---

### 5.2 Opzioni ETA
Pagina: `/admin/logistics-config` → Tab "Tempi"

Puoi personalizzare le opzioni che il magazziniere vede:
```
Opzioni attuali: 5 min | 10 min | 15 min | 20 min | 30+ min

Puoi cambiarle in: 3 min | 5 min | 10 min | 15 min | 20+ min
```

---

### 5.3 Messaggi Preimpostati
Pagina: `/admin/logistics-config` → Tab "Messaggi"

Lista modificabile di messaggi veloci:
```
1. "In coda al retrattile"
2. "Carico altre pedane, poi vengo"
3. "Sto arrivando!"
4. "Problema: materiale non disponibile"
5. [AGGIUNGI NUOVO]
```

---

### 5.4 Configurazione Punti
Pagina: `/admin/logistics-config` → Tab "Punti"

Tutti i valori sono modificabili:

| Parametro | Valore Default | Modificabile |
|-----------|----------------|--------------|
| Punti base missione | 1 | ✅ |
| Punti urgenza | 2 | ✅ |
| Bonus super velocità | 1 | ✅ |
| Penalità ritardo lieve | -1 | ✅ |
| Penalità ritardo grave | -2 | ✅ |
| Penalità ritardo critico | -3 | ✅ |
| Penalità rilascio | -1 | ✅ |
| Penalità sollecito | -1 | ✅ |
| Soglia ritardo lieve (min) | 5 | ✅ |
| Soglia ritardo grave (min) | 15 | ✅ |

---

## 6. MAPPA INTERATTIVA

### Layout Visivo
La mappa mostra VEGA 5 e VEGA 6 con tutte le banchine:

```
┌─────────────────────────────────────────────────────────────────┐
│                          VEGA 5                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ B1  │ │ B2  │ │ B3  │ │ B4  │ │ B5  │ │ B6  │ │ B7  │       │
│  │     │ │ 🟡  │ │     │ │     │ │ 🔴* │ │     │ │     │       │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────────────────────────────┘
                        ↕️ CORTILE (35-40m) ↕️
┌─────────────────────────────────────────────────────────────────┐
│                          VEGA 6                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ B11 │ │ B12 │ │ B13 │ │ B14 │ │ B15 │ │ B16 │               │
│  │ 🟢  │ │     │ │     │ │🔵→  │ │     │ │     │               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────────────────────────────┘

LEGENDA:
🟢 = Richiesta nuova (< 2 min)
🟡 = In attesa (2-3 min)
🔴* = In attesa critica (> 3 min) - lampeggia
🔵→ = In consegna (Mario sta arrivando)
```

### Interazioni
- **Click su banchina** → Mostra dettaglio richiesta
- **Hover** → Tooltip con info rapide
- **Animazione linea tratteggiata** → Dal magazzino alla banchina quando in consegna

---

## 7. REPORT E STATISTICHE

### 7.1 Dashboard Real-Time (Coordinatore)
```
┌──────────────────────────────────────────────────────────────┐
│ 📊 OGGI                                                      │
│                                                              │
│ Richieste totali: 47        In attesa: 3        🔴 Urgenti: 1│
│                                                              │
│ Tempo medio attesa: 4.2 min                                  │
│ ETA rispettate: 89%                                          │
│                                                              │
│ 🏆 Top Performer: Mario (12 missioni, 0 penalità)           │
│ ⚠️ Attenzione: B14 ha 5 richieste nelle ultime 2 ore        │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Report Mensili

| Report | Contenuto |
|--------|-----------|
| **Classifica Operatori** | Punti totali, missioni, media reazione |
| **Analisi Banchine** | Quali banchine richiedono più materiale |
| **Heatmap Oraria** | Picchi di richieste per fascia oraria |
| **SLA Performance** | % richieste entro 3 minuti |
| **ETA Accuracy** | % ETA rispettate per operatore |

### 7.3 Export Excel
Tutti i report esportabili in Excel per analisi avanzate.

---

## 8. SPECIFICHE TECNICHE

### 8.1 Nuove Tabelle Database

#### `logistics_material_types`
```sql
id INT PRIMARY KEY
label VARCHAR(100) NOT NULL
icon VARCHAR(10)
category VARCHAR(50)
requires_description BOOLEAN DEFAULT FALSE
is_active BOOLEAN DEFAULT TRUE
display_order INT DEFAULT 0
```

#### `logistics_requests`
```sql
id INT PRIMARY KEY
material_type_id FK → logistics_material_types
custom_description TEXT
banchina_id FK → banchine
requester_id FK → users
quantity INT DEFAULT 1

status ENUM('pending','assigned','processing','completed','cancelled')
is_urgent BOOLEAN DEFAULT FALSE
assigned_to_id FK → users
is_forced_assignment BOOLEAN DEFAULT FALSE

-- Timestamps
created_at DATETIME
taken_at DATETIME
promised_eta_minutes INT
completed_at DATETIME

-- Gamification
points_awarded INT
penalty_applied INT
eta_respected BOOLEAN
```

#### `logistics_performance`
```sql
id INT PRIMARY KEY
employee_id FK → employees
month INT
year INT
missions_completed INT DEFAULT 0
total_points INT DEFAULT 0
penalties_received INT DEFAULT 0
avg_reaction_seconds INT
fastest_reaction_seconds INT
eta_accuracy_percent FLOAT
```

#### `logistics_messages`
```sql
id INT PRIMARY KEY
request_id FK → logistics_requests
sender_id FK → users
message_type ENUM('preset','custom')
content TEXT
sent_at DATETIME
```

#### `logistics_config`
```sql
id INT PRIMARY KEY
config_key VARCHAR(50) UNIQUE
config_value TEXT
description VARCHAR(200)
```

### 8.2 Nuovi Ruoli e Permessi

```python
# init_roles.py - Aggiunte

{
    "name": "warehouse_operator",
    "label": "Magazziniere",
    "description": "Gestione richieste materiali",
    "permissions": ["manage_logistics_pool"],
    "default_home": "/logistics/pool"
}

# Aggiungere a order_user:
"permissions": ["create_production_orders", "request_logistics"]

# Aggiungere a coordinator:
"permissions": [..., "supervise_logistics"]
```

### 8.3 Nuove Pagine Frontend

| Path | Nome | Ruoli |
|------|------|-------|
| `/logistics/request` | Richiesta Materiali | order_user |
| `/logistics/pool` | Gestione Magazzino | warehouse_operator |
| `/logistics/dashboard` | Dashboard Logistica | coordinator, admin |
| `/admin/logistics-config` | Configurazione | admin |

### 8.4 API Endpoints

```
POST   /logistics/requests              → Crea richiesta
GET    /logistics/requests              → Lista richieste (filtri)
PATCH  /logistics/requests/{id}/take    → Prendi in carico con ETA
PATCH  /logistics/requests/{id}/complete → Completa
PATCH  /logistics/requests/{id}/release → Rilascia
PATCH  /logistics/requests/{id}/urgent  → Sollecita urgenza
POST   /logistics/requests/{id}/message → Invia messaggio

GET    /logistics/performance/{employee_id} → Stats operatore
GET    /logistics/reports                   → Report aggregati

CRUD   /logistics/config/materials      → Tipi materiale
CRUD   /logistics/config/messages       → Messaggi preimpostati
CRUD   /logistics/config/settings       → Impostazioni punti
```

---

## ✅ CHECKLIST IMPLEMENTAZIONE

### Fase 1: Database & Backend (3-4 ore)
- [ ] Creare modelli SQLAlchemy
- [ ] Migration Alembic
- [ ] Router `/logistics/`
- [ ] Logica punti e penalità
- [ ] Scheduler notifiche 3 minuti

### Fase 2: Frontend Richiedente (2-3 ore)
- [ ] Pagina griglia materiali
- [ ] Stato richiesta live
- [ ] Pulsante sollecito

### Fase 3: Frontend Magazziniere (3-4 ore)
- [ ] Pool richieste live
- [ ] Popup ETA
- [ ] Coda personale
- [ ] Messaggi veloci
- [ ] Pulsanti azione

### Fase 4: Mappa e Dashboard (2-3 ore)
- [ ] Componente mappa SVG
- [ ] Animazioni live
- [ ] Dashboard coordinatore

### Fase 5: Admin Config (2 ore)
- [ ] CRUD materiali
- [ ] CRUD messaggi
- [ ] Configurazione punti

### Fase 6: Report (2 ore)
- [ ] API statistiche
- [ ] Pagina report
- [ ] Export Excel

---

## 📝 NOTE FINALI

Questo documento sarà aggiornato durante lo sviluppo.
Qualsiasi modifica al sistema punti richiede approvazione della direzione.

**Contatti:**
- Sviluppo: [Sistema SL Enterprise]
- Approvazione: [Nome Responsabile]
