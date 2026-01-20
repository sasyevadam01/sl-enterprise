"""
SL Enterprise - Migrazione Utenti al nuovo sistema RBAC
Questo script:
1. Assicura che tutti i ruoli esistano nel DB (esegue seed_roles)
2. Collega OGNI utente al role_id corretto in base al campo 'role' legacy

Eseguire: python migrate_users_to_rbac.py
"""
from database import SessionLocal, Role, User

# Import del seed per assicurarci che i ruoli esistano
from init_roles import seed_roles

def migrate_all_users():
    """Migra tutti gli utenti al sistema RBAC."""
    
    # Step 1: Assicuriamoci che i ruoli esistano
    print("=" * 50)
    print("FASE 1: Verifica/Creazione Ruoli")
    print("=" * 50)
    seed_roles()
    
    # Step 2: Mappa ogni utente al suo role_id
    print("\n" + "=" * 50)
    print("FASE 2: Migrazione Utenti")
    print("=" * 50)
    
    db = SessionLocal()
    try:
        # Carica tutti i ruoli in un dizionario per lookup veloce
        roles = db.query(Role).all()
        role_map = {r.name: r.id for r in roles}
        print(f"Ruoli trovati: {role_map}")
        
        # Trova tutti gli utenti senza role_id
        users_to_fix = db.query(User).filter(User.role_id == None).all()
        print(f"\nUtenti da migrare: {len(users_to_fix)}")
        
        fixed_count = 0
        errors = []
        
        for user in users_to_fix:
            legacy_role = user.role  # es. 'coordinator', 'admin', etc.
            
            if legacy_role in role_map:
                user.role_id = role_map[legacy_role]
                print(f"  [OK] {user.username}: '{legacy_role}' -> role_id={role_map[legacy_role]}")
                fixed_count += 1
            else:
                errors.append(f"  [ERR] {user.username}: ruolo '{legacy_role}' non trovato nella tabella Roles!")
        
        if errors:
            print("\n[WARN] ERRORI:")
            for e in errors:
                print(e)
        
        db.commit()
        
        # Verifica finale
        print("\n" + "=" * 50)
        print("FASE 3: Verifica Finale")
        print("=" * 50)
        
        total_users = db.query(User).count()
        users_with_role_id = db.query(User).filter(User.role_id != None).count()
        users_without_role_id = db.query(User).filter(User.role_id == None).count()
        
        print(f"Totale utenti: {total_users}")
        print(f"  [OK] Con role_id: {users_with_role_id}")
        print(f"  [ERR] Senza role_id: {users_without_role_id}")
        
        if users_without_role_id == 0:
            print("\n[SUCCESS] MIGRAZIONE COMPLETATA CON SUCCESSO!")
            print("Tutti gli utenti ora usano il sistema RBAC dinamico.")
        else:
            print("\n[WARN] Alcuni utenti non sono stati migrati. Verifica manualmente.")
            
    except Exception as e:
        print(f"[CRITICAL] Errore critico: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    migrate_all_users()
