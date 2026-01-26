// AI-related types for DriftMoney

/**
 * AI provider configuration
 */
export interface AIConfig {
  /** Whether AI features are enabled */
  enabled: boolean;
  /** Base URL for the AI/LLM endpoint (e.g., Ollama) */
  endpointUrl: string;
  /** Model to use for inference */
  model: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  endpointUrl: __DEV__ ? 'http://localhost:11434' : 'https://ollama.acarr.org',
  model: 'llama3.2',
  timeout: 30000,
};

/**
 * AI settings keys for storage
 */
export const AI_SETTINGS_KEYS = {
  ENABLED: 'ai_enabled',
  ENDPOINT_URL: 'ai_endpoint_url',
  MODEL: 'ai_model',
  TIMEOUT: 'ai_timeout',
} as const;

/**
 * Category suggestion from AI
 */
export interface CategorySuggestion {
  categoryId: string | null;
  categoryName: string;
  confidence: number; // 0-1
  reasoning?: string;
}

/**
 * Spending anomaly detected by AI
 */
export interface SpendingAnomaly {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  categoryName?: string;
  anomalyType: 'unusually_high' | 'unusual_merchant' | 'unusual_time' | 'potential_duplicate';
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  averageAmount?: number;
}

/**
 * Budget recommendation from AI
 */
export interface BudgetRecommendation {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  reasoning: string;
  historicalAverage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Cash flow forecast
 */
export interface CashFlowForecast {
  date: string;
  predictedBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
  upcomingPayables: { name: string; amount: number; dueDate: string }[];
  warnings: string[];
}

/**
 * Spending insight from AI
 */
export interface SpendingInsight {
  type: 'trend' | 'comparison' | 'suggestion' | 'warning';
  title: string;
  description: string;
  category?: string;
  amount?: number;
  percentChange?: number;
}

/**
 * LLM request structure (Ollama-compatible)
 */
export interface LLMRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

/**
 * LLM response structure (Ollama-compatible)
 */
export interface LLMResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

/**
 * AI service health status
 */
export interface AIHealthStatus {
  available: boolean;
  endpoint: string;
  model: string;
  latencyMs?: number;
  error?: string;
}
