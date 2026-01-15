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
