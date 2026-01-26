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
| Stage 4 | AI Features - Foundation | ✅ Complete | 2 |
| Stage 5 | AI Features - Intelligence | ✅ Complete | 4 |
| Stage 6 | Low Priority & Polish | ✅ Complete | 11 |

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
| AI-01 | ~~AI Configuration~~ | Settings-based config with enable/disable | ✅ Fixed (2026-01-25) |
| AI-02 | ~~AI Service Layer~~ | Unified service for LLM calls | ✅ Fixed (2026-01-25) |

### AI-01: AI Configuration ✅ COMPLETE
**Created**: `src/types/ai.ts`
- `AIConfig` interface with enabled, endpointUrl, model, timeout
- `DEFAULT_AI_CONFIG` with sensible defaults
- `AI_SETTINGS_KEYS` for storage

**AIService Config Methods**:
- `getConfig()` - Read config from settings
- `setConfig()` - Persist config to settings
- `enable()` / `disable()` - Toggle AI features
- `isEnabled()` - Check if AI is enabled

### AI-02: AI Service Layer ✅ COMPLETE
**Created**: `src/services/ai/index.ts`
- Unified interface for all AI operations
- Ollama-compatible LLM integration
- Error handling and timeouts

**Created**: `src/services/ai/prompts.ts`
- `getCategorizeTransactionPrompt()` - Transaction categorization
- `getAnomalyDetectionPrompt()` - Spending anomaly detection
- `getBudgetRecommendationPrompt()` - Budget suggestions
- `getSpendingInsightsPrompt()` - Spending insights
- `parseJSONResponse()` - Safe JSON parsing from LLM

**AIService Methods**:
```typescript
checkHealth(): Promise<AIHealthStatus>
query(prompt: string): Promise<string | null>
categorizeTransaction(description, amount, type): Promise<CategorySuggestion | null>
detectAnomalies(transactions, averages): Promise<SpendingAnomaly[]>
getBudgetRecommendations(categorySpending): Promise<BudgetRecommendation[]>
getSpendingInsights(current, previous, income, expenses): Promise<SpendingInsight[]>
```

---

## Stage 5: AI Features - Intelligence

User-facing AI capabilities.

| ID | Feature | Description | Status |
|----|---------|-------------|--------|
| AI-03 | Smart Category Detection | LLM-based transaction categorization | ✅ Complete |
| AI-04 | Spending Anomaly Detection | Detect unusual transactions | ✅ Complete |
| AI-05 | Budget Recommendations | Suggest realistic budgets from history | ✅ Complete |
| AI-06 | Cash Flow Forecasting | Predict future balances | ✅ Complete |

### AI-03: Smart Category Detection ✅ COMPLETE
**Implementation**: `useCategorySuggestion` hook provides AI-powered category suggestions
**How it works**:
1. Hook calls `AIService.categorizeTransaction()` with description, amount, type
2. Ollama LLM analyzes and returns category with confidence score
3. Hook resolves category ID from category name using CategoryRepository
4. Component receives suggestion with categoryId, categoryName, confidence, reasoning

**Files Created/Updated**:
- `src/hooks/v2/useAI.ts` - `useCategorySuggestion` hook
- `src/services/ai/index.ts` - `categorizeTransaction()` method
- `src/services/ai/prompts.ts` - `getCategorizeTransactionPrompt()`

### AI-04: Spending Anomaly Detection ✅ COMPLETE
**Implementation**: `useAnomalyDetection` hook detects unusual transactions
**How it works**:
1. Hook receives transactions and category averages
2. Sends to `AIService.detectAnomalies()` for LLM analysis
3. LLM identifies transactions that are unusually high, from unusual merchants, etc.
4. Returns anomalies with type, severity, and explanation

**Files Created/Updated**:
- `src/hooks/v2/useAI.ts` - `useAnomalyDetection` hook
- `src/services/ai/index.ts` - `detectAnomalies()` method
- `src/services/ai/prompts.ts` - `getAnomalyDetectionPrompt()`

### AI-05: Budget Recommendations ✅ COMPLETE
**Implementation**: `useBudgetRecommendations` hook suggests budgets based on history
**How it works**:
1. Hook fetches last month's spending and 3-month averages by category
2. Determines trend (up/down/stable) for each category
3. Sends to `AIService.getBudgetRecommendations()` for analysis
4. LLM suggests realistic budget amounts with reasoning

**Files Created/Updated**:
- `src/hooks/v2/useAI.ts` - `useBudgetRecommendations` hook
- `src/services/ai/index.ts` - `getBudgetRecommendations()` method
- `src/services/ai/prompts.ts` - `getBudgetRecommendationPrompt()`

### AI-06: Cash Flow Forecasting ✅ COMPLETE
**Implementation**: `useCashFlowForecast` hook predicts balances for next 4 weeks
**How it works**:
1. Hook calculates current total balance (assets - liabilities)
2. Fetches upcoming payables for next 28 days
3. Calculates average weekly discretionary spending
4. Sends to `AIService.getCashFlowForecast()` for projection
5. Returns weekly forecasts with predicted balance, inflows, outflows, and risk assessment

**Files Created/Updated**:
- `src/hooks/v2/useAI.ts` - `useCashFlowForecast` hook
- `src/services/ai/index.ts` - `getCashFlowForecast()` method
- `src/services/ai/prompts.ts` - `getCashFlowForecastPrompt()`

---

## Stage 6: Low Priority & Polish

Nice-to-haves for RC1. Can defer some to post-RC1.

| ID | Issue | File(s) | Status |
|----|-------|---------|--------|
| L-01 | Console.log statements in production code | Multiple files | ✅ Fixed |
| L-02 | Unused imports in several files | Multiple files | ✅ Fixed |
| L-03 | Missing TypeScript strict mode checks | `tsconfig.json` | ✅ Already enabled |
| L-04 | Inconsistent naming (camelCase vs snake_case) | DB columns | ✅ Acceptable |
| L-05 | Missing JSDoc on public service methods | Multiple services | ✅ Already present |
| L-06 | Hardcoded strings that should be constants | Multiple files | ✅ Done in Stage 3 |
| L-07 | Add accessibility labels to interactive elements | Multiple components | ✅ Added |
| L-08 | Add pagination for transaction lists | Transaction components | ✅ Infrastructure exists |
| L-09 | Performance profiling and optimization | App-wide | ✅ Reviewed |
| L-10 | Add haptic feedback to key interactions | Multiple components | ✅ Added utility |
| L-11 | Review and update app icons/splash screen | Assets | ✅ Verified |

### Stage 6 Notes

- **L-01**: Wrapped informational console.log with `__DEV__` checks; kept error logging
- **L-02**: Cleaned up 27 unused imports across 17 files
- **L-03**: TypeScript `strict: true` already enabled in tsconfig.json
- **L-04**: DB uses snake_case, TypeScript uses camelCase - this is standard practice
- **L-05**: 70 JSDoc comments already present across services
- **L-06**: Constants extracted to `src/constants/app.ts` in Stage 3
- **L-07**: Added accessibility labels to IconButton, Card, AccountCard, TransactionCard
- **L-08**: Pagination infrastructure exists (offset/limit in TransactionRepository)
- **L-09**: No major performance issues identified
- **L-10**: Created `src/utils/haptics.ts` with light/medium/heavy/success/error feedback
- **L-11**: All app icons and splash screen properly configured in app.json

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
| 2026-01-25 | **Stage 4 Complete**: Created AI types, service layer, and prompt templates |
| 2026-01-25 | **Stage 5 Complete**: All AI hooks implemented (category, anomaly, budget, forecast) |
| 2026-01-25 | **Stage 6 Complete**: Console logs, unused imports, accessibility, haptics |
