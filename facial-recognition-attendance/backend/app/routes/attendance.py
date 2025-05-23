from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.types import Date
from typing import List, Dict
from datetime import datetime, date, timedelta, timezone
import numpy as np
import json
import logging
from ..database import get_db
from ..models import Student, AttendanceRecord
from ..schemas import AttendanceRecordCreate, AttendanceRecord as AttendanceRecordSchema, FaceRecognitionRequest
from .. import crud, schemas
from ..crud import create_attendance_record, get_user_attendance

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define IST timezone offset (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter()

@router.post("/", response_model=schemas.AttendanceRecord)
def create_attendance(attendance: schemas.AttendanceRecordCreate, db: Session = Depends(get_db)):
    return create_attendance_record(db, attendance)

@router.get("/analytics", response_model=Dict)
def get_analytics(db: Session = Depends(get_db)):
    # Get current time in IST
    current_time = datetime.now(IST)
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Get total registered students
    total_students = db.query(Student).count()
    
    # Get today's attendance records
    today_attendance = db.query(AttendanceRecord).filter(
        AttendanceRecord.timestamp >= today_start,
        AttendanceRecord.timestamp < today_end
    ).all()
    
    # Count present students
    present_today = len(today_attendance)
    
    # Calculate absent students
    absent_today = total_students - present_today
    
    # Get attendance percentage
    attendance_percentage = (present_today / total_students * 100) if total_students > 0 else 0
    
    # Get attendance history for the last 7 days
    history_start = today_start - timedelta(days=7)
    attendance_history = []
    
    for i in range(7):
        day_start = history_start + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        day_attendance = db.query(AttendanceRecord).filter(
            AttendanceRecord.timestamp >= day_start,
            AttendanceRecord.timestamp < day_end
        ).count()
        
        attendance_history.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "present": day_attendance,
            "absent": total_students - day_attendance
        })
    
    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": absent_today,
        "attendance_percentage": round(attendance_percentage, 2),
        "attendance_history": attendance_history
    }

@router.get("/", response_model=List[schemas.AttendanceRecord])
def get_attendance(db: Session = Depends(get_db)):
    # Get current time in IST
    current_time = datetime.now(IST)
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    attendance_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.timestamp >= today_start,
        AttendanceRecord.timestamp < today_end
    ).all()
    return attendance_records

@router.get("/today", response_model=List[schemas.AttendanceRecord])
def get_today_attendance(db: Session = Depends(get_db)):
    try:
        # Get current time in IST
        current_time = datetime.now(IST)
        today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        logger.debug(f"Fetching attendance for today: {today_start} to {today_end}")
        
        # Get today's attendance records
        attendance_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.timestamp >= today_start,
            AttendanceRecord.timestamp < today_end
        ).all()
        
        logger.debug(f"Found {len(attendance_records)} attendance records for today")
        return attendance_records
    except Exception as e:
        logger.error(f"Error fetching today's attendance: {str(e)}")
        # Return empty list instead of raising an exception to prevent frontend errors
        return []

@router.get("/{user_id}", response_model=List[schemas.AttendanceRecord])
def get_user_attendance_records(user_id: int, db: Session = Depends(get_db)):
    return get_user_attendance(db, user_id)

@router.get("/students/{student_id}/attendance/", response_model=List[AttendanceRecordSchema])
def get_student_attendance(
    student_id: int,
    db: Session = Depends(get_db)
):
    # Check if student exists
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all attendance records for the student
    attendance_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_id
    ).all()
    return attendance_records

@router.post("/students/{student_id}/attendance/", response_model=AttendanceRecordSchema)
def create_attendance_record(
    student_id: int,
    attendance: AttendanceRecordCreate,
    db: Session = Depends(get_db)
):
    # Check if student exists
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Create new attendance record
    db_attendance = AttendanceRecord(
        student_id=student_id,
        timestamp=datetime.now(),
        status=attendance.status
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@router.post("/face-recognition/", response_model=AttendanceRecordSchema)
async def mark_attendance_by_face(
    request: FaceRecognitionRequest,
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Received face recognition request with encoding length: {len(request.face_encoding)}")
        
        # Get all students with face encodings
        students = db.query(Student).filter(Student.face_encoding.isnot(None)).all()
        logger.debug(f"Found {len(students)} students with face encodings")
        
        if not students:
            logger.error("No students with face encodings found in database")
            raise HTTPException(status_code=404, detail="No students with face encodings found")
        
        # Convert the input face encoding to numpy array
        input_encoding = np.array(request.face_encoding)
        logger.debug(f"Input encoding shape: {input_encoding.shape}")
        
        # Initialize variables for best match
        best_match = None
        best_distance = float('inf')
        
        # Compare with all stored face encodings
        for student in students:
            if student.face_encoding:
                try:
                    stored_encoding = np.array(json.loads(student.face_encoding))
                    logger.debug(f"Student {student.id} encoding shape: {stored_encoding.shape}")
                    
                    # Calculate Euclidean distance between encodings
                    distance = np.linalg.norm(input_encoding - stored_encoding)
                    logger.debug(f"Distance for student {student.id}: {distance}")
                    
                    # Update best match if this is closer
                    if distance < best_distance:
                        best_distance = distance
                        best_match = student
                except json.JSONDecodeError as e:
                    logger.error(f"Error decoding face encoding for student {student.id}: {str(e)}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error processing student {student.id}: {str(e)}")
                    continue
        
        logger.debug(f"Best match: {best_match.id if best_match else None}, Distance: {best_distance}")
        
        # Check if we found a match within reasonable distance
        if best_match and best_distance < 0.6:  # Threshold for face matching
            # Check if attendance already marked for today
            today = datetime.now().date()
            existing_attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == best_match.id,
                AttendanceRecord.timestamp.cast(Date) == today
            ).first()
            
            if existing_attendance:
                logger.warning(f"Attendance already marked for student {best_match.id} today")
                raise HTTPException(status_code=400, detail="Attendance already marked for today")
            
            # Create new attendance record
            db_attendance = AttendanceRecord(
                student_id=best_match.id,
                timestamp=datetime.now(),
                status="present"
            )
            db.add(db_attendance)
            db.commit()
            db.refresh(db_attendance)
            
            logger.info(f"Successfully marked attendance for student {best_match.id}")
            return db_attendance
        else:
            logger.warning(f"No matching face found. Best distance: {best_distance}")
            raise HTTPException(status_code=404, detail="No matching face found")
    except Exception as e:
        logger.error(f"Error in face recognition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 