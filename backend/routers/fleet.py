"""
SL Enterprise - Fleet Router
Gestione parco mezzi e ticket manutenzione.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta
import os
import shutil
import json

from database import get_db, Banchina, FleetVehicle, MaintenanceTicket, User
from security import get_current_user, get_hr_or_admin

router = APIRouter(prefix="/fleet", tags=["Parco Mezzi"])

UPLOAD_DIR = "uploads/tickets"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================================
# BANCHINE
# ============================================================

@router.get("/banchine", summary="Lista Banchine")
async def list_banchine(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lista tutte le banchine."""
    return db.query(Banchina).filter(Banchina.is_active == True).all()


@router.post("/banchine", summary="Crea Banchina")
async def create_banchina(
    code: str,
    name: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Crea nuova banchina."""
    existing = db.query(Banchina).filter(Banchina.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codice banchina gia esistente")
    
    banchina = Banchina(code=code, name=name)
    db.add(banchina)
    db.commit()
    db.refresh(banchina)
    return banchina


# ============================================================
# VEICOLI
# ============================================================

@router.get("/vehicles", summary="Lista Mezzi")
async def list_vehicles(
    vehicle_type: str = None,
    banchina_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista mezzi con filtri."""
    query = db.query(FleetVehicle).filter(FleetVehicle.is_active == True)
    
    if vehicle_type:
        query = query.filter(FleetVehicle.vehicle_type == vehicle_type)
    if banchina_id:
        query = query.filter(FleetVehicle.banchina_id == banchina_id)
    if status:
        query = query.filter(FleetVehicle.status == status)
    
    return query.all()


@router.post("/vehicles", summary="Aggiungi Mezzo")
async def create_vehicle(
    vehicle_type: str,
    brand: str = None,
    model: str = None,
    internal_code: str = None,
    banchina_id: int = None,
    assigned_operator: str = None,
    is_4_0: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Aggiungi nuovo mezzo al parco."""
    vehicle = FleetVehicle(
        vehicle_type=vehicle_type,
        brand=brand,
        model=model,
        internal_code=internal_code,
        banchina_id=banchina_id,
        assigned_operator=assigned_operator,
        is_4_0=is_4_0
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch("/vehicles/{vehicle_id}/status", summary="Cambia Stato Mezzo")
async def update_vehicle_status(
    vehicle_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggiorna stato mezzo."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Mezzo non trovato")
    
    vehicle.status = new_status
    db.commit()
    return {"message": "Stato aggiornato", "status": new_status}


# ============================================================
# TICKET GUASTI
# ============================================================

@router.get("/tickets", summary="Lista Ticket")
async def list_tickets(
    status: str = None,
    banchina_id: int = None,
    vehicle_type: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista ticket ordinati per priorita."""
    query = db.query(MaintenanceTicket)
    
    if status:
        query = query.filter(MaintenanceTicket.status == status)
    if banchina_id:
        query = query.filter(MaintenanceTicket.banchina_id == banchina_id)
    
    # Ordina per priorità (più alto prima) e poi per data
    tickets = query.order_by(
        MaintenanceTicket.priority_score.desc(),
        MaintenanceTicket.opened_at.asc()
    ).limit(limit).all()
    
    # Arricchisci con info veicolo
    results = []
    for t in tickets:
        vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == t.vehicle_id).first()
        banchina = db.query(Banchina).filter(Banchina.id == t.banchina_id).first() if t.banchina_id else None
        results.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "issue_type": t.issue_type,
            "priority_score": t.priority_score,
            "is_safety_critical": t.is_safety_critical,
            "status": t.status,
            "opened_at": t.opened_at,
            "vehicle": {
                "id": vehicle.id,
                "type": vehicle.vehicle_type,
                "brand": vehicle.brand,
                "internal_code": vehicle.internal_code
            } if vehicle else None,
            "banchina": banchina.code if banchina else None
        })
    
    return results


@router.get("/tickets/open", summary="Ticket Aperti (Coda Manutentori)")
async def get_open_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Coda ticket aperti per manutentori, ordinati per priorita."""
    return await list_tickets(status="open", db=db, current_user=current_user)


@router.post("/tickets", summary="Apri Ticket Guasto")
async def create_ticket(
    vehicle_id: int,
    title: str,
    issue_type: str,  # total_breakdown, partial, preventive
    description: str = None,
    is_safety_critical: bool = False,
    is_banchina_blocked: bool = False,
    is_unique_vehicle: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apri nuovo ticket guasto."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Mezzo non trovato")
    
    # Calcola priorità
    priority = 0
    if is_safety_critical:
        priority += 100
    if issue_type == 'total_breakdown':
        priority += 50
    elif issue_type == 'partial':
        priority += 20
    else:
        priority += 5
    if is_banchina_blocked:
        priority += 30
    if is_unique_vehicle:
        priority += 20
    
    ticket = MaintenanceTicket(
        vehicle_id=vehicle_id,
        banchina_id=vehicle.banchina_id,
        title=title,
        description=description,
        issue_type=issue_type,
        is_safety_critical=is_safety_critical,
        is_banchina_blocked=is_banchina_blocked,
        is_unique_vehicle=is_unique_vehicle,
        priority_score=priority,
        opened_by=current_user.id
    )
    db.add(ticket)
    
    # Aggiorna stato veicolo
    if issue_type == 'total_breakdown':
        vehicle.status = 'breakdown'
    else:
        vehicle.status = 'maintenance'
    
    db.commit()
    db.refresh(ticket)
    
    return {
        "id": ticket.id,
        "priority_score": ticket.priority_score,
        "message": "Ticket aperto con successo"
    }


@router.patch("/tickets/{ticket_id}/resolve", summary="Risolvi Ticket")
async def resolve_ticket(
    ticket_id: int,
    resolution_notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Segna ticket come risolto (il creatore deve chiuderlo)."""
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    ticket.status = 'resolved'
    ticket.resolved_at = datetime.now()
    ticket.resolution_notes = resolution_notes
    
    # Calcola tempo risoluzione
    if ticket.opened_at:
        delta = ticket.resolved_at - ticket.opened_at
        ticket.resolution_time_minutes = int(delta.total_seconds() / 60)
    
    # Ripristina stato veicolo
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == ticket.vehicle_id).first()
    if vehicle:
        vehicle.status = 'operational'
    
    db.commit()
    
    return {
        "message": "Ticket risolto",
        "resolution_time_minutes": ticket.resolution_time_minutes
    }


@router.patch("/tickets/{ticket_id}/close", summary="Chiudi Ticket")
async def close_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chiudi ticket (solo chi lo ha aperto)."""
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    if ticket.opened_by != current_user.id and current_user.role not in ['super_admin', 'hr_manager']:
        raise HTTPException(status_code=403, detail="Solo chi ha aperto il ticket puo chiuderlo")
    
    ticket.status = 'closed'
    ticket.closed_by = current_user.id
    ticket.closed_at = datetime.now()
    
    db.commit()
    
    return {"message": "Ticket chiuso"}


# ============================================================
# KPI MANUTENZIONE
# ============================================================

@router.get("/kpi", summary="KPI Manutenzione")
async def get_maintenance_kpi(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """KPI manutenzione ultimi X giorni."""
    start_date = datetime.now() - timedelta(days=days)
    
    tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.opened_at >= start_date
    ).all()
    
    resolved = [t for t in tickets if t.status in ['resolved', 'closed']]
    
    # Tempo medio risoluzione
    resolution_times = [t.resolution_time_minutes for t in resolved if t.resolution_time_minutes]
    avg_resolution = sum(resolution_times) / len(resolution_times) if resolution_times else 0
    
    # Guasti per banchina
    by_banchina = {}
    for t in tickets:
        if t.banchina_id:
            banchina = db.query(Banchina).filter(Banchina.id == t.banchina_id).first()
            code = banchina.code if banchina else str(t.banchina_id)
            by_banchina[code] = by_banchina.get(code, 0) + 1
    
    # Guasti per tipo veicolo
    by_vehicle_type = {}
    for t in tickets:
        vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == t.vehicle_id).first()
        if vehicle:
            by_vehicle_type[vehicle.vehicle_type] = by_vehicle_type.get(vehicle.vehicle_type, 0) + 1
    
    return {
        "period_days": days,
        "total_tickets": len(tickets),
        "open_tickets": len([t for t in tickets if t.status == 'open']),
        "resolved_tickets": len(resolved),
        "avg_resolution_minutes": round(avg_resolution, 1),
        "safety_critical_count": len([t for t in tickets if t.is_safety_critical]),
        "by_banchina": by_banchina,
        "by_vehicle_type": by_vehicle_type
    }
