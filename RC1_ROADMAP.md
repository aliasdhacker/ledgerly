# DriftMoney Release Candidate 1 Roadmap

**Created**: January 25, 2026
**Target**: RC1 - Feature Complete with Quality Fixes
**Status**: Planning

---

## Overview

This document tracks all issues, fixes, and features required for Release Candidate 1. Items are organized into stages by priority and dependency.

---

## Stage Summary

| Stage | Focus | Status | Items |
|-------|-------|--------|-------|
| Stage 1 | Critical Bug Fixes | ✅ Complete | 4 (all fixed) |
| Stage 2 | High Priority Fixes | ✅ Complete | 8 (all fixed) |
| Stage 3 | Medium Priority Fixes | ✅ Complete | 10 (all addressed) |
| Stage 4 | AI Features - Foundation | Not Started | 2 |
| Stage 5 | AI Features - Intelligence | Not Started | 4 |
| Stage 6 | Low Priority & Polish | Not Started | 11 |

**Total Items**: 39

---

## Stage 1: Critical Bug Fixes

Must fix before any testing. Data integrity and crash issues.

| ID | Issue | File(s) | Status |
|----|-------|---------|--------|
| C-01 | ~~`execute()` returns void but code expects `result.changes`~~ | `src/db/connection.ts` | ✅ Fixed (Phase 0) |
| C-02 | ~~Race conditions in TransactionService/PayableService~~ | Multiple services | ✅ Fixed (Phase 1) |
| C-03 | ~~CoreGraphics NaN errors in UI~~ | `ProgressBar.tsx`, `AccountCard.tsx` | ✅ Fixed (2026-01-25) |
| C-04 | ~~Settings table missing on fresh install~~ | `src/db/connection.ts` | ✅ Fixed (2026-01-25) |

### C-03: CoreGraphics NaN Errors ✅ FIXED
**Symptoms**: Console logs show "invalid numeric value (NaN, or not-a-number) to CoreGraphics API"
**Root Cause**: `ProgressBar` and `AccountCard` components didn't guard against NaN in percentage calculations
**Fix Applied**:
- `src/components/common/ProgressBar.tsx`: Added `safeProgress` guard with `isNaN()` and `isFinite()` checks
- `src/components/accounts/AccountCard.tsx`: Added `> 0` guards and `Math.max(0, ...)` to utilization bar widths

### C-04: Settings Table Missing ✅ FIXED
**Symptoms**: Error on fresh install: "no such table: settings"
**Root Cause**: `getSetting()` called before migrations created the settings table
**Fix Applied**:
- `src/db/connection.ts`: Settings table now created immediately when database is opened, before any migrations run

---

## Stage 2: High Priority Fixes

Affects core functionality. Should fix before beta testing.

| ID | Issue | File(s) | Status |
|----|-------|---------|--------|
| H-01 | ~~Hardcoded OCR URL~~ | `src/services/OCRService.ts` | ✅ Fixed (2026-01-25) |
| H-02 | ~~Missing `isActive` filter~~ | Already handled | ✅ Already OK |
| H-03 | ~~Insufficient funds validation~~ | `src/services/v2/TransferService.ts` | ✅ Fixed (Phase 2) |
| H-04 | ~~Missing null checks for creditLimit~~ | Already handled | ✅ Already OK |
| H-05 | ~~Payable dayOfMonth validation~~ | `src/services/v2/PayableService.ts` | ✅ Fixed (2026-01-25) |
| H-06 | ~~No transaction rollback~~ | Multiple services | ✅ Fixed (Phase 1) |
| H-07 | ~~Budget period calculations~~ | `src/services/v2/BudgetService.ts` | ✅ Fixed (2026-01-25) |
| H-08 | ~~Negative amount validation~~ | Validation schemas | ✅ Already OK |

### H-01: Hardcoded OCR URL ✅ FIXED
**Issue**: OCR URL hardcoded as `192.168.98.104:8000`
**Fix Applied**:
- `src/services/OCRService.ts`: Now reads from settings with `getSetting('ocr_pipeline_url')`
- Added `setBaseUrl()` to persist URL changes
- Added `resetBaseUrl()` to restore defaults

### H-02: Missing isActive Filter ✅ ALREADY OK
**Analysis**: Service methods already default to `activeOnly = true`
- `getBankAccounts(activeOnly = true)`
- `getCreditAccounts(activeOnly = true)`
- `getLoanAccounts(activeOnly = true)`
Cases fetching all accounts (export, summary) intentionally include inactive.

### H-04: Null CreditLimit Checks ✅ ALREADY OK
**Analysis**: Code already guards with `account.creditLimit ? ... : 0`

### H-05: DayOfMonth Validation ✅ FIXED
**Issue**: Recurrence rule validation wasn't being called
**Fix Applied**:
- `src/services/v2/PayableService.ts`: Added `validateRecurrenceRule()` call in `create()` and `update()`
- Schema already had `min(1), max(31)` for dayOfMonth

### H-07: Budget Period Boundaries ✅ FIXED
**Issue**: Date calculations could have time component issues
**Fix Applied**:
- `src/services/v2/BudgetService.ts`: Normalized `today` to midnight
- Fixed biweekly calculation to use days instead of weeks for precision
- Ensured consistent date handling across all period types

### H-08: Negative Amount Validation ✅ ALREADY OK
**Analysis**: All validation schemas already use `positiveNumber` for amounts
- TransactionCreate, TransactionUpdate, TransferCreate, PayableCreate all validate

---

## Stage 3: Medium Priority Fixes

Code quality and robustness improvements.

| ID | Issue | File(s) | Status |
|----|-------|---------|--------|
| M-01 | ~~Type casting with `as any`~~ | Components (Ionicons) | ✅ Acceptable (type limitation) |
| M-02 | ~~Inconsistent error handling~~ | Multiple services | ✅ Fixed (Phase 2) |
| M-03 | ~~Missing loading states~~ | Components | ✅ Already OK (have LoadingSpinner) |
| M-04 | ~~Duplicate computed calculations~~ | AccountService | ✅ Already OK (intentional design) |
| M-05 | ~~Hardcoded magic numbers~~ | Multiple files | ✅ Fixed (2026-01-25) |
| M-06 | ~~Input sanitization~~ | Multiple services | ✅ Fixed (2026-01-25) |
| M-07 | ~~Date parsing timezone~~ | Multiple files | ✅ Fixed (2026-01-25) |
| M-08 | ~~Optional chaining~~ | Multiple files | ✅ Already OK |
| M-09 | ~~Hooks cleanup patterns~~ | Multiple hooks | ✅ Fixed (Phase 2) |
| M-10 | ~~Stale closure issues~~ | Multiple hooks | ✅ Already OK (deps correct) |

### M-01: Type Casting with `as any` ✅ ACCEPTABLE
**Analysis**: All `as any` casts are for Ionicons icon names
- Ionicons type definitions don't include all icon names
- This is a known workaround, not a bug
- No hooks use `as any` - only components for icon names

### M-03: Missing Loading States ✅ ALREADY OK
**Analysis**: Components properly use LoadingSpinner
- All screens have loading state handling
- RefreshControl used for pull-to-refresh

### M-04: Duplicate Computed Properties ✅ ALREADY OK
**Analysis**: Intentional design for different use cases
- `addComputedFields()` - simple computed props for lists
- `getCreditAccountsInfo()` - detailed info for dedicated screens
- Minor overlap in `isOverdue` is acceptable

### M-05: Magic Numbers ✅ FIXED
**Created**: `src/constants/app.ts`
**Exports**:
- `TIME_CONSTANTS` - UPCOMING_PAYABLES_DAYS, DUE_SOON_WARNING_DAYS, etc.
- `LIST_LIMITS` - DEFAULT_TRANSACTIONS, HOME_RECENT_TRANSACTIONS, etc.
- `VALIDATION_LIMITS` - MAX_NAME_LENGTH, MAX_NOTES_LENGTH, etc.
- `FINANCIAL_THRESHOLDS` - CREDIT_UTILIZATION_WARNING, etc.

### M-06: Input Sanitization ✅ FIXED
**Created**: `src/utils/sanitize.ts`
**Exports**:
- `sanitizeString()`, `sanitizeName()`, `sanitizeDescription()`, `sanitizeNotes()`
- `clampNumber()`, `sanitizeDayOfMonth()`
- `normalizeDate()`, `parseLocalDate()`

### M-07: Timezone Issues ✅ FIXED
**Created**: `src/utils/sanitize.ts`
- `normalizeDate()` - ensures YYYY-MM-DD format
- `parseLocalDate()` - creates date at midnight local time
- BudgetService already fixed in Stage 2 (H-07)

### M-08: Optional Chaining ✅ ALREADY OK
**Analysis**: Code already uses optional chaining appropriately
- `?.` operator used throughout codebase
- Null checks in place for critical paths

### M-10: Stale Closures ✅ ALREADY OK
**Analysis**: Hook dependency arrays are correct
- All useCallback hooks have proper deps
- refresh() correctly included where used

---

## Stage 4: AI Features - Foundation

Infrastructure for AI capabilities. Required before Stage 5.

| ID | Feature | Description | Status |
|----|---------|-------------|--------|
| AI-01 | Environment-based AI Config | Move Ollama URL to settings, add toggle | 🔴 Not Started |
| AI-02 | AI Service Layer | Create unified AI service for LLM calls | 🔴 Not Started |

### AI-01: Environment-based AI Config
**Current State**: OCR uses hardcoded Ollama URL
**Goal**: User can configure AI endpoint in settings
**Files to Create/Modify**:
- `src/services/ai/config.ts` - AI configuration
- `src/types/settings.ts` - Add AI settings type
- `app/(app)/settings/index.tsx` - Add AI settings section
- `src/db/schema.ts` - Add settings table if not exists

### AI-02: AI Service Layer
**Goal**: Unified interface for all AI operations
**Files to Create**:
- `src/services/ai/index.ts` - Main AI service
- `src/services/ai/prompts.ts` - Prompt templates
- `src/types/ai.ts` - AI-related types

**Interface**:
```typescript
interface AIService {
  isAvailable(): Promise<boolean>;
  categorizeTransaction(description: string): Promise<CategorySuggestion>;
  analyzeSpending(transactions: Transaction[]): Promise<SpendingInsight[]>;
  suggestBudget(categoryId: string, history: Transaction[]): Promise<BudgetSuggestion>;
  detectAnomalies(transactions: Transaction[]): Promise<Anomaly[]>;
}
```

---

## Stage 5: AI Features - Intelligence

User-facing AI capabilities.

| ID | Feature | Description | Status |
|----|---------|-------------|--------|
| AI-03 | Smart Category Detection | LLM-based transaction categorization | 🔴 Not Started |
| AI-04 | Spending Anomaly Detection | Detect unusual transactions | 🔴 Not Started |
| AI-05 | Budget Recommendations | Suggest realistic budgets from history | 🔴 Not Started |
| AI-06 | Cash Flow Forecasting | Predict future balances | 🔴 Not Started |

### AI-03: Smart Category Detection
**Current**: Keyword matching in `TransactionService.ts:73-110`
**Goal**: Send description to Ollama, get category with confidence
**User Flow**:
1. User imports/adds transaction
2. AI suggests category
3. User confirms or corrects
4. (Future) Learn from corrections

**Files**:
- `src/services/ai/categorization.ts`
- `src/services/v2/TransactionService.ts` (update)
- `src/components/transactions/TransactionForm.tsx` (show suggestion)

### AI-04: Spending Anomaly Detection
**Goal**: Alert user to unusual transactions
**Algorithm**:
1. Calculate rolling average per category
2. Calculate standard deviation
3. Flag if transaction > avg + 2*stddev

**Files**:
- `src/services/ai/anomalies.ts`
- `src/components/common/AnomalyAlert.tsx`
- `app/(app)/index.tsx` (show alerts on home)

### AI-05: Budget Recommendations
**Goal**: "Based on last 3 months, you typically spend $X on Y"
**Algorithm**:
1. Aggregate spending by category for past N months
2. Calculate average and trend
3. Suggest budget = avg + buffer

**Files**:
- `src/services/ai/budgetRecommendations.ts`
- `app/(app)/trends/budgets.tsx` (show recommendations)

### AI-06: Cash Flow Forecasting
**Goal**: Predict account balances for next 2-4 weeks
**Algorithm**:
1. Get recurring payables and expected dates
2. Get average weekly spending by category
3. Project balance: current - upcoming_payables - avg_weekly_spend

**Files**:
- `src/services/ai/forecasting.ts`
- `src/components/trends/ForecastChart.tsx`
- `app/(app)/index.tsx` or `app/(app)/trends/index.tsx`

---

## Stage 6: Low Priority & Polish

Nice-to-haves for RC1. Can defer some to post-RC1.

| ID | Issue | File(s) | Status |
|----|-------|---------|--------|
| L-01 | Console.log statements in production code | Multiple files | 🔴 Not Started |
| L-02 | Unused imports in several files | Multiple files | 🔴 Not Started |
| L-03 | Missing TypeScript strict mode checks | `tsconfig.json` | 🔴 Not Started |
| L-04 | Inconsistent naming (camelCase vs snake_case) | DB columns | 🔴 Not Started |
| L-05 | Missing JSDoc on public service methods | Multiple services | 🔴 Not Started |
| L-06 | Hardcoded strings that should be constants | Multiple files | 🔴 Not Started |
| L-07 | Add accessibility labels to interactive elements | Multiple components | 🔴 Not Started |
| L-08 | Add pagination for transaction lists | Transaction components | 🔴 Not Started |
| L-09 | Performance profiling and optimization | App-wide | 🔴 Not Started |
| L-10 | Add haptic feedback to key interactions | Multiple components | 🔴 Not Started |
| L-11 | Review and update app icons/splash screen | Assets | 🔴 Not Started |

---

## Previously Completed (Reference)

From PROJECT_STATUS.md - already fixed in Quality Hardening:

### Phase 0 (Infrastructure) ✅
- Fixed `execute()` return type to include `changes`
- Added `withTransaction()` for atomic operations
- Added `safeJsonParse()` with validation
- Added `atomicAdjustBalance()` for race-free balance updates
- Fixed SyncContext circular dependencies

### Phase 1 (Data Integrity) ✅
- TransferService: `create()`, `delete()` wrapped in transactions
- TransactionService: `create()`, `update()`, `delete()` wrapped
- PayableService: `markPaid()`, `markUnpaid()` wrapped
- All balance updates use atomic SQL arithmetic
- N+1 queries fixed in PayableRepository, TransferService, TrendService

### Phase 2 (Error Handling) ✅
- Standardized `ServiceResult<T>` type across all services
- Hook cleanup patterns added to 12 hooks
- Insufficient funds validation added to transfers

---

## Testing Checklist for RC1

Before marking RC1 complete:

### Core Functionality
- [ ] Create bank account
- [ ] Create credit account
- [ ] Create loan account (with recurring payment)
- [ ] Add transaction to account
- [ ] Create transfer between accounts
- [ ] Pay credit card from bank account
- [ ] Mark payable as paid
- [ ] Create/track budget
- [ ] Create/track goal

### Edge Cases
- [ ] Insufficient funds transfer (should fail gracefully)
- [ ] Delete account with transactions
- [ ] Delete last account
- [ ] Create payable with invalid day (32nd)
- [ ] Handle offline gracefully

### AI Features (if included)
- [ ] AI categorization suggests correct category
- [ ] Anomaly detection flags unusual spend
- [ ] Budget recommendation is reasonable
- [ ] Forecast shows correct upcoming payables

### Performance
- [ ] App launches in < 3 seconds
- [ ] Accounts list scrolls smoothly with 10+ accounts
- [ ] Transaction list scrolls smoothly with 100+ transactions

---

## How to Update This Document

When working on an item:
1. Change status from 🔴 to 🟡 (In Progress)
2. When complete, change to ✅ and add completion date
3. Add any notes about implementation decisions

**Status Legend**:
- 🔴 Not Started
- 🟡 In Progress
- ✅ Complete
- ⏸️ Deferred (with reason)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-25 | Initial RC1 roadmap created |
| 2026-01-25 | Incorporated completed items from PROJECT_STATUS.md |
| 2026-01-25 | **Stage 1 Complete**: Fixed C-03 (NaN errors) and C-04 (settings table) |
| 2026-01-25 | **Stage 2 Complete**: Fixed H-01 (OCR URL), H-05 (dayOfMonth), H-07 (budget periods) |
| 2026-01-25 | **Stage 3 Complete**: Added constants/app.ts, utils/sanitize.ts; verified hooks OK |
