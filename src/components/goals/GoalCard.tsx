// Goal card component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography, GOAL_COLORS } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import { ProgressBar } from '../common/ProgressBar';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils';
import type { GoalProgress } from '../../types/goal';

interface GoalCardProps {
  progress: GoalProgress;
  onPress?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ progress, onPress }) => {
  const { goal, percentComplete, remainingAmount, onTrack, requiredMonthlyAmount } = progress;

  const goalColor = goal.color || GOAL_COLORS[0];
  const goalIcon = goal.icon || 'flag';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: goalColor + '20' }]}>
          <Ionicons name={goalIcon as any} size={24} color={goalColor} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {goal.name}
          </Text>
          {goal.targetDate && (
            <Text style={styles.targetDate}>
              Target: {formatDate(goal.targetDate, 'medium')}
            </Text>
          )}
        </View>
        {goal.isCompleted ? (
          <Badge label="Complete" variant="success" />
        ) : !onTrack ? (
          <Badge label="Behind" variant="warning" />
        ) : null}
      </View>

      <View style={styles.amountSection}>
        <MoneyText amount={goal.currentAmount} size="large" />
        <Text style={styles.ofText}>
          of <MoneyText amount={goal.targetAmount} size="medium" style={styles.targetAmount} />
        </Text>
      </View>

      <ProgressBar
        progress={percentComplete}
        height={10}
        color={goalColor}
        showLabel
        style={styles.progressBar}
      />

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Remaining</Text>
          <MoneyText amount={remainingAmount} size="small" />
        </View>
        {requiredMonthlyAmount !== undefined && requiredMonthlyAmount > 0 && !goal.isCompleted && (
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Monthly needed</Text>
            <MoneyText amount={requiredMonthlyAmount} size="small" />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    ...Typography.title3,
    marginBottom: 2,
  },
  targetDate: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  amountSection: {
    marginBottom: Spacing.md,
  },
  ofText: {
    ...Typography.subhead,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  targetAmount: {
    color: COLORS.textSecondary,
  },
  progressBar: {
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerItem: {},
  footerLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
});

export default GoalCard;
