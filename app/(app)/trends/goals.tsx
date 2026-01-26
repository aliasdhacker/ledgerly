import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles, GOAL_COLORS } from '../../../src/constants';
import { MoneyText, Card, LoadingSpinner, EmptyState, ProgressBar } from '../../../src/components';
import { useGoals } from '../../../src/hooks/v2';
import type { GoalProgress } from '../../../src/types/goal';

export default function GoalsScreen() {
  const { goals, progress, summary, loading, refresh, addAmount } = useGoals();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalProgress | null>(null);
  const [addAmountValue, setAddAmountValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleAddFunds = () => {
    if (!selectedGoal) return;

    const amount = parseFloat(addAmountValue);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const result = addAmount(selectedGoal.goal.id, amount);
    if (result.success) {
      setShowAddModal(false);
      setSelectedGoal(null);
      setAddAmountValue('');
    } else {
      Alert.alert('Error', result.errors?.join('\n') || 'Failed to add funds');
    }
  };

  const openAddModal = (goalProgress: GoalProgress) => {
    setSelectedGoal(goalProgress);
    setAddAmountValue('');
    setShowAddModal(true);
  };

  if (loading && goals.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Summary Card */}
        {summary && (summary.activeGoalsCount + summary.completedGoalsCount) > 0 && (
          <Card style={styles.summaryCard} variant="elevated">
            <Text style={styles.summaryTitle}>Total Saved</Text>
            <MoneyText amount={summary.totalSavedAmount} size="xlarge" style={styles.savedAmount} />
            <Text style={styles.summarySubtitle}>
              across {summary.activeGoalsCount} active goal{summary.activeGoalsCount !== 1 ? 's' : ''}
            </Text>
          </Card>
        )}

        {/* Goals List */}
        {progress.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="No Goals"
            message="Set your first savings goal"
          />
        ) : (
          progress.map((item, index) => {
            const goalColor = item.goal.color || GOAL_COLORS[index % GOAL_COLORS.length];
            return (
              <Card key={item.goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleRow}>
                    <View style={[styles.goalIcon, { backgroundColor: goalColor + '20' }]}>
                      <Ionicons
                        name={(item.goal.icon as any) || 'flag'}
                        size={24}
                        color={goalColor}
                      />
                    </View>
                    <View style={styles.goalTitleContent}>
                      <Text style={styles.goalName}>{item.goal.name}</Text>
                      {item.goal.targetDate && (
                        <Text style={styles.goalDate}>
                          Target: {new Date(item.goal.targetDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                  {item.goal.isCompleted && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark" size={14} color={COLORS.white} />
                    </View>
                  )}
                </View>

                <View style={styles.goalAmounts}>
                  <MoneyText amount={item.goal.currentAmount} size="large" />
                  <Text style={styles.goalOf}>of</Text>
                  <MoneyText amount={item.goal.targetAmount} size="large" style={styles.goalTarget} />
                </View>

                <ProgressBar
                  progress={item.percentComplete / 100}
                  color={item.goal.isCompleted ? COLORS.success : goalColor}
                  style={styles.goalProgress}
                />

                <View style={styles.goalFooter}>
                  <View style={styles.goalStats}>
                    <Text style={styles.goalPercent}>{item.percentComplete.toFixed(0)}% complete</Text>
                    {item.requiredMonthlyAmount && !item.goal.isCompleted && (
                      <Text style={styles.goalRequired}>
                        ${item.requiredMonthlyAmount.toFixed(0)}/mo to reach goal
                      </Text>
                    )}
                    {!item.onTrack && !item.goal.isCompleted && item.goal.targetDate && (
                      <View style={styles.behindBadge}>
                        <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
                        <Text style={styles.behindText}>Behind schedule</Text>
                      </View>
                    )}
                  </View>

                  {!item.goal.isCompleted && (
                    <Pressable
                      style={styles.addFundsButton}
                      onPress={() => openAddModal(item)}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                      <Text style={styles.addFundsText}>Add</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => {}}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </Pressable>

      {/* Add Funds Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Funds</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            {selectedGoal && (
              <>
                <Text style={styles.modalGoalName}>{selectedGoal.goal.name}</Text>
                <Text style={styles.modalGoalProgress}>
                  ${selectedGoal.goal.currentAmount.toFixed(0)} of ${selectedGoal.goal.targetAmount.toFixed(0)}
                </Text>

                <Text style={styles.modalLabel}>Amount to Add</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={addAmountValue}
                    onChangeText={setAddAmountValue}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>

                <Pressable style={styles.confirmButton} onPress={handleAddFunds}>
                  <Text style={styles.confirmButtonText}>Add Funds</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  summaryTitle: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  savedAmount: {
    color: COLORS.success,
    marginBottom: Spacing.xs,
  },
  summarySubtitle: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  goalCard: {
    marginBottom: Spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  goalTitleContent: {
    flex: 1,
  },
  goalName: {
    ...Typography.bodyBold,
  },
  goalDate: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  goalOf: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  goalTarget: {
    color: COLORS.textSecondary,
  },
  goalProgress: {
    marginBottom: Spacing.md,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  goalStats: {
    flex: 1,
  },
  goalPercent: {
    ...Typography.caption,
    color: COLORS.textSecondary,
  },
  goalRequired: {
    ...Typography.caption,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  behindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  behindText: {
    ...Typography.caption,
    color: COLORS.warning,
  },
  addFundsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addFundsText: {
    ...Typography.footnote,
    color: COLORS.primary,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
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
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.title3,
  },
  modalGoalName: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  modalGoalProgress: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
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
  confirmButton: {
    ...CommonStyles.button,
  },
  confirmButtonText: {
    ...CommonStyles.buttonText,
  },
});
