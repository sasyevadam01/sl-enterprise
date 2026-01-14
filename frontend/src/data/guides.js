/**
 * SL Enterprise - Usage Guides Data
 * Contenuto per gli specchietti "Info Utilizzo" di ogni pagina.
 */

export const GUIDE_CONTENT = {
    // --- AUTH ---
    "/login": {
        title: "Accesso al Sistema",
        steps: [
            "Inserisci Username e Password forniti dall'amministratore.",
            "Se non ricordi le credenziali, contatta l'ufficio HR."
        ],
        tips: ["I ruoli diversi (Admin, HR, Factory) vedono menu diversi."]
    },

    // --- HR SUITE ---
    "/hr/employees": {
        title: "Gestione Dipendenti",
        steps: [
            "Visualizza l'elenco completo dei dipendenti.",
            "Usa i filtri in alto per cercare per reparto o nome.",
            "Clicca su un dipendente per aprire il Dossier Completo."
        ],
        tips: ["Il pallino verde/rosso indica se il dipendente è attivo."]
    },
    "/hr/employees/:id": { // Pattern match handled in component
        title: "Dossier Dipendente",
        steps: [
            "Modifica i dati anagrafici e contrattuali.",
            "Imposta la 'Banchina di Appartenenza' per il monitor produzione.",
            "Gestisci Documenti (carica PDF), Certificazioni e Visite Mediche nei tab dedicati."
        ],
        tips: ["Usa 'Ruolo Secondario' per indicare competenze extra (es. Jolly)."]
    },
    "/hr/planner": {
        title: "Pianificazione Turni",
        steps: [
            "Seleziona la settimana dal calendario in alto.",
            "Clicca su una cella (Giorno/Dipendente) per assegnare un turno.",
            "Usa 'Copia Settimana Prec.' per velocizzare il lavoro.",
            "Il tasto 'Esporta Excel' scarica il piano attuale."
        ],
        tips: ["Puoi assegnare turni a tutta la settimana cliccando sull'intestazione del dipendente."]
    },
    "/hr/events": {
        title: "Gestione Eventi & Disciplinare",
        steps: [
            "Registra eventi positivi (Elogi, Eccellenze) o negativi (Richiami).",
            "Il sistema calcola automaticamente il punteggio del dipendente.",
            "I Badge vengono assegnati in automatico al raggiungimento dei target."
        ],
        tips: ["Le ammonizioni gravi richiedono approvazione."]
    },

    // --- FACTORY ---
    "/factory/monitor": {
        title: "Monitor Produzione",
        steps: [
            "Visualizza lo stato in tempo reale delle Banchine.",
            "Usa il selettore (Mattina/Pom/Notte) in alto.",
            "Clicca su una Banchina per modificare i requisiti."
        ],
        tips: [
            "🔴 Rosso = Sottoorganico (Mancano operatori)",
            "🟢 Verde = Bilanciato (Tutti i ruoli coperti)",
            "🔵 Blu = Surplus (Più operatori del necessario)"
        ]
    },
    "/factory/machines": {
        title: "Registro Macchinari",
        steps: [
            "Elenco di tutti i macchinari aziendali.",
            "Clicca su 'Nuova Macchina' per aggiungerne una.",
            "Gestisci lo stato (Attiva/In Manutenzione)."
        ],
        tips: []
    }
};
