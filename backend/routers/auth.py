"""
SL Enterprise - Auth Router
Endpoints per login e registrazione.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db, User, AuditLog, create_tables
from schemas import Token, UserCreate, UserResponse, MessageResponse
from security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["Autenticazione"])


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/token", response_model=Token, summary="Login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Effettua il login e restituisce un JWT token.
    
    - **username**: Nome utente
    - **password**: Password
    """
    # Cerca utente
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        # Log tentativo fallito
        if user:
            log = AuditLog(
                user_id=user.id,
                action="LOGIN_FAILED",
                details="Password errata",
                ip_address=request.client.host if request else None
            )
            db.add(log)
            db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password non corretti",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disattivato. Contatta l'amministratore."
        )
    
    # Genera token
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Log login riuscito
    log = AuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        ip_address=request.client.host if request else None
    )
    db.add(log)
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse, summary="Registra Super Admin")
async def register_first_admin(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Registra il primo Super Admin del sistema.
    
    ⚠️ **ATTENZIONE**: Questo endpoint funziona SOLO se non esistono utenti nel sistema.
    Una volta creato il primo admin, usare `/users` per creare altri utenti.
    """
    # Crea tabelle se non esistono
    create_tables()
    
    # Verifica che non esistano già utenti
    existing_users = db.query(User).count()
    if existing_users > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sistema già inizializzato. Usa /users per creare nuovi utenti."
        )
    
    # Verifica username unico
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username già esistente"
        )
    
    # Crea super admin
    new_user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        email=user_data.email,
        role="super_admin",  # Forza ruolo admin per il primo utente
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/init-db", response_model=MessageResponse, summary="Inizializza Database")
async def init_database():
    """
    Crea tutte le tabelle nel database.
    Utile per il primo avvio o dopo un reset.
    """
    try:
        create_tables()
        return {"message": "Database inizializzato con successo!", "success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore inizializzazione DB: {str(e)}"
        )
