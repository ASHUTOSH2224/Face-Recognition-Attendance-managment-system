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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Student Registration
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Register a new student with facial recognition
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="studentId"
              className="block text-sm font-medium text-gray-700"
            >
              Student ID
            </label>
            <input
              type="text"
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Face Capture
            </label>
            <WebcamCapture onCapture={handleCapture} />
            {capturedImage && (
              <div className="mt-4">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-32 h-32 object-cover rounded-md"
                />
              </div>
            )}
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

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
        </form>
      </div>
    </div>
  );
};

export default StudentRegistration; 