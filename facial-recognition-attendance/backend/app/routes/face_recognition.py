from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import numpy as np
import face_recognition
import base64
import json
from io import BytesIO
from PIL import Image
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import Student, AttendanceRecord

router = APIRouter()

class ImageRequest(BaseModel):
    image: str  # base64 encoded image

class FaceEncodingResponse(BaseModel):
    face_encoding: list[float]

@router.post("/encode", response_model=FaceEncodingResponse)
async def encode_face(image_request: ImageRequest):
    try:
        # Decode base64 image
        image_data = base64.b64decode(image_request.image.split(',')[1])
        image = Image.open(BytesIO(image_data))
        
        # Convert PIL Image to numpy array
        image_array = np.array(image)
        
        # Find face locations
        face_locations = face_recognition.face_locations(image_array)
        
        if not face_locations:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        
        if len(face_locations) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected in the image")
        
        # Get face encoding
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if not face_encodings:
            raise HTTPException(status_code=400, detail="Could not encode face")
        
        # Convert numpy array to list for JSON serialization
        encoding_list = face_encodings[0].tolist()
        
        return {"face_encoding": encoding_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def recognize_face(image_request: ImageRequest, db: Session = Depends(get_db)):
    try:
        # Decode base64 image
        image_data = base64.b64decode(image_request.image.split(',')[1])
        image = Image.open(BytesIO(image_data))
        
        # Convert PIL Image to numpy array
        image_array = np.array(image)
        
        # Find face locations
        face_locations = face_recognition.face_locations(image_array)
        
        if not face_locations:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        
        if len(face_locations) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected in the image")
        
        # Get face encoding for the captured image
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if not face_encodings:
            raise HTTPException(status_code=400, detail="Could not encode face")
        
        input_encoding = face_encodings[0]
        
        # Get all students with face encodings
        students = db.query(Student).filter(Student.face_encoding.isnot(None)).all()
        
        if not students:
            raise HTTPException(status_code=404, detail="No registered students found")
        
        # Find the best match
        best_match = None
        best_distance = float('inf')
        
        for student in students:
            stored_encoding = np.array(json.loads(student.face_encoding))
            distance = np.linalg.norm(input_encoding - stored_encoding)
            
            if distance < best_distance:
                best_distance = distance
                best_match = student
        
        # Check if we found a match within reasonable distance
        if best_match and best_distance < 0.6:  # Threshold for face matching
            # Check if attendance already marked for today
            today = datetime.now().date()
            existing_attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == best_match.id,
                AttendanceRecord.timestamp >= datetime.combine(today, datetime.min.time()),
                AttendanceRecord.timestamp < datetime.combine(today, datetime.max.time())
            ).first()
            
            if existing_attendance:
                raise HTTPException(status_code=400, detail="Attendance already marked for today")
            
            # Create new attendance record
            attendance = AttendanceRecord(
                student_id=best_match.id,
                status="present"
            )
            db.add(attendance)
            db.commit()
            db.refresh(attendance)
            
            return {
                "message": "Attendance marked successfully",
                "student_id": best_match.student_id,
                "full_name": best_match.full_name
            }
        else:
            raise HTTPException(status_code=404, detail="No matching face found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 