import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

export const THEME_TOKENS = {
  light: {
    mode: 'light',
    bg: '#f9f2e6',
    card: '#FAF6EE',
    cardAlt: '#F3EBDC',
    gold: '#C5A059',
    goldSoft: '#F6EBD3',
    goldBannerEnd: '#EFD9A8',
    goldText: '#8A6D34',
    heading: '#2B2420',
    muted: '#6B6153',
    border: 'rgba(163,150,128,0.14)',
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
    overlay: 'rgba(43,36,32,0.45)',
    shadowHi: 'rgba(255,255,255,0.7)',
    shadowLo: 'rgba(163,150,128,0.25)',
    shadowLoSm: 'rgba(163,150,128,0.2)',
    shadowLoInset: 'rgba(163,150,128,0.15)',
    shadowHiInset: 'rgba(255,255,255,0.5)',
    surface: '#ffffff',
    input: '#ffffff',
  },
  dark: {
    mode: 'dark',
    bg: '#0A1120',
    card: '#111A2E',
    cardAlt: '#0E1626',
    gold: '#D8B67C',
    goldSoft: 'rgba(216,182,124,0.14)',
    goldBannerEnd: 'rgba(216,182,124,0.22)',
    goldText: '#E7CB98',
    heading: '#E9EDF6',
    muted: '#9BA6BE',
    border: 'rgba(148,163,184,0.14)',
    danger: '#F87171',
    dangerBg: 'rgba(220,38,38,0.15)',
    overlay: 'rgba(2,6,20,0.65)',
    shadowHi: 'rgba(35,49,82,0.55)',
    shadowLo: 'rgba(0,0,0,0.55)',
    shadowLoSm: 'rgba(0,0,0,0.5)',
    shadowLoInset: 'rgba(0,0,0,0.45)',
    shadowHiInset: 'rgba(35,49,82,0.4)',
    surface: '#111A2E',
    input: '#0E1626',
  },
};

function applyTheme(theme) {
  const colors = THEME_TOKENS[theme];
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty('--page-bg', colors.bg);
  root.style.setProperty('--surface', colors.surface);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--text', colors.heading);
  root.style.setProperty('--text-muted', colors.muted);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--accent', colors.gold);
  root.style.setProperty('--danger', colors.danger);
  root.style.setProperty('--danger-bg', colors.dangerBg);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('billing-dashboard-theme');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('billing-dashboard-theme', theme);
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    colors: THEME_TOKENS[theme],
    setTheme,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
