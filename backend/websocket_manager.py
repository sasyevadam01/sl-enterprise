"""
SL Enterprise - Chat WebSocket Manager
Gestione connessioni WebSocket per messaggistica real-time.
"""
from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from typing import Dict, List, Set
import json
from datetime import datetime


class ChatConnectionManager:
    """Gestisce le connessioni WebSocket attive per la chat."""
    
    def __init__(self):
        # user_id -> lista di websocket (un utente può avere più tab)
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # conversation_id -> set di user_id che stanno visualizzando
        self.conversation_viewers: Dict[int, Set[int]] = {}
        # user_id -> conversation_id dove sta scrivendo
        self.typing_users: Dict[int, int] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accetta una nuova connessione WebSocket."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"[WS] User {user_id} connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Rimuove una connessione WebSocket."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        # Cleanup typing status
        if user_id in self.typing_users:
            del self.typing_users[user_id]
        print(f"[WS] User {user_id} disconnected. Remaining: {len(self.active_connections)}")
    
    def set_viewing(self, user_id: int, conversation_id: int):
        """Registra che un utente sta visualizzando una conversazione."""
        if conversation_id not in self.conversation_viewers:
            self.conversation_viewers[conversation_id] = set()
        self.conversation_viewers[conversation_id].add(user_id)
    
    def unset_viewing(self, user_id: int, conversation_id: int):
        """Rimuove l'utente dalla lista visualizzatori."""
        if conversation_id in self.conversation_viewers:
            self.conversation_viewers[conversation_id].discard(user_id)
    
    async def send_to_user(self, user_id: int, message: dict):
        """Invia un messaggio a tutte le connessioni di un utente."""
        if user_id in self.active_connections:
            dead_connections = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    print(f"[WS] Error sending to user {user_id}: {e}")
                    dead_connections.append(ws)
            # Cleanup dead connections
            for ws in dead_connections:
                self.disconnect(ws, user_id)
    
    async def broadcast_to_conversation(self, conversation_id: int, member_ids: List[int], message: dict, exclude_user: int = None):
        """Invia un messaggio a tutti i membri di una conversazione."""
        for user_id in member_ids:
            if user_id != exclude_user:
                await self.send_to_user(user_id, message)
    
    async def notify_typing(self, conversation_id: int, member_ids: List[int], user_id: int, user_name: str, is_typing: bool):
        """Notifica gli altri membri che qualcuno sta scrivendo."""
        if is_typing:
            self.typing_users[user_id] = conversation_id
        elif user_id in self.typing_users:
            del self.typing_users[user_id]
        
        message = {
            "type": "typing",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "user_name": user_name,
            "is_typing": is_typing
        }
        await self.broadcast_to_conversation(conversation_id, member_ids, message, exclude_user=user_id)


# Singleton manager
chat_manager = ChatConnectionManager()


def get_chat_manager() -> ChatConnectionManager:
    return chat_manager
