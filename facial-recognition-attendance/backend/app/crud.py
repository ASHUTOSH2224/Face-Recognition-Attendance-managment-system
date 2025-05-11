from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta, timezone
from typing import List
import json
from fastapi import HTTPException
from . import models, schemas

# Define IST timezone offset (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(models.Student.id == student_id).first()

def get_student_by_student_id(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.student_id == student_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()

def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(
        student_id=student.student_id,
        full_name=student.full_name,
        face_encoding=json.dumps(student.face_encoding) if student.face_encoding else None
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def delete_student(db: Session, student_id: int):
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Delete associated attendance records first
    db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student_id
    ).delete(synchronize_session=False)
    
    # Delete the student
    db.delete(student)
    db.commit()
    return {"message": f"Student {student.full_name} and all associated records deleted successfully"}

def create_attendance_record(db: Session, attendance: schemas.AttendanceRecordCreate):
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == attendance.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get current time in IST
    current_time = datetime.now(IST)
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Check if attendance already marked for today
    existing_attendance = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == attendance.student_id,
        models.AttendanceRecord.timestamp >= today_start,
        models.AttendanceRecord.timestamp < today_end
    ).first()
    
    if existing_attendance:
        raise HTTPException(status_code=400, detail="Attendance already marked for today")
    
    # Create new attendance record with IST timestamp
    db_attendance = models.AttendanceRecord(
        student_id=attendance.student_id,
        status=attendance.status,
        timestamp=current_time
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def get_attendance_records(db: Session, student_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student_id
    ).offset(skip).limit(limit).all()

def get_user_attendance(db: Session, user_id: int):
    return db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == user_id
    ).all() 