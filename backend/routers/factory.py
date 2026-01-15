from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db, ShiftRequirement, Employee, ShiftAssignment, Banchina
from models.core import Department
from security import get_current_user, User

router = APIRouter(prefix="/factory", tags=["Factory"])

# --- SCHEMAS ---
class KPIUpdate(BaseModel):
    kpi_target: int

class RequirementResponse(BaseModel):
    id: int
    banchina_id: int
    banchina_code: str
    role_name: str
    quantity: float = 1.0
    kpi_target: int
    note: Optional[str] = None

    class Config:
        from_attributes = True

class CostEstimate(BaseModel):
    date: str
    department_name: str
    total_hours: float
    total_cost: float
    employees_count: int

class StaffingStatus(BaseModel):
    banchina_code: str
    role_name: str
    required: float
    assigned: int
    status: str # "under", "balanced", "surplus"
    shift_type: str 

# --- ENDPOINTS ---

@router.get("/requirements", response_model=List[RequirementResponse], summary="List all shift requirements with KPIs")
async def get_requirements(
    banchina_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(ShiftRequirement).options(joinedload(ShiftRequirement.banchina))
    if banchina_id:
        query = query.filter(ShiftRequirement.banchina_id == banchina_id)
    
    reqs = query.all()
    
    return [
        RequirementResponse(
            id=r.id,
            banchina_id=r.banchina_id,
            banchina_code=r.banchina.code if r.banchina else "N/D",
            role_name=r.role_name,
            quantity=r.quantity if r.quantity is not None else 1.0,
            kpi_target=r.kpi_target,
            note=r.note
        ) for r in reqs
    ]

@router.patch("/requirements/{id}/kpi", summary="Update KPI Target")
async def update_kpi(
    id: int,
    kpi: KPIUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Only Admin or specialized roles?
    req = db.query(ShiftRequirement).filter(ShiftRequirement.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisito non trovato")
    
    req.kpi_target = kpi.kpi_target
    db.commit()
    return {"status": "updated", "id": id, "new_target": req.kpi_target}

@router.get("/costs/report", summary="Calculate theoretical costs for a period")
async def get_costs_report(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Ritorna le ore totali per dipendente nel periodo selezionato.
    Separa le ore feriali (weekday) dalle ore del sabato (saturday).
    """
    try:
        s_date = datetime.strptime(start_date, "%Y-%m-%d")
        e_date = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Date non valide")
        
    # Query Shifts
    shifts = db.query(ShiftAssignment).filter(
        ShiftAssignment.work_date >= s_date,
        ShiftAssignment.work_date <= e_date,
        ShiftAssignment.shift_type.in_(['morning', 'afternoon', 'night', 'manual'])
    ).options(joinedload(ShiftAssignment.employee).joinedload(Employee.department)).all()
    
    # Process Data
    dept_map = {}
    
    for s in shifts:
        try:
            emp = s.employee
            if not emp:
                continue
                
            # Safe access to department
            dept_name = "N/D"
            if emp.department_name:
                dept_name = emp.department_name
            elif emp.department and hasattr(emp.department, 'name'):
                dept_name = emp.department.name
            
            # Determine if Saturday (5 = Sat, 6 = Sun)
            is_saturday = s.work_date.weekday() == 5
            
            # Calculate hours
            hours = 8.0 # Default full shift
            if s.shift_type == 'manual' and s.start_time and s.end_time:
                try:
                    t1 = datetime.strptime(s.start_time, "%H:%M")
                    t2 = datetime.strptime(s.end_time, "%H:%M")
                    diff = (t2 - t1).seconds / 3600
                    
                    # Correction for break: if shift is >= 9 hours (e.g. 08:00-17:00), subtract 1 hour break
                    if diff >= 9.0:
                        hours = diff - 1.0
                    else:
                        hours = diff
                except:
                    hours = 8.0
            
            # Default cost from DB
            db_rate = emp.hourly_cost or 0.0
            
            if dept_name not in dept_map:
                dept_map[dept_name] = {}
            
            emp_id = emp.id
            if emp_id not in dept_map[dept_name]:
                dept_map[dept_name][emp_id] = {
                    "id": emp.id,
                    "name": f"{emp.last_name} {emp.first_name}",
                    "hours_weekday": 0.0,
                    "hours_saturday": 0.0,
                    "db_rate": db_rate
                }
                
            if is_saturday:
                dept_map[dept_name][emp_id]["hours_saturday"] += hours
            else:
                dept_map[dept_name][emp_id]["hours_weekday"] += hours
        except Exception as e:
            print(f"Error processing shift {s.id}: {e}")
            continue

    # Flatten for response
    report = []
    for d_name, emps in dept_map.items():
        employee_list = list(emps.values())
        
        total_hours_w = sum(e["hours_weekday"] for e in employee_list)
        total_hours_s = sum(e["hours_saturday"] for e in employee_list)
        
        report.append({
            "department": d_name,
            "total_hours_weekday": round(total_hours_w, 2),
            "total_hours_saturday": round(total_hours_s, 2),
            "employees": employee_list
        })
        
    return report

@router.get("/staffing/verify", response_model=List[StaffingStatus], summary="Verify staffing vs requirements")
async def verify_staffing(
    date: str,
    shift: str, # morning, afternoon, night
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Confronta required vs assigned per Banchina/Ruolo.
    Richiede che l'assegnazione turno abbia 'requirement_id' collegato!
    Se non collegano il requirement_id manualmente nel planner, questo controllo è difficile.
    Alternativa: inferire dal ruolo dell'impiegato o banchina default?
    
    Approccio V1: Conta assegnazioni che hanno requirement_id settato.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data non valida")
        
    # 1. Get all requirements (active?)
    requirements = db.query(ShiftRequirement).options(joinedload(ShiftRequirement.banchina)).all()
    
    # 2. Get shifts for date/type
    assigned_counts = {} # req_id -> count
    
    assignments = db.query(ShiftAssignment).filter(
        ShiftAssignment.work_date == target_date,
        ShiftAssignment.shift_type == shift,
        ShiftAssignment.requirement_id != None
    ).all()
    
    for a in assignments:
        rid = a.requirement_id
        assigned_counts[rid] = assigned_counts.get(rid, 0) + 1
        
    results = []
    for req in requirements:
        count = assigned_counts.get(req.id, 0)
        needed = req.quantity
        
        status = "balanced"
        if count < needed: status = "under"
        elif count > needed: status = "surplus"
        
        results.append(StaffingStatus(
            banchina_code=req.banchina.code,
            role_name=req.role_name,
            required=needed,
            assigned=count,
            status=status,
            shift_type=shift
        ))
        
    return results
