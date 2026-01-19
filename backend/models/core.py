from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Role(Base):
    """Ruoli applicativi con matrice permessi (JSON)."""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)   # es. "coordinator"
    label = Column(String(100), nullable=False)              # es. "Coordinatore"
    description = Column(String(255), nullable=True)
    is_static = Column(Boolean, default=False)               # Se True, non modificabile
    permissions = Column(JSON, default=[])                   # Lista permessi ["view_dash", "manage_shifts"]
    default_home = Column(String(100), default="/hr/tasks")  # Pagina iniziale dopo login
    
    users = relationship("User", back_populates="role_obj")


class User(Base):
    """Utenti del sistema con ruoli e permessi."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    
    # RBAC Update
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role_obj = relationship("Role", back_populates="users")
    
    # Legacy/Cache (optional, keep for safety or remove later)
    role = Column(String(20), default='record_user') 
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, nullable=True)  # Per monitor online
    
    # Relazioni
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    # One-to-One with Employee
    employee = relationship("Employee", back_populates="user", uselist=False)
    
    @property
    def employee_id(self):
        """Ritorna ID dipendente collegato (se esiste)."""
        return self.employee.id if hasattr(self, 'employee') and self.employee else None

    @property
    def role_label(self):
        """Ritorna etichetta ruolo per display (con fallback su legacy role)."""
        if self.role_obj:
            return self.role_obj.label
            
        # Fallback mapping per ruoli legacy/stringa
        ROLE_LABELS = {
            "super_admin": "Super Admin",
            "admin": "Amministratore",
            "hr_manager": "HR Manager",
            "factory_controller": "Responsabile Fabbrica",
            "coordinator": "Coordinatore",
            "record_user": "Utente Base"
        }
        return ROLE_LABELS.get(self.role, self.role)

    @property
    def permissions(self):
        """Ritorna permessi (da Role object o fallback legacy)."""
        if self.role_obj:
            return self.role_obj.permissions
        
        # Fallback LEGACY mappings (Sync with Sidebar.jsx)
        PERMISSIONS_MAP = {
            'super_admin': ['*'],
            'admin': ['view_dashboard', 'manage_employees', 'manage_attendance', 'view_hr_calendar', 'request_events', 'manage_tasks', 'manage_shifts', 'view_announcements', 'access_factory', 'manage_kpi', 'access_logistics', 'admin_users', 'admin_config', 'admin_audit'],
            'hr_manager': ['view_dashboard', 'manage_employees', 'manage_attendance', 'view_hr_calendar', 'request_events', 'manage_tasks', 'manage_shifts', 'view_announcements'],
            'coordinator': ['manage_shifts', 'manage_tasks', 'view_announcements', 'request_events'],
            'factory_controller': ['access_factory', 'manage_kpi', 'view_dashboard'],
            'record_user': []
        }
        return PERMISSIONS_MAP.get(self.role, [])

    @property
    def default_home(self):
        """Ritorna la pagina iniziale dal ruolo (o fallback)."""
        if self.role_obj and self.role_obj.default_home:
            return self.role_obj.default_home
        
        # Fallback per ruoli legacy
        HOME_MAP = {
            'super_admin': '/dashboard',
            'admin': '/dashboard',
            'hr_manager': '/dashboard',
            'factory_controller': '/hr/tasks',
            'coordinator': '/hr/tasks',
            'record_user': '/mobile/dashboard',
            'order_user': '/production/orders',      # <-- Added
            'block_supply': '/production/blocks'     # <-- Added
        }
        return HOME_MAP.get(self.role, '/hr/tasks')

    def has_permission(self, perm: str) -> bool:
        """Verifica se l'utente ha un permesso specifico."""
        perms = self.permissions # usa la property che gestisce anche i legacy roles
        if '*' in perms:
            return True
        return perm in perms


class Department(Base):
    """Reparti aziendali (es. Saldatura, Logistica)."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    cost_center = Column(String(20), nullable=True)
    
    # Relazioni
    users = relationship("User", back_populates="department")
    # Backref from Employee in hr.py will add 'employees' relationship here if needed, or we define it:
    # employees = relationship("Employee", back_populates="department") 
    # But Employee is in another file. String reference works.
    employees = relationship("Employee", back_populates="department")


class AuditLog(Base):
    """Log delle azioni critiche - La 'Scatola Nera' del sistema."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)  # Es. 'DELETE_EMPLOYEE', 'LOGIN_SUCCESS'
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    user = relationship("User", back_populates="audit_logs")


class Notification(Base):
    """Centro notifiche."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_role = Column(String(20), nullable=True)  # Se notifica per ruolo
    
    notif_type = Column(String(30), nullable=False)  # alert, approval_req, expiry_warning, info
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    link_url = Column(String(255), nullable=True)
    
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)


class Announcement(Base):
    """Bacheca annunci aziendali - Solo Admin può creare."""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default='info')  # urgent, important, info
    
    # Autore e workflow
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Stato
    is_active = Column(Boolean, default=True)  # False = archiviato
    expires_at = Column(DateTime, nullable=True)  # Scadenza opzionale
    
    # Relazioni
    author = relationship("User", backref="announcements")
