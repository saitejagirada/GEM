/**
 * GeM companion design system
 * Provides a restrained Government e-Marketplace-inspired visual language:
 * - Ashoka Navy (#0B3B60), National Saffron (#FF9933), Emerald (#138808)
 * - Dark Mode / Light Mode toggle (matching gem.gov.in top-nav)
 * - Accessible Font Sizing: A- (0.9x), A (1.0x), A+ (1.15x)
 */

import React, { createContext, useContext, useState, useMemo } from 'react';

export type ColorMode = 'light' | 'dark';
export type FontSizeScale = 'small' | 'medium' | 'large';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  saffron: string;
  emerald: string;
  crimson: string;
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  cardShadow: string;
}

/** Shared layout tokens used by the app shell and screen-level surfaces. */
export const DESIGN_TOKENS = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  controlHeight: { small: 36, medium: 44, large: 52 },
  font: { caption: 10, body: 13, bodyLarge: 15, title: 20, display: 28 },
} as const;

export const LIGHT_THEME: ThemeColors = {
  primary: '#0B3B60',       // Official GeM Ashoka Navy Blue
  primaryDark: '#07243B',
  primaryLight: '#1A5A8E',
  saffron: '#FF9933',        // National Saffron Accent
  emerald: '#138808',        // National Emerald Green
  crimson: '#DC2626',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  cardShadow: 'rgba(11, 59, 96, 0.08)',
};

export const DARK_THEME: ThemeColors = {
  primary: '#38BDF8',       // High-contrast Cyan / Sky Blue in dark mode
  primaryDark: '#0284C7',
  primaryLight: '#7DD3FC',
  saffron: '#FBBF24',
  emerald: '#4ADE80',
  crimson: '#F87171',
  background: '#0B132B',     // Deep space midnight
  surface: '#1C2541',        // Elevated slate blue
  surfaceSubtle: '#222F55',
  surfaceElevated: '#2A3A69',
  border: '#334155',
  borderSubtle: '#475569',
  textPrimary: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  textInverse: '#0B132B',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
};

interface ThemeContextType {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  fontScale: FontSizeScale;
  setFontScale: (scale: FontSizeScale) => void;
  fontMultiplier: number;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  colorMode: 'light',
  toggleColorMode: () => {},
  fontScale: 'medium',
  setFontScale: () => {},
  fontMultiplier: 1.0,
  colors: LIGHT_THEME,
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [fontScale, setFontScale] = useState<FontSizeScale>('medium');

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const fontMultiplier = useMemo(() => {
    switch (fontScale) {
      case 'small':
        return 0.9;
      case 'large':
        return 1.15;
      case 'medium':
      default:
        return 1.0;
    }
  }, [fontScale]);

  const colors = useMemo(() => (colorMode === 'dark' ? DARK_THEME : LIGHT_THEME), [colorMode]);

  const value = useMemo(
    () => ({
      colorMode,
      toggleColorMode,
      fontScale,
      setFontScale,
      fontMultiplier,
      colors,
      isDark: colorMode === 'dark',
    }),
    [colorMode, fontScale, fontMultiplier, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
