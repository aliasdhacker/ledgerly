# Driftmoney: Application Design & Master Plan

**Version:** 1.0
**Target Platform:** iOS (Mobile First / Offline First)
**Backend:** Java Spring Boot (AWS Cloud)

---

## 1. Executive Summary
**Driftmoney** is a personal finance application designed to answer the question: *"How much money do I actually have right now?"* Unlike traditional budget apps that track historical spending, Driftmoney focuses on **cash flow forecasting** (The "Draft" calculation) and daily bill management.

**Core Philosophy:** "Offline-First." The application functions 100% locally on the device using SQLite. The Cloud (AWS/Spring Boot) serves strictly as a backup and synchronization mechanism, not a runtime dependency.

---

## 2. System Architecture

The system follows a **Hub-and-Spoke** model. The Mobile App is the primary interface (Spoke), and the AWS Cloud is the central synchronization point (Hub).

### A. The Client (Mobile - Phase 1)
* **Framework:** React Native (via **Expo**).
* **Language:** TypeScript.
* **Local Database:** **SQLite** (via `expo-sqlite`).
* **State Management:** React Context or Zustand.
* **Cloud Interface:** Service Adapter Pattern (Stubbed initially, implemented later).

### B. The Server (Cloud - Phase 2)
* **Framework:** Java 21 + Spring Boot 3.2.
* **Database:** PostgreSQL 15 (AWS RDS).
* **API Style:** RESTful API with Delta Sync logic.
* **Authentication:** JWT (Stateless).

### C. Infrastructure (DevOps - Phase 3)
* **Cloud Provider:** AWS.
* **Compute:** ECS Fargate (Serverless Containers).
* **IaC:** Terraform (Infrastructure as Code).
* **CI/CD:** GitHub Actions.

---

## 3. Data Model (Universal)

To ensure the "Offline-to-Cloud" transition is seamless, the local SQLite schema uses UUIDs (generated on the phone) to prevent primary key collisions when syncing.

### Core Entity: `Bill`

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. Generated locally on device. |
| `name` | `VARCHAR` | e.g., "State Farm Insurance". |
| `amount` | `DECIMAL` | The standard amount due. |
| `due_day` | `INTEGER` | 1-31. The recurring day of the month. |
| `is_recurring` | `BOOLEAN` | If true, automatically renews next month. |
| `is_paid` | `BOOLEAN` | Status for the current month. |
| `created_at` | `TIMESTAMP`| Audit field. |
| `updated_at` | `TIMESTAMP`| Used for conflict resolution during sync. |
| **`sync_status`** | `ENUM` | **Crucial:** `DIRTY` (Needs upload), `SYNCED` (Clean), `DELETED` (Soft delete). |

---

## 4. Phase 1 Implementation: Mobile MVP (Standalone)

**Objective:** Build a fully functional local app. The Cloud Service will be defined as an interface but implemented as a "Stub" (Mock).

### 4.1. Project Initialization
```bash
# Initialize Expo with TypeScript
npx create-expo-app@latest driftmoney -t default

# Navigate to project
cd driftmoney

# Install SQLite and FileSystem
npx expo install expo-sqlite expo-file-system
4.2. Directory Structure
Plaintext

/src
  /components     # UI Reusables (Cards, Inputs, Buttons)
  /screens        # Page Layouts (Dashboard, Draft, ManageBills)
  /services
    DatabaseService.ts   # SQLite connection & Raw Queries
    CloudService.ts      # The "Stub" for future API calls
  /utils
    Calculator.ts # The "Draft" business logic
  /types          # TypeScript Interfaces
4.3. Code Implementations
A. Database Service (src/services/DatabaseService.ts)
Handles all local data persistence.

TypeScript

import * as SQLite from 'expo-sqlite';

// Open the database (creates it if it doesn't exist)
const db = SQLite.openDatabaseSync('driftmoney.db');

export interface Bill {
  id: string; // UUID
  name: string;
  amount: number;
  dueDay: number; // 1-31
  isPaid: boolean; // For the current month
  syncStatus: 'synced' | 'dirty' | 'deleted'; // Key for future cloud sync
}

export const DatabaseService = {
  // 1. Initialize Tables
  init: () => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        due_day INTEGER NOT NULL,
        is_paid INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'dirty'
      );
    `);
  },

  // 2. Add a Bill
  addBill: (bill: Bill) => {
    const statement = db.prepareSync(
      'INSERT INTO bills (id, name, amount, due_day, is_paid, sync_status) VALUES ($id, $name, $amount, $dueDay, $isPaid, $syncStatus)'
    );
    try {
      statement.executeSync({
        $id: bill.id,
        $name: bill.name,
        $amount: bill.amount,
        $dueDay: bill.dueDay,
        $isPaid: bill.isPaid ? 1 : 0,
        $syncStatus: 'dirty' // Always dirty on creation
      });
    } finally {
        statement.finalizeSync();
    }
  },

  // 3. Get All Bills (Ordered by Due Date)
  getBills: (): Bill[] => {
    const result = db.getAllSync('SELECT * FROM bills ORDER BY due_day ASC');
    // Map snake_case SQL to camelCase TS
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      dueDay: row.due_day,
      isPaid: !!row.is_paid,
      syncStatus: row.sync_status,
    }));
  },
  
  // 4. Mark Bill as Paid
  togglePaidStatus: (id: string, currentStatus: boolean) => {
      db.runSync('UPDATE bills SET is_paid = ?, sync_status = ? WHERE id = ?', [!currentStatus ? 1 : 0, 'dirty', id]);
  }
};
B. The Draft Calculator (src/utils/Calculator.ts)
Pure business logic. No UI dependencies.

TypeScript

import { Bill } from '../services/DatabaseService';

export const calculateSafeToSpend = (
  currentBalance: number,
  bills: Bill[],
  targetDate: Date
): number => {
  const today = new Date();
  const targetDay = targetDate.getDate();
  const currentDay = today.getDate();

  // Filter bills:
  // 1. Must be unpaid
  // 2. Due date must be between Today and Target Date
  const pendingBills = bills.filter((bill) => {
    if (bill.isPaid) return false;
    
    // Logic: Check if bill is due within the window [Today, TargetDate]
    if (targetDate.getMonth() !== today.getMonth()) {
      // Window crosses month boundary (e.g. Jan 25 to Feb 5):
      // Include if due later this month (>= 25) OR due early next month (<= 5)
      return bill.dueDay >= currentDay || bill.dueDay <= targetDay;
    } else {
      // Same month window (e.g. Jan 5 to Jan 15):
      return bill.dueDay >= currentDay && bill.dueDay <= targetDay;
    }
  });

  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
  
  return currentBalance - totalPending;
};
C. Cloud Service Stub (src/services/CloudService.ts)
Prepares the app for the future Spring Boot backend.

TypeScript

import { Bill } from './DatabaseService';

// This is the contract we will fulfill with Java/AWS later
interface ICloudService {
  syncBills(localBills: Bill[]): Promise<void>;
  uploadSnapshot(balance: number, safeToSpend: number): Promise<void>;
}

export const CloudService: ICloudService = {
  // STUB: Simulate a network call that does nothing
  syncBills: async (localBills) => {
    console.log('[Cloud Stub] Syncing bills... (Simulated)');
    return new Promise((resolve) => setTimeout(resolve, 1000));
  },

  // STUB: Simulate uploading the draft calculation
  uploadSnapshot: async (balance, safeToSpend) => {
    console.log(`[Cloud Stub] Uploading snapshot: Balance ${balance}, Safe ${safeToSpend}`);
    return Promise.resolve();
  }
};
5. Phase 2: Cloud Integration Strategy
When the mobile app is stable, we implement the backend.

5.1. Spring Boot Architecture
Controller: SyncController.

POST /sync/push: Receives JSON list of "dirty" records from phone.

GET /sync/pull: Returns records changed since lastTimestamp.

Repository: BillRepository (JPA).

5.2. Sync Logic Flow
Mobile: SyncEngine runs on app open.

Push: Selects WHERE sync_status = 'DIRTY' from SQLite. Sends to Spring Boot.

Ack: On 200 OK from Spring, Mobile updates local records to sync_status = 'SYNCED'.

Pull: Mobile requests changes from Server. Server returns new rows.

6. Implementation Roadmap (Sprints)

### Sprint 1: The Foundation ✅ COMPLETE
- [x] Set up Expo & SQLite.
- [x] Create DatabaseService (Schema setup).
- [x] Build "Add Bill" Screen (Simple form).
- [x] Build "Bill List" Screen (Read from SQLite).

### Sprint 2: The Core Value ✅ COMPLETE
- [x] Implement Calculator.ts.
- [x] Build "Draft" Screen (Input: Balance -> Output: Safe Cash).
- [x] Hook Draft Screen to DatabaseService to pull real bill totals.

### Sprint 2.5: Extended Features ✅ COMPLETE (Bonus)
- [x] Full transaction/ledger system tracking all financial activity.
- [x] Income entry screen with transaction recording.
- [x] Transactions history screen (full ledger view).
- [x] Running balance calculated from all transactions.
- [x] "Safe to Spend" = Running Balance - Upcoming Bills.
- [x] "Paid this week" tracking with `paid_at` timestamps.
- [x] Unpaid bills modal on Draft screen.
- [x] Delete bill functionality with confirmation.
- [x] Mark bill paid auto-creates next month's recurring bill.

### Sprint 3: Polish & Reminders (Next Up)
- [ ] Implement expo-notifications for local daily reminders.
- [ ] Add "Mark as Paid" swipe gestures.
- [ ] UI Polish (Colors, Fonts, consistent styling).

### Sprint 4: The Cloud (Backend)
- [ ] Initialize Spring Boot Project.
- [ ] Write Terraform for AWS (VPC, RDS, ECS).
- [ ] Deploy Spring Boot to AWS.
- [ ] Replace CloudService stub with real API calls.
- [ ] Implement delta sync for transactions table.

---

## 7. Current App Structure

```
/app                    # Expo Router screens (file-based routing)
  _layout.tsx           # Tab navigation layout
  index.tsx             # Draft screen (main dashboard)
  bills.tsx             # Bills list with mark paid/delete
  add.tsx               # Add new bill form
  transactions.tsx      # Full ledger history
  income.tsx            # Add income screen

/src
  /services
    DatabaseService.ts  # SQLite operations & business logic
  /types
    index.ts            # TypeScript interfaces (Bill, Transaction)
```

### Database Tables
- **bills**: Recurring bills with due dates, amounts, paid status
- **transactions**: Full ledger (income, bill_paid, expense, credit)
- **settings**: Key-value store for app settings

### Transaction Types
| Type | Description | Effect on Balance |
|------|-------------|-------------------|
| `income` | Money received | + (credit) |
| `bill_paid` | Bill payment recorded | - (debit) |
| `expense` | General expense | - (debit) |
| `credit` | Refund/adjustment | + (credit) |