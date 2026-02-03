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
    notes: Optional[str] = None  # Event description/notes


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
            already_has_bonus=ev.id in bonused_event_ids,
            notes=ev.description  # Include event notes/description
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
    """Genera PDF del riepilogo bonus mensile con supporto multi-pagina."""
    
    if current_user.role != 'super_admin':
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    
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
    
    # Month names in Italian
    months_names = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
              "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    
    # Create PDF with SimpleDocTemplate for automatic pagination
    buffer = io.BytesIO()
    width, height = A4
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=55*mm,  # Leave space for header
        bottomMargin=20*mm,  # Leave space for footer
        leftMargin=15*mm,
        rightMargin=15*mm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    style_normal = ParagraphStyle(
        'CustomNormal',
        parent=styles["BodyText"],
        fontSize=8,
        leading=10
    )
    
    style_header = ParagraphStyle(
        'HeaderStyle',
        parent=styles["Heading1"],
        fontSize=18,
        textColor=colors.white,
        alignment=TA_CENTER
    )
    
    style_summary = ParagraphStyle(
        'SummaryStyle',
        parent=styles["BodyText"],
        fontSize=14,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    )
    
    # Build story (content list)
    story = []
    
    # Summary section (will appear on first page after header)
    summary_data = [[
        Paragraph(f"<b>TOTALE BONUS: € {total_amount:,.2f}</b>", style_summary),
        Paragraph(f"{len(bonuses)} dipendenti premiati", style_normal)
    ]]
    summary_table = Table(summary_data, colWidths=[(width-30*mm)/2, (width-30*mm)/2])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.Color(234/255, 179/255, 8/255)),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('BOX', (0, 0), (-1, -1), 0, colors.transparent),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10*mm))
    
    # Main table
    if bonuses:
        data = [["V", "Dipendente", "Evento/Motivo", "Richiesto Da", "Data", "Importo €"]]
        
        # Group bonuses by employee for better organization
        from collections import defaultdict
        employee_bonuses = defaultdict(list)
        for b in bonuses:
            emp_name = f"{b.employee.last_name} {b.employee.first_name}" if b.employee else "N/D"
            employee_bonuses[emp_name].append(b)
        
        # Sort employees alphabetically
        sorted_employees = sorted(employee_bonuses.keys())
        
        # Track row indices for subtotal styling
        subtotal_rows = []
        row_idx = 1  # Start after header
        
        for emp_name in sorted_employees:
            emp_bonus_list = employee_bonuses[emp_name]
            emp_total = sum(b.amount for b in emp_bonus_list)
            
            for i, b in enumerate(emp_bonus_list):
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
                
                # Formatting as Paragraph for text wrapping
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
                
                # Show employee name only on first row of group
                display_name = emp_name if i == 0 else ""
                
                data.append([
                    "[  ]",  # Checkbox
                    display_name,
                    desc_para,
                    event_req,
                    event_date,
                    f"€ {b.amount:,.2f}"
                ])
                row_idx += 1
            
            # Add subtotal row if employee has multiple bonuses
            if len(emp_bonus_list) > 1:
                data.append([
                    "",
                    "",
                    Paragraph(f"<b>Subtotale {emp_name.split()[0]}:</b>", style_normal),
                    "",
                    "",
                    f"€ {emp_total:,.2f}"
                ])
                subtotal_rows.append(row_idx)
                row_idx += 1
        
        # Col widths optimized for A4 landscape: total ~180mm available
        # Check(6), Name(40), Desc(65), Req(28), Date(16), Amount(25) = 180mm
        col_widths = [6*mm, 40*mm, 65*mm, 28*mm, 16*mm, 25*mm]
        
        t = Table(data, colWidths=col_widths, repeatRows=1)  # repeatRows=1 repeats header on each page
        
        # Base table style
        table_style = [
            # Header styling
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(30/255, 41/255, 59/255)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            # Alignment
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),   # Checkbox centered
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),     # Name left
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),     # Description left
            ('ALIGN', (3, 0), (3, -1), 'LEFT'),     # Requester left
            ('ALIGN', (4, 0), (4, -1), 'CENTER'),   # Date centered
            ('ALIGN', (5, 0), (5, -1), 'RIGHT'),    # Amount right
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),    # Top align for multi-line cells
            # Borders and spacing
            ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(200/255, 200/255, 200/255)),
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.Color(30/255, 41/255, 59/255)),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(248/255, 250/255, 252/255)]),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]
        
        # Add special styling for subtotal rows (light yellow background)
        for row_num in subtotal_rows:
            table_style.append(('BACKGROUND', (0, row_num), (-1, row_num), colors.Color(254/255, 249/255, 195/255)))
            table_style.append(('FONTNAME', (2, row_num), (5, row_num), 'Helvetica-Bold'))
            table_style.append(('LINEABOVE', (0, row_num), (-1, row_num), 0.5, colors.Color(234/255, 179/255, 8/255)))
        
        t.setStyle(TableStyle(table_style))
        
        story.append(t)
        
        # Footer totals row (separate table after main table)
        story.append(Spacer(1, 3*mm))
        totals_data = [[
            "",
            "",
            "",
            "",
            Paragraph("<b>TOTALE:</b>", style_normal),
            Paragraph(f"<b>€ {total_amount:,.2f}</b>", style_normal)
        ]]
        totals_table = Table(totals_data, colWidths=col_widths)
        totals_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.Color(234/255, 179/255, 8/255, 0.3)),
            ('ALIGN', (-2, 0), (-1, 0), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(totals_table)
    else:
        no_data_style = ParagraphStyle(
            'NoData',
            parent=styles["BodyText"],
            fontSize=12,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        story.append(Spacer(1, 20*mm))
        story.append(Paragraph("Nessun bonus registrato per questo mese.", no_data_style))
    
    # Custom header/footer drawer
    def draw_header_footer(canvas, doc):
        canvas.saveState()
        
        # Header background
        canvas.setFillColor(colors.Color(15/255, 23/255, 42/255))  # Slate 900
        canvas.rect(0, height - 25*mm, width, 25*mm, fill=1, stroke=0)
        
        # Header text
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 18)
        canvas.drawString(15*mm, height - 17*mm, "REGISTRO BONUS MENSILE")
        
        canvas.setFont("Helvetica", 12)
        canvas.drawRightString(width - 15*mm, height - 17*mm, f"{months_names[month]} {year}")
        
        # Footer
        canvas.setFont("Helvetica-Oblique", 8)
        canvas.setFillColor(colors.grey)
        canvas.drawCentredString(width/2, 10*mm, f"Generato il {datetime.now().strftime('%d/%m/%Y %H:%M')} - SL Enterprise - Pag. {doc.page}")
        
        canvas.restoreState()
    
    # Build PDF with automatic pagination
    doc.build(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    
    buffer.seek(0)
    filename = f"Bonus_{months_names[month]}_{year}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
