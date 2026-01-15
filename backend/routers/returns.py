from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
import uuid
from datetime import datetime

from database import get_db, ReturnTicket, User
from security import get_current_user

router = APIRouter(prefix="/returns", tags=["Modulo Resi"])

UPLOAD_DIR = "uploads/returns"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", summary="Lista Ticket Resi")
async def list_returns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista tutti i ticket di reso."""
    returns = db.query(ReturnTicket).order_by(ReturnTicket.opened_at.desc()).all()
    return returns

@router.post("/", summary="Crea Nuovo Reso")
async def create_return(
    reference_code: str = Form(...),
    customer_name: str = Form(...),
    material_description: Optional[str] = Form(None),
    condition_notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un nuovo ticket di reso (aperto da operatore)."""
    new_ticket = ReturnTicket(
        reference_code=reference_code,
        customer_name=customer_name,
        material_description=material_description,
        condition_notes=condition_notes,
        opened_by=current_user.id,
        status='pending'
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket

@router.patch("/{ticket_id}/verify", summary="Verifica Reso")
async def verify_return(
    ticket_id: int,
    verification_notes: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """L'addetto resi verifica il materiale."""
    ticket = db.query(ReturnTicket).filter(ReturnTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    ticket.verification_notes = verification_notes
    ticket.verified_by = current_user.id
    ticket.verified_at = datetime.utcnow()
    ticket.status = 'verified'
    
    db.commit()
    return ticket

@router.patch("/{ticket_id}/credit-note", summary="Emissione Nota Credito")
async def issue_credit_note(
    ticket_id: int,
    amount: int = Form(...), # in centesimi
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """L'amministrativo emette la nota di credito."""
    ticket = db.query(ReturnTicket).filter(ReturnTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    ticket.credit_note_amount = amount
    ticket.credit_note_issued = True
    ticket.credit_note_by = current_user.id
    ticket.credit_note_at = datetime.utcnow()
    ticket.status = 'credit_note'
    
    db.commit()
    return ticket

@router.post("/{ticket_id}/close", summary="Chiudi Ticket")
async def close_return(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chiude definitivamente il ticket."""
    ticket = db.query(ReturnTicket).filter(ReturnTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    ticket.status = 'closed'
    ticket.closed_at = datetime.utcnow()
    
    db.commit()
    return ticket
