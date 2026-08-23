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
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      {!compact && <em>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</em>}
    </button>
  );
}
