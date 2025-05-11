import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { faceRecognitionService, attendanceService, studentService } from '../services/api';
import { Camera, RefreshCw, User, Check, Clock, UserCheck, AlertTriangle } from 'lucide-react';
import { Student } from '../types';

interface User {
  id: number;
  username: string;
  full_name: string;
  face_encoding: number[];
}

interface AttendanceRecord {
  id: number;
  user_id: number;
  timestamp: string;
  status: 'present' | 'absent';
  user: User;
}

const TakeAttendance: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState<User | null>(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState<Array<{
    user: User;
    time: Date;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Start/stop face detection
  const toggleDetection = () => {
    setError(null);
    
    if (!webcamRef.current?.video) {
      checkCameraAccess();
      return;
    }
    
    if (detectionActive) {
      setDetectionActive(false);
      setRecognizedUser(null);
    } else {
      setDetectionActive(true);
      setIsProcessing(true);
      startFaceDetection();
    }
  };

  // Check if camera is accessible
  const checkCameraAccess = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        setHasCameraPermission(true);
        // If permission granted but webcam not initialized yet, wait a moment
        setTimeout(() => {
          if (webcamRef.current?.video) {
            setDetectionActive(true);
            setIsProcessing(true);
            startFaceDetection();
          } else {
            setError("Camera initialized but video stream not available. Please try again.");
          }
        }, 1000);
      })
      .catch(err => {
        console.error("Camera access error:", err);
        setHasCameraPermission(false);
        setError("Camera access denied. Please enable camera permissions in your browser settings.");
      });
  };

  // Start face detection process
  const startFaceDetection = async () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      setIsProcessing(false);
      setError("Camera not available. Please ensure camera permissions are enabled.");
      return;
    }

    try {
      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        setIsProcessing(false);
        setError("Failed to capture image from camera.");
        return;
      }

      // Send image to backend for recognition
      const response = await faceRecognitionService.recognizeFace(imageSrc);
      
      if (response.user_id) {
        setRecognizedUser({
          id: response.user_id,
          username: response.username || '',
          full_name: response.full_name || '',
          face_encoding: response.face_encoding || []
        });
        setAttendanceMarked(false);
      } else {
        setRecognizedUser(null);
        setError("No registered face detected. Try again or check lighting conditions.");
      }
    } catch (error) {
      console.error('Error in face recognition:', error);
      setError("Face recognition failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark attendance for the recognized user
  const markAttendance = async () => {
    if (!recognizedUser) return;

    try {
      setIsProcessing(true);
      await attendanceService.markAttendance(recognizedUser.id);

      // Add to recent attendance list
      setRecentAttendance(prev => [
        {
          user: recognizedUser,
          time: new Date()
        },
        ...prev.slice(0, 9) // Keep only the 10 most recent records
      ]);

      setAttendanceMarked(true);
      setIsProcessing(false);

      // Reset recognition after a delay
      setTimeout(() => {
        setRecognizedUser(null);
        setAttendanceMarked(false);
      }, 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError("Failed to mark attendance. The student may already be marked present today.");
      setIsProcessing(false);
    }
  };

  // Load today's attendance records
  const fetchAttendanceData = async () => {
    try {
      // Get all students first
      const studentsResponse = await studentService.getAllStudents();
      setStudents(studentsResponse.data);
      
      // Then get today's attendance
      const records = await attendanceService.getTodayAttendance();
      
      // Map student details to attendance records
      const formattedRecords = records.map(record => {
        const student = studentsResponse.data.find(s => s.id === record.student_id);
        return {
          user: {
            id: record.student_id,
            username: "",
            full_name: student?.full_name || `Student ID: ${record.student_id}`,
            face_encoding: []
          },
          time: new Date(record.timestamp)
        };
      });
      
      setRecentAttendance(formattedRecords);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError("Failed to load today's attendance records. Attendance marking will still work.");
    }
  };

  // Fetch today's attendance on component mount
  useEffect(() => {
    fetchAttendanceData();
    // Check camera permission on mount
    checkCameraAccess();
  }, []);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Take Attendance</h1>
        
        {error && (
          <button 
            onClick={hasCameraPermission ? fetchAttendanceData : checkCameraAccess} 
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {hasCameraPermission ? 'Refresh Data' : 'Retry Camera'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Camera Feed */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">
              Camera Feed
            </h2>
          </div>
          <div className="p-6">
            <div className="relative mb-6 overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
              {hasCameraPermission === false ? (
                <div className="h-96 w-full flex flex-col items-center justify-center bg-gray-100">
                  <Camera className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-700 font-medium text-center mb-2">Camera access required</p>
                  <p className="text-gray-500 text-sm text-center max-w-md px-4">
                    Please enable camera access in your browser settings to use facial recognition
                  </p>
                </div>
              ) : (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  mirrored={true}
                  className="h-96 w-full object-cover"
                  onUserMediaError={(err) => {
                    console.error("Webcam error:", err);
                    setHasCameraPermission(false);
                    setError("Failed to access camera. Please check permissions.");
                  }}
                />
              )}

              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <RefreshCw className="h-12 w-12 animate-spin text-white" />
                </div>
              )}

              {recognizedUser && (
                <div className="absolute bottom-0 left-0 right-0 bg-green-500 bg-opacity-80 p-3 text-center text-white">
                  <div className="flex items-center justify-center">
                    <UserCheck className="h-6 w-6 mr-2" />
                    <div>
                      <p className="text-lg font-bold">{recognizedUser.full_name}</p>
                      <p className="text-sm">ID: {recognizedUser.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <button
                onClick={toggleDetection}
                className={`flex items-center justify-center rounded-md px-4 py-2 font-medium text-white ${
                  detectionActive
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                disabled={hasCameraPermission === false}
              >
                <Camera className="mr-2 h-5 w-5" />
                {detectionActive ? 'Stop Recognition' : 'Start Recognition'}
              </button>

              {recognizedUser && !attendanceMarked && (
                <button
                  onClick={markAttendance}
                  className="flex items-center justify-center rounded-md bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600"
                  disabled={isProcessing}
                >
                  <Check className="mr-2 h-5 w-5" />
                  Mark Present
                </button>
              )}

              {attendanceMarked && (
                <div className="flex items-center justify-center rounded-md bg-green-100 px-4 py-2 text-green-800">
                  <Check className="mr-2 h-5 w-5" />
                  Attendance Marked!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">
              Today's Attendance
            </h2>
          </div>
          <div className="p-6">
            {recentAttendance.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {recentAttendance.map((record, index) => (
                    <li key={`${record.user.id}-${index}`} className="flex items-center py-3">
                      <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {record.user.full_name || `Student ID: ${record.user.id}`}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="mr-1 h-4 w-4" />
                          {record.time.toLocaleTimeString()}
                        </div>
                      </div>
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Present
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700">No attendance records for today</p>
                <p className="text-gray-500 mt-1">Mark students as present using facial recognition</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-3">How to use Facial Recognition Attendance:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">1</div>
              <span className="font-medium">Start Camera</span>
            </div>
            <p className="text-gray-600 text-sm">Click "Start Recognition" to activate the camera and begin facial detection</p>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">2</div>
              <span className="font-medium">Position Face</span>
            </div>
            <p className="text-gray-600 text-sm">Ensure the student's face is clearly visible and centered in the camera view</p>
          </div>
          
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">3</div>
              <span className="font-medium">Mark Attendance</span>
            </div>
            <p className="text-gray-600 text-sm">Once the student is recognized, click "Mark Present" to record attendance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeAttendance;
