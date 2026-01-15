import logging
from sqlalchemy import text
from database import engine

# Configurazione base del logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_hr():
    """
    Aggiunge le colonne mancanti per il sistema di approvazione HR
    se non esistono già.
    """
    logger.info("Inizio migrazione manuale per tabelle HR...")
    
    with engine.connect() as conn:
        # 1. Tabella EMPLOYEE_EVENTS
        # Colonne da aggiungere: approved_by, approved_at, rejection_reason
        columns_events = [
            ("approved_by", "INT NULL"),
            ("approved_at", "DATETIME NULL"),
            ("rejection_reason", "TEXT NULL")
        ]
        
        for col_name, col_type in columns_events:
            msg = f"Aggiunta colonna '{col_name}' a 'employee_events'"
            try:
                # Syntax MariaDB/MySQL
                conn.execute(text(f"ALTER TABLE employee_events ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                logger.info(f"✅ {msg}")
            except Exception as e:
                # Se fallisce (es. colonna esiste già), lo logghiamo ma proseguiamo
                if "Duplicate column" in str(e) or "no such table" in str(e): # Sqlite vs MySQL errors
                    logger.warning(f"⚠️ {msg} saltata (probabilmente già presente): {e}")
                else:
                     logger.warning(f"⚠️ {msg} fallita per altro errore: {e}")

        # 2. Tabella LEAVE_REQUESTS
        # Colonne da aggiungere: reviewed_by, reviewed_at, review_notes
        columns_leaves = [
            ("reviewed_by", "INT NULL"),
            ("reviewed_at", "DATETIME NULL"),
            ("review_notes", "TEXT NULL")
        ]
        
        for col_name, col_type in columns_leaves:
            msg = f"Aggiunta colonna '{col_name}' a 'leave_requests'"
            try:
                conn.execute(text(f"ALTER TABLE leave_requests ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                logger.info(f"✅ {msg}")
            except Exception as e:
                 if "Duplicate column" in str(e) or "no such table" in str(e):
                    logger.warning(f"⚠️ {msg} saltata (probabilmente già presente): {e}")
                 else:
                     logger.warning(f"⚠️ {msg} fallita per altro errore: {e}")

    logger.info("Migrazione completata.")

if __name__ == "__main__":
    migrate_hr()
