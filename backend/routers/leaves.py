"""
SL Enterprise - Leaves Router
Gestione ferie e permessi con workflow approvativo.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db, LeaveRequest, Employee, User, Notification
from schemas import (
    LeaveRequestCreate, LeaveRequestResponse, LeaveReviewRequest, LeaveRequestUpdate, MessageResponse
)
from security import get_current_user, get_hr_or_admin

router = APIRouter(prefix="/leaves", tags=["Ferie e Permessi"])


# ============================================================
# RICHIESTE FERIE/PERMESSI
# ============================================================

@router.get("/", response_model=List[LeaveRequestResponse], summary="Lista Richieste")
async def list_leave_requests(
    status_filter: str = None,
    employee_id: int = None,
    start_date: datetime = None,
    end_date: datetime = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista richieste ferie/permessi con filtri opzionali."""
    query = db.query(LeaveRequest)
    
    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)
    
    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)

    if start_date and end_date:
        # Overlap logic: leave_start <= end_date AND leave_end >= start_date
        query = query.filter(
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        )
    
    from sqlalchemy.orm import joinedload
    requests = query.options(
        joinedload(LeaveRequest.requester),
        joinedload(LeaveRequest.reviewer)
    ).order_by(LeaveRequest.start_date.asc()).offset(skip).limit(limit).all()
    return requests


@router.get("/pending", response_model=List[LeaveRequestResponse], summary="Richieste in Attesa")
async def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Lista richieste in attesa di approvazione (HR only)."""
    from sqlalchemy.orm import joinedload
    requests = db.query(LeaveRequest).options(joinedload(LeaveRequest.requester)).filter(LeaveRequest.status == "pending").all()
    return requests


@router.post("/", response_model=LeaveRequestResponse, summary="Nuova Richiesta")
async def create_leave_request(
    employee_id: int,
    request_data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea nuova richiesta ferie/permesso."""
    # Verifica dipendente esiste
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Crea richiesta
    leave_req = LeaveRequest(
        employee_id=employee_id,
        requested_by=current_user.id,  # Track who made the request
        **request_data.model_dump()
    )
    db.add(leave_req)
    
    # Crea notifica per HR
    notification = Notification(
        recipient_role="hr_manager",
        notif_type="approval_req",
        title="Nuova richiesta permesso",
        message=f"Richiesta {request_data.leave_type} da {employee.first_name} {employee.last_name} - Richiesto da: {current_user.full_name}",
        link_url=f"/hr/approvals"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(leave_req)
    
    return leave_req


@router.patch("/{request_id}/review", response_model=LeaveRequestResponse, summary="Approva/Rifiuta")
async def review_leave_request(
    request_id: int,
    review_data: LeaveReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Approva o rifiuta richiesta ferie/permesso."""
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Richiesta non trovata")
    
    if leave_req.status != "pending":
        raise HTTPException(status_code=400, detail="Richiesta gia processata")
    
    leave_req.status = review_data.status
    leave_req.reviewed_by = current_user.id
    leave_req.reviewed_at = datetime.now()
    leave_req.review_notes = review_data.review_notes
    
    # Notifica di ritorno al richiedente originale
    if leave_req.requested_by:
        status_text = "✅ APPROVATA" if review_data.status == "approved" else "❌ RIFIUTATA"
        notes_text = f"\nNote: {review_data.review_notes}" if review_data.review_notes else ""
        
        notification = Notification(
            recipient_user_id=leave_req.requested_by,  # Send to the requester
            notif_type="info",
            title=f"Richiesta Permesso {status_text}",
            message=f"{leave_req.leave_type} - Revisionato da {current_user.full_name}{notes_text}",
            link_url="/hr/tasks"  # Link to tasks for coordinator
        )
        db.add(notification)
    
    db.commit()
    db.refresh(leave_req)
    
    return leave_req


@router.patch("/{request_id}", response_model=LeaveRequestResponse, summary="Modifica Richiesta")
async def update_leave_request(
    request_id: int,
    update_data: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifica una richiesta ferie/permesso esistente."""
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Richiesta non trovata")
    
    # Update fields if provided
    if update_data.leave_type is not None:
        leave_req.leave_type = update_data.leave_type
    if update_data.start_date is not None:
        leave_req.start_date = update_data.start_date
    if update_data.end_date is not None:
        leave_req.end_date = update_data.end_date
    if update_data.hours is not None:
        leave_req.hours = update_data.hours
    if update_data.reason is not None:
        leave_req.reason = update_data.reason
    
    db.commit()
    db.refresh(leave_req)
    
    return leave_req


@router.delete("/{request_id}", response_model=MessageResponse, summary="Elimina Richiesta")
async def delete_leave_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina definitivamente una richiesta ferie/permesso."""
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Richiesta non trovata")
    
    # Hard delete - rimuove completamente dal database
    db.delete(leave_req)
    db.commit()
    
    return {"message": "Richiesta eliminata definitivamente", "success": True}


# ============================================================
# MONTE ORE PERMESSI
# ============================================================

@router.get("/hours/{employee_id}", summary="Monte Ore Dipendente")
async def get_employee_leave_hours(
    employee_id: int,
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Restituisce il monte ore permessi di un dipendente:
    - ore_totali: Monte ore annuale (default 250)
    - ore_usate: Somma ore permessi approvati nell'anno
    - ore_rimanenti: Differenza
    """
    from datetime import datetime
    
    if year is None:
        year = datetime.now().year
    
    # Verifica dipendente
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Calcola ore usate (solo permessi orari approvati nell'anno corrente)
    start_of_year = datetime(year, 1, 1)
    end_of_year = datetime(year, 12, 31, 23, 59, 59)
    
    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date >= start_of_year,
        LeaveRequest.start_date <= end_of_year,
        LeaveRequest.leave_type.in_(["permit", "sudden_permit", "hourly_permit", "early_exit"])
    ).all()
    
    # Somma ore (se hours è NULL, conta come 8 ore per giornata intera)
    ore_usate = 0
    for leave in approved_leaves:
        if leave.hours:
            ore_usate += leave.hours
        else:
            # Conta giorni e moltiplica per 8 ore
            days = (leave.end_date - leave.start_date).days + 1
            ore_usate += days * 8
    
    # Get system default hours
    from models.config import SystemSetting
    default_setting = db.query(SystemSetting).filter(SystemSetting.key == "annual_leave_hours").first()
    system_default = int(default_setting.value) if default_setting and default_setting.value.isdigit() else 256

    ore_totali = employee.annual_leave_hours or system_default
    ore_rimanenti = ore_totali - ore_usate
    
    return {
        "employee_id": employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "year": year,
        "ore_totali": ore_totali,
        "ore_usate": ore_usate,
        "ore_rimanenti": max(0, ore_rimanenti),
        "percentuale_usata": round((ore_usate / ore_totali) * 100, 1) if ore_totali > 0 else 0
    }


@router.get("/hours-summary", summary="Riepilogo Monte Ore")
async def get_all_employees_hours(
    year: int = None,
    department_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """
    Riepilogo monte ore per tutti i dipendenti (HR only).
    Utile per dashboard e controllo.
    """
    from datetime import datetime
    
    if year is None:
        year = datetime.now().year
    
    query = db.query(Employee).filter(Employee.is_active == True)
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    employees = query.all()
    
    start_of_year = datetime(year, 1, 1)
    end_of_year = datetime(year, 12, 31, 23, 59, 59)
    
    # Get system default hours (once for the loop)
    from models.config import SystemSetting
    default_setting = db.query(SystemSetting).filter(SystemSetting.key == "annual_leave_hours").first()
    system_default = int(default_setting.value) if default_setting and default_setting.value.isdigit() else 256

    summary = []
    for emp in employees:
        # Calcola ore usate
        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status == "approved",
            LeaveRequest.start_date >= start_of_year,
            LeaveRequest.start_date <= end_of_year,
            LeaveRequest.leave_type.in_(["permit", "sudden_permit", "hourly_permit", "early_exit"])
        ).all()
        
        ore_usate = 0
        for leave in approved_leaves:
            if leave.hours:
                ore_usate += leave.hours
            else:
                days = (leave.end_date - leave.start_date).days + 1
                ore_usate += days * 8
        
        ore_totali = emp.annual_leave_hours or system_default
        ore_rimanenti = ore_totali - ore_usate
        
        summary.append({
            "employee_id": emp.id,
            "name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department.name if emp.department else None,
            "ore_totali": ore_totali,
            "ore_usate": ore_usate,
            "ore_rimanenti": max(0, ore_rimanenti),
            "status": "🔴 Esaurito" if ore_rimanenti <= 0 else "🟡 Basso" if ore_rimanenti < 50 else "🟢 OK"
        })
    
    # Ordina per ore rimanenti (meno ore = prima)
    summary.sort(key=lambda x: x["ore_rimanenti"])
    
    return {
        "year": year,
        "total_employees": len(summary),
        "employees": summary
    }


@router.get("/types", summary="Tipi Permesso Disponibili")
async def get_leave_types():
    """Restituisce i tipi di permesso disponibili con descrizioni."""
    return [
        {"code": "vacation", "label": "🏖️ Ferie", "uses_hours": False, "deducts_from_monte": False},
        {"code": "sick", "label": "🤒 Malattia", "uses_hours": False, "deducts_from_monte": False},
        {"code": "permit", "label": "📋 Permesso Giornaliero", "uses_hours": False, "deducts_from_monte": True},
        {"code": "hourly_permit", "label": "⏰ Permesso a Ore", "uses_hours": True, "deducts_from_monte": True},
        {"code": "early_exit", "label": "🚪 Uscita Anticipata", "uses_hours": True, "deducts_from_monte": True},
        {"code": "maternity", "label": "👶 Maternità", "uses_hours": False, "deducts_from_monte": False},
        {"code": "paternity", "label": "👨‍👧 Paternità", "uses_hours": False, "deducts_from_monte": False},
        {"code": "wedding", "label": "💒 Matrimonio", "uses_hours": False, "deducts_from_monte": False},
        {"code": "bereavement", "label": "🕯️ Lutto", "uses_hours": False, "deducts_from_monte": False},
        {"code": "other", "label": "📝 Altro", "uses_hours": False, "deducts_from_monte": False},
    ]

