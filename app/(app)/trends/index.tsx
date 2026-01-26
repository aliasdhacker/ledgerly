import React, { useCallback, useMemo } from 'react';
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
import { COLORS, Typography, Spacing, BorderRadius, CHART_COLORS } from '../../../src/constants';
import { MoneyText, Card, LoadingSpinner } from '../../../src/components';
import {
  useThisMonthSpending,
  useMonthlyTrend,
  useMonthComparison,
} from '../../../src/hooks/v2';

export default function TrendsScreen() {
  const router = useRouter();
  const { categories, totalSpending, totalIncome, loading: spendingLoading } = useThisMonthSpending();
  const { trends, loading: trendsLoading, refresh: refreshTrends } = useMonthlyTrend(6);
  const { comparison, loading: comparisonLoading, refresh: refreshComparison } = useMonthComparison();

  const loading = spendingLoading || trendsLoading || comparisonLoading;

  useFocusEffect(
    useCallback(() => {
      refreshTrends();
      refreshComparison();
    }, [refreshTrends, refreshComparison])
  );

  const netThisMonth = totalIncome - totalSpending;
  const spendingChange = comparison?.expenseChangePercent ?? 0;
  const isSpendingUp = spendingChange > 0;

  // Get top 5 categories
  const topCategories = useMemo(() => {
    return [...categories].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [categories]);

  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refreshTrends} />
      }
    >
      {/* This Month Summary */}
      <Card style={styles.summaryCard} variant="elevated">
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>This Month</Text>
          {comparison && (
            <View style={[styles.changeBadge, isSpendingUp ? styles.changeUp : styles.changeDown]}>
              <Ionicons
                name={isSpendingUp ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isSpendingUp ? COLORS.error : COLORS.success}
              />
              <Text style={[styles.changeText, isSpendingUp ? styles.changeTextUp : styles.changeTextDown]}>
                {Math.abs(spendingChange).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <MoneyText amount={totalSpending} size="large" style={styles.spentAmount} />
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <MoneyText amount={totalIncome} size="large" style={styles.incomeAmount} />
          </View>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net</Text>
          <MoneyText amount={netThisMonth} size="large" colorize showSign />
        </View>
      </Card>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Category</Text>
        <Card>
          {topCategories.length === 0 ? (
            <Text style={styles.emptyText}>No spending data yet</Text>
          ) : (
            topCategories.map((cat, index) => (
              <View key={cat.categoryId || 'uncategorized'} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryDot, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                  <Text style={styles.categoryName}>{cat.categoryName || 'Uncategorized'}</Text>
                </View>
                <View style={styles.categoryAmounts}>
                  <MoneyText amount={cat.amount} size="small" />
                  <Text style={styles.categoryPercent}>
                    {((cat.amount / totalSpending) * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </View>

      {/* Monthly Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6 Month Trend</Text>
        <Card>
          {trends.length === 0 ? (
            <Text style={styles.emptyText}>Not enough data for trends</Text>
          ) : (
            <View style={styles.trendChart}>
              {trends.map((month, index) => {
                const maxAmount = Math.max(...trends.map((t) => t.expenses));
                const height = maxAmount > 0 ? (month.expenses / maxAmount) * 100 : 0;
                return (
                  <View key={month.month} style={styles.trendBar}>
                    <View style={styles.trendBarContainer}>
                      <View
                        style={[
                          styles.trendBarFill,
                          { height: `${height}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] },
                        ]}
                      />
                    </View>
                    <Text style={styles.trendLabel}>
                      {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </View>

      {/* Quick Links */}
      <View style={styles.quickLinks}>
        <Pressable
          style={styles.quickLinkButton}
          onPress={() => router.push('/trends/budgets')}
        >
          <View style={[styles.quickLinkIcon, { backgroundColor: COLORS.warning + '20' }]}>
            <Ionicons name="pie-chart" size={24} color={COLORS.warning} />
          </View>
          <Text style={styles.quickLinkLabel}>Budgets</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.quickLinkButton}
          onPress={() => router.push('/trends/goals')}
        >
          <View style={[styles.quickLinkIcon, { backgroundColor: COLORS.success + '20' }]}>
            <Ionicons name="flag" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.quickLinkLabel}>Goals</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
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
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    ...Typography.title3,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  changeUp: {
    backgroundColor: COLORS.error + '20',
  },
  changeDown: {
    backgroundColor: COLORS.success + '20',
  },
  changeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  changeTextUp: {
    color: COLORS.error,
  },
  changeTextDown: {
    color: COLORS.success,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: Spacing.md,
  },
  summaryLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  spentAmount: {
    color: COLORS.expense,
  },
  incomeAmount: {
    color: COLORS.income,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  netLabel: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  categoryName: {
    ...Typography.body,
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryPercent: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: Spacing.md,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
  },
  trendBarContainer: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: BorderRadius.sm,
    minHeight: 4,
  },
  trendLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  quickLinks: {
    gap: Spacing.md,
  },
  quickLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  quickLinkLabel: {
    ...Typography.body,
    flex: 1,
  },
});
