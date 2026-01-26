import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius } from '../../../src/constants';
import { Card, LoadingSpinner, EmptyState } from '../../../src/components';
import { AccountCard } from '../../../src/components/accounts';
import { TransactionCard } from '../../../src/components/transactions';
import { useAccounts, useAccountTransactions } from '../../../src/hooks/v2';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getById, refresh: refreshAccounts, remove } = useAccounts();
  const { transactions, loading: txLoading, refresh: refreshTx } = useAccountTransactions(id || '');
  const [loading, setLoading] = useState(true);

  const account = getById(id || '');

  useFocusEffect(
    useCallback(() => {
      refreshAccounts();
      refreshTx();
      setLoading(false);
    }, [refreshAccounts, refreshTx])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account?.name}"? This will also delete all transactions for this account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (id && remove(id)) {
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading || !account) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: account.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={txLoading} onRefresh={refreshTx} />
        }
      >
        {/* Account Card */}
        <AccountCard account={account} showDetails />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/accounts/transfer', params: { fromAccountId: id } })}
          >
            <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Transfer</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push({ pathname: '/settings/import', params: { accountId: id } })}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Import</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
          </Pressable>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions</Text>

          {transactions.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No Transactions"
              message="Transactions will appear here when you add them or import statements"
            />
          ) : (
            <Card padding="none">
              {transactions.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} />
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </>
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
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionText: {
    ...Typography.footnote,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
});
