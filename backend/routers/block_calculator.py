"""
Block Calculator Router
API endpoints for block height management and recovery rules.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models.production import BlockHeight, RecoveryRule, ProductionMaterial
from security import get_current_user
from models.core import User

router = APIRouter(prefix="/calculator", tags=["Block Calculator"])


# ============================================================
# SCHEMAS
# ============================================================

class BlockHeightCreate(BaseModel):
    material_category: str  # 'sponge' or 'memory'
    material_id: Optional[int] = None
    height_cm: float

class BlockHeightResponse(BaseModel):
    id: int
    material_category: str
    material_id: Optional[int]
    material_label: Optional[str]
    height_cm: float
    usage_count: int
    
    class Config:
        from_attributes = True

class RecoveryRuleCreate(BaseModel):
    material_category: str
    material_id: Optional[int] = None
    thickness_cm: float
    product_type: str
    notes: Optional[str] = None
    display_order: int = 0

class RecoveryRuleUpdate(BaseModel):
    thickness_cm: Optional[float] = None
    product_type: Optional[str] = None
    notes: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class RecoveryRuleResponse(BaseModel):
    id: int
    material_category: str
    material_id: Optional[int]
    material_label: Optional[str]
    thickness_cm: float
    product_type: str
    notes: Optional[str]
    is_active: bool
    display_order: int
    
    class Config:
        from_attributes = True


# ============================================================
# BLOCK HEIGHTS ENDPOINTS
# ============================================================

@router.get("/heights", response_model=List[BlockHeightResponse])
async def get_block_heights(
    category: Optional[str] = None,
    material_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get saved block heights, ordered by usage count."""
    query = db.query(BlockHeight)
    
    if category:
        query = query.filter(BlockHeight.material_category == category)
    if material_id:
        query = query.filter(BlockHeight.material_id == material_id)
    
    # Order by most used first
    query = query.order_by(BlockHeight.usage_count.desc(), BlockHeight.height_cm)
    
    return query.all()


@router.post("/heights", response_model=BlockHeightResponse)
async def save_block_height(
    data: BlockHeightCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save a new block height or increment usage if exists."""
    # Check if this exact height already exists
    existing = db.query(BlockHeight).filter(
        BlockHeight.material_category == data.material_category,
        BlockHeight.material_id == data.material_id,
        BlockHeight.height_cm == data.height_cm
    ).first()
    
    if existing:
        # Increment usage count
        existing.usage_count += 1
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new
    new_height = BlockHeight(
        material_category=data.material_category,
        material_id=data.material_id,
        height_cm=data.height_cm,
        usage_count=1,
        created_by_id=current_user.id
    )
    db.add(new_height)
    db.commit()
    db.refresh(new_height)
    return new_height


@router.delete("/heights/{height_id}")
async def delete_block_height(
    height_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a block height (admin only or creator)."""
    height = db.query(BlockHeight).filter(BlockHeight.id == height_id).first()
    if not height:
        raise HTTPException(404, "Altezza non trovata")
    
    # Allow deletion if admin or creator
    if height.created_by_id != current_user.id and current_user.role != "super_admin":
        raise HTTPException(403, "Non autorizzato")
    
    db.delete(height)
    db.commit()
    return {"message": "Altezza eliminata"}


# ============================================================
# RECOVERY RULES ENDPOINTS
# ============================================================

@router.get("/recoveries", response_model=List[RecoveryRuleResponse])
async def get_recovery_rules(
    category: Optional[str] = None,
    material_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recovery rules for a material category."""
    query = db.query(RecoveryRule).filter(RecoveryRule.is_active == True)
    
    if category:
        query = query.filter(RecoveryRule.material_category == category)
    if material_id:
        query = query.filter(
            (RecoveryRule.material_id == material_id) | 
            (RecoveryRule.material_id == None)  # Include generic rules
        )
    
    query = query.order_by(RecoveryRule.display_order, RecoveryRule.thickness_cm)
    
    return query.all()


@router.post("/recoveries", response_model=RecoveryRuleResponse)
async def create_recovery_rule(
    data: RecoveryRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new recovery rule."""
    new_rule = RecoveryRule(
        material_category=data.material_category,
        material_id=data.material_id,
        thickness_cm=data.thickness_cm,
        product_type=data.product_type,
        notes=data.notes,
        display_order=data.display_order
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule


@router.patch("/recoveries/{rule_id}", response_model=RecoveryRuleResponse)
async def update_recovery_rule(
    rule_id: int,
    data: RecoveryRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a recovery rule."""
    rule = db.query(RecoveryRule).filter(RecoveryRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "Regola non trovata")
    
    if data.thickness_cm is not None:
        rule.thickness_cm = data.thickness_cm
    if data.product_type is not None:
        rule.product_type = data.product_type
    if data.notes is not None:
        rule.notes = data.notes
    if data.display_order is not None:
        rule.display_order = data.display_order
    if data.is_active is not None:
        rule.is_active = data.is_active
    
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/recoveries/{rule_id}")
async def delete_recovery_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a recovery rule."""
    rule = db.query(RecoveryRule).filter(RecoveryRule.id == rule_id).first()
    if not rule:
        raise HTTPException(404, "Regola non trovata")
    
    db.delete(rule)
    db.commit()
    return {"message": "Regola eliminata"}


# ============================================================
# UTILITY ENDPOINTS
# ============================================================

@router.get("/materials")
async def get_calculator_materials(
    category: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get materials for calculator dropdown."""
    materials = db.query(ProductionMaterial).filter(
        ProductionMaterial.category == category,
        ProductionMaterial.is_active == True
    ).order_by(ProductionMaterial.display_order).all()
    
    return [{"id": m.id, "label": m.label, "value": m.value} for m in materials]


@router.post("/calculate")
async def calculate_blocks(
    material_category: str,
    sheet_thickness: float,
    quantity: int,
    block_height: float,
    current_user: User = Depends(get_current_user)
):
    """
    Pure calculation endpoint (no DB side effects).
    Returns: blocks needed, sheets per block, remainder per block.
    """
    if sheet_thickness <= 0 or block_height <= 0 or quantity <= 0:
        raise HTTPException(400, "Valori non validi")
    
    # Calculate sheets per block (floor)
    sheets_per_block = int(block_height // sheet_thickness)
    
    if sheets_per_block == 0:
        raise HTTPException(400, "Altezza blocco insufficiente per questo spessore")
    
    # Calculate blocks needed (ceil)
    import math
    blocks_needed = math.ceil(quantity / sheets_per_block)
    
    # Calculate remainder per block
    remainder_per_block = round(block_height - (sheets_per_block * sheet_thickness), 2)
    
    # Calculate total sheets from all blocks
    total_sheets = sheets_per_block * blocks_needed
    
    # Extra sheets (beyond order)
    extra_sheets = total_sheets - quantity
    
    return {
        "blocks_needed": blocks_needed,
        "sheets_per_block": sheets_per_block,
        "remainder_per_block": remainder_per_block,
        "total_sheets": total_sheets,
        "extra_sheets": extra_sheets,
        "input": {
            "sheet_thickness": sheet_thickness,
            "quantity": quantity,
            "block_height": block_height
        }
    }


# ============================================================
# SEED RECOVERY RULES (Admin only)
# ============================================================

@router.post("/seed-recoveries")
async def seed_recovery_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Popola le regole di recupero dalla tabella ufficiale.
    Solo admin può eseguire questa operazione.
    """
    if current_user.role != "super_admin":
        raise HTTPException(403, "Solo admin può eseguire questa operazione")
    
    # Check if already populated
    existing_count = db.query(RecoveryRule).count()
    if existing_count > 0:
        return {"message": f"Regole già presenti ({existing_count}). Usa DELETE prima se vuoi rigenerare."}
    
    # ============================================================
    # REGOLE SPUGNA - SPECIFICHE PER DENSITÀ/COLORE
    # Format: (category, thickness, product, notes, material_label)
    # ============================================================
    sponge_rules = [
        # D23/30 NERO
        ("sponge", 1.5, "Fogli", None, "D23/30 Nero"),
        # D23 Celeste/Stock
        ("sponge", 1.5, "Fogli", None, "D23 Celeste"),
        ("sponge", 3, "Fogli", None, "D23 Celeste"),
        # D25/D30 Verde
        ("sponge", 1.5, "Fogli", None, "D25/D30 Verde"),
        # D25 Giallo
        ("sponge", 1.5, "Fogli", None, "D25 Giallo"),
        # D25 Bianco
        ("sponge", 3, "Ondina 7 zone", "3cm molle", "D25 Bianco"),
        ("sponge", 3, "Fogli", None, "D25 Bianco"),
        # D25 Grigio
        ("sponge", 3, "Fogli", None, "D25 Grigio"),
        ("sponge", 4, "Fogli", None, "D25 Grigio"),
        ("sponge", 7, "Longheroni Bonnel", "Sempre H14 x64/144/188", "D25 Grigio"),
        ("sponge", 9, "Longheroni Insacchettati", "Sempre H14 x63/143/193/203", "D25 Grigio"),
        ("sponge", 10, "Longheroni Insacchettati", "Sempre H14 x63/143/193/203", "D25 Grigio"),
        ("sponge", 14, "Longheroni Insacchettati", "Sempre H14 x63/143/193/203", "D25 Grigio"),
        # D30 Rosa
        ("sponge", 3, "Fogli", None, "D30 Rosa"),
        ("sponge", 4, "Fogli", None, "D30 Rosa"),
        ("sponge", 10, "Longheroni", "Sempre H14 x63/143/193/203", "D30 Rosa"),
        ("sponge", 14, "Longheroni", "Sempre H14 x63/143/193/203", "D30 Rosa"),
        # D25/35 Rosso
        ("sponge", 1.5, "Fogli", None, "D25/35 Rosso"),
        ("sponge", 4, "Bugnato 11 zone", "Spaccare 6", "D25/35 Rosso"),
        # D35 Verde
        ("sponge", 1.5, "Fogli", None, "D35 Verde"),
    ]
    
    # ============================================================
    # REGOLE MEMORY - SPECIFICHE PER TIPO
    # Format: (category, thickness, product, notes, material_label)
    # ============================================================
    memory_rules = [
        # VISCOFLEX BLU NEM40
        ("memory", 4, "Bugnato 11 zone", "Spaccare 7.4", "Viscoflex Blu NEM40"),
        ("memory", 4.5, "Ondina 7 zone", None, "Viscoflex Blu NEM40"),
        ("memory", 4.8, "Liscio per Topper", None, "Viscoflex Blu NEM40"),
        ("memory", 4.5, "Bugnato std", "Spaccare 7.4", "Viscoflex Blu NEM40"),
        # VISCOFLEX/SOFT BIANCO
        ("memory", 2.5, "Liscio", None, "Viscoflex/Soft Bianco"),
        ("memory", 3, "Liscio", None, "Viscoflex/Soft Bianco"),
        ("memory", 4.5, "Liscio", None, "Viscoflex/Soft Bianco"),
        # ALOE
        ("memory", 4.5, "Ondina 7 zone", None, "Aloe"),
        # GINSENG
        ("memory", 4.5, "Bugnato std", "Spaccare 7.4", "Ginseng"),
        # Soya
        ("memory", 4.5, "Bugnato std", "Spaccare 7.4", "Soya"),
        # CERAMIC VIOLA
        ("memory", 4, "Bugnato 11 zone", "Spaccare 6", "Ceramic Viola"),
        # VITAMINIC
        ("memory", 4.5, "Ondina 7 zone", None, "Vitaminic"),
        ("memory", 4.5, "Bugnato std", "Spaccare 7.4", "Vitaminic"),
        # AirSense
        ("memory", 4.5, "Ondina 7 zone", None, "AirSense"),
        # EM40R BIANCO
        ("memory", 2.5, "Liscio", None, "EM40R Bianco"),
        ("memory", 4.5, "Ondina 7 zone", "Ergopure", "EM40R Bianco"),
        ("memory", 5.5, "New Aquaform", None, "EM40R Bianco"),
        # YLANG
        ("memory", 4.5, "Ondina 7 zone", None, "Ylang"),
        # X-Form
        ("memory", 4.5, "Ondina 7 zone", None, "X-Form"),
    ]
    
    added = 0
    
    # Add sponge rules
    for cat, thickness, product, notes, mat_label in sponge_rules:
        rule = RecoveryRule(
            material_category=cat,
            material_id=None,
            material_label=mat_label,  # Specific material type
            thickness_cm=thickness,
            product_type=product,
            notes=notes,
            is_active=True,
            display_order=0
        )
        db.add(rule)
        added += 1
    
    # Add memory rules
    for cat, thickness, product, notes, mat_label in memory_rules:
        rule = RecoveryRule(
            material_category=cat,
            material_id=None,
            material_label=mat_label,  # Specific material type
            thickness_cm=thickness,
            product_type=product,
            notes=notes,
            is_active=True,
            display_order=0
        )
        db.add(rule)
        added += 1
    
    db.commit()
    
    return {"message": f"Aggiunte {added} regole di recupero", "count": added}


# ============================================================
# AI-POWERED SUGGESTIONS (Groq)
# ============================================================

@router.post("/ai-suggest")
async def get_ai_recovery_suggestion(
    material_type: str,
    material_name: str,
    remainder_cm: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Usa l'IA (Groq) per suggerire il miglior recupero per la rimanenza.
    """
    import os
    import httpx
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(500, "GROQ_API_KEY non configurata")
    
    # Get available recovery rules for context
    rules = db.query(RecoveryRule).filter(
        RecoveryRule.material_category == material_type,
        RecoveryRule.is_active == True
    ).all()
    
    # Build context for AI
    rules_text = "\n".join([
        f"- {r.thickness_cm}cm → {r.product_type}" + (f" ({r.notes})" if r.notes else "")
        for r in rules
    ])
    
    prompt = f"""Sei un esperto di produzione di materassi in schiuma. 
Materiale: {material_name}
Rimanenza disponibile: {remainder_cm} cm

Regole di recupero disponibili:
{rules_text}

Suggerisci il MIGLIOR modo per utilizzare questa rimanenza di {remainder_cm}cm.
Considera:
1. Priorità ai longheroni (valgono di più)
2. Minimizzare lo scarto
3. Combinazioni multiple se necessario (es: 8cm = 2 pezzi da 4cm)

Rispondi in modo BREVE e PRATICO in italiano, max 2 righe. Inizia con l'azione consigliata."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 150,
                    "temperature": 0.3
                },
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(500, f"Errore Groq: {response.text}")
            
            data = response.json()
            suggestion = data["choices"][0]["message"]["content"].strip()
            
            return {
                "suggestion": suggestion,
                "material": material_name,
                "remainder_cm": remainder_cm
            }
            
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout nella richiesta all'IA")
    except Exception as e:
        raise HTTPException(500, f"Errore IA: {str(e)}")
