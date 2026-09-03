import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { AppSettings, DailyReminder } from '../types';

export interface UserProfileData {
  settings?: AppSettings;
  reminder?: DailyReminder;
  lastReadDate?: string;
  readCount?: number;
  lastUpdated?: string;
}

export const syncUserSettingsToFirestore = async (userId: string, settings: AppSettings) => {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'profile');
    await setDoc(userDocRef, {
      settings,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync user settings to Firestore:', err);
  }
};

export const syncUserReminderToFirestore = async (userId: string, reminder: UserProfileData['reminder']) => {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId, 'data', 'profile');
    await setDoc(userDocRef, {
      reminder,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync reminder to Firestore:', err);
  }
};

export const markDailyCompletionInFirestore = async (userId: string) => {
  if (!userId) return;
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
  } catch (err) {
    console.warn('Could not mark daily completion in Firestore:', err);
  }
};

export const listenToUserData = (
  userId: string,
  onData: (data: UserProfileData) => void
) => {
  if (!userId) return () => {};
  const userDocRef = doc(db, 'users', userId, 'data', 'profile');
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      onData(docSnap.data() as UserProfileData);
    }
  }, (err) => {
    console.warn('Firestore snapshot listener error:', err);
  });
};
