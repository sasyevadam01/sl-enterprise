"""
SL Enterprise - Scheduler Module
Gestione dei job pianificati in background.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging
import shutil
import os
import glob
from pathlib import Path

from database import SessionLocal, Notification

# Configurazione Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_cleanup_notifications():
    """
    Job pianificato per pulire le notifiche vecchie.
    - Elimina notifiche LETTE > 7 giorni
    - Elimina notifiche NON LETTE > 30 giorni
    """
    logger.info("Avvio procedura di pulizia notifiche...")
    
    db = SessionLocal()
    try:
        now = datetime.now()
        days_read = 7
        days_unread = 30
        
        cutoff_read = now - timedelta(days=days_read)
        cutoff_unread = now - timedelta(days=days_unread)
        
        # Elimina lette vecchie
        deleted_read = db.query(Notification).filter(
            Notification.is_read == True,
            Notification.created_at < cutoff_read
        ).delete(synchronize_session=False)
        
        # Elimina non lette molto vecchie
        deleted_unread = db.query(Notification).filter(
            Notification.is_read == False,
            Notification.created_at < cutoff_unread
        ).delete(synchronize_session=False)
        
        db.commit()
        
        if deleted_read > 0 or deleted_unread > 0:
            logger.info(f"Pulizia completata: eliminate {deleted_read} lette e {deleted_unread} non lette.")
        else:
            logger.info("Nessuna notifica da eliminare.")
            
    except Exception as e:
        logger.error(f"Errore durante la pulizia notifiche: {e}")
        db.rollback()
    finally:
        db.close()


from models.chat import Message

def auto_cleanup_chats():
    """
    Job pianificato per pulire messaggi chat vecchi (> 7 giorni).
    """
    logger.info("Avvio procedura di pulizia chat...")
    db = SessionLocal()
    try:
        cutoff_date = datetime.now() - timedelta(days=7)
        
        # Elimina messaggi vecchi
        # Nota: per sicurezza facciamo in 2 step (FK reply_to)
        
        # 1. Nullifica reply_to
        db.query(Message).filter(Message.created_at < cutoff_date).update(
            {"reply_to_id": None}, synchronize_session=False
        )
        db.flush()
        
        # 2. Cancella
        deleted = db.query(Message).filter(Message.created_at < cutoff_date).delete(synchronize_session=False)
        db.commit()
        
        if deleted > 0:
            logger.info(f"Pulizia chat completata: eliminati {deleted} messaggi.")
        else:
            logger.info("Nessun messaggio chat da eliminare.")
            
    except Exception as e:
        logger.error(f"Errore durante pulizia chat: {e}")
        db.rollback()
    finally:
        db.close()

def auto_backup_db():
    """
    Job pianificato: Backup orario del database.
    Mantiene ultime 24 versioni.
    """
    logger.info("Avvio procedura di backup automatico DB...")
    try:
        # Percorsi
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        DB_PATH = os.path.join(BASE_DIR, "sl_enterprise.db")
        BACKUP_DIR = os.path.join(BASE_DIR, "backups")
        
        # Assicurati che cartella backup esista
        os.makedirs(BACKUP_DIR, exist_ok=True)
        
        # Nome file con timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
        backup_filename = f"sl_enterprise_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        
        # 1. Esegui Backup (Copia file)
        if os.path.exists(DB_PATH):
            shutil.copy2(DB_PATH, backup_path)
            logger.info(f"✅ Backup creato con successo: {backup_filename}")
        else:
            logger.error("❌ Errore Backup: File database non trovato!")
            return

        # 2. Pulizia vecchi backup (Mantieni ultimi 24)
        list_of_files = glob.glob(os.path.join(BACKUP_DIR, "sl_enterprise_*.db"))
        list_of_files.sort(key=os.path.getmtime, reverse=True) # Ordina per data (più recenti primi)
        
        if len(list_of_files) > 24:
            files_to_delete = list_of_files[24:]
            for f in files_to_delete:
                try:
                    os.remove(f)
                    logger.info(f"🗑️ Eliminato backup vecchio: {os.path.basename(f)}")
                except Exception as e:
                    logger.error(f"Errore eliminazione vecchio backup {f}: {e}")
                    
    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR BACKUP: {e}")

def start_scheduler():
    """Avvia lo scheduler e aggiunge i job."""
    if not scheduler.running:
        # Esegui pulizia notifiche ogni 24 ore
        scheduler.add_job(
            auto_cleanup_notifications,
            trigger=IntervalTrigger(hours=24),
            id='cleanup_notifications',
            name='Pulizia notifiche vecchie',
            replace_existing=True
        )
        
        # Esegui pulizia CHAT ogni 24 ore (alle 04:00 di notte ideale, ma interval va bene)
        scheduler.add_job(
            auto_cleanup_chats,
            trigger=IntervalTrigger(hours=24),
            id='cleanup_chats',
            name='Pulizia chat vecchie',
            replace_existing=True
        )

        # 3. Backup Orario Database (NOVITÀ SAFE MODE)
        scheduler.add_job(
            auto_backup_db,
            trigger=IntervalTrigger(hours=1),
            id='auto_backup_db',
            name='Backup Orario Database',
            replace_existing=True
        )
        # Avvia subito un backup all'avvio per sicurezza
        scheduler.add_job(auto_backup_db, trigger='date', run_date=datetime.now() + timedelta(seconds=10))
        
        scheduler.start()
        logger.info("Scheduler avviato correttamente.")

def shutdown_scheduler():
    """Spegne lo scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler spento.")
