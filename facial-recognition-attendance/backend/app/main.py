from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import students, attendance, face_recognition
from .init_db import init_db

app = FastAPI()

# Initialize database
init_db()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(students.router, prefix="/api", tags=["students"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(face_recognition.router, prefix="/api/face-recognition", tags=["face-recognition"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Facial Recognition Attendance System API"} 