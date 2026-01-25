// Spending summary component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import type { CashFlowSummary } from '../../services/v2/TrendService';

interface SpendingSummaryProps {
  summary: CashFlowSummary;
  comparisonPercent?: number; // vs last period
}

export const SpendingSummary: React.FC<SpendingSummaryProps> = ({
  summary,
  comparisonPercent,
}) => {
  const hasComparison = comparisonPercent !== undefined;
  const isUp = comparisonPercent !== undefined && comparisonPercent > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>This Month</Text>
        {hasComparison && (
          <View style={[styles.comparisonBadge, isUp ? styles.upBadge : styles.downBadge]}>
            <Ionicons
              name={isUp ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={isUp ? COLORS.error : COLORS.success}
            />
            <Text style={[styles.comparisonText, isUp ? styles.upText : styles.downText]}>
              {Math.abs(comparisonPercent)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mainStats}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Spent</Text>
          <MoneyText amount={summary.totalExpenses} size="xlarge" />
        </View>
      </View>

      <View style={styles.secondaryStats}>
        <View style={styles.secondaryStat}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.income + '20' }]}>
            <Ionicons name="arrow-down" size={14} color={COLORS.income} />
          </View>
          <View>
            <Text style={styles.secondaryLabel}>Income</Text>
            <MoneyText amount={summary.totalIncome} size="small" />
          </View>
        </View>

        <View style={styles.secondaryStat}>
          <View style={[styles.statIcon, { backgroundColor: summary.netCashFlow >= 0 ? COLORS.success + '20' : COLORS.error + '20' }]}>
            <Ionicons
              name={summary.netCashFlow >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={summary.netCashFlow >= 0 ? COLORS.success : COLORS.error}
            />
          </View>
          <View>
            <Text style={styles.secondaryLabel}>Net</Text>
            <MoneyText
              amount={summary.netCashFlow}
              size="small"
              colorize
              showSign
            />
          </View>
        </View>

        <View style={styles.secondaryStat}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.gray200 }]}>
            <Ionicons name="calendar" size={14} color={COLORS.gray600} />
          </View>
          <View>
            <Text style={styles.secondaryLabel}>Daily avg</Text>
            <MoneyText amount={summary.averageDailySpending} size="small" />
          </View>
        </View>
      </View>

      {summary.highestSpendingDay && (
        <View style={styles.insightRow}>
          <Ionicons name="flame" size={14} color={COLORS.warning} />
          <Text style={styles.insightText}>
            Highest: <MoneyText amount={summary.highestSpendingDay.amount} size="small" /> on{' '}
            {new Date(summary.highestSpendingDay.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}
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
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  upBadge: {
    backgroundColor: COLORS.error + '15',
  },
  downBadge: {
    backgroundColor: COLORS.success + '15',
  },
  comparisonText: {
    ...Typography.caption,
    fontWeight: '600',
    marginLeft: 2,
  },
  upText: {
    color: COLORS.error,
  },
  downText: {
    color: COLORS.success,
  },
  mainStats: {
    marginBottom: Spacing.lg,
  },
  statBlock: {},
  statLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  secondaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  secondaryLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: 1,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  insightText: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
});

export default SpendingSummary;
