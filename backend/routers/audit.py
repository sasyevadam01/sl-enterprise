from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db, AuditLog, User
from schemas import MessageResponse # or create AuditResponse
from security import get_current_admin

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("/", summary="Lista Log Audit")
async def list_logs(
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Lista dei log delle azioni di sistema (Solo Super Admin)."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    # Arricchisci con nome utente per non restituire solo ID
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "username": log.user.username if log.user else "System",
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp
        })
    return result
