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
        
        # 4. Logistics Escalation Check (Ogni 1 minuto)
        scheduler.add_job(
            check_logistics_escalations,
            trigger=IntervalTrigger(minutes=1),
            id='logistics_escalation',
            name='Logistics Escalation Matrix',
            replace_existing=True
        )

        # 5. Oven Stagnation Check (Ogni 5 minuti)
        scheduler.add_job(
            check_oven_stagnation,
            trigger=IntervalTrigger(minutes=5),
            id='oven_stagnation',
            name='Controlla stagnazione forno',
            replace_existing=True
        )

        scheduler.start()
        logger.info("Scheduler avviato correttamente.")

# ============================================================
# OVEN LOGIC
# ============================================================
from models.production import OvenItem

def check_oven_stagnation():
    """
    Controlla se ci sono materiali nel forno oltre il tempo previsto
    e invia notifiche ai Coordinatori.
    """
    db = SessionLocal()
    try:
        now = datetime.now()
        # Prendi items attivi che hanno superato il tempo e non sono ancora stati notificati
        overdue_items = db.query(OvenItem).filter(
            OvenItem.status == 'in_oven',
            OvenItem.notified_overdue == False
        ).all()
        
        for item in overdue_items:
            elapsed_minutes = (now - item.inserted_at).total_seconds() / 60.0
            
            if elapsed_minutes > item.expected_minutes:
                # Target: Coordinatori + Super Admin (per ruolo, non per nome)
                from sqlalchemy import or_
                from database import Role
                targets = db.query(User).filter(
                    User.is_active == True
                ).outerjoin(Role, User.role_id == Role.id).filter(
                    or_(
                        Role.name == "coordinator",
                        Role.name == "super_admin",
                        User.role == "coordinator",
                        User.role == "super_admin",
                    )
                ).all()
                
                for t in targets:
                    n = Notification(
                        recipient_user_id=t.id,
                        notif_type="urgent",
                        title="🚨 ATTENZIONE: Materiale scaduto nel forno!",
                        message=f"Il materiale '{item.reference}' è nel forno da {int(elapsed_minutes)} minuti! Tempo massimo previsto: {item.expected_minutes} min. Verificare immediatamente.",
                        link_url="/production/oven"
                    )
                    db.add(n)
                
                # Segna come notificato
                item.notified_overdue = True
                db.commit()
                logger.info(f"Notifica stagnazione inviata per item {item.id} ({item.reference})")
                
    except Exception as e:
        logger.error(f"Errore check stagnazione forno: {e}")
        db.rollback()
    finally:
        db.close()


# ============================================================
# ESCALATION LOGIC
# ============================================================
from models.logistics import LogisticsRequest
from models.core import User

def check_logistics_escalations():
    """
    Controlla ritardi logistica e invia notifiche scalari.
    Level 1 (> 3 min): Coordinatori (Iasevoli, Acone, Piccirillo, Marino)
    Level 2 (> 7 min): Factory Controller (Esposito) + Admin (Sasy)
    Level 3 (> 10 min): Direttori (Diodasto, Brescia)
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        pending_requests = db.query(LogisticsRequest).filter(
            LogisticsRequest.status == 'pending'
        ).all()
        
        for req in pending_requests:
            minutes_waiting = (now - req.created_at).total_seconds() / 60.0
            new_level = req.escalation_level or 0
            
            # Target Users Cache (To avoid repeat queries inside loop, ideally move outside but for safety keep here)
            # Level 1 Targets
            coord_names = ["Iasevoli", "Acone", "Piccirillo", "Marino"]
            # Level 2 Targets
            controller_names = ["Esposito Antonio", "Sasy"] 
            # Level 3 Targets
            director_names = ["Diodasto", "Brescia"]

            if minutes_waiting > 10 and new_level < 3:
                # Level 3
                notify_users_by_partial_name(db, director_names, req, "DA 10 MINUTI", "critical")
                new_level = 3
                
            elif minutes_waiting > 7 and new_level < 2:
                # Level 2
                notify_users_by_partial_name(db, controller_names, req, "DA 7 MINUTI", "urgent")
                new_level = 2
                
            elif minutes_waiting > 3 and new_level < 1:
                # Level 1
                notify_users_by_partial_name(db, coord_names, req, "DA 3 MINUTI", "alert")
                new_level = 1
            
            if new_level != req.escalation_level:
                req.escalation_level = new_level
                db.commit()
                
    except Exception as e:
        logger.error(f"Errore logistics escalation: {e}")
        db.rollback()
    finally:
        db.close()

def notify_users_by_partial_name(db, names, req, delay_str, type_notif):
    """Cerca utenti per nome parziale e crea notifica."""
    target_ids = set()
    for name in names:
        users = db.query(User).filter(User.full_name.ilike(f"%{name}%")).all()
        for u in users:
            target_ids.add(u.id)
            
    for uid in target_ids:
        # Avoid duplicate unread notifications for same request? 
        # For simplicity, we send. The user will see pile of alerts.
        n = Notification(
            recipient_user_id=uid,
            notif_type=type_notif,
            title=f"⚠️ RITARDO RITIRO {delay_str}",
            message=f"Banchina {req.banchina.code if req.banchina else '?'} aspetta da {int((datetime.utcnow() - req.created_at).total_seconds()/60)} min. Materiale: {req.material_type.label if req.material_type else '?'}.",
            link_url="/logistics/pool"
        )
        db.add(n)
    db.commit()


def shutdown_scheduler():
    """Spegne lo scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler spento.")
