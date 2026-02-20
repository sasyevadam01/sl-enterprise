"""Test task creation from checklist"""
import requests
import json

BASE = "http://127.0.0.1:8000"

# Login
r = requests.post(f"{BASE}/auth/token", data={"username": "slaezza", "password": "Siervo2025!"})
print("Login:", r.status_code)
if r.status_code != 200:
    # Try another user
    from database import engine
    from sqlalchemy import text
    with engine.connect() as c:
        users = c.execute(text("SELECT username FROM users WHERE is_active=1 LIMIT 5")).fetchall()
        print("Available users:", [u[0] for u in users])
    exit()

token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create task with same payload as ChecklistHistoryPage
payload = {
    "title": "TEST RIPARAZIONE MEZZO-01 (2 FIX)",
    "description": "ANOMALIA MEZZO: MEZZO-01\nSegnalato da: Test\nNote: test\n--- GENERATO DA SISTEMA CONTROLLO FLOTTA ---",
    "priority": 9,
    "assigned_to": 1,
    "checklist": [
        {"text": "RIPARARE: LIVELLO OLIO", "done": False},
        {"text": "RIPARARE: FARI", "done": False}
    ],
    "category": "Manutenzione",
    "tags": ["flotta", "auto_fix"]
}

r = requests.post(f"{BASE}/tasks/", json=payload, headers=headers)
print("Create task:", r.status_code)
print("Response:", r.text[:500])
