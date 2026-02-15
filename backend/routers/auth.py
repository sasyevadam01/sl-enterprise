"""
SL Enterprise - Auth Router
Endpoints per login, registrazione e PIN security.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import re

from database import get_db, User, AuditLog, create_tables
from schemas import Token, UserCreate, UserResponse, MessageResponse, PinSetup, PinVerify
from security import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Autenticazione"])


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/token", summary="Login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Effettua il login e restituisce un JWT token.
    
    - **username**: Nome utente
    - **password**: Password
    
    Risposta include `has_pin` e `pin_required` per gestire il flusso PIN.
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
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "has_pin": user.pin_hash is not None,
        "pin_required": user.pin_required if user.pin_required is not None else True
    }


@router.post("/setup-pin", response_model=MessageResponse, summary="Imposta PIN")
async def setup_pin(
    pin_data: PinSetup,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Imposta il PIN a 4 cifre per l'utente corrente (primo accesso).
    
    - **pin**: PIN a 4 cifre numeriche
    """
    # Validazione PIN: esattamente 4 cifre
    if not re.match(r'^\d{4}$', pin_data.pin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Il PIN deve essere esattamente 4 cifre numeriche"
        )
    
    # Re-query utente dalla sessione corrente per evitare problemi di sessione
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Hash del PIN con bcrypt (stessa funzione delle password)
    user.pin_hash = get_password_hash(pin_data.pin)
    
    # Log
    log = AuditLog(
        user_id=user.id,
        action="PIN_SETUP",
        details="PIN configurato con successo"
    )
    db.add(log)
    db.commit()
    
    return {"message": "PIN configurato con successo!", "success": True}


@router.post("/verify-pin", response_model=MessageResponse, summary="Verifica PIN")
async def verify_pin(
    pin_data: PinVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica il PIN a 4 cifre dopo il login con password.
    
    - **pin**: PIN a 4 cifre
    """
    # Re-query utente dalla sessione corrente
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    if not user.pin_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN non configurato. Usa /auth/setup-pin"
        )
    
    # Verifica PIN
    if not verify_password(pin_data.pin, user.pin_hash):
        # Log tentativo fallito
        log = AuditLog(
            user_id=user.id,
            action="PIN_VERIFY_FAILED",
            details="PIN errato"
        )
        db.add(log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN non corretto"
        )
    
    # Log verifica riuscita
    log = AuditLog(
        user_id=user.id,
        action="PIN_VERIFY_SUCCESS",
        details="PIN verificato"
    )
    db.add(log)
    db.commit()
    
    return {"message": "PIN verificato con successo!", "success": True}


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
