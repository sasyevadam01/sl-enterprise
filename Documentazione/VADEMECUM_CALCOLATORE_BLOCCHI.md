# 📐 VADEMECUM - Calcolatore Blocchi
### Guida pratica per operatori reparto taglio

---

## 🎯 A cosa serve?

Questo strumento ti aiuta a calcolare **quanti blocchi** di spugna o memory ti servono per completare un ordine, evitando sprechi e ottimizzando i recuperi.

---

## 📱 Come si usa (passo per passo)

### STEP 1: Scegli il Materiale
- Tocca **SPUGNA** o **MEMORY**
- Se spugna: seleziona **Densità** (D23, D25, D30...) e **Colore**
- Se memory: seleziona il **Tipo** (VISCOFLEX BLU, ALOE, ecc.)

### STEP 2: Inserisci l'Ordine
- **Misura**: scegli dalle dimensioni disponibili (160x190, 160x200, ecc.)
- **Spessore**: altezza della lastra da tagliare (es: 10.5 cm)
- **Quantità**: quanti pezzi ti servono (es: 50)

### STEP 3: Inserisci l'Altezza Blocco
- **Altezza Lavorabile**: misura il blocco SENZA bucce (es: 98 cm)
- Usa i **pulsanti rapidi** per altezze già usate in passato
- Puoi **salvare** nuove altezze per riutilizzarle dopo

### STEP 4: Leggi il Risultato
Il calcolatore ti mostra:
- 📦 **Blocchi necessari**: quanti blocchi devi richiedere al magazzino
- 📐 **Lastre per blocco**: quante fette escono da ogni blocco
- 🔄 **Rimanenza**: quanto avanza per blocco (in cm)
- 💡 **Suggerimento recupero**: cosa puoi fare con la rimanenza

---

## 📊 Come si calcola?

```
LASTRE PER BLOCCO = Altezza Lavorabile ÷ Spessore Lastra
                    (arrotondato per difetto)

BLOCCHI NECESSARI = Quantità Ordine ÷ Lastre per Blocco
                    (arrotondato per eccesso)

RIMANENZA = Altezza - (Lastre × Spessore)
```

### Esempio Pratico
**Ordine**: D25 Grigio 160x190x10 → 50 pezzi  
**Blocco**: Alto 98 cm lavorabili

- 98 ÷ 10 = **9.8** → 9 lastre per blocco
- 50 ÷ 9 = **5.5** → servono **6 blocchi**
- 98 - (9 × 10) = **8 cm** di rimanenza per blocco

---

## 🔄 Tabella Recuperi Completa

### SPUGNA

| Densità/Colore | Spessore (cm) | Recupero | Note |
|----------------|---------------|----------|------|
| D23/30 NERO | 1.5 | Fogli | |
| D23 Celeste/Stock | 1.5 | Fogli | |
| D23 Celeste/Stock | 3 | Fogli | |
| D25/D30 Verde | 1.5 | Fogli | |
| D25 Giallo | 1.5 | Fogli | |
| D25 Bianco | 3 | Ondina 7 zone | 3cm molle |
| D25 Bianco | 3 | Fogli | |
| D25 Grigio | 3 | Fogli | |
| D25 Grigio | 4 | Fogli | |
| D25 Grigio | 7 | Longheroni Bonnel | Sempre H14 x64/144/188 |
| D25 Grigio | 9, 10, 14 | Longheroni Insacchettati | Sempre H14 x63/143/193/203 |
| **D30 Rosa** | 3 | Fogli | |
| **D30 Rosa** | 4 | Fogli | |
| **D30 Rosa** | **10, 14** | **Longheroni** | **Sempre H14 x63/143/193/203** |
| D25/35 Rosso | 1.5 | Fogli | |
| D25/35 Rosso | 4 | Bugnato 11 zone | Spaccare 6 |
| D35 Verde | 1.5 | Fogli | |

---

### MEMORY

| Tipo | Spessore (cm) | Recupero | Note |
|------|---------------|----------|------|
| VISCOFLEX BLU NEM40 | 4 | Bugnato 11 zone | Spaccare 7.4 |
| VISCOFLEX BLU NEM40 | 4.5 | Ondina 7 zone | |
| VISCOFLEX BLU NEM40 | 4.8 | Liscio per Topper | |
| VISCOFLEX BLU NEM40 | 4.5 | Bugnato std | Spaccare 7.4 |
| VISCOFLEX/SOFT BIANCO | 2.5 | Liscio | |
| VISCOFLEX/SOFT BIANCO | 4.5 | Liscio | |
| VISCOFLEX/SOFT BIANCO | 3 | Liscio | |
| ALOE | 4.5 | Ondina 7 zone | |
| GINSENG | 4.5 | Bugnato std | Spaccare 7.4 |
| Soya | 4.5 | Bugnato std | Spaccare 7.4 |
| CERAMIC VIOLA | 4 | Bugnato 11 zone | Spaccare 6 |
| VITAMINIC | 4.5 | Ondina 7 zone | |
| VITAMINIC | 4.5 | Bugnato std | Spaccare 7.4 |
| AirSense | 4.5 | Ondina 7 zone | |
| EM40R BIANCO | 2.5 | Liscio | |
| EM40R BIANCO | 4.5 | Ondina 7 zone | Ergopure |
| EM40R BIANCO | 5.5 | New Aquaform | |
| YLANG | 4.5 | Ondina 7 zone | |
| X-Form | 4.5 | Ondina 7 zone | |

> ⚠️ Se la rimanenza NON corrisponde a nessun recupero, chiedi al coordinatore!


---

## 🖨️ Stampa

Puoi stampare un foglio riepilogativo con:
- Tutti i dati dell'ordine
- Numero blocchi necessari
- Schema visivo dei tagli
- Suggerimenti recupero

Usa il pulsante **🖨️ STAMPA** dopo aver fatto il calcolo.

---

## 📦 Richiedi Blocchi

Dopo il calcolo, puoi inviare la richiesta direttamente al magazzino  
con il pulsante **📦 RICHIEDI BLOCCHI**.

---

## ❓ Problemi Frequenti

| Problema | Soluzione |
|----------|-----------|
| Non trovo la mia densità | Chiedi all'admin di aggiungerla in "Config. Blocchi" |
| L'altezza che uso non è nei pulsanti rapidi | Inseriscila manualmente e salvala |
| Il suggerimento recupero non è corretto | Segnalalo, la tabella recuperi è aggiornabile |

---

**Ultimo aggiornamento**: Febbraio 2026  
**Contatto tecnico**: Coordinatore reparto / Admin sistema
