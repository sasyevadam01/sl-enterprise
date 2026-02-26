"""
CheckList Web — Router per il controllo giornaliero clienti coordinatori.
Gestisce CRUD delle righe checklist + esportazione PDF.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import io

from database import get_db
from models.core import User
from models.checklist_web import ChecklistWebEntry
from security import get_current_user


router = APIRouter(prefix="/api/checklist-web", tags=["CheckList Web"])

# ── Lista Clienti Fissa ──
CLIENTI_FISSI = [
    "De Matteo Home",
    "Mentor",
    "Dreamy",
    "Moonflex",
    "Tantra",
    "Crd Consulting",
    "In Materassi",
    "Infamily",
    "FBC Flowing",
    "ETRA MD",
    "Literflex",
    "Materassi Memory EU",
    "Vimavi",
    "Capasso Web",
    "Dama Bed",
    "Sanity Bed",
    "Cometa",
    "Mikey Home",
    "Emozioni D'Arredo",
    "Metys",
    "Clas",
    "Forbed Evolution",
    "Sleepy.EU",
    "Giordano Shop",
    "Vendita Online",
    "Via Durini",
    "Sortino Web",
]


# ── Schemas ──

class ChecklistUpdateRequest(BaseModel):
    checked: Optional[bool] = None
    nota: Optional[str] = None


class InitDayRequest(BaseModel):
    data: date


# ── Helpers ──

def _require_checklist_permission(user: User):
    """Verifica che l'utente abbia il permesso checklist_web."""
    if not user.has_permission("checklist_web"):
        raise HTTPException(403, "Permesso checklist_web richiesto.")


def _serialize_entry(entry: ChecklistWebEntry) -> dict:
    """Serializza una riga della checklist."""
    return {
        "id": entry.id,
        "data": entry.data.isoformat() if entry.data else None,
        "cliente": entry.cliente,
        "checked": bool(entry.checked),
        "nota": entry.nota,
        "account_id": entry.account_id,
        "operator_name": (
            entry.operator.full_name
            if entry.operator and entry.operator.full_name
            else None
        ),
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


# ── Endpoints ──

@router.get("", summary="Checklist per data")
async def get_checklist_by_date(
    data: date = Query(..., alias="date", description="Data nel formato YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ritorna tutte le righe della checklist per una data specifica."""
    _require_checklist_permission(current_user)

    entries = (
        db.query(ChecklistWebEntry)
        .filter(ChecklistWebEntry.data == data)
        .order_by(ChecklistWebEntry.id)
        .all()
    )
    return [_serialize_entry(e) for e in entries]


@router.post("/init", summary="Inizializza giornata")
async def init_day(
    body: InitDayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea le righe per tutti i clienti per la data specificata (se non esistono)."""
    _require_checklist_permission(current_user)

    existing = (
        db.query(ChecklistWebEntry)
        .filter(ChecklistWebEntry.data == body.data)
        .count()
    )
    if existing > 0:
        raise HTTPException(400, f"La giornata {body.data} è già stata inizializzata ({existing} righe).")

    new_entries = []
    for cliente in CLIENTI_FISSI:
        entry = ChecklistWebEntry(
            data=body.data,
            cliente=cliente,
            checked=False,
            nota=None,
            account_id=None,
            updated_at=None,
        )
        db.add(entry)
        new_entries.append(entry)

    db.commit()
    for e in new_entries:
        db.refresh(e)

    return {
        "message": f"Giornata {body.data} inizializzata con {len(new_entries)} clienti.",
        "entries": [_serialize_entry(e) for e in new_entries],
    }


@router.put("/{entry_id}", summary="Aggiorna riga checklist")
async def update_entry(
    entry_id: int,
    body: ChecklistUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggiorna il check e/o la nota di una singola riga."""
    _require_checklist_permission(current_user)

    entry = db.query(ChecklistWebEntry).filter(ChecklistWebEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Riga non trovata.")

    if body.checked is not None:
        entry.checked = body.checked
    if body.nota is not None:
        entry.nota = body.nota.strip() if body.nota.strip() else None

    entry.account_id = current_user.id
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return _serialize_entry(entry)


@router.delete("/{entry_id}/note", summary="Cancella nota")
async def delete_note(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Svuota la nota di una riga specifica."""
    _require_checklist_permission(current_user)

    entry = db.query(ChecklistWebEntry).filter(ChecklistWebEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Riga non trovata.")

    entry.nota = None
    entry.account_id = current_user.id
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return _serialize_entry(entry)


@router.get("/pdf", summary="Esporta PDF checklist")
async def export_pdf(
    data: date = Query(..., alias="date", description="Data nel formato YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera un PDF A4 della checklist per la data specificata."""
    _require_checklist_permission(current_user)

    entries = (
        db.query(ChecklistWebEntry)
        .filter(ChecklistWebEntry.data == data)
        .order_by(ChecklistWebEntry.id)
        .all()
    )

    if not entries:
        raise HTTPException(404, f"Nessuna checklist trovata per il {data}.")

    buffer = _generate_checklist_pdf(data, entries)

    filename = f"checklist_web_{data.isoformat()}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── PDF Generation ──

def _generate_checklist_pdf(target_date: date, entries: list) -> io.BytesIO:
    """Genera PDF A4 portrait con la tabella della checklist."""
    import os
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Table, TableStyle

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4
    margin = 15 * mm
    c.setTitle(f"CheckList Web - {target_date.strftime('%d/%m/%Y')}")

    # Logo
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "logo.png")

    # ── Header ──
    c.setFillColor(colors.Color(15 / 255, 23 / 255, 42 / 255))
    c.rect(0, page_h - 18 * mm, page_w, 18 * mm, stroke=0, fill=1)

    if os.path.exists(logo_path):
        c.drawImage(logo_path, margin, page_h - 15 * mm, width=12 * mm, height=12 * mm, mask="auto", preserveAspectRatio=True)

    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.white)
    c.drawString(margin + 16 * mm, page_h - 12 * mm, "SL ENTERPRISE")

    c.setFont("Helvetica", 10)
    c.drawRightString(page_w - margin, page_h - 12 * mm, f"Data: {target_date.strftime('%d/%m/%Y')}")

    # ── Title ──
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin, page_h - 32 * mm, "CHECKLIST WEB — Controllo Clienti")

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.Color(100 / 255, 116 / 255, 139 / 255))
    checked_count = sum(1 for e in entries if e.checked)
    c.drawString(margin, page_h - 38 * mm, f"Completamento: {checked_count}/{len(entries)} clienti controllati")

    # ── Table ──
    header = ["#", "Cliente", "✓", "Nota", "Operatore", "Ora"]
    table_data = [header]

    for i, entry in enumerate(entries, 1):
        check_symbol = "✓" if entry.checked else "✗"
        operator_name = ""
        if entry.operator and entry.operator.full_name:
            operator_name = entry.operator.full_name
        ora = ""
        if entry.updated_at:
            ora = entry.updated_at.strftime("%H:%M")

        # Renderizza sub-items: [x] → ✓, [ ] → ☐
        nota_display = ""
        if entry.nota:
            lines = entry.nota.split("\n")
            rendered = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("[x] ") or stripped.startswith("[X] "):
                    rendered.append(f"✓ {stripped[4:]}")
                elif stripped.startswith("[ ] "):
                    rendered.append(f"☐ {stripped[4:]}")
                elif stripped:
                    rendered.append(stripped)
            nota_display = "\n".join(rendered)

        table_data.append([
            str(i),
            entry.cliente,
            check_symbol,
            nota_display,
            operator_name,
            ora,
        ])

    # Column widths
    usable_w = page_w - 2 * margin
    col_widths = [
        8 * mm,           # #
        50 * mm,          # Cliente
        10 * mm,          # ✓
        usable_w - 8 * mm - 50 * mm - 10 * mm - 35 * mm - 15 * mm,  # Nota (flex)
        35 * mm,          # Operatore
        15 * mm,          # Ora
    ]

    row_height = 7 * mm
    t = Table(table_data, colWidths=col_widths, rowHeights=row_height)

    # Colors
    color_header_bg = colors.Color(30 / 255, 41 / 255, 59 / 255)
    color_border = colors.Color(203 / 255, 213 / 255, 225 / 255)
    color_even = colors.Color(241 / 255, 245 / 255, 249 / 255)
    color_checked = colors.Color(220 / 255, 252 / 255, 231 / 255)
    color_unchecked = colors.Color(254 / 255, 226 / 255, 226 / 255)

    style_commands = [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), color_header_bg),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),   # #
        ("ALIGN", (2, 0), (2, -1), "CENTER"),    # ✓
        ("ALIGN", (5, 0), (5, -1), "CENTER"),    # Ora
        ("GRID", (0, 0), (-1, -1), 0.5, color_border),
        ("LEFTPADDING", (1, 1), (1, -1), 4),
        ("LEFTPADDING", (3, 1), (3, -1), 4),
    ]

    # Zebra + check coloring
    for i in range(1, len(table_data)):
        entry = entries[i - 1]
        bg = color_even if i % 2 == 0 else colors.white
        style_commands.append(("BACKGROUND", (0, i), (-1, i), bg))
        # Check cell coloring
        check_color = color_checked if entry.checked else color_unchecked
        style_commands.append(("BACKGROUND", (2, i), (2, i), check_color))
        if entry.checked:
            style_commands.append(("TEXTCOLOR", (2, i), (2, i), colors.Color(22 / 255, 163 / 255, 74 / 255)))
        else:
            style_commands.append(("TEXTCOLOR", (2, i), (2, i), colors.Color(220 / 255, 38 / 255, 38 / 255)))

    t.setStyle(TableStyle(style_commands))

    # Draw table
    table_y_top = page_h - 44 * mm
    w, h = t.wrap(usable_w, page_h)
    t.drawOn(c, margin, table_y_top - h)

    # ── Footer ──
    c.setStrokeColor(colors.Color(15 / 255, 23 / 255, 42 / 255))
    c.setLineWidth(0.5)
    c.line(margin, 10 * mm, page_w - margin, 10 * mm)
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.grey)
    c.drawCentredString(page_w / 2, 5 * mm, "Generato da SL ENTERPRISE SOLUTIONS — Documento Riservato")

    c.save()
    buffer.seek(0)
    return buffer
