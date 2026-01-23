import { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseService } from '../src/services/DatabaseService';
import { Bill, Debt } from '../src/types';

export default function BillsScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [upcomingDebtPayments, setUpcomingDebtPayments] = useState<Debt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const loadBills = useCallback(() => {
    DatabaseService.init();
    const loadedBills = DatabaseService.getBillsForCurrentMonth();
    setBills(loadedBills);

    // Load recurring debt payments due within 14 days
    const upcomingDebts = DatabaseService.getRecurringDebtsDueWithin(14);
    setUpcomingDebtPayments(upcomingDebts);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBills();
    setRefreshing(false);
  };

  const togglePaid = (bill: Bill) => {
    // Close any open swipeable
    swipeableRefs.current.get(bill.id)?.close();

    if (bill.isPaid) {
      DatabaseService.markBillUnpaid(bill.id);
    } else {
      DatabaseService.markBillPaid(bill);
    }
    loadBills();
  };

  const handleDeleteBill = (bill: Bill) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete "${bill.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            DatabaseService.deleteBill(bill.id);
            loadBills();
          },
        },
      ]
    );
  };

  const handlePayDebt = (debt: Debt) => {
    const paymentAmount = debt.minimumPayment || 0;

    if (paymentAmount <= 0) {
      // No minimum payment set, ask user for amount
      Alert.alert(
        'Record Payment',
        `Enter the payment amount for ${debt.company} in the Debts tab.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Record Payment',
      `Record a payment of ${formatCurrency(paymentAmount)} to ${debt.company}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: () => {
            DatabaseService.addDebtTransaction(
              debt.id,
              'credit',
              paymentAmount,
              'Monthly payment'
            );
            loadBills();
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatMonthLabel = (billMonth: string): string => {
    const currentMonth = DatabaseService.getCurrentMonth();
    if (billMonth === currentMonth) {
      return '';
    }
    const [year, month] = billMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return `(from ${date.toLocaleDateString('en-US', { month: 'short' })})`;
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    bill: Bill
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeActions, { opacity }]}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDeleteBill(bill)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash" size={24} color="#FFF" />
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    bill: Bill
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [0, 50, 100],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp',
    });

    const isPaid = bill.isPaid;
    const actionColor = isPaid ? '#FF9500' : '#34C759';
    const actionIcon = isPaid ? 'close-circle' : 'checkmark-circle';
    const actionLabel = isPaid ? 'Unpaid' : 'Paid';

    return (
      <Animated.View style={[styles.swipeActions, styles.leftActions, { opacity }]}>
        <TouchableOpacity
          style={[styles.paidAction, { backgroundColor: actionColor }]}
          onPress={() => togglePaid(bill)}
        >
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <Ionicons name={actionIcon} size={24} color="#FFF" />
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderBill = ({ item }: { item: Bill }) => {
    const monthLabel = formatMonthLabel(item.billMonth);
    const isCarriedOver = monthLabel !== '';

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          }
        }}
        renderRightActions={(progress, dragX) =>
          renderRightActions(progress, dragX, item)
        }
        renderLeftActions={(progress, dragX) =>
          renderLeftActions(progress, dragX, item)
        }
        onSwipeableOpen={(direction) => {
          if (direction === 'left') {
            togglePaid(item);
          }
        }}
        rightThreshold={40}
        leftThreshold={40}
        overshootRight={false}
        overshootLeft={false}
      >
        <View
          style={[
            styles.billCard,
            item.isPaid && styles.billCardPaid,
            isCarriedOver && styles.billCardOverdue,
          ]}
        >
          <TouchableOpacity
            style={styles.billContent}
            onPress={() => togglePaid(item)}
            activeOpacity={0.7}
          >
            <View style={styles.billLeft}>
              <View style={[styles.checkbox, item.isPaid && styles.checkboxChecked]}>
                {item.isPaid && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
              <View style={styles.billInfo}>
                <Text style={[styles.billName, item.isPaid && styles.textPaid]}>
                  {item.name}
                </Text>
                <Text style={[styles.billDue, isCarriedOver && styles.textOverdue]}>
                  Due on the {item.dueDay}th {monthLabel}
                </Text>
              </View>
            </View>
            <Text style={[styles.billAmount, item.isPaid && styles.textPaid]}>
              {formatCurrency(item.amount)}
            </Text>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  const renderDebtPayment = ({ item }: { item: Debt }) => {
    const daysUntil = item.nextPaymentDate ? getDaysUntil(item.nextPaymentDate) : null;
    const isDueSoon = daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;
    const isOverdue = daysUntil !== null && daysUntil < 0;

    return (
      <TouchableOpacity
        style={[
          styles.debtPaymentCard,
          isDueSoon && styles.debtPaymentCardDueSoon,
          isOverdue && styles.debtPaymentCardOverdue,
        ]}
        onPress={() => handlePayDebt(item)}
        activeOpacity={0.7}
      >
        <View style={styles.debtPaymentContent}>
          <View style={styles.debtPaymentLeft}>
            <View style={styles.debtCheckbox}>
              <Ionicons name="checkmark" size={16} color="#FFF" style={{ opacity: 0 }} />
            </View>
            <View style={styles.debtPaymentInfo}>
              <Text style={styles.debtPaymentName}>{item.company}</Text>
              <Text style={[
                styles.debtPaymentDue,
                isDueSoon && styles.textDueSoon,
                isOverdue && styles.textOverdue,
              ]}>
                {isOverdue
                  ? `Overdue by ${Math.abs(daysUntil!)} day${Math.abs(daysUntil!) !== 1 ? 's' : ''}`
                  : daysUntil === 0
                  ? 'Due today'
                  : daysUntil === 1
                  ? 'Due tomorrow'
                  : `Due ${formatShortDate(item.nextPaymentDate!)} (${daysUntil}d)`}
              </Text>
            </View>
          </View>
          <View style={styles.debtPaymentAmounts}>
            {item.minimumPayment && (
              <Text style={styles.debtPaymentMinimum}>
                {formatCurrency(item.minimumPayment)}
              </Text>
            )}
            <Text style={styles.debtPaymentBalance}>
              Bal: {formatCurrency(item.balance)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const unpaidBills = bills.filter((b) => !b.isPaid);
  const paidBills = bills.filter((b) => b.isPaid);
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);
  const totalDebtPayments = upcomingDebtPayments.reduce((sum, d) => sum + (d.minimumPayment || 0), 0);

  const currentMonthName = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bills</Text>
          <Text style={styles.monthLabel}>{currentMonthName}</Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryText}>
            {formatCurrency(totalUnpaid + totalDebtPayments)} pending
          </Text>
        </View>
      </View>

      <View style={styles.swipeHint}>
        <Ionicons name="swap-horizontal" size={14} color="#8E8E93" />
        <Text style={styles.swipeHintText}>Swipe left to delete, right to mark paid</Text>
      </View>

      {bills.length === 0 && upcomingDebtPayments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Bills Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first bill to start tracking
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...unpaidBills, ...paidBills]}
          keyExtractor={(item) => item.id}
          renderItem={renderBill}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              {upcomingDebtPayments.length > 0 && (
                <View style={styles.debtPaymentsSection}>
                  <Text style={styles.sectionHeader}>UPCOMING DEBT PAYMENTS</Text>
                  {upcomingDebtPayments.map((debt) => (
                    <View key={debt.id}>
                      {renderDebtPayment({ item: debt })}
                    </View>
                  ))}
                </View>
              )}
              {unpaidBills.length > 0 && (
                <Text style={styles.sectionHeader}>UNPAID BILLS</Text>
              )}
            </>
          }
          ListFooterComponent={
            paidBills.length > 0 ? (
              <View>
                <Text style={[styles.sectionHeader, styles.paidSection]}>
                  PAID THIS MONTH - {formatCurrency(totalPaid)}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
  },
  monthLabel: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 2,
  },
  summaryBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
  },
  paidSection: {
    marginTop: 20,
    color: '#34C759',
  },
  billCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  billContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  billCardPaid: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  billCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  billDue: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  textOverdue: {
    color: '#FF9500',
  },
  billAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  textPaid: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  swipeActions: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftActions: {
    marginRight: 0,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
  },
  paidAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  // Debt payment styles
  debtPaymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  debtPaymentCardDueSoon: {
    borderLeftColor: '#FF9500',
  },
  debtPaymentCardOverdue: {
    borderLeftColor: '#FF3B30',
  },
  debtPaymentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  debtPaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  debtCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9500',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debtPaymentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debtPaymentIconDueSoon: {
    backgroundColor: '#FF9500',
  },
  debtPaymentIconOverdue: {
    backgroundColor: '#FF3B30',
  },
  debtPaymentInfo: {
    flex: 1,
  },
  debtPaymentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  debtPaymentDue: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  textDueSoon: {
    color: '#FF9500',
    fontWeight: '600',
  },
  debtPaymentAmounts: {
    alignItems: 'flex-end',
  },
  debtPaymentMinimum: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF9500',
  },
  debtPaymentBalance: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  debtPaymentsSection: {
    marginBottom: 10,
  },
});
