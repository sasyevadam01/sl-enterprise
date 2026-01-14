# APPUNTI OPERATIVI - SL PROJECT
**Ultimo aggiornamento**: 30/12/2024 22:36

---

## 🏭 STRUTTURA AZIENDALE

### Banchine (Fabbricati)
B1, B2, B3, B4, B5, B6, B7, B11, B12, B13, B14, B15, B16 (13 totali)
- Ogni banchina ha requisiti diversi (variabili)
- Catene di montaggio sono tendenzialmente fisse per operatori

### Turni
| Turno | Orario | Note |
|-------|--------|------|
| Mattina | 06:00 - 14:00 | 15 min pausa inclusi |
| Pomeriggio | 14:00 - 22:00 | 15 min pausa inclusi |
| Notte | 22:00 - 06:00 | Spesso problemi copertura |

**Ore effettive**: 8h - 15min = 7h 45min per KPI

---

## 📜 ATTESTATI DA TRACCIARE
- Muletto frontale
- Retrattile
- Transpallet
- PLE (Piattaforma Elevabile)
- Preposto
- Antincendio
- Primo Soccorso
- Lavoro in Alta Quota
- Art. 37 Generale
- Art. 37 Specifico

---

## 🔧 MANUTENZIONE

### Manutentori
- 3 persone
- Stesse specializzazioni

### Tipi di Blocco
1. Guasto totale (macchina ferma)
2. Guasto parziale (funziona ma male)
3. Manutenzione preventiva

### Sistema Urgenza (Punteggio)
| Fattore | Punteggio |
|---------|-----------|
| ⚠️ SICUREZZA CRITICA | +100 |
| Guasto totale (macchina ferma) | +50 |
| Banchina completamente bloccata | +30 |
| Macchina unica (no backup) | +20 |
| Guasto parziale | +20 |
| Manutenzione preventiva | +5 |

**REGOLA: LA SICUREZZA PRIMA DI TUTTO**

### Configuratore Alert Rotture
- Editabile dall'admin
- Soglie personalizzabili per tipo macchina
- Soglie personalizzabili per tipo guasto
- Es: "Muletto 04 - stesso guasto 2x in 7gg = ALERT"

### Anagrafica Macchine
- Ogni macchina ha ubicazione (banchina)
- Da richiedere: lista completa macchine + banchina

### Chiusura Ticket
- Chi apre il ticket lo chiude
- Tracciare tempo apertura → chiusura per KPI

### KPI Manutenzione
- Tempo medio risoluzione
- Numero guasti per banchina
- Numero guasti per tipo macchina
- Alert rotture frequenti (soglia tempo da definire)

---

## 📍 COPERTURA ATTESTATI

### Logica
- NON per singola banchina
- Copertura a livello FABBRICA per turno
- Es: se c'è 1 antincendio nel turno mattina → copre tutte le banchine

### Alert
- Solo se nel turno MANCA completamente un attestato
- Problema frequente: turno notte (meno personale)

---

## 🚜 PARCO MACCHINE (Mezzi)
- Muletti frontali
- Retrattili
- Transpallet
- PLE
- Camion

Separato dalle macchine di produzione!

---

## 📊 KPI GIORNALIERI
- Tempo medio risoluzione guasti
- Guasti per banchina
- Guasti per tipo macchina
- Alert rotture troppo frequenti
- Considerare 15 min pausa nei calcoli ore

---

## 📝 TODO - Dati da richiedere
- [ ] Database dipendenti (Excel)
- [ ] Specifiche macchinari produzione con operatori assegnati
- [ ] Requisiti attestati per ogni banchina
- [ ] Lista macchine parco mezzi + banchina ubicazione

---

## 👥 RUOLI UTENTE

| Ruolo | Permessi |
|-------|----------|
| Super Admin | Tutto + configuratore |
| Specialist | Configuratore soglie + analytics |
| Coordinatore | Vede coda ticket, gestisce turni |
| HR Manager | Dipendenti, attestati, turni |
| Manutentore | Vede coda ticket assegnati |
| Addetto Resi | Inserisce/gestisce resi |
| Addetto Amministrativo | Chiude resi con nota credito |
| Operatore | Apre ticket guasti |

---

## 📦 MODULO RESI

### Flusso
1. Operatore inserisce reso:
   - Riferimento rientrato
   - Nome cliente
   - Foto/Video materiale
   - Impressioni stato materiale
2. Addetto Resi verifica e valuta
3. Addetto Amministrativo decide nota credito
4. Chiusura ticket reso

### Requisiti
- Upload foto/video (server interno, veloce)
- Lista dedicata per Addetto Resi
- Lista dedicata per Amministrativo
- Storico resi per cliente

---

## 📊 ANALYTICS PERSONALE

### Obiettivo
Sistema che indica per ogni reparto:
- ✅ Personale adeguato
- ⚠️ Sotto organico
- 🔴 Surplus personale

### Dati necessari
- Numero operatori per reparto
- Carico lavoro previsto (da definire)
- Ore turno effettive (7h 45min)

---

## 🔔 NOTIFICHE

### Immediate
- Notifica in-app con badge
- Suono per urgenze sicurezza

### Future (da valutare)
- Push notification su telefono
- Email per alcune tipologie
