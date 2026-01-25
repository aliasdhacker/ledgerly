// Budget card component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import { ProgressBar } from '../common/ProgressBar';
import type { BudgetProgress } from '../../types/budget';

interface BudgetCardProps {
  progress: BudgetProgress;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  onPress?: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  progress,
  categoryName,
  categoryIcon = 'pie-chart',
  categoryColor = COLORS.primary,
  onPress,
}) => {
  const { budget, spent, remaining, percentUsed, isOverBudget } = progress;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={categoryIcon as any} size={20} color={categoryColor} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {categoryName || budget.name}
          </Text>
          <Text style={styles.period}>
            {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}
          </Text>
        </View>
        {isOverBudget && (
          <Ionicons name="warning" size={20} color={COLORS.error} />
        )}
      </View>

      <View style={styles.progressSection}>
        <ProgressBar
          progress={percentUsed}
          height={8}
          color={categoryColor}
          showLabel
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Spent</Text>
          <MoneyText amount={spent} size="small" />
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Budget</Text>
          <MoneyText amount={budget.amount} size="small" />
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>
            {isOverBudget ? 'Over' : 'Left'}
          </Text>
          <MoneyText
            amount={Math.abs(remaining)}
            size="small"
            style={{ color: isOverBudget ? COLORS.error : COLORS.success }}
          />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    ...Typography.bodyBold,
  },
  period: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerItem: {
    alignItems: 'center',
  },
  footerLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
});

export default BudgetCard;
