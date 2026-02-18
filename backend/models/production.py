from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class ProductionSession(Base):
    """Sessione di produzione per una postazione (ShiftRequirement) in un turno."""
    __tablename__ = "production_sessions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Collega alla 'postazione/ruolo' definita nei requisiti
    requirement_id = Column(Integer, ForeignKey("shift_requirements.id"), nullable=False)
    
    # Data e turno
    work_date = Column(DateTime, nullable=False)
    shift_type = Column(String(20), nullable=False)  # morning, afternoon, night
    
    # Orari effettivi
    start_time = Column(String(5), nullable=True)  # "06:00"
    end_time = Column(String(5), nullable=True)    # "14:00"
    actual_hours = Column(Float, nullable=True)     # Ore effettive (es. 7.75)
    
    # Produzione
    total_pieces = Column(Integer, default=0)
    good_pieces = Column(Integer, default=0)
    scrap_pieces = Column(Integer, default=0)
    
    # Operatori presenti (JSON array di employee_id)
    operator_ids = Column(Text, nullable=True)  # "[1, 2, 3]"
    operators_count = Column(Integer, default=0)
    
    # Note
    notes = Column(Text, nullable=True)
    
    # Tracciamento
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relazioni
    requirement = relationship("ShiftRequirement", backref="sessions")
    downtimes = relationship("DowntimeLog", back_populates="session", cascade="all, delete-orphan")
    operators = relationship("SessionOperator", back_populates="session", cascade="all, delete-orphan")


class SessionOperator(Base):
    """Operatori registrati in una sessione (dettaglio ore)."""
    __tablename__ = "session_operators"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("production_sessions.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    actual_hours = Column(Integer, nullable=True) # Ore lavorate in questa sessione
    role_in_session = Column(String(30), nullable=True) # Ruolo specifico
    
    session = relationship("ProductionSession", back_populates="operators")
    employee = relationship("Employee")


class DowntimeLog(Base):
    """Log dei fermi macchina con causali."""
    __tablename__ = "downtime_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    session_id = Column(Integer, ForeignKey("production_sessions.id"), nullable=False)
    
    # Causale
    reason = Column(String(50), nullable=False)  # no_material, breakdown, setup, cleaning, software_error, meeting, other
    reason_detail = Column(Text, nullable=True)
    
    # Durata
    start_time = Column(String(5), nullable=False)  # "09:30"
    end_time = Column(String(5), nullable=True)     # "10:15" - NULL se ancora in corso
    duration_minutes = Column(Integer, nullable=True)  # Calcolato
    
    # Note
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    session = relationship("ProductionSession", back_populates="downtimes")


class ProductionEntry(Base):
    """Registrazione produzione giornaliera operatore."""
    __tablename__ = "production_entries"

    id = Column(Integer, primary_key=True, index=True)
    
    # Chi e quando
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    shift_assignment_id = Column(Integer, ForeignKey("shift_assignments.id"), nullable=False)
    work_date = Column(DateTime, nullable=False)
    
    # Produzione
    pieces_produced = Column(Integer, default=0)
    
    # Stato e conferma
    confirmed = Column(Boolean, default=False)  # Operatore ha confermato
    confirmed_at = Column(DateTime, nullable=True)
    
    # Modifiche Controller
    edited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    edited_at = Column(DateTime, nullable=True)
    edit_reason = Column(Text, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    employee = relationship("Employee", backref="production_entries")
    shift_assignment = relationship("ShiftAssignment", backref="production_entry")
    downtimes = relationship("MachineDowntime", back_populates="production_entry", cascade="all, delete-orphan")


class MachineDowntime(Base):
    """Cronometro fermi macchina (start/stop)."""
    __tablename__ = "machine_downtimes"

    id = Column(Integer, primary_key=True, index=True)
    
    production_entry_id = Column(Integer, ForeignKey("production_entries.id"), nullable=False)
    
    # Causale
    reason = Column(String(100), nullable=False)  # guasto, materiale, setup, pulizia, altro
    reason_detail = Column(Text, nullable=True)
    
    # Cronometro
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)  # NULL = ancora in corso
    duration_minutes = Column(Integer, nullable=True)  # Calcolato automaticamente quando si ferma
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    production_entry = relationship("ProductionEntry", back_populates="downtimes")


class KpiConfig(Base):
    """Configurazione KPI per settore produttivo."""
    __tablename__ = "kpi_configs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Identificazione settore
    sector_name = Column(String(100), unique=True, nullable=False)  # "Bordatura Materassi"
    
    # Target KPI
    kpi_target_8h = Column(Integer, nullable=False)  # 400 pezzi per 8 ore
    kpi_target_hourly = Column(Float, nullable=True)  # 50 pezzi/ora (auto-calcolato)
    
    # Stato
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)  # Per ordinamento UI
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relazioni
    entries = relationship("KpiEntry", back_populates="kpi_config")


class KpiEntry(Base):
    """Registrazione giornaliera KPI per turno."""
    __tablename__ = "kpi_entries"

    id = Column(Integer, primary_key=True, index=True)
    
    # Riferimenti
    kpi_config_id = Column(Integer, ForeignKey("kpi_configs.id"), nullable=False)
    work_date = Column(DateTime, nullable=False)  # Data lavorativa
    shift_type = Column(String(20), nullable=False)  # "morning", "afternoon", "night"
    
    # Input Utente
    hours_total = Column(Float, default=8.0)  # Ore turno
    hours_downtime = Column(Float, default=0.0)  # Ore fermo (0.25 = 15 min)
    quantity_produced = Column(Integer, default=0)  # Pezzi prodotti
    
    # Causale Fermo
    downtime_reason = Column(String(50), nullable=True)  # mancanza_materiale, manutenzione, setup, altro
    downtime_notes = Column(Text, nullable=True)  # Dettagli per "altro"
    
    # Auto-Calcolati
    hours_net = Column(Float, nullable=True)  # hours_total - hours_downtime
    quantity_per_hour = Column(Float, nullable=True)  # quantity / hours_net
    efficiency_percent = Column(Float, nullable=True)  # vs target
    
    # Staffing Analysis (auto da ShiftAssignment)
    operators_present = Column(Integer, nullable=True)  # Operatori effettivi
    operators_required = Column(Float, nullable=True)  # Operatori richiesti
    staffing_status = Column(String(20), nullable=True)  # "pieno", "sottoorganico", "surplus"
    staffing_delta = Column(Integer, nullable=True)  # Differenza (+/- N)
    
    # Metadata
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relazioni
    # Relazioni
    kpi_config = relationship("KpiConfig", back_populates="entries")
    recorder = relationship("User")


class DowntimeReason(Base):
    """Causali di fermo configurabili dall'admin."""
    __tablename__ = "downtime_reasons"

    id = Column(Integer, primary_key=True, index=True)
    
    label = Column(String(100), unique=True, nullable=False)  # es. "Guasto Meccanico"
    category = Column(String(50), default='other')  # technical, organizational, material, other
    is_active = Column(Boolean, default=True)
    description = Column(String(200), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# LIVE PRODUCTION (PICKING LIST) MODELS
# ============================================================

class ProductionMaterial(Base):
    """
    Configurazione Materiali (Memory, Spugna) e Colori.
    Gestibile da Admin per non avere valori hardcoded.
    """
    __tablename__ = "production_materials"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False) # memory, sponge_density, sponge_color
    label = Column(String(100), nullable=False)   # Es: "EM40 BIANCO", "D25"
    value = Column(String(50), nullable=True)     # Es: "#FFFFFF" per colori, o codice interno
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

class BlockRequest(Base):
    """
    Richiesta di prelievo blocco (Picking List).
    """
    __tablename__ = "block_requests"
    __table_args__ = (
        Index('idx_block_status_created', 'status', 'created_at'),
        Index('idx_block_created_by', 'created_by_id'),
        Index('idx_block_urgent_status', 'is_urgent', 'status'),
    )

    id = Column(Integer, primary_key=True, index=True)
    
    # Dati Richiesta
    request_type = Column(String(50), nullable=False) # memory, sponge
    target_sector = Column(String(50), nullable=True) # pantografo, giostra, altro
    
    # References to configuration (Nullable based on type)
    material_id = Column(Integer, ForeignKey("production_materials.id"), nullable=True)
    density_id = Column(Integer, ForeignKey("production_materials.id"), nullable=True)
    color_id = Column(Integer, ForeignKey("production_materials.id"), nullable=True)
    
    # Specifics
    dimensions = Column(String(50), nullable=False) # 160x190 etc
    custom_height = Column(Integer, nullable=True)  # Se taglio parziale
    is_trimmed = Column(Boolean, default=False)     # Rifilato
    quantity = Column(Integer, default=1)
    client_ref = Column(String(100), nullable=True)
    
    # Fornitore (opzionale)
    supplier_id = Column(Integer, ForeignKey("production_materials.id"), nullable=True)
    
    # Status Flow
    status = Column(String(50), default="pending") # pending, processing, delivered, completed, cancelled
    is_urgent = Column(Boolean, default=False)     # NEW: Urgency flag
    
    # Tracking
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    processed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    
    delivered_at = Column(DateTime, nullable=True) # Data fine/consegna
    
    notes = Column(Text, nullable=True)

    # Relazioni
    material = relationship("ProductionMaterial", foreign_keys=[material_id])
    density = relationship("ProductionMaterial", foreign_keys=[density_id])
    color = relationship("ProductionMaterial", foreign_keys=[color_id])
    supplier = relationship("ProductionMaterial", foreign_keys=[supplier_id])
    
    created_by = relationship("User", foreign_keys=[created_by_id])
    processed_by = relationship("User", foreign_keys=[processed_by_id])

    # Properties for Pydantic (to avoid manual population)
    @property
    def material_label(self):
        return self.material.label if self.material else None

    @property
    def density_label(self):
        return self.density.label if self.density else None

    @property
    def color_label(self):
        return self.color.label if self.color else None

    @property
    def creator_name(self):
        return self.created_by.full_name if self.created_by else None

    @property
    def processor_name(self):
        return self.processed_by.full_name if self.processed_by else None


# ============================================================
# BLOCK CALCULATOR MODELS
# ============================================================

class BlockHeight(Base):
    """
    Altezze tipiche dei blocchi per materiale.
    Popolate dagli operatori per quick-select nel calcolatore.
    """
    __tablename__ = "block_heights"

    id = Column(Integer, primary_key=True, index=True)
    material_category = Column(String(50), nullable=False)  # 'sponge' o 'memory'
    
    # Reference to density (for sponge) or memory type
    material_id = Column(Integer, ForeignKey("production_materials.id"), nullable=True)
    
    height_cm = Column(Float, nullable=False)  # Altezza lavorabile tipica
    usage_count = Column(Integer, default=1)   # Quante volte usata (per ordinamento)
    
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    material = relationship("ProductionMaterial", foreign_keys=[material_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    @property
    def material_label(self):
        return self.material.label if self.material else None


class RecoveryRule(Base):
    """
    Regole di recupero per le rimanenze.
    Configurabili e visibili agli operatori.
    """
    __tablename__ = "recovery_rules"

    id = Column(Integer, primary_key=True, index=True)
    material_category = Column(String(50), nullable=False)  # 'sponge' o 'memory'
    
    # Reference to density (for sponge) or memory type
    material_id = Column(Integer, ForeignKey("production_materials.id"), nullable=True)
    material_label = Column(String(100), nullable=True)  # Es: "D30 Rosa", "Viscoflex Blu NEM40"
    
    thickness_cm = Column(Float, nullable=False)  # Spessore recuperabile (es: 4.5)
    product_type = Column(String(100), nullable=False)  # Es: "Materasso", "Ondina 7 zone"
    notes = Column(String(255), nullable=True)  # Es: "Spaccare 7.4"
    
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    material = relationship("ProductionMaterial", foreign_keys=[material_id])

    def get_material_display(self):
        """Returns the material label for display."""
        if self.material_label:
            return self.material_label
        return self.material.label if self.material else None


# ============================================================
# OVEN TRACKING (IL FORNO)
# ============================================================

OVEN_MAX_MINUTES = 180  # Durata massima accensione forno

class OvenItem(Base):
    """Tracciamento materiali nel forno industriale."""
    __tablename__ = "oven_items"

    id = Column(Integer, primary_key=True, index=True)

    # Tipo materiale
    item_type = Column(String(30), nullable=False)  # memory_block, wet_mattress, wet_other

    # RIFERIMENTO PRODOTTO (obbligatorio)
    reference = Column(String(200), nullable=False)  # Es: "Cuorflex 160x200", "V25 Verde 180x200"

    # Descrizione aggiuntiva (opzionale)
    description = Column(String(300), nullable=True)

    quantity = Column(Integer, default=1)

    # Chi ha inserito
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inserted_at = Column(DateTime, default=datetime.utcnow)

    # Durata prevista (max 180 min)
    expected_minutes = Column(Integer, default=OVEN_MAX_MINUTES)

    # Rimozione
    removed_at = Column(DateTime, nullable=True)
    removed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Status: in_oven, removed, overdue
    status = Column(String(20), default="in_oven")

    notes = Column(Text, nullable=True)

    # Relationships
    operator = relationship("User", foreign_keys=[operator_id])
    remover = relationship("User", foreign_keys=[removed_by])
