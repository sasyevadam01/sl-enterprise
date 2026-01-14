"""
KPI Configurator Router
Gestione configurazione KPI e registrazione giornaliera.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
import io
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from database import (
    SessionLocal, 
    KpiConfig, 
    KpiEntry, 
    ShiftRequirement, 
    ShiftAssignment,
    LeaveRequest,
    User
)

router = APIRouter(prefix="/kpi", tags=["KPI"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# SCHEMAS
# ============================================================

class KpiConfigCreate(BaseModel):
    sector_name: str
    kpi_target_8h: int
    display_order: Optional[int] = 0


class KpiConfigUpdate(BaseModel):
    kpi_target_8h: Optional[int] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class KpiConfigResponse(BaseModel):
    id: int
    sector_name: str
    kpi_target_8h: int
    kpi_target_hourly: Optional[float]
    is_active: bool
    display_order: int
    operators_required: Optional[float] = None  # Calcolato da ShiftRequirement


class KpiEntryCreate(BaseModel):
    kpi_config_id: int
    work_date: date
    shift_type: str  # morning, afternoon, night
    hours_total: float = 8.0
    hours_downtime: float = 0.0
    quantity_produced: int
    downtime_reason: Optional[str] = None
    downtime_notes: Optional[str] = None


class KpiEntryResponse(BaseModel):
    id: int
    kpi_config_id: int
    sector_name: str
    work_date: date
    shift_type: str
    hours_total: float
    hours_downtime: float
    hours_net: float
    quantity_produced: int
    quantity_per_hour: Optional[float]
    efficiency_percent: Optional[float]
    operators_present: Optional[int]
    operators_required: Optional[float]
    staffing_status: Optional[str]
    staffing_delta: Optional[int]
    downtime_reason: Optional[str]
    downtime_notes: Optional[str]


class PanoramicaItem(BaseModel):
    """Stato di un settore per la panoramica."""
    config_id: int
    sector_name: str
    # Status KPI (pallini)
    morning_status: str  # empty, partial, complete
    afternoon_status: str
    night_status: str
    custom_status: str
    # Staffing info
    operators_required: float
    morning_ops: int
    afternoon_ops: int
    night_ops: int
    custom_ops: int


# ============================================================
# ENDPOINTS - CONFIG
# ============================================================

@router.get("/configs", response_model=List[KpiConfigResponse])
def get_kpi_configs(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Lista tutte le configurazioni KPI."""
    query = db.query(KpiConfig)
    if active_only:
        query = query.filter(KpiConfig.is_active == True)
    
    configs = query.order_by(KpiConfig.display_order).all()
    
    result = []
    for cfg in configs:
        # Calcola operatori richiesti da ShiftRequirement
        ops_required = db.query(func.sum(ShiftRequirement.quantity)).filter(
            ShiftRequirement.kpi_sector == cfg.sector_name
        ).scalar() or 0
        
        result.append(KpiConfigResponse(
            id=cfg.id,
            sector_name=cfg.sector_name,
            kpi_target_8h=cfg.kpi_target_8h,
            kpi_target_hourly=cfg.kpi_target_hourly,
            is_active=cfg.is_active,
            display_order=cfg.display_order,
            operators_required=ops_required
        ))
    
    return result


@router.post("/configs", response_model=KpiConfigResponse)
def create_kpi_config(
    data: KpiConfigCreate,
    db: Session = Depends(get_db)
):
    """Crea nuova configurazione KPI."""
    # Check duplicato
    existing = db.query(KpiConfig).filter(
        KpiConfig.sector_name == data.sector_name
    ).first()
    if existing:
        raise HTTPException(400, f"Settore '{data.sector_name}' gia esistente")
    
    config = KpiConfig(
        sector_name=data.sector_name,
        kpi_target_8h=data.kpi_target_8h,
        kpi_target_hourly=data.kpi_target_8h / 8.0,
        display_order=data.display_order
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    
    return KpiConfigResponse(
        id=config.id,
        sector_name=config.sector_name,
        kpi_target_8h=config.kpi_target_8h,
        kpi_target_hourly=config.kpi_target_hourly,
        is_active=config.is_active,
        display_order=config.display_order,
        operators_required=0
    )


@router.patch("/configs/{config_id}")
def update_kpi_config(
    config_id: int,
    data: KpiConfigUpdate,
    db: Session = Depends(get_db)
):
    """Aggiorna configurazione KPI."""
    config = db.query(KpiConfig).filter(KpiConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "Configurazione non trovata")
    
    if data.kpi_target_8h is not None:
        config.kpi_target_8h = data.kpi_target_8h
        config.kpi_target_hourly = data.kpi_target_8h / 8.0
    
    if data.is_active is not None:
        config.is_active = data.is_active
    
    if data.display_order is not None:
        config.display_order = data.display_order
    
    db.commit()
    return {"status": "updated", "id": config_id}


@router.delete("/configs/{config_id}")
def delete_kpi_config(config_id: int, db: Session = Depends(get_db)):
    """Elimina configurazione KPI (Soft delete o fisica se possibile)."""
    # 1. Verifica esistenza
    config = db.query(KpiConfig).filter(KpiConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "Configurazione non trovata")

    # 2. Verifica dipendenze (Entries)
    # Se ci sono entries storiche, meglio fare soft delete (is_active=False)
    # Ma se l'utente chiede DELETE esplicito con "sicuro?", forse vuole cancellare tutto?
    # Per sicurezza, se ci sono entries, impediamo delete fisico e suggeriamo disattivazione o soft delete.
    # PROPOSTA: Controllo entries. Se presenti -> Error 400 "Impossibile eliminare, ci sono dati storici. Disattivalo invece."
    # Oppure: Soft Delete silente.
    # L'utente ha chiesto "eliminare il kpi", non "disattivare".
    # Facciamo check:
    has_entries = db.query(KpiEntry).filter(KpiEntry.kpi_config_id == config_id).first()
    if has_entries:
        # Soft delete
        config.is_active = False
        db.commit()
        return {"status": "deactivated", "message": "KPI disattivato perché contiene dati storici."}
    
    # Se pulito (es. creato per sbaglio), delete fisico
    # Rimuovi anche ShiftRequirements associati?
    # ShiftRequirement ha 'kpi_sector' come stringa, non FK diretta (legacy design).
    # Bisogna pulire anche quelli se matchano il nome settore.
    
    db.query(ShiftRequirement).filter(ShiftRequirement.kpi_sector == config.sector_name).delete()
    
    db.delete(config)
    db.commit()
    return {"status": "deleted", "id": config_id}


# ============================================================
# ENDPOINTS - ENTRIES
# ============================================================

def calculate_staffing(db: Session, sector_name: str, work_date: date, shift_type: str):
    """
    Calcola operatori presenti vs richiesti per un settore/data/turno.
    Considera assenze e permessi approvati.
    """
    # 1. Trova tutti i ShiftRequirement per questo settore
    requirements = db.query(ShiftRequirement).filter(
        ShiftRequirement.kpi_sector == sector_name
    ).all()
    
    if not requirements:
        return None, None, None, None
    
    req_ids = [r.id for r in requirements]
    operators_required = sum(r.quantity or 0 for r in requirements)
    
    # 2. Conta turni assegnati per questi requirements
    work_datetime = datetime.combine(work_date, datetime.min.time())
    
    # Se stiamo cercando 'custom', includiamo anche 'manual' (o eventualmente altri custom)
    target_shifts = [shift_type]
    if shift_type == 'custom':
        target_shifts.append('manual')
        
    from models.hr import Employee
    assignments = db.query(ShiftAssignment).join(Employee).filter(
        ShiftAssignment.requirement_id.in_(req_ids),
        func.date(ShiftAssignment.work_date) == work_date,
        ShiftAssignment.shift_type.in_(target_shifts)
    ).all()
    
    assigned_employee_ids = [a.employee_id for a in assignments]
    operators_assigned = len(assignments)
    
    # 3. Sottrai assenze/permessi approvati per quel giorno
    absences = 0
    if assigned_employee_ids:
        absences = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id.in_(assigned_employee_ids),
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= work_datetime,
            LeaveRequest.end_date >= work_datetime
        ).count()
    
    operators_present = operators_assigned - absences
    
    # 4. Determina status
    delta = operators_present - operators_required
    if delta >= 0:
        status = "pieno" if delta == 0 else "surplus"
    else:
        status = "sottoorganico"
    
    return operators_present, operators_required, status, int(delta)


@router.post("/entries", response_model=KpiEntryResponse)
def create_kpi_entry(
    data: KpiEntryCreate,
    db: Session = Depends(get_db),
    current_user_id: int = 1  # TODO: da auth
):
    """Registra nuova entry KPI con calcoli automatici."""
    # Verifica config esiste
    config = db.query(KpiConfig).filter(KpiConfig.id == data.kpi_config_id).first()
    if not config:
        raise HTTPException(404, "Configurazione KPI non trovata")
    
    # Calcola campi derivati
    deduction = 0.0
    if data.shift_type == 'custom':
        # Se turno > 5 ore, togli 1 ora pausa, altrimenti 0 (es. Sabato 4.5h)
        if data.hours_total > 5.0:
            deduction = 1.0
            
    hours_net = data.hours_total - data.hours_downtime - deduction
    
    quantity_per_hour = data.quantity_produced / hours_net if hours_net > 0 else 0
    efficiency = (quantity_per_hour / config.kpi_target_hourly * 100) if config.kpi_target_hourly else 0
    
    # Calcola staffing
    ops_present, ops_required, status, delta = calculate_staffing(
        db, config.sector_name, data.work_date, data.shift_type
    )
    
    # Check se esiste gia entry per questo settore/data/turno
    existing = db.query(KpiEntry).filter(
        KpiEntry.kpi_config_id == data.kpi_config_id,
        func.date(KpiEntry.work_date) == data.work_date,
        KpiEntry.shift_type == data.shift_type
    ).first()
    
    if existing:
        # Aggiorna esistente
        existing.hours_total = data.hours_total
        existing.hours_downtime = data.hours_downtime
        existing.quantity_produced = data.quantity_produced
        existing.hours_net = hours_net
        existing.quantity_per_hour = quantity_per_hour
        existing.efficiency_percent = efficiency
        existing.downtime_reason = data.downtime_reason
        existing.downtime_notes = data.downtime_notes
        existing.operators_present = ops_present
        existing.operators_required = ops_required
        existing.staffing_status = status
        existing.staffing_delta = delta
        db.commit()
        entry = existing
    else:
        # Crea nuova
        entry = KpiEntry(
            kpi_config_id=data.kpi_config_id,
            work_date=datetime.combine(data.work_date, datetime.min.time()),
            shift_type=data.shift_type,
            hours_total=data.hours_total,
            hours_downtime=data.hours_downtime,
            quantity_produced=data.quantity_produced,
            hours_net=hours_net,
            quantity_per_hour=quantity_per_hour,
            efficiency_percent=efficiency,
            downtime_reason=data.downtime_reason,
            downtime_notes=data.downtime_notes,
            operators_present=ops_present,
            operators_required=ops_required,
            staffing_status=status,
            staffing_delta=delta,
            recorded_by=current_user_id
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
    
    return KpiEntryResponse(
        id=entry.id,
        kpi_config_id=entry.kpi_config_id,
        sector_name=config.sector_name,
        work_date=entry.work_date.date(),
        shift_type=entry.shift_type,
        hours_total=entry.hours_total,
        hours_downtime=entry.hours_downtime,
        hours_net=entry.hours_net,
        quantity_produced=entry.quantity_produced,
        quantity_per_hour=entry.quantity_per_hour,
        efficiency_percent=entry.efficiency_percent,
        operators_present=entry.operators_present,
        operators_required=entry.operators_required,
        staffing_status=entry.staffing_status,
        staffing_delta=entry.staffing_delta,
        downtime_reason=entry.downtime_reason,
        downtime_notes=entry.downtime_notes
    )


@router.get("/entries", response_model=List[KpiEntryResponse])
def get_kpi_entries(
    work_date: date,
    config_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Lista entries per una data specifica."""
    query = db.query(KpiEntry).options(
        joinedload(KpiEntry.kpi_config)
    ).filter(
        func.date(KpiEntry.work_date) == work_date
    )
    
    if config_id:
        query = query.filter(KpiEntry.kpi_config_id == config_id)
    
    entries = query.all()
    
    return [
        KpiEntryResponse(
            id=e.id,
            kpi_config_id=e.kpi_config_id,
            sector_name=e.kpi_config.sector_name,
            work_date=e.work_date.date(),
            shift_type=e.shift_type,
            hours_total=e.hours_total,
            hours_downtime=e.hours_downtime,
            hours_net=e.hours_net or 0,
            quantity_produced=e.quantity_produced,
            quantity_per_hour=e.quantity_per_hour,
            efficiency_percent=e.efficiency_percent,
            operators_present=e.operators_present,
            operators_required=e.operators_required,
            staffing_status=e.staffing_status,
            staffing_delta=e.staffing_delta,
            downtime_reason=e.downtime_reason,
            downtime_notes=e.downtime_notes
        )
        for e in entries
    ]


@router.delete("/entries/{entry_id}")
def delete_kpi_entry(entry_id: int, db: Session = Depends(get_db)):
    """Elimina una entry KPI."""
    entry = db.query(KpiEntry).filter(KpiEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry non trovata")
    
    db.delete(entry)
    db.commit()
    return {"status": "deleted", "id": entry_id}


# ============================================================
# ENDPOINTS - PANORAMICA
# ============================================================

@router.get("/panoramica", response_model=List[PanoramicaItem])
def get_panoramica(
    work_date: date,
    db: Session = Depends(get_db)
):
    """
    Ritorna stato di completamento E STAFFING per tutti i settori.
    """
    configs = db.query(KpiConfig).filter(
        KpiConfig.is_active == True
    ).order_by(KpiConfig.display_order).all()
    
    # 1. Carica KPI Entries (per pallini stato)
    entries = db.query(KpiEntry).filter(
        func.date(KpiEntry.work_date) == work_date
    ).all()
    
    entries_map = {}
    for e in entries:
        entries_map[(e.kpi_config_id, e.shift_type)] = e
        
    # 2. Carica Assunzioni (Shift Assignments) per conteggio operatori
    #    Mappa: sector_name -> shift_type -> count
    
    # a. Mappa requirement_id -> kpi_sector (sector_name)
    all_requirements = db.query(ShiftRequirement).all()
    req_map = {r.id: r.kpi_sector for r in all_requirements if r.kpi_sector}
    
    # b. Query assignments
    assignments = db.query(ShiftAssignment).filter(
        func.date(ShiftAssignment.work_date) == work_date
    ).all()
    
    # c. Conta operatori per settore/turno
    #    structure: ops_count[sector_name][shift_type] = int
    ops_count = {}
    
    for assign in assignments:
        sector_name = req_map.get(assign.requirement_id)
        if not sector_name:
            continue
            
        if sector_name not in ops_count:
            ops_count[sector_name] = {'morning': 0, 'afternoon': 0, 'night': 0, 'custom': 0}
            
        st = assign.shift_type
        if st in ops_count[sector_name]:
            ops_count[sector_name][st] += 1
        elif st == 'custom' or st == 'manual': 
             ops_count[sector_name]['custom'] += 1

    
    result = []
    for cfg in configs:
        # Calcola operatori richiesti (totale generico, non per turno specifico)
        ops_required = db.query(func.sum(ShiftRequirement.quantity)).filter(
            ShiftRequirement.kpi_sector == cfg.sector_name
        ).scalar() or 0
        
        # Recupera conteggi staffing
        sector_ops = ops_count.get(cfg.sector_name, {})
        
        def get_status(shift: str) -> str:
            entry = entries_map.get((cfg.id, shift))
            if not entry:
                return "empty"
            # Se esiste ma non ha produzione né fermi, lo consideriamo "empty" (evita "falsi attivi" da mobile)
            if entry.quantity_produced == 0 and entry.hours_downtime == 0:
                return "empty"
            
            if entry.quantity_produced > 0:
                return "complete"
            return "partial"
        
        result.append(PanoramicaItem(
            config_id=cfg.id,
            sector_name=cfg.sector_name,
            morning_status=get_status("morning"),
            afternoon_status=get_status("afternoon"),
            night_status=get_status("night"),
            custom_status=get_status("custom"),
            operators_required=ops_required,
            morning_ops=sector_ops.get('morning', 0),
            afternoon_ops=sector_ops.get('afternoon', 0),
            night_ops=sector_ops.get('night', 0),
            custom_ops=sector_ops.get('custom', 0)
        ))
    
    return result


@router.get("/operators/{sector_name}")
def get_operators_for_sector(
    sector_name: str,
    work_date: date,
    shift_type: str,
    db: Session = Depends(get_db)
):
    """
    Ritorna la LISTA dei dipendenti assegnati a un settore/turno.
    Include ID per permettere navigazione al dossier.
    """
    from database import Employee
    
    # 1. Trova tutti i ShiftRequirement per questo settore
    requirements = db.query(ShiftRequirement).filter(
        ShiftRequirement.kpi_sector == sector_name
    ).all()
    
    if not requirements:
        return []
    
    req_ids = [r.id for r in requirements]
    
    # 2. Trova turni assegnati per questi requirements
    target_shifts = [shift_type]
    if shift_type == 'custom':
        target_shifts.append('manual')
    
    assignments = db.query(ShiftAssignment).options(
        joinedload(ShiftAssignment.employee)
    ).filter(
        ShiftAssignment.requirement_id.in_(req_ids),
        func.date(ShiftAssignment.work_date) == work_date,
        ShiftAssignment.shift_type.in_(target_shifts)
    ).all()
    
    # 3. Costruisci lista dipendenti
    employees = []
    seen_ids = set()
    
    for assignment in assignments:
        emp = assignment.employee
        if emp and emp.id not in seen_ids:
            seen_ids.add(emp.id)
            employees.append({
                "id": emp.id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "full_name": f"{emp.first_name} {emp.last_name}",
                "current_role": emp.current_role or "Operatore",
                "shift_type": assignment.shift_type,
                "start_time": assignment.start_time,
                "end_time": assignment.end_time
            })
    
    # Ordina per cognome
    employees.sort(key=lambda x: x["last_name"])
    
    return employees


# ============================================================
# ENDPOINTS - REPORT
# ============================================================

@router.get("/report/daily")
def get_daily_report(
    work_date: date,
    db: Session = Depends(get_db)
):
    """Report giornaliero con aggregati per tutti i settori."""
    entries = db.query(KpiEntry).options(
        joinedload(KpiEntry.kpi_config)
    ).filter(
        func.date(KpiEntry.work_date) == work_date
    ).all()
    
    # Raggruppa per settore
    by_sector = {}
    for e in entries:
        sector = e.kpi_config.sector_name
        if sector not in by_sector:
            by_sector[sector] = {
                "sector_name": sector,
                "kpi_target_8h": e.kpi_config.kpi_target_8h,
                "shifts": {},
                "total_hours": 0,
                "total_downtime": 0,
                "total_quantity": 0
            }
        
        by_sector[sector]["shifts"][e.shift_type] = {
            "hours_total": e.hours_total,
            "hours_downtime": e.hours_downtime,
            "hours_net": e.hours_net,
            "quantity": e.quantity_produced,
            "efficiency": e.efficiency_percent,
            "staffing_status": e.staffing_status,
            "staffing_delta": e.staffing_delta
        }
        by_sector[sector]["total_hours"] += e.hours_total
        by_sector[sector]["total_downtime"] += e.hours_downtime
        by_sector[sector]["total_quantity"] += e.quantity_produced
    
    # Calcola totali
    for sector in by_sector.values():
        hours_net = sector["total_hours"] - sector["total_downtime"]
        sector["total_hours_net"] = hours_net
        sector["total_qty_per_hour"] = sector["total_quantity"] / hours_net if hours_net > 0 else 0
    
    return {
        "date": str(work_date),
        "sectors": list(by_sector.values())
    }


@router.get("/report/daily/pdf")
def get_daily_pdf_report(
    work_date: date,
    db: Session = Depends(get_db)
):
    """Genera PDF report giornaliero KPI."""
    
    # 1. Recupera Dati (logica uguale a daily report)
    entries = db.query(KpiEntry).options(
        joinedload(KpiEntry.kpi_config)
    ).filter(
        func.date(KpiEntry.work_date) == work_date
    ).all()
    
    by_sector = {}
    for e in entries:
        sector = e.kpi_config.sector_name
        if sector not in by_sector:
            by_sector[sector] = {
                "name": sector,
                "target": e.kpi_config.kpi_target_8h,
                "qty": 0,
                "hours": 0,
                "downtime": 0
            }
        
        by_sector[sector]["qty"] += e.quantity_produced
        by_sector[sector]["hours"] += e.hours_total
        by_sector[sector]["downtime"] += e.hours_downtime

    # Totali Generali
    total_qty = sum(s["qty"] for s in by_sector.values())
    total_hours = sum(s["hours"] for s in by_sector.values())
    total_downtime = sum(s["downtime"] for s in by_sector.values())
    
    # 2. Genera PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=landscape(A4),
        rightMargin=15*mm, leftMargin=15*mm, 
        topMargin=15*mm, bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    title_style = ParagraphStyle(
        'CustomTitle', 
        parent=styles['Heading1'], 
        fontSize=24, 
        textColor=colors.HexColor('#1E3A8A'),
        alignment=1, # Center
        spaceAfter=10
    )
    elements.append(Paragraph("SIERVOPLAST - Report Produzione", title_style))
    elements.append(Paragraph(f"Data: {work_date.strftime('%d/%m/%Y')}", styles['Heading2']))
    elements.append(Spacer(1, 10))
    
    # Riepilogo Card Style (Tabella)
    summary_data = [
        ["Quantità Totale", "Ore Lavorate", "Ore Fermo", "Settori Attivi"],
        [f"{total_qty:,}".replace(",", "."), f"{total_hours}h", f"{total_downtime}h", str(len(by_sector))]
    ]
    
    t_summary = Table(summary_data, colWidths=[60*mm]*4)
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('FONTSIZE', (0, 1), (-1, 1), 14),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#9CA3AF')),
        ('Grid', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 15))
    
    # Tabella Dettaglio
    table_data = [["Settore / Macchina", "Target 8h", "Prodotto", "Ore Lav.", "Ore Fermo", "Eff.%"]]
    
    for s in by_sector.values():
        hours_net = s["hours"] - s["downtime"]
        efficiency = 0
        if hours_net > 0 and s["target"] > 0:
            expected = s["target"] * (hours_net / 8)
            efficiency = round((s["qty"] / expected) * 100)
            
        row = [
            s["name"], 
            str(s["target"]), 
            f"{s['qty']:,}".replace(",", "."), 
            f"{s['hours']}h", 
            f"{s['downtime']}h", 
            f"{efficiency}%"
        ]
        table_data.append(row)
        
    t_detail = Table(table_data, colWidths=[80*mm, 30*mm, 30*mm, 30*mm, 30*mm, 30*mm])
    
    # Stile condizionale per righe
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'), # Left align sector names
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
    ]
    
    # Colora righe in base efficienza
    for i, row in enumerate(table_data[1:], start=1):
        eff_str = row[5].replace("%", "")
        try:
            eff = int(eff_str)
            if eff >= 100:
                bg_color = colors.HexColor('#DCFCE7') # Green light
            elif eff >= 80:
                bg_color = colors.HexColor('#FEF9C3') # Yellow light
            else:
                bg_color = colors.HexColor('#FEE2E2') # Red light
            
            t_style.append(('BACKGROUND', (0, i), (-1, i), bg_color))
        except:
            pass
            
    t_detail.setStyle(TableStyle(t_style))
    elements.append(t_detail)
    
    # Build
    doc.build(elements)
    
    buffer.seek(0)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_kpi_{work_date}.pdf"}
    )



@router.get("/report/trend")
def get_kpi_trend(
    start_date: date,
    end_date: date,
    exclude_weekends: bool = False,
    sector_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Restituisce dati aggregati per grafico trend e riepilogo periodo."""
    
    query = db.query(KpiEntry).options(
        joinedload(KpiEntry.kpi_config)
    ).filter(
        and_(
            KpiEntry.work_date >= start_date,
            KpiEntry.work_date < end_date + timedelta(days=1)
        )
    )
    
    if sector_name:
         # Join is handled by relationship, but we need to filter on KpiConfig based on sector name.
         # KpiEntry.kpi_config is relationship.
         # We need to join KpiConfig explicitly for filtering?
         # Or access it via relationship? SQLAlchemy filter on relationship is cleaner with join.
         query = query.join(KpiConfig).filter(KpiConfig.sector_name == sector_name)

    entries = query.order_by(KpiEntry.work_date).all()
    
    # Strutture dati
    daily_stats = {} # { "2024-01-01": { qty: 1000, hours: 20, target: 800 } }
    sector_stats = {} # { "Dolphin": { qty: 5000, hours: 100, target_acc: 4000 } }
    
    for e in entries:
        # Filtro Weekend (0=Lun, 6=Dom) -> 5=Sab, 6=Dom
        if exclude_weekends and e.work_date.weekday() >= 5:
            continue
            
        d_str = str(e.work_date)
        sector_name = e.kpi_config.sector_name
        
        # 1. Aggregazione Giornaliera (per Grafico)
        if d_str not in daily_stats:
            daily_stats[d_str] = { "date": d_str, "quantity": 0, "target_total": 0, "hours_net": 0 }
            
        daily_stats[d_str]["quantity"] += e.quantity_produced
        daily_stats[d_str]["hours_net"] += e.hours_net
        
        # Stima target per questo entry: target_8h * (ore_nette / 8)
        entry_target = 0
        if e.hours_net > 0:
            entry_target = e.kpi_config.kpi_target_8h * (e.hours_net / 8)
        daily_stats[d_str]["target_total"] += entry_target

        # 2. Aggregazione Settore (per Tabella Totale)
        if sector_name not in sector_stats:
            sector_stats[sector_name] = { 
                "sector_name": sector_name, 
                "kpi_target_8h": e.kpi_config.kpi_target_8h, # Prendo l'ultimo configurato
                "total_quantity": 0, 
                "total_hours": 0, 
                "total_downtime": 0,
                "total_hours_net": 0,
                "target_accumulated": 0
            }
            
        s = sector_stats[sector_name]
        s["total_quantity"] += e.quantity_produced
        s["total_hours"] += e.hours_total
        s["total_downtime"] += e.hours_downtime
        s["total_hours_net"] += e.hours_net
        s["target_accumulated"] += entry_target

    # Calcoli finali giornalieri
    trend_data = []
    for d in sorted(daily_stats.keys()):
        day = daily_stats[d]
        eff = 0
        if day["target_total"] > 0:
            eff = round((day["quantity"] / day["target_total"]) * 100)
        
        trend_data.append({
            "date": d,
            "quantity": day["quantity"],
            "efficiency": eff
        })
        
    # Calcoli finali settori
    sector_data = []
    for s in sector_stats.values():
        eff = 0
        if s["target_accumulated"] > 0:
            eff = round((s["total_quantity"] / s["target_accumulated"]) * 100)
        
        # Qnt/h media del periodo
        qnt_h = 0
        if s["total_hours_net"] > 0:
            qnt_h = s["total_quantity"] / s["total_hours_net"]
            
        s["efficiency"] = eff
        s["total_qty_per_hour"] = qnt_h
        sector_data.append(s)
        
    return {
        "trend": trend_data,
        "sectors": sector_data
    }


@router.get("/report/advanced/pdf")
def get_advanced_pdf_report(
    start_date: date, 
    end_date: date, 
    sector_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Genera Report PDF Avanzato con filtri e dettaglio."""
    
    # 1. Recupera Dati
    query = db.query(KpiEntry).options(
        joinedload(KpiEntry.kpi_config)
    ).filter(
        and_(
            KpiEntry.work_date >= start_date,
            KpiEntry.work_date < end_date + timedelta(days=1)
        )
    )
    
    if sector_name:
        query = query.join(KpiConfig).filter(KpiConfig.sector_name == sector_name)
    else:
        query = query.join(KpiConfig)
        
    entries = query.order_by(KpiEntry.work_date, KpiConfig.sector_name, KpiEntry.shift_type).all()
    
    # 2. Genera PDF
    buffer = io.BytesIO()
    
    # Layout più preciso per Header/Footer
    def header_footer(canvas, doc):
        canvas.saveState()
        
        # --- HEADER ---
        # Logo (Usa percorso identico a utils_pdf.py)
        # Nota: utils_pdf calcola LOGO_PATH relativamente a se stesso. Qui siamo in kpi.py (routers/).
        # Il logo è in backend/assets/logo.png.
        current_dir = os.path.dirname(os.path.dirname(__file__)) # .../backend
        logo_path = os.path.join(current_dir, "assets", "logo.png")
        
        if os.path.exists(logo_path):
            # Logo a Sinistra
            canvas.drawImage(logo_path, 10*mm, A4[0] - 35*mm, width=25*mm, height=25*mm, mask='auto', preserveAspectRatio=True)
            
            # Titolo Centrato (allineato verticalmente col logo)
            canvas.setFont("Helvetica-Bold", 20)
            canvas.setFillColor(colors.HexColor('#1E3A8A'))
            canvas.drawCentredString(A4[1]/2, A4[0] - 25*mm, "Report Avanzato Produzione")
        else:
            # Fallback testuale
            canvas.setFont("Helvetica-Bold", 20)
            canvas.setFillColor(colors.HexColor('#1E3A8A'))
            canvas.drawCentredString(A4[1]/2, A4[0] - 25*mm, "Report Avanzato Produzione")
        
        # Sottotitolo (Filtri)
        canvas.setFont("Helvetica", 12)
        canvas.setFillColor(colors.black)
        
        filter_text = f"Periodo: {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
        if sector_name:
            filter_text += f" | Reparto: {sector_name}"
        else:
            filter_text += " | Tutti i Reparti"
            
        canvas.drawCentredString(A4[1]/2, A4[0] - 35*mm, filter_text)
        
        # Linea separatrice header
        canvas.setStrokeColor(colors.lightgrey)
        canvas.line(10*mm, A4[0] - 40*mm, A4[1] - 10*mm, A4[0] - 40*mm)
        
        # --- FOOTER ---
        canvas.setFont("Helvetica-Oblique", 10)
        canvas.setFillColor(colors.grey)
        canvas.drawCentredString(A4[1]/2, 10*mm, "Edited By Salvatore Laezza")
        
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, 
        pagesize=landscape(A4),
        rightMargin=10*mm, leftMargin=10*mm, 
        topMargin=45*mm, bottomMargin=20*mm # Aumentato Top margin per header custom
    )
    
    # Tabella Dettagliata
    headers = ["Data", "Reparto", "Turno", "Pz Prod.", "KPI (8h)", "Pz Manc.", "Pz Extra", "Fermo (h)", "Eff. %", "Note"]
    data = [headers]
    
    total_qty = 0
    total_target_all = 0
    total_downtime_all = 0
    
    # Raggruppamento per Data e Reparto
    # Poiché sorted per Data -> Reparto -> Turno, possiamo iterare e raggruppare
    from itertools import groupby
    
    def get_group_key(entry):
        return (entry.work_date, entry.kpi_config.sector_name)
        
    for key, group in groupby(entries, key=get_group_key):
        date_val, sector_val = key
        group_list = list(group)
        
        # Totali del gruppo (Subtotale Reparto)
        sub_qty = 0
        sub_target_net = 0
        sub_downtime = 0
        
        for e in group_list:
            # --- Logica Riga Singola ---
            hours_net = e.hours_net or 0
            target_8h = e.kpi_config.kpi_target_8h or 0
            
            target_real_net = 0
            if hours_net > 0 and target_8h > 0:
                target_real_net = target_8h * (hours_net / 8.0)
                
            qty = e.quantity_produced
            delta = qty - target_real_net
            
            missing_pcs = ""
            extra_pcs = ""
            
            if delta < 0:
                missing_pcs = f"{int(abs(delta))}"
            elif delta > 0:
                extra_pcs = f"{int(delta)}"
                
            eff = 0
            if target_real_net > 0:
                eff = round((qty / target_real_net) * 100)
            
            # Formattazione Riga
            shift_map = {"morning": "Mattina", "afternoon": "Pom.", "night": "Notte"}
            
            row = [
                e.work_date.strftime('%d/%m'),
                e.kpi_config.sector_name[:25],
                shift_map.get(e.shift_type, e.shift_type),
                f"{qty}",
                f"{target_8h}",
                missing_pcs,
                extra_pcs,
                f"{e.hours_downtime:.2f}",
                f"{eff}%",
                (e.downtime_reason or "") + (" " + e.downtime_notes if e.downtime_notes else "")
            ]
            data.append(row)
            
            # --- Accumulo Subtotale ---
            sub_qty += qty
            sub_target_net += target_real_net
            sub_downtime += e.hours_downtime
            
        # --- Totale Generale ---
        total_qty += sub_qty
        total_target_all += sub_target_net
        total_downtime_all += sub_downtime
        
        # --- Riga Subtotale Reparto (Se ci sono più righe o per chiarezza sempre?) ---
        # L'utente vuole vedere il totale per quella giornata/reparto.
        
        sub_delta = sub_qty - sub_target_net
        sub_missing = ""
        sub_extra = ""
        if sub_delta < 0:
            sub_missing = f"{int(abs(sub_delta))}"
        elif sub_delta > 0:
            sub_extra = f"{int(sub_delta)}"
            
        sub_eff = 0
        if sub_target_net > 0:
            sub_eff = round((sub_qty / sub_target_net) * 100)
            
        sub_row = [
            "",
            "TOTALE REPARTO", # Label
            "", 
            f"{sub_qty}", 
            "", # KPI 8h non ha senso sommarlo qui, è target netto che conta
            sub_missing, 
            sub_extra, 
            f"{sub_downtime:.2f}", 
            f"{sub_eff}%", 
            "" 
        ]
        data.append(sub_row)

    # Riga Totale Generale Finale
    grand_eff = 0
    if total_target_all > 0:
        grand_eff = round((total_qty / total_target_all) * 100)
        
    total_row = [
        "TOTALE PERIODO", "", "", f"{total_qty}", "", "", "", 
        f"{total_downtime_all:.2f}", f"{grand_eff}%", ""
    ]
    data.append(total_row)
    
    col_widths = [15*mm, 50*mm, 18*mm, 20*mm, 20*mm, 20*mm, 20*mm, 20*mm, 15*mm, None]
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('ALIGN', (-1, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        # Stile Totale Generale (Ultima riga)
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]
    
    # Post-processing stili per righe dati e subtotali
    # data ha: Header (idx 0), poi N gruppi di (Righe Turni + 1 Riga Subtotale), poi 1 Riga Totale Generale
    
    # Bisogna scorrere data per applicare stili riga per riga
    current_row_idx = 1
    for key, group in groupby(entries, key=get_group_key):
        group_len = len(list(group))
        
        # Righe Dati (Standard)
        for _ in range(group_len):
            row = data[current_row_idx]
            # Colori condizionali
            if row[5]: # Mancanti
                t_style.append(('TEXTCOLOR', (5, current_row_idx), (5, current_row_idx), colors.red))
                t_style.append(('FONTNAME', (5, current_row_idx), (5, current_row_idx), 'Helvetica-Bold'))
            if row[6]: # Extra
                t_style.append(('TEXTCOLOR', (6, current_row_idx), (6, current_row_idx), colors.green))
                t_style.append(('FONTNAME', (6, current_row_idx), (6, current_row_idx), 'Helvetica-Bold'))
            try:
                eff_val = int(row[8].replace("%", ""))
                if eff_val < 80:
                    t_style.append(('TEXTCOLOR', (8, current_row_idx), (8, current_row_idx), colors.red))
                elif eff_val >= 100:
                    t_style.append(('TEXTCOLOR', (8, current_row_idx), (8, current_row_idx), colors.green))
            except: pass
            current_row_idx += 1
            
        # Riga Subtotale
        # Stile: Grigio chiaro, Bold, Reparto in Blu scuro
        t_style.append(('BACKGROUND', (0, current_row_idx), (-1, current_row_idx), colors.HexColor('#F3F4F6')))
        t_style.append(('FONTNAME', (0, current_row_idx), (-1, current_row_idx), 'Helvetica-Bold'))
        t_style.append(('TEXTCOLOR', (1, current_row_idx), (1, current_row_idx), colors.HexColor('#1E3A8A'))) # Label Reparto Blu
        
        # Colori condizionali anche per subtotale
        sub_row = data[current_row_idx]
        if sub_row[5]: # Mancanti
            t_style.append(('TEXTCOLOR', (5, current_row_idx), (5, current_row_idx), colors.red))
        if sub_row[6]: # Extra
            t_style.append(('TEXTCOLOR', (6, current_row_idx), (6, current_row_idx), colors.green))
        try:
            eff_val = int(sub_row[8].replace("%", ""))
            if eff_val < 80:
                t_style.append(('TEXTCOLOR', (8, current_row_idx), (8, current_row_idx), colors.red))
            elif eff_val >= 100:
                t_style.append(('TEXTCOLOR', (8, current_row_idx), (8, current_row_idx), colors.green))
        except: pass
        
        current_row_idx += 1
            
    t.setStyle(TableStyle(t_style))
    
    # Build con callback onFirstPage/onLaterPages per Header/Footer
    doc.build([t], onFirstPage=header_footer, onLaterPages=header_footer)
    buffer.seek(0)
    
    filename = f"report_avanzato_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============================================================
# ENDPOINTS - STAFFING CONFIG (REQUIREMENTS)
# ============================================================

class ShiftRequirementUpdate(BaseModel):
    role_name: Optional[str] = None
    quantity: Optional[float] = None
    note: Optional[str] = None


class ShiftRequirementCreate(BaseModel):
    role_name: str
    quantity: float
    note: Optional[str] = None


@router.get("/configs/{config_id}/requirements")
def get_kpi_requirements(config_id: int, db: Session = Depends(get_db)):
    """Ritorna i requisiti (ruoli) per un settore KPI."""
    config = db.query(KpiConfig).filter(KpiConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "Configurazione non trovata")
    
    # Trova requirements basati su sector_name
    reqs = db.query(ShiftRequirement).filter(
        ShiftRequirement.kpi_sector == config.sector_name
    ).all()
    
    return reqs


@router.patch("/requirements/{req_id}")
def update_requirement(req_id: int, data: ShiftRequirementUpdate, db: Session = Depends(get_db)):
    """Aggiorna un requisito (quantità o nome ruolo)."""
    req = db.query(ShiftRequirement).filter(ShiftRequirement.id == req_id).first()
    if not req:
        raise HTTPException(404, "Requisito non trovato")
    
    if data.quantity is not None:
        req.quantity = data.quantity
    
    if data.role_name is not None:
        req.role_name = data.role_name
        
    if data.note is not None:
        req.note = data.note
        
    db.commit()
    return {"status": "updated", "id": req_id}


@router.post("/configs/{config_id}/requirements")
def create_requirement(config_id: int, data: ShiftRequirementCreate, db: Session = Depends(get_db)):
    """Aggiunge un nuovo ruolo a un settore KPI."""
    config = db.query(KpiConfig).filter(KpiConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "Configurazione non trovata")
    
    # Trova una banchina di default per questo settore (la prima che matcha il settore)
    # Fallback: Banchina CORTILE (12) se non si trova altro
    existing_req = db.query(ShiftRequirement).filter(
        ShiftRequirement.kpi_sector == config.sector_name
    ).first()
    
    target_banchina_id = existing_req.banchina_id if existing_req else 12
    
    new_req = ShiftRequirement(
        banchina_id=target_banchina_id,
        role_name=data.role_name,
        quantity=data.quantity,
        kpi_sector=config.sector_name,
        note=data.note
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req
