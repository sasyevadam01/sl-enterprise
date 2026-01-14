"""
SL Enterprise - Announcements Router
Bacheca annunci aziendali.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db, Announcement, User
from security import get_current_user

router = APIRouter(prefix="/announcements", tags=["Annunci"])


# ============================================================
# SCHEMAS
# ============================================================

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    priority: str = "info"  # urgent, important, info
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str
    priority: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime]
    author_name: str

    class Config:
        from_attributes = True


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/", response_model=List[AnnouncementResponse], summary="Lista Annunci")
async def get_announcements(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Restituisce tutti gli annunci.
    - active_only=True: Solo annunci attivi e non scaduti
    - active_only=False: Tutti (per admin)
    """
    query = db.query(Announcement)
    
    if active_only:
        now = datetime.utcnow()
        query = query.filter(
            Announcement.is_active == True,
            (Announcement.expires_at == None) | (Announcement.expires_at > now)
        )
    
    query = query.order_by(desc(Announcement.created_at))
    announcements = query.all()
    
    result = []
    for ann in announcements:
        author = db.query(User).filter(User.id == ann.created_by).first()
        result.append(AnnouncementResponse(
            id=ann.id,
            title=ann.title,
            message=ann.message,
            priority=ann.priority,
            is_active=ann.is_active,
            created_at=ann.created_at,
            updated_at=ann.updated_at,
            expires_at=ann.expires_at,
            author_name=author.full_name if author else "Sistema"
        ))
    
    return result


@router.get("/urgent", summary="Annunci Urgenti")
async def get_urgent_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restituisce solo gli annunci urgenti attivi (per widget)."""
    now = datetime.utcnow()
    announcements = db.query(Announcement).filter(
        Announcement.is_active == True,
        Announcement.priority == "urgent",
        (Announcement.expires_at == None) | (Announcement.expires_at > now)
    ).order_by(desc(Announcement.created_at)).limit(3).all()
    
    return [{
        "id": ann.id,
        "title": ann.title,
        "priority": ann.priority
    } for ann in announcements]


@router.get("/{announcement_id}", response_model=AnnouncementResponse, summary="Dettaglio Annuncio")
async def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restituisce dettaglio di un singolo annuncio."""
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    author = db.query(User).filter(User.id == ann.created_by).first()
    
    return AnnouncementResponse(
        id=ann.id,
        title=ann.title,
        message=ann.message,
        priority=ann.priority,
        is_active=ann.is_active,
        created_at=ann.created_at,
        updated_at=ann.updated_at,
        expires_at=ann.expires_at,
        author_name=author.full_name if author else "Sistema"
    )


@router.post("/", response_model=AnnouncementResponse, summary="Crea Annuncio")
async def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea un nuovo annuncio.
    Solo super_admin e hr_manager possono creare annunci.
    """
    if current_user.role not in ["super_admin", "hr_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo Admin possono creare annunci"
        )
    
    announcement = Announcement(
        title=data.title,
        message=data.message,
        priority=data.priority,
        expires_at=data.expires_at,
        created_by=current_user.id
    )
    
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        message=announcement.message,
        priority=announcement.priority,
        is_active=announcement.is_active,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
        expires_at=announcement.expires_at,
        author_name=current_user.full_name
    )


@router.put("/{announcement_id}", response_model=AnnouncementResponse, summary="Modifica Annuncio")
async def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifica un annuncio esistente. Solo Admin."""
    if current_user.role not in ["super_admin", "hr_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo Admin possono modificare annunci"
        )
    
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    # Aggiorna solo i campi forniti
    if data.title is not None:
        ann.title = data.title
    if data.message is not None:
        ann.message = data.message
    if data.priority is not None:
        ann.priority = data.priority
    if data.is_active is not None:
        ann.is_active = data.is_active
    if data.expires_at is not None:
        ann.expires_at = data.expires_at
    
    db.commit()
    db.refresh(ann)
    
    author = db.query(User).filter(User.id == ann.created_by).first()
    
    return AnnouncementResponse(
        id=ann.id,
        title=ann.title,
        message=ann.message,
        priority=ann.priority,
        is_active=ann.is_active,
        created_at=ann.created_at,
        updated_at=ann.updated_at,
        expires_at=ann.expires_at,
        author_name=author.full_name if author else "Sistema"
    )


@router.delete("/{announcement_id}", summary="Archivia Annuncio")
async def archive_announcement(
    announcement_id: int,
    permanent: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Archivia (is_active=False) o elimina permanentemente un annuncio.
    Solo Admin.
    """
    if current_user.role not in ["super_admin", "hr_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo Admin possono archiviare annunci"
        )
    
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    if permanent:
        db.delete(ann)
        db.commit()
        return {"message": "Annuncio eliminato definitivamente"}
    else:
        ann.is_active = False
        db.commit()
        return {"message": "Annuncio archiviato"}
