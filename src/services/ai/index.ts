// AI Service for DriftMoney
// Provides AI-powered features using local LLM (Ollama)

import { getSetting, setSetting } from '../../db/helpers';
import { CredentialService } from '../CredentialService';
import {
  AIConfig,
  DEFAULT_AI_CONFIG,
  AI_SETTINGS_KEYS,
  AIHealthStatus,
  CategorySuggestion,
  SpendingAnomaly,
  BudgetRecommendation,
  SpendingInsight,
  LLMRequest,
  LLMResponse,
} from '../../types/ai';
import {
  getCategorizeTransactionPrompt,
  getAnomalyDetectionPrompt,
  getBudgetRecommendationPrompt,
  getSpendingInsightsPrompt,
  getCashFlowForecastPrompt,
  parseJSONResponse,
  CATEGORY_LIST,
} from './prompts';

/**
 * AI Service - handles all AI-powered features
 */
export const AIService = {
  // ============================================================================
  // Configuration Management
  // ============================================================================

  /**
   * Get current AI configuration from settings
   */
  getConfig(): AIConfig {
    return {
      enabled: getSetting(AI_SETTINGS_KEYS.ENABLED) === 'true',
      endpointUrl: getSetting(AI_SETTINGS_KEYS.ENDPOINT_URL) || DEFAULT_AI_CONFIG.endpointUrl,
      model: getSetting(AI_SETTINGS_KEYS.MODEL) || DEFAULT_AI_CONFIG.model,
      timeout: parseInt(getSetting(AI_SETTINGS_KEYS.TIMEOUT) || String(DEFAULT_AI_CONFIG.timeout), 10),
    };
  },

  /**
   * Update AI configuration
   */
  setConfig(config: Partial<AIConfig>): void {
    if (config.enabled !== undefined) {
      setSetting(AI_SETTINGS_KEYS.ENABLED, String(config.enabled));
    }
    if (config.endpointUrl) {
      setSetting(AI_SETTINGS_KEYS.ENDPOINT_URL, config.endpointUrl.replace(/\/$/, ''));
    }
    if (config.model) {
      setSetting(AI_SETTINGS_KEYS.MODEL, config.model);
    }
    if (config.timeout) {
      setSetting(AI_SETTINGS_KEYS.TIMEOUT, String(config.timeout));
    }
  },

  /**
   * Enable AI features
   */
  enable(): void {
    setSetting(AI_SETTINGS_KEYS.ENABLED, 'true');
  },

  /**
   * Disable AI features
   */
  disable(): void {
    setSetting(AI_SETTINGS_KEYS.ENABLED, 'false');
  },

  /**
   * Check if AI is enabled
   */
  isEnabled(): boolean {
    return getSetting(AI_SETTINGS_KEYS.ENABLED) === 'true';
  },

  // ============================================================================
  // Health & Connectivity
  // ============================================================================

  /**
   * Check if AI service is available and responding
   */
  async checkHealth(): Promise<AIHealthStatus> {
    const config = this.getConfig();
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Get auth header from build-time credentials
      const authHeader = CredentialService.getBasicAuthHeader();
      const headers: Record<string, string> = {};
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${config.endpointUrl}/api/tags`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          available: false,
          endpoint: config.endpointUrl,
          model: config.model,
          error: `HTTP ${response.status}${response.status === 401 ? ' (Authentication required)' : ''}`,
        };
      }

      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      const hasModel = models.some((m: string) => m.includes(config.model));

      return {
        available: true,
        endpoint: config.endpointUrl,
        model: config.model,
        latencyMs: Date.now() - startTime,
        error: hasModel ? undefined : `Model "${config.model}" not found. Available: ${models.join(', ')}`,
      };
    } catch (error) {
      return {
        available: false,
        endpoint: config.endpointUrl,
        model: config.model,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  },

  // ============================================================================
  // Core LLM Interface
  // ============================================================================

  /**
   * Send a prompt to the LLM and get a response
   */
  async query(prompt: string, options?: { temperature?: number }): Promise<string | null> {
    const config = this.getConfig();

    if (!config.enabled) {
      if (__DEV__) console.warn('AI features are disabled');
      return null;
    }

    try {
      const request: LLMRequest = {
        model: config.model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.3,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      // Get auth header from build-time credentials
      const authHeader = CredentialService.getBasicAuthHeader();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${config.endpointUrl}/api/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status}`);
      }

      const data: LLMResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI query failed:', error);
      return null;
    }
  },

  // ============================================================================
  // AI Features
  // ============================================================================

  /**
   * Categorize a transaction using AI
   */
  async categorizeTransaction(
    description: string,
    amount: number,
    type: 'debit' | 'credit'
  ): Promise<CategorySuggestion | null> {
    const prompt = getCategorizeTransactionPrompt(description, amount, type);
    const response = await this.query(prompt);

    if (!response) return null;

    const parsed = parseJSONResponse<{
      category: string;
      confidence: number;
      reasoning: string;
    }>(response);

    if (!parsed) return null;

    // Validate category is in our list
    const categoryName = CATEGORY_LIST.includes(parsed.category as typeof CATEGORY_LIST[number])
      ? parsed.category
      : 'other';

    return {
      categoryId: null, // Will be resolved by caller
      categoryName,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
    };
  },

  /**
   * Detect anomalies in recent transactions
   */
  async detectAnomalies(
    transactions: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      category?: string;
    }>,
    categoryAverages: Record<string, number>
  ): Promise<SpendingAnomaly[]> {
    if (transactions.length === 0) return [];

    const prompt = getAnomalyDetectionPrompt(transactions, categoryAverages);
    const response = await this.query(prompt);

    if (!response) return [];

    const parsed = parseJSONResponse<{
      anomalies: Array<{
        transactionIndex: number;
        type: SpendingAnomaly['anomalyType'];
        severity: SpendingAnomaly['severity'];
        explanation: string;
      }>;
    }>(response);

    if (!parsed?.anomalies) return [];

    return parsed.anomalies
      .filter(a => a.transactionIndex > 0 && a.transactionIndex <= transactions.length)
      .map(a => {
        const txn = transactions[a.transactionIndex - 1];
        return {
          transactionId: txn.id,
          description: txn.description,
          amount: txn.amount,
          date: txn.date,
          categoryName: txn.category,
          anomalyType: a.type,
          severity: a.severity,
          explanation: a.explanation,
          averageAmount: txn.category ? categoryAverages[txn.category] : undefined,
        };
      });
  },

  /**
   * Get budget recommendations based on spending history
   */
  async getBudgetRecommendations(
    categorySpending: Array<{
      category: string;
      lastMonth: number;
      threeMonthAvg: number;
      trend: 'up' | 'down' | 'stable';
    }>
  ): Promise<BudgetRecommendation[]> {
    if (categorySpending.length === 0) return [];

    const prompt = getBudgetRecommendationPrompt(categorySpending);
    const response = await this.query(prompt);

    if (!response) return [];

    const parsed = parseJSONResponse<{
      recommendations: Array<{
        category: string;
        suggestedAmount: number;
        reasoning: string;
      }>;
    }>(response);

    if (!parsed?.recommendations) return [];

    return parsed.recommendations.map(r => {
      const spending = categorySpending.find(s => s.category === r.category);
      return {
        categoryId: '', // Will be resolved by caller
        categoryName: r.category,
        suggestedAmount: r.suggestedAmount,
        reasoning: r.reasoning,
        historicalAverage: spending?.threeMonthAvg ?? 0,
        trend: (spending?.trend === 'up' ? 'increasing' : spending?.trend === 'down' ? 'decreasing' : 'stable') as BudgetRecommendation['trend'],
      };
    });
  },

  /**
   * Generate spending insights
   */
  async getSpendingInsights(
    currentMonth: Record<string, number>,
    previousMonth: Record<string, number>,
    totalIncome: number,
    totalExpenses: number
  ): Promise<SpendingInsight[]> {
    const prompt = getSpendingInsightsPrompt(currentMonth, previousMonth, totalIncome, totalExpenses);
    const response = await this.query(prompt);

    if (!response) return [];

    const parsed = parseJSONResponse<{
      insights: SpendingInsight[];
    }>(response);

    return parsed?.insights ?? [];
  },

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Get cash flow forecast for upcoming weeks
   */
  async getCashFlowForecast(
    currentBalance: number,
    upcomingPayables: Array<{
      name: string;
      amount: number;
      dueDate: string;
    }>,
    weeklySpendingAvg: number,
    expectedIncome: Array<{
      description: string;
      amount: number;
      expectedDate: string;
    }>
  ): Promise<{
    forecasts: Array<{
      weekNumber: number;
      endDate: string;
      predictedBalance: number;
      inflows: number;
      outflows: number;
      warnings: string[];
    }>;
    summary: {
      lowestBalance: number;
      lowestBalanceDate: string;
      riskLevel: 'low' | 'medium' | 'high';
    };
  } | null> {
    const prompt = getCashFlowForecastPrompt(
      currentBalance,
      upcomingPayables,
      weeklySpendingAvg,
      expectedIncome
    );
    const response = await this.query(prompt);

    if (!response) return null;

    const parsed = parseJSONResponse<{
      forecasts: Array<{
        weekNumber: number;
        endDate: string;
        predictedBalance: number;
        inflows: number;
        outflows: number;
        warnings: string[];
      }>;
      summary: {
        lowestBalance: number;
        lowestBalanceDate: string;
        riskLevel: 'low' | 'medium' | 'high';
      };
    }>(response);

    return parsed;
  },

  /**
   * Get list of available categories for categorization
   */
  getAvailableCategories(): readonly string[] {
    return CATEGORY_LIST;
  },
};

export default AIService;
