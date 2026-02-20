"""
SL Enterprise - Role Seed Script
Crea i ruoli di default se non esistono.
Eseguire: python init_roles.py
"""
from database import SessionLocal, Role

DEFAULT_ROLES = [
    {
        "name": "super_admin",
        "label": "Super Admin",
        "description": "Accesso completo a tutte le funzionalità",
        "is_static": True,
        "permissions": ["*"],
        "default_home": "/dashboard"
    },
    {
        "name": "admin",
        "label": "Amministratore",
        "description": "Gestione utenti e configurazioni",
        "is_static": True,
        "permissions": ["view_dashboard", "manage_employees", "view_hr_management", "view_approvals", "manage_attendance", "view_hr_calendar", "request_events", "manage_tasks", "manage_shifts", "view_announcements", "access_factory", "manage_kpi", "admin_users", "admin_audit", "supervise_logistics", "request_logistics", "manage_production_config", "view_production_reports", "perform_checklists", "view_checklist_history", "manage_logistics_config", "block_vehicles"],
        "default_home": "/dashboard"
    },
    {
        "name": "hr_manager",
        "label": "HR Manager",
        "description": "Gestione risorse umane",
        "is_static": True,
        "permissions": ["view_dashboard", "manage_employees", "view_hr_management", "view_approvals", "manage_attendance", "view_hr_calendar", "request_events", "manage_tasks", "manage_shifts", "view_announcements"],
        "default_home": "/dashboard"
    },
    {
        "name": "factory_controller",
        "label": "Responsabile Fabbrica",
        "description": "Gestione produzione e KPI",
        "is_static": True,
        "permissions": ["access_factory", "manage_kpi", "manage_tasks", "view_announcements"],
        "default_home": "/hr/tasks"
    },
    {
        "name": "coordinator",
        "label": "Coordinatore",
        "description": "Gestione turni e task del team",
        "is_static": False,
        "permissions": ["manage_shifts", "manage_tasks", "view_announcements", "request_events", "view_hr_calendar", "supervise_logistics", "view_dashboard", "request_logistics", "manage_logistics_pool", "block_vehicles"],
        "default_home": "/hr/tasks"
    },
    {
        "name": "record_user",
        "label": "Utente Base",
        "description": "Accesso solo da app mobile",
        "is_static": True,
        "permissions": [],
        "default_home": "/mobile/dashboard"
    },
    {
        "name": "order_user",
        "label": "Order User",
        "description": "Gestione ordini Live Production e Richieste Materiale",
        "is_static": False,
        "permissions": ["create_production_orders", "request_logistics"],
        "default_home": "/production/orders"
    },
    {
        "name": "block_supply",
        "label": "Block Supply",
        "description": "Gestione blocchi fornitura",
        "is_static": False,
        "permissions": ["manage_production_supply"],
        "default_home": "/production/blocks"
    },
    {
        "name": "warehouse_operator",
        "label": "Magazziniere",
        "description": "Gestione richieste materiali - Pool logistica",
        "is_static": False,
        "permissions": ["manage_logistics_pool", "request_logistics", "perform_checklists", "view_announcements"],
        "default_home": "/logistics/pool"
    },
    {
        "name": "security",
        "label": "Sicurezza",
        "description": "Responsabile Sicurezza e Controlli",
        "is_static": False,
        "permissions": ["view_dashboard", "view_announcements", "view_checklist_history", "manage_tasks", "perform_checklists", "access_factory", "manage_shifts", "block_vehicles"],
        "default_home": "/dashboard"
    },
]

def seed_roles():
    db = SessionLocal()
    try:
        for role_data in DEFAULT_ROLES:
            existing = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing:
                new_role = Role(**role_data)
                db.add(new_role)
                print(f"[OK] Creato ruolo: {role_data['label']}")
            else:
                # Update permissions and default_home for existing roles to match new specs
                updated = False
                if role_data.get("permissions") and existing.permissions != role_data["permissions"]:
                    existing.permissions = role_data["permissions"]
                    updated = True
                
                if role_data.get("default_home") and existing.default_home != role_data["default_home"]:
                    existing.default_home = role_data["default_home"]
                    updated = True
                
                if updated:
                    print(f"[UPD] Aggiornato ruolo: {role_data['label']}")
        
        db.commit()
        print("[DONE] Seed ruoli completato!")
    except Exception as e:
        print(f"[ERR] Errore: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_roles()
