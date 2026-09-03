import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Use named database if specified, otherwise default
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, databaseId !== '(default)' ? databaseId : undefined);
} catch (e) {
  // If already initialized
  firestoreDb = getFirestore(app, databaseId !== '(default)' ? databaseId : undefined);
}

export const db = firestoreDb;
export { app };
