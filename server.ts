import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // VAPID configuration for Web Push
  const VAPID_FILE = path.join(process.cwd(), 'vapid-keys.json');
  let vapidKeys: { publicKey: string; privateKey: string };
  if (fs.existsSync(VAPID_FILE)) {
    try {
      vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
    } catch {
      vapidKeys = webpush.generateVAPIDKeys();
      fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
    }
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  }

  webpush.setVapidDetails(
    'mailto:support@perekshira.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  // Subscriptions persistence
  const SUBS_FILE = path.join(process.cwd(), 'subscriptions.json');

  const getSubscriptions = (): any[] => {
    if (fs.existsSync(SUBS_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8'));
      } catch {
        return [];
      }
    }
    return [];
  };

  const saveSubscriptions = (subs: any[]) => {
    try {
      fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
    } catch (e) {
      console.warn('Error saving subscriptions:', e);
    }
  };

  // 1. Get VAPID public key
  app.get('/api/vapid-public-key', (_req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // 2. Save user subscription with active reminders and timezone
  app.post('/api/save-subscription', (req, res) => {
    const { subscription, reminders, timezone } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const subs = getSubscriptions();
    const existingIndex = subs.findIndex(
      (s) => s.subscription?.endpoint === subscription.endpoint
    );
    const updatedRecord = {
      id: Buffer.from(subscription.endpoint).toString('base64').slice(-32),
      subscription,
      reminders: Array.isArray(reminders) ? reminders : [],
      timezone: timezone || 'Asia/Jerusalem',
      lastTriggered: existingIndex >= 0 ? subs[existingIndex].lastTriggered || {} : {},
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      subs[existingIndex] = updatedRecord;
    } else {
      subs.push(updatedRecord);
    }

    saveSubscriptions(subs);
    res.json({ success: true });
  });



  // 3. Send test push notification directly to user's device
  app.post('/api/send-test-push', async (req, res) => {
    try {
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription' });
      }

      const payload = JSON.stringify({
        title: 'בדיקת התראה - פרק שירה 📖',
        body: 'התראות המכשיר פועלות בהצלחה גם כשהטלפון נעול ומכובה!',
        tag: 'perek-shira-test-push',
        url: '/',
      });

      const pushOptions = {
        TTL: 86400,
        urgency: 'high' as const,
        headers: {
          'Urgency': 'high',
          'Topic': 'perek-shira-reminder',
        },
      };

      await webpush.sendNotification(subscription, payload, pushOptions);
      res.json({ success: true });
    } catch (err: any) {
      console.warn('Error sending test push notification:', err?.message || err);
      res.status(500).json({ error: err?.message || 'Push failed' });
    }
  });

  // 4. Autonomous 24/7 Server Background Ticker for Scheduled Push Notifications
  // Wakes up phones and displays alerts even when browser is completely closed and phone is locked/asleep!
  setInterval(() => {
    try {
      const subs = getSubscriptions();
      if (subs.length === 0) return;

      const now = new Date();
      let hasUpdates = false;

      for (const sub of subs) {
        if (!sub.reminders || !Array.isArray(sub.reminders) || sub.reminders.length === 0) continue;

        const tz = sub.timezone || 'Asia/Jerusalem';
        let currentTotalMinutes = 0;
        let localDay = 0;
        let localTodayStr = '';

        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: 'numeric',
            hourCycle: 'h23',
            weekday: 'short',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const parts = formatter.formatToParts(now);
          const hourVal = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
          const minVal = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
          const year = parts.find((p) => p.type === 'year')?.value || '';
          const month = parts.find((p) => p.type === 'month')?.value || '';
          const day = parts.find((p) => p.type === 'day')?.value || '';
          localTodayStr = `${year}-${month}-${day}`;
          currentTotalMinutes = hourVal * 60 + minVal;

          const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || '';
          const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
          localDay = dayMap[weekdayStr] !== undefined ? dayMap[weekdayStr] : now.getDay();
        } catch {
          const h = now.getHours();
          const m = now.getMinutes();
          currentTotalMinutes = h * 60 + m;
          localDay = now.getDay();
          localTodayStr = now.toISOString().slice(0, 10);
        }

        if (!sub.lastTriggered) sub.lastTriggered = {};

        for (const reminder of sub.reminders) {
          if (!reminder.enabled || !reminder.time) continue;
          const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];
          if (days.length > 0 && !days.includes(localDay)) continue;

          // Parse numerical hours & minutes
          const [rHour, rMinute] = reminder.time.split(':').map(Number);
          if (isNaN(rHour) || isNaN(rMinute)) continue;
          const reminderTotalMinutes = rHour * 60 + rMinute;

          // Check if due: current minute matches or within 2-minute catchup window
          const minuteDiff = currentTotalMinutes - reminderTotalMinutes;
          const isDue = minuteDiff >= 0 && minuteDiff <= 2;

          if (isDue) {
            if (sub.lastTriggered[reminder.id] === localTodayStr) {
              continue; // Already triggered today
            }

            sub.lastTriggered[reminder.id] = localTodayStr;
            hasUpdates = true;

            const payload = JSON.stringify({
              title: reminder.label?.trim() || 'קריאת פרק שירה 📖',
              body: 'הגיע הזמן לקריאת פרק שירה היומי! לחצו לפתיחה.',
              tag: `perek-shira-reminder-${reminder.id}`,
              url: '/',
            });

            const pushOptions = {
              TTL: 86400,
              urgency: 'high' as const, // High urgency: wakes up locked Android phone from Doze mode
              headers: {
                'Urgency': 'high',
                'Topic': 'perek-shira-reminder',
              },
            };

            webpush.sendNotification(sub.subscription, payload, pushOptions).catch((err: any) => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription has expired
                const currentSubs = getSubscriptions().filter((s) => s.id !== sub.id);
                saveSubscriptions(currentSubs);
              } else {
                console.warn('Web push send error:', err?.message || err);
              }
            });
          }
        }
      }

      if (hasUpdates) {
        saveSubscriptions(subs);
      }
    } catch (err) {
      console.warn('Error in background reminder ticker:', err);
    }
  }, 15000); // Check every 15 seconds

  // In production serve dist, in dev mount Vite middlewares
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
