#!/bin/bash
# =============================================================================
# SETUP CRON PER BACKUP ORARIO
# Esegui questo script UNA SOLA VOLTA per attivare i backup automatici
# =============================================================================

SCRIPT_PATH="/root/sl-enterprise/backend/scripts/backup_hourly.sh"
LOG_PATH="/var/log/sl_backup.log"

# Rendi lo script eseguibile
chmod +x "$SCRIPT_PATH"

# Rimuovi eventuali cron job esistenti per questo script
crontab -l 2>/dev/null | grep -v "backup_hourly.sh" | crontab -

# Aggiungi il nuovo cron job (ogni ora al minuto 0)
(crontab -l 2>/dev/null; echo "0 * * * * $SCRIPT_PATH >> $LOG_PATH 2>&1") | crontab -

# Verifica
echo "✅ Backup orario configurato!"
echo ""
echo "📋 Cron job attuale:"
crontab -l | grep backup
echo ""
echo "📁 I backup saranno salvati in: /root/sl-enterprise/backups/"
echo "📊 Verranno mantenute le ultime 48 versioni (2 giorni)"
echo ""
echo "🧪 Per testare subito, esegui:"
echo "   $SCRIPT_PATH"
