"""
SL Enterprise - Web Push Notifications Service
Gestione notifiche push per chat.
"""
import os
import json
from datetime import datetime
from typing import Optional
from pywebpush import webpush, WebPushException
from dotenv import load_dotenv

# Carica .env esplicitamente (in caso di import prima di database.py)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Chiavi VAPID
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {
    "sub": "mailto:admin@sl-enterprise.com"
}

# Log di avvio
if VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY:
    print(f"[PUSH] VAPID keys loaded OK (public: {VAPID_PUBLIC_KEY[:20]}...)")
else:
    print("[PUSH] ⚠️ VAPID keys NOT configured — push notifications disabled")


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

def send_production_notification(
    subscription_info: dict,
    title: str,
    body: str,
    request_id: int
):
    """Invia notifica per nuova richiesta produzione."""
    return send_push_notification(
        subscription_info=subscription_info,
        title=f"📦 {title}",
        body=body,
        url="/production/blocks",
        tag=f"prod-{request_id}",
        icon="/logo192.png"
    )

def send_logistics_push(
    subscription_info: dict,
    material_label: str,
    banchina_code: str,
    requester_name: str,
    is_urgent: bool = False
):
    """Invia notifica per nuova richiesta materiale logistica."""
    prefix = "🚨 URGENTE" if is_urgent else "📦 Richiesta Materiale"
    return send_push_notification(
        subscription_info=subscription_info,
        title=prefix,
        body=f"{material_label} — Banchina {banchina_code} (da {requester_name})",
        url="/logistics",
        tag=f"logistics-{banchina_code}"
    )


# Script per generare chiavi VAPID (esegui una volta)
if __name__ == "__main__":
    try:
        from py_vapid import Vapid
        import base64
        
        vapid = Vapid()
        vapid.generate_keys()
        
        # Funzione helper per base64url senza padding
        def b64url(data):
            return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

        # Estrai bytes chiave privata
        private_val = vapid.private_key.private_numbers().private_value
        private_bytes = private_val.to_bytes(32, byteorder='big')
        
        # Estrai bytes chiave pubblica (formato non compresso: 0x04 + x + y)
        pub_nums = vapid.public_key.public_numbers()
        x = pub_nums.x.to_bytes(32, byteorder='big')
        y = pub_nums.y.to_bytes(32, byteorder='big')
        public_bytes = b'\x04' + x + y
        
        print("\n=== CHIAVI VAPID GENERATE ===")
        print(f"\nVAPID_PRIVATE_KEY={b64url(private_bytes)}")
        print(f"VAPID_PUBLIC_KEY={b64url(public_bytes)}")
        print("\nAggiungi queste variabili al file .env del backend!")
        print("================================\n")
        
    except ImportError:
        print("Errore importazione o libreria mancante.")
    except Exception as e:
        print(f"Errore generazione chiavi: {e}")

