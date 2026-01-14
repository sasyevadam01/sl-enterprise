"""
SL Enterprise - Chat Router
API endpoints per messaggistica interna.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db, User
from models.chat import Conversation, ConversationMember, Message, PushSubscription
from security import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])


# ============================================================
# SCHEMAS
# ============================================================

class ConversationCreate(BaseModel):
    """Crea nuova conversazione."""
    type: str = "direct"  # 'direct' o 'group'
    name: Optional[str] = None  # Nome gruppo (opzionale)
    member_ids: List[int]  # ID utenti da aggiungere


class MessageCreate(BaseModel):
    """Invia nuovo messaggio."""
    content: str
    message_type: str = "text"
    reply_to_id: Optional[int] = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: Optional[str] = None
    content: str
    message_type: str
    reply_to_id: Optional[int] = None
    created_at: datetime
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    can_delete: bool = False

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    type: str
    name: Optional[str] = None
    created_at: datetime
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    members: List[dict] = []

    class Config:
        from_attributes = True


class MemberInfo(BaseModel):
    user_id: int
    username: str
    full_name: Optional[str] = None
    role: str


# ============================================================
# CONVERSATIONS
# ============================================================

@router.get("/conversations", summary="Lista Conversazioni")
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni lista conversazioni dell'utente corrente."""
    # Trova tutte le conversazioni dove l'utente è membro
    memberships = db.query(ConversationMember).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    
    conv_ids = [m.conversation_id for m in memberships]
    membership_map = {m.conversation_id: m for m in memberships}
    
    if not conv_ids:
        return []
    
    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conv_ids)
    ).all()
    
    result = []
    for conv in conversations:
        # Ultimo messaggio
        last_msg = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.deleted_at == None
        ).order_by(desc(Message.created_at)).first()
        
        # Conteggio non letti
        membership = membership_map.get(conv.id)
        unread = 0
        if membership and membership.last_read_at:
            unread = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.created_at > membership.last_read_at,
                Message.sender_id != current_user.id,
                Message.deleted_at == None
            ).count()
        
        # Membri
        members = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id
        ).all()
        
        member_list = []
        display_name = conv.name
        for m in members:
            user = db.query(User).filter(User.id == m.user_id).first()
            if user:
                member_list.append({
                    "user_id": user.id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "role": m.role
                })
                # Per chat dirette, usa il nome dell'altro utente
                if conv.type == "direct" and user.id != current_user.id:
                    display_name = user.full_name or user.username
        
        result.append({
            "id": conv.id,
            "type": conv.type,
            "name": display_name,
            "created_at": conv.created_at,
            "last_message": last_msg.content[:50] if last_msg else None,
            "last_message_at": last_msg.created_at if last_msg else None,
            "unread_count": unread,
            "members": member_list
        })
    
    # Ordina per ultimo messaggio
    result.sort(key=lambda x: x["last_message_at"] or x["created_at"], reverse=True)
    return result


@router.post("/conversations", summary="Nuova Conversazione")
async def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea nuova conversazione (1-to-1 o gruppo)."""
    # Per chat diretta, verifica se esiste già
    if data.type == "direct" and len(data.member_ids) == 1:
        other_user_id = data.member_ids[0]
        
        # Cerca conversazione diretta esistente tra i due utenti
        existing = db.query(Conversation).join(ConversationMember).filter(
            Conversation.type == "direct"
        ).filter(
            Conversation.id.in_(
                db.query(ConversationMember.conversation_id).filter(
                    ConversationMember.user_id == current_user.id
                )
            )
        ).filter(
            Conversation.id.in_(
                db.query(ConversationMember.conversation_id).filter(
                    ConversationMember.user_id == other_user_id
                )
            )
        ).first()
        
        if existing:
            return {"id": existing.id, "existing": True}
    
    # Crea nuova conversazione
    conv = Conversation(
        type=data.type,
        name=data.name if data.type == "group" else None,
        created_by=current_user.id
    )
    db.add(conv)
    db.flush()  # Per ottenere l'ID
    
    # Aggiungi creatore come admin
    creator_member = ConversationMember(
        conversation_id=conv.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(creator_member)
    
    # Aggiungi altri membri
    for user_id in data.member_ids:
        if user_id != current_user.id:
            member = ConversationMember(
                conversation_id=conv.id,
                user_id=user_id,
                role="member"
            )
            db.add(member)
    
    db.commit()
    return {"id": conv.id, "existing": False}


@router.get("/conversations/{conv_id}/messages", summary="Messaggi Conversazione")
async def get_messages(
    conv_id: int,
    limit: int = Query(50, le=100),
    before_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni messaggi di una conversazione con paginazione."""
    # Verifica accesso
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Non sei membro di questa conversazione")
    
    query = db.query(Message).filter(
        Message.conversation_id == conv_id
    )
    
    if before_id:
        query = query.filter(Message.id < before_id)
    
    messages = query.order_by(desc(Message.created_at)).limit(limit).all()
    
    # Aggiorna last_read_at
    membership.last_read_at = datetime.utcnow()
    db.commit()
    
    result = []
    for msg in reversed(messages):  # Ordine cronologico
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "sender_name": sender.full_name if sender else "Unknown",
            "content": "[Messaggio eliminato]" if msg.deleted_at else msg.content,
            "message_type": msg.message_type,
            "reply_to_id": msg.reply_to_id,
            "created_at": msg.created_at,
            "edited_at": msg.edited_at,
            "deleted_at": msg.deleted_at,
            "can_delete": msg.can_delete and msg.sender_id == current_user.id
        })
    
    return result


@router.post("/conversations/{conv_id}/messages", summary="Invia Messaggio")
async def send_message(
    conv_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invia un nuovo messaggio."""
    # Verifica accesso
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Non sei membro di questa conversazione")
    
    # Verifica reply_to esiste
    if data.reply_to_id:
        reply_msg = db.query(Message).filter(
            Message.id == data.reply_to_id,
            Message.conversation_id == conv_id
        ).first()
        if not reply_msg:
            raise HTTPException(status_code=400, detail="Messaggio di risposta non trovato")
    
    # Crea messaggio
    message = Message(
        conversation_id=conv_id,
        sender_id=current_user.id,
        content=data.content,
        message_type=data.message_type,
        reply_to_id=data.reply_to_id
    )
    db.add(message)
    
    # Aggiorna last_read_at del mittente
    membership.last_read_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    # TODO: Invia notifiche push agli altri membri
    
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_name": current_user.full_name,
        "content": message.content,
        "message_type": message.message_type,
        "created_at": message.created_at,
        "can_delete": True
    }


@router.delete("/messages/{msg_id}", summary="Elimina Messaggio")
async def delete_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina un messaggio (solo entro 2 minuti)."""
    message = db.query(Message).filter(Message.id == msg_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Puoi eliminare solo i tuoi messaggi")
    
    if not message.can_delete:
        raise HTTPException(status_code=400, detail="Tempo scaduto per la cancellazione (max 2 minuti)")
    
    message.deleted_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Messaggio eliminato"}


@router.patch("/conversations/{conv_id}/read", summary="Marca Come Letto")
async def mark_as_read(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca tutti i messaggi come letti."""
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id,
        ConversationMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Non sei membro di questa conversazione")
    
    membership.last_read_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Conversazione marcata come letta"}


# ============================================================
# CONTATTI / UTENTI
# ============================================================

@router.get("/contacts", summary="Lista Contatti")
async def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista utenti disponibili per chattare."""
    users = db.query(User).filter(
        User.id != current_user.id,
        User.is_active == True
    ).all()
    
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role
        }
        for u in users
    ]


# ============================================================
# CONTEGGIO NON LETTI (per badge sidebar)
# ============================================================

@router.get("/unread-count", summary="Totale Non Letti")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Conteggio totale messaggi non letti per badge."""
    memberships = db.query(ConversationMember).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    
    total = 0
    for m in memberships:
        if m.last_read_at:
            count = db.query(Message).filter(
                Message.conversation_id == m.conversation_id,
                Message.created_at > m.last_read_at,
                Message.sender_id != current_user.id,
                Message.deleted_at == None
            ).count()
            total += count
    
    return {"unread": total}


# ============================================================
# WEBSOCKET ENDPOINT
# ============================================================

from fastapi import WebSocket, WebSocketDisconnect
from websocket_manager import get_chat_manager
import json

@router.websocket("/ws/{user_id}")
async def chat_websocket(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(None)
):
    """
    WebSocket endpoint per chat real-time.
    
    Messaggi in entrata:
    - {"type": "join", "conversation_id": 123}
    - {"type": "leave", "conversation_id": 123}
    - {"type": "typing", "conversation_id": 123, "is_typing": true}
    - {"type": "message", "conversation_id": 123, "content": "Hello"}
    
    Messaggi in uscita:
    - {"type": "new_message", "message": {...}}
    - {"type": "typing", "user_id": 1, "user_name": "Mario", "is_typing": true}
    - {"type": "message_deleted", "message_id": 123}
    """
    # TODO: Validare token JWT per sicurezza
    # Per ora accettiamo la connessione (il frontend invia user_id)
    
    manager = get_chat_manager()
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            conv_id = data.get("conversation_id")
            
            if msg_type == "join" and conv_id:
                manager.set_viewing(user_id, conv_id)
                
            elif msg_type == "leave" and conv_id:
                manager.unset_viewing(user_id, conv_id)
                
            elif msg_type == "typing" and conv_id:
                # Ottieni membri della conversazione
                from database import SessionLocal
                db = SessionLocal()
                try:
                    members = db.query(ConversationMember).filter(
                        ConversationMember.conversation_id == conv_id
                    ).all()
                    member_ids = [m.user_id for m in members]
                    
                    # Ottieni nome utente
                    user = db.query(User).filter(User.id == user_id).first()
                    user_name = user.full_name if user else "Unknown"
                    
                    await manager.notify_typing(
                        conv_id, 
                        member_ids, 
                        user_id, 
                        user_name, 
                        data.get("is_typing", False)
                    )
                finally:
                    db.close()
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"[WS] Error: {e}")
        manager.disconnect(websocket, user_id)


# Helper per broadcast da altri endpoint
async def broadcast_new_message(conv_id: int, message_data: dict, member_ids: list, sender_id: int):
    """Invia notifica nuovo messaggio a tutti i membri connessi."""
    manager = get_chat_manager()
    await manager.broadcast_to_conversation(
        conv_id,
        member_ids,
        {
            "type": "new_message",
            "message": message_data
        },
        exclude_user=sender_id
    )

