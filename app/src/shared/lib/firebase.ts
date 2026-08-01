/**
 * Inicialización del SDK de Firebase.
 *
 * Fase 0: se inicializa de forma perezosa y tolerante a la ausencia de config
 * (la app arranca y muestra el shell sin credenciales todavía). La conexión real
 * a Auth/Firestore se cablea en la Fase 1. El acceso a datos SIEMPRE pasará por
 * la capa de repositorios (ver docs/08); ningún componente importa este módulo
 * directamente para leer/escribir.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase no está configurado. Define las variables VITE_FIREBASE_*.');
  }
  if (!app) app = initializeApp(config);
  return app;
}

export function getDb(): Firestore {
  if (firestore) return firestore;
  // Persistencia offline (IndexedDB) con soporte multi-pestaña: base del
  // check-in offline-first (ver docs/10).
  firestore = initializeFirestore(getFirebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (useEmulators) connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  return firestore;
}

export function getAuthInstance(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return auth;
}

export function getStorageInstance(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(getFirebaseApp());
  if (useEmulators) connectStorageEmulator(storage, '127.0.0.1', 9199);
  return storage;
}
