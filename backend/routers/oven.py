"""
Il Forno — Router per tracciamento materiali nel forno industriale.
Gestisce inserimento, rimozione, storico e alert stagnazione.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models.core import User
from models.production import OvenItem, OVEN_MAX_MINUTES
from routers.auth import get_current_user

router = APIRouter(prefix="/oven", tags=["Oven - Il Forno"])


# ── Schemas ──

class OvenItemCreate(BaseModel):
    item_type: str  # memory_block, wet_mattress, wet_other
    reference: str  # OBBLIGATORIO: riferimento prodotto
    description: Optional[str] = None
    quantity: int = 1
    expected_minutes: int = OVEN_MAX_MINUTES
    notes: Optional[str] = None


class OvenItemResponse(BaseModel):
    id: int
    item_type: str
    reference: str
    description: Optional[str]
    quantity: int
    operator_id: int
    operator_name: Optional[str] = None
    inserted_at: datetime
    expected_minutes: int
    removed_at: Optional[datetime] = None
    removed_by: Optional[int] = None
    remover_name: Optional[str] = None
    status: str
    notes: Optional[str] = None
    elapsed_minutes: Optional[int] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True


def serialize_item(item: OvenItem) -> dict:
    """Serializza un OvenItem con info calcolate."""
    now = datetime.utcnow()
    elapsed = int((now - item.inserted_at).total_seconds() / 60) if item.inserted_at else 0
    if item.removed_at:
        elapsed = int((item.removed_at - item.inserted_at).total_seconds() / 60)

    is_overdue = item.status == "in_oven" and elapsed > item.expected_minutes

    return {
        "id": item.id,
        "item_type": item.item_type,
        "reference": item.reference,
        "description": item.description,
        "quantity": item.quantity,
        "operator_id": item.operator_id,
        "operator_name": item.operator.full_name or item.operator.username if item.operator else None,
        "inserted_at": item.inserted_at.isoformat() if item.inserted_at else None,
        "expected_minutes": item.expected_minutes,
        "removed_at": item.removed_at.isoformat() if item.removed_at else None,
        "removed_by": item.removed_by,
        "remover_name": item.remover.full_name or item.remover.username if item.remover else None,
        "status": "overdue" if is_overdue else item.status,
        "notes": item.notes,
        "elapsed_minutes": elapsed,
        "is_overdue": is_overdue,
    }


# ── Endpoints ──

@router.post("/items", summary="Inserisci nel Forno")
async def insert_item(
    data: OvenItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Inserisce un nuovo materiale nel forno."""
    if not data.reference or not data.reference.strip():
        raise HTTPException(400, "Il riferimento prodotto è obbligatorio.")

    if data.item_type not in ("memory_block", "wet_mattress", "wet_other"):
        raise HTTPException(400, "Tipo non valido. Usa: memory_block, wet_mattress, wet_other.")

    # Limita durata massima
    minutes = min(data.expected_minutes, OVEN_MAX_MINUTES)

    item = OvenItem(
        item_type=data.item_type,
        reference=data.reference.strip(),
        description=data.description.strip() if data.description else None,
        quantity=max(1, data.quantity),
        operator_id=current_user.id,
        expected_minutes=minutes,
        notes=data.notes,
        status="in_oven",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_item(item)


@router.get("/items", summary="Items nel Forno")
async def get_active_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista items attualmente nel forno."""
    items = db.query(OvenItem).filter(
        OvenItem.status == "in_oven"
    ).order_by(OvenItem.inserted_at.asc()).all()

    return [serialize_item(i) for i in items]


@router.get("/items/history", summary="Storico Forno")
async def get_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Storico items rimossi dal forno."""
    items = db.query(OvenItem).filter(
        OvenItem.status == "removed"
    ).order_by(OvenItem.removed_at.desc()).limit(limit).all()

    return [serialize_item(i) for i in items]


@router.put("/items/{item_id}/remove", summary="Rimuovi dal Forno")
async def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Segna un item come rimosso dal forno."""
    item = db.query(OvenItem).filter(OvenItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item non trovato.")
    if item.status == "removed":
        raise HTTPException(400, "Item già rimosso.")

    item.status = "removed"
    item.removed_at = datetime.utcnow()
    item.removed_by = current_user.id
    db.commit()
    db.refresh(item)
    return serialize_item(item)


@router.get("/stats", summary="Statistiche Forno")
async def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Conteggio rapido items nel forno e alert."""
    active = db.query(OvenItem).filter(OvenItem.status == "in_oven").all()
    now = datetime.utcnow()

    overdue_count = 0
    for item in active:
        elapsed = int((now - item.inserted_at).total_seconds() / 60)
        if elapsed > item.expected_minutes:
            overdue_count += 1

    return {
        "total_in_oven": len(active),
        "overdue_count": overdue_count,
        "max_minutes": OVEN_MAX_MINUTES,
    }
