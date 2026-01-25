// Badge component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, BorderRadius, Spacing } from '../../constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: COLORS.gray200, text: COLORS.gray700 },
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#DBEAFE', text: '#1E40AF' },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'small',
  style,
}) => {
  const colors = variantColors[variant];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        isSmall ? styles.small : styles.medium,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          isSmall ? styles.textSmall : styles.textMedium,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 13,
  },
});

export default Badge;
