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
  // GeM's public portal is dense, square-edged, and information-first.
  cardRadius: 8,
  inputRadius: 4,
  buttonRadius: 4,
  chipRadius: 4,
  borderWidth: 1,
  headerHeight: 54,
  bottomNavHeight: 60,
  touchTargetMin: 44,
  unit: 4,
  pagePaddingMobile: 14,
};

export const LIGHT_THEME: ThemeColors = {
  primary: '#0B4F71',          // GeM-style government blue
  primaryDark: '#063D59',
  primaryLight: '#4F92B5',
  primaryTint: '#EAF2F6',
  saffron: '#F58220',           // National Saffron Accent
  emerald: '#0B7A3B',           // Government green
  crimson: '#B3261E',           // Accessible alert red
  background: '#F3F5F7',        // Neutral portal canvas
  surface: '#FFFFFF',
  surfaceSubtle: '#F7F8F9',
  surfaceElevated: '#FFFFFF',
  border: '#CDD5DC',
  borderSubtle: '#E2E6EA',
  textPrimary: '#24313D',       // Portal charcoal
  textSecondary: '#596773',
  textMuted: '#7B8791',
  textInverse: '#FFFFFF',
  cardShadow: 'rgba(15, 52, 72, 0.08)',
  success: '#0B7A3B',
  successTint: '#E8F4EC',
  warning: '#9A5B00',
  warningTint: '#FFF4DF',
  danger: '#B3261E',
  dangerTint: '#FBEAE8',
  violet: '#49627A',
  violetTint: '#EDF1F4',
  orange: '#B85C00',
  orangeTint: '#FFF0DF',
};

export const DARK_THEME: ThemeColors = {
  primary: '#6FB0D0',
  primaryDark: '#4F92B5',
  primaryLight: '#A9D1E3',
  primaryTint: 'rgba(111, 176, 208, 0.16)',
  saffron: '#F6A24A',
  emerald: '#65C58A',
  crimson: '#F28B82',
  background: '#172127',
  surface: '#202D35',
  surfaceSubtle: '#263740',
  surfaceElevated: '#2D414C',
  border: '#40535E',
  borderSubtle: '#344750',
  textPrimary: '#F2F5F7',
  textSecondary: '#C8D1D6',
  textMuted: '#9AAAB3',
  textInverse: '#172127',
  cardShadow: 'rgba(0, 0, 0, 0.28)',
  success: '#65C58A',
  successTint: 'rgba(101, 197, 138, 0.16)',
  warning: '#F6C56C',
  warningTint: 'rgba(246, 197, 108, 0.16)',
  danger: '#F28B82',
  dangerTint: 'rgba(242, 139, 130, 0.16)',
  violet: '#A9C2D4',
  violetTint: 'rgba(169, 194, 212, 0.14)',
  orange: '#F6A24A',
  orangeTint: 'rgba(246, 162, 74, 0.16)',
};
