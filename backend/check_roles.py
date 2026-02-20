"""Verifica utenti senza role_id assegnato"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from database import engine
from sqlalchemy import text

with engine.connect() as c:
    print("=== COORDINATORI ===")
    rows = c.execute(text(
        "SELECT u.id, u.username, u.full_name, u.role, u.role_id, r.label "
        "FROM users u LEFT JOIN roles r ON u.role_id = r.id "
        "WHERE u.role = 'coordinator' AND u.is_active = 1"
    )).fetchall()
    for r in rows:
        status = "OK" if r[4] else "MANCANTE"
        print(f"  [{status}] id={r[0]}, {r[2]} ({r[1]}), role_id={r[4]}, gruppo={r[5]}")

    print("\n=== UTENTI ATTIVI SENZA ROLE_ID ===")
    rows = c.execute(text(
        "SELECT id, username, full_name, role FROM users WHERE role_id IS NULL AND is_active = 1"
    )).fetchall()
    if rows:
        for r in rows:
            print(f"  [PROBLEMA] id={r[0]}, {r[2]} ({r[1]}), role={r[3]}")
    else:
        print("  Nessun utente attivo senza role_id")
    
    print("\n=== GRUPPI DISPONIBILI ===")
    rows = c.execute(text("SELECT id, name, label FROM roles")).fetchall()
    for r in rows:
        print(f"  id={r[0]}, name={r[1]}, label={r[2]}")
