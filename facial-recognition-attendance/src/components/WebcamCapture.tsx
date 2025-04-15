import React, { useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { faceRecognitionService } from '../services/api';

interface WebcamCaptureProps {
  onCapture: (imageData: string, faceEncoding: number[]) => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
        };
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure you have granted camera permissions.');
      console.error('Error accessing camera:', err);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 image
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Get face encoding
      const result = await faceRecognitionService.encodeFace(imageData);
      
      if (result.face_encoding) {
        onCapture(imageData, result.face_encoding);
      } else {
        setError('No face detected. Please try again.');
      }
    } catch (err) {
      setError('Error capturing image. Please try again.');
      console.error('Error capturing image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full rounded-lg"
          style={{ display: isStreaming ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <button
              onClick={startCamera}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Camera className="h-5 w-5 mr-2" />
              Start Camera
            </button>
          </div>
        )}
      </div>

      {isStreaming && (
        <button
          onClick={captureImage}
          disabled={isProcessing}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 mr-2" />
              Capture Image
            </>
          )}
        </button>
      )}

      {error && (
        <div className="p-4 rounded-md bg-red-50 text-red-800">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
