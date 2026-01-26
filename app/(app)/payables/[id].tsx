import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles } from '../../../src/constants';
import { MoneyText, Card, LoadingSpinner, Badge } from '../../../src/components';
import { usePayables, useAccounts } from '../../../src/hooks/v2';
import { formatDate } from '../../../src/utils';

export default function PayableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getById, markPaid, markUnpaid, remove, refresh } = usePayables();
  const { accounts, getBankAccounts } = useAccounts();
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [payAmount, setPayAmount] = useState('');

  const payable = getById(id || '');
  const bankAccounts = getBankAccounts();

  useFocusEffect(
    useCallback(() => {
      refresh();
      setLoading(false);
    }, [refresh])
  );

  const handleMarkPaid = () => {
    if (!selectedAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    const amount = parseFloat(payAmount) || payable?.amount || 0;

    const result = markPaid({
      payableId: id!,
      paidFromAccountId: selectedAccountId,
      actualAmount: amount,
    });

    if (result.success) {
      setShowPayModal(false);
      Alert.alert('Success', 'Payment recorded successfully');
    } else {
      Alert.alert('Error', result.errors?.join('\n') || 'Failed to record payment');
    }
  };

  const handleMarkUnpaid = () => {
    Alert.alert(
      'Mark as Unpaid',
      'This will mark the bill as unpaid. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Unpaid',
          onPress: () => {
            const result = markUnpaid(id!);
            if (!result.success) {
              Alert.alert('Error', result.errors?.join('\n') || 'Failed to update');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Payable',
      `Are you sure you want to delete "${payable?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (remove(id!)) {
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading || !payable) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  const openPayModal = () => {
    setPayAmount(payable.amount.toString());
    setSelectedAccountId(bankAccounts[0]?.id || '');
    setShowPayModal(true);
  };

  return (
    <>
      <Stack.Screen options={{ title: payable.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Main Info Card */}
        <Card style={styles.mainCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{payable.name}</Text>
              {payable.isRecurring && (
                <Ionicons name="repeat" size={18} color={COLORS.textSecondary} />
              )}
            </View>
            {payable.isPaid ? (
              <Badge label="Paid" variant="success" />
            ) : payable.isOverdue ? (
              <Badge label={`${payable.daysOverdue}d overdue`} variant="error" />
            ) : payable.daysUntilDue <= 7 ? (
              <Badge label={`${payable.daysUntilDue}d`} variant="warning" />
            ) : null}
          </View>

          <View style={styles.amountRow}>
            <MoneyText amount={payable.amount} size="xlarge" />
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(payable.dueDate, 'long')}</Text>
            </View>
            {payable.isPaid && payable.paidDate && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Paid On</Text>
                <Text style={styles.detailValue}>{formatDate(payable.paidDate, 'long')}</Text>
              </View>
            )}
            {payable.payee && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Payee</Text>
                <Text style={styles.detailValue}>{payable.payee}</Text>
              </View>
            )}
            {payable.isRecurring && payable.recurrenceRule && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Recurrence</Text>
                <Text style={styles.detailValue}>
                  {payable.recurrenceRule.frequency.charAt(0).toUpperCase() +
                    payable.recurrenceRule.frequency.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {payable.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notes}>{payable.notes}</Text>
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {!payable.isPaid ? (
            <Pressable style={styles.primaryButton} onPress={openPayModal}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Mark as Paid</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.secondaryButton} onPress={handleMarkUnpaid}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>Mark as Unpaid</Text>
            </Pressable>
          )}

          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Pay Modal */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Pressable onPress={() => setShowPayModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.modalLabel}>Pay From Account</Text>
            <View style={styles.accountList}>
              {bankAccounts.map((account) => (
                <Pressable
                  key={account.id}
                  style={[
                    styles.accountOption,
                    selectedAccountId === account.id && styles.accountOptionSelected,
                  ]}
                  onPress={() => setSelectedAccountId(account.id)}
                >
                  <View style={styles.accountOptionContent}>
                    <Ionicons name="wallet" size={20} color={COLORS.bank} />
                    <Text style={styles.accountName}>{account.name}</Text>
                  </View>
                  <MoneyText amount={account.balance} size="small" />
                  {selectedAccountId === account.id && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.confirmButton} onPress={handleMarkPaid}>
              <Text style={styles.confirmButtonText}>Confirm Payment</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  mainCard: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  name: {
    ...Typography.title2,
  },
  amountRow: {
    marginBottom: Spacing.lg,
  },
  detailsGrid: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detailLabel: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
  },
  detailValue: {
    ...Typography.body,
  },
  notesSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  notes: {
    ...Typography.body,
    marginTop: Spacing.xs,
    color: COLORS.textSecondary,
  },
  actions: {
    gap: Spacing.md,
  },
  primaryButton: {
    ...CommonStyles.button,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    ...CommonStyles.buttonText,
  },
  secondaryButton: {
    ...CommonStyles.button,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    ...CommonStyles.buttonText,
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  actionButtonText: {
    ...Typography.footnote,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.title3,
  },
  modalLabel: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
  },
  currencySymbol: {
    ...Typography.title2,
    color: COLORS.textSecondary,
  },
  amountInput: {
    flex: 1,
    ...Typography.title2,
    paddingVertical: Spacing.lg,
    paddingLeft: Spacing.sm,
  },
  accountList: {
    gap: Spacing.sm,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  accountOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  accountOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  accountName: {
    ...Typography.body,
  },
  confirmButton: {
    ...CommonStyles.button,
    marginTop: Spacing.xl,
  },
  confirmButtonText: {
    ...CommonStyles.buttonText,
  },
});
