"""
SL Enterprise - Scheduler Module
Gestione dei job pianificati in background.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging

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

def start_scheduler():
    """Avvia lo scheduler e aggiunge i job."""
    if not scheduler.running:
        # Esegui pulizia ogni 24 ore
        scheduler.add_job(
            auto_cleanup_notifications,
            trigger=IntervalTrigger(hours=24),
            id='cleanup_notifications',
            name='Pulizia notifiche vecchie',
            replace_existing=True
        )
        # Eseguiamo anche subito all'avvio (opzionale, magari meglio di no per non rallentare startup)
        # scheduler.add_job(auto_cleanup_notifications, 'date', run_date=datetime.now() + timedelta(seconds=10))
        
        scheduler.start()
        logger.info("Scheduler avviato correttamente.")

def shutdown_scheduler():
    """Spegne lo scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler spento.")
