from sqlalchemy.orm import Session
import models
import schemas
from datetime import datetime
from typing import List, Optional

# User operations
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = user.password + "notreallyhashed"  # In production, use proper hashing
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Student operations
def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()

def get_student_by_roll_number(db: Session, roll_number: str):
    return db.query(models.Student).filter(models.Student.roll_number == roll_number).first()

def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(
        name=student.name,
        roll_number=student.roll_number,
        class_name=student.class_name,
        face_encoding=student.face_encoding,
        image_url=student.image_url
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

# Attendance operations
def get_attendance(db: Session, date: Optional[str] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Attendance)
    if date:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
        query = query.filter(models.Attendance.date >= query_date)
    return query.offset(skip).limit(limit).all()

def create_attendance(db: Session, attendance: schemas.AttendanceCreate):
    db_attendance = models.Attendance(
        student_id=attendance.student_id,
        status=attendance.status,
        time_in=datetime.utcnow() if attendance.status == "present" else None
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def get_student_attendance(db: Session, student_id: int, date: Optional[str] = None):
    query = db.query(models.Attendance).filter(models.Attendance.student_id == student_id)
    if date:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
        query = query.filter(models.Attendance.date >= query_date)
    return query.all() 