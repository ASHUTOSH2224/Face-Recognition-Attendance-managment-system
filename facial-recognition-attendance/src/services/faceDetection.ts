import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';

// Load TensorFlow.js model
let faceDetector: faceDetection.FaceDetector | null = null;

export async function loadFaceDetectionModel() {
  try {
    // Initialize TensorFlow.js
    await tf.ready();

    // Load the face detection model (using MediaPipe model)
    const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
    const detectorConfig = {
      runtime: 'tfjs',
      modelType: 'short',
      maxFaces: 1
    };

    faceDetector = await faceDetection.createDetector(model, detectorConfig);
    console.log('Face detection model loaded successfully');
    return faceDetector;
  } catch (error) {
    console.error('Error loading face detection model:', error);
    return null;
  }
}

// Function to get face descriptor from an image element
export async function getFaceDescriptorFromImage(
  imageElement: HTMLImageElement | HTMLVideoElement
): Promise<Float32Array | null> {
  try {
    if (!faceDetector) {
      faceDetector = await loadFaceDetectionModel();
    }

    if (!faceDetector) {
      console.error('Failed to load face detection model');
      return null;
    }

    // Detect faces
    const faces = await faceDetector.estimateFaces(imageElement);

    // If no faces detected, return null
    if (faces.length === 0) {
      return null;
    }

    // Get the first face
    const face = faces[0];

    // Simple descriptor using the face box coordinates and landmarks
    // This is a very basic descriptor, but it should work for demo purposes
    const descriptor = new Float32Array(16);

    // Box coordinates
    if (face.box) {
      descriptor[0] = face.box.xMin;
      descriptor[1] = face.box.yMin;
      descriptor[2] = face.box.width;
      descriptor[3] = face.box.height;
    }

    // Keypoints (landmarks) if available
    if (face.keypoints) {
      face.keypoints.forEach((keypoint, i) => {
        // Only store a few keypoints (up to 6 for demo)
        if (i < 6) {
          descriptor[4 + i * 2] = keypoint.x;
          descriptor[5 + i * 2] = keypoint.y;
        }
      });
    }

    return descriptor;
  } catch (error) {
    console.error('Error in face detection:', error);
    return null;
  }
}

// Function to extract face from video element
export async function extractFaceFromVideo(
  videoElement: HTMLVideoElement
): Promise<{ faceDescriptor: Float32Array; imageUrl: string } | null> {
  try {
    const descriptor = await getFaceDescriptorFromImage(videoElement);

    if (!descriptor) {
      return null;
    }

    // Create a canvas to capture the face image
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Draw the current video frame to the canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Get the data URL of the image
    const imageUrl = canvas.toDataURL('image/jpeg');

    return {
      faceDescriptor: descriptor,
      imageUrl
    };
  } catch (error) {
    console.error('Error extracting face:', error);
    return null;
  }
}

// Detect faces in real-time from a video feed
export async function detectFacesFromVideo(
  videoElement: HTMLVideoElement,
  onFaceDetected: (result: { faceDescriptor: Float32Array; imageUrl: string } | null) => void
) {
  // Load the model if not already loaded
  if (!faceDetector) {
    await loadFaceDetectionModel();
  }

  // Function to detect faces in each frame
  const detectFrame = async () => {
    if (videoElement.readyState === 4) {
      const result = await extractFaceFromVideo(videoElement);
      onFaceDetected(result);
    }

    // Continue detection if the video is still playing
    if (videoElement.paused || videoElement.ended) {
      return;
    }

    requestAnimationFrame(detectFrame);
  };

  // Start the detection loop
  detectFrame();
}

// Simple function to check if a face is detected in the current frame
export async function isFaceDetected(
  videoElement: HTMLVideoElement
): Promise<boolean> {
  try {
    const result = await extractFaceFromVideo(videoElement);
    return result !== null;
  } catch (error) {
    console.error('Error detecting face:', error);
    return false;
  }
}

// Function to compare two face descriptors and return a similarity score
// Simple Euclidean distance implementation
export function compareFaceDescriptors(
  descriptor1: Float32Array,
  descriptor2: Float32Array,
  threshold = 100 // This threshold may need adjustment for the simpler descriptor
): boolean {
  if (descriptor1.length !== descriptor2.length) {
    return false;
  }

  let distance = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    distance += (descriptor1[i] - descriptor2[i]) ** 2;
  }
  distance = Math.sqrt(distance);

  return distance < threshold;
}
