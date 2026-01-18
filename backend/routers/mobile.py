from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_
from typing import List, Optional
from datetime import datetime, time, timedelta
import json
import traceback
from pydantic import BaseModel

from database import get_db
from models.core import User
from models.hr import Employee
from models.shifts import ShiftAssignment, ShiftRequirement
from models.production import ProductionSession, SessionOperator
from models.factory import Banchina, Machine
from models.production import ProductionEntry, MachineDowntime, KpiEntry, KpiConfig, DowntimeReason
from security import get_current_user

router = APIRouter(prefix="/mobile", tags=["Mobile Operator"])

# ... (Existing imports)

def aggregate_kpi_production(db: Session, assignment: ShiftAssignment, qty: int, user_id: int):
    """Aggiorna il KpiEntry generale sommando la nuova produzione."""
    if not assignment.requirement or not assignment.requirement.kpi_sector:
        return # Non tracciabile

    sector = assignment.requirement.kpi_sector
    
    # Trova configurazione
    config = db.query(KpiConfig).filter(KpiConfig.sector_name == sector).first()
    if not config:
        return
        
    # Trova/Crea KpiEntry per oggi/turno
    today = assignment.work_date
    shift = assignment.shift_type
    
    entry = db.query(KpiEntry).filter(
        KpiEntry.kpi_config_id == config.id,
        func.date(KpiEntry.work_date) == today.date(),
        KpiEntry.shift_type == shift
    ).first()
    
    if not entry:
        entry = KpiEntry(
            kpi_config_id=config.id,
            work_date=today,
            shift_type=shift,
            recorded_by=user_id,
            quantity_produced=0,
            hours_downtime=0.0,
            hours_total=8.0 # Default value
        )
        db.add(entry)
    
    # Aggiorna
    entry.quantity_produced += qty
    
    # Ricalcola metriche
    deduction = 0.0
    entry.hours_net = entry.hours_total - entry.hours_downtime - deduction
    entry.quantity_per_hour = entry.quantity_produced / entry.hours_net if entry.hours_net > 0 else 0
    entry.efficiency_percent = (entry.quantity_per_hour / config.kpi_target_hourly * 100) if config.kpi_target_hourly else 0
    
    # db.commit() gestito dalla route chiamante

def aggregate_kpi_downtime(db: Session, assignment: ShiftAssignment, minutes: int, user_id: int):
    """Aggiorna il KpiEntry generale sommando i minuti di fermo (convertiti in ore)."""
    if not assignment.requirement or not assignment.requirement.kpi_sector:
        return

    sector = assignment.requirement.kpi_sector
    config = db.query(KpiConfig).filter(KpiConfig.sector_name == sector).first()
    if not config:
        return
        
    today = assignment.work_date
    shift = assignment.shift_type
    
    entry = db.query(KpiEntry).filter(
        KpiEntry.kpi_config_id == config.id,
        func.date(KpiEntry.work_date) == today.date(),
        KpiEntry.shift_type == shift
    ).first()
    
    if not entry:
        entry = KpiEntry(
            kpi_config_id=config.id,
            work_date=today,
            shift_type=shift,
            recorded_by=user_id,
            quantity_produced=0,
            hours_downtime=0.0,
            hours_total=8.0 # Default value
        )
        db.add(entry)
        
    # Converti minuti in ore (es. 15 min = 0.25h)
    hours_add = minutes / 60.0
    entry.hours_downtime += hours_add
    
    # Ricalcola metriche
    deduction = 0.0
    entry.hours_net = entry.hours_total - entry.hours_downtime - deduction
    entry.quantity_per_hour = entry.quantity_produced / entry.hours_net if entry.hours_net > 0 else 0
    entry.efficiency_percent = (entry.quantity_per_hour / config.kpi_target_hourly * 100) if config.kpi_target_hourly else 0


class ProductionUpdateRequest(BaseModel):
    quantity: int

@router.post("/production/update")
async def update_production(
    data: ProductionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra produzione e aggiorna KPI."""
    employee = current_user.employee
    if not employee:
        raise HTTPException(400, "User not linked to employee")
        
    current_shift = get_current_shift_type()
    today = datetime.now()
    
    # Trova assignment
    assignment = db.query(ShiftAssignment).options(
        joinedload(ShiftAssignment.requirement)
    ).filter(
        ShiftAssignment.employee_id == employee.id,
        func.date(ShiftAssignment.work_date) == today.date(),
        ShiftAssignment.shift_type == current_shift
    ).first()
    
    if not assignment:
        raise HTTPException(400, "Nessun turno attivo trovato per oggi")
        
    # Trova/Crea ProductionEntry
    prod_entry = db.query(ProductionEntry).filter(
        ProductionEntry.shift_assignment_id == assignment.id
    ).first()
    
    if not prod_entry:
        prod_entry = ProductionEntry(
            employee_id=employee.id,
            shift_assignment_id=assignment.id,
            work_date=today,
            pieces_produced=0
        )
        db.add(prod_entry)
    
    # 1. Log Granulare
    prod_entry.pieces_produced += data.quantity
    
    # 2. Aggregazione KPI
    aggregate_kpi_production(db, assignment, data.quantity, current_user.id)
    
    db.commit()
    return {"new_total": prod_entry.pieces_produced}


class DowntimeStopRequest(BaseModel):
    reason: str
    reason_detail: Optional[str] = None

@router.post("/downtime/start")
async def start_downtime(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Avvia il cronometro fermo macchina."""
    employee = current_user.employee
    if not employee:
        raise HTTPException(400, "User not linked to employee")
        
    current_shift = get_current_shift_type()
    today = datetime.now()
    
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.employee_id == employee.id,
        func.date(ShiftAssignment.work_date) == today.date(),
        ShiftAssignment.shift_type == current_shift
    ).first()
    
    if not assignment:
        raise HTTPException(400, "Nessun turno attivo")
        
    # Production Entry
    prod_entry = db.query(ProductionEntry).filter(
        ProductionEntry.shift_assignment_id == assignment.id
    ).first()
    
    if not prod_entry:
        prod_entry = ProductionEntry(
            employee_id=employee.id,
            shift_assignment_id=assignment.id,
            work_date=today
        )
        db.add(prod_entry)
        db.flush()
        
    # Check if already stopped
    open_dt = db.query(MachineDowntime).filter(
        MachineDowntime.production_entry_id == prod_entry.id,
        MachineDowntime.ended_at.is_(None)
    ).first()
    
    if open_dt:
        raise HTTPException(400, "Macchina già ferma")
    
    # Create new downtime
    new_dt = MachineDowntime(
        production_entry_id=prod_entry.id,
        reason="pending",
        started_at=datetime.now()
    )
    db.add(new_dt)
    db.commit()
    
    return {"machine_status": "stopped", "downtime_id": new_dt.id}


@router.post("/downtime/stop")
async def stop_downtime(
    data: DowntimeStopRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ferma il cronometro fermo macchina. Richiede causale e note opzionali."""
    employee = current_user.employee
    if not employee:
        raise HTTPException(400, "User not linked to employee")
        
    current_shift = get_current_shift_type()
    today = datetime.now()
    
    assignment = db.query(ShiftAssignment).options(
        joinedload(ShiftAssignment.requirement)
    ).filter(
        ShiftAssignment.employee_id == employee.id,
        func.date(ShiftAssignment.work_date) == today.date(),
        ShiftAssignment.shift_type == current_shift
    ).first()
    
    if not assignment:
        raise HTTPException(400, "Nessun turno attivo")
        
    prod_entry = db.query(ProductionEntry).filter(
        ProductionEntry.shift_assignment_id == assignment.id
    ).first()
    
    if not prod_entry:
        raise HTTPException(400, "Nessuna sessione attiva")
        
    # Find open downtime
    open_dt = db.query(MachineDowntime).filter(
        MachineDowntime.production_entry_id == prod_entry.id,
        MachineDowntime.ended_at.is_(None)
    ).first()
    
    if not open_dt:
        raise HTTPException(400, "Nessun fermo attivo da chiudere")
    
    # Close downtime with reason
    open_dt.ended_at = datetime.now()
    open_dt.reason = data.reason
    open_dt.reason_detail = data.reason_detail
    duration = (open_dt.ended_at - open_dt.started_at).total_seconds() / 60
    open_dt.duration_minutes = int(duration)
    
    # Aggregate KPI
    aggregate_kpi_downtime(db, assignment, int(duration), current_user.id)
    
    db.commit()
    return {"machine_status": "running", "duration_minutes": int(duration)}


@router.get("/status")
async def get_mobile_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ritorna stato corrente per dashboard (pz totali, stato macchina)."""
    employee = current_user.employee
    if not employee:
         return {"pieces_produced": 0, "machine_status": "running"} # Fallback
         
    current_shift = get_current_shift_type()
    today = datetime.now()
    
    assignment = db.query(ShiftAssignment).filter(
        ShiftAssignment.employee_id == employee.id,
        func.date(ShiftAssignment.work_date) == today.date(),
        ShiftAssignment.shift_type == current_shift
    ).first()
    
    if not assignment:
        return {"pieces_produced": 0, "machine_status": "unknown"}
        
    prod_entry = db.query(ProductionEntry).filter(
         ProductionEntry.shift_assignment_id == assignment.id
    ).first()
    
    pieces = prod_entry.pieces_produced if prod_entry else 0
    
    # Check open downtime
    is_stopped = False
    if prod_entry:
        open_dt = db.query(MachineDowntime).filter(
            MachineDowntime.production_entry_id == prod_entry.id,
            MachineDowntime.ended_at.is_(None)
        ).first()
        if open_dt:
            is_stopped = True
            
    return {
        "pieces_produced": pieces,
        "machine_status": "stopped" if is_stopped else "running"
    }


@router.get("/downtime-reasons", summary="Get pre-set downtime reasons")
async def get_downtime_reasons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ritorna lista causali fermo pre-configurate per selezione mobile."""
    reasons = db.query(DowntimeReason).filter(
        DowntimeReason.is_active == True
    ).all()
    
    return [{
        "id": r.id,
        "label": r.label,
        "category": r.category
    } for r in reasons]


class CrewConfirmRequest(BaseModel):
    crew_status: List[dict]  # [{employee_id: int, status: "present"|"absent_replaced"|"absent_alone"}]
    shift_assignment_id: int = None  # ID of the shift to mark as checked in

@router.post("/crew/confirm", summary="Conferma presenza squadra")
async def confirm_crew(
    data: CrewConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra la conferma presenze squadra e marca il turno come iniziato."""
    employee = current_user.employee
    if not employee:
        raise HTTPException(400, "User not linked to employee")
    
    today = datetime.now().date()
    
    # Mark all shift assignments for this requirement as checked in
    if data.shift_assignment_id:
        # Get the shift assignment and its requirement
        shift = db.query(ShiftAssignment).filter(
            ShiftAssignment.id == data.shift_assignment_id
        ).first()
        
        if shift and shift.requirement_id:
            # Mark ALL assignments for this requirement/date/shift_type as checked in
            db.query(ShiftAssignment).filter(
                ShiftAssignment.requirement_id == shift.requirement_id,
                func.date(ShiftAssignment.work_date) == today,
                ShiftAssignment.shift_type == shift.shift_type
            ).update({"checked_in_at": datetime.now()})
            db.commit()
    
    return {"status": "confirmed", "crew_count": len(data.crew_status)}


class CloseShiftRequest(BaseModel):
    shift_assignment_id: int

@router.post("/shift/close", summary="Chiudi turno")
async def close_shift(
    data: CloseShiftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chiude il turno e impedisce ulteriori inserimenti."""
    employee = current_user.employee
    if not employee:
        raise HTTPException(400, "User not linked to employee")
    
    today = datetime.now().date()
    
    # Get the shift assignment and its requirement
    shift = db.query(ShiftAssignment).filter(
        ShiftAssignment.id == data.shift_assignment_id
    ).first()
    
    if not shift:
        raise HTTPException(404, "Turno non trovato")
    
    if shift.is_closed:
        raise HTTPException(400, "Turno già chiuso")
    
    # Close ALL assignments for this requirement/date/shift_type
    if shift.requirement_id:
        db.query(ShiftAssignment).filter(
            ShiftAssignment.requirement_id == shift.requirement_id,
            func.date(ShiftAssignment.work_date) == today,
            ShiftAssignment.shift_type == shift.shift_type
        ).update({
            "is_closed": True,
            "closed_at": datetime.now()
        })
        db.commit()
    
    return {"status": "closed", "closed_at": datetime.now().isoformat()}
@router.get("/downtimes/{kpi_config_id}", summary="Get downtimes for KPI display")
async def get_kpi_downtimes(
    kpi_config_id: int,
    date: str,  # YYYY-MM-DD
    shift_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ritorna i fermi registrati per un KPI config/data/turno per la visualizzazione."""
    from datetime import datetime
    
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Formato data non valido")
    
    config = db.query(KpiConfig).filter(KpiConfig.id == kpi_config_id).first()
    if not config:
        raise HTTPException(404, "KPI Config non trovato")
    
    # Find all downtimes for this sector/date/shift
    # Join through ProductionEntry -> ShiftAssignment -> ShiftRequirement
    downtimes = db.query(MachineDowntime).join(
        ProductionEntry, MachineDowntime.production_entry_id == ProductionEntry.id
    ).join(
        ShiftAssignment, ProductionEntry.shift_assignment_id == ShiftAssignment.id
    ).join(
        ShiftRequirement, ShiftAssignment.requirement_id == ShiftRequirement.id
    ).filter(
        ShiftRequirement.kpi_sector == config.sector_name,
        func.date(ShiftAssignment.work_date) == target_date,
        ShiftAssignment.shift_type == shift_type,
        MachineDowntime.ended_at.isnot(None)  # Only closed downtimes
    ).all()
    
    return [{
        "id": dt.id,
        "reason": dt.reason,
        "reason_detail": dt.reason_detail,
        "duration_minutes": dt.duration_minutes,
        "started_at": dt.started_at.isoformat() if dt.started_at else None,
        "ended_at": dt.ended_at.isoformat() if dt.ended_at else None
    } for dt in downtimes]


# --- HELPER: Calcolo Turno Attuale ---
def get_current_shift_type() -> str:
    """Restituisce 'morning', 'afternoon' o 'night' in base all'ora attuale."""
    now = datetime.now().time()
    
    # Mattina: 05:45 - 13:45 
    if time(5, 45) <= now < time(13, 45):
        return "morning"
    # Pomeriggio: 13:45 - 21:45
    elif time(13, 45) <= now < time(21, 45):
        return "afternoon"
    # Notte: 21:45 - 05:45 (gestione cavallo mezzanotte)
    else:
        return "night"

@router.get("/my-assignment", summary="Get Shift Assignment (Strict Mode)")
async def get_my_assignment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    STRICT MODE: L'operatore può accedere SOLO se ha un turno esplicito assegnato.
    Se non c'è turno, ritorna messaggio con nome coordinatore reparto.
    """
    if not current_user.employee:
        raise HTTPException(status_code=400, detail="Utente non collegato a un dipendente")
    
    employee = current_user.employee
    current_shift = get_current_shift_type()
    today = datetime.now().date()
    
    # Risposta base
    response = {
        "employee_name": employee.full_name,
        "current_shift": current_shift,
        "assignment_source": None,  # "explicit" or "none"
        "machine_info": None,
        "crew": [],
        "coordinator_names": None  # Per messaggio errore
    }

    # --- UNICO LIVELLO: Assegnazione Esplicita ---
    # Prima cerca turni standard (morning/afternoon/night)
    explicit_assign = db.query(ShiftAssignment).options(
        joinedload(ShiftAssignment.requirement)
    ).filter(
        ShiftAssignment.employee_id == employee.id,
        func.date(ShiftAssignment.work_date) == today,
        ShiftAssignment.shift_type == current_shift
    ).first()
    
    # Se non trova, cerca turni "manual" per oggi (qualsiasi orario)
    if not explicit_assign:
        explicit_assign = db.query(ShiftAssignment).options(
            joinedload(ShiftAssignment.requirement)
        ).filter(
            ShiftAssignment.employee_id == employee.id,
            func.date(ShiftAssignment.work_date) == today,
            ShiftAssignment.shift_type == "manual"
        ).first()
    
    # --- SE NON ESISTE TURNO: Blocca e ritorna coordinatori ---
    if not explicit_assign or not explicit_assign.requirement:
        response["assignment_source"] = "none"
        
        # Cerca coordinatori usando manager_id e co_manager_id dell'operatore
        coordinator_names = []
        
        # Manager diretto
        if employee.manager_id:
            manager = db.query(Employee).filter(Employee.id == employee.manager_id).first()
            if manager:
                coordinator_names.append(manager.full_name)
        
        # Co-Manager (se esiste)
        if employee.co_manager_id:
            co_manager = db.query(Employee).filter(Employee.id == employee.co_manager_id).first()
            if co_manager:
                coordinator_names.append(co_manager.full_name)
        
        # Se non troviamo manager, messaggio generico
        if not coordinator_names:
            coordinator_names = ["il tuo coordinatore"]
        
        response["coordinator_names"] = coordinator_names
        return response
    
    # --- TURNO TROVATO ---
    response["assignment_source"] = "explicit"
    response["shift_assignment_id"] = explicit_assign.id
    response["is_checked_in"] = explicit_assign.checked_in_at is not None
    response["is_closed"] = explicit_assign.is_closed or False
    
    requirement = explicit_assign.requirement
    
    response["machine_info"] = {
        "requirement_id": requirement.id,
        "role_name": requirement.role_name,
        "sector": requirement.kpi_sector,
        "banchina": requirement.banchina.name if requirement.banchina else "N/D"
    }
    
    # --- CREW LOGIC: Trova colleghi assegnati alla stessa postazione ---
    # Use the actual shift_type from the assignment (not current_shift) to find colleagues
    actual_shift_type = explicit_assign.shift_type
    crew_members = db.query(Employee).join(ShiftAssignment).filter(
        ShiftAssignment.requirement_id == requirement.id,
        func.date(ShiftAssignment.work_date) == today,
        ShiftAssignment.shift_type == actual_shift_type,
        Employee.id != employee.id
    ).all()
    
    response["crew"] = [{
        "id": m.id,
        "name": m.full_name,
        "role": m.current_role
    } for m in crew_members]

    return response

@router.get("/banchina-machines/{banchina_id}")
async def get_banchina_machines(banchina_id: int, db: Session = Depends(get_db)):
    """Ritorna le 'macchine' (Requirements) selezionabili per una banchina."""
    reqs = db.query(ShiftRequirement).filter(
        ShiftRequirement.banchina_id == banchina_id,
        ShiftRequirement.kpi_sector.isnot(None) # Solo quelli legati a KPI
    ).all()
    
    return [{
        "id": r.id,
        "name": f"{r.role_name} ({r.kpi_sector})",
        "sector": r.kpi_sector
    } for r in reqs]


# --- WRITE OPERATIONS ---

class MobileCheckInRequest(BaseModel):
    requirement_id: int
    confirmed_crew_ids: List[int]
    notes: Optional[str] = None

@router.post("/check-in", summary="Conferma Inizio Turno")
async def mobile_check_in(
    data: MobileCheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    L'operatore conferma la macchina e la squadra.
    Crea/Aggiorna ShiftAssignment per oggi.
    """
    employee = current_user.employee
    if not employee:
        raise HTTPException(status_code=400, detail="Utente non dipendente")
        
    current_shift = get_current_shift_type()
    today = datetime.now()
    
    # 1. Crea/Aggiorna assignment per il LEADER
    leader_assign = db.query(ShiftAssignment).filter(
        ShiftAssignment.employee_id == employee.id,
        func.date(ShiftAssignment.work_date) == today.date(),
        ShiftAssignment.shift_type == current_shift
    ).first()
    
    if not leader_assign:
        # BUG FIX: Privilegio limitato.
        # Se non esiste assegnazione esplicita, un utente base NON deve poterla creare dal nulla
        # a meno che non sia un Coordinatore/Admin o sia un turno MANUALE.
        
        # Check permissions
        can_create = False
        if current_shift == 'manual':
            can_create = True
        elif current_user.role_obj and current_user.role_obj.name in ['admin', 'super_admin', 'coordinator', 'production_manager']:
            can_create = True
            
        if not can_create:
            # Blocca creazione accidentale
            raise HTTPException(
                status_code=403, 
                detail="Non risulti assegnato a questo turno. Contatta il coordinatore."
            )

        leader_assign = ShiftAssignment(
            employee_id=employee.id,
            work_date=today,
            shift_type=current_shift,
            assigned_by=current_user.id
        )
        db.add(leader_assign)
    
    leader_assign.requirement_id = data.requirement_id
    leader_assign.notes = data.notes
    
    # 2. Gestione CREW (Altri operatori)
    # Per ogni ID confermato, verifichiamo se ha già un assignment. Se no, lo creiamo su QUESTA macchina.
    # ATTENZIONE: Se un operatore aveva un'assegnazione diversa, gliela sovrascriviamo? 
    # Sì, perché il check-in fisico vince sulla pianificazione teorica.
    
    for member_id in data.confirmed_crew_ids:
        if member_id == employee.id:
            continue # Salta se stesso
            
        member_assign = db.query(ShiftAssignment).filter(
            ShiftAssignment.employee_id == member_id,
            func.date(ShiftAssignment.work_date) == today.date(),
            ShiftAssignment.shift_type == current_shift
        ).first()
        
        if not member_assign:
            member_assign = ShiftAssignment(
                employee_id=member_id,
                work_date=today,
                shift_type=current_shift,
                assigned_by=current_user.id
            )
            db.add(member_assign)
        
        # Link alla stessa macchina del leader
        member_assign.requirement_id = data.requirement_id
        
    db.commit()
    return {"success": True, "message": "Check-in confermato e squadra aggiornata"}


