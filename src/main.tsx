import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { safeStorage } from './lib/storage.ts';
import './index.css';

// Immediately synchronize data-theme attribute on document.documentElement to prevent FOUC
try {
  const saved = safeStorage.getItem('perek-shira-settings');
  const validThemes = ['light', 'yellow', 'dark', 'dark-blue'];
  let initialTheme = 'light';
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed?.theme && validThemes.includes(parsed.theme)) {
      initialTheme = parsed.theme;
    }
  }
  document.documentElement.setAttribute('data-theme', initialTheme);
  document.documentElement.classList.remove(
    'theme-light',
    'theme-dark',
    'theme-yellow',
    'theme-dark-blue',
    'theme-olive',
    'theme-warm',
    'theme-parchment',
    'theme-sky'
  );
  document.documentElement.classList.add(`theme-${initialTheme}`);
} catch (e) {
  if (!document.documentElement.getAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.add('theme-light');
  }
}

// Clean up any stale service workers and caches in development or iframe preview
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister().catch(() => {});
    }
  }).catch(() => {});
}

try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  }
} catch (err: any) {
  console.error('[Main] Root mounting error: ' + String(err?.message || err));
}


