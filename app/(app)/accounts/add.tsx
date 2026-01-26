import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles } from '../../../src/constants';
import { useAccounts } from '../../../src/hooks/v2';
import type { AccountType } from '../../../src/types/account';
import { RecurrenceFrequency } from '../../../src/types/common';

type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly';

export default function AddAccountScreen() {
  const router = useRouter();
  const { create } = useAccounts();

  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');

  // Credit-specific fields
  const [creditLimit, setCreditLimit] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [apr, setApr] = useState('');

  // Loan-specific fields
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanInterestRate, setLoanInterestRate] = useState('');
  const [loanMonthlyPayment, setLoanMonthlyPayment] = useState('');
  const [loanPaymentFrequency, setLoanPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [loanPaymentDay, setLoanPaymentDay] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    const balanceNum = parseFloat(balance) || 0;

    const result = create({
      name: name.trim(),
      type: accountType,
      balance: balanceNum,
      currency: 'USD',
      institutionName: institutionName.trim() || undefined,
      accountNumberLast4: accountNumberLast4.trim() || undefined,
      isActive: true,
      sortOrder: 0,
      ...(accountType === 'credit' && {
        creditLimit: parseFloat(creditLimit) || undefined,
        paymentDueDay: parseInt(paymentDueDay) || undefined,
        minimumPayment: parseFloat(minimumPayment) || undefined,
        apr: parseFloat(apr) || undefined,
      }),
      ...(accountType === 'loan' && {
        loanPrincipal: parseFloat(loanPrincipal) || undefined,
        loanInterestRate: parseFloat(loanInterestRate) || undefined,
        loanMonthlyPayment: parseFloat(loanMonthlyPayment) || undefined,
        loanPaymentFrequency: loanPaymentFrequency as RecurrenceFrequency,
        loanPaymentDay: parseInt(loanPaymentDay) || undefined,
      }),
    });

    if (result.success) {
      router.back();
    } else {
      Alert.alert('Error', result.errors?.join('\n') || 'Failed to create account');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Type Toggle */}
        <Text style={styles.label}>Account Type</Text>
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, accountType === 'bank' && styles.toggleActive]}
            onPress={() => setAccountType('bank')}
          >
            <Ionicons
              name="wallet"
              size={18}
              color={accountType === 'bank' ? COLORS.white : COLORS.textSecondary}
            />
            <Text style={[styles.toggleText, accountType === 'bank' && styles.toggleTextActive]}>
              Bank
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, accountType === 'credit' && styles.toggleActive]}
            onPress={() => setAccountType('credit')}
          >
            <Ionicons
              name="card"
              size={18}
              color={accountType === 'credit' ? COLORS.white : COLORS.textSecondary}
            />
            <Text style={[styles.toggleText, accountType === 'credit' && styles.toggleTextActive]}>
              Credit
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, accountType === 'loan' && styles.toggleActive]}
            onPress={() => setAccountType('loan')}
          >
            <Ionicons
              name="business-outline"
              size={18}
              color={accountType === 'loan' ? COLORS.white : COLORS.textSecondary}
            />
            <Text style={[styles.toggleText, accountType === 'loan' && styles.toggleTextActive]}>
              Loan
            </Text>
          </Pressable>
        </View>

        {/* Name */}
        <Text style={styles.label}>Account Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={
            accountType === 'bank'
              ? 'e.g., Checking Account'
              : accountType === 'credit'
              ? 'e.g., Chase Sapphire'
              : 'e.g., Home Mortgage'
          }
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Starting Balance */}
        <Text style={styles.label}>
          {accountType === 'bank'
            ? 'Current Balance'
            : accountType === 'credit'
            ? 'Current Balance (Amount Owed)'
            : 'Remaining Balance (Amount Owed)'}
        </Text>
        <TextInput
          style={styles.input}
          value={balance}
          onChangeText={setBalance}
          placeholder="0.00"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="decimal-pad"
        />

        {/* Institution Name */}
        <Text style={styles.label}>Institution Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={institutionName}
          onChangeText={setInstitutionName}
          placeholder="e.g., Bank of America"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Last 4 Digits */}
        <Text style={styles.label}>Last 4 Digits (Optional)</Text>
        <TextInput
          style={styles.input}
          value={accountNumberLast4}
          onChangeText={setAccountNumberLast4}
          placeholder="1234"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="number-pad"
          maxLength={4}
        />

        {/* Credit-specific fields */}
        {accountType === 'credit' && (
          <>
            <Text style={styles.label}>Credit Limit</Text>
            <TextInput
              style={styles.input}
              value={creditLimit}
              onChangeText={setCreditLimit}
              placeholder="5000.00"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Payment Due Day (1-31)</Text>
            <TextInput
              style={styles.input}
              value={paymentDueDay}
              onChangeText={setPaymentDueDay}
              placeholder="15"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
              maxLength={2}
            />

            <Text style={styles.label}>Minimum Payment</Text>
            <TextInput
              style={styles.input}
              value={minimumPayment}
              onChangeText={setMinimumPayment}
              placeholder="25.00"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>APR (%)</Text>
            <TextInput
              style={styles.input}
              value={apr}
              onChangeText={setApr}
              placeholder="24.99"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />
          </>
        )}

        {/* Loan-specific fields */}
        {accountType === 'loan' && (
          <>
            <Text style={styles.label}>Original Loan Amount</Text>
            <TextInput
              style={styles.input}
              value={loanPrincipal}
              onChangeText={setLoanPrincipal}
              placeholder="250000.00"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Interest Rate (% APR)</Text>
            <TextInput
              style={styles.input}
              value={loanInterestRate}
              onChangeText={setLoanInterestRate}
              placeholder="6.5"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Payment Amount</Text>
            <TextInput
              style={styles.input}
              value={loanMonthlyPayment}
              onChangeText={setLoanMonthlyPayment}
              placeholder="1500.00"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Payment Frequency</Text>
            <View style={styles.toggleContainer}>
              <Pressable
                style={[styles.toggleButton, loanPaymentFrequency === 'weekly' && styles.toggleActive]}
                onPress={() => setLoanPaymentFrequency('weekly')}
              >
                <Text style={[styles.toggleText, loanPaymentFrequency === 'weekly' && styles.toggleTextActive]}>
                  Weekly
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, loanPaymentFrequency === 'biweekly' && styles.toggleActive]}
                onPress={() => setLoanPaymentFrequency('biweekly')}
              >
                <Text style={[styles.toggleText, loanPaymentFrequency === 'biweekly' && styles.toggleTextActive]}>
                  Biweekly
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, loanPaymentFrequency === 'monthly' && styles.toggleActive]}
                onPress={() => setLoanPaymentFrequency('monthly')}
              >
                <Text style={[styles.toggleText, loanPaymentFrequency === 'monthly' && styles.toggleTextActive]}>
                  Monthly
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>
              {loanPaymentFrequency === 'weekly' ? 'Day of Week (1=Mon, 7=Sun)' : 'Day of Month (1-31)'}
            </Text>
            <TextInput
              style={styles.input}
              value={loanPaymentDay}
              onChangeText={setLoanPaymentDay}
              placeholder={loanPaymentFrequency === 'weekly' ? '1' : '15'}
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
              maxLength={2}
            />
          </>
        )}

        {/* Save Button */}
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Add Account</Text>
        </Pressable>
      </ScrollView>
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
  input: {
    ...CommonStyles.input,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleText: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  saveButton: {
    ...CommonStyles.button,
    marginTop: Spacing.xxl,
  },
  saveButtonText: {
    ...CommonStyles.buttonText,
  },
});
