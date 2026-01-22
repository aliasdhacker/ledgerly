# Ledgerly AI Coding Guidelines

## Architecture Overview
Ledgerly is an offline-first personal finance app focusing on cash flow forecasting ("Draft" calculation). Built with React Native (Expo) + TypeScript + SQLite locally. Spring Boot backend on AWS for sync only.

- **Offline-first**: App functions 100% locally; cloud is backup/sync.
- **Hub-and-spoke**: Mobile app (spoke) syncs to AWS (hub).
- **Data flow**: Local SQLite with sync_status for conflict resolution.

## Key Patterns
### Data Model
- Use UUID primary keys (generated locally) to prevent sync collisions.
- Core entity: `Bill` with sync_status ('dirty', 'synced', 'deleted').
- SQL: snake_case columns; TypeScript: camelCase properties.

Example Bill interface:
```typescript
interface Bill {
  id: string; // UUID
  name: string;
  amount: number;
  dueDay: number; // 1-31
  isPaid: boolean;
  syncStatus: 'synced' | 'dirty' | 'deleted';
}
```

### Services Pattern
- `DatabaseService`: SQLite operations (init, CRUD).
- `CloudService`: Stub initially, later real REST API.
- `Calculator`: Pure logic for draft (balance - pending bills).

### Sync Strategy
- Push: Send dirty records to `/sync/push`, mark synced on 200 OK.
- Pull: GET `/sync/pull` for server changes since last timestamp.

## Development Workflow
- Init: `npx create-expo-app@latest ledgerly -t default`
- SQLite: `npx expo install expo-sqlite expo-file-system`
- Structure: `/src/{components,screens,services,utils,types}`
- State: React Context or Zustand.

## Conventions
- Recurring bills auto-renew monthly.
- Draft: Filter unpaid bills due between current day and target day.
- Notifications: Use `expo-notifications` for daily reminders.

Reference: [ledgerly application design and master plan.md](ledgerly application design and master plan.md)</content>
<parameter name="filePath">f:\Dev\Ledgerly\.github\copilot-instructions.md