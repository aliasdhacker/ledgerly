// OCR Service for DriftMoney v2
// Handles document scanning and parsing via the OCR pipeline
// Transforms pipeline results to v2-compatible types

import * as DocumentPicker from 'expo-document-picker';
import { TransactionType, RecurrenceFrequency } from '../types/common';
import { getSetting, setSetting } from '../db/helpers';
import { CredentialService } from './CredentialService';

// OCR Pipeline URL configuration
// Stored in settings for runtime configurability
const OCR_SETTINGS_KEY = 'ocr_pipeline_url';
const DEFAULT_OCR_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://api.acarr.org';

function getOCRPipelineUrl(): string {
  const saved = getSetting(OCR_SETTINGS_KEY);
  return saved || DEFAULT_OCR_URL;
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType = 'bank_statement' | 'credit_card' | 'bill' | 'loan' | 'auto';

// ============================================================================
// Raw OCR Pipeline Types (what the pipeline returns)
// ============================================================================

/** Raw transaction from OCR pipeline */
export interface RawOCRTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'credit' | 'debit';
  date: string;
  category?: string;
}

/** Raw bill from OCR pipeline */
export interface RawOCRBill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  billMonth?: string;
  company?: string;
}

/** Raw debt/credit info from OCR pipeline */
export interface RawOCRDebt {
  id: string;
  company: string;
  balance: number;
  lastUpdated: string;
  paymentDueDay?: number;
  paymentFrequency?: string;
  minimumPayment?: number;
  interestRate?: number;
}

/** Raw OCR pipeline response */
export interface RawOCRResult {
  success: boolean;
  document_type: string;
  transactions: RawOCRTransaction[];
  bills: RawOCRBill[];
  debts: RawOCRDebt[];
  error?: string;
}

// ============================================================================
// Transformed v2-Compatible Types
// ============================================================================

/** Transaction ready for import (matches TransactionCreate) */
export interface OCRTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryName?: string; // Will be resolved to categoryId during import
}

/** Payable extracted from scanned bill */
export interface OCRPayable {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  payee?: string;
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
}

/** Credit account info extracted from credit card statement */
export interface OCRCreditAccountInfo {
  id: string;
  name: string;
  balance: number;
  minimumPayment?: number;
  paymentDueDay?: number;
  apr?: number;
}

/** Transformed OCR result with v2-compatible types */
export interface OCRResult {
  success: boolean;
  document_type: string;
  transactions: OCRTransaction[];
  payables: OCRPayable[];
  creditAccounts: OCRCreditAccountInfo[];
  error?: string;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface OCRHealthStatus {
  api: string;
  surya: string;
  ollama: string;
}

// ============================================================================
// OCR Service
// ============================================================================

export const OCRService = {
  /**
   * Check if the OCR pipeline is healthy and reachable
   */
  async checkHealth(): Promise<OCRHealthStatus | null> {
    try {
      // Get auth header if credentials are configured
      const authHeader = await CredentialService.getBasicAuthHeader();
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${getOCRPipelineUrl()}/health`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('OCR health check failed:', error);
      return null;
    }
  },

  /**
   * Pick a document from the device
   */
  async pickDocument(): Promise<DocumentPicker.DocumentPickerResult> {
    return await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
  },

  /**
   * Parse a document and extract financial data
   * Returns v2-compatible types
   */
  async parseDocument(
    fileUri: string,
    fileName: string,
    mimeType: string,
    documentType: DocumentType = 'auto'
  ): Promise<OCRResult> {
    try {
      // Create form data with file URI
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);
      formData.append('document_type', documentType);

      // Get auth header if credentials are configured
      const authHeader = await CredentialService.getBasicAuthHeader();
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      // Send to OCR pipeline
      const response = await fetch(`${getOCRPipelineUrl()}/parse`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR failed: ${errorText}`);
      }

      const rawResult: RawOCRResult = await response.json();

      // Transform to v2-compatible types
      return this.transformResult(rawResult);
    } catch (error) {
      console.error('OCR parsing failed:', error);
      return {
        success: false,
        document_type: documentType,
        transactions: [],
        payables: [],
        creditAccounts: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Transform raw OCR pipeline result to v2-compatible types
   */
  transformResult(raw: RawOCRResult): OCRResult {
    return {
      success: raw.success,
      document_type: raw.document_type,
      transactions: this.transformTransactions(raw.transactions),
      payables: this.transformBills(raw.bills),
      creditAccounts: this.transformDebts(raw.debts),
      error: raw.error,
    };
  },

  /**
   * Transform raw transactions to v2 format
   */
  transformTransactions(raw: RawOCRTransaction[]): OCRTransaction[] {
    return raw.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: this.mapTransactionType(t.type),
      date: t.date,
      categoryName: t.category,
    }));
  },

  /**
   * Map OCR transaction type to v2 TransactionType
   */
  mapTransactionType(rawType: string): TransactionType {
    switch (rawType.toLowerCase()) {
      case 'income':
      case 'credit':
        return TransactionType.CREDIT;
      case 'expense':
      case 'debit':
      default:
        return TransactionType.DEBIT;
    }
  },

  /**
   * Transform raw bills to Payable format
   */
  transformBills(raw: RawOCRBill[]): OCRPayable[] {
    return raw.map(b => {
      // Calculate due date from dueDay and billMonth
      let dueDate: string;
      if (b.billMonth) {
        dueDate = `${b.billMonth}-${String(b.dueDay).padStart(2, '0')}`;
      } else {
        // Default to next occurrence of dueDay
        const now = new Date();
        const currentDay = now.getDate();
        let month = now.getMonth();
        let year = now.getFullYear();

        if (b.dueDay <= currentDay) {
          month += 1;
          if (month > 11) {
            month = 0;
            year += 1;
          }
        }

        const date = new Date(year, month, b.dueDay);
        dueDate = date.toISOString().split('T')[0];
      }

      return {
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDate,
        payee: b.company,
        isRecurring: true, // Bills from statements are typically recurring
        recurrenceFrequency: RecurrenceFrequency.MONTHLY,
      };
    });
  },

  /**
   * Transform raw debts to credit account info
   */
  transformDebts(raw: RawOCRDebt[]): OCRCreditAccountInfo[] {
    return raw.map(d => ({
      id: d.id,
      name: d.company,
      balance: d.balance,
      minimumPayment: d.minimumPayment,
      paymentDueDay: d.paymentDueDay,
      apr: d.interestRate,
    }));
  },

  /**
   * Extract text only (for debugging/preview)
   */
  async extractTextOnly(
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<{ success: boolean; text: string; detected_type: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);

      // Get auth header if credentials are configured
      const authHeader = await CredentialService.getBasicAuthHeader();
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${getOCRPipelineUrl()}/ocr-only`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        throw new Error(`OCR failed: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        text: '',
        detected_type: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Convenience method: Pick and parse a document in one step
   * Returns v2-compatible types
   */
  async scanDocument(documentType: DocumentType = 'auto'): Promise<OCRResult> {
    const pickerResult = await this.pickDocument();

    if (pickerResult.canceled || !pickerResult.assets?.[0]) {
      return {
        success: false,
        document_type: documentType,
        transactions: [],
        payables: [],
        creditAccounts: [],
        error: 'Document selection cancelled',
      };
    }

    const asset = pickerResult.assets[0];
    return this.parseDocument(
      asset.uri,
      asset.name,
      asset.mimeType || 'application/pdf',
      documentType
    );
  },

  /**
   * Get the configured OCR pipeline URL
   */
  getBaseUrl(): string {
    return getOCRPipelineUrl();
  },

  /**
   * Update the OCR pipeline URL (persisted to settings)
   */
  setBaseUrl(url: string): void {
    if (!url || !url.startsWith('http')) {
      console.warn('Invalid OCR URL - must start with http:// or https://');
      return;
    }
    // Remove trailing slash if present
    const cleanUrl = url.replace(/\/$/, '');
    setSetting(OCR_SETTINGS_KEY, cleanUrl);
  },

  /**
   * Reset OCR URL to default
   */
  resetBaseUrl(): void {
    setSetting(OCR_SETTINGS_KEY, DEFAULT_OCR_URL);
  },
};
