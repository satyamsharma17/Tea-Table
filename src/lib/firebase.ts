import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCBBeJrvAhv70GzXJUYcGCam-2_tVmGFWg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "house-of-katha.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://house-of-katha-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "house-of-katha",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "house-of-katha.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "873991632119",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:873991632119:web:e6d000f0c8f73129a54ff2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RD0QY94HGH",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
