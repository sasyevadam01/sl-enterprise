"""
SL Enterprise - Expiry Router
Scadenze corsi/visite mediche.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from database import get_db, EmployeeCertification, MedicalExam, Employee, User
from schemas import CertificationResponse, MedicalExamResponse
from security import get_current_user, get_hr_or_admin

router = APIRouter(prefix="/expiries", tags=["Scadenze"])


@router.get("/certifications", summary="Certificazioni in Scadenza")
async def get_expiring_certifications(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Lista certificazioni in scadenza nei prossimi X giorni."""
    today = datetime.now()
    limit_date = today + timedelta(days=days)
    
    certs = db.query(EmployeeCertification).join(Employee).filter(
        EmployeeCertification.expiry_date != None,
        EmployeeCertification.expiry_date <= limit_date,
        EmployeeCertification.expiry_date >= today,
        Employee.is_active == True
    ).all()
    
    results = []
    for cert in certs:
        employee = db.query(Employee).filter(Employee.id == cert.employee_id).first()
        results.append({
            "id": cert.id,
            "employee_id": cert.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "cert_type": cert.cert_type,
            "cert_name": cert.cert_name,
            "expiry_date": cert.expiry_date,
            "days_remaining": (cert.expiry_date - today).days
        })
    
    return results


@router.get("/medical", summary="Visite Mediche in Scadenza")
async def get_expiring_medical_exams(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Lista visite mediche in scadenza nei prossimi X giorni."""
    today = datetime.now()
    limit_date = today + timedelta(days=days)
    
    exams = db.query(MedicalExam).join(Employee).filter(
        MedicalExam.next_exam_date != None,
        MedicalExam.next_exam_date <= limit_date,
        MedicalExam.next_exam_date >= today,
        Employee.is_active == True
    ).all()
    
    results = []
    for exam in exams:
        employee = db.query(Employee).filter(Employee.id == exam.employee_id).first()
        results.append({
            "id": exam.id,
            "employee_id": exam.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "exam_type": exam.exam_type,
            "next_exam_date": exam.next_exam_date,
            "days_remaining": (exam.next_exam_date - today).days
        })
    
    return results


@router.get("/dashboard", summary="Dashboard Scadenze")
async def get_expiry_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_hr_or_admin)
):
    """Dashboard riepilogativa scadenze."""
    today = datetime.now()
    
    # Prossimi 7 giorni
    week = today + timedelta(days=7)
    # Prossimi 30 giorni
    month = today + timedelta(days=30)
    
    # Certificazioni
    certs_week = db.query(EmployeeCertification).join(Employee).filter(
        EmployeeCertification.expiry_date != None,
        EmployeeCertification.expiry_date <= week,
        EmployeeCertification.expiry_date >= today,
        Employee.is_active == True
    ).count()
    
    certs_month = db.query(EmployeeCertification).join(Employee).filter(
        EmployeeCertification.expiry_date != None,
        EmployeeCertification.expiry_date <= month,
        EmployeeCertification.expiry_date >= today,
        Employee.is_active == True
    ).count()
    
    # Visite mediche
    medical_week = db.query(MedicalExam).join(Employee).filter(
        MedicalExam.next_exam_date != None,
        MedicalExam.next_exam_date <= week,
        MedicalExam.next_exam_date >= today,
        Employee.is_active == True
    ).count()
    
    medical_month = db.query(MedicalExam).join(Employee).filter(
        MedicalExam.next_exam_date != None,
        MedicalExam.next_exam_date <= month,
        MedicalExam.next_exam_date >= today,
        Employee.is_active == True
    ).count()
    
    # Contratti
    from database import Employee as Emp
    contracts_week = db.query(Emp).filter(
        Emp.contract_end != None,
        Emp.contract_end <= week,
        Emp.contract_end >= today,
        Emp.is_active == True
    ).count()
    
    contracts_month = db.query(Emp).filter(
        Emp.contract_end != None,
        Emp.contract_end <= month,
        Emp.contract_end >= today,
        Emp.is_active == True
    ).count()
    
    return {
        "certifications": {"week": certs_week, "month": certs_month},
        "medical_exams": {"week": medical_week, "month": medical_month},
        "contracts": {"week": contracts_week, "month": contracts_month},
        "total_urgent": certs_week + medical_week + contracts_week
    }
