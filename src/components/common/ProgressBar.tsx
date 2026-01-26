// Progress bar component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, BorderRadius, Spacing } from '../../constants';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'right';
  overBudgetColor?: string;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color = COLORS.primary,
  backgroundColor = COLORS.gray200,
  showLabel = false,
  labelPosition = 'right',
  overBudgetColor = COLORS.error,
  style,
}) => {
  // Guard against NaN, undefined, or non-finite values
  const safeProgress = isNaN(progress) || !isFinite(progress) ? 0 : progress;
  const clampedProgress = Math.min(100, Math.max(0, safeProgress));
  const isOverBudget = safeProgress > 100;
  const displayProgress = isOverBudget ? 100 : clampedProgress;
  const fillColor = isOverBudget ? overBudgetColor : color;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height, backgroundColor }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${displayProgress}%`,
              backgroundColor: fillColor,
              height,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text
          style={[
            styles.label,
            labelPosition === 'inside' && styles.labelInside,
            isOverBudget && { color: overBudgetColor },
          ]}
        >
          {Math.round(safeProgress)}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: BorderRadius.full,
  },
  label: {
    marginLeft: Spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  labelInside: {
    position: 'absolute',
    right: Spacing.sm,
  },
});

export default ProgressBar;
