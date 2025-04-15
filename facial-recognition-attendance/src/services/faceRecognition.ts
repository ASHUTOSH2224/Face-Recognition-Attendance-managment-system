import * as faceDetection from '@tensorflow-models/face-detection';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs';

let faceDetector: faceDetection.FaceDetector | null = null;
let faceLandmarksDetector: faceLandmarksDetection.FaceLandmarksDetector | null = null;

export const faceRecognitionService = {
  async initialize() {
    try {
      // Load face detection model
      faceDetector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: 'tfjs',
          modelType: 'short',
        }
      );

      // Load face landmarks detection model
      faceLandmarksDetector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: true,
        }
      );

      return true;
    } catch (error) {
      console.error('Error initializing face recognition models:', error);
      return false;
    }
  },

  async detectFace(imageData: string): Promise<{
    faceDetected: boolean;
    faceEncoding?: number[];
    error?: string;
  }> {
    if (!faceDetector || !faceLandmarksDetector) {
      return {
        faceDetected: false,
        error: 'Face recognition models not initialized',
      };
    }

    try {
      // Convert base64 image to tensor
      const image = new Image();
      image.src = imageData;
      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const imageTensor = tf.browser.fromPixels(image);
      const expandedImage = imageTensor.expandDims(0) as tf.Tensor3D;

      // Detect faces
      const faces = await faceDetector.estimateFaces(expandedImage);
      if (faces.length === 0) {
        return {
          faceDetected: false,
          error: 'No face detected in the image',
        };
      }

      // Get face landmarks
      const landmarks = await faceLandmarksDetector.estimateFaces(expandedImage);
      if (landmarks.length === 0) {
        return {
          faceDetected: false,
          error: 'Could not detect face landmarks',
        };
      }

      // Convert landmarks to face encoding (simplified version)
      const faceEncoding = landmarks[0].keypoints
        .map((point) => [point.x, point.y, point.z])
        .flat()
        .filter((val): val is number => val !== undefined);

      // Clean up tensors
      imageTensor.dispose();
      expandedImage.dispose();

      return {
        faceDetected: true,
        faceEncoding,
      };
    } catch (error) {
      console.error('Error detecting face:', error);
      return {
        faceDetected: false,
        error: 'Error processing face detection',
      };
    }
  },

  async compareFaces(
    encoding1: number[],
    encoding2: number[]
  ): Promise<{ match: boolean; confidence: number }> {
    try {
      // Calculate Euclidean distance between encodings
      const distance = Math.sqrt(
        encoding1.reduce((sum, val, i) => sum + Math.pow(val - encoding2[i], 2), 0)
      );

      // Convert distance to confidence score (0-1)
      const confidence = 1 / (1 + distance);

      return {
        match: confidence > 0.6, // Threshold for face matching
        confidence,
      };
    } catch (error) {
      console.error('Error comparing faces:', error);
      return {
        match: false,
        confidence: 0,
      };
    }
  },
}; 