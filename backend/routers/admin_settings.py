"""
SL Enterprise - Admin Settings Router
CRUD per configurazioni di sistema: Reparti, Ruoli Operativi, Banchine, Postazioni
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from database import get_db, Department, Employee, Banchina, AuditLog
from security import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Settings"])

def log_audit(db: Session, user_id: int, action: str, details: str):
    """Crea un record di audit log."""
    try:
        log = AuditLog(user_id=user_id, action=action, details=details)
        db.add(log)
        # Il commit viene solitamente fatto dal chiamante, ma qui per sicurezza
        # se il chiamante fa commit del suo oggetto, questo viene incluso.
        # Se il chiamante fa crash, non vogliamo loggare?
        # In genere si logga "successo" quindi va bene commit unico.
    except Exception as e:
        print(f"AUDIT LOG ERROR: {e}")


# ============================================================
# SCHEMAS
# ============================================================

class DepartmentCreate(BaseModel):
    name: str
    cost_center: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: int
    name: str
    cost_center: Optional[str] = None
    employee_count: int = 0

    class Config:
        from_attributes = True

class JobRoleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class JobRoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    employee_count: int = 0

class BanchinaCreate(BaseModel):
    code: str
    name: Optional[str] = None

class BanchinaResponse(BaseModel):
    id: int
    code: str
    name: Optional[str] = None

    class Config:
        from_attributes = True

class WorkstationCreate(BaseModel):
    name: str
    code: Optional[str] = None
    department_id: Optional[int] = None
    description: Optional[str] = None
    requires_kpi: Optional[bool] = False

class WorkstationResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    department_id: Optional[int] = None
    description: Optional[str] = None
    requires_kpi: bool = False
    kpi_sector: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# DEPARTMENTS (Reparti)
# ============================================================

@router.get("/departments", response_model=List[DepartmentResponse], summary="Lista Reparti")
async def list_departments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Ottieni lista reparti con conteggio dipendenti."""
    departments = db.query(Department).order_by(Department.name).all()
    
    result = []
    for dept in departments:
        emp_count = db.query(Employee).filter(Employee.department_id == dept.id).count()
        result.append({
            "id": dept.id,
            "name": dept.name,
            "cost_center": dept.cost_center,
            "employee_count": emp_count
        })
    return result


@router.post("/departments", response_model=DepartmentResponse, summary="Crea Reparto")
async def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Crea nuovo reparto."""
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Reparto già esistente")
    
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_audit(db, current_user.id, "CREATE_DEPARTMENT", f"Creato reparto: {dept.name}")
    return {"id": dept.id, "name": dept.name, "cost_center": dept.cost_center, "employee_count": 0}


@router.patch("/departments/{dept_id}", response_model=DepartmentResponse, summary="Modifica Reparto")
async def update_department(
    dept_id: int,
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Modifica reparto esistente."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Reparto non trovato")
    
    # Check duplicates
    existing = db.query(Department).filter(Department.name == data.name, Department.id != dept_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nome reparto già esistente")
    
    dept.name = data.name
    dept.cost_center = data.cost_center
    log_audit(db, current_user.id, "UPDATE_DEPARTMENT", f"Modificato reparto {dept_id}: {data.name}")
    db.commit()
    
    emp_count = db.query(Employee).filter(Employee.department_id == dept.id).count()
    return {"id": dept.id, "name": dept.name, "cost_center": dept.cost_center, "employee_count": emp_count}


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Reparto")
async def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Elimina reparto. Fallisce se ha dipendenti associati."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Reparto non trovato")
    
    emp_count = db.query(Employee).filter(Employee.department_id == dept_id).count()
    if emp_count > 0:
        raise HTTPException(status_code=400, detail=f"Impossibile eliminare: {emp_count} dipendenti associati")
    
    dept_name = dept.name
    db.delete(dept)
    log_audit(db, current_user.id, "DELETE_DEPARTMENT", f"Eliminato reparto: {dept_name}")
    db.commit()
    return None


# ============================================================
# JOB ROLES (Ruoli Operativi) - Uses current_role field in Employee
# ============================================================

@router.get("/job-roles", response_model=List[JobRoleResponse], summary="Lista Ruoli Operativi")
async def list_job_roles(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Ottieni lista ruoli operativi univoci dai dipendenti."""
    # Get unique roles from employees
    roles = db.query(
        Employee.current_role,
        func.count(Employee.id).label('count')
    ).filter(
        Employee.current_role != None,
        Employee.current_role != '',
        Employee.current_role != 'nan'
    ).group_by(Employee.current_role).order_by(Employee.current_role).all()
    
    result = []
    for idx, (role_name, count) in enumerate(roles, 1):
        result.append({
            "id": idx,  # Virtual ID
            "name": role_name,
            "description": None,
            "employee_count": count
        })
    return result


@router.post("/job-roles", response_model=JobRoleResponse, summary="Crea Ruolo Operativo")
async def create_job_role(
    data: JobRoleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Crea nuovo ruolo operativo (sarà disponibile per selezione nei dipendenti)."""
    # Check if role already exists
    existing = db.query(Employee).filter(Employee.current_role == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ruolo già esistente")
    
    # Note: Job roles are stored in employee records, not in a separate table
    # We just return the new role as valid
    log_audit(db, current_user.id, "CREATE_JOB_ROLE", f"Creato ruolo: {data.name}")
    return {"id": 0, "name": data.name, "description": data.description, "employee_count": 0}


@router.patch("/job-roles/{role_id}", response_model=JobRoleResponse, summary="Rinomina Ruolo Operativo")
async def update_job_role(
    role_id: int,
    data: JobRoleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Rinomina ruolo operativo - aggiorna tutti i dipendenti con quel ruolo."""
    # Get current roles to find the one to update
    roles = db.query(Employee.current_role).filter(
        Employee.current_role != None,
        Employee.current_role != ''
    ).distinct().order_by(Employee.current_role).all()
    
    role_names = [r[0] for r in roles]
    if role_id < 1 or role_id > len(role_names):
        raise HTTPException(status_code=404, detail="Ruolo non trovato")
    
    old_name = role_names[role_id - 1]
    new_name = data.name
    
    # Update all employees with this role
    db.query(Employee).filter(Employee.current_role == old_name).update(
        {"current_role": new_name}
    )
    log_audit(db, current_user.id, "UPDATE_JOB_ROLE", f"Rinominato ruolo da '{old_name}' a '{new_name}'")
    db.commit()
    
    count = db.query(Employee).filter(Employee.current_role == new_name).count()
    return {"id": role_id, "name": new_name, "description": data.description, "employee_count": count}


@router.delete("/job-roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Ruolo Operativo")
async def delete_job_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Elimina ruolo operativo - rimuove da tutti i dipendenti che lo hanno."""
    roles = db.query(Employee.current_role).filter(
        Employee.current_role != None,
        Employee.current_role != ''
    ).distinct().order_by(Employee.current_role).all()
    
    role_names = [r[0] for r in roles]
    if role_id < 1 or role_id > len(role_names):
        raise HTTPException(status_code=404, detail="Ruolo non trovato")
    
    role_name = role_names[role_id - 1]
    
    # Clear role from all employees
    db.query(Employee).filter(Employee.current_role == role_name).update(
        {"current_role": None}
    )
    log_audit(db, current_user.id, "DELETE_JOB_ROLE", f"Eliminato ruolo: {role_name}")
    db.commit()
    return None


# ============================================================
# BANCHINE
# ============================================================

@router.get("/banchine", response_model=List[BanchinaResponse], summary="Lista Banchine")
async def list_banchine(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Ottieni lista banchine."""
    return db.query(Banchina).order_by(Banchina.code).all()


@router.post("/banchine", response_model=BanchinaResponse, summary="Crea Banchina")
async def create_banchina(
    data: BanchinaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Crea nuova banchina."""
    existing = db.query(Banchina).filter(Banchina.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codice banchina già esistente")
    
    banchina = Banchina(**data.model_dump())
    db.add(banchina)
    db.commit()
    db.refresh(banchina)
    log_audit(db, current_user.id, "CREATE_BANCHINA", f"Creata banchina: {banchina.code} - {banchina.name}")
    return banchina


@router.patch("/banchine/{banchina_id}", response_model=BanchinaResponse, summary="Modifica Banchina")
async def update_banchina(
    banchina_id: int,
    data: BanchinaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Modifica banchina esistente."""
    banchina = db.query(Banchina).filter(Banchina.id == banchina_id).first()
    if not banchina:
        raise HTTPException(status_code=404, detail="Banchina non trovata")
    
    # Check duplicates
    existing = db.query(Banchina).filter(Banchina.code == data.code, Banchina.id != banchina_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codice banchina già esistente")
    
    banchina.code = data.code
    banchina.name = data.name
    log_audit(db, current_user.id, "UPDATE_BANCHINA", f"Modificata banchina {banchina_id}: {data.code}")
    db.commit()
    db.refresh(banchina)
    return banchina


@router.delete("/banchine/{banchina_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Banchina")
async def delete_banchina(
    banchina_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Elimina banchina."""
    banchina = db.query(Banchina).filter(Banchina.id == banchina_id).first()
    if not banchina:
        raise HTTPException(status_code=404, detail="Banchina non trovata")
    
    # Check if used by employees
    emp_count = db.query(Employee).filter(Employee.default_banchina_id == banchina_id).count()
    if emp_count > 0:
        raise HTTPException(status_code=400, detail=f"Impossibile eliminare: {emp_count} dipendenti associati")
    
    code = banchina.code
    db.delete(banchina)
    log_audit(db, current_user.id, "DELETE_BANCHINA", f"Eliminata banchina: {code}")
    db.commit()
    return None


# ============================================================
# WORKSTATIONS (Postazioni KPI) - Uses ShiftRequirement
# ============================================================

from models.shifts import ShiftRequirement

@router.get("/workstations", response_model=List[WorkstationResponse], summary="Lista Postazioni KPI")
async def list_workstations(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Ottieni lista postazioni KPI da ShiftRequirement."""
    try:
        reqs = db.query(ShiftRequirement).order_by(ShiftRequirement.role_name).all()
        return [
            {
                "id": r.id,
                "name": r.role_name,
                "code": str(r.kpi_target) if r.kpi_target is not None else "",
                "department_id": r.banchina_id, 
                "description": r.note or "",
                "requires_kpi": r.requires_kpi or False
            }
            for r in reqs
        ]
    except Exception as e:
        print(f"ERROR list_workstations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workstations", response_model=WorkstationResponse, summary="Crea Postazione KPI")
async def create_workstation(
    data: WorkstationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Crea nuova postazione KPI (ShiftRequirement)."""
    try:
        # Convert code to int for kpi_target if possible, else 0
        target_val = 0
        if data.code and data.code.isdigit():
            target_val = int(data.code)
            
        req = ShiftRequirement(
            role_name=data.name,
            kpi_target=target_val,
            banchina_id=data.department_id if data.department_id else 1, # Default to 1 if missing
            requires_kpi=data.requires_kpi
        )
        
        log_audit(db, current_user.id, "CREATE_WORKSTATION", f"Creata postazione: {req.role_name} (Target: {req.kpi_target})")
        
        return {
            "id": req.id,
            "name": req.role_name,
            "code": str(req.kpi_target),
            "department_id": req.banchina_id,
            "description": data.description,
            "requires_kpi": req.requires_kpi,
            "kpi_sector": req.kpi_sector
        }
    except Exception as e:
        print(f"ERROR create_workstation: {e}")
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Errore creazione: {str(e)}")


@router.patch("/workstations/{ws_id}", response_model=WorkstationResponse, summary="Modifica Postazione KPI")
async def update_workstation(
    ws_id: int,
    data: WorkstationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Modifica postazione KPI."""
    from database import ShiftRequirement
    
    req = db.query(ShiftRequirement).filter(ShiftRequirement.id == ws_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Postazione non trovata")
    
    req.role_name = data.name
    try:
        req.kpi_target = int(data.code) if data.code and data.code.isdigit() else 0
    except:
        req.kpi_target = 0
        
    if data.department_id:
        req.banchina_id = data.department_id
        
    # Handle KPI Flag Change
    if data.requires_kpi is not None:
        req.requires_kpi = data.requires_kpi
    
    log_audit(db, current_user.id, "UPDATE_WORKSTATION", f"Modificata postazione {ws_id}: {req.role_name}")
    db.commit()
    
    return {
        "id": req.id,
        "name": req.role_name,
        "code": req.kpi_target,
        "department_id": req.banchina_id,
        "description": data.description,
        "requires_kpi": req.requires_kpi,
        "kpi_sector": req.kpi_sector
    }


@router.delete("/workstations/{ws_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Postazione KPI")
async def delete_workstation(
    ws_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Elimina postazione KPI."""
    from database import ShiftRequirement
    
    req = db.query(ShiftRequirement).filter(ShiftRequirement.id == ws_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Postazione non trovata")
    
    name = req.role_name
    db.delete(req)
    log_audit(db, current_user.id, "DELETE_WORKSTATION", f"Eliminata postazione: {name}")
    db.commit()
    return None

# ============================================================
# SYSTEM CONFIGURATIONS (Lookup Lists)
# ============================================================

from models.hr import MedicalExamType, TrainingType, EventType
from models.production import DowntimeReason
from pydantic import BaseModel

# Pydantic Models for Config
class ConfigBase(BaseModel):
    name: str  # or label
    description: str | None = None

class DowntimeReasonCreate(BaseModel):
    label: str
    category: str = "other"
    description: str | None = None

class ExamTypeCreate(BaseModel):
    name: str
    frequency_months: int = 12
    description: str | None = None

class TrainingTypeCreate(BaseModel):
    name: str
    validity_months: int = 36
    required_role: str | None = None

class EventTypeCreate(BaseModel):
    label: str
    default_points: int = 0
    severity: str = "info" # info, success, warning, danger
    icon: str = "📝"

# --- Downtime Reasons ---
@router.get("/config/downtime-reasons", summary="Lista Causali Fermo")
async def get_downtime_reasons(db: Session = Depends(get_db)):
    return db.query(DowntimeReason).filter(DowntimeReason.is_active == True).all()

@router.post("/config/downtime-reasons", summary="Crea Causale Fermo")
async def create_downtime_reason(data: DowntimeReasonCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = DowntimeReason(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    log_audit(db, u.id, "CREATE_DOWNTIME_REASON", f"Creata causale: {obj.label}")
    return obj

@router.delete("/config/downtime-reasons/{id}", summary="Elimina Causale Fermo")
async def delete_downtime_reason(id: int, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    try:
        db.query(DowntimeReason).filter(DowntimeReason.id == id).delete()
        db.commit()
        log_audit(db, u.id, "DELETE_DOWNTIME_REASON", f"Eliminata causale ID: {id}")
        return {"ok": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Impossibile eliminare, elemento in uso.")

@router.patch("/config/downtime-reasons/{id}", summary="Modifica Causale Fermo")
async def update_downtime_reason(id: int, data: DowntimeReasonCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = db.query(DowntimeReason).filter(DowntimeReason.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Elemento non trovato")
    for key, value in data.dict().items():
        setattr(obj, key, value)
    db.commit()
    log_audit(db, u.id, "UPDATE_DOWNTIME_REASON", f"Modificata causale {id}")
    return obj

# --- Medical Exam Types ---
@router.get("/config/exam-types", summary="Lista Tipi Visite")
async def get_exam_types(db: Session = Depends(get_db)):
    return db.query(MedicalExamType).all()

@router.post("/config/exam-types", summary="Crea Tipo Visita")
async def create_exam_type(data: ExamTypeCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = MedicalExamType(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    log_audit(db, u.id, "CREATE_EXAM_TYPE", f"Creato tipo visita: {obj.name}")
    return obj

@router.patch("/config/exam-types/{id}", summary="Modifica Tipo Visita")
async def update_exam_type(id: int, data: ExamTypeCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = db.query(MedicalExamType).filter(MedicalExamType.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Elemento non trovato")
    for key, value in data.dict().items():
        setattr(obj, key, value)
    db.commit()
    log_audit(db, u.id, "UPDATE_EXAM_TYPE", f"Modificato tipo visita {id}")
    return obj

@router.delete("/config/exam-types/{id}")
async def delete_exam_type(id: int, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    db.query(MedicalExamType).filter(MedicalExamType.id == id).delete()
    log_audit(db, u.id, "DELETE_EXAM_TYPE", f"Eliminato tipo visita ID: {id}")
    db.commit()
    return {"ok": True}

# --- Training Types ---
@router.get("/config/training-types", summary="Lista Tipi Corsi")
async def get_training_types(db: Session = Depends(get_db)):
    return db.query(TrainingType).all()

@router.post("/config/training-types", summary="Crea Tipo Corso")
async def create_training_type(data: TrainingTypeCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = TrainingType(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    log_audit(db, u.id, "CREATE_TRAINING_TYPE", f"Creato tipo corso: {obj.name}")
    return obj

@router.patch("/config/training-types/{id}", summary="Modifica Tipo Corso")
async def update_training_type(id: int, data: TrainingTypeCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = db.query(TrainingType).filter(TrainingType.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Elemento non trovato")
    for key, value in data.dict().items():
        setattr(obj, key, value)
    db.commit()
    log_audit(db, u.id, "UPDATE_TRAINING_TYPE", f"Modificato tipo corso {id}")
    return obj

@router.delete("/config/training-types/{id}")
async def delete_training_type(id: int, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    db.query(TrainingType).filter(TrainingType.id == id).delete()
    log_audit(db, u.id, "DELETE_TRAINING_TYPE", f"Eliminato tipo corso ID: {id}")
    db.commit()
    return {"ok": True}

# --- Event Types ---
@router.get("/config/event-types", summary="Lista Tipi Eventi")
async def get_event_types(db: Session = Depends(get_db)):
    return db.query(EventType).all()

@router.post("/config/event-types", summary="Crea Tipo Evento")
async def create_event_type(data: EventTypeCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = EventType(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    log_audit(db, u.id, "CREATE_EVENT_TYPE", f"Creato tipo evento: {obj.label}")
    return obj

@router.patch("/config/event-types/{id}", summary="Modifica Tipo Evento")
async def update_event_type(id: int, data: EventTypeCreate, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    obj = db.query(EventType).filter(EventType.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Elemento non trovato")
    for key, value in data.dict().items():
        setattr(obj, key, value)
    db.commit()
    log_audit(db, u.id, "UPDATE_EVENT_TYPE", f"Modificato tipo evento {id}")
    return obj

@router.delete("/config/event-types/{id}")
async def delete_event_type(id: int, db: Session = Depends(get_db), u=Depends(get_current_admin)):
    db.query(EventType).filter(EventType.id == id).delete()
    log_audit(db, u.id, "DELETE_EVENT_TYPE", f"Eliminato tipo evento ID: {id}")
    db.commit()
    return {"ok": True}

# ============================================================
# SYSTEM SETTINGS (Global Key-Value)
# ============================================================
from models.config import SystemSetting

class SystemSettingResponse(BaseModel):
    key: str
    value: str
    description: str | None = None

class SystemSettingUpdate(BaseModel):
    value: str

@router.get("/settings", response_model=List[SystemSettingResponse], summary="Lista Impostazioni Sistema")
async def get_system_settings(db: Session = Depends(get_db)):
    """Recupera tutte le impostazioni globali."""
    # Ensure default exists
    default_hours = db.query(SystemSetting).filter(SystemSetting.key == "annual_leave_hours").first()
    if not default_hours:
        default_hours = SystemSetting(
            key="annual_leave_hours", 
            value="256", 
            description="Ore di permesso annuali predefinite per nuovi dipendenti"
        )
        db.add(default_hours)
        db.commit()
        db.refresh(default_hours)
        
    return db.query(SystemSetting).all()

@router.patch("/settings/{key}", response_model=SystemSettingResponse, summary="Modifica Impostazione")
async def update_system_setting(
    key: str, 
    data: SystemSettingUpdate, 
    db: Session = Depends(get_db), 
    u=Depends(get_current_admin)
):
    """Aggiorna una impostazione globale."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        # Allow creation if not exists? For now yes.
        setting = SystemSetting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
        
    log_audit(db, u.id, "UPDATE_SETTING", f"Modificata impostazione {key} a {data.value}")
    db.commit()
    db.refresh(setting)
    return setting

