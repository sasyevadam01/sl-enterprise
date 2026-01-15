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

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

class RoleResponse(RoleBase):
    id: int
    is_static: bool
    
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
        {"code": "view_dashboard", "label": "Dashboard HR", "category": "General"},
        {"code": "access_hr", "label": "Accesso HR Suite", "category": "HR"},
        {"code": "manage_employees", "label": "Gestione Dipendenti (Full)", "category": "HR"},
        {"code": "view_hr_employees", "label": "Visualizza Dipendenti", "category": "HR"},
        {"code": "view_hr_calendar", "label": "Visualizza Calendario", "category": "HR"},
        {"code": "manage_attendance", "label": "Gestire Assenze (Approvazione)", "category": "HR"},
        {"code": "manage_shifts", "label": "Gestire Turni (Planner)", "category": "HR"},
        {"code": "view_shifts_extended", "label": "Vedi oltre 2 settimane (Planner)", "category": "HR"},
        {"code": "manage_tasks", "label": "Gestire Task", "category": "HR"},
        {"code": "request_events", "label": "Richiedere Eventi (Nuova Richiesta)", "category": "HR"},
        {"code": "view_announcements", "label": "Visualizza Bacheca", "category": "HR"},
        {"code": "access_factory", "label": "Factory Monitor (Visualizzazione)", "category": "Factory"},
        {"code": "manage_kpi", "label": "Gestione Costi/KPI Setup", "category": "Factory"},
        {"code": "access_logistics", "label": "Gestione Resi", "category": "Logistics"},
        {"code": "admin_users", "label": "Gestione Utenti", "category": "Admin"},
        {"code": "admin_audit", "label": "Audit Logs", "category": "Admin"},
    ]
