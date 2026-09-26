import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** False when .env is missing — the app shows a setup screen instead of crashing. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (firebaseConfigured) {
  // Reuse the existing app on dev hot-reload (initializeFirestore may only run once per app).
  const existing = getApps()[0];
  app = existing ?? initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = existing
    ? getFirestore(app)
    : initializeFirestore(app, {
        // Optional fields (e.g. exercise notes) may be undefined deep inside arrays.
        ignoreUndefinedProperties: true,
        // Offline cache: reads come from IndexedDB and writes queue while offline.
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
