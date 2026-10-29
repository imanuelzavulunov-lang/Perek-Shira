import { ReminderItem } from '../types';
import { safeStorage } from './storage';

const REMINDERS_STORAGE_KEY = 'perek-shira-reminders';
const OLD_REMINDER_STORAGE_KEY = 'perek-shira-reminder';

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestDeviceNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
};

/**
 * Parses time string into numerical hours and minutes.
 * Handles "HH:MM", "H:MM", "HH:MM:SS", "HH:MM AM/PM", etc.
 */
export const parseTimeString = (timeStr: string): { hours: number; minutes: number } | null => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

/**
 * Normalizes time string into standard "HH:MM" 24h format.
 */
export const normalizeTimeStr = (timeStr: string): string => {
  const p = parseTimeString(timeStr);
  if (!p) return '08:00';
  return `${String(p.hours).padStart(2, '0')}:${String(p.minutes).padStart(2, '0')}`;
};

/**
 * Clears the "fired today" record for a reminder so it can trigger again on demand.
 */
export const clearReminderFiredToday = (reminderId: string): void => {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    safeStorage.removeItem(`perek-shira-fired-${reminderId}-${todayStr}`);
    // Also clean up any legacy minute-keyed records
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 1) {
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        safeStorage.removeItem(`perek-shira-fired-${reminderId}-${todayStr}-${t}`);
      }
    }
  } catch (err) {
    console.warn('Error clearing fired reminder state:', err);
  }
};

/**
 * Sends a system notification to the device tray and notification heads-up banner
 * User requirement: "ללא צליל רק התראת מערכת רגילה"
 */
export const sendDeviceNotification = async (
  title: string = 'קריאת פרק שירה 📖',
  body: string = 'הגיע הזמן לקריאת פרק שירה היומי שלכם! לחצו לפתיחה.',
  tag?: string
): Promise<boolean> => {
  // Gentle tactile vibration feedback on supported devices (Android, etc.)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250]);
    } catch {
      // ignore
    }
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationTag = tag || 'perek-shira-reminder';

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag: notificationTag,
    renotify: true, // Forces the system to re-alert the user even if a previous notification is present
    requireInteraction: false,
  };

  // 1. Try Service Worker showNotification (Mandatory for Android Chrome & Progressive Web Apps)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null = null;

      // Prefer navigator.serviceWorker.ready for fully active registration
      try {
        const readyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
        reg = await Promise.race([readyPromise, timeoutPromise]);
      } catch {
        // fallback to standard getRegistration
      }

      if (!reg) {
        reg = (await navigator.serviceWorker.getRegistration()) || null;
      }

      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      if (reg) {
        if (typeof reg.showNotification === 'function') {
          await reg.showNotification(title, options);
          return true;
        }

        // PostMessage fallback to active worker
        if (reg.active && typeof reg.active.postMessage === 'function') {
          reg.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            options,
          });
          return true;
        }
      }
    } catch (swErr) {
      console.warn('SW showNotification error, trying fallback:', swErr);
    }
  }

  // 2. Fallback to standard window Notification (Desktop Chrome, Safari, Firefox)
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (notifErr) {
    console.warn('Window Notification fallback error:', notifErr);
    return false;
  }
};

/**
 * Loads the list of reminders from safeStorage.
 * Handles automatic migration from previous single-reminder format.
 * Default for new users is NO reminders defined ([]).
 */
export const loadReminders = (): ReminderItem[] => {
  try {
    const raw = safeStorage.getItem(REMINDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out unused placeholder if user hasn't actively configured it
        const cleaned = parsed.filter(
          (item) => !(item.id === 'default-shira' && item.enabled === false && parsed.length === 1)
        );
        const result = cleaned.map((item) => ({
          id: String(item.id || `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
          label: String(item.label || 'קריאת פרק שירה').trim(),
          time: normalizeTimeStr(String(item.time || '08:00')),
          days: Array.isArray(item.days) ? item.days : [0, 1, 2, 3, 4, 5, 6],
          enabled: Boolean(item.enabled),
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        }));
        syncRemindersToServiceWorker(result).catch(() => {});
        return result;
      }
    }

    // Check old single reminder for automatic seamless migration
    const oldRaw = safeStorage.getItem(OLD_REMINDER_STORAGE_KEY);
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (oldParsed && typeof oldParsed === 'object' && oldParsed.time && oldParsed.enabled) {
        const migrated: ReminderItem = {
          id: 'migrated-1',
          label: 'קריאת פרק שירה',
          time: normalizeTimeStr(String(oldParsed.time)),
          days: Array.isArray(oldParsed.days) && oldParsed.days.length > 0 ? oldParsed.days : [0, 1, 2, 3, 4, 5, 6],
          enabled: Boolean(oldParsed.enabled),
          createdAt: Date.now(),
        };
        safeStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify([migrated]));
        return [migrated];
      }
    }
  } catch (e) {
    console.warn('Error loading reminders:', e);
  }

  // Default for new users: empty array (no reminders defined yet)
  return [];
};

/**
 * Persists reminders array into safeStorage
 */
const DB_NAME = 'perek_shira_data';
const DB_STORE = 'reminders_store';

const saveRemindersToIDB = (reminders: ReminderItem[]): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(false);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(DB_STORE, 'readwrite');
          const store = tx.objectStore(DB_STORE);
          store.put(reminders, 'active_reminders');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      };
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes user to Server-Side Web Push so notifications can pop up
 * even when the website is closed or phone screen is off/locked!
 */
export const subscribeUserToWebPush = async (reminders: ReminderItem[]): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    if (Notification.permission !== 'granted') {
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    if (!reg) return false;

    // 1. Fetch VAPID public key from backend
    const keyRes = await fetch('/api/vapid-public-key');
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    const convertedVapidKey = urlB64ToUint8Array(publicKey);

    // 2. Get or create PushSubscription (verify key consistency)
    let subscription = await reg.pushManager.getSubscription();

    if (subscription && subscription.options?.applicationServerKey) {
      // Check if existing subscription used a different VAPID key
      try {
        const existingBytes = new Uint8Array(subscription.options.applicationServerKey);
        let keyMatches = existingBytes.length === convertedVapidKey.length;
        if (keyMatches) {
          for (let i = 0; i < existingBytes.length; i++) {
            if (existingBytes[i] !== convertedVapidKey[i]) {
              keyMatches = false;
              break;
            }
          }
        }
        if (!keyMatches) {
          await subscription.unsubscribe();
          subscription = null;
        }
      } catch {
        // If checking fails, continue with existing or fallback
      }
    }

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    if (!subscription) return false;

    // 3. Send subscription + reminders + timezone to server
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem';
    await fetch('/api/save-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        reminders,
        timezone: tz,
      }),
    });

    return true;
  } catch (err) {
    console.warn('Web push subscription error:', err);
    return false;
  }
};

/**
 * Sends a real test Web Push message via server-side push service.
 * This triggers the OS push pipeline to wake sleeping/locked phone screens!
 */
export const sendTestWebPushNotification = async (reminders: ReminderItem[]): Promise<boolean> => {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return false;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      await subscribeUserToWebPush(reminders);
      subscription = await reg.pushManager.getSubscription();
    }
    if (!subscription) return false;

    const res = await fetch('/api/send-test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });
    return res.ok;
  } catch (err) {
    console.warn('sendTestWebPushNotification error:', err);
    return false;
  }
};


/**
 * Synchronizes reminders to the Service Worker and registers OS-level triggers
 * so alarms fire even if the browser is closed or phone is locked/off.
 */
export const syncRemindersToServiceWorker = async (reminders: ReminderItem[]): Promise<void> => {
  try {
    // 1. Save to shared IndexedDB so SW can read anytime
    await saveRemindersToIDB(reminders);

    // 2. Post to Service Worker to schedule triggers & alarms
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        if (reg.active && typeof reg.active.postMessage === 'function') {
          reg.active.postMessage({
            type: 'SCHEDULE_REMINDERS',
            reminders,
          });
        }

        // 3. Register Periodic Background Sync if available
        if ('periodicSync' in reg && typeof (reg as any).periodicSync?.register === 'function') {
          try {
            await (reg as any).periodicSync.register('perek-shira-reminder-check', {
              minInterval: 60 * 60 * 1000, // Every hour minimum
            });
          } catch {
            // Periodic sync is optional/permission-dependent
          }
        }
      }
    }

    // 4. Synchronize with Server-side Web Push for closed-browser / locked-phone alerts
    subscribeUserToWebPush(reminders).catch(() => {});
  } catch (err) {
    console.warn('Error syncing reminders to Service Worker:', err);
  }
};

/**
 * Persists reminders array into safeStorage and syncs to Service Worker
 */
export const saveReminders = (reminders: ReminderItem[]): void => {
  safeStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  syncRemindersToServiceWorker(reminders).catch(() => {});
};

/**
 * Checks all active reminders and triggers device notifications and/or in-app alerts
 * for any matching current time & day.
 * Includes catch-up grace window for sleeping devices or throttled background tabs.
 */
export const checkAndTriggerReminders = (
  reminders: ReminderItem[],
  onTriggered?: (reminder: ReminderItem) => void
): string[] => {
  if (!Array.isArray(reminders) || reminders.length === 0) return [];

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const triggeredIds: string[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled || !reminder.time) continue;

    // 1. Day of week check
    const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];
    const isTodayActive = days.length === 0 || days.includes(currentDay);
    if (!isTodayActive) continue;

    // 2. Parse reminder time
    const parsed = parseTimeString(reminder.time);
    if (!parsed) continue;

    const reminderTotalMinutes = parsed.hours * 60 + parsed.minutes;

    // 3. Has this reminder already fired today?
    const fireKey = `perek-shira-fired-${reminder.id}-${todayStr}`;
    if (safeStorage.getItem(fireKey) === 'true') {
      continue; // Already triggered today!
    }

    // 4. Timing evaluation:
    // Case A: Exact minute match (current minute equals reminder minute)
    const isExactMinute = currentTotalMinutes === reminderTotalMinutes;

    // Case B: Grace catch-up window (within 15 minutes of scheduled time)
    // Handles scenarios where phone screen was locked, tab throttled, or browser sleeping when reminder was due
    const minuteDiff = currentTotalMinutes - reminderTotalMinutes;
    const isCatchUpWindow = minuteDiff > 0 && minuteDiff <= 15;

    let canTriggerCatchUp = false;
    if (isCatchUpWindow) {
      const scheduledTimeToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parsed.hours,
        parsed.minutes,
        0,
        0
      ).getTime();
      const createdAt = reminder.createdAt || 0;
      // Trigger catch-up only if reminder was created prior to the scheduled time today (plus 30s buffer)
      canTriggerCatchUp = createdAt < scheduledTimeToday + 30000;
    }

    if (isExactMinute || canTriggerCatchUp) {
      // Mark as fired for today immediately
      safeStorage.setItem(fireKey, 'true');

      // 1. Send device notification to notification bar/lock screen (without mentioning the scheduled time)
      sendDeviceNotification(
        reminder.label?.trim() || 'קריאת פרק שירה 📖',
        'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
        `perek-shira-reminder-${reminder.id}`
      );

      // 2. In-app pop-up alert (guarantees alert even if system notification was denied/blocked)
      if (typeof onTriggered === 'function') {
        onTriggered(reminder);
      }

      triggeredIds.push(reminder.id);
    }
  }

  return triggeredIds;
};
