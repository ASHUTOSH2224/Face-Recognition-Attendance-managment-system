from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import numpy as np
import face_recognition
import base64
import json
import logging
import cv2
from io import BytesIO
from PIL import Image
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from ..database import get_db
from ..models import Student, AttendanceRecord

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define IST timezone offset (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

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
        
        # Find face locations with more lenient parameters
        face_locations = face_recognition.face_locations(image_array, model="hog", number_of_times_to_upsample=2)
        
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
        logger.error(f"Error in encode_face: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def recognize_face(image_request: ImageRequest, db: Session = Depends(get_db)):
    try:
        logger.info("Starting face recognition process")
        
        # Decode base64 image
        try:
            image_str = image_request.image
            if ',' in image_str:
                image_data = base64.b64decode(image_str.split(',')[1])
            else:
                image_data = base64.b64decode(image_str)
                
            logger.debug(f"Successfully decoded base64 image, size: {len(image_data)} bytes")
        except Exception as e:
            logger.error(f"Error decoding base64 image: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")
        
        # Open image
        try:
            image = Image.open(BytesIO(image_data))
            logger.debug(f"Successfully opened image, format: {image.format}, size: {image.size}")
        except Exception as e:
            logger.error(f"Error opening image: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Could not open image: {str(e)}")
        
        # Convert PIL Image to numpy array
        try:
            image_array = np.array(image)
            logger.debug(f"Converted image to array, shape: {image_array.shape}")
            
            # Pre-process the image to improve face detection
            # Resize the image if it's too small
            if image_array.shape[0] < 300 or image_array.shape[1] < 300:
                scale_factor = max(300 / image_array.shape[0], 300 / image_array.shape[1])
                new_size = (int(image_array.shape[1] * scale_factor), int(image_array.shape[0] * scale_factor))
                image_array = cv2.resize(image_array, new_size)
                logger.debug(f"Resized image to shape: {image_array.shape}")
        except Exception as e:
            logger.error(f"Error converting image to array: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
        
        # Find face locations with more lenient parameters
        try:
            # Use HOG model which is faster but less accurate, and increase upsample to find smaller faces
            face_locations = face_recognition.face_locations(image_array, model="hog", number_of_times_to_upsample=2)
            logger.debug(f"Found {len(face_locations)} faces in image")
            
            # If no faces found with HOG, try with the CNN model which is more accurate
            if not face_locations and image_array.shape[0] <= 1000 and image_array.shape[1] <= 1000:
                logger.debug("Attempting CNN model for face detection")
                try:
                    face_locations = face_recognition.face_locations(image_array, model="cnn")
                    logger.debug(f"Found {len(face_locations)} faces with CNN model")
                except Exception as cnn_error:
                    logger.warning(f"CNN model failed: {str(cnn_error)}")
            
            # If still no faces, use a more lenient approach by assuming the entire image is a face
            if not face_locations:
                logger.warning("No faces found, using the full image as a face")
                height, width = image_array.shape[:2]
                face_locations = [(0, width, height, 0)]  # top, right, bottom, left format
        except Exception as e:
            logger.error(f"Error finding face locations: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error detecting faces: {str(e)}")
        
        # Get face encoding for the captured image
        try:
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            logger.debug(f"Generated {len(face_encodings)} face encodings")
            
            if not face_encodings:
                logger.warning("Could not encode face, trying with different parameters")
                # Try with jitter which helps with different lighting conditions
                face_encodings = face_recognition.face_encodings(image_array, face_locations, num_jitters=3)
                logger.debug(f"Generated {len(face_encodings)} face encodings with jitter")
        except Exception as e:
            logger.error(f"Error generating face encodings: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error encoding face: {str(e)}")
        
        if not face_encodings:
            logger.warning("Could not encode face")
            raise HTTPException(status_code=400, detail="Could not encode face")
        
        input_encoding = face_encodings[0]
        
        # Get all students with face encodings
        try:
            students = db.query(Student).filter(Student.face_encoding.isnot(None)).all()
            logger.debug(f"Found {len(students)} students with face encodings")
        except Exception as e:
            logger.error(f"Database error when fetching students: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        if not students:
            logger.warning("No registered students found with face encodings")
            raise HTTPException(status_code=404, detail="No registered students found")
        
        # Find the best match
        best_match = None
        best_distance = float('inf')
        
        for student in students:
            try:
                stored_encoding = np.array(json.loads(student.face_encoding))
                distance = np.linalg.norm(input_encoding - stored_encoding)
                
                logger.debug(f"Student {student.id} distance: {distance}")
                
                if distance < best_distance:
                    best_distance = distance
                    best_match = student
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding face encoding for student {student.id}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Error comparing face with student {student.id}: {str(e)}")
                continue
        
        logger.info(f"Best match: {best_match.id if best_match else None}, distance: {best_distance}")
        
        # Check if we found a match with a more lenient threshold (0.7 instead of 0.6)
        if best_match and best_distance < 0.7:  # More lenient threshold for face matching
            # Get current time in IST
            current_time = datetime.now(IST)
            today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            # Check if attendance already marked for today
            try:
                existing_attendance = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == best_match.id,
                    AttendanceRecord.timestamp >= today_start,
                    AttendanceRecord.timestamp < today_end
                ).first()
                
                if existing_attendance:
                    logger.warning(f"Attendance already marked for student {best_match.id} today")
                    raise HTTPException(status_code=400, detail="Attendance already marked for today")
            except Exception as e:
                logger.error(f"Error checking existing attendance: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
            
            # Create new attendance record with IST timestamp
            try:
                attendance = AttendanceRecord(
                    student_id=best_match.id,
                    status="present",
                    timestamp=current_time
                )
                db.add(attendance)
                db.commit()
                db.refresh(attendance)
                
                logger.info(f"Successfully marked attendance for student {best_match.id}")
                
                return {
                    "message": "Attendance marked successfully",
                    "student_id": best_match.student_id,
                    "full_name": best_match.full_name
                }
            except Exception as e:
                db.rollback()
                logger.error(f"Error saving attendance record: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        else:
            logger.warning(f"No matching face found. Best distance: {best_distance}")
            raise HTTPException(status_code=404, detail="No matching face found")
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in recognize_face: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 