import React, { useCallback, useState } from 'react';
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
import { PayableCard } from '../../../src/components/payables';
import { usePayables } from '../../../src/hooks/v2';

type FilterType = 'unpaid' | 'paid' | 'all';

export default function PayablesScreen() {
  const router = useRouter();
  const { payables, summary, loading, refresh, getOverdue } = usePayables();
  const [filter, setFilter] = useState<FilterType>('unpaid');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const overduePayables = getOverdue();
  const overdueTotal = overduePayables.reduce((sum, p) => sum + p.amount, 0);

  const filteredPayables = payables.filter((p) => {
    if (filter === 'unpaid') return !p.isPaid;
    if (filter === 'paid') return p.isPaid;
    return true;
  });

  if (loading && payables.length === 0) {
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
                <Text style={styles.summaryLabel}>Total Due</Text>
                <MoneyText amount={summary.upcomingTotal} size="large" />
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Overdue</Text>
                <MoneyText
                  amount={overdueTotal}
                  size="large"
                  style={overduePayables.length > 0 ? styles.overdueAmount : undefined}
                />
                {overduePayables.length > 0 && (
                  <Text style={styles.overdueCount}>({overduePayables.length})</Text>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['unpaid', 'paid', 'all'] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Payables List */}
        {filteredPayables.length === 0 ? (
          <EmptyState
            icon={filter === 'unpaid' ? 'checkmark-circle' : 'document-text-outline'}
            title={filter === 'unpaid' ? 'All Caught Up!' : 'No Payables'}
            message={
              filter === 'unpaid'
                ? 'You have no outstanding bills'
                : filter === 'paid'
                ? 'No paid bills to show'
                : 'Add your first bill to start tracking'
            }
          />
        ) : (
          filteredPayables.map((payable) => (
            <PayableCard
              key={payable.id}
              payable={payable}
              onPress={() => router.push(`/payables/${payable.id}`)}
              onMarkPaid={
                !payable.isPaid
                  ? () => router.push(`/payables/${payable.id}`)
                  : undefined
              }
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/payables/add')}
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
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
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
  overdueAmount: {
    color: COLORS.error,
  },
  overdueCount: {
    ...Typography.caption,
    color: COLORS.error,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...Typography.footnote,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
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
