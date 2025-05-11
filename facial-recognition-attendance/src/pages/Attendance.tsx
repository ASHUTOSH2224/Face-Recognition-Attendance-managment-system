import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../services/api';
import WebcamCapture from '../components/WebcamCapture';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import axios, { AxiosError } from 'axios';

const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | 'warning' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleCapture = async (imageData: string, faceEncoding: number[]) => {
    try {
      setIsProcessing(true);
      setStatus({ type: 'info', message: 'Processing face recognition...' });

      // Send face encoding to backend for recognition
      const response = await attendanceService.markAttendanceByFace(faceEncoding);

      // The backend returns the student information in the response
      setStatus({
        type: 'success',
        message: `Attendance marked successfully for ${response.data.full_name || 'Student ID: ' + response.data.student_id}!`
      });

      // Navigate back to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      
      // Check for specific error messages that might be returned by the API
      let errorMessage = 'Failed to recognize face. Please try again or contact administrator.';
      
      // Check if it's an axios error with a response
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ detail: string }>;
        // Check for specific error types
        if (axiosError.response?.data?.detail) {
          if (axiosError.response.data.detail.includes('already marked')) {
            // Use warning type for already marked attendance
            setStatus({
              type: 'warning',
              message: 'Attendance has already been marked for this student today.'
            });
            // Navigate back to dashboard after 2 seconds
            setTimeout(() => {
              navigate('/');
            }, 2000);
            return;
          } else {
            errorMessage = axiosError.response.data.detail;
          }
        }
      }
      
      setStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Take Attendance</h2>
            <p className="mt-2 text-sm text-gray-600">
              Please position your face in front of the camera
            </p>
          </div>

          <div className="rounded-lg overflow-hidden">
            <WebcamCapture onCapture={handleCapture} />
          </div>

          {status.type && (
            <div
              className={`mt-4 p-4 rounded-md ${
                status.type === 'success'
                  ? 'bg-green-50'
                  : status.type === 'error'
                  ? 'bg-red-50'
                  : status.type === 'warning'
                  ? 'bg-yellow-50'
                  : 'bg-blue-50'
              }`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  {status.type === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : status.type === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-400" />
                  ) : status.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                  )}
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      status.type === 'success'
                        ? 'text-green-800'
                        : status.type === 'error'
                        ? 'text-red-800'
                        : status.type === 'warning'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                    }`}
                  >
                    {status.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance; 