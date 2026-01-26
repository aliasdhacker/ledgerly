// DriftMoney Hooks Exports

// Core hooks
export { useAuth } from './useAuth';
export { useSync } from './useSync';
export {
  useDevice,
  getDeviceInfo,
  isTablet,
  BREAKPOINTS,
  type DeviceInfo,
  type DeviceType,
  type Orientation,
  type ScreenSize,
} from './useDevice';

// Re-export all v2 hooks
export * from './v2';
