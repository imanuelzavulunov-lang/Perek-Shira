import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance: any = null;
try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e: any) {
  console.warn('[Firebase] App initialization error: ' + String(e?.message || e));
}

export const app = appInstance;

let firebaseAuth: any = null;
if (app) {
  try {
    firebaseAuth = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
    });
  } catch (e1: any) {
    try {
      firebaseAuth = getAuth(app);
    } catch (e2: any) {
      console.warn('[Firebase] Auth fallback error: ' + String(e2?.message || e2));
    }
  }
}
export const auth = firebaseAuth;

// Use named database if specified, otherwise default
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

let firestoreDb: any = null;
if (app) {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, databaseId !== '(default)' ? databaseId : undefined);
  } catch (e1: any) {
    try {
      firestoreDb = getFirestore(app, databaseId !== '(default)' ? databaseId : undefined);
    } catch (e2: any) {
      console.warn('[Firebase] Firestore fallback error: ' + String(e2?.message || e2));
    }
  }
}

export const db = firestoreDb;


