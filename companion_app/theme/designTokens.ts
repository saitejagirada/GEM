export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryTint: string;
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
  success: string;
  successTint: string;
  warning: string;
  warningTint: string;
  danger: string;
  dangerTint: string;
  violet: string;
  violetTint: string;
  orange: string;
  orangeTint: string;
}

export const DESIGN_TOKENS = {
  cardRadius: 16,
  inputRadius: 10,
  buttonRadius: 10,
  chipRadius: 999,
  borderWidth: 1,
  headerHeight: 56,
  bottomNavHeight: 64,
  touchTargetMin: 44,
  unit: 4,
  pagePaddingMobile: 16,
};

export const LIGHT_THEME: ThemeColors = {
  primary: '#174EA6',          // NotebookLM-inspired deep crisp blue
  primaryDark: '#123B70',
  primaryLight: '#38BDF8',
  primaryTint: '#E8F1FF',
  saffron: '#FF9933',           // National Saffron Accent
  emerald: '#16834A',           // Success green
  crimson: '#C62828',           // Danger crimson
  background: '#F7F9FC',        // Clean bright light grey-blue canvas
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5FB',
  surfaceElevated: '#FFFFFF',
  border: '#DCE5F0',
  borderSubtle: '#E2E8F0',
  textPrimary: '#14233B',       // Slate navy
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  cardShadow: 'rgba(23, 78, 166, 0.06)',
  success: '#16834A',
  successTint: '#E7F8EE',
  warning: '#B96A0B',
  warningTint: '#FFF4DB',
  danger: '#C62828',
  dangerTint: '#FDECEC',
  violet: '#7048C8',
  violetTint: '#F0EAFE',
  orange: '#F28C28',
  orangeTint: '#FFF0DE',
};

export const DARK_THEME: ThemeColors = {
  primary: '#38BDF8',          // High-contrast Cyan in dark mode
  primaryDark: '#0284C7',
  primaryLight: '#7DD3FC',
  primaryTint: 'rgba(56, 189, 248, 0.15)',
  saffron: '#FBBF24',
  emerald: '#4ADE80',
  crimson: '#F87171',
  background: '#0B132B',        // Deep space midnight
  surface: '#1C2541',           // Elevated slate blue
  surfaceSubtle: '#222F55',
  surfaceElevated: '#2A3A69',
  border: '#334155',
  borderSubtle: '#475569',
  textPrimary: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  textInverse: '#0B132B',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
  success: '#4ADE80',
  successTint: 'rgba(74, 222, 128, 0.15)',
  warning: '#FBBF24',
  warningTint: 'rgba(251, 191, 36, 0.15)',
  danger: '#F87171',
  dangerTint: 'rgba(248, 113, 113, 0.15)',
  violet: '#A78BFA',
  violetTint: 'rgba(167, 139, 250, 0.15)',
  orange: '#FB923C',
  orangeTint: 'rgba(251, 146, 60, 0.15)',
};
