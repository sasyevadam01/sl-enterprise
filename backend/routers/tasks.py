from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import shutil
import os

from database import SessionLocal, Task, User, Notification, TaskComment, TaskAttachment
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse, UserRole, 
    TaskCommentCreate, TaskCommentResponse, TaskAttachmentResponse
)
from security import get_current_user

UPLOAD_DIR = "uploads/tasks"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- HELPER: NOTIFY ---
def create_notification(db: Session, user_id: int, title: str, message: str, link: str = "/hr/tasks", type: str = "info"):
    notif = Notification(
        recipient_user_id=user_id,
        notif_type=type,
        title=title,
        message=message,
        link_url=link
    )
    db.add(notif)
    # Commit handled by caller

# --- ENDPOINTS ---

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = None, 
    priority: Optional[int] = None,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Lista task. 
    - Manager: vede tutto.
    - Employee: vede solo i suoi assegnati.
    """
    query = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.author),
        joinedload(Task.locker),
        joinedload(Task.comments).joinedload(TaskComment.author),
        joinedload(Task.attachments).joinedload(TaskAttachment.uploader)
    )
    
    # 1. VISIBILITY RULES
    # Use role_obj for reliability
    user_role_name = current_user.role_obj.name if current_user.role_obj else current_user.role
    
    # LIST COMPLETA MANAGER CHE VEDONO TUTTO
    # Nota: Rimosso 'factory_controller' su richiesta utente (deve comportarsi come coordinator)
    MANAGERS = ["admin", "super_admin", "hr_manager"]
    
    if user_role_name in MANAGERS:
        # Manager vede tutto
        pass
    else:
        # User normale vede:
        # 1. I task assegnati a LUI (assigned_to)
        # 2. I task creati DA LUI (assigned_by)
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Task.assigned_to == current_user.id, 
                Task.assigned_by == current_user.id
            )
        )

    # 2. FILTERS
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
        
    # 3. SORTING (Default: Priority DESC, Deadline ASC)
    query = query.order_by(desc(Task.priority), Task.deadline)
    
    tasks = query.all()
    
    # 4. ENRICHMENT (Nomi)
    # Nota: per performance ideale si dovrebbero usare join, ma qui facciamo lazy loading rapido
    for t in tasks:
        t.author_name = t.author.full_name if t.author else "Unknown"
        t.assignee_name = t.assignee.full_name if t.assignee else "Unassigned"
        t.completer_name = t.completer.full_name if t.completer else None
        t.locked_by_name = t.locker.full_name if t.locked_by and t.locker else None

        # Enrich Comments
        for c in t.comments:
            c.author_name = c.author.full_name if c.author else "Sistema"
            
        # Enrich Attachments
        for a in t.attachments:
            a.uploader_name = a.uploader.full_name if a.uploader else "Sistema"
            a.download_url = f"/tasks/attachments/{a.id}/download"
        
    return tasks

@router.get("/my", response_model=List[TaskResponse])
def get_my_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Ritorna i task assegnati all'utente corrente che sono ancora 'pending' o 'in_progress'.
    Ordinati per priorità (DESC) e scadenza (ASC).
    """
    tasks = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.author),
        joinedload(Task.locker),
        joinedload(Task.comments).joinedload(TaskComment.author),
        joinedload(Task.attachments).joinedload(TaskAttachment.uploader)
    ).filter(
        Task.assigned_to == current_user.id,
        Task.status.in_(["pending", "in_progress"])
    ).order_by(
        desc(Task.priority), 
        Task.deadline
    ).all()

    # Enrichment
    for t in tasks:
        t.author_name = t.author.full_name if t.author else "Unknown"
        t.assignee_name = t.assignee.full_name if t.assignee else "Unassigned"
    
    return tasks
@router.post("/", response_model=TaskResponse)
def create_task(task_in: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Crea un nuovo task."""
    
    # Validazione Priority
    if not 1 <= task_in.priority <= 10:
        raise HTTPException(status_code=400, detail="La priorità deve essere tra 1 e 10.")
    
    new_task = Task(
        title=task_in.title,
        description=task_in.description,
        assigned_to=task_in.assigned_to,
        assigned_by=current_user.id,
        priority=task_in.priority,
        deadline=task_in.deadline,
        checklist=[item.dict() for item in task_in.checklist] if task_in.checklist else [],
        recurrence=task_in.recurrence,
        category=task_in.category,
        tags=task_in.tags,
        status="pending"
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # NOTIFICA ASSEGNAZIONE
    if new_task.assigned_to and new_task.assigned_to != current_user.id:
        notif_type = "priority" if new_task.priority >= 8 else "info"
        create_notification(
            db, 
            new_task.assigned_to, 
            "Nuovo Task Assegnato", 
            f"Nuovo task (P:{new_task.priority}): {new_task.title}",
            "/hr/tasks",
            type=notif_type
        )
        db.commit()
        
    return new_task

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Aggiorna stato, checklist o dettagli task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
        
    # LOCK CHECK (Concurrency)
    if task.locked_by and task.locked_by != current_user.id:
        if task.locked_at and (datetime.utcnow() - task.locked_at).total_seconds() < 300:
            locker_name = task.locker.full_name if task.locker else "un utente"
            raise HTTPException(status_code=409, detail=f"Task in modifica da {locker_name}")
        
    # PERMISSION CHECK
    is_manager = current_user.role_obj and current_user.role_obj.name in ["admin", "super_admin", "factory_controller", "hr_manager"]
    is_assignee = task.assigned_to == current_user.id
    
    if not (is_manager or is_assignee):
        raise HTTPException(status_code=403, detail="Non hai i permessi per modificare questo task.")
    
    # Aggiorna campi semplici
    if task_update.title is not None:
        task.title = task_update.title
    if task_update.description is not None:
        task.description = task_update.description
    if task_update.checklist is not None:
        task.checklist = [item.dict() for item in task_update.checklist]
    if task_update.priority is not None:
        task.priority = task_update.priority
    
    if task_update.recurrence is not None: task.recurrence = task_update.recurrence
    if task_update.category is not None: task.category = task_update.category
    if task_update.tags is not None: task.tags = task_update.tags
    
    # Handle reopen reason if reverting to pending
    if task_update.reopen_reason is not None:
        task.reopen_reason = task_update.reopen_reason
        
    # LOGICA STATI
    if task_update.status and task_update.status != task.status:
        old_status = task.status
        new_status = task_update.status
        
        task.status = new_status
        
        # Transizioni FORWARD
        if new_status == "acknowledged":
            task.acknowledged_at = datetime.utcnow()
            task.acknowledged_by = current_user.id
        elif new_status == "in_progress":
            if not task.started_at:
                task.started_at = datetime.utcnow()
        elif new_status == "completed":
            task.completed_at = datetime.utcnow()
            task.completed_by = current_user.id
            
            # NOTIFICA AL MANAGER (Creatore)
            if task.assigned_by != current_user.id:
                 create_notification(
                    db, 
                    task.assigned_by, 
                    "Task Completato", 
                    f"{current_user.full_name} ha completato il task: {task.title}",
                    "/hr/tasks"
                )
        
        # Transizioni BACKWARD (Riapertura)
        elif new_status == "pending":
            # Reset timestamps when reverting to pending
            if old_status == "completed":
                task.completed_at = None
                task.completed_by = None
            if old_status == "in_progress":
                task.started_at = None
            # Note: manteniamo acknowledged_by come storico di chi l'ha visto
    
    db.commit()
    db.refresh(task)
    
    # Enrich with names
    task.author_name = task.author.full_name if task.author else "Unknown"
    task.assignee_name = task.assignee.full_name if task.assignee else "Unassigned"
    task.completer_name = task.completer.full_name if task.completer else None
    task.acknowledger_name = task.acknowledger.full_name if task.acknowledger else None
    
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Elimina task (Solo Manager - Coordinator Excluded)."""
    is_manager = current_user.role_obj and current_user.role_obj.name in ["admin", "super_admin", "factory_controller", "hr_manager"]
    if not is_manager:
        raise HTTPException(status_code=403, detail="Solo i manager possono eliminare i task.")
        
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
        
    db.delete(task)
    db.commit()
    return {"message": "Task eliminato"}

@router.post("/{task_id}/lock")
def lock_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Blocca il task per la modifica."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
    
    # Check current lock
    if task.locked_by and task.locked_by != current_user.id:
        if task.locked_at and (datetime.utcnow() - task.locked_at).total_seconds() < 300:
             locker_name = task.locker.full_name if task.locker else "un utente"
             raise HTTPException(status_code=409, detail=f"Task già in modifica da {locker_name}")
    
    task.locked_by = current_user.id
    task.locked_at = datetime.utcnow()
    db.commit()
    return {"message": "Task bloccato", "locked_by": current_user.id}

@router.post("/{task_id}/unlock")
def unlock_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sblocca il task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
    
    # Only locker or admin can unlock
    is_admin = current_user.role_obj and current_user.role_obj.name in ["admin", "super_admin"]
    if task.locked_by == current_user.id or is_admin:
        task.locked_by = None
        task.locked_at = None
        db.commit()
        return {"message": "Task sbloccato"}
    
    return {"message": "Non bloccato da te"}

# --- V2 ENDPOINTS (Enhancements) ---

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dettaglio singolo task con commenti/allegati."""
    task = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.author),
        joinedload(Task.locker),
        joinedload(Task.comments).joinedload(TaskComment.author),
        joinedload(Task.attachments).joinedload(TaskAttachment.uploader)
    ).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
        
    # Enrichment
    task.author_name = task.author.full_name if task.author else "Unknown"
    task.assignee_name = task.assignee.full_name if task.assignee else "Unassigned"
    task.completer_name = task.completer.full_name if task.completer else None
    task.acknowledger_name = task.acknowledger.full_name if task.acknowledger else None
    task.locked_by_name = task.locker.full_name if task.locker and task.locked_by else None
    
    for c in task.comments:
        c.author_name = c.author.full_name if c.author else "Sistema"
        
    for a in task.attachments:
        a.uploader_name = a.uploader.full_name if a.uploader else "Sistema"
        a.download_url = f"/tasks/attachments/{a.id}/download"
        
    return task

@router.post("/{task_id}/comments", response_model=TaskCommentResponse)
def add_comment(task_id: int, comment: TaskCommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    
    new_comment = TaskComment(
        task_id=task.id,
        user_id=current_user.id,
        content=comment.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    new_comment.author_name = current_user.full_name
    return new_comment

@router.get("/{task_id}/comments", response_model=List[TaskCommentResponse])
def get_comments(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    
    comments = db.query(TaskComment).options(joinedload(TaskComment.author)).filter(TaskComment.task_id == task_id).all()
    for c in comments:
        c.author_name = c.author.full_name if c.author else "Sistema"
    return comments

@router.post("/{task_id}/attachments", response_model=TaskAttachmentResponse)
async def upload_attachment(task_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    
    safe_filename = f"{task_id}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(file_path)
    
    new_att = TaskAttachment(
        task_id=task.id,
        uploaded_by=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        file_size=file_size
    )
    db.add(new_att)
    db.commit()
    db.refresh(new_att)
    
    new_att.uploader_name = current_user.full_name
    new_att.download_url = f"/tasks/attachments/{new_att.id}/download"
    return new_att

@router.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    att = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not att: raise HTTPException(status_code=404, detail="Attachment not found")
    
    is_manager = current_user.role_obj and current_user.role_obj.name in ["admin", "super_admin", "hr_manager"]
    if att.uploaded_by != current_user.id and not is_manager:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if os.path.exists(att.file_path):
        os.remove(att.file_path)
        
    db.delete(att)
    db.commit()
    return {"message": "Attachment deleted"}

@router.get("/attachments/{attachment_id}/download")
def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not att: raise HTTPException(status_code=404, detail="Attachment not found")
    
    if not os.path.exists(att.file_path):
         raise HTTPException(status_code=404, detail="File lost on disk")
         
    return FileResponse(att.file_path, filename=att.filename)
