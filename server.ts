import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';

// Deterministic VAPID Keys fallback - ensures subscriptions never break across server restarts
const DEFAULT_VAPID_KEYS = {
  publicKey: 'BKZnTOuD-Yp8yO4SE56U9kqHYH1FVeXdJHBWghalzNFQIxjqEKyUgD2kZVbHSJ4E8PnROwJDMFcR2HjU-WW_kgc',
  privateKey: 'PdcrMj_XJaWopVR4s7fA8Izn5xvL8SfHOaL8n3C3L0w',
};

interface PushRecord {
  id: string;
  subscription: webpush.PushSubscription;
  reminders: any[];
  timezone: string;
  lastTriggered: Record<string, string>;
  updatedAt: number;
}

function makeSafeSubscriptionId(endpoint: string): string {
  const safe = Buffer.from(endpoint)
    .toString('base64')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(-32);
  return safe || `sub_${Date.now()}`;
}

function parseTimeParts(timeStr: string): { hours: number; minutes: number; normalized: string } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return {
    hours,
    minutes,
    normalized: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

function getLocalClock(date: Date, timeZone: string): { totalMinutes: number; dayOfWeek: number; dateStr: string } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const hourVal = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24;
    const minVal = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const year = parts.find((p) => p.type === 'year')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const day = parts.find((p) => p.type === 'day')?.value || '';
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || '';
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      totalMinutes: hourVal * 60 + minVal,
      dayOfWeek: dayMap[weekdayStr] !== undefined ? dayMap[weekdayStr] : date.getDay(),
      dateStr: `${year}-${month}-${day}`,
    };
  } catch {
    const h = date.getHours();
    const m = date.getMinutes();
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return {
      totalMinutes: h * 60 + m,
      dayOfWeek: date.getDay(),
      dateStr: `${y}-${mo}-${d}`,
    };
  }
}

function sanitizeRecordForStore(raw: any): PushRecord | null {
  if (!raw || !raw.subscription || typeof raw.subscription.endpoint !== 'string') return null;
  const endpoint = raw.subscription.endpoint;
  if (endpoint.length < 10 || endpoint.length > 1024) return null;

  const id = typeof raw.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(raw.id)
    ? raw.id
    : makeSafeSubscriptionId(endpoint);

  const cleanSub: any = { endpoint };
  if (raw.subscription.expirationTime !== undefined) {
    cleanSub.expirationTime = raw.subscription.expirationTime;
  }
  if (raw.subscription.keys && typeof raw.subscription.keys === 'object') {
    cleanSub.keys = raw.subscription.keys;
  }

  const reminders = Array.isArray(raw.reminders) ? raw.reminders.slice(0, 50) : [];
  const timezone = typeof raw.timezone === 'string' && raw.timezone.trim().length > 0
    ? raw.timezone.trim().slice(0, 64)
    : 'Asia/Jerusalem';

  const lastTriggered: Record<string, string> = {};
  if (raw.lastTriggered && typeof raw.lastTriggered === 'object') {
    const entries = Object.entries(raw.lastTriggered).slice(-100);
    for (const [k, v] of entries) {
      if (typeof v === 'string') {
        lastTriggered[k] = v;
      }
    }
  }

  return {
    id,
    subscription: cleanSub,
    reminders,
    timezone,
    lastTriggered,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

function initServerFirestore(): Firestore | null {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!cfg?.projectId || !cfg?.apiKey) return null;

    const appName = 'server-push-store';
    const existingApp = getApps().find((a) => a.name === appName);
    const fbApp = existingApp ? getApp(appName) : initializeApp(cfg, appName);
    const dbId = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)' ? cfg.firestoreDatabaseId : undefined;
    return getFirestore(fbApp, dbId);
  } catch (err: any) {
    console.warn('Server Firestore initialization skipped:', err?.message || err);
    return null;
  }
}

async function startServer() {
  const app = express();
  // In AI Studio, the dev server must always listen on port 3000 behind the internal proxy
  const portArgIndex = process.argv.indexOf('--port');
  const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  const PORT = cliPort || 3000;

  app.use(express.json());

  // VAPID configuration for Web Push with persistence
  const VAPID_FILE = path.join(process.cwd(), 'vapid-keys.json');
  let vapidKeys = DEFAULT_VAPID_KEYS;
  if (fs.existsSync(VAPID_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
      if (parsed?.publicKey && parsed?.privateKey) {
        vapidKeys = parsed;
      } else {
        fs.writeFileSync(VAPID_FILE, JSON.stringify(DEFAULT_VAPID_KEYS, null, 2));
      }
    } catch {
      fs.writeFileSync(VAPID_FILE, JSON.stringify(DEFAULT_VAPID_KEYS, null, 2));
    }
  } else {
    try {
      fs.writeFileSync(VAPID_FILE, JSON.stringify(DEFAULT_VAPID_KEYS, null, 2));
    } catch {
      // ignore
    }
  }

  webpush.setVapidDetails(
    'mailto:support@perekshira.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  // Subscriptions persistence: Firestore primary store + local subscriptions.json fallback cache
  const serverDb = initServerFirestore();
  const SUBS_FILE = path.join(process.cwd(), 'subscriptions.json');

  const readLocalSubscriptions = (): PushRecord[] => {
    if (!fs.existsSync(SUBS_FILE)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8'));
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeRecordForStore).filter(Boolean) as PushRecord[];
    } catch {
      return [];
    }
  };

  const writeLocalSubscriptions = (subs: PushRecord[]) => {
    try {
      fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
    } catch (e) {
      console.warn('Error saving local subscriptions cache:', e);
    }
  };

  const subsMap = new Map<string, PushRecord>();
  for (const rec of readLocalSubscriptions()) {
    subsMap.set(rec.id, rec);
  }

  const syncFromFirestore = async (): Promise<void> => {
    if (!serverDb) return;
    try {
      const snap = await getDocs(collection(serverDb, 'push_subscriptions'));
      snap.forEach((docSnap) => {
        const remote = sanitizeRecordForStore({ ...docSnap.data(), id: docSnap.id });
        if (!remote) return;
        const local = subsMap.get(remote.id);
        if (!local) {
          subsMap.set(remote.id, remote);
        } else {
          const mergedTriggered = { ...remote.lastTriggered, ...local.lastTriggered };
          const winner = remote.updatedAt >= local.updatedAt ? remote : local;
          subsMap.set(remote.id, {
            ...winner,
            lastTriggered: mergedTriggered,
          });
        }
      });
      writeLocalSubscriptions(Array.from(subsMap.values()));
    } catch (err: any) {
      console.warn('Error syncing subscriptions from Firestore:', err?.message || err);
    }
  };

  const persistRecord = async (record: PushRecord): Promise<void> => {
    const clean = sanitizeRecordForStore(record);
    if (!clean) return;
    subsMap.set(clean.id, clean);
    writeLocalSubscriptions(Array.from(subsMap.values()));
    if (serverDb) {
      try {
        await setDoc(doc(serverDb, 'push_subscriptions', clean.id), clean, { merge: true });
      } catch (err: any) {
        console.warn('Error saving subscription to Firestore:', err?.message || err);
      }
    }
  };

  const deleteRecord = async (id: string): Promise<void> => {
    subsMap.delete(id);
    writeLocalSubscriptions(Array.from(subsMap.values()));
    if (serverDb) {
      try {
        await deleteDoc(doc(serverDb, 'push_subscriptions', id));
      } catch (err: any) {
        console.warn('Error deleting expired subscription from Firestore:', err?.message || err);
      }
    }
  };

  // 1. Get VAPID public key
  app.get('/api/vapid-public-key', (_req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // 2. Save user subscription with active reminders and timezone
  app.post('/api/save-subscription', async (req, res) => {
    try {
      const { subscription, reminders, timezone } = req.body || {};
      if (!subscription || typeof subscription.endpoint !== 'string' || subscription.endpoint.length < 10) {
        return res.status(400).json({ error: 'Invalid subscription' });
      }

      const safeId = makeSafeSubscriptionId(subscription.endpoint);
      const existing = subsMap.get(safeId);

      const record = sanitizeRecordForStore({
        id: safeId,
        subscription,
        reminders: Array.isArray(reminders) ? reminders : [],
        timezone: timezone || 'Asia/Jerusalem',
        lastTriggered: existing?.lastTriggered || {},
        updatedAt: Date.now(),
      });

      if (!record) {
        return res.status(400).json({ error: 'Invalid subscription payload' });
      }

      await persistRecord(record);
      res.json({ success: true, id: safeId, count: subsMap.size });
    } catch (err: any) {
      console.warn('Error in /api/save-subscription:', err?.message || err);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  // 3. Send test push notification directly to user's device with HIGH URGENCY
  app.post('/api/send-test-push', async (req, res) => {
    try {
      const { subscription, reminders, timezone } = req.body || {};
      if (!subscription || typeof subscription.endpoint !== 'string') {
        return res.status(400).json({ error: 'Invalid subscription' });
      }

      const safeId = makeSafeSubscriptionId(subscription.endpoint);
      if (Array.isArray(reminders)) {
        const existing = subsMap.get(safeId);
        const record = sanitizeRecordForStore({
          id: safeId,
          subscription,
          reminders,
          timezone: timezone || 'Asia/Jerusalem',
          lastTriggered: existing?.lastTriggered || {},
          updatedAt: Date.now(),
        });
        if (record) {
          await persistRecord(record);
        }
      }

      const payload = JSON.stringify({
        title: 'בדיקת התראה - פרק שירה 📖',
        body: 'התראות המכשיר פועלות בהצלחה! התזכורת תקפוץ בזמן שבחרתם גם כשהאפליקציה סגורה.',
        tag: `perek-shira-test-${Date.now()}`,
        url: '/',
      });

      const pushOptions = {
        TTL: 86400,
        urgency: 'high' as const,
        headers: {
          Urgency: 'high',
        },
      };

      await webpush.sendNotification(subscription, payload, pushOptions);
      res.json({ success: true });
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        const endpoint = req.body?.subscription?.endpoint;
        if (typeof endpoint === 'string') {
          await deleteRecord(makeSafeSubscriptionId(endpoint));
        }
        return res.status(410).json({ error: 'Subscription expired' });
      }
      console.warn('Error sending test push notification:', err?.message || err);
      res.status(500).json({ error: err?.message || 'Push failed' });
    }
  });

  // Core background notification runner function with concurrency lock & awaited delivery
  let isDispatching = false;

  const checkAndDispatchReminders = async () => {
    if (isDispatching) {
      return { checked: subsMap.size, sent: 0, failed: 0, pruned: 0, skippedConcurrent: true };
    }
    isDispatching = true;

    try {
      const subs = Array.from(subsMap.values());
      if (subs.length === 0) return { checked: 0, sent: 0, failed: 0, pruned: 0 };

      const now = new Date();
      const yesterdayRef = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      interface PendingPush {
        sub: PushRecord;
        reminderId: string;
        triggerKey: string;
        payload: string;
        pushOptions: webpush.RequestOptions;
      }

      const pendingPushes: PendingPush[] = [];

      for (const sub of subs) {
        if (!sub.reminders || !Array.isArray(sub.reminders) || sub.reminders.length === 0) continue;

        const tz = sub.timezone || 'Asia/Jerusalem';
        const todayClock = getLocalClock(now, tz);
        const yesterdayClock = todayClock.totalMinutes < 5 ? getLocalClock(yesterdayRef, tz) : null;

        if (!sub.lastTriggered) sub.lastTriggered = {};

        for (const reminder of sub.reminders) {
          if (!reminder?.enabled || !reminder?.time) continue;
          const parsedTime = parseTimeParts(reminder.time);
          if (!parsedTime) continue;

          const reminderTotalMinutes = parsedTime.hours * 60 + parsedTime.minutes;
          const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];

          let matchedDateStr: string | null = null;

          // Evaluate today's schedule (0..5 minute catch-up window)
          if (days.length === 0 || days.includes(todayClock.dayOfWeek)) {
            const diffToday = todayClock.totalMinutes - reminderTotalMinutes;
            if (diffToday >= 0 && diffToday <= 5) {
              matchedDateStr = todayClock.dateStr;
            }
          }

          // Evaluate midnight wraparound (e.g. 23:57 scheduled yesterday, checked at 00:01 today)
          if (!matchedDateStr && yesterdayClock && reminderTotalMinutes >= 1435) {
            if (days.length === 0 || days.includes(yesterdayClock.dayOfWeek)) {
              const diffYesterday = (todayClock.totalMinutes + 1440) - reminderTotalMinutes;
              if (diffYesterday >= 0 && diffYesterday <= 5) {
                matchedDateStr = yesterdayClock.dateStr;
              }
            }
          }

          if (!matchedDateStr) continue;

          const triggerKey = `${matchedDateStr}-${parsedTime.normalized}`;
          if (sub.lastTriggered[reminder.id] === triggerKey) {
            continue;
          }

          const reminderTag = `perek-shira-reminder-${reminder.id}-${matchedDateStr}`;
          const payload = JSON.stringify({
            title: reminder.label?.trim() || 'קריאת פרק שירה 📖',
            body: 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
            tag: reminderTag,
            url: '/',
          });

          const pushOptions: webpush.RequestOptions = {
            TTL: 86400,
            urgency: 'high',
            headers: {
              Urgency: 'high',
            },
          };

          pendingPushes.push({
            sub,
            reminderId: reminder.id,
            triggerKey,
            payload,
            pushOptions,
          });
        }
      }

      if (pendingPushes.length === 0) {
        return { checked: subs.length, sent: 0, failed: 0, pruned: 0 };
      }

      const results = await Promise.allSettled(
        pendingPushes.map((item) =>
          webpush.sendNotification(item.sub.subscription, item.payload, item.pushOptions)
        )
      );

      const dirtySubIds = new Set<string>();
      const expiredSubIds = new Set<string>();
      let sentCount = 0;
      let failedCount = 0;

      results.forEach((result, idx) => {
        const item = pendingPushes[idx];
        if (result.status === 'fulfilled') {
          item.sub.lastTriggered[item.reminderId] = item.triggerKey;
          item.sub.updatedAt = Date.now();
          dirtySubIds.add(item.sub.id);
          sentCount++;
        } else {
          const err: any = result.reason;
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            expiredSubIds.add(item.sub.id);
          } else {
            failedCount++;
            console.warn('Web push send error (will retry if within window):', err?.statusCode, err?.message || err);
          }
        }
      });

      for (const expiredId of expiredSubIds) {
        await deleteRecord(expiredId);
      }

      for (const dirtyId of dirtySubIds) {
        if (expiredSubIds.has(dirtyId)) continue;
        const rec = subsMap.get(dirtyId);
        if (rec) {
          await persistRecord(rec);
        }
      }

      return {
        checked: subs.length,
        sent: sentCount,
        failed: failedCount,
        pruned: expiredSubIds.size,
      };
    } catch (err) {
      console.warn('Error in background reminder ticker:', err);
      return { checked: subsMap.size, sent: 0, failed: 0, pruned: 0 };
    } finally {
      isDispatching = false;
    }
  };

  // 4. Autonomous Server Background Ticker (every 20s) + Periodic Firestore Sync (every 60s)
  let tickCounter = 0;
  setInterval(async () => {
    tickCounter++;
    if (tickCounter % 3 === 0) {
      await syncFromFirestore();
    }
    await checkAndDispatchReminders();
  }, 20000);

  // Cron trigger endpoint (for external schedulers, uptime pingers, or cold-start wake)
  app.get('/api/cron-check-reminders', async (_req, res) => {
    await syncFromFirestore();
    const result = await checkAndDispatchReminders();
    res.json({ success: true, ...result, timestamp: new Date().toISOString() });
  });

  // Serve public assets (images, icons, manifest)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // In production serve dist, in dev mount Vite middlewares
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    // Initial sync & catch-up dispatch immediately after server boots
    syncFromFirestore()
      .then(() => checkAndDispatchReminders())
      .catch(() => {});
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} already in use. A process is already serving on this port.`);
    } else {
      console.error('Server listen error:', err);
    }
  });
}

startServer();
