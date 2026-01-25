// DriftMoney Design System
// Consolidated colors, typography, and spacing

export const COLORS = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0055B3',

  // Status
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',

  // Grays
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',

  // Semantic (iOS-style naming for compatibility)
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  text: '#000000',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  border: '#E5E5EA',
  borderLight: '#F2F2F7',

  // Money
  income: '#34C759',
  expense: '#FF3B30',
  transfer: '#78909C',
  debt: '#FF6B6B',
  credit: '#34C759',
  billPaid: '#FF9500',

  // Account types
  bank: '#4CAF50',
  creditAccount: '#FF9500',
} as const;

export const Typography = {
  // Headers
  largeTitle: {
    fontSize: 34,
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  title1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  title2: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: COLORS.textPrimary,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },

  // Body
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    color: COLORS.textPrimary,
  },
  bodyBold: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: COLORS.textPrimary,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: COLORS.textSecondary,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.textSecondary,
  },

  // Currency
  currencyLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  currencyMedium: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  currencySmall: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const CommonStyles = {
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: Spacing.lg,
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenPadding: {
    padding: Spacing.xl,
  },
};

// Chart color palette
export const CHART_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#DDA0DD',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8B500',
  '#58D68D',
];

// Goal colors
export const GOAL_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#DDA0DD',
  '#F7DC6F',
  '#5F27CD',
  '#FF9FF3',
];

// Legacy export for backward compatibility during migration
export const Colors = COLORS;
