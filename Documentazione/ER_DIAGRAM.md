# 🗄️ Diagramma Entity-Relationship - SL Enterprise

**Versione:** 2.0  
**Ultimo Aggiornamento:** 1 Febbraio 2026  
**Tabelle Totali:** 40+  
**Moduli:** 8  

---

## Panoramica Architettura

Il database SL Enterprise è organizzato in **8 moduli funzionali** interconnessi:

```mermaid
flowchart TB
    subgraph CORE["🔐 CORE"]
        users[users]
        roles[roles]
        departments[departments]
        audit_logs[audit_logs]
        notifications[notifications]
        announcements[announcements]
    end

    subgraph HR["👔 HR SUITE"]
        employees[employees]
        employee_documents[employee_documents]
        employee_certifications[employee_certifications]
        employee_trainings[employee_trainings]
        medical_exams[medical_exams]
        leave_requests[leave_requests]
        disciplinary_records[disciplinary_records]
        employee_events[employee_events]
        employee_badges[employee_badges]
    end

    subgraph FACTORY["🏭 FACTORY"]
        banchine[banchine]
        machines[machines]
        machine_maintenances[machine_maintenances]
        facility_maintenances[facility_maintenances]
    end

    subgraph SHIFTS["📅 SHIFTS"]
        shift_requirements[shift_requirements]
        shift_assignments[shift_assignments]
    end

    subgraph TASKS["✅ TASKS"]
        tasks[tasks]
        task_comments[task_comments]
        task_attachments[task_attachments]
    end

    subgraph FLEET["🚛 FLEET"]
        fleet_vehicles[fleet_vehicles]
        maintenance_tickets[maintenance_tickets]
    end

    subgraph LOGISTICS["📦 LOGISTICS"]
        logistics_material_types[logistics_material_types]
        logistics_requests[logistics_requests]
        logistics_performance[logistics_performance]
        logistics_messages[logistics_messages]
        logistics_preset_messages[logistics_preset_messages]
        logistics_eta_options[logistics_eta_options]
        logistics_config[logistics_config]
        return_tickets[return_tickets]
    end

    subgraph PRODUCTION["📊 PRODUCTION"]
        production_sessions[production_sessions]
        session_operators[session_operators]
        downtime_logs[downtime_logs]
        production_entries[production_entries]
        machine_downtimes[machine_downtimes]
        kpi_configs[kpi_configs]
        kpi_entries[kpi_entries]
        downtime_reasons[downtime_reasons]
        production_materials[production_materials]
        block_requests[block_requests]
    end

    %% Relazioni principali
    users --> roles
    users --> departments
    employees --> departments
    employees --> users
    shift_assignments --> employees
    shift_assignments --> shift_requirements
    shift_requirements --> banchine
    fleet_vehicles --> banchine
    logistics_requests --> users
    tasks --> users
```

---

## Dettaglio Moduli

### 1. 🔐 CORE - Autenticazione e Sistema

```mermaid
erDiagram
    roles ||--o{ users : "has"
    departments ||--o{ users : "contains"
    users ||--o{ audit_logs : "generates"
    users ||--o{ announcements : "creates"

    roles {
        int id PK
        string name UK
        string label
        string description
        boolean is_static
        json permissions
        string default_home
    }

    users {
        int id PK
        string username UK
        string password_hash
        string full_name
        string email
        int role_id FK
        string role
        boolean is_active
        datetime created_at
        datetime last_seen
        int department_id FK
    }

    departments {
        int id PK
        string name UK
        string cost_center
    }

    audit_logs {
        int id PK
        int user_id FK
        string action
        text details
        string ip_address
        datetime timestamp
    }

    notifications {
        int id PK
        int recipient_user_id FK
        string recipient_role
        string notif_type
        string title
        text message
        string link_url
        boolean is_read
        datetime created_at
        datetime read_at
    }

    announcements {
        int id PK
        string title
        text message
        string priority
        int created_by FK
        datetime created_at
        datetime updated_at
        boolean is_active
        datetime expires_at
    }
```

---

### 2. 👔 HR SUITE - Gestione Risorse Umane

```mermaid
erDiagram
    departments ||--o{ employees : "has"
    users ||--o| employees : "linked_to"
    employees ||--o{ employee_documents : "has"
    employees ||--o{ employee_certifications : "has"
    employees ||--o{ employee_trainings : "has"
    employees ||--o{ medical_exams : "has"
    employees ||--o{ leave_requests : "submits"
    employees ||--o{ disciplinary_records : "has"
    employees ||--o{ employee_events : "has"
    employees ||--o{ employee_badges : "earns"

    employees {
        int id PK
        string fiscal_code UK
        string first_name
        string last_name
        int department_id FK
        string current_role
        string contract_type
        date contract_expiry
        date hiring_date
        boolean active
        int user_id FK
        int default_banchina_id FK
        string sector
    }

    employee_documents {
        int id PK
        int employee_id FK
        string doc_type
        string filename
        string file_path
        datetime uploaded_at
        int uploaded_by FK
    }

    employee_certifications {
        int id PK
        int employee_id FK
        string cert_type
        date issue_date
        date expiry_date
        string scan_path
        text notes
        datetime created_at
    }

    employee_trainings {
        int id PK
        int employee_id FK
        string training_name
        date training_date
        string trainer
        int duration_hours
        boolean passed
        text notes
    }

    medical_exams {
        int id PK
        int employee_id FK
        string exam_type
        date exam_date
        date next_exam_date
        string outcome
        string doctor_name
        text notes
    }

    leave_requests {
        int id PK
        int employee_id FK
        string leave_type
        date start_date
        date end_date
        text reason
        string status
        int requested_by FK
        int reviewed_by FK
        datetime reviewed_at
        text review_notes
    }

    employee_events {
        int id PK
        int employee_id FK
        string event_type
        int points_value
        text description
        date event_date
        int created_by FK
        int approved_by FK
        datetime approved_at
        string status
    }

    employee_badges {
        int id PK
        int employee_id FK
        string badge_name
        string badge_icon
        string badge_type
        datetime earned_at
        boolean is_active
    }
```

---

### 3. 🏭 FACTORY - Stabilimento e Macchinari

```mermaid
erDiagram
    banchine ||--o{ fleet_vehicles : "hosts"
    banchine ||--o{ shift_requirements : "has"
    machines ||--o{ machine_maintenances : "has"

    banchine {
        int id PK
        string code UK
        string name
        text description
        boolean is_active
    }

    machines {
        int id PK
        string name
        string model
        string serial_number
        string machine_type
        datetime purchase_date
        string status
        int department_id FK
        text notes
        boolean is_active
    }

    machine_maintenances {
        int id PK
        int machine_id FK
        string maint_type
        text description
        datetime due_date
        datetime completed_date
        int cost
        text technician_notes
        string status
        int created_by FK
    }

    facility_maintenances {
        int id PK
        string name
        string category
        string provider_name
        string contact_email
        string contact_phone
        datetime last_date
        datetime due_date
        int recurrence_months
        string status
        text notes
    }
```

---

### 4. 📅 SHIFTS - Pianificazione Turni

```mermaid
erDiagram
    banchine ||--o{ shift_requirements : "defines"
    shift_requirements ||--o{ shift_assignments : "has"
    employees ||--o{ shift_assignments : "works"

    shift_requirements {
        int id PK
        int banchina_id FK
        string role_name
        float quantity
        int kpi_target
        string kpi_sector
        boolean requires_kpi
        string note
    }

    shift_assignments {
        int id PK
        int employee_id FK
        int requirement_id FK
        datetime work_date
        string shift_type
        string start_time
        string end_time
        boolean is_extra
        text notes
        int assigned_by FK
        datetime checked_in_at
        datetime closed_at
        boolean is_closed
    }
```

---

### 5. 📦 LOGISTICS - Sistema Richieste Materiale

```mermaid
erDiagram
    logistics_material_types ||--o{ logistics_requests : "categorizes"
    users ||--o{ logistics_requests : "creates"
    users ||--o{ logistics_requests : "handles"
    logistics_requests ||--o{ logistics_messages : "has"
    employees ||--o{ logistics_performance : "measured_by"

    logistics_material_types {
        int id PK
        string label
        string icon
        string category
        boolean requires_description
        boolean is_active
        int display_order
    }

    logistics_requests {
        int id PK
        int material_type_id FK
        text custom_description
        int banchina_id FK
        int requester_id FK
        int quantity
        string status
        boolean is_urgent
        int assigned_to_id FK
        boolean is_forced_assignment
        string target_sector
        datetime created_at
        datetime taken_at
        int promised_eta_minutes
        datetime completed_at
        int points_awarded
        int penalty_applied
        boolean eta_respected
    }

    logistics_performance {
        int id PK
        int employee_id FK
        int month
        int year
        int missions_completed
        int total_points
        int penalties_received
        int avg_reaction_seconds
        int fastest_reaction_seconds
        float eta_accuracy_percent
    }

    logistics_messages {
        int id PK
        int request_id FK
        int sender_id FK
        string message_type
        text content
        datetime sent_at
        datetime read_at
    }

    logistics_preset_messages {
        int id PK
        string content
        string icon
        boolean is_active
        int display_order
    }

    logistics_eta_options {
        int id PK
        int minutes
        string label
        boolean is_active
        int display_order
    }

    logistics_config {
        int id PK
        string config_key UK
        string config_value
        string description
    }
```

---

### 6. 📊 PRODUCTION - KPI e Produzione

```mermaid
erDiagram
    kpi_configs ||--o{ kpi_entries : "tracks"
    production_sessions ||--o{ session_operators : "has"
    production_sessions ||--o{ downtime_logs : "logs"
    production_entries ||--o{ machine_downtimes : "records"

    kpi_configs {
        int id PK
        string sector_name UK
        string description
        int target_per_hour
        boolean is_active
        int display_order
    }

    kpi_entries {
        int id PK
        int kpi_config_id FK
        date entry_date
        string shift_type
        int banchina_id
        int target_pieces
        int actual_pieces
        int scrap_pieces
        int downtime_minutes
        string downtime_reason
        text notes
        int recorded_by FK
    }

    production_sessions {
        int id PK
        int requirement_id FK
        date session_date
        string shift_type
        int record_user_id FK
        int total_pieces
        int scrap_pieces
        int target_pieces
        int downtime_total_minutes
        text notes
        string status
        datetime closed_at
    }

    session_operators {
        int id PK
        int session_id FK
        int employee_id FK
        int actual_hours
        string role_in_session
    }

    downtime_logs {
        int id PK
        int session_id FK
        string reason
        datetime start_time
        datetime end_time
        int duration_minutes
        text notes
    }

    block_requests {
        int id PK
        string request_type
        string material
        string density
        string color
        int quantity
        text notes
        string status
        int created_by_id FK
        int processed_by_id FK
        datetime created_at
        datetime processed_at
    }
```

---

### 7. 🚛 FLEET - Parco Mezzi

```mermaid
erDiagram
    banchine ||--o{ fleet_vehicles : "hosts"
    fleet_vehicles ||--o{ maintenance_tickets : "has"

    fleet_vehicles {
        int id PK
        string vehicle_type
        string brand
        string model
        string internal_code
        string serial_number
        int banchina_id FK
        string assigned_operator
        boolean is_4_0
        string status
        text notes
        boolean is_active
    }

    maintenance_tickets {
        int id PK
        int vehicle_id FK
        int banchina_id FK
        string title
        text description
        string issue_type
        boolean is_safety_critical
        boolean is_banchina_blocked
        boolean is_unique_vehicle
        int priority_score
        text photo_paths
        string status
        int opened_by FK
        datetime opened_at
        int assigned_to FK
        datetime resolved_at
        text resolution_notes
        int resolution_time_minutes
        int closed_by FK
        datetime closed_at
    }
```

---

### 8. ✅ TASKS - Gestione Attività

```mermaid
erDiagram
    users ||--o{ tasks : "creates"
    users ||--o{ tasks : "assigned_to"
    tasks ||--o{ task_comments : "has"
    tasks ||--o{ task_attachments : "has"

    tasks {
        int id PK
        string title
        text description
        int assigned_to FK
        int assigned_by FK
        int priority
        datetime deadline
        string status
        json checklist
        string recurrence
        datetime created_at
        datetime acknowledged_at
        int acknowledged_by FK
        datetime started_at
        datetime completed_at
        int completed_by FK
        text reopen_reason
        int locked_by FK
        datetime locked_at
        string category
        json tags
    }

    task_comments {
        int id PK
        int task_id FK
        int user_id FK
        text content
        datetime created_at
    }

    task_attachments {
        int id PK
        int task_id FK
        int uploaded_by FK
        string filename
        string file_path
        string file_type
        int file_size
        datetime created_at
    }
```

---

## Riepilogo Relazioni Principali

| Tabella Origine | Relazione | Tabella Destinazione |
|-----------------|-----------|---------------------|
| `users` | N:1 | `roles` |
| `users` | N:1 | `departments` |
| `employees` | 1:1 | `users` |
| `employees` | N:1 | `departments` |
| `shift_assignments` | N:1 | `employees` |
| `shift_assignments` | N:1 | `shift_requirements` |
| `shift_requirements` | N:1 | `banchine` |
| `fleet_vehicles` | N:1 | `banchine` |
| `logistics_requests` | N:1 | `users` (requester) |
| `logistics_requests` | N:1 | `users` (assigned_to) |
| `logistics_requests` | N:1 | `logistics_material_types` |
| `tasks` | N:1 | `users` (assigned_to) |
| `tasks` | N:1 | `users` (assigned_by) |
| `kpi_entries` | N:1 | `kpi_configs` |

---

*Diagramma generato automaticamente - SL Enterprise v2.0*
