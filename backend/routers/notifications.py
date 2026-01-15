"""
SL Enterprise - Notifications Router
Centro notifiche.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db, Notification, User
from schemas import NotificationResponse, MessageResponse
from security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifiche"])


@router.get("/", response_model=List[NotificationResponse], summary="Le Mie Notifiche")
async def get_my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista notifiche per utente corrente."""
    # Build role-based filter: admins can see hr_manager notifications
    user_role = current_user.role
    role_filter = (Notification.recipient_role == user_role)
    
    # Super admins see EVERYTHING
    if user_role == 'super_admin':
        from sqlalchemy import or_
        role_filter = or_(
            Notification.recipient_role == 'super_admin',
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance',
            Notification.recipient_role == 'production_manager'
        )
    elif user_role == 'admin':
        from sqlalchemy import or_
        role_filter = or_(
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance'
        )
    
    query = db.query(Notification).filter(
        (Notification.recipient_user_id == current_user.id) | role_filter
    )
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications


@router.get("/unread-count", summary="Conteggio Non Lette")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Conteggio notifiche non lette."""
    from sqlalchemy import or_
    
    user_role = current_user.role
    role_filter = (Notification.recipient_role == user_role)
    
    if user_role == 'super_admin':
        role_filter = or_(
            Notification.recipient_role == 'super_admin',
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance',
            Notification.recipient_role == 'production_manager'
        )
    elif user_role == 'admin':
        role_filter = or_(
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance'
        )
    
    count = db.query(Notification).filter(
        (Notification.recipient_user_id == current_user.id) | role_filter,
        Notification.is_read == False
    ).count()
    
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=MessageResponse, summary="Segna come Letta")
async def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Segna notifica come letta."""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    
    notification.is_read = True
    notification.read_at = datetime.now()
    db.commit()
    
    return {"message": "Notifica segnata come letta", "success": True}


@router.patch("/read-all", response_model=MessageResponse, summary="Segna Tutte come Lette")
async def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Segna tutte le notifiche come lette."""
    from sqlalchemy import or_
    
    user_role = current_user.role
    role_filter = (Notification.recipient_role == user_role)
    
    if user_role == 'super_admin':
        role_filter = or_(
            Notification.recipient_role == 'super_admin',
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance',
            Notification.recipient_role == 'production_manager'
        )
    elif user_role == 'admin':
        role_filter = or_(
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance'
        )
    
    db.query(Notification).filter(
        (Notification.recipient_user_id == current_user.id) | role_filter,
        Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.now()}, synchronize_session=False)
    
    db.commit()
    
    return {"message": "Tutte le notifiche segnate come lette", "success": True}


@router.delete("/clear-read", response_model=MessageResponse, summary="Elimina Notifiche Lette")
async def clear_read_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina definitivamente tutte le notifiche lette dell'utente."""
    from sqlalchemy import or_
    
    user_role = current_user.role
    role_filter = (Notification.recipient_role == user_role)
    
    if user_role == 'super_admin':
        role_filter = or_(
            Notification.recipient_role == 'super_admin',
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance',
            Notification.recipient_role == 'production_manager'
        )
    elif user_role == 'admin':
        role_filter = or_(
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance'
        )
    
    deleted = db.query(Notification).filter(
        (Notification.recipient_user_id == current_user.id) | role_filter,
        Notification.is_read == True
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"message": f"{deleted} notifiche eliminate", "success": True}


@router.delete("/delete-all", response_model=MessageResponse, summary="Elimina TUTTE le Notifiche")
async def delete_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Elimina TUTTE le notifiche dell'utente (sia lette che non lette).
    ATTENZIONE: Azione distruttiva.
    """
    from sqlalchemy import or_
    
    user_role = current_user.role
    role_filter = (Notification.recipient_role == user_role)
    
    if user_role == 'super_admin':
        role_filter = or_(
            Notification.recipient_role == 'super_admin',
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance',
            Notification.recipient_role == 'production_manager'
        )
    elif user_role == 'admin':
        role_filter = or_(
            Notification.recipient_role == 'admin',
            Notification.recipient_role == 'hr_manager',
            Notification.recipient_role == 'maintenance'
        )
    
    deleted = db.query(Notification).filter(
        (Notification.recipient_user_id == current_user.id) | role_filter
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"message": f"Tutte le notifiche ({deleted}) sono state eliminate", "success": True}


@router.delete("/cleanup", response_model=MessageResponse, summary="Pulizia Automatica (Admin)")
async def cleanup_old_notifications(
    days_read: int = 7,
    days_unread: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Pulizia automatica notifiche vecchie (solo admin).
    - Notifiche LETTE più vecchie di 'days_read' giorni → eliminate
    - Notifiche NON LETTE più vecchie di 'days_unread' giorni → eliminate
    """
    if current_user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Solo admin può eseguire la pulizia")
    
    from datetime import timedelta
    
    now = datetime.now()
    cutoff_read = now - timedelta(days=days_read)
    cutoff_unread = now - timedelta(days=days_unread)
    
    # Delete old read notifications
    deleted_read = db.query(Notification).filter(
        Notification.is_read == True,
        Notification.created_at < cutoff_read
    ).delete(synchronize_session=False)
    
    # Delete very old unread notifications
    deleted_unread = db.query(Notification).filter(
        Notification.is_read == False,
        Notification.created_at < cutoff_unread
    ).delete(synchronize_session=False)
    
    db.commit()
    
    total = deleted_read + deleted_unread
    return {
        "message": f"Pulizia completata: {deleted_read} lette + {deleted_unread} non lette = {total} eliminate",
        "success": True
    }

