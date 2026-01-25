import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OCRService, DocumentType, OCRResult } from '../../src/services/OCRService';
import { DatabaseService } from '../../src/services/DatabaseService';
import { Transaction } from '../../src/types';

type ImportStep = 'select' | 'scanning' | 'preview' | 'importing' | 'complete';

export default function ImportScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>('select');
  const [result, setResult] = useState<OCRResult | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleScanDocument = async (docType: DocumentType) => {
    setStep('scanning');
    setError(null);

    // First check if OCR service is reachable
    const health = await OCRService.checkHealth();
    if (!health || health.api !== 'healthy') {
      console.error('OCR health check failed:', health);
      setError('Unable to connect to the scanning service. Please try again later.');
      setStep('select');
      return;
    }

    // Scan the document
    const ocrResult = await OCRService.scanDocument(docType);

    if (!ocrResult.success) {
      console.error('OCR scan failed:', ocrResult.error);
      setError('Something went wrong while processing your document. Our team has been notified.');
      setStep('select');
      return;
    }

    if (ocrResult.transactions.length === 0) {
      setError('We couldn\'t find any transactions in this document. Please try a different file.');
      setStep('select');
      return;
    }

    // Pre-select all transactions
    const allIds = new Set(ocrResult.transactions.map(t => t.id));
    setSelectedTransactions(allIds);
    setResult(ocrResult);
    setStep('preview');
  };

  const toggleTransaction = (id: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (result) {
      setSelectedTransactions(new Set(result.transactions.map(t => t.id)));
    }
  };

  const selectNone = () => {
    setSelectedTransactions(new Set());
  };

  const handleImport = async () => {
    if (!result || selectedTransactions.size === 0) return;

    setStep('importing');

    try {
      DatabaseService.init();

      const transactionsToImport = result.transactions.filter(t =>
        selectedTransactions.has(t.id)
      );

      for (const transaction of transactionsToImport) {
        DatabaseService.addTransaction(transaction);
      }

      setStep('complete');
    } catch (err) {
      console.error('Import failed:', err);
      setError('Something went wrong while saving your transactions. Our team has been notified.');
      setStep('preview');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Select document type screen
  if (step === 'select') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Import Statement</Text>
          <Text style={styles.subtitle}>Scan a financial document to import transactions</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleScanDocument('bank_statement')}
          >
            <Ionicons name="document-text" size={32} color="#007AFF" />
            <Text style={styles.optionTitle}>Bank Statement</Text>
            <Text style={styles.optionDescription}>Import transactions from your bank</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleScanDocument('credit_card')}
          >
            <Ionicons name="card" size={32} color="#5856D6" />
            <Text style={styles.optionTitle}>Credit Card</Text>
            <Text style={styles.optionDescription}>Import credit card transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleScanDocument('auto')}
          >
            <Ionicons name="scan" size={32} color="#34C759" />
            <Text style={styles.optionTitle}>Auto Detect</Text>
            <Text style={styles.optionDescription}>Let AI determine document type</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#8E8E93" />
          <Text style={styles.infoText}>
            Supported formats: PDF, JPG, PNG. Documents are processed locally on your network.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Scanning in progress
  if (step === 'scanning') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.scanningText}>Scanning document...</Text>
        <Text style={styles.scanningSubtext}>This may take a few seconds</Text>
      </View>
    );
  }

  // Preview transactions
  if (step === 'preview' && result) {
    const selectedCount = selectedTransactions.size;
    const totalCount = result.transactions.length;

    return (
      <View style={styles.container}>
        <View style={styles.previewHeader}>
          <Text style={styles.title}>Review Transactions</Text>
          <Text style={styles.subtitle}>
            Found {totalCount} transactions • {selectedCount} selected
          </Text>
        </View>

        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
            <Text style={styles.selectionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={selectNone} style={styles.selectionButton}>
            <Text style={styles.selectionButtonText}>Select None</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.transactionList}>
          {result.transactions.map(transaction => (
            <TouchableOpacity
              key={transaction.id}
              style={[
                styles.transactionRow,
                selectedTransactions.has(transaction.id) && styles.transactionRowSelected,
              ]}
              onPress={() => toggleTransaction(transaction.id)}
            >
              <View style={styles.checkbox}>
                {selectedTransactions.has(transaction.id) && (
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription} numberOfLines={1}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionMeta}>
                  {formatDate(transaction.date)} • {transaction.category || 'Uncategorized'}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'income' || transaction.type === 'credit'
                    ? styles.amountPositive
                    : styles.amountNegative,
                ]}
              >
                {transaction.type === 'income' || transaction.type === 'credit' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.previewFooter}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setResult(null);
              setStep('select');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.importButton, selectedCount === 0 && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={selectedCount === 0}
          >
            <Text style={styles.importButtonText}>
              Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Importing in progress
  if (step === 'importing') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.scanningText}>Importing transactions...</Text>
      </View>
    );
  }

  // Import complete
  if (step === 'complete') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
        </View>
        <Text style={styles.successTitle}>Import Complete!</Text>
        <Text style={styles.successSubtitle}>
          {selectedTransactions.size} transactions imported successfully
        </Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.push('/transactions')}
        >
          <Text style={styles.doneButtonText}>View Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.importAnotherButton}
          onPress={() => {
            setResult(null);
            setSelectedTransactions(new Set());
            setStep('select');
          }}
        >
          <Text style={styles.importAnotherButtonText}>Import Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 10,
  },
  previewHeader: {
    padding: 20,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 15,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  optionDescription: {
    fontSize: 15,
    color: '#8E8E93',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  scanningText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
  },
  scanningSubtext: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 8,
  },
  selectionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  selectionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  transactionList: {
    flex: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  transactionRowSelected: {
    backgroundColor: '#E8F4FD',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  transactionMeta: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountPositive: {
    color: '#34C759',
  },
  amountNegative: {
    color: '#FF3B30',
  },
  previewFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  importButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  importButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  successSubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 30,
  },
  doneButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  importAnotherButton: {
    padding: 16,
  },
  importAnotherButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
});
