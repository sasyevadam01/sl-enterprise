#!/bin/bash
# =============================================================================
# BACKUP ORARIO CON VERSIONING - SL ENTERPRISE
# Esegue backup ogni ora e mantiene le ultime 48 versioni (2 giorni)
# =============================================================================

# Configurazione
BACKUP_DIR="/root/sl-enterprise/backups"
DB_PATH="/root/sl-enterprise/backend/sl_enterprise.db"
UPLOADS_PATH="/root/sl-enterprise/backend/uploads"
MAX_BACKUPS=48  # Mantieni 48 ore di backup (2 giorni)

# Crea cartella backup se non esiste
mkdir -p "$BACKUP_DIR"

# Genera nome file con data e ora
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_NAME="backup_${TIMESTAMP}.tar.gz"

# Crea il backup (database + uploads)
echo "[$(date)] Creando backup: $BACKUP_NAME"
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" \
    -C /root/sl-enterprise/backend sl_enterprise.db uploads 2>/dev/null

# Verifica che il backup sia stato creato
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
    echo "[$(date)] ✅ Backup completato: $BACKUP_NAME ($SIZE)"
else
    echo "[$(date)] ❌ ERRORE: Backup fallito!"
    exit 1
fi

# Elimina backup vecchi (mantieni solo gli ultimi MAX_BACKUPS)
cd "$BACKUP_DIR"
BACKUP_COUNT=$(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    TO_DELETE=$((BACKUP_COUNT - MAX_BACKUPS))
    echo "[$(date)] Eliminando $TO_DELETE backup vecchi..."
    ls -1t backup_*.tar.gz | tail -n "$TO_DELETE" | xargs rm -f
fi

# Mostra stato backup
echo "[$(date)] 📊 Backup presenti: $(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)/$MAX_BACKUPS"
echo "---"
