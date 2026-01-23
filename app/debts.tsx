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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseService } from '../src/services/DatabaseService';
import { Debt } from '../src/types';

export default function DebtsScreen() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [company, setCompany] = useState('');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');

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

  const openAddModal = () => {
    setEditingDebt(null);
    setCompany('');
    setBalance('');
    setNotes('');
    setModalVisible(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setCompany(debt.company);
    setBalance(debt.balance.toString());
    setNotes(debt.notes || '');
    setModalVisible(true);
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

    const today = new Date().toISOString().split('T')[0];

    if (editingDebt) {
      // Update existing debt
      const updatedDebt: Debt = {
        ...editingDebt,
        company: company.trim(),
        balance: balanceNum,
        lastUpdated: today,
        notes: notes.trim() || undefined,
      };
      DatabaseService.updateDebt(updatedDebt);
    } else {
      // Add new debt
      const newDebt: Debt = {
        id: DatabaseService.generateUUID(),
        company: company.trim(),
        balance: balanceNum,
        lastUpdated: today,
        notes: notes.trim() || undefined,
        syncStatus: 'dirty',
      };
      DatabaseService.addDebt(newDebt);
    }

    setModalVisible(false);
    loadDebts();
  };

  const handleDeleteDebt = (debt: Debt) => {
    Alert.alert(
      'Delete Debt',
      `Are you sure you want to delete "${debt.company}"?`,
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

  const renderRightActions = (debt: Debt) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDeleteDebt(debt)}
    >
      <Ionicons name="trash" size={24} color="#FFF" />
      <Text style={styles.actionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderDebt = ({ item }: { item: Debt }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity
        style={styles.debtCard}
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.debtMain}>
          <View style={styles.debtInfo}>
            <Text style={styles.debtCompany}>{item.company}</Text>
            <Text style={styles.debtDate}>
              Updated: {formatDate(item.lastUpdated)}
            </Text>
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

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Balance</Text>
                <TextInput
                  style={styles.input}
                  placeholder="$0.00"
                  value={balance}
                  onChangeText={setBalance}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#8E8E93"
                />
              </View>

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

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingDebt ? 'Update Debt' : 'Add Debt'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
