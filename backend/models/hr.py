from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Employee(Base):
    """Anagrafica dipendenti - Dossier completo."""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    
    # Dati Anagrafici
    fiscal_code = Column(String(16), unique=True, index=True, nullable=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    birth_date = Column(DateTime, nullable=True)
    birth_place = Column(String(100), nullable=True)
    address = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    emergency_phone = Column(String(20), nullable=True)
    
    # Dati Lavorativi
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department_name = Column(String(100), nullable=True)  # Reparto come testo (semplificato)
    current_role = Column(String(100), nullable=True)
    contract_type = Column(String(20), default='full_time')  # full_time, part_time, internship, agency
    contract_start = Column(DateTime, nullable=True)
    contract_end = Column(DateTime, nullable=True)  # NULL se indeterminato
    hiring_date = Column(DateTime, nullable=True) # nullable true per import
    hourly_cost = Column(Float, default=0.0)  # Costo orario lordo azienda
    
    # Produzione
    default_banchina_id = Column(Integer, ForeignKey("banchine.id"), nullable=True)
    secondary_role = Column(String(100), nullable=True) # Per suggerimenti turni
    
    # Sistema Punteggio
    base_points = Column(Integer, default=100)
    bonus_points = Column(Integer, default=0)
    malus_points = Column(Integer, default=0)
    
    # Monte Ore Permessi (annuali)
    annual_leave_hours = Column(Integer, default=256)  # Ore permesso annuali totali
    
    # Organigramma
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    co_manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    # Stato
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relazioni
    user = relationship("User", back_populates="employee")
    department = relationship("Department", back_populates="employees")
    manager = relationship("Employee", remote_side=[id], backref="subordinates", foreign_keys=[manager_id])
    documents = relationship("EmployeeDocument", back_populates="employee", cascade="all, delete-orphan")
    certifications = relationship("EmployeeCertification", back_populates="employee", cascade="all, delete-orphan")
    trainings = relationship("EmployeeTraining", back_populates="employee", cascade="all, delete-orphan")
    medical_exams = relationship("MedicalExam", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    disciplinary_records = relationship("DisciplinaryRecord", back_populates="employee", cascade="all, delete-orphan")
    default_banchina = relationship("Banchina")
    
    @property
    def total_points(self):
        """Punteggio totale calcolato."""
        return self.base_points + self.bonus_points - self.malus_points
    
    @property
    def full_name(self):
        """Nome completo."""
        return f"{self.first_name} {self.last_name}"


class EmployeeDocument(Base):
    """Documenti PDF allegati al dipendente."""
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    doc_type = Column(String(50), nullable=False)  # contract, id_card, permit, other
    doc_name = Column(String(100), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relazioni
    employee = relationship("Employee", back_populates="documents")


class EmployeeCertification(Base):
    """Certificazioni e patentini con scadenze."""
    __tablename__ = "employee_certifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    cert_type = Column(String(50), nullable=False)  # art37_gen, art37_spec, first_aid, fire_safety, forklift, ple, preposto, other
    cert_name = Column(String(100), nullable=False)
    issue_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)  # NULL se non scade
    scan_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    employee = relationship("Employee", back_populates="certifications")


class EmployeeTraining(Base):
    """Corsi di formazione interna."""
    __tablename__ = "employee_trainings"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    course_name = Column(String(100), nullable=False)
    course_description = Column(Text, nullable=True)
    trainer = Column(String(100), nullable=True)
    training_date = Column(DateTime, nullable=False)
    duration_hours = Column(Integer, nullable=True)
    passed = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    employee = relationship("Employee", back_populates="trainings")


class MedicalExam(Base):
    """Visite mediche periodiche."""
    __tablename__ = "medical_exams"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    exam_type = Column(String(50), nullable=False)  # periodic, hiring, return_to_work, on_request
    exam_date = Column(DateTime, nullable=False)
    next_exam_date = Column(DateTime, nullable=True)
    outcome = Column(String(20), nullable=True)  # fit, fit_with_limits, unfit, pending
    limitations = Column(Text, nullable=True)
    doctor_name = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    employee = relationship("Employee", back_populates="medical_exams")


class LeaveRequest(Base):
    """Richieste ferie e permessi."""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    leave_type = Column(String(30), nullable=False)  # vacation, sick, permit, maternity, paternity, wedding, bereavement, other
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    hours = Column(Integer, nullable=True)  # Per permessi orari
    reason = Column(Text, nullable=True)
    
    # Workflow
    status = Column(String(20), default='pending')  # pending, approved, rejected, cancelled
    requested_at = Column(DateTime, default=datetime.utcnow)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who made the request
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    
    # Relazioni
    employee = relationship("Employee", back_populates="leave_requests")
    requester = relationship("User", foreign_keys=[requested_by], backref="requested_leaves")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="reviewed_leaves")
    

class DisciplinaryRecord(Base):
    """Storico disciplinare - elogi e sanzioni."""
    __tablename__ = "disciplinary_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    record_type = Column(String(30), nullable=False)  # praise, bonus_production, verbal_warning, written_warning, suspension, severe_infraction
    points_value = Column(Integer, default=0)  # +1, +2, -1, -5, etc.
    description = Column(Text, nullable=False)
    event_date = Column(DateTime, nullable=False)
    
    # Workflow approvativo
    proposed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    proposed_at = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL = in attesa
    approved_at = Column(DateTime, nullable=True)
    status = Column(String(20), default='pending')  # pending, approved, rejected
    
    # Relazioni
    employee = relationship("Employee", back_populates="disciplinary_records")


class EmployeeEvent(Base):
    """Eventi HR con punteggi (sostituisce/potenzia DisciplinaryRecord)."""
    __tablename__ = "employee_events"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Tipo evento con punteggio
    event_type = Column(String(50), nullable=False)  # excellence, praise, verbal_warning, written_warning, severe_infraction
    event_label = Column(String(100), nullable=False)  # Label leggibile con emoji
    points = Column(Integer, nullable=False)  # +3, +1, -2, -3, -5
    
    description = Column(Text, nullable=True)
    event_date = Column(DateTime, nullable=False)
    
    # Workflow approvativo
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default='pending')  # pending, approved, rejected
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Relazioni
    employee = relationship("Employee", backref="events")
    creator = relationship("User", foreign_keys=[created_by], backref="created_events")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_events")


class EmployeeBadge(Base):
    """Badge/medaglie assegnati ai dipendenti."""
    __tablename__ = "employee_badges"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    badge_code = Column(String(50), nullable=False)  # rookie_star, high_performer, warning_zone, etc.
    badge_name = Column(String(100), nullable=False)
    badge_icon = Column(String(10), nullable=False)  # Emoji
    badge_type = Column(String(20), nullable=False)  # positive, negative
    
    earned_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)  # Può essere revocato
    
    # Relazioni
    employee = relationship("Employee", backref="badges")


class MedicalExamType(Base):
    """Tipi visite mediche configurabili."""
    __tablename__ = "medical_exam_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    frequency_months = Column(Integer, default=12)  # 0 = una tantum
    description = Column(String(200), nullable=True)

class TrainingType(Base):
    """Tipi corsi formazione configurabili."""
    __tablename__ = "training_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    validity_months = Column(Integer, default=36) # 0 = illimitata
    required_role = Column(String(50), nullable=True) # Ruolo che DEVE farlo

class EventType(Base):
    """Tipi eventi HR configurabili (Sanzioni/Elogi)."""
    __tablename__ = "event_types"
    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(100), unique=True, nullable=False) # es. "Ritardo > 15min"
    default_points = Column(Integer, default=0) # es. -2
    severity = Column(String(20), default='info') # info, success, warning, danger
    icon = Column(String(10), default='📝') # Emoji


class Bonus(Base):
    """Registro bonus mensili dipendenti."""
    __tablename__ = "bonuses"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Dipendente che riceve il bonus
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Evento HR collegato (opzionale - NULL se inserimento manuale)
    event_id = Column(Integer, ForeignKey("employee_events.id"), nullable=True)
    
    # Dettagli
    amount = Column(Float, nullable=False)  # Importo in €
    description = Column(String(200), nullable=True)  # Motivo/nota
    
    # Mese/Anno di riferimento
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)  # es. 2026
    
    # Chi ha creato il bonus
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    employee = relationship("Employee", backref="bonuses")
    event = relationship("EmployeeEvent", backref="bonus_entries")
    creator = relationship("User", foreign_keys=[created_by])
