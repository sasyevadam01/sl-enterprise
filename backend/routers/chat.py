"""
SL Enterprise - Chat Router
API endpoints per messaggistica interna.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload, subqueryload
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

def _get_unread_count(db: Session, conv_id: int, user_id: int, last_read_at: datetime) -> int:
    """Helper condiviso per contare messaggi non letti."""
    if not last_read_at:
        return 0
        
    count = db.query(Message).filter(
        Message.conversation_id == conv_id,
        Message.created_at > last_read_at,
        Message.sender_id != user_id,
        Message.deleted_at == None
    ).count()
    
    return count

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
        if membership:
             unread = _get_unread_count(db, conv.id, current_user.id, membership.last_read_at)
        
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
    
    # BAN CHECK: Verifica se l'utente è silenziato
    if membership.banned_until and membership.banned_until > datetime.utcnow():
        remaining = int((membership.banned_until - datetime.utcnow()).total_seconds())
        raise HTTPException(status_code=403, detail=f"Sei stato silenziato temporaneamente. Attendi {remaining} secondi.")

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
    """Elimina un messaggio (SuperAdmin cancella TUTTO e SEMPRE)."""
    message = db.query(Message).filter(Message.id == msg_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    
    # Check permessi Admin
    is_admin = current_user.role in ['super_admin', 'admin']
    
    if not is_admin:
        # Regole normali
        if message.sender_id != current_user.id:
            raise HTTPException(status_code=403, detail="Puoi eliminare solo i tuoi messaggi")
        
        if not message.can_delete:
            raise HTTPException(status_code=400, detail="Tempo scaduto per la cancellazione (max 2 minuti)")
    
    message.deleted_at = datetime.utcnow()
    db.commit()
    
    # Notifica via WebSocket che il messaggio è cancellato
    try:
        members = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == message.conversation_id
        ).all()
        member_ids = [m.user_id for m in members]
        
        manager = get_chat_manager()
        await manager.broadcast_to_conversation(
            message.conversation_id,
            member_ids,
            {"type": "message_deleted", "message_id": msg_id}
        )
    except Exception as e:
        print(f"[WS] Errore broadcast delete: {e}")

    return {"message": "Messaggio eliminato"}

# NUOVI ENDPOINT MODERAZIONE

class BanRequest(BaseModel):
    user_id: int
    duration_minutes: int = 1

@router.post("/conversations/{conv_id}/ban", summary="Timeout Utente (Admin)")
async def timeout_user(
    conv_id: int,
    data: BanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Silenzia un utente nella chat per X minuti (Solo Admin)."""
    if current_user.role not in ['super_admin', 'admin']:
        raise HTTPException(status_code=403, detail="Solo gli admin possono bannare.")
        
    target_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv_id,
        ConversationMember.user_id == data.user_id
    ).first()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Utente non trovato nella chat")
        
    until = datetime.utcnow() + timedelta(minutes=data.duration_minutes)
    target_member.banned_until = until
    db.commit()
    
    return {"message": f"Utente silenziato per {data.duration_minutes} minuti"}

@router.delete("/conversations/{conv_id}", summary="Elimina/Chiudi Gruppo (Admin)")
async def delete_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chiude definitivamente una conversazione (Admin cancella QUALSIASI gruppo)."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Chat non trovata")
        
    is_admin = current_user.role in ['super_admin', 'admin']
    is_creator = conv.created_by == current_user.id
    
    if not (is_admin or is_creator):
         raise HTTPException(status_code=403, detail="Non hai i permessi per chiudere questa chat")
         
    # Cancellazione a cascata (gestita da DB se Cascade c'è, altrimenti manuale)
    # Assumiamo SQLAlchemy cascade impostato sui modelli, ma per sicurezza cancelliamo messaggi e membri
    db.query(Message).filter(Message.conversation_id == conv_id).delete()
    db.query(ConversationMember).filter(ConversationMember.conversation_id == conv_id).delete()
    db.delete(conv)
    db.commit()
    
    return {"message": "Conversazione eliminata"}


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


# ============================================================
# PUSH NOTIFICATIONS
# ============================================================

from push_service import get_vapid_public_key, send_chat_notification

class PushSubscriptionCreate(BaseModel):
    """Registra subscription push."""
    endpoint: str
    p256dh: str
    auth: str
    user_agent: Optional[str] = None


@router.get("/push/vapid-key", summary="Chiave VAPID Pubblica")
async def get_public_key():
    """Ritorna la chiave pubblica VAPID per il frontend."""
    return {"publicKey": get_vapid_public_key()}


@router.post("/push/subscribe", summary="Registra Push Subscription")
async def subscribe_push(
    data: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra una subscription per notifiche push."""
    # Verifica se esiste già
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == data.endpoint
    ).first()
    
    if existing:
        # Aggiorna
        existing.user_id = current_user.id
        existing.p256dh_key = data.p256dh
        existing.auth_key = data.auth
        existing.user_agent = data.user_agent
        existing.last_used_at = datetime.utcnow()
    else:
        # Crea nuova
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=data.endpoint,
            p256dh_key=data.p256dh,
            auth_key=data.auth,
            user_agent=data.user_agent
        )
        db.add(sub)
    
    db.commit()
    return {"message": "Subscription registrata"}


@router.delete("/push/unsubscribe", summary="Rimuovi Push Subscription")
async def unsubscribe_push(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rimuove una subscription push."""
    sub = db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == current_user.id
    ).first()
    
    if sub:
        db.delete(sub)
        db.commit()
    
    return {"message": "Subscription rimossa"}


@router.get("/notifications/summary", response_model=dict)
async def get_chat_notifications_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ritorna conteggio messaggi non letti per ogni conversazione.
    Usato per badge sidebar e campanella notifiche.
    """
    try:
        # LOGICA COPIATA DA get_conversations (Proclamata Funzionante)
        
        # 1. Ottieni membership
        memberships = db.query(ConversationMember).filter(
            ConversationMember.user_id == current_user.id
        ).all()
        
        if not memberships:
             return {"total_unread": 0, "conversations": []}

        membership_map = {m.conversation_id: m for m in memberships}
        conv_ids = [m.conversation_id for m in memberships]
        
        # 2. Ottieni conversazioni
        conversations = db.query(Conversation).filter(
            Conversation.id.in_(conv_ids)
        ).all()
        
        total_unread = 0
        conversations_summary = []
        
        for conv in conversations:
            member = membership_map.get(conv.id)
            if not member:
                continue
                
            # 3. USA HELPER CONDIVISO
            unread_count = _get_unread_count(db, conv.id, current_user.id, member.last_read_at)
            
            if unread_count > 0:
                total_unread += unread_count
                
                # Determina nome 
                display_name = conv.name or "Chat"
                is_group = (conv.type == 'group')
                
                if not is_group:
                    other_member_q = db.query(ConversationMember).filter(
                        ConversationMember.conversation_id == conv.id,
                        ConversationMember.user_id != current_user.id
                    ).first()
                    
                    if other_member_q:
                        other_user = db.query(User).filter(User.id == other_member_q.user_id).first()
                        if other_user:
                            display_name = other_user.full_name or other_user.username
                        else:
                            display_name = "Utente sconosciuto"
                    else:
                        display_name = "Utente rimosso"
                        
                conversations_summary.append({
                    "conversation_id": conv.id,
                    "name": display_name,
                    "unread_count": unread_count,
                    "is_group": is_group,
                    "last_message_at": conv.created_at.isoformat() if conv.created_at else None
                })
        
        return {
            "total_unread": total_unread,
            "conversations": conversations_summary
        }
    except Exception as e:
        # Logghiamo l'errore server ma non crashiamo l'endpoint per l'utente
        return {"total_unread": 0, "conversations": []}


# Helper per invio push a utente
async def send_push_to_user(db: Session, user_id: int, sender_name: str, message_preview: str, conv_id: int):
    """Invia notifica push a tutte le subscription dell'utente."""
    subs = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id
    ).all()
    
    dead_subs = []
    for sub in subs:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh_key,
                "auth": sub.auth_key
            }
        }
        success = send_chat_notification(
            subscription_info=subscription_info,
            sender_name=sender_name,
            message_preview=message_preview,
            conversation_id=conv_id
        )
        if not success:
            dead_subs.append(sub)
    
    # Cleanup subscription non valide
    for sub in dead_subs:
        db.delete(sub)
    if dead_subs:
        db.commit()
