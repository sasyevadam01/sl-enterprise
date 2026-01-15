from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class MaintenanceRequest(Base):
    """Richieste di manutenzione e segnalazioni guasti dalla produzione."""
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Context
    shift_assignment_id = Column(Integer, ForeignKey("shift_assignments.id"), nullable=True)
    machine_id = Column(Integer, ForeignKey("shift_requirements.id"), nullable=False) # La postazione/macchina
    
    # Reporter (Operatore)
    reported_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    # Dettagli Guasto
    problem_type = Column(String(50), nullable=False) # mechanical, electrical, material, software, other
    priority = Column(String(20), nullable=False) # high (blocco), medium (segnalazione), low
    description = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    
    # Stato
    status = Column(String(20), default="open") # open, in_progress, resolved
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Gestione (Manutentore)
    taken_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Relationships
    shift_assignment = relationship("ShiftAssignment")
    machine = relationship("ShiftRequirement", backref="maintenance_requests")
    reporter = relationship("Employee", foreign_keys=[reported_by_id])
    taken_by = relationship("User", foreign_keys=[taken_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
