// Transaction card component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import { formatDate } from '../../utils';
import { TransactionType } from '../../types/common';
import type { Transaction } from '../../types/transaction';

interface TransactionCardProps {
  transaction: Transaction;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  onPress?: () => void;
  showDate?: boolean;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  categoryName,
  categoryIcon = 'help-circle',
  categoryColor = COLORS.gray400,
  onPress,
  showDate = true,
}) => {
  const isDebit = transaction.type === TransactionType.DEBIT;
  const displayAmount = isDebit ? -transaction.amount : transaction.amount;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
        <Ionicons
          name={categoryIcon as any}
          size={20}
          color={categoryColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.metaRow}>
          {categoryName && (
            <Text style={styles.category} numberOfLines={1}>
              {categoryName}
            </Text>
          )}
          {showDate && (
            <Text style={styles.date}>
              {formatDate(transaction.date, 'short')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.amountContainer}>
        <MoneyText
          amount={displayAmount}
          colorize
          showSign
          size="medium"
        />
        {transaction.isReconciled && (
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={COLORS.success}
            style={styles.reconciledIcon}
          />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  pressed: {
    backgroundColor: COLORS.gray50,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.md,
  },
  description: {
    ...Typography.body,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginRight: Spacing.sm,
  },
  date: {
    ...Typography.caption,
    color: COLORS.textTertiary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  reconciledIcon: {
    marginTop: 2,
  },
});

export default TransactionCard;
