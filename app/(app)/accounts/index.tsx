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
import { MoneyText, Card, LoadingSpinner, EmptyState } from '../../../src/components';
import { AccountCard } from '../../../src/components/accounts';
import { useAccounts } from '../../../src/hooks/v2';

export default function AccountsScreen() {
  const router = useRouter();
  const { accounts, summary, loading, refresh, getBankAccounts, getCreditAccounts, getLoanAccounts } = useAccounts();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const bankAccounts = getBankAccounts();
  const creditAccounts = getCreditAccounts();
  const loanAccounts = getLoanAccounts();

  if (loading && accounts.length === 0) {
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
        {summary && (
          <Card style={styles.summaryCard} variant="elevated">
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Bank Balance</Text>
                <MoneyText amount={summary.totalBankBalance} size="small" />
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Credit Used</Text>
                <MoneyText
                  amount={summary.totalCreditBalance}
                  size="small"
                  style={summary.totalCreditBalance > 0 ? styles.debtAmount : undefined}
                />
              </View>
              {summary.totalLoanBalance > 0 && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Loans</Text>
                    <MoneyText
                      amount={summary.totalLoanBalance}
                      size="small"
                      style={styles.debtAmount}
                    />
                  </View>
                </>
              )}
            </View>
            <View style={styles.netWorthRow}>
              <Text style={styles.netWorthLabel}>Net Worth</Text>
              <MoneyText amount={summary.netWorth} size="large" colorize />
            </View>
          </Card>
        )}

        {/* Bank Accounts */}
        {bankAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            {bankAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={() => router.push(`/accounts/${account.id}`)}
              />
            ))}
          </View>
        )}

        {/* Credit Cards */}
        {creditAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Cards</Text>
            {creditAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={() => router.push(`/accounts/${account.id}`)}
              />
            ))}
          </View>
        )}

        {/* Loans */}
        {loanAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loans</Text>
            {loanAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={() => router.push(`/accounts/${account.id}`)}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {accounts.length === 0 && (
          <EmptyState
            icon="wallet-outline"
            title="No Accounts"
            message="Add your first account to start tracking your finances"
          />
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/accounts/add')}
      >
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
  debtAmount: {
    color: COLORS.expense,
  },
  netWorthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  netWorthLabel: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
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
