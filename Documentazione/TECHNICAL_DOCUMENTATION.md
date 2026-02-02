# 🏗️ SL Enterprise - Documentazione Tecnica

**Versione:** 2.0  
**Ultimo Aggiornamento:** 1 Febbraio 2026  

---

## 📋 Indice

1. [Stack Tecnologico](#1-stack-tecnologico)
2. [Architettura del Sistema](#2-architettura-del-sistema)
3. [Struttura del Progetto](#3-struttura-del-progetto)
4. [Moduli Funzionali](#4-moduli-funzionali)
5. [API Reference](#5-api-reference)
6. [Deployment](#6-deployment)
7. [Guida Sviluppatore](#7-guida-sviluppatore)

---

## 1. Stack Tecnologico

### Backend
| Componente | Tecnologia | Versione |
|------------|------------|----------|
| Framework | FastAPI | 0.100+ |
| Database | SQLite | 3.x |
| ORM | SQLAlchemy | 2.x |
| Auth | JWT (python-jose) | - |
| Server WSGI | Uvicorn | - |

### Frontend
| Componente | Tecnologia | Versione |
|------------|------------|----------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Routing | React Router | 6.x |
| State | Context API | - |
| HTTP Client | Axios | - |

### Infrastruttura
| Componente | Tecnologia |
|------------|------------|
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Server | VPS Linux (Aruba) |
| CI/CD | GitHub + Manual Deploy |

---

## 2. Architettura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        UTENTI                                │
│            (Browser Web / Mobile PWA)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     NGINX                                    │
│              (Reverse Proxy + SSL)                           │
│                   :80 / :443                                 │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐          ┌─────────────────────┐
│     FRONTEND        │          │      BACKEND        │
│    (React/Vite)     │          │     (FastAPI)       │
│      :80/web        │          │       :8000         │
└─────────────────────┘          └──────────┬──────────┘
                                            │
                                            ▼
                                 ┌─────────────────────┐
                                 │      DATABASE       │
                                 │      (SQLite)       │
                                 │   sl_enterprise.db  │
                                 └─────────────────────┘
```

---

## 3. Struttura del Progetto

```
SL Project/
├── backend/
│   ├── main.py              # Entry point FastAPI
│   ├── database.py          # Configurazione DB
│   ├── auth.py              # JWT Authentication
│   ├── models/              # Modelli SQLAlchemy (12 moduli)
│   │   ├── core.py          # User, Role, Department, AuditLog
│   │   ├── hr.py            # Employee, Certifications, Events
│   │   ├── factory.py       # Banchine, Machines
│   │   ├── logistics.py     # Material Requests, Performance
│   │   ├── production.py    # Sessions, KPI, BlockRequests
│   │   ├── shifts.py        # ShiftRequirement, ShiftAssignment
│   │   ├── tasks.py         # Tasks, Comments, Attachments
│   │   └── fleet.py         # Vehicles, MaintenanceTickets
│   ├── routers/             # API Endpoints
│   ├── schemas*.py          # Pydantic schemas
│   └── sl_enterprise.db     # Database SQLite
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componenti riutilizzabili
│   │   ├── pages/           # Pagine applicazione
│   │   ├── api/             # Client API
│   │   └── context/         # React Context
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml       # Orchestrazione container
├── Documentazione/          # Documentazione progetto
└── ai_bridge.py             # Bridge DeepSeek locale
```

---

## 4. Moduli Funzionali

### 4.1 Core (Autenticazione & Sistema)
- **Gestione Utenti**: Login, ruoli, permessi RBAC
- **Audit Log**: Tracciamento azioni critiche
- **Notifiche**: Sistema notifiche in-app
- **Annunci**: Bacheca aziendale

### 4.2 HR Suite
- **Anagrafica Dipendenti**: Dossier completo con documenti
- **Certificazioni**: Scadenziario patentini e corsi
- **Formazione**: Tracking corsi interni
- **Visite Mediche**: Calendario e scadenze
- **Ferie/Permessi**: Workflow approvazione
- **Eventi HR**: Sistema punti (elogi/sanzioni)

### 4.3 Factory & Production
- **Banchine**: Mappatura stabilimento (B1-B16)
- **Macchine**: Anagrafica e manutenzioni
- **Sessioni Produzione**: KPI per turno
- **Fermi Macchina**: Log causali downtime

### 4.4 Logistics (Sistema Uber-style)
- **Richiesta Materiale**: Pool richieste real-time
- **ETA & Tracking**: Presa in carico con tempo stimato
- **Performance**: Sistema punti magazzinieri
- **Messaggi Rapidi**: Comunicazione operatore-magazziniere

### 4.5 Shifts & Planning
- **Fabbisogno**: Requisiti personale per banchina
- **Assegnazioni**: Turni con dettaglio ore
- **Planner**: Vista settimanale coordinatore

### 4.6 Tasks
- **To-Do Avanzato**: Task con priorità e scadenze
- **Checklist**: Sub-item per task complessi
- **Allegati**: Upload file per task
- **Commenti**: Discussione su task

### 4.7 Fleet Management
- **Parco Mezzi**: Muletti, retrattili, PLE, camion
- **Ticket Guasti**: Segnalazione con priorità automatica
- **Manutenzioni**: Preventive e correttive

---

## 5. API Reference

### Autenticazione
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/auth/login` | Login con username/password |
| POST | `/auth/refresh` | Rinnovo token JWT |
| GET | `/auth/me` | Profilo utente corrente |

### Employees (HR)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/employees` | Lista dipendenti |
| POST | `/employees` | Crea dipendente |
| GET | `/employees/{id}` | Dettaglio dipendente |
| PUT | `/employees/{id}` | Modifica dipendente |
| DELETE | `/employees/{id}` | Elimina dipendente |

### Logistics
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/logistics/requests` | Lista richieste |
| POST | `/logistics/requests` | Nuova richiesta materiale |
| PATCH | `/logistics/requests/{id}/take` | Prendi in carico |
| PATCH | `/logistics/requests/{id}/complete` | Completa consegna |
| GET | `/logistics/performance/{id}` | Stats magazziniere |

### Shifts
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/shifts/requirements` | Fabbisogni banchine |
| GET | `/shifts/assignments` | Turni assegnati |
| POST | `/shifts/assignments` | Assegna turno |

### Tasks
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/tasks` | Lista task |
| POST | `/tasks` | Crea task |
| PATCH | `/tasks/{id}/status` | Cambia stato |

---

## 6. Deployment

### Requisiti Server
- Linux (Ubuntu 22.04+)
- Docker + Docker Compose
- Nginx
- Certificato SSL (Let's Encrypt)

### Comandi Deploy
```bash
# SSH al server
ssh root@93.186.255.104

# Pull ultime modifiche
cd /root
git pull origin main

# Rebuild e restart
docker compose up -d --build

# Verifica logs
docker compose logs -f backend
```

### Backup
```bash
# Backup manuale database
docker compose stop backend
cp backend/sl_enterprise.db backup_$(date +%Y%m%d).db
docker compose start backend
```

---

## 7. Guida Sviluppatore

### Setup Locale
```bash
# Backend
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Variabili Ambiente
```env
# Backend (.env)
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///./sl_enterprise.db
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Frontend (.env)
VITE_API_URL=http://localhost:8000
```

### Credenziali Default
- **Username:** admin
- **Password:** Admin123!
- **Ruolo:** super_admin

---

*Documento generato automaticamente - SL Enterprise v2.0*
