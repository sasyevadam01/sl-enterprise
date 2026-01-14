# 🗄️ SCHEMA DATABASE (MariaDB Structure) - v1.2 DETTAGLIATO

Legenda: 🔑 = Primary Key, 🔗 = Foreign Key.

---

## 👥 1. UTENTI & SICUREZZA
*Fondamenta per ruoli e tracciamento.*

### `users`
*   🔑 `id`: INT
*   `username`: VARCHAR(50)
*   `password_hash`: VARCHAR(255)
*   `role`: ENUM('super_admin', 'hr_manager', 'coordinator', 'record_user')
*   `full_name`: VARCHAR(100)
*   `is_active`: BOOLEAN
*   `created_at`: DATETIME

### `audit_logs` (La "Scatola Nera")
*   Traccia ogni click critico.
*   🔑 `id`: INT
*   🔗 `user_id`: INT
*   `action`: VARCHAR(100) (Es. 'DELETE_EMPLOYEE', 'FORCE_KPI')
*   `ip_address`: VARCHAR(45)
*   `timestamp`: DATETIME

---

## 👔 2. HR SUITE (Dipendenti & Carriera)

### `departments`
*   🔑 `id`: INT
*   `name`: VARCHAR(50) (Es. 'Saldatura', 'Logistica')
*   `cost_center`: VARCHAR(20) (Codice centro di costo)

### `employees` (Dossier Personale)
*   🔑 `id`: INT
*   `fiscal_code`: VARCHAR(16) (Unique)
*   `first_name`: VARCHAR(50)
*   `last_name`: VARCHAR(50)
*   🔗 `department_id`: INT
*   `current_role`: VARCHAR(100)
*   `contract_type`: ENUM('full_time', 'part_time', 'internship', 'agency')
*   `contract_expiry`: DATE (Null se indeterminato)
*   `hiring_date`: DATE
*   `total_points`: INT (Calcolato real-time: 100 + bonus - malus)
*   `active`: BOOLEAN

### `employee_certifications` (Scadenziario Formazione)
*   *Include Art.37, Preposti, Patenti.*
*   🔑 `id`: INT
*   🔗 `employee_id`: INT
*   `cert_type`: ENUM('art37_gen', 'art37_spec', 'first_aid', 'fire_safety', 'forklift', 'ple', 'preposto', 'other')
*   `issue_date`: DATE
*   `expiry_date`: DATE (Cruciale per le notifiche di scadenza)
*   `scan_url`: VARCHAR(255) (Link al PDF)

### `disciplinary_history` (Elogi e Sanzioni)
*   *Workflow: Proposta (Coord) -> Approvazione (HR)*
*   🔑 `id`: INT
*   🔗 `employee_id`: INT
*   🔗 `proposed_by_user`: INT (Chi l'ha chiesto)
*   🔗 `approved_by_user`: INT (Chi ha firmato, NULL = In Attesa)
*   `event_type`: ENUM('praise', 'bonus_production', 'verbal_recall', 'written_warning', 'severe_infraction', 'suspension')
*   `points_value`: INT (Es. +1, +2, -1, -5)
*   `notes`: TEXT
*   `event_date`: DATE

---

## 🚜 3. PARCO MACCHINE & MAGAZZINO (Asset Management)

### `machines` (Anagrafica Veicoli/Macchinari)
*   🔑 `id`: INT
*   `name`: VARCHAR(50) (Es. 'Muletto Linde 04')
*   `model`: VARCHAR(100)
*   `serial_number`: VARCHAR(100)
*   `type`: ENUM('forklift', 'retractable', 'ple', 'truck', 'production_line', 'compressor', 'shelving')
*   `purchase_date`: DATE
*   `status`: ENUM('operational', 'maintenance_scheduled', 'breakdown', 'decommissioned')

### `machine_maintenance` (Manutenzioni & Scadenze)
*   🔑 `id`: INT
*   🔗 `machine_id`: INT
*   `type`: ENUM('preventive', 'corrective', 'revision', 'safety_check')
*   `description`: TEXT
*   `due_date`: DATE (Scadenza prevista)
*   `completed_date`: DATE
*   `cost`: DECIMAL(10, 2)
*   `technician_notes`: TEXT

### `spare_parts_inventory` (Magazzino Ricambi)
*   *Per tracciare pezzi costosi o frequenti.*
*   🔑 `id`: INT
*   `part_code`: VARCHAR(50)
*   `description`: VARCHAR(200)
*   `quantity_in_stock`: INT
*   `min_threshold`: INT (Soglia allarme riordino)
*   `last_ordered`: DATE

### `procurement_requests` (Preventivi & Richieste Acquisto)
*   *Quando il Factory Manager dimentica i preventivi...*
*   🔑 `id`: INT
*   🔗 `requested_by`: INT
*   🔗 `related_machine_id`: INT (Opzionale)
*   `item_description`: TEXT
*   `status`: ENUM('draft', 'requested', 'preventive_received', 'ordered', 'arrived')
*   `preventive_file_url`: VARCHAR(255)

---

## 🏭 4. FACTORY PRODUCTION (KPI Reale)

### `production_sessions` (Il Turno Macchina)
*   🔑 `id`: INT
*   🔗 `machine_id`: INT
*   🔗 `record_user_id`: INT (Chi ha inserito i dati)
*   `date`: DATE
*   `shift`: ENUM('morning', 'afternoon', 'night')
*   `total_pieces`: INT
*   `scrap_pieces`: INT (Scarti)

### `session_operators` (Chi c'era sulla macchina)
*   *Molti-a-Molti: Una macchina può avere 2 operatori.*
*   🔗 `session_id`: INT
*   🔗 `employee_id`: INT
*   `actual_hours`: DECIMAL(4, 2) (Ore effettive lavorate)

### `downtime_logs` (Fermi & Causali)
*   *Essenziale per capire PERCHÉ il KPI è basso.*
*   🔑 `id`: INT
*   🔗 `session_id`: INT
*   `reason`: ENUM('no_material', 'breakdown', 'setup', 'cleaning', 'software_error', 'meeting')
*   `start_time`: TIME
*   `end_time`: TIME
*   `duration_minutes`: INT (Calcolato)
*   `notes`: TEXT

---

## 🔔 5. REAL-TIME NOTIFICATIONS SYSTEM
*Progettato per essere instantaneo (WebSockets).*

### `notification_queue`
*   🔑 `id`: BIGINT
*   🔗 `recipient_user_id`: INT (NULL se è per un Ruolo intero)
*   `recipient_role`: ENUM (NULL se è per Utente specifico)
*   `type`: ENUM('alert', 'approval_req', 'task_assigned', 'machine_down', 'inventory_low')
*   `title`: VARCHAR(100)
*   `message`: TEXT
*   `link_url`: VARCHAR(255)
*   `is_read`: BOOLEAN
*   `created_at`: DATETIME

---
