'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

function subscribe(callback: () => void) {
  window.addEventListener('rentwise-theme-change', callback);
  return () => window.removeEventListener('rentwise-theme-change', callback);
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light');

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem('rentwise-theme', next);
    window.dispatchEvent(new CustomEvent<Theme>('rentwise-theme-change', { detail: next }));
  }

  return (
    <button className={`theme-toggle${compact ? ' compact' : ''}`} type="button" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
      {!compact && <em>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</em>}
    </button>
  );
}
