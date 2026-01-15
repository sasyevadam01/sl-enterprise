from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Banchina(Base):
    """Fabbricati/capannoni aziendali."""
    __tablename__ = "banchine"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)  # B1, B2, B3...
    name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relazioni
    vehicles = relationship("FleetVehicle", back_populates="banchina")
    requirements = relationship("ShiftRequirement", back_populates="banchina")


class Machine(Base):
    """Anagrafica macchine e veicoli."""
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String(50), nullable=False)
    model = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    machine_type = Column(String(30), nullable=False)  # forklift, retractable, ple, truck, production_line, compressor
    purchase_date = Column(DateTime, nullable=True)
    status = Column(String(20), default='operational')  # operational, maintenance_scheduled, breakdown, decommissioned
    
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    notes = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    maintenances = relationship("MachineMaintenance", back_populates="machine", cascade="all, delete-orphan")


class MachineMaintenance(Base):
    """Manutenzioni programmate e correttive."""
    __tablename__ = "machine_maintenances"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    
    maint_type = Column(String(30), nullable=False)  # preventive, corrective, revision, safety_check
    description = Column(Text, nullable=False)
    due_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    cost = Column(Integer, nullable=True)  # in centesimi
    technician_notes = Column(Text, nullable=True)
    
    status = Column(String(20), default='scheduled')  # scheduled, in_progress, completed, cancelled
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    machine = relationship("Machine", back_populates="maintenances")


class FacilityMaintenance(Base):
    """Manutenzioni infrastrutturali (Aria, Clima, Scaffali, Disinfestazione)."""
    __tablename__ = "facility_maintenances"

    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String(100), nullable=False)  # es. "Impianto Aria Compressa B1"
    category = Column(String(50), nullable=False)  # air_system, shelving, hvac, pest_control, fire_safety, other
    provider_name = Column(String(100), nullable=True)
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    
    last_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=False)
    recurrence_months = Column(Integer, default=12)
    
    status = Column(String(20), default='scheduled')  # scheduled, completed, overdue
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
