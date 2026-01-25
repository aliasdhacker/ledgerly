// Payable card component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils';
import type { PayableWithStatus } from '../../types/payable';

interface PayableCardProps {
  payable: PayableWithStatus;
  onPress?: () => void;
  onMarkPaid?: () => void;
}

export const PayableCard: React.FC<PayableCardProps> = ({
  payable,
  onPress,
  onMarkPaid,
}) => {
  const getStatusBadge = () => {
    if (payable.isPaid) {
      return <Badge label="Paid" variant="success" />;
    }
    if (payable.isOverdue) {
      return <Badge label={`${payable.daysOverdue}d overdue`} variant="error" />;
    }
    if (payable.daysUntilDue === 0) {
      return <Badge label="Due today" variant="warning" />;
    }
    if (payable.daysUntilDue <= 7) {
      return <Badge label={`${payable.daysUntilDue}d`} variant="warning" />;
    }
    return null;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        payable.isOverdue && styles.overdueCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.mainContent}>
        <View style={styles.leftSection}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {payable.name}
            </Text>
            {payable.isRecurring && (
              <Ionicons
                name="repeat"
                size={14}
                color={COLORS.textSecondary}
                style={styles.recurringIcon}
              />
            )}
          </View>
          <View style={styles.detailsRow}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.dueDate}>
              {payable.isPaid
                ? `Paid ${formatDate(payable.paidDate!, 'short')}`
                : `Due ${formatDate(payable.dueDate, 'short')}`}
            </Text>
            {getStatusBadge()}
          </View>
          {payable.payee && (
            <Text style={styles.payee} numberOfLines={1}>
              {payable.payee}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          <MoneyText
            amount={payable.amount}
            size="medium"
            style={
              payable.isPaid
                ? styles.paidAmount
                : payable.isOverdue
                ? styles.overdueAmount
                : undefined
            }
          />
        </View>
      </View>

      {!payable.isPaid && onMarkPaid && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onMarkPaid();
          }}
          style={styles.markPaidButton}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
          <Text style={styles.markPaidText}>Mark Paid</Text>
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  overdueCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  pressed: {
    opacity: 0.9,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.bodyBold,
    flex: 1,
  },
  recurringIcon: {
    marginLeft: Spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dueDate: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginRight: Spacing.sm,
  },
  payee: {
    ...Typography.caption,
    color: COLORS.textTertiary,
    marginTop: Spacing.xs,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paidAmount: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  overdueAmount: {
    color: COLORS.error,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  markPaidText: {
    ...Typography.footnote,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
});

export default PayableCard;
