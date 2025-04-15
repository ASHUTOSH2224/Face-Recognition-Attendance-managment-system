from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List
import json
from fastapi import HTTPException
from . import models, schemas

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

def create_attendance_record(db: Session, attendance: schemas.AttendanceRecordCreate):
    # Check if student exists
    student = db.query(models.Student).filter(models.Student.id == attendance.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check if attendance already marked for today
    today = date.today()
    existing_attendance = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == attendance.student_id,
        models.AttendanceRecord.timestamp >= datetime.combine(today, datetime.min.time()),
        models.AttendanceRecord.timestamp < datetime.combine(today, datetime.max.time())
    ).first()
    
    if existing_attendance:
        raise HTTPException(status_code=400, detail="Attendance already marked for today")
    
    # Create new attendance record
    db_attendance = models.AttendanceRecord(
        student_id=attendance.student_id,
        status=attendance.status
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