import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { faceRecognitionService, attendanceService } from '../services/api';
import { Camera, RefreshCw, User, Check, Clock } from 'lucide-react';

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

  // Start/stop face detection
  const toggleDetection = () => {
    if (detectionActive) {
      setDetectionActive(false);
      setRecognizedUser(null);
    } else {
      setDetectionActive(true);
      setIsProcessing(true);
      startFaceDetection();
    }
  };

  // Start face detection process
  const startFaceDetection = async () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      setIsProcessing(false);
      return;
    }

    try {
      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        setIsProcessing(false);
        return;
      }

      // Send image to backend for recognition
      const response = await faceRecognitionService.recognizeFace(imageSrc);
      
      if (response.user_id) {
        setRecognizedUser({
          id: response.user_id,
          username: response.username,
          full_name: response.full_name,
          face_encoding: response.face_encoding
        });
        setAttendanceMarked(false);
      } else {
        setRecognizedUser(null);
      }
    } catch (error) {
      console.error('Error in face recognition:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark attendance for the recognized user
  const markAttendance = async () => {
    if (!recognizedUser) return;

    try {
      setIsProcessing(true);
      await attendanceService.markAttendance(recognizedUser.id, 'present');

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
      setIsProcessing(false);
    }
  };

  // Fetch today's attendance on component mount
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const records = await attendanceService.getUserAttendance(recognizedUser?.id || 0);
        setRecentAttendance(records.map((record: AttendanceRecord) => ({
          user: record.user,
          time: new Date(record.timestamp)
        })));
      } catch (error) {
        console.error('Error fetching today\'s attendance:', error);
      }
    };

    fetchTodayAttendance();
  }, [recognizedUser?.id]);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user'
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">
        Take Attendance
      </h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col">
          {/* Camera Feed */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Camera Feed
            </h2>

            <div className="relative mb-4 overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-100">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                mirrored={true}
                className="h-96 w-auto"
              />

              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <RefreshCw className="h-12 w-12 animate-spin text-white" />
                </div>
              )}

              {recognizedUser && (
                <div className="absolute bottom-0 left-0 right-0 bg-green-500 bg-opacity-80 p-3 text-center text-white">
                  <p className="text-lg font-bold">{recognizedUser.full_name}</p>
                  <p>Username: {recognizedUser.username}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={toggleDetection}
                className={`flex items-center rounded-md px-4 py-2 font-medium text-white ${
                  detectionActive
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                <Camera className="mr-2 h-5 w-5" />
                {detectionActive ? 'Stop Recognition' : 'Start Recognition'}
              </button>

              {recognizedUser && !attendanceMarked && (
                <button
                  onClick={markAttendance}
                  className="flex items-center rounded-md bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600"
                  disabled={isProcessing}
                >
                  <Check className="mr-2 h-5 w-5" />
                  Mark Present
                </button>
              )}

              {attendanceMarked && (
                <div className="flex items-center rounded-md bg-green-100 px-4 py-2 text-green-800">
                  <Check className="mr-2 h-5 w-5" />
                  Attendance Marked!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Today's Attendance
          </h2>

          {recentAttendance.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-gray-200">
                {recentAttendance.map((record) => (
                  <li key={`${record.user.id}-${record.time.getTime()}`} className="flex items-center py-3">
                    <div className="mr-4 h-12 w-12 overflow-hidden rounded-full bg-gray-200">
                      <User className="h-full w-full p-2" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {record.user.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {record.user.username}
                      </p>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="mr-1 h-4 w-4" />
                      {record.time.toLocaleTimeString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500">No attendance records for today yet.</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-blue-50 p-4 text-blue-800">
        <h3 className="mb-2 font-semibold">How to use:</h3>
        <ol className="list-inside list-decimal space-y-2">
          <li>Click "Start Recognition" to begin facial detection</li>
          <li>Position the user's face in front of the camera</li>
          <li>When a user is recognized, their info will appear below the video</li>
          <li>Click "Mark Present" to record their attendance</li>
          <li>The system will reset after a few seconds to recognize the next user</li>
        </ol>
      </div>
    </div>
  );
};

export default TakeAttendance;
