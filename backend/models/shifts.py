from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class ShiftRequirement(Base):
    """Fabbisogno personale per banchina (es. 2x Mulettista)."""
    __tablename__ = "shift_requirements"

    id = Column(Integer, primary_key=True, index=True)
    banchina_id = Column(Integer, ForeignKey("banchine.id"), nullable=False)
    
    role_name = Column(String(100), nullable=False)  # es. "Mulettista", "Bordatore"
    quantity = Column(Float, default=1.0)  # Numero operatori richiesti
    
    # KPI Target (pezzi per turno 8h per singolo operatore)
    kpi_target = Column(Integer, default=0)  # es. 100 pz/turno
    
    # Settore KPI a cui appartiene questo ruolo (da Excel "corrispondenza foglio KPI")
    kpi_sector = Column(String(100), nullable=True)  # es. "Bordatura Materassi"
    requires_kpi = Column(Boolean, default=False)
    
    note = Column(String(200), nullable=True)
    
    # Relazioni
    banchina = relationship("Banchina", back_populates="requirements")
    assignments = relationship("ShiftAssignment", back_populates="requirement")


class ShiftAssignment(Base):
    """Turni di lavoro assegnati con Macchina/Ruolo."""
    __tablename__ = "shift_assignments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Collegamento a Macchina/Ruolo specifico (per KPI)
    requirement_id = Column(Integer, ForeignKey("shift_requirements.id"), nullable=True)
    
    work_date = Column(DateTime, nullable=False)  # Giorno del turno
    
    shift_type = Column(String(20), nullable=False)  # morning, afternoon, night, manual, day_off
    start_time = Column(String(5), nullable=True)  # "06:00"
    end_time = Column(String(5), nullable=True)  # "14:00"
    
    is_extra = Column(Boolean, default=False)  # Straordinario?
    notes = Column(Text, nullable=True)
    
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Session Persistence Fields
    checked_in_at = Column(DateTime, nullable=True)  # When crew confirmed, skip re-check
    closed_at = Column(DateTime, nullable=True)      # When shift was closed
    is_closed = Column(Boolean, default=False)       # Prevents further data entry
    
    # Relazioni
    employee = relationship("Employee", backref="shifts")
    requirement = relationship("ShiftRequirement", back_populates="assignments")
