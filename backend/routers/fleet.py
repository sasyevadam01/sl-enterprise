"""
SL Enterprise - Fleet Router
Gestione parco mezzi e ticket manutenzione.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

IT_TZ = ZoneInfo("Europe/Rome")
from typing import List, Optional
from pydantic import BaseModel
import os
import shutil
import uuid
import os
import json
from datetime import datetime
from io import BytesIO
from PIL import Image
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    print("[WARN] pillow-heif non installato — HEIC non supportato")
from fastapi import Form, Request

class VehicleUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    internal_code: Optional[str] = None
    banchina_id: Optional[int] = None
    assigned_operator: Optional[str] = None
    is_4_0: Optional[bool] = None
    status: Optional[str] = None

from database import get_db, Banchina, FleetVehicle, MaintenanceTicket, User
from security import get_current_user, get_hr_or_admin

router = APIRouter(prefix="/fleet", tags=["Parco Mezzi"])

UPLOAD_DIR = "uploads/tickets"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================================
# BANCHINE
# ============================================================

@router.get("/banchine", summary="Lista Banchine")
async def list_banchine(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lista tutte le banchine."""
    return db.query(Banchina).filter(Banchina.is_active == True).all()


@router.post("/banchine", summary="Crea Banchina")
async def create_banchina(
    code: str,
    name: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Crea nuova banchina."""
    existing = db.query(Banchina).filter(Banchina.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Codice banchina gia esistente")
    
    banchina = Banchina(code=code, name=name)
    db.add(banchina)
    db.commit()
    db.refresh(banchina)
    return banchina


# ============================================================
# VEICOLI
# ============================================================

@router.get("/vehicles", summary="Lista Mezzi")
async def list_vehicles(
    vehicle_type: str = None,
    banchina_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista mezzi con filtri."""
    query = db.query(FleetVehicle).filter(FleetVehicle.is_active == True)
    
    if vehicle_type:
        query = query.filter(FleetVehicle.vehicle_type == vehicle_type)
    if banchina_id:
        query = query.filter(FleetVehicle.banchina_id == banchina_id)
    if status:
        query = query.filter(FleetVehicle.status == status)
    
    return query.all()


@router.post("/vehicles", summary="Aggiungi Mezzo")
async def create_vehicle(
    vehicle_type: str,
    brand: str = None,
    model: str = None,
    internal_code: str = None,
    banchina_id: int = None,
    assigned_operator: str = None,
    is_4_0: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Aggiungi nuovo mezzo al parco."""
    vehicle = FleetVehicle(
        vehicle_type=vehicle_type,
        brand=brand,
        model=model,
        internal_code=internal_code,
        banchina_id=banchina_id,
        assigned_operator=assigned_operator,
        is_4_0=is_4_0
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch("/vehicles/{vehicle_id}/status", summary="Cambia Stato Mezzo")
async def update_vehicle_status(
    vehicle_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggiorna stato mezzo."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Mezzo non trovato")
    
    vehicle.status = new_status
    db.commit()
    return {"message": "Stato aggiornato", "status": new_status}


@router.put("/vehicles/{vehicle_id}", summary="Modifica Mezzo")
async def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Modifica i dati di un mezzo (Solo HR/Admin)."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Mezzo non trovato")
    
    # Update fields
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)
    
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", summary="Elimina Mezzo")
async def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Disattiva un mezzo (Soft Delete)."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Mezzo non trovato")
    
    vehicle.is_active = False
    db.commit()
    return {"message": "Mezzo eliminato correttamente"}


# ============================================================
# TICKET GUASTI
# ============================================================

@router.get("/tickets", summary="Lista Ticket")
async def list_tickets(
    status: str = None,
    banchina_id: int = None,
    vehicle_type: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista ticket ordinati per priorita."""
    query = db.query(MaintenanceTicket)
    
    if status:
        query = query.filter(MaintenanceTicket.status == status)
    if banchina_id:
        query = query.filter(MaintenanceTicket.banchina_id == banchina_id)
    
    # Ordina per priorità (più alto prima) e poi per data
    tickets = query.order_by(
        MaintenanceTicket.priority_score.desc(),
        MaintenanceTicket.opened_at.asc()
    ).limit(limit).all()
    
    # Arricchisci con info veicolo
    results = []
    for t in tickets:
        vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == t.vehicle_id).first()
        banchina = db.query(Banchina).filter(Banchina.id == t.banchina_id).first() if t.banchina_id else None
        results.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "issue_type": t.issue_type,
            "priority_score": t.priority_score,
            "is_safety_critical": t.is_safety_critical,
            "status": t.status,
            "opened_at": t.opened_at,
            "vehicle": {
                "id": vehicle.id,
                "type": vehicle.vehicle_type,
                "brand": vehicle.brand,
                "internal_code": vehicle.internal_code
            } if vehicle else None,
            "banchina": banchina.code if banchina else None
        })
    
    return results


@router.get("/tickets/open", summary="Ticket Aperti (Coda Manutentori)")
async def get_open_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Coda ticket aperti per manutentori, ordinati per priorita."""
    return await list_tickets(status="open", db=db, current_user=current_user)


@router.post("/tickets", summary="Apri Ticket Guasto")
async def create_ticket(
    vehicle_id: int,
    title: str,
    issue_type: str,  # total_breakdown, partial, preventive
    description: str = None,
    is_safety_critical: bool = False,
    is_banchina_blocked: bool = False,
    is_unique_vehicle: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apri nuovo ticket guasto."""
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Mezzo non trovato")
    
    # Calcola priorità
    priority = 0
    if is_safety_critical:
        priority += 100
    if issue_type == 'total_breakdown':
        priority += 50
    elif issue_type == 'partial':
        priority += 20
    else:
        priority += 5
    if is_banchina_blocked:
        priority += 30
    if is_unique_vehicle:
        priority += 20
    
    ticket = MaintenanceTicket(
        vehicle_id=vehicle_id,
        banchina_id=vehicle.banchina_id,
        title=title,
        description=description,
        issue_type=issue_type,
        is_safety_critical=is_safety_critical,
        is_banchina_blocked=is_banchina_blocked,
        is_unique_vehicle=is_unique_vehicle,
        priority_score=priority,
        opened_by=current_user.id
    )
    db.add(ticket)
    
    # Aggiorna stato veicolo
    if issue_type == 'total_breakdown':
        vehicle.status = 'breakdown'
    else:
        vehicle.status = 'maintenance'
    
    db.commit()
    db.refresh(ticket)
    
    return {
        "id": ticket.id,
        "priority_score": ticket.priority_score,
        "message": "Ticket aperto con successo"
    }


@router.patch("/tickets/{ticket_id}/resolve", summary="Risolvi Ticket")
async def resolve_ticket(
    ticket_id: int,
    resolution_notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Segna ticket come risolto (il creatore deve chiuderlo)."""
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    ticket.status = 'resolved'
    ticket.resolved_at = datetime.now()
    ticket.resolution_notes = resolution_notes
    
    # Calcola tempo risoluzione
    if ticket.opened_at:
        delta = ticket.resolved_at - ticket.opened_at
        ticket.resolution_time_minutes = int(delta.total_seconds() / 60)
    
    # Ripristina stato veicolo
    vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == ticket.vehicle_id).first()
    if vehicle:
        vehicle.status = 'operational'
    
    db.commit()
    
    return {
        "message": "Ticket risolto",
        "resolution_time_minutes": ticket.resolution_time_minutes
    }


@router.patch("/tickets/{ticket_id}/close", summary="Chiudi Ticket")
async def close_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chiudi ticket (solo chi lo ha aperto)."""
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    if ticket.opened_by != current_user.id and current_user.role not in ['super_admin', 'hr_manager']:
        raise HTTPException(status_code=403, detail="Solo chi ha aperto il ticket puo chiuderlo")
    
    ticket.status = 'closed'
    ticket.closed_by = current_user.id
    ticket.closed_at = datetime.now()
    
    db.commit()
    
    return {"message": "Ticket chiuso"}


# ============================================================
# KPI MANUTENZIONE
# ============================================================

@router.get("/kpi", summary="KPI Manutenzione")
async def get_maintenance_kpi(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """KPI manutenzione ultimi X giorni."""
    start_date = datetime.now() - timedelta(days=days)
    
    tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.opened_at >= start_date
    ).all()
    
    resolved = [t for t in tickets if t.status in ['resolved', 'closed']]
    
    # Tempo medio risoluzione
    resolution_times = [t.resolution_time_minutes for t in resolved if t.resolution_time_minutes]
    avg_resolution = sum(resolution_times) / len(resolution_times) if resolution_times else 0
    
    # Guasti per banchina
    by_banchina = {}
    for t in tickets:
        if t.banchina_id:
            banchina = db.query(Banchina).filter(Banchina.id == t.banchina_id).first()
            code = banchina.code if banchina else str(t.banchina_id)
            by_banchina[code] = by_banchina.get(code, 0) + 1
    
    # Guasti per tipo veicolo
    by_vehicle_type = {}
    for t in tickets:
        vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == t.vehicle_id).first()
        if vehicle:
            by_vehicle_type[vehicle.vehicle_type] = by_vehicle_type.get(vehicle.vehicle_type, 0) + 1
    
    return {
        "period_days": days,
        "total_tickets": len(tickets),
        "open_tickets": len([t for t in tickets if t.status == 'open']),
        "resolved_tickets": len(resolved),
        "avg_resolution_minutes": round(avg_resolution, 1),
        "safety_critical_count": len([t for t in tickets if t.is_safety_critical]),
        "by_banchina": by_banchina,
        "by_vehicle_type": by_vehicle_type
    }


# ============================================================
# CHECKLIST CONTROLLO MEZZI
# ============================================================
from models.fleet import FleetChecklist

REQUIRED_CHECKS = [
    "plastiche_integre", "lampeggiante", "blue_spot", "specchietto", 
    "cabina_pulita", "clacson", "sterzo", "freni", 
    "leve_idrauliche", "catene", "tubazioni", "perdite", 
    "batteria_fissaggio", "batteria_carica", "pulizia_carro", "pulizia_ruote"
]

def get_current_shift():
    """Determina il turno corrente in base all'ora.
    Returns: 'morning', 'evening', or None (fuori finestra).
    """
    now = datetime.now(IT_TZ)
    hour = now.hour
    minute = now.minute
    time_val = hour * 60 + minute  # minuti dalla mezzanotte
    
    # Mattutino: 06:00 (360) - 13:50 (830)
    if 360 <= time_val <= 830:
        return 'morning'
    # Serale: 14:00 (840) - 21:50 (1310)
    elif 840 <= time_val <= 1310:
        return 'evening'
    else:
        return None

def get_shift_label(shift):
    """Restituisce il nome leggibile del turno."""
    if shift == 'morning':
        return 'Check Mattutino (06:00 – 13:50)'
    elif shift == 'evening':
        return 'Check Serale (14:00 – 21:50)'
    return 'Fuori Turno'

class ChecklistSubmission(BaseModel):
    vehicle_id: int
    checklist_data: dict
    notes: Optional[str] = None

class OperatorInfo(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ChecklistResponse(BaseModel):
    id: int
    vehicle_id: int
    operator_id: int
    timestamp: datetime
    checklist_data: dict
    status: str
    shift: Optional[str] = None
    notes: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    operator: Optional[OperatorInfo] = None
    tablet_status: Optional[str] = "ok"
    tablet_photo_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class ResolveChecklistRequest(BaseModel):
    notes: str

@router.put("/checklists/{checklist_id}/resolve", summary="Risolvi anomalia checklist")
async def resolve_checklist(
    checklist_id: int,
    payload: ResolveChecklistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chk = db.query(FleetChecklist).filter(FleetChecklist.id == checklist_id).first()
    if not chk:
        raise HTTPException(404, "Checklist non trovata")
    
    chk.resolution_notes = payload.notes
    chk.resolved_at = datetime.utcnow()
    chk.resolved_by = current_user.id
    chk.status = 'resolved' # Update status to resolved
    
    db.commit()
    return {"message": "Anomalia risolta"}

@router.post("/checklists", summary="Invia Checklist Inizio Turno")
async def create_checklist(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Invia checklist con foto.
    - checklist_data: JSON string dei controlli
    - photo: File immagine tablet (obbligatorio)
    - issue_photo_[key]: File immagine opzionali per specifici problemi
    """
    import traceback
    try:
        # DBG: Print content type
        print(f"DEBUG CHECKLIST: Content-Type: {request.headers.get('content-type')}")
        
        # Log to file
        with open("debug_fleet.log", "a") as f:
            f.write(f"\n--- NEW REQUEST {datetime.utcnow()} ---\n")
            f.write(f"Content-Type: {request.headers.get('content-type')}\n")
        
        form = await request.form()
        
        with open("debug_fleet.log", "a") as f:
            f.write(f"Form Keys: {list(form.keys())}\n")
        
        checklist_data_str = form.get("checklist_data")
        
        with open("debug_fleet.log", "a") as f:
            f.write(f"Checklist Data: {checklist_data_str}\n")

        notes = form.get("notes")
        tablet_status = form.get("tablet_status", "ok")
        tablet_photo = form.get("photo")
        vehicle_photo = form.get("vehicle_photo")

        # Parse JSON
        try:
            if not checklist_data_str:
                print("DEBUG: checklist_data is Empty/None")
                with open("debug_fleet.log", "a") as f:
                    f.write("ERROR: checklist_data is Empty\n")
                raise ValueError(f"checklist_data form field is missing. Keys received: {list(form.keys())}")
                
            data_dict = json.loads(checklist_data_str)
            vehicle_id = data_dict.get("vehicle_id")
            checks = data_dict.get("checklist_data", {})
        except Exception as e:
            print(f"DEBUG: JSON Parse Error: {e}")
            raise HTTPException(400, f"Invalid JSON data: {str(e)}")

        # 1. Validazione Mezzo
        vehicle = db.query(FleetVehicle).filter(FleetVehicle.id == vehicle_id).first()
        if not vehicle:
            raise HTTPException(404, "Veicolo non trovato")

        # 2. setup directories
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        CHECKLIST_DIR = os.path.join(BASE_DIR, "uploads", "checklists")
        ISSUES_DIR = os.path.join(CHECKLIST_DIR, "issues")
        os.makedirs(CHECKLIST_DIR, exist_ok=True)
        os.makedirs(ISSUES_DIR, exist_ok=True)

        async def process_and_save_image(upload_file, dest_dir, prefix=""):
            if not upload_file: return None
            
            # Check if it's a string (e.g. "null", "undefined")
            if isinstance(upload_file, str):
                print(f"DEBUG: Unexpected string for file: '{upload_file}'")
                with open("debug_fleet.log", "a") as f:
                     f.write(f"WARNING: File field was string: '{upload_file}'\n")
                return None

            # Verify it has content_type (it should be an UploadFile)
            if not hasattr(upload_file, "content_type"):
                print(f"DEBUG: upload_file has no content_type: {type(upload_file)}")
                return None
            
            ext = ".jpg"
            save_format = "JPEG"
            ct = (upload_file.content_type or "").lower()
            fn = (upload_file.filename or "").lower()
            if ct == "image/png" or fn.endswith(".png"):
                ext = ".png"
                save_format = "PNG"
            # HEIC/HEIF → always convert to JPEG
            elif ct in ("image/heic", "image/heif") or fn.endswith((".heic", ".heif")):
                ext = ".jpg"
                save_format = "JPEG"
            
            filename = f"{prefix}{uuid.uuid4()}{ext}"
            file_path = os.path.join(dest_dir, filename)
            
            contents = await upload_file.read()
            
            # Guard: empty file
            if not contents or len(contents) < 100:
                print(f"DEBUG: File vuoto o troppo piccolo ({len(contents) if contents else 0} bytes)")
                return None
            
            try:
                img = Image.open(BytesIO(contents))
                img.verify()  # Verifica integrità
                # Re-open dopo verify (verify chiude il file)
                img = Image.open(BytesIO(contents))
            except Exception as img_err:
                print(f"DEBUG: Impossibile leggere immagine: {img_err}, content_type={upload_file.content_type}, filename={upload_file.filename}, size={len(contents)}")
                return None
            
            # Max dimensions
            max_width = 1280
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            if save_format == "JPEG":
                if img.mode != 'RGB': img = img.convert('RGB')
                img.save(file_path, "JPEG", quality=70, optimize=True)
            else:
                img.save(file_path, "PNG", optimize=True)
                
            return filename

        # 3. Save Tablet Photo
        # Mandatory per user requirement
        tablet_filename = None
        if tablet_photo:
            tablet_filename = await process_and_save_image(tablet_photo, CHECKLIST_DIR)
        
        # If tablet_filename is None here, it means either tablet_photo was missing 
        # OR it was an invalid string (handled by process_and_save_image returning None)
        if not tablet_filename:
             raise HTTPException(400, "Foto Tablet obbligatoria (Mancante o file non valido)")

        # 3b. Save Vehicle Photo (Mandatory)
        vehicle_photo_filename = None
        if vehicle_photo:
            vehicle_photo_filename = await process_and_save_image(vehicle_photo, CHECKLIST_DIR, prefix="vehicle_")
        
        if not vehicle_photo_filename:
            raise HTTPException(400, "Foto Mezzo obbligatoria (Mancante o file non valido)")
        
        # 4. Process Specific Issue Photos
        # Iterate over cheks to find issues that expect a photo
        new_checks_data = {}
        
        for key, val in checks.items():
            # If val is dict, it's a granular issue: {status: false, note: "...", photo_temp_id: "..."}
            if isinstance(val, dict):
                temp_id = val.get("photo_temp_id")
                photo_url = None
                
                # Look for file with key "issue_photo_{key}" or just "issue_photo_{temp_id}"
                # Frontend should send key as `issue_photo_${key}`
                issue_file = form.get(f"issue_photo_{key}")
                
                if issue_file:
                     issue_filename = await process_and_save_image(issue_file, ISSUES_DIR, prefix="issue_")
                     if issue_filename:
                        photo_url = f"/uploads/checklists/issues/{issue_filename}"
                
                new_checks_data[key] = {
                    "status": val.get("status"),
                    "note": val.get("note"),
                    "photo_url": photo_url
                }
            else:
                # Legacy/Simple boolean
                new_checks_data[key] = val

        # 5. Validation Logic (Updated for Object structure)
        has_issues = False
        for key, val in new_checks_data.items():
            # Check if boolean false OR dict with status false
            if val is False:
                has_issues = True
            elif isinstance(val, dict) and val.get("status") is False:
                has_issues = True

        status = 'ok'
        if has_issues:
            status = 'warning'
        if tablet_status != 'ok':
           status = 'warning' 
        
        tablet_photo_url = f"/uploads/checklists/{tablet_filename}" if tablet_filename else None
        vehicle_photo_url = f"/uploads/checklists/{vehicle_photo_filename}" if vehicle_photo_filename else None

        # 6. Determine Shift
        current_shift = get_current_shift()
        if not current_shift:
            now = datetime.now(IT_TZ)
            h, m = now.hour, now.minute
            if h * 60 + m < 360:  # Before 06:00
                raise HTTPException(400, "Checklist non disponibile. Il prossimo turno inizia alle 06:00.")
            elif 750 < h * 60 + m < 840:  # 12:30-14:00
                raise HTTPException(400, "Pausa pranzo — il prossimo check sarà disponibile alle 14:00.")
            else:  # After 21:30
                raise HTTPException(400, "Turno terminato. Il prossimo check sarà disponibile domani alle 06:00.")

        # 7. Check if this vehicle was already checked THIS shift TODAY
        today_start = datetime.now(IT_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
        already_done = db.query(FleetChecklist).filter(
            FleetChecklist.vehicle_id == vehicle_id,
            FleetChecklist.shift == current_shift,
            FleetChecklist.timestamp >= today_start
        ).first()
        if already_done:
            shift_label = get_shift_label(current_shift)
            raise HTTPException(400, f"Questo mezzo è già stato controllato per il {shift_label}.")

        # 8. Save
        checklist = FleetChecklist(
            vehicle_id=vehicle_id,
            operator_id=current_user.id,
            checklist_data=new_checks_data,
            status=status,
            shift=current_shift,
            notes=notes,
            tablet_status=tablet_status,
            tablet_photo_url=tablet_photo_url,
            vehicle_photo_url=vehicle_photo_url
        )
        db.add(checklist)
        db.commit()
        db.refresh(checklist)
        return checklist
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        err_msg = traceback.format_exc()
        print(f"CRITICAL ERROR creating checklist: {str(e)}")
        print(err_msg)
        with open("debug_fleet.log", "a") as f:
            f.write(f"\nCRITICAL ERROR: {str(e)}\n")
            f.write(err_msg)
        raise HTTPException(500, f"Critical Error: {str(e)}")


@router.get("/checklists", summary="Storico Checklist", response_model=List[ChecklistResponse])
async def list_checklists(
    vehicle_id: int = None,
    operator_id: int = None,
    date: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Storico checklist."""
    query = db.query(FleetChecklist).options(joinedload(FleetChecklist.operator))
    if vehicle_id:
        query = query.filter(FleetChecklist.vehicle_id == vehicle_id)
    if operator_id:
        query = query.filter(FleetChecklist.operator_id == operator_id)
    if date:
        query = query.filter(func.date(FleetChecklist.timestamp) == date)
    
    return query.order_by(FleetChecklist.timestamp.desc()).limit(limit).all()


@router.get("/vehicles/{vehicle_id}/checklist/latest", summary="Ultima Checklist")
async def get_latest_checklist(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recupera l'ultima checklist fatta per questo mezzo."""
    return db.query(FleetChecklist)\
        .filter(FleetChecklist.vehicle_id == vehicle_id)\
        .order_by(FleetChecklist.timestamp.desc())\
        .first()


@router.get("/shift-info", summary="Info Turno Corrente")
async def get_shift_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restituisce il turno corrente e i mezzi già controllati per questo turno."""
    current_shift = get_current_shift()
    now = datetime.now(IT_TZ)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Determine next shift info for display
    h, m = now.hour, now.minute
    time_val = h * 60 + m
    
    if current_shift:
        label = get_shift_label(current_shift)
        # Get vehicles already checked for this shift today
        checked = db.query(FleetChecklist).filter(
            FleetChecklist.shift == current_shift,
            FleetChecklist.timestamp >= today_start
        ).all()
        
        checked_map = {}
        for c in checked:
            op = db.query(User).filter(User.id == c.operator_id).first()
            checked_map[str(c.vehicle_id)] = {
                "operator": op.full_name or op.username if op else "?",
                "tabletStatus": c.tablet_status or "ok",
                "time": c.timestamp.strftime("%H:%M") if c.timestamp else None
            }
        
        return {
            "shift": current_shift,
            "label": label,
            "available": True,
            "checked_vehicles": checked_map,
            "message": None
        }
    else:
        # Outside any shift window
        if time_val < 360:
            msg = "Nessun check disponibile. Il turno mattutino inizia alle 06:00."
        elif 830 < time_val < 840:
            msg = "Pausa — il prossimo check sarà disponibile alle 14:00."
        else:
            msg = "Turno terminato. Il prossimo check sarà disponibile domani alle 06:00."
        
        return {
            "shift": None,
            "label": "Fuori Turno",
            "available": False,
            "checked_vehicles": {},
            "message": msg
        }
