"""
SL Enterprise - Web Push Notifications Service
Gestione notifiche push per chat.
"""
import os
import json
from datetime import datetime
from typing import Optional
from pywebpush import webpush, WebPushException

# Chiavi VAPID - GENERA UNA VOLTA E SALVA IN .env
# Puoi generare con: python -c "from pywebpush import webpush; print(webpush.generate_vapid_claims())"
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {
    "sub": "mailto:admin@sl-enterprise.com"
}


def get_vapid_public_key() -> str:
    """Ritorna la chiave pubblica VAPID per il frontend."""
    return VAPID_PUBLIC_KEY


def send_push_notification(
    subscription_info: dict,
    title: str,
    body: str,
    icon: str = "/logo192.png",
    url: str = "/chat",
    tag: str = None
) -> bool:
    """
    Invia una notifica push a un device.
    
    Args:
        subscription_info: Dict con endpoint, p256dh e auth keys
        title: Titolo della notifica
        body: Corpo del messaggio
        icon: URL icona
        url: URL da aprire al click
        tag: Tag per raggruppare notifiche (stesso tag = sostituisce)
    
    Returns:
        True se inviata con successo, False altrimenti
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        print("[PUSH] Chiavi VAPID non configurate")
        return False
    
    try:
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": icon,
            "url": url,
            "tag": tag or f"chat-{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat()
        })
        
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        return True
        
    except WebPushException as ex:
        print(f"[PUSH] Errore invio: {ex}")
        # Se subscription non valida (410 Gone), ritorna False per cleanup
        if ex.response and ex.response.status_code in [404, 410]:
            return False
        return False
    except Exception as ex:
        print(f"[PUSH] Errore generico: {ex}")
        return False


def send_chat_notification(
    subscription_info: dict,
    sender_name: str,
    message_preview: str,
    conversation_id: int
):
    """Invia notifica per nuovo messaggio chat."""
    return send_push_notification(
        subscription_info=subscription_info,
        title=f"💬 {sender_name}",
        body=message_preview[:100],
        url=f"/chat?conv={conversation_id}",
        tag=f"chat-{conversation_id}"  # Raggruppa per conversazione
    )


# Script per generare chiavi VAPID (esegui una volta)
if __name__ == "__main__":
    try:
        from py_vapid import Vapid
        
        vapid = Vapid()
        vapid.generate_keys()
        
        print("\n=== CHIAVI VAPID GENERATE ===")
        print(f"\nVAPID_PRIVATE_KEY={vapid.private_key.urlsafe_key}")
        print(f"VAPID_PUBLIC_KEY={vapid.public_key.urlsafe_key}")
        print("\nAggiungi queste variabili al file .env del backend!")
        print("================================\n")
    except ImportError:
        print("Installa py-vapid: pip install py-vapid")
