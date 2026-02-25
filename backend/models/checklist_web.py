"""
CheckList Web — Modello per il controllo giornaliero clienti.
Ogni riga rappresenta un cliente per un giorno specifico.
"""
from sqlalchemy import Column, Integer, String, Date, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .base import Base


class ChecklistWebEntry(Base):
    """Singola riga della checklist giornaliera (1 cliente per giorno)."""
    __tablename__ = "checklist_web"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False, index=True)
    cliente = Column(String(100), nullable=False)
    checked = Column(Boolean, default=False, nullable=False)
    nota = Column(Text, nullable=True)
    account_id = Column(Integer, ForeignKey("users.id", onupdate="CASCADE", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, nullable=True)

    # Relazione per ottenere il nome dell'operatore
    operator = relationship("User", foreign_keys=[account_id], lazy="joined")
