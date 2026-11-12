import { ReminderItem } from '../types';
import { safeStorage } from './storage';

const REMINDERS_STORAGE_KEY = 'perek-shira-reminders';
const OLD_REMINDER_STORAGE_KEY = 'perek-shira-reminder';

export type PushFailureReason =
  | 'ios_install_required'
  | 'unsupported'
  | 'permission_denied'
  | 'permission_dismissed'
  | 'iframe_blocked'
  | 'sw_unavailable'
  | 'server_error';

export interface PushSubscriptionResult {
  ok: boolean;
  reason?: PushFailureReason;
  detail?: string;
}

export const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1)
  );
};

export const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (window.navigator as any)?.standalone === true
  );
};

export const isRunningInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const isIOSNeedingHomeScreenInstall = (): boolean => {
  if (!isIOSDevice()) return false;
  if (isStandaloneMode()) return false;
  return !('PushManager' in window && 'Notification' in window);
};

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

export const getPushFailureHebrewMessage = (reason?: PushFailureReason): string => {
  switch (reason) {
    case 'ios_install_required':
      return 'באייפון/אייפד יש להוסיף קודם את האפליקציה למסך הבית (כפתור שיתוף > הוספה למסך הבית) כדי לקבל התראות כשהאפליקציה סגורה.';
    case 'permission_denied':
      return 'ההתראות חסומות בדפדפן. לחצו על סמל המנעול ליד שורת הכתובת > הרשאות > אפשר התראות.';
    case 'permission_dismissed':
      return 'יש לאשר גישה להתראות כדי שהתזכורת תקפוץ גם כשהאפליקציה סגורה.';
    case 'iframe_blocked':
      return 'בחלון תצוגה מקדימה הדפדפן חוסם רישום התראות רקע. פתחו את האפליקציה בלשונית נפרדת להפעלת התראות.';
    case 'unsupported':
      return 'דפדפן זה אינו תומך בהתראות רקע (Web Push). נסו להשתמש ב-Chrome, Edge, Firefox או להוסיף למסך הבית.';
    case 'sw_unavailable':
      return 'שירות ההתראות עדיין נטען. נסו לרענן את העמוד ולשמור שוב.';
    case 'server_error':
    default:
      return 'לא ניתן היה לרשום את המכשיר לקבלת התראות ברקע כרגע. בדקו את החיבור ונסו שוב.';
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
  } catch (err) {
    console.warn('Error clearing fired reminder state:', err);
  }
};

/**
 * Sends a system notification to the device tray and notification heads-up banner
 */
export const sendDeviceNotification = async (
  title: string = 'קריאת פרק שירה 📖',
  body: string = 'הגיע הזמן לקריאת פרק שירה היומי שלכם! לחצו לפתיחה.',
  tag?: string
): Promise<boolean> => {
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

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const notificationTag = tag || `perek-shira-reminder-${todayStr}`;

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag: notificationTag,
    renotify: true,
    silent: false,
    requireInteraction: false,
  };

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await getActiveServiceWorkerRegistration();
      if (reg) {
        if (typeof reg.showNotification === 'function') {
          await reg.showNotification(title, options);
          return true;
        }
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
 */
export const loadReminders = (): ReminderItem[] => {
  try {
    const raw = safeStorage.getItem(REMINDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (item) => !(item.id === 'default-shira' && item.enabled === false && parsed.length === 1)
        );
        return cleaned.map((item) => ({
          id: String(item.id || `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
          label: String(item.label || 'קריאת פרק שירה').trim(),
          time: normalizeTimeStr(String(item.time || '08:00')),
          days: Array.isArray(item.days) ? item.days : [0, 1, 2, 3, 4, 5, 6],
          enabled: Boolean(item.enabled),
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        }));
      }
    }

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

  return [];
};

const DB_NAME = 'perek_shira_data';
const DB_STORE = 'reminders_store';

const saveRemindersToIDB = (reminders: ReminderItem[], timezone?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(false);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains(DB_STORE)) {
          idb.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = (e: any) => {
        const idb = e.target.result;
        try {
          const tx = idb.transaction(DB_STORE, 'readwrite');
          const store = tx.objectStore(DB_STORE);
          store.put(reminders, 'active_reminders');
          if (timezone) {
            store.put(timezone, 'user_timezone');
          }
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
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function waitForWorkerActivation(reg: ServiceWorkerRegistration, timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (reg.active) return Promise.resolve(reg);

  const worker = reg.installing || reg.waiting;
  if (!worker) {
    return Promise.race([
      navigator.serviceWorker.ready.then((r) => (r.active ? r : null)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ServiceWorkerRegistration | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish(reg.active ? reg : null);
    }, timeoutMs);

    const onStateChange = () => {
      if (worker.state === 'activated' || reg.active) {
        worker.removeEventListener('statechange', onStateChange);
        finish(reg);
      } else if (worker.state === 'redundant') {
        worker.removeEventListener('statechange', onStateChange);
        navigator.serviceWorker.ready.then((r) => finish(r.active ? r : null)).catch(() => finish(null));
      }
    };

    worker.addEventListener('statechange', onStateChange);
  });
}

/**
 * Obtains a fully ACTIVATED ServiceWorkerRegistration, waiting for installation/activation if needed.
 */
export const getActiveServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    let reg = (await navigator.serviceWorker.getRegistration('/')) || (await navigator.serviceWorker.getRegistration());
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    }
    if (reg.active) return reg;

    const activated = await waitForWorkerActivation(reg, 8000);
    if (activated?.active) return activated;

    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    return readyReg?.active ? readyReg : null;
  } catch (err) {
    console.warn('Failed to get active Service Worker registration:', err);
    return null;
  }
};

/**
 * Subscribes the user's device to Server-Side Web Push and persists subscription + schedule
 * to the backend (and Firestore via server) with structured diagnostics on failure.
 */
export const ensureWebPushSubscribed = async (reminders: ReminderItem[]): Promise<PushSubscriptionResult> => {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  if (isIOSNeedingHomeScreenInstall()) {
    return { ok: false, reason: 'ios_install_required' };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: isRunningInIframe() ? 'iframe_blocked' : 'unsupported' };
  }

  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'permission_denied' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'permission_dismissed' };
  }

  try {
    const reg = await getActiveServiceWorkerRegistration();
    if (!reg || !reg.active) {
      return { ok: false, reason: 'sw_unavailable' };
    }

    const keyRes = await fetch('/api/vapid-public-key');
    if (!keyRes.ok) {
      return { ok: false, reason: 'server_error', detail: `VAPID fetch failed (${keyRes.status})` };
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      return { ok: false, reason: 'server_error', detail: 'Empty VAPID key' };
    }

    const convertedVapidKey = urlB64ToUint8Array(publicKey);

    let subscription = await reg.pushManager.getSubscription();
    if (subscription && subscription.options?.applicationServerKey) {
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
        // ignore mismatch check errors
      }
    }

    if (!subscription) {
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      } catch (subErr: any) {
        const msg = String(subErr?.message || subErr);
        console.warn('pushManager.subscribe failed:', msg);
        if (isRunningInIframe()) {
          return { ok: false, reason: 'iframe_blocked', detail: msg };
        }
        return { ok: false, reason: 'unsupported', detail: msg };
      }
    }

    if (!subscription) {
      return { ok: false, reason: 'unsupported' };
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem';
    saveRemindersToIDB(reminders, tz).catch(() => {});

    let savedOk = false;
    for (let attempt = 0; attempt < 2 && !savedOk; attempt++) {
      try {
        const saveRes = await fetch('/api/save-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            reminders,
            timezone: tz,
          }),
        });
        if (saveRes.ok) {
          savedOk = true;
        }
      } catch {
        // retry on second attempt
      }
    }

    if (!savedOk) {
      return { ok: false, reason: 'server_error' };
    }

    return { ok: true };
  } catch (err: any) {
    console.warn('Web push subscription error:', err);
    return { ok: false, reason: 'server_error', detail: String(err?.message || err) };
  }
};

export const subscribeUserToWebPush = async (reminders: ReminderItem[]): Promise<boolean> => {
  const res = await ensureWebPushSubscribed(reminders);
  return res.ok;
};

/**
 * Sends a real test Web Push message via server-side push service.
 */
export const sendTestWebPushNotification = async (reminders: ReminderItem[]): Promise<boolean> => {
  try {
    const ensure = await ensureWebPushSubscribed(reminders);
    if (!ensure.ok) return false;

    const reg = await getActiveServiceWorkerRegistration();
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return false;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem';
    const res = await fetch('/api/send-test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, reminders, timezone: tz }),
    });
    return res.ok;
  } catch (err) {
    console.warn('sendTestWebPushNotification error:', err);
    return false;
  }
};

/**
 * Synchronizes reminders to IndexedDB and the Service Worker for offline/background resilience.
 * Does NOT duplicate network calls to /api/save-subscription (handled explicitly by ensureWebPushSubscribed).
 */
export const syncRemindersToServiceWorker = async (reminders: ReminderItem[]): Promise<void> => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem';
    await saveRemindersToIDB(reminders, tz);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await getActiveServiceWorkerRegistration();
      if (reg) {
        if (reg.active && typeof reg.active.postMessage === 'function') {
          reg.active.postMessage({
            type: 'SCHEDULE_REMINDERS',
            reminders,
            timezone: tz,
          });
        }

        if ('periodicSync' in reg && typeof (reg as any).periodicSync?.register === 'function') {
          try {
            await (reg as any).periodicSync.register('perek-shira-reminder-check', {
              minInterval: 60 * 60 * 1000,
            });
          } catch {
            // Optional permission-dependent API
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error syncing reminders to Service Worker:', err);
  }
};

/**
 * Persists reminders array into safeStorage and syncs to IndexedDB + Service Worker
 */
export const saveReminders = (reminders: ReminderItem[]): void => {
  safeStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  syncRemindersToServiceWorker(reminders).catch(() => {});
};

/**
 * Checks all active reminders while app is open and triggers foreground device notifications
 * sharing the exact daily tag used by the server push dispatcher.
 */
export const checkAndTriggerReminders = (
  reminders: ReminderItem[],
  onTriggered?: (reminder: ReminderItem) => void
): string[] => {
  if (!Array.isArray(reminders) || reminders.length === 0) return [];

  const now = new Date();
  const currentDay = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const triggeredIds: string[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled || !reminder.time) continue;

    const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];
    const isTodayActive = days.length === 0 || days.includes(currentDay);
    if (!isTodayActive) continue;

    const parsed = parseTimeString(reminder.time);
    if (!parsed) continue;

    const reminderTotalMinutes = parsed.hours * 60 + parsed.minutes;
    const fireKey = `perek-shira-fired-${reminder.id}-${todayStr}`;
    if (safeStorage.getItem(fireKey) === 'true') {
      continue;
    }

    const isExactMinute = currentTotalMinutes === reminderTotalMinutes;
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
      canTriggerCatchUp = createdAt < scheduledTimeToday + 30000;
    }

    if (isExactMinute || canTriggerCatchUp) {
      safeStorage.setItem(fireKey, 'true');

      sendDeviceNotification(
        reminder.label?.trim() || 'קריאת פרק שירה 📖',
        'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
        `perek-shira-reminder-${reminder.id}-${todayStr}`
      );

      if (typeof onTriggered === 'function') {
        onTriggered(reminder);
      }

      triggeredIds.push(reminder.id);
    }
  }

  return triggeredIds;
};
