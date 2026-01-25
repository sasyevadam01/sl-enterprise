"""
SL Enterprise - Pydantic Schemas
Validazione dati per API requests/responses.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class UserRole(str, Enum):
    super_admin = "super_admin"
    admin = "admin"  # <-- ADDED THIS
    factory_controller = "factory_controller"
    hr_manager = "hr_manager"
    coordinator = "coordinator"
    record_user = "record_user"
    order_user = "order_user"       # <-- Added
    block_supply = "block_supply"   # <-- Added
    warehouse_operator = "warehouse_operator"
    security = "security"  # <-- Added


# ============================================================
# USER SCHEMAS
# ============================================================

class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: UserRole = UserRole.record_user
    department_id: Optional[int] = None


class UserCreate(UserBase):
    """Schema per creare un nuovo utente."""
    password: str
    employee_id: Optional[int] = None  # Link to employee record


class UserUpdate(BaseModel):
    """Schema per aggiornare un utente."""
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None
    department_id: Optional[int] = None
    employee_id: Optional[int] = None  # Allow updating link


class UserResponse(UserBase):
    """Schema per risposta API (senza password!)."""
    id: int
    is_active: bool
    created_at: datetime
    role_label: Optional[str] = None
    permissions: List[str] = []
    employee_id: Optional[int] = None
    default_home: Optional[str] = None
    
    # Location Info
    last_lat: Optional[float] = None
    last_lon: Optional[float] = None
    last_location_update: Optional[datetime] = None

    class Config:
        from_attributes = True

class LocationUpdate(BaseModel):
    """Schema per aggiornamento GPS."""
    latitude: float
    longitude: float


class UserLogin(BaseModel):
    """Schema per login."""
    username: str
    password: str


# ============================================================
# AUTH / TOKEN SCHEMAS
# ============================================================

class Token(BaseModel):
    """Token JWT restituito dopo login."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Dati estratti dal token JWT."""
    username: Optional[str] = None
    role: Optional[str] = None


# ============================================================
# DEPARTMENT SCHEMAS
# ============================================================

class DepartmentBase(BaseModel):
    name: str
    cost_center: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    id: int

    class Config:
        from_attributes = True


# ============================================================
# AUDIT LOG SCHEMAS
# ============================================================

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# ============================================================
# RESPONSE GENERICHE
# ============================================================

class MessageResponse(BaseModel):
    """Risposta generica con messaggio."""
    message: str
    success: bool = True


# ============================================================
# ENUMS HR
# ============================================================

class ContractType(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    internship = "internship"
    agency = "agency"

class CertificationType(str, Enum):
    art37_gen = "art37_gen"
    art37_spec = "art37_spec"
    first_aid = "first_aid"
    fire_safety = "fire_safety"
    forklift = "forklift"
    ple = "ple"
    preposto = "preposto"
    other = "other"

class LeaveType(str, Enum):
    vacation = "vacation"
    sick = "sick"
    permit = "permit"
    sudden_permit = "sudden_permit"

class LeaveStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"

class DisciplinaryType(str, Enum):
    praise = "praise"
    bonus_production = "bonus_production"
    verbal_warning = "verbal_warning"
    written_warning = "written_warning"
    suspension = "suspension"
    severe_infraction = "severe_infraction"

class MedicalOutcome(str, Enum):
    fit = "fit"
    fit_with_limits = "fit_with_limits"
    unfit = "unfit"
    pending = "pending"


# ============================================================
# EMPLOYEE SCHEMAS
# ============================================================

class EmployeeBase(BaseModel):
    fiscal_code: Optional[str] = None  # Made optional - not used anymore
    first_name: str
    last_name: str
    birth_date: Optional[datetime] = None
    birth_place: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None  # Reparto come testo
    current_role: Optional[str] = None
    contract_type: ContractType = ContractType.full_time
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    hiring_date: Optional[datetime] = None
    manager_id: Optional[int] = None
    default_banchina_id: Optional[int] = None
    secondary_role: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    """Schema per creare dipendente (wizard)."""
    pass


class EmployeeUpdate(BaseModel):
    """Schema per aggiornare dipendente."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[datetime] = None
    birth_place: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None  # Reparto come testo
    current_role: Optional[str] = None
    contract_type: Optional[ContractType] = None
    contract_start: Optional[datetime] = None
    contract_end: Optional[datetime] = None
    manager_id: Optional[int] = None
    default_banchina_id: Optional[int] = None
    secondary_role: Optional[str] = None
    is_active: Optional[bool] = None


class LinkedUserInfo(BaseModel):
    """Info minimali utente collegato per response dipendente."""
    id: int
    username: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    role_label: Optional[str] = None  # User role type for display
    role: Optional[str] = None        # Legacy role string

    class Config:
        from_attributes = True


class EmployeeResponse(EmployeeBase):
    """Schema risposta dipendente."""
    id: int
    base_points: int
    bonus_points: int
    malus_points: int
    is_active: bool
    created_at: datetime
    user: Optional[LinkedUserInfo] = None  # Dati utente collegato

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    """Schema lista dipendenti (leggero)."""
    id: int
    fiscal_code: Optional[str] = None  # Made optional - not used anymore
    first_name: str
    last_name: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None  # Reparto come testo
    current_role: Optional[str] = None
    secondary_role: Optional[str] = None
    default_banchina_id: Optional[int] = None
    contract_end: Optional[datetime] = None
    is_active: bool
    manager_id: Optional[int] = None
    co_manager_id: Optional[int] = None
    
    # Ultimo Evento (calcolato)
    last_event_label: Optional[str] = None
    last_event_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# DOCUMENT SCHEMAS
# ============================================================

class DocumentCreate(BaseModel):
    doc_type: str  # contract, id_card, permit, other
    doc_name: str


class DocumentResponse(BaseModel):
    id: int
    employee_id: int
    doc_type: str
    doc_name: str
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# CERTIFICATION SCHEMAS
# ============================================================

class CertificationCreate(BaseModel):
    cert_type: CertificationType
    cert_name: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None


class CertificationResponse(BaseModel):
    id: int
    employee_id: int
    cert_type: str
    cert_name: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None
    scan_path: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# TRAINING SCHEMAS
# ============================================================

class TrainingCreate(BaseModel):
    course_name: str
    course_description: Optional[str] = None
    trainer: Optional[str] = None
    training_date: datetime
    duration_hours: Optional[int] = None
    passed: bool = True
    notes: Optional[str] = None


class TrainingResponse(BaseModel):
    id: int
    employee_id: int
    course_name: str
    course_description: Optional[str] = None
    trainer: Optional[str] = None
    training_date: datetime
    duration_hours: Optional[int] = None
    passed: bool
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# MEDICAL EXAM SCHEMAS
# ============================================================

class MedicalExamCreate(BaseModel):
    exam_type: str  # periodic, hiring, return_to_work, on_request
    exam_date: datetime
    next_exam_date: Optional[datetime] = None
    outcome: Optional[MedicalOutcome] = None
    limitations: Optional[str] = None
    doctor_name: Optional[str] = None
    notes: Optional[str] = None


class MedicalExamResponse(BaseModel):
    id: int
    employee_id: int
    exam_type: str
    exam_date: datetime
    next_exam_date: Optional[datetime] = None
    outcome: Optional[str] = None
    limitations: Optional[str] = None
    doctor_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# LEAVE REQUEST SCHEMAS
# ============================================================

class RequesterInfo(BaseModel):
    """Minimal user info for requester display."""
    id: int
    username: str
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    hours: Optional[int] = None
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    """Schema per modificare una richiesta esistente."""
    leave_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    hours: Optional[float] = None
    reason: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: int
    employee_id: int
    leave_type: str
    start_date: datetime
    end_date: datetime
    hours: Optional[int] = None
    reason: Optional[str] = None
    status: str
    requested_at: datetime
    requested_by: Optional[int] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    requester: Optional[RequesterInfo] = None  # Who requested
    reviewer: Optional[RequesterInfo] = None   # Who reviewed

    class Config:
        from_attributes = True


class LeaveReviewRequest(BaseModel):
    """Schema per approvare/rifiutare richiesta."""
    status: LeaveStatus
    review_notes: Optional[str] = None


# ============================================================
# DISCIPLINARY SCHEMAS
# ============================================================

class DisciplinaryCreate(BaseModel):
    record_type: DisciplinaryType
    points_value: int
    description: str
    event_date: datetime


class DisciplinaryResponse(BaseModel):
    id: int
    employee_id: int
    record_type: str
    points_value: int
    description: str
    event_date: datetime
    status: str
    proposed_by: int
    proposed_at: datetime
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# NOTIFICATION SCHEMAS
# ============================================================

class NotificationResponse(BaseModel):
    id: int
    notif_type: str
    title: str
    message: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# FACTORY SCHEMAS
# ============================================================

class MachineType(str, Enum):
    forklift = "forklift"
    retractable = "retractable"
    ple = "ple"
    truck = "truck"
    production_line = "production_line"
    compressor = "compressor"
    other = "other"

class MachineStatus(str, Enum):
    operational = "operational"
    maintenance_scheduled = "maintenance_scheduled"
    breakdown = "breakdown"
    decommissioned = "decommissioned"

class ShiftType(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"

class DowntimeReason(str, Enum):
    no_material = "no_material"
    breakdown = "breakdown"
    setup = "setup"
    cleaning = "cleaning"
    software_error = "software_error"
    meeting = "meeting"
    other = "other"


class MachineCreate(BaseModel):
    name: str
    model: Optional[str] = None
    serial_number: Optional[str] = None
    machine_type: MachineType
    purchase_date: Optional[datetime] = None
    department_id: Optional[int] = None
    notes: Optional[str] = None


class MachineResponse(BaseModel):
    id: int
    name: str
    model: Optional[str] = None
    serial_number: Optional[str] = None
    machine_type: str
    status: str
    department_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MaintenanceCreate(BaseModel):
    maint_type: str  # preventive, corrective, revision, safety_check
    description: str
    due_date: Optional[datetime] = None
    cost: Optional[int] = None


class MaintenanceResponse(BaseModel):
    id: int
    machine_id: int
    maint_type: str
    description: str
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    status: str
    cost: Optional[int] = None

    class Config:
        from_attributes = True


class ProductionSessionCreate(BaseModel):
    machine_id: int
    session_date: datetime
    shift: ShiftType
    total_pieces: int = 0
    good_pieces: int = 0
    scrap_pieces: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class ProductionSessionResponse(BaseModel):
    id: int
    machine_id: int
    record_user_id: int
    session_date: datetime
    shift: str
    total_pieces: int
    good_pieces: int
    scrap_pieces: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DowntimeCreate(BaseModel):
    reason: DowntimeReason
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None


class DowntimeResponse(BaseModel):
    id: int
    session_id: int
    reason: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# TASK SCHEMAS
# ============================================================

class TaskStatus(str, Enum):
    pending = "pending"
    acknowledged = "acknowledged"
    in_progress = "in_progress"
    completed = "completed"

class ChecklistItem(BaseModel):
    text: str
    done: bool = False

class TaskCommentCreate(BaseModel):
    content: str

class TaskCommentResponse(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime
    # Extra
    author_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class TaskAttachmentResponse(BaseModel):
    id: int
    filename: str
    file_type: Optional[str]
    file_size: Optional[int]
    uploaded_by: int
    created_at: datetime
    # Extra
    uploader_name: Optional[str] = None
    download_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: int  # Mandatory now
    priority: int = 5 # 1-10
    deadline: Optional[datetime] = None
    checklist: Optional[list[ChecklistItem]] = []
    recurrence: Optional[str] = "none"
    category: Optional[str] = None
    tags: Optional[List[str]] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[int] = None
    deadline: Optional[datetime] = None
    checklist: Optional[list[ChecklistItem]] = None
    recurrence: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    reopen_reason: Optional[str] = None  # Reason for reverting to pending


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    assigned_by: int
    priority: int
    deadline: Optional[datetime] = None
    status: str
    checklist: Optional[list[ChecklistItem]] = []
    recurrence: Optional[str] = None
    
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[int] = None
    reopen_reason: Optional[str] = None
    
    # Locking
    locked_by: Optional[int] = None
    locked_at: Optional[datetime] = None
    locked_by_name: Optional[str] = None # Filled manually in router
    
    # Extra fields for UI
    author_name: Optional[str] = None
    completer_name: Optional[str] = None
    assignee_name: Optional[str] = None
    acknowledger_name: Optional[str] = None
    
    # V2
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    comments: List[TaskCommentResponse] = []
    attachments: List[TaskAttachmentResponse] = []

    class Config:
        from_attributes = True


# ============================================================
# EMPLOYEE EVENT SCHEMAS (Sistema Punteggio)
# ============================================================

class EventType(str, Enum):
    excellence = "excellence"           # +3
    praise = "praise"                   # +1
    verbal_warning = "verbal_warning"   # -2
    written_warning = "written_warning" # -3
    severe_infraction = "severe_infraction"  # -5


# Mapping tipo -> punteggio e label
EVENT_CONFIG = {
    "excellence": {"points": 3, "label": "🌟 Eccellenza (+3)"},
    "praise": {"points": 1, "label": "👍 Elogio (+1)"},
    "verbal_warning": {"points": -2, "label": "⚠️ Richiamo Verbale (-2)"},
    "written_warning": {"points": -3, "label": "📝 Ammonizione Scritta (-3)"},
    "severe_infraction": {"points": -5, "label": "🚨 Grave Infrazione (-5)"},
}


class EventCreate(BaseModel):
    employee_id: int
    event_type: str # Ora accetta l'ID del tipo evento come stringa
    description: Optional[str] = None
    event_date: datetime


class EventUpdate(BaseModel):
    description: Optional[str] = None
    points: Optional[int] = None
    event_date: Optional[datetime] = None


class EventReview(BaseModel):
    status: str  # approved, rejected
    rejection_reason: Optional[str] = None


class EmployeeMinInfo(BaseModel):
    """Minimal employee info for event display."""
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


class CreatorInfo(BaseModel):
    """Minimal user info for creator display."""
    id: int
    username: str
    full_name: Optional[str] = None
    first_name: Optional[str] = None  # Derived from full_name

    class Config:
        from_attributes = True


class EventResponse(BaseModel):
    id: int
    employee_id: int
    event_type: str
    event_label: str
    points: int
    description: Optional[str] = None
    event_date: datetime
    created_by: int
    created_at: datetime
    status: str
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    creator: Optional[CreatorInfo] = None  # Nested creator info
    approver: Optional[CreatorInfo] = None # Nested approver info
    employee: Optional[EmployeeMinInfo] = None  # Nested employee info for display

    class Config:
        from_attributes = True


# ============================================================
# EMPLOYEE BADGE SCHEMAS
# ============================================================

# Definizione badge disponibili
BADGE_DEFINITIONS = {
    # Badge POSITIVI
    "rookie_star": {"name": "Rookie Star", "icon": "⭐", "type": "positive", "condition": "Prima eccellenza"},
    "high_performer": {"name": "High Performer", "icon": "🚀", "type": "positive", "condition": "Punteggio ≥ +10"},
    "excellence_master": {"name": "Excellence Master", "icon": "🏅", "type": "positive", "condition": "5 eccellenze totali"},
    "iron_man": {"name": "Iron Man", "icon": "🛡️", "type": "positive", "condition": "30gg senza negativi"},
    "golden_year": {"name": "Golden Year", "icon": "👑", "type": "positive", "condition": "1 anno senza richiami"},
    "team_player": {"name": "Team Player", "icon": "🤝", "type": "positive", "condition": "3 elogi in un mese"},
    # Badge NEGATIVI
    "warning_zone": {"name": "Warning Zone", "icon": "⚠️", "type": "negative", "condition": "Punteggio ≤ -5"},
    "red_alert": {"name": "Red Alert", "icon": "🚨", "type": "negative", "condition": "Punteggio ≤ -10"},
    "repeat_offender": {"name": "Repeat Offender", "icon": "🔄", "type": "negative", "condition": "3 richiami in 30gg"},
    "critical_watch": {"name": "Critical Watch", "icon": "👁️", "type": "negative", "condition": "2 gravi infrazioni"},
    "probation": {"name": "Probation", "icon": "⛔", "type": "negative", "condition": "5 negativi in 3 mesi"},
}


class BadgeResponse(BaseModel):
    id: int
    employee_id: int
    badge_code: str
    badge_name: str
    badge_icon: str
    badge_type: str
    earned_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================
# FACILITY MAINTENANCE SCHEMAS
# ============================================================

class FacilityCategory(str, Enum):
    air_system = "air_system"
    shelving = "shelving"
    hvac = "hvac"
    pest_control = "pest_control"
    fire_safety = "fire_safety"
    other = "other"

class FacilitySTATUS(str, Enum):
    scheduled = "scheduled"
    completed = "completed"
    overdue = "overdue"

class FacilityMaintenanceCreate(BaseModel):
    name: str
    category: FacilityCategory
    provider_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    due_date: datetime
    recurrence_months: int = 12
    notes: Optional[str] = None

class FacilityMaintenanceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[FacilityCategory] = None
    provider_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    due_date: Optional[datetime] = None
    last_date: Optional[datetime] = None
    recurrence_months: Optional[int] = None
    status: Optional[FacilitySTATUS] = None
    notes: Optional[str] = None

class FacilityMaintenanceResponse(BaseModel):
    id: int
    name: str
    category: str
    provider_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    last_date: Optional[datetime] = None
    due_date: datetime
    recurrence_months: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# LIVE PRODUCTION SCHEMAS (Picking List)
# ============================================================

class ProductionMaterialCreate(BaseModel):
    category: str
    label: str
    value: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class ProductionMaterialResponse(ProductionMaterialCreate):
    id: int

    class Config:
        from_attributes = True

class ProductionMaterialUpdate(BaseModel):
    category: Optional[str] = None
    label: Optional[str] = None
    value: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class BlockRequestCreate(BaseModel):
    request_type: str  # memory, sponge
    target_sector: Optional[str] = None # pantografo, giostra
    material_id: Optional[int] = None
    density_id: Optional[int] = None
    color_id: Optional[int] = None
    dimensions: str
    custom_height: Optional[int] = None
    is_trimmed: bool = False
    quantity: int = 1
    client_ref: Optional[str] = None
    supplier_id: Optional[int] = None
    notes: Optional[str] = None

class BlockRequestUpdate(BaseModel):
    """Per cambi stato"""
    status: Optional[str] = None  # processing, delivered, cancelled
    notes: Optional[str] = None

class BlockRequestResponse(BlockRequestCreate):
    id: int
    status: str
    created_by_id: int
    created_at: datetime
    processed_by_id: Optional[int] = None
    processed_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    
    # Extra for UI - Populated via Model Properties
    target_sector: Optional[str] = None
    material_label: Optional[str] = None
    density_label: Optional[str] = None
    color_label: Optional[str] = None
    supplier_label: Optional[str] = None
    creator_name: Optional[str] = None
    processor_name: Optional[str] = None

    # class Config:
    #     from_attributes = True
