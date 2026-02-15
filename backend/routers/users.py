"""
SL Enterprise - Users Router
Gestione utenti (CRUD).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timedelta

from database import get_db, User, AuditLog, Employee
from schemas import UserCreate, UserUpdate, UserResponse, MessageResponse, LocationUpdate
from security import (
    get_current_user, 
    get_current_admin,
    get_password_hash
)

router = APIRouter(prefix="/users", tags=["Utenti"])

# ============================================================
# LIVE STATUS TRACKER (Moved here for priority)
# ============================================================

@router.post("/heartbeat", summary="Aggiorna stato online")
async def heartbeat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint chiamato periodicamente dal frontend per segnalare presenza.
    """
    current_user.last_seen = datetime.utcnow()
    db.commit()
    return {"status": "alive"}


@router.get("/online", summary="Utenti Online")
async def get_online_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ritorna la lista utenti attivi negli ultimi 2 minuti.
    """
    threshold = datetime.utcnow() - timedelta(minutes=2)
    
    online_users = db.query(User).filter(
        User.last_seen >= threshold,
        User.is_active == True
    ).all()
    
    return [
        {
            "id": u.id,
            "username": u.username,
            "fullName": u.full_name,
            "role": u.role,
            "lastSeen": u.last_seen,
            "lat": u.last_lat,
            "lon": u.last_lon,
            "lastUpdate": u.last_location_update
        } 
        for u in online_users
    ]


@router.patch("/me/location", summary="Aggiorna Posizione GPS")
async def update_location(
    location: LocationUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Riceve le coordinate GPS dall'app client e aggiorna l'ultima posizione nota.
    """
    current_user.last_lat = location.latitude
    current_user.last_lon = location.longitude
    current_user.last_location_update = datetime.utcnow()
    # Aggiorna anche last_seen per mantenerlo online
    current_user.last_seen = datetime.utcnow()
    
    db.commit()
    return {"status": "ok", "lat": location.latitude, "lon": location.longitude}


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/me", response_model=UserResponse, summary="Profilo Utente Corrente")
async def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Restituisce i dati dell'utente attualmente autenticato.
    """
    return current_user


@router.get("/", response_model=List[UserResponse], summary="Lista Tutti gli Utenti")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Restituisce la lista di tutti gli utenti.
    
    ⚠️ **Admin, HR, Coordinator**
    """
    # Check permissions
    is_authorized = current_user.role in ["super_admin", "admin", "hr_manager", "factory_controller", "coordinator"]
    if not is_authorized:
         raise HTTPException(status_code=403, detail="Permesso negato")

    users = db.query(User).options(joinedload(User.employee)).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse, summary="Dettaglio Utente")
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Restituisce i dettagli di un utente specifico.
    
    ⚠️ **Solo Super Admin**
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    return user


@router.post("/", response_model=UserResponse, summary="Crea Nuovo Utente")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Crea un nuovo utente nel sistema.
    
    ⚠️ **Solo Super Admin**
    """
    # Verifica username unico
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username già esistente"
        )
    
    # Crea utente
    from database import Role
    
    # Lookup role_id from role name
    role_obj = db.query(Role).filter(Role.name == user_data.role).first()
    if not role_obj:
        raise HTTPException(400, f"Ruolo '{user_data.role}' non trovato. Esegui init_roles.py")
    
    new_user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        email=user_data.email,
        role=user_data.role,
        role_id=role_obj.id,  # <-- FIX: Assign role_id for RBAC
        department_id=user_data.department_id,
        is_active=True
    )
    
    db.add(new_user)
    db.flush()  # Get ID before linking
    
    # Link to employee if provided
    if user_data.employee_id:
        employee = db.query(Employee).filter(Employee.id == user_data.employee_id).first()
        if employee:
            employee.user_id = new_user.id
    
    # Log azione
    log = AuditLog(
        user_id=current_user.id,
        action="CREATE_USER",
        details=f"Creato utente: {user_data.username} con ruolo {user_data.role}"
    )
    db.add(log)
    
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.patch("/{user_id}", response_model=UserResponse, summary="Modifica Utente")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Modifica dati utente (username, password, ruolo, ecc).
    
    ⚠️ **Solo Super Admin**
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )

    # Verifica unicità username se cambiato
    if user_data.username and user_data.username != user.username:
        existing = db.query(User).filter(User.username == user_data.username).first()
        if existing:
            raise HTTPException(400, "Username già in uso")
        user.username = user_data.username

    if user_data.full_name:
        user.full_name = user_data.full_name
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.role:
        from database import Role 
        # Check if role exists and update relation
        role_obj = db.query(Role).filter(Role.name == user_data.role).first()
        if role_obj:
            user.role = user_data.role
            user.role_id = role_obj.id
        else:
             raise HTTPException(400, "Ruolo non valido")

    if user_data.department_id is not None:
        user.department_id = user_data.department_id
    
    if user_data.password:
        user.password_hash = get_password_hash(user_data.password)

    # Handle Employee Link Update
    if user_data.employee_id is not None:
        # Import Employee locally to avoid circular imports
        from models.hr import Employee
        
        # 1. Unlink any employee currently linked to this user (Force Cleanup)
        # Instead of relying on user.employee (which might be cached or list), query explicit
        current_linked = db.query(Employee).filter(Employee.user_id == user.id).all()
        for emp in current_linked:
            emp.user_id = None
            
        # 2. Link new employee if ID > 0
        if user_data.employee_id > 0:
            new_emp = db.query(Employee).filter(Employee.id == user_data.employee_id).first()
            if new_emp:
                # Check if this employee is already taken by ANOTHER user?
                if new_emp.user_id and new_emp.user_id != user.id:
                    raise HTTPException(400, "Dipendente già collegato ad un altro utente")
                new_emp.user_id = user.id
            else:
                 raise HTTPException(400, "Dipendente non trovato")

    db.commit()
    db.refresh(user)

    log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER",
        details=f"Aggiornato utente: {user.username}"
    )
    db.add(log)
    db.commit()

    return user


@router.patch("/{user_id}/deactivate", response_model=MessageResponse, summary="Disattiva Utente")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Disattiva un utente (soft delete).
    
    ⚠️ **Solo Super Admin**
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non puoi disattivare te stesso!"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    user.is_active = False
    
    # Log azione
    log = AuditLog(
        user_id=current_user.id,
        action="DEACTIVATE_USER",
        details=f"Disattivato utente: {user.username}"
    )
    db.add(log)
    
    db.commit()
    
    return {"message": f"Utente {user.username} disattivato", "success": True}


@router.patch("/{user_id}/activate", response_model=MessageResponse, summary="Riattiva Utente")
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Riattiva un utente precedentemente disattivato.
    
    ⚠️ **Solo Super Admin**
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    user.is_active = True
    
    # Log azione
    log = AuditLog(
        user_id=current_user.id,
        action="ACTIVATE_USER",
        details=f"Riattivato utente: {user.username}"
    )
    db.add(log)
    
    db.commit()
    
    return {"message": f"Utente {user.username} riattivato", "success": True}


@router.delete("/{user_id}", response_model=MessageResponse, summary="Elimina Utente")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Elimina permanentemente un utente dal sistema.
    
    ⚠️ **Solo Super Admin**
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non puoi eliminare te stesso!"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    if user.role == 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non puoi eliminare un Super Admin!"
        )
    
    # 1. Unlink from Employee (if any)
    from models.hr import Employee
    emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if emp:
        emp.user_id = None
        db.add(emp) 
    
    # 2. Manual Cascade / Cleanup
    try:
        username = user.username
        
        # --- A. DELETE STRICT DEPENDENCIES (Where user_id is NOT NULL) ---
        
        # Audit Logs
        db.query(AuditLog).filter(AuditLog.user_id == user.id).delete(synchronize_session=False)
        
        # Task Comments & Attachments
        from models.tasks import TaskComment, TaskAttachment, Task
        db.query(TaskComment).filter(TaskComment.user_id == user.id).delete(synchronize_session=False)
        db.query(TaskAttachment).filter(TaskAttachment.uploaded_by == user.id).delete(synchronize_session=False)
        
        # Notifications (Create/Receive)
        from models.core import Notification
        db.query(Notification).filter(Notification.recipient_user_id == user.id).delete(synchronize_session=False)
        
        # --- B. HANDLE TASKS & ANNOUNCEMENTS (Created by user) ---
        # If user created tasks, we can either delete them or reassign. To be clean, if user is deleted, maybe wipe their tasks?
        # Or better -> Reassign to Admin? Let's Delete for "Clean" approach requested.
        db.query(Task).filter(Task.assigned_by == user.id).delete(synchronize_session=False) 
        # Also tasks assigned TO user -> Set to NULL
        db.query(Task).filter(Task.assigned_to == user.id).update({"assigned_to": None}, synchronize_session=False)
        
        # Announcements
        from models.core import Announcement
        db.query(Announcement).filter(Announcement.created_by == user.id).delete(synchronize_session=False)

        # Logistics (Requests, Messages, etc might be linked). 
        # Ideally we should check EVERYTHING but for now this covers the main blockers.
        
        # --- C. DELETE USER ---
        db.delete(user)
        db.commit()
        
        # Log by Current Admin
        log = AuditLog(
            user_id=current_user.id,
            action="DELETE_USER",
            details=f"Eliminato utente e dati collegati: {username}"
        )
        db.add(log)
        db.commit()
        
        return {"message": f"Utente {username} e tutti i dati collegati eliminati.", "success": True}
        
    except Exception as e:
        db.rollback()
        # Fallback if we missed something
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Errore eliminazione forzata: {str(e)}"
        )


# ============================================================
# PIN MANAGEMENT (Admin Only)
# ============================================================

@router.patch("/{user_id}/reset-pin", response_model=MessageResponse, summary="Reset PIN Utente")
async def reset_user_pin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Resetta il PIN di un utente (lo forza a reimpostarlo al prossimo login).
    
    ⚠️ **Solo Super Admin**
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    user.pin_hash = None  # Rimuovi PIN → al prossimo login dovrà reimpostarlo
    
    log = AuditLog(
        user_id=current_user.id,
        action="PIN_RESET",
        details=f"PIN resettato per utente: {user.username}"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"PIN di {user.username} resettato. Dovrà reimpostarlo al prossimo accesso.", "success": True}


@router.patch("/{user_id}/set-pin", response_model=MessageResponse, summary="Imposta PIN Utente")
async def set_user_pin(
    user_id: int,
    pin_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Admin imposta un PIN specifico per un utente.
    
    ⚠️ **Solo Super Admin**

    - **pin**: PIN a 4 cifre numeriche
    """
    import re
    pin = pin_data.get("pin", "")
    
    if not re.match(r'^\d{4}$', pin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Il PIN deve essere esattamente 4 cifre numeriche"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    user.pin_hash = get_password_hash(pin)
    
    log = AuditLog(
        user_id=current_user.id,
        action="PIN_SET_BY_ADMIN",
        details=f"PIN impostato dall'admin per utente: {user.username}"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"PIN impostato per {user.username}.", "success": True}
