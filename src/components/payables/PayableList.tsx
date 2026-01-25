// Payable list component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { COLORS, Spacing, Typography } from '../../constants';
import { PayableCard } from './PayableCard';
import { MoneyText } from '../common/MoneyText';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import type { PayableWithStatus } from '../../types/payable';

interface PayableListProps {
  payables: PayableWithStatus[];
  loading?: boolean;
  onPayablePress?: (payable: PayableWithStatus) => void;
  onMarkPaid?: (payable: PayableWithStatus) => void;
  showSummary?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
}

export const PayableList: React.FC<PayableListProps> = ({
  payables,
  loading = false,
  onPayablePress,
  onMarkPaid,
  showSummary = true,
  emptyMessage = 'No bills yet',
  emptyIcon = 'document-text-outline',
}) => {
  if (loading) {
    return <LoadingSpinner message="Loading bills..." />;
  }

  if (payables.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon as any}
        title="No Bills"
        message={emptyMessage}
      />
    );
  }

  const totalAmount = payables.reduce((sum, p) => sum + p.amount, 0);
  const overduePayables = payables.filter((p) => p.isOverdue);
  const overdueAmount = overduePayables.reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={styles.container}>
      {showSummary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <MoneyText amount={totalAmount} size="large" />
            <Text style={styles.countText}>{payables.length} bills</Text>
          </View>
          {overduePayables.length > 0 && (
            <View style={styles.overdueSection}>
              <View style={styles.overdueDot} />
              <View>
                <Text style={styles.overdueLabel}>Overdue</Text>
                <MoneyText
                  amount={overdueAmount}
                  size="small"
                  style={{ color: COLORS.error }}
                />
              </View>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={payables}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PayableCard
            payable={item}
            onPress={() => onPayablePress?.(item)}
            onMarkPaid={onMarkPaid ? () => onMarkPaid(item) : undefined}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryMain: {},
  summaryLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  countText: {
    ...Typography.caption,
    color: COLORS.textTertiary,
    marginTop: Spacing.xs,
  },
  overdueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  overdueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginRight: Spacing.sm,
  },
  overdueLabel: {
    ...Typography.caption,
    color: COLORS.error,
    marginBottom: 2,
  },
  listContent: {
    flexGrow: 1,
  },
});

export default PayableList;
