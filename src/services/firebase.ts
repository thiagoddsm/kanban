import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  getFirestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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
let storage: any = null;
let functionsInstance: any = null;
let googleProvider: any = null;

export const isFirebaseConfigured = true;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);

  // Inicialização estável e leve do Firestore (sem trava de concorrência multi-abas que vaza memória)
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({}),
    });
  } catch (e) {
    db = getFirestore(app);
  }

  storage = getStorage(app);
  functionsInstance = getFunctions(app, 'us-central1');
  
  // Conectar APENAS as Functions no emulador local durante o desenvolvimento
  // (Mantendo Firestore e Auth apontando para o projeto real para não perder os dados do painel)
  if (import.meta.env?.DEV) {
    import('firebase/functions').then(({ connectFunctionsEmulator }) => {
      connectFunctionsEmulator(functionsInstance, 'localhost', 5001);
      console.log("🔌 Firebase Functions conectado ao emulador local (Porta 5001)");
    });
  }

  googleProvider = new GoogleAuthProvider();
  console.log("🔥 Firebase Firestore inicializado com cache persistente IndexedDB nativo (SSOT)!");
} catch (error) {
  console.warn("Aviso na inicialização do Firebase:", error);
}

export { app, auth, db, storage, googleProvider, functionsInstance as functions };
