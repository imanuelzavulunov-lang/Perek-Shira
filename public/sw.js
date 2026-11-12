// Perek Shira Service Worker for Autonomous Background Reminders & Web Push Notifications

const DB_NAME = 'perek_shira_data';
const DB_STORE = 'reminders_store';

function openIndexedDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function getFromIDB(key, fallback) {
  return openIndexedDB().then((db) => {
    if (!db) return fallback;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : fallback);
        req.onerror = () => resolve(fallback);
      } catch {
        resolve(fallback);
      }
    });
  });
}

function putToIDB(key, value) {
  return openIndexedDB().then((db) => {
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  });
}

function getRemindersFromIDB() {
  return getFromIDB('active_reminders', []);
}

function saveRemindersToIDB(reminders) {
  return putToIDB('active_reminders', Array.isArray(reminders) ? reminders : []);
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let activeTimeoutId = null;

function setupNextTimer(reminders) {
  if (activeTimeoutId) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = null;
  }

  if (!Array.isArray(reminders) || reminders.length === 0) return;

  const now = new Date();
  let nearestDiff = Infinity;
  let nearestReminder = null;
  let nearestDateStr = '';

  for (const reminder of reminders) {
    if (!reminder?.enabled || !reminder?.time) continue;
    const parts = String(reminder.time).trim().split(':');
    const rHours = parseInt(parts[0], 10);
    const rMinutes = parseInt(parts[1], 10);
    if (isNaN(rHours) || isNaN(rMinutes)) continue;

    const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];

    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, rHours, rMinutes, 0, 0);
      const diff = targetDate.getTime() - now.getTime();
      const dayOfWeek = targetDate.getDay();

      if (diff > 5000 && (days.length === 0 || days.includes(dayOfWeek))) {
        if (diff < nearestDiff) {
          nearestDiff = diff;
          nearestReminder = reminder;
          nearestDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        }
      }
    }
  }

  if (nearestReminder && nearestDiff > 0 && nearestDiff < 6 * 60 * 60 * 1000) {
    activeTimeoutId = setTimeout(() => {
      self.registration.showNotification(nearestReminder.label?.trim() || 'קריאת פרק שירה 📖', {
        body: 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        dir: 'rtl',
        lang: 'he',
        tag: `perek-shira-reminder-${nearestReminder.id}-${nearestDateStr}`,
        renotify: true,
        silent: false,
        vibrate: [250, 100, 250],
        data: { url: '/' },
      }).catch(() => {});
      getRemindersFromIDB().then(scheduleNotificationTriggers).catch(() => {});
    }, nearestDiff);
  }
}

/**
 * Schedules OS-level Notification Triggers (where supported) as an offline backup,
 * sharing the exact same daily tag as server Web Push so alerts never duplicate.
 */
async function scheduleNotificationTriggers(reminders) {
  const Trigger = self.TimestampTrigger || (typeof TimestampTrigger !== 'undefined' ? TimestampTrigger : null);

  if (Trigger && self.registration && typeof self.registration.showNotification === 'function') {
    // Always clear previously scheduled triggers first (even when list becomes empty/disabled)
    try {
      const existing = await self.registration.getNotifications({ includeTriggered: false });
      for (const notif of existing) {
        if (notif.tag && (notif.tag.startsWith('perek-trigger-') || notif.tag.startsWith('perek-shira-reminder-'))) {
          notif.close();
        }
      }
    } catch {
      // ignore
    }

    if (Array.isArray(reminders) && reminders.length > 0) {
      const now = new Date();
      for (const reminder of reminders) {
        if (!reminder?.enabled || !reminder?.time) continue;
        const parts = String(reminder.time).trim().split(':');
        const rHours = parseInt(parts[0], 10);
        const rMinutes = parseInt(parts[1], 10);
        if (isNaN(rHours) || isNaN(rMinutes)) continue;

        const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, rHours, rMinutes, 0, 0);
          if (dayOffset === 0 && targetDate.getTime() <= now.getTime() + 10000) {
            continue;
          }
          const dayOfWeek = targetDate.getDay();
          if (days.length > 0 && !days.includes(dayOfWeek)) {
            continue;
          }

          const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
          const tag = `perek-shira-reminder-${reminder.id}-${dateStr}`;

          try {
            await self.registration.showNotification(reminder.label?.trim() || 'קריאת פרק שירה 📖', {
              body: 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              dir: 'rtl',
              lang: 'he',
              tag,
              showTrigger: new Trigger(targetDate.getTime()),
              renotify: true,
              silent: false,
              vibrate: [250, 100, 250],
              data: { url: '/' },
            });
          } catch {
            // showTrigger not supported or rejected on this platform
          }
        }
      }
    }
  }

  setupNextTimer(reminders);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      getRemindersFromIDB().then((reminders) => {
        if (reminders && reminders.length > 0) {
          return scheduleNotificationTriggers(reminders);
        }
      })
    )
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'perek-shira-reminder-check') {
    event.waitUntil(
      getRemindersFromIDB().then((reminders) => scheduleNotificationTriggers(reminders))
    );
  }
});

// Direct Web Push from backend server (fires reliably even when app & browser are closed)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { body: event.data ? event.data.text() : '' };
    } catch {
      data = {};
    }
  }

  const title = data.title || 'קריאת פרק שירה 📖';
  const tag = data.tag || 'perek-shira-reminder';
  const body = data.body || 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.';
  const targetUrl = data.url || '/';

  const fullOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [250, 100, 250],
    data: { url: targetUrl },
  };

  event.waitUntil(
    self.registration.showNotification(title, fullOptions).catch(() =>
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        tag,
        data: { url: targetUrl },
      })
    )
  );
});

// Re-subscribe automatically if the browser rotates or expires the push subscription in the background
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        let applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
        if (!applicationServerKey) {
          const keyRes = await fetch('/api/vapid-public-key');
          if (keyRes.ok) {
            const json = await keyRes.json();
            if (json?.publicKey) {
              applicationServerKey = urlB64ToUint8Array(json.publicKey);
            }
          }
        }

        if (!applicationServerKey) return;

        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        const [reminders, timezone] = await Promise.all([
          getRemindersFromIDB(),
          getFromIDB('user_timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'),
        ]);

        await fetch('/api/save-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSubscription,
            reminders: Array.isArray(reminders) ? reminders : [],
            timezone: timezone || 'Asia/Jerusalem',
          }),
        });
      } catch (err) {
        console.warn('pushsubscriptionchange recovery failed:', err);
      }
    })()
  );
});

// Focus or open app window when user taps the system notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = (event.notification?.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});

// Handle messages from the web app client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'פרק שירה 📖';
    const options = event.data.options || {};
    event.waitUntil(self.registration.showNotification(title, options));
  } else if (event.data.type === 'SCHEDULE_REMINDERS') {
    const reminders = event.data.reminders || [];
    const timezone = event.data.timezone;
    event.waitUntil(
      Promise.all([
        saveRemindersToIDB(reminders),
        timezone ? putToIDB('user_timezone', timezone) : Promise.resolve(true),
      ]).then(() => scheduleNotificationTriggers(reminders))
    );
  }
});
