# ISTRUZIONI: BACKUP SERVER SITO ONLINE (SL ENTERPRISE)

Questo documento spiega come configurare, eseguire e ripristinare i backup automatici del sistema SL Enterprise sul server di produzione.

---

## 1. Cosa viene salvato?

Il sistema di backup salva i "Dati Vitali" dell'azienda:
1.  **Database (`sl_enterprise.db`)**: Contiene tutti i dipendenti, turni, utenti, configurazioni e KPI.
2.  **Uploads (`uploads/`)**: Contiene tutti i documenti caricati (certificazioni PDF, foto profilo, ecc.).

> **Nota:** Non viene salvato il codice del programma perché è già al sicuro su GitHub.

---

## 2. Installazione del Backup Automatico

Segui questi passaggi per attivare il salvataggio automatico ogni notte alle 03:00.

### Passo A: Carica lo script sul Server
1.  Apri **FileZilla** e collegati al server.
2.  Naviga nella cartella del progetto sul server (es. `/root/sl_enterprise` o dove è installato).
3.  Copia il file locale `backend/scripts/backup.sh` nella cartella corrispondente sul server.
    *   Assicurati che il percorso sul server sia simile a: `.../sl_enterprise/backend/scripts/backup.sh`

### Passo B: Rendi lo script eseguibile (Via Putty)
1.  Apri **Putty** e collegati al server.
2.  Esegui questo comando per dare i permessi di esecuzione:
    ```bash
    chmod +x /percorso/del/tuo/progetto/backend/scripts/backup.sh
    ```
    *(Sostituisci `/percorso/del/tuo/progetto` con il percorso reale, usa `ls` per trovarlo se non sei sicuro)*.

### Passo C: Prova manuale
Prima di automatizzare, verifichiamo che funzioni:
```bash
./backend/scripts/backup.sh
```
Se funziona, vedrai un messaggio "Backup completato con successo" e troverai un nuovo file nella cartella `backups`.

### Passo D: Imposta l'automazione (Cron)
1.  Sempre su Putty, apri l'editor delle attività programmate:
    ```bash
    crontab -e
    ```
2.  Scorri fino in fondo al file e aggiungi questa riga (tutto su una riga):
    ```bash
    0 3 * * * /percorso/del/tuo/progetto/backend/scripts/backup.sh >> /var/log/sl_backup.log 2>&1
    ```
    *(Ricorda sempre di usare il percorso assoluto completo!)*
3.  Salva e chiudi (Se usi `nano`: CTRL+O, Invio, CTRL+X).

**Fatto!** Ora il server farà un backup ogni notte alle 03:00 e cancellerà automaticamente quelli più vecchi di 30 giorni.

---

## 3. Come Recuperare un Backup (Ripristino)

Se succede un disastro (es. database corrotto, dati cancellati per errore), ecco come tornare indietro nel tempo.

### Passo 1: Ferma il Sito
È fondamentale spegnere il "motore" prima di cambiare i pezzi, altrimenti si corrompono i dati.
```bash
cd /percorso/del/tuo/progetto
docker-compose down
```

### Passo 2: Trova il Backup
Vai nella cartella `backups` e trova il file che ti interessa (es. `backup_sl_enterprise_2026-01-14_03-00.tar.gz`).
Se vuoi, puoi scaricarlo con FileZilla sul tuo PC per sicurezza.

### Passo 3: Estrai i Dati
Scompatta l'archivio. Questo sovrascriverà i dati attuali con quelli del backup.
```bash
# Esempio: ripristina il backup del 14 Gennaio
tar -xozf backups/backup_sl_enterprise_2026-01-14_03-00.tar.gz -C backend/
```
*   `-C backend/` dice al comando di mettere i file nella cartella backend, al posto giusto.

### Passo 4: Riavvia il Sito
Ora che i dati "vecchi e sani" sono al loro posto, riaccendi tutto.
```bash
docker-compose up -d --build
```

Il sistema è ora tornato esattamente allo stato in cui era al momento del backup.

---

## 4. Disaster Recovery (Caso Estremo)

Se il server viene completamente distrutto o cancellato:
1.  Reinstalla il server e Docker.
2.  Scarica il codice da GitHub (`git clone ...`).
3.  Prendi l'ultimo file `.tar.gz` di backup che avevi salvato (sperabilmente ne tieni una copia ogni tanto anche fuori dal server/PC locale).
4.  Esegui la procedura di **Recupero (Passo 3 e 4)** descritta sopra.
