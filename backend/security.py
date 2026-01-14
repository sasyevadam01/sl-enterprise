"""
SL Enterprise - Security & Authentication
JWT Token management e password hashing.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from database import get_db, User
from schemas import TokenData

load_dotenv()

# ============================================================
# CONFIGURAZIONE
# ============================================================

# Chiave segreta per JWT (CAMBIA IN PRODUZIONE!)
SECRET_KEY = os.getenv("SECRET_KEY", "sl-enterprise-super-secret-key-change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("TOKEN_EXPIRE_MINUTES", "480"))  # 8 ore default

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# ============================================================
# PASSWORD UTILS (usando bcrypt direttamente)
# ============================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica password in chiaro contro hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Genera hash bcrypt della password."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


# ============================================================
# JWT TOKEN UTILS
# ============================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JWT token.
    
    Args:
        data: Dati da includere nel token (es. {"sub": username, "role": role})
        expires_delta: Durata validità token
    
    Returns:
        Token JWT encoded
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """
    Decodifica e valida un JWT token.
    
    Returns:
        TokenData se valido, None altrimenti
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None:
            return None
            
        return TokenData(username=username, role=role)
    except JWTError:
        return None


# ============================================================
# DEPENDENCIES (Per proteggere endpoints)
# ============================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency che estrae l'utente corrente dal token JWT.
    Usalo come: current_user: User = Depends(get_current_user)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenziali non valide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = decode_token(token)
    if token_data is None:
        raise credentials_exception
    
    # Load user WITH role relationship for permissions
    from sqlalchemy.orm import joinedload
    user = db.query(User).options(joinedload(User.role_obj)).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utente disattivato"
        )
    
    return user


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency che richiede ruolo super_admin."""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso riservato agli amministratori"
        )
    return current_user


async def get_hr_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency che richiede ruolo hr_manager o super_admin."""
    if current_user.role not in ["super_admin", "hr_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso riservato a HR Manager o Admin"
        )
    return current_user
