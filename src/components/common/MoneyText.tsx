// Money text display component for DriftMoney

import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { Currency } from '../../types';
import { formatMoney } from '../../utils/moneyUtils';
import { COLORS } from '../../constants';

interface MoneyTextProps {
  amount: number;
  currency?: Currency;
  style?: TextStyle;
  colorize?: boolean; // Green for positive, red for negative
  showSign?: boolean;
  compact?: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  currency = 'USD',
  style,
  colorize = false,
  showSign = false,
  compact = false,
  size = 'medium',
}) => {
  const formatted = formatMoney(amount, currency, { showSign, compact });

  const textColor = colorize
    ? amount > 0
      ? COLORS.income
      : amount < 0
      ? COLORS.expense
      : COLORS.text
    : undefined;

  const sizeStyle = styles[size];

  return (
    <Text style={[sizeStyle, textColor && { color: textColor }, style]}>
      {formatted}
    </Text>
  );
};

const styles = StyleSheet.create({
  small: {
    fontSize: 12,
    fontWeight: '500',
  },
  medium: {
    fontSize: 16,
    fontWeight: '600',
  },
  large: {
    fontSize: 24,
    fontWeight: '700',
  },
  xlarge: {
    fontSize: 32,
    fontWeight: '700',
  },
});

export default MoneyText;
