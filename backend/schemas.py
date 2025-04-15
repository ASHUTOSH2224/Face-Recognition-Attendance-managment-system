from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    name: str
    roll_number: str
    class_name: str

class StudentCreate(StudentBase):
    face_encoding: Optional[bytes] = None
    image_url: Optional[str] = None

class Student(StudentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    student_id: int
    status: str

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    id: int
    date: datetime
    time_in: Optional[datetime] = None

    class Config:
        from_attributes = True

class FaceRecognitionRequest(BaseModel):
    image: str  # Base64 encoded image

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None 