from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, EmployeeEvent, LeaveRequest, User
from security import get_current_user

router = APIRouter(prefix="/hr/stats", tags=["HR Stats"])

@router.get("/pending-counts", summary="Conteggio Approvazioni Pendenti")
async def get_pending_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restituisce il numero di eventi e permessi in attesa di approvazione."""
    is_hr = current_user.role in ["hr_manager", "super_admin"]
    
    if not is_hr:
        return {"events": 0, "leaves": 0}

    events_count = db.query(EmployeeEvent).filter(EmployeeEvent.status == "pending").count()
    leaves_count = db.query(LeaveRequest).filter(LeaveRequest.status == "pending").count()
    
    return {
        "events": events_count,
        "leaves": leaves_count
    }
