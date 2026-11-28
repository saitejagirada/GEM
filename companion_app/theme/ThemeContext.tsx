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

export const DEFAULT_FONT_SCALE: FontSizeScale = 'medium';

export function resolveFontScale(raw?: string | null): FontSizeScale {
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw;
  return DEFAULT_FONT_SCALE;
}

export function getFontMultiplier(scale: FontSizeScale): number {
  switch (scale) {
    case 'small':
      return 0.9;
    case 'large':
      return 1.15;
    case 'medium':
    default:
      return 1.0;
  }
}

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

const COLOR_MODE_STORAGE_KEY = '@gem-mobile-companion/ui-color-mode-v1';
const FONT_SCALE_STORAGE_KEY = '@gem-mobile-companion/ui-font-scale-v2';

async function loadThemePrefs(): Promise<{ colorMode?: ColorMode; fontScale?: FontSizeScale }> {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const storage = mod.default || mod;
    const [savedMode, savedScale] = await Promise.all([
      storage.getItem(COLOR_MODE_STORAGE_KEY),
      storage.getItem(FONT_SCALE_STORAGE_KEY),
    ]);
    return {
      colorMode: savedMode === 'dark' || savedMode === 'light' ? savedMode : undefined,
      fontScale: savedScale ? resolveFontScale(savedScale) : DEFAULT_FONT_SCALE,
    };
  } catch {
    return { fontScale: DEFAULT_FONT_SCALE };
  }
}

async function saveThemePref(key: string, value: string): Promise<void> {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const storage = mod.default || mod;
    await storage.setItem(key, value);
  } catch {
    // Non-fatal in non-native environments
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [fontScale, setFontScaleState] = useState<FontSizeScale>('medium');
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    let active = true;
    LanguageAndGlossaryService.loadLanguage()
      .then((saved) => {
        if (active) setLanguageState(saved);
      })
      .catch(() => undefined);
    loadThemePrefs()
      .then((prefs) => {
        if (!active) return;
        if (prefs.colorMode) setColorMode(prefs.colorMode);
        if (prefs.fontScale) setFontScaleState(prefs.fontScale);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => {
      const next: ColorMode = prev === 'light' ? 'dark' : 'light';
      void saveThemePref(COLOR_MODE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setFontScale = useCallback((next: FontSizeScale) => {
    setFontScaleState(next);
    void saveThemePref(FONT_SCALE_STORAGE_KEY, next);
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    void LanguageAndGlossaryService.saveLanguage(next);
  }, []);

  const t = useCallback(
    (key: UiTextKey) => LanguageAndGlossaryService.translate(language, key),
    [language]
  );

  const fontMultiplier = useMemo(() => getFontMultiplier(fontScale), [fontScale]);

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
