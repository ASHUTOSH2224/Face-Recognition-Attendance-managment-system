import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/api';
import WebcamCapture from '../components/WebcamCapture';
import { UserPlus, Camera, CheckCircle, XCircle } from 'lucide-react';

const StudentRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceEncoding, setFaceEncoding] = useState<number[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleCapture = (image: string, encoding: number[]) => {
    setCapturedImage(image);
    setFaceEncoding(encoding);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatus({ type: null, message: '' });

    try {
      if (!capturedImage || !faceEncoding) {
        throw new Error('Please capture your face first');
      }

      await studentService.createStudent({
        student_id: studentId,
        full_name: fullName,
        face_encoding: faceEncoding,
      });

      setStatus({
        type: 'success',
        message: 'Student registered successfully!',
      });

      // Reset form
      setStudentId('');
      setFullName('');
      setCapturedImage(null);
      setFaceEncoding(null);

      // Navigate to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Registration failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Student Registration</h1>
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow">
        <div className="p-6">
          <p className="mb-6 text-gray-600">
            Register a new student with facial recognition
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="studentId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Student ID
                </label>
                <input
                  type="text"
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Face Capture
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <WebcamCapture onCapture={handleCapture} />
                </div>
                <div className="flex items-center justify-center">
                  {capturedImage ? (
                    <div className="text-center">
                      <img
                        src={capturedImage}
                        alt="Captured face"
                        className="w-40 h-40 object-cover rounded-md mx-auto border-2 border-gray-300"
                      />
                      <p className="mt-2 text-sm text-green-600">Face captured successfully</p>
                    </div>
                  ) : (
                    <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-md">
                      <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No face captured yet</p>
                      <p className="text-xs text-gray-400">Position your face in the camera and click the capture button</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {status.type && (
              <div
                className={`p-4 rounded-md ${
                  status.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <div className="flex items-center">
                  {status.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 mr-2" />
                  )}
                  <p className="text-sm">{status.message}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isProcessing}
                className="flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isProcessing ? (
                  'Processing...'
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Register Student
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 rounded-lg shadow p-4 max-w-3xl mx-auto">
        <h3 className="text-blue-800 font-medium mb-2">Registration Instructions:</h3>
        <ol className="list-decimal pl-5 space-y-1 text-blue-700">
          <li>Enter the student's ID number</li>
          <li>Enter the student's full name</li>
          <li>Position the student's face in the camera</li>
          <li>Ensure good lighting and a clear view of the face</li>
          <li>Click the capture button to take a photo</li>
          <li>Submit the form to register the student</li>
        </ol>
      </div>
    </div>
  );
};

export default StudentRegistration; 