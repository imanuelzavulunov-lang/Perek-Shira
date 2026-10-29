// Perek Shira Service Worker for Autonomous Background Reminders & Offline Notifications

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

function getRemindersFromIDB() {
  return openIndexedDB().then((db) => {
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const req = store.get('active_reminders');
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  });
}

function saveRemindersToIDB(reminders) {
  return openIndexedDB().then((db) => {
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put(reminders, 'active_reminders');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Schedules OS-level alarms with Android AlarmManager using the Notification Triggers API (TimestampTrigger).
 * This triggers even when Chrome is completely closed and the phone screen is off/locked!
 */
async function scheduleNotificationTriggers(reminders) {
  if (!Array.isArray(reminders) || reminders.length === 0) return;

  const Trigger = self.TimestampTrigger || (typeof TimestampTrigger !== 'undefined' ? TimestampTrigger : null);

  // If TimestampTrigger is supported (Chrome on Android / Desktop)
  if (Trigger && self.registration && typeof self.registration.showNotification === 'function') {
    const now = new Date();
    
    // Clear previously scheduled triggers
    try {
      const existing = await self.registration.getNotifications({ includeTriggered: false });
      for (const notif of existing) {
        if (notif.tag && notif.tag.startsWith('perek-trigger-')) {
          notif.close();
        }
      }
    } catch (e) {
      // ignore
    }

    // Schedule next 7 days of reminders for each active day of the week
    for (const reminder of reminders) {
      if (!reminder.enabled || !reminder.time) continue;
      const parts = String(reminder.time).trim().split(':');
      const rHours = parseInt(parts[0], 10);
      const rMinutes = parseInt(parts[1], 10);
      if (isNaN(rHours) || isNaN(rMinutes)) continue;

      const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, rHours, rMinutes, 0, 0);
        
        // If today and time has already passed by more than 1 minute, skip today
        if (dayOffset === 0 && targetDate.getTime() <= now.getTime() + 10000) {
          continue;
        }

        const dayOfWeek = targetDate.getDay();
        if (days.length > 0 && !days.includes(dayOfWeek)) {
          continue;
        }

        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        const tag = `perek-trigger-${reminder.id}-${dateStr}`;

        try {
          await self.registration.showNotification(reminder.label?.trim() || 'קריאת פרק שירה 📖', {
            body: 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            dir: 'rtl',
            lang: 'he',
            tag: tag,
            showTrigger: new Trigger(targetDate.getTime()),
            renotify: true,
            vibrate: [250, 100, 250],
            data: { url: '/' },
          });
        } catch (err) {
          console.warn('showTrigger registration error:', err);
        }
      }
    }
  }

  // Setup Service Worker timer for the nearest reminder
  setupNextTimer(reminders);
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

  for (const reminder of reminders) {
    if (!reminder.enabled || !reminder.time) continue;
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
        }
      }
    }
  }

  // If nearest reminder is within the next 6 hours, set setTimeout in service worker
  if (nearestReminder && nearestDiff > 0 && nearestDiff < 6 * 60 * 60 * 1000) {
    activeTimeoutId = setTimeout(() => {
      self.registration.showNotification(nearestReminder.label?.trim() || 'קריאת פרק שירה 📖', {
        body: 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        dir: 'rtl',
        lang: 'he',
        tag: `perek-shira-reminder-${nearestReminder.id}`,
        renotify: true,
        vibrate: [250, 100, 250],
        data: { url: '/' },
      });
      // Re-schedule next
      getRemindersFromIDB().then(scheduleNotificationTriggers);
    }, nearestDiff);
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      return getRemindersFromIDB().then((reminders) => {
        if (reminders && reminders.length > 0) {
          return scheduleNotificationTriggers(reminders);
        }
      });
    })
  );
});

// Periodic background sync event
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'perek-shira-reminder-check') {
    event.waitUntil(
      getRemindersFromIDB().then((reminders) => {
        return scheduleNotificationTriggers(reminders);
      })
    );
  }
});

// Direct Web Push from server
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'קריאת פרק שירה 📖';
  const options = {
    body: data.body || 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag: data.tag || 'perek-shira-reminder',
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [500, 200, 500, 200, 500],
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicking on notification in phone / desktop notification tray
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'פרק שירה 📖';
    const options = event.data.options || {};
    self.registration.showNotification(title, options);
  } else if (event.data.type === 'SCHEDULE_REMINDERS') {
    const reminders = event.data.reminders || [];
    saveRemindersToIDB(reminders).then(() => {
      scheduleNotificationTriggers(reminders);
    });
  }
});
