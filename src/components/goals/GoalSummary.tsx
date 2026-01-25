// Goal summary component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import { ProgressBar } from '../common/ProgressBar';
import type { GoalSummary as GoalSummaryType } from '../../services/v2/GoalService';

interface GoalSummaryProps {
  summary: GoalSummaryType;
}

export const GoalSummary: React.FC<GoalSummaryProps> = ({ summary }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="flag" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Savings Goals</Text>
          <Text style={styles.subtitle}>
            {summary.activeGoalsCount} active
            {summary.completedGoalsCount > 0 && ` · ${summary.completedGoalsCount} completed`}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.amountRow}>
          <MoneyText amount={summary.totalSavedAmount} size="large" />
          <Text style={styles.ofText}>
            of <MoneyText amount={summary.totalTargetAmount} size="medium" style={styles.targetAmount} />
          </Text>
        </View>
        <ProgressBar
          progress={summary.overallPercentComplete}
          height={8}
          color={COLORS.primary}
          showLabel
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MoneyText
            amount={summary.totalTargetAmount - summary.totalSavedAmount}
            size="small"
          />
          <Text style={styles.statLabel}>To go</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.overallPercentComplete}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.title3,
  },
  subtitle: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: Spacing.lg,
  },
  amountRow: {
    marginBottom: Spacing.sm,
  },
  ofText: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  targetAmount: {
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  statValue: {
    ...Typography.bodyBold,
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
});

export default GoalSummary;
