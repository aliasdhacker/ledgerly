import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DatabaseService } from '../src/services/DatabaseService';
import { Transaction } from '../src/types';

export default function IncomeScreen() {
  const [incomeAmount, setIncomeAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);

  const loadBalance = useCallback(() => {
    DatabaseService.init();
    const balance = DatabaseService.getRunningBalance();
    setCurrentBalance(balance);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [loadBalance])
  );

  const handleAddIncome = () => {
    const income = parseFloat(incomeAmount);
    if (isNaN(income) || income <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid income amount');
      return;
    }

    const newTransaction: Transaction = {
      id: DatabaseService.generateUUID(),
      description: description.trim() || 'Income',
      amount: income,
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      category: 'Income',
    };

    DatabaseService.addTransaction(newTransaction);
    setIncomeAmount('');
    setDescription('');
    loadBalance();

    Alert.alert(
      'Income Added',
      `${formatCurrency(income)} has been added to your balance`
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Income</Text>
            <Text style={styles.subtitle}>Add income to your ledger</Text>
          </View>

          <View style={styles.currentBalanceCard}>
            <Text style={styles.currentBalanceLabel}>Running Balance</Text>
            <Text style={[
              styles.currentBalanceAmount,
              currentBalance < 0 && styles.negativeBalance
            ]}>
              {formatCurrency(currentBalance)}
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={styles.inputDescription}
              placeholder="e.g., Paycheck, Bonus"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#8E8E93"
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="$0.00"
              keyboardType="decimal-pad"
              value={incomeAmount}
              onChangeText={setIncomeAmount}
              placeholderTextColor="#8E8E93"
            />
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddIncome}>
            <Text style={styles.addButtonText}>Add Income</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  currentBalanceCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
  },
  currentBalanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentBalanceAmount: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFF',
  },
  negativeBalance: {
    color: '#FFD60A',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputDescription: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#000',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
