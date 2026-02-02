# Guida Ambiente di Staging - SL Enterprise

## Cos'è un Ambiente di Staging?

Un ambiente di staging è una copia esatta del tuo sito di produzione, ma accessibile solo a te e al team di sviluppo. Serve per testare le modifiche "dal vivo" prima di renderle disponibili agli utenti reali.

### Il Flusso di Lavoro Ideale

```
SVILUPPO (PC Locale) → STAGING (Server Test) → PRODUZIONE (Sito Live)
```

1. **Sviluppo**: Modifichi il codice sul tuo PC.
2. **Staging**: Carichi le modifiche su un ambiente di test per verificarle.
3. **Produzione**: Solo dopo aver verificato, promuovi le modifiche al sito che usano i dipendenti.

---

## Situazione Attuale

Attualmente il progetto SL Enterprise ha **un solo ambiente**:
- Server: `93.186.255.104`
- Questo è l'ambiente di **produzione** (quello che usano i dipendenti).

Non esiste un ambiente di staging separato.

---

## Come Creare un Ambiente di Staging

### OPZIONE A: Stesso Server, Porte Diverse (Consigliata - Zero Costi)

Questa opzione utilizza lo stesso server ma avvia una seconda istanza dell'applicazione su porte diverse.

**Configurazione Finale:**
- Produzione: `https://slenterprise.it` (porte 80/443)
- Staging: `http://93.186.255.104:8080` (porta 8080)

#### Passaggi:

1. **Collegati al server via Putty**

2. **Crea la cartella per lo staging**
   ```bash
   cd /root
   cp -r sl-enterprise sl-enterprise-staging
   ```

3. **Modifica il docker-compose nello staging**
   Apri `/root/sl-enterprise-staging/docker-compose.yml` e cambia le porte:
   - Frontend: da `80:80` a `8080:80`
   - Backend: da `8000:8000` a `8001:8000`

4. **Copia il database (opzionale, per dati realistici)**
   ```bash
   cp sl-enterprise/backend/sl_enterprise.db sl-enterprise-staging/backend/
   ```

5. **Avvia lo staging**
   ```bash
   cd /root/sl-enterprise-staging
   docker compose -p staging up -d --build
   ```

6. **Accedi allo staging**
   Apri nel browser: `http://93.186.255.104:8080`

#### Workflow Quotidiano:
1. Fai le modifiche in locale (sul PC).
2. Push su un branch Git (es. `develop` o `staging`).
3. Sul server, nella cartella staging: `git pull origin develop`
4. Riavvia: `docker compose -p staging up -d --build`
5. Testa su `http://93.186.255.104:8080`
6. Se tutto OK, merge su `main` e deploy in produzione.

---

### OPZIONE B: Secondo Server (Ideale per Aziende Strutturate)

Un VPS separato dedicato solo allo staging.

**Costo stimato:** 5-15€/mese per un VPS base.

**Vantaggi:**
- Isolamento totale dalla produzione
- Nessun rischio di impatto sulle performance del sito live
- Possibilità di testare anche migrazioni del database

---

## Vantaggi dell'Ambiente di Staging

1. **Zero Rischi**: Le modifiche non impattano mai gli utenti finché non sono testate.
2. **Test Realistici**: Testi su un ambiente identico alla produzione.
3. **Rollback Facile**: Se qualcosa non va, non tocchi mai la produzione.
4. **Collaborazione**: Il team può vedere le modifiche prima che vadano live.

---

## Comandi Utili

### Avviare/Fermare Staging
```bash
cd /root/sl-enterprise-staging
docker compose -p staging up -d      # Avvia
docker compose -p staging down       # Ferma
docker compose -p staging logs -f    # Vedi log
```

### Vedere lo stato di entrambi gli ambienti
```bash
docker ps  # Mostra tutti i container attivi
```

---

**Documento creato il:** 19 Gennaio 2026
**Autore:** Antigravity AI Assistant
