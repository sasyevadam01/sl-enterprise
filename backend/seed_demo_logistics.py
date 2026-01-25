"""
SEED DEMO DATA FOR LOGISTICS
Questo script popola il DB con dati fittizi per mostrare la dashboard logistica in azione.
"""
from database import SessionLocal
from models.logistics import LogisticsRequest, LogisticsMaterialType, LogisticsPerformance
from models.core import User
from models.hr import Employee
from models.factory import Banchina
from datetime import datetime, timedelta
import random

db = SessionLocal()

def seed_demo():
    print("Seeding Demo Data...")
    
    # 1. Trova utenti e banchine (Fallbacks)
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("Utente 'admin' non trovato, cerco il primo utente disponibile...")
        admin = db.query(User).first()
        
    if not admin:
        print("Nessun utente trovato! Impossibile creare richieste.")
        return

    print(f"Using User: {admin.username} (ID: {admin.id})")

    banchine = db.query(Banchina).all()
    materials = db.query(LogisticsMaterialType).all()
    
    if not banchine:
        print("Errore: Banchine mancanti.")
        return
    
    if not materials:
        print("Materiali mancanti, ne creo uno al volo.")
        m = LogisticsMaterialType(label="Generico", icon="📦", is_active=True)
        db.add(m)
        db.commit()
        db.refresh(m)
        materials = [m]

    # Pulizia richieste precedenti (opzionale, ma utile per demo pulita)
    # db.query(LogisticsRequest).delete() # Meglio di no, potrei cancellare dati veri
    
    # 2. Crea Richieste Demo
    now = datetime.utcnow()
    
    # Richiesta 1: Pending su B1 (Taglio) - Urgente (Attesa 7.5 min)
    req1 = LogisticsRequest(
        material_type_id=materials[0].id,
        banchina_id=1, # B1
        requester_id=admin.id,
        status="pending",
        is_urgent=True,
        created_at=now - timedelta(seconds=450),
        quantity=2
    )
    
    # Richiesta 2: Processing su B14 (Bordatura) - Presa in carico 5 min fa
    req2 = LogisticsRequest(
        material_type_id=materials[1].id if len(materials) > 1 else materials[0].id,
        banchina_id=14, # B14
        requester_id=admin.id,
        status="processing",
        assigned_to_id=admin.id,
        created_at=now - timedelta(minutes=15),
        taken_at=now - timedelta(minutes=5),
        promised_eta_minutes=10,
        quantity=1
    )
    
    # Richiesta 3: Pending su B14 (Multipla richiesta -> Badge x2) - Attesa 1 min
    req3 = LogisticsRequest(
        material_type_id=materials[2].id if len(materials) > 2 else materials[0].id,
        banchina_id=14, # Ancora B14!
        requester_id=admin.id,
        status="pending",
        quantity=5,
        created_at=now - timedelta(seconds=60)
    )

    db.add_all([req1, req2, req3])
    
    # 3. Aggiorna Performance Admin (per Dossier)
    if admin.employee:
        perf = db.query(LogisticsPerformance).filter(LogisticsPerformance.employee_id == admin.employee.id).first()
        if not perf:
            perf = LogisticsPerformance(
                employee_id=admin.employee.id,
                month=datetime.utcnow().month,
                year=datetime.utcnow().year
            )
            db.add(perf)
        
        perf.missions_completed = 42
        perf.missions_urgent = 8
        perf.total_points = 156
        perf.penalties_received = 5
        perf.avg_reaction_seconds = 45
        perf.fastest_reaction_seconds = 12
        perf.eta_accuracy_percent = 98

    db.commit()
    print("Demo Data Injected! Dashboard should look alive now.")

if __name__ == "__main__":
    seed_demo()
