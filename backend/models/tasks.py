from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Task(Base):
    """Task e obiettivi assegnati (To-Do List avanzata)."""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Assegnazione
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Utente specifico (obbligatorio per non-manager)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False) # Chi ha creato il task
    
    # Priorità e scadenza
    priority = Column(Integer, default=5)  # 1 (Bassa) - 10 (Emergenza)
    deadline = Column(DateTime, nullable=True)
    
    # Stato Workflow
    status = Column(String(20), default='pending')  # pending, acknowledged, in_progress, completed
    
    # Checklist interna (JSON)
    # Es: [{"text": "Controllo olio", "done": true}, {"text": "Pulizia filtri", "done": false}]
    checklist = Column(JSON, default=[]) 
    
    # Ricorrenza (Stringa semplice o JSON per logica futura)
    # Es: "none", "daily", "weekly", "monthly"
    recurrence = Column(String(20), default='none')
    
    # Timestamp e Tracciamento
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)  # Quando passa a "acknowledged"
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, nullable=True)   # Quando passa a "in_progress"
    completed_at = Column(DateTime, nullable=True) # Quando passa a "completed"
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Note per riapertura
    reopen_reason = Column(Text, nullable=True)

    # Locking per modifiche concorrenti
    locked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    locked_at = Column(DateTime, nullable=True)

    # V2 Enhancements
    category = Column(String(50), nullable=True)
    tags = Column(JSON, nullable=True)

    # Relazioni
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")

    assignee = relationship("User", foreign_keys=[assigned_to], backref="tasks_assigned")
    author = relationship("User", foreign_keys=[assigned_by], backref="tasks_created")
    locker = relationship("User", foreign_keys=[locked_by])
    completer = relationship("User", foreign_keys=[completed_by], backref="tasks_completed")
    acknowledger = relationship("User", foreign_keys=[acknowledged_by], backref="tasks_acknowledged")


class TaskComment(Base):
    __tablename__ = "task_comments"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    task = relationship("Task", back_populates="comments")
    author = relationship("User")


class TaskAttachment(Base):
    __tablename__ = "task_attachments"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(50), nullable=True)
    file_size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    task = relationship("Task", back_populates="attachments")
    uploader = relationship("User")
