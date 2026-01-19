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

    try:
        print(f"DEBUG: Creating BlockRequest - User: {current_user.id} ({current_user.full_name})")
        print(f"DEBUG: Payload: {data.dict()}")

        new_req = BlockRequest(
            **data.dict(),
            created_by_id=current_user.id,
            status="pending"
        )
        db.add(new_req)
        db.commit()
        db.refresh(new_req)
        
        return BlockRequestResponse(
            id=new_req.id,
            request_type=new_req.request_type,
            material_id=new_req.material_id,
            density_id=new_req.density_id,
            color_id=new_req.color_id,
            dimensions=new_req.dimensions,
            custom_height=new_req.custom_height,
            is_trimmed=new_req.is_trimmed,
            quantity=new_req.quantity,
            client_ref=new_req.client_ref,
            notes=new_req.notes,
            status=new_req.status,
            created_by_id=new_req.created_by_id,
            created_at=new_req.created_at,
            processed_by_id=new_req.processed_by_id,
            processed_at=new_req.processed_at,
            delivered_at=new_req.delivered_at,
            # Computed fields
            material_label=new_req.material.label if new_req.material else None,
            density_label=new_req.density.label if new_req.density else None,
            color_label=new_req.color.label if new_req.color else None,
            creator_name=new_req.created_by.full_name if new_req.created_by else None,
            processor_name=new_req.processed_by.full_name if new_req.processed_by else None
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR creating block request: {str(e)}")
        db.rollback()
        # Return 400 instead of 500 to show message in UI
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
        joinedload(BlockRequest.created_by),
        joinedload(BlockRequest.processed_by)
    )

    # Role Logic
    is_supply = current_user.has_permission("manage_production_supply") or current_user.role == "super_admin"
    is_order = current_user.has_permission("create_production_orders")
    
    # Filter by status alias
    if status == 'active':
        query = query.filter(BlockRequest.status.in_(['pending', 'processing']))
    elif status == 'history':
        query = query.filter(BlockRequest.status.in_(['delivered', 'completed', 'cancelled']))
        query = query.order_by(BlockRequest.created_at.desc())
    elif status:
        query = query.filter(BlockRequest.status == status)

    # Restrict Order User
    if is_order and not is_supply:
        query = query.filter(BlockRequest.created_by_id == current_user.id)
        
    query = query.order_by(BlockRequest.created_at.asc())
    
    results = query.limit(limit).all()
    
    # Manually map to Pydantic Response to avoid 500 Error
    response_list = []
    for req in results:
        response_list.append(BlockRequestResponse(
            id=req.id,
            request_type=req.request_type,
            material_id=req.material_id,
            density_id=req.density_id,
            color_id=req.color_id,
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
