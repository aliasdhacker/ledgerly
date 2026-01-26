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
import { COLORS, Typography, Spacing, BorderRadius } from '../../src/constants';
import { MoneyText, Card, LoadingSpinner } from '../../src/components';
import { PayableCard } from '../../src/components/payables';
import { TransactionCard } from '../../src/components/transactions';
import {
  useDraft,
  useFinancialOverview,
  useUpcomingPayables,
  useRecentTransactions,
} from '../../src/hooks/v2';

export default function HomeScreen() {
  const router = useRouter();
  const { draft, loading: draftLoading, refresh: refreshDraft } = useDraft();
  const overview = useFinancialOverview();
  const { payables: upcomingPayables, total: upcomingTotal, loading: payablesLoading, refresh: refreshPayables } = useUpcomingPayables(14);
  const { transactions: recentTransactions, loading: transactionsLoading } = useRecentTransactions(5);

  const loading = draftLoading || overview.loading || payablesLoading || transactionsLoading;

  useFocusEffect(
    useCallback(() => {
      refreshDraft();
      refreshPayables();
    }, [refreshDraft, refreshPayables])
  );

  const safeToSpend = draft?.safeToSpend ?? 0;
  const isNegative = safeToSpend < 0;

  if (loading && !draft) {
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
        <RefreshControl refreshing={loading} onRefresh={refreshDraft} />
      }
    >
      {/* Safe to Spend Card */}
      <Card style={styles.safeToSpendCard} variant="elevated">
        <Text style={styles.safeToSpendLabel}>Safe to Spend</Text>
        <MoneyText
          amount={safeToSpend}
          size="xlarge"
          colorize
          style={isNegative ? styles.negative : undefined}
        />
        {draft && draft.upcomingPayables > 0 && (
          <Text style={styles.safeToSpendHint}>
            After {draft.breakdown.upcomingBills.length} upcoming bill{draft.breakdown.upcomingBills.length !== 1 ? 's' : ''}
          </Text>
        )}
      </Card>

      {/* Financial Overview */}
      <View style={styles.overviewGrid}>
        <Card style={styles.overviewCard} onPress={() => router.push('/accounts')}>
          <Text style={styles.overviewLabel}>Available</Text>
          <MoneyText amount={overview.availableBalance} size="large" />
        </Card>
        <Card style={styles.overviewCard} onPress={() => router.push('/accounts')}>
          <Text style={styles.overviewLabel}>Credit Debt</Text>
          <MoneyText
            amount={overview.creditDebt}
            size="large"
            style={overview.creditDebt > 0 ? styles.debtAmount : undefined}
          />
        </Card>
      </View>

      <Card style={styles.netWorthCard}>
        <View style={styles.netWorthRow}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <MoneyText amount={overview.netWorth} size="large" colorize />
        </View>
      </Card>

      {/* Upcoming Payables */}
      <View style={styles.section}>
        <Pressable
          style={styles.sectionHeader}
          onPress={() => router.push('/payables')}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcomingPayables.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{upcomingPayables.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.sectionRight}>
            <MoneyText amount={upcomingTotal} size="medium" style={styles.sectionTotal} />
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>
        </Pressable>

        {upcomingPayables.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
            <Text style={styles.emptyText}>No upcoming bills</Text>
          </Card>
        ) : (
          upcomingPayables.slice(0, 3).map((payable) => (
            <PayableCard
              key={payable.id}
              payable={payable}
              onPress={() => router.push(`/payables/${payable.id}`)}
            />
          ))
        )}

        {upcomingPayables.length > 3 && (
          <Pressable
            style={styles.seeAllButton}
            onPress={() => router.push('/payables')}
          >
            <Text style={styles.seeAllText}>
              See all {upcomingPayables.length} payables
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </Pressable>
        )}
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Pressable
          style={styles.sectionHeader}
          onPress={() => router.push('/accounts')}
        >
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>

        {recentTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </Card>
        ) : (
          <Card padding="none">
            {recentTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onPress={() => router.push(`/accounts/${transaction.accountId}`)}
              />
            ))}
          </Card>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => router.push('/accounts/transfer')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '20' }]}>
            <Ionicons name="swap-horizontal" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.quickActionLabel}>Transfer</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionButton}
          onPress={() => router.push('/payables/add')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warning + '20' }]}>
            <Ionicons name="add-circle" size={24} color={COLORS.warning} />
          </View>
          <Text style={styles.quickActionLabel}>Add Bill</Text>
        </Pressable>

        <Pressable
          style={styles.quickActionButton}
          onPress={() => router.push('/trends')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: COLORS.success + '20' }]}>
            <Ionicons name="trending-up" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.quickActionLabel}>Trends</Text>
        </Pressable>
      </View>

      {/* Settings Link */}
      <Pressable
        style={styles.settingsLink}
        onPress={() => router.push('/settings')}
      >
        <Ionicons name="settings-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.settingsText}>Settings</Text>
      </Pressable>
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
  safeToSpendCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  safeToSpendLabel: {
    ...Typography.subhead,
    marginBottom: Spacing.sm,
  },
  safeToSpendAmount: {
    marginBottom: Spacing.xs,
  },
  safeToSpendHint: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  negative: {
    color: COLORS.error,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  overviewCard: {
    flex: 1,
    padding: Spacing.lg,
  },
  overviewLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  debtAmount: {
    color: COLORS.expense,
  },
  netWorthCard: {
    marginBottom: Spacing.xl,
  },
  netWorthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netWorthLabel: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.title3,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
  },
  badgeText: {
    ...Typography.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTotal: {
    marginRight: Spacing.xs,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.subhead,
    color: COLORS.textSecondary,
    marginTop: Spacing.sm,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  seeAllText: {
    ...Typography.footnote,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  settingsText: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    marginLeft: Spacing.sm,
  },
});
