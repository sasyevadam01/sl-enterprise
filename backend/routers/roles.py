from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel

from database import get_db, Role, User, AuditLog
from security import get_current_user, get_current_admin

router = APIRouter(prefix="/roles", tags=["Ruoli & Permessi"])

# --- SCHEMAS ---

class RoleBase(BaseModel):
    name: str 
    label: str
    description: Optional[str] = None
    permissions: List[str] = []
    default_home: Optional[str] = "/hr/tasks"

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    default_home: Optional[str] = None

class RoleResponse(RoleBase):
    id: int
    is_static: bool
    default_home: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- ENDPOINTS ---

@router.get("/", response_model=List[RoleResponse], summary="Lista Ruoli")
async def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Visible to all authenticated? or just Admin? let's say Admin or anyone who needs to see roles
):
    """Restituisce tutti i ruoli configurati con i relativi permessi."""
    return db.query(Role).all()

@router.post("/", response_model=RoleResponse, summary="Crea Ruolo")
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Crea un nuovo ruolo custom."""
    existing = db.query(Role).filter(Role.name == role_data.name).first()
    if existing:
        raise HTTPException(400, "Nome ruolo già esistente")
        
    new_role = Role(
        name=role_data.name,
        label=role_data.label,
        description=role_data.description,
        is_static=False,
        permissions=role_data.permissions
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    
    # Log
    log = AuditLog(user_id=current_user.id, action="CREATE_ROLE", details=f"Created role {new_role.label}")
    db.add(log)
    db.commit()
    
    return new_role

@router.patch("/{role_id}", response_model=RoleResponse, summary="Aggiorna Permessi Ruolo")
async def update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Aggiorna etichetta, descrizione o MATRICE PERMESSI."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Ruolo non trovato")
        
    if role.is_static and data.permissions is not None:
        # Optional: Prevent changing permissions of Static roles? 
        # User requested to modify permissions matrix, so we allow it even for static roles usually, 
        # OR we just prevent deleting the role. 
        # Let's allow modifying permissions for everyone, but notify.
        pass

    if data.label: role.label = data.label
    if data.description: role.description = data.description
    if data.permissions is not None: role.permissions = data.permissions
    if data.default_home is not None: role.default_home = data.default_home
    
    db.commit()
    db.refresh(role)
    
    log = AuditLog(user_id=current_user.id, action="UPDATE_ROLE", details=f"Updated permissions for {role.label}")
    db.add(log)
    db.commit()
    
    return role

@router.delete("/{role_id}", summary="Elimina Ruolo")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Ruolo non trovato")
        
    if role.is_static:
        raise HTTPException(400, "Impossibile eliminare i ruoli di sistema.")
        
    # Check usage
    users_count = db.query(User).filter(User.role_id == role_id).count()
    if users_count > 0:
        raise HTTPException(400, f"Impossibile eliminare: {users_count} utenti assegnati a questo ruolo.")
        
    db.delete(role)
    db.commit()
    
    return {"message": "Ruolo eliminato"}

@router.get("/definitions", summary="Lista Definizioni Permessi")
async def get_permission_definitions(current_user: User = Depends(get_current_user)):
    """Restituisce la lista di tutti i permessi disponibili nel sistema per la UI."""
    return [
        {"code": "view_dashboard", "label": "Dashboard HR", "category": "General", "description": "Mostra la Dashboard principale con statistiche e KPI aziendali."},
        {"code": "view_coordinator_suite", "label": "Vista Coordinator", "category": "General", "description": "Mostra la sidebar in modalità Coordinator (semplificata) invece che HR Suite."},
        {"code": "view_operativity_suite", "label": "Vista Operativity", "category": "General", "description": "Mostra la sidebar in modalità Operativity Suite per operatori produzione."},
        {"code": "app_only_access", "label": "Solo App Mobile", "category": "General", "description": "Utente con accesso limitato solo da app mobile per inserimento dati."},
        {"code": "manage_employees", "label": "Gestione Dipendenti (Full)", "category": "HR", "description": "Permette visualizzare, creare, modificare ed eliminare i profili dei dipendenti."},
        {"code": "view_hr_management", "label": "Visualizza Gestione HR", "category": "HR", "description": "Mostra la sezione Gestione HR nella sidebar (pagina ferie, bonus, malus, ecc)."},
        {"code": "view_approvals", "label": "Visualizza Centro Approvazioni", "category": "HR", "description": "Mostra il Centro Approvazioni nella sidebar per vedere le richieste in attesa."},
        {"code": "view_hr_calendar", "label": "Visualizza Calendario", "category": "HR", "description": "Mostra il Calendario HR con ferie, permessi e scadenze."},
        {"code": "manage_attendance", "label": "Gestire Assenze", "category": "HR", "description": "Permette approvare o rifiutare richieste di ferie e permessi nel Centro Approvazioni."},
        {"code": "manage_shifts", "label": "Gestire Turni", "category": "HR", "description": "Accesso al Planner per assegnare e modificare i turni di lavoro."},
        {"code": "manage_tasks", "label": "Gestire Task", "category": "HR", "description": "Accesso alla Task Board per creare, assegnare e gestire attività."},
        {"code": "request_events", "label": "Richiedere Eventi", "category": "HR", "description": "Permette creare nuove richieste HR (ferie, permessi, malattie)."},
        {"code": "view_announcements", "label": "Visualizza Bacheca", "category": "HR", "description": "Mostra la Bacheca Annunci con le comunicazioni aziendali."},
        {"code": "access_factory", "label": "Factory Monitor", "category": "Factory", "description": "Accesso alla sezione Fabbrica: Dashboard Produzione, Manutenzioni, Inserimento KPI."},
        {"code": "manage_kpi", "label": "Gestione KPI Avanzata", "category": "Factory", "description": "Permette configurare i parametri KPI e accedere al Calcolo Costi."},
        {"code": "create_production_orders", "label": "Richiedere Blocchi", "category": "Production", "description": "Permette di creare richieste di prelievo blocchi (Order User)."},
        {"code": "manage_production_supply", "label": "Gestire Prelievi", "category": "Production", "description": "Permette di prendere in carico e consegnare i blocchi (Block Supply)."},
        {"code": "access_logistics", "label": "Gestione Resi", "category": "Logistics", "description": "Accesso alla sezione Logistica per gestire i resi."},
        {"code": "admin_users", "label": "Gestione Utenti", "category": "Admin", "description": "Accesso all'area Admin per gestire utenti e configurazioni di sistema."},
        {"code": "admin_audit", "label": "Audit Logs", "category": "Admin", "description": "Visualizza il registro di tutte le azioni critiche eseguite nel sistema."},
    ]


