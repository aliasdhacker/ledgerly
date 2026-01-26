// AI prompt templates for DriftMoney

/**
 * Categories available for transaction classification
 */
export const CATEGORY_LIST = [
  'groceries',
  'dining',
  'transportation',
  'utilities',
  'entertainment',
  'shopping',
  'healthcare',
  'personal',
  'travel',
  'education',
  'subscriptions',
  'insurance',
  'housing',
  'income',
  'transfer',
  'other',
] as const;

/**
 * Prompt for categorizing a transaction
 */
export function getCategorizeTransactionPrompt(
  description: string,
  amount: number,
  type: 'debit' | 'credit'
): string {
  return `You are a financial transaction categorizer. Analyze this transaction and return ONLY a JSON response.

Transaction:
- Description: "${description}"
- Amount: $${amount.toFixed(2)}
- Type: ${type}

Available categories: ${CATEGORY_LIST.join(', ')}

Respond with ONLY this JSON format (no other text):
{
  "category": "category_name",
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}

Rules:
- Use ONLY categories from the list above
- Confidence should be 0.0 to 1.0
- For income/deposits, use "income"
- For transfers between accounts, use "transfer"
- If truly unclear, use "other" with low confidence`;
}

/**
 * Prompt for detecting spending anomalies
 */
export function getAnomalyDetectionPrompt(
  recentTransactions: Array<{
    description: string;
    amount: number;
    date: string;
    category?: string;
  }>,
  averages: Record<string, number>
): string {
  const txnList = recentTransactions
    .map((t, i) => `${i + 1}. ${t.date}: "${t.description}" - $${t.amount.toFixed(2)} (${t.category || 'uncategorized'})`)
    .join('\n');

  const avgList = Object.entries(averages)
    .map(([cat, avg]) => `- ${cat}: $${avg.toFixed(2)}`)
    .join('\n');

  return `You are a financial anomaly detector. Analyze these recent transactions for unusual patterns.

Recent Transactions:
${txnList}

Category Averages (typical spending):
${avgList}

Respond with ONLY this JSON format (no other text):
{
  "anomalies": [
    {
      "transactionIndex": 1,
      "type": "unusually_high",
      "severity": "medium",
      "explanation": "This grocery purchase is 3x higher than your average"
    }
  ]
}

Anomaly types: unusually_high, unusual_merchant, unusual_time, potential_duplicate
Severity levels: low, medium, high

Only flag genuine anomalies. An empty array is fine if nothing unusual.`;
}

/**
 * Prompt for budget recommendations
 */
export function getBudgetRecommendationPrompt(
  categorySpending: Array<{
    category: string;
    lastMonth: number;
    threeMonthAvg: number;
    trend: 'up' | 'down' | 'stable';
  }>
): string {
  const spendingList = categorySpending
    .map(c => `- ${c.category}: Last month $${c.lastMonth.toFixed(2)}, 3-month avg $${c.threeMonthAvg.toFixed(2)}, trend: ${c.trend}`)
    .join('\n');

  return `You are a budget planning advisor. Based on spending history, suggest realistic budgets.

Spending History:
${spendingList}

Respond with ONLY this JSON format (no other text):
{
  "recommendations": [
    {
      "category": "groceries",
      "suggestedAmount": 450,
      "reasoning": "Your average is $420 with slight upward trend, adding 7% buffer"
    }
  ]
}

Guidelines:
- Add 5-15% buffer above average for flexibility
- Consider trends when setting amounts
- Round to reasonable amounts ($5 or $10 increments)
- Be realistic, not overly restrictive`;
}

/**
 * Prompt for spending insights
 */
export function getSpendingInsightsPrompt(
  currentMonth: Record<string, number>,
  previousMonth: Record<string, number>,
  totalIncome: number,
  totalExpenses: number
): string {
  const comparison = Object.keys(currentMonth)
    .map(cat => {
      const current = currentMonth[cat] || 0;
      const previous = previousMonth[cat] || 0;
      const change = previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : 'N/A';
      return `- ${cat}: $${current.toFixed(2)} (was $${previous.toFixed(2)}, ${change}% change)`;
    })
    .join('\n');

  return `You are a financial insights generator. Provide 2-3 helpful insights about this user's spending.

This Month vs Last Month:
${comparison}

Total Income: $${totalIncome.toFixed(2)}
Total Expenses: $${totalExpenses.toFixed(2)}
Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}%

Respond with ONLY this JSON format (no other text):
{
  "insights": [
    {
      "type": "trend",
      "title": "Dining spending up 25%",
      "description": "You spent $150 more on dining this month compared to last month."
    }
  ]
}

Insight types: trend, comparison, suggestion, warning
Keep insights actionable and non-judgmental.`;
}

/**
 * Prompt for cash flow forecasting
 */
export function getCashFlowForecastPrompt(
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
): string {
  const payablesList = upcomingPayables.length > 0
    ? upcomingPayables.map(p => `- ${p.dueDate}: ${p.name} - $${p.amount.toFixed(2)}`).join('\n')
    : '(No upcoming bills)';

  const incomeList = expectedIncome.length > 0
    ? expectedIncome.map(i => `- ${i.expectedDate}: ${i.description} - $${i.amount.toFixed(2)}`).join('\n')
    : '(No expected income)';

  return `You are a cash flow forecaster. Predict account balance for the next 4 weeks.

Current Balance: $${currentBalance.toFixed(2)}

Upcoming Bills/Payables:
${payablesList}

Expected Income:
${incomeList}

Average Weekly Spending (discretionary): $${weeklySpendingAvg.toFixed(2)}

Respond with ONLY this JSON format (no other text):
{
  "forecasts": [
    {
      "weekNumber": 1,
      "endDate": "2026-02-01",
      "predictedBalance": 2500.00,
      "inflows": 0,
      "outflows": 350.00,
      "warnings": []
    }
  ],
  "summary": {
    "lowestBalance": 1800.00,
    "lowestBalanceDate": "2026-02-15",
    "riskLevel": "low"
  }
}

Guidelines:
- Project 4 weeks (week 1, 2, 3, 4)
- Account for all payables on their due dates
- Add weekly discretionary spending to each week
- Add income on expected dates
- Risk levels: low (balance stays above $500), medium (drops below $500), high (goes negative)
- Add warnings if balance might go negative or get critically low`;
}

/**
 * Parse JSON from LLM response, handling potential markdown code blocks
 */
export function parseJSONResponse<T>(response: string): T | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.warn('Failed to parse AI response as JSON:', error);
    return null;
  }
}
