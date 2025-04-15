import requests
import face_recognition
import cv2
import numpy as np
import base64
import json

# API endpoint
BASE_URL = "http://localhost:8000"

def create_test_user():
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    }
    response = requests.post(f"{BASE_URL}/users/", json=user_data)
    return response.json()

def get_auth_token():
    auth_data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    response = requests.post(f"{BASE_URL}/token", data=auth_data)
    return response.json()["access_token"]

def create_test_student(token, image_path):
    # Load the image
    image = face_recognition.load_image_file(image_path)
    
    # Get face encoding
    face_encodings = face_recognition.face_encodings(image)
    if not face_encodings:
        raise Exception("No face found in the image")
    
    face_encoding = face_encodings[0]
    
    # Create student data
    student_data = {
        "name": "Test Student",
        "roll_number": "TEST001",
        "class_name": "Test Class",
        "face_encoding": face_encoding.tobytes(),
        "image_url": f"test_{image_path}"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/students/", json=student_data, headers=headers)
    return response.json()

def test_face_recognition(token, test_image_path):
    # Load and encode test image
    with open(test_image_path, "rb") as image_file:
        image_bytes = image_file.read()
        base64_image = base64.b64encode(image_bytes).decode()
    
    # Send recognition request
    headers = {"Authorization": f"Bearer {token}"}
    recognition_data = {"image": base64_image}
    response = requests.post(
        f"{BASE_URL}/face-recognition/",
        json=recognition_data,
        headers=headers
    )
    return response.json()

def main():
    # Replace with actual image paths
    enrollment_image_path = "test_enrollment.jpg"
    test_image_path = "test_recognition.jpg"
    
    try:
        # Create test user
        print("Creating test user...")
        user = create_test_user()
        print("User created:", user)
        
        # Get authentication token
        print("Getting auth token...")
        token = get_auth_token()
        print("Token received")
        
        # Create test student with face encoding
        print("Creating test student...")
        student = create_test_student(token, enrollment_image_path)
        print("Student created:", student)
        
        # Test face recognition
        print("Testing face recognition...")
        result = test_face_recognition(token, test_image_path)
        print("Recognition result:", result)
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 