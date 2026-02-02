"""
AI Bridge per comunicazione con DeepSeek R1 locale via Ollama.
Permette di inviare prompt e ricevere risposte pulite.

Requisiti:
    pip install requests

Uso CLI:
    python ai_bridge.py "Il tuo prompt qui" [output_file.txt]

Uso come modulo:
    from ai_bridge import ask_deepseek
    response = ask_deepseek("Analizza questo documento...")
"""

import requests
import json
import sys
import os
import re

# Configurazione Ollama
OLLAMA_API_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "deepseek-r1:8b"  # Ottimizzato per RTX 3070 8GB VRAM

def ask_deepseek(prompt, system_prompt="Sei un assistente esperto in analisi documentale e sviluppo software.", model=None, temperature=0.6):
    """
    Invia un prompt a DeepSeek via Ollama API.
    
    Args:
        prompt: Il testo del prompt da inviare
        system_prompt: Istruzioni di sistema per il modello
        model: Modello da usare (default: deepseek-r1:8b)
        temperature: Creatività delle risposte (0.0-1.0)
    
    Returns:
        str: Risposta pulita del modello (senza tag <think>)
    """
    payload = {
        "model": model or DEFAULT_MODEL,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_ctx": 8192
        }
    }
    
    try:
        print(f"[INFO] Inviando richiesta a {OLLAMA_API_URL}...")
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
        response.raise_for_status()
        result = response.json()
        raw_response = result.get("response", "Nessuna risposta ricevuta.")
        
        # Rimuovi tag di ragionamento <think>...</think>
        clean_response = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL).strip()
        
        # Rimuovi blocchi Markdown code se presenti
        clean_response = re.sub(r'```[a-zA-Z]*\n', '', clean_response)
        clean_response = re.sub(r'```', '', clean_response)
        
        return clean_response.strip()
        
    except requests.exceptions.ConnectionError:
        return "[ERRORE] Impossibile connettersi a Ollama. Assicurati che sia in esecuzione (ollama serve)."
    except requests.exceptions.Timeout:
        return "[ERRORE] Timeout nella risposta. Il modello potrebbe essere troppo lento."
    except Exception as e:
        return f"[ERRORE] {str(e)}"


def analyze_documents(docs_folder, output_file=None):
    """
    Analizza tutti i documenti in una cartella e produce raccomandazioni.
    
    Args:
        docs_folder: Percorso alla cartella con i documenti
        output_file: File dove salvare i risultati (opzionale)
    
    Returns:
        str: Report delle raccomandazioni
    """
    import glob
    
    docs = []
    for ext in ['*.md', '*.txt', '*.docx']:
        docs.extend(glob.glob(os.path.join(docs_folder, ext)))
    
    if not docs:
        return f"Nessun documento trovato in {docs_folder}"
    
    prompt = f"""Analizza i seguenti documenti e per ciascuno indica:
1. Da TENERE o da ELIMINARE
2. Motivazione breve
3. Se da tenere, eventuali aggiornamenti necessari

Documenti trovati ({len(docs)}):
"""
    
    for doc in docs:
        filename = os.path.basename(doc)
        try:
            with open(doc, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()[:2000]  # Primi 2000 caratteri
            prompt += f"\n\n--- {filename} ---\n{content}\n"
        except Exception as e:
            prompt += f"\n\n--- {filename} ---\n[Errore lettura: {e}]\n"
    
    prompt += "\n\nFornisci una tabella riassuntiva con le tue raccomandazioni."
    
    response = ask_deepseek(prompt, 
        system_prompt="Sei un esperto in documentazione aziendale. Valuta quali documenti sono utili e aggiornati.")
    
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response)
        print(f"[OK] Risultati salvati in {output_file}")
    
    return response


def main():
    """Entry point CLI."""
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nEsempi:")
        print('  python ai_bridge.py "Spiega cos\'è FastAPI"')
        print('  python ai_bridge.py "Analizza questo codice..." output.txt')
        print('  python ai_bridge.py --analyze-docs ./Documentazione report.txt')
        sys.exit(1)
    
    # Modalità analisi documenti
    if sys.argv[1] == '--analyze-docs':
        if len(sys.argv) < 3:
            print("Uso: python ai_bridge.py --analyze-docs <cartella> [output.txt]")
            sys.exit(1)
        docs_folder = sys.argv[2]
        output_file = sys.argv[3] if len(sys.argv) > 3 else None
        result = analyze_documents(docs_folder, output_file)
        print(result)
        sys.exit(0)
    
    # Modalità prompt singolo
    prompt = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    response = ask_deepseek(prompt)
    
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response)
        print(f"[OK] Risposta salvata in {output_file}")
    else:
        print(response)


if __name__ == "__main__":
    main()
