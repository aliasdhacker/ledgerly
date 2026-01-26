import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius } from '../../../src/constants';
import { MoneyText, Card, LoadingSpinner, EmptyState, ProgressBar } from '../../../src/components';
import { useBudgets } from '../../../src/hooks/v2';

export default function BudgetsScreen() {
  const router = useRouter();
  const { budgets, progress, summary, loading, refresh, getAlerts } = useBudgets();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const alerts = getAlerts();

  if (loading && budgets.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Summary Card */}
        {summary && summary.totalBudgeted > 0 && (
          <Card style={styles.summaryCard} variant="elevated">
            <Text style={styles.summaryTitle}>Budget Summary</Text>
            <View style={styles.summaryAmounts}>
              <MoneyText amount={summary.totalSpent} size="large" />
              <Text style={styles.summaryOf}>of</Text>
              <MoneyText amount={summary.totalBudgeted} size="large" style={styles.summaryBudgeted} />
            </View>
            <ProgressBar
              progress={summary.totalBudgeted > 0 ? summary.totalSpent / summary.totalBudgeted : 0}
              color={summary.totalSpent > summary.totalBudgeted ? COLORS.error : COLORS.primary}
              style={styles.summaryProgress}
            />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {summary.totalRemaining >= 0 ? 'Remaining' : 'Over budget'}
              </Text>
              <MoneyText
                amount={Math.abs(summary.totalRemaining)}
                size="medium"
                style={summary.totalRemaining < 0 ? styles.overBudget : styles.remaining}
              />
            </View>
          </Card>
        )}

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color={COLORS.warning} />
              <Text style={styles.alertTitle}>Needs Attention</Text>
            </View>
            {alerts.map((alert) => (
              <Card key={alert.budget.id} style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <Text style={styles.budgetName}>{alert.budget.name}</Text>
                  <Text style={[styles.alertPercent, alert.isOverBudget && styles.overBudgetText]}>
                    {alert.percentUsed.toFixed(0)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={alert.percentUsed / 100}
                  color={alert.isOverBudget ? COLORS.error : COLORS.warning}
                  style={styles.alertProgress}
                />
              </Card>
            ))}
          </View>
        )}

        {/* All Budgets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Budgets</Text>
          {progress.length === 0 ? (
            <EmptyState
              icon="pie-chart-outline"
              title="No Budgets"
              message="Create your first budget to track spending"
            />
          ) : (
            progress.map((item) => (
              <Card key={item.budget.id} style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetName}>{item.budget.name}</Text>
                  {item.isOverBudget && (
                    <View style={styles.overBudgetBadge}>
                      <Text style={styles.overBudgetBadgeText}>Over</Text>
                    </View>
                  )}
                </View>

                <View style={styles.budgetAmounts}>
                  <MoneyText amount={item.spent} size="medium" />
                  <Text style={styles.budgetOf}>of</Text>
                  <MoneyText amount={item.budget.amount} size="medium" style={styles.budgetLimit} />
                </View>

                <ProgressBar
                  progress={item.percentUsed / 100}
                  color={
                    item.isOverBudget
                      ? COLORS.error
                      : item.percentUsed > 80
                      ? COLORS.warning
                      : COLORS.success
                  }
                  style={styles.budgetProgress}
                />

                <View style={styles.budgetFooter}>
                  <Text style={styles.budgetRemaining}>
                    {item.remaining >= 0 ? `$${item.remaining.toFixed(0)} left` : `$${Math.abs(item.remaining).toFixed(0)} over`}
                  </Text>
                  <Text style={styles.budgetPeriod}>
                    {item.budget.period.charAt(0).toUpperCase() + item.budget.period.slice(1)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => {}}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  summaryAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  summaryOf: {
    ...Typography.body,
    color: COLORS.textSecondary,
    marginHorizontal: Spacing.sm,
  },
  summaryBudgeted: {
    color: COLORS.textSecondary,
  },
  summaryProgress: {
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
  },
  remaining: {
    color: COLORS.success,
  },
  overBudget: {
    color: COLORS.error,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  alertTitle: {
    ...Typography.title3,
    color: COLORS.warning,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  alertCard: {
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  alertPercent: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.warning,
  },
  overBudgetText: {
    color: COLORS.error,
  },
  alertProgress: {
    height: 4,
  },
  budgetCard: {
    marginBottom: Spacing.md,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  budgetName: {
    ...Typography.bodyBold,
  },
  overBudgetBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  overBudgetBadgeText: {
    ...Typography.caption,
    color: COLORS.error,
    fontWeight: '600',
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  budgetOf: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  budgetLimit: {
    color: COLORS.textSecondary,
  },
  budgetProgress: {
    marginBottom: Spacing.sm,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetRemaining: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  budgetPeriod: {
    ...Typography.caption,
    color: COLORS.textTertiary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
