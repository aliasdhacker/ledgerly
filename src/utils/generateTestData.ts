// Test Data Generator for DriftMoney
// Generates realistic sample data for testing and demos

import { AccountRepository, TransactionRepository, PayableRepository, BudgetRepository, GoalRepository } from '../repositories';
import { CATEGORY_IDS } from '../constants/categories';
import { TransactionType, RecurrenceFrequency } from '../types/common';

// Helper to generate random ID
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to get random date within range
const randomDate = (daysBack: number, daysForward = 0): string => {
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const end = new Date();
  end.setDate(end.getDate() + daysForward);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};

// Helper to get future date
const futureDate = (daysAhead: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
};

// Helper for random amount
const randomAmount = (min: number, max: number): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

// Helper to pick random item from array
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Transaction templates by category
const TRANSACTION_TEMPLATES = {
  [CATEGORY_IDS.FOOD]: [
    { desc: 'Trader Joes', min: 45, max: 120 },
    { desc: 'Whole Foods Market', min: 60, max: 180 },
    { desc: 'Starbucks', min: 5, max: 15 },
    { desc: 'Chipotle', min: 12, max: 18 },
    { desc: 'DoorDash', min: 25, max: 55 },
    { desc: 'Safeway', min: 30, max: 100 },
    { desc: 'Local Restaurant', min: 35, max: 85 },
    { desc: 'Pizza Delivery', min: 20, max: 40 },
  ],
  [CATEGORY_IDS.TRANSPORT]: [
    { desc: 'Shell Gas Station', min: 35, max: 75 },
    { desc: 'Chevron', min: 40, max: 80 },
    { desc: 'Uber', min: 12, max: 45 },
    { desc: 'Lyft', min: 10, max: 40 },
    { desc: 'Public Transit', min: 2.50, max: 5 },
    { desc: 'Parking Garage', min: 15, max: 35 },
  ],
  [CATEGORY_IDS.SHOPPING]: [
    { desc: 'Amazon', min: 15, max: 150 },
    { desc: 'Target', min: 25, max: 120 },
    { desc: 'Walmart', min: 20, max: 100 },
    { desc: 'Best Buy', min: 50, max: 300 },
    { desc: 'Home Depot', min: 30, max: 200 },
    { desc: 'Costco', min: 80, max: 250 },
  ],
  [CATEGORY_IDS.ENTERTAINMENT]: [
    { desc: 'Netflix', min: 15.99, max: 22.99 },
    { desc: 'Spotify', min: 10.99, max: 16.99 },
    { desc: 'AMC Theaters', min: 15, max: 35 },
    { desc: 'Steam Games', min: 10, max: 60 },
    { desc: 'Apple TV+', min: 9.99, max: 9.99 },
  ],
  [CATEGORY_IDS.HEALTH]: [
    { desc: 'CVS Pharmacy', min: 15, max: 80 },
    { desc: 'Gym Membership', min: 30, max: 50 },
    { desc: 'Doctor Copay', min: 25, max: 75 },
    { desc: 'Walgreens', min: 10, max: 45 },
  ],
  [CATEGORY_IDS.BILLS]: [
    { desc: 'AT&T Wireless', min: 85, max: 120 },
    { desc: 'Comcast Internet', min: 80, max: 100 },
    { desc: 'Electric Company', min: 80, max: 200 },
    { desc: 'Water Utility', min: 30, max: 60 },
  ],
  [CATEGORY_IDS.PERSONAL]: [
    { desc: 'Hair Salon', min: 35, max: 80 },
    { desc: 'Dry Cleaning', min: 20, max: 45 },
    { desc: 'Spa Treatment', min: 60, max: 150 },
  ],
};

const INCOME_TEMPLATES = [
  { desc: 'Payroll Direct Deposit', min: 3500, max: 5500 },
  { desc: 'Freelance Payment', min: 500, max: 2000 },
  { desc: 'Interest Payment', min: 5, max: 50 },
  { desc: 'Refund', min: 20, max: 150 },
];

export async function generateTestData() {
  console.log('Starting test data generation...');

  // ========== ACCOUNTS ==========
  console.log('Creating accounts...');

  const checkingAccount = AccountRepository.create({
    name: 'Main Checking',
    type: 'bank',
    balance: 4523.67,
    currency: 'USD',
    institutionName: 'Chase Bank',
    accountNumberLast4: '4521',
    isActive: true,
    sortOrder: 1,
  });

  const savingsAccount = AccountRepository.create({
    name: 'High-Yield Savings',
    type: 'bank',
    balance: 12450.00,
    currency: 'USD',
    institutionName: 'Marcus by Goldman Sachs',
    accountNumberLast4: '8832',
    isActive: true,
    sortOrder: 2,
  });

  const creditCard = AccountRepository.create({
    name: 'Chase Sapphire',
    type: 'credit',
    balance: -1847.32, // Negative = owed
    currency: 'USD',
    institutionName: 'Chase',
    accountNumberLast4: '9912',
    isActive: true,
    sortOrder: 3,
    creditLimit: 10000,
    minimumPayment: 35,
    paymentDueDay: 15,
    apr: 24.99,
  });

  const creditCard2 = AccountRepository.create({
    name: 'Amex Gold',
    type: 'credit',
    balance: -523.45,
    currency: 'USD',
    institutionName: 'American Express',
    accountNumberLast4: '1001',
    isActive: true,
    sortOrder: 4,
    creditLimit: 15000,
    minimumPayment: 25,
    paymentDueDay: 22,
    apr: 21.99,
  });

  const carLoan = AccountRepository.create({
    name: 'Auto Loan',
    type: 'loan',
    balance: -18500.00,
    currency: 'USD',
    institutionName: 'Capital One Auto',
    accountNumberLast4: '7744',
    isActive: true,
    sortOrder: 5,
    loanPrincipal: 28000,
    loanInterestRate: 5.99,
    loanMonthlyPayment: 485,
    loanStartDate: '2023-03-15',
    loanEndDate: '2028-03-15',
    loanPaymentFrequency: RecurrenceFrequency.MONTHLY,
    loanPaymentDay: 15,
  });

  console.log('Created 5 accounts');

  // ========== TRANSACTIONS ==========
  console.log('Creating transactions...');

  const accounts = [
    { account: checkingAccount, weight: 0.5 },
    { account: creditCard, weight: 0.35 },
    { account: creditCard2, weight: 0.15 },
  ];

  // Generate 3 months of transactions
  let transactionCount = 0;

  // Add bi-weekly paychecks (6 over 3 months)
  for (let i = 0; i < 6; i++) {
    const payDate = new Date();
    payDate.setDate(payDate.getDate() - (i * 14));
    TransactionRepository.create({
      accountId: checkingAccount.id,
      type: TransactionType.CREDIT,
      amount: randomAmount(3800, 4200),
      description: 'Payroll Direct Deposit',
      date: payDate.toISOString().split('T')[0],
      categoryId: CATEGORY_IDS.INCOME,
    });
    transactionCount++;
  }

  // Generate expense transactions
  for (let day = 0; day < 90; day++) {
    const transactionsToday = Math.floor(Math.random() * 4); // 0-3 transactions per day

    for (let t = 0; t < transactionsToday; t++) {
      // Pick random category
      const categoryId = pickRandom(Object.keys(TRANSACTION_TEMPLATES));
      const templates = TRANSACTION_TEMPLATES[categoryId as keyof typeof TRANSACTION_TEMPLATES];
      const template = pickRandom(templates);

      // Pick random account
      const accountChoice = Math.random();
      let account = checkingAccount;
      if (accountChoice > 0.5 && accountChoice < 0.85) {
        account = creditCard;
      } else if (accountChoice >= 0.85) {
        account = creditCard2;
      }

      const transDate = new Date();
      transDate.setDate(transDate.getDate() - day);

      TransactionRepository.create({
        accountId: account.id,
        type: TransactionType.DEBIT,
        amount: randomAmount(template.min, template.max),
        description: template.desc,
        date: transDate.toISOString().split('T')[0],
        categoryId,
      });
      transactionCount++;
    }
  }

  // Add some specific recent transactions for variety
  const recentTransactions = [
    { desc: 'Apple Store - iPhone Case', amount: 49.99, cat: CATEGORY_IDS.SHOPPING, account: creditCard },
    { desc: 'Costco Gas', amount: 62.35, cat: CATEGORY_IDS.TRANSPORT, account: checkingAccount },
    { desc: 'Venmo - John Doe', amount: 45.00, cat: CATEGORY_IDS.OTHER, account: checkingAccount },
    { desc: 'Electric Bill Payment', amount: 145.82, cat: CATEGORY_IDS.BILLS, account: checkingAccount },
    { desc: 'Pet Supplies Plus', amount: 67.43, cat: CATEGORY_IDS.SHOPPING, account: creditCard },
  ];

  for (const tx of recentTransactions) {
    TransactionRepository.create({
      accountId: tx.account.id,
      type: TransactionType.DEBIT,
      amount: tx.amount,
      description: tx.desc,
      date: randomDate(7),
      categoryId: tx.cat,
    });
    transactionCount++;
  }

  console.log(`Created ${transactionCount} transactions`);

  // ========== PAYABLES (BILLS) ==========
  console.log('Creating payables...');

  const payables = [
    { name: 'Rent', amount: 2200, dueDay: 1, payee: 'Skyline Apartments', recurring: true },
    { name: 'Car Insurance', amount: 145, dueDay: 5, payee: 'Geico', recurring: true },
    { name: 'Internet', amount: 89.99, dueDay: 12, payee: 'Comcast', recurring: true },
    { name: 'Phone Bill', amount: 95, dueDay: 18, payee: 'AT&T', recurring: true },
    { name: 'Gym Membership', amount: 45, dueDay: 1, payee: 'Planet Fitness', recurring: true },
    { name: 'Netflix', amount: 22.99, dueDay: 8, payee: 'Netflix', recurring: true },
    { name: 'Spotify Family', amount: 16.99, dueDay: 15, payee: 'Spotify', recurring: true },
    { name: 'Car Payment', amount: 485, dueDay: 15, payee: 'Capital One Auto', recurring: true },
    { name: 'Electric Bill', amount: 125, dueDay: 20, payee: 'PG&E', recurring: true },
  ];

  for (const p of payables) {
    // Calculate next due date
    const today = new Date();
    let dueDate = new Date(today.getFullYear(), today.getMonth(), p.dueDay);
    if (dueDate <= today) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    PayableRepository.create({
      name: p.name,
      amount: p.amount,
      dueDate: dueDate.toISOString().split('T')[0],
      isRecurring: p.recurring,
      recurrenceRule: p.recurring ? {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        dayOfMonth: p.dueDay,
      } : undefined,
      payee: p.payee,
      categoryId: CATEGORY_IDS.BILLS,
    });
  }

  // Add a one-time payable
  PayableRepository.create({
    name: 'Annual HOA Fee',
    amount: 350,
    dueDate: futureDate(45),
    isRecurring: false,
    payee: 'HOA Management',
    categoryId: CATEGORY_IDS.HOUSING,
  });

  console.log('Created 10 payables');

  // ========== BUDGETS ==========
  console.log('Creating budgets...');

  const budgets = [
    { name: 'Groceries', categoryId: CATEGORY_IDS.FOOD, amount: 600 },
    { name: 'Dining Out', categoryId: CATEGORY_IDS.FOOD, amount: 300 },
    { name: 'Gas & Transport', categoryId: CATEGORY_IDS.TRANSPORT, amount: 250 },
    { name: 'Entertainment', categoryId: CATEGORY_IDS.ENTERTAINMENT, amount: 150 },
    { name: 'Shopping', categoryId: CATEGORY_IDS.SHOPPING, amount: 400 },
    { name: 'Personal Care', categoryId: CATEGORY_IDS.PERSONAL, amount: 100 },
  ];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  for (const b of budgets) {
    BudgetRepository.create({
      name: b.name,
      categoryId: b.categoryId,
      amount: b.amount,
      period: RecurrenceFrequency.MONTHLY,
      startDate: startOfMonth.toISOString().split('T')[0],
      rollover: false,
      alertThreshold: 0.8, // Alert at 80%
    });
  }

  console.log('Created 6 budgets');

  // ========== GOALS ==========
  console.log('Creating goals...');

  const goals = [
    { name: 'Emergency Fund', target: 15000, current: 12450, icon: '🛡️', color: '#4CAF50' },
    { name: 'Vacation to Japan', target: 5000, current: 1850, icon: '✈️', color: '#5F27CD', date: futureDate(180) },
    { name: 'New MacBook', target: 2500, current: 800, icon: '💻', color: '#45B7D1', date: futureDate(120) },
    { name: 'Down Payment Fund', target: 50000, current: 8500, icon: '🏠', color: '#F7DC6F' },
  ];

  for (const g of goals) {
    GoalRepository.create({
      name: g.name,
      targetAmount: g.target,
      currentAmount: g.current,
      targetDate: g.date,
      linkedAccountId: g.name === 'Emergency Fund' ? savingsAccount.id : undefined,
      icon: g.icon,
      color: g.color,
    });
  }

  console.log('Created 4 goals');

  console.log('\n✅ Test data generation complete!');
  console.log('Summary:');
  console.log('  - 5 accounts (2 bank, 2 credit, 1 loan)');
  console.log(`  - ${transactionCount} transactions (3 months of history)`);
  console.log('  - 10 payables (9 recurring, 1 one-time)');
  console.log('  - 6 budgets');
  console.log('  - 4 savings goals');

  return {
    accounts: 5,
    transactions: transactionCount,
    payables: 10,
    budgets: 6,
    goals: 4,
  };
}

export default generateTestData;
