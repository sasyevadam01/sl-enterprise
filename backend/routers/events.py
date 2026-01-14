"""
SL Enterprise - Events Router
Sistema eventi HR con punteggi e badge.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from database import get_db, EmployeeEvent, EmployeeBadge, Employee, User, Notification
from schemas import (
    EventCreate, EventReview, EventResponse, BadgeResponse,
    EVENT_CONFIG, BADGE_DEFINITIONS, MessageResponse
)
from security import get_current_user, get_hr_or_admin

router = APIRouter(prefix="/events", tags=["Eventi HR"])


# ============================================================
# CRUD EVENTI
# ============================================================

@router.get("/", response_model=List[EventResponse], summary="Lista Eventi")
async def list_events(
    employee_id: int = None,
    status_filter: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista eventi con filtri opzionali."""
    query = db.query(EmployeeEvent)
    
    if employee_id:
        query = query.filter(EmployeeEvent.employee_id == employee_id)
    
    if status_filter:
        query = query.filter(EmployeeEvent.status == status_filter)
    
    from sqlalchemy.orm import joinedload
    events = query.options(
        joinedload(EmployeeEvent.creator),
        joinedload(EmployeeEvent.approver)
    ).order_by(EmployeeEvent.event_date.desc()).limit(limit).all()
    return events


@router.get("/pending", response_model=List[EventResponse], summary="Eventi in Attesa")
async def get_pending_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Eventi in attesa di approvazione (HR only)."""
    from sqlalchemy.orm import joinedload
    events = db.query(EmployeeEvent).options(
        joinedload(EmployeeEvent.creator)
    ).filter(EmployeeEvent.status == "pending").all()
    return events


@router.post("/", response_model=EventResponse, summary="Nuovo Evento")
async def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea nuovo evento."""
    # Verifica dipendente esiste
    employee = db.query(Employee).filter(Employee.id == event_data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Ottieni config evento dal Database
    # event_data.event_type ora contiene l'ID dell'EventType (come stringa)
    from models.hr import EventType
    try:
        type_id = int(event_data.event_type.value) # Se lo invii come stringa o enum
    except:
        # Fallback se inviato come stringa pura
        type_id = int(event_data.event_type)

    event_type_obj = db.query(EventType).filter(EventType.id == type_id).first()
    
    if not event_type_obj:
        raise HTTPException(status_code=400, detail="Tipo evento non valido")
    
    # Determina status: SEMPRE pending come richiesto dall'utente
    auto_approve = False 
    
    new_event = EmployeeEvent(
        employee_id=event_data.employee_id,
        event_type=event_type_obj.label, # Salviamo la label o un codice univoco
        event_label=event_type_obj.label,
        points=event_type_obj.default_points,
        description=event_data.description,
        event_date=event_data.event_date,
        created_by=current_user.id,
        status='pending', # Sempre pending
        approved_by=None,
        approved_at=None
    )
    db.add(new_event)
    
    # Crea notifica per HR
    notification = Notification(
        recipient_role="hr_manager",
        notif_type="approval_req",
        title="Nuovo evento da approvare",
        message=f"{event_type_obj.label} per {employee.first_name} {employee.last_name} - Richiesto da: {current_user.full_name}",
        link_url=f"/hr/approvals" # Link aggiornato al nuovo centro approvazioni
    )
    db.add(notification)
    
    db.commit()
    db.refresh(new_event)
    
    return new_event


@router.patch("/{event_id}/review", response_model=EventResponse, summary="Approva/Rifiuta Evento")
async def review_event(
    event_id: int,
    review_data: EventReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Approva o rifiuta evento."""
    event = db.query(EmployeeEvent).filter(EmployeeEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    
    if event.status != "pending":
        raise HTTPException(status_code=400, detail="Evento già processato")
    
    event.status = review_data.status
    event.approved_by = current_user.id
    event.approved_at = datetime.now()
    event.rejection_reason = review_data.rejection_reason
    
    # Se approvato, aggiorna punteggio
    if review_data.status == "approved":
        employee = db.query(Employee).filter(Employee.id == event.employee_id).first()
        if employee:
            _update_employee_score(db, employee, event.points)
            _check_and_award_badges(db, employee.id)
            _check_threshold_alert(db, employee)
    
    # Notifica di ritorno al richiedente originale
    if event.created_by:
        status_text = "✅ APPROVATO" if review_data.status == "approved" else "❌ RIFIUTATO"
        notes_text = f"\nNote: {review_data.rejection_reason}" if review_data.rejection_reason else ""
        
        notification = Notification(
            recipient_user_id=event.created_by,  # Send to the requester
            notif_type="info",
            title=f"Richiesta Evento {status_text}",
            message=f"{event.event_label} - Revisionato da {current_user.full_name}{notes_text}",
            link_url="/hr/tasks"  # Link to tasks for coordinator
        )
        db.add(notification)
    
    db.commit()
    db.refresh(event)
    
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Evento")
async def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Elimina evento (e storna punteggio se approvato)."""
    event = db.query(EmployeeEvent).filter(EmployeeEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    
    employee_id = event.employee_id  # Save before deletion
    
    # Se era approvato, bisogna stornare il punteggio e ricalcolare badge
    if event.status == 'approved':
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if employee:
            # Storno manuale del punteggio
            if event.points > 0:
                employee.bonus_points = max(0, (employee.bonus_points or 0) - event.points)
            else:
                employee.malus_points = max(0, (employee.malus_points or 0) - abs(event.points))
    
    db.delete(event)
    db.commit()
    
    # RICALCOLA BADGE dopo eliminazione (il punteggio è cambiato)
    if event.status == 'approved':
        _check_and_award_badges(db, employee_id)
        db.commit()
    
    return None


# ============================================================
# PUNTEGGI E CLASSIFICHE
# ============================================================

@router.get("/leaderboard", summary="Classifica Dipendenti")
async def get_leaderboard(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Top e Flop dipendenti per punteggio."""
    # Calcola punteggio totale dagli eventi approvati
    scores = db.query(
        EmployeeEvent.employee_id,
        func.sum(EmployeeEvent.points).label('total_points')
    ).filter(
        EmployeeEvent.status == 'approved'
    ).group_by(EmployeeEvent.employee_id).all()
    
    score_map = {s.employee_id: s.total_points or 0 for s in scores}
    
    # Ottieni dipendenti attivi
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    
    employee_scores = []
    for emp in employees:
        score = score_map.get(emp.id, 0)
        # Carica badge attivi
        badges = db.query(EmployeeBadge).filter(
            EmployeeBadge.employee_id == emp.id,
            EmployeeBadge.is_active == True
        ).all()
        
        employee_scores.append({
            "id": emp.id,
            "name": f"{emp.first_name} {emp.last_name}",
            "role": emp.current_role,
            "total_points": score,
            "badges": [{"icon": b.badge_icon, "name": b.badge_name, "type": b.badge_type} for b in badges]
        })
    
    # Ordina per punteggio
    sorted_scores = sorted(employee_scores, key=lambda x: x['total_points'], reverse=True)
    
    top = sorted_scores[:limit]
    flop = sorted(employee_scores, key=lambda x: x['total_points'])[:limit]
    
    return {
        "top": top,
        "flop": flop,
        "average": sum(s['total_points'] for s in employee_scores) / len(employee_scores) if employee_scores else 0
    }


@router.get("/employee/{employee_id}/timeline", summary="Timeline Eventi Dipendente")
async def get_employee_timeline(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Storico eventi di un dipendente."""
    events = db.query(EmployeeEvent).filter(
        EmployeeEvent.employee_id == employee_id,
        EmployeeEvent.status == 'approved'
    ).order_by(EmployeeEvent.event_date.desc()).all()
    
    # Calcola punteggio totale
    total = sum(e.points for e in events)
    
    # Statistiche
    positive_count = sum(1 for e in events if e.points > 0)
    negative_count = sum(1 for e in events if e.points < 0)
    
    return {
        "employee_id": employee_id,
        "total_points": total,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "events": [
            {
                "id": e.id,
                "date": e.event_date,
                "type": e.event_type,
                "label": e.event_label,
                "points": e.points,
                "description": e.description
            }
            for e in events
        ]
    }


# ============================================================
# BADGE
# ============================================================

@router.get("/badges/definitions", summary="Definizioni Badge")
async def get_badge_definitions():
    """Lista tutti i badge disponibili."""
    return BADGE_DEFINITIONS


@router.get("/employee/{employee_id}/badges", response_model=List[BadgeResponse], summary="Badge Dipendente")
async def get_employee_badges(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Badge guadagnati da un dipendente."""
    badges = db.query(EmployeeBadge).filter(
        EmployeeBadge.employee_id == employee_id,
        EmployeeBadge.is_active == True
    ).all()
    return badges


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _update_employee_score(db: Session, employee: Employee, points: int):
    """Aggiorna punteggio dipendente."""
    if points > 0:
        employee.bonus_points = (employee.bonus_points or 0) + points
    else:
        employee.malus_points = (employee.malus_points or 0) + abs(points)


def _check_and_award_badges(db: Session, employee_id: int):
    """
    Controlla e RICALCOLA DINAMICAMENTE i badge.
    - Aggiunge badge se criteri soddisfatti
    - RIMUOVE badge se criteri non più soddisfatti
    """
    # Carica eventi approvati
    events = db.query(EmployeeEvent).filter(
        EmployeeEvent.employee_id == employee_id,
        EmployeeEvent.status == 'approved'
    ).all()
    
    # Calcola metriche attuali
    total_points = sum(e.points for e in events)
    excellence_count = sum(1 for e in events if e.event_type == 'excellence')
    praise_count = sum(1 for e in events if e.event_type == 'praise')
    negative_count = sum(1 for e in events if e.points < 0)
    severe_count = sum(1 for e in events if e.event_type == 'severe_infraction')
    
    # Eventi negli ultimi 30 giorni
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_negative = sum(1 for e in events if e.points < 0 and e.event_date >= thirty_days_ago)
    recent_praise = sum(1 for e in events if e.event_type == 'praise' and e.event_date >= thirty_days_ago)
    
    # Definizione criteri per ogni badge
    badge_criteria = {
        # Badge Positivi
        'rookie_star': excellence_count >= 1,
        'high_performer': total_points >= 10,
        'excellence_master': excellence_count >= 5,
        'team_player': recent_praise >= 3,
        # Badge Negativi
        'warning_zone': total_points <= -5,
        'red_alert': total_points <= -10,
        'repeat_offender': recent_negative >= 3,
        'critical_watch': severe_count >= 2,
    }
    
    # Carica badge esistenti
    existing_badges = db.query(EmployeeBadge).filter(
        EmployeeBadge.employee_id == employee_id
    ).all()
    existing_codes = {b.badge_code: b for b in existing_badges}
    
    badges_added = []
    badges_removed = []
    
    for badge_code, is_earned in badge_criteria.items():
        badge_exists = badge_code in existing_codes
        
        if is_earned and not badge_exists:
            # AGGIUNGI badge (non lo aveva e ora lo merita)
            badge_def = BADGE_DEFINITIONS.get(badge_code)
            if badge_def:
                new_badge = EmployeeBadge(
                    employee_id=employee_id,
                    badge_code=badge_code,
                    badge_name=badge_def['name'],
                    badge_icon=badge_def['icon'],
                    badge_type=badge_def['type'],
                    is_active=True
                )
                db.add(new_badge)
                badges_added.append(badge_code)
                
                # Notifica per badge negativo
                if badge_def['type'] == 'negative':
                    employee = db.query(Employee).filter(Employee.id == employee_id).first()
                    if employee:
                        notification = Notification(
                            recipient_role="hr_manager",
                            notif_type="alert",
                            title=f"⚠️ Badge negativo assegnato",
                            message=f"{employee.first_name} {employee.last_name} ha ricevuto il badge {badge_def['icon']} {badge_def['name']}",
                            link_url=f"/hr/employees/{employee_id}"
                        )
                        db.add(notification)
        
        elif not is_earned and badge_exists:
            # RIMUOVI badge (lo aveva ma non lo merita più)
            badge_to_remove = existing_codes[badge_code]
            db.delete(badge_to_remove)
            badges_removed.append(badge_code)
            
            # Notifica per badge negativo rimosso (buona notizia!)
            badge_def = BADGE_DEFINITIONS.get(badge_code)
            if badge_def and badge_def['type'] == 'negative':
                employee = db.query(Employee).filter(Employee.id == employee_id).first()
                if employee:
                    notification = Notification(
                        recipient_role="hr_manager",
                        notif_type="info",
                        title=f"✅ Badge negativo rimosso",
                        message=f"{employee.first_name} {employee.last_name} non ha più il badge {badge_def['icon']} {badge_def['name']} - Situazione migliorata!",
                        link_url=f"/hr/employees/{employee_id}"
                    )
                    db.add(notification)
    
    # Log per debug (opzionale)
    if badges_added or badges_removed:
        print(f"[BADGES] Employee {employee_id}: Added={badges_added}, Removed={badges_removed}")


def _check_threshold_alert(db: Session, employee: Employee):
    """Controlla se il punteggio totale è sceso sotto soglie critiche e invia alert."""
    # Calcola punteggio totale attuale
    total_score = (employee.bonus_points or 0) - (employee.malus_points or 0)
    
    thresholds = [
        {"value": -5, "title": "⚠️ Soglia Critica Superata (-5)", "type": "alert"},
        {"value": -10, "title": "🚨 ALERT ROSSO: Soglia Critica (-10)", "type": "critical"}
    ]
    
    for t in thresholds:
        # Se il punteggio è esattamente quello della soglia o inferiore
        # e non abbiamo appena mandato una notifica identica (evita spam per ogni punto extra)
        if total_score <= t['value']:
            # Verifica se esiste già una notifica non letta per questa soglia e questo dipendente
            existing = db.query(Notification).filter(
                Notification.recipient_role == "hr_manager",
                Notification.title == t['title'],
                Notification.message.like(f"%{employee.first_name} {employee.last_name}%"),
                Notification.is_read == False
            ).first()
            
            if not existing:
                notification = Notification(
                    recipient_role="hr_manager",
                    notif_type="alert",
                    title=t['title'],
                    message=f"Il dipendente {employee.first_name} {employee.last_name} ha raggiunto un punteggio totale di {total_score}. Necessaria revisione HR.",
                    link_url=f"/hr/employees/{employee.id}"
                )
                db.add(notification)


# ============================================================
# TIPI EVENTO (per frontend)
# ============================================================

@router.get("/types", summary="Tipi Evento Disponibili")
async def get_event_types(db: Session = Depends(get_db)):
    """Lista tipi evento con punteggi (dal database)."""
    # Import model locally to avoid circular imports if needed, though usually safe here
    from models.hr import EventType
    
    types = db.query(EventType).all()
    
    # Fallback/Seed se il DB è vuoto (opzionale, per evitare liste vuote)
    if not types:
        base_types = [
             {"label": "Richiamo Verbale", "default_points": -1, "severity": "warning", "icon": "🟣"},
             {"label": "Ammonizione Scritta", "default_points": -2, "severity": "danger", "icon": "📄"},
        ]
        params = []
        for t in base_types:
            new_t = EventType(**t)
            db.add(new_t)
            params.append(new_t)
        db.commit()
        types = params

    return [
        {
            "value": str(t.id), # Usa ID come value per univocità o t.label se preferisci
            "label": t.label,
            "points": t.default_points,
            "severity": t.severity,
            "icon": t.icon
        }
        for t in types
    ]
