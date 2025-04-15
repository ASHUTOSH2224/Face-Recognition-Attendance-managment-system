from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class StudentBase(BaseModel):
    student_id: str
    full_name: str

class StudentCreate(StudentBase):
    face_encoding: Optional[List[float]] = None

class Student(StudentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AttendanceRecordBase(BaseModel):
    status: str

class AttendanceRecordCreate(AttendanceRecordBase):
    student_id: int

class AttendanceRecord(AttendanceRecordBase):
    id: int
    student_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class FaceRecognitionRequest(BaseModel):
    face_encoding: List[float] 