import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseService } from '../../src/services/DatabaseService';
import { Debt, DebtTransaction, PaymentFrequency } from '../../src/types';

export default function DebtsScreen() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [company, setCompany] = useState('');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  // Recurring payment state
  const [isRecurring, setIsRecurring] = useState(false);
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [minimumPayment, setMinimumPayment] = useState('');

  // Detail modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransaction[]>([]);

  // Transaction modal state
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>('credit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');

  const loadDebts = useCallback(() => {
    DatabaseService.init();
    const loaded = DatabaseService.getDebts();
    setDebts(loaded);
    const total = DatabaseService.getTotalDebt();
    setTotalDebt(total);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDebts();
    }, [loadDebts])
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openAddModal = () => {
    setEditingDebt(null);
    setCompany('');
    setBalance('');
    setNotes('');
    setIsRecurring(false);
    setPaymentDueDay('');
    setPaymentFrequency('monthly');
    setMinimumPayment('');
    setModalVisible(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setCompany(debt.company);
    setBalance(debt.balance.toString());
    setNotes(debt.notes || '');
    setIsRecurring(debt.isRecurring || false);
    setPaymentDueDay(debt.paymentDueDay?.toString() || '');
    setPaymentFrequency(debt.paymentFrequency || 'monthly');
    setMinimumPayment(debt.minimumPayment?.toString() || '');
    setModalVisible(true);
  };

  const openDetailModal = (debt: Debt) => {
    setSelectedDebt(debt);
    const transactions = DatabaseService.getDebtTransactions(debt.id);
    setDebtTransactions(transactions);
    setDetailModalVisible(true);
  };

  const openTransactionModal = (type: 'debit' | 'credit') => {
    setTransactionType(type);
    setTransactionAmount('');
    setTransactionDescription(type === 'credit' ? 'Payment' : '');
    setDetailModalVisible(false); // Close detail modal first
    setTimeout(() => {
      setTransactionModalVisible(true);
    }, 300); // Small delay to let the detail modal close
  };

  const handleSave = () => {
    if (!company.trim()) {
      Alert.alert('Missing Company', 'Please enter a company name');
      return;
    }

    const balanceNum = parseFloat(balance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      Alert.alert('Invalid Balance', 'Please enter a valid balance');
      return;
    }

    // Validate recurring payment fields if enabled
    let dueDayNum: number | undefined;
    let minPaymentNum: number | undefined;

    if (isRecurring) {
      dueDayNum = parseInt(paymentDueDay, 10);
      if (paymentFrequency === 'monthly') {
        if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
          Alert.alert('Invalid Due Day', 'Please enter a day between 1 and 31');
          return;
        }
      } else if (paymentFrequency === 'weekly' || paymentFrequency === 'biweekly') {
        if (isNaN(dueDayNum) || dueDayNum < 0 || dueDayNum > 6) {
          Alert.alert('Invalid Due Day', 'Please enter a day between 0 (Sun) and 6 (Sat)');
          return;
        }
      }

      if (minimumPayment.trim()) {
        minPaymentNum = parseFloat(minimumPayment);
        if (isNaN(minPaymentNum) || minPaymentNum <= 0) {
          Alert.alert('Invalid Minimum Payment', 'Please enter a valid amount');
          return;
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];

    // Calculate next payment date if recurring
    let nextPaymentDate: string | undefined;
    if (isRecurring && dueDayNum !== undefined) {
      nextPaymentDate = DatabaseService.calculateNextPaymentDate(paymentFrequency, dueDayNum);
    }

    if (editingDebt) {
      // Update existing debt
      const updatedDebt: Debt = {
        ...editingDebt,
        company: company.trim(),
        lastUpdated: today,
        notes: notes.trim() || undefined,
        isRecurring,
        paymentDueDay: isRecurring ? dueDayNum : undefined,
        paymentFrequency: isRecurring ? paymentFrequency : undefined,
        minimumPayment: isRecurring ? minPaymentNum : undefined,
        nextPaymentDate: isRecurring ? nextPaymentDate : undefined,
      };
      DatabaseService.updateDebt(updatedDebt);
    } else {
      // Add new debt with initial transaction
      const newDebt: Debt = {
        id: DatabaseService.generateUUID(),
        company: company.trim(),
        balance: balanceNum,
        lastUpdated: today,
        notes: notes.trim() || undefined,
        syncStatus: 'dirty',
        isRecurring,
        paymentDueDay: isRecurring ? dueDayNum : undefined,
        paymentFrequency: isRecurring ? paymentFrequency : undefined,
        minimumPayment: isRecurring ? minPaymentNum : undefined,
        nextPaymentDate: isRecurring ? nextPaymentDate : undefined,
      };
      DatabaseService.addDebtWithTransaction(newDebt);
    }

    setModalVisible(false);
    loadDebts();
  };

  const handleAddTransaction = () => {
    if (!selectedDebt) return;

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount');
      return;
    }

    if (!transactionDescription.trim()) {
      Alert.alert('Missing Description', 'Please enter a description');
      return;
    }

    DatabaseService.addDebtTransaction(
      selectedDebt.id,
      transactionType,
      amount,
      transactionDescription.trim()
    );

    // Refresh data
    const transactions = DatabaseService.getDebtTransactions(selectedDebt.id);
    setDebtTransactions(transactions);

    // Update the selected debt with new balance
    const updatedDebts = DatabaseService.getDebts();
    const updatedDebt = updatedDebts.find(d => d.id === selectedDebt.id);
    if (updatedDebt) {
      setSelectedDebt(updatedDebt);
    }

    loadDebts();
    setTransactionModalVisible(false);

    // Reopen the detail modal after a short delay
    setTimeout(() => {
      setDetailModalVisible(true);
    }, 300);
  };

  const handleDeleteDebt = (debt: Debt) => {
    Alert.alert(
      'Delete Debt',
      `Are you sure you want to delete "${debt.company}" and all its transactions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            DatabaseService.deleteDebt(debt.id);
            loadDebts();
          },
        },
      ]
    );
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'initial': return 'Initial Balance';
      case 'debit': return 'Charge';
      case 'credit': return 'Payment';
      default: return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'initial': return '#8E8E93';
      case 'debit': return '#FF3B30';
      case 'credit': return '#34C759';
      default: return '#000';
    }
  };

  const renderRightActions = (debt: Debt) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDeleteDebt(debt)}
    >
      <Ionicons name="trash" size={24} color="#FFF" />
      <Text style={styles.actionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderDebt = ({ item }: { item: Debt }) => {
    const daysUntilPayment = item.nextPaymentDate ? getDaysUntil(item.nextPaymentDate) : null;
    const isDueSoon = daysUntilPayment !== null && daysUntilPayment <= 7 && daysUntilPayment >= 0;
    const isOverdue = daysUntilPayment !== null && daysUntilPayment < 0;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity
          style={styles.debtCard}
          onPress={() => openDetailModal(item)}
          activeOpacity={0.7}
        >
          <View style={styles.debtMain}>
            <View style={styles.debtInfo}>
              <View style={styles.debtTitleRow}>
                <Text style={styles.debtCompany}>{item.company}</Text>
                {item.isRecurring && (
                  <View style={[
                    styles.recurringBadge,
                    isDueSoon && styles.recurringBadgeDueSoon,
                    isOverdue && styles.recurringBadgeOverdue,
                  ]}>
                    <Ionicons name="refresh" size={10} color="#FFF" />
                  </View>
                )}
              </View>
              {item.isRecurring && item.nextPaymentDate ? (
                <Text style={[
                  styles.debtDate,
                  isDueSoon && styles.dueSoonText,
                  isOverdue && styles.overdueText,
                ]}>
                  {isOverdue
                    ? `Overdue by ${Math.abs(daysUntilPayment!)} day${Math.abs(daysUntilPayment!) !== 1 ? 's' : ''}`
                    : daysUntilPayment === 0
                    ? 'Due today'
                    : daysUntilPayment === 1
                    ? 'Due tomorrow'
                    : `Due ${formatShortDate(item.nextPaymentDate)} (${daysUntilPayment}d)`}
                  {item.minimumPayment ? ` • Min: ${formatCurrency(item.minimumPayment)}` : ''}
                </Text>
              ) : (
                <Text style={styles.debtDate}>
                  Updated: {formatDate(item.lastUpdated)}
                </Text>
              )}
              {item.notes && (
                <Text style={styles.debtNotes} numberOfLines={1}>
                  {item.notes}
                </Text>
              )}
            </View>
            <Text style={styles.debtBalance}>{formatCurrency(item.balance)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderTransaction = ({ item }: { item: DebtTransaction }) => (
    <View style={styles.transactionRow}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.transactionAmounts}>
        <Text style={[styles.transactionAmount, { color: getTransactionColor(item.type) }]}>
          {item.type === 'credit' ? '-' : item.type === 'debit' ? '+' : ''}{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.transactionBalance}>Bal: {formatCurrency(item.balanceAfter)}</Text>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Debts</Text>
          <Text style={styles.subtitle}>Track your debt balances</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Debt</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalDebt)}</Text>
        <Text style={styles.totalCount}>{debts.length} account{debts.length !== 1 ? 's' : ''}</Text>
      </View>

      {debts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Debts Tracked</Text>
          <Text style={styles.emptySubtitle}>
            Add credit cards, loans, or other debts to track
          </Text>
        </View>
      ) : (
        <FlatList
          data={debts}
          keyExtractor={(item) => item.id}
          renderItem={renderDebt}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add Debt Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingDebt ? 'Edit Debt' : 'Add Debt'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={28} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Company / Creditor</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Chase, Discover, Student Loan"
                      value={company}
                      onChangeText={setCompany}
                      placeholderTextColor="#8E8E93"
                      autoCapitalize="words"
                    />
                  </View>

                  {!editingDebt && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Starting Balance</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="$0.00"
                        value={balance}
                        onChangeText={setBalance}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.input, styles.notesInput]}
                      placeholder="e.g., 0% APR until Dec 2025"
                      value={notes}
                      onChangeText={setNotes}
                      placeholderTextColor="#8E8E93"
                      multiline
                    />
                  </View>

                  {/* Recurring Payment Toggle */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleLabel}>Recurring Payment</Text>
                      <Text style={styles.toggleDescription}>
                        Track payment due dates
                      </Text>
                    </View>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                      thumbColor="#FFF"
                    />
                  </View>

                  {/* Recurring Payment Fields */}
                  {isRecurring && (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Payment Frequency</Text>
                        <View style={styles.frequencySelector}>
                          {(['monthly', 'biweekly', 'weekly', 'daily'] as PaymentFrequency[]).map((freq) => (
                            <TouchableOpacity
                              key={freq}
                              style={[
                                styles.frequencyButton,
                                paymentFrequency === freq && styles.frequencyButtonActive,
                              ]}
                              onPress={() => setPaymentFrequency(freq)}
                            >
                              <Text
                                style={[
                                  styles.frequencyButtonText,
                                  paymentFrequency === freq && styles.frequencyButtonTextActive,
                                ]}
                              >
                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                          {paymentFrequency === 'monthly'
                            ? 'Due Day of Month (1-31)'
                            : paymentFrequency === 'daily'
                            ? 'Not Required for Daily'
                            : 'Due Day of Week (0=Sun, 6=Sat)'}
                        </Text>
                        {paymentFrequency !== 'daily' && (
                          <TextInput
                            style={styles.input}
                            placeholder={paymentFrequency === 'monthly' ? '15' : '1'}
                            value={paymentDueDay}
                            onChangeText={setPaymentDueDay}
                            keyboardType="number-pad"
                            placeholderTextColor="#8E8E93"
                            maxLength={2}
                          />
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Minimum Payment (optional)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="$0.00"
                          value={minimumPayment}
                          onChangeText={setMinimumPayment}
                          keyboardType="decimal-pad"
                          placeholderTextColor="#8E8E93"
                        />
                      </View>
                    </>
                  )}

                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>
                      {editingDebt ? 'Update Debt' : 'Add Debt'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Debt Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.detailModalContent]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedDebt?.company}</Text>
                <Text style={styles.modalSubtitle}>
                  Current Balance: {formatCurrency(selectedDebt?.balance || 0)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={28} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.creditButton]}
                onPress={() => openTransactionModal('credit')}
              >
                <Ionicons name="remove-circle" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.debitButton]}
                onPress={() => openTransactionModal('debit')}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Charge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  setDetailModalVisible(false);
                  if (selectedDebt) openEditModal(selectedDebt);
                }}
              >
                <Ionicons name="pencil" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Transaction History */}
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <FlatList
              data={debtTransactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransaction}
              contentContainerStyle={styles.transactionList}
              ListEmptyComponent={
                <Text style={styles.emptyTransactions}>No transactions yet</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={transactionModalVisible}
        onRequestClose={() => setTransactionModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {transactionType === 'credit' ? 'Record Payment' : 'Record Charge'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setTransactionModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={28} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="$0.00"
                      value={transactionAmount}
                      onChangeText={setTransactionAmount}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#8E8E93"
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={transactionType === 'credit' ? 'e.g., Monthly payment' : 'e.g., Purchase'}
                      value={transactionDescription}
                      onChangeText={setTransactionDescription}
                      placeholderTextColor="#8E8E93"
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      transactionType === 'credit' ? styles.creditSaveButton : styles.debitSaveButton
                    ]}
                    onPress={handleAddTransaction}
                  >
                    <Text style={styles.saveButtonText}>
                      {transactionType === 'credit' ? 'Record Payment' : 'Record Charge'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalCard: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFF',
  },
  totalCount: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  debtCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtInfo: {
    flex: 1,
    marginRight: 12,
  },
  debtCompany: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  debtDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  debtNotes: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
  debtBalance: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
    marginBottom: 10,
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
    paddingBottom: 34,
  },
  detailModalContent: {
    maxHeight: '85%',
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
  modalSubtitle: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 2,
  },
  formContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#000',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  creditSaveButton: {
    backgroundColor: '#34C759',
  },
  debitSaveButton: {
    backgroundColor: '#FF3B30',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // Detail modal styles
  actionButtonsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  creditButton: {
    backgroundColor: '#34C759',
  },
  debitButton: {
    backgroundColor: '#FF3B30',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  transactionList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionRow: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  transactionDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmounts: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionBalance: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyTransactions: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 15,
    paddingVertical: 20,
  },
  // Recurring payment styles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  frequencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  frequencyButtonTextActive: {
    color: '#FFF',
  },
  debtTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringBadge: {
    backgroundColor: '#007AFF',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringBadgeDueSoon: {
    backgroundColor: '#FF9500',
  },
  recurringBadgeOverdue: {
    backgroundColor: '#FF3B30',
  },
  dueSoonText: {
    color: '#FF9500',
    fontWeight: '600',
  },
  overdueText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});
