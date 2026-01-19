"""
SL Enterprise - Production Router
Gestione Picking List (Live Production)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db, User
from models.production import ProductionMaterial, BlockRequest
from schemas import (
    ProductionMaterialResponse, ProductionMaterialCreate,
    BlockRequestResponse, BlockRequestCreate, BlockRequestUpdate
)
from security import get_current_user

router = APIRouter(prefix="/production", tags=["Live Production"])

# ============================================================
# CONFIGURATION (Materiali / Colori)
# ============================================================

@router.get("/config", response_model=List[ProductionMaterialResponse], summary="Lista Materiali/Colori")
async def get_production_config(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ritorna la lista dei materiali configurati.
    """
    query = db.query(ProductionMaterial).filter(ProductionMaterial.is_active == True)
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
    # Check Admin permission (admin_config or access_live_production?)
    # For simplicity, allowing admins and factory controllers
    if current_user.role not in ['super_admin', 'admin', 'factory_controller']:
        raise HTTPException(403, "Permesso negato")
        
    new_item = ProductionMaterial(**data.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

# ============================================================
# REQUESTS (Ordini Blocchi)
# ============================================================

@router.post("/requests", response_model=BlockRequestResponse, summary="Crea Richiesta Blocco")
async def create_block_request(
    data: BlockRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nuova richiesta (Order User).
    Richiede permesso: create_production_orders
    """
    # Permission check
    if not (current_user.has_permission("create_production_orders") or current_user.role == "super_admin"):
        raise HTTPException(403, "Non hai il permesso di creare richieste")

    new_req = BlockRequest(
        **data.dict(),
        created_by_id=current_user.id,
        status="pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req

@router.get("/requests", response_model=List[BlockRequestResponse], summary="Lista Richieste")
async def list_block_requests(
    status: Optional[str] = None, # pending, processing, delivered, history (delivered/completed)
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista richieste.
    - Se Order User: vede solo le sue (o tutte se vuole vedere coda?). Specs: "Dashboard personale".
    - Se Block Supply: vede to-do list (pending/processing).
    """
    query = db.query(BlockRequest).options(
        joinedload(BlockRequest.material),
        joinedload(BlockRequest.density),
        joinedload(BlockRequest.color),
        joinedload(BlockRequest.created_by),
        joinedload(BlockRequest.processed_by)
    )

    # Role Logic
    is_supply = current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"
    is_order = current_user.has_permission("create_production_orders")
    
    # Filter by status alias
    if status == 'active':
        # To-Do list for Supply
        query = query.filter(BlockRequest.status.in_(['pending', 'processing']))
    elif status == 'history':
        # Archivio / Consegnati
        query = query.filter(BlockRequest.status.in_(['delivered', 'completed', 'cancelled']))
        query = query.order_by(BlockRequest.created_at.desc())
    elif status:
        query = query.filter(BlockRequest.status == status)

    # Restrict Order User to own requests UNLESS they are also Supply/Admin
    if is_order and not is_supply:
        query = query.filter(BlockRequest.created_by_id == current_user.id)
        # Order user needs to see active orders (pending/processing) AND recent delivered (for feedback)
        # If no status param, return active + recent delivered?
        # Let's rely on frontend calling with explicit status.
        
    query = query.order_by(BlockRequest.created_at.asc()) # FIFO for supply
    
    results = query.limit(limit).all()
    
    # Enrich response with labels
    for req in results:
        req.material_label = req.material.label if req.material else None
        req.density_label = req.density.label if req.density else None
        req.color_label = req.color.label if req.color else None
        req.creator_name = req.created_by.full_name if req.created_by else "Unknown"
        req.processor_name = req.processed_by.full_name if req.processed_by else None
        
    return results

@router.patch("/requests/{req_id}/status", response_model=BlockRequestResponse, summary="Aggiorna Stato Richiesta")
async def update_request_status(
    req_id: int,
    data: BlockRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gestione Flusso:
    - pending -> processing (Presa in carico da Supply)
    - processing -> delivered (Consegnato da Supply)
    - delivered -> completed (Archiviato da Order User - conferma lettura)
    """
    req = db.query(BlockRequest).filter(BlockRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Richiesta non trovata")

    new_status = data.status
    
    # Logic permissions based on transition
    if new_status == 'processing':
        # Solo Supply
        if not (current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"):
             raise HTTPException(403, "Solo Block Supply può prendere in carico")
        req.processed_by_id = current_user.id
        req.processed_at = datetime.utcnow()
        req.status = 'processing'
        
    elif new_status == 'delivered':
        # Solo Supply
        if not (current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"):
             raise HTTPException(403, "Solo Block Supply può consegnare")
        req.delivered_at = datetime.utcnow()
        req.status = 'delivered'
        
    elif new_status == 'completed':
        # Solo Order User (proprietario) o Admin
        is_owner = req.created_by_id == current_user.id
        if not (is_owner or current_user.role == "super_admin"):
             raise HTTPException(403, "Solo il richiedente può archiviare/confermare")
        req.status = 'completed'
        
    elif new_status == 'cancelled':
        # Owner or Supply
        is_owner = req.created_by_id == current_user.id
        is_supply = current_user.has_permission("manage_production_supply")
        if not (is_owner or is_supply or current_user.role == "super_admin"):
             raise HTTPException(403, "Permesso negato")
        req.status = 'cancelled'
    
    if data.notes:
        req.notes = data.notes

    db.commit()
    db.refresh(req)
    return req
