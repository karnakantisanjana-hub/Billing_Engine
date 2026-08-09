import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '8px 12px',
        cursor: 'pointer',
        color: 'var(--text)',
        background: 'var(--surface)',
      }}
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}