from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db, Employee, User, ShiftAssignment, Department, ShiftRequirement, LeaveRequest
from security import get_current_user

router = APIRouter(prefix="/shifts", tags=["Turni"])

# --- SCHEMAS ---

class ShiftCreate(BaseModel):
    employee_id: int
    work_date: str  # YYYY-MM-DD
    shift_type: str  # morning, afternoon, night, manual, off
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    requirement_id: Optional[int] = None
    notes: Optional[str] = None

class ShiftResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    work_date: datetime
    shift_type: str
    start_time: Optional[str]
    end_time: Optional[str]
    requirement_id: Optional[int]
    notes: Optional[str]
    banchina_code: Optional[str] = None
    role_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class TeamMember(BaseModel):
    id: int
    first_name: str
    last_name: str
    current_role: Optional[str]
    department_id: Optional[int]
    department_name: Optional[str]
    manager_id: Optional[int]
    manager_name: Optional[str] = None
    co_manager_id: Optional[int]
    co_manager_name: Optional[str] = None
    default_banchina_id: Optional[int]
    secondary_role: Optional[str]

# --- ENDPOINTS ---

@router.get("/team", response_model=List[TeamMember], summary="Ottieni il mio team")
async def get_my_team(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ritorna la lista dei dipendenti gestibili dall'utente loggato.
    Gerarchia:
    - Super Admin / HR Manager -> Tutti i dipendenti attivi
    - Coordinatore -> Dipendenti del proprio reparto + Dipendenti assegnati direttamente (reports)
    """
    
    # 1. Admin / HR Manager / Utenti con permesso manage_shifts -> Tutti
    if current_user.role in ['super_admin', 'hr_manager'] or current_user.has_permission('manage_shifts'):
        employees = db.query(Employee).options(
            joinedload(Employee.department),
            joinedload(Employee.manager),
            joinedload(Employee.co_manager)
        ).filter(Employee.is_active == True).all()
        return [
            TeamMember(
                id=e.id,
                first_name=e.first_name,
                last_name=e.last_name,
                current_role=e.current_role,
                department_id=e.department_id,
                department_name=e.department.name if e.department else "N/D",
                manager_id=e.manager_id,
                manager_name=f"{e.manager.last_name} {e.manager.first_name}" if e.manager else None,
                co_manager_id=e.co_manager_id,
                co_manager_name=f"{e.co_manager.last_name} {e.co_manager.first_name}" if e.co_manager else None,
                default_banchina_id=e.default_banchina_id,
                secondary_role=e.secondary_role
            ) for e in employees
        ]

    # 2. Coordinatore / Altri
    team_ids = set()
    
    # A. Dipendenti del reparto (se l'utente ha un reparto)
    if current_user.department_id:
        dept_emps = db.query(Employee.id).filter(
            Employee.department_id == current_user.department_id,
            Employee.is_active == True
        ).all()
        for (emp_id,) in dept_emps:
            team_ids.add(emp_id)

    # B. Dipendenti assegnati direttamente (Direct Reports OR Co-Reports) 
    # Cerchiamo il dipendente associato all'utente corrente
    current_emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if current_emp:
        direct_reports = db.query(Employee.id).filter(
            or_(
                Employee.manager_id == current_emp.id,
                Employee.co_manager_id == current_emp.id
            ),
            Employee.is_active == True
        ).all()
        for (emp_id,) in direct_reports:
            team_ids.add(emp_id)

    # Fetch full objects
    if not team_ids:
        # Fallback: Se non ha nessuno, ritorna se stesso se è un dipendente, altrimenti vuoto
        if current_emp:
            employees = [current_emp]
        else:
            employees = []
    else:
        employees = db.query(Employee).options(
            joinedload(Employee.department),
            joinedload(Employee.manager),
            joinedload(Employee.co_manager)
        ).filter(Employee.id.in_(team_ids)).all()

    return [
        TeamMember(
            id=e.id,
            first_name=e.first_name,
            last_name=e.last_name,
            current_role=e.current_role,
            department_id=e.department_id,
            department_name=e.department.name if e.department else "N/D",
            manager_id=e.manager_id,
            manager_name=f"{e.manager.last_name} {e.manager.first_name}" if e.manager else None,
            co_manager_id=e.co_manager_id,
            co_manager_name=f"{e.co_manager.last_name} {e.co_manager.first_name}" if e.co_manager else None,
            default_banchina_id=e.default_banchina_id,
            secondary_role=e.secondary_role
        ) for e in employees
    ]


@router.get("/planner", response_model=List[ShiftResponse], summary="Ottieni turni per periodo")
async def get_shifts(
    start_date: str, # YYYY-MM-DD
    end_date: str,   # YYYY-MM-DD
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        s_date = datetime.strptime(start_date, "%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato data non valido. Usa YYYY-MM-DD")

    # RESTRIZIONE COORDINATOR: Max 90 giorni da oggi (Week corrente + 3 Mesi approx)
    if current_user.role == 'coordinator':
        limit_date = datetime.utcnow() + timedelta(days=90)
        if e_date > limit_date:
            # Opzione A: Blocca richiesta
            # raise HTTPException(status_code=403, detail="Non puoi visualizzare turni oltre le prossime 2 settimane")
            
            # Opzione B: Silenziosamente tronca (ma il frontend potrebbe confondersi)
            # Meglio bloccare se la richiesta è esplicitamente fuori range
            # Tuttavia, il planner richiede intere settimane.
            # Accettiamo se la start_date è entro il limite.
            if s_date > limit_date:
                 raise HTTPException(status_code=403, detail="Non puoi pianificare oltre i prossimi 3 mesi")

    from sqlalchemy.orm import joinedload
    
    # Eager load requirement and banchina to avoid N+1 and get details
    shifts = db.query(ShiftAssignment).options(
        joinedload(ShiftAssignment.requirement).joinedload(ShiftRequirement.banchina),
        joinedload(ShiftAssignment.employee)
    ).filter(
        ShiftAssignment.work_date >= s_date,
        ShiftAssignment.work_date <= e_date
    ).all()

    return [
        ShiftResponse(
            id=s.id,
            employee_id=s.employee_id,
            employee_name=f"{s.employee.first_name} {s.employee.last_name}" if s.employee else "Dipendente Rimosso",
            work_date=s.work_date,
            shift_type=s.shift_type,
            start_time=s.start_time,
            end_time=s.end_time,
            requirement_id=s.requirement_id,
            notes=s.notes,
            banchina_code=s.requirement.banchina.code if s.requirement and s.requirement.banchina else None,
            role_name=s.requirement.role_name if s.requirement else None
        ) for s in shifts if s.employee  # Skip orphaned records
    ]


@router.post("/assign", summary="Assegna o aggiorna turno")
async def assign_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        work_date_dt = datetime.strptime(shift_data.work_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data non valida")

    # Verifica esistenza
    existing = db.query(ShiftAssignment).filter(
        ShiftAssignment.employee_id == shift_data.employee_id,
        ShiftAssignment.work_date == work_date_dt
    ).first()

    if existing:
        existing.shift_type = shift_data.shift_type
        existing.start_time = shift_data.start_time
        existing.end_time = shift_data.end_time
        existing.requirement_id = shift_data.requirement_id
        existing.notes = shift_data.notes
        existing.assigned_by = current_user.id
        db.commit()
        return {"status": "updated", "id": existing.id}
    else:
        new_shift = ShiftAssignment(
            employee_id=shift_data.employee_id,
            work_date=work_date_dt,
            shift_type=shift_data.shift_type,
            start_time=shift_data.start_time,
            end_time=shift_data.end_time,
            requirement_id=shift_data.requirement_id,
            notes=shift_data.notes,
            assigned_by=current_user.id
        )
        db.add(new_shift)
        db.commit()
        db.refresh(new_shift)
        return {"status": "created", "id": new_shift.id}


@router.post("/copy-previous-week", summary="Copia turni settimana precedente")
async def copy_previous_week(
    target_week_start: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Copia i turni dalla settimana precedente (rispetto alla target start date).
    Sovrascrive turni esistenti nella settimana target.
    """
    try:
        target_start = datetime.strptime(target_week_start, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data non valida")
        
    prev_start = target_start - timedelta(days=7)
    prev_end = prev_start + timedelta(days=6)
    
    # Recupera turni settimana precedente
    source_shifts = db.query(ShiftAssignment).filter(
        ShiftAssignment.work_date >= prev_start,
        ShiftAssignment.work_date <= prev_end
    ).all()
    
    if not source_shifts:
        return {"status": "success", "copied": 0, "message": "Nessun turno trovato nella settimana precedente"}

    copied_count = 0
    for src in source_shifts:
        # Calcola la nuova data mantenendo lo stesso giorno della settimana
        # days_diff è 0 per lunedì, 1 per martedì...
        days_diff = (src.work_date - prev_start).days
        new_date = target_start + timedelta(days=days_diff)
        
        # Cerca se esiste già un turno per quel dipendente in quella data
        dest = db.query(ShiftAssignment).filter(
            ShiftAssignment.employee_id == src.employee_id,
            ShiftAssignment.work_date == new_date
        ).first()
        
        if dest:
            # Aggiorna
            dest.shift_type = src.shift_type
            dest.start_time = src.start_time
            dest.end_time = src.end_time
            dest.requirement_id = src.requirement_id
            dest.notes = src.notes
            dest.assigned_by = current_user.id
        else:
            # Crea
            dest = ShiftAssignment(
                employee_id=src.employee_id,
                work_date=new_date,
                shift_type=src.shift_type,
                start_time=src.start_time,
                end_time=src.end_time,
                requirement_id=src.requirement_id,
                notes=src.notes,
                assigned_by=current_user.id
            )
            db.add(dest)
        
        copied_count += 1
        
    db.commit()
    return {"status": "success", "copied": copied_count}


@router.get("/export", summary="Export Excel Data")
async def export_shifts(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera dati JSON pronti per essere convertiti in Excel/CSV dal frontend."""
    s_date = datetime.strptime(start_date, "%Y-%m-%d")
    e_date = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59)
    
    shifts = db.query(ShiftAssignment).filter(
        ShiftAssignment.work_date >= s_date,
        ShiftAssignment.work_date <= e_date
    ).all()
    
    # Mappa per accesso rapido
    data_map = {} # employee_id -> { info, shifts: { date: label } }
    
    for s in shifts:
        eid = s.employee_id
        if eid not in data_map:
            dept_name = s.employee.department.name if s.employee.department else "N/D"
            data_map[eid] = {
                "name": f"{s.employee.last_name} {s.employee.first_name}",
                "department": dept_name,
                "shifts": {}
            }
            
        # Label turno
        label = s.shift_type.upper()
        if s.shift_type == 'morning': label = 'M'
        elif s.shift_type == 'afternoon': label = 'P'
        elif s.shift_type == 'night': label = 'N'
        elif s.shift_type == 'manual':
            label = f"{s.start_time}-{s.end_time}"
            
        date_str = s.work_date.strftime("%Y-%m-%d")
        data_map[eid]["shifts"][date_str] = label
        
@router.get("/export/pdf", summary="Export PDF Shift Sheet")
async def export_shifts_pdf(
    start_date: str,
    end_date: str,
    department_id: Optional[int] = None,
    coordinator_id: Optional[int] = None,  # NEW: Filter by coordinator's team
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera file PDF con la turnazione."""
    from fastapi.responses import Response
    from utils_pdf import generate_shift_pdf, get_italian_holidays
    
    # 1. Date e Periodo
    try:
        s_date = datetime.strptime(start_date, "%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data non valida")

    # 2. Recupera Team
    query = db.query(Employee).filter(Employee.is_active == True)
    
    dept_name = "TUTTI I REPARTI"
    
    # 2a. Filter by Coordinator (NEW)
    if coordinator_id:
        # Find the coordinator's employee record
        coordinator_emp = db.query(Employee).filter(Employee.id == coordinator_id).first()
        if coordinator_emp:
            # Get team: employees where manager_id or co_manager_id = coordinator
            query = query.filter(
                or_(
                    Employee.manager_id == coordinator_id,
                    Employee.co_manager_id == coordinator_id
                )
            )
            dept_name = f"Team {coordinator_emp.first_name} {coordinator_emp.last_name}"
    # 2b. Filter by Department (if no coordinator filter)
    elif department_id:
        query = query.filter(Employee.department_id == department_id)
        dept = db.query(Department).filter(Department.id == department_id).first()
        if dept:
            dept_name = dept.name
    
    # Eager load banchina?
    employees = query.order_by(Employee.last_name, Employee.first_name).all()
    
    # 3. Recupera Turni & Assenze
    shifts_data = {}
    
    # 3a. Turni
    shifts = db.query(ShiftAssignment).filter(
        ShiftAssignment.work_date >= s_date,
        ShiftAssignment.work_date <= e_date
    ).all()
    
    for s in shifts:
        if s.employee_id not in shifts_data:
            shifts_data[s.employee_id] = {}
        
        label = s.shift_type.upper()
        if s.shift_type == 'morning': label = '06-14'
        elif s.shift_type == 'afternoon': label = '14-22'
        elif s.shift_type == 'night': label = '22-06'
        elif s.shift_type == 'manual':
             label = f"{s.start_time}-{s.end_time}"
        elif s.shift_type == 'off': label = 'RIPOSO'
             
        date_str = s.work_date.strftime("%Y-%m-%d")
        shifts_data[s.employee_id][date_str] = label

    # 3b. Leave Requests (Assenze approvate) - SOLO per i dipendenti nel team filtrato
    leaves_alerts = [] # Lista di stringhe per alerts
    
    # Get employee IDs from the filtered list
    filtered_emp_ids = [emp.id for emp in employees]
    
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.status == 'approved',
        LeaveRequest.start_date <= e_date,
        LeaveRequest.end_date >= s_date,
        LeaveRequest.employee_id.in_(filtered_emp_ids)  # Filter by team!
    ).all()
    
    # Map for easy lookup to build alert strings
    leaves_map = {} # emp_name -> [leave_type]
    
    for l in leaves:
        if l.employee_id not in shifts_data:
            shifts_data[l.employee_id] = {}
            
        curr = max(l.start_date, s_date)
        end = min(l.end_date, e_date)
        
        # Add to alert list (unique entry per person per type?)
        emp = db.query(Employee).filter(Employee.id == l.employee_id).first()
        emp_name = f"{emp.last_name} {emp.first_name}" if emp else "Sconosciuto"
        
        leave_label = l.leave_type.upper()
        if leave_label == 'VACATION': leave_label = 'FERIE'
        elif leave_label == 'SICK': leave_label = 'MALATTIA'
        elif leave_label == 'PERMIT': leave_label = 'PERMESSO'
        
        alert_str = f"{emp_name} in {leave_label}"
        if alert_str not in leaves_map:
            leaves_map[alert_str] = True
            leaves_alerts.append(alert_str)
        
        while curr <= end:
            d_str = curr.strftime("%Y-%m-%d")
            shifts_data[l.employee_id][d_str] = leave_label
            curr += timedelta(days=1)

    # 4. Formatta dati per PDF generator
    # Pre-calc holidays dict
    holidays_dict = {}
    years_range = {s_date.year, e_date.year}
    for y in years_range:
        holidays_dict.update(get_italian_holidays(y))

    pdf_rows = []
    period_days = []
    curr = s_date
    while curr <= e_date:
        period_days.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)
        
    for emp in employees:
        emp_shifts = []
        user_shifts = shifts_data.get(emp.id, {})
        
        for d_str in period_days:
            # Check Holiday first
            d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
            if d_obj in holidays_dict:
                cell_val = holidays_dict[d_obj] # es. "EPIFANIA"
            else:
                cell_val = user_shifts.get(d_str, "")
            
            emp_shifts.append(cell_val)
            
        # Get Banchina
        banchina_str = "-"
        if emp.default_banchina:
            banchina_str = emp.default_banchina.code
            
        pdf_rows.append({
            "name": f"{emp.last_name} {emp.first_name}",
            "banchina": banchina_str,
            "shifts": emp_shifts
        })

    # 5. Genera Alerts (Festività)
    holidays_alerts = []
    
    curr = s_date
    while curr <= e_date:
        if curr.date() in holidays_dict:
            name = holidays_dict[curr.date()]
            holidays_alerts.append(f"{curr.strftime('%d/%m')} {name}")
        curr += timedelta(days=1)
        
    final_alerts = holidays_alerts + leaves_alerts

    # 6. Genera PDF
    pdf_buffer = generate_shift_pdf(
        department_name=dept_name,
        start_date=s_date,
        end_date=e_date,
        employees_data=pdf_rows,
        alerts=final_alerts
    )
    
    filename = f"Turni_{s_date.strftime('%Y%m%d')}_{dept_name.replace(' ', '_')}.pdf"
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/holidays", summary="Get holidays for a period")
async def get_holidays_endpoint(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ritorna le festività per l'anno specificato."""
    from utils_pdf import get_italian_holidays
    # get_italian_holidays returns a dict {date: name}
    holidays = get_italian_holidays(year)
    # Convert keys to str for JSON
    return {k.strftime("%Y-%m-%d"): v for k, v in holidays.items()}
