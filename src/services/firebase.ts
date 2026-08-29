import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyADLqvQVfPzG6PS5jxiU9OKNZdzzJ3Bx3I",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "studio-5589719834-7481b.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "studio-5589719834-7481b",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "studio-5589719834-7481b.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "170591764605",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:170591764605:web:02413eac486766efca3114"
};

let app: any = null;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;

export const isFirebaseConfigured = true;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  console.log("🔥 Firebase inicializado com sucesso no projeto studio-5589719834-7481b!");
} catch (error) {
  console.warn("Aviso na inicialização do Firebase:", error);
}

export { app, auth, db, googleProvider };
