# Driftmoney

A personal finance app that answers: *"How much money do I actually have right now?"*

Unlike traditional budget apps that track historical spending, Driftmoney focuses on **cash flow forecasting** and daily bill management.

## Philosophy

**Offline-First**: The app functions 100% locally using SQLite. Cloud sync (planned) serves only as backup, not a runtime dependency.

## Features

- **Draft Screen**: See your running balance and "Safe to Spend" amount
- **Bill Management**: Add, track, and mark bills as paid
- **Transaction Ledger**: Full history of all financial activity
- **Income Tracking**: Record income with instant balance updates
- **Auto-Recurring**: Paid bills automatically create next month's entry

## Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Language**: TypeScript
- **Database**: SQLite (expo-sqlite)
- **Navigation**: Expo Router (file-based)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd driftmoney

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running the App

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android

# Expo Go (limited features)
npx expo start
```

## Project Structure

```
/app                    # Expo Router screens
  _layout.tsx           # Tab navigation
  index.tsx             # Draft (main dashboard)
  bills.tsx             # Bills list
  add.tsx               # Add bill form
  transactions.tsx      # Ledger history
  income.tsx            # Add income

/src
  /services
    DatabaseService.ts  # SQLite operations
  /types
    index.ts            # TypeScript interfaces
```

## Screens

| Screen | Description |
|--------|-------------|
| **Draft** | Running balance, safe to spend, upcoming bills |
| **Bills** | List all bills, mark paid, delete |
| **Add Bill** | Create new recurring bill |
| **Transactions** | Full ledger history |
| **Income** | Add income to balance |

## Roadmap

See [driftmoney application design and master plan.md](driftmoney%20application%20design%20and%20master%20plan.md) for full details.

- [x] Sprint 1: Foundation (Expo, SQLite, basic screens)
- [x] Sprint 2: Core Value (Draft calculation, bill tracking)
- [x] Sprint 2.5: Extended Features (full ledger system)
- [ ] Sprint 3: Polish (notifications, swipe gestures, UI)
- [ ] Sprint 4: Cloud (Spring Boot backend, AWS sync)

## License

Private - All rights reserved.
