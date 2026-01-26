# DriftMoney Refactor Plan v3 (Final)

**Associated Git Tag:** `v0.1.0-stable`
**Created:** January 25, 2026
**Rollback Command:** `git checkout v0.1.0-stable`

---

## Overview

Complete refactor of DriftMoney from transaction-centric to account-centric architecture with advanced financial tracking features.

## Execution Order

```
Phase 1: Architecture Refactor (foundation)
    ↓
Phase 2: Database Schema + Migration (data layer)
    ↓
Phase 3: Core Features (accounts, payables, transactions)
    ↓
Phase 4: Advanced Features (trends, transfers, budgets)
    ↓
Phase 5: UI Rebuild (screens)
    ↓
Phase 6: OCR Integration (import pipeline)
    ↓
Phase 7: Cleanup + Polish
```

---

## Complete Feature List

### Core (Must Have)
- [ ] Accounts (bank + credit)
- [ ] Transactions linked to accounts
- [ ] Payables (recurring + one-off)
- [ ] Running balance from bank accounts
- [ ] Debt total from credit accounts
- [ ] Trends & analytics
- [ ] Transfer between accounts
- [ ] Categories (system + custom)

### From Gap Analysis
- [ ] Budgets per category
- [ ] Savings goals
- [ ] Split transactions
- [ ] Account reconciliation
- [ ] Multi-currency support
- [ ] Data export (CSV/PDF)
- [ ] Payable ↔ Transaction linking
- [ ] Credit card payment info (minimum, due date, APR)
- [ ] Import deduplication

### Infrastructure
- [ ] Service layer architecture
- [ ] Validation layer (Zod)
- [ ] Soft delete everywhere
- [ ] Standardized dates (ISO)
- [ ] Error boundaries
- [ ] Centralized constants

---

## Data Model

### Base Types (`src/types/common.ts`)
```typescript
export type SyncStatus = 'synced' | 'dirty' | 'deleted';

export interface SyncableEntity {
  id: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'MXN';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  endDate?: string;
}
```

### Account (`src/types/account.ts`)
```typescript
import { SyncableEntity, Currency } from './common';

export type AccountType = 'bank' | 'credit';

export interface Account extends SyncableEntity {
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  institutionName?: string;
  accountNumberLast4?: string;
  isActive: boolean;
  sortOrder: number;
  
  // Reconciliation
  reconciledBalance?: number;
  reconciledDate?: string;
  
  // Credit accounts only
  creditLimit?: number;
  minimumPayment?: number;
  paymentDueDay?: number;
  apr?: number;
  
  // Computed (not stored)
  availableCredit?: number;
}
```

### Transaction (`src/types/transaction.ts`)
```typescript
import { SyncableEntity, TransactionType } from './common';

export interface Transaction extends SyncableEntity {
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  notes?: string;
  
  // Links
  linkedPayableId?: string;
  transferId?: string;
  
  // Splits
  isSplit: boolean;
  splits?: TransactionSplit[];
  parentTransactionId?: string;
  
  // Import metadata
  importBatchId?: string;
  externalId?: string;
  isReconciled: boolean;
}

export interface TransactionSplit {
  id: string;
  categoryId: string;
  amount: number;
  notes?: string;
}

export interface Transfer extends SyncableEntity {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
  fromTransactionId: string;
  toTransactionId: string;
}
```

### Payable (`src/types/payable.ts`)
```typescript
import { SyncableEntity, RecurrenceRule } from './common';

export interface Payable extends SyncableEntity {
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
  
  // Links
  paidFromAccountId?: string;
  linkedTransactionId?: string;
  
  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  parentPayableId?: string;
  
  // Metadata
  categoryId?: string;
  notes?: string;
  payee?: string;
  
  // Auto-pay
  autoPayAccountId?: string;
}
```

### Category (`src/types/category.ts`)
```typescript
import { SyncableEntity } from './common';

export interface Category extends SyncableEntity {
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  parentCategoryId?: string;
}
```

### Budget (`src/types/budget.ts`)
```typescript
import { SyncableEntity, RecurrenceFrequency } from './common';

export interface Budget extends SyncableEntity {
  name: string;
  categoryId?: string;
  amount: number;
  period: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  rollover: boolean;
  rolledAmount: number;
  alertThreshold?: number;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  projectedEndOfPeriod: number;
}
```

### Goal (`src/types/goal.ts`)
```typescript
import { SyncableEntity } from './common';

export interface Goal extends SyncableEntity {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  linkedAccountId?: string;
  icon?: string;
  color?: string;
  isCompleted: boolean;
  completedDate?: string;
}

export interface GoalProgress {
  goal: Goal;
  percentComplete: number;
  remainingAmount: number;
  onTrack: boolean;
  requiredMonthlyAmount?: number;
}
```

### Import Batch (`src/types/import.ts`)
```typescript
import { SyncableEntity } from './common';

export interface ImportBatch extends SyncableEntity {
  accountId: string;
  filename: string;
  importDate: string;
  transactionCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  duplicatesSkipped: number;
  newTransactions: number;
}
```

---

## Project Structure

```
src/
├── types/
│   ├── index.ts
│   ├── common.ts
│   ├── account.ts
│   ├── transaction.ts
│   ├── payable.ts
│   ├── category.ts
│   ├── budget.ts
│   ├── goal.ts
│   └── import.ts
│
├── constants/
│   ├── categories.ts
│   ├── currencies.ts
│   └── colors.ts
│
├── validation/
│   ├── index.ts
│   ├── accountSchema.ts
│   ├── transactionSchema.ts
│   ├── payableSchema.ts
│   ├── budgetSchema.ts
│   └── goalSchema.ts
│
├── services/
│   ├── database/
│   │   ├── index.ts
│   │   ├── migrations.ts
│   │   ├── accountRepo.ts
│   │   ├── transactionRepo.ts
│   │   ├── payableRepo.ts
│   │   ├── categoryRepo.ts
│   │   ├── budgetRepo.ts
│   │   ├── goalRepo.ts
│   │   └── importRepo.ts
│   │
│   ├── accountService.ts
│   ├── transactionService.ts
│   ├── payableService.ts
│   ├── transferService.ts
│   ├── budgetService.ts
│   ├── goalService.ts
│   ├── trendService.ts
│   ├── importService.ts
│   ├── exportService.ts
│   └── syncService.ts
│
├── hooks/
│   ├── useAccounts.ts
│   ├── useTransactions.ts
│   ├── usePayables.ts
│   ├── useBudgets.ts
│   ├── useGoals.ts
│   ├── useTrends.ts
│   └── useSync.ts
│
├── utils/
│   ├── dateUtils.ts
│   ├── moneyUtils.ts
│   ├── idUtils.ts
│   └── formatUtils.ts
│
├── components/
│   ├── common/
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── MoneyText.tsx
│   │   ├── DatePicker.tsx
│   │   └── CategoryPicker.tsx
│   │
│   ├── accounts/
│   │   ├── AccountCard.tsx
│   │   ├── AccountList.tsx
│   │   └── AccountForm.tsx
│   │
│   ├── transactions/
│   │   ├── TransactionCard.tsx
│   │   ├── TransactionList.tsx
│   │   ├── TransactionForm.tsx
│   │   └── SplitTransactionForm.tsx
│   │
│   ├── payables/
│   │   ├── PayableCard.tsx
│   │   ├── PayableList.tsx
│   │   └── PayableForm.tsx
│   │
│   ├── budgets/
│   │   ├── BudgetCard.tsx
│   │   ├── BudgetProgress.tsx
│   │   └── BudgetForm.tsx
│   │
│   ├── goals/
│   │   ├── GoalCard.tsx
│   │   ├── GoalProgress.tsx
│   │   └── GoalForm.tsx
│   │
│   └── trends/
│       ├── CategoryChart.tsx
│       ├── CashFlowChart.tsx
│       └── AccountSummary.tsx
│
├── screens/
│   ├── HomeScreen.tsx
│   ├── PayablesScreen.tsx
│   ├── PayableDetailScreen.tsx
│   ├── AccountsScreen.tsx
│   ├── AccountDetailScreen.tsx
│   ├── TrendsScreen.tsx
│   ├── BudgetsScreen.tsx
│   ├── GoalsScreen.tsx
│   ├── TransferScreen.tsx
│   ├── ImportScreen.tsx
│   ├── ExportScreen.tsx
│   ├── SettingsScreen.tsx
│   └── CategoryManagementScreen.tsx
│
└── navigation/
    ├── index.tsx
    ├── MainTabs.tsx
    └── types.ts
```

---

## Navigation Structure

### Bottom Tabs
```
┌──────────┬──────────┬──────────┬──────────┐
│   Home   │ Payables │ Accounts │  Trends  │
└──────────┴──────────┴──────────┴──────────┘
```

### Screen Flow
```
Home
├── → PayableDetail (tap upcoming bill)
├── → AccountDetail (tap account summary)
└── → Settings (gear icon)

Payables
├── → PayableDetail (tap item)
├── → PayableForm (add/edit)
└── → TransactionForm (mark paid → create transaction)

Accounts
├── → AccountDetail
│   ├── → TransactionForm (add)
│   ├── → TransactionDetail (tap item)
│   ├── → ImportScreen
│   └── → TransferScreen
├── → AccountForm (add/edit)
└── → ReconcileScreen

Trends
├── → CategoryDetail (tap category)
├── → BudgetsScreen
│   └── → BudgetForm
└── → GoalsScreen
    └── → GoalForm

Settings
├── → CategoryManagementScreen
├── → ExportScreen
├── → SyncSettings
└── → About
```

---

## Database Schema (SQLite)

```sql
-- Accounts
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'credit', 'loan')),
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  institution_name TEXT,
  account_number_last4 TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  reconciled_balance REAL,
  reconciled_date TEXT,
  credit_limit REAL,
  minimum_payment REAL,
  payment_due_day INTEGER,
  apr REAL,
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Categories
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_category_id TEXT REFERENCES categories(id),
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Transactions
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  notes TEXT,
  linked_payable_id TEXT REFERENCES payables(id),
  transfer_id TEXT REFERENCES transfers(id),
  is_split INTEGER NOT NULL DEFAULT 0,
  parent_transaction_id TEXT REFERENCES transactions(id),
  import_batch_id TEXT REFERENCES import_batches(id),
  external_id TEXT,
  is_reconciled INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Transaction Splits
CREATE TABLE transaction_splits (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  amount REAL NOT NULL,
  notes TEXT
);

-- Transfers
CREATE TABLE transfers (
  id TEXT PRIMARY KEY,
  from_account_id TEXT NOT NULL REFERENCES accounts(id),
  to_account_id TEXT NOT NULL REFERENCES accounts(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  from_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  to_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Payables
CREATE TABLE payables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_date TEXT,
  paid_from_account_id TEXT REFERENCES accounts(id),
  linked_transaction_id TEXT REFERENCES transactions(id),
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_frequency TEXT,
  recurrence_interval INTEGER,
  recurrence_day_of_month INTEGER,
  recurrence_day_of_week INTEGER,
  recurrence_end_date TEXT,
  parent_payable_id TEXT REFERENCES payables(id),
  category_id TEXT REFERENCES categories(id),
  notes TEXT,
  payee TEXT,
  auto_pay_account_id TEXT REFERENCES accounts(id),
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Budgets
CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  amount REAL NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  rollover INTEGER NOT NULL DEFAULT 0,
  rolled_amount REAL NOT NULL DEFAULT 0,
  alert_threshold INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Goals
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  linked_account_id TEXT REFERENCES accounts(id),
  icon TEXT,
  color TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_date TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Import Batches
CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  filename TEXT NOT NULL,
  import_date TEXT NOT NULL,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  new_transactions INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_external ON transactions(account_id, external_id);
CREATE INDEX idx_payables_due_date ON payables(due_date);
CREATE INDEX idx_payables_parent ON payables(parent_payable_id);
CREATE INDEX idx_budgets_category ON budgets(category_id);
```

---

## Implementation Phases

### Phase 1: Architecture Refactor (Days 1-2)
- [ ] Create folder structure
- [ ] Set up types with proper exports
- [ ] Create validation schemas (Zod)
- [ ] Create utility functions
- [ ] Create constants files
- [ ] Set up ErrorBoundary component

### Phase 2: Database Layer (Days 3-4)
- [ ] Create migration system
- [ ] Write new schema migrations
- [ ] Create all repository files
- [ ] Write data migration from old schema
- [ ] Test migrations thoroughly

### Phase 3: Service Layer (Days 5-7)
- [ ] AccountService (CRUD, balance updates)
- [ ] TransactionService (CRUD, account balance sync)
- [ ] PayableService (CRUD, recurrence generation)
- [ ] TransferService (create paired transactions)
- [ ] CategoryService (CRUD, defaults)
- [ ] ImportService (OCR integration, deduplication)
- [ ] Create hooks for each service

### Phase 4: Advanced Features (Days 8-10)
- [ ] BudgetService (CRUD, progress calculation)
- [ ] GoalService (CRUD, progress tracking)
- [ ] TrendService (analytics queries)
- [ ] ExportService (CSV, PDF generation)
- [ ] SyncService (update for new schema)

### Phase 5: UI Components (Days 11-14)
- [ ] Common components (MoneyText, DatePicker, etc.)
- [ ] Account components
- [ ] Transaction components (including splits)
- [ ] Payable components
- [ ] Budget components
- [ ] Goal components
- [ ] Trend/chart components

### Phase 6: Screens (Days 15-18)
- [ ] HomeScreen (new dashboard)
- [ ] AccountsScreen + AccountDetailScreen
- [ ] PayablesScreen + PayableDetailScreen
- [ ] TrendsScreen
- [ ] BudgetsScreen
- [ ] GoalsScreen
- [ ] TransferScreen
- [ ] ImportScreen
- [ ] ExportScreen
- [ ] Settings screens
- [ ] Navigation wiring

### Phase 7: OCR Integration (Days 19-20)
- [ ] Update prompts for new DSL
- [ ] Update ImportService to handle OCR response
- [ ] Test end-to-end import flow
- [ ] Handle deduplication

### Phase 8: Polish (Days 21-22)
- [ ] Delete old code
- [ ] Update cloud sync for new schema
- [ ] Error handling review
- [ ] Performance testing
- [ ] Final testing

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Account balance | Stored, updated on transaction CRUD | Performance; reconciliation support |
| Recurring payables | Auto-create next when paid | Simpler; less clutter than generating all future |
| Import deduplication | `externalId` per account | Unique constraint prevents duplicates |
| Soft delete | `syncStatus: 'deleted'` everywhere | Cloud sync compatibility |
| Transfer | Creates paired transactions | Audit trail; works with existing transaction logic |

---

## Rollback Instructions

If refactor fails:

```bash
# Discard all changes and return to stable state
git checkout v0.1.0-stable

# Or create a new branch from stable
git checkout -b fix-refactor v0.1.0-stable
```

---

## Related Files

- `OCR_PIPELINE_SESSION.md` - OCR pipeline development history
- `PROJECT_STATUS_2026-01-25.md` - Project snapshot at stable tag
- `ocr-pipeline/` - OCR Docker infrastructure (keep separate from refactor)
