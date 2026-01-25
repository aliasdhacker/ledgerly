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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../../src/services/DatabaseService';
import { Transaction } from '../../src/types';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'credit'>('expense');
  const [runningBalance, setRunningBalance] = useState(0);

  const loadData = useCallback(() => {
    DatabaseService.init();
    // Get ALL transactions for full history
    const loaded = DatabaseService.getAllTransactions();
    setTransactions(loaded);
    const balance = DatabaseService.getRunningBalance();
    setRunningBalance(balance);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddTransaction = () => {
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please enter a description');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const newTransaction: Transaction = {
      id: DatabaseService.generateUUID(),
      description: description.trim(),
      amount: amountNum,
      type: transactionType,
      date: new Date().toISOString().split('T')[0],
    };

    DatabaseService.addTransaction(newTransaction);
    setDescription('');
    setAmount('');
    loadData();
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    // Don't allow deleting bill_paid transactions from here
    if (transaction.type === 'bill_paid') {
      Alert.alert(
        'Cannot Delete',
        'Bill payments can only be undone from the Bills screen by unchecking the bill.'
      );
      return;
    }

    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${transaction.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            DatabaseService.deleteTransaction(transaction.id);
            loadData();
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTransactionIcon = (type: Transaction['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'income':
        return 'wallet';
      case 'bill_paid':
        return 'receipt';
      case 'expense':
        return 'arrow-down';
      case 'credit':
        return 'arrow-up';
      default:
        return 'cash';
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return '#007AFF';
      case 'bill_paid':
        return '#FF9500';
      case 'expense':
        return '#FF3B30';
      case 'credit':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const isCredit = (type: Transaction['type']) => {
    return type === 'income' || type === 'credit';
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <TouchableOpacity
        style={styles.transactionContent}
        onLongPress={() => handleDeleteTransaction(item)}
        delayLongPress={500}
      >
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.typeIndicator,
              { backgroundColor: getTransactionColor(item.type) },
            ]}
          >
            <Ionicons
              name={getTransactionIcon(item.type)}
              size={16}
              color="#FFF"
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>{item.description}</Text>
            <Text style={styles.transactionMeta}>
              {formatDate(item.date)} • {item.type.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: getTransactionColor(item.type) },
          ]}
        >
          {isCredit(item.type) ? '+' : '-'}
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
      {item.type !== 'bill_paid' && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTransaction(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Ledger</Text>
          <Text style={styles.subtitle}>All transactions</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Running Balance</Text>
          <Text style={[
            styles.balanceAmount,
            runningBalance < 0 && styles.negativeBalance
          ]}>
            {formatCurrency(runningBalance)}
          </Text>
        </View>

        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === 'expense' && styles.typeButtonActiveExpense,
              ]}
              onPress={() => setTransactionType('expense')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === 'expense' && styles.typeButtonTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                transactionType === 'credit' && styles.typeButtonActiveCredit,
              ]}
              onPress={() => setTransactionType('credit')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === 'credit' && styles.typeButtonTextActive,
                ]}
              >
                Credit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#8E8E93"
            />
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="$0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor="#8E8E93"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              transactionType === 'expense' ? styles.addButtonExpense : styles.addButtonCredit,
            ]}
            onPress={handleAddTransaction}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>
              Add {transactionType === 'expense' ? 'Expense' : 'Credit'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>History</Text>
          <Text style={styles.historyCount}>{transactions.length} transactions</Text>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Add income or expenses to get started</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
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
  balanceCard: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  negativeBalance: {
    color: '#FFD60A',
  },
  addSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonActiveExpense: {
    backgroundColor: '#FF3B30',
  },
  typeButtonActiveCredit: {
    backgroundColor: '#34C759',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
    color: '#000',
  },
  descriptionInput: {
    flex: 2,
  },
  amountInput: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  addButtonExpense: {
    backgroundColor: '#FF3B30',
  },
  addButtonCredit: {
    backgroundColor: '#34C759',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  historyCount: {
    fontSize: 15,
    color: '#8E8E93',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  transactionMeta: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
  },
});
