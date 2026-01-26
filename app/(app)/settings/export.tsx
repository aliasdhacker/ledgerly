import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS, Typography, Spacing, BorderRadius, CommonStyles } from '../../../src/constants';
import { Card, MoneyText, LoadingSpinner } from '../../../src/components';
import { ExportService } from '../../../src/services/v2';
import { useAccounts } from '../../../src/hooks/v2';

type ExportType = 'transactions' | 'statement' | 'payables' | 'accounts' | 'summary';

interface DateRange {
  start: string;
  end: string;
  label: string;
}

export default function ExportScreen() {
  const router = useRouter();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [exporting, setExporting] = useState(false);

  // Predefined date ranges
  const dateRanges = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const ranges: DateRange[] = [
      {
        start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
        end: formatDate(today),
        label: 'This Month',
      },
      {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0],
        end: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0],
        label: 'Last Month',
      },
      {
        start: new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0],
        end: formatDate(today),
        label: 'Last 3 Months',
      },
      {
        start: new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0],
        end: formatDate(today),
        label: 'This Year',
      },
      {
        start: '2020-01-01',
        end: formatDate(today),
        label: 'All Time',
      },
    ];

    return ranges;
  }, []);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const exportOptions: { type: ExportType; title: string; description: string; icon: string; needsDateRange: boolean; needsAccount: boolean }[] = [
    {
      type: 'transactions',
      title: 'All Transactions',
      description: 'Export all transactions as CSV',
      icon: 'list',
      needsDateRange: true,
      needsAccount: false,
    },
    {
      type: 'statement',
      title: 'Account Statement',
      description: 'Export transactions for a specific account with running balance',
      icon: 'document-text',
      needsDateRange: true,
      needsAccount: true,
    },
    {
      type: 'payables',
      title: 'Bills & Payables',
      description: 'Export all bills and scheduled payments',
      icon: 'calendar',
      needsDateRange: false,
      needsAccount: false,
    },
    {
      type: 'accounts',
      title: 'Accounts Summary',
      description: 'Export summary of all accounts',
      icon: 'wallet',
      needsDateRange: false,
      needsAccount: false,
    },
    {
      type: 'summary',
      title: 'Financial Summary',
      description: 'Generate a text summary of your finances',
      icon: 'stats-chart',
      needsDateRange: true,
      needsAccount: false,
    },
  ];

  const currentOption = exportOptions.find(o => o.type === selectedType);
  const canExport = selectedType &&
    (!currentOption?.needsDateRange || selectedRange) &&
    (!currentOption?.needsAccount || selectedAccountId);

  const handleSelectType = (type: ExportType) => {
    setSelectedType(type);
    setSelectedAccountId(null);
    setSelectedRange(null);
  };

  const handleExport = async () => {
    if (!selectedType) return;

    setExporting(true);

    try {
      let exportResult: { data: string; filename: string; mimeType: string; rowCount: number } | null = null;
      let textContent: string | null = null;

      switch (selectedType) {
        case 'transactions':
          exportResult = ExportService.exportTransactionsCSV({
            startDate: selectedRange?.start,
            endDate: selectedRange?.end,
          });
          break;

        case 'statement':
          if (!selectedAccountId || !selectedRange) {
            Alert.alert('Error', 'Please select an account and date range');
            setExporting(false);
            return;
          }
          exportResult = ExportService.exportAccountStatementCSV(
            selectedAccountId,
            selectedRange.start,
            selectedRange.end
          );
          break;

        case 'payables':
          exportResult = ExportService.exportPayablesCSV({ includePaid: true });
          break;

        case 'accounts':
          exportResult = ExportService.exportAccountsSummaryCSV();
          break;

        case 'summary':
          if (!selectedRange) {
            Alert.alert('Error', 'Please select a date range');
            setExporting(false);
            return;
          }
          textContent = ExportService.generateSummaryText(selectedRange.start, selectedRange.end);
          break;
      }

      // Handle text summary (share directly)
      if (textContent) {
        await Share.share({
          message: textContent,
          title: 'DriftMoney Financial Summary',
        });
        setExporting(false);
        return;
      }

      // Handle CSV exports
      if (exportResult && exportResult.data) {
        if (exportResult.rowCount === 0) {
          Alert.alert('No Data', 'There is no data to export for the selected options.');
          setExporting(false);
          return;
        }

        // Write file and share
        const file = new File(Paths.cache, exportResult.filename);
        await file.write(exportResult.data);

        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: exportResult.mimeType,
            dialogTitle: `Export ${currentOption?.title}`,
          });
        } else {
          // Fallback to Share API for platforms without file sharing
          await Share.share({
            message: exportResult.data,
            title: exportResult.filename,
          });
        }

        Alert.alert(
          'Export Complete',
          `Successfully exported ${exportResult.rowCount} ${exportResult.rowCount === 1 ? 'record' : 'records'}.`
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Something went wrong while exporting your data. Please try again.');
    }

    setExporting(false);
  };

  const renderExportTypeSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>What would you like to export?</Text>
      <View style={styles.optionList}>
        {exportOptions.map(option => (
          <Pressable
            key={option.type}
            style={[
              styles.optionCard,
              selectedType === option.type && styles.optionCardSelected,
            ]}
            onPress={() => handleSelectType(option.type)}
          >
            <View style={[
              styles.optionIcon,
              selectedType === option.type && styles.optionIconSelected,
            ]}>
              <Ionicons
                name={option.icon as any}
                size={24}
                color={selectedType === option.type ? COLORS.white : COLORS.primary}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[
                styles.optionTitle,
                selectedType === option.type && styles.optionTitleSelected,
              ]}>
                {option.title}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            {selectedType === option.type && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderAccountSelection = () => {
    if (!currentOption?.needsAccount) return null;

    if (accountsLoading) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Account</Text>
          <LoadingSpinner />
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Account</Text>
        <View style={styles.optionList}>
          {accounts.map(account => (
            <Pressable
              key={account.id}
              style={[
                styles.accountOption,
                selectedAccountId === account.id && styles.accountOptionSelected,
              ]}
              onPress={() => setSelectedAccountId(account.id)}
            >
              <View style={[
                styles.accountIcon,
                { backgroundColor: account.type === 'bank' ? COLORS.primary + '20' : COLORS.warning + '20' },
              ]}>
                <Ionicons
                  name={account.type === 'bank' ? 'wallet' : 'card'}
                  size={20}
                  color={account.type === 'bank' ? COLORS.primary : COLORS.warning}
                />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <MoneyText amount={account.balance} size="small" style={styles.accountBalance} />
              </View>
              {selectedAccountId === account.id && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const renderDateRangeSelection = () => {
    if (!currentOption?.needsDateRange) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date Range</Text>
        <View style={styles.rangeGrid}>
          {dateRanges.map(range => (
            <Pressable
              key={range.label}
              style={[
                styles.rangeOption,
                selectedRange?.label === range.label && styles.rangeOptionSelected,
              ]}
              onPress={() => setSelectedRange(range)}
            >
              <Text style={[
                styles.rangeLabel,
                selectedRange?.label === range.label && styles.rangeLabelSelected,
              ]}>
                {range.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {renderExportTypeSelection()}
        {selectedType && renderAccountSelection()}
        {selectedType && renderDateRangeSelection()}

        {/* Export Summary */}
        {selectedType && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Export Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type:</Text>
              <Text style={styles.summaryValue}>{currentOption?.title}</Text>
            </View>
            {currentOption?.needsAccount && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Account:</Text>
                <Text style={styles.summaryValue}>
                  {selectedAccount?.name || 'Not selected'}
                </Text>
              </View>
            )}
            {currentOption?.needsDateRange && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Period:</Text>
                <Text style={styles.summaryValue}>
                  {selectedRange?.label || 'Not selected'}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Format:</Text>
              <Text style={styles.summaryValue}>
                {selectedType === 'summary' ? 'Text' : 'CSV'}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Export Button */}
      {selectedType && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.exportButton, !canExport && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={!canExport || exporting}
          >
            {exporting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="share-outline" size={20} color={COLORS.white} />
                <Text style={styles.exportButtonText}>Export & Share</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
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
    paddingBottom: 120,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  optionList: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionIconSelected: {
    backgroundColor: COLORS.primary,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.bodyBold,
  },
  optionTitleSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    ...Typography.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountOptionSelected: {
    borderColor: COLORS.primary,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...Typography.body,
    fontWeight: '500',
  },
  accountBalance: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rangeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  rangeOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rangeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  rangeLabel: {
    ...Typography.footnote,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  rangeLabelSelected: {
    color: COLORS.primary,
  },
  summaryCard: {
    marginTop: Spacing.md,
  },
  summaryTitle: {
    ...Typography.bodyBold,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  summaryLabel: {
    ...Typography.body,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...Typography.body,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  exportButton: {
    ...CommonStyles.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  exportButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  exportButtonText: {
    ...CommonStyles.buttonText,
  },
});
