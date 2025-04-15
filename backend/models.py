from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, LargeBinary
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    roll_number = Column(String(20), unique=True, index=True)
    class_name = Column(String(50))
    face_encoding = Column(LargeBinary)  # Store face encoding as binary
    image_url = Column(String(255))  # URL to student's image
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship with attendance
    attendance = relationship("Attendance", back_populates="student")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(10))  # 'present' or 'absent'
    time_in = Column(DateTime, nullable=True)
    
    # Relationship with student
    student = relationship("Student", back_populates="attendance") 