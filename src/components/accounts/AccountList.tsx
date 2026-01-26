// Account list component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, Spacing, Typography } from '../../constants';
import { AccountCard } from './AccountCard';
import { MoneyText } from '../common/MoneyText';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import type { AccountWithComputed } from '../../types/account';
import type { AccountSummary } from '../../services/v2/AccountService';

interface AccountListProps {
  accounts: AccountWithComputed[];
  summary?: AccountSummary | null;
  loading?: boolean;
  onAccountPress?: (account: AccountWithComputed) => void;
  showSummary?: boolean;
  emptyMessage?: string;
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  summary,
  loading = false,
  onAccountPress,
  showSummary = true,
  emptyMessage = 'No accounts yet',
}) => {
  if (loading) {
    return <LoadingSpinner message="Loading accounts..." />;
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="wallet-outline"
        title="No Accounts"
        message={emptyMessage}
      />
    );
  }

  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const creditAccounts = accounts.filter((a) => a.type === 'credit');

  return (
    <View style={styles.container}>
      {showSummary && summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Balance</Text>
              <MoneyText
                amount={summary.totalBankBalance}
                size="large"
                colorize
              />
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Credit Used</Text>
              <MoneyText
                amount={summary.totalCreditBalance}
                size="large"
                style={{ color: COLORS.expense }}
              />
            </View>
          </View>
          <View style={styles.netWorthRow}>
            <Text style={styles.netWorthLabel}>Net Worth</Text>
            <MoneyText
              amount={summary.netWorth}
              size="medium"
              colorize
              showSign
            />
          </View>
        </View>
      )}

      {bankAccounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Accounts</Text>
          {bankAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={() => onAccountPress?.(account)}
            />
          ))}
        </View>
      )}

      {creditAccounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Cards</Text>
          {creditAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={() => onAccountPress?.(account)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: Spacing.lg,
  },
  summaryLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  netWorthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  netWorthLabel: {
    ...Typography.subhead,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
});

export default AccountList;
