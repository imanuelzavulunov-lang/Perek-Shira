import { GoogleAuthProvider, onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './firebase';

export { auth };

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/tasks.readonly');
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({
  prompt: 'consent select_account',
  access_type: 'offline'
});

export const tasksProvider = provider;

// Cache the access token in memory.
let cachedAccessToken: string | null = null;

const TOKEN_KEY = 'g_tasks_access_token_v2';
const TOKEN_EXP_KEY = 'g_tasks_access_token_v2_exp';

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    const exp = localStorage.getItem(TOKEN_EXP_KEY);
    if (stored && exp && Date.now() < Number(exp)) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + 55 * 60 * 1000));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXP_KEY);
      localStorage.removeItem('g_tasks_access_token');
      localStorage.removeItem('g_tasks_access_token_exp');
    }
  } catch (e) {
    // ignore
  }
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onStateChanged: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    const token = getAccessToken();
    onStateChanged(user, user ? token : null);
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (requestTasksScope = true): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    const selectedProvider = requestTasksScope ? tasksProvider : provider;
    const result = await signInWithPopup(auth, selectedProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;

    if (token) {
      setAccessToken(token);
    }
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/user-cancelled' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('user-cancelled') ||
      error?.message?.includes('user refuses to grant permission')
    ) {
      console.info('Sign-in interaction was closed or canceled by the user.');
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Sign out error:', e);
  }
  setAccessToken(null);
};

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const getNextDateForDayOfWeek = (dayOfWeek: number, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  const currentDayOfWeek = target.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  // Calculate how many days to add
  let daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
  
  // If the target day is today, check if the time has already passed
  if (daysToAdd === 0 && target.getTime() < Date.now()) {
    daysToAdd = 7;
  }
  
  target.setDate(target.getDate() + daysToAdd);
  return target;
};

const formatDueDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T00:00:00.000Z`;
};

const sendSingleTask = async (
  accessToken: string,
  title: string,
  notes: string,
  targetDate: Date,
  rrule: string | null = null
) => {
  const taskBody: any = {
    title: title,
    due: formatDueDate(targetDate),
  };

  if (notes && notes.trim() !== '') {
    taskBody.notes = notes;
  }

  if (rrule) {
    taskBody.recurrence = [rrule];
  }

  const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Task: ${errText || response.statusText}`);
  }

  return await response.json();
};

export const fetchExistingPerekShiraReminder = async (accessToken: string) => {
  if (!accessToken) return null;
  try {
    const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&showHidden=false', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }).catch(() => null);

    if (!listRes || !listRes.ok) return null;
    const data = await listRes.json().catch(() => null);
    if (!data || !data.items || !Array.isArray(data.items)) return null;

    const perekShiraTasks = data.items.filter((item: any) =>
      item.title && (item.title.includes('קריאת פרק שירה') || item.title.includes('פרק שירה'))
    );

    if (perekShiraTasks.length === 0) return null;

    const daysSet = new Set<number>();
    let isWeekly = false;
    let extractedTime = '';

    const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

    for (const task of perekShiraTasks) {
      if (task.notes) {
        if (task.notes.includes('תזכורת שבועית')) isWeekly = true;
        const timeMatch = task.notes.match(/שעה:\s*(\d{1,2}:\d{2})/);
        if (timeMatch) {
          extractedTime = timeMatch[1];
        }
      }
      if (task.recurrence && Array.isArray(task.recurrence)) {
        isWeekly = true;
        for (const rrule of task.recurrence) {
          const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
          if (byDayMatch) {
            const codes = byDayMatch[1].split(',');
            codes.forEach((code: string) => {
              if (DAY_MAP[code] !== undefined) daysSet.add(DAY_MAP[code]);
            });
          }
        }
      }
      if (task.due) {
        const d = new Date(task.due);
        if (!isNaN(d.getTime())) {
          daysSet.add(d.getDay());
        }
      }
    }

    const days = Array.from(daysSet).sort((a, b) => a - b);
    if (!extractedTime || days.length === 0) {
      return null;
    }

    return {
      enabled: true,
      time: extractedTime,
      days: days,
      recurrence: (isWeekly ? 'weekly' : 'once') as 'weekly' | 'once',
    };
  } catch (err) {
    console.warn('Could not fetch existing Perek Shira reminder from Google Tasks:', err);
    return null;
  }
};

export const clearExistingPerekShiraTasks = async (accessToken: string) => {
  if (!accessToken) return;
  try {
    const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&showHidden=false', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }).catch(() => null);

    if (!listRes || !listRes.ok) return;
    const data = await listRes.json().catch(() => null);
    if (!data || !data.items || !Array.isArray(data.items)) return;

    const perekShiraTasks = data.items.filter((item: any) =>
      item.title && (item.title.includes('קריאת פרק שירה') || item.title.includes('פרק שירה'))
    );

    await Promise.all(
      perekShiraTasks.map((item: any) =>
        fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${item.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }).catch(() => {})
      )
    );
  } catch (err) {
    console.warn('Could not clear existing Perek Shira tasks:', err);
  }
};

export const createGoogleTask = async (
  accessToken: string,
  title: string,
  notes: string,
  time: string,
  days: number[] = [],
  recurrence: 'once' | 'weekly' = 'once'
) => {
  // First clear any existing Perek Shira tasks to prevent duplicates when editing
  await clearExistingPerekShiraTasks(accessToken);

  const isWeekly = recurrence === 'weekly';

  if (isWeekly) {
    const daysToUse = days && days.length > 0 ? days.slice().sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
    const byDaysString = daysToUse.map((d) => RRULE_DAYS[d]).join(',');
    const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDaysString};COUNT=15`;

    // Find the earliest upcoming start date among selected days
    const targetDates = daysToUse.map((d) => getNextDateForDayOfWeek(d, time));
    targetDates.sort((a, b) => a.getTime() - b.getTime());
    const earliestTargetDate = targetDates[0];

    return await sendSingleTask(accessToken, title, notes, earliestTargetDate, rrule);
  } else {
    if (!days || days.length === 0) {
      const [hours, minutes] = time.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);
      
      if (targetDate.getTime() < Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      return await sendSingleTask(accessToken, title, notes, targetDate, null);
    }

    // For one-time tasks, create single tasks for each selected day
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const promises = days.map((day) => {
      const targetDate = getNextDateForDayOfWeek(day, time);
      const dayName = dayNames[day] || '';
      const taskTitle = days.length > 1 ? `${title} - יום ${dayName}` : title;
      return sendSingleTask(accessToken, taskTitle, notes, targetDate, null);
    });

    return await Promise.all(promises);
  }
};
