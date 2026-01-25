// Transaction list component for DriftMoney

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { COLORS, Spacing, Typography } from '../../constants';
import { TransactionCard } from './TransactionCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { formatDate } from '../../utils';
import type { Transaction } from '../../types/transaction';
import type { Category } from '../../types/category';

interface TransactionListProps {
  transactions: Transaction[];
  categories?: Map<string, Category>;
  loading?: boolean;
  onTransactionPress?: (transaction: Transaction) => void;
  groupByDate?: boolean;
  emptyMessage?: string;
}

interface TransactionSection {
  title: string;
  data: Transaction[];
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories = new Map(),
  loading = false,
  onTransactionPress,
  groupByDate = true,
  emptyMessage = 'No transactions yet',
}) => {
  const sections = useMemo(() => {
    if (!groupByDate) {
      return [{ title: '', data: transactions }];
    }

    const groups = new Map<string, Transaction[]>();

    for (const t of transactions) {
      const dateKey = t.date;
      const existing = groups.get(dateKey) || [];
      existing.push(t);
      groups.set(dateKey, existing);
    }

    // Sort by date descending
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((date) => ({
      title: formatDate(date, 'medium'),
      data: groups.get(date)!,
    }));
  }, [transactions, groupByDate]);

  if (loading) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="No Transactions"
        message={emptyMessage}
      />
    );
  }

  const renderItem = ({ item }: { item: Transaction }) => {
    const category = item.categoryId ? categories.get(item.categoryId) : undefined;
    return (
      <TransactionCard
        transaction={item}
        categoryName={category?.name}
        categoryIcon={category?.icon}
        categoryColor={category?.color}
        onPress={() => onTransactionPress?.(item)}
        showDate={!groupByDate}
      />
    );
  };

  const renderSectionHeader = ({ section }: { section: TransactionSection }) => {
    if (!section.title) return null;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});

export default TransactionList;
