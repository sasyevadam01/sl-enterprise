"""
SL Enterprise - Disciplinary Router
Gestione storico disciplinare (elogi/sanzioni).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db, DisciplinaryRecord, Employee, User, Notification
from schemas import DisciplinaryCreate, DisciplinaryResponse, MessageResponse
from security import get_current_user, get_hr_or_admin

router = APIRouter(prefix="/disciplinary", tags=["Disciplinare"])


@router.get("/", response_model=List[DisciplinaryResponse], summary="Lista Record")
async def list_disciplinary_records(
    employee_id: int = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista storico disciplinare."""
    query = db.query(DisciplinaryRecord)
    
    if employee_id:
        query = query.filter(DisciplinaryRecord.employee_id == employee_id)
    
    if status_filter:
        query = query.filter(DisciplinaryRecord.status == status_filter)
    
    records = query.order_by(DisciplinaryRecord.event_date.desc()).all()
    return records


@router.get("/pending", response_model=List[DisciplinaryResponse], summary="In Attesa Approvazione")
async def get_pending_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Lista record in attesa di approvazione."""
    records = db.query(DisciplinaryRecord).filter(DisciplinaryRecord.status == "pending").all()
    return records


@router.post("/{employee_id}", response_model=DisciplinaryResponse, summary="Proponi Elogio/Sanzione")
async def propose_disciplinary(
    employee_id: int,
    record_data: DisciplinaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Proponi elogio o sanzione per dipendente."""
    # Verifica dipendente esiste
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Crea record
    record = DisciplinaryRecord(
        employee_id=employee_id,
        proposed_by=current_user.id,
        **record_data.model_dump()
    )
    db.add(record)
    
    # Notifica HR
    notification = Notification(
        recipient_role="hr_manager",
        notif_type="approval_req",
        title=f"Proposta {record_data.record_type}",
        message=f"Proposta per {employee.first_name} {employee.last_name}: {record_data.description[:50]}...",
        link_url=f"/disciplinary/{record.id}"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(record)
    
    return record


@router.patch("/{record_id}/approve", response_model=DisciplinaryResponse, summary="Approva")
async def approve_disciplinary(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Approva elogio/sanzione e aggiorna punteggio dipendente."""
    record = db.query(DisciplinaryRecord).filter(DisciplinaryRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record non trovato")
    
    if record.status != "pending":
        raise HTTPException(status_code=400, detail="Record gia processato")
    
    # Approva
    record.status = "approved"
    record.approved_by = current_user.id
    record.approved_at = datetime.now()
    
    # Aggiorna punteggio dipendente
    employee = db.query(Employee).filter(Employee.id == record.employee_id).first()
    if record.points_value > 0:
        employee.bonus_points += record.points_value
    else:
        employee.malus_points += abs(record.points_value)
    
    db.commit()
    db.refresh(record)
    
    return record


@router.patch("/{record_id}/reject", response_model=DisciplinaryResponse, summary="Rifiuta")
async def reject_disciplinary(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Rifiuta proposta disciplinare."""
    record = db.query(DisciplinaryRecord).filter(DisciplinaryRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record non trovato")
    
    if record.status != "pending":
        raise HTTPException(status_code=400, detail="Record gia processato")
    
    record.status = "rejected"
    record.approved_by = current_user.id
    record.approved_at = datetime.now()
    
    db.commit()
    db.refresh(record)
    
    return record
