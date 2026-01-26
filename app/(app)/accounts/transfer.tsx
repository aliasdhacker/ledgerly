import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles } from '../../../src/constants';
import { MoneyText, Card } from '../../../src/components';
import { useAccounts } from '../../../src/hooks/v2';
import { TransferService } from '../../../src/services/v2';
import type { AccountWithComputed } from '../../../src/types/account';

export default function TransferScreen() {
  const router = useRouter();
  const { fromAccountId } = useLocalSearchParams<{ fromAccountId?: string }>();
  const { accounts, refresh } = useAccounts();

  const [fromAccount, setFromAccount] = useState<AccountWithComputed | null>(null);
  const [toAccount, setToAccount] = useState<AccountWithComputed | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (fromAccountId && accounts.length > 0) {
      const account = accounts.find((a) => a.id === fromAccountId);
      if (account) setFromAccount(account);
    }
  }, [fromAccountId, accounts]);

  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const creditAccounts = accounts.filter((a) => a.type === 'credit');

  const handleTransfer = () => {
    if (!fromAccount) {
      Alert.alert('Error', 'Please select a source account');
      return;
    }
    if (!toAccount) {
      Alert.alert('Error', 'Please select a destination account');
      return;
    }
    if (fromAccount.id === toAccount.id) {
      Alert.alert('Error', 'Source and destination cannot be the same');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const result = TransferService.create({
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amount: amountNum,
      date: new Date().toISOString().split('T')[0],
      description: description.trim() || undefined,
    });

    if (result.success) {
      refresh();
      router.back();
    } else {
      Alert.alert('Error', result.errors?.join('\n') || 'Failed to create transfer');
    }
  };

  const renderAccountPicker = (
    accounts: AccountWithComputed[],
    selectedId: string | undefined,
    onSelect: (account: AccountWithComputed) => void,
    onClose: () => void
  ) => (
    <View style={styles.pickerOverlay}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose} />
      <View style={styles.pickerContent}>
        <Text style={styles.pickerTitle}>Select Account</Text>
        <ScrollView>
          {accounts.map((account) => (
            <Pressable
              key={account.id}
              style={[styles.pickerItem, account.id === selectedId && styles.pickerItemSelected]}
              onPress={() => {
                onSelect(account);
                onClose();
              }}
            >
              <View style={styles.pickerItemContent}>
                <Ionicons
                  name={account.type === 'bank' ? 'wallet' : 'card'}
                  size={20}
                  color={account.type === 'bank' ? COLORS.bank : COLORS.creditAccount}
                />
                <Text style={styles.pickerItemName}>{account.name}</Text>
              </View>
              <MoneyText amount={account.balance} size="small" />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const isCreditPayment = toAccount?.type === 'credit';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* From Account */}
        <Text style={styles.label}>From Account</Text>
        <Pressable style={styles.accountSelector} onPress={() => setShowFromPicker(true)}>
          {fromAccount ? (
            <View style={styles.selectedAccount}>
              <Ionicons
                name={fromAccount.type === 'bank' ? 'wallet' : 'card'}
                size={20}
                color={fromAccount.type === 'bank' ? COLORS.bank : COLORS.creditAccount}
              />
              <Text style={styles.selectedAccountName}>{fromAccount.name}</Text>
              <MoneyText amount={fromAccount.balance} size="small" style={styles.selectedAccountBalance} />
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select account</Text>
          )}
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </Pressable>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="arrow-down" size={24} color={COLORS.textSecondary} />
        </View>

        {/* To Account */}
        <Text style={styles.label}>To Account</Text>
        <Pressable style={styles.accountSelector} onPress={() => setShowToPicker(true)}>
          {toAccount ? (
            <View style={styles.selectedAccount}>
              <Ionicons
                name={toAccount.type === 'bank' ? 'wallet' : 'card'}
                size={20}
                color={toAccount.type === 'bank' ? COLORS.bank : COLORS.creditAccount}
              />
              <Text style={styles.selectedAccountName}>{toAccount.name}</Text>
              <MoneyText amount={toAccount.balance} size="small" style={styles.selectedAccountBalance} />
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select account</Text>
          )}
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </Pressable>

        {isCreditPayment && (
          <Card style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>This transfer will be recorded as a credit card payment</Text>
          </Card>
        )}

        {/* Amount */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Description */}
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Payment"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Transfer Button */}
        <Pressable style={styles.transferButton} onPress={handleTransfer}>
          <Text style={styles.transferButtonText}>
            {isCreditPayment ? 'Make Payment' : 'Transfer'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Account Pickers */}
      {showFromPicker && renderAccountPicker(
        bankAccounts,
        fromAccount?.id,
        setFromAccount,
        () => setShowFromPicker(false)
      )}
      {showToPicker && renderAccountPicker(
        accounts.filter((a) => a.id !== fromAccount?.id),
        toAccount?.id,
        setToAccount,
        () => setShowToPicker(false)
      )}
    </KeyboardAvoidingView>
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
  label: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  selectedAccountName: {
    ...Typography.body,
    flex: 1,
  },
  selectedAccountBalance: {
    color: COLORS.textSecondary,
  },
  placeholderText: {
    ...Typography.body,
    color: COLORS.textTertiary,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: COLORS.info + '10',
  },
  infoText: {
    ...Typography.footnote,
    color: COLORS.info,
    flex: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  input: {
    ...CommonStyles.input,
  },
  transferButton: {
    ...CommonStyles.button,
    marginTop: Spacing.xxl,
  },
  transferButtonText: {
    ...CommonStyles.buttonText,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  pickerTitle: {
    ...Typography.title3,
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pickerItemName: {
    ...Typography.body,
  },
});
