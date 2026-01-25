"""
Bonuses Router - Monthly Bonus Management
Handles bonus registration, auto-population from positive events, and PDF export.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, extract
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import io

from database import get_db, Employee, EmployeeEvent, EventType, User
from models.hr import Bonus
from security import get_current_user

router = APIRouter(prefix="/bonuses", tags=["Bonuses"])


# --- SCHEMAS ---

class BonusCreate(BaseModel):
    employee_id: int
    event_id: Optional[int] = None  # NULL = manual entry
    amount: float
    description: Optional[str] = None
    month: int
    year: int

class BonusResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    event_id: Optional[int] = None
    event_description: Optional[str] = None
    event_notes: Optional[str] = None
    event_requester: Optional[str] = None
    event_date: Optional[str] = None
    amount: float
    description: Optional[str] = None
    month: int
    year: int
    created_by_name: Optional[str] = None
    created_at: str

class PositiveEventResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    event_type: str
    points: int
    event_date: str
    created_by_name: str
    already_has_bonus: bool


# --- ENDPOINTS ---

@router.get("", response_model=List[BonusResponse], summary="Lista bonus per mese/anno")
async def list_bonuses(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni lista bonus per un mese/anno specifico."""
    
    # Access Control: Only super_admin for now
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    bonuses = db.query(Bonus).options(
        joinedload(Bonus.employee),
        joinedload(Bonus.event),
        joinedload(Bonus.creator)
    ).filter(
        Bonus.month == month,
        Bonus.year == year
    ).order_by(Bonus.created_at.desc()).all()
    
    results = []
    for b in bonuses:
        emp_name = f"{b.employee.last_name} {b.employee.first_name}" if b.employee else "N/D"
        
        event_desc = None
        event_notes = None
        event_req = None
        event_date = None
        if b.event:
            event_desc = b.event.event_label or b.event.event_type
            event_notes = b.event.description
            event_req = b.event.creator.full_name if b.event.creator else "N/D"
            event_date = b.event.event_date.strftime("%d/%m/%Y") if b.event.event_date else None
        
        results.append(BonusResponse(
            id=b.id,
            employee_id=b.employee_id,
            employee_name=emp_name,
            event_id=b.event_id,
            event_description=event_desc,
            event_notes=event_notes,
            event_requester=event_req,
            event_date=event_date,
            amount=b.amount,
            description=b.description,
            month=b.month,
            year=b.year,
            created_by_name=b.creator.full_name if b.creator else None,
            created_at=b.created_at.strftime("%d/%m/%Y %H:%M") if b.created_at else ""
        ))
    
    return results


@router.get("/positive-events", response_model=List[PositiveEventResponse], summary="Eventi positivi del mese")
async def get_positive_events(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni eventi positivi (punti > 0) del mese per auto-popolazione."""
    
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Query positive events in the month
    events = db.query(EmployeeEvent).options(
        joinedload(EmployeeEvent.employee),
        joinedload(EmployeeEvent.creator)
    ).filter(
        EmployeeEvent.points > 0,
        extract('month', EmployeeEvent.event_date) == month,
        extract('year', EmployeeEvent.event_date) == year
    ).order_by(EmployeeEvent.event_date.desc()).all()
    
    # Check which events already have bonuses
    event_ids = [e.id for e in events]
    existing_bonuses = db.query(Bonus.event_id).filter(
        Bonus.event_id.in_(event_ids)
    ).all()
    bonused_event_ids = {b.event_id for b in existing_bonuses}
    
    results = []
    for ev in events:
        emp_name = f"{ev.employee.last_name} {ev.employee.first_name}" if ev.employee else "N/D"
        ev_type = ev.event_label or ev.event_type
        creator_name = ev.creator.full_name if ev.creator else "N/D"
        
        results.append(PositiveEventResponse(
            id=ev.id,
            employee_id=ev.employee_id,
            employee_name=emp_name,
            event_type=ev_type,
            points=ev.points,
            event_date=ev.event_date.strftime("%d/%m/%Y") if ev.event_date else "",
            created_by_name=creator_name,
            already_has_bonus=ev.id in bonused_event_ids
        ))
    
    return results


@router.post("", response_model=BonusResponse, summary="Crea bonus")
async def create_bonus(
    data: BonusCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un nuovo bonus (manuale o da evento)."""
    
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Validate employee
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Validate event if provided
    event = None
    if data.event_id:
        event = db.query(EmployeeEvent).filter(EmployeeEvent.id == data.event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Evento non trovato")
        
        # Check if bonus already exists for this event
        existing = db.query(Bonus).filter(Bonus.event_id == data.event_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bonus già assegnato per questo evento")
    
    bonus = Bonus(
        employee_id=data.employee_id,
        event_id=data.event_id,
        amount=data.amount,
        description=data.description,
        month=data.month,
        year=data.year,
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    db.add(bonus)
    db.commit()
    db.refresh(bonus)
    
    # Build response
    emp_name = f"{emp.last_name} {emp.first_name}"
    
    event_desc = None
    event_notes = None
    event_req = None
    event_date = None
    if event:
        event_desc = event.event_label or event.event_type
        event_notes = event.description
        event_req = event.creator.full_name if event.creator else "N/D"
        event_date = event.event_date.strftime("%d/%m/%Y") if event.event_date else None
    
    return BonusResponse(
        id=bonus.id,
        employee_id=bonus.employee_id,
        employee_name=emp_name,
        event_id=bonus.event_id,
        event_description=event_desc,
        event_notes=event_notes,
        event_requester=event_req,
        event_date=event_date,
        amount=bonus.amount,
        description=bonus.description,
        month=bonus.month,
        year=bonus.year,
        created_by_name=current_user.full_name,
        created_at=bonus.created_at.strftime("%d/%m/%Y %H:%M")
    )


@router.delete("/{bonus_id}", summary="Elimina bonus")
async def delete_bonus(
    bonus_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina un bonus."""
    
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    bonus = db.query(Bonus).filter(Bonus.id == bonus_id).first()
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus non trovato")
    
    db.delete(bonus)
    db.commit()
    
    return {"message": "Bonus eliminato"}


class BonusUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None


@router.patch("/{bonus_id}", summary="Modifica bonus")
async def update_bonus(
    bonus_id: int,
    data: BonusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifica importo e/o descrizione di un bonus."""
    
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    bonus = db.query(Bonus).filter(Bonus.id == bonus_id).first()
    if not bonus:
        raise HTTPException(status_code=404, detail="Bonus non trovato")
    
    if data.amount is not None:
        bonus.amount = data.amount
    if data.description is not None:
        bonus.description = data.description
    
    db.commit()
    
    return {"message": "Bonus aggiornato"}


@router.get("/summary", summary="Riepilogo budget mensile")
async def get_monthly_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni riepilogo totale bonus del mese."""
    
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    from sqlalchemy import func
    
    result = db.query(
        func.count(Bonus.id).label('count'),
        func.sum(Bonus.amount).label('total')
    ).filter(
        Bonus.month == month,
        Bonus.year == year
    ).first()
    
    return {
        "month": month,
        "year": year,
        "bonus_count": result.count or 0,
        "total_amount": result.total or 0.0
    }


@router.get("/export/pdf", summary="Esporta PDF bonus mensili")
async def export_bonuses_pdf(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Genera PDF del riepilogo bonus mensile."""
    
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import Table, TableStyle, Paragraph
    
    # Get bonuses for the month
    bonuses = db.query(Bonus).options(
        joinedload(Bonus.employee),
        joinedload(Bonus.event),
        joinedload(Bonus.creator)
    ).filter(
        Bonus.month == month,
        Bonus.year == year
    ).order_by(Bonus.employee_id).all()
    
    # Calculate total
    total_amount = sum(b.amount for b in bonuses)
    
    # Create PDF
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Styles for wrapping text
    styles = getSampleStyleSheet()
    style_normal = styles["BodyText"]
    style_normal.fontSize = 8
    style_normal.leading = 10
    
    style_bold = ParagraphStyle(
        'BoldStyle',
        parent=style_normal,
        fontName='Helvetica-Bold',
        fontSize=9
    )
    
    style_notes = ParagraphStyle(
        'NotesStyle',
        parent=style_normal,
        fontSize=7,
        leftIndent=2*mm,
        textColor=colors.grey
    )
    
    # Month names in Italian
    months = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
              "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    
    # Header
    c.setFillColor(colors.Color(15/255, 23/255, 42/255))  # Slate 900
    c.rect(0, height - 25*mm, width, 25*mm, fill=1, stroke=0)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(15*mm, height - 17*mm, "REGISTRO BONUS MENSILE")
    
    c.setFont("Helvetica", 12)
    c.drawRightString(width - 15*mm, height - 17*mm, f"{months[month]} {year}")
    
    # Summary Box
    c.setFillColor(colors.Color(234/255, 179/255, 8/255))  # Yellow 500
    c.roundRect(15*mm, height - 50*mm, width - 30*mm, 18*mm, 3*mm, fill=1, stroke=0)
    
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20*mm, height - 40*mm, f"TOTALE BONUS: € {total_amount:,.2f}")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 20*mm, height - 40*mm, f"{len(bonuses)} dipendenti premiati")
    
    # Table
    if bonuses:
        data = [["V", "Dipendente", "Evento/Motivo", "Richiesto Da", "Data", "Importo €"]]
        
        for b in bonuses:
            emp_name = f"{b.employee.last_name} {b.employee.first_name}" if b.employee else "N/D"
            
            # Complex description logic
            primary_desc = b.description or "-"
            notes_desc = ""
            
            if b.event:
                primary_desc = b.event.event_label or b.event.event_type or primary_desc
                notes_desc = b.event.description or ""
            
            # Check if b.description is different and worth showing
            extra_msg = ""
            if b.description and b.event and b.description != (b.event.event_label or b.event.event_type):
                extra_msg = f"<br/><font color='orange' size='7'>Note Bonus: {b.description}</font>"
            
            # Formatting as a list of Paragraph objects for the cell
            desc_para = Paragraph(
                f"<b>{primary_desc}</b>" + 
                (f"<br/><i>{notes_desc}</i>" if notes_desc else "") +
                extra_msg,
                style_normal
            )
            
            event_req = "-"
            event_date = "-"
            if b.event:
                event_req = b.event.creator.full_name if b.event.creator else "N/D"
                event_date = b.event.event_date.strftime("%d/%m") if b.event.event_date else "-"
            
            data.append([
                "[  ]", # Checkbox
                emp_name,
                desc_para,
                event_req,
                event_date,
                f"€ {b.amount:,.2f}"
            ])
        
        # Col widths: Check(8), Name(38), Desc(70), Req(25), Date(17), Amount(22) = 180mm
        col_widths = [8*mm, 38*mm, 70*mm, 25*mm, 17*mm, 22*mm]
        
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(30/255, 41/255, 59/255)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'), # Center checkbox
            ('ALIGN', (1, 0), (-2, -1), 'LEFT'),
            ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(241/255, 245/255, 249/255)]),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        # Wrapping logic for multiple pages if needed is handled by platypus.Frame usually
        # but here we follow the existing pattern using drawOn if it fits.
        # However, many bonuses might overflow.
        
        w, h = t.wrap(width - 30*mm, height)
        t.drawOn(c, 15*mm, height - 60*mm - h)
    else:
        c.setFillColor(colors.grey)
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 80*mm, "Nessun bonus registrato per questo mese.")
    
    # Footer
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.grey)
    c.drawCentredString(width/2, 10*mm, f"Generato il {datetime.now().strftime('%d/%m/%Y %H:%M')} - SL Enterprise")
    
    c.save()
    buffer.seek(0)
    
    filename = f"Bonus_{months[month]}_{year}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
