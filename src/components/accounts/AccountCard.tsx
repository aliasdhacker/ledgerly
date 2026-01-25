// Account card component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import { Badge } from '../common/Badge';
import type { AccountWithComputed } from '../../types/account';

interface AccountCardProps {
  account: AccountWithComputed;
  onPress?: () => void;
  showDetails?: boolean;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onPress,
  showDetails = true,
}) => {
  const isCredit = account.type === 'credit';
  const iconName = isCredit ? 'card' : 'wallet';
  const iconColor = isCredit ? COLORS.creditAccount : COLORS.bank;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {account.name}
          </Text>
          {account.institutionName && (
            <Text style={styles.institution} numberOfLines={1}>
              {account.institutionName}
            </Text>
          )}
        </View>
        {!account.isActive && <Badge label="Inactive" variant="default" />}
      </View>

      <View style={styles.balanceRow}>
        <MoneyText
          amount={account.balance}
          currency={account.currency}
          size="large"
          colorize={isCredit}
        />
        {isCredit && account.creditLimit && (
          <Text style={styles.limitText}>
            of {account.creditLimit.toLocaleString()} limit
          </Text>
        )}
      </View>

      {showDetails && isCredit && account.creditLimit && (
        <View style={styles.creditDetails}>
          <View style={styles.utilizationBar}>
            <View
              style={[
                styles.utilizationFill,
                {
                  width: `${Math.min(100, (account.balance / account.creditLimit) * 100)}%`,
                  backgroundColor:
                    account.balance / account.creditLimit > 0.9
                      ? COLORS.error
                      : account.balance / account.creditLimit > 0.7
                      ? COLORS.warning
                      : COLORS.success,
                },
              ]}
            />
          </View>
          <View style={styles.creditInfo}>
            <View style={styles.creditInfoItem}>
              <Text style={styles.creditLabel}>Available</Text>
              <MoneyText
                amount={account.availableCredit ?? 0}
                size="small"
                style={styles.creditValue}
              />
            </View>
            {account.paymentDueDay && (
              <View style={styles.creditInfoItem}>
                <Text style={styles.creditLabel}>Due</Text>
                <Text style={styles.creditValue}>Day {account.paymentDueDay}</Text>
              </View>
            )}
            {account.minimumPayment && (
              <View style={styles.creditInfoItem}>
                <Text style={styles.creditLabel}>Min Payment</Text>
                <MoneyText
                  amount={account.minimumPayment}
                  size="small"
                  style={styles.creditValue}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {account.accountNumberLast4 && (
        <Text style={styles.last4}>****{account.accountNumberLast4}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    ...Typography.bodyBold,
    marginBottom: 2,
  },
  institution: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  balanceRow: {
    marginBottom: Spacing.sm,
  },
  limitText: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  creditDetails: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  utilizationBar: {
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  utilizationFill: {
    height: 4,
    borderRadius: 2,
  },
  creditInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creditInfoItem: {},
  creditLabel: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  creditValue: {
    ...Typography.footnote,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  last4: {
    ...Typography.caption,
    color: COLORS.textTertiary,
    marginTop: Spacing.sm,
  },
});

export default AccountCard;
