from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Import Base and ALL models to ensure they are registered in metadata
from models.base import Base
from models.core import Role, User, Department, AuditLog, Notification, Announcement
from models.hr import (
    Employee, EmployeeDocument, EmployeeCertification, EmployeeTraining, 
    MedicalExam, LeaveRequest, DisciplinaryRecord, EmployeeEvent, EmployeeBadge,
    MedicalExamType, TrainingType, EventType, Bonus
)
from models.tasks import Task, TaskComment, TaskAttachment
from models.factory import Banchina, Machine, MachineMaintenance, FacilityMaintenance
from models.fleet import FleetVehicle, MaintenanceTicket
from models.shifts import ShiftRequirement, ShiftAssignment
from models.production import (
    ProductionSession, DowntimeLog, ProductionEntry, 
    MachineDowntime, KpiConfig, KpiEntry, SessionOperator,
    DowntimeReason, ProductionMaterial, BlockRequest
)
from models.logistics import ReturnTicket
from models.maintenance import MaintenanceRequest
from models.chat import Conversation, ConversationMember, Message, PushSubscription

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency per ottenere sessione DB."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Crea tutte le tabelle nel database."""
    Base.metadata.create_all(bind=engine)
