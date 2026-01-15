
import sys
import os
from datetime import datetime, timedelta

# Aggiungi parent directory al path per importare moduli backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.chat import Message
from sqlalchemy import delete

def cleanup_old_messages(days=7, dry_run=False):
    """
    Elimina messaggi più vecchi di 'days' giorni.
    Attenzione: Eliminazione FISICA (Hard Delete) per risparmiare spazio, 
    oppure Soft Delete se si preferisce mantenere lo storico.
    Di default qui facciamo Hard Delete dei messaggi molto vecchi per privacy e spazio.
    """
    db = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        print(f"🧹 Pulizia chat avviata. Cutoff: {cutoff_date}")
        print(f"Mode: {'SIMULAZIONE' if dry_run else 'ESECUZIONE'}")

        # Conta messaggi da cancellare
        query = db.query(Message).filter(Message.created_at < cutoff_date)
        count = query.count()
        
        print(f"📉 Messaggi trovati da eliminare: {count}")

        if count > 0 and not dry_run:
            # Opzione 1: Hard Delete (Rimuove definitivamente)
            # Nota: FK cascade dovrebbero gestire eventuali dipendenze, 
            # ma reply_to_id potrebbe dare noia se non gestito.
            
            # Step 1: Nullifica reply_to_id per i messaggi target
            # (per evitare vincoli FK interni se cancelliamo padre e figlio insieme o ordine sparso)
            query.update({"reply_to_id": None}, synchronize_session=False)
            db.commit()

            # Step 2: Cancella
            deleted = query.delete(synchronize_session=False)
            db.commit()
            print(f"✅ Cancellati {deleted} messaggi.")
        
        elif dry_run:
            print("🚫 Dry run completa. Nessun dato modificato.")

    except Exception as e:
        print(f"❌ Errore durante la pulizia: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Pulisce messaggi chat vecchi.")
    parser.add_argument("--days", type=int, default=7, help="Giorni di ritenzione (default: 7)")
    parser.add_argument("--dry-run", action="store_true", help="Esegui senza cancellare")
    
    args = parser.parse_args()
    cleanup_old_messages(days=args.days, dry_run=args.dry_run)
