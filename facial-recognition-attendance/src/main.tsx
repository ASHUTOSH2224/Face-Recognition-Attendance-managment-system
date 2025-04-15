import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { faceRecognitionService } from "./services/faceRecognition";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

// Initialize face recognition service in the background
faceRecognitionService.initialize().catch((error) => {
  console.error("Failed to initialize face recognition service:", error);
});

// Render the app immediately
createRoot(rootElement).render(<App />);
