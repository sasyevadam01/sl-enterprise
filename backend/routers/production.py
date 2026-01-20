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
from models.core import AuditLog  # <-- Audit Log
from schemas import (
    ProductionMaterialResponse, ProductionMaterialCreate, ProductionMaterialUpdate,
    BlockRequestResponse, BlockRequestCreate, BlockRequestUpdate
)
from security import get_current_user

router = APIRouter(prefix="/production", tags=["Live Production"])

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
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista richieste.
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
    
    if status == 'active':
        query = query.filter(BlockRequest.status.in_(['pending', 'processing']))
    elif status == 'history':
        query = query.filter(BlockRequest.status.in_(['delivered', 'completed', 'cancelled']))
        query = query.order_by(BlockRequest.created_at.desc())
    elif status:
        query = query.filter(BlockRequest.status == status)

    if is_order and not is_supply:
        query = query.filter(BlockRequest.created_by_id == current_user.id)
        
    query = query.order_by(BlockRequest.created_at.asc())
    
    results = query.limit(limit).all()
    
    response_list = []
    for req in results:
        response_list.append(BlockRequestResponse(
            id=req.id,
            request_type=req.request_type,
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
        is_supply = current_user.has_permission("manage_production_supply")
        if not (is_owner or is_supply or current_user.role == "super_admin"):
             raise HTTPException(403, "Permesso negato")
        req.status = 'cancelled'
        log_action = "PRODUCTION_ORDER_CANCELLED"
    
    if data.notes:
        req.notes = data.notes

    db.commit()
    db.refresh(req)
    
    if log_action:
        log_audit(db, current_user.id, log_action, f"Order {req.id} status changed to {new_status}")
        db.commit()
        
    return req

# ============================================================
# REPORTING & STATS (Excel Export)
# ============================================================

@router.get("/reports", summary="Report Produzione (Excel)")
async def get_production_reports(
    start_date: datetime,
    end_date: datetime,
    shift_type: Optional[str] = "all", # morning, afternoon, night, custom, all
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

    # 3. Data Aggregation
    data_rows = []
    
    # KPIs
    total_blocks = len(filtered_requests)
    by_type = {}
    by_dims = {}
    user_perf = {} # {username: count}
    supply_perf = {} # {username: count}
    
    time_created_processing = [] # minutes
    time_processing_delivered = [] # minutes

    for req in filtered_requests:
        # Resolve labels
        mat_label = "N/A"
        if req.request_type == 'memory':
            mat_label = f"Memory {req.material.label if req.material else '?'}"
        else:
            mat_label = f"Spugna {req.density.label if req.density else '?'} {req.color.label if req.color else '?'}"
            
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

        # Row for Excel
        data_rows.append({
            "ID": req.id,
            "Data": req.created_at.strftime("%Y-%m-%d %H:%M"),
            "Utente Ordine": creator,
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
        "avg_work_min": round(avg_work, 1)
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
        {"Metrica": "--- PER TIPO ---", "Valore": ""}
    ]
    for k, v in by_type.items():
        summary_data.append({"Metrica": k, "Valore": v})
        
    summary_data.extend([{"Metrica": "", "Valore": ""}, {"Metrica": "--- PER UTENTE ---", "Valore": ""}])
    for k, v in user_perf.items():
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
