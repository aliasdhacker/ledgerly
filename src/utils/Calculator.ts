import { Bill } from '../types';

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
      return bill.dueDay >= currentDay || bill.dueDay <= targetDay;
    } else {
      // Same month window (e.g. Jan 5 to Jan 15):
      return bill.dueDay >= currentDay && bill.dueDay <= targetDay;
    }
  });

  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);

  return currentBalance - totalPending;
};