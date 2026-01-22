import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../src/services/DatabaseService';
import { Bill } from '../src/types';

export default function BillsScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadBills = useCallback(() => {
    DatabaseService.init();
    const loadedBills = DatabaseService.getBillsForCurrentMonth();
    setBills(loadedBills);
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
    if (bill.isPaid) {
      // Unmark as paid
      DatabaseService.markBillUnpaid(bill.id);
    } else {
      // Mark as paid and create next month's bill
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
    // It's from a previous month (carried over)
    const [year, month] = billMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return `(from ${date.toLocaleDateString('en-US', { month: 'short' })})`;
  };

  const renderBill = ({ item }: { item: Bill }) => {
    const monthLabel = formatMonthLabel(item.billMonth);
    const isCarriedOver = monthLabel !== '';

    return (
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
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteBill(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  const unpaidBills = bills.filter((b) => !b.isPaid);
  const paidBills = bills.filter((b) => b.isPaid);
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);

  // Get current month name for header
  const currentMonthName = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bills</Text>
          <Text style={styles.monthLabel}>{currentMonthName}</Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryText}>
            {formatCurrency(totalUnpaid)} pending
          </Text>
        </View>
      </View>

      {bills.length === 0 ? (
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
            unpaidBills.length > 0 ? (
              <Text style={styles.sectionHeader}>UNPAID</Text>
            ) : null
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
    </View>
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
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
});
