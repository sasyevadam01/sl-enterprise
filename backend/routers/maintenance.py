from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models.maintenance import MaintenanceRequest
from models.production import MachineDowntime
from models.shifts import ShiftAssignment
from security import get_current_user
from models.core import User
from models.hr import Employee

router = APIRouter(
    prefix="/maintenance",
    tags=["maintenance"]
)

# --- Schemas ---

class MaintenanceReportCreate(BaseModel):
    shift_assignment_id: Optional[int] = None
    machine_id: int # Requirement ID
    problem_type: str
    priority: str # high, medium, low
    description: Optional[str] = None
    photo_url: Optional[str] = None

class MaintenanceActionResponse(BaseModel):
    id: int
    status: str
    message: str

class MaintenanceRequestSchema(BaseModel):
    id: int
    machine_id: int
    machine_name: str
    banchina: str
    reporter_name: str
    problem_type: str
    priority: str
    description: Optional[str]
    status: str
    created_at: datetime
    taken_by_name: Optional[str]
    elapsed_seconds: int

    class Config:
        orm_mode = True

# --- Endpoints ---

@router.post("/report", response_model=MaintenanceActionResponse)
def report_maintenance_issue(
    report: MaintenanceReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Operatore segnala un guasto.
    Se priority='high' -> scatta la SIRENA (sul frontend).
    """
    
    # Trova l'operatore collegato all'utente (se esiste)
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    reported_by_id = employee.id if employee else None
    
    new_request = MaintenanceRequest(
        shift_assignment_id=report.shift_assignment_id,
        machine_id=report.machine_id,
        reported_by_id=reported_by_id,
        problem_type=report.problem_type,
        priority=report.priority,
        description=report.description,
        photo_url=report.photo_url,
        status="open",
        created_at=datetime.now()
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # --- CREATE NOTIFICATIONS ---
    # Notify Admin and Maintenance roles
    from models.core import Notification
    
    # Resolve machine name for the message
    # new_request.machine might not be loaded yet in session, so we use logic or reload
    # But we can just use generic message or try to access it
    machine_name = "Macchina"
    if new_request.machine:
        machine_name = new_request.machine.role_name
        
    prio_emoji = "🚨" if report.priority == 'high' else "⚠️"
    title = f"{prio_emoji} GUASTO: {machine_name}"
    message = f"Segnalato guasto {report.priority.upper()} da operatore. Tipo: {report.problem_type}"
    
    # 1. Notify Admin
    notif_admin = Notification(
        recipient_role="admin",
        notif_type="priority" if report.priority == 'high' else "alert",
        title=title,
        message=message,
        link_url="/factory/maintenance",
        created_at=datetime.now()
    )
    db.add(notif_admin)
    
    # 2. Notify Maintenance Role (if exists)
    notif_maint = Notification(
        recipient_role="maintenance", # Assuming 'maintenance' role exists
        notif_type="priority" if report.priority == 'high' else "alert",
        title=title,
        message=message,
        link_url="/factory/maintenance",
        created_at=datetime.now()
    )
    db.add(notif_maint)
    
    db.commit()
    
    return {
        "id": new_request.id, 
        "status": "open", 
        "message": "Segnalazione inviata con successo"
    }

@router.get("/queue", response_model=List[MaintenanceRequestSchema])
def get_maintenance_queue(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Restituisce la coda delle manutenzioni.
    Usato dal Polling per la SIRENA.
    """
    query = db.query(MaintenanceRequest)
    
    if active_only:
        query = query.filter(MaintenanceRequest.status.in_(["open", "in_progress"]))
    
    # Ordina: Prima ALTA priorità, poi per data creazione
    # Custom ordering using case/whens in SQL is better, but simple sort here:
    # We want 'high' priority first.
    # We can fetch all and sort in python or do multiple queries. 
    # Let's do a simple order by created_at desc for now, frontend can sort by priority?
    # No, backend should sort for "Queue".
    # Since priority is string, we can't sort easily. 
    requests = query.order_by(desc(MaintenanceRequest.created_at)).all()
    
    # Build response with extra info
    results = []
    now = datetime.now()
    
    for req in requests:
        # Resolve machine name (Requirement -> Machine/Role)
        # machine = req.machine (ShiftRequirement)
        machine_name = req.machine.role_name if req.machine else "Sconosciuta"
        
        # Banchina is an object, we need the code string
        banchina_str = ""
        if req.machine and req.machine.banchina:
            banchina_str = req.machine.banchina.code
            
        reporter_name = f"{req.reporter.first_name} {req.reporter.last_name}" if req.reporter else "Unknown"
        taken_by_name = req.taken_by.username if req.taken_by else None
        
        elapsed = (now - req.created_at).total_seconds()
        
        results.append({
            "id": req.id,
            "machine_id": req.machine_id,
            "machine_name": machine_name,
            "banchina": banchina_str,
            "reporter_name": reporter_name,
            "problem_type": req.problem_type,
            "priority": req.priority,
            "description": req.description,
            "status": req.status,
            "created_at": req.created_at,
            "taken_by_name": taken_by_name,
            "elapsed_seconds": int(elapsed)
        })
        
    # Sort in Python: High priority first
    results.sort(key=lambda x: (0 if x['priority'] == 'high' else 1, x['created_at']))
    
    return results

@router.post("/{request_id}/acknowledge")
def acknowledge_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manutentore prende in carico.Spegne la sirena.
    """
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.status != "open":
        raise HTTPException(status_code=400, detail="Request already taken or resolved")
        
    req.status = "in_progress"
    req.taken_by_id = current_user.id
    req.acknowledged_at = datetime.now()
    
    db.commit()
    return {"message": "Presa in carico confermata"}

@router.post("/{request_id}/resolve")
def resolve_request(
    request_id: int,
    notes: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manutentore risolve il guasto.
    """
    req = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    req.status = "resolved"
    req.resolved_by_id = current_user.id
    req.resolved_at = datetime.now()
    req.resolution_notes = notes
    
    db.commit()
    return {"message": "Ticket risolto"}
