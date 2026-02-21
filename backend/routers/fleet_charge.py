"""
SL Enterprise - Fleet Charge Router
Gestione ricariche e cicli utilizzo veicoli (muletti, retrattili).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, and_, or_, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from database import get_db
from models.core import User
from models.fleet import FleetVehicle, FleetChargeCycle
from models.hr import Employee
from models.factory import Banchina
from security import get_current_user

IT_TZ = ZoneInfo("Europe/Rome")
CHARGE_MIN_HOURS = 6

router = APIRouter(prefix="/fleet/charge", tags=["Fleet - Ricarica Mezzi"])


# ── Schemas ──────────────────────────────────────────────────

class PickupRequest(BaseModel):
    battery_pct: int
    early_reason: Optional[str] = None

class ReturnRequest(BaseModel):
    battery_pct: int
    return_type: str           # 'charge' | 'park'
    banchina_id: Optional[int] = None
    operator_id: Optional[int] = None   # se diverso da chi ha prelevato


# ── Helpers ──────────────────────────────────────────────────

def _now_it():
    return datetime.now(IT_TZ)

def _get_active_cycle(db: Session, vehicle_id: int):
    """Ultimo ciclo attivo per un veicolo."""
    return (
        db.query(FleetChargeCycle)
        .filter(
            FleetChargeCycle.vehicle_id == vehicle_id,
            FleetChargeCycle.status.in_(["in_use", "charging", "parked"])
        )
        .order_by(desc(FleetChargeCycle.created_at))
        .first()
    )

def _employee_name(emp: Employee) -> str:
    if not emp:
        return "Sconosciuto"
    return f"{emp.first_name} {emp.last_name}"

def _serialize_cycle(cycle: FleetChargeCycle, db: Session = None):
    """Serializza un ciclo per la risposta API."""
    result = {
        "id": cycle.id,
        "vehicle_id": cycle.vehicle_id,
        "operator_id": cycle.operator_id,
        "operator_name": _employee_name(cycle.pickup_operator),
        "pickup_time": cycle.pickup_time.isoformat() if cycle.pickup_time else None,
        "pickup_battery_pct": cycle.pickup_battery_pct,
        "early_pickup": cycle.early_pickup,
        "early_pickup_reason": cycle.early_pickup_reason,
        "return_time": cycle.return_time.isoformat() if cycle.return_time else None,
        "return_operator_id": cycle.return_operator_id,
        "return_operator_name": _employee_name(cycle.return_operator) if cycle.return_operator else None,
        "return_battery_pct": cycle.return_battery_pct,
        "return_type": cycle.return_type,
        "return_banchina_id": cycle.return_banchina_id,
        "return_banchina_code": cycle.return_banchina.code if cycle.return_banchina else None,
        "status": cycle.status,
        "created_at": cycle.created_at.isoformat() if cycle.created_at else None,
    }
    # Tempi calcolati
    now = _now_it().replace(tzinfo=None)
    if cycle.status == "in_use" and cycle.pickup_time:
        delta = now - cycle.pickup_time
        result["usage_minutes"] = int(delta.total_seconds() / 60)
    if cycle.status == "charging" and cycle.return_time:
        delta = now - cycle.return_time
        charge_minutes = int(delta.total_seconds() / 60)
        
        # Miglioramento B: Calcolo dinamico
        # Stimiamo 0-100% in 5h -> 300 min -> 3 min per 1%
        battery_start = cycle.return_battery_pct or 0
        minutes_needed = (100 - battery_start) * 3
        
        result["charge_minutes"] = charge_minutes
        result["charge_remaining_minutes"] = max(0, minutes_needed - charge_minutes)
        result["charge_complete"] = charge_minutes >= minutes_needed
    return result

def _serialize_vehicle_with_status(vehicle: FleetVehicle, db: Session):
    """Serializza un veicolo con lo stato di ricarica corrente."""
    active_cycle = _get_active_cycle(db, vehicle.id)
    
    charge_status = "available"
    current_operator = None
    battery_pct = None
    charge_minutes = None
    charge_remaining = None
    last_banchina = None
    cycle_id = None
    
    if active_cycle:
        charge_status = active_cycle.status
        cycle_id = active_cycle.id
        
        if active_cycle.status == "in_use":
            current_operator = _employee_name(active_cycle.pickup_operator)
            battery_pct = active_cycle.pickup_battery_pct
        elif active_cycle.status == "charging":
            now = _now_it().replace(tzinfo=None)
            delta = now - active_cycle.return_time
            charge_minutes = int(delta.total_seconds() / 60)
            
            # Miglioramento B: Calcolo dinamico
            battery_start = active_cycle.return_battery_pct or 0
            minutes_needed = (100 - battery_start) * 3
            
            charge_remaining = max(0, minutes_needed - charge_minutes)
            battery_pct = active_cycle.return_battery_pct
            current_operator = _employee_name(active_cycle.return_operator or active_cycle.pickup_operator)
        elif active_cycle.status == "parked":
            battery_pct = active_cycle.return_battery_pct
            if active_cycle.return_banchina:
                last_banchina = active_cycle.return_banchina.code
    
    return {
        "id": vehicle.id,
        "vehicle_type": vehicle.vehicle_type,
        "brand": vehicle.brand,
        "model": vehicle.model,
        "internal_code": vehicle.internal_code,
        "banchina_id": vehicle.banchina_id,
        "banchina_code": vehicle.banchina.code if vehicle.banchina else None,
        "vehicle_status": vehicle.status,
        "charge_status": charge_status,
        "current_operator": current_operator,
        "battery_pct": battery_pct,
        "charge_minutes": charge_minutes,
        "charge_remaining_minutes": charge_remaining,
        "last_banchina": last_banchina,
        "cycle_id": cycle_id,
    }


# ════════════════════════════════════════════════════════════════
# OPERATOR ENDPOINTS (open to all authenticated users)
# ════════════════════════════════════════════════════════════════

@router.get("/vehicles", summary="Lista veicoli con stato ricarica")
async def list_charge_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista tutti i veicoli operativi/bloccati con stato ricarica corrente."""
    vehicles = (
        db.query(FleetVehicle)
        .filter(FleetVehicle.is_active == True)
        .options(joinedload(FleetVehicle.banchina))
        .order_by(FleetVehicle.internal_code)
        .all()
    )
    return [_serialize_vehicle_with_status(v, db) for v in vehicles]


@router.get("/my-active", summary="Il mio veicolo attualmente riservato")
async def get_my_active_vehicle(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ritorna il ciclo attivo dell'utente corrente (se ha un veicolo prelevato)."""
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        return None
    
    active = (
        db.query(FleetChargeCycle)
        .filter(
            FleetChargeCycle.operator_id == employee.id,
            FleetChargeCycle.status == "in_use"
        )
        .options(
            joinedload(FleetChargeCycle.vehicle),
            joinedload(FleetChargeCycle.pickup_operator),
            joinedload(FleetChargeCycle.return_operator),
            joinedload(FleetChargeCycle.return_banchina)
        )
        .first()
    )
    if not active:
        return None
    
    return {
        "cycle": _serialize_cycle(active),
        "vehicle": _serialize_vehicle_with_status(active.vehicle, db)
    }


@router.post("/pickup/{vehicle_id}", summary="Preleva veicolo")
async def pickup_vehicle(
    vehicle_id: int,
    body: PickupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preleva un veicolo e inizia un nuovo ciclo di utilizzo."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(404, "Veicolo non trovato")
    
    if vehicle.status == "blocked":
        raise HTTPException(403, "⛔ Veicolo bloccato per sicurezza — non prelevabile")
    
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(400, "Account non collegato a un dipendente")
    
    # Verifica che il veicolo non sia già in uso
    existing = _get_active_cycle(db, vehicle_id)
    
    if existing and existing.status == "in_use":
        op_name = _employee_name(existing.pickup_operator)
        raise HTTPException(409, f"🔴 Veicolo già in uso da {op_name}")
    
    # Se in carica, verifica durata minima proporzionata
    is_early = False
    if existing and existing.status == "charging":
        now = _now_it().replace(tzinfo=None)
        charge_duration = now - existing.return_time
        charge_minutes = int(charge_duration.total_seconds() / 60)
        
        battery_start = existing.return_battery_pct or 0
        minutes_needed = (100 - battery_start) * 3
        
        if charge_minutes < minutes_needed:
            if not body.early_reason:
                remaining_minutes = minutes_needed - charge_minutes
                hours_left = remaining_minutes // 60
                mins_left = remaining_minutes % 60
                raise HTTPException(
                    422,
                    f"⚠️ Carica in corso da {charge_minutes} minuti. "
                    f"Mancano {hours_left}h {mins_left}m al 100%. "
                    f"Invia 'early_reason' per procedere comunque."
                )
            is_early = True
    
    # Chiudi ciclo precedente
    if existing and existing.status in ("charging", "parked"):
        existing.status = "completed"
    
    # Crea nuovo ciclo
    now = _now_it().replace(tzinfo=None)
    new_cycle = FleetChargeCycle(
        vehicle_id=vehicle_id,
        operator_id=employee.id,
        pickup_time=now,
        pickup_battery_pct=body.battery_pct,
        early_pickup=is_early,
        early_pickup_reason=body.early_reason if is_early else None,
        status="in_use",
        created_at=now,
    )
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)
    
    return {
        "message": f"✅ Veicolo {vehicle.internal_code} prelevato",
        "cycle_id": new_cycle.id,
        "early_pickup": is_early
    }


@router.post("/takeover/{vehicle_id}", summary="Passaggio di consegne (forzato)")
async def takeover_vehicle(
    vehicle_id: int,
    body: PickupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chiude forzatamente il turno aperto da un altro operatore assegnandogli la penalità, e apre un nuovo ciclo."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(404, "Veicolo non trovato")
    
    if vehicle.status == "blocked":
        raise HTTPException(403, "⛔ Veicolo bloccato per sicurezza")
    
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(400, "Account non collegato a un dipendente")
    
    existing = _get_active_cycle(db, vehicle_id)
    if not existing or existing.status != "in_use":
        raise HTTPException(400, "Il veicolo non è 'in uso' da nessun operatore")
    
    if existing.operator_id == employee.id:
        raise HTTPException(400, "Non puoi forzare il passaggio su te stesso. Usa Riconsegna e poi Preleva.")
        
    now = _now_it().replace(tzinfo=None)
    
    # Chiudi ciclo precedente con penalità
    existing.status = "completed"
    existing.return_time = now
    existing.return_battery_pct = body.battery_pct
    existing.return_type = "takeover"
    existing.forgot_return = True
    existing.forced_return_by = employee.id
    
    # Crea nuovo ciclo per l'operatore corrente
    new_cycle = FleetChargeCycle(
        vehicle_id=vehicle_id,
        operator_id=employee.id,
        pickup_time=now,
        pickup_battery_pct=body.battery_pct,
        status="in_use",
        created_at=now,
    )
    db.add(new_cycle)
    db.commit()
    db.refresh(new_cycle)
    
    op_name = _employee_name(existing.pickup_operator)
    return {
        "message": f"✅ Passaggio di consegne da {op_name} completato.",
        "cycle_id": new_cycle.id
    }


@router.post("/return/{cycle_id}", summary="Riconsegna veicolo")
async def return_vehicle(
    cycle_id: int,
    body: ReturnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Riconsegna il veicolo: messo in carica o lasciato fermo."""
    cycle = (
        db.query(FleetChargeCycle)
        .options(joinedload(FleetChargeCycle.vehicle))
        .filter(FleetChargeCycle.id == cycle_id)
        .first()
    )
    if not cycle:
        raise HTTPException(404, "Ciclo non trovato")
    if cycle.status != "in_use":
        raise HTTPException(400, "Questo ciclo non è in uso")
    
    # Validazione return_type
    if body.return_type not in ("charge", "park"):
        raise HTTPException(422, "return_type deve essere 'charge' o 'park'")
    
    if body.return_type == "park" and not body.banchina_id:
        raise HTTPException(422, "Banchina obbligatoria quando si lascia il mezzo senza carica")
    
    # Identifica chi riconsegna
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    return_emp_id = employee.id if employee else cycle.operator_id
    
    # Se body specifica un altro operatore override
    if body.operator_id:
        return_emp_id = body.operator_id
    
    now = _now_it().replace(tzinfo=None)
    
    cycle.return_time = now
    cycle.return_operator_id = return_emp_id
    cycle.return_battery_pct = body.battery_pct
    cycle.return_type = body.return_type
    
    warnings = []
    
    if body.return_type == "charge":
        cycle.status = "charging"
        if body.battery_pct >= 30:
            warnings.append("⚠️ Batteria ancora sufficiente (≥30%). Carica registrata comunque.")
    else:
        cycle.status = "parked"
        cycle.return_banchina_id = body.banchina_id
        # Aggiorna posizione veicolo
        cycle.vehicle.banchina_id = body.banchina_id
        warnings.append("⚠️ ATTENZIONE — TOGLIERE SEMPRE LA PRESA DALLA BATTERIA")
        if body.battery_pct <= 20:
            warnings.append("⛔ BATTERIA CRITICA — Il mezzo potrebbe non essere utilizzabile domani!")
    
    db.commit()
    
    return {
        "message": f"✅ Veicolo riconsegnato — {'In carica' if body.return_type == 'charge' else 'Fermo'}",
        "warnings": warnings,
        "cycle_id": cycle.id
    }


# ════════════════════════════════════════════════════════════════
# ADMIN/CONTROL ENDPOINTS
# ════════════════════════════════════════════════════════════════

def _require_charge_control(user: User, db: Session):
    """Verifica permesso view_charge_control."""
    if not user.role:
        raise HTTPException(403, "Accesso negato")
    role = db.query(User).filter(User.id == user.id).first()
    # Admin e super_admin hanno sempre accesso
    if hasattr(user, 'role') and user.role in ('admin', 'super_admin'):
        return True
    # Controlla permesso nel ruolo
    from models.core import Role
    user_role = db.query(Role).filter(Role.id == user.role_id).first()
    if user_role and user_role.permissions:
        perms = user_role.permissions if isinstance(user_role.permissions, list) else []
        if 'view_charge_control' in perms or '*' in perms:
            return True
    raise HTTPException(403, "Permesso view_charge_control richiesto")


@router.get("/dashboard", summary="Dashboard KPI ricariche")
async def charge_dashboard(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """KPI dashboard per il controllo ricariche."""
    _require_charge_control(current_user, db)
    
    now = _now_it().replace(tzinfo=None)
    period_start = now - timedelta(days=days)
    
    # Conteggi real-time
    in_use = db.query(func.count(FleetChargeCycle.id)).filter(FleetChargeCycle.status == "in_use").scalar()
    charging = db.query(func.count(FleetChargeCycle.id)).filter(FleetChargeCycle.status == "charging").scalar()
    parked = db.query(func.count(FleetChargeCycle.id)).filter(FleetChargeCycle.status == "parked").scalar()
    
    # Cicli nel periodo
    period_cycles = (
        db.query(FleetChargeCycle)
        .filter(FleetChargeCycle.created_at >= period_start)
        .all()
    )
    
    total_completed = sum(1 for c in period_cycles if c.return_type is not None)
    charged = sum(1 for c in period_cycles if c.return_type == "charge")
    parked_count = sum(1 for c in period_cycles if c.return_type == "park")
    early_pickups = sum(1 for c in period_cycles if c.early_pickup)
    
    # Conformità 6h (cicli di carica completati)
    completed_charges = [
        c for c in period_cycles 
        if c.return_type == "charge" and c.status == "completed" and c.return_time
    ]
    compliant_charges = 0
    for c in completed_charges:
        # Trova il ciclo successivo dello stesso veicolo per calcolare durata carica
        next_cycle = (
            db.query(FleetChargeCycle)
            .filter(
                FleetChargeCycle.vehicle_id == c.vehicle_id,
                FleetChargeCycle.pickup_time > c.return_time
            )
            .order_by(FleetChargeCycle.pickup_time)
            .first()
        )
        if next_cycle:
            charge_duration = next_cycle.pickup_time - c.return_time
            minutes_needed = (100 - (c.return_battery_pct or 0)) * 3
            if (charge_duration.total_seconds() / 60) >= minutes_needed:
                compliant_charges += 1
    
    compliance_rate = (compliant_charges / len(completed_charges) * 100) if completed_charges else 100
    
    # Ricariche non necessarie (batteria ≥ 30%)
    unnecessary_charges = sum(
        1 for c in period_cycles 
        if c.return_type == "charge" and c.return_battery_pct and c.return_battery_pct >= 30
    )
    
    # Batterie critiche ignorate (≤ 20% senza carica)
    critical_ignored = sum(
        1 for c in period_cycles 
        if c.return_type == "park" and c.return_battery_pct and c.return_battery_pct <= 20
    )
    
    return {
        "realtime": {
            "in_use": in_use,
            "charging": charging,
            "parked": parked,
        },
        "period": {
            "days": days,
            "total_cycles": total_completed,
            "charged": charged,
            "parked": parked_count,
            "early_pickups": early_pickups,
            "compliance_rate_6h": round(compliance_rate, 1),
            "unnecessary_charges": unnecessary_charges,
            "critical_battery_ignored": critical_ignored,
        }
    }


@router.get("/history", summary="Storico completo cicli")
async def charge_history(
    days: int = 30,
    vehicle_id: Optional[int] = None,
    operator_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Storico completo dei cicli di ricarica con filtri."""
    _require_charge_control(current_user, db)
    
    now = _now_it().replace(tzinfo=None)
    period_start = now - timedelta(days=days)
    
    query = (
        db.query(FleetChargeCycle)
        .options(
            joinedload(FleetChargeCycle.vehicle),
            joinedload(FleetChargeCycle.pickup_operator),
            joinedload(FleetChargeCycle.return_operator),
            joinedload(FleetChargeCycle.return_banchina)
        )
        .filter(FleetChargeCycle.created_at >= period_start)
    )
    
    if vehicle_id:
        query = query.filter(FleetChargeCycle.vehicle_id == vehicle_id)
    if operator_id:
        query = query.filter(
            or_(
                FleetChargeCycle.operator_id == operator_id,
                FleetChargeCycle.return_operator_id == operator_id
            )
        )
    if status:
        query = query.filter(FleetChargeCycle.status == status)
    
    total = query.count()
    cycles = (
        query
        .order_by(desc(FleetChargeCycle.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    
    return {
        "total": total,
        "page": page,
        "items": [{
            **_serialize_cycle(c),
            "vehicle_code": c.vehicle.internal_code if c.vehicle else None,
            "vehicle_brand": c.vehicle.brand if c.vehicle else None,
            "vehicle_type": c.vehicle.vehicle_type if c.vehicle else None,
        } for c in cycles]
    }


@router.get("/vehicle/{vehicle_id}/history", summary="Storico singolo veicolo")
async def vehicle_charge_history(
    vehicle_id: int,
    days: int = 90,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Storico cronologico completo di un singolo veicolo."""
    _require_charge_control(current_user, db)
    
    now = _now_it().replace(tzinfo=None)
    period_start = now - timedelta(days=days)
    
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(404, "Veicolo non trovato")
    
    cycles = (
        db.query(FleetChargeCycle)
        .options(
            joinedload(FleetChargeCycle.pickup_operator),
            joinedload(FleetChargeCycle.return_operator),
            joinedload(FleetChargeCycle.return_banchina)
        )
        .filter(
            FleetChargeCycle.vehicle_id == vehicle_id,
            FleetChargeCycle.created_at >= period_start
        )
        .order_by(desc(FleetChargeCycle.created_at))
        .all()
    )
    
    # Statistiche veicolo
    total_usage_minutes = 0
    total_charge_minutes = 0
    for c in cycles:
        if c.return_time and c.pickup_time:
            total_usage_minutes += int((c.return_time - c.pickup_time).total_seconds() / 60)
    
    return {
        "vehicle": {
            "id": vehicle.id,
            "internal_code": vehicle.internal_code,
            "brand": vehicle.brand,
            "model": vehicle.model,
            "vehicle_type": vehicle.vehicle_type,
        },
        "stats": {
            "total_cycles": len(cycles),
            "avg_usage_minutes": round(total_usage_minutes / len(cycles)) if cycles else 0,
        },
        "cycles": [_serialize_cycle(c) for c in cycles]
    }


@router.get("/operators/stats", summary="Statistiche comportamento operatori")
async def operator_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analisi comportamento operatori: conformità, abitudini di ricarica."""
    _require_charge_control(current_user, db)
    
    now = _now_it().replace(tzinfo=None)
    period_start = now - timedelta(days=days)
    
    cycles = (
        db.query(FleetChargeCycle)
        .options(
            joinedload(FleetChargeCycle.pickup_operator),
        )
        .filter(
            FleetChargeCycle.created_at >= period_start,
            FleetChargeCycle.return_type.isnot(None)  # Solo cicli completati
        )
        .all()
    )
    
    # Raggruppa per operatore
    operators = {}
    for c in cycles:
        op_id = c.operator_id
        if op_id not in operators:
            operators[op_id] = {
                "operator_id": op_id,
                "operator_name": _employee_name(c.pickup_operator),
                "total_cycles": 0,
                "charged": 0,
                "parked": 0,
                "early_pickups": 0,
                "unnecessary_charges": 0,
                "critical_ignored": 0,
                "forgot_returns": 0,
                "total_usage_minutes": 0,
                "battery_sum_return": 0,
            }
        
        op = operators[op_id]
        op["total_cycles"] += 1
        
        if c.return_type == "charge":
            op["charged"] += 1
            if c.return_battery_pct and c.return_battery_pct >= 30:
                op["unnecessary_charges"] += 1
        elif c.return_type == "park":
            op["parked"] += 1
            if c.return_battery_pct and c.return_battery_pct <= 20:
                op["critical_ignored"] += 1
        elif c.return_type == "takeover" and getattr(c, "forgot_return", False):
            op["forgot_returns"] += 1
        else:
            if getattr(c, "forgot_return", False):
                op["forgot_returns"] += 1
        
        if c.early_pickup:
            op["early_pickups"] += 1
        
        if c.return_time and c.pickup_time:
            op["total_usage_minutes"] += int((c.return_time - c.pickup_time).total_seconds() / 60)
        
        if c.return_battery_pct:
            op["battery_sum_return"] += c.return_battery_pct
    
    # Calcola metriche e rating
    result = []
    for op in operators.values():
        total = op["total_cycles"]
        charge_rate = (op["charged"] / total * 100) if total > 0 else 0
        unnecessary_rate = (op["unnecessary_charges"] / op["charged"] * 100) if op["charged"] > 0 else 0
        early_rate = (op["early_pickups"] / total * 100) if total > 0 else 0
        avg_battery = round(op["battery_sum_return"] / total) if total > 0 else 0
        avg_usage = round(op["total_usage_minutes"] / total) if total > 0 else 0
        
        # Rating: green/yellow/red
        score = 0
        if charge_rate >= 80: score += 2
        elif charge_rate >= 50: score += 1
        
        if unnecessary_rate <= 20: score += 2
        elif unnecessary_rate <= 50: score += 1
        
        if early_rate <= 10: score += 2
        elif early_rate <= 30: score += 1
        
        if op["critical_ignored"] == 0: score += 2
        elif op["critical_ignored"] <= 3: score += 1
        
        if op["forgot_returns"] == 0: score += 2
        elif op["forgot_returns"] <= 2: score += 0
        else: score -= 2
        
        if score >= 7:
            rating = "green"
        elif score >= 4:
            rating = "yellow"
        else:
            rating = "red"
        
        result.append({
            "operator_id": op["operator_id"],
            "operator_name": op["operator_name"],
            "total_cycles": total,
            "charge_rate": round(charge_rate, 1),
            "unnecessary_charge_rate": round(unnecessary_rate, 1),
            "early_pickup_rate": round(early_rate, 1),
            "critical_ignored": op["critical_ignored"],
            "forgot_returns": op["forgot_returns"],
            "avg_battery_return": avg_battery,
            "avg_usage_minutes": avg_usage,
            "rating": rating,
        })
    
    # Ordina: rosso prima, poi giallo, poi verde
    rating_order = {"red": 0, "yellow": 1, "green": 2}
    result.sort(key=lambda x: (rating_order.get(x["rating"], 3), -x["total_cycles"]))
    
    return result
