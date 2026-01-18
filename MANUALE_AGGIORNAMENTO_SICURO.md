# 📘 MANUALE OPERATIVO: Aggiornamento e Sicurezza SL Enterprise
*Versione Semplificata per Amministratore*

## ⚠️ PREMESSA FONDAMENTALE (Leggi prima di fare qualsiasi cosa)
**Non aggiornare mai il programma senza aver messo al sicuro i dati.**
Il codice si può sempre riscaricare, ma il database (`sl_enterprise.db`) e i documenti (`uploads/`) se persi sono persi per sempre.

---

## 1. 🛡️ FASE DI BACKUP (Messa in sicurezza)

Esistono due modi per salvare i dati. Consigliamo il "Metodo Manuale Sicuro" prima di ogni aggiornamento importante.

### Metodo Manuale "A FREDDO" (Consigliato prima di aggiornamenti)
Questo metodo garantisce che il file database sia perfetto e non corrotto, perché fermiamo il sito un attimo.

1.  Apri **Putty**, collegati al server ed esegui:
    ```bash
    cd /root/backend
    docker compose stop backend
    ```
    *(Ora il sito è momentaneamente irraggiungibile, nessuno può scrivere dati).*

2.  Apri **FileZilla** e collegati al server.
3.  Vai nella cartella remota `/root/backend`.
4.  Trascina sul tuo Desktop (o cartella backup) il file:
    *   `sl_enterprise.db`
5.  (Opzionale ma consigliato) Trascina anche la cartella:
    *   `uploads` (contiene i PDF e le foto)

6.  Tornas su **Putty** e riaccendi il sito:
    ```bash
    docker compose start backend
    ```

Ora hai una copia "blindata" sul tuo PC. Se succede il finimondo, sei salvo.

---

## 2. 🚀 FASE DI AGGIORNAMENTO (Deploy)

Una volta che hai fatto le modifiche sul tuo PC e sei pronto a metterle online.

### Passo A: Invia modifiche dal PC (Git)
Fai questo sul tuo computer (VS Code o Terminale):
1.  Assicurati di essere nella cartella del progetto.
2.  Esegui in sequenza:
    ```cmd
    git add .
    git commit -m "Descrizione aggiornamento"
    git push origin main
    ```
    *(Attendi che l'upload arrivi al 100%)*

### Passo B: Ricevi modifiche sul Server (Putty)
Fai questo collegandoti al server con Putty:

1.  Vai nella cartella principale:
    ```bash
    cd /root/backend
    cd .. 
    # Assicurati di essere nella root del progetto, spesso è /root/sl-enterprise o simile. 
    # Usa 'ls' per vedere se ci sono le cartelle 'backend' e 'frontend'.
    ```
2.  Scarica il codice nuovo:
    ```bash
    git pull origin main
    ```

### Passo C: Applica le modifiche (Riavvio Docker)
Sempre su Putty, aggiorna i "container" che fanno girare il programma.

*   **Se hai toccato il Backend (Python, API, DB):**
    ```bash
    docker compose up -d --build backend
    ```
*   **Se hai toccato il Frontend (Grafica, Pagine):**
    ```bash
    docker compose up -d --build frontend
    ```
*   **Nel dubbio (o se hai toccato tutto):**
    ```bash
    docker compose up -d --build
    ```

---

## 3. 🚑 EMERGENZE (Cosa fare se si rompe tutto)

Se dopo l'aggiornamento il sito non parte, mancano dati o dà errori strani.

### Soluzione Veloce: Ripristina il Backup
Useremo il file `sl_enterprise.db` che hai salvato sul desktop nel **Punto 1**.

1.  Ferma tutto su Putty:
    ```bash
    docker compose down
    ```
2.  Su **FileZilla**, prendi il tuo file `sl_enterprise.db` (quello sano dal Desktop) e trascinalo nel server dentro `/root/backend`, sovrascrivendo quello rotto.
3.  Su Putty, riavvia tutto:
    ```bash
    docker compose up -d --build
    ```

Il sistema tornerà esattamente come era al momento del backup.

---

## 📝 PROMEMORIA COMANDI UTILI (Da stampare)

| Azione | Comando (da usare nella cartella progetto) |
| :--- | :--- |
| **Vedere se i container girano** | `docker ps` |
| **Vedere i log (errori) Backend** | `docker compose logs -f backend` |
| **Vedere i log (errori) Frontend** | `docker compose logs -f frontend` |
| **Spegnere tutto** | `docker compose down` |
| **Riavvio rapido (senza rebuild)** | `docker compose restart` |

---
*Documento generato da Antigravity per SL Enterprise - Gennaio 2026*
