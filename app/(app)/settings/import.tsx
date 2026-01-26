import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles } from '../../../src/constants';
import { Card, LoadingSpinner } from '../../../src/components';
import { OCRService, DocumentType, OCRResult, OCRTransaction } from '../../../src/services/OCRService';
import { TransactionService } from '../../../src/services/v2';
import { useAccounts } from '../../../src/hooks/v2';
import type { TransactionCreate } from '../../../src/types/transaction';
import { TransactionType } from '../../../src/types/common';

// Helper to check if transaction is a credit (income)
const isCredit = (transaction: OCRTransaction): boolean => {
  return transaction.type === TransactionType.CREDIT;
};

type ImportStep = 'account' | 'select' | 'scanning' | 'preview' | 'importing' | 'complete';

export default function ImportScreen() {
  const router = useRouter();
  const { accountId: preselectedAccountId } = useLocalSearchParams<{ accountId?: string }>();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [step, setStep] = useState<ImportStep>('account');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Auto-select account from URL param or if only one exists
  useEffect(() => {
    if (preselectedAccountId && accounts.find(a => a.id === preselectedAccountId)) {
      setSelectedAccountId(preselectedAccountId);
      setStep('select'); // Skip account selection step
    } else if (accounts.length === 1 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, preselectedAccountId]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setStep('select');
  };

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
      setError('Something went wrong while processing your document. Please try again.');
      setStep('select');
      return;
    }

    if (ocrResult.transactions.length === 0) {
      setError("We couldn't find any transactions in this document. Please try a different file.");
      setStep('select');
      return;
    }

    // Check for potential duplicates
    const duplicates = new Set<string>();
    if (selectedAccountId) {
      for (const t of ocrResult.transactions) {
        const existing = TransactionService.findPotentialDuplicate(
          selectedAccountId,
          t.amount,
          t.date,
          t.description
        );
        if (existing) {
          duplicates.add(t.id);
        }
      }
    }
    setDuplicateIds(duplicates);

    // Pre-select all non-duplicate transactions
    const allIds = new Set(
      ocrResult.transactions
        .filter(t => !duplicates.has(t.id))
        .map(t => t.id)
    );
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
    if (!result || selectedTransactions.size === 0 || !selectedAccountId) return;

    setStep('importing');

    try {
      const transactionsToImport = result.transactions.filter(t =>
        selectedTransactions.has(t.id)
      );

      let successCount = 0;
      let skipCount = 0;
      const batchId = `import_${Date.now()}`;

      for (const ocrTransaction of transactionsToImport) {
        // Double-check for duplicates before importing
        const existingDuplicate = TransactionService.findPotentialDuplicate(
          selectedAccountId,
          ocrTransaction.amount,
          ocrTransaction.date,
          ocrTransaction.description
        );

        if (existingDuplicate) {
          skipCount++;
          continue;
        }

        // OCRTransaction already has v2 TransactionType
        const createData: TransactionCreate = {
          accountId: selectedAccountId,
          type: ocrTransaction.type,
          amount: ocrTransaction.amount,
          description: ocrTransaction.description,
          date: ocrTransaction.date,
          importBatchId: batchId,
          externalId: ocrTransaction.id,
        };

        const createResult = TransactionService.create(createData);
        if (createResult.success) {
          successCount++;
        } else {
          skipCount++;
        }
      }

      setImportedCount(successCount);
      setSkippedCount(skipCount);
      setStep('complete');
    } catch (err) {
      console.error('Import failed:', err);
      setError('Something went wrong while saving your transactions. Please try again.');
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

  const resetImport = () => {
    setResult(null);
    setSelectedTransactions(new Set());
    setDuplicateIds(new Set());
    setError(null);
    setImportedCount(0);
    setSkippedCount(0);
    setStep('account');
  };

  // Account selection screen
  if (step === 'account') {
    if (accountsLoading) {
      return (
        <View style={styles.centerContainer}>
          <LoadingSpinner />
        </View>
      );
    }

    if (accounts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="wallet-outline" size={64} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>No Accounts</Text>
          <Text style={styles.emptySubtitle}>Create an account first to import transactions</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/accounts/add')}>
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Account</Text>
          <Text style={styles.subtitle}>Choose which account to import transactions into</Text>
        </View>

        <View style={styles.accountList}>
          {accounts.map(account => (
            <Pressable
              key={account.id}
              style={styles.accountCard}
              onPress={() => handleSelectAccount(account.id)}
            >
              <View style={[styles.accountIcon, { backgroundColor: account.type === 'bank' ? COLORS.primary + '20' : COLORS.warning + '20' }]}>
                <Ionicons
                  name={account.type === 'bank' ? 'wallet' : 'card'}
                  size={24}
                  color={account.type === 'bank' ? COLORS.primary : COLORS.warning}
                />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountType}>
                  {account.type === 'bank' ? 'Bank Account' : 'Credit Card'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Select document type screen
  if (step === 'select') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable style={styles.backLink} onPress={() => setStep('account')}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.backLinkText}>Change Account</Text>
          </Pressable>
          <Text style={styles.title}>Import Statement</Text>
          <Text style={styles.subtitle}>
            Importing to: <Text style={styles.highlightText}>{selectedAccount?.name}</Text>
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          <Pressable
            style={styles.optionCard}
            onPress={() => handleScanDocument('bank_statement')}
          >
            <Ionicons name="document-text" size={32} color={COLORS.primary} />
            <Text style={styles.optionTitle}>Bank Statement</Text>
            <Text style={styles.optionDescription}>Import transactions from your bank</Text>
          </Pressable>

          <Pressable
            style={styles.optionCard}
            onPress={() => handleScanDocument('credit_card')}
          >
            <Ionicons name="card" size={32} color={COLORS.warning} />
            <Text style={styles.optionTitle}>Credit Card</Text>
            <Text style={styles.optionDescription}>Import credit card transactions</Text>
          </Pressable>

          <Pressable
            style={styles.optionCard}
            onPress={() => handleScanDocument('auto')}
          >
            <Ionicons name="scan" size={32} color={COLORS.success} />
            <Text style={styles.optionTitle}>Auto Detect</Text>
            <Text style={styles.optionDescription}>Let AI determine document type</Text>
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            Supported formats: PDF, JPG, PNG. Documents are processed securely.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Scanning in progress
  if (step === 'scanning') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.scanningText}>Scanning document...</Text>
        <Text style={styles.scanningSubtext}>This may take a few seconds</Text>
      </View>
    );
  }

  // Preview transactions
  if (step === 'preview' && result) {
    const selectedCount = selectedTransactions.size;
    const totalCount = result.transactions.length;
    const duplicateCount = duplicateIds.size;

    return (
      <View style={styles.container}>
        <View style={styles.previewHeader}>
          <Text style={styles.title}>Review Transactions</Text>
          <Text style={styles.subtitle}>
            Found {totalCount} transactions for {selectedAccount?.name}
          </Text>
          <Text style={styles.selectedCount}>
            {selectedCount} selected
            {duplicateCount > 0 && ` • ${duplicateCount} potential duplicate${duplicateCount > 1 ? 's' : ''}`}
          </Text>
        </View>

        <View style={styles.selectionBar}>
          <Pressable onPress={selectAll} style={styles.selectionButton}>
            <Text style={styles.selectionButtonText}>Select All</Text>
          </Pressable>
          <Pressable onPress={selectNone} style={styles.selectionButton}>
            <Text style={styles.selectionButtonText}>Select None</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.transactionList}>
          {result.transactions.map(transaction => {
            const isDuplicate = duplicateIds.has(transaction.id);
            return (
              <Pressable
                key={transaction.id}
                style={[
                  styles.transactionRow,
                  selectedTransactions.has(transaction.id) && styles.transactionRowSelected,
                  isDuplicate && styles.transactionRowDuplicate,
                ]}
                onPress={() => toggleTransaction(transaction.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    selectedTransactions.has(transaction.id) && styles.checkboxSelected,
                  ]}
                >
                  {selectedTransactions.has(transaction.id) && (
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  )}
                </View>
                <View style={styles.transactionInfo}>
                  <View style={styles.transactionTitleRow}>
                    <Text style={styles.transactionDescription} numberOfLines={1}>
                      {transaction.description}
                    </Text>
                    {isDuplicate && (
                      <View style={styles.duplicateBadge}>
                        <Text style={styles.duplicateBadgeText}>Duplicate?</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.transactionMeta}>
                    {formatDate(transaction.date)} {transaction.categoryName ? `• ${transaction.categoryName}` : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    isCredit(transaction) ? styles.amountPositive : styles.amountNegative,
                  ]}
                >
                  {isCredit(transaction) ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.previewFooter}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => {
              setResult(null);
              setStep('select');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.importButton, selectedCount === 0 && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={selectedCount === 0}
          >
            <Text style={styles.importButtonText}>
              Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Importing in progress
  if (step === 'importing') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.scanningText}>Importing transactions...</Text>
      </View>
    );
  }

  // Import complete
  if (step === 'complete') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </View>
        <Text style={styles.successTitle}>Import Complete!</Text>
        <Text style={styles.successSubtitle}>
          {importedCount} transactions imported to {selectedAccount?.name}
          {skippedCount > 0 && `\n${skippedCount} skipped (duplicates or errors)`}
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push(`/accounts/${selectedAccountId}`)}
        >
          <Text style={styles.primaryButtonText}>View Account</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={resetImport}>
          <Text style={styles.secondaryButtonText}>Import Another</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  previewHeader: {
    padding: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.largeTitle,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  highlightText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectedCount: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: Spacing.xs,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  backLinkText: {
    ...Typography.body,
    color: COLORS.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    flex: 1,
    color: COLORS.error,
  },
  accountList: {
    gap: Spacing.md,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...Typography.bodyBold,
  },
  accountType: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  optionTitle: {
    ...Typography.title3,
    marginTop: Spacing.sm,
  },
  optionDescription: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    ...Typography.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  scanningText: {
    ...Typography.title3,
    marginTop: Spacing.xl,
  },
  scanningSubtext: {
    ...Typography.body,
    color: COLORS.textSecondary,
    marginTop: Spacing.sm,
  },
  selectionBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  selectionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.sm,
  },
  selectionButtonText: {
    ...Typography.footnote,
    color: COLORS.primary,
    fontWeight: '600',
  },
  transactionList: {
    flex: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  transactionRowSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  transactionRowDuplicate: {
    backgroundColor: COLORS.warning + '08',
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  duplicateBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  duplicateBadgeText: {
    ...Typography.caption,
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    ...Typography.body,
    fontWeight: '500',
  },
  transactionMeta: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    ...Typography.body,
    fontWeight: '600',
  },
  amountPositive: {
    color: COLORS.success,
  },
  amountNegative: {
    color: COLORS.expense,
  },
  previewFooter: {
    flexDirection: 'row',
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.bodyBold,
    color: COLORS.text,
  },
  importButton: {
    flex: 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.success,
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  importButtonText: {
    ...Typography.bodyBold,
    color: COLORS.white,
  },
  successIcon: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...Typography.title1,
  },
  successSubtitle: {
    ...Typography.body,
    color: COLORS.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  primaryButton: {
    ...CommonStyles.button,
    width: '100%',
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    ...CommonStyles.buttonText,
  },
  secondaryButton: {
    padding: Spacing.lg,
  },
  secondaryButtonText: {
    ...Typography.body,
    color: COLORS.primary,
  },
  emptyTitle: {
    ...Typography.title2,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
