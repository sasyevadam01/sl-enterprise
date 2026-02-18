"""
SL Enterprise - Logistics Router
API per il sistema Richiesta Materiale (Uber-style)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from security import get_current_user
from models.core import User
from models.factory import Banchina
from models.hr import Employee
from models.logistics import (
    LogisticsMaterialType, LogisticsRequest, LogisticsPerformance,
    LogisticsMessage, LogisticsPresetMessage, LogisticsEtaOption, LogisticsConfig
)
from schemas_logistics import (
    LogisticsMaterialTypeCreate, LogisticsMaterialTypeUpdate, LogisticsMaterialTypeResponse,
    LogisticsRequestCreate, LogisticsRequestTake, LogisticsRequestComplete, LogisticsRequestResponse,
    LogisticsMessageCreate, LogisticsMessageResponse,
    LogisticsPresetMessageCreate, LogisticsPresetMessageUpdate, LogisticsPresetMessageResponse,
    LogisticsEtaOptionCreate, LogisticsEtaOptionUpdate, LogisticsEtaOptionResponse,
    LogisticsPerformanceResponse, LogisticsLeaderboardResponse, LogisticsLeaderboardEntry,
    LogisticsConfigResponse, LogisticsConfigBulk
)
from websocket_manager import get_logistics_manager

router = APIRouter(prefix="/logistics", tags=["Logistics"])


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_config_value(db: Session, key: str, default: str = "0") -> str:
    """Ottieni valore configurazione."""
    config = db.query(LogisticsConfig).filter(LogisticsConfig.config_key == key).first()
    return config.config_value if config else default


def get_or_create_performance(db: Session, employee_id: int) -> LogisticsPerformance:
    """Ottieni o crea record performance mensile."""
    now = datetime.utcnow()
    perf = db.query(LogisticsPerformance).filter(
        LogisticsPerformance.employee_id == employee_id,
        LogisticsPerformance.month == now.month,
        LogisticsPerformance.year == now.year
    ).first()
    
    if not perf:
        perf = LogisticsPerformance(
            employee_id=employee_id,
            month=now.month,
            year=now.year
        )
        db.add(perf)
        db.commit()
        db.refresh(perf)
    
    return perf


def calculate_points_and_penalties(request, db: Session):
    """Calcola punti e penalità per una missione completata."""
    points = int(get_config_value(db, "points_base_mission", "1"))
    
    # Bonus specifico del materiale (NEW)
    if request.material_type and request.material_type.base_points:
        points += request.material_type.base_points

    # Bonus Salvataggio (Task Rilasciata da altri)
    if request.was_released:
        points += int(get_config_value(db, "points_save_abandoned", "1"))

    penalty = 0
    
    # Bonus urgenza
    if request.is_urgent:
        points = int(get_config_value(db, "points_urgent_mission", "2"))
    
    # Verifica ETA
    if request.taken_at and request.completed_at and request.promised_eta_minutes:
        actual_minutes = (request.completed_at - request.taken_at).total_seconds() / 60
        promised = request.promised_eta_minutes
        
        if actual_minutes <= promised:
            # In tempo!
            request.eta_respected = True
            
            # Bonus super velocità (meno di metà tempo)
            if actual_minutes <= promised / 2:
                points += int(get_config_value(db, "points_super_speed_bonus", "1"))
        else:
            # In ritardo
            request.eta_respected = False
            delay = actual_minutes - promised
            
            threshold_light = int(get_config_value(db, "threshold_late_light_minutes", "5"))
            threshold_medium = int(get_config_value(db, "threshold_late_medium_minutes", "15"))
            
            if delay <= threshold_light:
                penalty = int(get_config_value(db, "penalty_late_light", "1"))
            elif delay <= threshold_medium:
                penalty = int(get_config_value(db, "penalty_late_medium", "2"))
            else:
                penalty = int(get_config_value(db, "penalty_late_severe", "3"))
    
    return points, penalty


def enrich_request_response(request: LogisticsRequest) -> dict:
    """Arricchisce la risposta con campi calcolati."""
    data = {
        "id": request.id,
        "material_type_id": request.material_type_id,
        "material_type_label": request.material_type.label if request.material_type else None,
        "material_type_icon": request.material_type.icon if request.material_type else None,
        "unit_of_measure": request.unit_of_measure or (request.material_type.unit_of_measure if request.material_type else "pz"),
        "custom_description": request.custom_description,
        "quantity": request.quantity,
        "banchina_id": request.banchina_id,
        "banchina_code": request.banchina.code if request.banchina else None,
        "banchina_name": request.banchina.name if request.banchina else None,
        "requester_id": request.requester_id,
        "requester_name": request.requester.full_name if request.requester else None,
        "status": request.status,
        "is_urgent": request.is_urgent,
        "assigned_to_id": request.assigned_to_id,
        "assigned_to_name": request.assigned_to.full_name if request.assigned_to else None,
        "is_forced_assignment": request.is_forced_assignment,
        "promised_eta_minutes": request.promised_eta_minutes,
        "created_at": request.created_at,
        "taken_at": request.taken_at,
        "completed_at": request.completed_at,
        "urgency_requested_at": request.urgency_requested_at,
        "points_awarded": request.points_awarded,
        "penalty_applied": request.penalty_applied,
        "eta_respected": request.eta_respected,
        "confirmation_code": request.confirmation_code,
        "wait_time_seconds": request.wait_time_seconds,
        "is_overdue": request.is_overdue
    }
    return data


# ============================================================
# MATERIAL TYPES (Admin CRUD)
# ============================================================

@router.get("/materials", response_model=List[LogisticsMaterialTypeResponse])
async def list_material_types(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista tipi di materiale."""
    query = db.query(LogisticsMaterialType)
    if active_only:
        query = query.filter(LogisticsMaterialType.is_active == True)
    return query.order_by(LogisticsMaterialType.display_order).all()


@router.post("/materials", response_model=LogisticsMaterialTypeResponse)
async def create_material_type(
    data: LogisticsMaterialTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea nuovo tipo materiale (Admin)."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    material = LogisticsMaterialType(**data.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.patch("/materials/{material_id}", response_model=LogisticsMaterialTypeResponse)
async def update_material_type(
    material_id: int,
    data: LogisticsMaterialTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifica tipo materiale (Admin)."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    material = db.query(LogisticsMaterialType).filter(LogisticsMaterialType.id == material_id).first()
    if not material:
        raise HTTPException(404, "Materiale non trovato")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(material, key, value)
    
    db.commit()
    db.refresh(material)
    return material


@router.delete("/materials/{material_id}")
async def delete_material_type(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disattiva tipo materiale (Admin)."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    material = db.query(LogisticsMaterialType).filter(LogisticsMaterialType.id == material_id).first()
    if not material:
        raise HTTPException(404, "Materiale non trovato")
    
    material.is_active = False
    db.commit()
    return {"message": "Materiale disattivato"}


# ============================================================
# REQUESTS (Core Functionality)
# ============================================================

@router.post("/requests", response_model=LogisticsRequestResponse)
async def create_request(
    data: LogisticsRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea nuova richiesta materiale."""
    if not current_user.has_permission("request_logistics"):
        raise HTTPException(403, "Permesso negato")
    
    # Determina banchina
    banchina_id = data.banchina_id
    if not banchina_id and current_user.employee:
        banchina_id = current_user.employee.default_banchina_id
    
    if not banchina_id:
        raise HTTPException(400, "Banchina non specificata e utente senza banchina default")
    
    # Verifica materiale esiste
    material = db.query(LogisticsMaterialType).filter(
        LogisticsMaterialType.id == data.material_type_id,
        LogisticsMaterialType.is_active == True
    ).first()
    if not material:
        raise HTTPException(404, "Tipo materiale non trovato")
    
    # Se richiede descrizione, verificala
    if material.requires_description and not data.custom_description:
        raise HTTPException(400, f"Il materiale '{material.label}' richiede una descrizione")
    
    # --- BLOCCO DOPPIONI (Anti-Flood) ---
    # Verifica se esiste già una richiesta IDENTICA (stesso materiale, stessa banchina) in sospeso
    existing_pending = db.query(LogisticsRequest).filter(
        LogisticsRequest.material_type_id == data.material_type_id,
        LogisticsRequest.banchina_id == banchina_id,
        LogisticsRequest.status == "pending"
    ).first()
    
    if existing_pending:
        # Se fatta dallo stesso utente negli ultimi 2 minuti, blocca (possibile click multiplo)
        if existing_pending.requester_id == current_user.id:
            raise HTTPException(400, "Hai già una richiesta identica in attesa per questa banchina.")
        # Altrimenti, se è di un altro, permettiamo o segnaliamo (per ora permettiamo ma logghiamo)
    
    # --- GENERAZIONE OTP (Secure Delivery) ---
    otp = None
    if data.require_otp:
        import random
        otp = "".join([str(random.randint(0, 9)) for _ in range(4)])
    
    request = LogisticsRequest(
        material_type_id=data.material_type_id,
        custom_description=data.custom_description,
        quantity=data.quantity,
        banchina_id=banchina_id,
        requester_id=current_user.id,
        unit_of_measure=data.unit_of_measure or "pz",
        confirmation_code=otp
    )
    
    db.add(request)
    db.commit()
    db.refresh(request)
    
    # WebSocket Broadcast
    try:
        lm = get_logistics_manager()
        await lm.broadcast("logistics", {"type": "new_request", "request_id": request.id})
    except Exception as e:
        print(f"[WS ERROR] Broadcast fallito: {e}")
    
    return enrich_request_response(request)


@router.patch("/requests/{request_id}/cancel")
async def cancel_request(
    request_id: int,
    reason: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Annulla una richiesta (se non ancora presa in carico)."""
    request = db.query(LogisticsRequest).filter(LogisticsRequest.id == request_id).first()
    if not request:
        raise HTTPException(404, "Richiesta non trovata")
    
    # Solo il richiedente può annullare (o un coordinatore)
    if request.requester_id != current_user.id and not current_user.has_permission("supervise_logistics"):
        raise HTTPException(403, "Non puoi annullare questa richiesta")
    
    if request.status != "pending":
        raise HTTPException(400, "Impossibile annullare: richiesta già in lavorazione o completata")
    
    request.status = "cancelled"
    request.cancelled_at = datetime.utcnow()
    request.cancelled_by_id = current_user.id
    request.cancellation_reason = reason
    
    db.commit()
    return {"message": "Richiesta annullata"}


@router.patch("/requests/take-batch")
async def take_requests_batch(
    request_ids: List[int],
    eta_minutes: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Prendi in carico MULTIPLE richieste (Multi-Take)."""
    if not current_user.has_permission("manage_logistics_pool"):
        raise HTTPException(403, "Permesso negato")
    
    requests = db.query(LogisticsRequest).filter(
        LogisticsRequest.id.in_(request_ids),
        LogisticsRequest.status.in_(["pending", "assigned"])
    ).all()
    
    if not requests:
        raise HTTPException(404, "Nessuna richiesta valida trovata")
        
    taken_count = 0
    now = datetime.utcnow()
    
    for req in requests:
        req.status = "processing"
        req.assigned_to_id = current_user.id
        req.taken_at = now
        req.promised_eta_minutes = eta_minutes
        taken_count += 1
    
    db.commit()
    
    # WebSocket Broadcast for each taken request
    try:
        lm = get_logistics_manager()
        for req in requests:
            await lm.broadcast("logistics", {"type": "request_updated", "request_id": req.id, "status": "processing"})
    except Exception as e:
        print(f"[WS ERROR] Broadcast fallito per take-batch: {e}")
    
    return {"message": f"{taken_count} richieste prese in carico", "count": taken_count}



@router.get("/requests")
async def list_requests(
    status: Optional[str] = None,
    banchina_id: Optional[int] = None,
    my_requests: bool = False,
    my_assigned: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista richieste con filtri."""
    query = db.query(LogisticsRequest).options(
        joinedload(LogisticsRequest.material_type),
        joinedload(LogisticsRequest.banchina),
        joinedload(LogisticsRequest.requester),
        joinedload(LogisticsRequest.assigned_to)
    )
    
    # Filtri
    if status:
        if status == "active":
            query = query.filter(LogisticsRequest.status.in_(["pending", "processing"]))
        else:
            query = query.filter(LogisticsRequest.status == status)
    
    if banchina_id:
        query = query.filter(LogisticsRequest.banchina_id == banchina_id)
    
    if my_requests:
        query = query.filter(LogisticsRequest.requester_id == current_user.id)
    
    if my_assigned:
        query = query.filter(LogisticsRequest.assigned_to_id == current_user.id)
    
    # Ordina: urgenti prima, poi per tempo attesa
    query = query.order_by(
        LogisticsRequest.is_urgent.desc(),
        LogisticsRequest.created_at.asc()
    ).limit(limit)
    
    requests = query.all()
    
    # Auto-Priority Logic (On Read)
    # Se una richiesta è pending da > X min, segnarla come "Late" (visivamente) o scalarla
    # Qui aggiungiamo solo un flag 'is_late_auto' nella risposta arricchita, senza scrivere su DB per performance
    now = datetime.utcnow()
    enriched_items = []
    
    threshold_sla = int(get_config_value(db, "threshold_sla_warning_minutes", "3"))

    for r in requests:
        item = enrich_request_response(r)
        # Calcola se è "late" (automatico)
        if r.status == 'pending' and (now - r.created_at).total_seconds() > (threshold_sla * 60):
            item['is_auto_urgent'] = True
        else:
            item['is_auto_urgent'] = False
        enriched_items.append(item)
    
    # Conta per stats
    pending_count = db.query(LogisticsRequest).filter(LogisticsRequest.status == "pending").count()
    urgent_count = db.query(LogisticsRequest).filter(
        LogisticsRequest.is_urgent == True,
        LogisticsRequest.status.in_(["pending", "processing"])
    ).count()
    
    return {
        "items": enriched_items,
        "total": len(requests),
        "pending_count": pending_count,
        "urgent_count": urgent_count
    }


@router.get("/requests/{request_id}", response_model=LogisticsRequestResponse)
async def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dettaglio singola richiesta."""
    request = db.query(LogisticsRequest).options(
        joinedload(LogisticsRequest.material_type),
        joinedload(LogisticsRequest.banchina),
        joinedload(LogisticsRequest.requester),
        joinedload(LogisticsRequest.assigned_to)
    ).filter(LogisticsRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(404, "Richiesta non trovata")
    
    return enrich_request_response(request)


@router.patch("/requests/{request_id}/take")
async def take_request(
    request_id: int,
    data: LogisticsRequestTake,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Prendi in carico una richiesta (magazziniere)."""
    if not current_user.has_permission("manage_logistics_pool"):
        raise HTTPException(403, "Permesso negato")
    
    request = db.query(LogisticsRequest).filter(LogisticsRequest.id == request_id).first()
    if not request:
        raise HTTPException(404, "Richiesta non trovata")
    
    if request.status not in ["pending", "assigned"]:
        raise HTTPException(400, f"Richiesta non disponibile (status: {request.status})")
    
    # Prendi in carico
    request.status = "processing"
    request.assigned_to_id = current_user.id
    request.taken_at = datetime.utcnow()
    request.promised_eta_minutes = data.promised_eta_minutes
    
    db.commit()
    
    # WebSocket Broadcast
    try:
        lm = get_logistics_manager()
        await lm.broadcast("logistics", {"type": "request_updated", "request_id": request_id, "status": "processing"})
    except Exception as e:
        print(f"[WS ERROR] Broadcast fallito per take_request: {e}")
    
    # TODO: Notifica al richiedente
    
    return {"message": "Richiesta presa in carico", "eta_minutes": data.promised_eta_minutes}


@router.patch("/requests/{request_id}/complete")
async def complete_request(
    request_id: int,
    data: LogisticsRequestComplete = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Completa una richiesta (consegnato)."""
    request = db.query(LogisticsRequest).filter(LogisticsRequest.id == request_id).first()
    if not request:
        raise HTTPException(404, "Richiesta non trovata")
    
    if request.assigned_to_id != current_user.id and not current_user.has_permission("supervise_logistics"):
        raise HTTPException(403, "Non sei assegnato a questa richiesta")
    
    if request.status != "processing":
        raise HTTPException(400, "Richiesta non in elaborazione")
    
    # --- SECURE DELIVERY (OTP Verification) ---
    if request.confirmation_code:
        if not data or not data.confirmation_code:
            raise HTTPException(400, "Codice di conferma (OTP) obbligatorio per completare la consegna")
        
        if data.confirmation_code != request.confirmation_code:
            print(f"❌ [OTP DEBUG] Mismatch! Expected: '{request.confirmation_code}', Received: '{data.confirmation_code}'")
            raise HTTPException(400, "Codice di conferma errato. Chiedi l'OTP al destinatario.")

    # Completa
    request.status = "completed"
    request.completed_at = datetime.utcnow()
    
    if request.taken_at:
        request.actual_duration_seconds = int((request.completed_at - request.taken_at).total_seconds())
    
    # Calcola punti e penalità
    points, penalty = calculate_points_and_penalties(request, db)
    request.points_awarded = points
    request.penalty_applied = penalty
    
    # Aggiorna performance mensile
    if current_user.employee:
        perf = get_or_create_performance(db, current_user.employee.id)
        perf.missions_completed += 1
        if request.is_urgent:
            perf.missions_urgent += 1
        perf.total_points += points
        perf.penalties_received += penalty
        
        # Aggiorna media reazione
        if request.wait_time_seconds:
            reaction = int(request.wait_time_seconds)
            if perf.avg_reaction_seconds:
                # Media mobile
                perf.avg_reaction_seconds = int((perf.avg_reaction_seconds + reaction) / 2)
            else:
                perf.avg_reaction_seconds = reaction
            
            # Record personale
            if not perf.fastest_reaction_seconds or reaction < perf.fastest_reaction_seconds:
                perf.fastest_reaction_seconds = reaction
    
    db.commit()
    
    # WebSocket Broadcast
    try:
        lm = get_logistics_manager()
        await lm.broadcast("logistics", {"type": "request_completed", "request_id": request_id})
    except Exception as e:
        print(f"[WS ERROR] Broadcast fallito per complete_request: {e}")
    
    # TODO: Notifica al richiedente
    
    return {
        "message": "Richiesta completata",
        "points_awarded": points,
        "penalty_applied": penalty,
        "eta_respected": request.eta_respected
    }


@router.patch("/requests/{request_id}/release")
async def release_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rilascia una richiesta (non riesco a completarla)."""
    request = db.query(LogisticsRequest).filter(LogisticsRequest.id == request_id).first()
    if not request:
        raise HTTPException(404, "Richiesta non trovata")
    
    if request.assigned_to_id != current_user.id:
        raise HTTPException(403, "Non sei assegnato a questa richiesta")
    
    if request.status != "processing":
        raise HTTPException(400, "Richiesta non in elaborazione")
    
    # Rilascia
    request.status = "pending"
    request.assigned_to_id = None
    request.taken_at = None
    request.promised_eta_minutes = None
    request.was_released = True  # NEW: Segna come rilasciata (per bonus salvataggio)
    
    # Penalità per rilascio
    penalty = int(get_config_value(db, "penalty_release_task", "1"))
    
    # Aggiorna performance
    if current_user.employee:
        perf = get_or_create_performance(db, current_user.employee.id)
        perf.missions_released += 1
        perf.penalties_received += penalty
    
    db.commit()
    
    return {"message": "Richiesta rilasciata", "penalty_applied": penalty}


@router.patch("/requests/{request_id}/urgent")
async def mark_urgent(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sollecita urgenza (richiedente)."""
    request = db.query(LogisticsRequest).filter(LogisticsRequest.id == request_id).first()
    if not request:
        raise HTTPException(404, "Richiesta non trovata")
    
    # Solo il richiedente può sollecitare
    if request.requester_id != current_user.id and not current_user.has_permission("supervise_logistics"):
        raise HTTPException(403, "Solo il richiedente può sollecitare")
    
    if request.is_urgent:
        raise HTTPException(400, "Richiesta già urgente")
    
    if request.status not in ["pending", "processing"]:
        raise HTTPException(400, "Richiesta non attiva")
    
    request.is_urgent = True
    request.urgency_requested_at = datetime.utcnow()
    
    # Penalità al magazziniere se assegnato
    if request.assigned_to_id:
        assigned_user = db.query(User).filter(User.id == request.assigned_to_id).first()
        if assigned_user and assigned_user.employee:
            perf = get_or_create_performance(db, assigned_user.employee.id)
            perf.urgency_requests_received += 1
            penalty = int(get_config_value(db, "penalty_urgency_received", "1"))
            perf.penalties_received += penalty
    
    db.commit()
    
    # TODO: Notifica al magazziniere e al coordinatore
    
    return {"message": "Richiesta marcata come urgente"}


# ============================================================
# MESSAGES
# ============================================================

@router.post("/requests/{request_id}/messages", response_model=LogisticsMessageResponse)
async def send_message(
    request_id: int,
    data: LogisticsMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invia messaggio su una richiesta."""
    request = db.query(LogisticsRequest).filter(LogisticsRequest.id == request_id).first()
    if not request:
        raise HTTPException(404, "Richiesta non trovata")
    
    # Solo richiedente o assegnato possono inviare messaggi
    if request.requester_id != current_user.id and request.assigned_to_id != current_user.id:
        raise HTTPException(403, "Non autorizzato a inviare messaggi")
    
    message = LogisticsMessage(
        request_id=request_id,
        sender_id=current_user.id,
        message_type=data.message_type,
        content=data.content
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # TODO: Notifica push al destinatario
    
    return {
        "id": message.id,
        "request_id": message.request_id,
        "sender_id": message.sender_id,
        "sender_name": current_user.full_name,
        "message_type": message.message_type,
        "content": message.content,
        "sent_at": message.sent_at,
        "read_at": message.read_at
    }


@router.get("/requests/{request_id}/messages", response_model=List[LogisticsMessageResponse])
async def get_messages(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista messaggi di una richiesta."""
    messages = db.query(LogisticsMessage).filter(
        LogisticsMessage.request_id == request_id
    ).order_by(LogisticsMessage.sent_at).all()
    
    return [{
        "id": m.id,
        "request_id": m.request_id,
        "sender_id": m.sender_id,
        "sender_name": m.sender.full_name if m.sender else None,
        "message_type": m.message_type,
        "content": m.content,
        "sent_at": m.sent_at,
        "read_at": m.read_at
    } for m in messages]


# ============================================================
# PRESET MESSAGES (Admin CRUD)
# ============================================================

@router.get("/preset-messages", response_model=List[LogisticsPresetMessageResponse])
async def list_preset_messages(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista messaggi preimpostati."""
    query = db.query(LogisticsPresetMessage)
    if active_only:
        query = query.filter(LogisticsPresetMessage.is_active == True)
    return query.order_by(LogisticsPresetMessage.display_order).all()


@router.post("/preset-messages", response_model=LogisticsPresetMessageResponse)
async def create_preset_message(
    data: LogisticsPresetMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea messaggio preimpostato (Admin)."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    message = LogisticsPresetMessage(**data.model_dump())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.patch("/preset-messages/{message_id}", response_model=LogisticsPresetMessageResponse)
async def update_preset_message(
    message_id: int,
    data: LogisticsPresetMessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifica messaggio preimpostato (Admin)."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    message = db.query(LogisticsPresetMessage).filter(LogisticsPresetMessage.id == message_id).first()
    if not message:
        raise HTTPException(404, "Messaggio non trovato")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(message, key, value)
    
    db.commit()
    db.refresh(message)
    return message


@router.delete("/preset-messages/{message_id}")
async def delete_preset_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disattiva messaggio preimpostato (Admin)."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    message = db.query(LogisticsPresetMessage).filter(LogisticsPresetMessage.id == message_id).first()
    if not message:
        raise HTTPException(404, "Messaggio non trovato")
    
    message.is_active = False
    db.commit()
    return {"message": "Messaggio disattivato"}


# ============================================================
# ETA OPTIONS (Admin CRUD)
# ============================================================

@router.get("/eta-options", response_model=List[LogisticsEtaOptionResponse])
async def list_eta_options(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista opzioni ETA."""
    query = db.query(LogisticsEtaOption)
    if active_only:
        query = query.filter(LogisticsEtaOption.is_active == True)
    return query.order_by(LogisticsEtaOption.display_order).all()


@router.post("/eta-options", response_model=LogisticsEtaOptionResponse)
async def create_eta_option(
    data: LogisticsEtaOptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea opzione ETA (Admin)."""
    if not current_user.has_permission("admin_config"):
        raise HTTPException(403, "Permesso negato")
    
    option = LogisticsEtaOption(**data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


@router.patch("/eta-options/{option_id}", response_model=LogisticsEtaOptionResponse)
async def update_eta_option(
    option_id: int,
    data: LogisticsEtaOptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifica opzione ETA (Admin)."""
    if not current_user.has_permission("admin_config"):
        raise HTTPException(403, "Permesso negato")
    
    option = db.query(LogisticsEtaOption).filter(LogisticsEtaOption.id == option_id).first()
    if not option:
        raise HTTPException(404, "Opzione non trovata")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(option, key, value)
    
    db.commit()
    db.refresh(option)
    return option


@router.delete("/eta-options/{option_id}")
async def delete_eta_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disattiva opzione ETA (Admin)."""
    if not current_user.has_permission("admin_config"):
        raise HTTPException(403, "Permesso negato")
    
    option = db.query(LogisticsEtaOption).filter(LogisticsEtaOption.id == option_id).first()
    if not option:
        raise HTTPException(404, "Opzione non trovata")
    
    option.is_active = False
    db.commit()
    return {"message": "Opzione disattivata"}


# ============================================================
# PERFORMANCE & LEADERBOARD
# ============================================================

@router.get("/performance/me", response_model=LogisticsPerformanceResponse)
async def my_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """La mia performance mensile."""
    if not current_user.employee:
        raise HTTPException(400, "Utente non collegato a un dipendente")
    
    perf = get_or_create_performance(db, current_user.employee.id)
    
    return {
        "id": perf.id,
        "employee_id": perf.employee_id,
        "employee_name": current_user.full_name,
        "month": perf.month,
        "year": perf.year,
        "missions_completed": perf.missions_completed,
        "missions_urgent": perf.missions_urgent,
        "missions_released": perf.missions_released,
        "total_points": perf.total_points,
        "penalties_received": perf.penalties_received,
        "avg_reaction_seconds": perf.avg_reaction_seconds,
        "fastest_reaction_seconds": perf.fastest_reaction_seconds,
        "eta_accuracy_percent": perf.eta_accuracy_percent,
        "urgency_requests_received": perf.urgency_requests_received,
        "net_points": perf.total_points - perf.penalties_received
    }


@router.get("/performance/employee/{employee_id}", response_model=LogisticsPerformanceResponse)
async def get_employee_performance(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Performance mensile di un dipendente specifico (Admin/HR)."""
    if not current_user.has_permission("manage_employees") and not current_user.has_permission("supervise_logistics"):
        raise HTTPException(403, "Permesso negato")
    
    perf = get_or_create_performance(db, employee_id)
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    
    return {
        "id": perf.id,
        "employee_id": perf.employee_id,
        "employee_name": employee.full_name if employee else "N/A",
        "month": perf.month,
        "year": perf.year,
        "missions_completed": perf.missions_completed,
        "missions_urgent": perf.missions_urgent,
        "missions_released": perf.missions_released,
        "total_points": perf.total_points,
        "penalties_received": perf.penalties_received,
        "avg_reaction_seconds": perf.avg_reaction_seconds,
        "fastest_reaction_seconds": perf.fastest_reaction_seconds,
        "eta_accuracy_percent": perf.eta_accuracy_percent,
        "urgency_requests_received": perf.urgency_requests_received,
        "net_points": perf.total_points - perf.penalties_received
    }


@router.get("/leaderboard")
async def leaderboard(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Classifica mensile magazzinieri."""
    now = datetime.utcnow()
    target_month = month or now.month
    target_year = year or now.year
    
    performances = db.query(LogisticsPerformance).options(
        joinedload(LogisticsPerformance.employee)
    ).filter(
        LogisticsPerformance.month == target_month,
        LogisticsPerformance.year == target_year
    ).order_by(
        (LogisticsPerformance.total_points - LogisticsPerformance.penalties_received).desc()
    ).all()
    
    entries = []
    for i, p in enumerate(performances):
        entries.append({
            "rank": i + 1,
            "employee_id": p.employee_id,
            "employee_name": p.employee.full_name if p.employee else "N/A",
            "missions_completed": p.missions_completed,
            "total_points": p.total_points,
            "penalties_received": p.penalties_received,
            "net_points": p.total_points - p.penalties_received,
            "avg_reaction_seconds": p.avg_reaction_seconds
        })
    
    return {
        "month": target_month,
        "year": target_year,
        "entries": entries
    }


# ============================================================
# CONFIG (Admin)
# ============================================================

@router.get("/config", response_model=List[LogisticsConfigResponse])
async def list_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista configurazioni sistema."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    return db.query(LogisticsConfig).all()


@router.put("/config/{key}")
async def update_config(
    key: str,
    value: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggiorna configurazione."""
    if not current_user.has_permission("manage_logistics_config"):
        raise HTTPException(403, "Permesso negato")
    
    config = db.query(LogisticsConfig).filter(LogisticsConfig.config_key == key).first()
    if config:
        config.config_value = value
    else:
        config = LogisticsConfig(config_key=key, config_value=value)
        db.add(config)
    
    db.commit()
    return {"message": f"Configurazione {key} aggiornata"}
