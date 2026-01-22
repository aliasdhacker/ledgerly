import { calculateSafeToSpend } from '../Calculator';
import { Bill } from '../../types';

describe('Calculator Logic (Draft)', () => {
  // Freeze "Today" to January 15th, 2024 for consistent testing
  const MOCK_TODAY = new Date('2024-01-15T12:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_TODAY);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const mockBills: Bill[] = [
    { id: '1', name: 'Rent', amount: 1000, dueDay: 1, isPaid: true, syncStatus: 'synced' }, // Paid, ignore
    { id: '2', name: 'Netflix', amount: 15, dueDay: 20, isPaid: false, syncStatus: 'synced' }, // Due soon (Jan 20)
    { id: '3', name: 'Gym', amount: 50, dueDay: 10, isPaid: false, syncStatus: 'synced' }, // Overdue (Jan 10) - technically "past" in current month logic, but usually unpaid means pending
    { id: '4', name: 'Insurance', amount: 100, dueDay: 5, isPaid: false, syncStatus: 'synced' }, // Next month (Feb 5)
  ];

  it('calculates safe spend within the same month', () => {
    // Target: Jan 25th.
    // Window: Jan 15 (Today) to Jan 25.
    // Should include: Netflix (20th).
    // Should exclude: Rent (Paid), Gym (10th - before window), Insurance (5th - next month logic not triggered).
    
    const targetDate = new Date('2024-01-25T12:00:00Z');
    const balance = 2000;

    const safe = calculateSafeToSpend(balance, mockBills, targetDate);

    // 2000 - 15 (Netflix) = 1985
    expect(safe).toBe(1985);
  });

  it('calculates safe spend crossing a month boundary', () => {
    // Target: Feb 5th.
    // Window: Jan 15 (Today) to Feb 5.
    // Logic: dueDay >= 15 OR dueDay <= 5.
    // Should include: Netflix (20th), Insurance (5th).
    // Should exclude: Rent (Paid), Gym (10th - falls in the "gap" between 5 and 15).

    const targetDate = new Date('2024-02-05T12:00:00Z');
    const balance = 2000;

    const safe = calculateSafeToSpend(balance, mockBills, targetDate);

    // 2000 - 15 (Netflix) - 100 (Insurance) = 1885
    expect(safe).toBe(1885);
  });
});