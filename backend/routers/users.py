"""
SL Enterprise - Users Router
Gestione utenti (CRUD).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timedelta

from database import get_db, User, AuditLog, Employee
from schemas import UserCreate, UserUpdate, UserResponse, MessageResponse
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
            "lastSeen": u.last_seen
        } 
        for u in online_users
    ]


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
    
    username = user.username
    db.delete(user)
    
    # Log azione
    log = AuditLog(
        user_id=current_user.id,
        action="DELETE_USER",
        details=f"Eliminato utente: {username}"
    )
    db.add(log)
    
    db.commit()
    
    return {"message": f"Utente {username} eliminato", "success": True}



