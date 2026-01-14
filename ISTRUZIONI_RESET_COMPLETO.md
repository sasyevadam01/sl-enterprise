# ISTRUZIONI PER "RESET TOTALE" E RILASCIO PULITO

Segui questi passaggi PASSO DOPO PASSO per ripristinare il server da zero usando la copia "Buona" che hai caricato.

## FASE 1: PULIZIA DEL SERVER (Tabula Rasa)

Dobbiamo eliminare QUALSIASI cosa ci sia ora sul server per evitare conflitti.

1.  **Apri Putty** e collegati al server.
2.  Esegui questi comandi **uno alla volta** (puoi fare copia-incolla):

    ```bash
    # 1. Ferma tutti i container attivi
    docker stop $(docker ps -a -q)
    
    # 2. Rimuovi tutti i container
    docker rm $(docker ps -a -q)
    
    # 3. Rimuovi TUTTI i volumi (QUESTO CANCELLA IL DATABASE VECCHIO/CORROTTO)
    docker volume prune -f
    
    # 4. Rimuovi eventuali network non usati
    docker network prune -f
    
    # 5. Cancella la vecchia cartella del codice (per essere sicuri)
    # Assumiamo tu sia in /root/ o dove tieni il progetto
    rm -rf backend frontend
    # ATTENZIONE: Fai 'ls' prima per vedere cosa cancelli. 
    # Se hai una cartella 'SL_Project' cancella quella: rm -rf SL_Project
    ```

    *Nota: Se ti chiede conferma, digita 'y' e premi invio.*

---

## FASE 2: CARICAMENTO "NUOVA" VERSIONE

Ora il server è pulito. Carichiamo la versione che hai sul Desktop.

1.  **Apri FileZilla** e collegati al server.
2.  Nella finestra di **SINISTRA** (il tuo PC), entra nella cartella `SL Project` (quella "Buona").
3.  Nella finestra di **DESTRA** (il Server), assicurati di essere nella cartella principale (solitamente `/root`).
4.  Copia le cartelle `backend` e `frontend` (o tutto il contenuto del progetto) nella root del server o in una sottocartella dedicata.

---

## FASE 3: AVVIO PULITO

Torniamo su **Putty**.

1.  Entra nella cartella (es. `cd backend` o dove hai il docker-compose).
2.  Avvia i container:
    ```bash
    # Se usi docker-compose
    docker-compose up -d --build
    ```
    *Oppure se avvii manualmente:*
    ```bash
    cd backend
    docker build -t sl-backend .
    docker run -d -p 8000:8000 --name sl-backend sl-backend
    ```

## FASE 4: RIPRISTINO DATI (Se necessario)

Una volta avviato, il database sarà vuoto.
Se hai lo script `restore_system.py` o simili che abbiamo creato in passato, questo è il momento di usarlo per reimportare i dati base.

Se hai bisogno che importiamo i dati da Excel (`Database_Aggiornato.xlsx`), fammelo sapere e ti darò il comando preciso.
