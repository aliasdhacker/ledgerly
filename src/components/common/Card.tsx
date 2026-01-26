// Card component for DriftMoney

import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { COLORS, BorderRadius, Spacing, Shadows } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'medium',
  accessibilityLabel,
  accessibilityHint,
}) => {
  const variantStyle = styles[variant];
  const paddingStyle = paddingStyles[padding];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [
          styles.base,
          variantStyle,
          paddingStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.base, variantStyle, paddingStyle, style]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.surface,
  },
  default: {
    ...Shadows.small,
  },
  elevated: {
    ...Shadows.medium,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});

const paddingStyles = StyleSheet.create({
  none: {
    padding: 0,
  },
  small: {
    padding: Spacing.sm,
  },
  medium: {
    padding: Spacing.lg,
  },
  large: {
    padding: Spacing.xl,
  },
});

export default Card;
