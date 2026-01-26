// Haptic feedback utilities for DriftMoney

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Trigger light haptic feedback for selections and toggles
 */
export const lightHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Trigger medium haptic feedback for button presses
 */
export const mediumHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Trigger heavy haptic feedback for significant actions
 */
export const heavyHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/**
 * Trigger success haptic feedback
 */
export const successHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Trigger warning haptic feedback
 */
export const warningHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/**
 * Trigger error haptic feedback
 */
export const errorHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Trigger selection changed haptic feedback
 */
export const selectionHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.selectionAsync();
  }
};
