import * as DocumentPicker from 'expo-document-picker';
import { Transaction, Bill, Debt } from '../types';

// Configure your OCR pipeline URL
// For development: use your local machine's IP
// For production: use your server's public IP or domain
const OCR_PIPELINE_URL = __DEV__
  ? 'http://192.168.98.108:8000'
  : 'https://your-production-url.com';

export type DocumentType = 'bank_statement' | 'credit_card' | 'bill' | 'loan' | 'auto';

export interface OCRResult {
  success: boolean;
  document_type: string;
  transactions: Transaction[];
  bills: Bill[];
  debts: Debt[];
  error?: string;
}

export interface OCRHealthStatus {
  api: string;
  surya: string;
  ollama: string;
}

export const OCRService = {
  /**
   * Check if the OCR pipeline is healthy and reachable
   */
  checkHealth: async (): Promise<OCRHealthStatus | null> => {
    try {
      const response = await fetch(`${OCR_PIPELINE_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
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
  pickDocument: async (): Promise<DocumentPicker.DocumentPickerResult> => {
    return await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
  },

  /**
   * Parse a document and extract financial data
   */
  parseDocument: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    documentType: DocumentType = 'auto'
  ): Promise<OCRResult> => {
    try {
      // Create form data with file URI
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);
      formData.append('document_type', documentType);

      // Send to OCR pipeline
      const response = await fetch(`${OCR_PIPELINE_URL}/parse`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR failed: ${errorText}`);
      }

      const result = await response.json();
      return result as OCRResult;
    } catch (error) {
      console.error('OCR parsing failed:', error);
      return {
        success: false,
        document_type: documentType,
        transactions: [],
        bills: [],
        debts: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Extract text only (for debugging/preview)
   */
  extractTextOnly: async (
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<{ success: boolean; text: string; detected_type: string; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);

      const response = await fetch(`${OCR_PIPELINE_URL}/ocr-only`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
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
   */
  scanDocument: async (documentType: DocumentType = 'auto'): Promise<OCRResult> => {
    const pickerResult = await OCRService.pickDocument();

    if (pickerResult.canceled || !pickerResult.assets?.[0]) {
      return {
        success: false,
        document_type: documentType,
        transactions: [],
        bills: [],
        debts: [],
        error: 'Document selection cancelled',
      };
    }

    const asset = pickerResult.assets[0];
    return OCRService.parseDocument(
      asset.uri,
      asset.name,
      asset.mimeType || 'application/pdf',
      documentType
    );
  },

  /**
   * Get the configured OCR pipeline URL
   */
  getBaseUrl: (): string => OCR_PIPELINE_URL,

  /**
   * Update the OCR pipeline URL (for settings)
   */
  setBaseUrl: (url: string): void => {
    // Note: This would need to be persisted to settings
    // For now, it's compile-time configured
    console.warn('setBaseUrl requires app restart to take effect');
  },
};
