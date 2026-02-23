from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class ReturnTicket(Base):
    """Ticket resi materiale."""
    __tablename__ = "return_tickets"

    id = Column(Integer, primary_key=True, index=True)
    
    reference_code = Column(String(50), nullable=False)  # Riferimento rientrato
    customer_name = Column(String(200), nullable=False)
    
    material_description = Column(Text, nullable=True)
    condition_notes = Column(Text, nullable=True)  # Impressioni operatore
    
    # Media
    photo_paths = Column(Text, nullable=True)  # JSON array
    video_paths = Column(Text, nullable=True)  # JSON array
    
    # Workflow
    status = Column(String(20), default='pending')  # pending, verified, credit_note, closed
    
    opened_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    opened_at = Column(DateTime, default=datetime.utcnow)
    
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    credit_note_issued = Column(Boolean, default=False)
    credit_note_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    credit_note_at = Column(DateTime, nullable=True)
    credit_note_amount = Column(Integer, nullable=True)  # In centesimi
    
    closed_at = Column(DateTime, nullable=True)


# ============================================================
# RICHIESTA MATERIALE - Sistema Uber-style
# ============================================================

class LogisticsMaterialType(Base):
    """
    Tipi di materiale richiedibili.
    Configurabile da Admin senza toccare codice.
    """
    __tablename__ = "logistics_material_types"

    id = Column(Integer, primary_key=True, index=True)
    
    label = Column(String(100), nullable=False)  # "Cartoni Guanciali"
    icon = Column(String(10), default="📦")      # Emoji
    category = Column(String(50), default="altro")  # imballo, materie_prime, logistica, altro
    unit_of_measure = Column(String(20), default="pz") # NEW: "bancali", "pacchi", "kg"
    base_points = Column(Integer, default=0) # NEW: Punti bonus per questo materiale
    
    requires_description = Column(Boolean, default=False)  # True per Tessuti (campo libero obbligatorio)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    requests = relationship("LogisticsRequest", back_populates="material_type")


class LogisticsRequest(Base):
    """
    Singola richiesta di materiale.
    Traccia tutto il ciclo di vita dalla creazione alla consegna.
    """
    __tablename__ = "logistics_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Cosa viene richiesto
    material_type_id = Column(Integer, ForeignKey("logistics_material_types.id"), nullable=False)
    custom_description = Column(Text, nullable=True)  # Campo libero per "Tessuto" o "Altro"
    quantity = Column(Integer, default=1)
    unit_of_measure = Column(String(20), default="pz") # NEW: salviamo l'unità usata nella richiesta
    
    # Da dove arriva la richiesta
    banchina_id = Column(Integer, ForeignKey("banchine.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Status Flow
    status = Column(String(20), default="pending")  # pending, assigned, preparing, prepared, processing, completed, cancelled
    is_urgent = Column(Boolean, default=False)
    
    # Escalation Level (0=None, 1=Coordinators, 2=Controller, 3=Directors)
    escalation_level = Column(Integer, default=0)
    
    # Cancellation Info (NEW)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Secure Delivery (NEW)
    confirmation_code = Column(String(6), nullable=True) # OTP for delivery
    
    # Chi prende in carico
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_forced_assignment = Column(Boolean, default=False)  # True se assegnato dal coordinatore
    was_released = Column(Boolean, default=False)  # True se è stata rilasciata (per bonus salvataggio)
    
    # Preparazione (stato intermedio)
    prepared_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Chi ha preparato il materiale
    prepared_at = Column(DateTime, nullable=True)  # Quando è stato preparato
    
    # ETA Management
    promised_eta_minutes = Column(Integer, nullable=True)  # ETA promessa dal magazziniere
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    taken_at = Column(DateTime, nullable=True)       # Quando il magazziniere ha preso
    completed_at = Column(DateTime, nullable=True)   # Quando consegnato
    urgency_requested_at = Column(DateTime, nullable=True)  # Quando è stato sollecitato
    
    # Gamification Results
    points_awarded = Column(Integer, default=0)      # Punti guadagnati
    penalty_applied = Column(Integer, default=0)     # Penalità applicate
    eta_respected = Column(Boolean, nullable=True)   # ETA rispettata?
    actual_duration_seconds = Column(Integer, nullable=True)  # Tempo reale impiegato
    
    # Relazioni
    material_type = relationship("LogisticsMaterialType", back_populates="requests")
    banchina = relationship("Banchina")
    requester = relationship("User", foreign_keys=[requester_id], backref="logistics_requests_made")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], backref="logistics_requests_assigned")
    prepared_by = relationship("User", foreign_keys=[prepared_by_id], backref="logistics_requests_prepared")
    messages = relationship("LogisticsMessage", back_populates="request", cascade="all, delete-orphan")

    @property
    def wait_time_seconds(self):
        """Tempo di attesa in secondi. Per richieste preparate, parte da prepared_at."""
        base_time = self.prepared_at if self.prepared_at and self.status in ('prepared',) else self.created_at
        if self.taken_at and self.status not in ('prepared',):
            return (self.taken_at - base_time).total_seconds()
        return (datetime.utcnow() - base_time).total_seconds()

    @property
    def is_overdue(self):
        """Verifica se ha superato l'ETA promessa."""
        if not self.taken_at or not self.promised_eta_minutes:
            return False
        if self.status == "completed":
            return not self.eta_respected
        elapsed = (datetime.utcnow() - self.taken_at).total_seconds()
        return elapsed > (self.promised_eta_minutes * 60)


class LogisticsPerformance(Base):
    """
    Performance mensile dei magazzinieri.
    Separata dai punti HR comportamentali.
    """
    __tablename__ = "logistics_performance"

    id = Column(Integer, primary_key=True, index=True)
    
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)   # es. 2026
    
    # Contatori
    missions_completed = Column(Integer, default=0)
    missions_urgent = Column(Integer, default=0)
    missions_released = Column(Integer, default=0)  # Task rilasciate
    
    # Punti
    total_points = Column(Integer, default=0)
    penalties_received = Column(Integer, default=0)
    
    # Performance
    avg_reaction_seconds = Column(Integer, nullable=True)  # Media tempo presa in carico
    fastest_reaction_seconds = Column(Integer, nullable=True)  # Record personale
    eta_accuracy_percent = Column(Float, nullable=True)  # % ETA rispettate
    
    # Solleciti ricevuti (negativo)
    urgency_requests_received = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relazioni
    employee = relationship("Employee", backref="logistics_performance")


class LogisticsMessage(Base):
    """
    Messaggi veloci tra magazziniere e richiedente.
    """
    __tablename__ = "logistics_messages"

    id = Column(Integer, primary_key=True, index=True)
    
    request_id = Column(Integer, ForeignKey("logistics_requests.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    message_type = Column(String(20), default="preset")  # preset, custom
    content = Column(Text, nullable=False)
    
    sent_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    
    # Relazioni
    request = relationship("LogisticsRequest", back_populates="messages")
    sender = relationship("User")


class LogisticsPresetMessage(Base):
    """
    Messaggi preimpostati configurabili da Admin.
    """
    __tablename__ = "logistics_preset_messages"

    id = Column(Integer, primary_key=True, index=True)
    
    content = Column(String(200), nullable=False)  # "Sto arrivando!"
    icon = Column(String(10), default="💬")
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class LogisticsEtaOption(Base):
    """
    Opzioni ETA configurabili da Admin.
    """
    __tablename__ = "logistics_eta_options"

    id = Column(Integer, primary_key=True, index=True)
    
    minutes = Column(Integer, nullable=False)  # 5, 10, 15, 20, 30
    label = Column(String(20), nullable=False)  # "5 min", "30+ min"
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)


class LogisticsConfig(Base):
    """
    Configurazioni generali del sistema (punti, penalità, soglie).
    """
    __tablename__ = "logistics_config"

    id = Column(Integer, primary_key=True, index=True)
    
    config_key = Column(String(50), unique=True, nullable=False)
    config_value = Column(String(100), nullable=False)
    description = Column(String(200), nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

