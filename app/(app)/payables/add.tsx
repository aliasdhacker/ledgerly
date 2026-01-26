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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles } from '../../../src/constants';
import { usePayables } from '../../../src/hooks/v2';
import { RecurrenceFrequency } from '../../../src/types/common';

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: RecurrenceFrequency.WEEKLY, label: 'Weekly' },
  { value: RecurrenceFrequency.BIWEEKLY, label: 'Bi-weekly' },
  { value: RecurrenceFrequency.MONTHLY, label: 'Monthly' },
  { value: RecurrenceFrequency.YEARLY, label: 'Yearly' },
];

export default function AddPayableScreen() {
  const router = useRouter();
  const { create } = usePayables();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(RecurrenceFrequency.MONTHLY);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const dueDayNum = parseInt(dueDay);
    if (!dueDayNum || dueDayNum < 1 || dueDayNum > 31) {
      Alert.alert('Error', 'Please enter a due day between 1 and 31');
      return;
    }

    // Calculate due date (next occurrence of this day)
    const today = new Date();
    const currentDay = today.getDate();
    let dueDate = new Date(today);

    if (dueDayNum <= currentDay) {
      // Due date is next month
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    dueDate.setDate(dueDayNum);

    const result = create({
      name: name.trim(),
      amount: amountNum,
      dueDate: dueDate.toISOString().split('T')[0],
      payee: payee.trim() || undefined,
      notes: notes.trim() || undefined,
      isRecurring,
      recurrenceRule: isRecurring
        ? {
            frequency,
            interval: 1,
            dayOfMonth: dueDayNum,
          }
        : undefined,
    });

    if (result.success) {
      router.back();
    } else {
      Alert.alert('Error', result.errors?.join('\n') || 'Failed to create payable');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Name */}
        <Text style={styles.label}>Bill Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Electric Bill"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Amount */}
        <Text style={styles.label}>Amount *</Text>
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

        {/* Due Day */}
        <Text style={styles.label}>Due Day of Month *</Text>
        <TextInput
          style={styles.input}
          value={dueDay}
          onChangeText={setDueDay}
          placeholder="1-31"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="number-pad"
          maxLength={2}
        />

        {/* Payee */}
        <Text style={styles.label}>Payee (Optional)</Text>
        <TextInput
          style={styles.input}
          value={payee}
          onChangeText={setPayee}
          placeholder="e.g., Con Edison"
          placeholderTextColor={COLORS.textTertiary}
        />

        {/* Recurring Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Recurring Bill</Text>
            <Text style={styles.toggleHint}>Automatically creates next bill when paid</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: COLORS.gray300, true: COLORS.primary + '80' }}
            thumbColor={isRecurring ? COLORS.primary : COLORS.gray100}
          />
        </View>

        {/* Frequency */}
        {isRecurring && (
          <>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyGrid}>
              {FREQUENCIES.map((f) => (
                <Pressable
                  key={f.value}
                  style={[
                    styles.frequencyButton,
                    frequency === f.value && styles.frequencyButtonActive,
                  ]}
                  onPress={() => setFrequency(f.value)}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === f.value && styles.frequencyTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes..."
          placeholderTextColor={COLORS.textTertiary}
          multiline
          numberOfLines={3}
        />

        {/* Save Button */}
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Add Payable</Text>
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
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    ...Typography.body,
  },
  toggleHint: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  frequencyButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  frequencyButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frequencyText: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  frequencyTextActive: {
    color: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    ...CommonStyles.button,
    marginTop: Spacing.xxl,
  },
  saveButtonText: {
    ...CommonStyles.buttonText,
  },
});
