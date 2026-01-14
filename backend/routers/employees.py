"""
SL Enterprise - Employees Router
Gestione anagrafica dipendenti.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import os
import shutil

from database import (
    get_db, Employee, EmployeeDocument, EmployeeCertification,
    EmployeeTraining, MedicalExam, DisciplinaryRecord, User,
    EmployeeEvent, LeaveRequest, Department, Banchina
)
from schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListResponse,
    DocumentCreate, DocumentResponse,
    CertificationCreate, CertificationResponse,
    TrainingCreate, TrainingResponse,
    MedicalExamCreate, MedicalExamResponse,
    MessageResponse
)
from security import get_current_user, get_hr_or_admin

router = APIRouter(prefix="/employees", tags=["Dipendenti"])

# Directory per upload documenti
UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================================
# CRUD DIPENDENTI
# ============================================================

@router.get("/", response_model=List[EmployeeListResponse], summary="Lista Dipendenti")
async def list_employees(
    skip: int = 0,
    limit: int = 1000,
    active_only: bool = True,
    department_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista tutti i dipendenti con filtri."""
    query = db.query(Employee)
    
    if active_only:
        query = query.filter(Employee.is_active == True)
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    employees = query.order_by(Employee.last_name, Employee.first_name).offset(skip).limit(limit).all()
    
    # Calcolo Ultimo Evento per ogni dipendente
    results = []
    for emp in employees:
        # Converti in dict/schema
        emp_data = EmployeeListResponse.model_validate(emp)
        
        # Cerca ultimo evento HR
        last_hr_event = db.query(EmployeeEvent).filter(
            EmployeeEvent.employee_id == emp.id
        ).order_by(EmployeeEvent.event_date.desc()).first()
        
        # Cerca ultima richiesta ferie (data inizio)
        last_leave = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id
        ).order_by(LeaveRequest.start_date.desc()).first()
        
        # Confronta
        best_event = None
        best_date = None
        
        if last_hr_event:
            best_event = last_hr_event.event_label
            best_date = last_hr_event.event_date
            
        if last_leave:
            leave_label = f"Ferie: {last_leave.leave_type}"
            if not best_date or last_leave.start_date > best_date:
                best_event = leave_label
                best_date = last_leave.start_date
                
        emp_data.last_event_label = best_event
        emp_data.last_event_date = best_date
        results.append(emp_data)
        
    return results


@router.get("/roles/list", response_model=List[str], summary="Lista Ruoli Disponibili")
async def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni lista ruoli univoci dal database, ordinati alfabeticamente."""
    roles = db.query(Employee.current_role).filter(
        Employee.current_role != None,
        Employee.current_role != 'nan',
        Employee.current_role != ''
    ).distinct().order_by(Employee.current_role).all()
    return [r[0] for r in roles if r[0]]


@router.get("/banchine/list", summary="Lista Banchine")
async def get_banchine(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni lista banchine disponibili."""
    banchine = db.query(Banchina).order_by(Banchina.code).all()
    return [{"id": b.id, "code": b.code, "name": b.name} for b in banchine]


@router.post("/", response_model=EmployeeResponse, summary="Crea Dipendente")
async def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Crea nuovo dipendente (wizard guidato)."""
    # [REMOVED] fiscal_code check - field is no longer used
    
    # [FIX] Link Department Name -> Department ID
    if employee_data.department_name:
        dept = db.query(Department).filter(Department.name == employee_data.department_name).first()
        if dept:
            employee_data.department_id = dept.id
        else:
            # Opzionale: gestire caso reparto non trovato (crearlo o warning?)
            # Per ora lasciamo department_id come è (o None)
            pass

    new_employee = Employee(**employee_data.model_dump())
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    return new_employee


@router.get("/{employee_id}", response_model=EmployeeResponse, summary="Dettaglio Dipendente")
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ottieni dossier completo dipendente."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    return employee


@router.patch("/{employee_id}", response_model=EmployeeResponse, summary="Modifica Dipendente")
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Modifica dati dipendente."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # [FIX] Link Department Name -> Department ID if name changed
    if employee_data.department_name is not None:
        dept = db.query(Department).filter(Department.name == employee_data.department_name).first()
        if dept:
            # Aggiorna anche l'ID automaticamente
            employee.department_id = dept.id
        else:
            # Se il nome reparto non esiste, potremmo azzerare l'ID o lasciarlo stare?
            # Meglio azzerarlo per coerenza se il nome è invalido/nuovo
            # employee.department_id = None
            pass

    update_data = employee_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Dipendente")
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Elimina definitivamente un dipendente e tutti i dati correlati."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Rimuovi user associato se esiste (opzionale, ma pulito)
    if employee.user_id:
        user = db.query(User).filter(User.id == employee.user_id).first()
        if user:
            db.delete(user)

    db.delete(employee)
    db.commit()
    return None
    
    db.delete(employee)
    db.commit()
    return None
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    update_data = employee_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    db.commit()
    db.refresh(employee)
    return employee


# ============================================================
# DOCUMENTI
# ============================================================

@router.get("/{employee_id}/documents", response_model=List[DocumentResponse], summary="Lista Documenti")
async def list_documents(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista documenti allegati al dipendente."""
    docs = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == employee_id).all()
    return docs


@router.post("/{employee_id}/documents", response_model=DocumentResponse, summary="Carica Documento")
async def upload_document(
    employee_id: int,
    doc_type: str,
    doc_name: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Carica documento PDF per dipendente."""
    # Verifica dipendente esiste
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    # Salva file
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    file_name = f"{employee_id}_{doc_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Salva record DB
    doc = EmployeeDocument(
        employee_id=employee_id,
        doc_type=doc_type,
        doc_name=doc_name,
        file_path=file_path,
        uploaded_by=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    return doc


@router.delete("/{employee_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Documento")
async def delete_document(
    employee_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Elimina documento."""
    doc = db.query(EmployeeDocument).filter(
        EmployeeDocument.id == doc_id,
        EmployeeDocument.employee_id == employee_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Rimuovi file fisico
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError:
            pass # Ignora errori file system
            
    db.delete(doc)
    db.commit()
    return None


# ============================================================
# CERTIFICAZIONI
# ============================================================

@router.get("/{employee_id}/certifications", response_model=List[CertificationResponse], summary="Lista Certificazioni")
async def list_certifications(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista certificazioni/patentini del dipendente."""
    certs = db.query(EmployeeCertification).filter(EmployeeCertification.employee_id == employee_id).all()
    return certs


@router.post("/{employee_id}/certifications", response_model=CertificationResponse, summary="Aggiungi Certificazione")
async def add_certification(
    employee_id: int,
    cert_data: CertificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Aggiungi certificazione al dipendente."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    cert = EmployeeCertification(employee_id=employee_id, **cert_data.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    
    return cert


@router.delete("/{employee_id}/certifications/{cert_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Certificazione")
async def delete_certification(
    employee_id: int,
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Elimina certificazione."""
    cert = db.query(EmployeeCertification).filter(
        EmployeeCertification.id == cert_id,
        EmployeeCertification.employee_id == employee_id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificazione non trovata")
            
    db.delete(cert)
    db.commit()
    return None


@router.patch("/{employee_id}/certifications/{cert_id}", response_model=CertificationResponse, summary="Modifica Certificazione")
async def update_certification(
    employee_id: int,
    cert_id: int,
    cert_data: CertificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Modifica certificazione esistente."""
    cert = db.query(EmployeeCertification).filter(
        EmployeeCertification.id == cert_id,
        EmployeeCertification.employee_id == employee_id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificazione non trovata")
    
    update_data = cert_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cert, field, value)
    
    db.commit()
    db.refresh(cert)
    return cert


# ============================================================
# FORMAZIONE
# ============================================================

@router.get("/{employee_id}/trainings", response_model=List[TrainingResponse], summary="Lista Formazione")
async def list_trainings(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista corsi formazione del dipendente."""
    trainings = db.query(EmployeeTraining).filter(EmployeeTraining.employee_id == employee_id).all()
    return trainings


@router.post("/{employee_id}/trainings", response_model=TrainingResponse, summary="Aggiungi Formazione")
async def add_training(
    employee_id: int,
    training_data: TrainingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Registra corso formazione per dipendente."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    training = EmployeeTraining(employee_id=employee_id, **training_data.model_dump())
    db.add(training)
    db.commit()
    db.refresh(training)
    
    return training


@router.patch("/{employee_id}/trainings/{training_id}", response_model=TrainingResponse, summary="Modifica Formazione")
async def update_training(
    employee_id: int,
    training_id: int,
    training_data: TrainingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Modifica corso formazione esistente."""
    training = db.query(EmployeeTraining).filter(
        EmployeeTraining.id == training_id,
        EmployeeTraining.employee_id == employee_id
    ).first()
    if not training:
        raise HTTPException(status_code=404, detail="Corso di formazione non trovato")
    
    update_data = training_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(training, field, value)
    
    db.commit()
    db.refresh(training)
    return training


# ============================================================
# VISITE MEDICHE
# ============================================================

@router.get("/{employee_id}/medical", response_model=List[MedicalExamResponse], summary="Lista Visite Mediche")
async def list_medical_exams(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista visite mediche del dipendente."""
    exams = db.query(MedicalExam).filter(MedicalExam.employee_id == employee_id).all()
    return exams


@router.post("/{employee_id}/medical", response_model=MedicalExamResponse, summary="Aggiungi Visita Medica")
async def add_medical_exam(
    employee_id: int,
    exam_data: MedicalExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Registra visita medica per dipendente."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    
    exam = MedicalExam(employee_id=employee_id, **exam_data.model_dump())
    db.add(exam)
    db.commit()
    db.refresh(exam)
    
    return exam


@router.delete("/{employee_id}/medical/{exam_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Elimina Visita Medica")
async def delete_medical_exam(
    employee_id: int,
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Elimina visita medica."""
    exam = db.query(MedicalExam).filter(
        MedicalExam.id == exam_id,
        MedicalExam.employee_id == employee_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Visita medica non trovata")
            
    db.delete(exam)
    db.commit()
    return None


@router.patch("/{employee_id}/medical/{exam_id}", response_model=MedicalExamResponse, summary="Modifica Visita Medica")
async def update_medical_exam(
    employee_id: int,
    exam_id: int,
    exam_data: MedicalExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Modifica visita medica esistente."""
    exam = db.query(MedicalExam).filter(
        MedicalExam.id == exam_id,
        MedicalExam.employee_id == employee_id
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Visita medica non trovata")
    
    update_data = exam_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exam, field, value)
    
    db.commit()
    db.refresh(exam)
    return exam


# ============================================================
# CONTRATTI IN SCADENZA
# ============================================================

@router.get("/expiring-contracts", response_model=List[EmployeeListResponse], summary="Contratti in Scadenza")
async def get_expiring_contracts(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Lista dipendenti con contratto in scadenza nei prossimi X giorni."""
    from datetime import timedelta
    
    today = datetime.now()
    limit_date = today + timedelta(days=days)
    
    employees = db.query(Employee).filter(
        Employee.contract_end != None,
        Employee.contract_end <= limit_date,
        Employee.contract_end >= today,
        Employee.is_active == True
    ).all()
    
    return employees
