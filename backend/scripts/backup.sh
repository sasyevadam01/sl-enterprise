#!/bin/bash

# ============================================================
# SL ENTERPRISE - AUTOMATED BACKUP SCRIPT
# ============================================================
# Questo script crea un archivio compresso del database e della cartella uploads.
# Mantiene lo storico degli ultimi 30 giorni.

# --- CONFIGURAZIONE ---
# Percorso base del progetto (modificare se necessario)
BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
BACKUP_DIR="$BASE_DIR/backups"

# Timestamp per il nome del file (YYYY-MM-DD_HH-MM)
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_FILE="$BACKUP_DIR/backup_sl_enterprise_$TIMESTAMP.tar.gz"

# --- CREAZIONE CARTELLA BACKUP ---
mkdir -p "$BACKUP_DIR"

# --- CREAZIONE ARCHIVIO ---
echo "[$(date)] Inizio backup..."
echo "Sorgente: $BACKEND_DIR"
echo "Destinazione: $BACKUP_FILE"

# Esegue il tar escludendo file inutili
# Salviamo: sl_enterprise.db e uploads/
tar -czf "$BACKUP_FILE" \
    -C "$BACKEND_DIR" sl_enterprise.db uploads

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completato con successo: $BACKUP_FILE"
    
    # --- PULIZIA VECCHI BACKUP ---
    # Trova e cancella file più vecchi di 30 giorni nella cartella backup
    echo "Pulizia backup vecchi (>30 giorni)..."
    find "$BACKUP_DIR" -name "backup_sl_enterprise_*.tar.gz" -type f -mtime +30 -delete
    echo "[$(date)] Pulizia completata."
else
    echo "[$(date)] ERRORE: Creazione backup fallita!"
    exit 1
fi
