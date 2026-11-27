/**
 * GeM Official Portal Theme & Bilingual Engine
 * Provides authentic Government e-Marketplace visual styling:
 * - Ashoka Navy (#0B4F71), National Saffron (#F58220), Emerald (#0B7A3B)
 * - Dark Mode / Light Mode toggle
 * - Accessible Font Sizing: S (0.9x), M (1.0x), L (1.15x)
 * - Optional English / हिन्दी (Hindi) UI language toggle persisted on device
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ThemeColors,
  DESIGN_TOKENS,
  LIGHT_THEME,
  DARK_THEME,
} from './designTokens';
import {
  LanguageAndGlossaryService,
  type AppLanguage,
  type UiTextKey,
} from '../services/LanguageAndGlossaryService';

export type { ThemeColors, AppLanguage, UiTextKey };
export { DESIGN_TOKENS, LIGHT_THEME, DARK_THEME };

export type ColorMode = 'light' | 'dark';
export type FontSizeScale = 'small' | 'medium' | 'large';

interface ThemeContextType {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  fontScale: FontSizeScale;
  setFontScale: (scale: FontSizeScale) => void;
  fontMultiplier: number;
  colors: ThemeColors;
  isDark: boolean;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: UiTextKey) => string;
}

const ThemeContext = createContext<ThemeContextType>({
  colorMode: 'light',
  toggleColorMode: () => {},
  fontScale: 'medium',
  setFontScale: () => {},
  fontMultiplier: 1.0,
  colors: LIGHT_THEME,
  isDark: false,
  language: 'en',
  setLanguage: () => {},
  t: (key) => LanguageAndGlossaryService.translate('en', key),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [fontScale, setFontScale] = useState<FontSizeScale>('medium');
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    let active = true;
    LanguageAndGlossaryService.loadLanguage()
      .then((saved) => {
        if (active) setLanguageState(saved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    void LanguageAndGlossaryService.saveLanguage(next);
  }, []);

  const t = useCallback(
    (key: UiTextKey) => LanguageAndGlossaryService.translate(language, key),
    [language]
  );

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
      language,
      setLanguage,
      t,
    }),
    [colorMode, toggleColorMode, fontScale, fontMultiplier, colors, language, setLanguage, t]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
