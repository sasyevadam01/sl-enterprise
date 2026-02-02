# 🗄️ SCHEMA DATABASE - SL Enterprise v2.0

**Ultimo Aggiornamento:** 1 Febbraio 2026  
**Database:** SQLite 3.x  
**ORM:** SQLAlchemy 2.x  

---

## Panoramica

Il database è organizzato in **8 moduli funzionali** con oltre **40 tabelle**:

| Modulo | Tabelle | Descrizione |
|--------|---------|-------------|
| **Core** | 6 | Autenticazione, ruoli, audit |
| **HR** | 9+ | Anagrafica dipendenti, certificazioni |
| **Factory** | 4 | Banchine, macchinari |
| **Shifts** | 2 | Turni e fabbisogni |
| **Tasks** | 3 | Gestione attività |
| **Fleet** | 2 | Parco mezzi |
| **Logistics** | 8 | Sistema richieste materiale |
| **Production** | 10 | KPI e sessioni produzione |

---

## 1. 🔐 CORE - Autenticazione

### `roles`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| name | VARCHAR(50) | Unique, es. "coordinator" |
| label | VARCHAR(100) | Display, es. "Coordinatore" |
| permissions | JSON | Lista permessi |
| default_home | VARCHAR(100) | Pagina iniziale |

### `users`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| username | VARCHAR(50) | Unique |
| password_hash | VARCHAR(255) | bcrypt |
| full_name | VARCHAR(100) | |
| 🔗 role_id | INT | FK → roles |
| 🔗 department_id | INT | FK → departments |
| is_active | BOOLEAN | |
| last_seen | DATETIME | Tracking online |

### `departments`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| name | VARCHAR(50) | Unique |
| cost_center | VARCHAR(20) | Centro di costo |

### `audit_logs`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 user_id | INT | FK → users |
| action | VARCHAR(100) | Es. 'DELETE_EMPLOYEE' |
| details | TEXT | JSON dettagli |
| ip_address | VARCHAR(45) | |
| timestamp | DATETIME | |

---

## 2. 👔 HR SUITE

### `employees`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| fiscal_code | VARCHAR(16) | Unique (opzionale) |
| first_name | VARCHAR(50) | |
| last_name | VARCHAR(50) | |
| 🔗 department_id | INT | FK → departments |
| contract_type | ENUM | full_time, part_time, agency |
| hiring_date | DATE | |
| active | BOOLEAN | |
| 🔗 user_id | INT | FK → users (1:1) |
| sector | VARCHAR(50) | Pantografo/Giostra |

### `employee_certifications`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 employee_id | INT | FK → employees |
| cert_type | VARCHAR(50) | forklift, first_aid, ecc. |
| issue_date | DATE | |
| expiry_date | DATE | Per notifiche scadenza |
| scan_path | VARCHAR(500) | Path PDF |

### `employee_events`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 employee_id | INT | FK → employees |
| event_type | VARCHAR(50) | praise, warning, ecc. |
| points_value | INT | +1, +2, -1, -5 |
| status | VARCHAR(20) | pending, approved |

---

## 3. 🏭 FACTORY

### `banchine`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| code | VARCHAR(10) | Unique, es. "B1", "B14" |
| name | VARCHAR(100) | |
| is_active | BOOLEAN | |

### `machines`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| name | VARCHAR(50) | |
| machine_type | VARCHAR(30) | forklift, production_line |
| status | VARCHAR(20) | operational, breakdown |
| 🔗 department_id | INT | FK → departments |

---

## 4. 📅 SHIFTS

### `shift_requirements`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 banchina_id | INT | FK → banchine |
| role_name | VARCHAR(100) | Es. "Mulettista" |
| quantity | FLOAT | Operatori richiesti |
| kpi_target | INT | Pezzi/turno target |
| kpi_sector | VARCHAR(100) | Settore KPI |

### `shift_assignments`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 employee_id | INT | FK → employees |
| 🔗 requirement_id | INT | FK → shift_requirements |
| work_date | DATETIME | |
| shift_type | VARCHAR(20) | morning, afternoon, night |

---

## 5. 📦 LOGISTICS

### `logistics_requests`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 material_type_id | INT | FK → logistics_material_types |
| 🔗 requester_id | INT | FK → users |
| status | ENUM | pending, assigned, completed |
| is_urgent | BOOLEAN | |
| 🔗 assigned_to_id | INT | FK → users |
| promised_eta_minutes | INT | |
| points_awarded | INT | Sistema gamification |

### `logistics_performance`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 employee_id | INT | FK → employees |
| month | INT | |
| year | INT | |
| total_points | INT | Punteggio mensile |
| eta_accuracy_percent | FLOAT | % rispetto ETA |

---

## 6. 📊 PRODUCTION

### `kpi_configs`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| sector_name | VARCHAR(100) | Unique |
| target_per_hour | INT | Obiettivo orario |
| is_active | BOOLEAN | |

### `kpi_entries`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 kpi_config_id | INT | FK → kpi_configs |
| entry_date | DATE | |
| shift_type | VARCHAR(20) | |
| actual_pieces | INT | Pezzi prodotti |
| scrap_pieces | INT | Scarti |
| downtime_minutes | INT | Fermi |

---

## 7. 🚛 FLEET

### `fleet_vehicles`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| vehicle_type | VARCHAR(30) | forklift, retractable, ple |
| internal_code | VARCHAR(20) | Numero interno |
| 🔗 banchina_id | INT | FK → banchine |
| status | VARCHAR(20) | operational, breakdown |

### `maintenance_tickets`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| 🔗 vehicle_id | INT | FK → fleet_vehicles |
| issue_type | VARCHAR(30) | total_breakdown, partial |
| is_safety_critical | BOOLEAN | +100 punti priorità |
| priority_score | INT | Calcolato auto |
| status | VARCHAR(20) | open, resolved, closed |

---

## 8. ✅ TASKS

### `tasks`
| Campo | Tipo | Note |
|-------|------|------|
| 🔑 id | INT | PK |
| title | VARCHAR(200) | |
| 🔗 assigned_to | INT | FK → users |
| 🔗 assigned_by | INT | FK → users |
| priority | INT | 1-10 |
| deadline | DATETIME | |
| status | VARCHAR(20) | pending, completed |
| checklist | JSON | Sub-item |

---

**Legenda:** 🔑 = Primary Key, 🔗 = Foreign Key

*Per diagramma ER visuale vedere: [ER_DIAGRAM.md](ER_DIAGRAM.md)*
