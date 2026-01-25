// Trend/Analytics types for DriftMoney

export type TrendPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  percentage: number;
  transactionCount: number;
  trend: number; // % change from previous period
}

export interface AccountBreakdown {
  accountId: string;
  accountName: string;
  accountType: 'bank' | 'credit';
  inflow: number;
  outflow: number;
  net: number;
}

export interface TimelinePoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface TrendData {
  period: TrendPeriod;
  startDate: string;
  endDate: string;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  categoryBreakdown: CategoryBreakdown[];
  accountBreakdown: AccountBreakdown[];
  timeline: TimelinePoint[];
}

export interface TrendQuery {
  period: TrendPeriod;
  startDate?: string;
  endDate?: string;
  accountIds?: string[];
  categoryIds?: string[];
}
