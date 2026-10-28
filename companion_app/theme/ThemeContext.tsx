/**
 * GeM Official Portal Theme Engine
 * Provides authentic Government e-Marketplace visual styling:
 * - Ashoka Navy (#0B3B60), National Saffron (#FF9933), Emerald (#138808)
 * - Dark Mode / Light Mode toggle (matching gem.gov.in top-nav)
 * - Accessible Font Sizing: A- (0.9x), A (1.0x), A+ (1.15x)
 */

import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  ThemeColors,
  DESIGN_TOKENS,
  LIGHT_THEME,
  DARK_THEME,
} from './designTokens';

export type { ThemeColors };
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
