// Category breakdown component for DriftMoney

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Spacing, BorderRadius, Typography, CHART_COLORS } from '../../constants';
import { MoneyText } from '../common/MoneyText';
import type { CategorySpending } from '../../services/v2/TrendService';

interface CategoryBreakdownProps {
  categories: CategorySpending[];
  totalAmount?: number;
  onCategoryPress?: (category: CategorySpending) => void;
  maxItems?: number;
  showChart?: boolean;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  totalAmount,
  onCategoryPress,
  maxItems = 5,
  showChart = true,
}) => {
  const displayCategories = categories.slice(0, maxItems);
  const total = totalAmount ?? categories.reduce((sum, c) => sum + c.amount, 0);

  // Simple donut chart simulation using bars
  const renderMiniChart = () => {
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBar}>
          {displayCategories.map((cat, index) => (
            <View
              key={cat.categoryId}
              style={[
                styles.chartSegment,
                {
                  width: `${cat.percentOfTotal}%`,
                  backgroundColor: cat.categoryColor || CHART_COLORS[index % CHART_COLORS.length],
                },
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Spending by Category</Text>
        <MoneyText amount={total} size="medium" />
      </View>

      {showChart && renderMiniChart()}

      <View style={styles.categoryList}>
        {displayCategories.map((category, index) => (
          <Pressable
            key={category.categoryId}
            onPress={() => onCategoryPress?.(category)}
            style={({ pressed }) => [
              styles.categoryRow,
              pressed && styles.categoryRowPressed,
            ]}
          >
            <View style={styles.categoryLeft}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: (category.categoryColor || CHART_COLORS[index % CHART_COLORS.length]) + '20' },
                ]}
              >
                <Ionicons
                  name={category.categoryIcon as any}
                  size={16}
                  color={category.categoryColor || CHART_COLORS[index % CHART_COLORS.length]}
                />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {category.categoryName}
                </Text>
                <Text style={styles.categoryCount}>
                  {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.categoryRight}>
              <MoneyText amount={category.amount} size="small" />
              <Text style={styles.percentText}>{category.percentOfTotal}%</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {categories.length > maxItems && (
        <Pressable style={styles.showMoreButton}>
          <Text style={styles.showMoreText}>
            Show all {categories.length} categories
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.title3,
  },
  chartContainer: {
    marginBottom: Spacing.lg,
  },
  chartBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.gray200,
  },
  chartSegment: {
    height: '100%',
  },
  categoryList: {},
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoryRowPressed: {
    backgroundColor: COLORS.gray50,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...Typography.body,
    marginBottom: 1,
  },
  categoryCount: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  percentText: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  showMoreText: {
    ...Typography.footnote,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
});

export default CategoryBreakdown;
