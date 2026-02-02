import sys
import os

sys.path.append(os.getcwd())

from database import SessionLocal
from models.shifts import ShiftAssignment
from models.core import User
from models.hr import Employee
from datetime import datetime, timedelta

def inspect_shifts():
    db = SessionLocal()
    try:
        # Find 'diodato' user
        user = db.query(User).filter(User.username.like("%diod%")).first()
        if not user:
            print("User 'diodato' not found.")
            return
            
        print(f"Found User: {user.username} (ID: {user.id})")

        # Get shifts for THIS week (assigned by him)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        # Assuming today Jan 26 is Monday
        
        print(f"Checking shifts assigned by ID {user.id} from {today.date()} onwards...")
        
        shifts = db.query(ShiftAssignment).filter(
            ShiftAssignment.work_date >= today
        ).order_by(ShiftAssignment.work_date).limit(50).all()
        
        if not shifts:
            print("No shifts found created by this user for upcoming dates.")
            # Check previous week maybe?
            prev_week = today - timedelta(days=7)
            print(f"Checking previous week ({prev_week.date()})...")
            shifts = db.query(ShiftAssignment).filter(
                ShiftAssignment.assigned_by == user.id,
                ShiftAssignment.work_date >= prev_week
            ).order_by(ShiftAssignment.work_date).limit(50).all()

        for s in shifts:
            emp = db.query(Employee).filter(Employee.id == s.employee_id).first()
            emp_name = f"{emp.last_name} {emp.first_name}" if emp else "Unknown"
            
            # Helper to interpret times
            time_display = f"{s.start_time}-{s.end_time}"
            if s.shift_type == 'morning': time_display = "06-14 (Auto)"
            elif s.shift_type == 'afternoon': time_display = "14-22 (Auto)"
            elif s.shift_type == 'night': time_display = "22-06 (Auto)"
            
            print(f"Date: {s.work_date.date()} | Emp: {emp_name:<20} | Type: {s.shift_type:<10} | Time: {time_display}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_shifts()
