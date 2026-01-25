import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../../src/services/DatabaseService';
import { Bill, Debt } from '../../src/types';

export default function DraftScreen() {
  const [runningBalance, setRunningBalance] = useState(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [paidWeekTotal, setPaidWeekTotal] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [unpaidBillsModalVisible, setUnpaidBillsModalVisible] = useState(false);
  const [upcomingDebtPayments, setUpcomingDebtPayments] = useState<Debt[]>([]);
  const [upcomingDebtTotal, setUpcomingDebtTotal] = useState(0);

  const loadData = useCallback(() => {
    DatabaseService.init();

    // Get running balance from all transactions
    const balance = DatabaseService.getRunningBalance();
    setRunningBalance(balance);

    // Get bills for display
    const loadedBills = DatabaseService.getBillsForCurrentMonth();
    setBills(loadedBills);

    const unpaidSum = loadedBills
      .filter((b) => !b.isPaid)
      .reduce((sum, b) => sum + b.amount, 0);
    setPendingTotal(unpaidSum);

    // Get bills paid this week
    const paidThisWeek = DatabaseService.getBillsPaidThisWeek();
    const paidWeekSum = paidThisWeek.reduce((sum, b) => sum + b.amount, 0);
    setPaidWeekTotal(paidWeekSum);

    // Get total debt
    const debt = DatabaseService.getTotalDebt();
    setTotalDebt(debt);

    // Get recurring debt payments due within 14 days
    const upcomingDebts = DatabaseService.getRecurringDebtsDueWithin(14);
    setUpcomingDebtPayments(upcomingDebts);
    const debtPaymentTotal = DatabaseService.getUpcomingDebtPaymentsTotal(14);
    setUpcomingDebtTotal(debtPaymentTotal);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unpaidBills = bills.filter((b) => !b.isPaid);
  const unpaidCount = unpaidBills.length;
  const upcomingDebtCount = upcomingDebtPayments.length;
  const totalUpcomingCount = unpaidCount + upcomingDebtCount;
  const totalUpcomingAmount = pendingTotal + upcomingDebtTotal;

  // Safe to spend = running balance - unpaid bills - upcoming debt payments
  const safeToSpend = runningBalance - totalUpcomingAmount;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>The Draft</Text>
          <Text style={styles.subtitle}>Your financial snapshot</Text>
        </View>

        <View style={[
          styles.balanceCard,
          runningBalance < 0 && styles.balanceCardNegative
        ]}>
          <Text style={styles.balanceLabel}>Running Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(runningBalance)}
          </Text>
          <Text style={styles.balanceNote}>From all transactions</Text>
        </View>

        <View style={styles.summaryCard}>
          <TouchableOpacity
            style={styles.summaryRow}
            onPress={() => setUnpaidBillsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryLabel}>Upcoming ({totalUpcomingCount})</Text>
            <View style={styles.summaryRight}>
              <Text style={[styles.summaryValue, styles.textPending]}>
                {formatCurrency(totalUpcomingAmount)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid This Week</Text>
            <Text style={[styles.summaryValue, styles.textPaid]}>
              {formatCurrency(paidWeekTotal)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.resultCard,
            safeToSpend >= 0 ? styles.resultPositive : styles.resultNegative,
          ]}
        >
          <Text style={styles.resultLabel}>Safe to Spend</Text>
          <Text
            style={[
              styles.resultAmount,
              safeToSpend >= 0 ? styles.textPositive : styles.textNegativeResult,
            ]}
          >
            {formatCurrency(safeToSpend)}
          </Text>
          <Text style={styles.resultNote}>Balance minus upcoming payments</Text>
        </View>

        <View style={styles.debtCard}>
          <Text style={styles.debtLabel}>Debt Snapshot</Text>
          <Text style={styles.debtAmount}>{formatCurrency(totalDebt)}</Text>
          <Text style={styles.debtNote}>Total across all debt accounts</Text>
        </View>
      </ScrollView>

      {/* Unpaid Bills Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={unpaidBillsModalVisible}
        onRequestClose={() => setUnpaidBillsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upcoming Payments</Text>
              <TouchableOpacity
                onPress={() => setUnpaidBillsModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={28} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTotalCard}>
              <Text style={styles.modalTotalLabel}>Total Due</Text>
              <Text style={styles.modalTotalAmount}>
                {formatCurrency(totalUpcomingAmount)}
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {/* Unpaid Bills Section */}
              {unpaidBills.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Bills ({unpaidCount})</Text>
                  {unpaidBills.map((item) => (
                    <View key={item.id} style={styles.modalBillRow}>
                      <View>
                        <Text style={styles.modalBillName}>{item.name}</Text>
                        <Text style={styles.modalBillDue}>Due on the {item.dueDay}th</Text>
                      </View>
                      <Text style={styles.modalBillAmount}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Debt Payments Section */}
              {upcomingDebtPayments.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Debt Payments ({upcomingDebtCount})</Text>
                  {upcomingDebtPayments.map((item) => (
                    <View key={item.id} style={styles.modalDebtRow}>
                      <View>
                        <Text style={styles.modalBillName}>{item.company}</Text>
                        <Text style={styles.modalBillDue}>
                          Due {item.nextPaymentDate ? formatDateShort(item.nextPaymentDate) : 'soon'}
                        </Text>
                      </View>
                      <View style={styles.modalDebtAmounts}>
                        {item.minimumPayment && (
                          <Text style={styles.modalDebtPayment}>
                            {formatCurrency(item.minimumPayment)}
                          </Text>
                        )}
                        <Text style={styles.modalDebtBalance}>
                          Bal: {formatCurrency(item.balance)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {unpaidBills.length === 0 && upcomingDebtPayments.length === 0 && (
                <Text style={styles.modalEmpty}>No upcoming payments</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceCardNegative: {
    backgroundColor: '#FF3B30',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFF',
  },
  balanceNote: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 17,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  textPending: {
    color: '#FF3B30',
  },
  textPaid: {
    color: '#34C759',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  resultCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  resultPositive: {
    backgroundColor: '#D4EDDA',
  },
  resultNegative: {
    backgroundColor: '#F8D7DA',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  resultAmount: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  textPositive: {
    color: '#155724',
  },
  textNegativeResult: {
    color: '#721C24',
  },
  resultNote: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
  },
  debtCard: {
    backgroundColor: '#8E8E93',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  debtLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  debtAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  debtNote: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalTotalCard: {
    backgroundColor: '#FF3B30',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTotalAmount: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalBillRow: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBillName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  modalBillDue: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  modalBillAmount: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
  },
  modalEmpty: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 17,
    paddingVertical: 20,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 10,
  },
  modalDebtRow: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  modalDebtAmounts: {
    alignItems: 'flex-end',
  },
  modalDebtPayment: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF9500',
  },
  modalDebtBalance: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
});