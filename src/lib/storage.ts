// Safe LocalStorage wrapper to prevent crashes in private mode, iframes, or restricted environments
const memoryFallback = new Map<string, string>();

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__test_storage__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

const hasLocalStorage = isStorageAvailable();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (hasLocalStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // ignore
    }
    return memoryFallback.has(key) ? (memoryFallback.get(key) ?? null) : null;
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      // ignore
    }
    memoryFallback.set(key, value);
    return true;
  },

  removeItem: (key: string): boolean => {
    try {
      if (hasLocalStorage) {
        window.localStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      // ignore
    }
    memoryFallback.delete(key);
    return true;
  },

  clear: (): boolean => {
    try {
      if (hasLocalStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      // ignore
    }
    memoryFallback.clear();
    return true;
  }
};

