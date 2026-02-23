"""
SL Enterprise - Logistics Schemas
Pydantic models per API Richiesta Materiale
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ============================================================
# MATERIAL TYPES
# ============================================================

class LogisticsMaterialTypeBase(BaseModel):
    label: str
    icon: str = "📦"
    category: str = "altro"
    requires_description: bool = False
    is_active: bool = True
    display_order: int = 0
    base_points: int = 0


class LogisticsMaterialTypeCreate(LogisticsMaterialTypeBase):
    pass


class LogisticsMaterialTypeUpdate(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    requires_description: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    base_points: Optional[int] = None


class LogisticsMaterialTypeResponse(LogisticsMaterialTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# LOGISTICS REQUESTS
# ============================================================

class LogisticsRequestCreate(BaseModel):
    material_type_id: int
    custom_description: Optional[str] = None
    quantity: int = 1
    unit_of_measure: str = "pz"
    banchina_id: Optional[int] = None  # Se None, usa default_banchina dell'utente
    require_otp: bool = False


class LogisticsRequestTake(BaseModel):
    """Schema per prendere in carico una richiesta."""
    promised_eta_minutes: int
    mode: Optional[str] = "delivering"  # "delivering" | "preparing"


class LogisticsRequestComplete(BaseModel):
    """Schema per completare una richiesta."""
    notes: Optional[str] = None
    confirmation_code: Optional[str] = None


class LogisticsRequestEditPoints(BaseModel):
    """Schema per modificare punteggi dalla Control Room."""
    points_awarded: Optional[int] = None
    penalty_applied: Optional[int] = None


class LogisticsRequestResponse(BaseModel):
    id: int
    
    # Material
    material_type_id: int
    material_type_label: Optional[str] = None
    material_type_icon: Optional[str] = None
    custom_description: Optional[str] = None
    quantity: int
    unit_of_measure: Optional[str] = "pz"
    
    # Location
    banchina_id: int
    banchina_code: Optional[str] = None
    banchina_name: Optional[str] = None
    
    # Requester
    requester_id: int
    requester_name: Optional[str] = None
    
    # Status
    status: str
    is_urgent: bool
    
    # Assignment
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    is_forced_assignment: bool
    
    # ETA
    promised_eta_minutes: Optional[int] = None
    
    # Secure Delivery
    confirmation_code: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    taken_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    urgency_requested_at: Optional[datetime] = None
    
    # Gamification
    points_awarded: int = 0
    penalty_applied: int = 0
    eta_respected: Optional[bool] = None
    
    # Computed
    wait_time_seconds: Optional[float] = None
    is_overdue: Optional[bool] = None
    
    # Preparazione
    prepared_by_id: Optional[int] = None
    prepared_by_name: Optional[str] = None
    prepared_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LogisticsRequestListResponse(BaseModel):
    """Lista richieste con paginazione."""
    items: List[LogisticsRequestResponse]
    total: int
    pending_count: int
    urgent_count: int


# ============================================================
# MESSAGES
# ============================================================

class LogisticsMessageCreate(BaseModel):
    content: str
    message_type: str = "custom"  # preset, custom


class LogisticsMessageResponse(BaseModel):
    id: int
    request_id: int
    sender_id: int
    sender_name: Optional[str] = None
    message_type: str
    content: str
    sent_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LogisticsPresetMessageCreate(BaseModel):
    content: str
    icon: str = "💬"
    is_active: bool = True
    display_order: int = 0


class LogisticsPresetMessageUpdate(BaseModel):
    content: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class LogisticsPresetMessageResponse(BaseModel):
    id: int
    content: str
    icon: str
    is_active: bool
    display_order: int

    class Config:
        from_attributes = True


# ============================================================
# ETA OPTIONS
# ============================================================

class LogisticsEtaOptionCreate(BaseModel):
    minutes: int
    label: str
    is_active: bool = True
    display_order: int = 0


class LogisticsEtaOptionUpdate(BaseModel):
    minutes: Optional[int] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class LogisticsEtaOptionResponse(BaseModel):
    id: int
    minutes: int
    label: str
    is_active: bool
    display_order: int

    class Config:
        from_attributes = True


# ============================================================
# PERFORMANCE
# ============================================================

class LogisticsPerformanceResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    month: int
    year: int
    
    missions_completed: int
    missions_urgent: int
    missions_released: int
    
    total_points: int
    penalties_received: int
    
    avg_reaction_seconds: Optional[int] = None
    fastest_reaction_seconds: Optional[int] = None
    eta_accuracy_percent: Optional[float] = None
    urgency_requests_received: int
    
    # Computed
    net_points: Optional[int] = None  # total_points - penalties_received

    class Config:
        from_attributes = True


class LogisticsLeaderboardEntry(BaseModel):
    """Entry per la classifica mensile."""
    rank: int
    employee_id: int
    employee_name: str
    missions_completed: int
    total_points: int
    penalties_received: int
    net_points: int
    avg_reaction_seconds: Optional[int] = None


class LogisticsLeaderboardResponse(BaseModel):
    month: int
    year: int
    entries: List[LogisticsLeaderboardEntry]


# ============================================================
# CONFIG
# ============================================================

class LogisticsConfigUpdate(BaseModel):
    config_value: str


class LogisticsConfigResponse(BaseModel):
    config_key: str
    config_value: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class LogisticsConfigBulk(BaseModel):
    """Configurazioni complete del sistema."""
    points_base_mission: int = 1
    points_urgent_mission: int = 2
    points_super_speed_bonus: int = 1
    points_save_abandoned: int = 1
    
    penalty_late_light: int = 1      # 1-5 min
    penalty_late_medium: int = 2      # 5-15 min
    penalty_late_severe: int = 3      # >15 min
    penalty_release_task: int = 1
    penalty_urgency_received: int = 1
    
    threshold_late_light_minutes: int = 5
    threshold_late_medium_minutes: int = 15
    threshold_sla_warning_minutes: int = 3


# ============================================================
# REPORTS
# ============================================================

class LogisticsDailyStats(BaseModel):
    """Statistiche giornaliere."""
    date: str
    total_requests: int
    completed_requests: int
    pending_requests: int
    urgent_requests: int
    avg_wait_time_seconds: Optional[float] = None
    sla_respected_percent: Optional[float] = None


class LogisticsBanchinaStats(BaseModel):
    """Statistiche per banchina."""
    banchina_id: int
    banchina_code: str
    banchina_name: Optional[str] = None
    total_requests: int
    top_material_type: Optional[str] = None


class LogisticsHourlyHeatmap(BaseModel):
    """Heatmap oraria."""
    hour: int  # 0-23
    request_count: int
    avg_wait_time_seconds: Optional[float] = None
