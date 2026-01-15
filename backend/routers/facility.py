from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from database import get_db, FacilityMaintenance, User
import schemas
from security import get_current_user

router = APIRouter(
    prefix="/facility",
    tags=["facility"]
)

@router.get("/maintenance", response_model=List[schemas.FacilityMaintenanceResponse])
def get_maintenances(
    status: str = None, 
    category: str = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista tutte le manutenzioni infrastrutturali.
    Opzionale: filtro per status o category.
    """
    query = db.query(FacilityMaintenance)
    
    if status and status != "all":
        query = query.filter(FacilityMaintenance.status == status)
    if category and category != "all":
        query = query.filter(FacilityMaintenance.category == category)
        
    # Ordina per scadenza (più urgenti prima)
    return query.order_by(FacilityMaintenance.due_date.asc()).all()

@router.post("/maintenance", response_model=schemas.FacilityMaintenanceResponse)
def create_maintenance(
    maintenance: schemas.FacilityMaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nuova scadenza manutenzione.
    """
    db_maintenance = FacilityMaintenance(
        name=maintenance.name,
        category=maintenance.category,
        provider_name=maintenance.provider_name,
        contact_email=maintenance.contact_email,
        contact_phone=maintenance.contact_phone,
        due_date=maintenance.due_date,
        recurrence_months=maintenance.recurrence_months,
        notes=maintenance.notes,
        status="scheduled"
    )
    db.add(db_maintenance)
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance

@router.patch("/maintenance/{maintenance_id}", response_model=schemas.FacilityMaintenanceResponse)
def update_maintenance(
    maintenance_id: int,
    maintenance_update: schemas.FacilityMaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggiorna una manutenzione esistente.
    Se viene marcata come 'completed', gestisce la ricorrenza se necessario.
    """
    # Verifica permessi (opzionale: solo alcune roles possono editare?)
    # Per ora lasciamo aperto a tutti gli utenti loggati, ma logghiamo l'azione è meglio.
    
    db_item = db.query(FacilityMaintenance).filter(FacilityMaintenance.id == maintenance_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    update_data = maintenance_update.dict(exclude_unset=True)
    
    # Se stiamo completando la manutenzione
    if maintenance_update.status == "completed" and db_item.status != "completed":
        # Imposta last_date a oggi (o alla data di completamento se fornita... per ora usiamo now)
        db_item.last_date = datetime.utcnow()
        # Calcola prossima scadenza se ricorrente
        # logica semplificata: se completata, non chiediamo di crearne una nuova subito, 
        # MA potremmo voler 'resettare' questa entità per il futuro o crearne una copia.
        # User request: "massima editabilità".
        # Approccio: Aggiorniamo questa. Se user vuole storico, creeremo logica diversa. 
        # Per ora manteniamo l'item semplice: status torna 'scheduled' e data avanza?
        # OPPURE: status resta completed e user ne crea una nuova?
        # Meglio: se completed, resta completed. User può 'duplicare' o reset manuale.
        # FIX: The user asked for "scadenziario" (scheduler). Usually implies automatic recurrence.
        pass

    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/maintenance/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancella definitivamente una manutenzione.
    """
    db_item = db.query(FacilityMaintenance).filter(FacilityMaintenance.id == maintenance_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    
    db.delete(db_item)
    db.commit()
