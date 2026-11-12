import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppSettings, DailyReminder, ReminderItem } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider: any) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfileData {
  settings?: AppSettings;
  reminder?: DailyReminder;
  reminders?: ReminderItem[];
  lastReadDate?: string;
  readCount?: number;
  lastUpdated?: string;
}

export const syncUserSettingsToFirestore = async (userId: string, settings: AppSettings) => {
  if (!userId || !db) return;
  const path = `users/${userId}/data/profile`;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'profile');
    await setDoc(userDocRef, {
      settings,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch (wrapped) {
      console.warn('Could not sync user settings to Firestore:', wrapped);
    }
  }
};

export const syncUserRemindersToFirestore = async (userId: string, reminders: ReminderItem[]) => {
  if (!userId || !db) return;
  const path = `users/${userId}/data/profile`;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'profile');
    await setDoc(userDocRef, {
      reminders,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch (wrapped) {
      console.warn('Could not sync reminders to Firestore:', wrapped);
    }
  }
};

export const syncUserReminderToFirestore = async (userId: string, reminder: UserProfileData['reminder']) => {
  if (!userId || !db) return;
  const path = `users/${userId}/data/profile`;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'profile');
    await setDoc(userDocRef, {
      reminder,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch (wrapped) {
      console.warn('Could not sync reminder to Firestore:', wrapped);
    }
  }
};

export const markDailyCompletionInFirestore = async (userId: string) => {
  if (!userId || !db) return;
  const path = `users/${userId}/data/profile`;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const userDocRef = doc(db, 'users', userId, 'data', 'profile');
    const snap = await getDoc(userDocRef);
    const prevCount = snap.exists() ? (snap.data()?.readCount || 0) : 0;

    await setDoc(userDocRef, {
      lastReadDate: todayStr,
      readCount: prevCount + 1,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch (wrapped) {
      console.warn('Could not mark daily completion in Firestore:', wrapped);
    }
  }
};

export const listenToUserData = (
  userId: string,
  onData: (data: UserProfileData) => void
) => {
  if (!userId || !db) return () => {};
  const path = `users/${userId}/data/profile`;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'profile');
    return onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as UserProfileData);
      }
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (wrapped) {
        console.warn('Firestore snapshot listener error:', wrapped);
      }
    });
  } catch (err: any) {
    console.warn('Error setting up Firestore listener: ' + String(err?.message || err));
    return () => {};
  }
};
