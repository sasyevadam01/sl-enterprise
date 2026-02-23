from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class FleetVehicle(Base):
    """Mezzi aziendali: muletti, retrattili, transpallet, PLE, camion."""
    __tablename__ = "fleet_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    
    vehicle_type = Column(String(30), nullable=False)  # forklift, retractable, transpallet, ple, truck
    brand = Column(String(50), nullable=True)  # JUNGHEINRICH, MITSUBISHI, HYSTER
    model = Column(String(100), nullable=True)
    internal_code = Column(String(20), nullable=True)  # Numero interno (es. "29", "44")
    serial_number = Column(String(100), nullable=True)
    
    banchina_id = Column(Integer, ForeignKey("banchine.id"), nullable=True)
    assigned_operator = Column(String(100), nullable=True)  # Nome operatore principale
    
    is_4_0 = Column(Boolean, default=False)  # Industria 4.0
    status = Column(String(20), default='operational')  # operational, breakdown, maintenance
    
    is_blocked = Column(Boolean, default=False)
    block_info = Column(JSON, nullable=True) # {"reason": str, "by": str, "at": str}
    
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    banchina = relationship("Banchina", back_populates="vehicles")
    tickets = relationship("MaintenanceTicket", back_populates="vehicle")
    checklists = relationship("FleetChecklist", back_populates="vehicle")


class MaintenanceTicket(Base):
    """Ticket segnalazione guasti con sistema priorità."""
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True)
    
    # Riferimenti
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False)
    banchina_id = Column(Integer, ForeignKey("banchine.id"), nullable=True)
    
    # Descrizione
    title = Column(String(200), nullable=False)

    description = Column(Text, nullable=True)
    
    # Tipo e urgenza
    issue_type = Column(String(30), nullable=False)  # total_breakdown, partial, preventive
    is_safety_critical = Column(Boolean, default=False)  # +100 punti
    is_banchina_blocked = Column(Boolean, default=False)  # +30 punti
    is_unique_vehicle = Column(Boolean, default=False)  # +20 punti (no backup)
    priority_score = Column(Integer, default=0)  # Calcolato automaticamente
    
    # Media
    photo_paths = Column(Text, nullable=True)  # JSON array di path
    
    # Workflow
    status = Column(String(20), default='open')  # open, in_progress, resolved, closed
    opened_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    opened_at = Column(DateTime, default=datetime.utcnow)
    
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Manutentore
    
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_time_minutes = Column(Integer, nullable=True)  # Per KPI
    
    closed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Relazioni
    vehicle = relationship("FleetVehicle", back_populates="tickets")

    def calculate_priority(self):
        """Calcola punteggio priorità."""
        score = 0
        if self.is_safety_critical:
            score += 100
        if self.issue_type == 'total_breakdown':
            score += 50
        elif self.issue_type == 'partial':
            score += 20
        else:  # preventive
            score += 5
        if self.is_banchina_blocked:
            score += 30
        if self.is_unique_vehicle:
            score += 20
        return score


class FleetChecklist(Base):
    """Checklist inizio turno mezzi (Forklift Check)."""
    __tablename__ = "fleet_checklists"

    id = Column(Integer, primary_key=True, index=True)
    
    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    shift = Column(String(10), nullable=True)  # "morning" (06:00-12:30) or "evening" (14:00-21:30)
    
    # Dati Checklist JSON (Es. {"freni": true, "luci": false})
    # Valori: true=OK, false=KO
    checklist_data = Column(JSON, nullable=False)
    
    # Stato: OK (tutto true), WARNING (anomalie lievi), CRITICAL (bloccante)
    status = Column(String(20), default='ok')
    
    # Note (Obbligatorie se status != OK)
    notes = Column(Text, nullable=True)

    # Tablet Check
    tablet_photo_url = Column(String(255), nullable=True)
    tablet_status = Column(String(20), default='ok')
    
    # Foto Mezzo Completa
    vehicle_photo_url = Column(String(255), nullable=True)
    
    # Risoluzione Problemi
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relazioni
    vehicle = relationship("FleetVehicle", back_populates="checklists")
    operator = relationship("User", foreign_keys=[operator_id])
    resolver = relationship("User", foreign_keys=[resolved_by])


class FleetChargeCycle(Base):
    """Ciclo di utilizzo/ricarica di un veicolo.
    
    Stato: in_use → charging/parked → completed (al prossimo prelievo).
    """
    __tablename__ = "fleet_charge_cycles"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_id = Column(Integer, ForeignKey("fleet_vehicles.id"), nullable=False)

    # Prelievo
    operator_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    pickup_time = Column(DateTime, nullable=False)
    pickup_battery_pct = Column(Integer, nullable=False)
    early_pickup = Column(Boolean, default=False)
    early_pickup_reason = Column(Text, nullable=True)

    # Riconsegna
    return_time = Column(DateTime, nullable=True)
    return_operator_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    return_battery_pct = Column(Integer, nullable=True)
    return_type = Column(String(20), nullable=True)       # 'charge' | 'park'
    return_banchina_id = Column(Integer, ForeignKey("banchine.id"), nullable=True)

    # Penalita 
    forgot_return = Column(Boolean, default=False)        # L'operatore si è dimenticato il mezzo
    forced_return_by = Column(Integer, ForeignKey("employees.id"), nullable=True) # Chi ha forzato il takeover


    # Stato ciclo
    status = Column(String(20), default='in_use')         # in_use, charging, parked, completed

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relazioni
    vehicle = relationship("FleetVehicle", backref="charge_cycles")
    pickup_operator = relationship("Employee", foreign_keys=[operator_id])
    return_operator = relationship("Employee", foreign_keys=[return_operator_id])
    forced_return_operator = relationship("Employee", foreign_keys=[forced_return_by])
    return_banchina = relationship("Banchina")
