// Responsive utilities for adaptive layouts
// Works with useDevice hook to create responsive styles

import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { DeviceInfo, ScreenSize, DeviceType, Orientation } from '../hooks/useDevice';

// ============================================================================
// Types
// ============================================================================

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export interface ResponsiveValue<T> {
  phone?: T;
  tablet?: T;
  portrait?: T;
  landscape?: T;
  small?: T;
  medium?: T;
  large?: T;
  xlarge?: T;
  default: T;
}

// ============================================================================
// Responsive Value Resolver
// ============================================================================

/**
 * Resolves a responsive value based on device info.
 * More specific values (e.g., 'tablet') override less specific ones (e.g., 'default').
 *
 * @example
 * const padding = responsive(device, {
 *   default: 16,
 *   tablet: 32,
 *   landscape: 24,
 * });
 */
export function responsive<T>(device: DeviceInfo, values: ResponsiveValue<T>): T {
  // Priority: screenSize > orientation > deviceType > default
  const { screenSize, orientation, deviceType } = device;

  // Check screen size specific values
  if (values[screenSize] !== undefined) {
    return values[screenSize]!;
  }

  // Check orientation specific values
  if (values[orientation] !== undefined) {
    return values[orientation]!;
  }

  // Check device type specific values
  if (values[deviceType] !== undefined) {
    return values[deviceType]!;
  }

  return values.default;
}

/**
 * Creates responsive styles based on device info.
 *
 * @example
 * const styles = responsiveStyles(device, {
 *   container: {
 *     default: { padding: 16 },
 *     tablet: { padding: 32 },
 *   },
 *   title: {
 *     default: { fontSize: 18 },
 *     tablet: { fontSize: 24 },
 *   },
 * });
 */
export function responsiveStyles<T extends { [key: string]: ResponsiveValue<ViewStyle | TextStyle | ImageStyle> }>(
  device: DeviceInfo,
  styleDefinitions: T
): { [K in keyof T]: ViewStyle | TextStyle | ImageStyle } {
  const result: any = {};

  for (const key of Object.keys(styleDefinitions)) {
    result[key] = responsive(device, styleDefinitions[key]);
  }

  return result;
}

// ============================================================================
// Spacing Utilities
// ============================================================================

/**
 * Get responsive spacing value
 */
export function spacing(device: DeviceInfo, base: number): number {
  const multiplier = device.isTablet ? 1.5 : 1;
  return Math.round(base * multiplier);
}

/**
 * Common spacing values
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Get responsive spacing object
 */
export function getSpacing(device: DeviceInfo) {
  return {
    xs: spacing(device, SPACING.xs),
    sm: spacing(device, SPACING.sm),
    md: spacing(device, SPACING.md),
    lg: spacing(device, SPACING.lg),
    xl: spacing(device, SPACING.xl),
    xxl: spacing(device, SPACING.xxl),
  };
}

// ============================================================================
// Layout Utilities
// ============================================================================

/**
 * Calculate width for grid items
 */
export function gridItemWidth(
  device: DeviceInfo,
  columns: number,
  gap: number = 16
): number {
  const totalGap = gap * (columns - 1);
  const availableWidth = device.width - (device.padding * 2) - totalGap;
  return Math.floor(availableWidth / columns);
}

/**
 * Get responsive container padding
 */
export function containerPadding(device: DeviceInfo): number {
  return device.padding;
}

/**
 * Calculate maximum content width (useful for centering content on large screens)
 */
export function maxContentWidth(device: DeviceInfo, max: number = 800): number {
  if (device.isPhone) return device.width;
  return Math.min(device.width - (device.padding * 2), max);
}

// ============================================================================
// Typography Utilities
// ============================================================================

/**
 * Get responsive font size
 */
export function fontSize(device: DeviceInfo, size: 'small' | 'medium' | 'large' | 'xlarge'): number {
  return device.fontSize[size];
}

/**
 * Common text styles
 */
export function getTextStyles(device: DeviceInfo) {
  return StyleSheet.create({
    caption: {
      fontSize: device.fontSize.small,
      lineHeight: device.fontSize.small * 1.4,
    },
    body: {
      fontSize: device.fontSize.medium,
      lineHeight: device.fontSize.medium * 1.5,
    },
    title: {
      fontSize: device.fontSize.large,
      fontWeight: '600' as const,
      lineHeight: device.fontSize.large * 1.3,
    },
    heading: {
      fontSize: device.fontSize.xlarge,
      fontWeight: '700' as const,
      lineHeight: device.fontSize.xlarge * 1.2,
    },
  });
}

// ============================================================================
// Master-Detail Layout Helpers
// ============================================================================

export interface MasterDetailLayout {
  isSideBySide: boolean;
  masterWidth: number | string;
  detailWidth: number | string;
}

/**
 * Calculate master-detail layout dimensions
 * Returns side-by-side layout for tablets in landscape
 */
export function getMasterDetailLayout(device: DeviceInfo): MasterDetailLayout {
  const isSideBySide = device.isTablet && device.isLandscape;

  if (!isSideBySide) {
    return {
      isSideBySide: false,
      masterWidth: '100%',
      detailWidth: '100%',
    };
  }

  // Tablet landscape: side-by-side
  const masterWidth = Math.round(device.width * 0.35);
  const detailWidth = device.width - masterWidth;

  return {
    isSideBySide: true,
    masterWidth,
    detailWidth,
  };
}

// ============================================================================
// Hit Slop / Touch Target Utilities
// ============================================================================

/**
 * Get minimum touch target size (44pt on iOS, 48dp on Android)
 */
export function minTouchTarget(device: DeviceInfo): number {
  const base = device.isIOS ? 44 : 48;
  return device.isTablet ? Math.round(base * 1.2) : base;
}

/**
 * Get hit slop for small touch targets
 */
export function getHitSlop(device: DeviceInfo, currentSize: number = 24) {
  const minSize = minTouchTarget(device);
  const padding = Math.max(0, (minSize - currentSize) / 2);

  return {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding,
  };
}
