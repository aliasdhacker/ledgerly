// Device detection and responsive layout hook
// Provides device type, orientation, and screen size information

import { useState, useEffect, useCallback } from 'react';
import { Dimensions, ScaledSize, Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export type DeviceType = 'phone' | 'tablet';
export type Orientation = 'portrait' | 'landscape';
export type ScreenSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface DeviceInfo {
  // Device classification
  deviceType: DeviceType;
  isTablet: boolean;
  isPhone: boolean;

  // Orientation
  orientation: Orientation;
  isPortrait: boolean;
  isLandscape: boolean;

  // Screen dimensions
  width: number;
  height: number;
  screenSize: ScreenSize;

  // Platform
  isIOS: boolean;
  isAndroid: boolean;

  // Convenience helpers
  columns: number; // Suggested column count for grids
  padding: number; // Suggested padding
  fontSize: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

// Breakpoints (based on shortest dimension for consistency)
export const BREAKPOINTS = {
  // Phone breakpoints
  SMALL_PHONE: 320,   // iPhone SE, small Android
  MEDIUM_PHONE: 375,  // iPhone 12 mini, most phones
  LARGE_PHONE: 414,   // iPhone Plus/Max

  // Tablet breakpoints (shortest dimension)
  SMALL_TABLET: 600,  // iPad mini portrait
  MEDIUM_TABLET: 768, // iPad portrait
  LARGE_TABLET: 1024, // iPad Pro portrait / iPad landscape

  // General tablet threshold
  TABLET_MIN_WIDTH: 600,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function getDeviceType(width: number, height: number): DeviceType {
  const shortestDimension = Math.min(width, height);
  return shortestDimension >= BREAKPOINTS.TABLET_MIN_WIDTH ? 'tablet' : 'phone';
}

function getOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

function getScreenSize(width: number, height: number): ScreenSize {
  const shortestDimension = Math.min(width, height);

  if (shortestDimension < BREAKPOINTS.MEDIUM_PHONE) return 'small';
  if (shortestDimension < BREAKPOINTS.TABLET_MIN_WIDTH) return 'medium';
  if (shortestDimension < BREAKPOINTS.LARGE_TABLET) return 'large';
  return 'xlarge';
}

function getSuggestedColumns(deviceType: DeviceType, orientation: Orientation, width: number): number {
  if (deviceType === 'phone') {
    return orientation === 'landscape' ? 2 : 1;
  }

  // Tablet
  if (orientation === 'portrait') {
    return width >= BREAKPOINTS.LARGE_TABLET ? 3 : 2;
  }

  // Tablet landscape
  return width >= 1200 ? 4 : 3;
}

function getSuggestedPadding(screenSize: ScreenSize): number {
  switch (screenSize) {
    case 'small': return 12;
    case 'medium': return 16;
    case 'large': return 24;
    case 'xlarge': return 32;
  }
}

function getFontSizes(screenSize: ScreenSize) {
  const baseMultiplier = screenSize === 'xlarge' ? 1.2 : screenSize === 'large' ? 1.1 : 1;

  return {
    small: Math.round(12 * baseMultiplier),
    medium: Math.round(14 * baseMultiplier),
    large: Math.round(18 * baseMultiplier),
    xlarge: Math.round(24 * baseMultiplier),
  };
}

function createDeviceInfo(dimensions: ScaledSize): DeviceInfo {
  const { width, height } = dimensions;
  const deviceType = getDeviceType(width, height);
  const orientation = getOrientation(width, height);
  const screenSize = getScreenSize(width, height);

  return {
    deviceType,
    isTablet: deviceType === 'tablet',
    isPhone: deviceType === 'phone',

    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',

    width,
    height,
    screenSize,

    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',

    columns: getSuggestedColumns(deviceType, orientation, width),
    padding: getSuggestedPadding(screenSize),
    fontSize: getFontSizes(screenSize),
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that provides device information and responds to dimension changes.
 * Useful for creating responsive layouts that adapt to phones vs tablets.
 *
 * @example
 * const { isTablet, columns, padding } = useDevice();
 *
 * return (
 *   <View style={{ padding }}>
 *     <FlatList
 *       numColumns={columns}
 *       // ...
 *     />
 *   </View>
 * );
 */
export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() =>
    createDeviceInfo(Dimensions.get('window'))
  );

  const handleDimensionChange = useCallback(({ window }: { window: ScaledSize }) => {
    setDeviceInfo(createDeviceInfo(window));
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', handleDimensionChange);
    return () => subscription.remove();
  }, [handleDimensionChange]);

  return deviceInfo;
}

// ============================================================================
// Static Utilities (for use outside components)
// ============================================================================

/**
 * Get current device info without a hook (snapshot, doesn't update)
 */
export function getDeviceInfo(): DeviceInfo {
  return createDeviceInfo(Dimensions.get('window'));
}

/**
 * Check if current device is a tablet (static check)
 */
export function isTablet(): boolean {
  const { width, height } = Dimensions.get('window');
  return getDeviceType(width, height) === 'tablet';
}

export default useDevice;
