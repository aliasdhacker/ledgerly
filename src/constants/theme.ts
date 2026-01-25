// Driftmoney Design System
// Consistent colors, typography, and spacing across the app

export const Colors = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#E6F4FE',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#5856D6',

  // Neutrals
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',

  // Text
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E5EA',
  borderLight: '#F2F2F7',

  // Transaction Types
  income: '#007AFF',
  expense: '#FF3B30',
  billPaid: '#FF9500',
  credit: '#34C759',
};

export const Typography = {
  // Headers
  largeTitle: {
    fontSize: 34,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  title1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  title2: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },

  // Body
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    color: Colors.textPrimary,
  },
  bodyBold: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.textPrimary,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },

  // Currency
  currencyLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  currencyMedium: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  currencySmall: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
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

// Common component styles
export const CommonStyles = {
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenPadding: {
    padding: Spacing.xl,
  },
};
