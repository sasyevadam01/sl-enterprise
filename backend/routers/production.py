"""
SL Enterprise - Production Router
Gestione Picking List (Live Production)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
import pandas as pd
import io

from database import get_db, User
from models.production import ProductionMaterial, BlockRequest
from models.chat import PushSubscription  # <-- Push Subscriptions
from push_service import send_production_notification  # <-- Push Service
from models.core import AuditLog  # <-- Audit Log
from schemas import (
    ProductionMaterialResponse, ProductionMaterialCreate, ProductionMaterialUpdate,
    BlockRequestResponse, BlockRequestCreate, BlockRequestUpdate
)
from security import get_current_user
from websocket_manager import get_logistics_manager

router = APIRouter(prefix="/production", tags=["Production"])

# Helper: Audit Log
def log_audit(db: Session, user_id: int, action: str, details: str):
    """Registra un'azione nel log di audit."""
    try:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            details=details
        )
        db.add(log_entry)
        # Commit should be handled by the caller or auto-flush, but safe to add context
    except Exception as e:
        print(f"AUDIT LOG ERROR: {e}")

# ============================================================
# CONFIGURATION (Materiali / Colori)
# ============================================================

@router.get("/config", response_model=List[ProductionMaterialResponse], summary="Lista Materiali/Colori")
async def get_production_config(
    category: Optional[str] = None,
    include_inactive: bool = False, # Added logic to see all for admin
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ritorna la lista dei materiali configurati.
    """
    query = db.query(ProductionMaterial)
    if not include_inactive:
        query = query.filter(ProductionMaterial.is_active == True)
        
    if category:
        query = query.filter(ProductionMaterial.category == category)
    
    return query.order_by(ProductionMaterial.display_order).all()

@router.post("/config", response_model=ProductionMaterialResponse, summary="Aggiungi Materiale")
async def create_production_material(
    data: ProductionMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin Only: Aggiunge un materiale."""
    if current_user.role not in ['super_admin', 'admin', 'factory_controller']:
        raise HTTPException(403, "Permesso negato")
        
    new_item = ProductionMaterial(**data.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    # Audit
    log_audit(db, current_user.id, "PRODUCTION_CONFIG_CREATE", f"Created material: {new_item.label} ({new_item.category})")
    db.commit()
    
    return new_item

@router.patch("/config/{mat_id}", response_model=ProductionMaterialResponse, summary="Modifica Materiale")
async def update_production_material(
    mat_id: int,
    data: ProductionMaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin Only: Modifica un materiale."""
    if current_user.role not in ['super_admin', 'admin', 'factory_controller']:
        raise HTTPException(403, "Permesso negato")
        
    item = db.query(ProductionMaterial).filter(ProductionMaterial.id == mat_id).first()
    if not item:
        raise HTTPException(404, "Materiale non trovato")
        
    # Update fields
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
        
    db.commit()
    db.refresh(item)
    
    # Audit
    log_audit(db, current_user.id, "PRODUCTION_CONFIG_UPDATE", f"Updated material {mat_id}: {update_data}")
    db.commit()
    
    return item

# ============================================================
# REQUESTS (Ordini Blocchi)
# ============================================================

@router.post("/requests", response_model=dict, summary="Crea Richiesta Blocco")
async def create_block_request(
    data: BlockRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nuova richiesta (Order User).
    Richiede permesso: create_production_orders
    """
    if not (current_user.has_permission("create_production_orders") or current_user.role == "super_admin"):
        raise HTTPException(403, "Non hai il permesso di creare richieste")

    try:
        new_req = BlockRequest(
            **data.dict(),
            created_by_id=current_user.id,
            status="pending"
        )
        db.add(new_req)
        db.commit()
        db.refresh(new_req)
        
        # Audio Log
        log_audit(db, current_user.id, "PRODUCTION_ORDER_CREATED", f"Order {new_req.id} created. Type: {new_req.request_type}")
        db.commit()

        # WebSocket Broadcast
        try:
            lm = get_logistics_manager()
            await lm.broadcast("production_blocks", {"type": "new_block", "block_id": new_req.id})
        except Exception as e:
            print(f"[WS BROADCAST ERROR] Error broadcasting new block: {e}")

        # --- NOTIFICHE PUSH ---
        try:
            # 1. Trova tutti gli utenti che devono ricevere la notifica (Magazzinieri / Supply)
            # Cerchiamo utenti con permesso 'manage_production_supply' o ruolo 'supply'/'super_admin'
            # Per efficienza, prendiamo tutte le subscription e filtriamo in Python (o join complessa)
            subs = db.query(PushSubscription).join(PushSubscription.user).all()
            
            notified_count = 0
            for sub in subs:
                user = sub.user
                # Verifica permessi: ha permesso supply o è super admin?
                # Nota: has_permission potrebbe non essere disponibile se user non è caricato come oggetto completo Pydantic/User, 
                # ma qui è un modello ORM. Assumiamo che il metodo o la logica esista o controlliamo il ruolo.
                # Se `has_permission` è un metodo del modello SQLAlchemy User:
                if (hasattr(user, 'has_permission') and user.has_permission("manage_production_supply")) or \
                   user.role in ['super_admin', 'supply', 'logistics']:
                    
                    # Prepara testo
                    title = f"Nuova Richiesta #{new_req.id}"
                    body = f"📦 {new_req.quantity}x "
                    if new_req.request_type == 'memory' and new_req.material:
                        body += new_req.material.label
                    elif new_req.density and new_req.color:
                        body += f"{new_req.density.label} {new_req.color.label}"
                    else:
                        body += "Blocco Generico"
                        
                    # Dati subscription
                    sub_info = {
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh_key,
                            "auth": sub.auth_key
                        }
                    }
                    
                    # Invia
                    send_production_notification(sub_info, title, body, new_req.id)
                    notified_count += 1
            
            print(f"[PUSH] Notifiche produzione inviate a {notified_count} dispositivi.")

        except Exception as e:
            print(f"[PUSH ERROR] Errore invio notifiche produzione: {e}")
        # ----------------------
        
        return {
            "id": new_req.id,
            "status": "success",
            "message": "Ordine creato correttamante"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Errore creazione ordine: {str(e)}")

@router.get("/requests", response_model=List[BlockRequestResponse], summary="Lista Richieste")
async def list_block_requests(
    status: Optional[str] = None, # pending, processing, delivered, history (delivered/completed)
    material_type: Optional[str] = None,  # memory, sponge - filtro tipo materiale
    limit: Optional[int] = None,  # None = nessun limite (record infiniti)
    offset: int = 0,  # Paginazione
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista richieste con paginazione e filtri.
    """
    query = db.query(BlockRequest).options(
        joinedload(BlockRequest.material),
        joinedload(BlockRequest.density),
        joinedload(BlockRequest.color),
        joinedload(BlockRequest.supplier),
        joinedload(BlockRequest.created_by),
        joinedload(BlockRequest.processed_by)
    )

    is_supply = current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"
    is_order = current_user.has_permission("create_production_orders")
    
    # Filtro per tipo materiale
    if material_type:
        query = query.filter(BlockRequest.request_type == material_type)
    
    if status == 'active':
        query = query.filter(BlockRequest.status.in_(['pending', 'processing']))
    elif status == 'history':
        query = query.filter(BlockRequest.status.in_(['delivered', 'completed', 'cancelled']))
    elif status:
        query = query.filter(BlockRequest.status == status)

    if is_order and not is_supply:
        query = query.filter(BlockRequest.created_by_id == current_user.id)
    
    # Ordinamento: Urgenti prima, poi per data decrescente
    from sqlalchemy import desc
    query = query.order_by(desc(BlockRequest.is_urgent), BlockRequest.created_at.desc())
    
    query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    results = query.all()
    
    response_list = []
    for req in results:
        response_list.append(BlockRequestResponse(
            id=req.id,
            request_type=req.request_type,
            target_sector=req.target_sector,
            material_id=req.material_id,
            density_id=req.density_id,
            color_id=req.color_id,
            supplier_id=req.supplier_id,
            dimensions=req.dimensions,
            custom_height=req.custom_height,
            is_trimmed=req.is_trimmed,
            quantity=req.quantity,
            client_ref=req.client_ref,
            notes=req.notes,
            status=req.status,
            is_urgent=req.is_urgent if hasattr(req, 'is_urgent') else False,
            created_by_id=req.created_by_id,
            created_at=req.created_at,
            processed_by_id=req.processed_by_id,
            processed_at=req.processed_at,
            delivered_at=req.delivered_at,
            # Computed fields
            material_label=req.material.label if req.material else None,
            density_label=req.density.label if req.density else None,
            color_label=req.color.label if req.color else None,
            supplier_label=req.supplier.label if req.supplier else None,
            creator_name=req.created_by.full_name if req.created_by else None,
            processor_name=req.processed_by.full_name if req.processed_by else None
        ))
        
    return response_list

@router.patch("/requests/{req_id}/status", response_model=BlockRequestResponse, summary="Aggiorna Stato Richiesta")
async def update_request_status(
    req_id: int,
    data: BlockRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gestione Flusso:
    - pending -> processing (Presa in carico da Supply) -> Log PRODUCTION_ORDER_PROCESSING
    - processing -> delivered (Consegnato da Supply) -> Log PRODUCTION_ORDER_DELIVERED
    - delivered -> completed (Archiviato da Order User) -> Log PRODUCTION_ORDER_ARCHIVED
    """
    req = db.query(BlockRequest).filter(BlockRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Richiesta non trovata")

    new_status = data.status
    log_action = None
    
    if new_status == 'processing':
        if not (current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"):
             raise HTTPException(403, "Solo Block Supply può prendere in carico")
        req.processed_by_id = current_user.id
        req.processed_at = datetime.utcnow()
        req.status = 'processing'
        log_action = "PRODUCTION_ORDER_PROCESSING"
        
    elif new_status == 'delivered':
        if not (current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"):
             raise HTTPException(403, "Solo Block Supply può consegnare")
        req.delivered_at = datetime.utcnow()
        req.status = 'delivered'
        log_action = "PRODUCTION_ORDER_DELIVERED"
        
    elif new_status == 'completed':
        is_owner = req.created_by_id == current_user.id
        if not (is_owner or current_user.role == "super_admin"):
             raise HTTPException(403, "Solo il richiedente può archiviare/confermare")
        req.status = 'completed'
        log_action = "PRODUCTION_ORDER_COMPLETED"
        
    elif new_status == 'cancelled':
        is_owner = req.created_by_id == current_user.id
        is_supply = current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"
        
        if not (is_owner or is_supply):
             raise HTTPException(403, "Permesso negato")
        
        req.status = 'cancelled'
        
        # LOGICA RIFIUTO vs CANCELLAZIONE
        if is_supply and not is_owner:
            # RIFIUTO MAGAZZINIERE: Segnamo chi ha rifiutato
            req.processed_by_id = current_user.id
            log_action = "PRODUCTION_ORDER_REJECTED"
        else:
            # CANCELLAZIONE UTENTE: Resettiamo il processore (non è una lavorazione)
            req.processed_by_id = None
            log_action = "PRODUCTION_ORDER_CANCELLED"
    
    if data.notes:
        req.notes = data.notes

    db.commit()
    db.refresh(req)
    
    # WebSocket Broadcast
    try:
        lm = get_logistics_manager()
        await lm.broadcast("production_blocks", {"type": "status_update", "block_id": req.id, "new_status": req.status})
    except Exception as e:
        print(f"[WS BROADCAST ERROR] Error broadcasting status update for block {req.id}: {e}")

    if log_action:
        log_audit(db, current_user.id, log_action, f"Order {req.id} status changed to {new_status}")
        db.commit()
        
    return req


@router.patch("/requests/{req_id}/acknowledge", summary="Conferma Lettura Cancellazione")
async def acknowledge_cancellation(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca una richiesta CANCELLATA come 'letta' (cancelled_acked).
    In questo modo scompare dalla dashboard di tutti (azione globale).
    """
    req = db.query(BlockRequest).filter(BlockRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Richiesta non trovata")
        
    if req.status != 'cancelled':
        raise HTTPException(400, "La richiesta non è cancellata")
        
    # Set unique status for acked cancellations
    req.status = 'cancelled_acked'
    db.commit()
    
    # WebSocket Broadcast
    try:
        lm = get_logistics_manager()
        await lm.broadcast("production_blocks", {"type": "block_resolved", "block_id": req_id})
    except Exception as e:
        print(f"[WS BROADCAST ERROR] Error broadcasting block resolved for block {req_id}: {e}")
    
    return {"message": "Cancellazione confermata", "status": "cancelled_acked"}


@router.patch("/requests/{req_id}/urgency", summary="Toggle Urgenza Ordine")
async def toggle_urgency(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca/deseleziona un ordine come URGENTE.
    Solo il richiedente originale può farlo.
    Ordini urgenti vengono visualizzati in rosso e in cima alla lista.
    """
    req = db.query(BlockRequest).filter(BlockRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Richiesta non trovata")
    
    # Solo il proprietario può richiedere urgenza
    if req.created_by_id != current_user.id and current_user.role != "super_admin":
        raise HTTPException(403, "Solo il richiedente può richiedere urgenza")
    
    # Solo ordini pending/processing possono essere urgenti
    if req.status not in ['pending', 'processing']:
        raise HTTPException(400, "Impossibile cambiare urgenza per ordini completati/annullati")
    
    # Toggle urgency
    req.is_urgent = not req.is_urgent
    db.commit()
    
    # WebSocket Broadcast
    try:
        lm = get_logistics_manager()
        await lm.broadcast("production_blocks", {
            "type": "urgency_update", 
            "block_id": req.id, 
            "is_urgent": req.is_urgent
        })
    except Exception as e:
        print(f"[WS BROADCAST ERROR] Error broadcasting urgency for block {req_id}: {e}")
    
    log_audit(db, current_user.id, "PRODUCTION_ORDER_URGENCY", f"Order {req.id} urgency set to {req.is_urgent}")
    db.commit()
    
    return {"message": "Urgenza aggiornata", "is_urgent": req.is_urgent}


@router.patch("/requests/batch", summary="Aggiornamento Batch Stati")
async def batch_update_status(
    request_ids: List[int],
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggiorna lo stato di più richieste contemporaneamente.
    Utile per operazioni bulk da parte del magazziniere.
    """
    if not (current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"):
        raise HTTPException(403, "Solo Block Supply può fare aggiornamenti batch")
    
    if new_status not in ['processing', 'delivered', 'cancelled']:
        raise HTTPException(400, "Stato non valido per batch update")
    
    updated = db.query(BlockRequest).filter(
        BlockRequest.id.in_(request_ids)
    ).update({
        BlockRequest.status: new_status,
        BlockRequest.processed_by_id: current_user.id,
        BlockRequest.processed_at: datetime.utcnow() if new_status == 'processing' else BlockRequest.processed_at,
        BlockRequest.delivered_at: datetime.utcnow() if new_status == 'delivered' else BlockRequest.delivered_at
    }, synchronize_session=False)
    
    db.commit()
    
    log_audit(db, current_user.id, "PRODUCTION_BATCH_UPDATE", f"Batch update {len(request_ids)} orders to {new_status}")
    db.commit()
    
    return {"message": f"Aggiornati {updated} ordini", "count": updated}


@router.get("/requests/stats", summary="Statistiche KPI Real-Time")
async def get_realtime_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Statistiche live: ordini pending, tempo medio attesa, throughput giornaliero.
    """
    from sqlalchemy import func, extract
    
    # Conteggi per stato
    pending_count = db.query(BlockRequest).filter(BlockRequest.status == 'pending').count()
    processing_count = db.query(BlockRequest).filter(BlockRequest.status == 'processing').count()
    
    # Ordini completati oggi
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_completed = db.query(BlockRequest).filter(
        BlockRequest.status.in_(['delivered', 'completed']),
        BlockRequest.delivered_at >= today_start
    ).count()
    
    # Tempo medio presa in carico (ultimi 7 giorni)
    week_ago = datetime.utcnow() - timedelta(days=7)
    avg_wait_result = db.query(
        func.avg(
            extract('epoch', BlockRequest.processed_at) - extract('epoch', BlockRequest.created_at)
        )
    ).filter(
        BlockRequest.processed_at.isnot(None),
        BlockRequest.created_at >= week_ago
    ).scalar()
    
    avg_wait_seconds = round(avg_wait_result or 0, 0)
    
    # Ordini urgenti attivi
    urgent_count = db.query(BlockRequest).filter(
        BlockRequest.is_urgent == True,
        BlockRequest.status.in_(['pending', 'processing'])
    ).count()
    
    return {
        "pending_count": pending_count,
        "processing_count": processing_count,
        "today_completed": today_completed,
        "avg_wait_seconds": avg_wait_seconds,
        "avg_wait_minutes": round(avg_wait_seconds / 60, 1) if avg_wait_seconds else 0,
        "urgent_count": urgent_count
    }

# ============================================================
# REPORTING & STATS (Excel Export)
# ============================================================

@router.get("/reports", summary="Report Produzione (Excel)")
async def get_production_reports(
    start_date: datetime,
    end_date: datetime,
    shift_type: Optional[str] = "all", # morning, afternoon, night, custom, all
    target_sector: Optional[str] = None,  # pantografo, giostra - filtro settore
    format: str = "json", # json or excel
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Genera report produzione.
    Turni:
    - Morning: 06:00 - 14:00
    - Afternoon: 14:00 - 22:00
    - Night: 22:00 - 06:00
    """
    # Permission Check
    if current_user.role not in ['super_admin', 'admin', 'factory_controller']:
        raise HTTPException(403, "Permesso negato")

    # Adjust end_date to include the full day (23:59:59)
    # When frontend sends "2026-01-20", we want to include all records until end of that day
    end_date_adjusted = end_date.replace(hour=23, minute=59, second=59)

    # 1. Base Query
    query = db.query(BlockRequest).options(
        joinedload(BlockRequest.material),
        joinedload(BlockRequest.density),
        joinedload(BlockRequest.color),
        joinedload(BlockRequest.supplier),
        joinedload(BlockRequest.created_by),
        joinedload(BlockRequest.processed_by)
    ).filter(
        BlockRequest.created_at >= start_date,
        BlockRequest.created_at <= end_date_adjusted
    )

    # 2. Shift Logic Application
    # Note: Shift filtering is complex in SQL if dynamic. 
    # For now, we fetch data in range and filter in Python or trust the passed start/end_date matching the shift.
    # The UI should send specific start/end timestamps for "today morning".
    # However, if "shift_type" is passed along with generic day dates, we assume we want that shift for EVERY day in range.
    # Implementing "Time of Day" filtering.
    
    requests = query.all()
    filtered_requests = []
    
    if shift_type in ['morning', 'afternoon', 'night']:
        for req in requests:
            hour = req.created_at.hour
            # Morning: 6 <= h < 14
            if shift_type == 'morning' and 6 <= hour < 14:
                filtered_requests.append(req)
            # Afternoon: 14 <= h < 22
            elif shift_type == 'afternoon' and 14 <= hour < 22:
                filtered_requests.append(req)
            # Night: 22 <= h or h < 6
            elif shift_type == 'night' and (hour >= 22 or hour < 6):
                filtered_requests.append(req)
    else:
        filtered_requests = requests

    # Filtro per settore (pantografo / giostra)
    if target_sector:
        filtered_requests = [r for r in filtered_requests if r.target_sector == target_sector]

    # 3. Data Aggregation
    data_rows = []
    
    # KPIs
    total_blocks = sum(req.quantity for req in filtered_requests)
    by_type = {}
    by_dims = {}
    user_perf = {} # {username: count}
    supply_perf = {} # {username: count}
    
    # NEW: Memory vs Spugna and Trimmed stats
    memory_count = 0
    sponge_count = 0
    trimmed_count = 0
    cancelled_count = 0  # NEW: Cancellation tracking
    urgent_count = 0     # NEW: Urgent blocks tracking
    by_sector = {}       # Aggregazione per settore
    
    time_created_processing = [] # minutes
    time_processing_delivered = [] # minutes

    for req in filtered_requests:
        # Resolve labels
        mat_label = "N/A"
        if req.request_type == 'memory':
            mat_label = f"Memory {req.material.label if req.material else '?'}"
            memory_count += req.quantity
        else:
            mat_label = f"Spugna {req.density.label if req.density else '?'} {req.color.label if req.color else '?'}"
            sponge_count += req.quantity
        
        # Trimmed count
        if req.is_trimmed:
            trimmed_count += req.quantity
        
        # NEW: Count cancelled requests
        if req.status in ['cancelled', 'cancelled_acked']:
            cancelled_count += req.quantity
        
        # NEW: Count urgent requests
        if hasattr(req, 'is_urgent') and req.is_urgent:
            urgent_count += req.quantity

        # Aggregazione per settore con breakdown memory/spugna
        sector_key = req.target_sector or 'non_specificato'
        if sector_key not in by_sector:
            by_sector[sector_key] = {"memory": 0, "sponge": 0, "total": 0}
        by_sector[sector_key]["total"] += req.quantity
        if req.request_type == 'memory':
            by_sector[sector_key]["memory"] += req.quantity
        else:
            by_sector[sector_key]["sponge"] += req.quantity
        # Count Type
        by_type[mat_label] = by_type.get(mat_label, 0) + req.quantity
        
        # Count Dimensions
        dims = req.dimensions
        if req.is_trimmed:
            dims += " (Rifilato)"
        by_dims[dims] = by_dims.get(dims, 0) + req.quantity
        
        # User Stats
        creator = req.created_by.full_name if req.created_by else "Unknown"
        user_perf[creator] = user_perf.get(creator, 0) + req.quantity
        
        if req.processed_by:
            processor = req.processed_by.full_name
            supply_perf[processor] = supply_perf.get(processor, 0) + req.quantity
            
        # Timings
        if req.created_at and req.processed_at:
            delta = (req.processed_at - req.created_at).total_seconds() / 60
            time_created_processing.append(delta)
            
        if req.processed_at and req.delivered_at:
            delta = (req.delivered_at - req.processed_at).total_seconds() / 60
            time_processing_delivered.append(delta)

        # Sector label for Excel
        sector_labels = {'pantografo': 'Pantografo', 'giostra': 'Giostra', 'altro': 'Altro'}
        sector_display = sector_labels.get(req.target_sector, '') if req.target_sector else ''

        # Row for Excel
        data_rows.append({
            "ID": req.id,
            "Data": req.created_at.strftime("%Y-%m-%d %H:%M"),
            "Utente Ordine": creator,
            "Settore": sector_display,
            "Tipo": req.request_type,
            "Materiale": mat_label,
            "Misure": req.dimensions,
            "Rifilato": "SI" if req.is_trimmed else "NO",
            "Fornitore": req.supplier.label if req.supplier else "",
            "Quantità": req.quantity,
            "Stato": req.status,
            "Supply User": req.processed_by.full_name if req.processed_by else "",
            "Note": req.notes or "",
            "Attesa Presa in Carico (min)": round((req.processed_at - req.created_at).total_seconds()/60, 1) if req.processed_at else "",
            "Tempo Lavorazione (min)": round((req.delivered_at - req.processed_at).total_seconds()/60, 1) if req.processed_at and req.delivered_at else ""
        })

    # Averages
    avg_wait = sum(time_created_processing) / len(time_created_processing) if time_created_processing else 0
    avg_work = sum(time_processing_delivered) / len(time_processing_delivered) if time_processing_delivered else 0

    stats = {
        "total_blocks": total_blocks,
        "by_type": by_type,
        "by_dims": by_dims,
        "user_perf": user_perf,
        "supply_perf": supply_perf,
        "avg_wait_min": round(avg_wait, 1),
        "avg_work_min": round(avg_work, 1),
        # NEW: Memory vs Spugna and Trimmed stats
        "memory_count": memory_count,
        "sponge_count": sponge_count,
        "trimmed_count": trimmed_count,
        "trimmed_percentage": round((trimmed_count / total_blocks * 100) if total_blocks > 0 else 0, 1),
        # NEW: Cancellation stats
        "cancelled_count": cancelled_count,
        "cancelled_percentage": round((cancelled_count / total_blocks * 100) if total_blocks > 0 else 0, 1),
        # NEW: Urgent stats
        "urgent_count": urgent_count,
        "urgent_percentage": round((urgent_count / total_blocks * 100) if total_blocks > 0 else 0, 1),
        # Aggregazione per settore
        "by_sector": by_sector
    }

    if format == 'json':
        return stats

    # 4. Excel Generation
    # Create Pandas DataFrames
    df_logs = pd.DataFrame(data_rows)
    
    # Summary Sheet Data
    summary_data = [
        {"Metrica": "Totale Blocchi", "Valore": total_blocks},
        {"Metrica": "Tempo Medio Attesa (min)", "Valore": round(avg_wait, 1)},
        {"Metrica": "Tempo Medio Lavorazione (min)", "Valore": round(avg_work, 1)},
        {"Metrica": "", "Valore": ""}, # Spacer
        {"Metrica": "--- TIPOLOGIA MATERIALE ---", "Valore": ""},
        {"Metrica": "Memory", "Valore": memory_count},
        {"Metrica": "Spugna", "Valore": sponge_count},
        {"Metrica": "", "Valore": ""}, # Spacer
        {"Metrica": "--- LAVORAZIONE ---", "Valore": ""},
        {"Metrica": "Blocchi Rifilati", "Valore": trimmed_count},
        {"Metrica": "% Rifilati", "Valore": f"{round((trimmed_count / total_blocks * 100) if total_blocks > 0 else 0, 1)}%"},
        {"Metrica": "", "Valore": ""}, # Spacer
        {"Metrica": "--- CANCELLAZIONI ---", "Valore": ""},
        {"Metrica": "Blocchi Cancellati", "Valore": cancelled_count},
        {"Metrica": "% Cancellati", "Valore": f"{round((cancelled_count / total_blocks * 100) if total_blocks > 0 else 0, 1)}%"},
        {"Metrica": "", "Valore": ""}, # Spacer
        {"Metrica": "--- PER TIPO MATERIALE ---", "Valore": ""}
    ]
    for k, v in by_type.items():
        summary_data.append({"Metrica": k, "Valore": v})
        
    summary_data.extend([{"Metrica": "", "Valore": ""}, {"Metrica": "--- PER UTENTE RICHIEDENTE ---", "Valore": ""}])
    for k, v in user_perf.items():
        summary_data.append({"Metrica": k, "Valore": v})
        
    # NEW: Add supply performance to Excel
    summary_data.extend([{"Metrica": "", "Valore": ""}, {"Metrica": "--- PER MAGAZZINIERE ---", "Valore": ""}])
    for k, v in supply_perf.items():
        summary_data.append({"Metrica": k, "Valore": v})

    df_summary = pd.DataFrame(summary_data)

    # Export to BytesIO
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name='Riepilogo', index=False)
        df_logs.to_excel(writer, sheet_name='Dettaglio Ordini', index=False)
        
        # Auto-adjust column widths (basic)
        for worksheet in writer.sheets.values():
            for column_cells in worksheet.columns:
                length = max(len(str(cell.value)) for cell in column_cells)
                worksheet.column_dimensions[column_cells[0].column_letter].width = length + 2

    output.seek(0)
    
    filename = f"Report_Produzione_{start_date.strftime('%Y%m%d')}_{shift_type}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
