import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration for kidqueue-app
const firebaseConfig = {
  apiKey: "AIzaSyAm7vx-FguGcPXwn72wMhVKsmALbu02ziw",
  authDomain: "kidqueue-app.firebaseapp.com",
  projectId: "kidqueue-app",
  storageBucket: "kidqueue-app.firebasestorage.app",
  messagingSenderId: "555478046018",
  appId: "1:555478046018:web:e11e1adfb7d2868ce864db"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Analytics can be added later if needed

// Auth providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Configure providers
googleProvider.addScope('profile');
googleProvider.addScope('email');

facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export default app;