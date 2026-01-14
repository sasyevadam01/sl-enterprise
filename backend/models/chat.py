"""
SL Enterprise - Chat Models
Sistema messaggistica interna con supporto 1-to-1 e gruppi.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class Conversation(Base):
    """Conversazione chat (1-to-1 o gruppo)."""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Tipo: 'direct' per 1-to-1, 'group' per gruppi
    type = Column(String(20), default='direct', nullable=False)
    
    # Nome gruppo (NULL per chat dirette)
    name = Column(String(100), nullable=True)
    
    # Chi ha creato la conversazione
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationMember(Base):
    """Membro di una conversazione."""
    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Ruolo: 'admin' (può modificare gruppo), 'member'
    role = Column(String(20), default='member')
    
    # Timestamp ultima lettura (per calcolo non letti)
    last_read_at = Column(DateTime, default=datetime.utcnow)
    
    # Silenziato fino a (NULL = non silenziato)
    muted_until = Column(DateTime, nullable=True)

    # Ban temporaneo (Timeout) - Non può scrivere
    banned_until = Column(DateTime, nullable=True)
    
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relazioni
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User")
    
    # Indice unico per evitare duplicati
    __table_args__ = (
        Index('ix_conv_member_unique', 'conversation_id', 'user_id', unique=True),
    )


class Message(Base):
    """Messaggio chat."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Contenuto
    content = Column(Text, nullable=False)
    
    # Tipo: 'text', 'image', 'file', 'system'
    message_type = Column(String(20), default='text')
    
    # URL allegato (se presente)
    attachment_url = Column(String(500), nullable=True)
    
    # Risposta a un altro messaggio
    reply_to_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    edited_at = Column(DateTime, nullable=True)
    
    # Soft delete (NULL = non cancellato)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relazioni
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    reply_to = relationship("Message", remote_side=[id])
    
    @property
    def is_deleted(self):
        return self.deleted_at is not None
    
    @property
    def can_delete(self):
        """Può essere cancellato solo entro 2 minuti."""
        if self.deleted_at:
            return False
        elapsed = (datetime.utcnow() - self.created_at).total_seconds()
        return elapsed <= 120  # 2 minuti


class PushSubscription(Base):
    """Subscription per notifiche push Web."""
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Endpoint del push service (fornito dal browser)
    endpoint = Column(Text, nullable=False)
    
    # Chiavi crittografiche
    p256dh_key = Column(Text, nullable=False)
    auth_key = Column(Text, nullable=False)
    
    # User agent per identificare dispositivo
    user_agent = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relazioni
    user = relationship("User")
    
    # Indice per evitare duplicati stesso endpoint
    __table_args__ = (
        Index('ix_push_endpoint', 'endpoint', unique=True),
    )
