from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import List, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import face_recognition
import numpy as np
import cv2
import base64
from database import SessionLocal, engine, Base
import models
import schemas
import crud

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/students/", response_model=schemas.Student)
def create_student(
    student: schemas.StudentCreate,
    current_user: models.User = Depends(get_current_user),
    db = Depends(get_db)
):
    return crud.create_student(db=db, student=student)

@app.get("/students/", response_model=List[schemas.Student])
def read_students(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db = Depends(get_db)
):
    students = crud.get_students(db, skip=skip, limit=limit)
    return students

@app.post("/attendance/", response_model=schemas.Attendance)
def mark_attendance(
    attendance: schemas.AttendanceCreate,
    current_user: models.User = Depends(get_current_user),
    db = Depends(get_db)
):
    return crud.create_attendance(db=db, attendance=attendance)

@app.get("/attendance/", response_model=List[schemas.Attendance])
def get_attendance(
    date: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db = Depends(get_db)
):
    return crud.get_attendance(db, date=date)

@app.post("/face-recognition/")
async def recognize_face(image_data: schemas.FaceRecognitionRequest, db = Depends(get_db)):
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.image)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to RGB (face_recognition uses RGB)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Find all face locations in the image
        face_locations = face_recognition.face_locations(rgb_image)
        
        if not face_locations:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        # Get all students from database
        students = crud.get_students(db)
        
        # Compare with stored face encodings
        for face_encoding in face_encodings:
            for student in students:
                if student.face_encoding:
                    stored_encoding = np.frombuffer(student.face_encoding, dtype=np.float64)
                    matches = face_recognition.compare_faces([stored_encoding], face_encoding, tolerance=0.6)
                    
                    if matches[0]:
                        # Mark attendance for the recognized student
                        attendance = schemas.AttendanceCreate(
                            student_id=student.id,
                            status="present"
                        )
                        crud.create_attendance(db, attendance)
                        return {"student_id": student.id, "name": student.name}
        
        raise HTTPException(status_code=404, detail="No matching student found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 