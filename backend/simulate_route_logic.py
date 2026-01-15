from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Setup DB
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Import App Models & Schemas
try:
    from database import (
        Employee, EmployeeEvent, LeaveRequest
    )
    from schemas import EmployeeListResponse
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def simulate_route():
    print("--- SIMULAZIONE LOGICA ROUTE ---")
    
    # 1. Query Base
    try:
        query = db.query(Employee).filter(Employee.is_active == True)
        employees = query.order_by(Employee.last_name, Employee.first_name).all()
        print(f"1. Query Base OK. Trovati {len(employees)} dipendenti attivi.")
    except Exception as e:
        print(f"❌ Errore Query Base: {str(e)}")
        return

    # 2. Loop e Logica Extra
    results = []
    print("2. Inizio Loop Elaborazione...")
    
    for i, emp in enumerate(employees):
        try:
            # A. Validazione Pydantic
            emp_data = EmployeeListResponse.model_validate(emp)
            
            # B. Query Eventi HR
            try:
                last_hr_event = db.query(EmployeeEvent).filter(
                    EmployeeEvent.employee_id == emp.id
                ).order_by(EmployeeEvent.event_date.desc()).first()
            except Exception as e:
                print(f"❌ Errore Query Eventi per Emp {emp.id}: {str(e)}")
                raise e

            # C. Query Ferie
            try:
                last_leave = db.query(LeaveRequest).filter(
                    LeaveRequest.employee_id == emp.id
                ).order_by(LeaveRequest.start_date.desc()).first()
            except Exception as e:
                print(f"❌ Errore Query Ferie per Emp {emp.id}: {str(e)}")
                raise e
            
            # D. Logica confronto
            best_event = None
            best_date = None
            
            if last_hr_event:
                best_event = last_hr_event.event_label
                best_date = last_hr_event.event_date
                
            if last_leave:
                leave_label = f"Ferie: {last_leave.leave_type}"
                # Comparazione date (possibile errore TypeError se date None o offset-naive vs aware)
                if not best_date or last_leave.start_date > best_date:
                    best_event = leave_label
                    best_date = last_leave.start_date
                    
            emp_data.last_event_label = best_event
            emp_data.last_event_date = best_date
            
            results.append(emp_data)
            
        except Exception as e:
            print(f"❌ CRASH SU DIPENDENTE {emp.id} ({emp.first_name} {emp.last_name}):")
            print(f"   Errore: {str(e)}")
            # Interrompiamo per permettere all'utente di vedere l'errore
            return

    print(f"\n✅ SIMULAZIONE COMPLETATA CON SUCCESSO.")
    print(f"   Generata lista di {len(results)} oggetti.")
    db.close()

if __name__ == "__main__":
    simulate_route()
