# Files to Delete/Rewrite in Phase 2+

## Old App Screens (DELETE in Phase 5)
These use old types and will be completely rewritten:

- `app/(app)/bills.tsx` → Replace with PayablesScreen
- `app/(app)/debts.tsx` → Replace with AccountsScreen (credit accounts)
- `app/(app)/transactions.tsx` → Remove (transactions now per-account)
- `app/(app)/income.tsx` → Remove (income is just a transaction type)
- `app/(app)/import.tsx` → Rewrite for new import flow
- `app/(app)/add.tsx` → Rewrite for new add flows
- `app/(app)/index.tsx` → Rewrite HomeScreen
- `app/(app)/_layout.tsx` → New navigation structure

## Old Services (REWRITE in Phase 2-3)
- `src/services/DatabaseService.ts` → Split into repos + services
- `src/services/SyncService.ts` → Update for new schema
- `src/services/OCRService.ts` → Update for new types

## Old Types (KEEP BUT DEPRECATED)
Files that reference old types - marked for cleanup:
- `src/utils/Calculator.ts` → Rewrite in Phase 3
- `src/utils/Calculator.test.ts` → Rewrite tests

## Old Constants (DEPRECATED)
- `src/constants/theme.ts` → Merged into colors.ts, DELETE

## To Keep
- `src/config/supabase.ts` → Keep (infrastructure)
- `src/contexts/AuthContext.tsx` → Keep (auth flow)
- `src/contexts/SyncContext.tsx` → Update for new types in Phase 4
- `src/hooks/useAuth.ts` → Keep
- `src/hooks/useSync.ts` → Update for new types in Phase 4
- `src/services/AuthService.ts` → Keep
- `src/services/CloudService.ts` → Update for new schema
- `src/services/NetworkService.ts` → Keep
- `src/services/NotificationService.ts` → Keep
