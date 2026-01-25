// Budget summary component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import { ProgressBar } from '../common/ProgressBar';
import type { BudgetSummary as BudgetSummaryType } from '../../services/v2/BudgetService';

interface BudgetSummaryProps {
  summary: BudgetSummaryType;
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({ summary }) => {
  const percentUsed = summary.totalBudgeted > 0
    ? Math.round((summary.totalSpent / summary.totalBudgeted) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget Overview</Text>
        {summary.overBudgetCount > 0 && (
          <View style={styles.warningBadge}>
            <Ionicons name="warning" size={12} color={COLORS.error} />
            <Text style={styles.warningText}>
              {summary.overBudgetCount} over budget
            </Text>
          </View>
        )}
      </View>

      <View style={styles.amountRow}>
        <MoneyText amount={summary.totalSpent} size="xlarge" />
        <Text style={styles.ofText}>
          of <MoneyText amount={summary.totalBudgeted} size="medium" style={styles.budgetedAmount} />
        </Text>
      </View>

      <ProgressBar
        progress={percentUsed}
        height={10}
        color={percentUsed > 100 ? COLORS.error : percentUsed > 80 ? COLORS.warning : COLORS.success}
        style={styles.progressBar}
      />

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerValue}>
            {summary.totalRemaining >= 0 ? (
              <MoneyText amount={summary.totalRemaining} size="small" colorize />
            ) : (
              <MoneyText amount={Math.abs(summary.totalRemaining)} size="small" style={{ color: COLORS.error }} />
            )}
          </Text>
          <Text style={styles.footerLabel}>
            {summary.totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
          </Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerValue}>{percentUsed}%</Text>
          <Text style={styles.footerLabel}>Used</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.title3,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  warningText: {
    ...Typography.caption,
    color: COLORS.error,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  amountRow: {
    marginBottom: Spacing.md,
  },
  ofText: {
    ...Typography.subhead,
    color: COLORS.textSecondary,
    marginTop: Spacing.xs,
  },
  budgetedAmount: {
    color: COLORS.textSecondary,
  },
  progressBar: {
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  footerValue: {
    ...Typography.bodyBold,
    marginBottom: 2,
  },
  footerLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
});

export default BudgetSummary;
